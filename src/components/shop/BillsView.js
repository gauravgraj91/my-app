import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  Download,
  Calendar,
  Package,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  SortAsc,
  SortDesc,
  X,
  CheckSquare,
  Square,
  Trash2,
  Copy,
  Archive,
  AlertTriangle,
  IndianRupee,
  CheckCircle,
  Clock
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Badge from '../ui/Badge';
import ErrorBoundary from '../ui/ErrorBoundary';
import {
  BillsListLoading,
  BulkOperationLoading
} from '../ui/LoadingStates';
import BillCreateModal from './BillCreateModal';
import ProductModal from './ProductModal';
import ConflictResolutionModal from './ConflictResolutionModal';
import { useBills } from '../../context/BillsContext';
import { getErrorMessage, getRecoveryOptions } from '../../utils/errorHandling';
import { usePagination } from '../../hooks/usePagination';
import { billCacheUtils } from '../../utils/cacheUtils';
import { formatCurrency, formatDate } from '../../utils/formatters';

// --- Common styles ---
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

// --- Extracted sub-components ---

const SortableHeader = ({ field, label, style: headerStyle = {}, sortField, sortDirection, handleSort }) => (
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
      {sortField === field && (
        sortDirection === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />
      )}
    </span>
  </th>
);

const SummaryCard = ({ label, amount, count, icon: Icon, color, bgColor }) => (
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
      {formatCurrency(amount)}
    </div>
    <div style={{ fontSize: '13px', color: '#94a3b8' }}>
      {count} bill{count !== 1 ? 's' : ''}
    </div>
  </div>
);

const BulkActionButton = ({ icon: Icon, label, onClick, disabled, variant = 'default' }) => {
  const isDanger = variant === 'danger';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        background: isDanger ? '#dc2626' : 'none', border: 'none',
        color: isDanger ? 'white' : '#cbd5e1',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '13px', fontWeight: isDanger ? '600' : '500',
        padding: isDanger ? '6px 12px' : '6px 10px',
        borderRadius: '8px', transition: 'all 0.15s',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={e => {
        if (!disabled) {
          if (isDanger) { e.currentTarget.style.background = '#b91c1c'; }
          else { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = 'white'; }
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = isDanger ? '#dc2626' : 'none';
        e.currentTarget.style.color = isDanger ? 'white' : '#cbd5e1';
      }}
    >
      <Icon size={14} /> {label}
    </button>
  );
};

// --- Range filter helper ---
const applyRangeFilter = (items, getValue, min, max) => {
  let result = items;
  if (min !== undefined && min !== '') {
    const minVal = parseFloat(min);
    if (!isNaN(minVal)) {
      result = result.filter(item => getValue(item) >= minVal);
    }
  }
  if (max !== undefined && max !== '') {
    const maxVal = parseFloat(max);
    if (!isNaN(maxVal)) {
      result = result.filter(item => getValue(item) <= maxVal);
    }
  }
  return result;
};

const BillsView = ({ searchTerm: externalSearchTerm, onSearchChange, onProductClick }) => {
  const {
    bills,
    billProducts,
    loading,
    error,
    isRetrying,
    retryCount,
    analytics,
    analyticsLoading,

    selectedBills,
    handleSelectBill,
    handleSelectAll,
    clearSelection,

    handleCreateBill,
    handleEditBill,
    handleDeleteBill,
    handleDuplicateBill,
    handleExportBill,
    handleAddProductToBill,

    bulkActionLoading,
    bulkOperationStatus,
    handleBulkDelete,
    handleBulkDuplicate,
    handleBulkArchive,
    handleBulkExport,

    conflicts,
    showConflictModal,
    setShowConflictModal,
    handleAcknowledgeConflict,
    handleClearAllConflicts,

    retrySubscription,
  } = useBills();

  // Local UI state
  const [searchTerm, setSearchTerm] = useState(externalSearchTerm || '');
  const [filters, setFilters] = useState({
    vendor: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    minProfit: '',
    maxProfit: '',
    minProductCount: '',
    maxProductCount: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeStatusTab, setActiveStatusTab] = useState('all');

  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedBillForProduct, setSelectedBillForProduct] = useState(null);

  // Expanded rows for table
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Sync external search term
  useEffect(() => {
    if (externalSearchTerm !== undefined) {
      setSearchTerm(externalSearchTerm);
    }
  }, [externalSearchTerm]);

  // Compute summary stats
  const summaryStats = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let paidBills = [];
    let pendingBills = [];
    let overdueBills = [];

    bills.forEach(bill => {
      if (bill.status === 'paid') {
        paidBills.push(bill);
      } else if (bill.status === 'returned') {
        overdueBills.push(bill);
      } else if (bill.status === 'active') {
        // Check if overdue
        if (bill.dueDate) {
          const dueDate = bill.dueDate?.toDate ? bill.dueDate.toDate() :
            bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate);
          if (dueDate < now) {
            overdueBills.push(bill);
          } else {
            pendingBills.push(bill);
          }
        } else {
          pendingBills.push(bill);
        }
      } else {
        pendingBills.push(bill);
      }
    });

    const sum = (arr) => arr.reduce((acc, b) => acc + (b.totalAmount || 0), 0);

    return {
      total: { count: bills.length, amount: sum(bills) },
      paid: { count: paidBills.length, amount: sum(paidBills) },
      pending: { count: pendingBills.length, amount: sum(pendingBills) },
      overdue: { count: overdueBills.length, amount: sum(overdueBills) },
    };
  }, [bills]);

  // Handle status tab click
  const handleStatusTabClick = (tab) => {
    setActiveStatusTab(tab);
    if (tab === 'all') {
      setFilters(prev => ({ ...prev, status: '' }));
    } else if (tab === 'paid') {
      setFilters(prev => ({ ...prev, status: 'paid' }));
    } else if (tab === 'pending') {
      setFilters(prev => ({ ...prev, status: 'active' }));
    } else if (tab === 'overdue') {
      setFilters(prev => ({ ...prev, status: 'returned' }));
    }
    setCurrentPage(1);
  };

  // Filter and sort bills
  const filteredAndSortedBills = useMemo(() => {
    let result = [...bills];

    // Apply search
    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(bill => {
        const billMatches =
          bill.billNumber.toLowerCase().includes(searchLower) ||
          bill.vendor.toLowerCase().includes(searchLower) ||
          (bill.notes && bill.notes.toLowerCase().includes(searchLower));

        if (billMatches) return true;

        const productsForBill = billProducts[bill.id] || [];
        return productsForBill.some(product =>
          (product.productName && product.productName.toLowerCase().includes(searchLower)) ||
          (product.category && product.category.toLowerCase().includes(searchLower)) ||
          (product.vendor && product.vendor.toLowerCase().includes(searchLower))
        );
      });
    }

    if (filters.vendor && filters.vendor.trim() !== '') {
      const vendorLower = filters.vendor.toLowerCase().trim();
      result = result.filter(bill =>
        bill.vendor && bill.vendor.toLowerCase().includes(vendorLower)
      );
    }

    if (filters.startDate) {
      result = result.filter(bill => {
        const billDate = bill.date?.toDate ? bill.date.toDate() :
          bill.date instanceof Date ? bill.date : new Date(bill.date);
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        return billDate >= startDate;
      });
    }

    if (filters.endDate) {
      result = result.filter(bill => {
        const billDate = bill.date?.toDate ? bill.date.toDate() :
          bill.date instanceof Date ? bill.date : new Date(bill.date);
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        return billDate <= endDate;
      });
    }

    result = applyRangeFilter(result, bill => bill.totalAmount || 0, filters.minAmount, filters.maxAmount);

    if (filters.status && filters.status !== '') {
      if (activeStatusTab === 'overdue') {
        // For overdue tab, show returned + overdue active bills
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        result = result.filter(bill => {
          if (bill.status === 'returned') return true;
          if (bill.status === 'active' && bill.dueDate) {
            const dueDate = bill.dueDate?.toDate ? bill.dueDate.toDate() :
              bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate);
            return dueDate < now;
          }
          return false;
        });
      } else {
        result = result.filter(bill => bill.status === filters.status);
      }
    }

    result = applyRangeFilter(result, bill => bill.totalProfit || 0, filters.minProfit, filters.maxProfit);
    result = applyRangeFilter(result, bill => bill.productCount || (billProducts[bill.id]?.length || 0), filters.minProductCount, filters.maxProductCount);

    // Sorting
    result.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'date' || sortField === 'dueDate') {
        aValue = a[sortField]?.toDate ? a[sortField].toDate() :
          a[sortField] instanceof Date ? a[sortField] : new Date(a[sortField] || 0);
        bValue = b[sortField]?.toDate ? b[sortField].toDate() :
          b[sortField] instanceof Date ? b[sortField] : new Date(b[sortField] || 0);
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? -1 : 1;
      if (bValue == null) return sortDirection === 'asc' ? 1 : -1;

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bills, billProducts, searchTerm, filters, sortField, sortDirection, activeStatusTab]);

  // Pagination
  const paginationConfig = usePagination(filteredAndSortedBills, itemsPerPage, {
    enableVirtualization: filteredAndSortedBills.length > 100,
    onPageChange: (page) => {
      setCurrentPage(page);
      if (page < totalPages) {
        const nextPageStart = page * itemsPerPage;
        const nextPageBills = filteredAndSortedBills.slice(nextPageStart, nextPageStart + itemsPerPage);
        nextPageBills.forEach(bill => {
          billCacheUtils.set(bill.id, bill);
        });
      }
    }
  });

  const paginatedBills = paginationConfig.currentPageData;
  const totalPages = Math.ceil(filteredAndSortedBills.length / itemsPerPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      vendor: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      minProfit: '',
      maxProfit: '',
      minProductCount: '',
      maxProductCount: '',
      status: ''
    });
    setActiveStatusTab('all');
    setCurrentPage(1);
  };

  const handleOpenAddProductModal = (bill) => {
    setSelectedBillForProduct(bill);
    setShowAddProductModal(true);
  };

  const onCreateBill = async (billData) => {
    await handleCreateBill(billData);
    setShowCreateModal(false);
  };

  const onAddProductToBill = async (productData) => {
    await handleAddProductToBill(productData, selectedBillForProduct);
    setShowAddProductModal(false);
    setSelectedBillForProduct(null);
  };

  const onSelectAll = () => {
    handleSelectAll(paginatedBills);
  };

  const toggleRowExpanded = (billId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(billId)) {
        next.delete(billId);
      } else {
        next.add(billId);
      }
      return next;
    });
  };

  const getStatusBadge = (bill) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (bill.status === 'paid') {
      return <Badge variant="success" size="small" style={{ fontWeight: 600, fontSize: '11px' }}>Paid</Badge>;
    }
    if (bill.status === 'returned') {
      return <Badge variant="danger" size="small" style={{ fontWeight: 600, fontSize: '11px' }}>Overdue</Badge>;
    }
    if (bill.status === 'active' && bill.dueDate) {
      const dueDate = bill.dueDate?.toDate ? bill.dueDate.toDate() :
        bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate);
      if (dueDate < now) {
        return <Badge variant="danger" size="small" style={{ fontWeight: 600, fontSize: '11px' }}>Overdue</Badge>;
      }
    }
    return <Badge variant="warning" size="small" style={{ fontWeight: 600, fontSize: '11px' }}>Pending</Badge>;
  };

  // Error state
  if (error && bills.length === 0 && !loading) {
    const errorMessage = getErrorMessage(error);
    const recoveryOptions = getRecoveryOptions(error);

    return (
      <div style={{ padding: '24px' }}>
        <ErrorBoundary
          title={errorMessage.title}
          message={errorMessage.message}
          fallback={(error, retry) => (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '400px',
              padding: '20px'
            }}>
              <Card style={{ maxWidth: '500px', textAlign: 'center' }}>
                <div style={{ marginBottom: '20px' }}>
                  <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
                  <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
                    {errorMessage.title}
                  </h2>
                  <p style={{ margin: '0 0 20px 0', color: '#6b7280', lineHeight: '1.5' }}>
                    {errorMessage.message}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {recoveryOptions.map((option, index) => (
                    <Button
                      key={index}
                      variant={option.primary ? 'primary' : 'secondary'}
                      onClick={() => {
                        if (option.action === 'retry') retrySubscription();
                        else if (option.action === 'go_back') window.history.back();
                      }}
                      loading={isRetrying && option.action === 'retry'}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                {retryCount > 0 && (
                  <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
                    Retry attempts: {retryCount}
                  </div>
                )}
              </Card>
            </div>
          )}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <BillsListLoading count={5} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="bills-view" style={{ padding: '24px' }}>
        {/* Bulk Operation Loading Overlay */}
        {bulkOperationStatus && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
          }}>
            <Card style={{ padding: 0, minWidth: '400px' }}>
              <BulkOperationLoading
                operation={bulkOperationStatus.operation}
                total={bulkOperationStatus.total}
                completed={bulkOperationStatus.completed}
                current={bulkOperationStatus.current}
              />
            </Card>
          </div>
        )}

        {/* ===== HEADER ===== */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          marginBottom: '24px', flexWrap: 'wrap', gap: '12px',
        }}>
          <div>
            <h2 style={{
              fontSize: '24px', fontWeight: '800', color: '#0f172a',
              margin: '0 0 4px 0', letterSpacing: '-0.02em'
            }}>
              Bills
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
              Manage and track all your bills in one place
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {conflicts.length > 0 && (
              <Button
                variant="outline"
                size="small"
                icon={<AlertTriangle size={14} />}
                onClick={() => setShowConflictModal(true)}
                style={{ borderColor: '#f59e0b', color: '#f59e0b', backgroundColor: '#fef3c7' }}
              >
                {conflicts.length} Conflict{conflicts.length !== 1 ? 's' : ''}
              </Button>
            )}
            <Button
              variant="outline"
              size="small"
              icon={<Download size={14} />}
              onClick={handleBulkExport}
              style={{ borderRadius: '8px' }}
            >
              Export
            </Button>
            <Button
              variant="primary"
              size="small"
              icon={<Plus size={14} />}
              onClick={() => setShowCreateModal(true)}
              style={{ borderRadius: '8px', fontWeight: '600' }}
            >
              New Bill
            </Button>
          </div>
        </div>

        {/* ===== SUMMARY CARDS ===== */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <SummaryCard label="Total Bills" amount={summaryStats.total.amount} count={summaryStats.total.count} icon={IndianRupee} color="#0f172a" bgColor="#f1f5f9" />
          <SummaryCard label="Paid" amount={summaryStats.paid.amount} count={summaryStats.paid.count} icon={CheckCircle} color="#10b981" bgColor="#ecfdf5" />
          <SummaryCard label="Pending" amount={summaryStats.pending.amount} count={summaryStats.pending.count} icon={Clock} color="#f59e0b" bgColor="#fff7ed" />
          <SummaryCard label="Overdue" amount={summaryStats.overdue.amount} count={summaryStats.overdue.count} icon={AlertTriangle} color="#ef4444" bgColor="#fef2f2" />
        </div>

        {/* ===== SEARCH BAR + STATUS TABS ===== */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          marginBottom: '16px', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <Input
              placeholder="Search bills by number, vendor, notes, or products..."
              icon={<Search size={14} />}
              value={searchTerm}
              onChange={(e) => {
                const newValue = e.target.value;
                setSearchTerm(newValue);
                if (onSearchChange) onSearchChange(newValue);
              }}
              containerStyle={{ marginBottom: 0 }}
              style={{ background: '#fff', border: '1px solid #e2e8f0', fontSize: '13px', padding: '10px 12px' }}
            />
          </div>

          <Button
            variant="outline"
            size="small"
            icon={<Filter size={14} />}
            onClick={() => setShowFilters(!showFilters)}
            style={{ borderRadius: '8px', padding: '8px 14px', fontSize: '13px' }}
          >
            Filters
          </Button>

          {/* Status Tabs */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: '#f1f5f9', borderRadius: '8px', padding: '3px',
          }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'paid', label: 'Paid' },
              { key: 'pending', label: 'Pending' },
              { key: 'overdue', label: 'Overdue' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => handleStatusTabClick(tab.key)}
                style={{
                  padding: '6px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: activeStatusTab === tab.key ? '#1e293b' : 'transparent',
                  color: activeStatusTab === tab.key ? '#fff' : '#64748b',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== ADVANCED FILTERS PANEL ===== */}
        {showFilters && (
          <Card style={{ marginBottom: '16px', padding: '16px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px', marginBottom: '16px'
            }}>
              <Input
                label="Vendor"
                placeholder="Filter by vendor name"
                value={filters.vendor}
                onChange={(e) => handleFilterChange('vendor', e.target.value)}
              />
              <Input
                label="Start Date"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px', marginBottom: '16px'
            }}>
              <Input
                label="Min Amount"
                type="number"
                placeholder="0"
                min="0"
                step="0.01"
                value={filters.minAmount}
                onChange={(e) => handleFilterChange('minAmount', e.target.value)}
              />
              <Input
                label="Max Amount"
                type="number"
                placeholder="100000"
                min="0"
                step="0.01"
                value={filters.maxAmount}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
              />
              <Input
                label="Min Profit"
                type="number"
                placeholder="0"
                step="0.01"
                value={filters.minProfit}
                onChange={(e) => handleFilterChange('minProfit', e.target.value)}
              />
              <Input
                label="Max Profit"
                type="number"
                placeholder="10000"
                step="0.01"
                value={filters.maxProfit}
                onChange={(e) => handleFilterChange('maxProfit', e.target.value)}
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px', marginBottom: '16px'
            }}>
              <Input
                label="Min Product Count"
                type="number"
                placeholder="1"
                min="0"
                step="1"
                value={filters.minProductCount}
                onChange={(e) => handleFilterChange('minProductCount', e.target.value)}
              />
              <Input
                label="Max Product Count"
                type="number"
                placeholder="100"
                min="0"
                step="1"
                value={filters.maxProductCount}
                onChange={(e) => handleFilterChange('maxProductCount', e.target.value)}
              />
              <div style={{ display: 'flex', alignItems: 'end' }}>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  icon={<X size={16} />}
                >
                  Clear All Filters
                </Button>
              </div>
            </div>

            {Object.values(filters).some(value => value !== '') && (
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                padding: '12px', fontSize: '14px', color: '#64748b'
              }}>
                <strong>Active Filters:</strong>{' '}
                {Object.entries(filters)
                  .filter(([_, value]) => value !== '')
                  .map(([key, value]) => {
                    const filterLabels = {
                      vendor: 'Vendor', startDate: 'Start Date', endDate: 'End Date',
                      minAmount: 'Min Amount', maxAmount: 'Max Amount',
                      minProfit: 'Min Profit', maxProfit: 'Max Profit',
                      minProductCount: 'Min Products', maxProductCount: 'Max Products',
                      status: 'Status'
                    };
                    return `${filterLabels[key]}: ${value}`;
                  })
                  .join(', ')}
              </div>
            )}
          </Card>
        )}

        {/* ===== TABLE ===== */}
        <div style={{ marginBottom: '24px' }}>
          {paginatedBills.length > 0 ? (
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{
                      padding: '12px 16px', textAlign: 'left', width: '44px',
                      borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
                    }}>
                      <button
                        onClick={onSelectAll}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                        }}
                      >
                        {selectedBills.size === paginatedBills.length && paginatedBills.length > 0 ?
                          <CheckSquare size={16} color="#3b82f6" /> :
                          <Square size={16} color="#94a3b8" />
                        }
                      </button>
                    </th>
                    <th style={{
                      padding: '12px 8px', textAlign: 'left', width: '32px',
                      borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
                    }} />
                    <SortableHeader field="billNumber" label="Bill #" sortField={sortField} sortDirection={sortDirection} handleSort={handleSort} />
                    <SortableHeader field="vendor" label="Vendor" sortField={sortField} sortDirection={sortDirection} handleSort={handleSort} />
                    <SortableHeader field="date" label="Date" sortField={sortField} sortDirection={sortDirection} handleSort={handleSort} />
                    <SortableHeader field="dueDate" label="Due Date" sortField={sortField} sortDirection={sortDirection} handleSort={handleSort} />
                    <th style={STYLES.headerCell}>
                      Items
                    </th>
                    <SortableHeader field="totalAmount" label="Amount" style={{ textAlign: 'right' }} sortField={sortField} sortDirection={sortDirection} handleSort={handleSort} />
                    <th style={{ ...STYLES.headerCell, textAlign: 'center' }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBills.map((bill, idx) => {
                    const products = billProducts[bill.id] || [];
                    const isExpanded = expandedRows.has(bill.id);
                    const isSelected = selectedBills.has(bill.id);
                    const itemCount = bill.productCount || products.length || 0;

                    return (
                      <React.Fragment key={bill.id}>
                        {/* Bill Row */}
                        <tr style={{
                          borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                          background: isSelected ? '#eff6ff' : (idx % 2 === 0 ? '#fff' : '#fafbfc'),
                          transition: 'background 0.15s',
                        }}>
                          {/* Checkbox */}
                          <td style={STYLES.tableCell}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSelectBill(bill.id); }}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                              }}
                            >
                              {isSelected ?
                                <CheckSquare size={16} color="#3b82f6" /> :
                                <Square size={16} color="#cbd5e1" />
                              }
                            </button>
                          </td>

                          {/* Expand Chevron */}
                          <td style={{ padding: '12px 8px' }}>
                            <button
                              onClick={() => toggleRowExpanded(bill.id)}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                                color: '#94a3b8', transition: 'color 0.15s',
                              }}
                            >
                              {isExpanded ?
                                <ChevronUp size={16} /> :
                                <ChevronDown size={16} />
                              }
                            </button>
                          </td>

                          {/* Bill # */}
                          <td style={STYLES.tableCell}>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                              {bill.billNumber}
                            </span>
                          </td>

                          {/* Vendor */}
                          <td style={STYLES.tableCell}>
                            <span style={{ fontSize: '13px', fontWeight: '500', color: '#475569' }}>
                              {bill.vendor || 'Unknown'}
                            </span>
                          </td>

                          {/* Date */}
                          <td style={STYLES.tableCell}>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>
                              {formatDate(bill.date)}
                            </span>
                          </td>

                          {/* Due Date */}
                          <td style={STYLES.tableCell}>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>
                              {formatDate(bill.dueDate)}
                            </span>
                          </td>

                          {/* Items */}
                          <td style={STYLES.tableCell}>
                            <span style={{
                              fontSize: '12px', fontWeight: '500', color: '#64748b',
                              background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px',
                            }}>
                              {itemCount} item{itemCount !== 1 ? 's' : ''}
                            </span>
                          </td>

                          {/* Amount */}
                          <td style={{ ...STYLES.tableCell, textAlign: 'right' }}>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                              {formatCurrency(bill.totalAmount)}
                            </span>
                          </td>

                          {/* Status */}
                          <td style={{ ...STYLES.tableCell, textAlign: 'center' }}>
                            {getStatusBadge(bill)}
                          </td>
                        </tr>

                        {/* Expanded Product Details */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} style={{ padding: 0 }}>
                              <div style={{
                                background: '#f8fafc',
                                borderBottom: '1px solid #e2e8f0',
                                padding: '0',
                              }}>
                                {products.length > 0 ? (
                                  <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0' }}>
                                    <thead>
                                      <tr>
                                        <th style={{ ...STYLES.subHeaderCell, padding: '10px 20px 10px 60px' }}>
                                          Product
                                        </th>
                                        <th style={STYLES.subHeaderCell}>
                                          Category
                                        </th>
                                        <th style={{ ...STYLES.subHeaderCell, textAlign: 'right' }}>
                                          Qty
                                        </th>
                                        <th style={{ ...STYLES.subHeaderCell, textAlign: 'right' }}>
                                          MRP
                                        </th>
                                        <th style={{ ...STYLES.subHeaderCell, padding: '10px 20px 10px 16px', textAlign: 'right' }}>
                                          Amount
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {products.map((product, pIdx) => (
                                        <tr
                                          key={product.id || pIdx}
                                          style={{
                                            borderBottom: pIdx < products.length - 1 ? '1px solid #eef0f2' : 'none',
                                            cursor: onProductClick ? 'pointer' : 'default',
                                            transition: 'background 0.1s',
                                          }}
                                          onClick={() => onProductClick && onProductClick(product)}
                                          onMouseEnter={(e) => {
                                            if (onProductClick) e.currentTarget.style.background = '#eef2ff';
                                          }}
                                          onMouseLeave={(e) => {
                                            if (onProductClick) e.currentTarget.style.background = 'transparent';
                                          }}
                                        >
                                          <td style={{ ...STYLES.subTableCell, padding: '10px 20px 10px 60px' }}>
                                            <span style={{
                                              fontSize: '13px', fontWeight: '600',
                                              color: product.productName ? '#1e293b' : '#d97706',
                                              display: 'flex', alignItems: 'center', gap: '4px',
                                            }}>
                                              {!product.productName && <AlertTriangle size={12} color="#d97706" />}
                                              {product.productName || 'Unnamed Product'}
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
                                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                                              {product.totalQuantity || product.quantity || 0}
                                            </span>
                                          </td>
                                          <td style={{ ...STYLES.subTableCell, textAlign: 'right' }}>
                                            <span style={{ fontSize: '13px', color: '#64748b' }}>
                                              {formatCurrency(product.mrp || product.pricePerPiece)}
                                            </span>
                                          </td>
                                          <td style={{ ...STYLES.subTableCell, padding: '10px 20px 10px 16px', textAlign: 'right' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                                              {formatCurrency(product.totalAmount)}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <div style={{
                                    padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px',
                                  }}>
                                    <Package size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                                    <div>No products in this bill</div>
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
              <Package size={48} style={{ margin: '0 auto 16px', color: '#9ca3af' }} />
              <h3 style={{ fontSize: '18px', color: '#374151', marginBottom: '8px' }}>
                No bills found
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                {searchTerm || Object.values(filters).some(f => f) ?
                  'Try adjusting your search or filters' :
                  'Create your first bill to get started'
                }
              </p>
              {!searchTerm && !Object.values(filters).some(f => f) && (
                <Button
                  variant="primary"
                  icon={<Plus size={16} />}
                  onClick={() => setShowCreateModal(true)}
                >
                  Create First Bill
                </Button>
              )}
            </Card>
          )}
        </div>

        {/* ===== PAGINATION ===== */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px'
          }}>
            <Button
              variant="outline"
              size="small"
              icon={<ChevronLeft size={16} />}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              Page {currentPage} of {totalPages} ({filteredAndSortedBills.length} bills)
            </span>
            <Button
              variant="outline"
              size="small"
              icon={<ChevronRight size={16} />}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {/* ===== MODALS ===== */}
        <BillCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={onCreateBill}
          existingBills={bills}
        />

        <ConflictResolutionModal
          conflicts={conflicts}
          onAcknowledge={handleAcknowledgeConflict}
          onClearAll={handleClearAllConflicts}
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
        />

        <ProductModal
          isOpen={showAddProductModal}
          onClose={() => {
            setShowAddProductModal(false);
            setSelectedBillForProduct(null);
          }}
          onSave={onAddProductToBill}
          bill={selectedBillForProduct}
          mode="create"
        />

        {/* ===== FLOATING BULK ACTIONS BAR ===== */}
        {selectedBills.size > 0 && (
          <div style={{
            position: 'fixed', bottom: '24px', left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: '12px',
            background: '#1e293b', color: 'white',
            padding: '12px 20px', borderRadius: '14px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            zIndex: 1000,
            animation: 'slideUp 0.25s ease-out',
          }}>
            <span style={{
              fontSize: '13px', fontWeight: '600',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span style={{
                background: '#3b82f6', padding: '2px 8px', borderRadius: '10px',
                fontSize: '12px', fontWeight: '700'
              }}>
                {selectedBills.size}
              </span>
              selected
            </span>

            <div style={{ width: '1px', height: '24px', background: '#475569' }} />

            <BulkActionButton icon={Copy} label="Duplicate" onClick={handleBulkDuplicate} disabled={bulkActionLoading} />
            <BulkActionButton icon={Archive} label="Archive" onClick={handleBulkArchive} disabled={bulkActionLoading} />
            <BulkActionButton icon={Download} label="Export" onClick={handleBulkExport} disabled={bulkActionLoading} />

            <div style={{ width: '1px', height: '24px', background: '#475569' }} />

            <BulkActionButton icon={Trash2} label="Delete" onClick={handleBulkDelete} disabled={bulkActionLoading} variant="danger" />

            <button
              onClick={() => clearSelection()}
              style={{
                display: 'flex', alignItems: 'center',
                background: 'none', border: 'none', color: '#64748b',
                cursor: 'pointer', padding: '6px', borderRadius: '8px',
                transition: 'all 0.15s', marginLeft: '4px',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}
              title="Clear selection"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default BillsView;
