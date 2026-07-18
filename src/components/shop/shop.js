import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { List, Grid, Tag, Users, LayoutDashboard, CalendarClock } from 'lucide-react';
import './Shop.css';
import PillTabs from '../ui/PillTabs';
import { BillsProvider } from '../../context/BillsContext';
import { VendorsProvider } from '../../context/VendorsContext';

const TABS = [
  { key: '', label: 'Home', icon: LayoutDashboard },
  { key: 'bills', label: 'Bills', icon: List },
  { key: 'products', label: 'Products', icon: Grid },
  { key: 'price-list', label: 'Price List', icon: Tag },
  { key: 'vendors', label: 'Vendors', icon: Users },
  { key: 'expiry', label: 'Expiry', icon: CalendarClock },
];

const Shop = () => {
  const location = useLocation();
  const navigate = useNavigate();

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
            <PillTabs
              size="sm"
              items={TABS.map(({ key, label, icon }) => ({ value: key, label, icon, ariaLabel: `${label} View` }))}
              value={activeTab}
              onChange={(key) => navigate(key ? `/shop/${key}` : '/shop')}
            />
          </div>

          <Outlet />
        </div>
      </VendorsProvider>
    </BillsProvider>
  );
};

export default Shop;
