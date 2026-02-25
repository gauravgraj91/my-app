import { serverTimestamp } from 'firebase/firestore';

// Bill data model and validation utilities
export const BillModel = {
  // Generate a new bill number
  generateBillNumber: (existingBills = []) => {
    const billNumbers = existingBills
      .map(bill => bill.billNumber)
      .filter(num => num && num.startsWith('B'))
      .map(num => parseInt(num.substring(1)))
      .filter(num => !isNaN(num));

    const maxNumber = billNumbers.length > 0 ? Math.max(...billNumbers) : 0;
    return `B${String(maxNumber + 1).padStart(3, '0')}`;
  },

  // Compute extra charge amounts from bill-level percentages / flat costs
  computeExtraCharges: (totalAmount, { discountPercent = 0, surchargePercent = 0, transportCost = 0 } = {}) => {
    const dp = parseFloat(discountPercent) || 0;
    const sp = parseFloat(surchargePercent) || 0;
    const tc = parseFloat(transportCost) || 0;
    const discountAmount = Math.round((totalAmount * dp / 100 + Number.EPSILON) * 100) / 100;
    const surchargeAmount = Math.round((totalAmount * sp / 100 + Number.EPSILON) * 100) / 100;
    const finalAmount = Math.round((totalAmount - discountAmount + surchargeAmount + tc + Number.EPSILON) * 100) / 100;
    return { discountPercent: dp, surchargePercent: sp, transportCost: tc, discountAmount, surchargeAmount, finalAmount };
  },

  // Distribute net adjustment proportionally across products, returning updated cost fields
  distributeChargesToProducts: (products, netAdjustment, totalAmount) => {
    if (!products || products.length === 0 || totalAmount === 0) return products;
    return products.map(p => {
      const qty = parseFloat(p.totalQuantity) || parseFloat(p.quantity) || 0;
      const amount = parseFloat(p.totalAmount) || 0;
      const mrp = parseFloat(p.mrp) || parseFloat(p.pricePerPiece) || 0;
      const share = netAdjustment * (amount / totalAmount);
      const effectiveAmount = amount + share;
      const costPerUnit = qty > 0 ? Math.round((effectiveAmount / qty + Number.EPSILON) * 100) / 100 : 0;
      const profitPerPiece = Math.round((mrp - costPerUnit + Number.EPSILON) * 100) / 100;
      const totalProfit = Math.round((profitPerPiece * qty + Number.EPSILON) * 100) / 100;
      return { ...p, costPerUnit, pricePerPiece: costPerUnit, profitPerPiece, totalProfit };
    });
  },

  // Calculate bill totals from products
  calculateTotals: (products = []) => {
    return products.reduce((totals, product) => {
      const quantity = parseFloat(product.totalQuantity) || parseFloat(product.quantity) || 0;
      const amount = parseFloat(product.totalAmount) || 0;
      const mrp = parseFloat(product.mrp) || parseFloat(product.pricePerPiece) || 0;
      const costPerUnit = quantity > 0 ? amount / quantity : 0;
      const profitPerPiece = mrp - costPerUnit;

      return {
        totalQuantity: totals.totalQuantity + quantity,
        totalAmount: totals.totalAmount + amount,
        totalProfit: totals.totalProfit + (profitPerPiece * quantity),
        productCount: totals.productCount + 1
      };
    }, {
      totalQuantity: 0,
      totalAmount: 0,
      totalProfit: 0,
      productCount: 0
    });
  },

  // Create a new bill object with defaults
  createBillData: (billData, products = []) => {
    let totals;
    if (products.length > 0) {
      totals = BillModel.calculateTotals(products);
    } else if (billData.products && billData.products.length > 0) {
      totals = billData.products.reduce((acc, p) => {
        const qty = parseFloat(p.quantity) || 0;
        const amount = parseFloat(p.totalAmount) || 0;
        const mrp = parseFloat(p.mrp) || 0;
        const costPerUnit = qty > 0 ? amount / qty : 0;
        const profitPerPiece = mrp - costPerUnit;
        return {
          totalQuantity: acc.totalQuantity + qty,
          totalAmount: acc.totalAmount + amount,
          totalProfit: acc.totalProfit + (profitPerPiece * qty),
          productCount: acc.productCount + 1
        };
      }, { totalQuantity: 0, totalAmount: 0, totalProfit: 0, productCount: 0 });
    } else {
      const qty = parseFloat(billData.totalQuantity) || parseFloat(billData.quantity) || 0;
      const amount = parseFloat(billData.totalAmount) || 0;
      const mrp = parseFloat(billData.mrp) || 0;
      const costPerUnit = qty > 0 ? amount / qty : 0;
      const profitPerPiece = mrp - costPerUnit;

      totals = {
        totalQuantity: qty,
        totalAmount: amount,
        totalProfit: parseFloat(billData.totalProfit) || (profitPerPiece * qty),
        productCount: parseFloat(billData.productCount) || (billData.productName ? 1 : 0)
      };
    }
    const now = new Date();

    const extraCharges = BillModel.computeExtraCharges(totals.totalAmount, {
      discountPercent: billData.discountPercent,
      surchargePercent: billData.surchargePercent,
      transportCost: billData.transportCost,
    });

    return {
      billNumber: billData.billNumber || '',
      date: billData.date || now,
      vendor: billData.vendor || '',
      notes: billData.notes || '',
      status: billData.status || 'active',
      ...totals,
      ...extraCharges,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
  },

  // Validate bill data
  validate: (billData) => {
    const errors = {};

    if (!billData.billNumber || billData.billNumber.trim() === '') {
      errors.billNumber = 'Bill number is required';
    } else if (billData.billNumber.length > 20) {
      errors.billNumber = 'Bill number must be less than 20 characters';
    }

    if (!billData.date) {
      errors.date = 'Bill date is required';
    } else {
      const date = new Date(billData.date);
      if (isNaN(date.getTime())) {
        errors.date = 'Invalid date format';
      }
    }

    if (!billData.vendor || billData.vendor.trim() === '') {
      errors.vendor = 'Vendor is required';
    } else if (billData.vendor.length > 100) {
      errors.vendor = 'Vendor name must be less than 100 characters';
    }

    if (billData.notes && billData.notes.length > 500) {
      errors.notes = 'Notes must be less than 500 characters';
    }

    const validStatuses = ['active', 'archived', 'returned', 'paid'];
    if (billData.status && !validStatuses.includes(billData.status)) {
      errors.status = 'Invalid status. Must be active, archived, returned, or paid';
    }

    if (billData.totalAmount !== undefined && (isNaN(billData.totalAmount) || billData.totalAmount < 0)) {
      errors.totalAmount = 'Total amount must be a valid positive number';
    }

    if (billData.totalQuantity !== undefined && (isNaN(billData.totalQuantity) || billData.totalQuantity < 0)) {
      errors.totalQuantity = 'Total quantity must be a valid positive number';
    }

    if (billData.totalProfit !== undefined && isNaN(billData.totalProfit)) {
      errors.totalProfit = 'Total profit must be a valid number';
    }

    if (billData.productCount !== undefined && (isNaN(billData.productCount) || billData.productCount < 0)) {
      errors.productCount = 'Product count must be a valid positive number';
    }

    const dp = parseFloat(billData.discountPercent);
    if (billData.discountPercent !== undefined && billData.discountPercent !== '' && (!isFinite(dp) || dp < 0 || dp > 100)) {
      errors.discountPercent = 'Discount must be 0-100%';
    }
    const sp = parseFloat(billData.surchargePercent);
    if (billData.surchargePercent !== undefined && billData.surchargePercent !== '' && (!isFinite(sp) || sp < 0 || sp > 100)) {
      errors.surchargePercent = 'Surcharge must be 0-100%';
    }
    const tc = parseFloat(billData.transportCost);
    if (billData.transportCost !== undefined && billData.transportCost !== '' && (!isFinite(tc) || tc < 0)) {
      errors.transportCost = 'Transport cost must be a positive number';
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }
};
