import React, { useState, useEffect } from 'react';
import { Moon, Sun, LayoutDashboard, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../firebase/authService';
import './Header.css';

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = async () => {
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
          <div className="brand-logo">
            <LayoutDashboard size={24} />
          </div>
          <h1 className="app-title">Personal Dashboard</h1>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} />
                {user.displayName || user.email}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '6px',
                  background: 'var(--card)', fontSize: '13px', color: 'var(--muted-foreground)',
                  cursor: 'pointer',
                }}
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 