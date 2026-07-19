import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomeDashboard from '../HomeDashboard';

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1', tenantId: 't1', displayName: 'Gaurav Raj' } })
}));

jest.mock('../../../hooks/useTasks', () => ({
  useTasks: () => ({
    todos: [
      { id: 'task1', title: 'Restock eggs', category: 'shop', dueDate: null, isCompleted: false, createdAt: '2026-07-08T10:00:00Z' }
    ],
    stats: { total: 1, completed: 0, pending: 1, overdue: 0, dueToday: 0 }
  })
}));

// Plain functions (not jest.fn) so CRA's resetMocks doesn't wipe implementations
jest.mock('../../../firebase/billService', () => ({
  getBills: () => Promise.resolve([
    { id: 'b1', vendor: 'Vasavi Traders', billNumber: 'B001', date: new Date().toISOString(), status: 'paid', totalAmount: 14485, totalProfit: 2360 },
    { id: 'b2', vendor: 'Jumbotail', billNumber: 'B002', date: new Date().toISOString(), status: 'paid', totalAmount: 2173, totalProfit: 400 }
  ])
}));

jest.mock('../../../firebase/shopProductService', () => ({
  getShopProducts: () => Promise.resolve([
    { id: 'p1', productName: 'Kings', vendor: 'Vasavi Traders', category: 'Cigarettes', totalAmount: 840, profitPerPiece: 2, totalQuantity: 30 }
  ])
}));

jest.mock('../../../firebase/transactionService', () => ({
  subscribeToTransactions: (tenantId, callback) => {
    callback([
      { id: 't1', type: 'cashIn', amount: 100, date: new Date() },
      { id: 't2', type: 'cashOut', amount: 2173, date: new Date() }
    ]);
    return () => {};
  }
}));

jest.mock('../../../firebase/personalService', () => ({
  subscribeToPersonalTransactions: (tenantId, callback) => {
    callback([{ id: 'pt1', type: 'cashOut', amount: 214, date: new Date() }]);
    return () => {};
  }
}));

jest.mock('../../../firebase/activityLogService', () => ({
  subscribeActivityLogs: (tenantId, tabFilter, callback) => {
    callback([{ id: 'a1', action: 'created', entity: 'Bill B001', entityType: 'bill', tab: 'Bills', timestamp: Date.now() }]);
    return () => {};
  }
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

beforeAll(() => {
  window.matchMedia = window.matchMedia || (query => ({
    matches: false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn()
  }));
});

const renderDashboard = () => render(
  <BrowserRouter>
    <HomeDashboard />
  </BrowserRouter>
);

describe('HomeDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders greeting with first name', () => {
    renderDashboard();
    expect(screen.getByText(/Good (morning|afternoon|evening), Gaurav/)).toBeInTheDocument();
  });

  it('renders all card sections', async () => {
    renderDashboard();
    expect(screen.getByText("Today's focus")).toBeInTheDocument();
    expect(screen.getAllByText('Bills').length).toBeGreaterThan(0);
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Stock')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
    expect(screen.getByText('Shop vs personal')).toBeInTheDocument();
    expect(screen.getByText('Cash flow · last 4 weeks')).toBeInTheDocument();
    expect(screen.getByText('Tasks & reminders')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('2 bills this month')).toBeInTheDocument();
    });
  });

  it('shows month bill totals and top vendor once loaded', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('₹16,658.00')).toBeInTheDocument();
      expect(screen.getAllByText('Vasavi Traders').length).toBeGreaterThan(0);
    });
  });

  it('shows tasks and activity entries', () => {
    renderDashboard();
    expect(screen.getByText('Restock eggs')).toBeInTheDocument();
    expect(screen.getByText(/Bill B001/)).toBeInTheDocument();
  });

  it('quick actions navigate to the right routes', () => {
    renderDashboard();
    fireEvent.click(screen.getByText('＋ Add task'));
    expect(mockNavigate).toHaveBeenCalledWith('/tasks');
    fireEvent.click(screen.getByText('＋ Cash in'));
    expect(mockNavigate).toHaveBeenCalledWith('/transactions/shop');
    fireEvent.click(screen.getByText('＋ New bill'));
    expect(mockNavigate).toHaveBeenCalledWith('/shop/bills', { state: { openCreate: true } });
  });
});
