import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Moon, Sun, Bell, Shield, Clock, Trash2, FileText } from "lucide-react";
import { subscribeActivityLogs, clearActivityLogs, migrateLocalStorageLogs } from '../../firebase/activityLogService';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../ui/ConfirmDialog';
import "./Settings.css";

const ACTION_BADGE = {
  created:    { bg: '#ecfdf5', color: '#059669' },
  duplicated: { bg: '#ecfdf5', color: '#059669' },
  updated:    { bg: '#eff6ff', color: '#2563eb' },
  assigned:   { bg: '#eff6ff', color: '#2563eb' },
  archived:   { bg: '#eff6ff', color: '#2563eb' },
  deleted:    { bg: '#fef2f2', color: '#dc2626' },
  removed:    { bg: '#fef2f2', color: '#dc2626' },
  exported:   { bg: '#f1f5f9', color: '#64748b' },
};

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + ' min ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days < 7) return days + 'd ago';
  return new Date(ts).toLocaleDateString();
}

const Settings = () => {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
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

  // Shop Dashboard Categories State
  const defaultCategories = ["Clothing", "Electronics", "Groceries", "Accessories", "Other"];

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('shopCategories');
    return saved ? JSON.parse(saved) : defaultCategories;
  });
  const [defaultCategory, setDefaultCategory] = useState(() => {
    const saved = localStorage.getItem('shopDefaultCategory');
    return saved ? saved : defaultCategories[0];
  });
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    localStorage.setItem('shopCategories', JSON.stringify(categories));
  }, [categories]);
  useEffect(() => {
    localStorage.setItem('shopDefaultCategory', defaultCategory);
  }, [defaultCategory]);

  const handleAddCategory = () => {
    const name = newCategory.trim();
    if (!name || categories.includes(name)) return;
    setCategories([...categories, name]);
    setNewCategory("");
  };
  const handleRemoveCategory = (name) => {
    if (name === defaultCategory) return;
    setCategories(categories.filter(c => c !== name));
  };

  // Activity Log state
  const [logFilter, setLogFilter] = useState('All');
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    migrateLocalStorageLogs();
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    setLogsLoading(true);
    const unsub = subscribeActivityLogs(tenantId, logFilter, (newLogs) => {
      setLogs(newLogs);
      setLogsLoading(false);
    });
    return unsub;
  }, [logFilter, tenantId]);

  const handleClearLogs = () => {
    setConfirmDialog({
      open: true,
      title: 'Clear Activity Log',
      message: 'Clear all activity log entries? This cannot be undone.',
      onConfirm: async () => {
        await clearActivityLogs(tenantId);
        setConfirmDialog(s => ({ ...s, open: false }));
      },
    });
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

      {/* Activity Log Section */}
      <div className="settings-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="section-title" style={{ margin: 0 }}>Activity Log</h3>
          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '8px',
                border: '1px solid #fecaca', background: '#fef2f2',
                fontSize: '13px', fontWeight: '500', color: '#dc2626',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <Trash2 size={14} />
              Clear Log
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          background: '#f1f5f9', borderRadius: '8px', padding: '3px',
          marginBottom: '16px', width: 'fit-content',
        }}>
          {['All', 'Bills', 'Products', 'Vendors'].map(tab => (
            <button
              key={tab}
              onClick={() => setLogFilter(tab)}
              style={{
                padding: '6px 16px', border: 'none', borderRadius: '6px',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                transition: 'all 0.15s',
                background: logFilter === tab ? '#1e293b' : 'transparent',
                color: logFilter === tab ? '#fff' : '#64748b',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Log Table */}
        <div className="settings-card" style={{ overflow: 'hidden' }}>
          {logsLoading ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#94a3b8' }}>Loading activity logs...</div>
            </div>
          ) : logs.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: '12px',
                    fontWeight: '600', color: '#64748b', textTransform: 'uppercase',
                    letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0',
                    background: '#f8fafc', width: '120px',
                  }}>
                    Time
                  </th>
                  <th style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: '12px',
                    fontWeight: '600', color: '#64748b', textTransform: 'uppercase',
                    letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0',
                    background: '#f8fafc', width: '100px',
                  }}>
                    Action
                  </th>
                  <th style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: '12px',
                    fontWeight: '600', color: '#64748b', textTransform: 'uppercase',
                    letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0',
                    background: '#f8fafc',
                  }}>
                    Entity
                  </th>
                  <th style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: '12px',
                    fontWeight: '600', color: '#64748b', textTransform: 'uppercase',
                    letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0',
                    background: '#f8fafc',
                  }}>
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => {
                  const badge = ACTION_BADGE[log.action] || ACTION_BADGE.exported;
                  return (
                    <tr key={log.id} style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 0 ? '#fff' : '#fafbfc',
                    }}>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={12} />
                          {timeAgo(log.timestamp)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
                          fontSize: '12px', fontWeight: '600',
                          background: badge.bg, color: badge.color,
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                          {log.entity}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>
                          {log.details || '\u2014'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <FileText size={40} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                No activity recorded yet
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                Actions on bills, products, and vendors will appear here
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(s => ({ ...s, open: false }))}
      />
    </div>
  );
};

export default Settings;
