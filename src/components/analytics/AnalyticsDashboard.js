import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../../hooks/useTasks';
import { subscribeToShopProducts } from '../../firebase/shopProductService';
import { subscribeToTransactions } from '../../firebase/transactionService';
import { subscribeToAnalytics, formatCurrency, formatPercentage } from '../../services/analyticsService';
import { useState, useEffect } from 'react';
import './analytics_theme_1.css';

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const { todos, stats: taskStats } = useTasks();
  const [shopData, setShopData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [viewMode, setViewMode] = useState('bills'); // 'bills' or 'products'
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <>
      <div style={{padding: 'var(--spacing)', background: 'var(--background)', minHeight: '100vh'}}>
        <h1 style={{fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--foreground)'}}>
          Analytics Dashboard
        </h1>
        
        {/* View Mode Toggle */}
        <div style={{marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <span style={{fontWeight: 600, color: 'var(--foreground)'}}>Analytics View:</span>
          <div style={{display: 'flex', background: 'var(--muted)', borderRadius: 'var(--radius)', padding: '0.25rem'}}>
            <button
              onClick={() => setViewMode('bills')}
              style={{
                padding: '0.5rem 1rem',
                background: viewMode === 'bills' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'bills' ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              📄 Bills View
            </button>
            <button
              onClick={() => setViewMode('products')}
              style={{
                padding: '0.5rem 1rem',
                background: viewMode === 'products' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'products' ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              📦 Products View
            </button>
          </div>
        </div>

        {/* Data Widgets Grid */}
        <div className="analytics-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--card-gap)', marginBottom: '2.5rem'}}>
          
          {/* Tasks Widget */}
          <div className="card fade-in-up">
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem'}}>
              <div style={{fontWeight: 600, color: 'var(--primary)'}}>📝 Tasks</div>
              <button 
                onClick={() => navigate('/tasks')}
                style={{background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline'}}
              >
                View All
              </button>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '1.5rem', fontWeight: 700, color: '#22c55e'}}>{taskStats.completed}</div>
                <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>Completed</div>
              </div>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)'}}>{taskStats.pending}</div>
                <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>Pending</div>
              </div>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '1.2rem', fontWeight: 600, color: '#ef4444'}}>{taskStats.overdue}</div>
                <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>Overdue</div>
              </div>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '1.2rem', fontWeight: 600, color: '#f59e0b'}}>{taskStats.dueToday}</div>
                <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>Due Today</div>
              </div>
            </div>
          </div>

          {/* Enhanced Shop Analytics Widget */}
          <div className="card fade-in-up" style={{animationDelay: '0.1s'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem'}}>
              <div style={{fontWeight: 600, color: '#10b981'}}>
                {viewMode === 'bills' ? '📄 Bills Analytics' : '📦 Products Analytics'}
              </div>
              <button 
                onClick={() => navigate(viewMode === 'bills' ? '/shop/bills' : '/shop')}
                style={{background: 'none', border: 'none', color: '#10b981', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline'}}
              >
                View All
              </button>
            </div>
            <div style={{textAlign: 'center', marginBottom: '1rem'}}>
              <div style={{fontSize: '1.5rem', fontWeight: 700, color: '#10b981'}}>
                {currentAnalytics ? formatCurrency(currentAnalytics.totalAmount) : formatCurrency(shopStats.totalSales)}
              </div>
              <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>
                {viewMode === 'bills' ? 'Total Bill Value' : 'Total Product Value'}
              </div>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '1.2rem', fontWeight: 600, color: '#8b5cf6'}}>
                  {currentAnalytics ? 
                    (viewMode === 'bills' ? currentAnalytics.totalBills : currentAnalytics.totalProducts) : 
                    shopStats.totalProducts
                  }
                </div>
                <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>
                  {viewMode === 'bills' ? 'Total Bills' : 'Total Products'}
                </div>
              </div>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '1.2rem', fontWeight: 600, color: '#f59e0b'}}>
                  {currentAnalytics ? formatCurrency(currentAnalytics.totalProfit) : formatCurrency(shopStats.totalProfit)}
                </div>
                <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>Total Profit</div>
              </div>
            </div>
          </div>

          {/* Transactions Widget */}
          <div className="card fade-in-up" style={{animationDelay: '0.2s'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem'}}>
              <div style={{fontWeight: 600, color: '#f59e0b'}}>💰 Transactions</div>
              <button 
                onClick={() => navigate('/shop/transactions')}
                style={{background: 'none', border: 'none', color: '#f59e0b', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline'}}
              >
                View All
              </button>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '1.2rem', fontWeight: 600, color: '#22c55e'}}>{formatCurrency(transactionStats.cashIn)}</div>
                <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>Cash In</div>
              </div>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '1.2rem', fontWeight: 600, color: '#ef4444'}}>{formatCurrency(transactionStats.cashOut)}</div>
                <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>Cash Out</div>
              </div>
            </div>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)'}}>{formatCurrency(transactionStats.netBalance)}</div>
              <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>Net Balance</div>
            </div>
          </div>

          {/* Price List Widget */}
          <div className="card fade-in-up" style={{animationDelay: '0.3s'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem'}}>
              <div style={{fontWeight: 600, color: '#8b5cf6'}}>📋 Price List</div>
              <button 
                onClick={() => navigate('/shop/price-list')}
                style={{background: 'none', border: 'none', color: '#8b5cf6', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline'}}
              >
                View All
              </button>
            </div>
            <div style={{textAlign: 'center', marginBottom: '1rem'}}>
              <div style={{fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6'}}>9</div>
              <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>Total Items</div>
            </div>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>Manage your product pricing and inventory</div>
            </div>
          </div>
        </div>

        {/* Enhanced Analytics Section */}
        {currentAnalytics && (
          <>
            {/* Key Metrics Row */}
            <div style={{marginBottom: '2.5rem'}}>
              <h3 style={{fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--foreground)'}}>
                {viewMode === 'bills' ? 'Bill Analytics' : 'Product Analytics'}
              </h3>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
                
                {/* Average Value Card */}
                <div className="card">
                  <div style={{textAlign: 'center'}}>
                    <div style={{fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)'}}>
                      {viewMode === 'bills' ? 
                        formatCurrency(currentAnalytics.averageBillValue) : 
                        formatCurrency(currentAnalytics.averageProductValue)
                      }
                    </div>
                    <div style={{fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '0.5rem'}}>
                      {viewMode === 'bills' ? 'Average Bill Value' : 'Average Product Value'}
                    </div>
                  </div>
                </div>

                {/* Profit Margin Card */}
                <div className="card">
                  <div style={{textAlign: 'center'}}>
                    <div style={{fontSize: '1.5rem', fontWeight: 700, color: '#16a34a'}}>
                      {formatPercentage(currentAnalytics.profitMargin)}
                    </div>
                    <div style={{fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '0.5rem'}}>
                      Overall Profit Margin
                    </div>
                  </div>
                </div>

                {/* Top Vendor Card */}
                <div className="card">
                  <div style={{textAlign: 'center'}}>
                    <div style={{fontSize: '1.2rem', fontWeight: 600, color: '#dc2626'}}>
                      {currentAnalytics.vendorAnalytics.length > 0 ? 
                        currentAnalytics.vendorAnalytics[0].vendor : 'No Data'
                      }
                    </div>
                    <div style={{fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '0.5rem'}}>
                      Top Vendor
                    </div>
                    {currentAnalytics.vendorAnalytics.length > 0 && (
                      <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem'}}>
                        {formatCurrency(currentAnalytics.vendorAnalytics[0].totalAmount)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor Performance Section */}
            <div style={{marginBottom: '2.5rem'}}>
              <h3 style={{fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--foreground)'}}>
                Vendor Performance
              </h3>
              <div className="card">
                <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                  {currentAnalytics.vendorAnalytics.slice(0, 10).map((vendor, index) => (
                    <div key={vendor.vendor} style={{
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '0.75rem 0',
                      borderBottom: index < currentAnalytics.vendorAnalytics.length - 1 ? '1px solid var(--border)' : 'none'
                    }}>
                      <div>
                        <div style={{fontWeight: 600, color: 'var(--foreground)'}}>{vendor.vendor}</div>
                        <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>
                          {viewMode === 'bills' ? 
                            `${vendor.billCount} bills • Avg: ${formatCurrency(vendor.averageBillValue)}` :
                            `${vendor.productCount} products`
                          }
                        </div>
                      </div>
                      <div style={{textAlign: 'right'}}>
                        <div style={{fontWeight: 600, color: '#16a34a'}}>
                          {formatCurrency(vendor.totalAmount)}
                        </div>
                        <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>
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
              <div style={{marginBottom: '2.5rem'}}>
                <h3 style={{fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--foreground)'}}>
                  Monthly Trends
                </h3>
                <div className="card">
                  <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                    {currentAnalytics.monthlyAnalytics.slice(-6).map((month, index) => (
                      <div key={month.monthKey} style={{
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '0.75rem 0',
                        borderBottom: index < currentAnalytics.monthlyAnalytics.length - 1 ? '1px solid var(--border)' : 'none'
                      }}>
                        <div>
                          <div style={{fontWeight: 600, color: 'var(--foreground)'}}>{month.month}</div>
                          <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>
                            {month.billCount} bills • Avg: {formatCurrency(month.averageBillValue)}
                          </div>
                        </div>
                        <div style={{textAlign: 'right'}}>
                          <div style={{fontWeight: 600, color: '#3b82f6'}}>
                            {formatCurrency(month.totalAmount)}
                          </div>
                          <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>
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
              <div style={{marginBottom: '2.5rem'}}>
                <h3 style={{fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--foreground)'}}>
                  Top Performing Bills
                </h3>
                <div className="card">
                  <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                    {currentAnalytics.topPerformingBills.slice(0, 5).map((bill, index) => (
                      <div key={bill.id} style={{
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '0.75rem 0',
                        borderBottom: index < currentAnalytics.topPerformingBills.length - 1 ? '1px solid var(--border)' : 'none'
                      }}>
                        <div>
                          <div style={{fontWeight: 600, color: 'var(--foreground)'}}>{bill.billNumber}</div>
                          <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>
                            {bill.vendor} • {new Date(bill.date).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{textAlign: 'right'}}>
                          <div style={{fontWeight: 600, color: '#16a34a'}}>
                            {formatCurrency(bill.totalAmount)}
                          </div>
                          <div style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>
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
        <div style={{marginTop: '3rem'}}>
          <h3 style={{fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--foreground)'}}>
            Quick Actions
          </h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
            <button 
              onClick={() => navigate('/tasks')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.5rem',
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(37,99,235,0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'none';
                e.target.style.boxShadow = 'var(--shadow)';
              }}
            >
              <span style={{fontSize: '1.2rem'}}>📝</span>
              Add Task
            </button>

            <button 
              onClick={() => navigate('/shop/bills')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.5rem',
                background: 'var(--accent)',
                color: 'var(--accent-foreground)',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(251,191,36,0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'none';
                e.target.style.boxShadow = 'var(--shadow)';
              }}
            >
              <span style={{fontSize: '1.2rem'}}>🛒</span>
              Add Product
            </button>

            <button 
              onClick={() => navigate('/shop/transactions')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.5rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(16,185,129,0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'none';
                e.target.style.boxShadow = 'var(--shadow)';
              }}
            >
              <span style={{fontSize: '1.2rem'}}>💰</span>
              Add Transaction
            </button>

            <button 
              onClick={() => navigate('/settings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.5rem',
                background: '#23272f', // darker grey
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'none';
                e.target.style.boxShadow = 'var(--shadow)';
              }}
            >
              <span style={{fontSize: '1.2rem'}}>⚙️</span>
              Settings
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AnalyticsDashboard; 