import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import ErrorBoundary from './components/shared/ErrorBoundary';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './components/ui/NotificationSystem';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Tasks = React.lazy(() => import('./pages/Tasks'));
const Office = React.lazy(() => import('./pages/Office'));
const Shop = React.lazy(() => import('./components/shop/shop'));
const HomeView = React.lazy(() => import('./components/shop/HomeView'));
const BillsView = React.lazy(() => import('./components/shop/BillsView'));
const ProductsView = React.lazy(() => import('./components/shop/ProductsView'));
const PriceList = React.lazy(() => import('./components/shop/PriceList'));
const VendorsView = React.lazy(() => import('./components/shop/VendorsView'));
const ExpiryView = React.lazy(() => import('./components/shop/ExpiryView'));
const ShopTransactions = React.lazy(() => import('./pages/ShopTransactions'));
const Transactions = React.lazy(() => import('./pages/Transactions'));
const PersonalTransactions = React.lazy(() => import('./pages/PersonalTransactions'));
const Settings = React.lazy(() => import('./pages/Settings'));

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <NotificationProvider maxNotifications={5}>
            <Suspense fallback={
              <div style={{
                minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--muted-foreground)', fontSize: 14, fontWeight: 600
              }}>
                Loading…
              </div>
            }>
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
                    <Route path="expiry" element={<ExpiryView />} />
                    <Route path="transactions" element={<Navigate to="/transactions/shop" replace />} />
                  </Route>
                  <Route path="/transactions" element={<Transactions />}>
                    <Route index element={<Navigate to="shop" replace />} />
                    <Route path="shop" element={<ShopTransactions />} />
                    <Route path="personal" element={<PersonalTransactions />} />
                  </Route>
                  <Route path="/settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
