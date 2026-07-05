# Multi-Tenant Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Firebase Authentication with email/password signup/login, tenant isolation so each shop owner has their own data, and role-based access (owner vs staff).

**Architecture:** Firebase Auth for identity. On signup, a new tenant (workspace) is created and the user becomes its owner. A `users` collection stores profile + role + tenantId. All existing Firestore collections (bills, shopProducts, shopVendors, priceList, transactions, activityLogs) get a `tenantId` field added to every document. All queries are scoped by `tenantId`. Firestore security rules enforce that users can only read/write documents matching their tenantId.

**Tech Stack:** Firebase Auth (email/password), Firestore, React Context API, react-router-dom v6

---

## Data Model

```
tenants/{tenantId}
  - name: string (shop/business name)
  - ownerId: string (uid of creator)
  - createdAt: serverTimestamp

users/{uid}
  - email: string
  - displayName: string
  - tenantId: string
  - role: "owner" | "staff"
  - createdAt: serverTimestamp

All existing collections add:
  - tenantId: string (indexed, required)
```

## File Overview

| Action | File |
|--------|------|
| Modify | `src/firebase/config.js` — export `auth` |
| Create | `src/firebase/authService.js` — signup, login, logout, onAuthChange |
| Create | `src/context/AuthContext.js` — AuthProvider + useAuth hook |
| Create | `src/components/auth/LoginPage.js` — login form |
| Create | `src/components/auth/LoginPage.css` — login styles |
| Create | `src/components/auth/SignupPage.js` — signup form |
| Create | `src/components/auth/ProtectedRoute.js` — route guard |
| Modify | `src/App.js` — wrap AuthProvider, add auth routes, protect routes |
| Modify | `src/components/shared/Header.js` — add user menu + logout |
| Modify | `src/firebase/billService.js` — add tenantId to all queries |
| Modify | `src/firebase/shopProductService.js` — add tenantId to all queries |
| Modify | `src/firebase/vendorService.js` — add tenantId to all queries |
| Modify | `src/firebase/priceListService.js` — add tenantId to all queries |
| Modify | `src/firebase/transactionService.js` — add tenantId to all queries |
| Modify | `src/firebase/activityLogService.js` — add tenantId to all queries |
| Modify | `src/context/BillsContext.js` — pass tenantId from auth |
| Modify | `src/context/VendorsContext.js` — pass tenantId from auth |
| Modify | `firestore.rules` — auth + tenant isolation |

---

### Task 1: Initialize Firebase Auth

**Files:**
- Modify: `src/firebase/config.js`

**Step 1: Add auth export to config.js**

Add `getAuth` import and export `auth` instance:

```javascript
// Add to imports at top:
import { getAuth } from 'firebase/auth';

// Add after the db export (line 25):
export const auth = getAuth(app);
```

**Step 2: Verify the app still builds**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/firebase/config.js
git commit -m "feat(auth): initialize Firebase Auth in config"
```

---

### Task 2: Create Auth Service

**Files:**
- Create: `src/firebase/authService.js`

**Step 1: Create the auth service**

```javascript
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './config';

export async function signup(email, password, displayName, shopName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  await updateProfile(cred.user, { displayName });

  // Create tenant
  const tenantRef = doc(collection(db, 'tenants'));
  const tenantId = tenantRef.id;
  await setDoc(tenantRef, {
    name: shopName,
    ownerId: uid,
    createdAt: serverTimestamp(),
  });

  // Create user profile
  await setDoc(doc(db, 'users', uid), {
    email,
    displayName,
    tenantId,
    role: 'owner',
    createdAt: serverTimestamp(),
  });

  return { uid, tenantId, role: 'owner' };
}

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getUserProfile(cred.user.uid);
  return profile;
}

export async function logout() {
  return signOut(auth);
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() };
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/firebase/authService.js
git commit -m "feat(auth): create auth service with signup, login, logout"
```

---

### Task 3: Create Auth Context

**Files:**
- Create: `src/context/AuthContext.js`

**Step 1: Create the AuthContext provider**

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthChange, getUserProfile } from '../firebase/authService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // { uid, email, displayName, tenantId, role }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = { user, loading };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontSize: '16px', color: '#64748b',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/context/AuthContext.js
git commit -m "feat(auth): create AuthContext provider with loading state"
```

---

### Task 4: Create Login Page

**Files:**
- Create: `src/components/auth/LoginPage.js`
- Create: `src/components/auth/LoginPage.css`

**Step 1: Create LoginPage.css**

Shared auth page styles (used by both Login and Signup):

```css
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f8fafc;
  padding: 20px;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 40px 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.auth-title {
  font-size: 24px !important;
  font-weight: 700 !important;
  color: #1e293b !important;
  margin: 0 0 4px 0 !important;
  text-align: center;
}

.auth-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 28px 0;
  text-align: center;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-field label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.auth-field input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1e293b;
  background: #fff;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.auth-field input:focus {
  outline: none;
  border-color: #1e293b;
  box-shadow: 0 0 0 3px rgba(30, 41, 59, 0.08);
}

.auth-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  background: #1e293b;
  color: #fff;
  margin-top: 4px;
}

.auth-btn:hover {
  background: #334155;
}

.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-error {
  background: #fef2f2;
  color: #dc2626;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  border: 1px solid #fecaca;
}

.auth-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 13px;
  color: #64748b;
}

.auth-footer a {
  color: #1e293b;
  font-weight: 600;
  text-decoration: none;
}

.auth-footer a:hover {
  text-decoration: underline;
}
```

**Step 2: Create LoginPage.js**

```javascript
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../firebase/authService';
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const messages = {
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      };
      setError(messages[err.code] || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="auth-footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/auth/LoginPage.js src/components/auth/LoginPage.css
git commit -m "feat(auth): create login page"
```

---

### Task 5: Create Signup Page

**Files:**
- Create: `src/components/auth/SignupPage.js`

**Step 1: Create SignupPage.js**

```javascript
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../../firebase/authService';
import './LoginPage.css';

const SignupPage = () => {
  const [form, setForm] = useState({ displayName: '', shopName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form.email, form.password, form.displayName, form.shopName);
      navigate('/');
    } catch (err) {
      const messages = {
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/invalid-email': 'Please enter a valid email address.',
      };
      setError(messages[err.code] || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Set up your shop in seconds</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          <div className="auth-field">
            <label>Your Name</label>
            <input
              type="text"
              value={form.displayName}
              onChange={handleChange('displayName')}
              placeholder="John Doe"
              required
              autoFocus
            />
          </div>
          <div className="auth-field">
            <label>Shop / Business Name</label>
            <input
              type="text"
              value={form.shopName}
              onChange={handleChange('shopName')}
              placeholder="My Shop"
              required
            />
          </div>
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={handleChange('password')}
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/auth/SignupPage.js
git commit -m "feat(auth): create signup page with tenant creation"
```

---

### Task 6: Create ProtectedRoute Component

**Files:**
- Create: `src/components/auth/ProtectedRoute.js`

**Step 1: Create ProtectedRoute.js**

```javascript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/auth/ProtectedRoute.js
git commit -m "feat(auth): create ProtectedRoute guard component"
```

---

### Task 7: Wire Up Auth in App.js

**Files:**
- Modify: `src/App.js`

**Step 1: Update App.js with auth routes and protection**

Replace the full contents of `src/App.js` with:

```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import ErrorBoundary from './components/shared/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Office from './pages/Office';
import Shop from './components/shop/shop';
import HomeView from './components/shop/HomeView';
import BillsView from './components/shop/BillsView';
import ProductsView from './components/shop/ProductsView';
import PriceList from './components/shop/PriceList';
import VendorsView from './components/shop/VendorsView';
import ShopTransactions from './pages/ShopTransactions';
import Settings from './pages/Settings';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './components/ui/NotificationSystem';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <NotificationProvider maxNotifications={5}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/office" element={<Office />} />
                <Route path="/shop" element={<Shop />}>
                  <Route index element={<HomeView />} />
                  <Route path="bills" element={<BillsView />} />
                  <Route path="products" element={<ProductsView />} />
                  <Route path="price-list" element={<PriceList />} />
                  <Route path="vendors" element={<VendorsView />} />
                </Route>
                <Route path="/shop/transactions" element={<ShopTransactions />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
```

Note: `AuthProvider` must be inside `Router` because it doesn't use routing, but `ProtectedRoute` uses `Navigate` which requires router context. `Layout` now needs to render an `<Outlet />` for nested routes — check if it already does, otherwise update it.

**Step 2: Check if Layout.js needs Outlet**

Read `src/components/Layout.js`. Currently it renders `{children}`. Since we're switching to `<Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>` nesting, Layout needs to use `<Outlet />` from react-router-dom instead of `{children}`.

Update Layout.js:

```javascript
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './shared/Header';
import Navigation from './shared/Navigation';

const Layout = () => {
  return (
    <div className="App">
      <Header />
      <Navigation />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Manual test**

Run: `npm start`
- Visit `http://localhost:3000/` → should redirect to `/login`
- Visit `/login` → should show login form
- Visit `/signup` → should show signup form

**Step 5: Commit**

```bash
git add src/App.js src/components/Layout.js
git commit -m "feat(auth): wire up auth routes and protect all app routes"
```

---

### Task 8: Add User Menu to Header

**Files:**
- Modify: `src/components/shared/Header.js`

**Step 1: Read current Header.js**

Read `src/components/shared/Header.js` to understand current structure.

**Step 2: Add user menu with logout**

Add imports at top:
```javascript
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../firebase/authService';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
```

Add inside the component, before the return:
```javascript
const { user } = useAuth();
const navigate = useNavigate();

const handleLogout = async () => {
  await logout();
  navigate('/login');
};
```

Add to the header's right section (next to dark mode toggle), a user display + logout button:
```jsx
{user && (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <User size={14} />
      {user.displayName || user.email}
    </span>
    <button
      onClick={handleLogout}
      style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px',
        background: '#fff', fontSize: '13px', color: '#64748b',
        cursor: 'pointer',
      }}
    >
      <LogOut size={14} />
      Logout
    </button>
  </div>
)}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/shared/Header.js
git commit -m "feat(auth): add user name and logout button to header"
```

---

### Task 9: Scope All Services with tenantId

This is the core data isolation task. Every service file needs to:
1. Accept `tenantId` as a parameter
2. Add `tenantId` to documents on create
3. Filter queries by `tenantId` using `where('tenantId', '==', tenantId)`

**Files:**
- Modify: `src/firebase/billService.js`
- Modify: `src/firebase/shopProductService.js`
- Modify: `src/firebase/vendorService.js`
- Modify: `src/firebase/priceListService.js`
- Modify: `src/firebase/transactionService.js`
- Modify: `src/firebase/activityLogService.js`

**Step 1: Read each service file fully**

Read all 6 service files to understand every function signature and query.

**Step 2: Update billService.js**

For every function that queries or writes to the `bills` collection:
- Add `tenantId` parameter
- On writes: include `tenantId` in document data
- On reads/subscriptions: add `where('tenantId', '==', tenantId)` to queries

Key functions to update:
- `addBill(billData)` → `addBill(billData, tenantId)` — add `tenantId` to doc
- `subscribeToBills(callback)` → `subscribeToBills(tenantId, callback)` — add where clause
- `updateBill(billId, updates)` — no change needed (updates by doc ID)
- `deleteBill(billId)` — no change needed (deletes by doc ID)
- `getBillById(billId)` — no change needed (reads by doc ID)
- `duplicateBill(billId)` → needs tenantId for the new doc
- `bulkDeleteBills(billIds)` — no change needed
- `bulkDuplicateBills(billIds)` → needs tenantId for new docs
- Any export functions — no change needed (read by ID)

**Step 3: Update shopProductService.js**

Same pattern:
- `addShopProduct(productData, billId)` → add `tenantId` param and field
- `subscribeToShopProducts(callback)` → add `tenantId` param and where clause
- Delete/update by doc ID — no change needed

**Step 4: Update vendorService.js**

- `subscribeToVendors(callback)` → add `tenantId` and where clause
- `addVendor(vendorData)` → add `tenantId` field
- `updateVendor` / `deleteVendor` — by doc ID, no change
- Subcollection functions (vendor products) — no change (scoped by vendor doc already)

**Step 5: Update priceListService.js**

- `addPriceListItem(itemData)` → add `tenantId`
- `getPriceListItems()` → add `tenantId` and where clause

**Step 6: Update transactionService.js**

- `addTransaction(transactionData)` → add `tenantId`
- `getTransactions()` → add `tenantId` and where clause

**Step 7: Update activityLogService.js**

- `addActivityLog(...)` → add `tenantId` param and field
- `subscribeActivityLogs(tabFilter, callback)` → add `tenantId` and where clause
- `clearActivityLogs()` → add `tenantId` and where clause (only clear own logs)

**Step 8: Verify build**

Run: `npm run build`
Expected: Build fails — callers don't pass tenantId yet (fixed in Task 10)

**Step 9: Commit**

```bash
git add src/firebase/billService.js src/firebase/shopProductService.js src/firebase/vendorService.js src/firebase/priceListService.js src/firebase/transactionService.js src/firebase/activityLogService.js
git commit -m "feat(auth): scope all Firestore services with tenantId"
```

---

### Task 10: Pass tenantId from Contexts to Services

**Files:**
- Modify: `src/context/BillsContext.js`
- Modify: `src/context/VendorsContext.js`
- Modify: `src/components/shop/ProductsView.js` (calls shopProductService directly)
- Modify: `src/components/shop/PriceList.js` (calls priceListService directly)
- Modify: `src/components/shop/VendorsView.js` (calls vendorService and activityLog)
- Modify: `src/components/settings/Settings.js` (calls activityLogService)
- Modify: `src/utils/activityLog.js` (thin wrapper)
- Any other file that calls a service function directly

**Step 1: Update BillsContext.js**

Add `useAuth` import and get `user.tenantId`. Pass it to every billService and activityLog call:

```javascript
import { useAuth } from './AuthContext';

// Inside BillsProvider:
const { user } = useAuth();
const tenantId = user?.tenantId;

// Pass tenantId to subscribeToBills, addBill, duplicateBill, bulkDuplicate, etc.
```

**Step 2: Update VendorsContext.js**

Same pattern — get tenantId from useAuth, pass to subscribeToVendors.

**Step 3: Update activityLog.js wrapper**

The `addLog` wrapper needs to accept and pass tenantId:
```javascript
export function addLog(action, entity, entityType, tab, details, tenantId) {
  addActivityLog(action, entity, entityType, tab, details, tenantId);
}
```

**Step 4: Update all addLog callers**

Every call to `addLog(...)` in BillsContext.js, ProductsView.js, VendorsView.js needs the tenantId appended.

**Step 5: Update Settings.js**

Pass tenantId to `subscribeActivityLogs` and `clearActivityLogs`.

**Step 6: Update any remaining direct service callers**

Search for all imports from service files and verify tenantId is passed.

**Step 7: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 8: Commit**

```bash
git add -A
git commit -m "feat(auth): pass tenantId from auth context to all service calls"
```

---

### Task 11: Update Firestore Security Rules

**Files:**
- Modify: `firestore.rules`

**Step 1: Rewrite firestore.rules**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: user is authenticated
    function isAuth() {
      return request.auth != null;
    }

    // Helper: user's tenantId matches document's tenantId
    function isTenant() {
      return isAuth() && resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;
    }

    // Helper: new document's tenantId matches user's tenantId
    function isNewTenant() {
      return isAuth() && request.resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;
    }

    // Users collection: users can only read/write their own profile
    match /users/{userId} {
      allow read: if isAuth() && request.auth.uid == userId;
      allow create: if isAuth() && request.auth.uid == userId;
      allow update: if isAuth() && request.auth.uid == userId;
    }

    // Tenants: only owner can read/update
    match /tenants/{tenantId} {
      allow read: if isAuth();
      allow create: if isAuth();
      allow update: if isAuth() && resource.data.ownerId == request.auth.uid;
    }

    // All data collections: tenant-scoped
    match /bills/{document} {
      allow read: if isTenant();
      allow create: if isAuth() && isNewTenant();
      allow update, delete: if isTenant();
    }

    match /shopProducts/{document} {
      allow read: if isTenant();
      allow create: if isAuth() && isNewTenant();
      allow update, delete: if isTenant();
    }

    match /shopVendors/{document} {
      allow read: if isTenant();
      allow create: if isAuth() && isNewTenant();
      allow update, delete: if isTenant();

      match /products/{productId} {
        allow read, write: if isTenant();
      }
    }

    match /priceList/{document} {
      allow read: if isTenant();
      allow create: if isAuth() && isNewTenant();
      allow update, delete: if isTenant();
    }

    match /transactions/{document} {
      allow read: if isTenant();
      allow create: if isAuth() && isNewTenant();
      allow update, delete: if isTenant();
    }

    match /activityLogs/{document} {
      allow read: if isTenant();
      allow create: if isAuth() && isNewTenant();
      allow update, delete: if isTenant();
    }
  }
}
```

**Step 2: Deploy rules**

Run: `npx firebase deploy --only firestore:rules`
Expected: Rules deployed successfully

**Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(auth): rewrite Firestore rules with tenant isolation"
```

---

### Task 12: Enable Firebase Auth in Console

**This is a manual step (not code).**

**Step 1:** Go to Firebase Console → `todo-shop-app` project
**Step 2:** Navigate to Authentication → Sign-in method
**Step 3:** Enable "Email/Password" provider
**Step 4:** Save

---

### Task 13: End-to-End Manual Testing

**Step 1:** Run `npm start`

**Step 2: Test signup flow**
- Go to `/signup`
- Fill in name, shop name, email, password
- Submit → should redirect to `/`
- Check Firestore console: `tenants` and `users` collections should have new docs

**Step 3: Test logout**
- Click Logout in header → should redirect to `/login`
- Try navigating to `/` → should redirect to `/login`

**Step 4: Test login flow**
- Go to `/login`
- Enter the credentials from signup
- Submit → should redirect to `/`

**Step 5: Test data isolation**
- Create a bill → check Firestore, should have `tenantId` field
- Create a second account with different email/shop
- Verify that account 2 cannot see account 1's bills

**Step 6: Test protected routes**
- Open incognito window
- Navigate to `/shop/bills` → should redirect to `/login`

**Step 7: Commit any fixes**

---

### Task 14: Data Migration for Existing Documents (Optional)

If there is existing data in Firestore without `tenantId` fields, it will become inaccessible after the rules update. Two options:

**Option A: One-time migration script** — add a tenantId to all existing docs. Run this as a one-off Node.js script or from the Firebase console.

**Option B: Fresh start** — if the app is pre-production, delete existing data and start clean.

This task is deferred until the owner decides.

---

## Firestore Indexes Needed

After deployment, these composite indexes may be required (Firestore will show error links):

1. `bills` → `tenantId` ASC, `createdAt` DESC
2. `shopProducts` → `tenantId` ASC, `createdAt` DESC
3. `shopVendors` → `tenantId` ASC, `name` ASC
4. `activityLogs` → `tenantId` ASC, `timestamp` DESC
5. `activityLogs` → `tenantId` ASC, `tab` ASC, `timestamp` DESC
6. `priceList` → `tenantId` ASC, `createdAt` DESC
7. `transactions` → `tenantId` ASC, `date` DESC

Create these via the error links in browser console or add to `firestore.indexes.json`.
