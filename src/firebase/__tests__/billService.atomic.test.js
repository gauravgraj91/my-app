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

import { getDocs, getDoc, addDoc, doc, writeBatch } from 'firebase/firestore';
import { createBillWithProducts, updateBillWithProducts } from '../billService';

const emptySnapshot = { empty: true, docs: [], forEach: () => {} };

const validBill = {
  billNumber: 'B001',
  vendor: 'Acme',
  date: new Date('2026-07-01'),
  status: 'active'
};

const twoProducts = [
  { productName: 'Soap', totalQuantity: 10, totalAmount: 100, mrp: 15 },
  { productName: 'Oil', totalQuantity: 5, totalAmount: 250, mrp: 60 }
];

describe('atomic bill writes', () => {
  let batch;

  beforeEach(() => {
    jest.clearAllMocks();
    batch = {
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue()
    };
    writeBatch.mockReturnValue(batch);
    doc.mockImplementation(() => ({ id: `ref-${doc.mock.calls.length}` }));
  });

  describe('createBillWithProducts', () => {
    it('writes the bill and all products in a single batch commit', async () => {
      getDocs.mockResolvedValue(emptySnapshot); // no duplicate bill number

      const result = await createBillWithProducts(validBill, twoProducts, 'tenant-1');

      expect(batch.set).toHaveBeenCalledTimes(3); // 1 bill + 2 products
      expect(batch.commit).toHaveBeenCalledTimes(1);
      expect(addDoc).not.toHaveBeenCalled();
      expect(result.billNumber).toBe('B001');
      expect(result.id).toBeTruthy();
    });

    it('stamps tenantId and billId on every product document', async () => {
      getDocs.mockResolvedValue(emptySnapshot);

      const result = await createBillWithProducts(validBill, twoProducts, 'tenant-1');

      const productWrites = batch.set.mock.calls.slice(1); // first call is the bill
      productWrites.forEach(([, data]) => {
        expect(data.tenantId).toBe('tenant-1');
        expect(data.billId).toBe(result.id);
        expect(data.billNumber).toBe('B001');
      });
    });

    it('writes nothing when the bill number already exists', async () => {
      getDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'other', data: () => ({ billNumber: 'B001' }) }],
        forEach: () => {}
      });

      await expect(
        createBillWithProducts(validBill, twoProducts, 'tenant-1')
      ).rejects.toThrow('already exists');

      expect(batch.commit).not.toHaveBeenCalled();
    });
  });

  describe('updateBillWithProducts', () => {
    it('updates the bill, swaps products, and commits once', async () => {
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'bill-1',
        data: () => ({ ...validBill, tenantId: 'tenant-1' })
      });
      // existing products query
      const oldDocs = [{ id: 'p1', data: () => ({}) }, { id: 'p2', data: () => ({}) }];
      getDocs.mockResolvedValue({
        empty: false,
        docs: oldDocs,
        forEach: (cb) => oldDocs.forEach(cb)
      });

      await updateBillWithProducts('bill-1', { vendor: 'NewVendor' }, twoProducts, 'tenant-1');

      expect(batch.update).toHaveBeenCalledTimes(1); // the bill doc
      expect(batch.delete).toHaveBeenCalledTimes(2); // old products
      expect(batch.set).toHaveBeenCalledTimes(2); // new products
      expect(batch.commit).toHaveBeenCalledTimes(1);
    });
  });
});
