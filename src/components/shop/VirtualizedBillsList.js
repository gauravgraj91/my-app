import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import { FixedSizeList } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import AutoSizer from 'react-virtualized-auto-sizer';
import BillCard from './BillCard';
import { LoadingSpinner } from '../ui';
import { 
  fetchBillsInfinite,
  deleteBillWithProducts,
  duplicateBill,
  exportBillToCSV
} from '../../firebase/billService';
import { getProductsByBill } from '../../firebase/shopProductService';
import { billCacheUtils, productCacheUtils, cacheInvalidationUtils } from '../../utils/cacheUtils';

const ITEM_HEIGHT = 280; // Estimated height of each BillCard
const OVERSCAN_COUNT = 5; // Number of items to render outside visible area

const VirtualizedBillsList = ({ 
  bills = [], 
  loading = false,
  searchTerm = '',
  filters = {},
  sortField = 'date',
  sortDirection = 'desc',
  onBillEdit,
  onBillDelete,
  onBillDuplicate,
  onBillExport,
  onProductClick,
  onLoadMore,
  hasMore = false,
  darkMode = false
}) => {
  const [billProducts, setBillProducts] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(new Set());
  const [itemHeights, setItemHeights] = useState(new Map());
  const [expandedBills, setExpandedBills] = useState(new Set());
  const listRef = useRef();
  const loaderRef = useRef();

  // Memoized filtered and sorted bills
  const processedBills = useMemo(() => {
    let result = [...bills];

    // Apply search filter
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
        const products = billProducts[bill.id] || [];
        const productMatches = products.some(product =>
          (product.productName && product.productName.toLowerCase().includes(searchLower)) ||
          (product.category && product.category.toLowerCase().includes(searchLower))
        );
        
        return productMatches;
      });
    }

    // Apply filters
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
  }, [bills, billProducts, searchTerm, filters, sortField, sortDirection]);

  // Load products for a bill with caching
  const loadBillProducts = useCallback(async (billId) => {
    if (loadingProducts.has(billId) || billProducts[billId]) {
      return;
    }

    // Check cache first
    const cached = productCacheUtils.getByBill(billId);
    if (cached) {
      setBillProducts(prev => ({
        ...prev,
        [billId]: cached
      }));
      return;
    }

    setLoadingProducts(prev => new Set(prev).add(billId));

    try {
      const products = await getProductsByBill(billId);
      
      // Cache the products
      productCacheUtils.setByBill(billId, products);
      
      setBillProducts(prev => ({
        ...prev,
        [billId]: products
      }));
    } catch (error) {
      console.error(`Error loading products for bill ${billId}:`, error);
    } finally {
      setLoadingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(billId);
        return newSet;
      });
    }
  }, [loadingProducts, billProducts]);

  // Load products for visible bills
  useEffect(() => {
    const visibleBills = processedBills.slice(0, Math.min(20, processedBills.length));
    visibleBills.forEach(bill => {
      if (!billProducts[bill.id] && !loadingProducts.has(bill.id)) {
        loadBillProducts(bill.id);
      }
    });
  }, [processedBills, billProducts, loadingProducts, loadBillProducts]);

  // Calculate dynamic item height based on expansion state
  const getItemHeight = useCallback((index) => {
    const bill = processedBills[index];
    if (!bill) return ITEM_HEIGHT;

    const isExpanded = expandedBills.has(bill.id);
    const products = billProducts[bill.id] || [];
    
    let height = ITEM_HEIGHT; // Base height
    
    if (isExpanded) {
      // Add height for expanded products (approximately 60px per product)
      height += Math.min(products.length * 60, 400); // Max 400px for scrollable area
    }

    return height;
  }, [processedBills, expandedBills, billProducts]);

  // Handle bill expansion
  const handleBillExpansion = useCallback((billId, isExpanded) => {
    setExpandedBills(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(billId);
        // Load products when expanding
        loadBillProducts(billId);
      } else {
        newSet.delete(billId);
      }
      return newSet;
    });

    // Reset list height calculations
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [loadBillProducts]);

  // Handle bill operations with cache invalidation
  const handleBillEdit = useCallback(async (billId, updatedData) => {
    try {
      await onBillEdit(billId, updatedData);
      cacheInvalidationUtils.invalidateBill(billId);
    } catch (error) {
      console.error('Error editing bill:', error);
      throw error;
    }
  }, [onBillEdit]);

  const handleBillDelete = useCallback(async (billId) => {
    try {
      await onBillDelete(billId);
      cacheInvalidationUtils.invalidateBill(billId);
      
      // Remove from local state
      setBillProducts(prev => {
        const newState = { ...prev };
        delete newState[billId];
        return newState;
      });
      
      setExpandedBills(prev => {
        const newSet = new Set(prev);
        newSet.delete(billId);
        return newSet;
      });
    } catch (error) {
      console.error('Error deleting bill:', error);
      throw error;
    }
  }, [onBillDelete]);

  const handleBillDuplicate = useCallback(async (billId) => {
    try {
      await onBillDuplicate(billId);
      // Clear query cache to refresh the list
      const { queryCacheUtils } = await import('../../utils/cacheUtils');
      queryCacheUtils.clear();
    } catch (error) {
      console.error('Error duplicating bill:', error);
      throw error;
    }
  }, [onBillDuplicate]);

  const handleBillExport = useCallback(async (billId) => {
    try {
      await onBillExport(billId);
    } catch (error) {
      console.error('Error exporting bill:', error);
      throw error;
    }
  }, [onBillExport]);

  // Check if item is loaded for infinite loading
  const isItemLoaded = useCallback((index) => {
    return !!processedBills[index];
  }, [processedBills]);

  // Load more items for infinite scrolling
  const loadMoreItems = useCallback(async (startIndex, stopIndex) => {
    if (onLoadMore && hasMore) {
      try {
        await onLoadMore(startIndex, stopIndex);
      } catch (error) {
        console.error('Error loading more items:', error);
      }
    }
  }, [onLoadMore, hasMore]);

  // Render individual bill item
  const BillItem = useCallback(({ index, style }) => {
    const bill = processedBills[index];
    
    if (!bill) {
      return (
        <div style={style}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: ITEM_HEIGHT,
            color: '#6b7280'
          }}>
            <LoadingSpinner size="small" />
            <span style={{ marginLeft: '8px' }}>Loading bill...</span>
          </div>
        </div>
      );
    }

    const products = billProducts[bill.id] || [];
    const isExpanded = expandedBills.has(bill.id);
    const isLoadingProducts = loadingProducts.has(bill.id);

    return (
      <div style={style}>
        <div style={{ padding: '8px 0' }}>
          <BillCard
            bill={bill}
            products={products}
            isExpanded={isExpanded}
            isLoadingProducts={isLoadingProducts}
            onEdit={handleBillEdit}
            onDelete={handleBillDelete}
            onDuplicate={handleBillDuplicate}
            onExport={handleBillExport}
            onProductClick={onProductClick}
            onExpansionChange={(expanded) => handleBillExpansion(bill.id, expanded)}
            darkMode={darkMode}
          />
        </div>
      </div>
    );
  }, [
    processedBills, 
    billProducts, 
    expandedBills, 
    loadingProducts,
    handleBillEdit,
    handleBillDelete,
    handleBillDuplicate,
    handleBillExport,
    handleBillExpansion,
    onProductClick,
    darkMode
  ]);

  // Show loading state
  if (loading && processedBills.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: '18px',
        color: '#6b7280'
      }}>
        <LoadingSpinner />
        <span style={{ marginLeft: '12px' }}>Loading bills...</span>
      </div>
    );
  }

  // Show empty state
  if (!loading && processedBills.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        color: '#6b7280'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
        <div style={{ fontSize: '18px', marginBottom: '8px' }}>No bills found</div>
        <div style={{ fontSize: '14px' }}>
          {searchTerm || Object.values(filters).some(f => f) 
            ? 'Try adjusting your search or filters' 
            : 'Create your first bill to get started'
          }
        </div>
      </div>
    );
  }

  const itemCount = hasMore ? processedBills.length + 1 : processedBills.length;

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <AutoSizer>
        {({ height, width }) => (
          <InfiniteLoader
            ref={loaderRef}
            isItemLoaded={isItemLoaded}
            itemCount={itemCount}
            loadMoreItems={loadMoreItems}
            threshold={5} // Start loading when 5 items from the end
          >
            {({ onItemsRendered, ref }) => (
              <FixedSizeList
                ref={(list) => {
                  ref(list);
                  listRef.current = list;
                }}
                height={height}
                width={width}
                itemCount={itemCount}
                itemSize={getItemHeight}
                onItemsRendered={onItemsRendered}
                overscanCount={OVERSCAN_COUNT}
                itemData={{
                  bills: processedBills,
                  billProducts,
                  expandedBills,
                  loadingProducts,
                  onEdit: handleBillEdit,
                  onDelete: handleBillDelete,
                  onDuplicate: handleBillDuplicate,
                  onExport: handleBillExport,
                  onProductClick,
                  onExpansionChange: handleBillExpansion,
                  darkMode
                }}
              >
                {BillItem}
              </FixedSizeList>
            )}
          </InfiniteLoader>
        )}
      </AutoSizer>
      
      {/* Loading indicator for infinite scroll */}
      {loading && processedBills.length > 0 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          padding: '16px',
          color: '#6b7280'
        }}>
          <LoadingSpinner size="small" />
          <span style={{ marginLeft: '8px' }}>Loading more bills...</span>
        </div>
      )}
    </div>
  );
};

export default VirtualizedBillsList;