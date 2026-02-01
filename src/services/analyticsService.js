import { getBillAnalytics, getBills } from '../firebase/billService';
import { subscribeToShopProducts } from '../firebase/shopProductService';

/**
 * Enhanced Analytics Service for Bill-wise Insights
 * Provides analytics calculations for both bill and product views
 */

// Bill-based analytics calculations
export const calculateBillAnalytics = async () => {
  try {
    const bills = await getBills();
    
    if (bills.length === 0) {
      return {
        totalBills: 0,
        totalAmount: 0,
        totalProfit: 0,
        averageBillValue: 0,
        profitMargin: 0,
        vendorAnalytics: [],
        monthlyAnalytics: [],
        topPerformingBills: []
      };
    }

    // Basic totals
    const totalAmount = bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
    const totalProfit = bills.reduce((sum, bill) => sum + (bill.totalProfit || 0), 0);
    const averageBillValue = totalAmount / bills.length;
    const profitMargin = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

    // Vendor performance analytics
    const vendorMap = {};
    bills.forEach(bill => {
      const vendor = bill.vendor || 'Unknown';
      if (!vendorMap[vendor]) {
        vendorMap[vendor] = {
          vendor,
          billCount: 0,
          totalAmount: 0,
          totalProfit: 0,
          averageBillValue: 0,
          profitMargin: 0
        };
      }
      vendorMap[vendor].billCount++;
      vendorMap[vendor].totalAmount += bill.totalAmount || 0;
      vendorMap[vendor].totalProfit += bill.totalProfit || 0;
    });

    // Calculate vendor averages and sort by performance
    const vendorAnalytics = Object.values(vendorMap)
      .map(vendor => ({
        ...vendor,
        averageBillValue: vendor.totalAmount / vendor.billCount,
        profitMargin: vendor.totalAmount > 0 ? (vendor.totalProfit / vendor.totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Monthly analytics
    const monthlyMap = {};
    bills.forEach(bill => {
      const date = bill.date instanceof Date ? bill.date : new Date(bill.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthName,
          monthKey,
          billCount: 0,
          totalAmount: 0,
          totalProfit: 0,
          averageBillValue: 0,
          profitMargin: 0
        };
      }
      monthlyMap[monthKey].billCount++;
      monthlyMap[monthKey].totalAmount += bill.totalAmount || 0;
      monthlyMap[monthKey].totalProfit += bill.totalProfit || 0;
    });

    // Calculate monthly averages and sort by date
    const monthlyAnalytics = Object.values(monthlyMap)
      .map(month => ({
        ...month,
        averageBillValue: month.totalAmount / month.billCount,
        profitMargin: month.totalAmount > 0 ? (month.totalProfit / month.totalAmount) * 100 : 0
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    // Top performing bills by profit margin
    const topPerformingBills = bills
      .map(bill => ({
        ...bill,
        profitMargin: bill.totalAmount > 0 ? (bill.totalProfit / bill.totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.profitMargin - a.profitMargin)
      .slice(0, 10);

    return {
      totalBills: bills.length,
      totalAmount,
      totalProfit,
      averageBillValue,
      profitMargin,
      vendorAnalytics,
      monthlyAnalytics,
      topPerformingBills
    };
  } catch (error) {
    console.error('Error calculating bill analytics:', error);
    throw error;
  }
};

// Chart data generators for bill analytics
export const generateVendorChartData = (vendorAnalytics) => {
  return {
    labels: vendorAnalytics.map(v => v.vendor),
    datasets: [
      {
        label: 'Total Amount',
        data: vendorAnalytics.map(v => v.totalAmount),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      },
      {
        label: 'Total Profit',
        data: vendorAnalytics.map(v => v.totalProfit),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1
      }
    ]
  };
};

export const generateMonthlyChartData = (monthlyAnalytics) => {
  return {
    labels: monthlyAnalytics.map(m => m.month),
    datasets: [
      {
        label: 'Bills Count',
        data: monthlyAnalytics.map(m => m.billCount),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 2,
        type: 'line',
        yAxisID: 'y1'
      },
      {
        label: 'Total Amount',
        data: monthlyAnalytics.map(m => m.totalAmount),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      },
      {
        label: 'Average Bill Value',
        data: monthlyAnalytics.map(m => m.averageBillValue),
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: 'rgba(245, 158, 11, 1)',
        borderWidth: 2,
        type: 'line',
        yAxisID: 'y1'
      }
    ]
  };
};

export const generateProfitMarginChartData = (topPerformingBills) => {
  return {
    labels: topPerformingBills.map(b => b.billNumber),
    datasets: [
      {
        label: 'Profit Margin (%)',
        data: topPerformingBills.map(b => b.profitMargin),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1
      }
    ]
  };
};

// Combined analytics for both bill and product views
export const calculateCombinedAnalytics = async () => {
  try {
    const [billAnalytics, productAnalytics] = await Promise.all([
      calculateBillAnalytics(),
      calculateProductAnalytics()
    ]);

    return {
      bills: billAnalytics,
      products: productAnalytics,
      comparison: {
        totalRevenue: billAnalytics.totalAmount,
        totalProfit: billAnalytics.totalProfit,
        profitMargin: billAnalytics.profitMargin,
        averageBillValue: billAnalytics.averageBillValue,
        totalProducts: productAnalytics.totalProducts,
        averageProductValue: productAnalytics.averageProductValue
      }
    };
  } catch (error) {
    console.error('Error calculating combined analytics:', error);
    throw error;
  }
};

// Product-based analytics (for comparison and dual view support)
export const calculateProductAnalytics = async () => {
  return new Promise((resolve, reject) => {
    let unsubscribe;
    unsubscribe = subscribeToShopProducts((products) => {
      try {
        if (unsubscribe) unsubscribe(); // Unsubscribe immediately after getting data
        
        if (products.length === 0) {
          resolve({
            totalProducts: 0,
            totalAmount: 0,
            totalProfit: 0,
            averageProductValue: 0,
            profitMargin: 0,
            categoryAnalytics: [],
            vendorAnalytics: []
          });
          return;
        }

        const totalAmount = products.reduce((sum, product) => sum + (product.totalAmount || 0), 0);
        const totalProfit = products.reduce((sum, product) => 
          sum + ((product.profitPerPiece || 0) * (product.totalQuantity || 0)), 0);
        const averageProductValue = totalAmount / products.length;
        const profitMargin = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

        // Category analytics
        const categoryMap = {};
        products.forEach(product => {
          const category = product.category || 'Uncategorized';
          if (!categoryMap[category]) {
            categoryMap[category] = {
              category,
              productCount: 0,
              totalAmount: 0,
              totalProfit: 0
            };
          }
          categoryMap[category].productCount++;
          categoryMap[category].totalAmount += product.totalAmount || 0;
          categoryMap[category].totalProfit += (product.profitPerPiece || 0) * (product.totalQuantity || 0);
        });

        const categoryAnalytics = Object.values(categoryMap)
          .sort((a, b) => b.totalAmount - a.totalAmount);

        // Vendor analytics from products
        const vendorMap = {};
        products.forEach(product => {
          const vendor = product.vendor || 'Unknown';
          if (!vendorMap[vendor]) {
            vendorMap[vendor] = {
              vendor,
              productCount: 0,
              totalAmount: 0,
              totalProfit: 0
            };
          }
          vendorMap[vendor].productCount++;
          vendorMap[vendor].totalAmount += product.totalAmount || 0;
          vendorMap[vendor].totalProfit += (product.profitPerPiece || 0) * (product.totalQuantity || 0);
        });

        const vendorAnalytics = Object.values(vendorMap)
          .sort((a, b) => b.totalAmount - a.totalAmount);

        resolve({
          totalProducts: products.length,
          totalAmount,
          totalProfit,
          averageProductValue,
          profitMargin,
          categoryAnalytics,
          vendorAnalytics
        });
      } catch (error) {
        reject(error);
      }
    });
  });
};

// Real-time analytics subscription
export const subscribeToAnalytics = (callback) => {
  let billsData = [];
  let productsData = [];
  let isInitialized = false;

  const updateAnalytics = async () => {
    if (!isInitialized) return;
    
    try {
      const analytics = await calculateCombinedAnalytics();
      callback(analytics);
    } catch (error) {
      console.error('Error updating analytics:', error);
      callback(null);
    }
  };

  // Subscribe to bills
  const { subscribeToBills } = require('../firebase/billService');
  const unsubscribeBills = subscribeToBills((bills) => {
    billsData = bills;
    if (!isInitialized) {
      isInitialized = true;
    }
    updateAnalytics();
  });

  // Subscribe to products
  const unsubscribeProducts = subscribeToShopProducts((products) => {
    productsData = products;
    if (!isInitialized) {
      isInitialized = true;
    }
    updateAnalytics();
  });

  // Return cleanup function
  return () => {
    unsubscribeBills();
    unsubscribeProducts();
  };
};

// Utility functions for formatting
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount || 0);
};

export const formatPercentage = (value) => {
  return `${(value || 0).toFixed(1)}%`;
};

export const formatNumber = (value) => {
  return new Intl.NumberFormat('en-IN').format(value || 0);
};