# Shop & Tasks App

A multi-tenant React + Firebase web app for running a small shop and keeping personal/office tasks in one place.

## Features

- **Shop dashboard** — cash flow overview, recent activity, quick links
- **Bills** — create, edit, filter, and bulk-manage vendor bills with overdue tracking
- **Vendors** — vendor directory with per-vendor products and bill history
- **Products & price list** — product catalog with categories and pricing
- **Shop transactions** — cash inflow/outflow ledger with filters and totals
- **Tasks & office** — simple todo/task management
- **Auth & multi-tenancy** — Firebase email/password auth; all data is tenant-scoped and enforced by Firestore security rules
- **Dark mode** — theme-token based, toggled from the profile menu

## Tech Stack

- [React 18](https://react.dev/) (Create React App, JavaScript — no TypeScript)
- [Firebase](https://firebase.google.com/) — Auth + Firestore
- [react-router](https://reactrouter.com/) v6 with lazy-loaded routes
- Inline styles with CSS custom-property theme tokens (`src/styles/theme.css`) — "Dukaan Clay" design language
- [Recharts](https://recharts.org/) for charts, [lucide-react](https://lucide.dev/) for icons
- Deployed on [Vercel](https://vercel.com/) (SPA rewrites in `vercel.json`)

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure Firebase. Copy `.env.example` to `.env` and fill in your Firebase project config (all vars are `REACT_APP_`-prefixed):

   ```
   REACT_APP_FIREBASE_API_KEY=
   REACT_APP_FIREBASE_AUTH_DOMAIN=
   REACT_APP_FIREBASE_PROJECT_ID=
   REACT_APP_FIREBASE_STORAGE_BUCKET=
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
   REACT_APP_FIREBASE_APP_ID=
   REACT_APP_FIREBASE_MEASUREMENT_ID=
   ```

3. Start the dev server:

   ```bash
   npm start
   ```

   Opens at [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Run the dev server on port 3000 |
| `npm test` | Run tests (Jest + React Testing Library) in watch mode |
| `npm run build` | Production build to `/build` |

## Project Structure

```
src/
  App.js                 # Route definitions (lazy-loaded pages)
  pages/                 # Dashboard, Tasks, Office, Settings, ShopBills, ...
  components/
    shop/                # Bills, vendors, products, transactions views
    shared/              # Header, Navigation
    ui/                  # Reusable primitives (Card, SummaryCard, MeterBar, ...)
  context/               # AuthContext, BillsContext, VendorsContext
  firebase/              # One service file per Firestore collection
  utils/formatters.js    # formatCurrency, formatDate
  styles/theme.css       # Theme tokens (light/dark)
```

Firestore security rules live in `firestore.rules`; every list query must be tenant-scoped with `where('tenantId', '==', tenantId)`.

See `CLAUDE.md` for detailed coding conventions and `FEATURES.md` for the feature inventory.
