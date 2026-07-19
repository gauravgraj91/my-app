import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTasks } from '../../hooks/useTasks';
import { getBills } from '../../firebase/billService';
import { getShopProducts } from '../../firebase/shopProductService';
import { subscribeToTransactions } from '../../firebase/transactionService';
import { subscribeToPersonalTransactions } from '../../firebase/personalService';
import { subscribeActivityLogs } from '../../firebase/activityLogService';
import { calculateBillAnalyticsFromData, calculateProductAnalyticsFromData } from '../../services/analyticsService';
import { isInMonth, monthTotals, lastNWeeks } from '../transactions/transactionHelpers';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getGreeting } from '../../utils/greeting';
import useIsNarrow from '../../hooks/useIsNarrow';
import PillTabs from '../ui/PillTabs';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';

const CARD = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 24
};

const CARD_TITLE = { fontSize: 15, fontWeight: 700, color: 'var(--foreground)' };

const SECTION_TITLE = {
  fontFamily: 'var(--font-display)',
  fontSize: 20,
  fontWeight: 800,
  color: 'var(--foreground)'
};

const NUM = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  color: 'var(--foreground)'
};

const MICRO_LABEL = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--muted-foreground)'
};

const META = { fontSize: 13, color: 'var(--muted-foreground)' };

const CHIP = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 14px',
  borderRadius: 'var(--radius-pill)',
  fontSize: 13,
  fontWeight: 700
};

const CALLOUT = {
  marginTop: 16,
  background: 'var(--muted)',
  borderRadius: 14,
  padding: '12px 16px',
  fontSize: 13,
  color: 'var(--foreground-body)'
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

const ROW_HOVER = {
  onMouseEnter: e => { e.currentTarget.style.background = 'var(--muted)'; },
  onMouseLeave: e => { e.currentTarget.style.background = 'transparent'; }
};

const activityGlyph = (log) => {
  const text = `${log.action || ''} ${log.entity || ''}`.toLowerCase();
  if (text.includes('cash out')) return { glyph: '↑', color: 'var(--primary-accent)' };
  if (text.includes('cash in')) return { glyph: '↓', color: 'var(--success)' };
  if (log.action === 'deleted') return { glyph: '×', color: 'var(--primary-accent)' };
  return { glyph: '✓', color: 'var(--foreground)' };
};

const taskBadge = (task, todayStart) => {
  if (task.isCompleted) return { label: 'Done', bg: 'var(--success-soft)', fg: 'var(--success)' };
  if (task.dueDate) {
    const due = new Date(task.dueDate);
    if (due < todayStart) return { label: 'Overdue', bg: 'var(--primary-soft)', fg: 'var(--primary-accent)' };
    const label = due.toDateString() === new Date().toDateString()
      ? 'Due today'
      : `Due ${due.toLocaleDateString('en-IN', { weekday: 'short' })}`;
    return { label, bg: 'var(--primary-soft)', fg: 'var(--primary-accent)' };
  }
  return { label: 'Pending', bg: 'var(--warning-soft)', fg: 'var(--warning)' };
};

const HomeDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const firstName = (user?.displayName || user?.email || '').split(/[\s@]/)[0];
  const { todos, stats: taskStats } = useTasks();
  const isNarrow = useIsNarrow(900);

  const [bills, setBills] = useState([]);
  const [products, setProducts] = useState([]);
  const [shopTx, setShopTx] = useState([]);
  const [personalTx, setPersonalTx] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState('Bills');

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    Promise.all([getBills(tenantId), getShopProducts(tenantId)])
      .then(([b, p]) => { if (!cancelled) { setBills(b || []); setProducts(p || []); setLoading(false); } })
      .catch(err => { console.error('Error loading dashboard data:', err); if (!cancelled) setLoading(false); });
    const unsubShop = subscribeToTransactions(tenantId, setShopTx, err => console.error('Shop tx subscription error:', err));
    const unsubPersonal = subscribeToPersonalTransactions(tenantId, setPersonalTx, err => console.error('Personal tx subscription error:', err));
    const unsubActivity = subscribeActivityLogs(tenantId, 'All', setActivity);
    return () => { cancelled = true; unsubShop(); unsubPersonal(); unsubActivity(); };
  }, [tenantId]);

  const todayStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const monthRef = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  }, []);

  const monthBills = useMemo(() => (bills || []).filter(b => {
    const d = b.date ? new Date(b.date) : null;
    return d && d.getFullYear() === monthRef.year && d.getMonth() === monthRef.monthIndex;
  }), [bills, monthRef]);

  const billAnalytics = useMemo(() => calculateBillAnalyticsFromData(monthBills), [monthBills]);
  const productAnalytics = useMemo(() => calculateProductAnalyticsFromData(products), [products]);

  const openBillCount = useMemo(
    () => (bills || []).filter(b => b.status !== 'paid').length,
    [bills]
  );

  const monthShopTotals = useMemo(
    () => monthTotals(shopTx.filter(tx => isInMonth(tx, monthRef))),
    [shopTx, monthRef]
  );
  const monthPersonalTotals = useMemo(
    () => monthTotals(personalTx.filter(tx => isInMonth(tx, monthRef))),
    [personalTx, monthRef]
  );

  const combined = useMemo(() => {
    const cashIn = monthShopTotals.cashIn + monthPersonalTotals.cashIn;
    const cashOut = monthShopTotals.cashOut + monthPersonalTotals.cashOut;
    return { cashIn, cashOut, net: cashIn - cashOut };
  }, [monthShopTotals, monthPersonalTotals]);

  const weeks = useMemo(
    () => lastNWeeks([...shopTx, ...personalTx], 4),
    [shopTx, personalTx]
  );
  const maxWeekOut = Math.max(...weeks.map(w => w.totalOut), 0);
  const peakWeek = maxWeekOut > 0 ? weeks.find(w => w.totalOut === maxWeekOut) : null;

  const splitOut = monthShopTotals.cashOut + monthPersonalTotals.cashOut;
  const shopPct = splitOut > 0 ? Math.round((monthShopTotals.cashOut / splitOut) * 100) : 0;

  const dashTasks = useMemo(() => {
    const open = todos.filter(t => !t.isCompleted)
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
    const done = todos.filter(t => t.isCompleted);
    return [...open, ...done].slice(0, 3);
  }, [todos]);

  const txSplit = combined.cashIn + combined.cashOut;
  const inPct = txSplit > 0 ? Math.max(2, Math.round((combined.cashIn / txSplit) * 100)) : 0;

  const focusBullets = [
    {
      dot: 'var(--amber-400)',
      text: taskStats.pending > 0
        ? `${taskStats.pending} task${taskStats.pending !== 1 ? 's' : ''} pending — ${taskStats.dueToday > 0 ? `${taskStats.dueToday} due today` : 'nothing due today'}`
        : 'No pending tasks — clear runway today'
    },
    {
      dot: 'var(--clay-200)',
      text: combined.net < 0
        ? `You paid ${formatCurrency(Math.abs(combined.net))} more than you collected`
        : combined.net > 0
          ? `You collected ${formatCurrency(combined.net)} more than you paid`
          : 'No money movement recorded this month'
    },
    {
      dot: 'var(--clay-200)',
      text: billAnalytics.totalBills > 0
        ? `${billAnalytics.totalBills} bill${billAnalytics.totalBills !== 1 ? 's' : ''} this month${monthBills.every(b => b.status === 'paid') ? ', all settled ✓' : ''}`
        : 'No bills recorded this month yet'
    }
  ];

  const scopeAnalytics = scope === 'Bills' ? billAnalytics : productAnalytics;
  const scopeRows = scope === 'Bills'
    ? billAnalytics.vendorAnalytics.slice(0, 4).map(v => ({
        key: v.vendor,
        name: v.vendor,
        pct: billAnalytics.totalAmount > 0 ? (v.totalAmount / billAnalytics.totalAmount) * 100 : 0,
        amount: v.totalAmount,
        margin: v.profitMargin
      }))
    : productAnalytics.vendorAnalytics.slice(0, 4).map(v => ({
        key: v.vendor,
        name: v.vendor,
        pct: productAnalytics.totalAmount > 0 ? (v.totalAmount / productAnalytics.totalAmount) * 100 : 0,
        amount: v.totalAmount,
        margin: v.totalAmount > 0 ? (v.totalProfit / v.totalAmount) * 100 : 0
      }));

  const dash = loading ? '—' : null;
  const dateLine = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const grid = (cols) => ({
    display: 'grid',
    gridTemplateColumns: isNarrow ? '1fr' : cols,
    gap: 16
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
      {/* Greeting + quick actions */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 20, margin: '16px 0'
      }}>
        <div>
          <h1 style={{
            margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: isNarrow ? 32 : 44, letterSpacing: '-0.03em', color: 'var(--foreground)'
          }}>
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </h1>
          <div style={{ fontSize: 15, color: 'var(--muted-foreground)', marginTop: 8 }}>
            Here's where your shop stands today · {dateLine}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => navigate('/tasks')}>＋ Add task</Button>
          <Button variant="secondary" onClick={() => navigate('/transactions/shop')}>＋ Cash in</Button>
          <Button variant="primary" onClick={() => navigate('/shop/bills', { state: { openCreate: true } })}>＋ New bill</Button>
        </div>
      </div>

      {/* Row 1 — focus hero + KPI cards */}
      <div style={grid('1.2fr 1fr 1fr 1fr')}>
        <div style={{
          position: 'relative', overflow: 'hidden', background: 'var(--foreground)',
          color: 'var(--background)', borderRadius: 'var(--radius-lg)', padding: 24,
          display: 'flex', flexDirection: 'column', gap: 14, minHeight: 180
        }}>
          <div style={{
            position: 'absolute', top: -80, right: -60, width: 220, height: 220,
            borderRadius: '50%', background: 'var(--primary)', opacity: 0.92
          }} />
          <div style={{ position: 'relative', fontSize: 14, fontWeight: 600, opacity: 0.85 }}>Today's focus</div>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
            {focusBullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.dot, flexShrink: 0 }} />
                {b.text}
              </div>
            ))}
          </div>
          <div style={{ position: 'relative', marginTop: 'auto' }}>
            <span style={{
              display: 'inline-block', padding: '8px 18px', borderRadius: 'var(--radius-pill)',
              background: 'color-mix(in srgb, var(--background) 14%, transparent)', fontSize: 13, fontWeight: 700
            }}>
              {openBillCount > 0
                ? `${openBillCount} bill${openBillCount !== 1 ? 's' : ''} need attention`
                : 'All caught up on bills'}
            </span>
          </div>
        </div>

        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={CARD_TITLE}>Bills</span>
            <button style={LINK_BTN} onClick={() => navigate('/shop/bills')}>See all →</button>
          </div>
          <div style={{ ...NUM, fontSize: 32 }}>{dash || formatCurrency(billAnalytics.totalAmount)}</div>
          <div style={META}>{billAnalytics.totalBills} bill{billAnalytics.totalBills !== 1 ? 's' : ''} this month</div>
          <div style={{
            ...CHIP, marginTop: 'auto', alignSelf: 'flex-start',
            background: billAnalytics.totalProfit >= 0 ? 'var(--success-soft)' : 'var(--primary-soft)',
            color: billAnalytics.totalProfit >= 0 ? 'var(--success)' : 'var(--primary-accent)'
          }}>
            {billAnalytics.totalProfit >= 0 ? '▲' : '▼'} {dash || formatCurrency(Math.abs(billAnalytics.totalProfit))} profit
          </div>
        </div>

        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={CARD_TITLE}>Transactions</span>
            <button style={LINK_BTN} onClick={() => navigate('/transactions')}>See all →</button>
          </div>
          <div style={{ ...NUM, fontSize: 32, color: combined.net < 0 ? 'var(--primary-accent)' : 'var(--foreground)' }}>
            {combined.net < 0 ? '−' : ''}{formatCurrency(Math.abs(combined.net))}
          </div>
          <div style={META}>net balance this month</div>
          <div style={{ marginTop: 'auto' }}>
            <div style={{ display: 'flex', height: 10, borderRadius: 'var(--radius-pill)', overflow: 'hidden', background: 'var(--secondary)' }}>
              {txSplit > 0 && (
                <>
                  <span style={{ width: `${inPct}%`, background: 'var(--success)' }} />
                  <span style={{ width: `${100 - inPct}%`, background: 'var(--clay-500)' }} />
                </>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted-foreground)', marginTop: 6 }}>
              <span>in {formatCurrency(combined.cashIn)}</span>
              <span>out {formatCurrency(combined.cashOut)}</span>
            </div>
          </div>
        </div>

        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={CARD_TITLE}>Stock</span>
            <button style={LINK_BTN} onClick={() => navigate('/shop/price-list')}>Price list →</button>
          </div>
          <div style={{ ...NUM, fontSize: 32 }}>{dash || productAnalytics.totalProducts}</div>
          <div style={META}>items priced &amp; tracked</div>
          <div style={{
            ...CHIP, marginTop: 'auto', alignSelf: 'flex-start',
            background: taskStats.pending > 0 ? 'var(--warning-soft)' : 'var(--success-soft)',
            color: taskStats.pending > 0 ? 'var(--warning)' : 'var(--success)'
          }}>
            {taskStats.pending > 0
              ? `⚠ ${taskStats.pending} pending task${taskStats.pending !== 1 ? 's' : ''}`
              : '✓ no pending tasks'}
          </div>
        </div>
      </div>

      {/* Row 2 — this month analytics + recent activity */}
      <div style={grid('1.5fr 1fr')}>
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
            <div style={SECTION_TITLE}>This month</div>
            <PillTabs items={['Bills', 'Products']} value={scope} onChange={setScope} size="sm" />
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr 1fr', gap: 12,
            padding: '16px 0', borderBottom: '1px solid var(--border)'
          }}>
            <div>
              <div style={MICRO_LABEL}>{scope === 'Bills' ? 'Average bill' : 'Average product'}</div>
              <div style={{ ...NUM, fontSize: 26, marginTop: 6 }}>
                {dash || formatCurrency(scope === 'Bills' ? billAnalytics.averageBillValue : productAnalytics.averageProductValue)}
              </div>
            </div>
            <div>
              <div style={MICRO_LABEL}>Profit margin</div>
              <div style={{ ...NUM, fontSize: 26, marginTop: 6, color: 'var(--success)' }}>
                {dash || `${scopeAnalytics.profitMargin.toFixed(1)}%`}
              </div>
            </div>
            <div>
              <div style={MICRO_LABEL}>{scope === 'Bills' ? 'Top vendor' : 'Top category'}</div>
              <div style={{ ...NUM, fontSize: 26, marginTop: 6 }}>
                {dash || (scope === 'Bills'
                  ? (billAnalytics.vendorAnalytics[0]?.vendor || '—')
                  : (productAnalytics.categoryAnalytics[0]?.category || '—'))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ ...MICRO_LABEL, marginBottom: 12 }}>Vendor performance</div>
            {scopeRows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted-foreground)', fontSize: 14 }}>
                {loading ? 'Loading…' : 'Nothing recorded this month yet'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {scopeRows.map((row, i) => (
                  <div key={row.key} style={{
                    display: 'grid', gridTemplateColumns: isNarrow ? '1fr auto' : '150px 1fr auto auto',
                    alignItems: 'center', gap: 14
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={row.name} size={32} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--foreground)' }}>{row.name}</span>
                    </div>
                    {!isNarrow && (
                      <div style={{ height: 10, borderRadius: 'var(--radius-pill)', background: 'var(--secondary)', overflow: 'hidden' }}>
                        <span style={{
                          display: 'block', height: '100%', borderRadius: 'var(--radius-pill)',
                          background: i === 0 ? 'var(--clay-500)' : 'var(--clay-300)',
                          width: `${Math.min(100, Math.max(2, row.pct)).toFixed(0)}%`
                        }} />
                      </div>
                    )}
                    <span style={{ ...NUM, fontSize: 15, minWidth: 90, textAlign: 'right' }}>{formatCurrency(row.amount)}</span>
                    {!isNarrow && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)', minWidth: 80, textAlign: 'right' }}>
                        {row.margin.toFixed(1)}% profit
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={SECTION_TITLE}>Recent activity</div>
            <button style={LINK_BTN} onClick={() => navigate('/settings')}>See all →</button>
          </div>
          {activity.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted-foreground)', fontSize: 14 }}>
              No activity yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activity.slice(0, 4).map(log => {
                const { glyph, color } = activityGlyph(log);
                return (
                  <div key={log.id} {...ROW_HOVER} style={{
                    display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center',
                    gap: 14, padding: '12px 10px', borderRadius: 'var(--radius)', transition: 'background 0.2s'
                  }}>
                    <span style={{
                      width: 34, height: 34, borderRadius: 10, background: 'var(--primary-soft)',
                      color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 800
                    }}>{glyph}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--foreground)' }}>
                        {log.entity} {log.action}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
                        {log.tab} · {formatDate(log.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 3 — split, cash flow, tasks */}
      <div style={grid('1fr 1fr 1fr')}>
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={SECTION_TITLE}>Shop vs personal</div>
            <button style={LINK_BTN} onClick={() => navigate('/transactions')}>Transactions →</button>
          </div>
          <div style={{ ...META, marginBottom: 14 }}>where this month's money went</div>
          <div style={{ display: 'flex', height: 12, borderRadius: 'var(--radius-pill)', overflow: 'hidden', background: 'var(--secondary)', marginBottom: 16 }}>
            {splitOut > 0 && (
              <>
                <span style={{ width: `${shopPct}%`, background: 'var(--clay-500)' }} />
                <span style={{ width: `${100 - shopPct}%`, background: 'var(--gold-600)' }} />
              </>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--clay-500)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--foreground)' }}>Shop</div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>stock &amp; vendor payments</div>
              </div>
              <span style={{ ...NUM, fontSize: 16 }}>−{formatCurrency(monthShopTotals.cashOut)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--gold-600)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--foreground)' }}>Personal</div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>withdrawals &amp; expenses</div>
              </div>
              <span style={{ ...NUM, fontSize: 16 }}>−{formatCurrency(monthPersonalTotals.cashOut)}</span>
            </div>
          </div>
          <div style={CALLOUT}>
            {splitOut > 0
              ? `${shopPct}% of spending went back into the shop — personal draw stayed at ${formatCurrency(monthPersonalTotals.cashOut)}`
              : 'No spending recorded yet this month'}
          </div>
        </div>

        <div style={CARD}>
          <div style={{ ...SECTION_TITLE, marginBottom: 14 }}>Cash flow · last 4 weeks</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 130, padding: '0 4px' }}>
            {weeks.map(w => {
              const h = maxWeekOut > 0 && w.totalOut > 0
                ? Math.max(10, Math.round((w.totalOut / maxWeekOut) * 100))
                : 0;
              return (
                <div key={w.label} style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 8, height: '100%', justifyContent: 'flex-end'
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)' }}>
                    ₹{Math.round(w.totalOut).toLocaleString('en-IN')}
                  </span>
                  <span style={{
                    display: 'block', width: '100%', maxWidth: 44, borderRadius: 'var(--radius-pill)',
                    background: h > 0 ? 'var(--clay-500)' : 'var(--secondary)',
                    height: h > 0 ? h : 6
                  }} />
                  <span style={{ fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{w.label}</span>
                </div>
              );
            })}
          </div>
          <div style={CALLOUT}>
            {peakWeek
              ? `Spending peaked in the week of ${peakWeek.label}.`
              : 'No cash out recorded in the last 4 weeks.'}
          </div>
        </div>

        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={SECTION_TITLE}>Tasks &amp; reminders</div>
            <button style={LINK_BTN} onClick={() => navigate('/tasks')}>Tasks →</button>
          </div>
          {dashTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted-foreground)', fontSize: 14 }}>
              No tasks yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {dashTasks.map(t => {
                const badge = taskBadge(t, todayStart);
                return (
                  <div key={t.id} {...ROW_HOVER} onClick={() => navigate('/tasks')} style={{
                    display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center',
                    gap: 12, padding: '12px 10px', borderRadius: 'var(--radius)', cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%', boxSizing: 'border-box',
                      border: `2px solid ${t.isCompleted ? 'var(--success)' : 'var(--border)'}`,
                      background: t.isCompleted ? 'var(--success)' : 'transparent',
                      color: 'var(--card)', fontSize: 11,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                    }}>{t.isCompleted ? '✓' : ''}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--foreground)' }}>{t.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
                        {t.category}{t.dueDate ? ` · due ${formatDate(t.dueDate)}` : ` · added ${formatDate(t.createdAt)}`}
                      </div>
                    </div>
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 'var(--radius-pill)',
                      background: badge.bg, color: badge.fg, fontSize: 12, fontWeight: 700
                    }}>{badge.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeDashboard;
