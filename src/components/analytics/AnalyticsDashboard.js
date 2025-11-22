import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../../hooks/useTasks';
import { subscribeToShopProducts } from '../../firebase/shopProductService';
import { subscribeToTransactions } from '../../firebase/transactionService';
import { subscribeToAnalytics, formatCurrency, formatPercentage } from '../../services/analyticsService';
import { useState, useEffect } from 'react';
import {
  FileText, Package, CheckSquare, TrendingUp,
  DollarSign, ShoppingCart, Settings, Plus,
  ArrowUpRight, CreditCard
} from 'lucide-react';
import './analytics_theme_1.css';

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const { stats: taskStats } = useTasks();
  const [shopData, setShopData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [viewMode, setViewMode] = useState('bills'); // 'bills' or 'products'

  // Subscribe to shop data
  useEffect(() => {
    const unsubscribeShop = subscribeToShopProducts((products) => {
      setShopData(products);
    });
    return () => unsubscribeShop();
  }, []);

  // Subscribe to transactions
  useEffect(() => {
    const unsubscribeTransactions = subscribeToTransactions((transactions) => {
      setTransactions(transactions);
    });
    return () => unsubscribeTransactions();
  }, []);

  // Subscribe to enhanced analytics
  useEffect(() => {
    const unsubscribeAnalytics = subscribeToAnalytics((analyticsData) => {
      setAnalytics(analyticsData);
    });
    return () => unsubscribeAnalytics();
  }, []);

  // Calculate shop statistics (legacy support)
  const shopStats = {
    totalSales: shopData.reduce((sum, item) => sum + (item.totalAmount || 0), 0),
    totalProducts: shopData.length,
    totalProfit: shopData.reduce((sum, item) => sum + ((item.profitPerPiece || 0) * (item.totalQuantity || 0)), 0)
  };

  // Get current analytics based on view mode
  const currentAnalytics = analytics ?
    (viewMode === 'bills' ? analytics.bills : analytics.products) : null;

  // Calculate transaction statistics
  const transactionStats = {
    cashIn: transactions.filter(t => t.type === 'cashIn').reduce((sum, t) => sum + (t.amount || 0), 0),
    cashOut: transactions.filter(t => t.type === 'cashOut').reduce((sum, t) => sum + (t.amount || 0), 0),
    netBalance: transactions.filter(t => t.type === 'cashIn').reduce((sum, t) => sum + (t.amount || 0), 0) -
      transactions.filter(t => t.type === 'cashOut').reduce((sum, t) => sum + (t.amount || 0), 0)
  };

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h1 className="analytics-title">Analytics Dashboard</h1>

        <div className="view-toggle-container">
          <span style={{ fontWeight: 600, color: 'var(--foreground)', marginRight: '0.5rem' }}>View:</span>
          <button
            className={`view-toggle-btn ${viewMode === 'bills' ? 'active' : ''}`}
            onClick={() => setViewMode('bills')}
          >
            <FileText size={18} />
            Bills
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'products' ? 'active' : ''}`}
            onClick={() => setViewMode('products')}
          >
            <Package size={18} />
            Products
          </button>
        </div>
      </div>

      {/* Data Widgets Grid */}
      <div className="analytics-grid">

        {/* Tasks Widget */}
        <div className="stat-card fade-in-up">
          <div className="card-header">
            <div className="card-title" style={{ color: 'var(--primary)' }}>
              <CheckSquare size={20} />
              Tasks
            </div>
            <button className="view-all-link" onClick={() => navigate('/tasks')}>
              View All
            </button>
          </div>
          <div className="stat-grid">
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#22c55e' }}>{taskStats.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: 'var(--primary)' }}>{taskStats.pending}</div>
              <div className="stat-label">Pending</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#ef4444' }}>{taskStats.overdue}</div>
              <div className="stat-label">Overdue</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#f59e0b' }}>{taskStats.dueToday}</div>
              <div className="stat-label">Due Today</div>
            </div>
          </div>
        </div>

        {/* Enhanced Shop Analytics Widget */}
        <div className="stat-card fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="card-header">
            <div className="card-title" style={{ color: '#10b981' }}>
              {viewMode === 'bills' ? <FileText size={20} /> : <Package size={20} />}
              {viewMode === 'bills' ? 'Bills' : 'Products'}
            </div>
            <button
              className="view-all-link"
              onClick={() => navigate(viewMode === 'bills' ? '/shop/bills' : '/shop')}
              style={{ color: '#10b981' }}
            >
              View All
            </button>
          </div>

          <div className="main-stat">
            <div className="main-stat-value" style={{ color: '#10b981' }}>
              {currentAnalytics ? formatCurrency(currentAnalytics.totalAmount) : formatCurrency(shopStats.totalSales)}
            </div>
            <div className="stat-label">
              {viewMode === 'bills' ? 'Total Bill Value' : 'Total Product Value'}
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#8b5cf6' }}>
                {currentAnalytics ?
                  (viewMode === 'bills' ? currentAnalytics.totalBills : currentAnalytics.totalProducts) :
                  shopStats.totalProducts
                }
              </div>
              <div className="stat-label">
                {viewMode === 'bills' ? 'Total Bills' : 'Total Products'}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#f59e0b' }}>
                {currentAnalytics ? formatCurrency(currentAnalytics.totalProfit) : formatCurrency(shopStats.totalProfit)}
              </div>
              <div className="stat-label">Total Profit</div>
            </div>
          </div>
        </div>

        {/* Transactions Widget */}
        <div className="stat-card fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="card-header">
            <div className="card-title" style={{ color: '#f59e0b' }}>
              <DollarSign size={20} />
              Transactions
            </div>
            <button
              className="view-all-link"
              onClick={() => navigate('/shop/transactions')}
              style={{ color: '#f59e0b' }}
            >
              View All
            </button>
          </div>

          <div className="main-stat">
            <div className="main-stat-value" style={{ color: 'var(--primary)' }}>
              {formatCurrency(transactionStats.netBalance)}
            </div>
            <div className="stat-label">Net Balance</div>
          </div>

          <div className="stat-grid">
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#22c55e' }}>{formatCurrency(transactionStats.cashIn)}</div>
              <div className="stat-label">Cash In</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#ef4444' }}>{formatCurrency(transactionStats.cashOut)}</div>
              <div className="stat-label">Cash Out</div>
            </div>
          </div>
        </div>

        {/* Price List Widget */}
        <div className="stat-card fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="card-header">
            <div className="card-title" style={{ color: '#8b5cf6' }}>
              <ShoppingCart size={20} />
              Price List
            </div>
            <button
              className="view-all-link"
              onClick={() => navigate('/shop/price-list')}
              style={{ color: '#8b5cf6' }}
            >
              View All
            </button>
          </div>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#8b5cf6', marginBottom: '0.5rem' }}>
              {shopStats.totalProducts}
            </div>
            <div className="stat-label">Total Items</div>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '1rem' }}>
              Manage your product pricing and inventory
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Analytics Section */}
      {currentAnalytics && (
        <>
          {/* Key Metrics Row */}
          <div style={{ marginBottom: '3rem' }}>
            <div className="section-header">
              <TrendingUp size={24} />
              {viewMode === 'bills' ? 'Bill Analytics' : 'Product Analytics'}
            </div>

            <div className="analytics-grid" style={{ marginBottom: 0 }}>
              {/* Average Value Card */}
              <div className="stat-card">
                <div style={{ textAlign: 'center' }}>
                  <div className="stat-value" style={{ fontSize: '2rem', color: 'var(--primary)' }}>
                    {viewMode === 'bills' ?
                      formatCurrency(currentAnalytics.averageBillValue) :
                      formatCurrency(currentAnalytics.averageProductValue)
                    }
                  </div>
                  <div className="stat-label">
                    {viewMode === 'bills' ? 'Average Bill Value' : 'Average Product Value'}
                  </div>
                </div>
              </div>

              {/* Profit Margin Card */}
              <div className="stat-card">
                <div style={{ textAlign: 'center' }}>
                  <div className="stat-value" style={{ fontSize: '2rem', color: '#16a34a' }}>
                    {formatPercentage(currentAnalytics.profitMargin)}
                  </div>
                  <div className="stat-label">Overall Profit Margin</div>
                </div>
              </div>

              {/* Top Vendor Card */}
              <div className="stat-card">
                <div style={{ textAlign: 'center' }}>
                  <div className="stat-value" style={{ fontSize: '1.5rem', color: '#dc2626' }}>
                    {currentAnalytics.vendorAnalytics.length > 0 ?
                      currentAnalytics.vendorAnalytics[0].vendor : 'No Data'
                    }
                  </div>
                  <div className="stat-label">Top Vendor</div>
                  {currentAnalytics.vendorAnalytics.length > 0 && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
                      {formatCurrency(currentAnalytics.vendorAnalytics[0].totalAmount)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Vendor Performance Section */}
          <div style={{ marginBottom: '3rem' }}>
            <div className="section-header">
              <CreditCard size={24} />
              Vendor Performance
            </div>
            <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {currentAnalytics.vendorAnalytics.slice(0, 10).map((vendor, index) => (
                  <div key={vendor.vendor} className="list-item">
                    <div>
                      <div className="item-main">{vendor.vendor}</div>
                      <div className="item-sub">
                        {viewMode === 'bills' ?
                          `${vendor.billCount} bills • Avg: ${formatCurrency(vendor.averageBillValue)}` :
                          `${vendor.productCount} products`
                        }
                      </div>
                    </div>
                    <div className="item-value">
                      <div style={{ color: '#16a34a' }}>{formatCurrency(vendor.totalAmount)}</div>
                      <div className="item-sub">
                        {formatPercentage(vendor.profitMargin || (vendor.totalAmount > 0 ? (vendor.totalProfit / vendor.totalAmount) * 100 : 0))} profit
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Trends Section (Bills only) */}
          {viewMode === 'bills' && currentAnalytics.monthlyAnalytics && currentAnalytics.monthlyAnalytics.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <div className="section-header">
                <TrendingUp size={24} />
                Monthly Trends
              </div>
              <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {currentAnalytics.monthlyAnalytics.slice(-6).map((month, index) => (
                    <div key={month.monthKey} className="list-item">
                      <div>
                        <div className="item-main">{month.month}</div>
                        <div className="item-sub">
                          {month.billCount} bills • Avg: {formatCurrency(month.averageBillValue)}
                        </div>
                      </div>
                      <div className="item-value">
                        <div style={{ color: '#3b82f6' }}>{formatCurrency(month.totalAmount)}</div>
                        <div className="item-sub">
                          {formatPercentage(month.profitMargin)} profit
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top Performing Bills Section (Bills only) */}
          {viewMode === 'bills' && currentAnalytics.topPerformingBills && currentAnalytics.topPerformingBills.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <div className="section-header">
                <ArrowUpRight size={24} />
                Top Performing Bills
              </div>
              <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {currentAnalytics.topPerformingBills.slice(0, 5).map((bill, index) => (
                    <div key={bill.id} className="list-item">
                      <div>
                        <div className="item-main">{bill.billNumber}</div>
                        <div className="item-sub">
                          {bill.vendor} • {new Date(bill.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="item-value">
                        <div style={{ color: '#16a34a' }}>{formatCurrency(bill.totalAmount)}</div>
                        <div className="item-sub">
                          {formatPercentage(bill.profitMargin)} profit
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick Actions */}
      <div>
        <div className="section-header">
          <Plus size={24} />
          Quick Actions
        </div>
        <div className="quick-actions-grid">
          <button
            className="action-button btn-primary"
            onClick={() => navigate('/tasks')}
          >
            <CheckSquare size={20} />
            Add Task
          </button>

          <button
            className="action-button btn-accent"
            onClick={() => navigate('/shop/bills')}
          >
            <ShoppingCart size={20} />
            Add Product
          </button>

          <button
            className="action-button btn-success"
            onClick={() => navigate('/shop/transactions')}
          >
            <DollarSign size={20} />
            Add Transaction
          </button>

          <button
            className="action-button btn-dark"
            onClick={() => navigate('/settings')}
          >
            <Settings size={20} />
            Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;