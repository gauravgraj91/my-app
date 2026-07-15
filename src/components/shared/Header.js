import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../firebase/authService';
import { DesktopNav } from './Navigation';
import './Header.css';

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const firstName = (user?.displayName || user?.email || '').split(/[\s@]/)[0];
  const initial = firstName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await logout();
    } catch (err) {
      // Navigate to login even if sign-out fails
    }
    navigate('/login');
  };

  useEffect(() => {
    // Load dark mode preference from localStorage
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    document.body.classList.toggle('dark', savedDarkMode);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);
    document.body.classList.toggle('dark', newDarkMode);
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-brand">
          <h1 className="app-title">dukaan<span className="brand-asterisk">*</span></h1>
        </div>
        <div className="header-nav">
          <DesktopNav />
        </div>
        <div className="header-controls">
          <button
            className="header-btn dark-mode-toggle"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {user && (
            <div className="profile-menu-container" ref={menuRef}>
              <button
                className="profile-pill"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="profile-avatar">{initial}</span>
                <span className="profile-name">{firstName}</span>
                <ChevronDown size={16} className={`profile-chevron ${menuOpen ? 'open' : ''}`} />
              </button>
              {menuOpen && (
                <div className="profile-menu" role="menu">
                  <div className="profile-menu-identity">
                    <span className="profile-avatar profile-avatar-lg">{initial}</span>
                    <div>
                      <div className="profile-menu-name">{user.displayName || firstName}</div>
                      <div className="profile-menu-email">{user.email}</div>
                    </div>
                  </div>
                  <div className="profile-menu-section">
                    <button
                      className="profile-menu-item"
                      role="menuitem"
                      onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>
                    <button className="profile-menu-item" role="menuitem" onClick={toggleDarkMode}>
                      <Moon size={16} />
                      <span>Dark mode</span>
                      <span className={`menu-switch ${darkMode ? 'on' : ''}`}>
                        <span className="menu-switch-knob" />
                      </span>
                    </button>
                  </div>
                  <div className="profile-menu-section">
                    <button className="profile-menu-item profile-menu-danger" role="menuitem" onClick={handleLogout}>
                      <LogOut size={16} />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
