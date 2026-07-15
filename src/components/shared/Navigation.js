import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  CheckSquare,
  Briefcase,
  ShoppingCart,
  Settings,
  Menu,
  X,
  FileText,
  CreditCard,
  DollarSign,
  ChevronDown,
  Package,
  Users2
} from 'lucide-react';
import './Navigation.css';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/office', label: 'Office', icon: Briefcase },
];

const shopItems = [
  { path: '/shop', label: 'Overview', icon: ShoppingCart },
  { path: '/shop/bills', label: 'Bills', icon: FileText },
  { path: '/shop/products', label: 'Products', icon: Package },
  { path: '/shop/price-list', label: 'Price List', icon: DollarSign },
  { path: '/shop/vendors', label: 'Vendors', icon: Users2 },
];

const moreItems = [
  { path: '/office', label: 'Office', icon: Briefcase },
  ...shopItems,
  { path: '/transactions', label: 'Transactions', icon: CreditCard },
];

const useIsActive = () => {
  const location = useLocation();
  return (path) => {
    if (path === '/' || path === '/shop') return location.pathname === path;
    return location.pathname.startsWith(path);
  };
};

// Desktop pill bar — rendered inside the header (see Header.js)
export const DesktopNav = () => {
  const location = useLocation();
  const isActive = useIsActive();
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShopDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setShopDropdownOpen(false);
  }, [location.pathname]);

  return (
    <nav className="desktop-nav">
      <div className="nav-container">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            aria-label={item.label}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </Link>
        ))}

        {/* Shop Dropdown */}
        <div className="nav-dropdown" ref={dropdownRef}>
          <button
            className={`nav-item dropdown-trigger ${location.pathname.startsWith('/shop') ? 'active' : ''}`}
            onClick={() => setShopDropdownOpen(!shopDropdownOpen)}
            aria-label="Shop"
          >
            <ShoppingCart size={18} />
            <span>Shop</span>
            <ChevronDown
              size={14}
              className={`dropdown-arrow ${shopDropdownOpen ? 'open' : ''}`}
            />
          </button>

          {shopDropdownOpen && (
            <div className="dropdown-menu">
              {shopItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`dropdown-item ${isActive(item.path) ? 'active' : ''}`}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link
          to="/transactions"
          className={`nav-item ${isActive('/transactions') ? 'active' : ''}`}
          aria-label="Transactions"
        >
          <CreditCard size={18} />
          <span>Transactions</span>
        </Link>

      </div>
    </nav>
  );
};

const Navigation = () => {
  const location = useLocation();
  const isActive = useIsActive();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMoreMenuOpen(false);
  }, [location.pathname]);

  const isShopActive = () => {
    return location.pathname.startsWith('/shop');
  };

  // Mobile Bottom Navigation
  const MobileNav = () => (
    <>
      <nav className="mobile-nav">
        <Link to="/" className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}>
          <Home size={22} />
          <span>Home</span>
        </Link>

        <Link to="/tasks" className={`mobile-nav-item ${isActive('/tasks') ? 'active' : ''}`}>
          <CheckSquare size={22} />
          <span>Tasks</span>
        </Link>

        <Link
          to="/shop/bills"
          className={`mobile-nav-item ${isShopActive() ? 'active' : ''}`}
        >
          <ShoppingCart size={22} />
          <span>Shop</span>
        </Link>

        <Link to="/settings" className={`mobile-nav-item ${isActive('/settings') ? 'active' : ''}`}>
          <Settings size={22} />
          <span>Settings</span>
        </Link>

        <button
          className={`mobile-nav-item more-btn ${moreMenuOpen ? 'active' : ''}`}
          onClick={() => setMoreMenuOpen(!moreMenuOpen)}
        >
          {moreMenuOpen ? <X size={22} /> : <Menu size={22} />}
          <span>More</span>
        </button>
      </nav>

      {/* More Menu Overlay */}
      {moreMenuOpen && (
        <div className="more-menu-overlay" onClick={() => setMoreMenuOpen(false)}>
          <div
            className="more-menu"
            ref={moreMenuRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="more-menu-header">
              <span>More Options</span>
              <button className="close-btn" onClick={() => setMoreMenuOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="more-menu-items">
              {moreItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`more-menu-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => setMoreMenuOpen(false)}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );

  return <MobileNav />;
};

export default Navigation;
