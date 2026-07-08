import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../../hooks/useTasks';
import { getTransactions } from '../../firebase/transactionService';
import { fetchAnalytics, formatCurrency, formatPercentage } from '../../services/analyticsService';
import { useState, useEffect } from 'react';
import {
  FileText, Package, CheckSquare, TrendingUp,
  DollarSign, ShoppingCart, Settings, Plus,
  ArrowUpRight, CreditCard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './analytics_theme_1.css';

export const getGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const firstName = (user?.displayName || user?.email || '').split(/[\s@]/)[0];
  const { stats: taskStats } = useTasks();
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [viewMode, setViewMode] = useState('bills');

  // Fetch data once on mount (no real-time listeners)
  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    const loadData = async () => {
      try {
        const [txns, analyticsData] = await Promise.all([
          getTransactions(tenantId),
          fetchAnalytics(tenantId)
        ]);
        if (!cancelled) {
          setTransactions(txns);
          setAnalytics(analyticsData);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [tenantId]);

  // Derive shop stats from analytics (fallback when analytics hasn't loaded yet)
  const shopStats = analytics ? {
    totalSales: analytics.products.totalAmount,
    totalProducts: analytics.products.totalProducts,
    totalProfit: analytics.products.totalProfit
  } : { totalSales: 0, totalProducts: 0, totalProfit: 0 };

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
        <div>
          <h1 className="analytics-title">
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="analytics-subtitle">Here's where your shop stands today</p>
        </div>

        <div className="view-toggle-container">
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
        <div className="stat-card">
          <div className="card-header">
            <div className="card-title">
              <CheckSquare size={18} color="var(--primary)" />
              Tasks
            </div>
            <button className="view-all-link" onClick={() => navigate('/tasks')}>
              View all
            </button>
          </div>
          <div className="stat-grid">
            <div className="stat-item">
              <div className="stat-value">{taskStats.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{taskStats.pending}</div>
              <div className="stat-label">Pending</div>
            </div>
            <div className="stat-item" style={{ background: 'var(--danger-soft)' }}>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>{taskStats.overdue}</div>
              <div className="stat-label">Overdue</div>
            </div>
            <div className="stat-item" style={{ background: 'var(--warning-soft)' }}>
              <div className="stat-value" style={{ color: 'var(--warning)' }}>{taskStats.dueToday}</div>
              <div className="stat-label">Due today</div>
            </div>
          </div>
        </div>

        {/* Enhanced Shop Analytics Widget */}
        <div className="stat-card">
          <div className="card-header">
            <div className="card-title">
              {viewMode === 'bills' ? <FileText size={18} color="var(--primary)" /> : <Package size={18} color="var(--primary)" />}
              {viewMode === 'bills' ? 'Bills' : 'Products'}
            </div>
            <button
              className="view-all-link"
              onClick={() => navigate(viewMode === 'bills' ? '/shop/bills' : '/shop')}
            >
              View all
            </button>
          </div>

          <div className="main-stat">
            <div className="main-stat-value">
              {currentAnalytics ? formatCurrency(currentAnalytics.totalAmount) : formatCurrency(shopStats.totalSales)}
            </div>
            <div className="stat-label">
              {viewMode === 'bills' ? 'Total bill value' : 'Total product value'}
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat-item">
              <div className="stat-value">
                {currentAnalytics ?
                  (viewMode === 'bills' ? currentAnalytics.totalBills : currentAnalytics.totalProducts) :
                  shopStats.totalProducts
                }
              </div>
              <div className="stat-label">
                {viewMode === 'bills' ? 'Total bills' : 'Total products'}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: 'var(--success)' }}>
                {currentAnalytics ? formatCurrency(currentAnalytics.totalProfit) : formatCurrency(shopStats.totalProfit)}
              </div>
              <div className="stat-label">Total profit</div>
            </div>
          </div>
        </div>

        {/* Transactions Widget */}
        <div className="stat-card">
          <div className="card-header">
            <div className="card-title">
              <DollarSign size={18} color="var(--primary)" />
              Transactions
            </div>
            <button
              className="view-all-link"
              onClick={() => navigate('/shop/transactions')}
            >
              View all
            </button>
          </div>

          <div className="main-stat">
            <div
              className="main-stat-value"
              style={transactionStats.netBalance < 0 ? { color: 'var(--danger)' } : undefined}
            >
              {formatCurrency(transactionStats.netBalance)}
            </div>
            <div className="stat-label">Net balance</div>
          </div>

          <div className="stat-grid">
            <div className="stat-item">
              <div
                className="stat-value"
                style={{ color: transactionStats.cashIn > 0 ? 'var(--success)' : 'var(--muted-foreground)' }}
              >
                {formatCurrency(transactionStats.cashIn)}
              </div>
              <div className="stat-label">Cash in</div>
            </div>
            <div className="stat-item">
              <div
                className="stat-value"
                style={{ color: transactionStats.cashOut > 0 ? 'var(--danger)' : 'var(--muted-foreground)' }}
              >
                {formatCurrency(transactionStats.cashOut)}
              </div>
              <div className="stat-label">Cash out</div>
            </div>
          </div>
        </div>

        {/* Price List Widget */}
        <div className="stat-card">
          <div className="card-header">
            <div className="card-title">
              <ShoppingCart size={18} color="var(--primary)" />
              Price list
            </div>
            <button
              className="view-all-link"
              onClick={() => navigate('/shop/price-list')}
            >
              View all
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0.5rem 0' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {shopStats.totalProducts}
            </div>
            <div className="stat-label" style={{ marginTop: '0.4rem' }}>Items priced &amp; tracked</div>
          </div>
        </div>
      </div>

      {/* Enhanced Analytics Section */}
      {currentAnalytics && (
        <>
          {/* Key Metrics Row */}
          <div style={{ marginBottom: '2rem' }}>
            <div className="section-header">
              <TrendingUp size={20} color="var(--primary)" />
              {viewMode === 'bills' ? 'Bill analytics' : 'Product analytics'}
            </div>

            <div className="analytics-grid" style={{ marginBottom: 0 }}>
              {/* Average Value Card */}
              <div className="stat-card">
                <div>
                  <div className="stat-value" style={{ fontSize: '1.75rem' }}>
                    {viewMode === 'bills' ?
                      formatCurrency(currentAnalytics.averageBillValue) :
                      formatCurrency(currentAnalytics.averageProductValue)
                    }
                  </div>
                  <div className="stat-label">
                    {viewMode === 'bills' ? 'Average bill value' : 'Average product value'}
                  </div>
                </div>
              </div>

              {/* Profit Margin Card */}
              <div className="stat-card">
                <div>
                  <div className="stat-value" style={{ fontSize: '1.75rem', color: 'var(--success)' }}>
                    {formatPercentage(currentAnalytics.profitMargin)}
                  </div>
                  <div className="stat-label">Overall profit margin</div>
                </div>
              </div>

              {/* Top Vendor Card */}
              <div className="stat-card">
                <div>
                  <div className="stat-value" style={{ fontSize: '1.35rem' }}>
                    {currentAnalytics.vendorAnalytics.length > 0 ?
                      currentAnalytics.vendorAnalytics[0].vendor : 'No data'
                    }
                  </div>
                  <div className="stat-label">Top vendor</div>
                  {currentAnalytics.vendorAnalytics.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.4rem' }}>
                      {formatCurrency(currentAnalytics.vendorAnalytics[0].totalAmount)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Vendor Performance Section */}
          <div style={{ marginBottom: '2rem' }}>
            <div className="section-header">
              <CreditCard size={20} color="var(--primary)" />
              Vendor performance
            </div>
            <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {currentAnalytics.vendorAnalytics.slice(0, 10).map((vendor) => (
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
                      <div>{formatCurrency(vendor.totalAmount)}</div>
                      <div className="item-sub" style={{ color: 'var(--success)' }}>
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
            <div style={{ marginBottom: '2rem' }}>
              <div className="section-header">
                <TrendingUp size={20} color="var(--primary)" />
                Monthly trends
              </div>
              <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {currentAnalytics.monthlyAnalytics.slice(-6).map((month) => (
                    <div key={month.monthKey} className="list-item">
                      <div>
                        <div className="item-main">{month.month}</div>
                        <div className="item-sub">
                          {month.billCount} bills • Avg: {formatCurrency(month.averageBillValue)}
                        </div>
                      </div>
                      <div className="item-value">
                        <div>{formatCurrency(month.totalAmount)}</div>
                        <div className="item-sub" style={{ color: 'var(--success)' }}>
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
            <div style={{ marginBottom: '2rem' }}>
              <div className="section-header">
                <ArrowUpRight size={20} color="var(--primary)" />
                Top performing bills
              </div>
              <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {currentAnalytics.topPerformingBills.slice(0, 5).map((bill) => (
                    <div key={bill.id} className="list-item">
                      <div>
                        <div className="item-main">{bill.billNumber}</div>
                        <div className="item-sub">
                          {bill.vendor} • {new Date(bill.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="item-value">
                        <div>{formatCurrency(bill.totalAmount)}</div>
                        <div className="item-sub" style={{ color: 'var(--success)' }}>
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
          <Plus size={20} color="var(--primary)" />
          Quick actions
        </div>
        <div className="quick-actions-grid">
          <button
            className="action-button btn-primary"
            onClick={() => navigate('/tasks')}
          >
            <CheckSquare size={20} />
            Add task
          </button>

          <button
            className="action-button"
            onClick={() => navigate('/shop/bills')}
          >
            <ShoppingCart size={20} />
            Add product
          </button>

          <button
            className="action-button"
            onClick={() => navigate('/shop/transactions')}
          >
            <DollarSign size={20} />
            Add transaction
          </button>

          <button
            className="action-button"
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
