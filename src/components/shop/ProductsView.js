import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, X, Download, Plus, Trash2, Pencil,
  Link2, Unlink, CheckSquare, Square, Filter,
  Package, TrendingUp, IndianRupee, SortAsc, SortDesc, Tag
} from 'lucide-react';
import ProductModal from './ProductModal';
import AssignBillModal from './AssignBillModal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useNotifications } from '../ui/NotificationSystem';
import {
  addShopProduct,
  subscribeToShopProducts,
  deleteShopProduct,
  updateShopProduct,
  moveProductToBill,
  removeProductFromBill
} from '../../firebase/shopProductService';
import { formatCurrency, formatDate } from '../../utils/formatters';

const defaultCategories = ['Clothing', 'Electronics', 'Groceries', 'Accessories', 'Other'];
const defaultVendors = ['ABC Suppliers', 'XYZ Distributors', 'Local Market', 'Online Store', 'Direct Import', 'Other'];

function getShopCategories() {
  const saved = localStorage.getItem('shopCategories');
  return saved ? JSON.parse(saved) : defaultCategories;
}
function getDefaultCategory() {
  const saved = localStorage.getItem('shopDefaultCategory');
  return saved ? saved : defaultCategories[0];
}
function getDefaultVendor() {
  const saved = localStorage.getItem('shopDefaultVendor');
  return saved ? saved : defaultVendors[0];
}

const SummaryCard = ({ label, amount, value, count, subtitle, icon: Icon, color, bgColor }) => (
  <div style={{
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
    padding: '24px', minHeight: '120px', position: 'relative', overflow: 'hidden',
  }}>
    <div style={{
      position: 'absolute', top: '16px', right: '16px',
      width: '40px', height: '40px', borderRadius: '10px',
      background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={20} color={color} />
    </div>
    <div style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '8px' }}>
      {label}
    </div>
    <div style={{ fontSize: '24px', fontWeight: '800', color: color, marginBottom: '4px' }}>
      {value !== undefined ? value : formatCurrency(amount)}
    </div>
    <div style={{ fontSize: '13px', color: '#94a3b8' }}>
      {subtitle || `${count} product${count !== 1 ? 's' : ''}`}
    </div>
  </div>
);

const SortableHeader = ({ field, label, style: headerStyle = {}, onSort, sortColumn, sortDirection }) => (
  <th
    onClick={() => onSort(field)}
    style={{
      padding: '12px 16px', textAlign: 'left', fontSize: '12px',
      fontWeight: '600', color: '#64748b', textTransform: 'uppercase',
      letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none',
      whiteSpace: 'nowrap', borderBottom: '1px solid #e2e8f0',
      background: '#f8fafc', transition: 'color 0.15s',
      ...headerStyle
    }}
  >
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {label}
      {sortColumn === field && (sortDirection === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />)}
    </span>
  </th>
);

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
      display: 'inline-block', padding: '3px 10px', borderRadius: '12px',
      fontSize: '12px', fontWeight: '600', background: bgColor, color: textColor,
    }}>
      {cat || '\u2014'}
    </span>
  );
};

const ProductsView = ({ onNavigateToBill }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState(null);
  const [tempEditValue, setTempEditValue] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');
  const [filterBillStatus, setFilterBillStatus] = useState('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [productsToAssign, setProductsToAssign] = useState([]);
  const [assignMode, setAssignMode] = useState('single');
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState(getShopCategories);
  const [defaultCategory, setDefaultCategory] = useState(getDefaultCategory);
  const [defaultVendor, setDefaultVendor] = useState(getDefaultVendor);

  const { showSuccess, showError } = useNotifications();

  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });
  const openConfirm = (title, message, onConfirm) => setConfirmDialog({ open: true, title, message, onConfirm });
  const closeConfirm = () => setConfirmDialog(s => ({ ...s, open: false }));

  useEffect(() => {
    const unsubscribe = subscribeToShopProducts((products) => {
      setData(products || []);
      setLoading(false);
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  useEffect(() => {
    const sync = () => {
      setCategories(getShopCategories());
      setDefaultCategory(getDefaultCategory());
      setDefaultVendor(getDefaultVendor());
    };
    window.addEventListener('storage', sync);
    sync();
    return () => window.removeEventListener('storage', sync);
  }, []);

  const handleCellEdit = async (id, field, value) => {
    try {
      let updatedData = { [field]: value };
      if (field === 'totalAmount' || field === 'totalQuantity') {
        const product = data.find(item => item.id === id);
        const totalQuantity = field === 'totalQuantity' ? value : (product?.totalQuantity || 0);
        const totalAmount = field === 'totalAmount' ? value : (product?.totalAmount || 0);
        if (totalQuantity > 0) {
          updatedData.pricePerPiece = Math.round((totalAmount / totalQuantity + Number.EPSILON) * 100) / 100;
        }
      }
      if (field === 'mrp' || field === 'pricePerPiece' || field === 'totalAmount' || field === 'totalQuantity') {
        const product = data.find(item => item.id === id);
        const mrp = field === 'mrp' ? value : (product?.mrp || 0);
        const pricePerPiece = field === 'pricePerPiece' ? value : (product?.pricePerPiece || 0);
        updatedData.profitPerPiece = Math.round((mrp - pricePerPiece + Number.EPSILON) * 100) / 100;
      }
      await updateShopProduct(id, updatedData);
      setEditingCell(null);
    } catch (error) {
      console.error('Error updating product:', error);
      showError('Failed to update product. Please try again.');
    }
  };

  const handleKeyDown = (e, id, field, value) => {
    if (e.key === 'Enter') handleCellEdit(id, field, value);
    else if (e.key === 'Escape') setEditingCell(null);
  };

  const handleAddRow = async () => {
    try {
      await addShopProduct({
        billNumber: `00${data.length + 1}`,
        date: new Date().toISOString().split('T')[0],
        productName: '',
        category: defaultCategory,
        vendor: defaultVendor,
        mrp: 0, totalQuantity: 0, totalAmount: 0, pricePerPiece: 0, profitPerPiece: 0,
      });
      showSuccess('Product added successfully!');
    } catch (error) {
      showError('Failed to add product. Please try again.');
    }
  };

  const handleDeleteRow = (id) => {
    openConfirm(
      'Delete Product',
      'Are you sure you want to delete this product?',
      async () => {
        closeConfirm();
        try {
          await deleteShopProduct(id);
          showError('Product deleted.', { duration: 5000 });
        } catch (error) {
          showError('Failed to delete product. Please try again.');
        }
      }
    );
  };

  const handleModalClose = () => { setModalOpen(false); setSelectedProduct(null); };

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

  const handleOpenAssignModal = (product) => {
    setProductsToAssign([product]);
    setAssignMode('single');
    setAssignModalOpen(true);
  };

  const handleOpenBulkAssignModal = () => {
    const products = sortedData.filter(p => selectedProducts.has(p.id) && !p.billId);
    if (products.length === 0) { showError('Please select standalone products to assign'); return; }
    setProductsToAssign(products);
    setAssignMode('bulk');
    setAssignModalOpen(true);
  };

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

  const handleRemoveFromBill = (product) => {
    openConfirm(
      'Remove from Bill',
      `Remove "${product.productName}" from bill ${product.billNumber}?`,
      async () => {
        closeConfirm();
        try {
          await removeProductFromBill(product.id);
          showError(`Product removed from ${product.billNumber}.`, { duration: 5000 });
        } catch (error) {
          console.error('Error removing from bill:', error);
          showError('Failed to remove product from bill');
        }
      }
    );
  };

  const handleSelectProduct = (productId) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) newSelected.delete(productId);
    else newSelected.add(productId);
    setSelectedProducts(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === sortedData.length) {
      setSelectedProducts(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedProducts(new Set(sortedData.map(p => p.id)));
      setShowBulkActions(true);
    }
  };

  const handleClearSelection = () => { setSelectedProducts(new Set()); setShowBulkActions(false); };

  const handleBulkDelete = () => {
    const count = selectedProducts.size;
    openConfirm(
      'Delete Products',
      `Delete ${count} product${count !== 1 ? 's' : ''}? This cannot be undone.`,
      async () => {
        closeConfirm();
        try {
          for (const productId of selectedProducts) await deleteShopProduct(productId);
          showError(`${count} product${count !== 1 ? 's' : ''} deleted.`, { duration: 5000 });
          setSelectedProducts(new Set());
          setShowBulkActions(false);
        } catch (error) {
          console.error('Error bulk deleting:', error);
          showError('Failed to delete some products');
        }
      }
    );
  };

  const handleSort = (column) => {
    if (sortColumn === column) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(column); setSortDirection('asc'); }
  };

  const calculateProfitPerPiece = (mrp, pricePerPiece) =>
    Math.round((mrp - pricePerPiece + Number.EPSILON) * 100) / 100;

  const processedData = useMemo(() =>
    data
      .filter(row => {
        const s = search.toLowerCase();
        return row.productName?.toLowerCase().includes(s) || row.billNumber?.toLowerCase().includes(s);
      })
      .filter(row => !filterCategory || row.category === filterCategory)
      .filter(row => {
        const min = filterPriceMin !== '' ? parseFloat(filterPriceMin) : null;
        const max = filterPriceMax !== '' ? parseFloat(filterPriceMax) : null;
        if (min !== null && (row.mrp ?? 0) < min) return false;
        if (max !== null && (row.mrp ?? 0) > max) return false;
        return true;
      })
      .filter(row => {
        if (!filterBillStatus || filterBillStatus === 'all') return true;
        if (filterBillStatus === 'linked') return !!row.billId;
        if (filterBillStatus === 'standalone') return !row.billId;
        return true;
      }),
    [data, search, filterCategory, filterPriceMin, filterPriceMax, filterBillStatus]
  );

  const sortedData = useMemo(() => {
    if (!sortColumn) return processedData;
    return [...processedData].sort((a, b) => {
      let aValue = a[sortColumn];
      let bValue = b[sortColumn];
      if (sortColumn === 'date') { aValue = new Date(aValue); bValue = new Date(bValue); }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase(); bValue = bValue.toLowerCase();
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [processedData, sortColumn, sortDirection]);

  const totals = useMemo(() => ({
    amount: data.reduce((sum, item) => sum + (item.totalAmount || 0), 0),
    profit: data.reduce((sum, item) => sum + ((item.profitPerPiece || 0) * (item.totalQuantity || 0)), 0),
    avgMrp: data.length ? data.reduce((sum, item) => sum + (item.mrp || 0), 0) / data.length : 0,
  }), [data]);

  const downloadCsv = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportVisible = () => {
    if (!processedData.length) return;
    const headers = ['Bill Number', 'Date', 'Product Name', 'Category', 'MRP', 'Qty / Units', 'Nett Amount', 'Price per Unit', 'Profit per Unit', 'Total Profit'];
    const csv = [
      headers.join(','),
      ...processedData.map(row =>
        [row.billNumber, formatDate(row.date), row.productName, row.category,
          row.mrp, row.totalQuantity, row.totalAmount, row.pricePerPiece,
          row.profitPerPiece, (row.profitPerPiece * row.totalQuantity),
        ].map(val => `"${val ?? ''}"`).join(',')
      )
    ].join('\n');
    downloadCsv(csv, 'visible_products.csv');
  };

  const renderEditableCell = (row, field, type = 'text') => {
    const isEditing = editingCell === `${row.id}-${field}`;
    const value = row[field] || '';
    if (isEditing) {
      return (
        <input
          type={type}
          value={tempEditValue}
          onChange={e => setTempEditValue(e.target.value)}
          onKeyDown={e => handleKeyDown(e, row.id, field, type === 'number' ? parseFloat(tempEditValue) : tempEditValue)}
          onBlur={() => handleCellEdit(row.id, field, type === 'number' ? parseFloat(tempEditValue) : tempEditValue)}
          style={{
            padding: '6px 8px', border: '1px solid #3b82f6', borderRadius: '6px',
            fontSize: '13px', width: '100%', outline: 'none', background: '#fff',
          }}
          aria-label={field}
          autoFocus
        />
      );
    }
    return (
      <span
        onClick={() => { setEditingCell(`${row.id}-${field}`); setTempEditValue(value.toString()); }}
        style={{ cursor: 'pointer' }}
      >
        {field === 'totalQuantity'
          ? value
          : type === 'number'
            ? formatCurrency(value)
            : (value || <span style={{ color: '#94a3b8' }}>&mdash;</span>)}
      </span>
    );
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading products...</div>;
  }

  return (
    <>
      {/* ===== HEADER ===== */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '24px', flexWrap: 'wrap', gap: '12px', padding: '0 4px',
      }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
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
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              fontSize: '13px', fontWeight: '600', color: '#fff',
              cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
            }}
          >
            <Plus size={14} />
            Add Product
          </button>
        </div>
      </div>

      {/* ===== SUMMARY CARDS ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <SummaryCard
          label="Total Products" value={data.length} count={data.length}
          subtitle={`${data.filter(p => p.billId).length} linked, ${data.filter(p => !p.billId).length} standalone`}
          icon={Package} color="#0f172a" bgColor="#f1f5f9"
        />
        <SummaryCard label="Total Value" amount={totals.amount} count={data.length} subtitle="Sum of all nett amounts" icon={IndianRupee} color="#10b981" bgColor="#ecfdf5" />
        <SummaryCard label="Total Profit" amount={totals.profit} count={data.length} subtitle="Across all products" icon={TrendingUp} color="#f59e0b" bgColor="#fff7ed" />
        <SummaryCard label="Average MRP" amount={totals.avgMrp} count={data.length} subtitle="Per product average" icon={Tag} color="#7c3aed" bgColor="#f5f3ff" />
      </div>

      {/* ===== SEARCH + FILTER BAR ===== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
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
              width: '100%', padding: '10px 12px 10px 36px',
              border: '1px solid #e2e8f0', borderRadius: '8px',
              fontSize: '13px', background: '#fff', outline: 'none', color: '#1e293b',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
          <button
            onClick={() => setFilterCategory('')}
            style={{
              padding: '6px 16px', border: 'none', borderRadius: '6px',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
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
                padding: '6px 16px', border: 'none', borderRadius: '6px',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
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
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Bill Status</label>
              <select
                value={filterBillStatus}
                onChange={e => setFilterBillStatus(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#1e293b', background: '#fff', outline: 'none' }}
                aria-label="Filter by bill status"
              >
                <option value="all">All Products</option>
                <option value="linked">Linked to Bill</option>
                <option value="standalone">Standalone</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Min Price (MRP)</label>
              <input
                type="number" value={filterPriceMin} onChange={e => setFilterPriceMin(e.target.value)}
                placeholder="0" min="0"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#1e293b', background: '#fff', outline: 'none' }}
                aria-label="Minimum MRP"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Max Price (MRP)</label>
              <input
                type="number" value={filterPriceMax} onChange={e => setFilterPriceMax(e.target.value)}
                placeholder="100000" min="0"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#1e293b', background: '#fff', outline: 'none' }}
                aria-label="Maximum MRP"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={() => { setFilterCategory(''); setFilterPriceMin(''); setFilterPriceMax(''); setFilterBillStatus(''); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '8px',
                  border: '1px solid #e2e8f0', background: '#fff',
                  fontSize: '13px', fontWeight: '500', color: '#475569', cursor: 'pointer',
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
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{
                    padding: '12px 16px', textAlign: 'left', width: '44px',
                    borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
                  }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSelectAll(); }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                      title={selectedProducts.size === sortedData.length ? 'Deselect all' : 'Select all'}
                    >
                      {selectedProducts.size === sortedData.length && sortedData.length > 0
                        ? <CheckSquare size={16} color="#3b82f6" />
                        : <Square size={16} color="#94a3b8" />}
                    </button>
                  </th>
                  <SortableHeader field="billNumber" label="Bill #" onSort={handleSort} sortColumn={sortColumn} sortDirection={sortDirection} />
                  <SortableHeader field="date" label="Date" onSort={handleSort} sortColumn={sortColumn} sortDirection={sortDirection} />
                  <SortableHeader field="productName" label="Product Name" onSort={handleSort} sortColumn={sortColumn} sortDirection={sortDirection} />
                  <SortableHeader field="category" label="Category" onSort={handleSort} sortColumn={sortColumn} sortDirection={sortDirection} />
                  <SortableHeader field="vendor" label="Vendor" onSort={handleSort} sortColumn={sortColumn} sortDirection={sortDirection} />
                  <SortableHeader field="mrp" label="MRP" style={{ textAlign: 'right' }} onSort={handleSort} sortColumn={sortColumn} sortDirection={sortDirection} />
                  <SortableHeader field="totalQuantity" label="Qty" style={{ textAlign: 'right' }} onSort={handleSort} sortColumn={sortColumn} sortDirection={sortDirection} />
                  <SortableHeader field="totalAmount" label="Nett Amount" style={{ textAlign: 'right' }} onSort={handleSort} sortColumn={sortColumn} sortDirection={sortDirection} />
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    Total Profit
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
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
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelectProduct(row.id); }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                          title={isSelected ? 'Deselect' : 'Select'}
                        >
                          {isSelected ? <CheckSquare size={16} color="#3b82f6" /> : <Square size={16} color="#cbd5e1" />}
                        </button>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {row.billId ? (
                          <button
                            onClick={() => onNavigateToBill(row.billNumber)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '14px', fontWeight: '600', color: '#2563eb' }}
                            title={`View Bill ${row.billNumber}`}
                          >
                            {row.billNumber}
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>&mdash;</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>
                          {formatDate(row.date) || <span style={{ color: '#94a3b8' }}>&mdash;</span>}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                          {renderEditableCell(row, 'productName')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{getCategoryBadge(row.category)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: '#475569' }}>
                          {row.vendor || <span style={{ color: '#94a3b8' }}>&mdash;</span>}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                          {renderEditableCell(row, 'mrp', 'number')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                          {renderEditableCell(row, 'totalQuantity', 'number')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                          {renderEditableCell(row, 'totalAmount', 'number')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: rowProfit >= 0 ? '#10b981' : '#ef4444' }}>
                          {formatCurrency(rowProfit)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                          {row.billId ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveFromBill(row); }}
                              style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid #fed7aa', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ea580c', transition: 'all 0.15s' }}
                              title={`Remove from ${row.billNumber}`}
                              aria-label="Remove from Bill"
                            >
                              <Unlink size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenAssignModal(row); }}
                              style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid #bbf7d0', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#16a34a', transition: 'all 0.15s' }}
                              title="Assign to Bill"
                              aria-label="Assign to Bill"
                            >
                              <Link2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedProduct(row); setModalOpen(true); }}
                            style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.15s' }}
                            title="Edit Product"
                            aria-label="Edit Product"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteRow(row.id); }}
                            style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', transition: 'all 0.15s' }}
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
                  <td style={{ padding: '12px 16px' }} />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center', padding: '60px 20px' }}>
            <Package size={48} style={{ margin: '0 auto 16px', color: '#9ca3af' }} />
            <h3 style={{ fontSize: '18px', color: '#374151', marginBottom: '8px' }}>No products found</h3>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              {search || filterCategory || filterPriceMin || filterPriceMax || filterBillStatus
                ? 'Try adjusting your search or filters'
                : 'Add your first product to get started'}
            </p>
            {!search && !filterCategory && !filterPriceMin && !filterPriceMax && !filterBillStatus && (
              <button
                onClick={handleAddRow}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  fontSize: '14px', fontWeight: '600', color: '#fff', cursor: 'pointer',
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
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: '12px',
          background: '#1e293b', color: 'white',
          padding: '12px 20px', borderRadius: '14px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)', zIndex: 1000,
        }}>
          <span style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#3b82f6', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: '700' }}>
              {selectedProducts.size}
            </span>
            selected
          </span>
          <div style={{ width: '1px', height: '24px', background: '#475569' }} />
          {Array.from(selectedProducts).some(id => !sortedData.find(p => p.id === id)?.billId) && (
            <button
              onClick={handleOpenBulkAssignModal}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#16a34a', border: 'none', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600', padding: '6px 12px', borderRadius: '8px', transition: 'all 0.15s' }}
            >
              <Link2 size={14} /> Assign to Bill
            </button>
          )}
          <button
            onClick={handleBulkDelete}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#dc2626', border: 'none', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600', padding: '6px 12px', borderRadius: '8px', transition: 'all 0.15s' }}
          >
            <Trash2 size={14} /> Delete
          </button>
          <button
            onClick={handleClearSelection}
            style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', borderRadius: '8px', transition: 'all 0.15s', marginLeft: '4px' }}
            title="Clear selection"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ===== MODALS ===== */}
      <AssignBillModal
        isOpen={assignModalOpen}
        onClose={() => { setAssignModalOpen(false); setProductsToAssign([]); }}
        onAssign={handleAssignToBill}
        products={productsToAssign}
        mode={assignMode}
      />
      <ProductModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        product={selectedProduct}
        onSave={handleModalSave}
        mode={selectedProduct ? 'edit' : 'create'}
        bill={selectedProduct?.billId ? { id: selectedProduct.billId, billNumber: selectedProduct.billNumber, vendor: selectedProduct.vendor } : null}
      />
      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </>
  );
};

export default ProductsView;
