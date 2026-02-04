import {
  subscribeToBills,
  subscribeToBillWithProducts,
  optimisticUpdateBill,
  resolveConflicts
} from './billService';

import {
  subscribeToShopProducts,
  subscribeToProductsByBill,
  optimisticUpdateProduct
} from './shopProductService';

/**
 * Real-time synchronization manager for bill-product relationships
 * Handles complex scenarios like concurrent updates, optimistic UI updates,
 * and conflict resolution
 */
class RealtimeSyncManager {
  constructor() {
    this.subscriptions = new Map();
    this.optimisticUpdates = new Map();
    this.conflictQueue = [];
    this.syncCallbacks = new Map();
  }

  /**
   * Subscribe to bills with enhanced real-time features
   */
  subscribeToBillsSync(callback, options = {}) {
    const subscriptionId = `bills_${Date.now()}`;

    const unsubscribe = subscribeToBills((bills, metadata) => {
      // Handle optimistic updates and conflicts
      const processedBills = this.processBillsUpdate(bills, metadata);

      // Store callback for conflict resolution
      this.syncCallbacks.set(subscriptionId, callback);

      callback(processedBills, metadata);
    }, {
      onError: options.onError
    });

    this.subscriptions.set(subscriptionId, unsubscribe);
    return () => this.unsubscribe(subscriptionId);
  }

  /**
   * Subscribe to products with enhanced real-time features
   */
  subscribeToProductsSync(callback, options = {}) {
    const subscriptionId = `products_${Date.now()}`;

    const unsubscribe = subscribeToShopProducts((products, metadata) => {
      // Handle optimistic updates and conflicts
      const processedProducts = this.processProductsUpdate(products, metadata);

      // Store callback for conflict resolution
      this.syncCallbacks.set(subscriptionId, callback);

      callback(processedProducts, metadata);
    }, {
      onError: options.onError
    });

    this.subscriptions.set(subscriptionId, unsubscribe);
    return () => this.unsubscribe(subscriptionId);
  }

  /**
   * Subscribe to a specific bill with its products
   */
  subscribeToBillWithProductsSync(billId, callback, options = {}) {
    const subscriptionId = `bill_products_${billId}_${Date.now()}`;

    const unsubscribe = subscribeToBillWithProducts(billId, (billWithProducts, metadata) => {
      // Process the combined bill-products data
      const processedData = this.processBillWithProductsUpdate(billWithProducts, metadata);

      this.syncCallbacks.set(subscriptionId, callback);
      callback(processedData, metadata);
    }, {
      onError: options.onError
    });

    this.subscriptions.set(subscriptionId, unsubscribe);
    return () => this.unsubscribe(subscriptionId);
  }

  /**
   * Subscribe to products by bill ID with real-time totals calculation
   */
  subscribeToProductsByBillSync(billId, callback, options = {}) {
    const subscriptionId = `bill_products_${billId}_${Date.now()}`;

    const unsubscribe = subscribeToProductsByBill(billId, (products, metadata) => {
      // Calculate real-time totals
      const totals = this.calculateRealtimeTotals(products);

      const processedProducts = this.processProductsUpdate(products, metadata);

      this.syncCallbacks.set(subscriptionId, callback);
      callback(processedProducts, { ...metadata, totals });
    }, {
      onError: options.onError
    });

    this.subscriptions.set(subscriptionId, unsubscribe);
    return () => this.unsubscribe(subscriptionId);
  }

  /**
   * Process bills update with conflict resolution
   */
  processBillsUpdate(bills, metadata) {
    if (metadata.optimistic) {
      return bills; // Already processed optimistically
    }

    // Check for conflicts with optimistic updates
    const processedBills = bills.map(serverBill => {
      const optimisticKey = `bill_${serverBill.id}`;
      const optimisticUpdate = this.optimisticUpdates.get(optimisticKey);

      if (optimisticUpdate && !serverBill._metadata?.optimistic) {
        // Potential conflict - resolve it
        const resolution = resolveConflicts(optimisticUpdate, serverBill);

        if (resolution.conflict) {
          this.handleConflict(resolution);
        }

        // Clean up optimistic update
        this.optimisticUpdates.delete(optimisticKey);

        return resolution.resolved;
      }

      return serverBill;
    });

    return processedBills;
  }

  /**
   * Process products update with conflict resolution
   */
  processProductsUpdate(products, metadata) {
    if (metadata.optimistic) {
      return products; // Already processed optimistically
    }

    // Check for conflicts with optimistic updates
    const processedProducts = products.map(serverProduct => {
      const optimisticKey = `product_${serverProduct.id}`;
      const optimisticUpdate = this.optimisticUpdates.get(optimisticKey);

      if (optimisticUpdate && !serverProduct._metadata?.optimistic) {
        // Potential conflict - resolve it
        const resolution = this.resolveProductConflict(optimisticUpdate, serverProduct);

        if (resolution.conflict) {
          this.handleConflict(resolution);
        }

        // Clean up optimistic update
        this.optimisticUpdates.delete(optimisticKey);

        return resolution.resolved;
      }

      return serverProduct;
    });

    return processedProducts;
  }

  /**
   * Process bill with products update
   */
  processBillWithProductsUpdate(billWithProducts, metadata) {
    if (!billWithProducts) return null;

    // Process bill data
    const processedBill = this.processBillsUpdate([billWithProducts], metadata)[0];

    // Process products data
    const processedProducts = this.processProductsUpdate(billWithProducts.products || [], metadata);

    return {
      ...processedBill,
      products: processedProducts
    };
  }

  /**
   * Calculate real-time totals from products
   */
  calculateRealtimeTotals(products) {
    return products.reduce((totals, product) => {
      const quantity = parseFloat(product.totalQuantity) || 0;
      const amount = parseFloat(product.totalAmount) || 0;
      const profit = parseFloat(product.profitPerPiece) || 0;

      return {
        totalQuantity: totals.totalQuantity + quantity,
        totalAmount: totals.totalAmount + amount,
        totalProfit: totals.totalProfit + (profit * quantity),
        productCount: totals.productCount + 1
      };
    }, {
      totalQuantity: 0,
      totalAmount: 0,
      totalProfit: 0,
      productCount: 0
    });
  }

  /**
   * Resolve product conflicts (similar to bill conflicts)
   */
  resolveProductConflict(localProduct, serverProduct) {
    try {
      const localTimestamp = localProduct.updatedAt instanceof Date ?
        localProduct.updatedAt : new Date(localProduct.updatedAt);
      const serverTimestamp = serverProduct.updatedAt instanceof Date ?
        serverProduct.updatedAt : new Date(serverProduct.updatedAt);

      if (localTimestamp > serverTimestamp) {
        return {
          resolved: localProduct,
          conflict: true,
          resolution: 'local-wins',
          message: 'Your local product changes were kept as they are more recent.'
        };
      } else {
        return {
          resolved: serverProduct,
          conflict: true,
          resolution: 'server-wins',
          message: 'Server product changes were applied as they are more recent.'
        };
      }
    } catch (error) {
      console.error('Error resolving product conflicts: ', error);
      return {
        resolved: serverProduct,
        conflict: true,
        resolution: 'server-wins-error',
        message: 'Server product changes were applied due to conflict resolution error.'
      };
    }
  }

  /**
   * Handle conflicts by notifying user
   */
  handleConflict(resolution) {
    console.warn('Conflict resolved:', resolution);

    // Add to conflict queue for user notification
    this.conflictQueue.push({
      timestamp: new Date(),
      resolution,
      acknowledged: false
    });

    // Emit conflict event for UI to handle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('realtimeConflict', {
        detail: resolution
      }));
    }
  }

  /**
   * Apply optimistic update for bills
   */
  applyOptimisticBillUpdate(billId, updateData, currentBills, callback) {
    const optimisticKey = `bill_${billId}`;

    // Store optimistic update for conflict resolution
    this.optimisticUpdates.set(optimisticKey, {
      id: billId,
      ...updateData,
      updatedAt: new Date(),
      _optimistic: true
    });

    return optimisticUpdateBill(billId, updateData, currentBills, callback);
  }

  /**
   * Apply optimistic update for products
   */
  applyOptimisticProductUpdate(productId, updateData, currentProducts, callback) {
    const optimisticKey = `product_${productId}`;

    // Store optimistic update for conflict resolution
    this.optimisticUpdates.set(optimisticKey, {
      id: productId,
      ...updateData,
      updatedAt: new Date(),
      _optimistic: true
    });

    return optimisticUpdateProduct(productId, updateData, currentProducts, callback);
  }

  /**
   * Get pending conflicts for user review
   */
  getPendingConflicts() {
    return this.conflictQueue.filter(conflict => !conflict.acknowledged);
  }

  /**
   * Acknowledge a conflict
   */
  acknowledgeConflict(conflictIndex) {
    if (this.conflictQueue[conflictIndex]) {
      this.conflictQueue[conflictIndex].acknowledged = true;
    }
  }

  /**
   * Clear acknowledged conflicts
   */
  clearAcknowledgedConflicts() {
    this.conflictQueue = this.conflictQueue.filter(conflict => !conflict.acknowledged);
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscriptionId) {
    const unsubscribe = this.subscriptions.get(subscriptionId);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(subscriptionId);
      this.syncCallbacks.delete(subscriptionId);
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll() {
    this.subscriptions.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.subscriptions.clear();
    this.syncCallbacks.clear();
    this.optimisticUpdates.clear();
  }

  /**
   * Get connection status and sync health
   */
  getSyncStatus() {
    return {
      activeSubscriptions: this.subscriptions.size,
      pendingOptimisticUpdates: this.optimisticUpdates.size,
      pendingConflicts: this.getPendingConflicts().length,
      totalConflicts: this.conflictQueue.length
    };
  }
}

// Create singleton instance
const realtimeSyncManager = new RealtimeSyncManager();

export default realtimeSyncManager;

// Export individual functions for convenience
export const {
  subscribeToBillsSync,
  subscribeToProductsSync,
  subscribeToBillWithProductsSync,
  subscribeToProductsByBillSync,
  applyOptimisticBillUpdate,
  applyOptimisticProductUpdate,
  getPendingConflicts,
  acknowledgeConflict,
  clearAcknowledgedConflicts,
  getSyncStatus
} = realtimeSyncManager;