import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Moon, Sun, User, Bell, Shield } from "lucide-react";
import "./Settings.css";

const Settings = () => {
  const [theme, setTheme] = useState("light");
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  // Load settings from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    const savedNotifications = localStorage.getItem("notifications") !== "false";
    const savedAutoSave = localStorage.getItem("autoSave") !== "false";
    
    setTheme(savedTheme);
    setNotifications(savedNotifications);
    setAutoSave(savedAutoSave);
  }, []);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    // Apply theme to body
    document.body.classList.toggle("dark", newTheme === "dark");
  };

  const handleNotificationChange = (enabled) => {
    setNotifications(enabled);
    localStorage.setItem("notifications", enabled);
  };

  const handleAutoSaveChange = (enabled) => {
    setAutoSave(enabled);
    localStorage.setItem("autoSave", enabled);
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <SettingsIcon size={24} />
        <h2>Settings</h2>
      </div>
      
      <div className="settings-section">
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-icon">
              {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div>
              <h3>Theme</h3>
              <p>Choose your preferred appearance</p>
            </div>
          </div>
          <select 
            value={theme} 
            onChange={(e) => handleThemeChange(e.target.value)}
            className="setting-select"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-icon">
              <Bell size={20} />
            </div>
            <div>
              <h3>Notifications</h3>
              <p>Receive notifications for important updates</p>
            </div>
          </div>
          <label className="setting-toggle">
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => handleNotificationChange(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-icon">
              <Shield size={20} />
            </div>
            <div>
              <h3>Auto Save</h3>
              <p>Automatically save your changes</p>
            </div>
          </div>
          <label className="setting-toggle">
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => handleAutoSaveChange(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default Settings; 