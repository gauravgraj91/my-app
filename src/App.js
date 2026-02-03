import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import ErrorBoundary from './components/shared/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Office from './pages/Office';
import ShopBills from './pages/ShopBills';
import ShopTransactions from './pages/ShopTransactions';
import PriceList from './pages/PriceList';
import Settings from './pages/Settings';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/office" element={<Office />} />
            <Route path="/shop/bills" element={<ShopBills />} />
            <Route path="/shop/transactions" element={<ShopTransactions />} />
            <Route path="/shop/price-list" element={<PriceList />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;