import React, { useState, useEffect } from 'react';
import { Moon, Sun, Settings } from 'lucide-react';
import './Header.css';

const Header = ({ onSettingsClick }) => {
  const [darkMode, setDarkMode] = useState(false);

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
        <h1 className="app-title">Personal Dashboard</h1>
        <div className="header-controls">
          <button
            className="header-btn dark-mode-toggle"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            className="header-btn settings-btn"
            onClick={onSettingsClick}
            aria-label="Open settings"
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 