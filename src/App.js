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
