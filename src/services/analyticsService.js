import { getBills } from '../firebase/billService';
import { getShopProducts } from '../firebase/shopProductService';

/**
 * Enhanced Analytics Service for Bill-wise Insights
 * Uses one-time fetches (getDocs) instead of real-time listeners
 */

// Bill-based analytics calculations (pure function, takes data as input)
const calculateBillAnalyticsFromData = (bills) => {
  if (!bills || bills.length === 0) {
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

  const totalAmount = bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
  const totalProfit = bills.reduce((sum, bill) => sum + (bill.totalProfit || 0), 0);
  const averageBillValue = totalAmount / bills.length;
  const profitMargin = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

  const vendorMap = {};
  bills.forEach(bill => {
    const vendor = bill.vendor || 'Unknown';
    if (!vendorMap[vendor]) {
      vendorMap[vendor] = { vendor, billCount: 0, totalAmount: 0, totalProfit: 0 };
    }
    vendorMap[vendor].billCount++;
    vendorMap[vendor].totalAmount += bill.totalAmount || 0;
    vendorMap[vendor].totalProfit += bill.totalProfit || 0;
  });

  const vendorAnalytics = Object.values(vendorMap)
    .map(vendor => ({
      ...vendor,
      averageBillValue: vendor.totalAmount / vendor.billCount,
      profitMargin: vendor.totalAmount > 0 ? (vendor.totalProfit / vendor.totalAmount) * 100 : 0
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const monthlyMap = {};
  bills.forEach(bill => {
    const date = bill.date instanceof Date ? bill.date : new Date(bill.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { month: monthName, monthKey, billCount: 0, totalAmount: 0, totalProfit: 0 };
    }
    monthlyMap[monthKey].billCount++;
    monthlyMap[monthKey].totalAmount += bill.totalAmount || 0;
    monthlyMap[monthKey].totalProfit += bill.totalProfit || 0;
  });

  const monthlyAnalytics = Object.values(monthlyMap)
    .map(month => ({
      ...month,
      averageBillValue: month.totalAmount / month.billCount,
      profitMargin: month.totalAmount > 0 ? (month.totalProfit / month.totalAmount) * 100 : 0
    }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

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
};

const calculateProductAnalyticsFromData = (products) => {
  if (!products || products.length === 0) {
    return {
      totalProducts: 0,
      totalAmount: 0,
      totalProfit: 0,
      averageProductValue: 0,
      profitMargin: 0,
      categoryAnalytics: [],
      vendorAnalytics: []
    };
  }

  const totalAmount = products.reduce((sum, product) => sum + (product.totalAmount || 0), 0);
  const totalProfit = products.reduce((sum, product) =>
    sum + ((product.profitPerPiece || 0) * (product.totalQuantity || 0)), 0);
  const averageProductValue = totalAmount / products.length;
  const profitMargin = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

  const categoryMap = {};
  products.forEach(product => {
    const category = product.category || 'Uncategorized';
    if (!categoryMap[category]) {
      categoryMap[category] = { category, productCount: 0, totalAmount: 0, totalProfit: 0 };
    }
    categoryMap[category].productCount++;
    categoryMap[category].totalAmount += product.totalAmount || 0;
    categoryMap[category].totalProfit += (product.profitPerPiece || 0) * (product.totalQuantity || 0);
  });

  const categoryAnalytics = Object.values(categoryMap)
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const vendorMap = {};
  products.forEach(product => {
    const vendor = product.vendor || 'Unknown';
    if (!vendorMap[vendor]) {
      vendorMap[vendor] = { vendor, productCount: 0, totalAmount: 0, totalProfit: 0 };
    }
    vendorMap[vendor].productCount++;
    vendorMap[vendor].totalAmount += product.totalAmount || 0;
    vendorMap[vendor].totalProfit += (product.profitPerPiece || 0) * (product.totalQuantity || 0);
  });

  const vendorAnalytics = Object.values(vendorMap)
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    totalProducts: products.length,
    totalAmount,
    totalProfit,
    averageProductValue,
    profitMargin,
    categoryAnalytics,
    vendorAnalytics
  };
};

// One-time fetch for analytics data (no real-time listeners)
export const fetchAnalytics = async (tenantId) => {
  const [bills, products] = await Promise.all([
    getBills(tenantId),
    getShopProducts(tenantId)
  ]);

  const billAnalytics = calculateBillAnalyticsFromData(bills);
  const productAnalytics = calculateProductAnalyticsFromData(products);

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
};

// Chart data generators
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
