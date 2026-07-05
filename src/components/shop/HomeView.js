import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, TrendingUp, IndianRupee, Users,
  FileText, Clock,
  ChevronRight,
  LayoutDashboard
} from 'lucide-react';
import { useBills } from '../../context/BillsContext';
import { useVendors } from '../../context/VendorsContext';
import { subscribeToShopProducts } from '../../firebase/shopProductService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import SummaryCard from '../ui/SummaryCard';
import { useAuth } from '../../context/AuthContext';

// --- Styles ---
const STYLES = {
  sectionTitle: {
    fontSize: '15px', fontWeight: '700', color: 'var(--foreground)',
    marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px',
  },
  sectionCard: {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px',
    padding: '24px',
  },
  viewAllBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontSize: '13px', fontWeight: '600', color: 'var(--primary)',
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '6px 12px', borderRadius: '8px',
    transition: 'all 0.15s',
  },
  statusDot: {
    width: '8px', height: '8px', borderRadius: '50%',
    display: 'inline-block', marginRight: '8px',
  },
};

const StatusRow = ({ label, count, amount, color, dotColor }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 0', borderBottom: '1px solid var(--border)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span style={{ ...STYLES.statusDot, background: dotColor }} />
      <span style={{ fontSize: '14px', color: 'var(--foreground)' }}>{label}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <span style={{
        fontSize: '12px', fontWeight: '600', color,
        background: `color-mix(in srgb, ${dotColor} 12%, transparent)`, padding: '2px 10px', borderRadius: '10px',
      }}>
        {count}
      </span>
      <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--foreground)', minWidth: '90px', textAlign: 'right' }}>
        {formatCurrency(amount)}
      </span>
    </div>
  </div>
);

const TAB_ROUTES = { home: '/shop', bills: '/shop/bills', products: '/shop/products', pricelist: '/shop/price-list', vendors: '/shop/vendors' };

const HomeView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const onNavigate = (tab) => navigate(TAB_ROUTES[tab] || '/shop');
  const { bills } = useBills();
  const { vendors } = useVendors();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Subscribe to products
  useEffect(() => {
    if (!tenantId) return;
    const unsubscribe = subscribeToShopProducts(tenantId, (items) => {
      setProducts(items || []);
      setLoadingProducts(false);
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [tenantId]);

  // --- Computed stats ---
  const billStats = useMemo(() => {
    let paid = 0, paidAmt = 0, pending = 0, pendingAmt = 0;
    let totalAmount = 0;

    (bills || []).forEach(b => {
      const amt = b.finalAmount || b.totalAmount || 0;
      totalAmount += amt;

      if (b.status === 'paid') { paid++; paidAmt += amt; }
      else { pending++; pendingAmt += amt; }
    });

    return {
      total: (bills || []).length, totalAmount,
      paid, paidAmt, pending, pendingAmt,
    };
  }, [bills]);

  const productStats = useMemo(() => {
    const totalValue = products.reduce((s, p) => s + (p.totalAmount || 0), 0);
    const totalProfit = products.reduce((s, p) => s + ((p.profitPerPiece || 0) * (p.totalQuantity || 0)), 0);
    return { total: products.length, totalValue, totalProfit };
  }, [products]);

  const vendorStats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let activeCount = 0;
    let outstandingAmt = 0;
    let overdueAmt = 0;

    const vendorNames = new Set((vendors || []).map(v => v.name));
    // Also count vendors from bills that aren't registered
    (bills || []).forEach(b => { if (b.vendor) vendorNames.add(b.vendor); });
    const totalCount = vendorNames.size;

    // Compute per-vendor stats from bills
    const vendorBillMap = {};
    (bills || []).forEach(b => {
      if (!b.vendor) return;
      if (!vendorBillMap[b.vendor]) vendorBillMap[b.vendor] = { bills: [], lastDate: null };
      vendorBillMap[b.vendor].bills.push(b);
      const d = b.date ? new Date(b.date) : null;
      if (d && (!vendorBillMap[b.vendor].lastDate || d > vendorBillMap[b.vendor].lastDate)) {
        vendorBillMap[b.vendor].lastDate = d;
      }
    });

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    Object.values(vendorBillMap).forEach(({ bills: vBills, lastDate }) => {
      if (lastDate && lastDate >= thirtyDaysAgo) activeCount++;
      vBills.forEach(b => {
        const amt = b.finalAmount || b.totalAmount || 0;
        const dueDate = b.dueDate ? new Date(b.dueDate) : null;
        const isOverdue = b.status === 'returned' || (b.status === 'active' && dueDate && dueDate < today);
        if (b.status === 'active') {
          if (isOverdue) overdueAmt += amt;
          else outstandingAmt += amt;
        }
      });
    });

    return { total: totalCount, active: activeCount, outstandingAmt, overdueAmt };
  }, [vendors, bills]);

  const recentBills = useMemo(() => {
    return [...(bills || [])]
      .sort((a, b) => {
        const da = a.date ? new Date(a.date) : new Date(0);
        const db = b.date ? new Date(b.date) : new Date(0);
        return db - da;
      })
      .slice(0, 5);
  }, [bills]);

  const uniqueProductCount = useMemo(() => {
    const names = new Set();
    products.forEach(p => { if (p.productName) names.add(p.productName.trim().toLowerCase()); });
    return names.size;
  }, [products]);

  const topProducts = useMemo(() => {
    return [...products]
      .map(p => ({ ...p, totalProfit: (p.profitPerPiece || 0) * (p.totalQuantity || 0) }))
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 5);
  }, [products]);

  const isLoading = loadingProducts;

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <LayoutDashboard size={48} style={{ margin: '0 auto 16px', color: 'var(--muted-foreground)' }} />
        <div style={{ fontSize: '16px', color: 'var(--muted-foreground)' }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      {/* ===== TOP SUMMARY CARDS ===== */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px', marginBottom: '24px',
      }}>
        <SummaryCard
          label="Total Revenue"
          value={formatCurrency(billStats.totalAmount)}
          subtitle={`${billStats.total} bills total`}
          icon={IndianRupee} color="var(--success)" bgColor="var(--success-soft)"
        />
        <SummaryCard
          label="Total Profit"
          value={formatCurrency(productStats.totalProfit)}
          subtitle={`${billStats.totalAmount > 0 ? ((productStats.totalProfit / billStats.totalAmount) * 100).toFixed(1) : '0.0'}% margin`}
          icon={TrendingUp} color="var(--warning)" bgColor="var(--warning-soft)"
        />
        <SummaryCard
          label="Products"
          value={productStats.total}
          subtitle={`${formatCurrency(productStats.totalValue)} total value`}
          icon={Package} color="var(--primary)" bgColor="var(--primary-soft)"
        />
        <SummaryCard
          label="Vendors"
          value={vendorStats.total}
          subtitle={`${vendorStats.active} active in last 30 days`}
          icon={Users} color="var(--primary)" bgColor="var(--primary-soft)"
        />
      </div>

      {/* ===== BILLS & VENDORS OVERVIEW ===== */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '16px', marginBottom: '24px',
      }}>
        {/* Bills Overview */}
        <div style={STYLES.sectionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={STYLES.sectionTitle}>
              <FileText size={16} color="var(--muted-foreground)" />
              Bills Overview
            </div>
            <button style={STYLES.viewAllBtn} onClick={() => onNavigate('bills')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <StatusRow label="Total Bills" count={billStats.total} amount={billStats.totalAmount} color="var(--primary)" dotColor="var(--primary)" />
          <StatusRow label="Paid" count={billStats.paid} amount={billStats.paidAmt} color="var(--success)" dotColor="var(--success)" />
          <StatusRow label="Pending" count={billStats.pending} amount={billStats.pendingAmt} color="var(--warning)" dotColor="var(--warning)" />
        </div>

        {/* Vendors Overview */}
        <div style={STYLES.sectionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={STYLES.sectionTitle}>
              <Users size={16} color="var(--muted-foreground)" />
              Vendors Overview
            </div>
            <button style={STYLES.viewAllBtn} onClick={() => onNavigate('vendors')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <StatusRow label="Active Vendors" count={vendorStats.active} amount={0} color="var(--success)" dotColor="var(--success)" />
          <StatusRow label="Outstanding" count="" amount={vendorStats.outstandingAmt} color="var(--warning)" dotColor="var(--warning)" />
          <StatusRow label="Overdue" count="" amount={vendorStats.overdueAmt} color="var(--danger)" dotColor="var(--danger)" />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ ...STYLES.statusDot, background: 'var(--primary)' }} />
              <span style={{ fontSize: '14px', color: 'var(--foreground)' }}>Unique Products</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{
                fontSize: '12px', fontWeight: '600', color: 'var(--primary)',
                background: 'var(--primary-soft)', padding: '2px 10px', borderRadius: '10px',
              }}>
                {uniqueProductCount}
              </span>
              <button style={{ ...STYLES.viewAllBtn, minWidth: '90px', textAlign: 'right', padding: '0' }} onClick={() => onNavigate('pricelist')}>
                View <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RECENT BILLS & TOP PRODUCTS ===== */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '16px',
      }}>
        {/* Recent Bills */}
        <div style={STYLES.sectionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={STYLES.sectionTitle}>
              <Clock size={16} color="var(--muted-foreground)" />
              Recent Bills
            </div>
            <button style={STYLES.viewAllBtn} onClick={() => onNavigate('bills')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          {recentBills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted-foreground)', fontSize: '14px' }}>
              No bills yet
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['#', 'Vendor', 'Amount', 'Status', 'Date'].map(h => (
                      <th key={h} style={{
                        padding: '8px 12px', textAlign: h === 'Amount' ? 'right' : 'left',
                        fontSize: '11px', fontWeight: '600', color: 'var(--muted-foreground)',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        borderBottom: '1px solid var(--border)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentBills.map(bill => {
                    const dueDate = bill.dueDate ? new Date(bill.dueDate) : null;
                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const isOverdue = bill.status === 'returned' || (bill.status === 'active' && dueDate && dueDate < today);
                    const statusLabel = bill.status === 'paid' ? 'Paid' : isOverdue ? 'Overdue' : 'Pending';
                    const statusColor = bill.status === 'paid' ? 'var(--success)' : isOverdue ? 'var(--danger)' : 'var(--warning)';
                    const statusBg = bill.status === 'paid' ? 'var(--success-soft)' : isOverdue ? 'var(--danger-soft)' : 'var(--warning-soft)';

                    return (
                      <tr key={bill.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '600', color: 'var(--foreground)' }}>
                          {bill.billNumber || '-'}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--foreground)' }}>
                          {bill.vendor || '-'}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '600', color: 'var(--foreground)', textAlign: 'right' }}>
                          {formatCurrency(bill.finalAmount || bill.totalAmount || 0)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            fontSize: '11px', fontWeight: '600', color: statusColor,
                            background: statusBg, padding: '3px 10px', borderRadius: '10px',
                          }}>
                            {statusLabel}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--muted-foreground)' }}>
                          {bill.date ? formatDate(bill.date) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Products by Profit */}
        <div style={STYLES.sectionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={STYLES.sectionTitle}>
              <TrendingUp size={16} color="var(--muted-foreground)" />
              Top Products by Profit
            </div>
            <button style={STYLES.viewAllBtn} onClick={() => onNavigate('products')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          {topProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted-foreground)', fontSize: '14px' }}>
              No products yet
            </div>
          ) : (
            <div>
              {topProducts.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: i < topProducts.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '6px',
                      background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: '700', color: 'var(--muted-foreground)',
                    }}>
                      {i + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--foreground)' }}>
                        {p.productName || 'Unnamed'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                        {p.category || '-'} · Qty: {p.totalQuantity || 0}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--success)' }}>
                      {formatCurrency(p.totalProfit)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                      {formatCurrency(p.profitPerPiece || 0)}/pc
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeView;
