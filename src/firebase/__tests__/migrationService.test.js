import MigrationService, {
  groupProductsByBillNumber,
  createBillsFromGroups,
  calculateBillDataFromProducts,
  updateProductsWithBillReferences,
  handleOrphanedProducts,
  migrateProductsToBills,
  validateDataIntegrity,
  fixDataIntegrityIssues
} from '../migrationService';

// Mock Firebase functions
jest.mock('../config', () => ({
  db: {}
}));

jest.mock('../shopProductService', () => ({
  getShopProducts: jest.fn(),
  updateShopProduct: jest.fn()
}));

jest.mock('../billService', () => ({
  addBill: jest.fn(),
  getBills: jest.fn(),
  recalculateBillTotals: jest.fn(),
  BillModel: {
    generateBillNumber: jest.fn(),
    calculateTotals: jest.fn()
  }
}));

// Import mocked modules
import { getShopProducts, updateShopProduct } from '../shopProductService';
import { addBill, getBills, recalculateBillTotals, BillModel } from '../billService';

describe('MigrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('groupProductsByBillNumber', () => {
    it('should group products by bill number correctly', async () => {
      const mockProducts = [
        { id: '1', productName: 'Product 1', billNumber: 'B001', totalAmount: 100 },
        { id: '2', productName: 'Product 2', billNumber: 'B001', totalAmount: 150 },
        { id: '3', productName: 'Product 3', billNumber: 'B002', totalAmount: 200 },
        { id: '4', productName: 'Product 4', billNumber: '', totalAmount: 75 },
        { id: '5', productName: 'Product 5', billNumber: null, totalAmount: 50 }
      ];

      getShopProducts.mockResolvedValue(mockProducts);

      const result = await groupProductsByBillNumber();

      expect(result.groupedProducts).toEqual({
        'B001': [
          { id: '1', productName: 'Product 1', billNumber: 'B001', totalAmount: 100 },
          { id: '2', productName: 'Product 2', billNumber: 'B001', totalAmount: 150 }
        ],
        'B002': [
          { id: '3', productName: 'Product 3', billNumber: 'B002', totalAmount: 200 }
        ]
      });

      expect(result.orphanedProducts).toEqual([
        { id: '4', productName: 'Product 4', billNumber: '', totalAmount: 75 },
        { id: '5', productName: 'Product 5', billNumber: null, totalAmount: 50 }
      ]);

      expect(result.totalProducts).toBe(5);
      expect(result.groupCount).toBe(2);
    });

    it('should handle empty product list', async () => {
      getShopProducts.mockResolvedValue([]);

      const result = await groupProductsByBillNumber();

      expect(result.groupedProducts).toEqual({});
      expect(result.orphanedProducts).toEqual([]);
      expect(result.totalProducts).toBe(0);
      expect(result.groupCount).toBe(0);
    });

    it('should handle products with whitespace-only bill numbers', async () => {
      const mockProducts = [
        { id: '1', productName: 'Product 1', billNumber: '   ', totalAmount: 100 },
        { id: '2', productName: 'Product 2', billNumber: '\t\n', totalAmount: 150 }
      ];

      getShopProducts.mockResolvedValue(mockProducts);

      const result = await groupProductsByBillNumber();

      expect(result.groupedProducts).toEqual({});
      expect(result.orphanedProducts).toHaveLength(2);
    });
  });

  describe('calculateBillDataFromProducts', () => {
    beforeEach(() => {
      BillModel.calculateTotals.mockImplementation((products) => ({
        totalQuantity: products.reduce((sum, p) => sum + (p.totalQuantity || 0), 0),
        totalAmount: products.reduce((sum, p) => sum + (p.totalAmount || 0), 0),
        totalProfit: products.reduce((sum, p) => sum + (p.profitPerPiece || 0) * (p.totalQuantity || 0), 0),
        productCount: products.length
      }));
    });

    it('should calculate bill data from products correctly', () => {
      const billNumber = 'B001';
      const products = [
        {
          id: '1',
          productName: 'Product 1',
          vendor: 'Vendor A',
          date: new Date('2024-01-15'),
          totalQuantity: 10,
          totalAmount: 100,
          profitPerPiece: 5
        },
        {
          id: '2',
          productName: 'Product 2',
          vendor: 'Vendor A',
          date: new Date('2024-01-20'),
          totalQuantity: 5,
          totalAmount: 150,
          profitPerPiece: 10
        }
      ];

      const result = calculateBillDataFromProducts(billNumber, products);

      expect(result.billNumber).toBe('B001');
      expect(result.vendor).toBe('Vendor A');
      expect(result.date).toEqual(new Date('2024-01-15')); // Earliest date
      expect(result.status).toBe('active');
      expect(result.notes).toBe('Migrated from 2 existing products');
      expect(result.totalQuantity).toBe(15);
      expect(result.totalAmount).toBe(250);
      expect(result.totalProfit).toBe(100); // (5*10) + (10*5)
      expect(result.productCount).toBe(2);
    });

    it('should handle products with different vendors', () => {
      const products = [
        { vendor: 'Vendor A', date: new Date(), totalQuantity: 1, totalAmount: 10, profitPerPiece: 1 },
        { vendor: 'Vendor A', date: new Date(), totalQuantity: 1, totalAmount: 10, profitPerPiece: 1 },
        { vendor: 'Vendor B', date: new Date(), totalQuantity: 1, totalAmount: 10, profitPerPiece: 1 }
      ];

      const result = calculateBillDataFromProducts('B001', products);

      expect(result.vendor).toBe('Vendor A'); // Most common vendor
    });

    it('should handle products without dates', () => {
      const products = [
        { vendor: 'Vendor A', totalQuantity: 1, totalAmount: 10, profitPerPiece: 1 }
      ];

      const result = calculateBillDataFromProducts('B001', products);

      expect(result.date).toBeInstanceOf(Date);
      expect(result.date.getTime()).toBeCloseTo(Date.now(), -2); // Within 100ms
    });

    it('should handle products with missing vendor', () => {
      const products = [
        { date: new Date(), totalQuantity: 1, totalAmount: 10, profitPerPiece: 1 }
      ];

      const result = calculateBillDataFromProducts('B001', products);

      expect(result.vendor).toBe('Unknown');
    });

    it('should throw error for empty product list', () => {
      expect(() => {
        calculateBillDataFromProducts('B001', []);
      }).toThrow('Cannot create bill from empty product list');
    });
  });

  describe('createBillsFromGroups', () => {
    beforeEach(() => {
      BillModel.calculateTotals.mockImplementation((products) => ({
        totalQuantity: products.reduce((sum, p) => sum + (p.totalQuantity || 0), 0),
        totalAmount: products.reduce((sum, p) => sum + (p.totalAmount || 0), 0),
        totalProfit: products.reduce((sum, p) => sum + (p.profitPerPiece || 0) * (p.totalQuantity || 0), 0),
        productCount: products.length
      }));
    });

    it('should create bills from grouped products successfully', async () => {
      const groupedProducts = {
        'B001': [
          { id: '1', vendor: 'Vendor A', date: new Date(), totalQuantity: 10, totalAmount: 100, profitPerPiece: 5 }
        ],
        'B002': [
          { id: '2', vendor: 'Vendor B', date: new Date(), totalQuantity: 5, totalAmount: 50, profitPerPiece: 2 }
        ]
      };

      const mockBills = [
        { id: 'bill1', billNumber: 'B001' },
        { id: 'bill2', billNumber: 'B002' }
      ];

      addBill.mockResolvedValueOnce(mockBills[0]);
      addBill.mockResolvedValueOnce(mockBills[1]);

      const result = await createBillsFromGroups(groupedProducts);

      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(result.createdBills).toHaveLength(2);
      expect(result.createdBills[0].bill).toEqual(mockBills[0]);
      expect(result.createdBills[0].productCount).toBe(1);
      expect(result.createdBills[0].originalBillNumber).toBe('B001');
    });

    it('should handle bill creation errors gracefully', async () => {
      const groupedProducts = {
        'B001': [{ id: '1', vendor: 'Vendor A', date: new Date(), totalQuantity: 10, totalAmount: 100, profitPerPiece: 5 }],
        'B002': [{ id: '2', vendor: 'Vendor B', date: new Date(), totalQuantity: 5, totalAmount: 50, profitPerPiece: 2 }]
      };

      addBill.mockResolvedValueOnce({ id: 'bill1', billNumber: 'B001' });
      addBill.mockRejectedValueOnce(new Error('Bill creation failed'));

      const result = await createBillsFromGroups(groupedProducts);

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].billNumber).toBe('B002');
      expect(result.errors[0].error).toBe('Bill creation failed');
    });
  });

  describe('updateProductsWithBillReferences', () => {
    it('should update products with bill references successfully', async () => {
      const createdBills = [
        { bill: { id: 'bill1', billNumber: 'B001' }, originalBillNumber: 'B001' },
        { bill: { id: 'bill2', billNumber: 'B002' }, originalBillNumber: 'B002' }
      ];

      const groupedProducts = {
        'B001': [{ id: 'product1' }, { id: 'product2' }],
        'B002': [{ id: 'product3' }]
      };

      updateShopProduct.mockResolvedValue({});

      const result = await updateProductsWithBillReferences(createdBills, groupedProducts);

      expect(result.successCount).toBe(3);
      expect(result.errorCount).toBe(0);
      expect(updateShopProduct).toHaveBeenCalledTimes(3);
      expect(updateShopProduct).toHaveBeenCalledWith('product1', {
        billId: 'bill1',
        billNumber: 'B001'
      });
    });

    it('should handle product update errors gracefully', async () => {
      const createdBills = [
        { bill: { id: 'bill1', billNumber: 'B001' }, originalBillNumber: 'B001' }
      ];

      const groupedProducts = {
        'B001': [{ id: 'product1' }, { id: 'product2' }]
      };

      updateShopProduct.mockResolvedValueOnce({});
      updateShopProduct.mockRejectedValueOnce(new Error('Update failed'));

      const result = await updateProductsWithBillReferences(createdBills, groupedProducts);

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].productId).toBe('product2');
      expect(result.errors[0].error).toBe('Update failed');
    });
  });

  describe('handleOrphanedProducts', () => {
    beforeEach(() => {
      BillModel.generateBillNumber.mockImplementation((bills) => {
        const maxNum = bills.length > 0 ? Math.max(...bills.map(b => {
          const match = b.billNumber?.match(/B(\d+)/);
          return match ? parseInt(match[1]) : 0;
        })) : 0;
        return `B${String(maxNum + 1).padStart(3, '0')}`;
      });

      BillModel.calculateTotals.mockImplementation((products) => ({
        totalQuantity: products.reduce((sum, p) => sum + (p.totalQuantity || 0), 0),
        totalAmount: products.reduce((sum, p) => sum + (p.totalAmount || 0), 0),
        totalProfit: products.reduce((sum, p) => sum + (p.profitPerPiece || 0) * (p.totalQuantity || 0), 0),
        productCount: products.length
      }));
    });

    it('should handle empty orphaned products list', async () => {
      const result = await handleOrphanedProducts([]);

      expect(result.createdBills).toEqual([]);
      expect(result.updateResults).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should create individual bills for orphaned products', async () => {
      const orphanedProducts = [
        { id: 'product1', productName: 'Product 1', vendor: 'Vendor A', date: new Date(), totalQuantity: 1, totalAmount: 10, profitPerPiece: 2 },
        { id: 'product2', productName: 'Product 2', vendor: 'Vendor B', date: new Date(), totalQuantity: 2, totalAmount: 20, profitPerPiece: 3 }
      ];

      getBills.mockResolvedValue([]);
      addBill.mockResolvedValueOnce({ id: 'bill1', billNumber: 'B001' });
      addBill.mockResolvedValueOnce({ id: 'bill2', billNumber: 'B002' });
      updateShopProduct.mockResolvedValue({});

      const result = await handleOrphanedProducts(orphanedProducts);

      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(result.createdBills).toHaveLength(2);
      expect(result.updateResults).toHaveLength(2);
      expect(addBill).toHaveBeenCalledTimes(2);
      expect(updateShopProduct).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in orphaned product processing', async () => {
      const orphanedProducts = [
        { id: 'product1', productName: 'Product 1', vendor: 'Vendor A', date: new Date(), totalQuantity: 1, totalAmount: 10, profitPerPiece: 2 }
      ];

      getBills.mockResolvedValue([]);
      addBill.mockRejectedValue(new Error('Bill creation failed'));

      const result = await handleOrphanedProducts(orphanedProducts);

      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].productId).toBe('product1');
      expect(result.errors[0].error).toBe('Bill creation failed');
    });
  });

  describe('validateDataIntegrity', () => {
    beforeEach(() => {
      BillModel.calculateTotals.mockImplementation((products) => ({
        totalQuantity: products.reduce((sum, p) => sum + (p.totalQuantity || 0), 0),
        totalAmount: products.reduce((sum, p) => sum + (p.totalAmount || 0), 0),
        totalProfit: products.reduce((sum, p) => sum + (p.profitPerPiece || 0) * (p.totalQuantity || 0), 0),
        productCount: products.length
      }));
    });

    it('should validate data integrity successfully with no issues', async () => {
      const mockProducts = [
        { id: 'product1', billId: 'bill1', totalQuantity: 10, totalAmount: 100, profitPerPiece: 5 },
        { id: 'product2', billId: 'bill1', totalQuantity: 5, totalAmount: 50, profitPerPiece: 3 }
      ];

      const mockBills = [
        { 
          id: 'bill1', 
          billNumber: 'B001',
          totalQuantity: 15,
          totalAmount: 150,
          totalProfit: 65, // (5*10) + (3*5)
          productCount: 2
        }
      ];

      getShopProducts.mockResolvedValue(mockProducts);
      getBills.mockResolvedValue(mockBills);

      const result = await validateDataIntegrity();

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.summary.totalProducts).toBe(2);
      expect(result.summary.totalBills).toBe(1);
      expect(result.summary.productsWithBillId).toBe(2);
      expect(result.summary.productsWithoutBillId).toBe(0);
    });

    it('should detect products without billId', async () => {
      const mockProducts = [
        { id: 'product1', billId: 'bill1', totalQuantity: 10, totalAmount: 100, profitPerPiece: 5 },
        { id: 'product2', billId: null, totalQuantity: 5, totalAmount: 50, profitPerPiece: 3 },
        { id: 'product3', totalQuantity: 3, totalAmount: 30, profitPerPiece: 2 }
      ];

      const mockBills = [
        { id: 'bill1', billNumber: 'B001', totalQuantity: 10, totalAmount: 100, totalProfit: 50, productCount: 1 }
      ];

      getShopProducts.mockResolvedValue(mockProducts);
      getBills.mockResolvedValue(mockBills);

      const result = await validateDataIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('missing_bill_id');
      expect(result.issues[0].count).toBe(2);
      expect(result.issues[0].productIds).toEqual(['product2', 'product3']);
    });

    it('should detect invalid billId references', async () => {
      const mockProducts = [
        { id: 'product1', billId: 'bill1', totalQuantity: 10, totalAmount: 100, profitPerPiece: 5 },
        { id: 'product2', billId: 'invalid_bill', totalQuantity: 5, totalAmount: 50, profitPerPiece: 3 }
      ];

      const mockBills = [
        { id: 'bill1', billNumber: 'B001', totalQuantity: 10, totalAmount: 100, totalProfit: 50, productCount: 1 }
      ];

      getShopProducts.mockResolvedValue(mockProducts);
      getBills.mockResolvedValue(mockBills);

      const result = await validateDataIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('invalid_bill_id');
      expect(result.issues[0].count).toBe(1);
      expect(result.issues[0].productIds).toEqual(['product2']);
    });

    it('should detect bill total mismatches', async () => {
      const mockProducts = [
        { id: 'product1', billId: 'bill1', totalQuantity: 10, totalAmount: 100, profitPerPiece: 5 }
      ];

      const mockBills = [
        { 
          id: 'bill1', 
          billNumber: 'B001',
          totalQuantity: 15, // Should be 10
          totalAmount: 200,  // Should be 100
          totalProfit: 100,  // Should be 50
          productCount: 2    // Should be 1
        }
      ];

      getShopProducts.mockResolvedValue(mockProducts);
      getBills.mockResolvedValue(mockBills);

      const result = await validateDataIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('bill_total_mismatch');
      expect(result.issues[0].mismatches).toHaveLength(4); // All 4 fields mismatch
    });

    it('should detect duplicate bill numbers', async () => {
      const mockProducts = [];
      const mockBills = [
        { id: 'bill1', billNumber: 'B001' },
        { id: 'bill2', billNumber: 'B001' },
        { id: 'bill3', billNumber: 'B002' }
      ];

      getShopProducts.mockResolvedValue(mockProducts);
      getBills.mockResolvedValue(mockBills);

      const result = await validateDataIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('duplicate_bill_numbers');
      expect(result.issues[0].duplicates).toEqual(['B001']);
    });

    it('should detect bills without products as warnings', async () => {
      const mockProducts = [
        { id: 'product1', billId: 'bill1', totalQuantity: 10, totalAmount: 100, profitPerPiece: 5 }
      ];

      const mockBills = [
        { id: 'bill1', billNumber: 'B001', totalQuantity: 10, totalAmount: 100, totalProfit: 50, productCount: 1 },
        { id: 'bill2', billNumber: 'B002', totalQuantity: 0, totalAmount: 0, totalProfit: 0, productCount: 0 }
      ];

      getShopProducts.mockResolvedValue(mockProducts);
      getBills.mockResolvedValue(mockBills);

      const result = await validateDataIntegrity();

      expect(result.isValid).toBe(true); // Warnings don't make it invalid
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('bills_without_products');
      expect(result.warnings[0].billIds).toEqual(['bill2']);
    });
  });

  describe('fixDataIntegrityIssues', () => {
    it('should fix bill total mismatches', async () => {
      const validationResult = {
        issues: [
          {
            type: 'bill_total_mismatch',
            mismatches: [
              { billId: 'bill1', billNumber: 'B001', field: 'totalAmount' },
              { billId: 'bill2', billNumber: 'B002', field: 'totalQuantity' }
            ]
          }
        ]
      };

      recalculateBillTotals.mockResolvedValue({});

      const result = await fixDataIntegrityIssues(validationResult);

      expect(result.success).toBe(true);
      expect(result.fixedIssues).toHaveLength(1);
      expect(result.fixedIssues[0].type).toBe('bill_total_mismatch');
      expect(recalculateBillTotals).toHaveBeenCalledWith('bill1');
      expect(recalculateBillTotals).toHaveBeenCalledWith('bill2');
    });

    it('should fix invalid bill references', async () => {
      const validationResult = {
        issues: [
          {
            type: 'invalid_bill_id',
            productIds: ['product1', 'product2']
          }
        ]
      };

      updateShopProduct.mockResolvedValue({});

      const result = await fixDataIntegrityIssues(validationResult);

      expect(result.success).toBe(true);
      expect(result.fixedIssues).toHaveLength(1);
      expect(result.fixedIssues[0].type).toBe('invalid_bill_id');
      expect(updateShopProduct).toHaveBeenCalledWith('product1', { billId: null, billNumber: null });
      expect(updateShopProduct).toHaveBeenCalledWith('product2', { billId: null, billNumber: null });
    });

    it('should handle unfixable issues', async () => {
      const validationResult = {
        issues: [
          {
            type: 'duplicate_bill_numbers',
            message: 'Duplicate bill numbers found'
          }
        ]
      };

      const result = await fixDataIntegrityIssues(validationResult);

      expect(result.success).toBe(false);
      expect(result.unfixedIssues).toHaveLength(1);
      expect(result.unfixedIssues[0].type).toBe('duplicate_bill_numbers');
    });

    it('should handle no issues to fix', async () => {
      const validationResult = { issues: [] };

      const result = await fixDataIntegrityIssues(validationResult);

      expect(result.success).toBe(true);
      expect(result.fixedIssues).toEqual([]);
    });
  });

  describe('migrateProductsToBills', () => {
    beforeEach(() => {
      // Mock all the sub-functions
      jest.spyOn(MigrationService, 'groupProductsByBillNumber').mockResolvedValue({
        groupedProducts: { 'B001': [{ id: 'product1' }] },
        orphanedProducts: [{ id: 'product2' }],
        totalProducts: 2,
        groupCount: 1
      });

      jest.spyOn(MigrationService, 'createBillsFromGroups').mockResolvedValue({
        createdBills: [{ bill: { id: 'bill1' }, originalBillNumber: 'B001' }],
        successCount: 1,
        errorCount: 0
      });

      jest.spyOn(MigrationService, 'updateProductsWithBillReferences').mockResolvedValue({
        successCount: 1,
        errorCount: 0
      });

      jest.spyOn(MigrationService, 'handleOrphanedProducts').mockResolvedValue({
        createdBills: [{ bill: { id: 'bill2' } }],
        updateResults: [{ productId: 'product2' }],
        successCount: 1,
        errorCount: 0
      });

      jest.spyOn(MigrationService, 'validateDataIntegrity').mockResolvedValue({
        isValid: true,
        issues: [],
        warnings: []
      });
    });

    it('should complete full migration successfully', async () => {
      const result = await migrateProductsToBills();

      expect(result.success).toBe(true);
      expect(result.totalProductsProcessed).toBe(2);
      expect(result.billGroupsFound).toBe(1);
      expect(result.orphanedProductsFound).toBe(1);
      expect(result.totalBillsCreated).toBe(2);
      expect(result.totalProductsUpdated).toBe(2);
      expect(result.totalErrors).toBe(0);
      expect(result.dataIntegrityValid).toBe(true);
      expect(result.duration).toMatch(/^\d+\.\d{2}s$/);
    });

    it('should handle migration errors gracefully', async () => {
      jest.spyOn(MigrationService, 'groupProductsByBillNumber').mockRejectedValue(new Error('Grouping failed'));

      const result = await migrateProductsToBills();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Grouping failed');
    });
  });
});