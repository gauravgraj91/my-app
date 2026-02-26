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
