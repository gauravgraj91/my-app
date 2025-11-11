import {
  calculateBillAnalytics,
  calculateProductAnalytics,
  calculateCombinedAnalytics,
  generateVendorChartData,
  generateMonthlyChartData,
  generateProfitMarginChartData,
  formatCurrency,
  formatPercentage,
  formatNumber
} from '../analyticsService';

// Mock Firebase services
jest.mock('../../firebase/billService', () => ({
  getBills: jest.fn()
}));

jest.mock('../../firebase/shopProductService', () => ({
  subscribeToShopProducts: jest.fn()
}));

const { getBills } = require('../../firebase/billService');
const { subscribeToShopProducts } = require('../../firebase/shopProductService');

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateBillAnalytics', () => {
    it('should return empty analytics for no bills', async () => {
      getBills.mockResolvedValue([]);

      const result = await calculateBillAnalytics();

      expect(result).toEqual({
        totalBills: 0,
        totalAmount: 0,
        totalProfit: 0,
        averageBillValue: 0,
        profitMargin: 0,
        vendorAnalytics: [],
        monthlyAnalytics: [],
        topPerformingBills: []
      });
    });

    it('should calculate correct analytics for bills', async () => {
      const mockBills = [
        {
          id: '1',
          billNumber: 'B001',
          vendor: 'Vendor A',
          totalAmount: 1000,
          totalProfit: 200,
          date: new Date('2024-01-15')
        },
        {
          id: '2',
          billNumber: 'B002',
          vendor: 'Vendor B',
          totalAmount: 1500,
          totalProfit: 300,
          date: new Date('2024-01-20')
        },
        {
          id: '3',
          billNumber: 'B003',
          vendor: 'Vendor A',
          totalAmount: 800,
          totalProfit: 160,
          date: new Date('2024-02-10')
        }
      ];

      getBills.mockResolvedValue(mockBills);

      const result = await calculateBillAnalytics();

      expect(result.totalBills).toBe(3);
      expect(result.totalAmount).toBe(3300);
      expect(result.totalProfit).toBe(660);
      expect(result.averageBillValue).toBe(1100);
      expect(result.profitMargin).toBe(20);
    });

    it('should calculate vendor analytics correctly', async () => {
      const mockBills = [
        {
          id: '1',
          billNumber: 'B001',
          vendor: 'Vendor A',
          totalAmount: 1000,
          totalProfit: 200,
          date: new Date('2024-01-15')
        },
        {
          id: '2',
          billNumber: 'B002',
          vendor: 'Vendor A',
          totalAmount: 800,
          totalProfit: 160,
          date: new Date('2024-01-20')
        },
        {
          id: '3',
          billNumber: 'B003',
          vendor: 'Vendor B',
          totalAmount: 1500,
          totalProfit: 300,
          date: new Date('2024-02-10')
        }
      ];

      getBills.mockResolvedValue(mockBills);

      const result = await calculateBillAnalytics();

      expect(result.vendorAnalytics).toHaveLength(2);
      
      // Should be sorted by total amount (Vendor A: 1800, Vendor B: 1500)
      expect(result.vendorAnalytics[0].vendor).toBe('Vendor A');
      expect(result.vendorAnalytics[0].billCount).toBe(2);
      expect(result.vendorAnalytics[0].totalAmount).toBe(1800);
      expect(result.vendorAnalytics[0].totalProfit).toBe(360);
      expect(result.vendorAnalytics[0].averageBillValue).toBe(900);
      expect(result.vendorAnalytics[0].profitMargin).toBe(20);

      expect(result.vendorAnalytics[1].vendor).toBe('Vendor B');
      expect(result.vendorAnalytics[1].billCount).toBe(1);
      expect(result.vendorAnalytics[1].totalAmount).toBe(1500);
      expect(result.vendorAnalytics[1].totalProfit).toBe(300);
      expect(result.vendorAnalytics[1].averageBillValue).toBe(1500);
      expect(result.vendorAnalytics[1].profitMargin).toBe(20);
    });

    it('should calculate monthly analytics correctly', async () => {
      const mockBills = [
        {
          id: '1',
          billNumber: 'B001',
          vendor: 'Vendor A',
          totalAmount: 1000,
          totalProfit: 200,
          date: new Date('2024-01-15')
        },
        {
          id: '2',
          billNumber: 'B002',
          vendor: 'Vendor A',
          totalAmount: 800,
          totalProfit: 160,
          date: new Date('2024-01-20')
        },
        {
          id: '3',
          billNumber: 'B003',
          vendor: 'Vendor B',
          totalAmount: 1500,
          totalProfit: 300,
          date: new Date('2024-02-10')
        }
      ];

      getBills.mockResolvedValue(mockBills);

      const result = await calculateBillAnalytics();

      expect(result.monthlyAnalytics).toHaveLength(2);
      
      // Should be sorted by month key
      expect(result.monthlyAnalytics[0].monthKey).toBe('2024-01');
      expect(result.monthlyAnalytics[0].billCount).toBe(2);
      expect(result.monthlyAnalytics[0].totalAmount).toBe(1800);
      expect(result.monthlyAnalytics[0].totalProfit).toBe(360);
      expect(result.monthlyAnalytics[0].averageBillValue).toBe(900);
      expect(result.monthlyAnalytics[0].profitMargin).toBe(20);

      expect(result.monthlyAnalytics[1].monthKey).toBe('2024-02');
      expect(result.monthlyAnalytics[1].billCount).toBe(1);
      expect(result.monthlyAnalytics[1].totalAmount).toBe(1500);
      expect(result.monthlyAnalytics[1].totalProfit).toBe(300);
      expect(result.monthlyAnalytics[1].averageBillValue).toBe(1500);
      expect(result.monthlyAnalytics[1].profitMargin).toBe(20);
    });

    it('should calculate top performing bills correctly', async () => {
      const mockBills = [
        {
          id: '1',
          billNumber: 'B001',
          vendor: 'Vendor A',
          totalAmount: 1000,
          totalProfit: 300, // 30% margin
          date: new Date('2024-01-15')
        },
        {
          id: '2',
          billNumber: 'B002',
          vendor: 'Vendor B',
          totalAmount: 1500,
          totalProfit: 150, // 10% margin
          date: new Date('2024-01-20')
        },
        {
          id: '3',
          billNumber: 'B003',
          vendor: 'Vendor C',
          totalAmount: 800,
          totalProfit: 200, // 25% margin
          date: new Date('2024-02-10')
        }
      ];

      getBills.mockResolvedValue(mockBills);

      const result = await calculateBillAnalytics();

      expect(result.topPerformingBills).toHaveLength(3);
      
      // Should be sorted by profit margin (B001: 30%, B003: 25%, B002: 10%)
      expect(result.topPerformingBills[0].billNumber).toBe('B001');
      expect(result.topPerformingBills[0].profitMargin).toBe(30);
      
      expect(result.topPerformingBills[1].billNumber).toBe('B003');
      expect(result.topPerformingBills[1].profitMargin).toBe(25);
      
      expect(result.topPerformingBills[2].billNumber).toBe('B002');
      expect(result.topPerformingBills[2].profitMargin).toBe(10);
    });

    it('should handle bills with missing or zero amounts', async () => {
      const mockBills = [
        {
          id: '1',
          billNumber: 'B001',
          vendor: 'Vendor A',
          totalAmount: 0,
          totalProfit: 0,
          date: new Date('2024-01-15')
        },
        {
          id: '2',
          billNumber: 'B002',
          vendor: 'Vendor B',
          // Missing totalAmount and totalProfit
          date: new Date('2024-01-20')
        }
      ];

      getBills.mockResolvedValue(mockBills);

      const result = await calculateBillAnalytics();

      expect(result.totalBills).toBe(2);
      expect(result.totalAmount).toBe(0);
      expect(result.totalProfit).toBe(0);
      expect(result.averageBillValue).toBe(0);
      expect(result.profitMargin).toBe(0);
    });
  });

  describe('calculateProductAnalytics', () => {
    it('should return empty analytics for no products', async () => {
      subscribeToShopProducts.mockImplementation((callback) => {
        callback([]);
        return jest.fn(); // unsubscribe function
      });

      const result = await calculateProductAnalytics();

      expect(result).toEqual({
        totalProducts: 0,
        totalAmount: 0,
        totalProfit: 0,
        averageProductValue: 0,
        profitMargin: 0,
        categoryAnalytics: [],
        vendorAnalytics: []
      });
    });

    it('should calculate correct product analytics', async () => {
      const mockProducts = [
        {
          id: '1',
          productName: 'Product A',
          category: 'Category 1',
          vendor: 'Vendor A',
          totalAmount: 500,
          profitPerPiece: 10,
          totalQuantity: 5
        },
        {
          id: '2',
          productName: 'Product B',
          category: 'Category 2',
          vendor: 'Vendor B',
          totalAmount: 800,
          profitPerPiece: 15,
          totalQuantity: 4
        },
        {
          id: '3',
          productName: 'Product C',
          category: 'Category 1',
          vendor: 'Vendor A',
          totalAmount: 300,
          profitPerPiece: 8,
          totalQuantity: 3
        }
      ];

      subscribeToShopProducts.mockImplementation((callback) => {
        callback(mockProducts);
        return jest.fn(); // unsubscribe function
      });

      const result = await calculateProductAnalytics();

      expect(result.totalProducts).toBe(3);
      expect(result.totalAmount).toBe(1600);
      expect(result.totalProfit).toBe(134); // (10*5) + (15*4) + (8*3) = 50 + 60 + 24
      expect(result.averageProductValue).toBeCloseTo(533.33, 2);
      expect(result.profitMargin).toBe(8.375); // (134/1600) * 100
    });

    it('should calculate category analytics correctly', async () => {
      const mockProducts = [
        {
          id: '1',
          productName: 'Product A',
          category: 'Category 1',
          vendor: 'Vendor A',
          totalAmount: 500,
          profitPerPiece: 10,
          totalQuantity: 5
        },
        {
          id: '2',
          productName: 'Product B',
          category: 'Category 1',
          vendor: 'Vendor B',
          totalAmount: 300,
          profitPerPiece: 8,
          totalQuantity: 3
        },
        {
          id: '3',
          productName: 'Product C',
          category: 'Category 2',
          vendor: 'Vendor A',
          totalAmount: 800,
          profitPerPiece: 15,
          totalQuantity: 4
        }
      ];

      subscribeToShopProducts.mockImplementation((callback) => {
        callback(mockProducts);
        return jest.fn(); // unsubscribe function
      });

      const result = await calculateProductAnalytics();

      expect(result.categoryAnalytics).toHaveLength(2);
      
      // Should be sorted by total amount (Category 1: 800, Category 2: 800)
      expect(result.categoryAnalytics[0].category).toBe('Category 1');
      expect(result.categoryAnalytics[0].productCount).toBe(2);
      expect(result.categoryAnalytics[0].totalAmount).toBe(800);
      expect(result.categoryAnalytics[0].totalProfit).toBe(74); // (10*5) + (8*3) = 50 + 24

      expect(result.categoryAnalytics[1].category).toBe('Category 2');
      expect(result.categoryAnalytics[1].productCount).toBe(1);
      expect(result.categoryAnalytics[1].totalAmount).toBe(800);
      expect(result.categoryAnalytics[1].totalProfit).toBe(60); // 15*4
    });
  });

  describe('Chart Data Generators', () => {
    describe('generateVendorChartData', () => {
      it('should generate correct chart data for vendors', () => {
        const vendorAnalytics = [
          { vendor: 'Vendor A', totalAmount: 1000, totalProfit: 200 },
          { vendor: 'Vendor B', totalAmount: 800, totalProfit: 160 }
        ];

        const result = generateVendorChartData(vendorAnalytics);

        expect(result.labels).toEqual(['Vendor A', 'Vendor B']);
        expect(result.datasets).toHaveLength(2);
        expect(result.datasets[0].label).toBe('Total Amount');
        expect(result.datasets[0].data).toEqual([1000, 800]);
        expect(result.datasets[1].label).toBe('Total Profit');
        expect(result.datasets[1].data).toEqual([200, 160]);
      });
    });

    describe('generateMonthlyChartData', () => {
      it('should generate correct chart data for monthly analytics', () => {
        const monthlyAnalytics = [
          { month: 'January 2024', billCount: 5, totalAmount: 2000, averageBillValue: 400 },
          { month: 'February 2024', billCount: 3, totalAmount: 1500, averageBillValue: 500 }
        ];

        const result = generateMonthlyChartData(monthlyAnalytics);

        expect(result.labels).toEqual(['January 2024', 'February 2024']);
        expect(result.datasets).toHaveLength(3);
        expect(result.datasets[0].label).toBe('Bills Count');
        expect(result.datasets[0].data).toEqual([5, 3]);
        expect(result.datasets[1].label).toBe('Total Amount');
        expect(result.datasets[1].data).toEqual([2000, 1500]);
        expect(result.datasets[2].label).toBe('Average Bill Value');
        expect(result.datasets[2].data).toEqual([400, 500]);
      });
    });

    describe('generateProfitMarginChartData', () => {
      it('should generate correct chart data for profit margins', () => {
        const topPerformingBills = [
          { billNumber: 'B001', profitMargin: 25 },
          { billNumber: 'B002', profitMargin: 20 }
        ];

        const result = generateProfitMarginChartData(topPerformingBills);

        expect(result.labels).toEqual(['B001', 'B002']);
        expect(result.datasets).toHaveLength(1);
        expect(result.datasets[0].label).toBe('Profit Margin (%)');
        expect(result.datasets[0].data).toEqual([25, 20]);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('formatCurrency', () => {
      it('should format currency correctly', () => {
        expect(formatCurrency(1000)).toBe('₹1,000.00');
        expect(formatCurrency(1234.56)).toBe('₹1,234.56');
        expect(formatCurrency(0)).toBe('₹0.00');
        expect(formatCurrency(null)).toBe('₹0.00');
        expect(formatCurrency(undefined)).toBe('₹0.00');
      });
    });

    describe('formatPercentage', () => {
      it('should format percentage correctly', () => {
        expect(formatPercentage(25.5)).toBe('25.5%');
        expect(formatPercentage(0)).toBe('0.0%');
        expect(formatPercentage(null)).toBe('0.0%');
        expect(formatPercentage(undefined)).toBe('0.0%');
      });
    });

    describe('formatNumber', () => {
      it('should format numbers correctly', () => {
        expect(formatNumber(1000)).toBe('1,000');
        expect(formatNumber(1234567)).toBe('12,34,567');
        expect(formatNumber(0)).toBe('0');
        expect(formatNumber(null)).toBe('0');
        expect(formatNumber(undefined)).toBe('0');
      });
    });
  });

  describe('calculateCombinedAnalytics', () => {
    it('should combine bill and product analytics', async () => {
      // Mock bill analytics
      getBills.mockResolvedValue([
        {
          id: '1',
          billNumber: 'B001',
          vendor: 'Vendor A',
          totalAmount: 1000,
          totalProfit: 200,
          date: new Date('2024-01-15')
        }
      ]);

      // Mock product analytics
      subscribeToShopProducts.mockImplementation((callback) => {
        callback([
          {
            id: '1',
            productName: 'Product A',
            category: 'Category 1',
            vendor: 'Vendor A',
            totalAmount: 500,
            profitPerPiece: 10,
            totalQuantity: 5
          }
        ]);
        return jest.fn(); // unsubscribe function
      });

      const result = await calculateCombinedAnalytics();

      expect(result).toHaveProperty('bills');
      expect(result).toHaveProperty('products');
      expect(result).toHaveProperty('comparison');
      
      expect(result.comparison.totalRevenue).toBe(1000);
      expect(result.comparison.totalProfit).toBe(200);
      expect(result.comparison.averageBillValue).toBe(1000);
      expect(result.comparison.totalProducts).toBe(1);
      expect(result.comparison.averageProductValue).toBe(500);
    });
  });
});