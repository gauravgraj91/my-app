import { getBills } from './billService';

export const getBillAnalytics = async () => {
  try {
    const bills = await getBills();

    const analytics = {
      totalBills: bills.length,
      totalAmount: bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0),
      totalProfit: bills.reduce((sum, bill) => sum + (bill.totalProfit || 0), 0),
      averageBillValue: 0,
      topVendors: {},
      billsByMonth: {},
      profitMargin: 0
    };

    if (bills.length > 0) {
      analytics.averageBillValue = analytics.totalAmount / bills.length;
      analytics.profitMargin = analytics.totalAmount > 0 ?
        (analytics.totalProfit / analytics.totalAmount) * 100 : 0;
    }

    // Group by vendor
    bills.forEach(bill => {
      const vendor = bill.vendor || 'Unknown';
      if (!analytics.topVendors[vendor]) {
        analytics.topVendors[vendor] = {
          billCount: 0,
          totalAmount: 0,
          totalProfit: 0
        };
      }
      analytics.topVendors[vendor].billCount++;
      analytics.topVendors[vendor].totalAmount += bill.totalAmount || 0;
      analytics.topVendors[vendor].totalProfit += bill.totalProfit || 0;
    });

    // Group by month
    bills.forEach(bill => {
      const date = bill.date instanceof Date ? bill.date : new Date(bill.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!analytics.billsByMonth[monthKey]) {
        analytics.billsByMonth[monthKey] = {
          billCount: 0,
          totalAmount: 0,
          totalProfit: 0
        };
      }
      analytics.billsByMonth[monthKey].billCount++;
      analytics.billsByMonth[monthKey].totalAmount += bill.totalAmount || 0;
      analytics.billsByMonth[monthKey].totalProfit += bill.totalProfit || 0;
    });

    return analytics;
  } catch (error) {
    console.error('Error getting bill analytics: ', error);
    throw error;
  }
};
