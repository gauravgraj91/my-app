# Clay Screen Polish + Backlog Cleanups — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the shop HomeView and personal Dashboard to the Clay prototype's layout, adopt the new Clay components (PillTabs/Avatar/overdue Badge/MeterBar) in BillsView and VendorsView, and knock out three backlog cleanups (one-time product fetch, lazy routes, dead-code deletion).

**Architecture:** In-place restyle — every screen keeps its data logic (contexts, memos, Firestore calls); only the JSX/render layer changes. One new ui component (`MeterBar`, the Clay "chunky bar"). No new dependencies, no chart libraries.

**Tech Stack:** React 18 (CRA, JSX in `.js`), inline styles + CSS variables, React Testing Library/Jest, lucide-react, Firebase/Firestore.

**Spec:** `docs/superpowers/specs/2026-07-15-clay-screen-polish-design.md`
**Visual ground truth:** `/Users/gauravraj/Downloads/App design improvement clay/Clay Prototype v2.dc.html` (screens marked `data-screen-label="Home"`, `"Bills"`, `"Vendors"`)

## Global Constraints

- Inline styles only; no CSS modules/styled-components/MUI/new deps. (Existing `.css` files like `AnalyticsDashboard.css` may be edited in place, not rewritten to inline.)
- All colors/shadows via theme tokens (`var(--*)`) — hardcoded hex ONLY inside `src/styles/theme.css`.
- Clay shadow policy: no shadows on cards; `var(--shadow-accent)` only on primary buttons, `var(--shadow-lg)` only on overlays/modals. Everything interactive is a pill (`var(--radius-pill)`).
- Clay voice: sentence case; links "See all →" style; tiny 11px tracked uppercase only for table/field labels; unicode glyphs (✓ ▲ →), no emoji.
- Reuse `formatCurrency`/`formatDate` from `src/utils/formatters.js`.
- New ui components MUST be exported from the `src/components/ui/index.js` barrel AND registered in `.design-sync/config.json` `componentSrcMap`.
- All Firestore list queries stay tenant-scoped: `where('tenantId', '==', tenantId)`.
- **Test baseline gotcha:** the full suite has a known ~191-failure baseline. NEVER gate on full `npm test`. Run only the task's file: `CI=true npx react-scripts test --watchAll=false <path>`.
- `npm run build` must pass after every task.
- Work on a feature branch off `dev`: `git checkout -b clay-screen-polish`.

---

### Task 1: `MeterBar` ui component

**Files:**
- Create: `src/components/ui/MeterBar.js`
- Modify: `src/components/ui/index.js` (barrel — append one line)
- Modify: `.design-sync/config.json` (`componentSrcMap`)
- Test: `src/components/ui/__tests__/MeterBar.test.js` (create)

**Interfaces:**
- Consumes: theme tokens `--secondary`, `--radius-pill`.
- Produces: `MeterBar` (default export + barrel named export). Props: `segments` (array of `{ value: number, color: string }`), `total` (number — when segment sum < total, the remainder stays track-colored; denominator is `max(total, sum(segments))`), `height = 10`. Extra props spread onto the outer div. Tasks 2 and 5 import it.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/__tests__/MeterBar.test.js`:

```js
import React from 'react';
import { render, screen } from '@testing-library/react';
import MeterBar from '../MeterBar';

describe('MeterBar', () => {
  test('renders proportional pill segments', () => {
    render(
      <MeterBar
        data-testid="m"
        total={100}
        segments={[{ value: 25, color: 'var(--warning)' }, { value: 50, color: 'var(--overdue)' }]}
      />
    );
    const track = screen.getByTestId('m');
    expect(track).toHaveStyle({ background: 'var(--secondary)', borderRadius: 'var(--radius-pill)' });
    expect(track.children).toHaveLength(2);
    expect(track.children[0]).toHaveStyle({ width: '25%' });
    expect(track.children[1]).toHaveStyle({ width: '50%' });
  });

  test('renders an empty track when there is nothing to show', () => {
    render(<MeterBar data-testid="m" total={0} segments={[{ value: 0, color: 'var(--warning)' }]} />);
    expect(screen.getByTestId('m').children).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/components/ui/__tests__/MeterBar.test.js`
Expected: FAIL — `Cannot find module '../MeterBar'`.

- [ ] **Step 3: Create `src/components/ui/MeterBar.js`**

```js
import React from 'react';

const MeterBar = ({ segments = [], total = 0, height = 10, style, ...props }) => {
  const sum = segments.reduce((s, seg) => s + Math.max(seg.value || 0, 0), 0);
  const denom = Math.max(total, sum);
  return (
    <div
      {...props}
      style={{
        height,
        borderRadius: 'var(--radius-pill)',
        background: 'var(--secondary)',
        overflow: 'hidden',
        display: 'flex',
        ...style
      }}
    >
      {denom > 0 && segments.map((seg, i) => (
        <span
          key={i}
          style={{
            width: `${(Math.max(seg.value || 0, 0) / denom) * 100}%`,
            background: seg.color,
            borderRadius: 'var(--radius-pill)'
          }}
        />
      ))}
    </div>
  );
};

export default MeterBar;
```

- [ ] **Step 4: Register in the barrel and design-sync**

Append to `src/components/ui/index.js`:

```js
export { default as MeterBar } from './MeterBar';
```

In `.design-sync/config.json`, add to `componentSrcMap` (after the `"Toast"` entry, keeping valid JSON):

```json
    "MeterBar": "src/components/ui/MeterBar.js"
```

- [ ] **Step 5: Run test to verify it passes**

Run: `CI=true npx react-scripts test --watchAll=false src/components/ui/__tests__/MeterBar.test.js`
Expected: PASS (2 tests).

- [ ] **Step 6: Verify build and commit**

Run: `npm run build` → expected `Compiled successfully` (pre-existing warnings OK).

```bash
git add src/components/ui/MeterBar.js src/components/ui/index.js src/components/ui/__tests__/MeterBar.test.js .design-sync/config.json
git commit -m "feat(ui): MeterBar chunky pill meter for Clay data viz"
```

---

### Task 2: Shop HomeView — Clay Home layout + one-time product fetch (P2)

**Files:**
- Rewrite: `src/components/shop/HomeView.js` (full file below)
- Modify: `CLAUDE.md` (tick the P2 "Limit HomeView product subscription" backlog item)

**Interfaces:**
- Consumes: `MeterBar` (Task 1), `Avatar`/`Badge` from the ui barrel, existing `getShopProducts(tenantId)` one-time fetch from `src/firebase/shopProductService.js` (already exists — returns a Promise of product array), `useBills()` → `{ bills }`, `useAuth()` → `user.tenantId`.
- Produces: no exported API changes — `HomeView` default export, same route usage. `useVendors` and `subscribeToShopProducts` imports are REMOVED (the new layout derives everything from bills + a one-time product fetch).

- [ ] **Step 1: Replace the contents of `src/components/shop/HomeView.js`**

```js
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
```

- [ ] **Step 2: Tick the P2 backlog item in `CLAUDE.md`**

In `### P2 — Medium`, change the `Limit HomeView product subscription` item to:

```
- [x] **Limit HomeView product subscription** — DONE 2026-07-15: HomeView now does a one-time `getShopProducts` fetch (no realtime full-collection listener).
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: `Compiled successfully`. If it warns about unused imports in HomeView, the rewrite in Step 1 was applied incompletely — fix before proceeding.

- [ ] **Step 4: Visual smoke-check**

`npm start` → http://localhost:3000/shop. Confirm vs prototype Home: ink hero card with clay circle + month total; "To collect / pay" card with two-segment meter; stock-value card; recent-bills rows with initials tiles and status pills (overdue = solid clay); light AND dark mode (full reload after toggling).

- [ ] **Step 5: Commit**

```bash
git add src/components/shop/HomeView.js CLAUDE.md
git commit -m "feat(shop): Clay Home layout with ink hero, meter bar, avatar rows; one-time product fetch"
```

---

### Task 3: BillsView — PillTabs, overdue Badge, Avatar, overdue row fill

**Files:**
- Modify: `src/components/shop/BillsView.js` (four localized edits; line numbers are pre-edit)

**Interfaces:**
- Consumes: `PillTabs` (props: `items` array of `{value,label}`, `value`, `onChange`, `size`), `Avatar` (props: `name`, `size`), `Badge` `variant="overdue"` — all from `src/components/ui/`.
- Produces: no API changes; `activeStatusTab` state and `handleStatusTabClick(key)` handler are reused as-is.

- [ ] **Step 1: Add imports and an overdue helper**

Near the existing ui imports (around line 25, next to `import Badge from '../ui/Badge';`), add:

```js
import Avatar from '../ui/Avatar';
import PillTabs from '../ui/PillTabs';
```

Above the component (module level, near other helpers), add:

```js
const isBillOverdue = (bill) => {
  if (bill.status === 'returned') return true;
  if (bill.status !== 'active' || !bill.dueDate) return false;
  const due = new Date(bill.dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return due < today;
};
```

- [ ] **Step 2: Swap the hand-rolled status tabs for PillTabs**

Replace the whole "Status Tabs" block (lines 580–609: the `<div style={{ display: 'flex', ... background: 'var(--secondary)', borderRadius: '8px' ...}}>` containing the `.map(tab => <button …>)`) with:

```jsx
          {/* Status Tabs */}
          <PillTabs
            size="sm"
            items={[
              { value: 'all', label: 'All' },
              { value: 'paid', label: 'Paid' },
              { value: 'pending', label: 'Pending' },
              { value: 'overdue', label: 'Overdue' },
            ]}
            value={activeStatusTab}
            onChange={handleStatusTabClick}
          />
```

- [ ] **Step 3: Use the overdue Badge variant and the helper in `getStatusBadge` (~line 391)**

Rewrite `getStatusBadge` to:

```js
  const getStatusBadge = (bill) => {
    if (bill.status === 'paid') {
      return <Badge variant="success" size="small" style={{ fontWeight: 600, fontSize: '11px' }}>Paid</Badge>;
    }
    if (isBillOverdue(bill)) {
      return <Badge variant="overdue" size="small" style={{ fontWeight: 600, fontSize: '11px' }}>Overdue</Badge>;
    }
    return <Badge variant="warning" size="small" style={{ fontWeight: 600, fontSize: '11px' }}>Pending</Badge>;
  };
```

(Keep whatever other logic the current function body has ONLY if it affects non-status output; the current implementation at lines 391–408 is purely paid/overdue/pending and is fully replaced.)

- [ ] **Step 4: Avatar in the vendor cell + persistent overdue row fill**

In the bill row `<tr>` (line 674), change the `background` line from:

```js
                          background: isSelected ? 'var(--primary-soft)' : (idx % 2 === 0 ? 'var(--card)' : 'var(--muted)'),
```

to:

```js
                          background: isSelected || isBillOverdue(bill) ? 'var(--primary-soft)' : (idx % 2 === 0 ? 'var(--card)' : 'var(--muted)'),
```

In the Vendor cell (lines 719–724), replace:

```jsx
                          {/* Vendor */}
                          <td style={STYLES.tableCell}>
                            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--foreground)' }}>
                              {bill.vendor || 'Unknown'}
                            </span>
                          </td>
```

with:

```jsx
                          {/* Vendor */}
                          <td style={STYLES.tableCell}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Avatar name={bill.vendor || '?'} size={32} />
                              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--foreground)' }}>
                                {bill.vendor || 'Unknown'}
                              </span>
                            </div>
                          </td>
```

- [ ] **Step 5: Verify build and visual check**

Run: `npm run build` → expected `Compiled successfully`.
`npm start` → /shop/bills: status filter is a Clay pill bar (ink active pill); overdue rows have a persistent peach fill and solid-clay Overdue pills; vendor cells show initials tiles; filtering by each tab still works; row selection still shows.

- [ ] **Step 6: Commit**

```bash
git add src/components/shop/BillsView.js
git commit -m "feat(bills): PillTabs status filter, solid overdue badges, vendor avatars, overdue row fill"
```

---

### Task 4: VendorsView — Avatar initials tiles

**Files:**
- Modify: `src/components/shop/VendorsView.js` (two localized edits; line numbers are pre-edit)

**Interfaces:**
- Consumes: `Avatar` from `src/components/ui/Avatar.js` (`name`, `size` props; default square-ish `--radius-sm` tile per Clay vendor spec).
- Produces: no API changes.

- [ ] **Step 1: Import Avatar**

Next to the existing `import Badge from '../ui/Badge';` (line 12), add:

```js
import Avatar from '../ui/Avatar';
```

- [ ] **Step 2: Add the initials tile to the vendor name cell**

In the vendor row name cell (lines 561–575), replace:

```jsx
                            <td style={STYLES.tableCell}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--foreground)' }}>
                                  {vendor.name}
                                </span>
```

with:

```jsx
                            <td style={STYLES.tableCell}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Avatar name={vendor.name || '?'} size={36} />
                                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--foreground)' }}>
                                  {vendor.name}
                                </span>
```

(The rest of the cell — the `isUnregistered` chip and closing tags — is unchanged.)

- [ ] **Step 3: Verify build and visual check**

Run: `npm run build` → expected `Compiled successfully`.
`npm start` → /shop/vendors: every vendor row leads with a peach initials tile (clay text); expanding rows still works; dark mode shows the dark `--primary-soft` tile.

- [ ] **Step 4: Commit**

```bash
git add src/components/shop/VendorsView.js
git commit -m "feat(vendors): Clay avatar initials tiles on vendor rows"
```

---

### Task 5: Personal Dashboard — meters + copy pass

**Files:**
- Modify: `src/components/analytics/AnalyticsDashboard.js`

**Interfaces:**
- Consumes: `MeterBar` (Task 1). `taskStats` (`{ completed, pending, overdue, dueToday }`) and `transactionStats` (`{ cashIn, cashOut, netBalance }`) already exist in the component.
- Produces: no API changes; `getGreeting` export untouched.

- [ ] **Step 1: Import MeterBar**

With the other imports at the top of the file:

```js
import MeterBar from '../ui/MeterBar';
```

- [ ] **Step 2: Task completion meter**

In the Tasks widget, directly after the closing `</div>` of the `stat-grid` (line 150, inside the `hasTasks ? (...)` branch — the meter must NOT render in the empty state), add:

```jsx
              <MeterBar
                style={{ marginTop: 12 }}
                total={taskStats.completed + taskStats.pending + taskStats.overdue}
                segments={[
                  { value: taskStats.completed, color: 'var(--success)' },
                  { value: taskStats.overdue, color: 'var(--overdue)' }
                ]}
              />
```

Note: this requires wrapping the existing `stat-grid` div and the new MeterBar in a fragment (`<>…</>`) since the ternary branch must stay a single expression.

- [ ] **Step 3: Cash in/out meter**

In the Transactions widget, directly after the closing `</div>` of its `stat-grid` (line 256), add (no fragment needed here — it's inside the widget's outer div):

```jsx
          <MeterBar
            style={{ marginTop: 12 }}
            total={transactionStats.cashIn + transactionStats.cashOut}
            segments={[
              { value: transactionStats.cashIn, color: 'var(--success)' },
              { value: transactionStats.cashOut, color: 'var(--overdue)' }
            ]}
          />
```

- [ ] **Step 4: Copy pass**

In this file only, replace every visible `View all` button label with `See all →` (the `view-all-link` class names stay). Do not touch other strings.

- [ ] **Step 5: Verify build and visual check**

Run: `npm run build` → expected `Compiled successfully`.
`npm start` → `/`: Tasks card shows a green/clay completion meter (hidden when no tasks); Transactions card shows the in/out meter; links read "See all →"; both themes look right.

- [ ] **Step 6: Commit**

```bash
git add src/components/analytics/AnalyticsDashboard.js
git commit -m "feat(dashboard): Clay meter bars for tasks and cash flow, See all links"
```

---

### Task 6: React.lazy route splitting (P3)

**Files:**
- Modify: `src/App.js`
- Modify: `CLAUDE.md` (tick the P3 backlog item)

**Interfaces:**
- Consumes: nothing new.
- Produces: identical route tree; all page-level components lazy-loaded behind one Suspense fallback. Auth components (`LoginPage`, `SignupPage`, `ProtectedRoute`), `Layout`, and `ErrorBoundary` stay eager (they're needed on first paint of every entry path).

- [ ] **Step 1: Convert page imports to `React.lazy`**

In `src/App.js`, replace the page-component imports (lines 6–16, keeping `Layout`, `ErrorBoundary`, `LoginPage`, `SignupPage`, `ProtectedRoute`, context imports as-is):

```js
import React, { Suspense } from 'react';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Tasks = React.lazy(() => import('./pages/Tasks'));
const Office = React.lazy(() => import('./pages/Office'));
const Shop = React.lazy(() => import('./components/shop/shop'));
const HomeView = React.lazy(() => import('./components/shop/HomeView'));
const BillsView = React.lazy(() => import('./components/shop/BillsView'));
const ProductsView = React.lazy(() => import('./components/shop/ProductsView'));
const PriceList = React.lazy(() => import('./components/shop/PriceList'));
const VendorsView = React.lazy(() => import('./components/shop/VendorsView'));
const ShopTransactions = React.lazy(() => import('./pages/ShopTransactions'));
const Settings = React.lazy(() => import('./pages/Settings'));
```

- [ ] **Step 2: Wrap the routes in Suspense**

Wrap the existing `<Routes>…</Routes>` block (inside `NotificationProvider`) in:

```jsx
            <Suspense fallback={
              <div style={{
                minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--muted-foreground)', fontSize: 14, fontWeight: 600
              }}>
                Loading…
              </div>
            }>
              <Routes>
                …existing routes unchanged…
              </Routes>
            </Suspense>
```

- [ ] **Step 3: Tick the P3 backlog item in `CLAUDE.md`**

In `### P3 — Low`, change the `Add React.lazy() for route code splitting` item to:

```
- [x] **Add React.lazy() for route code splitting** — DONE 2026-07-15: all pages lazy in `App.js` behind one Suspense fallback.
```

- [ ] **Step 4: Verify build shows split chunks**

Run: `npm run build`
Expected: `Compiled successfully` and the "File sizes after gzip" list now shows multiple numbered chunk files (e.g. `build/static/js/xxx.chunk.js`) instead of one main bundle.

- [ ] **Step 5: Smoke-check navigation**

`npm start` → log in, click through Home → Tasks → Shop → Bills → Settings. Each first visit may flash the "Loading…" fallback; nothing errors.

- [ ] **Step 6: Commit**

```bash
git add src/App.js CLAUDE.md
git commit -m "perf(routes): lazy-load pages with React.lazy + Suspense"
```

---

### Task 7: Delete dead code (P3)

**Files:**
- Delete: `src/components/shop/VirtualizedBillsList.js`, `src/components/shop/TestChart.js`, `src/components/migration/` (whole directory incl. `__tests__`, `Migration.css`, dashboards)
- Modify: `CLAUDE.md` (tick the P3 backlog item)

**Interfaces:** none — these files are imported nowhere (verified 2026-07-15; re-verify in Step 1).

- [ ] **Step 1: Re-verify nothing imports them**

Run:

```bash
grep -rn "VirtualizedBillsList\|TestChart\|components/migration" src | grep -v "^src/components/migration/" | grep -v "^src/components/shop/VirtualizedBillsList.js:" | grep -v "^src/components/shop/TestChart.js:"
```

Expected: no output (exit code 1). If anything prints, STOP — that reference must be removed first or the file kept.

- [ ] **Step 2: Delete**

```bash
git rm src/components/shop/VirtualizedBillsList.js src/components/shop/TestChart.js
git rm -r src/components/migration
```

- [ ] **Step 3: Tick the P3 backlog item in `CLAUDE.md`**

Change the `Delete dead code` item to:

```
- [x] **Delete dead code** — DONE 2026-07-15: removed `VirtualizedBillsList.js`, `TestChart.js`, `src/components/migration/`.
```

- [ ] **Step 4: Verify build and commit**

Run: `npm run build` → expected `Compiled successfully`.

```bash
git add CLAUDE.md
git commit -m "chore: delete dead code (VirtualizedBillsList, TestChart, migration dashboards)"
```

---

### Task 8: Final verification

**Files:**
- Test: combined targeted test run + full visual pass (no new files)

**Interfaces:** consumes everything above.

- [ ] **Step 1: Run all Clay-related test files together**

Run:

```bash
CI=true npx react-scripts test --watchAll=false src/components/ui/__tests__/MeterBar.test.js src/components/ui/__tests__/Card.test.js src/components/ui/__tests__/Button.test.js src/components/ui/__tests__/Badge.test.js src/components/ui/__tests__/ClayComponents.test.js
```

Expected: PASS (13 tests). Do NOT gate on the full suite (~191-failure baseline).

- [ ] **Step 2: Full visual pass vs prototype**

`npm start` side-by-side with `Clay Prototype v2.dc.html`. Walk `/` → Tasks → Shop (Home, Bills, Products, Price List, Vendors, Transactions) → Settings in light AND dark (full reload after toggling). Checklist:
- Shop Home: ink hero with clay circle, two-segment collect/pay meter, avatar bill rows.
- Bills: pill status tabs, solid-clay overdue pills, peach overdue rows, vendor avatars.
- Vendors: initials tiles on rows.
- Dashboard: task + cash meters, "See all →" links.
- No console errors; lazy-route "Loading…" flashes are brief and unstyled screens never appear.

- [ ] **Step 3: Verify build one last time and hand off**

Run: `npm run build` → expected `Compiled successfully`.

Use superpowers:finishing-a-development-branch to decide merge/PR for `clay-screen-polish`.
