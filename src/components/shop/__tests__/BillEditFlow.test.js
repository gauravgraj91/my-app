import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import BillCreateModal from '../BillCreateModal';
import BillsView from '../BillsView';

// Mock useBills context
const mockHandleEditBill = jest.fn();
const mockHandleCreateBill = jest.fn();
const mockHandleSelectBill = jest.fn();
const mockHandleSelectAll = jest.fn();
const mockClearSelection = jest.fn();
const mockHandleBulkDelete = jest.fn();
const mockHandleBulkDuplicate = jest.fn();
const mockHandleBulkArchive = jest.fn();
const mockHandleBulkExport = jest.fn();
const mockRetrySubscription = jest.fn();
const mockHandleAddProductToBill = jest.fn();
const mockSetShowConflictModal = jest.fn();
const mockHandleAcknowledgeConflict = jest.fn();
const mockHandleClearAllConflicts = jest.fn();

const mockBills = [
  {
    id: 'bill-1',
    billNumber: 'B001',
    date: new Date('2024-01-15'),
    vendor: 'Test Vendor',
    notes: 'Test notes',
    status: 'active',
    totalAmount: 1000,
    totalProfit: 100,
    productCount: 2
  },
  {
    id: 'bill-2',
    billNumber: 'B002',
    date: new Date('2024-02-20'),
    vendor: 'Another Vendor',
    notes: '',
    status: 'paid',
    totalAmount: 2000,
    totalProfit: 200,
    productCount: 3
  }
];

const mockContextValue = {
  bills: mockBills,
  billProducts: {
    'bill-1': [
      { id: 'p1', productName: 'Product A', category: 'Electronics', totalQuantity: 5, mrp: 120, totalAmount: 500 }
    ],
    'bill-2': []
  },
  loading: false,
  error: null,
  isRetrying: false,
  retryCount: 0,
  analytics: null,
  analyticsLoading: false,
  selectedBills: new Set(),
  handleSelectBill: mockHandleSelectBill,
  handleSelectAll: mockHandleSelectAll,
  clearSelection: mockClearSelection,
  handleCreateBill: mockHandleCreateBill,
  handleEditBill: mockHandleEditBill,
  handleAddProductToBill: mockHandleAddProductToBill,
  bulkActionLoading: false,
  bulkOperationStatus: null,
  handleBulkDelete: mockHandleBulkDelete,
  handleBulkDuplicate: mockHandleBulkDuplicate,
  handleBulkArchive: mockHandleBulkArchive,
  handleBulkExport: mockHandleBulkExport,
  conflicts: [],
  showConflictModal: false,
  setShowConflictModal: mockSetShowConflictModal,
  handleAcknowledgeConflict: mockHandleAcknowledgeConflict,
  handleClearAllConflicts: mockHandleClearAllConflicts,
  retrySubscription: mockRetrySubscription,
};

jest.mock('../../../context/BillsContext', () => ({
  useBills: () => mockContextValue
}));

jest.mock('../../../firebase/billService', () => ({
  BillModel: {
    generateBillNumber: jest.fn(() => 'B003'),
    validate: jest.fn(() => null)
  }
}));

jest.mock('../../../utils/errorHandling', () => ({
  getErrorMessage: jest.fn(() => ({ title: 'Error', message: 'Something went wrong' })),
  getRecoveryOptions: jest.fn(() => []),
  classifyError: jest.fn(e => e),
  reportError: jest.fn()
}));

jest.mock('../../../hooks/usePagination', () => ({
  usePagination: (data) => ({
    currentPageData: data,
    totalPages: 1,
    currentPage: 1
  })
}));

jest.mock('../../../utils/cacheUtils', () => ({
  billCacheUtils: { set: jest.fn(), get: jest.fn() }
}));

jest.mock('../../../utils/formatters', () => ({
  formatCurrency: (val) => `₹${(val || 0).toLocaleString()}`,
  formatDate: (date) => {
    if (!date) return '-';
    const d = date?.toDate ? date.toDate() : date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-IN');
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockContextValue.selectedBills = new Set();
});

// ─── BillCreateModal in edit mode ───

describe('BillCreateModal - Edit Mode', () => {
  const editBill = mockBills[0];

  test('renders with "Edit Bill" title when mode is edit', () => {
    render(
      <BillCreateModal isOpen={true} onClose={jest.fn()} mode="edit" bill={editBill} />
    );
    expect(screen.getByText('Edit Bill')).toBeInTheDocument();
  });

  test('pre-fills form with bill data', () => {
    render(
      <BillCreateModal isOpen={true} onClose={jest.fn()} mode="edit" bill={editBill} />
    );
    expect(screen.getByDisplayValue('B001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Vendor')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument();
  });

  test('shows "Save Changes" button in edit mode', () => {
    render(
      <BillCreateModal isOpen={true} onClose={jest.fn()} mode="edit" bill={editBill} />
    );
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.queryByText('Create Bill')).not.toBeInTheDocument();
  });

  test('calls handleEditBill on submit in edit mode', async () => {
    mockHandleEditBill.mockResolvedValue();
    const mockOnClose = jest.fn();

    render(
      <BillCreateModal isOpen={true} onClose={mockOnClose} mode="edit" bill={editBill} />
    );

    // Change vendor
    const vendorInput = screen.getByDisplayValue('Test Vendor');
    fireEvent.change(vendorInput, { target: { value: 'Updated Vendor' } });

    // Submit
    const saveBtn = screen.getByText('Save Changes');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(mockHandleEditBill).toHaveBeenCalledWith(
        'bill-1',
        expect.objectContaining({
          vendor: 'Updated Vendor',
          billNumber: 'B001'
        })
      );
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('does NOT call handleCreateBill in edit mode', async () => {
    mockHandleEditBill.mockResolvedValue();

    render(
      <BillCreateModal isOpen={true} onClose={jest.fn()} mode="edit" bill={editBill} />
    );

    const saveBtn = screen.getByText('Save Changes');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(mockHandleEditBill).toHaveBeenCalled();
    });
    expect(mockHandleCreateBill).not.toHaveBeenCalled();
  });

  test('shows error on edit failure', async () => {
    mockHandleEditBill.mockRejectedValue(new Error('Update failed'));

    render(
      <BillCreateModal isOpen={true} onClose={jest.fn()} mode="edit" bill={editBill} />
    );

    const saveBtn = screen.getByText('Save Changes');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/Update failed/)).toBeInTheDocument();
    });
  });

  test('allows editing bill number without uniqueness conflict on self', async () => {
    mockHandleEditBill.mockResolvedValue();

    render(
      <BillCreateModal isOpen={true} onClose={jest.fn()} mode="edit" bill={editBill} />
    );

    // Keep same bill number B001 - should NOT trigger "already exists"
    const saveBtn = screen.getByText('Save Changes');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(mockHandleEditBill).toHaveBeenCalled();
    });
    expect(screen.queryByText('Bill number already exists')).not.toBeInTheDocument();
  });

  test('blocks duplicate bill number from another bill', async () => {
    render(
      <BillCreateModal isOpen={true} onClose={jest.fn()} mode="edit" bill={editBill} />
    );

    // Change bill number to B002 which belongs to bill-2
    const billNumberInput = screen.getByDisplayValue('B001');
    fireEvent.change(billNumberInput, { target: { value: 'B002' } });

    const saveBtn = screen.getByText('Save Changes');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Bill number already exists')).toBeInTheDocument();
    });
    expect(mockHandleEditBill).not.toHaveBeenCalled();
  });
});

// ─── BillCreateModal in create mode (unchanged behavior) ───

describe('BillCreateModal - Create Mode (unchanged)', () => {
  test('renders with "Create New Bill" title by default', () => {
    render(
      <BillCreateModal isOpen={true} onClose={jest.fn()} />
    );
    expect(screen.getByText('Create New Bill')).toBeInTheDocument();
  });

  test('shows "Create Bill" button in create mode', () => {
    render(
      <BillCreateModal isOpen={true} onClose={jest.fn()} />
    );
    expect(screen.getByText('Create Bill')).toBeInTheDocument();
  });

  test('calls handleCreateBill on submit in create mode', async () => {
    mockHandleCreateBill.mockResolvedValue();

    render(
      <BillCreateModal isOpen={true} onClose={jest.fn()} />
    );

    // Fill required vendor
    const vendorInputs = screen.getAllByPlaceholderText('Enter vendor name');
    fireEvent.change(vendorInputs[0], { target: { value: 'New Vendor' } });

    const createBtn = screen.getByText('Create Bill');
    await act(async () => {
      fireEvent.click(createBtn);
    });

    await waitFor(() => {
      expect(mockHandleCreateBill).toHaveBeenCalled();
    });
    expect(mockHandleEditBill).not.toHaveBeenCalled();
  });
});

// ─── BillsView edit button ───

describe('BillsView - Edit Button', () => {
  test('renders edit buttons (pencil icon) in each row', () => {
    render(<BillsView />);

    const editButtons = screen.getAllByTitle('Edit bill');
    expect(editButtons).toHaveLength(2); // one per bill
  });

  test('clicking edit button opens edit modal', async () => {
    render(<BillsView />);

    // Click edit on first bill
    const editButtons = screen.getAllByTitle('Edit bill');
    fireEvent.click(editButtons[0]);

    // Modal should open in edit mode
    await waitFor(() => {
      expect(screen.getByText('Edit Bill')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  test('edit modal closes and clears state on close', async () => {
    render(<BillsView />);

    // Open edit modal
    const editButtons = screen.getAllByTitle('Edit bill');
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Bill')).toBeInTheDocument();
    });

    // Close the modal
    const cancelBtn = screen.getByText('Cancel');
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    await waitFor(() => {
      expect(screen.queryByText('Edit Bill')).not.toBeInTheDocument();
    });
  });

  test('submitting edit modal calls handleEditBill', async () => {
    mockHandleEditBill.mockResolvedValue();

    render(<BillsView />);

    // Default sort is date desc, so bill-2 (Feb 20) is first, bill-1 (Jan 15) second
    const editButtons = screen.getAllByTitle('Edit bill');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Bill')).toBeInTheDocument();
    });

    // Submit the form as-is (pre-filled data from bill-2)
    const saveBtn = screen.getByText('Save Changes');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(mockHandleEditBill).toHaveBeenCalledWith(
        'bill-2',
        expect.objectContaining({ billNumber: 'B002', vendor: 'Another Vendor' })
      );
    });
  });
});

// ─── BillsView bulk action edit button ───

describe('BillsView - Bulk Action Edit', () => {
  test('shows edit button in bulk bar when 1 bill selected', () => {
    mockContextValue.selectedBills = new Set(['bill-1']);

    render(<BillsView />);

    // The floating bar should appear
    expect(screen.getByText('selected')).toBeInTheDocument();
    // Edit button should be present
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  test('edit button in bulk bar is disabled when >1 bill selected', () => {
    mockContextValue.selectedBills = new Set(['bill-1', 'bill-2']);

    render(<BillsView />);

    const editButton = screen.getByText('Edit').closest('button');
    expect(editButton).toHaveStyle('opacity: 0.5');
  });

  test('clicking edit in bulk bar opens edit modal for the selected bill', async () => {
    mockContextValue.selectedBills = new Set(['bill-1']);

    render(<BillsView />);

    const editButton = screen.getByText('Edit').closest('button');
    await act(async () => {
      fireEvent.click(editButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Bill')).toBeInTheDocument();
      expect(screen.getByDisplayValue('B001')).toBeInTheDocument();
    });
  });
});
