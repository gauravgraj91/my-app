
# Role
You are a senior full-stack engineer helping build and maintain a React + Firebase web app.
Your goal is to write clean, minimal, production-quality code that fits the existing codebase patterns.

# Instructions
- HTML design mockups live in `.superdesign/design_iterations/`
- Design-preview tooling (design-sync) is documented in `.design-sync/NOTES.md` — read it before touching `.design-sync/` or adding components to `src/components/ui/`

# Project Conventions

## Stack
- React (no TypeScript), Firebase/Firestore backend
- Inline styles only — all styles as JS objects, no CSS modules
- Context API for state: `AuthContext` (useAuth, tenantId), `BillsContext` (useBills), `VendorsContext`
- Shared utilities: `src/utils/formatters.js` (formatCurrency, formatDate)

## Architecture
- Routing: react-router in `src/App.js`. Public routes (`/login`, `/signup`), everything else wrapped in `ProtectedRoute` + `Layout`
- Pages live in `src/pages/` (Dashboard, Tasks, Office, Settings, ShopBills, ShopTransactions, PriceList); `/shop` renders `shop.js` (a thin ~60-line shell) with nested routes → `HomeView`, `BillsView`, `ProductsView`, `PriceList`, `VendorsView`, `ShopTransactions`
- Header + profile menu (settings, dark-mode toggle, logout): `src/components/shared/Header.js`; nav tabs: `src/components/shared/Navigation.js`
- Data layer: one service file per collection in `src/firebase/` (`billService`, `vendorService`, `shopProductService`, …); all list queries must be tenant-scoped with `where('tenantId', '==', tenantId)` or Firestore rules deny them
- Storage split: bills/vendors/products in Firestore; product categories (`shopCategories`), theme, table/settings prefs, and activity logs in localStorage

## Key Files
- `src/App.js` — route definitions
- `src/components/shop/BillsView.js` — bills table
- `src/components/shop/HomeView.js` — shop dashboard
- `src/components/shop/VendorsView.js` — vendors table
- `src/components/shop/BillCreateModal.js` — bill creation modal
- `src/firebase/billService.js` — Firestore CRUD for bills
- `src/firebase/vendorService.js` — Firestore CRUD for vendors + subcollections

## Coding Rules
- Match existing inline style patterns; never introduce CSS modules or styled-components
- Colors/shadows: always use theme tokens from `src/styles/theme.css` (`var(--primary)`, `var(--card)`, `var(--shadow)`, …) — never hardcoded hex. Dark mode works by `.dark` on `<body>` flipping the tokens; never write per-component `.dark` CSS overrides
- Hex-alpha appends (`` `${color}20` ``) break with `var()` — use `color-mix(in srgb, ${color} 12%, transparent)`
- Reuse `formatCurrency` / `formatDate` from formatters.js — don't reimplement
- Reuse `SummaryCard` from `src/components/ui/SummaryCard.js` — don't redefine locally
- Reuse `SortableHeader` from `src/components/ui/SortableHeader.js` (props: `sortField`, `sortDirection`, `handleSort`)
- New components in `src/components/ui/` must also be registered in `.design-sync/config.json` (`componentSrcMap`) and `.design-sync/entry.js`, or design previews silently omit them
- Keep components in `src/components/shop/` unless clearly cross-cutting
- Prefer editing existing files over creating new ones
- Don't add comments, docstrings, or type annotations to code you didn't change

## Commands
- `npm start` — start dev server (port 3000)
- `npm run build` — production build (output: `/build`)
- `npm test` — run tests with React Testing Library (Jest)

## Firebase/Firestore Debugging
When debugging Firestore errors, check in this order:
1. Is `tenantId` available before any query runs? (most common root cause)
2. Do all `onSnapshot` calls have error handlers?
3. Are listeners properly cleaned up for React StrictMode double-mount?
4. Is `onSnapshot` being wrapped in `async` incorrectly? (`onSnapshot` is synchronous — never wrap in async)
5. After applying Firestore config fixes, do a full page reload (not HMR) to clear cached state

## Git & Deployment
- Always verify changes are committed (not stashed) before deploying to Vercel
- After removing exported functions, grep for all import references before considering the change complete
- Always run `npm run build` after making changes to verify they work — don't assume passing lint means success

## Gotchas
- Firebase config reads from `.env` — never hardcode keys; all vars prefixed `REACT_APP_`
- Product categories are stored in `localStorage` (`shopCategories`), not Firestore; vendors ARE in Firestore (`vendorService.js`)
- Never pass a `style` prop to `Card`/`StatCard` — `Card` spreads `{...props}` after `style={cardStyle}`, so any `style` prop replaces ALL card styling (see backlog)
- MUI has been removed — inline styles only, no MUI/Emotion imports
- Deployed on Vercel; `vercel.json` has SPA rewrites — don't modify it without good reason
- `react-scripts` (Create React App) is the build tool — no custom webpack config

## TODO — Improvements Backlog

### P1 — High (do soon)
- [ ] **Bump Vercel Node.js version to 24.x** — project is pinned to deprecated Node 20.x; deployments on or after 2026-10-01 will fail to build. One-click: Vercel → Project Settings → Node.js Version.
- [x] **Add Firebase Authentication** — DONE: email/password auth (`AuthContext`, `authService`, `ProtectedRoute`) + tenant-scoped `firestore.rules`, deployed to `todo-shop-app` 2026-07-07. All list queries must include `where('tenantId', '==', tenantId)` or the rules deny them.
- [ ] **PDF invoice generation + share** — top feature gap from competitive research; prerequisite for invoice status tracking, payment reminders, UPI QR.

### P2 — Medium (nice to have)
- [ ] **Fix `Card` prop-spread order** — `{...props}` comes after `style={cardStyle}` in `src/components/ui/Card.js`, so a `style` prop wipes all card chrome; `StatCard` always passes `style` (default `{}`) and thus renders with no card styling. Fix: stop spreading `style` via `{...props}` (merge is already done in `cardStyle` line 25), then remove the gotcha note.
- [ ] **Remove or commit to Tailwind** — `tailwindcss` is in devDeps but used across 15 files; too entrenched to remove quickly
- [ ] **Limit HomeView product subscription** — `subscribeToShopProducts` loads all products for the dashboard; create a lightweight stats query or limit the subscription

### P3 — Low (future)
- [ ] **Add React.lazy() for route code splitting** — all pages load eagerly in `App.js`
- [ ] **Delete dead code** — `VirtualizedBillsList.js`, `TestChart.js`, and `src/components/migration/` are never imported anywhere
- [ ] **Consider IndexedDB for activity logs** — localStorage has ~5MB shared limit
