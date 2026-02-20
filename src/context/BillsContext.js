import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNotifications } from '../components/ui/NotificationSystem';
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
} from '../firebase/billService';
import { addShopProduct, getProductsByBill, deleteShopProduct } from '../firebase/shopProductService';
import {
  classifyError,
  getErrorMessage,
  getRecoveryOptions,
  createRetryHandler,
  reportError
} from '../utils/errorHandling';
import { analyticsCacheUtils } from '../utils/cacheUtils';
import { performanceMonitor } from '../utils/performanceUtils';
import realtimeSyncManager from '../firebase/realtimeSync';

const BillsContext = createContext();

export const useBills = () => {
  const context = useContext(BillsContext);
  if (!context) {
    throw new Error('useBills must be used within a BillsProvider');
  }
  return context;
};

export const BillsProvider = ({ children }) => {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();

  // Core data state
  const [bills, setBills] = useState([]);
  const [billProducts, setBillProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Error handling state
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Bulk operations
  const [selectedBills, setSelectedBills] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkOperationStatus, setBulkOperationStatus] = useState(null);

  // Conflict resolution
  const [conflicts, setConflicts] = useState([]);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Notification dedup refs
  const isFirstLoad = useRef(true);
  const recentlyCreatedBills = useRef(new Set());
  const recentlyEditedBills = useRef(new Set());
  const knownBillIds = useRef(new Set());
  const modifiedNotificationTimeouts = useRef(new Map());

  // Monitor conflicts
  useEffect(() => {
    const updateConflicts = () => {
      const pendingConflicts = realtimeSyncManager.getPendingConflicts();
      setConflicts(pendingConflicts);

      if (pendingConflicts.length > 0 && !showConflictModal) {
        setShowConflictModal(true);
      }
    };

    updateConflicts();

    const handleConflict = () => {
      updateConflicts();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('realtimeConflict', handleConflict);
      return () => window.removeEventListener('realtimeConflict', handleConflict);
    }
  }, [showConflictModal]);

  // Subscribe to bills data with real-time features
  useEffect(() => {
    const retryHandler = createRetryHandler(3, 1000);

    const subscribeWithRetry = async () => {
      try {
        setError(null);
        setIsRetrying(false);

        const unsubscribe = subscribeToBills((billsData, metadata) => {
          setBills(billsData);
          setLoading(false);

          // Handle real-time changes
          if (metadata?.changes) {
            if (isFirstLoad.current) {
              metadata.changes.forEach(change => {
                if (change.type === 'added') {
                  knownBillIds.current.add(change.bill.id);
                }
              });
            } else {
              metadata.changes.forEach(change => {
                if (change.type === 'added' && !change.optimistic) {
                  if (!recentlyCreatedBills.current.has(change.bill.id) &&
                    !knownBillIds.current.has(change.bill.id)) {
                    showSuccess(`New bill ${change.bill.billNumber} added!`);
                  } else if (recentlyCreatedBills.current.has(change.bill.id)) {
                    setTimeout(() => {
                      recentlyCreatedBills.current.delete(change.bill.id);
                    }, 2000);
                  }
                  knownBillIds.current.add(change.bill.id);
                } else if (change.type === 'modified' && !change.optimistic) {
                  if (!recentlyCreatedBills.current.has(change.bill.id) &&
                    !recentlyEditedBills.current.has(change.bill.id)) {
                    const billId = change.bill.id;
                    const billNumber = change.bill.billNumber;

                    if (modifiedNotificationTimeouts.current.has(billId)) {
                      clearTimeout(modifiedNotificationTimeouts.current.get(billId));
                    }

                    const timeoutId = setTimeout(() => {
                      showInfo(`Bill ${billNumber} updated!`);
                      modifiedNotificationTimeouts.current.delete(billId);
                    }, 1000);

                    modifiedNotificationTimeouts.current.set(billId, timeoutId);
                  }
                }
              });
            }
            isFirstLoad.current = false;
          }

          // Handle offline/online status
          if (metadata?.metadata?.fromCache && !metadata?.metadata?.hasPendingWrites) {
            showWarning('You are offline. Changes will sync when connection is restored.');
          }

          // Load products for new and modified bills
          const billsToLoadProducts = metadata?.changes?.filter(c => c.type === 'added' || c.type === 'modified').map(c => c.bill) || [];
          billsToLoadProducts.forEach(async (bill) => {
            try {
              const products = await getProductsByBill(bill.id);
              setBillProducts(prev => ({
                ...prev,
                [bill.id]: products
              }));
            } catch (err) {
              const billError = classifyError(err);
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
              } catch (err) {
                const billError = classifyError(err);
                reportError(billError, { context: 'loading_initial_products', billId: bill.id });
                console.error(`Error loading products for bill ${bill.id}:`, billError);
              }
            });
          }
        }, {
          onError: (err) => {
            const billError = classifyError(err);
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
      } catch (err) {
        const billError = classifyError(err);
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
      } catch (err) {
        setIsRetrying(false);
        const errorMessage = getErrorMessage(err);
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

    const timeoutsRef = modifiedNotificationTimeouts.current;
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      timeoutsRef.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutsRef.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

  // Load analytics with caching
  useEffect(() => {
    const loadAnalytics = async () => {
      if (bills.length === 0) return;

      setAnalyticsLoading(true);
      const retryHandler = createRetryHandler(2, 1000);

      try {
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

        analyticsCacheUtils.setBillAnalytics(analyticsData);
        setAnalytics(analyticsData);
      } catch (err) {
        const billError = classifyError(err);
        reportError(billError, { context: 'load_analytics', billCount: bills.length });
        console.warn('Analytics loading failed:', billError.message);

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

  // Conflict resolution handlers
  const handleAcknowledgeConflict = useCallback((conflictIndex) => {
    realtimeSyncManager.acknowledgeConflict(conflictIndex);
    setConflicts(realtimeSyncManager.getPendingConflicts());
  }, []);

  const handleClearAllConflicts = useCallback(() => {
    conflicts.forEach((_, index) => {
      realtimeSyncManager.acknowledgeConflict(index);
    });
    realtimeSyncManager.clearAcknowledgedConflicts();
    setConflicts([]);
    setShowConflictModal(false);
  }, [conflicts]);

  // CRUD handlers
  const handleCreateBill = useCallback(async (billData) => {
    try {
      const retryHandler = createRetryHandler(2, 1000);

      const newBill = await retryHandler(async () => {
        const bill = await addBill(billData);

        // Handle multi-product array
        const productsToAdd = billData.products && billData.products.length > 0
          ? billData.products
          : (billData.productName && billData.quantity ? [billData] : []);

        for (const p of productsToAdd) {
          const qty = parseFloat(p.quantity) || 0;
          const amount = parseFloat(p.totalAmount) || 0;
          const mrp = parseFloat(p.mrp) || 0;
          const costPerUnit = qty > 0 ? amount / qty : 0;
          const profitPerPiece = mrp - costPerUnit;

          if (!p.productName && qty === 0 && amount === 0) continue;

          const newProductData = {
            productName: p.productName || '',
            mrp: mrp,
            totalQuantity: qty,
            quantity: qty,
            totalAmount: amount,
            vendor: billData.vendor,
            category: 'Uncategorized',
            status: 'in_stock',
            costPerUnit: costPerUnit,
            pricePerPiece: costPerUnit,
            profitPerPiece: profitPerPiece,
            totalProfit: profitPerPiece * qty
          };

          await addShopProduct(newProductData, bill.id);
        }

        return bill;
      }, { context: 'create_bill', billNumber: billData.billNumber });

      recentlyCreatedBills.current.add(newBill.id);

      setTimeout(() => {
        recentlyCreatedBills.current.delete(newBill.id);
      }, 10000);

      showSuccess(`Bill ${newBill.billNumber} created successfully!`);
      return newBill;
    } catch (err) {
      const billError = classifyError(err);
      reportError(billError, { context: 'create_bill', billData });

      const errorMessage = getErrorMessage(billError);
      throw new Error(errorMessage.message);
    }
  }, [showSuccess]);

  const handleEditBill = useCallback(async (billId, updatedData) => {
    const retryHandler = createRetryHandler(2, 1000);

    recentlyEditedBills.current.add(billId);

    try {
      const originalBills = [...bills];
      const billToUpdate = bills.find(b => b.id === billId);

      // Separate products from bill fields
      const { products: updatedProducts, ...billFields } = updatedData;

      // Calculate totals from the updated products
      let totals = {};
      if (updatedProducts && updatedProducts.length > 0) {
        const validProducts = updatedProducts.filter(p => p.productName || p.quantity || p.totalAmount);
        totals = validProducts.reduce((acc, p) => {
          const qty = parseFloat(p.quantity) || 0;
          const amount = parseFloat(p.totalAmount) || 0;
          const mrp = parseFloat(p.mrp) || 0;
          const costPerUnit = qty > 0 ? amount / qty : 0;
          const profitPerPiece = mrp - costPerUnit;
          return {
            totalQuantity: acc.totalQuantity + qty,
            totalAmount: acc.totalAmount + amount,
            totalProfit: acc.totalProfit + (profitPerPiece * qty),
            productCount: acc.productCount + 1
          };
        }, { totalQuantity: 0, totalAmount: 0, totalProfit: 0, productCount: 0 });
      }

      const billUpdateData = { ...billFields, ...totals };

      setBills(prev => prev.map(bill =>
        bill.id === billId
          ? {
            ...bill,
            ...billUpdateData,
            updatedAt: new Date(),
            _metadata: { ...bill._metadata, optimistic: true }
          }
          : bill
      ));

      try {
        // 1. Update the bill document (without products array)
        await retryHandler(async () => {
          return await updateBill(billId, billUpdateData);
        }, { context: 'update_bill', billId, billNumber: billToUpdate?.billNumber });

        // 2. Sync products: delete old products, add new ones
        if (updatedProducts) {
          const existingProducts = await getProductsByBill(billId);

          // Delete all existing products for this bill
          for (const oldProduct of existingProducts) {
            try {
              await deleteShopProduct(oldProduct.id);
            } catch (err) {
              console.error(`Error deleting old product ${oldProduct.id}:`, err);
            }
          }

          // Add updated products
          const validProducts = updatedProducts.filter(p => p.productName || p.quantity || p.totalAmount);
          for (const p of validProducts) {
            const qty = parseFloat(p.quantity) || 0;
            const amount = parseFloat(p.totalAmount) || 0;
            const mrp = parseFloat(p.mrp) || 0;
            const costPerUnit = qty > 0 ? amount / qty : 0;
            const profitPerPiece = mrp - costPerUnit;

            const newProductData = {
              productName: p.productName || '',
              mrp: mrp,
              totalQuantity: qty,
              quantity: qty,
              totalAmount: amount,
              vendor: billFields.vendor || billToUpdate?.vendor || '',
              category: p.category || 'Uncategorized',
              status: 'in_stock',
              costPerUnit: costPerUnit,
              pricePerPiece: costPerUnit,
              profitPerPiece: profitPerPiece,
              totalProfit: profitPerPiece * qty
            };

            try {
              await addShopProduct(newProductData, billId);
            } catch (err) {
              console.error(`Error adding updated product:`, err);
            }
          }

          // Refresh billProducts for this bill
          try {
            const refreshedProducts = await getProductsByBill(billId);
            setBillProducts(prev => ({
              ...prev,
              [billId]: refreshedProducts
            }));
          } catch (err) {
            console.error('Error refreshing bill products:', err);
          }
        }

        setBills(prev => prev.map(bill =>
          bill.id === billId
            ? { ...bill, _metadata: { ...bill._metadata, optimistic: false } }
            : bill
        ));

        showSuccess(`Bill ${billToUpdate?.billNumber || billId} updated successfully!`);

        setTimeout(() => {
          recentlyEditedBills.current.delete(billId);
        }, 5000);
      } catch (err) {
        setBills(originalBills);
        recentlyEditedBills.current.delete(billId);
        throw err;
      }
    } catch (err) {
      recentlyEditedBills.current.delete(billId);
      const billError = classifyError(err);
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
  }, [bills, showSuccess, showError]);

  const handleDeleteBill = useCallback(async (billId) => {
    const retryHandler = createRetryHandler(2, 1000);

    try {
      const billToDelete = bills.find(b => b.id === billId);
      const originalBills = [...bills];
      setBills(prev => prev.filter(bill => bill.id !== billId));

      try {
        await retryHandler(async () => {
          return await deleteBillWithProducts(billId);
        }, { context: 'delete_bill', billId, billNumber: billToDelete?.billNumber });

        showError(`Bill ${billToDelete?.billNumber || billId} deleted.`, { duration: 5000 });

        setSelectedBills(prev => {
          const newSelected = new Set(prev);
          newSelected.delete(billId);
          return newSelected;
        });
      } catch (err) {
        setBills(originalBills);
        throw err;
      }
    } catch (err) {
      const billError = classifyError(err);
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
  }, [bills, showError]);

  const handleDuplicateBill = useCallback(async (billId) => {
    const retryHandler = createRetryHandler(2, 1000);

    try {
      const billToDuplicate = bills.find(b => b.id === billId);

      await retryHandler(async () => {
        return await duplicateBill(billId);
      }, { context: 'duplicate_bill', billId, billNumber: billToDuplicate?.billNumber });

      showSuccess(`Bill ${billToDuplicate?.billNumber || billId} duplicated successfully!`);
    } catch (err) {
      const billError = classifyError(err);
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
  }, [bills, showSuccess, showError]);

  const handleExportBill = useCallback(async (billId) => {
    const retryHandler = createRetryHandler(2, 1000);

    try {
      const billToExport = bills.find(b => b.id === billId);

      const result = await retryHandler(async () => {
        return await exportBillToCSV(billId);
      }, { context: 'export_bill', billId, billNumber: billToExport?.billNumber });

      const blob = new Blob([result.content], { type: result.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      window.URL.revokeObjectURL(url);

      showSuccess(`Bill ${billToExport?.billNumber || billId} exported successfully!`);
    } catch (err) {
      const billError = classifyError(err);
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
  }, [bills, showSuccess, showError]);

  // Add product to bill handler
  const handleAddProductToBill = useCallback(async (productData, selectedBill) => {
    const retryHandler = createRetryHandler(2, 1000);

    try {
      await retryHandler(async () => {
        await addShopProduct(productData, selectedBill.id);
      }, { context: 'add_product_to_bill', billId: selectedBill?.id });

      showSuccess(`Product "${productData.productName}" added to ${selectedBill.billNumber}!`);

      // Refresh the products for this bill
      try {
        const products = await getProductsByBill(selectedBill.id);
        setBillProducts(prev => ({
          ...prev,
          [selectedBill.id]: products
        }));
      } catch (err) {
        console.error('Error refreshing bill products:', err);
      }
    } catch (err) {
      const billError = classifyError(err);
      reportError(billError, { context: 'add_product_to_bill', billId: selectedBill?.id });

      const errorMessage = getErrorMessage(billError);
      throw new Error(errorMessage.message);
    }
  }, [showSuccess]);

  // Selection handlers
  const handleSelectBill = useCallback((billId) => {
    setSelectedBills(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(billId)) {
        newSelected.delete(billId);
      } else {
        newSelected.add(billId);
      }
      return newSelected;
    });
  }, []);

  const handleSelectAll = useCallback((paginatedBills) => {
    setSelectedBills(prev => {
      if (prev.size === paginatedBills.length) {
        return new Set();
      } else {
        return new Set(paginatedBills.map(bill => bill.id));
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedBills(new Set());
  }, []);

  // Bulk operation handlers
  const handleBulkDelete = useCallback(async () => {
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
        showError(`${successCount} bill${successCount !== 1 ? 's' : ''} deleted.`, { duration: 5000 });
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
    } catch (err) {
      const billError = classifyError(err);
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
  }, [selectedBills, showWarning, showInfo, showError]);

  const handleBulkDuplicate = useCallback(async () => {
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
    } catch (err) {
      const billError = classifyError(err);
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
  }, [selectedBills, showSuccess, showWarning, showInfo, showError]);

  const handleBulkArchive = useCallback(async () => {
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
    } catch (err) {
      const billError = classifyError(err);
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
  }, [selectedBills, showSuccess, showWarning, showInfo, showError]);

  const handleBulkExport = useCallback(async () => {
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

      const blob = new Blob([result.content], { type: result.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      window.URL.revokeObjectURL(url);

      showSuccess(`Successfully exported ${selectedBills.size} bills!`);
      setSelectedBills(new Set());
    } catch (err) {
      const billError = classifyError(err);
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
  }, [selectedBills, showSuccess, showError]);

  // Retry subscription
  const retrySubscription = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  const value = {
    // Data
    bills,
    billProducts,
    loading,
    error,
    isRetrying,
    retryCount,
    analytics,
    analyticsLoading,

    // Selection
    selectedBills,
    handleSelectBill,
    handleSelectAll,
    clearSelection,

    // CRUD
    handleCreateBill,
    handleEditBill,
    handleDeleteBill,
    handleDuplicateBill,
    handleExportBill,
    handleAddProductToBill,

    // Bulk operations
    bulkActionLoading,
    bulkOperationStatus,
    handleBulkDelete,
    handleBulkDuplicate,
    handleBulkArchive,
    handleBulkExport,

    // Conflicts
    conflicts,
    showConflictModal,
    setShowConflictModal,
    handleAcknowledgeConflict,
    handleClearAllConflicts,

    // Retry
    retrySubscription,
  };

  return (
    <BillsContext.Provider value={value}>
      {children}
    </BillsContext.Provider>
  );
};

export default BillsContext;
