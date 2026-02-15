import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, Plus, X, ChevronDown, ChevronUp,
  Package, AlertTriangle, CheckCircle, Clock,
  FileText, Edit, Trash2, TrendingUp,
  TrendingDown, Minus, Users
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import ErrorBoundary from '../ui/ErrorBoundary';
import { useVendors } from '../../context/VendorsContext';
import { useBills } from '../../context/BillsContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useNotifications } from '../ui/NotificationSystem';

// --- Styles ---
const STYLES = {
  headerCell: {
    padding: '12px 16px', textAlign: 'left',
    fontSize: '12px', fontWeight: '600', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
  },
  tableCell: { padding: '12px 16px' },
  subHeaderCell: {
    padding: '10px 16px', textAlign: 'left',
    fontSize: '11px', fontWeight: '600', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0',
  },
  subTableCell: { padding: '10px 16px' },
};

// --- Extracted components ---
const SummaryCard = ({ label, value, subtitle, icon: Icon, color, bgColor }) => (
  <div style={{
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
    padding: '20px', position: 'relative', overflow: 'hidden',
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
      {value}
    </div>
    <div style={{ fontSize: '13px', color: '#94a3b8' }}>{subtitle}</div>
  </div>
);

const PriceTrend = ({ lastPrice, offeredPrice }) => {
  if (!lastPrice || !offeredPrice) return <Minus size={14} color="#94a3b8" />;
  if (offeredPrice < lastPrice) return <TrendingDown size={14} color="#10b981" />;
  if (offeredPrice > lastPrice) return <TrendingUp size={14} color="#ef4444" />;
  return <Minus size={14} color="#94a3b8" />;
};

// --- Main component ---
const VendorsView = ({ onNavigateToBill }) => {
  const {
    vendors, vendorProducts, loading,
    loadVendorProducts,
    handleAddVendor, handleUpdateVendor, handleDeleteVendor,
    handleAddVendorProduct,
  } = useVendors();

  const { bills, billProducts } = useBills();
  const { showSuccess, showError } = useNotifications();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [expandedSubTab, setExpandedSubTab] = useState({}); // vendorId -> 'products' | 'bills'
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedVendorForProduct, setSelectedVendorForProduct] = useState(null);

  // Form state for add/edit vendor
  const [vendorForm, setVendorForm] = useState({
    name: '', phone: '', email: '', gstin: '', address: '', notes: ''
  });

  // Form state for add vendor product
  const [productForm, setProductForm] = useState({
    productName: '', category: '', offeredPrice: ''
  });

  // Compute vendor stats from bills
  const vendorStats = useMemo(() => {
    const stats = {};
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    bills.forEach(bill => {
      const vendorName = (bill.vendor || '').trim().toLowerCase();
      if (!vendorName) return;

      if (!stats[vendorName]) {
        stats[vendorName] = {
          totalBills: 0, totalAmount: 0, paidAmount: 0,
          outstandingAmount: 0, overdueAmount: 0,
          lastBillDate: null, billIds: [], productPrices: {}
        };
      }

      const s = stats[vendorName];
      s.totalBills++;
      s.totalAmount += bill.totalAmount || 0;
      s.billIds.push(bill.id);

      if (bill.status === 'paid') {
        s.paidAmount += bill.totalAmount || 0;
      } else {
        s.outstandingAmount += bill.totalAmount || 0;
        if (bill.dueDate) {
          const dueDate = bill.dueDate?.toDate ? bill.dueDate.toDate() :
            bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate);
          if (dueDate < now) {
            s.overdueAmount += bill.totalAmount || 0;
          }
        }
      }

      // Track last bill date
      const billDate = bill.date?.toDate ? bill.date.toDate() :
        bill.date instanceof Date ? bill.date : new Date(bill.date);
      if (!s.lastBillDate || billDate > s.lastBillDate) {
        s.lastBillDate = billDate;
      }

      // Track product prices from this bill
      const products = billProducts[bill.id] || [];
      products.forEach(product => {
        const pName = (product.productName || '').trim().toLowerCase();
        if (!pName) return;
        const existing = s.productPrices[pName];
        if (!existing || billDate > existing.date) {
          s.productPrices[pName] = {
            productName: product.productName,
            category: product.category || '',
            lastPrice: product.pricePerPiece || product.mrp || 0,
            date: billDate,
            billNumber: bill.billNumber,
          };
        }
      });
    });
    return stats;
  }, [bills, billProducts]);

  // Merge vendor records with bill stats
  const enrichedVendors = useMemo(() => {
    // Start with registered vendors
    const vendorMap = new Map();

    vendors.forEach(v => {
      const key = v.name.trim().toLowerCase();
      vendorMap.set(key, {
        ...v,
        stats: vendorStats[key] || {
          totalBills: 0, totalAmount: 0, paidAmount: 0,
          outstandingAmount: 0, overdueAmount: 0,
          lastBillDate: null, billIds: [], productPrices: {}
        }
      });
    });

    // Add vendors that only exist in bills (not registered)
    Object.entries(vendorStats).forEach(([key, stats]) => {
      if (!vendorMap.has(key)) {
        vendorMap.set(key, {
          id: `unregistered_${key}`,
          name: stats.totalBills > 0 ?
            bills.find(b => (b.vendor || '').trim().toLowerCase() === key)?.vendor || key :
            key,
          phone: '', email: '', gstin: '', address: '', notes: '',
          isUnregistered: true,
          stats
        });
      }
    });

    return Array.from(vendorMap.values());
  }, [vendors, vendorStats, bills]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let totalOutstanding = 0;
    let totalOverdue = 0;
    let activeCount = 0;
    let withOutstandingCount = 0;
    let overdueCount = 0;

    enrichedVendors.forEach(v => {
      totalOutstanding += v.stats.outstandingAmount;
      totalOverdue += v.stats.overdueAmount;
      if (v.stats.lastBillDate && v.stats.lastBillDate >= thirtyDaysAgo) {
        activeCount++;
      }
      if (v.stats.outstandingAmount > 0) withOutstandingCount++;
      if (v.stats.overdueAmount > 0) overdueCount++;
    });

    return {
      total: enrichedVendors.length,
      active: activeCount,
      outstanding: { amount: totalOutstanding, count: withOutstandingCount },
      overdue: { amount: totalOverdue, count: overdueCount },
    };
  }, [enrichedVendors]);

  // Filter vendors
  const filteredVendors = useMemo(() => {
    let result = [...enrichedVendors];

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(v =>
        v.name.toLowerCase().includes(search) ||
        (v.phone && v.phone.includes(search)) ||
        (v.gstin && v.gstin.toLowerCase().includes(search))
      );
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (activeTab === 'active') {
      result = result.filter(v => v.stats.lastBillDate && v.stats.lastBillDate >= thirtyDaysAgo);
    } else if (activeTab === 'outstanding') {
      result = result.filter(v => v.stats.outstandingAmount > 0);
    } else if (activeTab === 'inactive') {
      result = result.filter(v => !v.stats.lastBillDate || v.stats.lastBillDate < thirtyDaysAgo);
    }

    // Sort: vendors with most bills first
    result.sort((a, b) => b.stats.totalBills - a.stats.totalBills);

    return result;
  }, [enrichedVendors, searchTerm, activeTab]);

  const toggleRowExpanded = (vendorId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(vendorId)) {
        next.delete(vendorId);
      } else {
        next.add(vendorId);
        // Load vendor products if registered vendor
        if (!vendorId.startsWith('unregistered_')) {
          loadVendorProducts(vendorId);
        }
        // Default sub-tab
        if (!expandedSubTab[vendorId]) {
          setExpandedSubTab(prev => ({ ...prev, [vendorId]: 'products' }));
        }
      }
      return next;
    });
  };

  const getVendorBills = useCallback((vendorName) => {
    const name = vendorName.trim().toLowerCase();
    return bills
      .filter(b => (b.vendor || '').trim().toLowerCase() === name)
      .sort((a, b) => {
        const aDate = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const bDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return bDate - aDate;
      })
      .slice(0, 5);
  }, [bills]);

  const openAddModal = () => {
    setVendorForm({ name: '', phone: '', email: '', gstin: '', address: '', notes: '' });
    setEditingVendor(null);
    setShowAddModal(true);
  };

  const openEditModal = (vendor) => {
    setVendorForm({
      name: vendor.name || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      gstin: vendor.gstin || '',
      address: vendor.address || '',
      notes: vendor.notes || '',
    });
    setEditingVendor(vendor);
    setShowAddModal(true);
  };

  const handleSaveVendor = async () => {
    if (!vendorForm.name.trim()) return;
    try {
      if (editingVendor && !editingVendor.isUnregistered) {
        await handleUpdateVendor(editingVendor.id, vendorForm);
        showSuccess('Vendor updated successfully!');
      } else {
        await handleAddVendor(vendorForm);
        showSuccess('Vendor added successfully!');
      }
      setShowAddModal(false);
      setEditingVendor(null);
    } catch (err) {
      console.error('Error saving vendor:', err);
      showError('Failed to save vendor. Please try again.');
    }
  };

  const handleDeleteVendorClick = async (vendor) => {
    if (vendor.isUnregistered) return;
    if (!window.confirm(`Delete vendor "${vendor.name}"? This won't delete their bills.`)) return;
    try {
      await handleDeleteVendor(vendor.id);
      showSuccess(`Vendor "${vendor.name}" deleted!`);
    } catch (err) {
      console.error('Error deleting vendor:', err);
      showError('Failed to delete vendor. Please try again.');
    }
  };

  const openAddProductModal = (vendor) => {
    setSelectedVendorForProduct(vendor);
    setProductForm({ productName: '', category: '', offeredPrice: '' });
    setShowAddProductModal(true);
  };

  const handleSaveVendorProduct = async () => {
    if (!productForm.productName.trim() || !selectedVendorForProduct) return;
    try {
      let vendorId = selectedVendorForProduct.id;
      // If unregistered, register them first
      if (selectedVendorForProduct.isUnregistered) {
        vendorId = await handleAddVendor({ name: selectedVendorForProduct.name });
      }
      await handleAddVendorProduct(vendorId, {
        productName: productForm.productName.trim(),
        category: productForm.category.trim(),
        offeredPrice: parseFloat(productForm.offeredPrice) || 0,
        priceHistory: [{
          price: parseFloat(productForm.offeredPrice) || 0,
          date: new Date().toISOString(),
          source: 'manual'
        }]
      });
      setShowAddProductModal(false);
      setSelectedVendorForProduct(null);
      showSuccess('Product added to vendor catalog!');
    } catch (err) {
      console.error('Error saving vendor product:', err);
      showError('Failed to add product. Please try again.');
    }
  };

  // Get merged product list (from vendor catalog + bill history)
  const getMergedProducts = (vendor) => {
    const catalogProducts = vendorProducts[vendor.id] || [];
    const billPrices = vendor.stats.productPrices || {};
    const merged = new Map();

    // Add catalog products
    catalogProducts.forEach(p => {
      const key = p.productName.trim().toLowerCase();
      merged.set(key, {
        ...p,
        offeredPrice: p.offeredPrice || 0,
        lastPrice: billPrices[key]?.lastPrice || null,
        lastPurchaseDate: billPrices[key]?.date || null,
        lastBillNumber: billPrices[key]?.billNumber || null,
        source: 'catalog',
      });
    });

    // Add bill-only products not in catalog
    Object.entries(billPrices).forEach(([key, data]) => {
      if (!merged.has(key)) {
        merged.set(key, {
          productName: data.productName,
          category: data.category,
          offeredPrice: null,
          lastPrice: data.lastPrice,
          lastPurchaseDate: data.date,
          lastBillNumber: data.billNumber,
          source: 'bill',
        });
      }
    });

    return Array.from(merged.values());
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <Card style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ color: '#64748b', fontSize: '14px' }}>Loading vendors...</div>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          marginBottom: '24px', flexWrap: 'wrap', gap: '12px',
        }}>
          <div>
            <h2 style={{
              fontSize: '24px', fontWeight: '800', color: '#0f172a',
              margin: '0 0 4px 0', letterSpacing: '-0.02em'
            }}>
              Vendors
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
              Manage suppliers, track prices and payments
            </p>
          </div>
          <Button
            variant="primary"
            size="small"
            icon={<Plus size={14} />}
            onClick={openAddModal}
            style={{ borderRadius: '8px', fontWeight: '600' }}
          >
            New Vendor
          </Button>
        </div>

        {/* Summary Cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px', marginBottom: '24px',
        }}>
          <SummaryCard
            label="Total Vendors" value={summaryStats.total}
            subtitle="vendors" icon={Users} color="#0f172a" bgColor="#f1f5f9"
          />
          <SummaryCard
            label="Active Vendors" value={summaryStats.active}
            subtitle="last 30 days" icon={CheckCircle} color="#10b981" bgColor="#ecfdf5"
          />
          <SummaryCard
            label="Outstanding" value={formatCurrency(summaryStats.outstanding.amount)}
            subtitle={`${summaryStats.outstanding.count} vendor${summaryStats.outstanding.count !== 1 ? 's' : ''}`}
            icon={Clock} color="#f59e0b" bgColor="#fff7ed"
          />
          <SummaryCard
            label="Overdue" value={formatCurrency(summaryStats.overdue.amount)}
            subtitle={`${summaryStats.overdue.count} vendor${summaryStats.overdue.count !== 1 ? 's' : ''}`}
            icon={AlertTriangle} color="#ef4444" bgColor="#fef2f2"
          />
        </div>

        {/* Search + Tabs */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          marginBottom: '16px', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <Input
              placeholder="Search vendors by name, phone, or GSTIN..."
              icon={<Search size={14} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              containerStyle={{ marginBottom: 0 }}
              style={{ background: '#fff', border: '1px solid #e2e8f0', fontSize: '13px', padding: '10px 12px' }}
            />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: '#f1f5f9', borderRadius: '8px', padding: '3px',
          }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'outstanding', label: 'Outstanding' },
              { key: 'inactive', label: 'Inactive' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '6px 16px', border: 'none', borderRadius: '6px',
                  fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: activeTab === tab.key ? '#1e293b' : 'transparent',
                  color: activeTab === tab.key ? '#fff' : '#64748b',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ marginBottom: '24px' }}>
          {filteredVendors.length > 0 ? (
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...STYLES.headerCell, width: '32px', padding: '12px 8px' }} />
                    <th style={STYLES.headerCell}>Vendor</th>
                    <th style={STYLES.headerCell}>Phone</th>
                    <th style={STYLES.headerCell}>GSTIN</th>
                    <th style={{ ...STYLES.headerCell, textAlign: 'center' }}>Products</th>
                    <th style={{ ...STYLES.headerCell, textAlign: 'center' }}>Bills</th>
                    <th style={{ ...STYLES.headerCell, textAlign: 'right' }}>Outstanding</th>
                    <th style={{ ...STYLES.headerCell, textAlign: 'center', width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor, idx) => {
                    const isExpanded = expandedRows.has(vendor.id);
                    const subTab = expandedSubTab[vendor.id] || 'products';
                    const mergedProducts = isExpanded ? getMergedProducts(vendor) : [];
                    const recentBills = isExpanded ? getVendorBills(vendor.name) : [];
                    const productCount = Object.keys(vendor.stats.productPrices).length;

                    return (
                      <React.Fragment key={vendor.id}>
                        <tr style={{
                          borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? '#fff' : '#fafbfc',
                          transition: 'background 0.15s',
                        }}>
                          <td style={{ padding: '12px 8px' }}>
                            <button
                              onClick={() => toggleRowExpanded(vendor.id)}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                                color: '#94a3b8', transition: 'color 0.15s',
                              }}
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </td>
                          <td style={STYLES.tableCell}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                                {vendor.name}
                              </span>
                              {vendor.isUnregistered && (
                                <span style={{
                                  fontSize: '10px', fontWeight: '600', color: '#f59e0b',
                                  background: '#fef3c7', padding: '1px 6px', borderRadius: '4px',
                                }}>
                                  From Bills
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={STYLES.tableCell}>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>
                              {vendor.phone || '-'}
                            </span>
                          </td>
                          <td style={STYLES.tableCell}>
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>
                              {vendor.gstin ? vendor.gstin.substring(0, 15) : '-'}
                            </span>
                          </td>
                          <td style={{ ...STYLES.tableCell, textAlign: 'center' }}>
                            <span style={{
                              fontSize: '12px', fontWeight: '500', color: '#64748b',
                              background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px',
                            }}>
                              {productCount} item{productCount !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td style={{ ...STYLES.tableCell, textAlign: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                              {vendor.stats.totalBills}
                            </span>
                          </td>
                          <td style={{ ...STYLES.tableCell, textAlign: 'right' }}>
                            <span style={{
                              fontSize: '14px', fontWeight: '700',
                              color: vendor.stats.outstandingAmount > 0 ? '#ef4444' : '#10b981',
                            }}>
                              {vendor.stats.outstandingAmount > 0
                                ? formatCurrency(vendor.stats.outstandingAmount)
                                : 'Settled'}
                            </span>
                          </td>
                          <td style={{ ...STYLES.tableCell, textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditModal(vendor); }}
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  padding: '4px', borderRadius: '4px', color: '#94a3b8',
                                }}
                                title="Edit vendor"
                              >
                                <Edit size={14} />
                              </button>
                              {!vendor.isUnregistered && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteVendorClick(vendor); }}
                                  style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    padding: '4px', borderRadius: '4px', color: '#94a3b8',
                                  }}
                                  title="Delete vendor"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Section */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} style={{ padding: 0 }}>
                              <div style={{
                                background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0',
                              }}>
                                {/* Sub-tabs */}
                                <div style={{
                                  display: 'flex', gap: '0', borderBottom: '1px solid #e2e8f0',
                                  padding: '0 20px',
                                }}>
                                  {['products', 'bills'].map(tab => (
                                    <button
                                      key={tab}
                                      onClick={() => setExpandedSubTab(prev => ({ ...prev, [vendor.id]: tab }))}
                                      style={{
                                        padding: '10px 16px', border: 'none', background: 'none',
                                        fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                        color: subTab === tab ? '#1e293b' : '#94a3b8',
                                        borderBottom: subTab === tab ? '2px solid #1e293b' : '2px solid transparent',
                                        transition: 'all 0.15s',
                                      }}
                                    >
                                      {tab === 'products' ? 'Products & Prices' : 'Recent Bills'}
                                    </button>
                                  ))}
                                </div>

                                {/* Products Tab */}
                                {subTab === 'products' && (
                                  <div>
                                    {mergedProducts.length > 0 ? (
                                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                          <tr>
                                            <th style={{ ...STYLES.subHeaderCell, padding: '10px 20px 10px 40px' }}>Product</th>
                                            <th style={STYLES.subHeaderCell}>Category</th>
                                            <th style={{ ...STYLES.subHeaderCell, textAlign: 'right' }}>Last Price</th>
                                            <th style={{ ...STYLES.subHeaderCell, textAlign: 'right' }}>Offered</th>
                                            <th style={{ ...STYLES.subHeaderCell, textAlign: 'center' }}>Trend</th>
                                            <th style={STYLES.subHeaderCell}>Last Bill</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {mergedProducts.map((product, pIdx) => (
                                            <tr key={pIdx} style={{
                                              borderBottom: pIdx < mergedProducts.length - 1 ? '1px solid #eef0f2' : 'none',
                                            }}>
                                              <td style={{ ...STYLES.subTableCell, padding: '10px 20px 10px 40px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                                                  {product.productName}
                                                </span>
                                              </td>
                                              <td style={STYLES.subTableCell}>
                                                <span style={{
                                                  fontSize: '12px', color: '#94a3b8',
                                                  background: '#eef0f2', padding: '1px 6px', borderRadius: '4px',
                                                }}>
                                                  {product.category || '-'}
                                                </span>
                                              </td>
                                              <td style={{ ...STYLES.subTableCell, textAlign: 'right' }}>
                                                <span style={{ fontSize: '13px', color: '#64748b' }}>
                                                  {product.lastPrice ? formatCurrency(product.lastPrice) : '-'}
                                                </span>
                                              </td>
                                              <td style={{ ...STYLES.subTableCell, textAlign: 'right' }}>
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                                                  {product.offeredPrice ? formatCurrency(product.offeredPrice) : '-'}
                                                </span>
                                              </td>
                                              <td style={{ ...STYLES.subTableCell, textAlign: 'center' }}>
                                                <PriceTrend lastPrice={product.lastPrice} offeredPrice={product.offeredPrice} />
                                              </td>
                                              <td style={STYLES.subTableCell}>
                                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                  {product.lastBillNumber || '-'}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                        <Package size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                                        <div>No products tracked for this vendor</div>
                                      </div>
                                    )}
                                    <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0' }}>
                                      <Button
                                        variant="outline"
                                        size="small"
                                        icon={<Plus size={12} />}
                                        onClick={() => openAddProductModal(vendor)}
                                        style={{ fontSize: '12px', borderRadius: '6px' }}
                                      >
                                        Add Product to Catalog
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {/* Bills Tab */}
                                {subTab === 'bills' && (
                                  <div>
                                    {recentBills.length > 0 ? (
                                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                          <tr>
                                            <th style={{ ...STYLES.subHeaderCell, padding: '10px 20px 10px 40px' }}>Bill #</th>
                                            <th style={STYLES.subHeaderCell}>Date</th>
                                            <th style={{ ...STYLES.subHeaderCell, textAlign: 'center' }}>Items</th>
                                            <th style={{ ...STYLES.subHeaderCell, textAlign: 'right' }}>Amount</th>
                                            <th style={{ ...STYLES.subHeaderCell, textAlign: 'center' }}>Status</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {recentBills.map((bill, bIdx) => {
                                            const products = billProducts[bill.id] || [];
                                            const itemCount = bill.productCount || products.length || 0;
                                            return (
                                              <tr key={bill.id} style={{
                                                borderBottom: bIdx < recentBills.length - 1 ? '1px solid #eef0f2' : 'none',
                                                cursor: onNavigateToBill ? 'pointer' : 'default',
                                              }}
                                                onClick={() => onNavigateToBill && onNavigateToBill(bill.billNumber)}
                                              >
                                                <td style={{ ...STYLES.subTableCell, padding: '10px 20px 10px 40px' }}>
                                                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                                                    {bill.billNumber}
                                                  </span>
                                                </td>
                                                <td style={STYLES.subTableCell}>
                                                  <span style={{ fontSize: '13px', color: '#64748b' }}>
                                                    {formatDate(bill.date)}
                                                  </span>
                                                </td>
                                                <td style={{ ...STYLES.subTableCell, textAlign: 'center' }}>
                                                  <span style={{
                                                    fontSize: '12px', fontWeight: '500', color: '#64748b',
                                                    background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px',
                                                  }}>
                                                    {itemCount}
                                                  </span>
                                                </td>
                                                <td style={{ ...STYLES.subTableCell, textAlign: 'right' }}>
                                                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                                                    {formatCurrency(bill.totalAmount)}
                                                  </span>
                                                </td>
                                                <td style={{ ...STYLES.subTableCell, textAlign: 'center' }}>
                                                  {bill.status === 'paid' ? (
                                                    <Badge variant="success" size="small" style={{ fontWeight: 600, fontSize: '11px' }}>Paid</Badge>
                                                  ) : (
                                                    <Badge variant="warning" size="small" style={{ fontWeight: 600, fontSize: '11px' }}>Pending</Badge>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                        <FileText size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                                        <div>No bills found for this vendor</div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Card style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Users size={48} style={{ margin: '0 auto 16px', color: '#9ca3af' }} />
              <h3 style={{ fontSize: '18px', color: '#374151', marginBottom: '8px' }}>
                No vendors found
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                {searchTerm ? 'Try adjusting your search' : 'Add your first vendor or create a bill to get started'}
              </p>
              {!searchTerm && (
                <Button variant="primary" icon={<Plus size={16} />} onClick={openAddModal}>
                  Add First Vendor
                </Button>
              )}
            </Card>
          )}
        </div>

        {/* ===== ADD/EDIT VENDOR MODAL ===== */}
        {showAddModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 9999,
          }}
            onClick={() => setShowAddModal(false)}
          >
            <div
              style={{
                background: '#fff', borderRadius: '16px', padding: '24px',
                width: '500px', maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '20px',
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                  {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Input
                  label="Vendor Name *"
                  placeholder="Enter vendor name"
                  value={vendorForm.name}
                  onChange={e => setVendorForm(prev => ({ ...prev, name: e.target.value }))}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <Input
                    label="Phone"
                    placeholder="9876543210"
                    value={vendorForm.phone}
                    onChange={e => setVendorForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                  <Input
                    label="Email"
                    placeholder="vendor@email.com"
                    value={vendorForm.email}
                    onChange={e => setVendorForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <Input
                  label="GSTIN"
                  placeholder="29ABCDE1234F1Z5"
                  value={vendorForm.gstin}
                  onChange={e => setVendorForm(prev => ({ ...prev, gstin: e.target.value }))}
                />
                <Input
                  label="Address"
                  placeholder="Full address"
                  value={vendorForm.address}
                  onChange={e => setVendorForm(prev => ({ ...prev, address: e.target.value }))}
                />
                <Input
                  label="Notes"
                  placeholder="Any notes about this vendor"
                  value={vendorForm.notes}
                  onChange={e => setVendorForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleSaveVendor}>
                  {editingVendor ? 'Save Changes' : 'Add Vendor'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ===== ADD PRODUCT TO VENDOR MODAL ===== */}
        {showAddProductModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 9999,
          }}
            onClick={() => setShowAddProductModal(false)}
          >
            <div
              style={{
                background: '#fff', borderRadius: '16px', padding: '24px',
                width: '420px', maxWidth: '90vw',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '20px',
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                  Add Product — {selectedVendorForProduct?.name}
                </h3>
                <button
                  onClick={() => setShowAddProductModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Input
                  label="Product Name *"
                  placeholder="e.g. Cotton Shirt"
                  value={productForm.productName}
                  onChange={e => setProductForm(prev => ({ ...prev, productName: e.target.value }))}
                />
                <Input
                  label="Category"
                  placeholder="e.g. Clothing"
                  value={productForm.category}
                  onChange={e => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                />
                <Input
                  label="Offered Price (per unit)"
                  type="number"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  value={productForm.offeredPrice}
                  onChange={e => setProductForm(prev => ({ ...prev, offeredPrice: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <Button variant="outline" onClick={() => setShowAddProductModal(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleSaveVendorProduct}>Add Product</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default VendorsView;
