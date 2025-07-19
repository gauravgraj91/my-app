import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Search, X, Download, Plus, Save as SaveIcon, ChevronDown, Moon, Sun, Check, Trash2, Pencil, Calendar, Settings as SettingsIcon } from 'lucide-react';
import './Shop.css';
import ShopTransactions from './shopTransactions';
import PriceList from './PriceList';
import ProductModal from './ProductModal';
import {
  addShopProduct,
  subscribeToShopProducts,
  deleteShopProduct,
  updateShopProduct
} from '../../firebase/shopProductService';
import { format } from 'date-fns';

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d", "#8dd1e1", "#a4de6c", "#d0ed57"];
// Remove hardcoded CATEGORIES and VENDORS
// const CATEGORIES = ['Clothing', 'Electronics', 'Groceries', 'Accessories', 'Other'];
// const VENDORS = ['ABC Suppliers', 'XYZ Distributors', 'Local Market', 'Online Store', 'Direct Import', 'Other'];

// Read from localStorage or use sensible defaults
const defaultCategories = ['Clothing', 'Electronics', 'Groceries', 'Accessories', 'Other'];
const defaultVendors = ['ABC Suppliers', 'XYZ Distributors', 'Local Market', 'Online Store', 'Direct Import', 'Other'];

function getShopCategories() {
  const saved = localStorage.getItem('shopCategories');
  return saved ? JSON.parse(saved) : defaultCategories;
}
function getShopVendors() {
  const saved = localStorage.getItem('shopVendors');
  return saved ? JSON.parse(saved) : defaultVendors;
}
function getDefaultCategory() {
  const saved = localStorage.getItem('shopDefaultCategory');
  return saved ? saved : defaultCategories[0];
}
function getDefaultVendor() {
  const saved = localStorage.getItem('shopDefaultVendor');
  return saved ? saved : defaultVendors[0];
}

const Shop = () => {
  const [data, setData] = useState([
    // Test data to ensure charts work
    {
      id: 'test1',
      productName: 'Test Product 1',
      totalAmount: 1000,
      category: 'Electronics',
      vendor: 'Test Vendor'
    },
    {
      id: 'test2', 
      productName: 'Test Product 2',
      totalAmount: 500,
      category: 'Clothing',
      vendor: 'Test Vendor 2'
    }
  ]);
  const [editingCell, setEditingCell] = useState(null);
  const [tempEditValue, setTempEditValue] = useState("");
  const [pieChartData, setPieChartData] = useState([]);
  const [profitPieChartData, setProfitPieChartData] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [showSaveAnimation, setShowSaveAnimation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [lastActionType, setLastActionType] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [editingDateId, setEditingDateId] = useState(null);
  const [tempDate, setTempDate] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  // Add sorting and filtering state
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');

  // Table settings state with persistence
  const defaultTableSettings = {
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
    }
  };
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tableSettings, setTableSettings] = useState(() => {
    const saved = localStorage.getItem('tableSettings');
    return saved ? JSON.parse(saved) : defaultTableSettings;
  });
  // Persist tableSettings to localStorage
  useEffect(() => {
    localStorage.setItem('tableSettings', JSON.stringify(tableSettings));
  }, [tableSettings]);

  const [categories, setCategories] = useState(getShopCategories());
  const [vendors, setVendors] = useState(getShopVendors());
  const [defaultCategory, setDefaultCategory] = useState(getDefaultCategory());
  const [defaultVendor, setDefaultVendor] = useState(getDefaultVendor());

  // Keep categories/vendors/defaults in sync with localStorage (in case settings page changes them)
  useEffect(() => {
    const sync = () => {
      setCategories(getShopCategories());
      setVendors(getShopVendors());
      setDefaultCategory(getDefaultCategory());
      setDefaultVendor(getDefaultVendor());
    };
    window.addEventListener('storage', sync);
    // Also poll on mount in case of SPA navigation
    sync();
    return () => window.removeEventListener('storage', sync);
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToShopProducts((products) => {
      console.log('Firebase data loaded:', products);
      setData(products);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Clear notifications after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  useEffect(() => {
    updatePieChartData();
    updateProfitPieChartData();
  }, [data]);

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const updatePieChartData = () => {
    const newPieChartData = data.map(item => ({
      name: item.productName || 'Unnamed Product',
      value: item.totalAmount || 0
    }));
    setPieChartData(newPieChartData);
  };

  const updateProfitPieChartData = () => {
    const totalNettAmount = calculateTotalAmount();
    const totalProfit = calculateTotalProfit();
    const newProfitPieChartData = [
      { name: 'Nett Amount', value: totalNettAmount - totalProfit },
      { name: 'Total Profit', value: totalProfit }
    ];
    setProfitPieChartData(newProfitPieChartData);
  };

  const handleSave = async () => {
    try {
      setShowSaveAnimation(true);
      setSuccess("Data saved successfully!");
      setTimeout(() => setShowSaveAnimation(false), 2000);
    } catch (error) {
      setError("Failed to save data. Please try again.");
    }
  };

  const handleCellEdit = async (id, field, value) => {
    try {
      let updatedData = { [field]: value };
      if (field === "totalAmount" || field === "totalQuantity") {
        const product = data.find(item => item.id === id);
        const totalQuantity = field === "totalQuantity" ? value : (product?.totalQuantity || 0);
        const totalAmount = field === "totalAmount" ? value : (product?.totalAmount || 0);
        if (totalQuantity > 0) {
          updatedData.pricePerPiece = (totalAmount / totalQuantity).toFixed(2);
        }
      }
      if (field === "mrp" || field === "pricePerPiece" || field === "totalAmount" || field === "totalQuantity") {
        const product = data.find(item => item.id === id);
        const mrp = field === "mrp" ? value : (product?.mrp || 0);
        const pricePerPiece = field === "pricePerPiece" ? value : (product?.pricePerPiece || 0);
        updatedData.profitPerPiece = (mrp - pricePerPiece).toFixed(2);
      }
      await updateShopProduct(id, updatedData);
      setEditingCell(null);
    } catch (error) {
      console.error('Error updating product:', error);
      setError('Failed to update product. Please try again.');
    }
  };

  const handleKeyDown = (e, id, field, value) => {
    if (e.key === "Enter") {
      handleCellEdit(id, field, value);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  // Toast helper
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2500);
  };

  const handleAddRow = async () => {
    try {
      const newProduct = {
        billNumber: `00${data.length + 1}`,
        date: new Date().toISOString().split("T")[0],
        productName: "",
        category: defaultCategory,
        vendor: defaultVendor,
        mrp: 0,
        totalQuantity: 0,
        totalAmount: 0,
        pricePerPiece: 0,
        profitPerPiece: 0
      };
      await addShopProduct(newProduct);
      showToast("Product added successfully!", 'success');
    } catch (error) {
      showToast('Failed to add product. Please try again.', 'error');
    }
  };

  const handleDeleteRow = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteShopProduct(id);
        showToast("Product deleted successfully!", 'error');
      } catch (error) {
        showToast('Failed to delete product. Please try again.', 'error');
      }
    }
  };

  const handleRowClick = (row) => {
    setSelectedProduct(row);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedProduct(null);
  };

  const handleModalSave = async (updatedProduct) => {
    try {
      await updateShopProduct(updatedProduct.id, updatedProduct);
      showToast('Product updated successfully!', 'success');
      setModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      showToast('Failed to update product. Please try again.', 'error');
    }
  };

  const formatCurrency = value => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR"
    }).format(value);
  };

  // Helper function to get visible columns
  const getVisibleColumns = () => {
    const allColumns = [
      { key: 'billNumber', label: 'Bill Number', sortable: true },
      { key: 'date', label: 'Date', sortable: true },
      { key: 'productName', label: 'Product Name', sortable: true },
      { key: 'category', label: 'Category', sortable: true },
      { key: 'vendor', label: 'Vendor', sortable: true },
      { key: 'mrp', label: 'MRP', sortable: true, align: 'right' },
      { key: 'totalQuantity', label: 'Qty / Units', sortable: true, align: 'right' },
      { key: 'totalAmount', label: 'Nett Amount', sortable: true, align: 'right' },
      { key: 'pricePerPiece', label: 'Price per Unit', align: 'right' },
      { key: 'profitPerPiece', label: 'Profit per Unit', align: 'right' },
      { key: 'totalProfit', label: 'Total Profit', align: 'right' },
      { key: 'actions', label: 'Actions' }
    ];

    return allColumns.filter(col => tableSettings.columns[col.key]);
  };

  const renderEditableCell = (row, field, type = "text") => {
    const isEditing = editingCell === `${row.id}-${field}`;
    const value = row[field] || "";
    if (isEditing) {
      return (
        <input
          type={type}
          value={tempEditValue}
          onChange={e => setTempEditValue(e.target.value)}
          onKeyDown={e =>
            handleKeyDown(
              e,
              row.id,
              field,
              type === "number" ? parseFloat(tempEditValue) : tempEditValue
            )
          }
          onBlur={() =>
            handleCellEdit(
              row.id,
              field,
              type === "number" ? parseFloat(tempEditValue) : tempEditValue
            )
          }
          className="dashboard-input"
          aria-label={field}
        />
      );
    } else {
      return (
        <span
          onClick={() => {
            setEditingCell(`${row.id}-${field}`);
            setTempEditValue(value.toString());
          }}
          className="cursor-pointer"
        >
          {field === "totalQuantity"
            ? value
            : type === "number"
              ? formatCurrency(value)
              : value}
        </span>
      );
    }
  };

  const calculateTotalAmount = () => {
    return data.reduce((total, item) => total + (item.totalAmount || 0), 0);
  };

  const calculateTotalProfit = () => {
    return data.reduce((total, item) => total + ((item.profitPerPiece || 0) * (item.totalQuantity || 0)), 0);
  };

  const calculateProfitPerPiece = (mrp, pricePerPiece) => {
    return (mrp - pricePerPiece).toFixed(2);
  };

  // Combine search, filters, and sorting
  const processedData = data
    // Filter by search
    .filter(row => {
      const searchLower = search.toLowerCase();
      return (
        row.productName?.toLowerCase().includes(searchLower) ||
        row.billNumber?.toLowerCase().includes(searchLower)
      );
    })
    // Filter by category
    .filter(row => {
      if (!filterCategory) return true;
      return row.category === filterCategory;
    })
    // Filter by price range (MRP)
    .filter(row => {
      const min = filterPriceMin !== '' ? parseFloat(filterPriceMin) : null;
      const max = filterPriceMax !== '' ? parseFloat(filterPriceMax) : null;
      if (min !== null && (row.mrp ?? 0) < min) return false;
      if (max !== null && (row.mrp ?? 0) > max) return false;
      return true;
    });

  // Sort processed data
  const sortedData = React.useMemo(() => {
    if (!sortColumn) return processedData;
    const sorted = [...processedData].sort((a, b) => {
      let aValue = a[sortColumn];
      let bValue = b[sortColumn];
      // For date, convert to Date object
      if (sortColumn === 'date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      // For string, compare case-insensitive
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [processedData, sortColumn, sortDirection]);

  // Sorting helpers
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  const renderSortIcon = (column) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? '▲' : '▼';
  };

  // Category color mapping and icon
  const categoryTag = (cat) => {
    let color = 'bg-gray-100 text-gray-800';
    let icon = <span className="mr-1">📦</span>;
    switch ((cat || '').toLowerCase()) {
      case 'groceries': color = 'bg-green-100 text-green-800'; icon = <span className="mr-1">🛒</span>; break;
      case 'electronics': color = 'bg-blue-100 text-blue-800'; icon = <span className="mr-1">💻</span>; break;
      case 'accessories': color = 'bg-orange-100 text-orange-800'; icon = <span className="mr-1">🧢</span>; break;
      case 'clothing': color = 'bg-purple-100 text-purple-800'; icon = <span className="mr-1">👕</span>; break;
    }
    return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${color}`}>{icon}{cat || ''}</span>;
  };

  // Date formatting helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  // Date cell rendering
  const renderDateCell = (row) => {
    if (editingDateId === row.id) {
      return (
        <form onSubmit={async (e) => {
          e.preventDefault();
          await handleCellEdit(row.id, 'date', tempDate);
          setEditingDateId(null);
        }} className="flex items-center gap-2">
          <input
            type="date"
            value={tempDate}
            onChange={e => setTempDate(e.target.value)}
            className="dashboard-input"
            aria-label="Edit Date"
            autoFocus
            onBlur={() => setEditingDateId(null)}
            style={{ minWidth: 120 }}
          />
          <button type="submit" className="text-blue-600 font-bold" aria-label="Save Date">OK</button>
        </form>
      );
    }
    return (
      <button
        className="flex items-center gap-1 text-gray-700 hover:text-blue-600 focus:outline-none whitespace-nowrap"
        onClick={() => { setEditingDateId(row.id); setTempDate(row.date || ''); }}
        aria-label="Edit Date"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <Calendar size={16} />
        <span>{formatDate(row.date)}</span>
      </button>
    );
  };

  // CSV export helper
  const toCsv = (rows) => {
    if (!rows.length) return '';
    const headers = [
      'Bill Number', 'Date', 'Product Name', 'Category', 'MRP', 'Qty / Units', 'Nett Amount', 'Price per Unit', 'Profit per Unit', 'Total Profit'
    ];
    const csvRows = [headers.join(',')];
    rows.forEach(row => {
      csvRows.push([
        row.billNumber,
        formatDate(row.date),
        row.productName,
        row.category,
        row.mrp,
        row.totalQuantity,
        row.totalAmount,
        row.pricePerPiece,
        row.profitPerPiece,
        (row.profitPerPiece * row.totalQuantity)
      ].map(val => `"${val ?? ''}"`).join(','));
    });
    return csvRows.join('\n');
  };

  const downloadCsv = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    const csv = toCsv(data);
    downloadCsv(csv, 'all_products.csv');
    setExportOpen(false);
  };
  const handleExportVisible = () => {
    const csv = toCsv(processedData); // Use processedData for export
    downloadCsv(csv, 'visible_products.csv');
    setExportOpen(false);
  };

  // Helper for category dropdown with icons
  const categoryOptions = [
    { value: '', label: 'All Categories', icon: '📦' },
    ...categories.map(cat => ({
      value: cat,
      label: cat,
      icon: (() => {
        switch (cat.toLowerCase()) {
          case 'clothing': return '👕';
          case 'electronics': return '💻';
          case 'groceries': return '🛒';
          case 'accessories': return '🧢';
          default: return '📦';
        }
      })()
    }))
  ];

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="text-center text-lg">Loading shop data...</div>
      </div>
    );
  }

  return (
    <div className={`dashboard-container${darkMode ? ' dark' : ''}`}>
      <div className="dashboard-card dashboard-header">
        <h1 className="dashboard-title">Shop Dashboard</h1>
        <button
          aria-label="Toggle dark mode"
          className="dashboard-dark-toggle"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? <Sun /> : <Moon />}
        </button>
      </div>



      {/* Simplified Charts Section with CSS-based charts */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4 px-4">Analytics Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Row 1: Sales and Profit Charts */}
          <div className="dashboard-card dashboard-chart shadow-lg border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-5 py-3 border-b border-blue-200">
              <h2 className="dashboard-chart-title flex items-center justify-between">
                <span className="font-semibold text-blue-800">Product Sales</span>
                <div className="text-xs font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
                  By Amount
                </div>
              </h2>
            </div>
                        <div className="p-4">
              {data.length > 0 ? (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.slice(0, 5).map((item, index) => ({
                          name: item.productName || 'Unnamed',
                          value: parseFloat(item.totalAmount) || 0
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {data.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value), 'Amount']}
                        labelFormatter={(label) => `Product: ${label}`}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'No Data', value: 1, color: '#e5e7eb' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                      >
                        <Cell fill="#e5e7eb" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="text-center text-gray-500 mt-2">
                    <div className="text-sm">No sales data available</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-card dashboard-chart shadow-lg border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-green-100 px-5 py-3 border-b border-green-200">
              <h2 className="dashboard-chart-title flex items-center justify-between">
                <span className="font-semibold text-green-800">Profit Analysis</span>
                <div className="text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full border border-green-200">
                  Nett vs Profit
                </div>
              </h2>
            </div>
            <div className="p-4">
              {calculateTotalProfit() > 0 ? (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Nett Amount', value: calculateTotalAmount() - calculateTotalProfit() },
                          { name: 'Total Profit', value: calculateTotalProfit() }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#10b981" />
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value), 'Amount']}
                        labelFormatter={(label) => label}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-60 text-gray-500">
                  <div className="text-center">
                    <div className="text-4xl mb-2">💰</div>
                    <div>No profit data available</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Category and Vendor Charts */}
          <div className="dashboard-card dashboard-chart shadow-lg border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-5 py-3 border-b border-purple-200">
              <h2 className="dashboard-chart-title flex items-center justify-between">
                <span className="font-semibold text-purple-800">Category Analysis</span>
                <div className="text-xs font-medium text-purple-700 bg-purple-100 px-3 py-1 rounded-full border border-purple-200">
                  By Sales
                </div>
              </h2>
            </div>
            <div className="p-4">
              {(() => {
                const categoryData = Object.entries(
                  data.reduce((acc, item) => {
                    const category = item.category || 'Uncategorized';
                    acc[category] = (acc[category] || 0) + (item.totalAmount || 0);
                    return acc;
                  }, {})
                ).map(([name, value]) => ({ name, value }));

                const totalValue = categoryData.reduce((sum, item) => sum + item.value, 0);

                return categoryData.length > 0 ? (
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [formatCurrency(value), 'Amount']}
                          labelFormatter={(label) => `Category: ${label}`}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-60 text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📦</div>
                      <div>No category data available</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="dashboard-card dashboard-chart shadow-lg border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 px-5 py-3 border-b border-amber-200">
              <h2 className="dashboard-chart-title flex items-center justify-between">
                <span className="font-semibold text-amber-800">Vendor Analysis</span>
                <div className="text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                  By Purchase
                </div>
              </h2>
            </div>
            <div className="p-4">
              {(() => {
                const vendorData = Object.entries(
                  data.reduce((acc, item) => {
                    const vendor = item.vendor || 'Unknown';
                    acc[vendor] = (acc[vendor] || 0) + (item.totalAmount || 0);
                    return acc;
                  }, {})
                ).map(([name, value]) => ({ name, value }));

                const totalValue = vendorData.reduce((sum, item) => sum + item.value, 0);

                return vendorData.length > 0 ? (
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={vendorData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {vendorData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [formatCurrency(value), 'Amount']}
                          labelFormatter={(label) => `Vendor: ${label}`}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-60 text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🏭</div>
                      <div>No vendor data available</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
      {/* Controls Bar - Responsive, visually grouped */}
      <div className="dashboard-card dashboard-controls flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        {/* Left: Search and Filters Grouped */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto">
          {/* Enhanced Search with icon */}
          <div className="relative w-full md:w-auto">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              <Search size={20} strokeWidth={2} />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products, bills..."
              className="w-full md:w-72 pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-700 placeholder-gray-400"
              style={{
                fontSize: '14px',
                fontWeight: '500'
              }}
              aria-label="Search by product name or bill number"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>
          {/* Filters Grouped in a box */}
          {tableSettings.filtering && (
            <div className="flex gap-2 items-center bg-gray-50 border border-gray-200 rounded-md px-3 py-2 flex-wrap">
              {/* Category Dropdown with icons */}
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ minWidth: 140 }}
                aria-label="Filter by category"
              >
                {categoryOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
              {/* Price Range with ₹ icons */}
              <div className="flex items-center gap-1">
                <span className="text-gray-400">₹</span>
                <input
                  type="number"
                  value={filterPriceMin}
                  onChange={e => setFilterPriceMin(e.target.value)}
                  placeholder="Min"
                  className="p-2 border border-gray-300 rounded-md w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  aria-label="Minimum MRP"
                />
                <span>-</span>
                <span className="text-gray-400">₹</span>
                <input
                  type="number"
                  value={filterPriceMax}
                  onChange={e => setFilterPriceMax(e.target.value)}
                  placeholder="Max"
                  className="p-2 border border-gray-300 rounded-md w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  aria-label="Maximum MRP"
                />
              </div>
              {/* Clear Filters with X icon */}
              <button
                className="dashboard-btn-secondary px-3 py-2 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => {
                  setFilterCategory('');
                  setFilterPriceMin('');
                  setFilterPriceMax('');
                }}
                type="button"
                aria-label="Clear filters"
                title="Clear filters"
              >
                <X size={16} /> Clear Filters
              </button>
            </div>
          )}
        </div>
        {/* Right: Actions Grouped - Enhanced UI */}
        <div className="flex gap-3 items-center justify-end w-full md:w-auto mt-2 md:mt-0">
          {/* Settings Button */}
          <button
            className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 transition-all duration-200 rounded-md shadow-sm"
            style={{
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '42px',
              height: '42px'
            }}
            onClick={() => setSettingsOpen(true)}
            aria-label="Table Settings"
            title="Table Settings"
            type="button"
          >
            <SettingsIcon size={20} />
          </button>

          {/* Export Dropdown */}
          {tableSettings.showExport && (
            <div className="relative">
              <button
                className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 transition-all duration-200 rounded-md shadow-sm flex items-center gap-2 px-4 py-2"
                style={{ height: '42px' }}
                onClick={() => setExportOpen(v => !v)}
                aria-label="Export"
                title="Export"
                type="button"
              >
                <Download size={18} />
                <span className="font-medium">Export</span>
                <ChevronDown size={16} />
              </button>
              {exportOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                  <button
                    className="block w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-700 font-medium border-b border-gray-100 transition-colors"
                    onClick={handleExportAll}
                    aria-label="Export All to CSV"
                    title="Export All to CSV"
                  >
                    Export All to CSV
                  </button>
                  <button
                    className="block w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-700 font-medium transition-colors"
                    onClick={handleExportVisible}
                    aria-label="Export Visible to CSV"
                    title="Export Visible to CSV"
                  >
                    Export Visible to CSV
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Save Button */}
          <button
            className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all duration-200 rounded-md shadow-sm flex items-center gap-2 px-4 py-2"
            style={{ height: '42px' }}
            onClick={handleSave}
            aria-label="Save"
            title="Save"
          >
            <SaveIcon size={18} />
            <span className="font-medium">Save</span>
            {showSaveAnimation && <Check className="text-green-500" size={18} />}
          </button>

          {/* Add Product - Enhanced Primary Action */}
          <button
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg shadow-lg flex items-center gap-3 px-6 py-3 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            style={{
              height: '48px',
              fontWeight: 700,
              fontSize: '15px',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
              border: 'none'
            }}
            onClick={handleAddRow}
            aria-label="Add Product"
            title="Add New Product"
            onMouseEnter={(e) => {
              e.target.style.boxShadow = '0 6px 25px rgba(16, 185, 129, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.4)';
            }}
          >
            <div className="bg-white bg-opacity-20 rounded-full p-1">
              <Plus size={18} strokeWidth={3} />
            </div>
            <span className="tracking-wide">Add Product</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="dashboard-card">
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="dashboard-card">
          <div className={`p-4 border rounded-lg ${lastActionType === 'delete' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700'}`}>
            {success}
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast.show && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded shadow-lg text-base font-semibold transition-all ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="dashboard-card dashboard-table-container">
        <table className="dashboard-table">
          <thead>
            <tr>
              {getVisibleColumns().map(column => (
                <th
                  key={column.key}
                  className={column.align === 'right' ? 'text-right' : ''}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                  style={{ cursor: column.sortable ? 'pointer' : 'default' }}
                >
                  {column.label} {column.sortable && renderSortIcon(column.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={getVisibleColumns().length} className="text-center py-4 text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">🛒</span>
                    <span>No products found. Add your first product!</span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedData.map(row => (
                <tr
                  key={row.id}
                  className={`hover:bg-blue-100 transition-colors ${selectedProduct && selectedProduct.id === row.id && modalOpen ? 'bg-blue-50 ring-2 ring-blue-200' : ''}`}
                >
                  {getVisibleColumns().map(column => (
                    <td key={column.key} className={column.align === 'right' ? 'text-right' : ''}>
                      {(() => {
                        switch (column.key) {
                          case 'billNumber':
                            return row.billNumber;
                          case 'date':
                            return renderDateCell(row);
                          case 'productName':
                            return renderEditableCell(row, "productName");
                          case 'category':
                            return categoryTag(row.category);
                          case 'vendor':
                            return row.vendor ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                                <span className="mr-1">🏭</span>{row.vendor}
                              </span>
                            ) : (
                              <span className="text-gray-400">Not specified</span>
                            );
                          case 'mrp':
                            return renderEditableCell(row, "mrp", "number");
                          case 'totalQuantity':
                            return renderEditableCell(row, "totalQuantity", "number");
                          case 'totalAmount':
                            return renderEditableCell(row, "totalAmount", "number");
                          case 'pricePerPiece':
                            return formatCurrency(row.pricePerPiece || 0);
                          case 'profitPerPiece':
                            return formatCurrency(calculateProfitPerPiece(row.mrp || 0, row.pricePerPiece || 0));
                          case 'totalProfit':
                            return formatCurrency(calculateProfitPerPiece(row.mrp || 0, row.pricePerPiece || 0) * (row.totalQuantity || 0));
                          case 'actions':
                            return (
                              <div className="flex gap-2 items-center justify-center">
                                <button
                                  className="bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-600 hover:text-white shadow-sm"
                                  style={{
                                    padding: '8px',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                  }}
                                  aria-label="Edit Product"
                                  title="Edit Product"
                                  onClick={() => { setSelectedProduct(row); setModalOpen(true); }}
                                >
                                  <Pencil size={20} strokeWidth={2} />
                                </button>
                                <button
                                  className="bg-red-100 text-red-700 border border-red-300 hover:bg-red-600 hover:text-white shadow-sm"
                                  style={{
                                    padding: '8px',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                  }}
                                  aria-label="Delete Product"
                                  title="Delete Product"
                                  onClick={e => { e.stopPropagation(); handleDeleteRow(row.id); }}
                                >
                                  <Trash2 size={20} strokeWidth={2} />
                                </button>
                              </div>
                            );
                          default:
                            return '';
                        }
                      })()}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            {tableSettings.showTotals && (
              <tr>
                {getVisibleColumns().map((column, index) => (
                  <td key={column.key} className={column.align === 'right' ? 'text-right' : ''}>
                    {(() => {
                      // Show "Total" label in the first visible column
                      if (index === 0) {
                        return <span className="font-bold">Total</span>;
                      }
                      // Show total amount in the totalAmount column
                      if (column.key === 'totalAmount') {
                        return <span className="font-bold">{formatCurrency(calculateTotalAmount())}</span>;
                      }
                      // Show total profit in the totalProfit column
                      if (column.key === 'totalProfit') {
                        return <span className="font-bold">{formatCurrency(calculateTotalProfit())}</span>;
                      }
                      // Empty cells for other columns
                      return '';
                    })()}
                  </td>
                ))}
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      <ProductModal
        open={modalOpen}
        onClose={handleModalClose}
        product={selectedProduct}
        onSave={handleModalSave}
        categories={categories}
        vendors={vendors}
      />

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              onClick={() => setSettingsOpen(false)}
              aria-label="Close Settings"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">Table Settings</h2>
            <div className="space-y-4">
              {/* Feature Toggles */}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="toggle-filtering" checked={tableSettings.filtering} onChange={e => setTableSettings(s => ({ ...s, filtering: e.target.checked }))} />
                <label htmlFor="toggle-filtering" className="font-medium">Enable Filtering</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="toggle-export" checked={tableSettings.showExport} onChange={e => setTableSettings(s => ({ ...s, showExport: e.target.checked }))} />
                <label htmlFor="toggle-export" className="font-medium">Enable Export</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="toggle-totals" checked={tableSettings.showTotals} onChange={e => setTableSettings(s => ({ ...s, showTotals: e.target.checked }))} />
                <label htmlFor="toggle-totals" className="font-medium">Show Totals Row</label>
              </div>
              <div className="mt-4">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;