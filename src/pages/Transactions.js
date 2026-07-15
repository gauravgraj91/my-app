import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import PillTabs from '../components/ui/PillTabs';

const Transactions = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname.includes('/transactions/personal') ? 'personal' : 'shop';

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 4px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>Transactions</h1>
        <PillTabs
          items={[{ value: 'shop', label: 'Shop' }, { value: 'personal', label: 'Personal' }]}
          value={activeTab}
          onChange={(tab) => navigate(`/transactions/${tab}`)}
        />
      </div>
      <Outlet />
    </div>
  );
};

export default Transactions;
