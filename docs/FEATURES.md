# 📋 App Feature Map

> Last updated: June 2026  
> Stack: React + Firebase/Firestore, React Router, Tailwind CSS, inline styles

---

## Table of Contents
1. [Authentication](#1-authentication)
2. [Dashboard](#2-dashboard-home)
3. [Tasks](#3-tasks)
4. [Shop Dashboard](#4-shop-dashboard)
   - [Home (Overview)](#41-shop-home-overview)
   - [Bills](#42-bills)
   - [Products](#43-products)
   - [Price List](#44-price-list)
   - [Vendors](#45-vendors)
   - [Transactions](#46-transactions)
5. [Office](#5-office)
6. [Settings](#6-settings)
7. [Infrastructure & Cross-cutting](#7-infrastructure--cross-cutting-concerns)

---

## 1. Authentication

**Route:** `/login`, `/signup`  
**Files:** `src/components/auth/`, `src/context/AuthContext.js`, `src/firebase/authService.js`

| Sub-feature | Status | Notes |
|---|---|---|
| Login page | ✅ Done | Email/password |
| Signup page | ✅ Done | |
| Protected routes | ✅ Done | `ProtectedRoute` wraps all app routes |
| Auth context (`useAuth`) | ✅ Done | Provides `user`, `tenantId` |
| Tenant isolation | ✅ Done | `tenantId` scopes all Firestore queries |
| Logout | ✅ Done | |
| Firebase Auth integration | ✅ Done | |
| Password reset / forgot password | ❌ Missing | |
| OAuth / social login | ❌ Missing | |
| Email verification | ❌ Missing | |

---

## 2. Dashboard (Home)

**Route:** `/`  
**Files:** `src/pages/Dashboard.js`, `src/components/analytics/AnalyticsDashboard.js`

| Sub-feature | Status | Notes |
|---|---|---|
| Analytics overview cards | ✅ Done | Bills, Products, Tasks, Transactions counts |
| Bills analytics toggle | ✅ Done | Switch between Bills and Products analytics view |
| Transaction stats summary | ✅ Done | Cash in/out totals |
| Task stats (total, completed) | ✅ Done | Pulled via `useTasks` |
| Quick-action navigation | ✅ Done | Buttons linking to each section |
| Real-time data | ⚠️ Partial | Dashboard fetches once on mount, not real-time |
| Charts / graphs | ❌ Missing | No visual charts yet |
| Date-range filter for analytics | ❌ Missing | |

---

## 3. Tasks

**Route:** `/tasks`  
**Files:** `src/pages/Tasks.js`, `src/components/todo/TodoList.js`, `src/hooks/useTasks.js`, `src/hooks/useTaskFilters.js`

| Sub-feature | Status | Notes |
|---|---|---|
| Add task | ✅ Done | Title, description, category, priority, due date, tags, estimated time |
| Edit task | ✅ Done | Inline editing |
| Delete task | ✅ Done | |
| Toggle completion | ✅ Done | |
| Duplicate task | ✅ Done | |
| Archive completed tasks | ✅ Done | Bulk archive |
| Search tasks | ✅ Done | |
| Filter by category | ✅ Done | personal, work, shopping, health, finance, other |
| Filter by priority | ✅ Done | low, medium, high, urgent |
| Filter by status | ✅ Done | all, active, completed |
| Sort tasks | ✅ Done | By date, priority, title |
| Task stats (total/completed) | ✅ Done | |
| Local persistence | ✅ Done | Stored via `useTasks` (localStorage-based) |
| Overdue detection | ✅ Done | `isOverdue` utility |
| Tags on tasks | ✅ Done | |
| Estimated time field | ✅ Done | |
| Firestore sync for tasks | ❌ Missing | Tasks are local-only |
| Recurring tasks | ❌ Missing | |
| Sub-tasks / checklists | ❌ Missing | |
| Task sharing / collaboration | ❌ Missing | |
| Notifications / reminders | ❌ Missing | |

---

## 4. Shop Dashboard

**Route:** `/shop/*`  
**Files:** `src/components/shop/shop.js` (tab router), `src/context/BillsContext.js`, `src/context/VendorsContext.js`

### 4.1 Shop Home (Overview)

**Route:** `/shop`  
**File:** `src/components/shop/HomeView.js`

| Sub-feature | Status | Notes |
|---|---|---|
| Summary cards (bills, products, vendors) | ✅ Done | |
| Bills by status breakdown | ✅ Done | Paid / Unpaid / Partial counts + amounts |
| Recent bills list | ✅ Done | Quick view with "View All" link |
| Recent products list | ✅ Done | |
| Navigate to sub-sections | ✅ Done | Quick links from overview cards |
| Real-time subscription | ✅ Done | `BillsContext` and product subscription |
| Profit/margin summary | ⚠️ Partial | Data available in context, not prominently shown |
| Sales trend chart | ❌ Missing | |

---

### 4.2 Bills

**Route:** `/shop/bills`  
**Files:** `src/components/shop/BillsView.js`, `src/components/shop/BillCreateModal.js`, `src/components/shop/BillEditModal.js`, `src/firebase/billService.js`, `src/context/BillsContext.js`

| Sub-feature | Status | Notes |
|---|---|---|
| View all bills (table) | ✅ Done | Paginated, sortable |
| Add bill | ✅ Done | Modal with products, vendor, date, status |
| Edit bill | ✅ Done | `BillEditModal` |
| Delete bill | ✅ Done | With confirm dialog |
| Bulk delete | ✅ Done | `BillBulkActionsBar` |
| Bulk select | ✅ Done | Checkbox selection |
| Search bills | ✅ Done | By bill number, product name, etc. |
| Filter by status | ✅ Done | Paid / Unpaid / Partial / Archived |
| Filter by date range | ✅ Done | |
| Filter by category | ✅ Done | |
| Filter by vendor | ✅ Done | |
| Filter by amount range | ✅ Done | |
| Sort bills | ✅ Done | `SortableHeader` on all columns |
| Pagination | ✅ Done | `usePagination` hook |
| Expanded row detail | ✅ Done | `BillExpandedRow` — shows per-product breakdown |
| Bill status (Paid/Unpaid/Partial) | ✅ Done | |
| Assign bill to product | ✅ Done | `AssignBillModal` |
| Conflict resolution on sync | ✅ Done | `ConflictResolutionModal` |
| Export bills (CSV/Excel) | ✅ Done | `src/firebase/billExport.js` |
| Summary cards (total, paid, unpaid, profit) | ✅ Done | |
| Real-time sync | ✅ Done | `onSnapshot` via `BillsContext` |
| Bill number auto-generation | ✅ Done | |
| Multi-product per bill | ✅ Done | |
| Profit per piece / total profit columns | ✅ Done | |
| Configurable visible columns | ✅ Done | Via Settings |
| Archive bill | ✅ Done | |
| Duplicate bill | ❌ Missing | |
| Bill PDF generation / print | ❌ Missing | |
| Bill payment tracking (partial payments) | ⚠️ Partial | Status exists but no payment history log |

---

### 4.3 Products

**Route:** `/shop/products`  
**Files:** `src/components/shop/ProductsView.js`, `src/components/shop/ProductModal.js`, `src/firebase/shopProductService.js`

| Sub-feature | Status | Notes |
|---|---|---|
| View all products (table) | ✅ Done | Paginated, sortable |
| Add product | ✅ Done | `ProductModal` — name, category, MRP, qty, vendor |
| Edit product | ✅ Done | |
| Delete product | ✅ Done | With confirm dialog |
| Bulk delete | ✅ Done | |
| Bulk select | ✅ Done | |
| Search products | ✅ Done | |
| Filter by category | ✅ Done | |
| Sort products | ✅ Done | |
| Export products | ✅ Done | CSV/Excel |
| Link product to bill | ✅ Done | `moveProductToBill` |
| Unlink product from bill | ✅ Done | `removeProductFromBill` |
| Summary cards (total, value, profit) | ✅ Done | |
| Categories (localStorage) | ✅ Done | Configurable, stored in localStorage |
| Real-time sync | ✅ Done | `subscribeToShopProducts` |
| Product image upload | ❌ Missing | |
| Stock / inventory tracking | ❌ Missing | No quantity-over-time tracking |
| Low-stock alerts | ❌ Missing | |
| Barcode / QR scanning | ❌ Missing | |

---

### 4.4 Price List

**Route:** `/shop/price-list`  
**File:** `src/components/shop/PriceList.js`, `src/firebase/priceListService.js`

| Sub-feature | Status | Notes |
|---|---|---|
| View price list (read-only table) | ✅ Done | Derived from Products |
| Group by product name | ✅ Done | Shows latest entry per product name |
| Search by product name | ✅ Done | |
| Filter by category | ✅ Done | |
| Sort columns | ✅ Done | |
| Summary cards (products, avg price, avg margin) | ✅ Done | |
| Historical price tracking | ⚠️ Partial | Only latest price shown, history exists in products |
| Edit price directly from list | ❌ Missing | Read-only view |
| Price comparison across vendors | ❌ Missing | |
| Export price list | ❌ Missing | |

---

### 4.5 Vendors

**Route:** `/shop/vendors`  
**Files:** `src/components/shop/VendorsView.js`, `src/firebase/vendorService.js`, `src/context/VendorsContext.js`

| Sub-feature | Status | Notes |
|---|---|---|
| View all vendors (table) | ✅ Done | |
| Add vendor | ✅ Done | |
| Edit vendor | ✅ Done | |
| Delete vendor | ✅ Done | With confirm dialog |
| Search vendors | ✅ Done | |
| Expand vendor → view products | ✅ Done | Expandable row with subcollection |
| Add product to vendor (offered price) | ✅ Done | |
| Price trend indicator | ✅ Done | Up/down/flat vs last price |
| Navigate to vendor's bills | ✅ Done | Deep-links to Bills filtered by vendor |
| Summary cards (total vendors, products) | ✅ Done | |
| Activity log on vendor actions | ✅ Done | |
| Vendor contact info | ❌ Missing | Phone, email, address fields |
| Vendor payment terms | ❌ Missing | |
| Vendor rating / notes | ❌ Missing | |

---

### 4.6 Transactions

**Route:** `/shop/transactions`  
**Files:** `src/components/shop/shopTransactions.js`, `src/firebase/transactionService.js`

| Sub-feature | Status | Notes |
|---|---|---|
| Add cash-in transaction | ✅ Done | |
| Add cash-out transaction | ✅ Done | |
| Add comment to transaction | ✅ Done | |
| View all transactions (list) | ✅ Done | |
| Filter: all / cash-in / cash-out | ✅ Done | |
| Delete transaction | ✅ Done | |
| Show running balance / totals | ✅ Done | |
| Real-time sync | ✅ Done | `subscribeToTransactions` |
| Export transactions | ❌ Missing | |
| Transaction categories | ❌ Missing | |
| Recurring transactions | ❌ Missing | |
| Search transactions | ❌ Missing | |
| Date range filter | ❌ Missing | |

---

## 5. Office

**Route:** `/office`  
**File:** `src/pages/Office.js`

| Sub-feature | Status | Notes |
|---|---|---|
| Placeholder UI | ✅ Done | "Coming Soon" screen |
| Office task management | ❌ Not built | Planned |

---

## 6. Settings

**Route:** `/settings`  
**Files:** `src/components/settings/Settings.js`, `src/firebase/activityLogService.js`

| Sub-feature | Status | Notes |
|---|---|---|
| Theme toggle (light/dark) | ✅ Done | Stored in localStorage (toggle exists) |
| Notifications toggle | ✅ Done | Stored in localStorage |
| Auto-save toggle | ✅ Done | Stored in localStorage |
| Table column visibility | ✅ Done | Show/hide individual Bill table columns |
| Table feature toggles | ✅ Done | Toggle filtering, export, totals |
| Activity log viewer | ✅ Done | Real-time log from Firestore |
| Clear activity logs | ✅ Done | With confirm dialog |
| Migrate localStorage logs to Firestore | ✅ Done | One-time migration util |
| User profile / account settings | ❌ Missing | |
| Change password | ❌ Missing | |
| Data export (full backup) | ❌ Missing | |
| Dark mode CSS actually applied | ❌ Missing | Toggle exists but CSS vars not wired |
| Per-user settings stored in Firestore | ❌ Missing | All settings are localStorage only |

---

## 7. Infrastructure & Cross-cutting Concerns

### Navigation & Layout

| Item | Status | Notes |
|---|---|---|
| Sidebar navigation | ✅ Done | `Navigation.js` |
| Header | ✅ Done | `Header.js` |
| Responsive / mobile layout | ⚠️ Partial | Not fully mobile-optimized |

### Notifications

| Item | Status | Notes |
|---|---|---|
| Toast notification system | ✅ Done | `NotificationSystem.js` — success, error, info |
| Max 5 stacked notifications | ✅ Done | |
| Push / browser notifications | ❌ Missing | |

### Error Handling

| Item | Status | Notes |
|---|---|---|
| React `ErrorBoundary` | ✅ Done | Wraps entire app |
| Firestore error handling utilities | ✅ Done | `errorHandling.js` |
| Recovery options on errors | ✅ Done | |

### Performance

| Item | Status | Notes |
|---|---|---|
| Pagination (`usePagination`) | ✅ Done | Bills and Products views |
| Virtual scrolling hook | ✅ Done | `useVirtualScrolling.js` (built, not widely used) |
| Virtualized bills list | ⚠️ Built, unused | `VirtualizedBillsList.js` — never imported |
| Bill cache utilities | ✅ Done | `cacheUtils.js` |
| React.lazy code splitting | ❌ Missing | All routes load eagerly |

### Data & Storage

| Item | Status | Notes |
|---|---|---|
| Firestore real-time listeners | ✅ Done | Bills, Vendors, Transactions, Products |
| localStorage (categories, vendors, settings) | ✅ Done | |
| Activity log (Firestore) | ✅ Done | `activityLogService.js` |
| Data migration service | ✅ Done | `migrationService.js` |
| Firestore security rules | ✅ Done | `firestore.rules` |
| Firestore indexes | ✅ Done | `firestore.indexes.json` |
| Offline support / persistence | ❌ Missing | |
| IndexedDB for activity logs | ❌ Missing | localStorage has 5MB limit |
| Full data backup/export | ❌ Missing | |

### Analytics & Reporting

| Item | Status | Notes |
|---|---|---|
| Bill analytics service | ✅ Done | `billAnalytics.js` |
| Bill export (CSV/Excel) | ✅ Done | `billExport.js` |
| Analytics dashboard | ✅ Done | Bills vs Products toggle |
| Charts / data visualizations | ❌ Missing | |
| Monthly/weekly trend reports | ❌ Missing | |

### Security

| Item | Status | Notes |
|---|---|---|
| Firebase Auth | ✅ Done | |
| Tenant isolation (multi-tenant) | ✅ Done | All queries scoped to `tenantId` |
| Firestore rules (tenant-scoped) | ✅ Done | |
| Anonymous auth fallback | ❌ Missing | |
| Role-based access control (RBAC) | ❌ Missing | |

---

## 🗺️ Legend

| Symbol | Meaning |
|---|---|
| ✅ Done | Fully implemented and working |
| ⚠️ Partial | Partially implemented or has known gaps |
| ❌ Missing | Not implemented yet |

---

## 📌 Known Backlog (from CLAUDE.md)

| Priority | Item |
|---|---|
| P1 | Firebase Authentication hardening (anonymous auth + stricter rules) |
| P2 | Remove or commit to Tailwind (currently partially used) |
| P2 | Limit `HomeView` product subscription (loads all products) |
| P3 | Add `React.lazy()` for route code splitting |
| P3 | Clean up or integrate `VirtualizedBillsList.js` |
| P3 | Consider IndexedDB for activity logs (localStorage 5MB limit) |
