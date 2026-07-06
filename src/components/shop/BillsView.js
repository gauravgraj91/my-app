import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  Download,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Trash2,
  AlertTriangle,
  IndianRupee,
  CheckCircle,
  Clock,
  Pencil,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import ErrorBoundary from '../ui/ErrorBoundary';
import SummaryCard from '../ui/SummaryCard';
import SortableHeader from '../ui/SortableHeader';
import {
  BillsListLoading,
  BulkOperationLoading
} from '../ui/LoadingStates';
import BillCreateModal from './BillCreateModal';
import ProductModal from './ProductModal';
import ConflictResolutionModal from './ConflictResolutionModal';
import BillExpandedRow from './BillExpandedRow';
import BillFilters from './BillFilters';
import BillBulkActionsBar from './BillBulkActionsBar';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useBills } from '../../context/BillsContext';
import { getErrorMessage, getRecoveryOptions } from '../../utils/errorHandling';
import { usePagination } from '../../hooks/usePagination';
import { billCacheUtils } from '../../utils/cacheUtils';
import { formatCurrency, formatDate } from '../../utils/formatters';

// --- Common styles ---
const STYLES = {
  headerCell: {
    padding: '12px 16px', textAlign: 'left',
    fontSize: '12px', fontWeight: '600', color: 'var(--muted-foreground)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border)', background: 'var(--secondary)',
  },
  tableCell: { padding: '12px 16px' },
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

const BillsView = () => {
  const location = useLocation();
  const initialSearchApplied = useRef(false);
  const {
    bills,
    billProducts,
    loading,
    error,
    isRetrying,
    retryCount,

    selectedBills,
    handleSelectBill,
    handleSelectAll,
    clearSelection,

    handleAddProductToBill,

    bulkActionLoading,
    bulkOperationStatus,
    handleBulkDelete,
    handleBulkDuplicate,
    handleBulkArchive,
    handleBulkExport,

    handleEditBill,
    handleDeleteBill,

    conflicts,
    showConflictModal,
    setShowConflictModal,
    handleAcknowledgeConflict,
    handleClearAllConflicts,

    retrySubscription,
  } = useBills();

  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
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

  // Pick up search term from navigation state (e.g. from Products/Vendors "View Bill" links)
  useEffect(() => {
    if (location.state?.search && !initialSearchApplied.current) {
      setSearchTerm(location.state.search);
      initialSearchApplied.current = true;
    }
  }, [location.state]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeStatusTab, setActiveStatusTab] = useState('all');

  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedBillForProduct, setSelectedBillForProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);

  // Expanded rows for table
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });
  const openConfirm = (title, message, onConfirm) => setConfirmDialog({ open: true, title, message, onConfirm });
  const closeConfirm = () => setConfirmDialog(s => ({ ...s, open: false }));

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

    const sum = (arr) => arr.reduce((acc, b) => acc + (b.finalAmount || b.totalAmount || 0), 0);

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

    result = applyRangeFilter(result, bill => bill.finalAmount || bill.totalAmount || 0, filters.minAmount, filters.maxAmount);

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
      let aValue = sortField === 'totalAmount' ? (a.finalAmount || a.totalAmount) : a[sortField];
      let bValue = sortField === 'totalAmount' ? (b.finalAmount || b.totalAmount) : b[sortField];

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
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          padding: '20px'
        }}>
          <Card style={{ maxWidth: '500px', textAlign: 'center' }}>
            <div style={{ marginBottom: '20px' }}>
              <AlertTriangle size={48} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600', color: 'var(--foreground)' }}>
                {errorMessage.title}
              </h2>
              <p style={{ margin: '0 0 20px 0', color: 'var(--muted-foreground)', lineHeight: '1.5' }}>
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
              <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--muted-foreground)' }}>
                Retry attempts: {retryCount}
              </div>
            )}
          </Card>
        </div>
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
    <>
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
              fontSize: '24px', fontWeight: '800', color: 'var(--foreground)',
              margin: '0 0 4px 0', letterSpacing: '-0.02em'
            }}>
              Bills
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted-foreground)' }}>
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
                style={{ borderColor: 'var(--warning)', color: 'var(--warning)', backgroundColor: 'var(--warning-soft)' }}
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
          <SummaryCard label="Total Bills" amount={summaryStats.total.amount} subtitle={`${summaryStats.total.count} bill${summaryStats.total.count !== 1 ? 's' : ''}`} icon={IndianRupee} color="var(--foreground)" bgColor="var(--secondary)" />
          <SummaryCard label="Paid" amount={summaryStats.paid.amount} subtitle={`${summaryStats.paid.count} bill${summaryStats.paid.count !== 1 ? 's' : ''}`} icon={CheckCircle} color="var(--success)" bgColor="var(--success-soft)" />
          <SummaryCard label="Pending" amount={summaryStats.pending.amount} subtitle={`${summaryStats.pending.count} bill${summaryStats.pending.count !== 1 ? 's' : ''}`} icon={Clock} color="var(--warning)" bgColor="var(--warning-soft)" />
          <SummaryCard label="Overdue" amount={summaryStats.overdue.amount} subtitle={`${summaryStats.overdue.count} bill${summaryStats.overdue.count !== 1 ? 's' : ''}`} icon={AlertTriangle} color="var(--danger)" bgColor="var(--danger-soft)" />
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
              onChange={(e) => setSearchTerm(e.target.value)}
              containerStyle={{ marginBottom: 0 }}
              style={{ background: 'var(--card)', border: '1px solid var(--border)', fontSize: '13px', padding: '10px 12px' }}
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
            background: 'var(--secondary)', borderRadius: '8px', padding: '3px',
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
                  background: activeStatusTab === tab.key ? 'var(--foreground)' : 'transparent',
                  color: activeStatusTab === tab.key ? 'var(--background)' : 'var(--muted-foreground)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== ADVANCED FILTERS PANEL ===== */}
        {showFilters && (
          <BillFilters filters={filters} onFilterChange={handleFilterChange} onClear={clearFilters} />
        )}

        {/* ===== TABLE ===== */}
        <div style={{ marginBottom: '24px' }}>
          {paginatedBills.length > 0 ? (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px',
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{
                      padding: '12px 16px', textAlign: 'left', width: '44px',
                      borderBottom: '1px solid var(--border)', background: 'var(--secondary)',
                    }}>
                      <button
                        onClick={onSelectAll}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                        }}
                      >
                        {selectedBills.size === paginatedBills.length && paginatedBills.length > 0 ?
                          <CheckSquare size={16} color="var(--primary)" /> :
                          <Square size={16} color="var(--muted-foreground)" />
                        }
                      </button>
                    </th>
                    <th style={{
                      padding: '12px 8px', textAlign: 'left', width: '32px',
                      borderBottom: '1px solid var(--border)', background: 'var(--secondary)',
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
                    <th style={{ ...STYLES.headerCell, textAlign: 'center', width: '60px' }}>
                      Actions
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
                          borderBottom: isExpanded ? 'none' : '1px solid var(--secondary)',
                          background: isSelected ? 'var(--primary-soft)' : (idx % 2 === 0 ? 'var(--card)' : 'var(--muted)'),
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
                                <CheckSquare size={16} color="var(--primary)" /> :
                                <Square size={16} color="var(--border)" />
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
                                color: 'var(--muted-foreground)', transition: 'color 0.15s',
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
                            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--foreground)' }}>
                              {bill.billNumber}
                            </span>
                          </td>

                          {/* Vendor */}
                          <td style={STYLES.tableCell}>
                            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--foreground)' }}>
                              {bill.vendor || 'Unknown'}
                            </span>
                          </td>

                          {/* Date */}
                          <td style={STYLES.tableCell}>
                            <span style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
                              {formatDate(bill.date)}
                            </span>
                          </td>

                          {/* Due Date */}
                          <td style={STYLES.tableCell}>
                            <span style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
                              {formatDate(bill.dueDate)}
                            </span>
                          </td>

                          {/* Items */}
                          <td style={STYLES.tableCell}>
                            <span style={{
                              fontSize: '12px', fontWeight: '500', color: 'var(--muted-foreground)',
                              background: 'var(--secondary)', padding: '2px 8px', borderRadius: '10px',
                            }}>
                              {itemCount} item{itemCount !== 1 ? 's' : ''}
                            </span>
                          </td>

                          {/* Amount */}
                          <td style={{ ...STYLES.tableCell, textAlign: 'right' }}>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--foreground)' }}>
                              {formatCurrency(bill.finalAmount || bill.totalAmount)}
                            </span>
                            {bill.finalAmount && bill.finalAmount !== bill.totalAmount && (
                              <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                                Base: {formatCurrency(bill.totalAmount)}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td style={{ ...STYLES.tableCell, textAlign: 'center' }}>
                            {getStatusBadge(bill)}
                          </td>

                          {/* Actions */}
                          <td style={{ ...STYLES.tableCell, textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '4px' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingBill(bill);
                                  setShowEditModal(true);
                                }}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  background: 'none', border: '1px solid var(--border)', cursor: 'pointer',
                                  padding: '6px', borderRadius: '6px', color: 'var(--muted-foreground)',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = 'var(--secondary)';
                                  e.currentTarget.style.color = 'var(--foreground)';
                                  e.currentTarget.style.borderColor = 'var(--border)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = 'none';
                                  e.currentTarget.style.color = 'var(--muted-foreground)';
                                  e.currentTarget.style.borderColor = 'var(--border)';
                                }}
                                title="Edit bill"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openConfirm(
                                    'Delete Bill',
                                    `Delete bill ${bill.billNumber}? This cannot be undone.`,
                                    () => { closeConfirm(); handleDeleteBill(bill.id); }
                                  );
                                }}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  background: 'none', border: '1px solid var(--border)', cursor: 'pointer',
                                  padding: '6px', borderRadius: '6px', color: 'var(--muted-foreground)',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = 'var(--danger-soft)';
                                  e.currentTarget.style.color = 'var(--danger)';
                                  e.currentTarget.style.borderColor = 'var(--danger-soft)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = 'none';
                                  e.currentTarget.style.color = 'var(--muted-foreground)';
                                  e.currentTarget.style.borderColor = 'var(--border)';
                                }}
                                title="Delete bill"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Product Details */}
                        {isExpanded && (
                          <BillExpandedRow bill={bill} products={products} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Card style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Package size={48} style={{ margin: '0 auto 16px', color: 'var(--muted-foreground)' }} />
              <h3 style={{ fontSize: '18px', color: 'var(--foreground)', marginBottom: '8px' }}>
                No bills found
              </h3>
              <p style={{ color: 'var(--muted-foreground)', marginBottom: '24px' }}>
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
            <span style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>
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
        />

        <BillCreateModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingBill(null);
          }}
          mode="edit"
          bill={editingBill}
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
        <BillBulkActionsBar
          selectedBills={selectedBills}
          bills={bills}
          bulkActionLoading={bulkActionLoading}
          onEdit={(billToEdit) => {
            setEditingBill(billToEdit);
            setShowEditModal(true);
          }}
          onDuplicate={handleBulkDuplicate}
          onArchive={handleBulkArchive}
          onExport={handleBulkExport}
          onDelete={() => openConfirm(
            'Delete Bills',
            `Delete ${selectedBills.size} bill${selectedBills.size !== 1 ? 's' : ''}? This cannot be undone.`,
            () => { closeConfirm(); handleBulkDelete(); }
          )}
          onClear={clearSelection}
        />
      </div>
    </ErrorBoundary>

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

export default BillsView;
