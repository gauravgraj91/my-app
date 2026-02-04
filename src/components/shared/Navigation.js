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
  ChevronDown
} from 'lucide-react';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const moreMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShopDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setShopDropdownOpen(false);
    setMoreMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isShopActive = () => {
    return location.pathname.startsWith('/shop');
  };

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
    { path: '/office', label: 'Office', icon: Briefcase },
  ];

  const shopItems = [
    { path: '/shop/bills', label: 'Bills', icon: FileText },
    { path: '/shop/transactions', label: 'Transactions', icon: CreditCard },
    { path: '/shop/price-list', label: 'Price List', icon: DollarSign },
  ];

  const moreItems = [
    { path: '/office', label: 'Office', icon: Briefcase },
    ...shopItems,
  ];

  // Desktop Navigation
  const DesktopNav = () => (
    <nav className="desktop-nav">
      <div className="nav-container">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </Link>
        ))}

        {/* Shop Dropdown */}
        <div className="nav-dropdown" ref={dropdownRef}>
          <button
            className={`nav-item dropdown-trigger ${isShopActive() ? 'active' : ''}`}
            onClick={() => setShopDropdownOpen(!shopDropdownOpen)}
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
          to="/settings"
          className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
        >
          <Settings size={18} />
          <span>Settings</span>
        </Link>
      </div>
    </nav>
  );

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

  return (
    <>
      <DesktopNav />
      <MobileNav />
    </>
  );
};

export default Navigation;
