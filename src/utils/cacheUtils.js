/**
 * Cache utilities for performance optimization
 */

class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      // Update existing
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  keys() {
    return Array.from(this.cache.keys());
  }

  values() {
    return Array.from(this.cache.values());
  }
}

class TimedCache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.ttl = ttl;
    this.cache = new Map();
    this.timers = new Map();
  }

  get(key) {
    if (this.cache.has(key)) {
      const { value, timestamp } = this.cache.get(key);

      if (Date.now() - timestamp < this.ttl) {
        return value;
      } else {
        // Expired
        this.delete(key);
        return null;
      }
    }
    return null;
  }

  set(key, value) {
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set value with timestamp
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, this.ttl);

    this.timers.set(key, timer);
  }

  has(key) {
    const item = this.get(key); // This will handle expiration
    return item !== null;
  }

  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return this.cache.delete(key);
  }

  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, { timestamp }] of this.cache.entries()) {
      if (now - timestamp >= this.ttl) {
        this.delete(key);
      }
    }
  }
}

// Global cache instances
const billCache = new LRUCache(200);
const productCache = new LRUCache(500);
const analyticsCache = new TimedCache(2 * 60 * 1000); // 2 minutes for analytics
const queryCache = new TimedCache(30 * 1000); // 30 seconds for queries

// Cache key generators
export const generateCacheKey = (prefix, ...args) => {
  return `${prefix}:${args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(':')}`;
};

// Bill caching utilities
export const billCacheUtils = {
  get: (billId) => billCache.get(`bill:${billId}`),
  set: (billId, bill) => billCache.set(`bill:${billId}`, bill),
  delete: (billId) => billCache.delete(`bill:${billId}`),
  clear: () => billCache.clear(),

  // Cache bill with products
  getBillWithProducts: (billId) => billCache.get(`bill-products:${billId}`),
  setBillWithProducts: (billId, billWithProducts) =>
    billCache.set(`bill-products:${billId}`, billWithProducts),
  deleteBillWithProducts: (billId) => billCache.delete(`bill-products:${billId}`),

  // Bulk operations
  getBulk: (billIds) => {
    const results = {};
    for (const id of billIds) {
      const cached = billCache.get(`bill:${id}`);
      if (cached) {
        results[id] = cached;
      }
    }
    return results;
  },

  setBulk: (bills) => {
    for (const bill of bills) {
      billCache.set(`bill:${bill.id}`, bill);
    }
  }
};

// Product caching utilities
export const productCacheUtils = {
  get: (productId) => productCache.get(`product:${productId}`),
  set: (productId, product) => productCache.set(`product:${productId}`, product),
  delete: (productId) => productCache.delete(`product:${productId}`),
  clear: () => productCache.clear(),

  // Cache products by bill
  getByBill: (billId) => productCache.get(`products-by-bill:${billId}`),
  setByBill: (billId, products) => productCache.set(`products-by-bill:${billId}`, products),
  deleteByBill: (billId) => productCache.delete(`products-by-bill:${billId}`),

  // Bulk operations
  getBulk: (productIds) => {
    const results = {};
    for (const id of productIds) {
      const cached = productCache.get(`product:${id}`);
      if (cached) {
        results[id] = cached;
      }
    }
    return results;
  },

  setBulk: (products) => {
    for (const product of products) {
      productCache.set(`product:${product.id}`, product);
    }
  }
};

// Analytics caching utilities
export const analyticsCacheUtils = {
  get: (key) => analyticsCache.get(key),
  set: (key, data) => analyticsCache.set(key, data),
  delete: (key) => analyticsCache.delete(key),
  clear: () => analyticsCache.clear(),

  // Specific analytics caches
  getBillAnalytics: () => analyticsCache.get('bill-analytics'),
  setBillAnalytics: (data) => analyticsCache.set('bill-analytics', data),

  getVendorAnalytics: () => analyticsCache.get('vendor-analytics'),
  setVendorAnalytics: (data) => analyticsCache.set('vendor-analytics', data),

  getCategoryAnalytics: () => analyticsCache.get('category-analytics'),
  setCategoryAnalytics: (data) => analyticsCache.set('category-analytics', data)
};

// Query result caching utilities
export const queryCacheUtils = {
  get: (queryKey) => queryCache.get(queryKey),
  set: (queryKey, results) => queryCache.set(queryKey, results),
  delete: (queryKey) => queryCache.delete(queryKey),
  clear: () => queryCache.clear(),

  // Generate query keys for common operations
  generateBillsQueryKey: (filters, sort, pagination) => {
    return generateCacheKey('bills-query', filters, sort, pagination);
  },

  generateProductsQueryKey: (filters, sort, pagination) => {
    return generateCacheKey('products-query', filters, sort, pagination);
  },

  generateSearchKey: (searchTerm, type, filters) => {
    return generateCacheKey('search', searchTerm, type, filters);
  }
};

// Cache invalidation utilities
export const cacheInvalidationUtils = {
  // Invalidate all caches related to a bill
  invalidateBill: (billId) => {
    billCacheUtils.delete(billId);
    billCacheUtils.deleteBillWithProducts(billId);
    productCacheUtils.deleteByBill(billId);

    // Clear analytics cache as bill data changed
    analyticsCacheUtils.clear();

    // Clear query cache as results may have changed
    queryCacheUtils.clear();
  },

  // Invalidate all caches related to a product
  invalidateProduct: (productId, billId) => {
    productCacheUtils.delete(productId);

    if (billId) {
      productCacheUtils.deleteByBill(billId);
      billCacheUtils.deleteBillWithProducts(billId);

      // Recalculate bill totals cache
      billCacheUtils.delete(billId);
    }

    // Clear analytics and query caches
    analyticsCacheUtils.clear();
    queryCacheUtils.clear();
  },

  // Invalidate all caches (nuclear option)
  invalidateAll: () => {
    billCacheUtils.clear();
    productCacheUtils.clear();
    analyticsCacheUtils.clear();
    queryCacheUtils.clear();
  },

  // Selective invalidation based on operation type
  invalidateByOperation: (operation, entityType, entityId, relatedIds = []) => {
    switch (operation) {
      case 'create':
        if (entityType === 'bill') {
          analyticsCacheUtils.clear();
          queryCacheUtils.clear();
        } else if (entityType === 'product') {
          if (relatedIds.billId) {
            billCacheUtils.delete(relatedIds.billId);
            billCacheUtils.deleteBillWithProducts(relatedIds.billId);
            productCacheUtils.deleteByBill(relatedIds.billId);
          }
          analyticsCacheUtils.clear();
          queryCacheUtils.clear();
        }
        break;

      case 'update':
        if (entityType === 'bill') {
          billCacheUtils.delete(entityId);
          billCacheUtils.deleteBillWithProducts(entityId);
          analyticsCacheUtils.clear();
          queryCacheUtils.clear();
        } else if (entityType === 'product') {
          productCacheUtils.delete(entityId);
          if (relatedIds.oldBillId) {
            billCacheUtils.delete(relatedIds.oldBillId);
            billCacheUtils.deleteBillWithProducts(relatedIds.oldBillId);
            productCacheUtils.deleteByBill(relatedIds.oldBillId);
          }
          if (relatedIds.newBillId && relatedIds.newBillId !== relatedIds.oldBillId) {
            billCacheUtils.delete(relatedIds.newBillId);
            billCacheUtils.deleteBillWithProducts(relatedIds.newBillId);
            productCacheUtils.deleteByBill(relatedIds.newBillId);
          }
          analyticsCacheUtils.clear();
          queryCacheUtils.clear();
        }
        break;

      case 'delete':
        if (entityType === 'bill') {
          billCacheUtils.delete(entityId);
          billCacheUtils.deleteBillWithProducts(entityId);
          productCacheUtils.deleteByBill(entityId);
          analyticsCacheUtils.clear();
          queryCacheUtils.clear();
        } else if (entityType === 'product') {
          productCacheUtils.delete(entityId);
          if (relatedIds.billId) {
            billCacheUtils.delete(relatedIds.billId);
            billCacheUtils.deleteBillWithProducts(relatedIds.billId);
            productCacheUtils.deleteByBill(relatedIds.billId);
          }
          analyticsCacheUtils.clear();
          queryCacheUtils.clear();
        }
        break;

      default:
        // Unknown operation - no cache invalidation needed
        break;
    }
  }
};

// Cache warming utilities
export const cacheWarmingUtils = {
  // Pre-load frequently accessed bills
  warmBillCache: async (billIds, getBillFunction) => {
    const uncachedIds = billIds.filter(id => !billCacheUtils.get(id));

    if (uncachedIds.length > 0) {
      try {
        const bills = await Promise.all(
          uncachedIds.map(id => getBillFunction(id))
        );

        bills.forEach((bill, index) => {
          if (bill) {
            billCacheUtils.set(uncachedIds[index], bill);
          }
        });
      } catch (error) {
        console.warn('Failed to warm bill cache:', error);
      }
    }
  },

  // Pre-load frequently accessed products
  warmProductCache: async (productIds, getProductFunction) => {
    const uncachedIds = productIds.filter(id => !productCacheUtils.get(id));

    if (uncachedIds.length > 0) {
      try {
        const products = await Promise.all(
          uncachedIds.map(id => getProductFunction(id))
        );

        products.forEach((product, index) => {
          if (product) {
            productCacheUtils.set(uncachedIds[index], product);
          }
        });
      } catch (error) {
        console.warn('Failed to warm product cache:', error);
      }
    }
  }
};

// Cache statistics and monitoring
export const cacheStatsUtils = {
  getBillCacheStats: () => ({
    size: billCache.size(),
    maxSize: billCache.maxSize,
    hitRate: billCache.hitCount / (billCache.hitCount + billCache.missCount) || 0,
    keys: billCache.keys()
  }),

  getProductCacheStats: () => ({
    size: productCache.size(),
    maxSize: productCache.maxSize,
    hitRate: productCache.hitCount / (productCache.hitCount + productCache.missCount) || 0,
    keys: productCache.keys()
  }),

  getAnalyticsCacheStats: () => ({
    size: analyticsCache.size(),
    ttl: analyticsCache.ttl,
    keys: Array.from(analyticsCache.cache.keys())
  }),

  getQueryCacheStats: () => ({
    size: queryCache.size(),
    ttl: queryCache.ttl,
    keys: Array.from(queryCache.cache.keys())
  }),

  getAllStats: () => ({
    bill: cacheStatsUtils.getBillCacheStats(),
    product: cacheStatsUtils.getProductCacheStats(),
    analytics: cacheStatsUtils.getAnalyticsCacheStats(),
    query: cacheStatsUtils.getQueryCacheStats()
  })
};

// Cleanup utilities
export const cacheCleanupUtils = {
  // Clean up expired entries
  cleanup: () => {
    analyticsCache.cleanup();
    queryCache.cleanup();
  },

  // Schedule periodic cleanup
  scheduleCleanup: (intervalMs = 5 * 60 * 1000) => { // 5 minutes
    return setInterval(() => {
      cacheCleanupUtils.cleanup();
    }, intervalMs);
  }
};

export {
  LRUCache,
  TimedCache,
  billCache,
  productCache,
  analyticsCache,
  queryCache
};