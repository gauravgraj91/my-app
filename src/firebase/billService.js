import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  limit as fbLimit,
  startAfter,
  getDoc,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from './config';

import { BillModel } from './billModel';
import { exportMultipleBillsToCSV } from './billExport';

// Re-export from extracted modules for backwards compatibility
export { BillModel } from './billModel';
export { getBillAnalytics } from './billAnalytics';
export { exportBillToCSV, exportMultipleBillsToCSV } from './billExport';

const COLLECTION_NAME = 'bills';

// Core CRUD operations
export const addBill = async (billData, tenantId) => {
  try {
    // Validate bill data
    const validationErrors = BillModel.validate(billData);
    if (validationErrors) {
      throw new Error(`Validation failed: ${JSON.stringify(validationErrors)}`);
    }

    // Check if bill number already exists
    const existingBill = await getBillByNumber(billData.billNumber, tenantId);
    if (existingBill) {
      throw new Error(`Bill number ${billData.billNumber} already exists`);
    }

    const billToAdd = { ...BillModel.createBillData(billData), tenantId };
    const docRef = await addDoc(collection(db, COLLECTION_NAME), billToAdd);

    return {
      id: docRef.id,
      ...billToAdd
    };
  } catch (error) {
    console.error('Error adding bill: ', error);
    throw error;
  }
};

// Get all bills
export const getBills = async (tenantId) => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId), orderBy('date', 'desc'))
    );
    const bills = [];
    querySnapshot.forEach((doc) => {
      bills.push({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || doc.data().date
      });
    });
    return bills;
  } catch (error) {
    console.error('Error getting bills: ', error);
    throw error;
  }
};

// Get a single bill by ID
export const getBill = async (billId) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, billId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        date: docSnap.data().date?.toDate?.() || docSnap.data().date
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting bill: ', error);
    throw error;
  }
};

// Get bill by bill number
export const getBillByNumber = async (billNumber, tenantId) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('billNumber', '==', billNumber),
      where('tenantId', '==', tenantId)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || doc.data().date
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting bill by number: ', error);
    throw error;
  }
};

// Update a bill
export const updateBill = async (billId, updateData) => {
  try {
    // Load current bill to support partial updates
    const existing = await getBill(billId);
    if (!existing) {
      throw new Error('Bill not found');
    }

    // Validate against merged object to allow partial updates
    const mergedForValidation = { ...existing, ...updateData };
    const validationErrors = BillModel.validate(mergedForValidation);
    if (validationErrors) {
      throw new Error(`Validation failed: ${JSON.stringify(validationErrors)}`);
    }

    // Only check duplicate if billNumber is actually changing
    if (
      Object.prototype.hasOwnProperty.call(updateData, 'billNumber') &&
      updateData.billNumber !== existing.billNumber
    ) {
      const duplicate = await getBillByNumber(updateData.billNumber);
      if (duplicate && duplicate.id !== billId) {
        throw new Error(`Bill number ${updateData.billNumber} already exists`);
      }
    }

    // Strip out products array - products are stored in separate shopProducts collection
    const { products: _products, ...cleanUpdateData } = updateData;

    const billRef = doc(db, COLLECTION_NAME, billId);
    await updateDoc(billRef, {
      ...cleanUpdateData,
      updatedAt: serverTimestamp()
    });

    return await getBill(billId);
  } catch (error) {
    console.error('Error updating bill: ', error);
    throw error;
  }
};

// Delete a bill
export const deleteBill = async (billId) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, billId));
  } catch (error) {
    console.error('Error deleting bill: ', error);
    throw error;
  }
};

// Real-time listener for bills with enhanced error handling and metadata
export const subscribeToBills = (tenantId, callback, options = {}) => {
  const q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId), orderBy('date', 'desc'));

  return onSnapshot(q, (querySnapshot) => {
    const bills = [];
    const changes = [];

    querySnapshot.docChanges().forEach((change) => {
      const billData = {
        id: change.doc.id,
        ...change.doc.data(),
        date: change.doc.data().date?.toDate?.() || change.doc.data().date
      };

      changes.push({
        type: change.type, // 'added', 'modified', 'removed'
        bill: billData,
        oldIndex: change.oldIndex,
        newIndex: change.newIndex
      });
    });

    querySnapshot.forEach((doc) => {
      bills.push({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || doc.data().date,
        _metadata: {
          hasPendingWrites: doc.metadata.hasPendingWrites,
          fromCache: doc.metadata.fromCache
        }
      });
    });

    callback(bills, {
      changes,
      metadata: {
        hasPendingWrites: querySnapshot.metadata.hasPendingWrites,
        fromCache: querySnapshot.metadata.fromCache
      }
    });
  }, (error) => {
    console.error('Error in bills subscription: ', error);
    if (options.onError) {
      options.onError(error);
    } else {
      callback([], { changes: [], metadata: { error: error.message } });
    }
  });
};

// Real-time listener for a specific bill with its products
export const subscribeToBillWithProducts = (billId, callback, options = {}) => {
  if (!billId) {
    throw new Error('Bill ID is required for subscription');
  }

  const billRef = doc(db, COLLECTION_NAME, billId);

  return onSnapshot(billRef, async (billDoc) => {
    try {
      if (!billDoc.exists()) {
        callback(null, { metadata: { exists: false } });
        return;
      }

      const billData = {
        id: billDoc.id,
        ...billDoc.data(),
        date: billDoc.data().date?.toDate?.() || billDoc.data().date,
        _metadata: {
          hasPendingWrites: billDoc.metadata.hasPendingWrites,
          fromCache: billDoc.metadata.fromCache
        }
      };

      // Get products for this bill
      const { getProductsByBill } = await import('./shopProductService');
      const products = await getProductsByBill(billId);

      callback({
        ...billData,
        products
      }, {
        metadata: {
          hasPendingWrites: billDoc.metadata.hasPendingWrites,
          fromCache: billDoc.metadata.fromCache
        }
      });
    } catch (error) {
      console.error('Error in bill with products subscription: ', error);
      if (options.onError) {
        options.onError(error);
      } else {
        callback(null, { metadata: { error: error.message } });
      }
    }
  }, (error) => {
    console.error('Error in bill subscription: ', error);
    if (options.onError) {
      options.onError(error);
    } else {
      callback(null, { metadata: { error: error.message } });
    }
  });
};

// Enhanced paginated fetch with caching and performance optimizations
export const fetchBillsPaginated = async (tenantId, options = {}) => {
  const {
    pageLimit = 20,
    startAfterDoc = null,
    orderByField = 'date',
    orderDirection = 'desc',
    filters = {},
    useCache = true,
    cacheKey = null
  } = options;

  try {
    // Generate cache key if not provided
    const generatedCacheKey = cacheKey ||
      `bills-paginated:${pageLimit}:${orderByField}:${orderDirection}:${JSON.stringify(filters)}:${startAfterDoc?.id || 'start'}`;

    // Check cache first
    if (useCache) {
      const { queryCacheUtils } = await import('../utils/cacheUtils');
      const cached = queryCacheUtils.get(generatedCacheKey);
      if (cached) {
        return cached;
      }
    }

    // Build query
    let q = query(
      collection(db, COLLECTION_NAME),
      where('tenantId', '==', tenantId),
      orderBy(orderByField, orderDirection),
      fbLimit(pageLimit)
    );

    // Apply filters
    if (filters.vendor) {
      q = query(q, where('vendor', '==', filters.vendor));
    }
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      if (!isNaN(startDate)) {
        q = query(q, where('date', '>=', startDate));
      }
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      if (!isNaN(endDate)) {
        q = query(q, where('date', '<=', endDate));
      }
    }

    // Add pagination
    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }

    const querySnapshot = await getDocs(q);
    const bills = [];
    let lastDoc = null;

    querySnapshot.forEach((doc) => {
      const billData = {
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || doc.data().date
      };
      bills.push(billData);
      lastDoc = doc;
    });

    const result = {
      bills,
      lastDoc,
      hasMore: querySnapshot.size === pageLimit,
      totalFetched: querySnapshot.size,
      cacheKey: generatedCacheKey
    };

    // Cache the result
    if (useCache) {
      const { queryCacheUtils } = await import('../utils/cacheUtils');
      queryCacheUtils.set(generatedCacheKey, result);
    }

    return result;
  } catch (error) {
    console.error('Error fetching bills paginated: ', error);
    throw error;
  }
};

// Enhanced infinite scroll fetch
export const fetchBillsInfinite = async (tenantId, options = {}) => {
  const {
    pageSize = 20,
    cursor = null,
    direction = 'forward', // 'forward' or 'backward'
    orderByField = 'date',
    orderDirection = 'desc',
    filters = {},
    useCache = true
  } = options;

  try {
    const cacheKey = `bills-infinite:${pageSize}:${orderByField}:${orderDirection}:${JSON.stringify(filters)}:${cursor || 'start'}:${direction}`;

    // Check cache
    if (useCache) {
      const { queryCacheUtils } = await import('../utils/cacheUtils');
      const cached = queryCacheUtils.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let q = query(
      collection(db, COLLECTION_NAME),
      where('tenantId', '==', tenantId),
      orderBy(orderByField, orderDirection),
      fbLimit(pageSize + 1) // Fetch one extra to check if there are more
    );

    // Apply filters (same as above)
    if (filters.vendor) {
      q = query(q, where('vendor', '==', filters.vendor));
    }
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      if (!isNaN(startDate)) {
        q = query(q, where('date', '>=', startDate));
      }
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      if (!isNaN(endDate)) {
        q = query(q, where('date', '<=', endDate));
      }
    }

    // Apply cursor
    if (cursor) {
      if (direction === 'forward') {
        q = query(q, startAfter(cursor));
      } else {
        // For backward pagination, we need to reverse the order and use startAfter
        const reverseDirection = orderDirection === 'desc' ? 'asc' : 'desc';
        q = query(
          collection(db, COLLECTION_NAME),
          where('tenantId', '==', tenantId),
          orderBy(orderByField, reverseDirection),
          startAfter(cursor),
          fbLimit(pageSize + 1)
        );
      }
    }

    const querySnapshot = await getDocs(q);
    let bills = [];

    querySnapshot.forEach((doc) => {
      bills.push({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || doc.data().date,
        _doc: doc // Store document reference for cursor
      });
    });

    // If we fetched backward, reverse the results
    if (direction === 'backward') {
      bills.reverse();
    }

    // Check if there are more items
    const hasMore = bills.length > pageSize;
    if (hasMore) {
      bills.pop(); // Remove the extra item
    }

    const result = {
      bills,
      hasMore,
      nextCursor: bills.length > 0 ? bills[bills.length - 1]._doc : null,
      prevCursor: bills.length > 0 ? bills[0]._doc : null,
      direction,
      cacheKey
    };

    // Cache the result
    if (useCache) {
      const { queryCacheUtils } = await import('../utils/cacheUtils');
      queryCacheUtils.set(cacheKey, result);
    }

    return result;
  } catch (error) {
    console.error('Error fetching bills infinite: ', error);
    throw error;
  }
};

// Bill-product relationship operations
export const getBillWithProducts = async (billId) => {
  try {
    const bill = await getBill(billId);
    if (!bill) {
      return null;
    }

    // Get products associated with this bill
    const { getProductsByBill } = await import('./shopProductService');
    const products = await getProductsByBill(billId);

    return {
      ...bill,
      products
    };
  } catch (error) {
    console.error('Error getting bill with products: ', error);
    throw error;
  }
};

export const addProductToBill = async (billId, productData) => {
  try {
    const bill = await getBill(billId);
    if (!bill) {
      throw new Error('Bill not found');
    }

    // Add product with bill reference
    const { addShopProduct } = await import('./shopProductService');
    const product = await addShopProduct({
      ...productData,
      billId: billId,
      billNumber: bill.billNumber
    });

    // Update bill totals
    await recalculateBillTotals(billId);

    return product;
  } catch (error) {
    console.error('Error adding product to bill: ', error);
    throw error;
  }
};

export const removeProductFromBill = async (billId, productId) => {
  try {
    const { deleteShopProduct } = await import('./shopProductService');
    await deleteShopProduct(productId);

    // Update bill totals
    await recalculateBillTotals(billId);
  } catch (error) {
    console.error('Error removing product from bill: ', error);
    throw error;
  }
};

export const moveProductToBill = async (productId, newBillId) => {
  try {
    const newBill = await getBill(newBillId);
    if (!newBill) {
      throw new Error('Target bill not found');
    }

    const { updateShopProduct, getShopProduct } = await import('./shopProductService');
    const product = await getShopProduct(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    const oldBillId = product.billId;

    // Update product with new bill reference
    await updateShopProduct(productId, {
      billId: newBillId,
      billNumber: newBill.billNumber
    });

    // Recalculate totals for both bills
    if (oldBillId) {
      await recalculateBillTotals(oldBillId);
    }
    await recalculateBillTotals(newBillId);

  } catch (error) {
    console.error('Error moving product to bill: ', error);
    throw error;
  }
};

// Utility function to recalculate bill totals
export const recalculateBillTotals = async (billId) => {
  try {
    const { getProductsByBill, updateShopProduct } = await import('./shopProductService');
    const products = await getProductsByBill(billId);
    const totals = BillModel.calculateTotals(products);

    // Read existing charge fields from the bill
    const billDoc = await getDoc(doc(db, COLLECTION_NAME, billId));
    const billData = billDoc.exists() ? billDoc.data() : {};
    const extraCharges = BillModel.computeExtraCharges(totals.totalAmount, {
      discountPercent: billData.discountPercent,
      surchargePercent: billData.surchargePercent,
      transportCost: billData.transportCost,
    });

    // Distribute charges to products if any net adjustment exists
    const netAdjustment = -extraCharges.discountAmount + extraCharges.surchargeAmount + extraCharges.transportCost;
    if (netAdjustment !== 0 && products.length > 0) {
      const updatedProducts = BillModel.distributeChargesToProducts(products, netAdjustment, totals.totalAmount);
      for (const p of updatedProducts) {
        if (p.id) {
          await updateShopProduct(p.id, {
            costPerUnit: p.costPerUnit,
            pricePerPiece: p.pricePerPiece,
            profitPerPiece: p.profitPerPiece,
            totalProfit: p.totalProfit,
          });
        }
      }
    }

    await updateDoc(doc(db, COLLECTION_NAME, billId), {
      ...totals,
      ...extraCharges,
      updatedAt: serverTimestamp()
    });

    return { ...totals, ...extraCharges };
  } catch (error) {
    console.error('Error recalculating bill totals: ', error);
    throw error;
  }
};

// Optimistic update functions for better UX
export const optimisticUpdateBill = (billId, updateData, currentBills, callback) => {
  try {
    // Create optimistic update
    const optimisticBills = currentBills.map(bill => {
      if (bill.id === billId) {
        return {
          ...bill,
          ...updateData,
          updatedAt: new Date(),
          _metadata: {
            ...bill._metadata,
            hasPendingWrites: true,
            optimistic: true
          }
        };
      }
      return bill;
    });

    // Immediately update UI
    callback(optimisticBills, {
      metadata: { optimistic: true },
      changes: [{
        type: 'modified',
        bill: optimisticBills.find(b => b.id === billId),
        optimistic: true
      }]
    });

    return optimisticBills;
  } catch (error) {
    console.error('Error in optimistic update: ', error);
    return currentBills;
  }
};

export const optimisticAddBill = (billData, currentBills, callback) => {
  try {
    const tempId = `temp_${Date.now()}`;
    const optimisticBill = {
      id: tempId,
      ...BillModel.createBillData(billData),
      _metadata: {
        hasPendingWrites: true,
        optimistic: true,
        tempId: true
      }
    };

    const optimisticBills = [optimisticBill, ...currentBills];

    // Immediately update UI
    callback(optimisticBills, {
      metadata: { optimistic: true },
      changes: [{
        type: 'added',
        bill: optimisticBill,
        optimistic: true,
        newIndex: 0
      }]
    });

    return { optimisticBills, tempId };
  } catch (error) {
    console.error('Error in optimistic add: ', error);
    return { optimisticBills: currentBills, tempId: null };
  }
};

export const optimisticDeleteBill = (billId, currentBills, callback) => {
  try {
    const billToDelete = currentBills.find(b => b.id === billId);
    if (!billToDelete) return currentBills;

    const optimisticBills = currentBills.filter(bill => bill.id !== billId);

    // Immediately update UI
    callback(optimisticBills, {
      metadata: { optimistic: true },
      changes: [{
        type: 'removed',
        bill: billToDelete,
        optimistic: true
      }]
    });

    return optimisticBills;
  } catch (error) {
    console.error('Error in optimistic delete: ', error);
    return currentBills;
  }
};

// Conflict resolution for concurrent updates
export const resolveConflicts = async (localBill, serverBill) => {
  try {
    // Simple last-write-wins strategy with user notification
    const localTimestamp = localBill.updatedAt instanceof Date ?
      localBill.updatedAt : new Date(localBill.updatedAt);
    const serverTimestamp = serverBill.updatedAt instanceof Date ?
      serverBill.updatedAt : new Date(serverBill.updatedAt);

    if (localTimestamp > serverTimestamp) {
      // Local changes are newer, keep them but warn user
      console.warn('Conflict detected: Local changes are newer than server', {
        localBill: localBill.billNumber,
        localTime: localTimestamp,
        serverTime: serverTimestamp
      });

      return {
        resolved: localBill,
        conflict: true,
        resolution: 'local-wins',
        message: 'Your local changes were kept as they are more recent.'
      };
    } else {
      // Server changes are newer, use them
      console.warn('Conflict detected: Server changes are newer than local', {
        localBill: localBill.billNumber,
        localTime: localTimestamp,
        serverTime: serverTimestamp
      });

      return {
        resolved: serverBill,
        conflict: true,
        resolution: 'server-wins',
        message: 'Server changes were applied as they are more recent.'
      };
    }
  } catch (error) {
    console.error('Error resolving conflicts: ', error);
    // Default to server version on error
    return {
      resolved: serverBill,
      conflict: true,
      resolution: 'server-wins-error',
      message: 'Server changes were applied due to conflict resolution error.'
    };
  }
};

// Enhanced real-time bill totals calculation with debouncing
let recalculationTimeouts = new Map();

export const debouncedRecalculateBillTotals = (billId, delay = 1000) => {
  // Clear existing timeout for this bill
  if (recalculationTimeouts.has(billId)) {
    clearTimeout(recalculationTimeouts.get(billId));
  }

  // Set new timeout
  const timeoutId = setTimeout(async () => {
    try {
      await recalculateBillTotals(billId);
      recalculationTimeouts.delete(billId);
    } catch (error) {
      console.error(`Error in debounced recalculation for bill ${billId}:`, error);
      recalculationTimeouts.delete(billId);
    }
  }, delay);

  recalculationTimeouts.set(billId, timeoutId);
};

export const getBillsByVendor = async (vendor, tenantId) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('vendor', '==', vendor),
      where('tenantId', '==', tenantId),
      orderBy('date', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const bills = [];

    querySnapshot.forEach((doc) => {
      bills.push({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || doc.data().date
      });
    });

    return bills;
  } catch (error) {
    console.error('Error getting bills by vendor: ', error);
    throw error;
  }
};

export const getBillsByDateRange = async (startDate, endDate, tenantId) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      where('tenantId', '==', tenantId),
      orderBy('date', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const bills = [];

    querySnapshot.forEach((doc) => {
      bills.push({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || doc.data().date
      });
    });

    return bills;
  } catch (error) {
    console.error('Error getting bills by date range: ', error);
    throw error;
  }
};

// Bulk operations
export const duplicateBill = async (billId, tenantId) => {
  try {
    const billWithProducts = await getBillWithProducts(billId);
    if (!billWithProducts) {
      throw new Error('Bill not found');
    }

    // Generate new bill number
    const allBills = await getBills(tenantId);
    const newBillNumber = BillModel.generateBillNumber(allBills);

    // Create new bill
    const newBillData = {
      ...billWithProducts,
      billNumber: newBillNumber,
      date: new Date(),
      notes: `Duplicate of ${billWithProducts.billNumber}${billWithProducts.notes ? ` - ${billWithProducts.notes}` : ''}`
    };
    delete newBillData.id;
    delete newBillData.products;
    delete newBillData.createdAt;
    delete newBillData.updatedAt;

    const newBill = await addBill(newBillData, tenantId);

    // Duplicate all products
    const { addShopProduct } = await import('./shopProductService');
    for (const product of billWithProducts.products) {
      const newProductData = { ...product };
      delete newProductData.id;
      delete newProductData.createdAt;
      delete newProductData.updatedAt;
      newProductData.billId = newBill.id;
      newProductData.billNumber = newBill.billNumber;

      await addShopProduct(newProductData);
    }

    // Recalculate totals for the new bill
    await recalculateBillTotals(newBill.id);

    return await getBill(newBill.id);
  } catch (error) {
    console.error('Error duplicating bill: ', error);
    throw error;
  }
};

export const deleteBillWithProducts = async (billId) => {
  try {
    // Get all products in the bill using the service function that handles indexes correctly
    const { getProductsByBill } = await import('./shopProductService');
    const products = await getProductsByBill(billId);

    // Use batch operation for better performance
    const batch = writeBatch(db);

    // Delete all products
    products.forEach((product) => {
      const productRef = doc(db, 'shopProducts', product.id);
      batch.delete(productRef);
    });

    // Delete the bill
    const billRef = doc(db, COLLECTION_NAME, billId);
    batch.delete(billRef);

    await batch.commit();
  } catch (error) {
    console.error('Error deleting bill with products: ', error);
    throw error;
  }
};

// Bulk operations for multiple bills
export const bulkDeleteBills = async (billIds) => {
  try {
    if (!Array.isArray(billIds) || billIds.length === 0) {
      throw new Error('Bill IDs array is required and cannot be empty');
    }

    const results = [];

    for (const billId of billIds) {
      try {
        await deleteBillWithProducts(billId);
        results.push({ billId, success: true });
      } catch (error) {
        console.error(`Failed to delete bill ${billId}:`, error);
        results.push({ billId, success: false, error: error.message });
      }
    }

    return results;
  } catch (error) {
    console.error('Error bulk deleting bills: ', error);
    throw error;
  }
};

export const bulkDuplicateBills = async (billIds, tenantId) => {
  try {
    if (!Array.isArray(billIds) || billIds.length === 0) {
      throw new Error('Bill IDs array is required and cannot be empty');
    }

    const results = [];

    for (const billId of billIds) {
      try {
        const duplicatedBill = await duplicateBill(billId, tenantId);
        results.push({
          originalBillId: billId,
          newBillId: duplicatedBill.id,
          newBillNumber: duplicatedBill.billNumber,
          success: true
        });
      } catch (error) {
        console.error(`Failed to duplicate bill ${billId}:`, error);
        results.push({
          originalBillId: billId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error bulk duplicating bills: ', error);
    throw error;
  }
};

export const bulkUpdateBillStatus = async (billIds, status) => {
  try {
    if (!Array.isArray(billIds) || billIds.length === 0) {
      throw new Error('Bill IDs array is required and cannot be empty');
    }

    const validStatuses = ['active', 'archived', 'returned', 'paid'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status. Must be active, archived, returned, or paid');
    }

    const results = [];

    for (const billId of billIds) {
      try {
        await updateBill(billId, { status });
        results.push({ billId, success: true });
      } catch (error) {
        console.error(`Failed to update status for bill ${billId}:`, error);
        results.push({ billId, success: false, error: error.message });
      }
    }

    return results;
  } catch (error) {
    console.error('Error bulk updating bill status: ', error);
    throw error;
  }
};

export const bulkExportBillsToCSV = async (billIds) => {
  try {
    return await exportMultipleBillsToCSV(billIds);
  } catch (error) {
    console.error('Error bulk exporting bills to CSV: ', error);
    throw error;
  }
};

// Enhanced bill operations with transaction support
export const duplicateBillWithTransaction = async (billId, tenantId) => {
  try {
    return await runTransaction(db, async (transaction) => {
      // Get the original bill with products
      const billWithProducts = await getBillWithProducts(billId);
      if (!billWithProducts) {
        throw new Error('Bill not found');
      }

      // Generate new bill number
      const allBills = await getBills(tenantId);
      const newBillNumber = BillModel.generateBillNumber(allBills);

      // Create new bill data
      const newBillData = {
        ...billWithProducts,
        billNumber: newBillNumber,
        date: new Date(),
        notes: `Duplicate of ${billWithProducts.billNumber}${billWithProducts.notes ? ` - ${billWithProducts.notes}` : ''}`
      };
      delete newBillData.id;
      delete newBillData.products;
      delete newBillData.createdAt;
      delete newBillData.updatedAt;

      // Add new bill
      const newBillRef = doc(collection(db, COLLECTION_NAME));
      transaction.set(newBillRef, {
        ...BillModel.createBillData(newBillData),
        tenantId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Add all products to the new bill
      billWithProducts.products.forEach(product => {
        const newProductData = { ...product };
        delete newProductData.id;
        delete newProductData.createdAt;
        delete newProductData.updatedAt;
        newProductData.billId = newBillRef.id;
        newProductData.billNumber = newBillNumber;

        const newProductRef = doc(collection(db, 'shopProducts'));
        transaction.set(newProductRef, {
          ...newProductData,
          tenantId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      return {
        id: newBillRef.id,
        ...newBillData,
        billNumber: newBillNumber
      };
    });
  } catch (error) {
    console.error('Error duplicating bill with transaction: ', error);
    throw error;
  }
};

// Search and filtering utilities
export const searchBills = async (searchTerm, tenantId) => {
  try {
    const bills = await getBills(tenantId);
    const searchLower = searchTerm.toLowerCase();

    return bills.filter(bill =>
      bill.billNumber.toLowerCase().includes(searchLower) ||
      bill.vendor.toLowerCase().includes(searchLower) ||
      (bill.notes && bill.notes.toLowerCase().includes(searchLower))
    );
  } catch (error) {
    console.error('Error searching bills: ', error);
    throw error;
  }
};

// Enhanced search that includes products within bills
export const searchBillsAndProducts = async (searchTerm, tenantId) => {
  try {
    if (!searchTerm || searchTerm.trim() === '') {
      return await getBills(tenantId);
    }

    const bills = await getBills(tenantId);
    const searchLower = searchTerm.toLowerCase();
    const matchingBills = new Set();

    // First, find bills that match directly
    bills.forEach(bill => {
      if (
        bill.billNumber.toLowerCase().includes(searchLower) ||
        bill.vendor.toLowerCase().includes(searchLower) ||
        (bill.notes && bill.notes.toLowerCase().includes(searchLower))
      ) {
        matchingBills.add(bill.id);
      }
    });

    // Then, search within products and add their parent bills
    const { getShopProducts } = await import('./shopProductService');
    const allProducts = await getShopProducts();

    allProducts.forEach(product => {
      if (
        product.billId && // Only consider products that belong to bills
        (
          (product.productName && product.productName.toLowerCase().includes(searchLower)) ||
          (product.category && product.category.toLowerCase().includes(searchLower)) ||
          (product.vendor && product.vendor.toLowerCase().includes(searchLower))
        )
      ) {
        matchingBills.add(product.billId);
      }
    });

    // Return bills that match either directly or through their products
    return bills.filter(bill => matchingBills.has(bill.id));
  } catch (error) {
    console.error('Error searching bills and products: ', error);
    throw error;
  }
};

export const filterBills = async (filters, tenantId) => {
  try {
    let bills = await getBills(tenantId);

    // Filter by date range with enhanced date handling
    if (filters.startDate || filters.endDate) {
      bills = bills.filter(bill => {
        const billDate = bill.date instanceof Date ? bill.date : new Date(bill.date);

        if (filters.startDate) {
          const startDate = new Date(filters.startDate);
          startDate.setHours(0, 0, 0, 0); // Start of day
          if (billDate < startDate) return false;
        }

        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999); // End of day
          if (billDate > endDate) return false;
        }

        return true;
      });
    }

    // Enhanced vendor filtering with partial matching
    if (filters.vendor && filters.vendor.trim() !== '') {
      const vendorLower = filters.vendor.toLowerCase().trim();
      bills = bills.filter(bill =>
        bill.vendor && bill.vendor.toLowerCase().includes(vendorLower)
      );
    }

    // Enhanced amount range filtering with proper number handling
    if (filters.minAmount !== undefined && filters.minAmount !== '' && filters.minAmount !== null) {
      const minAmount = parseFloat(filters.minAmount);
      if (!isNaN(minAmount)) {
        bills = bills.filter(bill => (bill.totalAmount || 0) >= minAmount);
      }
    }

    if (filters.maxAmount !== undefined && filters.maxAmount !== '' && filters.maxAmount !== null) {
      const maxAmount = parseFloat(filters.maxAmount);
      if (!isNaN(maxAmount)) {
        bills = bills.filter(bill => (bill.totalAmount || 0) <= maxAmount);
      }
    }

    // Filter by status
    if (filters.status && filters.status !== '') {
      bills = bills.filter(bill => bill.status === filters.status);
    }

    // Filter by profit range (new feature)
    if (filters.minProfit !== undefined && filters.minProfit !== '' && filters.minProfit !== null) {
      const minProfit = parseFloat(filters.minProfit);
      if (!isNaN(minProfit)) {
        bills = bills.filter(bill => (bill.totalProfit || 0) >= minProfit);
      }
    }

    if (filters.maxProfit !== undefined && filters.maxProfit !== '' && filters.maxProfit !== null) {
      const maxProfit = parseFloat(filters.maxProfit);
      if (!isNaN(maxProfit)) {
        bills = bills.filter(bill => (bill.totalProfit || 0) <= maxProfit);
      }
    }

    // Filter by product count range (new feature)
    if (filters.minProductCount !== undefined && filters.minProductCount !== '' && filters.minProductCount !== null) {
      const minCount = parseInt(filters.minProductCount);
      if (!isNaN(minCount)) {
        bills = bills.filter(bill => (bill.productCount || 0) >= minCount);
      }
    }

    if (filters.maxProductCount !== undefined && filters.maxProductCount !== '' && filters.maxProductCount !== null) {
      const maxCount = parseInt(filters.maxProductCount);
      if (!isNaN(maxCount)) {
        bills = bills.filter(bill => (bill.productCount || 0) <= maxCount);
      }
    }

    return bills;
  } catch (error) {
    console.error('Error filtering bills: ', error);
    throw error;
  }
};

// Combined search and filter function for advanced queries
export const searchAndFilterBills = async (searchTerm, filters = {}, tenantId) => {
  try {
    let bills;

    // Start with search if provided, otherwise get all bills
    if (searchTerm && searchTerm.trim() !== '') {
      bills = await searchBillsAndProducts(searchTerm, tenantId);
    } else {
      bills = await getBills(tenantId);
    }

    // Apply filters to the search results
    if (Object.keys(filters).length > 0) {
      // Filter by date range with enhanced date handling
      if (filters.startDate || filters.endDate) {
        bills = bills.filter(bill => {
          const billDate = bill.date instanceof Date ? bill.date : new Date(bill.date);

          if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            startDate.setHours(0, 0, 0, 0);
            if (billDate < startDate) return false;
          }

          if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            if (billDate > endDate) return false;
          }

          return true;
        });
      }

      // Enhanced vendor filtering
      if (filters.vendor && filters.vendor.trim() !== '') {
        const vendorLower = filters.vendor.toLowerCase().trim();
        bills = bills.filter(bill =>
          bill.vendor && bill.vendor.toLowerCase().includes(vendorLower)
        );
      }

      // Amount range filtering
      if (filters.minAmount !== undefined && filters.minAmount !== '' && filters.minAmount !== null) {
        const minAmount = parseFloat(filters.minAmount);
        if (!isNaN(minAmount)) {
          bills = bills.filter(bill => (bill.totalAmount || 0) >= minAmount);
        }
      }

      if (filters.maxAmount !== undefined && filters.maxAmount !== '' && filters.maxAmount !== null) {
        const maxAmount = parseFloat(filters.maxAmount);
        if (!isNaN(maxAmount)) {
          bills = bills.filter(bill => (bill.totalAmount || 0) <= maxAmount);
        }
      }

      // Status filtering
      if (filters.status && filters.status !== '') {
        bills = bills.filter(bill => bill.status === filters.status);
      }

      // Profit range filtering
      if (filters.minProfit !== undefined && filters.minProfit !== '' && filters.minProfit !== null) {
        const minProfit = parseFloat(filters.minProfit);
        if (!isNaN(minProfit)) {
          bills = bills.filter(bill => (bill.totalProfit || 0) >= minProfit);
        }
      }

      if (filters.maxProfit !== undefined && filters.maxProfit !== '' && filters.maxProfit !== null) {
        const maxProfit = parseFloat(filters.maxProfit);
        if (!isNaN(maxProfit)) {
          bills = bills.filter(bill => (bill.totalProfit || 0) <= maxProfit);
        }
      }

      // Product count filtering
      if (filters.minProductCount !== undefined && filters.minProductCount !== '' && filters.minProductCount !== null) {
        const minCount = parseInt(filters.minProductCount);
        if (!isNaN(minCount)) {
          bills = bills.filter(bill => (bill.productCount || 0) >= minCount);
        }
      }

      if (filters.maxProductCount !== undefined && filters.maxProductCount !== '' && filters.maxProductCount !== null) {
        const maxCount = parseInt(filters.maxProductCount);
        if (!isNaN(maxCount)) {
          bills = bills.filter(bill => (bill.productCount || 0) <= maxCount);
        }
      }
    }

    return bills;
  } catch (error) {
    console.error('Error searching and filtering bills: ', error);
    throw error;
  }
};