import React from 'react';
import Header from './shared/Header';
import Navigation from './shared/Navigation';

const Layout = ({ children }) => {
  return (
    <div className="App">
      <Header />
      <Navigation />
      <main className="app-main">
        {children}
      </main>
    </div>
  );
};

export default Layout;