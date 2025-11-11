// Mock Firebase first
jest.mock('../config', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
  limit: jest.fn(),
  startAfter: jest.fn(),
  getDoc: jest.fn()
}));

// Mock billService
jest.mock('../billService', () => ({
  getBill: jest.fn(),
  recalculateBillTotals: jest.fn(),
  debouncedRecalculateBillTotals: jest.fn()
}));

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  limit,
  startAfter,
  getDoc
} from 'firebase/firestore';

import { getBill, recalculateBillTotals, debouncedRecalculateBillTotals } from '../billService';

import {
  addShopProduct,
  getProductsByBill,
  validateBillAssociation,
  moveProductToBill,
  removeProductFromBill,
  getUnassignedProducts,
  bulkMoveProductsToBill,
  getProductsWithBillFilter
} from '../shopProductService';

describe('Enhanced ShopProductService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    collection.mockReturnValue('mock-collection');
    doc.mockReturnValue('mock-doc');
    query.mockReturnValue('mock-query');
    orderBy.mockReturnValue('mock-orderBy');
    where.mockReturnValue('mock-where');
    serverTimestamp.mockReturnValue(new Date());
  });

  describe('addShopProduct', () => {
    const mockProductData = {
      productName: 'Test Product',
      category: 'Electronics',
      mrp: 100,
      totalQuantity: 10,
      totalAmount: 1000
    };

    it('should add product without bill association', async () => {
      const mockDocRef = { id: 'product123' };
      addDoc.mockResolvedValue(mockDocRef);

      const result = await addShopProduct(mockProductData);

      expect(addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          ...mockProductData,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      );
      expect(result).toEqual({
        id: 'product123',
        ...mockProductData
      });
    });

    it('should add product with valid bill association', async () => {
      const billId = 'bill123';
      const mockBill = { id: billId, billNumber: 'B001', status: 'active' };
      const mockDocRef = { id: 'product123' };

      getBill.mockResolvedValue(mockBill);
      addDoc.mockResolvedValue(mockDocRef);
      recalculateBillTotals.mockResolvedValue();

      const result = await addShopProduct(mockProductData, billId);

      expect(getBill).toHaveBeenCalledWith(billId);
      expect(addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          ...mockProductData,
          billId: billId,
          billNumber: 'B001',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      );
      expect(debouncedRecalculateBillTotals).toHaveBeenCalledWith(billId);
    });

    it('should throw error for invalid bill association', async () => {
      const billId = 'invalid-bill';
      getBill.mockResolvedValue(null);

      await expect(addShopProduct(mockProductData, billId))
        .rejects.toThrow('Bill validation failed: Bill not found');
    });

    it('should throw error for archived bill', async () => {
      const billId = 'archived-bill';
      const mockBill = { id: billId, billNumber: 'B001', status: 'archived' };
      getBill.mockResolvedValue(mockBill);

      await expect(addShopProduct(mockProductData, billId))
        .rejects.toThrow('Bill validation failed: Cannot associate products with archived bills');
    });
  });

  describe('getProductsByBill', () => {
    it('should get products by bill ID', async () => {
      const billId = 'bill123';
      const mockProducts = [
        { id: 'product1', productName: 'Product 1', billId },
        { id: 'product2', productName: 'Product 2', billId }
      ];

      const mockQuerySnapshot = {
        forEach: jest.fn((callback) => {
          mockProducts.forEach((product) => {
            callback({ id: product.id, data: () => product });
          });
        })
      };

      getDocs.mockResolvedValue(mockQuerySnapshot);

      const result = await getProductsByBill(billId);

      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('billId', '==', billId);
      expect(result).toEqual(mockProducts);
    });

    it('should throw error for missing bill ID', async () => {
      await expect(getProductsByBill(null))
        .rejects.toThrow('Bill ID is required');
    });
  });

  describe('validateBillAssociation', () => {
    it('should validate active bill', async () => {
      const billId = 'bill123';
      const mockBill = { id: billId, billNumber: 'B001', status: 'active' };
      getBill.mockResolvedValue(mockBill);

      const result = await validateBillAssociation(billId);

      expect(result).toEqual({
        isValid: true,
        bill: mockBill
      });
    });

    it('should reject missing bill ID', async () => {
      const result = await validateBillAssociation(null);

      expect(result).toEqual({
        isValid: false,
        error: 'Bill ID is required'
      });
    });

    it('should reject non-existent bill', async () => {
      const billId = 'nonexistent';
      getBill.mockResolvedValue(null);

      const result = await validateBillAssociation(billId);

      expect(result).toEqual({
        isValid: false,
        error: 'Bill not found'
      });
    });

    it('should reject archived bill', async () => {
      const billId = 'archived-bill';
      const mockBill = { id: billId, billNumber: 'B001', status: 'archived' };
      getBill.mockResolvedValue(mockBill);

      const result = await validateBillAssociation(billId);

      expect(result).toEqual({
        isValid: false,
        error: 'Cannot associate products with archived bills'
      });
    });
  });

  describe('moveProductToBill', () => {
    const productId = 'product123';
    const newBillId = 'bill456';

    it('should throw error for missing parameters', async () => {
      await expect(moveProductToBill(null, newBillId))
        .rejects.toThrow('Product ID and new Bill ID are required');

      await expect(moveProductToBill(productId, null))
        .rejects.toThrow('Product ID and new Bill ID are required');
    });

    it('should throw error for invalid target bill', async () => {
      getBill.mockResolvedValue(null);

      await expect(moveProductToBill(productId, newBillId))
        .rejects.toThrow('Target bill validation failed: Bill not found');
    });
  });

  describe('removeProductFromBill', () => {
    it('should throw error for missing product ID', async () => {
      await expect(removeProductFromBill(null))
        .rejects.toThrow('Product ID is required');
    });
  });

  describe('bulkMoveProductsToBill', () => {
    const productIds = ['product1', 'product2'];
    const billId = 'bill123';

    it('should throw error for invalid parameters', async () => {
      await expect(bulkMoveProductsToBill([], billId))
        .rejects.toThrow('Product IDs array is required and cannot be empty');

      await expect(bulkMoveProductsToBill(productIds, null))
        .rejects.toThrow('Bill ID is required');
    });
  });

  describe('getUnassignedProducts', () => {
    it('should get products without bill association', async () => {
      const mockProducts = [
        { id: 'product1', productName: 'Product 1', billId: null },
        { id: 'product2', productName: 'Product 2', billId: null }
      ];

      const mockQuerySnapshot = {
        forEach: jest.fn((callback) => {
          mockProducts.forEach((product) => {
            callback({ id: product.id, data: () => product });
          });
        })
      };

      getDocs.mockResolvedValue(mockQuerySnapshot);

      const result = await getUnassignedProducts();

      expect(where).toHaveBeenCalledWith('billId', '==', null);
      expect(result).toEqual(mockProducts);
    });
  });

  describe('getProductsWithBillFilter', () => {
    const mockProducts = [
      { id: 'product1', productName: 'Product 1', billId: 'bill1', billNumber: 'B001' },
      { id: 'product2', productName: 'Product 2', billId: 'bill2', billNumber: 'B002' },
      { id: 'product3', productName: 'Product 3', billId: null, billNumber: null }
    ];

    beforeEach(() => {
      const mockQuerySnapshot = {
        forEach: jest.fn((callback) => {
          mockProducts.forEach((product) => {
            callback({ id: product.id, data: () => product });
          });
        })
      };
      getDocs.mockResolvedValue(mockQuerySnapshot);
    });

    it('should filter products by bill ID', async () => {
      const filters = { billId: 'bill1' };
      
      await getProductsWithBillFilter(filters);

      expect(where).toHaveBeenCalledWith('billId', '==', 'bill1');
    });

    it('should filter products with bills', async () => {
      const filters = { hasBill: true };
      
      await getProductsWithBillFilter(filters);

      expect(where).toHaveBeenCalledWith('billId', '!=', null);
    });

    it('should filter products without bills', async () => {
      const filters = { hasBill: false };
      
      await getProductsWithBillFilter(filters);

      expect(where).toHaveBeenCalledWith('billId', '==', null);
    });
  });
});