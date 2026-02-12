import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  SortAsc,
  SortDesc,
  X,
  CheckSquare,
  Square,
  Trash2,
  Copy,
  Archive,
  AlertTriangle,
  IndianRupee
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import ErrorBoundary from '../ui/ErrorBoundary';
import { useNotifications } from '../ui/NotificationSystem';
import {
  BillsListLoading,
  AnalyticsLoading,
  BulkOperationLoading
} from '../ui/LoadingStates';
import BillCard from './BillCard';
import BillCreateModal from './BillCreateModal';
import ProductModal from './ProductModal';
import ConflictResolutionModal from './ConflictResolutionModal';
import {
  subscribeToBills,
  addBill,
  updateBill,
  deleteBillWithProducts,
  duplicateBill,
  getBillAnalytics,
  exportBillToCSV,
  bulkDeleteBills,
  bulkDuplicateBills,
  bulkUpdateBillStatus,
  bulkExportBillsToCSV
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
import {
  billCacheUtils,
  analyticsCacheUtils
} from '../../utils/cacheUtils';
import { performanceMonitor } from '../../utils/performanceUtils';
import { getProductsByBill } from '../../firebase/shopProductService';
import realtimeSyncManager from '../../firebase/realtimeSync';

const BillsView = ({ searchTerm: externalSearchTerm, onSearchChange, onProductClick }) => {
  // Notification system
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();

  // State management with performance optimizations
  const [bills, setBills] = useState([]);
  const [billProducts, setBillProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const recentlyCreatedBills = useRef(new Set()); // Track bills we just created to avoid duplicate notifications
  const recentlyEditedBills = useRef(new Set()); // Track bills we just edited to avoid duplicate notifications
  const knownBillIds = useRef(new Set()); // Track all bills we've seen to avoid spurious notifications on remount
  const modifiedNotificationTimeouts = useRef(new Map()); // Debounce modified notifications
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
  // eslint-disable-next-line no-unused-vars
  const [_showBulkActions, setShowBulkActions] = useState(false);
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedBillForProduct, setSelectedBillForProduct] = useState(null);

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
            // On first load, just populate knownBillIds without showing notifications
            if (isFirstLoad.current) {
              metadata.changes.forEach(change => {
                if (change.type === 'added') {
                  knownBillIds.current.add(change.bill.id);
                }
              });
            } else {
              // Not first load - show notifications for genuinely new or modified bills
              metadata.changes.forEach(change => {
                if (change.type === 'added' && !change.optimistic) {
                  // Check if this is a genuinely new bill (not just a remount receiving existing data)
                  if (!recentlyCreatedBills.current.has(change.bill.id) &&
                    !knownBillIds.current.has(change.bill.id)) {
                    showSuccess(`New bill ${change.bill.billNumber} added!`);
                  } else if (recentlyCreatedBills.current.has(change.bill.id)) {
                    // Remove from tracking set after a short delay
                    setTimeout(() => {
                      recentlyCreatedBills.current.delete(change.bill.id);
                    }, 2000);
                  }
                  // Always track the bill as known
                  knownBillIds.current.add(change.bill.id);
                } else if (change.type === 'modified' && !change.optimistic) {
                  // Skip notification if this bill was recently created or edited by this client
                  // This prevents duplicate notifications from recalculateBillTotals updates
                  if (!recentlyCreatedBills.current.has(change.bill.id) &&
                    !recentlyEditedBills.current.has(change.bill.id)) {
                    // Debounce modified notifications to prevent duplicates from cascading updates
                    const billId = change.bill.id;
                    const billNumber = change.bill.billNumber;

                    // Clear any pending notification for this bill
                    if (modifiedNotificationTimeouts.current.has(billId)) {
                      clearTimeout(modifiedNotificationTimeouts.current.get(billId));
                    }

                    // Set a new debounced notification
                    const timeoutId = setTimeout(() => {
                      showInfo(`Bill ${billNumber} updated!`);
                      modifiedNotificationTimeouts.current.delete(billId);
                    }, 1000); // 1 second debounce

                    modifiedNotificationTimeouts.current.set(billId, timeoutId);
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
      // Clear any pending modified notification timeouts
      modifiedNotificationTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
      modifiedNotificationTimeouts.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const productsForBill = billProducts[bill.id] || [];
        const productMatches = productsForBill.some(product =>
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
        // Handle Firestore Timestamp, Date object, or string
        const billDate = bill.date?.toDate ? bill.date.toDate() :
          bill.date instanceof Date ? bill.date :
            new Date(bill.date);
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        return billDate >= startDate;
      });
    }

    if (filters.endDate) {
      result = result.filter(bill => {
        // Handle Firestore Timestamp, Date object, or string
        const billDate = bill.date?.toDate ? bill.date.toDate() :
          bill.date instanceof Date ? bill.date :
            new Date(bill.date);
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

    // Apply profit range filters
    if (filters.minProfit && filters.minProfit !== '') {
      const minProfit = parseFloat(filters.minProfit);
      if (!isNaN(minProfit)) {
        result = result.filter(bill => (bill.totalProfit || 0) >= minProfit);
      }
    }

    if (filters.maxProfit && filters.maxProfit !== '') {
      const maxProfit = parseFloat(filters.maxProfit);
      if (!isNaN(maxProfit)) {
        result = result.filter(bill => (bill.totalProfit || 0) <= maxProfit);
      }
    }

    // Apply product count filters
    if (filters.minProductCount && filters.minProductCount !== '') {
      const minCount = parseInt(filters.minProductCount);
      if (!isNaN(minCount)) {
        result = result.filter(bill => {
          const productCount = bill.productCount || (billProducts[bill.id]?.length || 0);
          return productCount >= minCount;
        });
      }
    }

    if (filters.maxProductCount && filters.maxProductCount !== '') {
      const maxCount = parseInt(filters.maxProductCount);
      if (!isNaN(maxCount)) {
        result = result.filter(bill => {
          const productCount = bill.productCount || (billProducts[bill.id]?.length || 0);
          return productCount <= maxCount;
        });
      }
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle date sorting - support Firestore Timestamp, Date object, or string
      if (sortField === 'date') {
        aValue = a.date?.toDate ? a.date.toDate() :
          a.date instanceof Date ? a.date :
            new Date(a.date);
        bValue = b.date?.toDate ? b.date.toDate() :
          b.date instanceof Date ? b.date :
            new Date(b.date);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Track this bill as recently created BEFORE showing notification
      // This prevents duplicate notification from real-time subscription callback
      recentlyCreatedBills.current.add(newBill.id);

      // Clean up tracking after a longer delay to ensure subscription has processed
      setTimeout(() => {
        recentlyCreatedBills.current.delete(newBill.id);
      }, 10000);

      showSuccess(`Bill ${newBill.billNumber} created successfully!`);
      setShowCreateModal(false);
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

  // Handler to open add product modal for a specific bill
  const handleOpenAddProductModal = (bill) => {
    setSelectedBillForProduct(bill);
    setShowAddProductModal(true);
  };

  // Handler to add a product to a bill
  const handleAddProductToBill = async (productData) => {
    const retryHandler = createRetryHandler(2, 1000);

    try {
      await retryHandler(async () => {
        // Add the product with the bill ID
        await addShopProduct(productData, selectedBillForProduct.id);
      }, { context: 'add_product_to_bill', billId: selectedBillForProduct?.id });

      showSuccess(`Product "${productData.productName}" added to ${selectedBillForProduct.billNumber}!`);

      // Refresh the products for this bill
      try {
        const products = await getProductsByBill(selectedBillForProduct.id);
        setBillProducts(prev => ({
          ...prev,
          [selectedBillForProduct.id]: products
        }));
      } catch (error) {
        console.error('Error refreshing bill products:', error);
      }

      setShowAddProductModal(false);
      setSelectedBillForProduct(null);
    } catch (error) {
      const billError = classifyError(error);
      reportError(billError, { context: 'add_product_to_bill', billId: selectedBillForProduct?.id });

      const errorMessage = getErrorMessage(billError);
      throw new Error(errorMessage.message);
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

        {/* Header — compact */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.01em'
            }}>
              Bills
            </h2>
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
                    fontSize: '11px', padding: '3px 7px',
                    backgroundColor: '#dbeafe', color: '#1e40af',
                    borderRadius: '4px', fontWeight: '500'
                  }}>
                    Virtual Scrolling
                  </div>
                )}
                {infiniteScrollEnabled && (
                  <div style={{
                    fontSize: '11px', padding: '3px 7px',
                    backgroundColor: '#dcfce7', color: '#166534',
                    borderRadius: '4px', fontWeight: '500'
                  }}>
                    Infinite Scroll
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              size="small"
              icon={<Plus size={14} />}
              onClick={() => setShowCreateModal(true)}
              style={{ borderRadius: '8px', fontWeight: '600' }}
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
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px'
            }}>
              <Card padding={20} style={{ borderLeft: '4px solid #6366f1', transition: 'box-shadow 0.2s ease' }}
                className="summary-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Package size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
                      {analytics.totalBills}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Total Bills</div>
                  </div>
                </div>
              </Card>

              <Card padding={20} style={{ borderLeft: '4px solid #10b981', transition: 'box-shadow 0.2s ease' }}
                className="summary-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <IndianRupee size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
                      {formatCurrency(analytics.totalAmount)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Total Amount</div>
                  </div>
                </div>
              </Card>

              <Card padding={20} style={{ borderLeft: '4px solid #f59e0b', transition: 'box-shadow 0.2s ease' }}
                className="summary-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
                      {formatCurrency(analytics.totalProfit)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Total Profit</div>
                  </div>
                </div>
              </Card>

              <Card padding={20} style={{ borderLeft: '4px solid #8b5cf6', transition: 'box-shadow 0.2s ease' }}
                className="summary-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Calendar size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
                      {formatCurrency(analytics.averageBillValue)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Avg Bill Value</div>
                  </div>
                </div>
              </Card>
            </div>
          ) : null}
        </div>

        {/* Search and Filter Controls */}
        <Card style={{ marginBottom: '16px', padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <Input
                placeholder="Search bills by number, vendor, notes, or product names..."
                icon={<Search size={14} />}
                value={searchTerm}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setSearchTerm(newValue);
                  if (onSearchChange) {
                    onSearchChange(newValue);
                  }
                }}
                containerStyle={{ marginBottom: 0 }}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '13px', padding: '8px 12px' }}
              />
              {searchTerm && (
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  Searching across bills and their products...
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="small"
              icon={<Filter size={14} />}
              onClick={() => setShowFilters(!showFilters)}
              style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '12px' }}
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

        {/* Sort Controls + Select All */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '16px',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {/* Select All Checkbox */}
          {paginatedBills.length > 0 && (
            <button
              onClick={handleSelectAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '5px 10px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                color: selectedBills.size === paginatedBills.length ? '#3b82f6' : '#6b7280',
                transition: 'all 0.15s ease',
              }}
            >
              {selectedBills.size === paginatedBills.length ?
                <CheckSquare size={14} color="#3b82f6" /> :
                <Square size={14} />
              }
              All
            </button>
          )}

          <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />

          {/* Sort Pills */}
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Sort:</span>
          {[
            { field: 'date', label: 'Date' },
            { field: 'billNumber', label: 'Bill #' },
            { field: 'vendor', label: 'Vendor' },
            { field: 'totalAmount', label: 'Amount' },
            { field: 'totalProfit', label: 'Profit' }
          ].map(({ field, label }) => (
            <button
              key={field}
              onClick={() => handleSort(field)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 12px',
                border: sortField === field ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                borderRadius: '20px',
                background: sortField === field ? '#eff6ff' : '#fff',
                color: sortField === field ? '#2563eb' : '#64748b',
                fontSize: '12px',
                fontWeight: sortField === field ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
              {sortField === field && (
                sortDirection === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />
              )}
            </button>
          ))}

          {/* Bills count */}
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
            {filteredAndSortedBills.length} bill{filteredAndSortedBills.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Bills List */}
        <div style={{ marginBottom: '24px' }}>
          {paginatedBills.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>


              {paginatedBills.map(bill => (
                <div key={bill.id} style={{ position: 'relative', paddingLeft: '30px' }}>
                  {/* Selection Checkbox — tight to left edge */}
                  <button
                    onClick={() => handleSelectBill(bill.id)}
                    style={{
                      position: 'absolute',
                      top: '16px',
                      left: '0px',
                      zIndex: 10,
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '4px',
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...(selectedBills.has(bill.id) && {
                        background: '#3b82f6',
                        borderColor: '#3b82f6',
                        color: 'white'
                      })
                    }}
                  >
                    {selectedBills.has(bill.id) && <CheckSquare size={11} />}
                  </button>

                  <BillCard
                    bill={bill}
                    products={billProducts[bill.id] || []}
                    onEdit={handleEditBill}
                    onDelete={handleDeleteBill}
                    onDuplicate={handleDuplicateBill}
                    onExport={handleExportBill}
                    onAddProduct={handleOpenAddProductModal}
                    onProductClick={onProductClick}
                    style={{
                      paddingLeft: '60px',
                      ...(selectedBills.has(bill.id) && {
                        outline: '2px solid #3b82f6',
                        outlineOffset: '-2px'
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

        {/* Add Product to Bill Modal */}
        <ProductModal
          isOpen={showAddProductModal}
          onClose={() => {
            setShowAddProductModal(false);
            setSelectedBillForProduct(null);
          }}
          onSave={handleAddProductToBill}
          bill={selectedBillForProduct}
          mode="create"
        />

        {/* Floating Bulk Actions Bar */}
        {selectedBills.size > 0 && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#1e293b',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '14px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            zIndex: 1000,
            animation: 'slideUp 0.25s ease-out',
          }}>
            <span style={{
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                background: '#3b82f6',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '700'
              }}>
                {selectedBills.size}
              </span>
              selected
            </span>

            <div style={{ width: '1px', height: '24px', background: '#475569' }} />

            <button
              onClick={handleBulkDuplicate}
              disabled={bulkActionLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'none', border: 'none', color: '#cbd5e1',
                cursor: bulkActionLoading ? 'not-allowed' : 'pointer',
                fontSize: '13px', fontWeight: '500', padding: '6px 10px',
                borderRadius: '8px', transition: 'all 0.15s',
                opacity: bulkActionLoading ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!bulkActionLoading) { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = 'white'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#cbd5e1'; }}
            >
              <Copy size={14} /> Duplicate
            </button>
            <button
              onClick={handleBulkArchive}
              disabled={bulkActionLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'none', border: 'none', color: '#cbd5e1',
                cursor: bulkActionLoading ? 'not-allowed' : 'pointer',
                fontSize: '13px', fontWeight: '500', padding: '6px 10px',
                borderRadius: '8px', transition: 'all 0.15s',
                opacity: bulkActionLoading ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!bulkActionLoading) { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = 'white'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#cbd5e1'; }}
            >
              <Archive size={14} /> Archive
            </button>
            <button
              onClick={handleBulkExport}
              disabled={bulkActionLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'none', border: 'none', color: '#cbd5e1',
                cursor: bulkActionLoading ? 'not-allowed' : 'pointer',
                fontSize: '13px', fontWeight: '500', padding: '6px 10px',
                borderRadius: '8px', transition: 'all 0.15s',
                opacity: bulkActionLoading ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!bulkActionLoading) { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = 'white'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#cbd5e1'; }}
            >
              <Download size={14} /> Export
            </button>

            <div style={{ width: '1px', height: '24px', background: '#475569' }} />

            <button
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#dc2626', border: 'none', color: 'white',
                cursor: bulkActionLoading ? 'not-allowed' : 'pointer',
                fontSize: '13px', fontWeight: '600', padding: '6px 12px',
                borderRadius: '8px', transition: 'all 0.15s',
                opacity: bulkActionLoading ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!bulkActionLoading) e.currentTarget.style.background = '#b91c1c'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#dc2626'; }}
            >
              <Trash2 size={14} /> Delete
            </button>

            <button
              onClick={() => setSelectedBills(new Set())}
              style={{
                display: 'flex', alignItems: 'center',
                background: 'none', border: 'none', color: '#64748b',
                cursor: 'pointer', padding: '6px',
                borderRadius: '8px', transition: 'all 0.15s',
                marginLeft: '4px',
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