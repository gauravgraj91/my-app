import React, { useState, useEffect } from 'react';
import { Search, X, Download, Plus, Trash2, Pencil, Grid, List, Tag, Link2, Unlink, CheckSquare, Square, Filter, Package, TrendingUp, IndianRupee, SortAsc, SortDesc, Users, LayoutDashboard } from 'lucide-react';
import './Shop.css';
// ShopTransactions component is reserved for future use
import PriceList from './PriceList';
import ProductModal from './ProductModal';
import BillsView from './BillsView';
import VendorsView from './VendorsView';
import HomeView from './HomeView';
import { BillsProvider } from '../../context/BillsContext';
import { useNotifications } from '../ui/NotificationSystem';
import { VendorsProvider } from '../../context/VendorsContext';
import AssignBillModal from './AssignBillModal';
import {
  addShopProduct,
  subscribeToShopProducts,
  deleteShopProduct,
  updateShopProduct,
  moveProductToBill,
  removeProductFromBill
} from '../../firebase/shopProductService';
import { formatCurrency, formatDate } from '../../utils/formatters';

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
  // View mode state - 'bills' or 'products'
  const [viewMode, setViewMode] = useState(() => {
    console.log('Shop.js: Calling localStorage.getItem');
    const saved = localStorage.getItem('shopViewMode');
    console.log('Shop.js: Initializing viewMode. Saved:', saved);
    return saved || 'home';
  });

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
  // eslint-disable-next-line no-unused-vars
  const [showSaveAnimation, setShowSaveAnimation] = useState(false);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [lastActionType, setLastActionType] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState("");
  const { showSuccess, showError } = useNotifications();
  // eslint-disable-next-line no-unused-vars
  const [exportOpen, setExportOpen] = useState(false);
  // Add sorting and filtering state
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');
  const [filterBillStatus, setFilterBillStatus] = useState(''); // 'all', 'linked', 'standalone'

  // Assign to Bill modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [productsToAssign, setProductsToAssign] = useState([]);
  const [assignMode, setAssignMode] = useState('single'); // 'single' or 'bulk'

  // Bulk selection state
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Advanced filters panel toggle
  const [showFilters, setShowFilters] = useState(false);

  // Table settings state with persistence
  const defaultTableSettings = {
    filtering: true,
    showExport: true,
    showTotals: true,
    columns: {
      billNumber: true,
      billStatus: true, // New column for bill link status
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
  // eslint-disable-next-line no-unused-vars
  const [settingsOpen, setSettingsOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [tableSettings, setTableSettings] = useState(() => {
    const saved = localStorage.getItem('tableSettings');
    return saved ? JSON.parse(saved) : defaultTableSettings;
  });
  // Persist tableSettings to localStorage
  useEffect(() => {
    localStorage.setItem('tableSettings', JSON.stringify(tableSettings));
  }, [tableSettings]);

  const [categories, setCategories] = useState(getShopCategories());
  // eslint-disable-next-line no-unused-vars
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

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem('shopViewMode', viewMode);
  }, [viewMode]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToShopProducts((products, metadata) => {
      console.log('Firebase data loaded in Shop.js:', products?.length);
      setData(products || []);
      setLoading(false);
      console.log('setLoading(false) called in Shop.js');
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);



  // eslint-disable-next-line no-unused-vars
  const handleSave = async () => {
    try {
      setShowSaveAnimation(true);
      showSuccess("Data saved successfully!");
      setTimeout(() => setShowSaveAnimation(false), 2000);
    } catch (error) {
      showError("Failed to save data. Please try again.");
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
      showError('Failed to update product. Please try again.');
    }
  };

  const handleKeyDown = (e, id, field, value) => {
    if (e.key === "Enter") {
      handleCellEdit(id, field, value);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
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
      showSuccess("Product added successfully!");
    } catch (error) {
      showError('Failed to add product. Please try again.');
    }
  };

  const handleDeleteRow = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteShopProduct(id);
        showSuccess("Product deleted successfully!");
      } catch (error) {
        showError('Failed to delete product. Please try again.');
      }
    }
  };

  // eslint-disable-next-line no-unused-vars
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
      showSuccess('Product updated successfully!');
      setModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      showError('Failed to update product. Please try again.');
    }
  };

  // eslint-disable-next-line no-unused-vars
  const getVisibleColumns = () => {
    const allColumns = [
      { key: 'select', label: '', sortable: false, width: '40px' }, // Selection checkbox column
      { key: 'billNumber', label: 'Bill #', sortable: true },
      { key: 'billStatus', label: 'Bill Status', sortable: false },
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

    // Select column is always shown, others depend on settings
    return allColumns.filter(col => col.key === 'select' || tableSettings.columns[col.key]);
  };

  // Handler to navigate to Bills view with specific bill
  const handleNavigateToBill = (billId, billNumber) => {
    if (billId) {
      setSearch(billNumber); // Set search to bill number
      setViewMode('bills'); // Switch to bills view
    }
  };

  // Handler to navigate from Bills view to Products view for a specific product
  const handleNavigateToProduct = (product) => {
    if (product) {
      setSearch(product.productName); // Set search to product name
      setViewMode('products'); // Switch to products view
      // Optionally select the product for editing
      setSelectedProduct(product);
      setModalOpen(true);
    }
  };

  // Handler to open assign modal for single product
  const handleOpenAssignModal = (product) => {
    setProductsToAssign([product]);
    setAssignMode('single');
    setAssignModalOpen(true);
  };

  // Handler to open assign modal for bulk products
  const handleOpenBulkAssignModal = () => {
    const products = sortedData.filter(p => selectedProducts.has(p.id) && !p.billId);
    if (products.length === 0) {
      showError('Please select standalone products to assign');
      return;
    }
    setProductsToAssign(products);
    setAssignMode('bulk');
    setAssignModalOpen(true);
  };

  // Handler to assign products to a bill
  const handleAssignToBill = async (billId, bill) => {
    try {
      for (const product of productsToAssign) {
        await moveProductToBill(product.id, billId);
      }
      showSuccess(
        productsToAssign.length === 1
          ? `Product assigned to ${bill.billNumber}!`
          : `${productsToAssign.length} products assigned to ${bill.billNumber}!`
      );
      setSelectedProducts(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error assigning to bill:', error);
      throw error;
    }
  };

  // Handler to remove product from bill
  const handleRemoveFromBill = async (product) => {
    if (!window.confirm(`Remove "${product.productName}" from bill ${product.billNumber}?`)) {
      return;
    }
    try {
      await removeProductFromBill(product.id);
      showSuccess(`Product removed from ${product.billNumber}!`);
    } catch (error) {
      console.error('Error removing from bill:', error);
      showError('Failed to remove product from bill');
    }
  };

  // Bulk selection handlers
  const handleSelectProduct = (productId) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === sortedData.length) {
      setSelectedProducts(new Set());
      setShowBulkActions(false);
    } else {
      const allIds = new Set(sortedData.map(p => p.id));
      setSelectedProducts(allIds);
      setShowBulkActions(true);
    }
  };

  const handleClearSelection = () => {
    setSelectedProducts(new Set());
    setShowBulkActions(false);
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    const count = selectedProducts.size;
    if (!window.confirm(`Are you sure you want to delete ${count} product(s)? This action cannot be undone.`)) {
      return;
    }
    try {
      for (const productId of selectedProducts) {
        await deleteShopProduct(productId);
      }
      showSuccess(`${count} product(s) deleted successfully!`);
      setSelectedProducts(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error bulk deleting:', error);
      showError('Failed to delete some products');
    }
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
          style={{
            padding: '6px 8px',
            border: '1px solid #3b82f6',
            borderRadius: '6px',
            fontSize: '13px',
            width: '100%',
            outline: 'none',
            background: '#fff',
          }}
          aria-label={field}
          autoFocus
        />
      );
    } else {
      return (
        <span
          onClick={() => {
            setEditingCell(`${row.id}-${field}`);
            setTempEditValue(value.toString());
          }}
          style={{ cursor: 'pointer' }}
        >
          {field === "totalQuantity"
            ? value
            : type === "number"
              ? formatCurrency(value)
              : (value || <span style={{ color: '#94a3b8' }}>&mdash;</span>)}
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

  const calculateAverageMRP = () => {
    if (data.length === 0) return 0;
    const totalMRP = data.reduce((total, item) => total + (item.mrp || 0), 0);
    return totalMRP / data.length;
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
    })
    // Filter by bill association status
    .filter(row => {
      if (!filterBillStatus || filterBillStatus === 'all') return true;
      if (filterBillStatus === 'linked') return !!row.billId;
      if (filterBillStatus === 'standalone') return !row.billId;
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
    return sortDirection === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />;
  };

  // Category badge with clean pill style (no emoji)
  const getCategoryBadge = (cat) => {
    let bgColor = '#f1f5f9';
    let textColor = '#475569';
    switch ((cat || '').toLowerCase()) {
      case 'groceries': bgColor = '#ecfdf5'; textColor = '#059669'; break;
      case 'electronics': bgColor = '#eff6ff'; textColor = '#2563eb'; break;
      case 'clothing': bgColor = '#f5f3ff'; textColor = '#7c3aed'; break;
      case 'accessories': bgColor = '#fff7ed'; textColor = '#ea580c'; break;
      default: break;
    }
    return (
      <span style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        background: bgColor,
        color: textColor,
      }}>
        {cat || '\u2014'}
      </span>
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

  // eslint-disable-next-line no-unused-vars
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

  // eslint-disable-next-line no-unused-vars
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

  // Sortable header component matching BillsView style
  const SortableHeader = ({ field, label, style: headerStyle = {} }) => (
    <th
      onClick={() => handleSort(field)}
      style={{
        padding: '12px 16px',
        textAlign: 'left',
        fontSize: '12px',
        fontWeight: '600',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc',
        transition: 'color 0.15s',
        ...headerStyle
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {label}
        {renderSortIcon(field)}
      </span>
    </th>
  );

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="text-center text-lg">Loading shop data...</div>
      </div>
    );
  }

  return (
    <BillsProvider>
    <VendorsProvider>
      <div className="dashboard-container">
        <div className="dashboard-card dashboard-header">
          <h1 className="dashboard-title">Shop Dashboard</h1>
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'home'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
                onClick={() => setViewMode('home')}
                aria-label="Home View"
              >
                <LayoutDashboard size={16} />
                Home
              </button>
              <button
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'bills'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
                onClick={() => setViewMode('bills')}
                aria-label="Bills View"
              >
                <List size={16} />
                Bills
              </button>
              <button
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'products'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
                onClick={() => setViewMode('products')}
                aria-label="Products View"
              >
                <Grid size={16} />
                Products
              </button>
              <button
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'pricelist'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
                onClick={() => setViewMode('pricelist')}
                aria-label="Price List View"
              >
                <Tag size={16} />
                Price List
              </button>
              <button
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'vendors'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
                onClick={() => setViewMode('vendors')}
                aria-label="Vendors View"
              >
                <Users size={16} />
                Vendors
              </button>
            </div>
          </div>
        </div>



        {/* Conditionally render based on view mode */}
        {
          viewMode === 'home' ? (
            <HomeView onNavigate={setViewMode} />
          ) : viewMode === 'bills' ? (
            <BillsView
              searchTerm={search}
              onSearchChange={setSearch}
              onProductClick={handleNavigateToProduct}
            />
          ) : viewMode === 'vendors' ? (
            <VendorsView
              onNavigateToBill={(billNumber) => {
                setSearch(billNumber);
                setViewMode('bills');
              }}
            />
          ) : viewMode === 'pricelist' ? (
            <PriceList />
          ) : (
            <>
              {/* ===== HEADER ===== */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                marginBottom: '24px', flexWrap: 'wrap', gap: '12px', padding: '0 4px',
              }}>
                <div>
                  <h2 style={{
                    fontSize: '24px', fontWeight: '800', color: '#0f172a',
                    margin: '0 0 4px 0', letterSpacing: '-0.02em'
                  }}>
                    Products
                  </h2>
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                    Manage your shop products and inventory
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={handleExportVisible}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px', borderRadius: '8px',
                      border: '1px solid #e2e8f0', background: '#fff',
                      fontSize: '13px', fontWeight: '500', color: '#475569',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <Download size={14} />
                    Export
                  </button>
                  <button
                    onClick={handleAddRow}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 16px', borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      fontSize: '13px', fontWeight: '600', color: '#fff',
                      cursor: 'pointer', transition: 'all 0.15s',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <Plus size={14} />
                    Add Product
                  </button>
                </div>
              </div>

              {/* ===== SUMMARY CARDS ===== */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                marginBottom: '24px',
              }}>
                {/* Total Products */}
                <div style={{
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                  padding: '20px', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: '16px', right: '16px',
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Package size={20} color="#64748b" />
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '8px' }}>
                    Total Products
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                    {data.length}
                  </div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                    {data.filter(p => p.billId).length} linked, {data.filter(p => !p.billId).length} standalone
                  </div>
                </div>

                {/* Total Value */}
                <div style={{
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                  padding: '20px', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: '16px', right: '16px',
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <IndianRupee size={20} color="#10b981" />
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '8px' }}>
                    Total Value
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', marginBottom: '4px' }}>
                    {formatCurrency(calculateTotalAmount())}
                  </div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                    Sum of all nett amounts
                  </div>
                </div>

                {/* Total Profit */}
                <div style={{
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                  padding: '20px', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: '16px', right: '16px',
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <TrendingUp size={20} color="#f59e0b" />
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '8px' }}>
                    Total Profit
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b', marginBottom: '4px' }}>
                    {formatCurrency(calculateTotalProfit())}
                  </div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                    Across all products
                  </div>
                </div>

                {/* Average MRP */}
                <div style={{
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                  padding: '20px', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: '16px', right: '16px',
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Tag size={20} color="#7c3aed" />
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '8px' }}>
                    Average MRP
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#7c3aed', marginBottom: '4px' }}>
                    {formatCurrency(calculateAverageMRP())}
                  </div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                    Per product average
                  </div>
                </div>
              </div>

              {/* ===== SEARCH + FILTER BAR ===== */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                marginBottom: '16px', flexWrap: 'wrap',
              }}>
                {/* Search input */}
                <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                    color: '#94a3b8', pointerEvents: 'none', display: 'flex', alignItems: 'center',
                  }}>
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search products, bills..."
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '13px',
                      background: '#fff',
                      outline: 'none',
                      color: '#1e293b',
                    }}
                    aria-label="Search by product name or bill number"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      style={{
                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                        display: 'flex', alignItems: 'center', padding: '2px',
                      }}
                      aria-label="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Filters button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: '8px',
                    border: '1px solid #e2e8f0', background: '#fff',
                    fontSize: '13px', fontWeight: '500', color: '#475569',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <Filter size={14} />
                  Filters
                </button>

                {/* Category pill tabs */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: '#f1f5f9', borderRadius: '8px', padding: '3px',
                }}>
                  <button
                    onClick={() => setFilterCategory('')}
                    style={{
                      padding: '6px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: filterCategory === '' ? '#1e293b' : 'transparent',
                      color: filterCategory === '' ? '#fff' : '#64748b',
                    }}
                  >
                    All
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
                      style={{
                        padding: '6px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        background: filterCategory === cat ? '#1e293b' : 'transparent',
                        color: filterCategory === cat ? '#fff' : '#64748b',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* ===== ADVANCED FILTERS PANEL ===== */}
              {showFilters && (
                <div style={{
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                  padding: '16px', marginBottom: '16px',
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px', marginBottom: '16px',
                  }}>
                    {/* Bill Status */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>
                        Bill Status
                      </label>
                      <select
                        value={filterBillStatus}
                        onChange={e => setFilterBillStatus(e.target.value)}
                        style={{
                          width: '100%', padding: '8px 12px',
                          border: '1px solid #e2e8f0', borderRadius: '8px',
                          fontSize: '13px', color: '#1e293b', background: '#fff',
                          outline: 'none',
                        }}
                        aria-label="Filter by bill status"
                      >
                        <option value="all">All Products</option>
                        <option value="linked">Linked to Bill</option>
                        <option value="standalone">Standalone</option>
                      </select>
                    </div>
                    {/* Min Price */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>
                        Min Price (MRP)
                      </label>
                      <input
                        type="number"
                        value={filterPriceMin}
                        onChange={e => setFilterPriceMin(e.target.value)}
                        placeholder="0"
                        min="0"
                        style={{
                          width: '100%', padding: '8px 12px',
                          border: '1px solid #e2e8f0', borderRadius: '8px',
                          fontSize: '13px', color: '#1e293b', background: '#fff',
                          outline: 'none',
                        }}
                        aria-label="Minimum MRP"
                      />
                    </div>
                    {/* Max Price */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>
                        Max Price (MRP)
                      </label>
                      <input
                        type="number"
                        value={filterPriceMax}
                        onChange={e => setFilterPriceMax(e.target.value)}
                        placeholder="100000"
                        min="0"
                        style={{
                          width: '100%', padding: '8px 12px',
                          border: '1px solid #e2e8f0', borderRadius: '8px',
                          fontSize: '13px', color: '#1e293b', background: '#fff',
                          outline: 'none',
                        }}
                        aria-label="Maximum MRP"
                      />
                    </div>
                    {/* Clear Filters */}
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button
                        onClick={() => {
                          setFilterCategory('');
                          setFilterPriceMin('');
                          setFilterPriceMax('');
                          setFilterBillStatus('');
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '8px 14px', borderRadius: '8px',
                          border: '1px solid #e2e8f0', background: '#fff',
                          fontSize: '13px', fontWeight: '500', color: '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={14} />
                        Clear All Filters
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== TABLE ===== */}
              <div style={{ marginBottom: '24px' }}>
                {sortedData.length > 0 ? (
                  <div style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                    overflow: 'hidden',
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {/* Checkbox */}
                          <th style={{
                            padding: '12px 16px', textAlign: 'left', width: '44px',
                            borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
                          }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSelectAll(); }}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                              }}
                              title={selectedProducts.size === sortedData.length ? 'Deselect all' : 'Select all'}
                            >
                              {selectedProducts.size === sortedData.length && sortedData.length > 0 ? (
                                <CheckSquare size={16} color="#3b82f6" />
                              ) : (
                                <Square size={16} color="#94a3b8" />
                              )}
                            </button>
                          </th>
                          <SortableHeader field="billNumber" label="Bill #" />
                          <SortableHeader field="date" label="Date" />
                          <SortableHeader field="productName" label="Product Name" />
                          <SortableHeader field="category" label="Category" />
                          <SortableHeader field="vendor" label="Vendor" />
                          <SortableHeader field="mrp" label="MRP" style={{ textAlign: 'right' }} />
                          <SortableHeader field="totalQuantity" label="Qty" style={{ textAlign: 'right' }} />
                          <SortableHeader field="totalAmount" label="Nett Amount" style={{ textAlign: 'right' }} />
                          <th style={{
                            padding: '12px 16px', textAlign: 'right',
                            fontSize: '12px', fontWeight: '600', color: '#64748b',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
                          }}>
                            Total Profit
                          </th>
                          <th style={{
                            padding: '12px 16px', textAlign: 'center',
                            fontSize: '12px', fontWeight: '600', color: '#64748b',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
                          }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedData.map((row, idx) => {
                          const isSelected = selectedProducts.has(row.id);
                          const rowProfit = calculateProfitPerPiece(row.mrp || 0, row.pricePerPiece || 0) * (row.totalQuantity || 0);

                          return (
                            <tr
                              key={row.id}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                background: isSelected ? '#eff6ff' : (idx % 2 === 0 ? '#fff' : '#fafbfc'),
                                transition: 'background 0.15s',
                              }}
                            >
                              {/* Checkbox */}
                              <td style={{ padding: '12px 16px' }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSelectProduct(row.id); }}
                                  style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                                  }}
                                  title={isSelected ? 'Deselect' : 'Select'}
                                >
                                  {isSelected ? (
                                    <CheckSquare size={16} color="#3b82f6" />
                                  ) : (
                                    <Square size={16} color="#cbd5e1" />
                                  )}
                                </button>
                              </td>

                              {/* Bill # */}
                              <td style={{ padding: '12px 16px' }}>
                                {row.billId ? (
                                  <button
                                    onClick={() => handleNavigateToBill(row.billId, row.billNumber)}
                                    style={{
                                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                      fontSize: '14px', fontWeight: '600', color: '#2563eb',
                                      textDecoration: 'none',
                                    }}
                                    title={`View Bill ${row.billNumber}`}
                                  >
                                    {row.billNumber}
                                  </button>
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>&mdash;</span>
                                )}
                              </td>

                              {/* Date */}
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ fontSize: '13px', color: '#64748b' }}>
                                  {formatDate(row.date) || <span style={{ color: '#94a3b8' }}>&mdash;</span>}
                                </span>
                              </td>

                              {/* Product Name */}
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                                  {renderEditableCell(row, "productName")}
                                </span>
                              </td>

                              {/* Category */}
                              <td style={{ padding: '12px 16px' }}>
                                {getCategoryBadge(row.category)}
                              </td>

                              {/* Vendor */}
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '500', color: '#475569' }}>
                                  {row.vendor || <span style={{ color: '#94a3b8' }}>&mdash;</span>}
                                </span>
                              </td>

                              {/* MRP */}
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                                  {renderEditableCell(row, "mrp", "number")}
                                </span>
                              </td>

                              {/* Qty */}
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                                  {renderEditableCell(row, "totalQuantity", "number")}
                                </span>
                              </td>

                              {/* Nett Amount */}
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                                  {renderEditableCell(row, "totalAmount", "number")}
                                </span>
                              </td>

                              {/* Total Profit */}
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <span style={{
                                  fontSize: '13px', fontWeight: '700',
                                  color: rowProfit >= 0 ? '#10b981' : '#ef4444',
                                }}>
                                  {formatCurrency(rowProfit)}
                                </span>
                              </td>

                              {/* Actions */}
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                                  {/* Assign/Unassign Bill */}
                                  {row.billId ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleRemoveFromBill(row); }}
                                      style={{
                                        width: '30px', height: '30px', borderRadius: '6px',
                                        border: '1px solid #fed7aa', background: '#fff7ed',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', color: '#ea580c', transition: 'all 0.15s',
                                      }}
                                      title={`Remove from ${row.billNumber}`}
                                      aria-label="Remove from Bill"
                                    >
                                      <Unlink size={14} />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleOpenAssignModal(row); }}
                                      style={{
                                        width: '30px', height: '30px', borderRadius: '6px',
                                        border: '1px solid #bbf7d0', background: '#f0fdf4',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', color: '#16a34a', transition: 'all 0.15s',
                                      }}
                                      title="Assign to Bill"
                                      aria-label="Assign to Bill"
                                    >
                                      <Link2 size={14} />
                                    </button>
                                  )}
                                  {/* Edit */}
                                  <button
                                    onClick={() => { setSelectedProduct(row); setModalOpen(true); }}
                                    style={{
                                      width: '30px', height: '30px', borderRadius: '6px',
                                      border: '1px solid #e2e8f0', background: '#f8fafc',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      cursor: 'pointer', color: '#64748b', transition: 'all 0.15s',
                                    }}
                                    title="Edit Product"
                                    aria-label="Edit Product"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  {/* Delete */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteRow(row.id); }}
                                    style={{
                                      width: '30px', height: '30px', borderRadius: '6px',
                                      border: '1px solid #fecaca', background: '#fef2f2',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      cursor: 'pointer', color: '#ef4444', transition: 'all 0.15s',
                                    }}
                                    title="Delete Product"
                                    aria-label="Delete Product"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid #e2e8f0' }}>
                          <td style={{ padding: '12px 16px' }} colSpan={6}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>Total</span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                              {formatCurrency(sortedData.reduce((sum, r) => sum + (r.mrp || 0), 0))}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                              {sortedData.reduce((sum, r) => sum + (r.totalQuantity || 0), 0)}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                              {formatCurrency(sortedData.reduce((sum, r) => sum + (r.totalAmount || 0), 0))}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>
                              {formatCurrency(sortedData.reduce((sum, r) => sum + (calculateProfitPerPiece(r.mrp || 0, r.pricePerPiece || 0) * (r.totalQuantity || 0)), 0))}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                    textAlign: 'center', padding: '60px 20px',
                  }}>
                    <Package size={48} style={{ margin: '0 auto 16px', color: '#9ca3af' }} />
                    <h3 style={{ fontSize: '18px', color: '#374151', marginBottom: '8px' }}>
                      No products found
                    </h3>
                    <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                      {search || filterCategory || filterPriceMin || filterPriceMax || filterBillStatus ?
                        'Try adjusting your search or filters' :
                        'Add your first product to get started'
                      }
                    </p>
                    {!search && !filterCategory && !filterPriceMin && !filterPriceMax && !filterBillStatus && (
                      <button
                        onClick={handleAddRow}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '10px 20px', borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          fontSize: '14px', fontWeight: '600', color: '#fff',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        <Plus size={16} />
                        Add First Product
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ===== FLOATING BULK ACTIONS BAR ===== */}
              {showBulkActions && selectedProducts.size > 0 && (
                <div style={{
                  position: 'fixed', bottom: '24px', left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: '#1e293b', color: 'white',
                  padding: '12px 20px', borderRadius: '14px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                  zIndex: 1000,
                }}>
                  <span style={{
                    fontSize: '13px', fontWeight: '600',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <span style={{
                      background: '#3b82f6', padding: '2px 8px', borderRadius: '10px',
                      fontSize: '12px', fontWeight: '700'
                    }}>
                      {selectedProducts.size}
                    </span>
                    selected
                  </span>

                  <div style={{ width: '1px', height: '24px', background: '#475569' }} />

                  {/* Bulk Assign to Bill - only for standalone products */}
                  {Array.from(selectedProducts).some(id => !sortedData.find(p => p.id === id)?.billId) && (
                    <button
                      onClick={handleOpenBulkAssignModal}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: '#16a34a', border: 'none', color: 'white',
                        cursor: 'pointer',
                        fontSize: '13px', fontWeight: '600', padding: '6px 12px',
                        borderRadius: '8px', transition: 'all 0.15s',
                      }}
                    >
                      <Link2 size={14} /> Assign to Bill
                    </button>
                  )}

                  <button
                    onClick={handleBulkDelete}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: '#dc2626', border: 'none', color: 'white',
                      cursor: 'pointer',
                      fontSize: '13px', fontWeight: '600', padding: '6px 12px',
                      borderRadius: '8px', transition: 'all 0.15s',
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>

                  <button
                    onClick={handleClearSelection}
                    style={{
                      display: 'flex', alignItems: 'center',
                      background: 'none', border: 'none', color: '#64748b',
                      cursor: 'pointer', padding: '6px', borderRadius: '8px',
                      transition: 'all 0.15s', marginLeft: '4px',
                    }}
                    title="Clear selection"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Assign Bill Modal */}
              <AssignBillModal
                isOpen={assignModalOpen}
                onClose={() => {
                  setAssignModalOpen(false);
                  setProductsToAssign([]);
                }}
                onAssign={handleAssignToBill}
                products={productsToAssign}
                mode={assignMode}
              />
            </>
          )
        }

        {/* Product Modal - Outside view conditional for cross-view access */}
        <ProductModal
          isOpen={modalOpen}
          onClose={handleModalClose}
          product={selectedProduct}
          onSave={handleModalSave}
          mode={selectedProduct ? 'edit' : 'create'}
          bill={selectedProduct?.billId ? { id: selectedProduct.billId, billNumber: selectedProduct.billNumber, vendor: selectedProduct.vendor } : null}
        />
      </div >
    </VendorsProvider>
    </BillsProvider>
  );
};

export default Shop;
