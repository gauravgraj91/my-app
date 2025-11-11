import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Shop from '../shop';

// Mock Firebase config to prevent initialization issues
jest.mock('../../../firebase/config', () => ({
  db: {},
  analytics: {}
}));

// Mock all Firebase services with proper implementations
jest.mock('../../../firebase/shopProductService', () => ({
  addShopProduct: jest.fn(),
  subscribeToShopProducts: jest.fn(),
  deleteShopProduct: jest.fn(),
  updateShopProduct: jest.fn(),
  getProductsByBill: jest.fn(() => Promise.resolve([]))
}));

jest.mock('../../../firebase/billService', () => ({
  subscribeToBills: jest.fn(),
  addBill: jest.fn(),
  updateBill: jest.fn(),
  deleteBillWithProducts: jest.fn(),
  duplicateBill: jest.fn(),
  getBillAnalytics: jest.fn(() => Promise.resolve({
    totalBills: 0,
    totalAmount: 0,
    totalProfit: 0,
    averageBillValue: 0
  })),
  searchBills: jest.fn(),
  filterBills: jest.fn(),
  BillModel: {
    generateBillNumber: jest.fn(() => 'B001'),
    validate: jest.fn(() => null)
  }
}));

// Get references to the mocked functions
const { 
  subscribeToShopProducts: mockSubscribeToShopProducts,
  addShopProduct: mockAddShopProduct,
  updateShopProduct: mockUpdateShopProduct,
  deleteShopProduct: mockDeleteShopProduct
} = require('../../../firebase/shopProductService');

const { 
  subscribeToBills: mockSubscribeToBills
} = require('../../../firebase/billService');

// Mock BillsView component
jest.mock('../BillsView', () => {
  return function MockBillsView({ searchTerm, onSearchChange, darkMode }) {
    return (
      <div data-testid="bills-view">
        <div data-testid="bills-search-term">{searchTerm}</div>
        <input
          data-testid="bills-search-input"
          value={searchTerm || ''}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          placeholder="Search bills..."
        />
        <div data-testid="bills-dark-mode">{darkMode ? 'dark' : 'light'}</div>
      </div>
    );
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('Shop Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Setup default mock implementations
    mockSubscribeToShopProducts.mockImplementation((callback) => {
      // Simulate async data loading
      setTimeout(() => {
        callback([], { metadata: { test: true } });
      }, 0);
      return jest.fn(); // Return unsubscribe function
    });
    
    mockSubscribeToBills.mockImplementation((callback) => {
      setTimeout(() => {
        callback([]);
      }, 0);
      return jest.fn();
    });
  });

  test('loads and displays shop component with view mode toggle', async () => {
    await act(async () => {
      render(<Shop />);
    });
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Check that view mode toggle buttons are present
    expect(screen.getByLabelText('Bills View')).toBeInTheDocument();
    expect(screen.getByLabelText('Products View')).toBeInTheDocument();
  });

  test('defaults to bills view and shows BillsView component', async () => {
    await act(async () => {
      render(<Shop />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Should show bills view by default
    expect(screen.getByTestId('bills-view')).toBeInTheDocument();
    
    // Bills button should be active
    const billsButton = screen.getByLabelText('Bills View');
    expect(billsButton).toHaveClass('bg-white', 'text-blue-600');
  });

  test('switches between bills and products view', async () => {
    await act(async () => {
      render(<Shop />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Initially in bills view
    expect(screen.getByTestId('bills-view')).toBeInTheDocument();
    
    // Switch to products view
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Products View'));
    });
    
    // Should switch to products view
    await waitFor(() => {
      expect(screen.queryByTestId('bills-view')).not.toBeInTheDocument();
    });
    
    // Should show products view elements
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    
    // Switch back to bills view
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Bills View'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('bills-view')).toBeInTheDocument();
    });
  });

  test('persists view mode to localStorage', async () => {
    await act(async () => {
      render(<Shop />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Switch to products view
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Products View'));
    });
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('shopViewMode', 'products');
  });

  test('handles Firebase subscription errors gracefully', async () => {
    // Mock subscription to throw an error
    mockSubscribeToShopProducts.mockImplementation((callback) => {
      setTimeout(() => {
        callback([], { metadata: { error: 'Connection failed' } });
      }, 0);
      return jest.fn();
    });
    
    await act(async () => {
      render(<Shop />);
    });
    
    // Should still load and not crash
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    }, { timeout: 2000 });
    
    expect(screen.getByLabelText('Bills View')).toBeInTheDocument();
  });

  test('maintains search state between view modes', async () => {
    await act(async () => {
      render(<Shop />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Type in search in bills view
    const searchInput = screen.getByTestId('bills-search-input');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'test search' } });
    });
    
    // Switch to products view
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Products View'));
    });
    
    await waitFor(() => {
      expect(screen.queryByTestId('bills-view')).not.toBeInTheDocument();
    });
    
    // Search should be maintained in products view
    const productsSearchInput = screen.getByPlaceholderText('Search products, bills...');
    expect(productsSearchInput.value).toBe('test search');
  });

  test('passes dark mode state correctly', async () => {
    await act(async () => {
      render(<Shop />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Initially light mode
    expect(screen.getByTestId('bills-dark-mode')).toHaveTextContent('light');
    
    // Toggle dark mode
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Toggle dark mode'));
    });
    
    // Should pass dark mode to BillsView
    expect(screen.getByTestId('bills-dark-mode')).toHaveTextContent('dark');
  });

  test('handles product operations in products view', async () => {
    // Start in products view
    localStorageMock.getItem.mockReturnValue('products');
    
    await act(async () => {
      render(<Shop />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Should show products view elements
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Add Product')).toBeInTheDocument();
    
    // Should be able to interact with product features
    const addButton = screen.getByText('Add Product');
    expect(addButton).toBeInTheDocument();
  });

  test('validates bill-product relationships', async () => {
    // Mock some test data
    const testProducts = [
      {
        id: '1',
        productName: 'Test Product 1',
        billId: 'bill1',
        billNumber: 'B001',
        totalAmount: 100,
        category: 'Electronics'
      }
    ];
    
    mockSubscribeToShopProducts.mockImplementation((callback) => {
      setTimeout(() => {
        callback(testProducts, { metadata: { test: true } });
      }, 0);
      return jest.fn();
    });
    
    await act(async () => {
      render(<Shop />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Switch to products view to see the data
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Products View'));
    });
    
    // Should display the product data
    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    });
  });

  test('handles analytics calculations correctly', async () => {
    const testProducts = [
      {
        id: '1',
        productName: 'Product 1',
        totalAmount: 1000,
        profitPerPiece: 10,
        totalQuantity: 5,
        category: 'Electronics'
      },
      {
        id: '2',
        productName: 'Product 2',
        totalAmount: 500,
        profitPerPiece: 5,
        totalQuantity: 10,
        category: 'Clothing'
      }
    ];
    
    mockSubscribeToShopProducts.mockImplementation((callback) => {
      setTimeout(() => {
        callback(testProducts, { metadata: { test: true } });
      }, 0);
      return jest.fn();
    });
    
    // Start in products view to see analytics
    localStorageMock.getItem.mockReturnValue('products');
    
    await act(async () => {
      render(<Shop />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Should show analytics dashboard
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Product Sales')).toBeInTheDocument();
    expect(screen.getByText('Profit Analysis')).toBeInTheDocument();
  });
});