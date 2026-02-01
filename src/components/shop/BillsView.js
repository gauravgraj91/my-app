import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Filter,
  Download,
  Calendar,
  User,
  DollarSign,
  Package,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  SortAsc,
  SortDesc,
  X,
  CheckSquare,
  Square,
  Trash2,
  Copy,
  Archive,
  MoreHorizontal,
  AlertTriangle,
  IndianRupee
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import ErrorBoundary from '../ui/ErrorBoundary';
import { useNotifications } from '../ui/NotificationSystem';
import {
  LoadingOverlay,
  BillsListLoading,
  AnalyticsLoading,
  BillOperationLoading,
  BulkOperationLoading
} from '../ui/LoadingStates';
import BillCard from './BillCard';
import BillCreateModal from './BillCreateModal';
import BillEditModal from './BillEditModal';
import ConflictResolutionModal from './ConflictResolutionModal';
import {
  subscribeToBills,
  addBill,
  updateBill,
  deleteBillWithProducts,
  duplicateBill,
  getBillAnalytics,
  searchBills,
  filterBills,
  BillModel,
  exportBillToCSV,
  exportMultipleBillsToCSV,
  bulkDeleteBills,
  bulkDuplicateBills,
  bulkUpdateBillStatus,
  bulkExportBillsToCSV,

  fetchBillsPaginated,
  fetchBillsInfinite
} from '../../firebase/billService';
import { addShopProduct } from '../../firebase/shopProductService';
import {
  classifyError,
  getErrorMessage,
  getRecoveryOptions,
  createRetryHandler,
  reportError
} from '../../utils/errorHandling';
import { usePagination } from '../../hooks/usePagination';
import { useVirtualScrolling } from '../../hooks/useVirtualScrolling';
import {
  billCacheUtils,
  productCacheUtils,
  queryCacheUtils,
  analyticsCacheUtils,
  cacheInvalidationUtils
} from '../../utils/cacheUtils';
import { performanceMonitor } from '../../utils/performanceUtils';
import { getProductsByBill } from '../../firebase/shopProductService';
import realtimeSyncManager from '../../firebase/realtimeSync';
import { format } from 'date-fns';

const BillsView = ({ searchTerm: externalSearchTerm, onSearchChange }) => {
  // Notification system
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();

  // State management with performance optimizations
  const [bills, setBills] = useState([]);
  const [billProducts, setBillProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const recentlyCreatedBills = useRef(new Set()); // Track bills we just created to avoid duplicate notifications
  const recentlyEditedBills = useRef(new Set()); // Track bills we just edited to avoid duplicate notifications
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [virtualScrollEnabled, setVirtualScrollEnabled] = useState(false);
  const [infiniteScrollEnabled, setInfiniteScrollEnabled] = useState(false);
  const [performanceMode, setPerformanceMode] = useState('auto'); // 'auto', 'performance', 'compatibility'

  // Error handling state
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Bulk operations
  const [selectedBills, setSelectedBills] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkOperationStatus, setBulkOperationStatus] = useState(null);

  // Search and filtering - use external search term if provided
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

  // Sorting
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Modals
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Conflict resolution
  const [conflicts, setConflicts] = useState([]);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Sync external search term with internal state
  useEffect(() => {
    if (externalSearchTerm !== undefined) {
      setSearchTerm(externalSearchTerm);
    }
  }, [externalSearchTerm]);

  // Monitor conflicts
  useEffect(() => {
    const updateConflicts = () => {
      const pendingConflicts = realtimeSyncManager.getPendingConflicts();
      setConflicts(pendingConflicts);

      if (pendingConflicts.length > 0 && !showConflictModal) {
        setShowConflictModal(true);
      }
    };

    // Initial check
    updateConflicts();

    // Listen for new conflicts
    const handleConflict = () => {
      updateConflicts();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('realtimeConflict', handleConflict);
      return () => window.removeEventListener('realtimeConflict', handleConflict);
    }
  }, [showConflictModal]);

  // Subscribe to bills data with enhanced real-time features
  useEffect(() => {
    const retryHandler = createRetryHandler(3, 1000);

    const subscribeWithRetry = async () => {
      try {
        setError(null);
        setIsRetrying(false);

        const unsubscribe = subscribeToBills((billsData, metadata) => {
          // Use Firestore data directly - real-time updates ensure we always have latest data
          setBills(billsData);
          setLoading(false);

          // Handle real-time changes
          // Handle real-time changes
          if (metadata?.changes) {
            // Skip notifications on first load to avoid duplicate "added" messages for existing bills
            if (!isFirstLoad.current) {
              metadata.changes.forEach(change => {
                if (change.type === 'added' && !change.optimistic) {
                  // Skip notification if this is a bill we just created (to avoid duplicate notifications)
                  if (!recentlyCreatedBills.current.has(change.bill.id)) {
                    showSuccess(`New bill ${change.bill.billNumber} added!`);
                  } else {
                    // Remove from tracking set after a short delay
                    setTimeout(() => {
                      recentlyCreatedBills.current.delete(change.bill.id);
                    }, 2000);
                  }
                } else if (change.type === 'modified' && !change.optimistic) {
                  // Skip notification if this bill was recently created or edited by this client
                  // This prevents duplicate notifications from recalculateBillTotals updates
                  if (!recentlyCreatedBills.current.has(change.bill.id) &&
                    !recentlyEditedBills.current.has(change.bill.id)) {
                    showInfo(`Bill ${change.bill.billNumber} updated!`);
                  }
                }
                // Removed notification handled by local action to avoid duplicates
                // else if (change.type === 'removed' && !change.optimistic) {
                //   showWarning(`Bill deleted!`);
                // }
              });
            }
            // Mark first load as complete after processing initial batch
            isFirstLoad.current = false;
          }

          // Handle offline/online status
          if (metadata?.metadata?.fromCache && !metadata?.metadata?.hasPendingWrites) {
            showWarning('You are offline. Changes will sync when connection is restored.');
          }

          // Load products for each bill (only for new bills to avoid unnecessary requests)
          const newBills = metadata?.changes?.filter(c => c.type === 'added').map(c => c.bill) || [];
          newBills.forEach(async (bill) => {
            try {
              const products = await getProductsByBill(bill.id);
              setBillProducts(prev => ({
                ...prev,
                [bill.id]: products
              }));
            } catch (error) {
              const billError = classifyError(error);
              reportError(billError, { context: 'loading_bill_products', billId: bill.id });
              console.error(`Error loading products for bill ${bill.id}:`, billError);
            }
          });

          // For initial load, load all products
          if (!metadata?.changes && billsData.length > 0) {
            billsData.forEach(async (bill) => {
              try {
                const products = await getProductsByBill(bill.id);
                setBillProducts(prev => ({
                  ...prev,
                  [bill.id]: products
                }));
              } catch (error) {
                const billError = classifyError(error);
                reportError(billError, { context: 'loading_initial_products', billId: bill.id });
                console.error(`Error loading products for bill ${bill.id}:`, billError);
              }
            });
          }
        }, {
          onError: (error) => {
            const billError = classifyError(error);
            reportError(billError, { context: 'bills_subscription' });

            setError(billError);
            setLoading(false);

            const errorMessage = getErrorMessage(billError);
            showError(errorMessage.message, {
              title: errorMessage.title,
              action: {
                label: 'Retry',
                onClick: () => handleRetrySubscription()
              }
            });
          }
        });

        return unsubscribe;
      } catch (error) {
        const billError = classifyError(error);
        setError(billError);
        setLoading(false);
        throw billError;
      }
    };

    const handleRetrySubscription = async () => {
      setIsRetrying(true);
      setRetryCount(prev => prev + 1);

      try {
        const unsubscribe = await retryHandler(subscribeWithRetry, {
          context: 'bills_subscription_retry',
          retryCount: retryCount + 1
        });
        return unsubscribe;
      } catch (error) {
        setIsRetrying(false);
        const errorMessage = getErrorMessage(error);
        showError(`Failed to load bills after ${retryCount + 1} attempts. ${errorMessage.message}`, {
          title: 'Connection Failed',
          duration: 10000
        });
      }
    };

    let unsubscribe;
    subscribeWithRetry().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [retryCount]);

  // Load analytics with caching and error handling
  useEffect(() => {
    const loadAnalytics = async () => {
      if (bills.length === 0) return;

      setAnalyticsLoading(true);
      const retryHandler = createRetryHandler(2, 1000);

      try {
        // Check cache first
        const cached = analyticsCacheUtils.getBillAnalytics();
        if (cached) {
          setAnalytics(cached);
          setAnalyticsLoading(false);
          return;
        }

        const analyticsData = await retryHandler(async () => {
          const timingId = performanceMonitor.startTiming('load-analytics');
          const data = await getBillAnalytics();
          performanceMonitor.endTiming(timingId, { billCount: bills.length });
          return data;
        }, { context: 'load_analytics' });

        // Cache the analytics
        analyticsCacheUtils.setBillAnalytics(analyticsData);
        setAnalytics(analyticsData);
      } catch (error) {
        const billError = classifyError(error);
        reportError(billError, { context: 'load_analytics', billCount: bills.length });

        // Don't show error notification for analytics - just log it
        console.warn('Analytics loading failed:', billError.message);

        // Set empty analytics to prevent loading state
        setAnalytics({
          totalBills: bills.length,
          totalAmount: 0,
          totalProfit: 0,
          averageBillValue: 0
        });
      } finally {
        setAnalyticsLoading(false);
      }
    };

    loadAnalytics();
  }, [bills]);

  // Auto-enable performance optimizations based on data size
  useEffect(() => {
    if (performanceMode === 'auto') {
      const shouldUseVirtualScrolling = bills.length > 100;
      const shouldUseInfiniteScroll = bills.length > 500;

      setVirtualScrollEnabled(shouldUseVirtualScrolling);
      setInfiniteScrollEnabled(shouldUseInfiniteScroll);
    } else if (performanceMode === 'performance') {
      setVirtualScrollEnabled(true);
      setInfiniteScrollEnabled(true);
    } else {
      setVirtualScrollEnabled(false);
      setInfiniteScrollEnabled(false);
    }
  }, [bills.length, performanceMode]);



  // Filter and sort bills using enhanced search and filtering
  const filteredAndSortedBills = useMemo(() => {
    let result = [...bills];

    // Apply enhanced search that includes products
    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(bill => {
        // Search in bill fields
        const billMatches =
          bill.billNumber.toLowerCase().includes(searchLower) ||
          bill.vendor.toLowerCase().includes(searchLower) ||
          (bill.notes && bill.notes.toLowerCase().includes(searchLower));

        if (billMatches) return true;

        // Search in products within this bill
        const billProducts = billProducts[bill.id] || [];
        const productMatches = billProducts.some(product =>
          (product.productName && product.productName.toLowerCase().includes(searchLower)) ||
          (product.category && product.category.toLowerCase().includes(searchLower)) ||
          (product.vendor && product.vendor.toLowerCase().includes(searchLower))
        );

        return productMatches;
      });
    }

    // Apply enhanced filters
    if (filters.vendor && filters.vendor.trim() !== '') {
      const vendorLower = filters.vendor.toLowerCase().trim();
      result = result.filter(bill =>
        bill.vendor && bill.vendor.toLowerCase().includes(vendorLower)
      );
    }

    if (filters.startDate) {
      result = result.filter(bill => {
        const billDate = bill.date instanceof Date ? bill.date : new Date(bill.date);
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        return billDate >= startDate;
      });
    }

    if (filters.endDate) {
      result = result.filter(bill => {
        const billDate = bill.date instanceof Date ? bill.date : new Date(bill.date);
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        return billDate <= endDate;
      });
    }

    if (filters.minAmount && filters.minAmount !== '') {
      const minAmount = parseFloat(filters.minAmount);
      if (!isNaN(minAmount)) {
        result = result.filter(bill => (bill.totalAmount || 0) >= minAmount);
      }
    }

    if (filters.maxAmount && filters.maxAmount !== '') {
      const maxAmount = parseFloat(filters.maxAmount);
      if (!isNaN(maxAmount)) {
        result = result.filter(bill => (bill.totalAmount || 0) <= maxAmount);
      }
    }

    if (filters.status && filters.status !== '') {
      result = result.filter(bill => bill.status === filters.status);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle date sorting
      if (sortField === 'date') {
        aValue = a.date instanceof Date ? a.date : new Date(a.date);
        bValue = b.date instanceof Date ? b.date : new Date(b.date);
      }

      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? -1 : 1;
      if (bValue == null) return sortDirection === 'asc' ? 1 : -1;

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [bills, billProducts, searchTerm, filters, sortField, sortDirection]);

  // Enhanced pagination with virtual scrolling support
  const paginationConfig = usePagination(filteredAndSortedBills, itemsPerPage, {
    enableVirtualization: filteredAndSortedBills.length > 100,
    onPageChange: (page) => {
      setCurrentPage(page);
      // Pre-load next page data
      if (page < totalPages) {
        const nextPageStart = page * itemsPerPage;
        const nextPageBills = filteredAndSortedBills.slice(nextPageStart, nextPageStart + itemsPerPage);
        // Warm cache for next page bills
        nextPageBills.forEach(bill => {
          billCacheUtils.set(bill.id, bill);
        });
      }
    }
  });

  const paginatedBills = paginationConfig.currentPageData;

  const totalPages = Math.ceil(filteredAndSortedBills.length / itemsPerPage);

  // Helper functions
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(value || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return format(dateObj, 'dd MMM yyyy');
    } catch {
      return 'Invalid date';
    }
  };



  // Conflict resolution handlers
  const handleAcknowledgeConflict = (conflictIndex) => {
    realtimeSyncManager.acknowledgeConflict(conflictIndex);
    setConflicts(realtimeSyncManager.getPendingConflicts());
  };

  const handleClearAllConflicts = () => {
    conflicts.forEach((_, index) => {
      realtimeSyncManager.acknowledgeConflict(index);
    });
    realtimeSyncManager.clearAcknowledgedConflicts();
    setConflicts([]);
    setShowConflictModal(false);
  };

  // Event handlers
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
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
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
    setCurrentPage(1);
  };

  const handleCreateBill = async (billData) => {
    try {
      const retryHandler = createRetryHandler(2, 1000);

      const newBill = await retryHandler(async () => {
        // 1. Create the bill
        const bill = await addBill(billData);

        // 2. Create the product if product details are present
        if (billData.productName && billData.quantity) {
          const newProductData = {
            productName: billData.productName,
            mrp: parseFloat(billData.mrp) || 0,
            quantity: parseFloat(billData.quantity) || 0,
            totalAmount: parseFloat(billData.totalAmount) || 0,
            vendor: billData.vendor,
            category: 'Uncategorized',
            status: 'in_stock',
            costPerUnit: billData.costPerUnit,
            profitPerPiece: billData.profitPerPiece,
            totalProfit: billData.totalProfit
          };

          await addShopProduct(newProductData, bill.id);
        }

        return bill;
      }, { context: 'create_bill', billNumber: billData.billNumber });

      // Track this bill as recently created to prevent duplicate notification from subscription
      recentlyCreatedBills.current.add(newBill.id);

      showSuccess(`Bill ${newBill.billNumber} created successfully!`);
      setShowCreateModal(false);

      // Clean up tracking after a delay
      setTimeout(() => {
        recentlyCreatedBills.current.delete(newBill.id);
      }, 5000);
    } catch (error) {
      const billError = classifyError(error);
      reportError(billError, { context: 'create_bill', billData });

      const errorMessage = getErrorMessage(billError);
      // Re-throw to let modal handle it
      throw new Error(errorMessage.message);
    }
  };

  const handleEditBill = async (billId, updatedData) => {
    const retryHandler = createRetryHandler(2, 1000);

    // Track this bill as being edited to prevent duplicate notifications from subscription
    recentlyEditedBills.current.add(billId);

    try {
      // Apply optimistic update
      const originalBills = [...bills];
      const billToUpdate = bills.find(b => b.id === billId);

      setBills(prev => prev.map(bill =>
        bill.id === billId
          ? {
            ...bill,
            ...updatedData,
            updatedAt: new Date(),
            _metadata: { ...bill._metadata, optimistic: true }
          }
          : bill
      ));

      try {
        await retryHandler(async () => {
          return await updateBill(billId, updatedData);
        }, { context: 'update_bill', billId, billNumber: billToUpdate?.billNumber });

        // Mark as no longer optimistic
        setBills(prev => prev.map(bill =>
          bill.id === billId
            ? { ...bill, _metadata: { ...bill._metadata, optimistic: false } }
            : bill
        ));

        showSuccess(`Bill ${billToUpdate?.billNumber || billId} updated successfully!`);

        // Clean up tracking after a delay to allow for recalculateBillTotals updates
        setTimeout(() => {
          recentlyEditedBills.current.delete(billId);
        }, 5000);
      } catch (error) {
        // Revert optimistic update on error
        setBills(originalBills);
        // Clean up tracking on error
        recentlyEditedBills.current.delete(billId);
        throw error;
      }
    } catch (error) {
      // Clean up tracking on error
      recentlyEditedBills.current.delete(billId);
      const billError = classifyError(error);
      reportError(billError, { context: 'update_bill', billId, updatedData });

      const errorMessage = getErrorMessage(billError);
      const recoveryOptions = getRecoveryOptions(billError);

      showError(errorMessage.message, {
        title: errorMessage.title,
        action: recoveryOptions.find(opt => opt.primary) ? {
          label: recoveryOptions.find(opt => opt.primary).label,
          onClick: () => {
            const primaryAction = recoveryOptions.find(opt => opt.primary).action;
            if (primaryAction === 'retry') {
              handleEditBill(billId, updatedData);
            } else if (primaryAction === 'refresh') {
              window.location.reload();
            }
          }
        } : undefined
      });
    }
  };

  const handleDeleteBill = async (billId) => {
    const retryHandler = createRetryHandler(2, 1000);

    try {
      // Apply optimistic update
      const billToDelete = bills.find(b => b.id === billId);
      const originalBills = [...bills];
      setBills(prev => prev.filter(bill => bill.id !== billId));

      try {
        await retryHandler(async () => {
          return await deleteBillWithProducts(billId);
        }, { context: 'delete_bill', billId, billNumber: billToDelete?.billNumber });

        showSuccess(`Bill ${billToDelete?.billNumber || billId} deleted successfully!`);

        // Clear from selected bills if it was selected
        setSelectedBills(prev => {
          const newSelected = new Set(prev);
          newSelected.delete(billId);
          return newSelected;
        });
      } catch (error) {
        // Revert optimistic update on error
        setBills(originalBills);
        throw error;
      }
    } catch (error) {
      const billError = classifyError(error);
      reportError(billError, { context: 'delete_bill', billId });

      const errorMessage = getErrorMessage(billError);
      const recoveryOptions = getRecoveryOptions(billError);

      showError(errorMessage.message, {
        title: errorMessage.title,
        action: recoveryOptions.find(opt => opt.primary) ? {
          label: recoveryOptions.find(opt => opt.primary).label,
          onClick: () => {
            const primaryAction = recoveryOptions.find(opt => opt.primary).action;
            if (primaryAction === 'retry') {
              handleDeleteBill(billId);
            }
          }
        } : undefined
      });
    }
  };

  const handleDuplicateBill = async (billId) => {
    const retryHandler = createRetryHandler(2, 1000);

    try {
      const billToDuplicate = bills.find(b => b.id === billId);

      await retryHandler(async () => {
        return await duplicateBill(billId);
      }, { context: 'duplicate_bill', billId, billNumber: billToDuplicate?.billNumber });

      showSuccess(`Bill ${billToDuplicate?.billNumber || billId} duplicated successfully!`);
    } catch (error) {
      const billError = classifyError(error);
      reportError(billError, { context: 'duplicate_bill', billId });

      const errorMessage = getErrorMessage(billError);
      showError(errorMessage.message, {
        title: errorMessage.title,
        action: {
          label: 'Retry',
          onClick: () => handleDuplicateBill(billId)
        }
      });
    }
  };

  const handleExportBill = async (billId) => {
    const retryHandler = createRetryHandler(2, 1000);

    try {
      const billToExport = bills.find(b => b.id === billId);

      const result = await retryHandler(async () => {
        return await exportBillToCSV(billId);
      }, { context: 'export_bill', billId, billNumber: billToExport?.billNumber });

      // Create and download the file
      const blob = new Blob([result.content], { type: result.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      window.URL.revokeObjectURL(url);

      showSuccess(`Bill ${billToExport?.billNumber || billId} exported successfully!`);
    } catch (error) {
      const billError = classifyError(error);
      reportError(billError, { context: 'export_bill', billId });

      const errorMessage = getErrorMessage(billError);
      showError(errorMessage.message, {
        title: errorMessage.title,
        action: {
          label: 'Retry',
          onClick: () => handleExportBill(billId)
        }
      });
    }
  };

  // Bulk operation handlers
  const handleSelectBill = (billId) => {
    const newSelected = new Set(selectedBills);
    if (newSelected.has(billId)) {
      newSelected.delete(billId);
    } else {
      newSelected.add(billId);
    }
    setSelectedBills(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedBills.size === paginatedBills.length) {
      setSelectedBills(new Set());
      setShowBulkActions(false);
    } else {
      const allIds = new Set(paginatedBills.map(bill => bill.id));
      setSelectedBills(allIds);
      setShowBulkActions(true);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedBills.size} bills? This action cannot be undone.`)) {
      return;
    }

    setBulkActionLoading(true);
    setBulkOperationStatus({
      operation: 'Deleting',
      total: selectedBills.size,
      completed: 0,
      current: null
    });

    const retryHandler = createRetryHandler(2, 1000);

    try {
      const billIds = Array.from(selectedBills);
      const selectedBillNumbers = bills
        .filter(b => billIds.includes(b.id))
        .map(b => b.billNumber);

      const results = await retryHandler(async () => {
        return await bulkDeleteBills(billIds, {
          onProgress: (completed, current) => {
            setBulkOperationStatus(prev => ({
              ...prev,
              completed,
              current
            }));
          }
        });
      }, { context: 'bulk_delete_bills', billCount: billIds.length });

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      const failedBills = results.filter(r => !r.success).map(r => r.billNumber || r.billId);

      if (failureCount === 0) {
        showSuccess(`Successfully deleted ${successCount} bills!`);
      } else {
        showWarning(`Deleted ${successCount} bills successfully. ${failureCount} failed.`, {
          title: 'Partial Success',
          action: failedBills.length > 0 ? {
            label: 'View Failed',
            onClick: () => {
              showInfo(`Failed to delete: ${failedBills.join(', ')}`, {
                title: 'Failed Deletions',
                duration: 10000
              });
            }
          } : undefined
        });
      }

      setSelectedBills(new Set());
      setShowBulkActions(false);
    } catch (error) {
      const billError = classifyError(error);
      reportError(billError, { context: 'bulk_delete_bills', billCount: selectedBills.size });

      const errorMessage = getErrorMessage(billError);
      showError(errorMessage.message, {
        title: `Failed to Delete ${selectedBills.size} Bills`,
        action: {
          label: 'Retry',
          onClick: () => handleBulkDelete()
        }
      });
    } finally {
      setBulkActionLoading(false);
      setBulkOperationStatus(null);
    }
  };

  const handleBulkDuplicate = async () => {
    setBulkActionLoading(true);
    setBulkOperationStatus({
      operation: 'Duplicating',
      total: selectedBills.size,
      completed: 0,
      current: null
    });

    const retryHandler = createRetryHandler(2, 1000);

    try {
      const billIds = Array.from(selectedBills);

      const results = await retryHandler(async () => {
        return await bulkDuplicateBills(billIds, {
          onProgress: (completed, current) => {
            setBulkOperationStatus(prev => ({
              ...prev,
              completed,
              current
            }));
          }
        });
      }, { context: 'bulk_duplicate_bills', billCount: billIds.length });

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      const failedBills = results.filter(r => !r.success).map(r => r.billNumber || r.billId);

      if (failureCount === 0) {
        showSuccess(`Successfully duplicated ${successCount} bills!`);
      } else {
        showWarning(`Duplicated ${successCount} bills successfully. ${failureCount} failed.`, {
          title: 'Partial Success',
          action: failedBills.length > 0 ? {
            label: 'View Failed',
            onClick: () => {
              showInfo(`Failed to duplicate: ${failedBills.join(', ')}`, {
                title: 'Failed Duplications',
                duration: 10000
              });
            }
          } : undefined
        });
      }

      setSelectedBills(new Set());
      setShowBulkActions(false);
    } catch (error) {
      const billError = classifyError(error);
      reportError(billError, { context: 'bulk_duplicate_bills', billCount: selectedBills.size });

      const errorMessage = getErrorMessage(billError);
      showError(errorMessage.message, {
        title: `Failed to Duplicate ${selectedBills.size} Bills`,
        action: {
          label: 'Retry',
          onClick: () => handleBulkDuplicate()
        }
      });
    } finally {
      setBulkActionLoading(false);
      setBulkOperationStatus(null);
    }
  };

  const handleBulkArchive = async () => {
    setBulkActionLoading(true);
    setBulkOperationStatus({
      operation: 'Archiving',
      total: selectedBills.size,
      completed: 0,
      current: null
    });

    const retryHandler = createRetryHandler(2, 1000);

    try {
      const billIds = Array.from(selectedBills);

      const results = await retryHandler(async () => {
        return await bulkUpdateBillStatus(billIds, 'archived', {
          onProgress: (completed, current) => {
            setBulkOperationStatus(prev => ({
              ...prev,
              completed,
              current
            }));
          }
        });
      }, { context: 'bulk_archive_bills', billCount: billIds.length });

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      const failedBills = results.filter(r => !r.success).map(r => r.billNumber || r.billId);

      if (failureCount === 0) {
        showSuccess(`Successfully archived ${successCount} bills!`);
      } else {
        showWarning(`Archived ${successCount} bills successfully. ${failureCount} failed.`, {
          title: 'Partial Success',
          action: failedBills.length > 0 ? {
            label: 'View Failed',
            onClick: () => {
              showInfo(`Failed to archive: ${failedBills.join(', ')}`, {
                title: 'Failed Archives',
                duration: 10000
              });
            }
          } : undefined
        });
      }

      setSelectedBills(new Set());
      setShowBulkActions(false);
    } catch (error) {
      const billError = classifyError(error);
      reportError(billError, { context: 'bulk_archive_bills', billCount: selectedBills.size });

      const errorMessage = getErrorMessage(billError);
      showError(errorMessage.message, {
        title: `Failed to Archive ${selectedBills.size} Bills`,
        action: {
          label: 'Retry',
          onClick: () => handleBulkArchive()
        }
      });
    } finally {
      setBulkActionLoading(false);
      setBulkOperationStatus(null);
    }
  };

  const handleBulkExport = async () => {
    setBulkActionLoading(true);
    setBulkOperationStatus({
      operation: 'Exporting',
      total: selectedBills.size,
      completed: 0,
      current: null
    });

    const retryHandler = createRetryHandler(2, 1000);

    try {
      const billIds = Array.from(selectedBills);

      const result = await retryHandler(async () => {
        return await bulkExportBillsToCSV(billIds, {
          onProgress: (completed, current) => {
            setBulkOperationStatus(prev => ({
              ...prev,
              completed,
              current
            }));
          }
        });
      }, { context: 'bulk_export_bills', billCount: billIds.length });

      // Create and download the file
      const blob = new Blob([result.content], { type: result.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      window.URL.revokeObjectURL(url);

      showSuccess(`Successfully exported ${selectedBills.size} bills!`);
      setSelectedBills(new Set());
      setShowBulkActions(false);
    } catch (error) {
      const billError = classifyError(error);
      reportError(billError, { context: 'bulk_export_bills', billCount: selectedBills.size });

      const errorMessage = getErrorMessage(billError);
      showError(errorMessage.message, {
        title: `Failed to Export ${selectedBills.size} Bills`,
        action: {
          label: 'Retry',
          onClick: () => handleBulkExport()
        }
      });
    } finally {
      setBulkActionLoading(false);
      setBulkOperationStatus(null);
    }
  };

  // Show error state if there's an error and no bills loaded
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
                  <AlertTriangle
                    size={48}
                    color="#ef4444"
                    style={{ margin: '0 auto 16px' }}
                  />
                  <h2 style={{
                    margin: '0 0 12px 0',
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {errorMessage.title}
                  </h2>
                  <p style={{
                    margin: '0 0 20px 0',
                    color: '#6b7280',
                    lineHeight: '1.5'
                  }}>
                    {errorMessage.message}
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center',
                  flexWrap: 'wrap'
                }}>
                  {recoveryOptions.map((option, index) => (
                    <Button
                      key={index}
                      variant={option.primary ? 'primary' : 'secondary'}
                      onClick={() => {
                        if (option.action === 'retry') {
                          setRetryCount(prev => prev + 1);
                        } else if (option.action === 'go_back') {
                          window.history.back();
                        }
                      }}
                      loading={isRetrying && option.action === 'retry'}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>

                {retryCount > 0 && (
                  <div style={{
                    marginTop: '12px',
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
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
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>
              Bills Management
            </h1>
            {conflicts.length > 0 && (
              <Button
                variant="outline"
                size="small"
                icon={<AlertTriangle size={14} />}
                onClick={() => setShowConflictModal(true)}
                style={{
                  borderColor: '#f59e0b',
                  color: '#f59e0b',
                  backgroundColor: '#fef3c7'
                }}
              >
                {conflicts.length} Conflict{conflicts.length !== 1 ? 's' : ''}
              </Button>
            )}

            {/* Performance indicators */}
            {bills.length > 100 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {virtualScrollEnabled && (
                  <div style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    borderRadius: '4px',
                    fontWeight: '500'
                  }}>
                    Virtual Scrolling
                  </div>
                )}
                {infiniteScrollEnabled && (
                  <div style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    borderRadius: '4px',
                    fontWeight: '500'
                  }}>
                    Infinite Scroll
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Performance mode selector */}
            {bills.length > 50 && (
              <Select
                value={performanceMode}
                onChange={(e) => setPerformanceMode(e.target.value)}
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'performance', label: 'Performance' },
                  { value: 'compatibility', label: 'Compatibility' }
                ]}
                style={{ minWidth: '120px' }}
                title="Performance Mode"
              />

            )}

            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setShowCreateModal(true)}
            >
              Add new bill
            </Button>
          </div>
        </div>

        {/* Analytics Summary */}
        <div style={{ marginBottom: '24px' }}>
          {analyticsLoading ? (
            <AnalyticsLoading />
          ) : analytics ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              <Card padding={20}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: 'white'
                  }}>
                    <Package size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
                      {analytics.totalBills}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Bills</div>
                  </div>
                </div>
              </Card>

              <Card padding={20}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: 'white'
                  }}>
                    <IndianRupee size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
                      {formatCurrency(analytics.totalAmount)}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Amount</div>
                  </div>
                </div>
              </Card>

              <Card padding={20}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: 'white'
                  }}>
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
                      {formatCurrency(analytics.totalProfit)}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Profit</div>
                  </div>
                </div>
              </Card>

              <Card padding={20}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: 'white'
                  }}>
                    <Calendar size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
                      {formatCurrency(analytics.averageBillValue)}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Avg Bill Value</div>
                  </div>
                </div>
              </Card>
            </div>
          ) : null}
        </div>

        {/* Search and Filter Controls */}
        <Card style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <Input
                placeholder="Search bills by number, vendor, notes, or product names..."
                icon={<Search size={16} />}
                value={searchTerm}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setSearchTerm(newValue);
                  if (onSearchChange) {
                    onSearchChange(newValue);
                  }
                }}
                style={{ marginBottom: 0 }}
              />
              {searchTerm && (
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '4px',
                  fontStyle: 'italic'
                }}>
                  Searching across bills and their products...
                </div>
              )}
            </div>

            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb'
            }}>
              {/* Basic Filters Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '16px'
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

                <Select
                  label="Status"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'active', label: 'Active' },
                    { value: 'archived', label: 'Archived' },
                    { value: 'returned', label: 'Returned' }
                  ]}
                />
              </div>

              {/* Amount Range Filters */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '16px'
              }}>
                <Input
                  label="Min Amount (₹)"
                  type="number"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  value={filters.minAmount}
                  onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                />

                <Input
                  label="Max Amount (₹)"
                  type="number"
                  placeholder="100000"
                  min="0"
                  step="0.01"
                  value={filters.maxAmount}
                  onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                />

                <Input
                  label="Min Profit (₹)"
                  type="number"
                  placeholder="0"
                  step="0.01"
                  value={filters.minProfit}
                  onChange={(e) => handleFilterChange('minProfit', e.target.value)}
                />

                <Input
                  label="Max Profit (₹)"
                  type="number"
                  placeholder="10000"
                  step="0.01"
                  value={filters.maxProfit}
                  onChange={(e) => handleFilterChange('maxProfit', e.target.value)}
                />
              </div>

              {/* Product Count Filters */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '16px'
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

              {/* Filter Summary */}
              {Object.values(filters).some(value => value !== '') && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '14px',
                  color: '#64748b'
                }}>
                  <strong>Active Filters:</strong>{' '}
                  {Object.entries(filters)
                    .filter(([_, value]) => value !== '')
                    .map(([key, value]) => {
                      const filterLabels = {
                        vendor: 'Vendor',
                        startDate: 'Start Date',
                        endDate: 'End Date',
                        minAmount: 'Min Amount',
                        maxAmount: 'Max Amount',
                        minProfit: 'Min Profit',
                        maxProfit: 'Max Profit',
                        minProductCount: 'Min Products',
                        maxProductCount: 'Max Products',
                        status: 'Status'
                      };
                      return `${filterLabels[key]}: ${value}`;
                    })
                    .join(', ')}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Sorting Controls and Bulk Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>Sort by:</span>
            {[
              { field: 'date', label: 'Date' },
              { field: 'billNumber', label: 'Bill Number' },
              { field: 'vendor', label: 'Vendor' },
              { field: 'totalAmount', label: 'Amount' },
              { field: 'totalProfit', label: 'Profit' }
            ].map(({ field, label }) => (
              <Button
                key={field}
                variant={sortField === field ? 'primary' : 'outline'}
                size="small"
                onClick={() => handleSort(field)}
                icon={
                  sortField === field ?
                    (sortDirection === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />) :
                    null
                }
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Bulk Actions */}
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            background: '#f3f4f6',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
              {selectedBills.size} {selectedBills.size === 1 ? 'bill' : 'bills'} selected
            </span>
            <div style={{ width: '1px', height: '20px', background: '#d1d5db' }} />
            <Button
              variant="outline"
              size="small"
              icon={<Copy size={14} />}
              onClick={handleBulkDuplicate}
              disabled={bulkActionLoading || selectedBills.size === 0}
            >
              Duplicate
            </Button>
            <Button
              variant="outline"
              size="small"
              icon={<Archive size={14} />}
              onClick={handleBulkArchive}
              disabled={bulkActionLoading || selectedBills.size === 0}
            >
              Archive
            </Button>
            <Button
              variant="outline"
              size="small"
              icon={<Download size={14} />}
              onClick={handleBulkExport}
              disabled={bulkActionLoading || selectedBills.size === 0}
            >
              Export
            </Button>
            <Button
              variant="danger"
              size="small"
              icon={<Trash2 size={14} />}
              onClick={handleBulkDelete}
              disabled={bulkActionLoading || selectedBills.size === 0}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Bills List */}
        <div style={{ marginBottom: '24px' }}>
          {paginatedBills.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Select All Header */}
              <Card style={{ padding: '12px 20px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  <button
                    onClick={handleSelectAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#6b7280'
                    }}
                  >
                    {selectedBills.size === paginatedBills.length ?
                      <CheckSquare size={16} /> :
                      <Square size={16} />
                    }
                  </button>
                  <span>
                    {selectedBills.size === paginatedBills.length ?
                      'Deselect all' :
                      'Select all'
                    } ({paginatedBills.length} bills)
                  </span>
                </div>
              </Card>

              {paginatedBills.map(bill => (
                <div key={bill.id} style={{ position: 'relative' }}>
                  {/* Selection Checkbox */}
                  <button
                    onClick={() => handleSelectBill(bill.id)}
                    style={{
                      position: 'absolute',
                      top: '20px',
                      left: '20px',
                      zIndex: 10,
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '4px',
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      ...(selectedBills.has(bill.id) && {
                        background: '#3b82f6',
                        borderColor: '#3b82f6',
                        color: 'white'
                      })
                    }}
                  >
                    {selectedBills.has(bill.id) && <CheckSquare size={12} />}
                  </button>

                  <BillCard
                    bill={bill}
                    products={billProducts[bill.id] || []}
                    onEdit={handleEditBill}
                    onDelete={handleDeleteBill}
                    onDuplicate={handleDuplicateBill}
                    onExport={handleExportBill}
                    style={{
                      paddingLeft: '60px',
                      ...(selectedBills.has(bill.id) && {
                        borderColor: '#3b82f6',
                        boxShadow: '0 0 0 1px #3b82f6'
                      })
                    }}
                  />
                </div>
              ))}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px'
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

        {/* Create Bill Modal */}
        <BillCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateBill}
          existingBills={bills}
        />

        {/* Conflict Resolution Modal */}
        <ConflictResolutionModal
          conflicts={conflicts}
          onAcknowledge={handleAcknowledgeConflict}
          onClearAll={handleClearAllConflicts}
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
        />
      </div>
    </ErrorBoundary>
  );
};

export default BillsView;