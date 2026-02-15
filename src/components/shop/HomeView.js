import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, TrendingUp, IndianRupee, Users,
  FileText, CheckCircle, Clock, AlertTriangle,
  Tag, ChevronRight, ArrowUpRight, ArrowDownRight,
  LayoutDashboard
} from 'lucide-react';
import { useBills } from '../../context/BillsContext';
import { useVendors } from '../../context/VendorsContext';
import { subscribeToShopProducts } from '../../firebase/shopProductService';
import { formatCurrency, formatDate } from '../../utils/formatters';

// --- Styles ---
const STYLES = {
  sectionTitle: {
    fontSize: '15px', fontWeight: '700', color: '#1e293b',
    marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px',
  },
  card: {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
    padding: '20px', position: 'relative', overflow: 'hidden',
  },
  cardLabel: {
    fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '8px',
  },
  cardValue: {
    fontSize: '24px', fontWeight: '800', marginBottom: '4px',
  },
  cardSubtitle: {
    fontSize: '13px', color: '#94a3b8',
  },
  iconBadge: {
    position: 'absolute', top: '16px', right: '16px',
    width: '40px', height: '40px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  sectionCard: {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
    padding: '24px',
  },
  viewAllBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontSize: '13px', fontWeight: '600', color: '#3b82f6',
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '6px 12px', borderRadius: '8px',
    transition: 'all 0.15s',
  },
  statusDot: {
    width: '8px', height: '8px', borderRadius: '50%',
    display: 'inline-block', marginRight: '8px',
  },
};

const SummaryCard = ({ label, value, subtitle, icon: Icon, color, bgColor }) => (
  <div style={STYLES.card}>
    <div style={{ ...STYLES.iconBadge, background: bgColor }}>
      <Icon size={20} color={color} />
    </div>
    <div style={STYLES.cardLabel}>{label}</div>
    <div style={{ ...STYLES.cardValue, color }}>{value}</div>
    <div style={STYLES.cardSubtitle}>{subtitle}</div>
  </div>
);

const StatusRow = ({ label, count, amount, color, dotColor }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 0', borderBottom: '1px solid #f1f5f9',
  }}>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span style={{ ...STYLES.statusDot, background: dotColor }} />
      <span style={{ fontSize: '14px', color: '#475569' }}>{label}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <span style={{
        fontSize: '12px', fontWeight: '600', color,
        background: `${dotColor}18`, padding: '2px 10px', borderRadius: '10px',
      }}>
        {count}
      </span>
      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', minWidth: '90px', textAlign: 'right' }}>
        {formatCurrency(amount)}
      </span>
    </div>
  </div>
);

const HomeView = ({ onNavigate }) => {
  const { bills, billProducts } = useBills();
  const { vendors } = useVendors();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Subscribe to products
  useEffect(() => {
    const unsubscribe = subscribeToShopProducts((items) => {
      setProducts(items || []);
      setLoadingProducts(false);
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  // --- Computed stats ---
  const billStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let paid = 0, paidAmt = 0, pending = 0, pendingAmt = 0, overdue = 0, overdueAmt = 0;
    let totalAmount = 0;

    (bills || []).forEach(b => {
      const amt = b.totalAmount || 0;
      totalAmount += amt;
      const dueDate = b.dueDate ? new Date(b.dueDate) : null;
      const isOverdue = b.status === 'returned' || (b.status === 'active' && dueDate && dueDate < today);

      if (b.status === 'paid') { paid++; paidAmt += amt; }
      else if (isOverdue) { overdue++; overdueAmt += amt; }
      else { pending++; pendingAmt += amt; }
    });

    return {
      total: (bills || []).length, totalAmount,
      paid, paidAmt, pending, pendingAmt, overdue, overdueAmt,
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
        const amt = b.totalAmount || 0;
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
        <LayoutDashboard size={48} style={{ margin: '0 auto 16px', color: '#94a3b8' }} />
        <div style={{ fontSize: '16px', color: '#64748b' }}>Loading dashboard...</div>
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
          icon={IndianRupee} color="#10b981" bgColor="#ecfdf5"
        />
        <SummaryCard
          label="Total Profit"
          value={formatCurrency(productStats.totalProfit)}
          subtitle="Across all products"
          icon={TrendingUp} color="#f59e0b" bgColor="#fff7ed"
        />
        <SummaryCard
          label="Products"
          value={productStats.total}
          subtitle={`${formatCurrency(productStats.totalValue)} total value`}
          icon={Package} color="#0f172a" bgColor="#f1f5f9"
        />
        <SummaryCard
          label="Vendors"
          value={vendorStats.total}
          subtitle={`${vendorStats.active} active in last 30 days`}
          icon={Users} color="#7c3aed" bgColor="#f5f3ff"
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
              <FileText size={16} color="#64748b" />
              Bills Overview
            </div>
            <button style={STYLES.viewAllBtn} onClick={() => onNavigate('bills')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <StatusRow label="Paid" count={billStats.paid} amount={billStats.paidAmt} color="#10b981" dotColor="#10b981" />
          <StatusRow label="Pending" count={billStats.pending} amount={billStats.pendingAmt} color="#f59e0b" dotColor="#f59e0b" />
          <StatusRow label="Overdue" count={billStats.overdue} amount={billStats.overdueAmt} color="#ef4444" dotColor="#ef4444" />
        </div>

        {/* Vendors Overview */}
        <div style={STYLES.sectionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={STYLES.sectionTitle}>
              <Users size={16} color="#64748b" />
              Vendors Overview
            </div>
            <button style={STYLES.viewAllBtn} onClick={() => onNavigate('vendors')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <StatusRow label="Active Vendors" count={vendorStats.active} amount={0} color="#10b981" dotColor="#10b981" />
          <StatusRow label="Outstanding" count="" amount={vendorStats.outstandingAmt} color="#f59e0b" dotColor="#f59e0b" />
          <StatusRow label="Overdue" count="" amount={vendorStats.overdueAmt} color="#ef4444" dotColor="#ef4444" />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ ...STYLES.statusDot, background: '#7c3aed' }} />
              <span style={{ fontSize: '14px', color: '#475569' }}>Unique Products</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{
                fontSize: '12px', fontWeight: '600', color: '#7c3aed',
                background: '#f5f3ff', padding: '2px 10px', borderRadius: '10px',
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
              <Clock size={16} color="#64748b" />
              Recent Bills
            </div>
            <button style={STYLES.viewAllBtn} onClick={() => onNavigate('bills')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          {recentBills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '14px' }}>
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
                        fontSize: '11px', fontWeight: '600', color: '#94a3b8',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        borderBottom: '1px solid #f1f5f9',
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
                    const statusColor = bill.status === 'paid' ? '#10b981' : isOverdue ? '#ef4444' : '#f59e0b';
                    const statusBg = bill.status === 'paid' ? '#ecfdf5' : isOverdue ? '#fef2f2' : '#fffbeb';

                    return (
                      <tr key={bill.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                          {bill.billNumber || '-'}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', color: '#475569' }}>
                          {bill.vendor || '-'}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '600', color: '#1e293b', textAlign: 'right' }}>
                          {formatCurrency(bill.totalAmount || 0)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            fontSize: '11px', fontWeight: '600', color: statusColor,
                            background: statusBg, padding: '3px 10px', borderRadius: '10px',
                          }}>
                            {statusLabel}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', color: '#94a3b8' }}>
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
              <TrendingUp size={16} color="#64748b" />
              Top Products by Profit
            </div>
            <button style={STYLES.viewAllBtn} onClick={() => onNavigate('products')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          {topProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '14px' }}>
              No products yet
            </div>
          ) : (
            <div>
              {topProducts.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: i < topProducts.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '6px',
                      background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: '700', color: '#64748b',
                    }}>
                      {i + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                        {p.productName || 'Unnamed'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {p.category || '-'} · Qty: {p.totalQuantity || 0}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>
                      {formatCurrency(p.totalProfit)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
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
