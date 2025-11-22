import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Moon, Sun, Bell, Shield } from "lucide-react";
import "./Settings.css";

const Settings = () => {
  const [theme, setTheme] = useState("light");
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [tableSettings, setTableSettings] = useState(() => {
    const saved = localStorage.getItem('tableSettings');
    return saved
      ? JSON.parse(saved)
      : {
        filtering: true,
        showExport: true,
        showTotals: true,
        columns: {
          billNumber: true,
          date: true,
          productName: true,
          category: true,
          vendor: true,
          mrp: true,
          totalQuantity: true,
          totalAmount: true,
          pricePerPiece: true,
          profitPerPiece: true,
          totalProfit: true,
          actions: true,
        },
      };
  });

  useEffect(() => {
    localStorage.setItem('tableSettings', JSON.stringify(tableSettings));
  }, [tableSettings]);

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

  // Shop Dashboard Vendors & Categories State
  const defaultVendors = ["ABC Suppliers", "XYZ Distributors", "Local Market", "Online Store", "Direct Import", "Other"];
  const defaultCategories = ["Clothing", "Electronics", "Groceries", "Accessories", "Other"];

  const [vendors, setVendors] = useState(() => {
    const saved = localStorage.getItem('shopVendors');
    return saved ? JSON.parse(saved) : defaultVendors;
  });
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('shopCategories');
    return saved ? JSON.parse(saved) : defaultCategories;
  });
  const [defaultVendor, setDefaultVendor] = useState(() => {
    const saved = localStorage.getItem('shopDefaultVendor');
    return saved ? saved : defaultVendors[0];
  });
  const [defaultCategory, setDefaultCategory] = useState(() => {
    const saved = localStorage.getItem('shopDefaultCategory');
    return saved ? saved : defaultCategories[0];
  });
  // Inputs for adding
  const [newVendor, setNewVendor] = useState("");
  const [newCategory, setNewCategory] = useState("");

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('shopVendors', JSON.stringify(vendors));
  }, [vendors]);
  useEffect(() => {
    localStorage.setItem('shopCategories', JSON.stringify(categories));
  }, [categories]);
  useEffect(() => {
    localStorage.setItem('shopDefaultVendor', defaultVendor);
  }, [defaultVendor]);
  useEffect(() => {
    localStorage.setItem('shopDefaultCategory', defaultCategory);
  }, [defaultCategory]);

  // Add vendor/category handlers
  const handleAddVendor = () => {
    const name = newVendor.trim();
    if (!name || vendors.includes(name)) return;
    setVendors([...vendors, name]);
    setNewVendor("");
  };
  const handleAddCategory = () => {
    const name = newCategory.trim();
    if (!name || categories.includes(name)) return;
    setCategories([...categories, name]);
    setNewCategory("");
  };
  // Remove vendor/category handlers
  const handleRemoveVendor = (name) => {
    if (name === defaultVendor) return;
    setVendors(vendors.filter(v => v !== name));
  };
  const handleRemoveCategory = (name) => {
    if (name === defaultCategory) return;
    setCategories(categories.filter(c => c !== name));
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <SettingsIcon size={32} />
        <h2>Settings</h2>
      </div>

      <div className="settings-section">
        <h3 className="section-title">General Preferences</h3>
        <div className="settings-card">
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

      <div className="settings-section">
        <h3 className="section-title">Shop Dashboard</h3>
        <div className="shop-settings-grid">
          {/* Display & Columns Card */}
          <div className="settings-card" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h4 className="subsection-title">Display Options</h4>
              <div className="checkbox-group">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={tableSettings.filtering}
                    onChange={e => setTableSettings(s => ({ ...s, filtering: e.target.checked }))}
                  />
                  Enable Filtering
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={tableSettings.showExport}
                    onChange={e => setTableSettings(s => ({ ...s, showExport: e.target.checked }))}
                  />
                  Enable Export
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={tableSettings.showTotals}
                    onChange={e => setTableSettings(s => ({ ...s, showTotals: e.target.checked }))}
                  />
                  Show Totals Row
                </label>
              </div>
            </div>

            <div>
              <h4 className="subsection-title">Column Visibility</h4>
              <div className="columns-grid">
                {Object.keys(tableSettings.columns).map(col => (
                  <label key={col} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={tableSettings.columns[col]}
                      onChange={e => setTableSettings(s => ({ ...s, columns: { ...s.columns, [col]: e.target.checked } }))}
                    />
                    {col.charAt(0).toUpperCase() + col.slice(1).replace(/([A-Z])/g, ' $1')}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Vendors Card */}
          <div className="settings-card" style={{ padding: '24px' }}>
            <h4 className="subsection-title">Vendors</h4>
            <div className="tags-container">
              {vendors.map(vendor => (
                <span key={vendor} className="tag-item">
                  {vendor}
                  {vendor !== defaultVendor && (
                    <button
                      className="tag-remove"
                      onClick={() => handleRemoveVendor(vendor)}
                      title="Remove vendor"
                    >
                      &times;
                    </button>
                  )}
                </span>
              ))}
            </div>

            <div className="add-item-row">
              <input
                type="text"
                value={newVendor}
                onChange={e => setNewVendor(e.target.value)}
                placeholder="Add vendor..."
                className="setting-select"
                style={{ flex: 1, minWidth: 0 }}
                onKeyDown={e => { if (e.key === 'Enter') handleAddVendor(); }}
              />
              <button
                className="dashboard-btn-secondary"
                onClick={handleAddVendor}
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
              >
                Add
              </button>
            </div>

            <div style={{ marginTop: '16px' }}>
              <label className="subsection-title" style={{ fontSize: '0.875rem', marginBottom: '8px' }}>
                Default Vendor
              </label>
              <select
                value={defaultVendor}
                onChange={e => setDefaultVendor(e.target.value)}
                className="setting-select"
                style={{ width: '100%' }}
              >
                {vendors.map(vendor => (
                  <option key={vendor} value={vendor}>{vendor}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Categories Card */}
          <div className="settings-card" style={{ padding: '24px' }}>
            <h4 className="subsection-title">Categories</h4>
            <div className="tags-container">
              {categories.map(category => (
                <span key={category} className="tag-item">
                  {category}
                  {category !== defaultCategory && (
                    <button
                      className="tag-remove"
                      onClick={() => handleRemoveCategory(category)}
                      title="Remove category"
                    >
                      &times;
                    </button>
                  )}
                </span>
              ))}
            </div>

            <div className="add-item-row">
              <input
                type="text"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="Add category..."
                className="setting-select"
                style={{ flex: 1, minWidth: 0 }}
                onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
              />
              <button
                className="dashboard-btn-secondary"
                onClick={handleAddCategory}
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
              >
                Add
              </button>
            </div>

            <div style={{ marginTop: '16px' }}>
              <label className="subsection-title" style={{ fontSize: '0.875rem', marginBottom: '8px' }}>
                Default Category
              </label>
              <select
                value={defaultCategory}
                onChange={e => setDefaultCategory(e.target.value)}
                className="setting-select"
                style={{ width: '100%' }}
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 