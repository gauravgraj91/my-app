import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { List, Grid, Tag, Users, LayoutDashboard, CreditCard } from 'lucide-react';
import './Shop.css';
import { BillsProvider } from '../../context/BillsContext';
import { VendorsProvider } from '../../context/VendorsContext';

const TABS = [
  { key: '', label: 'Home', icon: LayoutDashboard },
  { key: 'bills', label: 'Bills', icon: List },
  { key: 'products', label: 'Products', icon: Grid },
  { key: 'price-list', label: 'Price List', icon: Tag },
  { key: 'vendors', label: 'Vendors', icon: Users },
  { key: 'transactions', label: 'Transactions', icon: CreditCard },
];

const Shop = () => {
  const location = useLocation();

  const getActiveTab = () => {
    const path = location.pathname.replace(/\/$/, '');
    if (path === '/shop') return '';
    const segment = path.split('/shop/')[1] || '';
    return segment;
  };

  const activeTab = getActiveTab();

  return (
    <BillsProvider>
      <VendorsProvider>
        <div className="dashboard-container">
          <div className="dashboard-card dashboard-header">
            <h1 className="dashboard-title">Shop Dashboard</h1>
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {TABS.map(({ key, label, icon: Icon }) => (
                <Link
                  key={key}
                  to={key ? `/shop/${key}` : '/shop'}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                  }`}
                  style={{ textDecoration: 'none' }}
                  aria-label={`${label} View`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <Outlet />
        </div>
      </VendorsProvider>
    </BillsProvider>
  );
};

export default Shop;
