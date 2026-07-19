import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBills } from '../../context/BillsContext';
import { getShopProducts } from '../../firebase/shopProductService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import MeterBar from '../ui/MeterBar';
import { useAuth } from '../../context/AuthContext';
import useIsNarrow from '../../hooks/useIsNarrow';

const CARD = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 24
};

const CARD_LABEL = { fontSize: 15, fontWeight: 700, color: 'var(--foreground)' };

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
  const isNarrow = useIsNarrow(900);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ===== TOP ROW: hero · to collect/pay · products ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1.15fr 0.85fr 0.85fr', gap: 16 }}>
        {/* Hero (solid ink) */}
        <div style={{
          background: 'var(--foreground)', color: 'var(--background)',
          borderRadius: 'var(--radius-lg)', padding: 24, position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 24
        }}>
          <div style={{
            position: 'absolute', right: -50, top: -70, width: 230, height: 230,
            borderRadius: '50%', background: 'var(--primary)', opacity: 0.92
          }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.85 }}>
              {heroStats.monthLabel} so far
            </div>
            <div style={{ ...HERO_NUM, color: 'var(--background)', fontSize: 44, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 10 }}>
              {formatCurrency(heroStats.monthTotal)}
            </div>
            <div style={{ fontSize: 14, marginTop: 8, opacity: 0.8 }}>
              purchases across {heroStats.monthCount} bill{heroStats.monthCount !== 1 ? 's' : ''} this month
            </div>
          </div>
          <div style={{ position: 'relative', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {heroStats.deltaPct !== null && (
              <span style={{
                display: 'inline-block', background: 'color-mix(in srgb, var(--background) 14%, transparent)',
                borderRadius: 'var(--radius-pill)', padding: '8px 18px', fontSize: 13, fontWeight: 700
              }}>
                {heroStats.deltaPct >= 0 ? '▲' : '▼'} {Math.abs(heroStats.deltaPct).toFixed(1)}% vs {heroStats.prevLabel}
              </span>
            )}
            <span style={{
              display: 'inline-block', background: 'color-mix(in srgb, var(--background) 14%, transparent)',
              borderRadius: 'var(--radius-pill)', padding: '8px 18px', fontSize: 13, fontWeight: 700
            }}>
              {heroStats.ytdCount} bills YTD
            </span>
          </div>
        </div>

        {/* To collect / pay */}
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column' }}>
          <div style={CARD_LABEL}>To collect / pay</div>
          <div style={{ ...HERO_NUM, fontSize: 36, marginTop: 12 }}>
            {formatCurrency(openStats.openTotal)}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted-foreground)', marginTop: 4 }}>
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
            display: 'flex', gap: 16,
            fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)', marginTop: 8
          }}>
            <span><span style={{ color: 'var(--warning)' }}>●</span> pending {formatCurrency(openStats.pendingAmt)}</span>
            <span><span style={{ color: 'var(--overdue)' }}>●</span> overdue {formatCurrency(openStats.overdueAmt)}</span>
          </div>
        </div>

        {/* Products */}
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={CARD_LABEL}>Stock value</div>
            <button style={LINK_BTN} onClick={() => navigate('/shop/price-list')}>Price list →</button>
          </div>
          <div style={{ ...HERO_NUM, fontSize: 36, marginTop: 12 }}>
            {loadingProducts ? '—' : formatCurrency(productStats.totalValue)}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted-foreground)', marginTop: 4 }}>
            {loadingProducts ? 'loading products…' : `${productStats.total} product${productStats.total !== 1 ? 's' : ''} tracked`}
          </div>
          <div style={{
            marginTop: 'auto', background: 'var(--success-soft)', borderRadius: 14, padding: '12px 16px'
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--success)',
              textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>Profit</div>
            <div style={{ ...HERO_NUM, fontSize: 20, color: 'var(--success)', marginTop: 4 }}>
              {loadingProducts ? '—' : formatCurrency(productStats.totalProfit)}
            </div>
          </div>
        </div>
      </div>

      {/* ===== BOTTOM ROW: recent bills · top products ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1.15fr 0.85fr', gap: 16 }}>
        {/* Recent bills */}
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ ...HERO_NUM, fontSize: 20 }}>Recent bills</div>
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
                      alignItems: 'center', gap: 16, padding: '14px 12px',
                      borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--muted)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Avatar name={bill.vendor || '?'} size={44} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>
                        {bill.vendor || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 2 }}>
                        {bill.billNumber || '—'} · {bill.date ? formatDate(bill.date) : '—'}
                      </div>
                    </div>
                    <Badge variant={status.variant} size="small">{status.label}</Badge>
                    <span style={{ ...HERO_NUM, fontSize: 17, minWidth: 100, textAlign: 'right' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ ...HERO_NUM, fontSize: 20 }}>Top products</div>
            <button style={LINK_BTN} onClick={() => navigate('/shop/products')}>See all →</button>
          </div>
          {topProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted-foreground)', fontSize: 14 }}>
              {loadingProducts ? 'Loading products…' : 'No products yet'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {topProducts.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center',
                    gap: 14, padding: '10px 12px', borderRadius: 'var(--radius)', transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--muted)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: 'var(--secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: 'var(--muted-foreground)'
                  }}>
                    {i + 1}
                  </span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>
                      {p.productName || 'Unnamed'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 2 }}>
                      qty {p.totalQuantity || 0}
                    </div>
                  </div>
                  <div style={{ ...HERO_NUM, fontSize: 16 }}>
                    {formatCurrency(p.totalAmount || 0)}
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
