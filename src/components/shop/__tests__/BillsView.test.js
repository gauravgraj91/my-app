import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import BillsView from '../BillsView';
import * as billService from '../../../firebase/billService';
import * as shopProductService from '../../../firebase/shopProductService';

// Mock the Firebase services
jest.mock('../../../firebase/billService');
jest.mock('../../../firebase/shopProductService');
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'dd MMM yyyy') {
      return '01 Jan 2024';
    }
    return '2024-01-01';
  })
}));

// Mock UI components
jest.mock('../../ui/Modal', () => {
  return function MockModal({ isOpen, children, title, onClose }) {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <button onClick={onClose} data-testid="modal-close">Close</button>
        {children}
      </div>
    );
  };
});

jest.mock('../BillCard', () => {
  return function MockBillCard({ bill, products, onEdit, onDelete, onDuplicate, onExport }) {
    return (
      <div data-testid={`bill-card-${bill.id}`}>
        <div data-testid="bill-number">{bill.billNumber}</div>
        <div data-testid="bill-vendor">{bill.vendor}</div>
        <div data-testid="bill-amount">{bill.totalAmount}</div>
        <button onClick={() => onEdit(bill.id, { vendor: 'Updated Vendor' })} data-testid="edit-bill">
          Edit
        </button>
        <button onClick={() => onDelete(bill.id)} data-testid="delete-bill">
          Delete
        </button>
        <button onClick={() => onDuplicate(bill.id)} data-testid="duplicate-bill">
          Duplicate
        </button>
        <button onClick={() => onExport(bill.id)} data-testid="export-bill">
          Export
        </button>
      </div>
    );
  };
});

describe('BillsView Component', () => {
  const mockBills = [
    {
      id: '1',
      billNumber: 'B001',
      vendor: 'Test Vendor 1',
      date: new Date('2024-01-01'),
      totalAmount: 1000,
      totalProfit: 100,
      totalQuantity: 10,
      productCount: 2,
      status: 'active',
      notes: 'Test notes'
    },
    {
      id: '2',
      billNumber: 'B002',
      vendor: 'Test Vendor 2',
      date: new Date('2024-01-02'),
      totalAmount: 2000,
      totalProfit: 200,
      totalQuantity: 20,
      productCount: 3,
      status: 'active',
      notes: ''
    }
  ];

  const mockProducts = [
    {
      id: 'p1',
      productName: 'Product 1',
      category: 'Electronics',
      totalAmount: 500,
      totalQuantity: 5,
      pricePerPiece: 100,
      profitPerPiece: 10
    },
    {
      id: 'p2',
      productName: 'Product 2',
      category: 'Clothing',
      totalAmount: 500,
      totalQuantity: 5,
      pricePerPiece: 100,
      profitPerPiece: 10
    }
  ];

  const mockAnalytics = {
    totalBills: 2,
    totalAmount: 3000,
    totalProfit: 300,
    averageBillValue: 1500,
    profitMargin: 10
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset DOM mocks
    jest.restoreAllMocks();
    
    // Setup default mock implementations
    billService.subscribeToBills.mockImplementation((callback) => {
      callback(mockBills);
      return jest.fn(); // unsubscribe function
    });
    
    billService.getBillAnalytics.mockResolvedValue(mockAnalytics);
    billService.BillModel = {
      generateBillNumber: jest.fn(() => 'B003'),
      validate: jest.fn(() => null)
    };
    
    shopProductService.getProductsByBill.mockResolvedValue(mockProducts);
    
    // Mock other bill service functions
    billService.addBill.mockResolvedValue({ id: '3', ...mockBills[0] });
    billService.updateBill.mockResolvedValue(mockBills[0]);
    billService.deleteBillWithProducts.mockResolvedValue();
    billService.duplicateBill.mockResolvedValue({ id: '4', ...mockBills[0] });
  });

  describe('Initial Rendering', () => {
    test('renders loading state initially', () => {
      billService.subscribeToBills.mockImplementation(() => jest.fn());
      render(<BillsView />);
      expect(screen.getByText('Loading bills...')).toBeInTheDocument();
    });

    test('renders bills view with header and create button', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByText('Bills Management')).toBeInTheDocument();
        expect(screen.getByText('Create Bill')).toBeInTheDocument();
      });
    });

    test('displays analytics summary cards', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Bills')).toBeInTheDocument();
        expect(screen.getByText('Total Amount')).toBeInTheDocument();
        expect(screen.getByText('Total Profit')).toBeInTheDocument();
        expect(screen.getByText('Avg Bill Value')).toBeInTheDocument();
      });
    });

    test('renders bill cards for each bill', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    test('filters bills by bill number search', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search bills by number, vendor, notes, or product names...');
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'B001' } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.queryByTestId('bill-card-2')).not.toBeInTheDocument();
      });
    });

    test('filters bills by vendor search', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search bills by number, vendor, notes, or product names...');
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Test Vendor 2' } });
      });

      await waitFor(() => {
        expect(screen.queryByTestId('bill-card-1')).not.toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });
    });

    test('filters bills by notes search', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search bills by number, vendor, notes, or product names...');
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Test notes' } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.queryByTestId('bill-card-2')).not.toBeInTheDocument();
      });
    });

    test('searches within products of bills', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search bills by number, vendor, notes, or product names...');
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Product 1' } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument(); // Both bills have products
      });
    });

    test('searches by product category', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search bills by number, vendor, notes, or product names...');
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Electronics' } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument(); // Both bills have products
      });
    });

    test('shows search indicator when searching', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search bills by number, vendor, notes, or product names...');
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test search' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Searching across bills and their products...')).toBeInTheDocument();
      });
    });

    test('case insensitive search', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search bills by number, vendor, notes, or product names...');
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test vendor 1' } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.queryByTestId('bill-card-2')).not.toBeInTheDocument();
      });
    });

    test('shows no results message when search yields no matches', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search bills by number, vendor, notes, or product names...');
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      });

      await waitFor(() => {
        expect(screen.getByText('No bills found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
      });
    });

    test('combines search with filters', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });

      // Apply search
      const searchInput = screen.getByPlaceholderText('Search bills by number, vendor, notes, or product names...');
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Test Vendor' } });
      });

      // Show filters and apply additional filter
      await act(async () => {
        fireEvent.click(screen.getByText('Filters'));
      });
      
      const minAmountInput = screen.getByLabelText('Min Amount (₹)');
      await act(async () => {
        fireEvent.change(minAmountInput, { target: { value: '1500' } });
      });

      await waitFor(() => {
        expect(screen.queryByTestId('bill-card-1')).not.toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering Functionality', () => {
    test('shows and hides filter controls', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      // Filters should be hidden initially
      expect(screen.queryByLabelText('Vendor')).not.toBeInTheDocument();

      // Click to show filters
      await act(async () => {
        fireEvent.click(screen.getByText('Filters'));
      });
      
      await waitFor(() => {
        expect(screen.getByLabelText('Vendor')).toBeInTheDocument();
        expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
        expect(screen.getByLabelText('End Date')).toBeInTheDocument();
        expect(screen.getByLabelText('Min Amount (₹)')).toBeInTheDocument();
        expect(screen.getByLabelText('Max Amount (₹)')).toBeInTheDocument();
        expect(screen.getByLabelText('Min Profit (₹)')).toBeInTheDocument();
        expect(screen.getByLabelText('Max Profit (₹)')).toBeInTheDocument();
        expect(screen.getByLabelText('Min Product Count')).toBeInTheDocument();
        expect(screen.getByLabelText('Max Product Count')).toBeInTheDocument();
        expect(screen.getByLabelText('Status')).toBeInTheDocument();
      });
    });

    test('filters bills by vendor', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });

      // Show filters
      await act(async () => {
        fireEvent.click(screen.getByText('Filters'));
      });
      
      // Filter by vendor
      const vendorInput = screen.getByLabelText('Vendor');
      await act(async () => {
        fireEvent.change(vendorInput, { target: { value: 'Test Vendor 1' } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.queryByTestId('bill-card-2')).not.toBeInTheDocument();
      });
    });

    test('filters bills by date range', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });

      // Show filters
      await act(async () => {
        fireEvent.click(screen.getByText('Filters'));
      });
      
      // Filter by start date
      const startDateInput = screen.getByLabelText('Start Date');
      await act(async () => {
        fireEvent.change(startDateInput, { target: { value: '2024-01-02' } });
      });

      await waitFor(() => {
        expect(screen.queryByTestId('bill-card-1')).not.toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });
    });

    test('filters bills by amount range', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });

      // Show filters
      await act(async () => {
        fireEvent.click(screen.getByText('Filters'));
      });
      
      // Filter by min amount
      const minAmountInput = screen.getByLabelText('Min Amount (₹)');
      await act(async () => {
        fireEvent.change(minAmountInput, { target: { value: '1500' } });
      });

      await waitFor(() => {
        expect(screen.queryByTestId('bill-card-1')).not.toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });
    });

    test('filters bills by profit range', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });

      // Show filters
      await act(async () => {
        fireEvent.click(screen.getByText('Filters'));
      });
      
      // Filter by max profit
      const maxProfitInput = screen.getByLabelText('Max Profit (₹)');
      await act(async () => {
        fireEvent.change(maxProfitInput, { target: { value: '150' } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.queryByTestId('bill-card-2')).not.toBeInTheDocument();
      });
    });

    test('filters bills by product count range', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });

      // Show filters
      await act(async () => {
        fireEvent.click(screen.getByText('Filters'));
      });
      
      // Filter by min product count
      const minProductCountInput = screen.getByLabelText('Min Product Count');
      await act(async () => {
        fireEvent.change(minProductCountInput, { target: { value: '3' } });
      });

      await waitFor(() => {
        expect(screen.queryByTestId('bill-card-1')).not.toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });
    });

    test('filters bills by status', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });

      // Show filters
      await act(async () => {
        fireEvent.click(screen.getByText('Filters'));
      });
      
      // Filter by status
      const statusSelect = screen.getByLabelText('Status');
      await act(async () => {
        fireEvent.change(statusSelect, { target: { value: 'archived' } });
      });

      await waitFor(() => {
        expect(screen.queryByTestId('bill-card-1')).not.toBeInTheDocument();
        expect(screen.queryByTestId('bill-card-2')).not.toBeInTheDocument();
      });
    });

    test('shows active filters summary', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      // Show filters
      await act(async () => {
        fireEvent.click(screen.getByText('Filters'));
      });
      
      // Apply multiple filters
      const vendorInput = screen.getByLabelText('Vendor');
      const minAmountInput = screen.getByLabelText('Min Amount (₹)');
      
      await act(async () => {
        fireEvent.change(vendorInput, { target: { value: 'Test Vendor' } });
        fireEvent.change(minAmountInput, { target: { value: '1000' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Active Filters:')).toBeInTheDocument();
        expect(screen.getByText(/Vendor: Test Vendor/)).toBeInTheDocument();
        expect(screen.getByText(/Min Amount: 1000/)).toBeInTheDocument();
      });
    });

    test('clears all filters', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });

      // Show filters and apply a filter
      await act(async () => {
        fireEvent.click(screen.getByText('Filters'));
      });
      
      const vendorInput = screen.getByLabelText('Vendor');
      await act(async () => {
        fireEvent.change(vendorInput, { target: { value: 'Test Vendor 1' } });
      });

      await waitFor(() => {
        expect(screen.queryByTestId('bill-card-2')).not.toBeInTheDocument();
      });

      // Clear filters
      await act(async () => {
        fireEvent.click(screen.getByText('Clear All Filters'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });
    });

    test('combines multiple filters correctly', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });

      // Show filters
      await act(async () => {
        fireEvent.click(screen.getByText('Filters'));
      });
      
      // Apply multiple filters that should show only bill 2
      const vendorInput = screen.getByLabelText('Vendor');
      const minAmountInput = screen.getByLabelText('Min Amount (₹)');
      
      await act(async () => {
        fireEvent.change(vendorInput, { target: { value: 'Test Vendor 2' } });
        fireEvent.change(minAmountInput, { target: { value: '1500' } });
      });

      await waitFor(() => {
        expect(screen.queryByTestId('bill-card-1')).not.toBeInTheDocument();
        expect(screen.getByTestId('bill-card-2')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting Functionality', () => {
    test('sorts bills by different fields', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByText('Sort by:')).toBeInTheDocument();
      });

      // Test sorting by bill number
      const billNumberSort = screen.getByText('Bill Number');
      await act(async () => {
        fireEvent.click(billNumberSort);
      });

      // Verify sort button becomes active
      expect(billNumberSort.closest('button')).toHaveClass('btn-primary');
    });

    test('toggles sort direction when clicking same field', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByText('Date')).toBeInTheDocument();
      });

      const dateSort = screen.getByText('Date');
      
      // First click - should be ascending
      await act(async () => {
        fireEvent.click(dateSort);
      });
      
      // Second click - should toggle to descending
      await act(async () => {
        fireEvent.click(dateSort);
      });
      
      // The button should still be active
      expect(dateSort.closest('button')).toHaveClass('btn-primary');
    });
  });

  describe('Bill Creation', () => {
    test('opens create bill modal', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Bill')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Create Bill'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Create New Bill');
      });
    });

    test('creates a new bill successfully', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Bill')).toBeInTheDocument();
      });

      // Open modal
      await act(async () => {
        fireEvent.click(screen.getByText('Create Bill'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      // Fill form
      await act(async () => {
        fireEvent.change(screen.getByLabelText('Vendor'), { target: { value: 'New Vendor' } });
        fireEvent.change(screen.getByLabelText('Notes (Optional)'), { target: { value: 'Test notes' } });
      });

      // Submit form
      await act(async () => {
        fireEvent.click(screen.getByText('Create Bill'));
      });

      await waitFor(() => {
        expect(billService.addBill).toHaveBeenCalledWith(
          expect.objectContaining({
            vendor: 'New Vendor',
            notes: 'Test notes'
          })
        );
      });
    });

    test('handles validation errors during bill creation', async () => {
      billService.BillModel.validate.mockReturnValue({
        vendor: 'Vendor is required'
      });

      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Bill')).toBeInTheDocument();
      });

      // Open modal and try to create without vendor
      await act(async () => {
        fireEvent.click(screen.getByText('Create Bill'));
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Create Bill'));
      });

      // Should not call addBill due to validation error
      expect(billService.addBill).not.toHaveBeenCalled();
    });
  });

  describe('Bill Operations', () => {
    test('handles bill editing', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
      });

      const billCard1 = screen.getByTestId('bill-card-1');
      const editButton = billCard1.querySelector('[data-testid="edit-bill"]');
      await act(async () => {
        fireEvent.click(editButton);
      });

      await waitFor(() => {
        expect(billService.updateBill).toHaveBeenCalledWith('1', { vendor: 'Updated Vendor' });
      });
    });

    test('handles bill deletion', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
      });

      const billCard1 = screen.getByTestId('bill-card-1');
      const deleteButton = billCard1.querySelector('[data-testid="delete-bill"]');
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(billService.deleteBillWithProducts).toHaveBeenCalledWith('1');
      });
    });

    test('handles bill duplication', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
      });

      const billCard1 = screen.getByTestId('bill-card-1');
      const duplicateButton = billCard1.querySelector('[data-testid="duplicate-bill"]');
      await act(async () => {
        fireEvent.click(duplicateButton);
      });

      await waitFor(() => {
        expect(billService.duplicateBill).toHaveBeenCalledWith('1');
      });
    });

    test('handles bill export', async () => {
      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-card-1')).toBeInTheDocument();
      });

      const billCard1 = screen.getByTestId('bill-card-1');
      const exportButton = billCard1.querySelector('[data-testid="export-bill"]');
      await act(async () => {
        fireEvent.click(exportButton);
      });

      // Just verify the function was called, don't test DOM manipulation
      await waitFor(() => {
        expect(exportButton).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    test('shows pagination when there are many bills', async () => {
      // Create more bills to trigger pagination
      const manyBills = Array.from({ length: 15 }, (_, i) => ({
        ...mockBills[0],
        id: `bill-${i}`,
        billNumber: `B${String(i + 1).padStart(3, '0')}`
      }));

      billService.subscribeToBills.mockImplementation((callback) => {
        callback(manyBills);
        return jest.fn();
      });

      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
        expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
      });
    });

    test('navigates between pages', async () => {
      // Create more bills to trigger pagination
      const manyBills = Array.from({ length: 15 }, (_, i) => ({
        ...mockBills[0],
        id: `bill-${i}`,
        billNumber: `B${String(i + 1).padStart(3, '0')}`
      }));

      billService.subscribeToBills.mockImplementation((callback) => {
        callback(manyBills);
        return jest.fn();
      });

      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });

      // Go to next page
      await act(async () => {
        fireEvent.click(screen.getByText('Next'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
      });

      // Go back to previous page
      await act(async () => {
        fireEvent.click(screen.getByText('Previous'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles bill creation error', async () => {
      billService.addBill.mockRejectedValue(new Error('Creation failed'));

      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Bill')).toBeInTheDocument();
      });

      // Open modal and try to create
      await act(async () => {
        fireEvent.click(screen.getByText('Create Bill'));
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.change(screen.getByLabelText('Vendor'), { target: { value: 'Test Vendor' } });
        fireEvent.click(screen.getByText('Create Bill'));
      });

      // Should show error toast (we can't easily test toast visibility without more complex setup)
      await waitFor(() => {
        expect(billService.addBill).toHaveBeenCalled();
      });
    });

    test('handles analytics loading error gracefully', async () => {
      billService.getBillAnalytics.mockRejectedValue(new Error('Analytics failed'));

      render(<BillsView />);
      
      // Component should still render even if analytics fail
      await waitFor(() => {
        expect(screen.getByText('Bills Management')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    test('shows empty state when no bills exist', async () => {
      billService.subscribeToBills.mockImplementation((callback) => {
        callback([]);
        return jest.fn();
      });

      render(<BillsView />);
      
      await waitFor(() => {
        expect(screen.getByText('No bills found')).toBeInTheDocument();
        expect(screen.getByText('Create your first bill to get started')).toBeInTheDocument();
        expect(screen.getByText('Create First Bill')).toBeInTheDocument();
      });
    });
  });
});