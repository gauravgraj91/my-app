# Dashboard Design Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 7 design-review fixes: retheme header/nav from green to indigo brand tokens, replace the redundant page title with a time-of-day greeting, conditionally color the net-balance figure, make the summary grid 4-up, mute zero-value stat tints, and polish the rupee symbol sizing.

**Architecture:** Pure presentational changes. Two shared CSS files (`Header.css`, `Navigation.css`) get token swaps; `AnalyticsDashboard.js` gets conditional styling logic and a greeting; `analytics_theme_1.css` gets one grid value change. No data-layer or service changes.

**Tech Stack:** React (CRA, no TS), CSS custom properties from `src/styles/theme.css`, Jest + React Testing Library.

## Global Constraints

- Colors/shadows: theme tokens only (`var(--primary)`, `var(--primary-soft)`, `var(--danger)`, …) — never hardcoded hex.
- Dark mode works by `.dark` on `<body>` flipping tokens — never write per-component `.dark` overrides.
- Inline styles for JSX-level styling; existing CSS classes stay in their existing CSS files. No CSS modules, no styled-components, no MUI.
- Don't add comments/docstrings/type annotations to code you didn't change.
- `npm test` has a known pre-existing failure baseline (~191 failures, documented in project memory). `AnalyticsDashboard.test.js` mocks service functions the component no longer uses (`subscribeToAnalytics`, `subscribeToTransactions`) — do NOT try to make that whole file pass; only update the assertions this plan names. The gate for every task is `npm run build` succeeding.
- Verify visually with a full page reload (not HMR), in both light and dark mode.

---

### Task 1: Retheme header logo and nav active states to primary tokens

The header brand tile and all nav active/hover states currently use `var(--success)` / `var(--success-soft)` (the old green brand). Swap them to `var(--primary)` / `var(--primary-soft)` so the chrome matches the indigo theme below it. This is CSS-only.

**Files:**
- Modify: `src/components/shared/Header.css:28`
- Modify: `src/components/shared/Navigation.css:39-54, 119-122, 156-163, 257-260`

**Interfaces:**
- Consumes: existing tokens `--primary`, `--primary-soft`, `--primary-foreground` from `src/styles/theme.css` (defined for both light and dark).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Swap the brand-logo background in Header.css**

In `src/components/shared/Header.css`, change the `.brand-logo` rule:

```css
.brand-logo {
  width: 40px;
  height: 40px;
  background: var(--primary);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-foreground);
  box-shadow: var(--shadow);
}
```

(Only the `background` line changes: `var(--success)` → `var(--primary)`.)

- [ ] **Step 2: Swap all success tokens in Navigation.css**

In `src/components/shared/Navigation.css` there are exactly 8 occurrences of success tokens. Replace as follows:

`.nav-item.active` (desktop nav):

```css
.nav-item.active {
  color: var(--primary);
  background: var(--primary-soft);
}

.nav-item.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 3px;
  background: var(--primary);
  border-radius: 3px 3px 0 0;
}
```

`.dropdown-item.active`:

```css
.dropdown-item.active {
  background: var(--primary-soft);
  color: var(--primary);
}
```

Mobile nav:

```css
.mobile-nav-item:hover,
.mobile-nav-item:active {
  color: var(--primary);
}

.mobile-nav-item.active {
  color: var(--primary);
}
```

More-menu:

```css
.more-menu-item.active {
  background: var(--primary-soft);
  color: var(--primary);
}
```

- [ ] **Step 3: Verify no success tokens remain in nav/header CSS**

Run: `grep -n "success" src/components/shared/Header.css src/components/shared/Navigation.css`
Expected: no output.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: `Compiled successfully.` (or compiled with pre-existing warnings only).

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/Header.css src/components/shared/Navigation.css
git commit -m "style(nav): retheme header logo and active nav states from success-green to primary tokens"
```

---

### Task 2: Replace "Analytics Dashboard" title with a time-of-day greeting

The nav already says "Personal Dashboard"; the page title duplicates it. Replace the page `<h1>` with "Good evening, Gaurav"-style greeting derived from the clock and the authed user's display name. Keep the existing subtitle.

**Files:**
- Modify: `src/components/analytics/AnalyticsDashboard.js:67-73`
- Test: `src/components/analytics/__tests__/getGreeting.test.js` (create)
- Modify: `src/components/analytics/__tests__/AnalyticsDashboard.test.js:139, 314` (update stale assertions)

**Interfaces:**
- Consumes: `useAuth()` from `../../context/AuthContext` (already imported in this file); `user.displayName` may be null, `user.email` always present when authed.
- Produces: named export `getGreeting(date)` from `src/components/analytics/AnalyticsDashboard.js` — `(date: Date) => 'Good morning' | 'Good afternoon' | 'Good evening'`. Used only by its test.

- [ ] **Step 1: Write the failing test**

Create `src/components/analytics/__tests__/getGreeting.test.js`:

```javascript
import { getGreeting } from '../AnalyticsDashboard';

describe('getGreeting', () => {
  it('returns Good morning before noon', () => {
    expect(getGreeting(new Date('2026-07-08T08:00:00'))).toBe('Good morning');
  });

  it('returns Good afternoon from noon to 5pm', () => {
    expect(getGreeting(new Date('2026-07-08T13:00:00'))).toBe('Good afternoon');
  });

  it('returns Good evening from 5pm', () => {
    expect(getGreeting(new Date('2026-07-08T19:00:00'))).toBe('Good evening');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watchAll=false src/components/analytics/__tests__/getGreeting.test.js`
Expected: FAIL — `getGreeting` is not exported.

- [ ] **Step 3: Implement the greeting**

In `src/components/analytics/AnalyticsDashboard.js`, add above the component:

```javascript
export const getGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};
```

Inside the component (after `const tenantId = user?.tenantId;`):

```javascript
const firstName = (user?.displayName || user?.email || '').split(/[\s@]/)[0];
```

Replace the header block:

```jsx
        <div>
          <h1 className="analytics-title">
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="analytics-subtitle">Here's where your shop stands today</p>
        </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watchAll=false src/components/analytics/__tests__/getGreeting.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Update the two stale title assertions**

In `src/components/analytics/__tests__/AnalyticsDashboard.test.js`, replace both occurrences (lines ~139 and ~314) of:

```javascript
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
```

with:

```javascript
    expect(screen.getByText(/Good (morning|afternoon|evening)/)).toBeInTheDocument();
```

Do NOT attempt to fix this file's other failures — its mocks are stale (known baseline).

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 7: Commit**

```bash
git add src/components/analytics/AnalyticsDashboard.js src/components/analytics/__tests__/getGreeting.test.js src/components/analytics/__tests__/AnalyticsDashboard.test.js
git commit -m "feat(dashboard): replace redundant page title with time-of-day greeting"
```

---

### Task 3: Conditional coloring for net balance, cash in, cash out

Net balance renders in plain foreground even when negative; cash in renders green even at ₹0.00. Color the net-balance figure `var(--danger)` when negative, default otherwise. Apply success/danger tints to cash in / cash out only when the amount is > 0; at zero, use `var(--muted-foreground)`.

**Files:**
- Modify: `src/components/analytics/AnalyticsDashboard.js:186-203` (Transactions widget)

**Interfaces:**
- Consumes: `transactionStats` object already computed in the component (`{ cashIn, cashOut, netBalance }`, all numbers).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Apply conditional colors in the Transactions widget**

Replace the Transactions widget's `main-stat` and `stat-grid` blocks:

```jsx
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
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/AnalyticsDashboard.js
git commit -m "feat(dashboard): color net balance red when negative, mute zero cash in/out"
```

---

### Task 4: Make the summary grid fit 4 cards per row

The 280px min in `repeat(auto-fit, minmax(280px, 1fr))` forces the fourth card (Price list) onto its own full-width row at common desktop widths. Drop the min to 250px so all four summary cards share one row on wide screens.

**Files:**
- Modify: `src/components/analytics/analytics_theme_1.css:77`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Change the grid minimum**

In `src/components/analytics/analytics_theme_1.css`:

```css
.analytics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
}
```

(Only `280px` → `250px` changes. The `@media (max-width: 768px)` single-column override stays as-is.)

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/analytics_theme_1.css
git commit -m "style(dashboard): allow 4-up summary grid by lowering card min width to 250px"
```

---

### Task 5: Tasks card zero states — no alarm tints at zero, empty state when all zero

The Overdue tile is tinted `--danger-soft` and Due-today `--warning-soft` even when the count is 0. Apply those tints only when count > 0. When every task stat is 0, replace the whole stat grid with a single "No tasks yet — Add your first" line linking to `/tasks`, and hide the card's "View all" link.

**Files:**
- Modify: `src/components/analytics/AnalyticsDashboard.js:96-125` (Tasks widget)

**Interfaces:**
- Consumes: `taskStats` from `useTasks()` — `{ completed, pending, overdue, dueToday }`, all numbers; `navigate` from `useNavigate()` (already in scope).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Compute the all-zero flag**

Inside the component, after the `transactionStats` computation, add:

```javascript
  const hasTasks = (taskStats.completed + taskStats.pending + taskStats.overdue + taskStats.dueToday) > 0;
```

- [ ] **Step 2: Rewrite the Tasks widget**

Replace the entire Tasks widget block:

```jsx
        {/* Tasks Widget */}
        <div className="stat-card">
          <div className="card-header">
            <div className="card-title">
              <CheckSquare size={18} color="var(--primary)" />
              Tasks
            </div>
            {hasTasks && (
              <button className="view-all-link" onClick={() => navigate('/tasks')}>
                View all
              </button>
            )}
          </div>
          {hasTasks ? (
            <div className="stat-grid">
              <div className="stat-item">
                <div className="stat-value">{taskStats.completed}</div>
                <div className="stat-label">Completed</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{taskStats.pending}</div>
                <div className="stat-label">Pending</div>
              </div>
              <div className="stat-item" style={taskStats.overdue > 0 ? { background: 'var(--danger-soft)' } : undefined}>
                <div className="stat-value" style={taskStats.overdue > 0 ? { color: 'var(--danger)' } : undefined}>{taskStats.overdue}</div>
                <div className="stat-label">Overdue</div>
              </div>
              <div className="stat-item" style={taskStats.dueToday > 0 ? { background: 'var(--warning-soft)' } : undefined}>
                <div className="stat-value" style={taskStats.dueToday > 0 ? { color: 'var(--warning)' } : undefined}>{taskStats.dueToday}</div>
                <div className="stat-label">Due today</div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0.5rem 0' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                No tasks yet —{' '}
                <button
                  className="view-all-link"
                  style={{ fontSize: '0.875rem' }}
                  onClick={() => navigate('/tasks')}
                >
                  Add your first
                </button>
              </span>
            </div>
          )}
        </div>
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 4: Commit**

```bash
git add src/components/analytics/AnalyticsDashboard.js
git commit -m "feat(dashboard): mute zero-count task tiles, add empty state to Tasks card"
```

---

### Task 6: Rupee symbol sizing in the big stat figures

At `1.75rem`/800 weight, the ₹ glyph sits awkwardly against the digits. Render the symbol at 70% size (em-relative keeps it baseline-aligned) inside the two `main-stat-value` figures (Bills/Products total and Net balance).

**Files:**
- Modify: `src/components/analytics/AnalyticsDashboard.js` (add helper component, use in both `main-stat-value` blocks)

**Interfaces:**
- Consumes: `formatCurrency` from `../../services/analyticsService` (already imported) — returns strings like `₹1,234.00` and `-₹2,387.00`.
- Produces: internal component `BigCurrency({ value })` — module-private, not exported.

- [ ] **Step 1: Add the BigCurrency helper**

Above the `AnalyticsDashboard` component (below `getGreeting`), add:

```jsx
const BigCurrency = ({ value }) => {
  const [before, after] = formatCurrency(value).split('₹');
  return (
    <>
      {before}
      <span style={{ fontSize: '0.7em' }}>₹</span>
      {after}
    </>
  );
};
```

- [ ] **Step 2: Use it in both main-stat figures**

Bills/Products widget:

```jsx
            <div className="main-stat-value">
              <BigCurrency value={currentAnalytics ? currentAnalytics.totalAmount : shopStats.totalSales} />
            </div>
```

Transactions widget (keeping Task 3's conditional color):

```jsx
            <div
              className="main-stat-value"
              style={transactionStats.netBalance < 0 ? { color: 'var(--danger)' } : undefined}
            >
              <BigCurrency value={transactionStats.netBalance} />
            </div>
```

Leave the smaller `stat-value` currency figures (cash in/out, total profit, averages) as plain `formatCurrency` — the spacing issue only shows at the big size.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 4: Commit**

```bash
git add src/components/analytics/AnalyticsDashboard.js
git commit -m "style(dashboard): render rupee symbol at 70% size in large stat figures"
```

---

### Task 7: Visual verification (light + dark, real data)

No code in this task unless a defect is found. Verify all changes render correctly with a full page reload.

**Files:**
- None (verification only).

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces: nothing.

- [ ] **Step 1: Start the dev server**

Run: `npm start` (port 3000), log in, do a full page reload (not HMR).

- [ ] **Step 2: Light-mode checklist**

- Header logo tile is indigo (`--primary`), not green; active nav tab ("Home") uses indigo text on indigo-soft background with an indigo underline bar.
- Page header reads "Good morning/afternoon/evening, <firstname>" with the subtitle below; no "Analytics Dashboard" text anywhere.
- All four summary cards (Tasks, Bills, Transactions, Price list) share one row at ≥ ~1100px viewport width.
- Net balance: negative → red; zero/positive → default foreground.
- Cash in ₹0.00 and Cash out ₹0.00 render muted, not green/red.
- Tasks card with zero tasks shows "No tasks yet — Add your first" and no "View all"; with tasks, Overdue/Due-today tiles only tint when count > 0.
- ₹ symbol in the two big figures is visibly smaller than the digits and baseline-aligned.

- [ ] **Step 3: Dark-mode checklist**

Toggle the moon button, full-reload again:
- Logo tile, active nav, greeting, tinted tiles, and conditional colors all flip correctly (all values come from tokens, so this validates no hardcoded hex slipped in).
- `--primary-soft` active-nav background is visible against the dark card.

- [ ] **Step 4: Mobile nav spot-check**

Narrow the viewport below 768px: bottom mobile nav active item is indigo, more-menu active item uses indigo-soft.

- [ ] **Step 5: Final gate**

Run: `npm run build`
Expected: `Compiled successfully.`

Fix any defects found, then commit fixes with `fix(dashboard): <description>`.
