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

import { getDoc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { bulkUpdateBillStatus, bulkDeleteBills } from '../billService';

const emptySnapshot = { empty: true, docs: [], forEach: () => {} };

const validBillDoc = {
  exists: () => true,
  id: 'bill-x',
  data: () => ({
    billNumber: 'B001',
    tenantId: 'tenant-1',
    vendor: 'Acme',
    date: new Date(),
    status: 'active'
  })
};

describe('bulk operation progress callbacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDoc.mockResolvedValue(validBillDoc);
    getDocs.mockResolvedValue(emptySnapshot);
    updateDoc.mockResolvedValue();
    writeBatch.mockReturnValue({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue()
    });
  });

  it('bulkUpdateBillStatus reports progress after each bill', async () => {
    const onProgress = jest.fn();

    await bulkUpdateBillStatus(['b1', 'b2'], 'archived', { onProgress });

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 'b1');
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 'b2');
  });

  it('bulkDeleteBills reports progress after each bill', async () => {
    const onProgress = jest.fn();

    await bulkDeleteBills(['b1', 'b2'], { onProgress });

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 'b1');
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 'b2');
  });
});
