# Clay Screen Polish + Backlog Cleanups — Design

**Date:** 2026-07-15
**Status:** Approved
**Predecessor:** `docs/superpowers/plans/2026-07-15-clay-design-system.md` (design system — merged to `dev`)
**Design source of truth:** `~/Downloads/App design improvement clay/` — `Clay Prototype v2.dc.html` (screens at `data-screen-label="Home"` / `"Bills"` / `"Vendors"`), `readme.md` (voice + data-viz rules)

## Goal

Bring the screens the design-system plan deliberately skipped up to the Clay prototype's layout and voice: shop HomeView and the personal Dashboard get the prototype's layout patterns; BillsView and VendorsView adopt the new Clay components (PillTabs, Avatar, overdue Badge). Plus three small backlog cleanups (P2 HomeView subscription, P3 lazy routes, P3 dead code).

## Approach (decided)

**In-place restyle.** Each screen's data logic (stats memos, Firestore subscriptions, contexts) is kept; only the JSX/render layer changes. No new screen components; one new small ui component (`MeterBar`). No new dependencies; no chart libraries (Clay rule: chunky CSS bars only).

## Components

### 1. `MeterBar` — new ui component

`src/components/ui/MeterBar.js`. The prototype's chunky bar (Home screen, line ~66): a 10px-tall pill track in `var(--secondary)`, containing rounded flex segments.

- Props: `segments` (array of `{ value, color }`), `total` (number; when segments don't fill it, remainder stays track-colored), `height = 10`.
- Zero/empty safety: `total <= 0` or all-zero segments renders just the track.
- Register: `src/components/ui/index.js` barrel + `.design-sync/config.json` `componentSrcMap`. Test file required.

### 2. Shop HomeView (`src/components/shop/HomeView.js`)

Layout per prototype Home. Data sources unchanged (BillsContext, VendorsContext, product stats — see cleanup #6a).

- **Top row** — grid `1.35fr 1fr 1fr`:
  - **Hero card** (solid ink: `background: var(--foreground)`, text `var(--background)`, decorative clay circle top-right, 20px radius): "‹Month› so far" label, 44px Bricolage purchases total for the current month, profit line, pill chips (`rgba`-tinted): "▲/▼ x% vs ‹last month›" (computed from bills) and "N bills YTD".
  - **To collect / pay card**: open (non-paid) bill total in 30px Bricolage, "across N open bills", `MeterBar` with pending (`var(--warning)`) + overdue (`var(--overdue)`) segments, dot legend beneath.
  - **Products card** (replaces prototype's Cash position, which lives on the personal Dashboard): products total value hero numeral, profit subtitle, "Price list →" link. Uses existing product stats.
- **Bottom row** — grid `1.6fr 1fr`:
  - **Recent bills**: card with "Recent bills" Bricolage heading + "See all →" link; rows (not a table): `Avatar` initials tile, vendor name + meta line (bill # · date), status `Badge` (overdue variant where due), bold amount. Hover fill `var(--muted)`; row radius `var(--radius)`.
  - **Top products**: existing top-5-by-profit list restyled to Clay rows (rank tile keeps small radius).
- The old 4-up SummaryCard row and Bills/Vendors Overview cards are removed (their numbers now live in the hero/collect cards; BillsView/VendorsView have their own summaries).
- Copy: sentence case, "See all →", tiny 11px tracked uppercase only for field labels.

### 3. Personal Dashboard (`src/components/analytics/AnalyticsDashboard.js`)

Lighter touch — structure stays:

- Keep greeting + `BigCurrency` hero numerals.
- Task card: `MeterBar` for completed-vs-open proportion.
- Cash flow: `MeterBar` for cash in vs out; keep existing red-negative/mute-zero logic.
- Rows get Clay hover fills; copy pass ("See all →", sentence case).

### 4. BillsView (`src/components/shop/BillsView.js`)

- Status tab row (~line 586, already `{key,label}`-shaped) → `PillTabs` (`items`, `value=activeStatusTab`, `onChange=existing handler`).
- `getStatusBadge` (~line 391): overdue cases use `variant="overdue"` (solid clay) instead of `danger`.
- Vendor cell in table rows gets an `Avatar` (size ~36) before the name.
- Overdue rows get persistent `background: var(--primary-soft)` fill (prototype "States" rule).

### 5. VendorsView (`src/components/shop/VendorsView.js`)

- Each vendor row gets an `Avatar` initials tile (prototype: 12px-radius peach tile — Avatar's default non-round shape).
- Any overdue indication uses `Badge variant="overdue"`.

### 6. Backlog cleanups

- **a. Limit HomeView product subscription (P2):** add `getShopProductStats(tenantId)` to `src/firebase/shopProductService.js` using `getAggregateFromServer` (count + sum where the fields allow) and a `limit(5)` top-products query; HomeView drops the full `subscribeToShopProducts` load. Must stay tenant-scoped (`where('tenantId','==',tenantId)`). Total profit can't be aggregated server-side (it's `profitPerPiece * totalQuantity`, not a stored field), so the fallback is fixed here: a one-time `getDocs` fetch (no realtime listener) computing value/profit client-side, refreshed on mount only. Either way, the full-collection realtime subscription goes away.
- **b. React.lazy route splitting (P3):** `src/App.js` page imports → `React.lazy`, one `<Suspense>` fallback inside Layout.
- **c. Delete dead code (P3):** `src/components/shop/VirtualizedBillsList.js`, `TestChart.js`, `src/components/migration/` — grep for import references first; delete only if none.

## Error handling

- MeterBar guards against zero/negative totals.
- Aggregate stats fetch gets a `.catch` → zeroed stats + console error (no crash on rules denial).
- Lazy routes: Suspense fallback is a minimal centered loading div using theme tokens.

## Testing & verification

- Per-task test files only (`CI=true npx react-scripts test --watchAll=false <file>`); NEVER gate on the full suite (~191-failure baseline).
- New tests: `MeterBar.test.js`; assertions for PillTabs adoption in BillsView and overdue Badge output where practical.
- `npm run build` after every task.
- Final visual pass vs `Clay Prototype v2.dc.html`, light AND dark (full reload after theme toggle).
- Tick CLAUDE.md backlog items (P2 subscription, P3 lazy, P3 dead code) when done.

## Out of scope

- Layout parity for Products, Price List, Transactions, Tasks, Settings screens.
- PDF invoice generation (P1 — separate effort).
- Pushing `dev` to origin; Vercel Node 24 bump (user dashboard action).
- Tailwind remove-or-commit decision.
