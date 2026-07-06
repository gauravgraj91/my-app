// Mock Firebase before importing the service
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
  getDoc: jest.fn(),
  writeBatch: jest.fn(),
  runTransaction: jest.fn()
}));

import { getDocs, getDoc, updateDoc, where } from 'firebase/firestore';
import { getBillAnalytics } from '../billAnalytics';
import { updateBill, searchBillsAndProducts } from '../billService';
import { getProductsByBill } from '../shopProductService';

const emptySnapshot = { empty: true, docs: [], forEach: () => {} };

describe('tenant scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBillAnalytics', () => {
    it('queries bills scoped to the given tenantId', async () => {
      getDocs.mockResolvedValue(emptySnapshot);

      await getBillAnalytics('tenant-1');

      expect(where).toHaveBeenCalledWith('tenantId', '==', 'tenant-1');
    });
  });

  describe('updateBill duplicate check', () => {
    it('scopes the bill-number duplicate check to the existing bill tenant', async () => {
      const existingBill = {
        billNumber: 'B001',
        tenantId: 'tenant-1',
        vendor: 'Acme',
        date: new Date(),
        status: 'active'
      };
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'bill-1',
        data: () => existingBill
      });
      getDocs.mockResolvedValue(emptySnapshot);
      updateDoc.mockResolvedValue();

      await updateBill('bill-1', { billNumber: 'B002' });

      expect(where).toHaveBeenCalledWith('billNumber', '==', 'B002');
      expect(where).toHaveBeenCalledWith('tenantId', '==', 'tenant-1');
    });
  });

  describe('getProductsByBill', () => {
    it('adds a tenantId filter when a tenantId is provided', async () => {
      getDocs.mockResolvedValue(emptySnapshot);

      await getProductsByBill('bill-1', 'tenant-1');

      expect(where).toHaveBeenCalledWith('billId', '==', 'bill-1');
      expect(where).toHaveBeenCalledWith('tenantId', '==', 'tenant-1');
    });
  });

  describe('searchBillsAndProducts', () => {
    it('scopes the product search to the given tenantId', async () => {
      getDocs.mockResolvedValue(emptySnapshot);

      await searchBillsAndProducts('widget', 'tenant-1');

      const tenantCalls = where.mock.calls.filter(
        ([field, , value]) => field === 'tenantId' && value === 'tenant-1'
      );
      // one for the bills query, one for the products query
      expect(tenantCalls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
