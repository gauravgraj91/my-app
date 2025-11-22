import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AnalyticsDashboard from '../AnalyticsDashboard';

// Mock the hooks and services
jest.mock('../../../hooks/useTasks', () => ({
  useTasks: () => ({
    todos: [],
    stats: {
      completed: 5,
      pending: 3,
      overdue: 1,
      dueToday: 2
    }
  })
}));

jest.mock('../../../firebase/shopProductService', () => ({
  subscribeToShopProducts: jest.fn((callback) => {
    callback([
      {
        id: '1',
        productName: 'Product A',
        totalAmount: 500,
        profitPerPiece: 10,
        totalQuantity: 5
      }
    ]);
    return jest.fn(); // unsubscribe function
  })
}));

jest.mock('../../../firebase/transactionService', () => ({
  subscribeToTransactions: jest.fn((callback) => {
    callback([
      { id: '1', type: 'cashIn', amount: 1000 },
      { id: '2', type: 'cashOut', amount: 200 }
    ]);
    return jest.fn(); // unsubscribe function
  })
}));

jest.mock('../../../services/analyticsService', () => ({
  subscribeToAnalytics: jest.fn((callback) => {
    callback({
      bills: {
        totalBills: 2,
        totalAmount: 1500,
        totalProfit: 300,
        averageBillValue: 750,
        profitMargin: 20,
        vendorAnalytics: [
          {
            vendor: 'Vendor A',
            billCount: 1,
            totalAmount: 1000,
            totalProfit: 200,
            averageBillValue: 1000,
            profitMargin: 20
          },
          {
            vendor: 'Vendor B',
            billCount: 1,
            totalAmount: 500,
            totalProfit: 100,
            averageBillValue: 500,
            profitMargin: 20
          }
        ],
        monthlyAnalytics: [
          {
            month: 'January 2024',
            monthKey: '2024-01',
            billCount: 2,
            totalAmount: 1500,
            totalProfit: 300,
            averageBillValue: 750,
            profitMargin: 20
          }
        ],
        topPerformingBills: [
          {
            id: '1',
            billNumber: 'B001',
            vendor: 'Vendor A',
            totalAmount: 1000,
            totalProfit: 200,
            profitMargin: 20,
            date: new Date('2024-01-15')
          }
        ]
      },
      products: {
        totalProducts: 3,
        totalAmount: 1200,
        totalProfit: 240,
        averageProductValue: 400,
        profitMargin: 20,
        vendorAnalytics: [
          {
            vendor: 'Vendor A',
            productCount: 2,
            totalAmount: 800,
            totalProfit: 160
          }
        ]
      }
    });
    return jest.fn(); // unsubscribe function
  }),
  formatCurrency: (amount) => `₹${amount?.toFixed(2) || '0.00'}`,
  formatPercentage: (value) => `${(value || 0).toFixed(1)}%`
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the analytics dashboard', async () => {
    renderWithRouter(<AnalyticsDashboard />);
    
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Analytics View:')).toBeInTheDocument();
  });

  it('should show view mode toggle buttons', async () => {
    renderWithRouter(<AnalyticsDashboard />);
    
    expect(screen.getByText('📄 Bills View')).toBeInTheDocument();
    expect(screen.getByText('📦 Products View')).toBeInTheDocument();
  });

  it('should switch between bills and products view', async () => {
    renderWithRouter(<AnalyticsDashboard />);
    
    // Initially should be in bills view
    expect(screen.getByText('📄 Bills Analytics')).toBeInTheDocument();
    
    // Click on products view
    fireEvent.click(screen.getByText('📦 Products View'));
    
    await waitFor(() => {
      expect(screen.getByText('📦 Products Analytics')).toBeInTheDocument();
    });
  });

  it('should display task statistics', async () => {
    renderWithRouter(<AnalyticsDashboard />);
    
    expect(screen.getByText('📝 Tasks')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // completed
    expect(screen.getByText('3')).toBeInTheDocument(); // pending
    expect(screen.getByText('1')).toBeInTheDocument(); // overdue
    expect(screen.getByText('2')).toBeInTheDocument(); // due today
  });

  it('should display enhanced shop analytics in bills view', async () => {
    renderWithRouter(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('📄 Bills Analytics')).toBeInTheDocument();
      expect(screen.getByText('₹1500.00')).toBeInTheDocument(); // total amount
      expect(screen.getByText('2')).toBeInTheDocument(); // total bills
      expect(screen.getByText('₹300.00')).toBeInTheDocument(); // total profit
    });
  });

  it('should display enhanced shop analytics in products view', async () => {
    renderWithRouter(<AnalyticsDashboard />);
    
    // Switch to products view
    fireEvent.click(screen.getByText('📦 Products View'));
    
    await waitFor(() => {
      expect(screen.getByText('📦 Products Analytics')).toBeInTheDocument();
      expect(screen.getByText('₹1200.00')).toBeInTheDocument(); // total amount
      expect(screen.getByText('3')).toBeInTheDocument(); // total products
      expect(screen.getByText('₹240.00')).toBeInTheDocument(); // total profit
    });
  });

  it('should display key metrics section', async () => {
    renderWithRouter(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Bill Analytics')).toBeInTheDocument();
      expect(screen.getByText('Average Bill Value')).toBeInTheDocument();
      expect(screen.getByText('Overall Profit Margin')).toBeInTheDocument();
      expect(screen.getByText('Top Vendor')).toBeInTheDocument();
      expect(screen.getByText('₹750.00')).toBeInTheDocument(); // average bill value
      expect(screen.getByText('20.0%')).toBeInTheDocument(); // profit margin
    });
  });

  it('should display vendor performance section', async () => {
    renderWithRouter(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Vendor Performance')).toBeInTheDocument();
      expect(screen.getByText('Vendor A')).toBeInTheDocument();
      expect(screen.getByText('Vendor B')).toBeInTheDocument();
      expect(screen.getByText('1 bills • Avg: ₹1000.00')).toBeInTheDocument();
    });
  });

  it('should display monthly trends section in bills view', async () => {
    renderWithRouter(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Monthly Trends')).toBeInTheDocument();
      expect(screen.getByText('January 2024')).toBeInTheDocument();
      expect(screen.getByText('2 bills • Avg: ₹750.00')).toBeInTheDocument();
    });
  });

  it('should display top performing bills section in bills view', async () => {
    renderWithRouter(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Top Performing Bills')).toBeInTheDocument();
      expect(screen.getByText('B001')).toBeInTheDocument();
      expect(screen.getByText('Vendor A • 1/15/2024')).toBeInTheDocument();
    });
  });

  it('should not display monthly trends and top bills in products view', async () => {
    renderWithRouter(<AnalyticsDashboard />);
    
    // Switch to products view
    fireEvent.click(screen.getByText('📦 Products View'));
    
    await waitFor(() => {
      expect(screen.queryByText('Monthly Trends')).not.toBeInTheDocument();
      expect(screen.queryByText('Top Performing Bills')).not.toBeInTheDocument();
    });
  });

  it('should display transaction statistics', async () => {
    renderWithRouter(<AnalyticsDashboard />);
    
    expect(screen.getByText('💰 Transactions')).toBeInTheDocument();
    expect(screen.getByText('₹1,000.00')).toBeInTheDocument(); // cash in
    expect(screen.getByText('₹200.00')).toBeInTheDocument(); // cash out
    expect(screen.getByText('₹800.00')).toBeInTheDocument(); // net balance
  });

  it('should display quick actions', async () => {
    renderWithRouter(<AnalyticsDashboard />);
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('📝 Add Task')).toBeInTheDocument();
    expect(screen.getByText('🛒 Add Product')).toBeInTheDocument();
    expect(screen.getByText('💰 Add Transaction')).toBeInTheDocument();
    expect(screen.getByText('⚙️ Settings')).toBeInTheDocument();
  });

  it('should navigate correctly when clicking quick action buttons', async () => {
    renderWithRouter(<AnalyticsDashboard />);
    
    fireEvent.click(screen.getByText('📝 Add Task'));
    expect(mockNavigate).toHaveBeenCalledWith('/tasks');
    
    fireEvent.click(screen.getByText('🛒 Add Product'));
    expect(mockNavigate).toHaveBeenCalledWith('/shop/bills');
    
    fireEvent.click(screen.getByText('💰 Add Transaction'));
    expect(mockNavigate).toHaveBeenCalledWith('/shop/transactions');
    
    fireEvent.click(screen.getByText('⚙️ Settings'));
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('should navigate correctly when clicking view all buttons', async () => {
    renderWithRouter(<AnalyticsDashboard />);
    
    await waitFor(() => {
      const viewAllButtons = screen.getAllByText('View All');
      
      // Click on bills view all button
      fireEvent.click(viewAllButtons[1]); // Second "View All" is for bills/products
      expect(mockNavigate).toHaveBeenCalledWith('/shop/bills');
    });
  });

  it('should handle loading state', async () => {
    // Mock analytics service to not call callback immediately
    const mockSubscribeToAnalytics = jest.fn(() => jest.fn());
    jest.doMock('../../../services/analyticsService', () => ({
      subscribeToAnalytics: mockSubscribeToAnalytics,
      formatCurrency: (amount) => `₹${amount?.toFixed(2) || '0.00'}`,
      formatPercentage: (value) => `${(value || 0).toFixed(1)}%`
    }));
    
    renderWithRouter(<AnalyticsDashboard />);
    
    // Should still render basic structure even during loading
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Analytics View:')).toBeInTheDocument();
  });
});