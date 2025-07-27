import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Tabs, Tab, Box } from '@mui/material';
import Header from './shared/Header';

const Layout = ({ children }) => {
  const location = useLocation();
  
  const getTabValue = () => {
    switch (location.pathname) {
      case '/': return 0;
      case '/tasks': return 1;
      case '/office': return 2;
      case '/shop/bills': return 3;
      case '/shop/transactions': return 4;
      case '/shop/price-list': return 5;
      case '/settings': return 6;
      default: return 0;
    }
  };

  return (
    <div className="App">
      <Header />
      <Box>
        <Tabs value={getTabValue()}>
          <Tab label="Home" component={Link} to="/" />
          <Tab label="Tasks" component={Link} to="/tasks" />
          <Tab label="Office" component={Link} to="/office" />
          <Tab label="Shop Bills" component={Link} to="/shop/bills" />
          <Tab label="Shop Transactions" component={Link} to="/shop/transactions" />
          <Tab label="Price List" component={Link} to="/shop/price-list" />
          <Tab label="Settings" component={Link} to="/settings" />
        </Tabs>
      </Box>
      <main className="app-main">
        {children}
      </main>
    </div>
  );
};

export default Layout;