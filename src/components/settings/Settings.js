import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Moon, Sun, User, Bell, Shield } from "lucide-react";
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
        <SettingsIcon size={24} />
        <h2>Settings</h2>
      </div>
      
      <div className="settings-section">
        {/* General Settings */}
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

        {/* Shop Dashboard Settings Subsection */}
        <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '18px' }}>
          <div className="setting-info" style={{ alignItems: 'flex-start', gap: '12px' }}>
            <div className="setting-icon">
              <SettingsIcon size={20} />
            </div>
            <div>
              <h3>Shop Dashboard Settings</h3>
              <p>Configure table display, vendors, and categories for the shop dashboard</p>
            </div>
          </div>
          <div style={{ width: '100%', marginTop: '8px' }}>
            {/* Feature Toggles */}
            <div className="flex items-center gap-3 mb-2">
              <input type="checkbox" id="toggle-filtering" checked={tableSettings.filtering} onChange={e => setTableSettings(s => ({ ...s, filtering: e.target.checked }))} />
              <label htmlFor="toggle-filtering" className="font-medium">Enable Filtering</label>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <input type="checkbox" id="toggle-export" checked={tableSettings.showExport} onChange={e => setTableSettings(s => ({ ...s, showExport: e.target.checked }))} />
              <label htmlFor="toggle-export" className="font-medium">Enable Export</label>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <input type="checkbox" id="toggle-totals" checked={tableSettings.showTotals} onChange={e => setTableSettings(s => ({ ...s, showTotals: e.target.checked }))} />
              <label htmlFor="toggle-totals" className="font-medium">Show Totals Row</label>
            </div>
            <div className="mt-3">
              <div className="font-semibold mb-2">Column Visibility</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(tableSettings.columns).map(col => (
                  <div key={col} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`col-${col}`}
                      checked={tableSettings.columns[col]}
                      onChange={e => setTableSettings(s => ({ ...s, columns: { ...s.columns, [col]: e.target.checked } }))}
                    />
                    <label htmlFor={`col-${col}`}>{col.charAt(0).toUpperCase() + col.slice(1).replace(/([A-Z])/g, ' $1')}</label>
                  </div>
                ))}
              </div>
            </div>
            {/* Vendors Management */}
            <div className="mt-6">
              <div className="font-semibold mb-2">Vendors</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {vendors.map(vendor => (
                  <span key={vendor} style={{ display: 'inline-flex', alignItems: 'center', background: '#f1f5f9', borderRadius: 8, padding: '4px 10px', marginRight: 4 }}>
                    {vendor}
                    {vendor !== defaultVendor && (
                      <button style={{ marginLeft: 6, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} title="Remove" onClick={() => handleRemoveVendor(vendor)}>&times;</button>
                    )}
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newVendor}
                  onChange={e => setNewVendor(e.target.value)}
                  placeholder="Add vendor"
                  className="setting-select"
                  style={{ minWidth: 120 }}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddVendor(); }}
                />
                <button className="dashboard-btn-secondary" type="button" onClick={handleAddVendor}>Add Vendor</button>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="default-vendor" className="font-medium">Default Vendor:</label>
                <select
                  id="default-vendor"
                  value={defaultVendor}
                  onChange={e => setDefaultVendor(e.target.value)}
                  className="setting-select"
                  style={{ minWidth: 120 }}
                >
                  {vendors.map(vendor => (
                    <option key={vendor} value={vendor}>{vendor}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Categories Management */}
            <div className="mt-6">
              <div className="font-semibold mb-2">Categories</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {categories.map(category => (
                  <span key={category} style={{ display: 'inline-flex', alignItems: 'center', background: '#f1f5f9', borderRadius: 8, padding: '4px 10px', marginRight: 4 }}>
                    {category}
                    {category !== defaultCategory && (
                      <button style={{ marginLeft: 6, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} title="Remove" onClick={() => handleRemoveCategory(category)}>&times;</button>
                    )}
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  placeholder="Add category"
                  className="setting-select"
                  style={{ minWidth: 120 }}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
                />
                <button className="dashboard-btn-secondary" type="button" onClick={handleAddCategory}>Add Category</button>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="default-category" className="font-medium">Default Category:</label>
                <select
                  id="default-category"
                  value={defaultCategory}
                  onChange={e => setDefaultCategory(e.target.value)}
                  className="setting-select"
                  style={{ minWidth: 120 }}
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
    </div>
  );
};

export default Settings; 