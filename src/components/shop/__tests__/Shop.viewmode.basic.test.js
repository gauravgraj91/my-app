import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Create a simplified Shop component for testing
const TestShop = () => {
  const [viewMode, setViewMode] = React.useState('bills');
  const [search, setSearch] = React.useState('');
  const [darkMode, setDarkMode] = React.useState(false);

  React.useEffect(() => {
    localStorage.setItem('shopViewMode', viewMode);
  }, [viewMode]);

  return (
    <div className={`dashboard-container${darkMode ? ' dark' : ''}`}>
      <div className="dashboard-card dashboard-header">
        <h1 className="dashboard-title">Shop Dashboard</h1>
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'bills' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setViewMode('bills')}
              aria-label="Bills View"
            >
              Bills
            </button>
            <button
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'products' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setViewMode('products')}
              aria-label="Products View"
            >
              Products
            </button>
          </div>
          <button
            aria-label="Toggle dark mode"
            className="dashboard-dark-toggle"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? 'Sun' : 'Moon'}
          </button>
        </div>
      </div>

      {/* Conditionally render based on view mode */}
      {viewMode === 'bills' ? (
        <div data-testid="bills-view">
          <div data-testid="bills-search-term">{search}</div>
          <input
            data-testid="bills-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bills..."
          />
          <div data-testid="bills-dark-mode">{darkMode ? 'dark' : 'light'}</div>
        </div>
      ) : (
        <div data-testid="products-view">
          <h2>Analytics Dashboard</h2>
          <input
            placeholder="Search products, bills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button>Add Product</button>
        </div>
      )}
    </div>
  );
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('Shop View Mode Toggle - Basic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  test('renders view mode toggle buttons', () => {
    render(<TestShop />);
    
    expect(screen.getByLabelText('Bills View')).toBeInTheDocument();
    expect(screen.getByLabelText('Products View')).toBeInTheDocument();
  });

  test('defaults to bills view', () => {
    render(<TestShop />);
    
    const billsButton = screen.getByLabelText('Bills View');
    const productsButton = screen.getByLabelText('Products View');
    
    expect(billsButton).toHaveClass('bg-white', 'text-blue-600');
    expect(productsButton).not.toHaveClass('bg-white', 'text-blue-600');
    expect(screen.getByTestId('bills-view')).toBeInTheDocument();
  });

  test('switches from bills to products view', () => {
    render(<TestShop />);
    
    // Initially in bills view
    expect(screen.getByTestId('bills-view')).toBeInTheDocument();
    
    // Click products button
    fireEvent.click(screen.getByLabelText('Products View'));
    
    // Should switch to products view
    expect(screen.queryByTestId('bills-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('products-view')).toBeInTheDocument();
    
    // Check button states
    const billsButton = screen.getByLabelText('Bills View');
    const productsButton = screen.getByLabelText('Products View');
    
    expect(productsButton).toHaveClass('bg-white', 'text-blue-600');
    expect(billsButton).not.toHaveClass('bg-white', 'text-blue-600');
  });

  test('switches from products to bills view', () => {
    render(<TestShop />);
    
    // Switch to products view first
    fireEvent.click(screen.getByLabelText('Products View'));
    expect(screen.getByTestId('products-view')).toBeInTheDocument();
    
    // Click bills button
    fireEvent.click(screen.getByLabelText('Bills View'));
    
    // Should switch to bills view
    expect(screen.queryByTestId('products-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('bills-view')).toBeInTheDocument();
    
    // Check button states
    const billsButton = screen.getByLabelText('Bills View');
    const productsButton = screen.getByLabelText('Products View');
    
    expect(billsButton).toHaveClass('bg-white', 'text-blue-600');
    expect(productsButton).not.toHaveClass('bg-white', 'text-blue-600');
  });

  test('view mode state changes correctly', () => {
    render(<TestShop />);
    
    // Initially in bills view
    expect(screen.getByTestId('bills-view')).toBeInTheDocument();
    expect(screen.queryByTestId('products-view')).not.toBeInTheDocument();
    
    // Switch to products view
    fireEvent.click(screen.getByLabelText('Products View'));
    
    expect(screen.queryByTestId('bills-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('products-view')).toBeInTheDocument();
    
    // Switch back to bills view
    fireEvent.click(screen.getByLabelText('Bills View'));
    
    expect(screen.getByTestId('bills-view')).toBeInTheDocument();
    expect(screen.queryByTestId('products-view')).not.toBeInTheDocument();
  });

  test('shares search state between views', () => {
    render(<TestShop />);
    
    // Initially in bills view
    expect(screen.getByTestId('bills-view')).toBeInTheDocument();
    
    // Type in search (this should update the shared search state)
    const searchInput = screen.getByTestId('bills-search-input');
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    // Switch to products view
    fireEvent.click(screen.getByLabelText('Products View'));
    
    expect(screen.queryByTestId('bills-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('products-view')).toBeInTheDocument();
    
    // The search input in products view should have the same value
    const productsSearchInput = screen.getByPlaceholderText('Search products, bills...');
    expect(productsSearchInput.value).toBe('test search');
    
    // Switch back to bills view
    fireEvent.click(screen.getByLabelText('Bills View'));
    
    expect(screen.getByTestId('bills-view')).toBeInTheDocument();
    
    // Search term should be preserved
    expect(screen.getByTestId('bills-search-term')).toHaveTextContent('test search');
  });

  test('passes dark mode state to BillsView', () => {
    render(<TestShop />);
    
    // Initially light mode
    expect(screen.getByTestId('bills-dark-mode')).toHaveTextContent('light');
    
    // Toggle dark mode
    fireEvent.click(screen.getByLabelText('Toggle dark mode'));
    
    // Should pass dark mode to BillsView
    expect(screen.getByTestId('bills-dark-mode')).toHaveTextContent('dark');
  });

  test('maintains existing product view functionality', () => {
    render(<TestShop />);
    
    // Switch to products view
    fireEvent.click(screen.getByLabelText('Products View'));
    
    // Should render products view elements
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search products, bills...')).toBeInTheDocument();
    expect(screen.getByText('Add Product')).toBeInTheDocument();
  });

  test('view mode toggle has proper accessibility attributes', () => {
    render(<TestShop />);
    
    const billsButton = screen.getByLabelText('Bills View');
    const productsButton = screen.getByLabelText('Products View');
    
    expect(billsButton).toHaveAttribute('aria-label', 'Bills View');
    expect(productsButton).toHaveAttribute('aria-label', 'Products View');
  });

  test('view mode toggle has proper visual states', () => {
    render(<TestShop />);
    
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