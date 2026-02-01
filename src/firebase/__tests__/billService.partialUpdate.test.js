import { updateBill } from '../billService';

jest.mock('firebase/firestore', () => {
  const original = jest.requireActual('firebase/firestore');
  return {
    ...original,
    doc: jest.fn(() => ({})),
    updateDoc: jest.fn(async () => {}),
    getDoc: jest.fn(async () => ({
      exists: () => true,
      id: 'bill_1',
      data: () => ({
        billNumber: 'B001',
        date: new Date(),
        vendor: 'Vendor A',
        notes: 'n',
        status: 'active'
      })
    })),
    query: jest.fn(),
    collection: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn(async () => ({ empty: true })),
    serverTimestamp: jest.fn(() => new Date())
  };
});

describe('billService.updateBill partial updates', () => {
  it('updates only status without requiring other fields', async () => {
    await expect(updateBill('bill_1', { status: 'archived' })).resolves.toBeTruthy();
  });

  it('checks duplicate number only when billNumber changes', async () => {
    // No billNumber in update; should not throw
    await expect(updateBill('bill_1', { notes: 'updated' })).resolves.toBeTruthy();
  });
});


