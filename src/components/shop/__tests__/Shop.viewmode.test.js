import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Shop from '../shop';

// Mock Firebase services
jest.mock('../../../firebase/shopProductService', () => ({
  addShopProduct: jest.fn(),
  subscribeToShopProducts: jest.fn(),
  deleteShopProduct: jest.fn(),
  updateShopProduct: jest.fn(),
  getProductsByBill: jest.fn(() => Promise.resolve([]))
}));

jest.mock('../../../firebase/billService', () => ({
  subscribeToBills: jest.fn((callback) => {
    // Call the callback immediately with empty data to simulate loaded state
    callback([], { changes: [], metadata: { fromCache: false } });
    return jest.fn(); // Return unsubscribe function
  }),
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

// Mock ShopTransactions to avoid side effects
jest.mock('../shopTransactions', () => () => <div data-testid="shop-transactions" />);

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

describe('Shop View Mode Toggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    // Setup default mock implementation
    const { subscribeToShopProducts } = require('../../../firebase/shopProductService');
    subscribeToShopProducts.mockImplementation((callback) => {
      // console.log('Mock subscribeToShopProducts called');
      callback([], { changes: [], metadata: { fromCache: false } });
      return jest.fn();
    });
  });

  test('renders view mode toggle buttons', async () => {
    render(<Shop />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    });

    // Verify subscription was called
    const { subscribeToShopProducts } = require('../../../firebase/shopProductService');
    expect(subscribeToShopProducts).toHaveBeenCalled();

    expect(screen.getByLabelText('Bills View')).toBeInTheDocument();
    expect(screen.getByLabelText('Products View')).toBeInTheDocument();
  });

  test('defaults to bills view when no localStorage value', async () => {
    render(<Shop />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    });

    const billsButton = screen.getByLabelText('Bills View');
    const productsButton = screen.getByLabelText('Products View');

    expect(billsButton).toHaveClass('bg-white', 'text-blue-600');
    expect(productsButton).not.toHaveClass('bg-white', 'text-blue-600');
    expect(screen.getByTestId('bills-view')).toBeInTheDocument();
  });

  test('uses saved view mode from localStorage', async () => {
    localStorage.setItem('shopViewMode', 'products');

    render(<Shop />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    });

    const billsButton = screen.getByLabelText('Bills View');
    const productsButton = screen.getByLabelText('Products View');

    expect(productsButton).toHaveClass('bg-white', 'text-blue-600');
    expect(billsButton).not.toHaveClass('bg-white', 'text-blue-600');
    expect(screen.queryByTestId('bills-view')).not.toBeInTheDocument();
  });

  test('switches from bills to products view', async () => {
    render(<Shop />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    });

    // Initially in bills view
    expect(screen.getByTestId('bills-view')).toBeInTheDocument();

    // Click products button
    fireEvent.click(screen.getByLabelText('Products View'));

    // Should switch to products view
    await waitFor(() => {
      expect(screen.queryByTestId('bills-view')).not.toBeInTheDocument();
    });

    // Check button states
    const billsButton = screen.getByLabelText('Bills View');
    const productsButton = screen.getByLabelText('Products View');

    expect(productsButton).toHaveClass('bg-white', 'text-blue-600');
    expect(billsButton).not.toHaveClass('bg-white', 'text-blue-600');
  });

  test('switches from products to bills view', async () => {
    localStorage.setItem('shopViewMode', 'products');

    render(<Shop />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    });

    // Initially in products view
    expect(screen.queryByTestId('bills-view')).not.toBeInTheDocument();

    // Click bills button
    fireEvent.click(screen.getByLabelText('Bills View'));

    // Should switch to bills view
    await waitFor(() => {
      expect(screen.getByTestId('bills-view')).toBeInTheDocument();
    });

    // Check button states
    const billsButton = screen.getByLabelText('Bills View');
    const productsButton = screen.getByLabelText('Products View');

    expect(billsButton).toHaveClass('bg-white', 'text-blue-600');
    expect(productsButton).not.toHaveClass('bg-white', 'text-blue-600');
  });

  test('persists view mode to localStorage', async () => {
    render(<Shop />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    });

    // Switch to products view
    fireEvent.click(screen.getByLabelText('Products View'));

    expect(localStorage.getItem('shopViewMode')).toBe('products');

    // Switch back to bills view
    fireEvent.click(screen.getByLabelText('Bills View'));

    expect(localStorage.getItem('shopViewMode')).toBe('bills');
  });

  test('shares search state between views', async () => {
    render(<Shop />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    });

    // Initially in bills view
    expect(screen.getByTestId('bills-view')).toBeInTheDocument();

    // Type in search (this should update the shared search state)
    const searchInput = screen.getByTestId('bills-search-input');
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    // Switch to products view
    fireEvent.click(screen.getByLabelText('Products View'));

    await waitFor(() => {
      expect(screen.queryByTestId('bills-view')).not.toBeInTheDocument();
    });

    // The search input in products view should have the same value
    const productsSearchInput = screen.getByPlaceholderText('Search products, bills...');
    expect(productsSearchInput.value).toBe('test search');

    // Switch back to bills view
    fireEvent.click(screen.getByLabelText('Bills View'));

    await waitFor(() => {
      expect(screen.getByTestId('bills-view')).toBeInTheDocument();
    });

    // Search term should be preserved
    expect(screen.getByTestId('bills-search-term')).toHaveTextContent('test search');
  });

  test('maintains existing product view functionality', async () => {
    localStorage.setItem('shopViewMode', 'products');

    render(<Shop />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    });

    // Should render products view elements
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search products, bills...')).toBeInTheDocument();
    expect(screen.getByText('Add Product')).toBeInTheDocument();
  });

  test('view mode toggle has proper accessibility attributes', async () => {
    render(<Shop />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    });

    const billsButton = screen.getByLabelText('Bills View');
    const productsButton = screen.getByLabelText('Products View');

    expect(billsButton).toHaveAttribute('aria-label', 'Bills View');
    expect(productsButton).toHaveAttribute('aria-label', 'Products View');
  });

  test('view mode toggle has proper visual states', async () => {
    render(<Shop />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading shop data...')).not.toBeInTheDocument();
    });

    const billsButton = screen.getByLabelText('Bills View');
    const productsButton = screen.getByLabelText('Products View');

    // Bills button should be active initially
    expect(billsButton).toHaveClass('bg-white', 'text-blue-600', 'shadow-sm');
    expect(productsButton).toHaveClass('text-gray-600');

    // Switch to products
    fireEvent.click(productsButton);

    // Products button should be active
    expect(productsButton).toHaveClass('bg-white', 'text-blue-600', 'shadow-sm');
    expect(billsButton).toHaveClass('text-gray-600');
  });
});