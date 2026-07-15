import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { useBills } from '../../context/BillsContext';
import { getShopProducts } from '../../firebase/shopProductService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import MeterBar from '../ui/MeterBar';
import { useAuth } from '../../context/AuthContext';

const CARD = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 24
};

const CARD_LABEL = { fontSize: 13, fontWeight: 700, color: 'var(--muted-foreground)' };

const HERO_NUM = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  color: 'var(--foreground)'
};

const LINK_BTN = {
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--primary-accent)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  fontFamily: 'var(--font-sans)'
};

const billAmount = (b) => b.finalAmount || b.totalAmount || 0;

const billStatus = (bill, today) => {
  if (bill.status === 'paid') return { label: 'Paid', variant: 'success' };
  const due = bill.dueDate ? new Date(bill.dueDate) : null;
  const overdue = bill.status === 'returned' || (bill.status === 'active' && due && due < today);
  return overdue ? { label: 'Overdue', variant: 'overdue' } : { label: 'Pending', variant: 'warning' };
};

const HomeView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const { bills } = useBills();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    getShopProducts(tenantId)
      .then(items => { if (!cancelled) { setProducts(items || []); setLoadingProducts(false); } })
      .catch(err => { console.error('Error loading product stats:', err); if (!cancelled) { setProducts([]); setLoadingProducts(false); } });
    return () => { cancelled = true; };
  }, [tenantId]);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const heroStats = useMemo(() => {
    const now = new Date();
    const monthLabel = now.toLocaleString('en-IN', { month: 'long' });
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    let monthTotal = 0, monthCount = 0, prevTotal = 0, ytdCount = 0;
    (bills || []).forEach(b => {
      const d = b.date ? new Date(b.date) : null;
      if (!d) return;
      const amt = billAmount(b);
      if (d.getFullYear() === now.getFullYear()) ytdCount++;
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        monthTotal += amt; monthCount++;
      } else if (d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth()) {
        prevTotal += amt;
      }
    });
    const deltaPct = prevTotal > 0 ? ((monthTotal - prevTotal) / prevTotal) * 100 : null;
    const prevLabel = prev.toLocaleString('en-IN', { month: 'long' });
    return { monthLabel, monthTotal, monthCount, prevLabel, deltaPct, ytdCount };
  }, [bills]);

  const openStats = useMemo(() => {
    let pendingAmt = 0, overdueAmt = 0, openCount = 0;
    (bills || []).forEach(b => {
      if (b.status === 'paid') return;
      openCount++;
      const { variant } = billStatus(b, today);
      if (variant === 'overdue') overdueAmt += billAmount(b);
      else pendingAmt += billAmount(b);
    });
    return { pendingAmt, overdueAmt, openCount, openTotal: pendingAmt + overdueAmt };
  }, [bills, today]);

  const productStats = useMemo(() => {
    const totalValue = products.reduce((s, p) => s + (p.totalAmount || 0), 0);
    const totalProfit = products.reduce((s, p) => s + ((p.profitPerPiece || 0) * (p.totalQuantity || 0)), 0);
    return { total: products.length, totalValue, totalProfit };
  }, [products]);

  const recentBills = useMemo(() => {
    return [...(bills || [])]
      .sort((a, b) => {
        const da = a.date ? new Date(a.date) : new Date(0);
        const db = b.date ? new Date(b.date) : new Date(0);
        return db - da;
      })
      .slice(0, 5);
  }, [bills]);

  const topProducts = useMemo(() => {
    return [...products]
      .map(p => ({ ...p, totalProfit: (p.profitPerPiece || 0) * (p.totalQuantity || 0) }))
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 5);
  }, [products]);

  if (loadingProducts) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <LayoutDashboard size={48} style={{ margin: '0 auto 16px', color: 'var(--muted-foreground)' }} />
        <div style={{ fontSize: 16, color: 'var(--muted-foreground)' }}>Loading your shop…</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ===== TOP ROW: hero · to collect/pay · products ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr 1fr', gap: 16 }}>
        {/* Hero (solid ink) */}
        <div style={{
          background: 'var(--foreground)', color: 'var(--background)',
          borderRadius: 'var(--radius-lg)', padding: 28, position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', right: -40, top: -40, width: 180, height: 180,
            borderRadius: '50%', background: 'var(--primary)', opacity: 0.9
          }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.7, marginBottom: 10 }}>
              {heroStats.monthLabel} so far
            </div>
            <div style={{ ...HERO_NUM, color: 'var(--background)', fontSize: 44, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {formatCurrency(heroStats.monthTotal)}
            </div>
            <div style={{ fontSize: 14, marginTop: 10, opacity: 0.85 }}>
              purchases across {heroStats.monthCount} bill{heroStats.monthCount !== 1 ? 's' : ''} this month
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
              {heroStats.deltaPct !== null && (
                <span style={{
                  background: 'color-mix(in srgb, var(--background) 14%, transparent)',
                  borderRadius: 'var(--radius-pill)', padding: '6px 14px', fontSize: 12, fontWeight: 700
                }}>
                  {heroStats.deltaPct >= 0 ? '▲' : '▼'} {Math.abs(heroStats.deltaPct).toFixed(1)}% vs {heroStats.prevLabel}
                </span>
              )}
              <span style={{
                background: 'color-mix(in srgb, var(--background) 14%, transparent)',
                borderRadius: 'var(--radius-pill)', padding: '6px 14px', fontSize: 12, fontWeight: 700
              }}>
                {heroStats.ytdCount} bills YTD
              </span>
            </div>
          </div>
        </div>

        {/* To collect / pay */}
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column' }}>
          <div style={CARD_LABEL}>To collect / pay</div>
          <div style={{ ...HERO_NUM, fontSize: 30, marginTop: 12 }}>
            {formatCurrency(openStats.openTotal)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 4 }}>
            across {openStats.openCount} open bill{openStats.openCount !== 1 ? 's' : ''}
          </div>
          <MeterBar
            style={{ marginTop: 14 }}
            total={openStats.openTotal}
            segments={[
              { value: openStats.pendingAmt, color: 'var(--warning)' },
              { value: openStats.overdueAmt, color: 'var(--overdue)' }
            ]}
          />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginTop: 8
          }}>
            <span><span style={{ color: 'var(--warning)' }}>●</span> pending {formatCurrency(openStats.pendingAmt)}</span>
            <span><span style={{ color: 'var(--overdue)' }}>●</span> overdue {formatCurrency(openStats.overdueAmt)}</span>
          </div>
        </div>

        {/* Products */}
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={CARD_LABEL}>Stock value</div>
            <button style={{ ...LINK_BTN, fontSize: 12 }} onClick={() => navigate('/shop/price-list')}>Price list →</button>
          </div>
          <div style={{ ...HERO_NUM, fontSize: 30, marginTop: 12 }}>
            {formatCurrency(productStats.totalValue)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 4 }}>
            {productStats.total} product{productStats.total !== 1 ? 's' : ''} tracked
          </div>
          <div style={{
            marginTop: 14, background: 'var(--muted)', borderRadius: 'var(--radius-sm)', padding: '10px 12px'
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>PROFIT</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--success)' }}>
              {formatCurrency(productStats.totalProfit)}
            </div>
          </div>
        </div>
      </div>

      {/* ===== BOTTOM ROW: recent bills · top products ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        {/* Recent bills */}
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ ...HERO_NUM, fontSize: 18, fontWeight: 700 }}>Recent bills</div>
            <button style={LINK_BTN} onClick={() => navigate('/shop/bills')}>See all →</button>
          </div>
          {recentBills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted-foreground)', fontSize: 14 }}>
              No bills yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentBills.map(bill => {
                const status = billStatus(bill, today);
                return (
                  <div
                    key={bill.id}
                    onClick={() => navigate('/shop/bills')}
                    style={{
                      display: 'grid', gridTemplateColumns: '44px 1fr auto auto',
                      alignItems: 'center', gap: 14, padding: '10px 12px',
                      borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--muted)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Avatar name={bill.vendor || '?'} size={44} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
                        {bill.vendor || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                        {bill.billNumber || '—'} · {bill.date ? formatDate(bill.date) : '—'}
                      </div>
                    </div>
                    <Badge variant={status.variant} size="small">{status.label}</Badge>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--foreground)' }}>
                      {formatCurrency(billAmount(bill))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top products */}
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ ...HERO_NUM, fontSize: 18, fontWeight: 700 }}>Top products</div>
            <button style={LINK_BTN} onClick={() => navigate('/shop/products')}>See all →</button>
          </div>
          {topProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted-foreground)', fontSize: 14 }}>
              No products yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {topProducts.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 10px', borderRadius: 'var(--radius)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: 8,
                      background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)'
                    }}>
                      {i + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
                        {p.productName || 'Unnamed'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                        qty {p.totalQuantity || 0}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--success)' }}>
                    {formatCurrency(p.totalProfit)}
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
