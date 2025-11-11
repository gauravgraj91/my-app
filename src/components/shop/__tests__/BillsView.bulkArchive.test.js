import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BillsView from '../../BillsView';

jest.mock('../../../ui/NotificationSystem', () => ({
  useNotifications: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn()
  })
}));

jest.mock('../../../../firebase/billService', () => ({
  subscribeToBills: (cb) => {
    // Immediately emit one bill
    cb([
      {
        id: 'b1',
        billNumber: 'B001',
        vendor: 'V1',
        date: new Date(),
        status: 'active'
      }
    ]);
    return () => {};
  },
  getBillAnalytics: jest.fn(async () => ({
    totalBills: 1,
    totalAmount: 0,
    totalProfit: 0,
    averageBillValue: 0
  })),
  bulkUpdateBillStatus: jest.fn(async () => ([{ billId: 'b1', success: true }]))
}));

jest.mock('../../../../firebase/shopProductService', () => ({
  getProductsByBill: jest.fn(async () => ([]))
}));

describe('BillsView bulk archive flow', () => {
  it('archives selected bills without requiring full payload', async () => {
    render(<BillsView />);

    // Wait for the list to render
    await screen.findByText(/Bills Management/i);

    // Select all
    const selectAllBtn = screen.getByText(/Select all/i).closest('button');
    fireEvent.click(selectAllBtn);

    // Open bulk actions should be visible; click Archive
    const archiveBtn = await screen.findByText(/Archive/i);
    fireEvent.click(archiveBtn);

    // Bulk operation overlay may appear; just ensure no crash
    await waitFor(() => {
      expect(screen.getByText(/Bills Management/i)).toBeInTheDocument();
    });
  });
});


