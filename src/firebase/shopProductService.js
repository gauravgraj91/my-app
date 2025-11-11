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
  serverTimestamp,
  limit as fbLimit,
  startAfter,
  getDoc,
  where
} from 'firebase/firestore';
import { db } from './config';

const COLLECTION_NAME = 'shopProducts';

// Add a new shop product with optional bill association and optimistic updates
export const addShopProduct = async (productData, billId = null, options = {}) => {
  try {
    // Validate bill association if billId is provided
    if (billId) {
      const billValidation = await validateBillAssociation(billId);
      if (!billValidation.isValid) {
        throw new Error(`Bill validation failed: ${billValidation.error}`);
      }
      
      // Add bill reference to product data
      productData.billId = billId;
      productData.billNumber = billValidation.bill.billNumber;
    }
    
    // Apply optimistic update if callback provided
    let tempId = null;
    if (options.optimisticCallback && options.currentProducts) {
      const result = optimisticAddProduct(productData, options.currentProducts, options.optimisticCallback);
      tempId = result.tempId;
    }
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...productData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // If product is associated with a bill, recalculate bill totals
    if (billId) {
      await recalculateBillTotalsFromProduct(billId);
    }
    
    const newProduct = {
      id: docRef.id,
      ...productData
    };
    
    // Update optimistic callback with real ID if provided
    if (options.realIdCallback && tempId) {
      options.realIdCallback(tempId, docRef.id);
    }
    
    return newProduct;
  } catch (error) {
    console.error('Error adding shop product: ', error);
    
    // Revert optimistic update on error
    if (options.revertCallback && options.currentProducts) {
      options.revertCallback(options.currentProducts);
    }
    
    throw error;
  }
};

// Get all shop products
export const getShopProducts = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return products;
  } catch (error) {
    console.error('Error getting shop products: ', error);
    throw error;
  }
};

// Delete a shop product with optimistic updates
export const deleteShopProduct = async (productId, options = {}) => {
  try {
    // Get product to find associated bill before deletion
    const product = await getShopProduct(productId);
    const billId = product?.billId;
    
    // Apply optimistic update if callback provided
    if (options.optimisticCallback && options.currentProducts) {
      optimisticDeleteProduct(productId, options.currentProducts, options.optimisticCallback);
    }
    
    await deleteDoc(doc(db, COLLECTION_NAME, productId));
    
    // Recalculate bill totals if product was associated with a bill
    if (billId) {
      await recalculateBillTotalsFromProduct(billId);
    }
  } catch (error) {
    console.error('Error deleting shop product: ', error);
    
    // Revert optimistic update on error
    if (options.revertCallback && options.currentProducts) {
      options.revertCallback(options.currentProducts);
    }
    
    throw error;
  }
};

// Update a shop product with optimistic updates
export const updateShopProduct = async (productId, updateData, options = {}) => {
  try {
    // Get current product to check for bill changes
    const currentProduct = await getShopProduct(productId);
    if (!currentProduct) {
      throw new Error('Product not found');
    }
    
    const oldBillId = currentProduct.billId;
    const newBillId = updateData.billId;
    
    // Validate new bill association if billId is being changed
    if (newBillId && newBillId !== oldBillId) {
      const billValidation = await validateBillAssociation(newBillId);
      if (!billValidation.isValid) {
        throw new Error(`Bill validation failed: ${billValidation.error}`);
      }
      updateData.billNumber = billValidation.bill.billNumber;
    }
    
    // Apply optimistic update if callback provided
    if (options.optimisticCallback && options.currentProducts) {
      optimisticUpdateProduct(productId, updateData, options.currentProducts, options.optimisticCallback);
    }
    
    const productRef = doc(db, COLLECTION_NAME, productId);
    await updateDoc(productRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
    // Recalculate totals for affected bills
    if (oldBillId && oldBillId !== newBillId) {
      await recalculateBillTotalsFromProduct(oldBillId);
    }
    if (newBillId && newBillId !== oldBillId) {
      await recalculateBillTotalsFromProduct(newBillId);
    }
    
    return await getShopProduct(productId);
  } catch (error) {
    console.error('Error updating shop product: ', error);
    
    // Revert optimistic update on error
    if (options.revertCallback && options.currentProducts) {
      options.revertCallback(options.currentProducts);
    }
    
    throw error;
  }
};

// Real-time listener for shop products with enhanced metadata
export const subscribeToShopProducts = (callback, options = {}) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const products = [];
    const changes = [];
    
    querySnapshot.docChanges().forEach((change) => {
      const productData = {
        id: change.doc.id,
        ...change.doc.data()
      };
      
      changes.push({
        type: change.type, // 'added', 'modified', 'removed'
        product: productData,
        oldIndex: change.oldIndex,
        newIndex: change.newIndex
      });
    });
    
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data(),
        _metadata: {
          hasPendingWrites: doc.metadata.hasPendingWrites,
          fromCache: doc.metadata.fromCache
        }
      });
    });
    
    callback(products, {
      changes,
      metadata: {
        hasPendingWrites: querySnapshot.metadata.hasPendingWrites,
        fromCache: querySnapshot.metadata.fromCache
      }
    });
  }, (error) => {
    console.error('Error in products subscription: ', error);
    if (options.onError) {
      options.onError(error);
    } else {
      callback([], { changes: [], metadata: { error: error.message } });
    }
  });
};

// Real-time listener for products by bill ID
export const subscribeToProductsByBill = (billId, callback, options = {}) => {
  if (!billId) {
    throw new Error('Bill ID is required for subscription');
  }

  const q = query(
    collection(db, COLLECTION_NAME),
    where('billId', '==', billId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const products = [];
    const changes = [];
    
    querySnapshot.docChanges().forEach((change) => {
      const productData = {
        id: change.doc.id,
        ...change.doc.data()
      };
      
      changes.push({
        type: change.type,
        product: productData,
        oldIndex: change.oldIndex,
        newIndex: change.newIndex
      });
    });
    
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data(),
        _metadata: {
          hasPendingWrites: doc.metadata.hasPendingWrites,
          fromCache: doc.metadata.fromCache
        }
      });
    });
    
    callback(products, {
      changes,
      metadata: {
        hasPendingWrites: querySnapshot.metadata.hasPendingWrites,
        fromCache: querySnapshot.metadata.fromCache
      }
    });
    
    // Trigger bill totals recalculation if products changed
    if (changes.length > 0 && !querySnapshot.metadata.hasPendingWrites) {
      import('./billService').then(({ debouncedRecalculateBillTotals }) => {
        debouncedRecalculateBillTotals(billId);
      }).catch(error => {
        console.error('Error importing billService for recalculation:', error);
      });
    }
  }, (error) => {
    console.error('Error in products by bill subscription: ', error);
    if (options.onError) {
      options.onError(error);
    } else {
      callback([], { changes: [], metadata: { error: error.message } });
    }
  });
};

// Enhanced paginated fetch with caching and performance optimizations
export const fetchShopProductsPaginated = async (options = {}) => {
  const {
    pageLimit = 20,
    startAfterDoc = null,
    orderByField = 'createdAt',
    orderDirection = 'desc',
    filters = {},
    useCache = true,
    cacheKey = null
  } = options;

  try {
    // Generate cache key if not provided
    const generatedCacheKey = cacheKey || 
      `products-paginated:${pageLimit}:${orderByField}:${orderDirection}:${JSON.stringify(filters)}:${startAfterDoc?.id || 'start'}`;
    
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
      orderBy(orderByField, orderDirection),
      fbLimit(pageLimit)
    );
    
    // Apply filters
    if (filters.billId) {
      q = query(q, where('billId', '==', filters.billId));
    }
    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters.vendor) {
      q = query(q, where('vendor', '==', filters.vendor));
    }
    if (filters.hasBill === true) {
      q = query(q, where('billId', '!=', null));
    } else if (filters.hasBill === false) {
      q = query(q, where('billId', '==', null));
    }
    
    // Add pagination
    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }
    
    const querySnapshot = await getDocs(q);
    const products = [];
    let lastDoc = null;
    
    querySnapshot.forEach((doc) => {
      const productData = {
        id: doc.id,
        ...doc.data()
      };
      products.push(productData);
      lastDoc = doc;
    });
    
    const result = {
      products,
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
    console.error('Error fetching products paginated: ', error);
    throw error;
  }
};

// Enhanced infinite scroll fetch for products
export const fetchProductsInfinite = async (options = {}) => {
  const {
    pageSize = 20,
    cursor = null,
    direction = 'forward',
    orderByField = 'createdAt',
    orderDirection = 'desc',
    filters = {},
    useCache = true
  } = options;

  try {
    const cacheKey = `products-infinite:${pageSize}:${orderByField}:${orderDirection}:${JSON.stringify(filters)}:${cursor || 'start'}:${direction}`;
    
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
      orderBy(orderByField, orderDirection),
      fbLimit(pageSize + 1)
    );
    
    // Apply filters
    if (filters.billId) {
      q = query(q, where('billId', '==', filters.billId));
    }
    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters.vendor) {
      q = query(q, where('vendor', '==', filters.vendor));
    }
    if (filters.hasBill === true) {
      q = query(q, where('billId', '!=', null));
    } else if (filters.hasBill === false) {
      q = query(q, where('billId', '==', null));
    }
    
    // Apply cursor
    if (cursor) {
      if (direction === 'forward') {
        q = query(q, startAfter(cursor));
      } else {
        const reverseDirection = orderDirection === 'desc' ? 'asc' : 'desc';
        q = query(
          collection(db, COLLECTION_NAME),
          orderBy(orderByField, reverseDirection),
          startAfter(cursor),
          fbLimit(pageSize + 1)
        );
      }
    }
    
    const querySnapshot = await getDocs(q);
    let products = [];
    
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data(),
        _doc: doc
      });
    });
    
    if (direction === 'backward') {
      products.reverse();
    }
    
    const hasMore = products.length > pageSize;
    if (hasMore) {
      products.pop();
    }
    
    const result = {
      products,
      hasMore,
      nextCursor: products.length > 0 ? products[products.length - 1]._doc : null,
      prevCursor: products.length > 0 ? products[0]._doc : null,
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
    console.error('Error fetching products infinite: ', error);
    throw error;
  }
}; 

// Get a single product by ID
export const getShopProduct = async (productId) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, productId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting shop product: ', error);
    throw error;
  }
};

// Get products by bill ID
export const getProductsByBill = async (billId) => {
  try {
    if (!billId) {
      throw new Error('Bill ID is required');
    }
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('billId', '==', billId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const products = [];
    
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return products;
  } catch (error) {
    console.error('Error getting products by bill: ', error);
    throw error;
  }
};

// Move a product from one bill to another
export const moveProductToBill = async (productId, newBillId) => {
  try {
    if (!productId || !newBillId) {
      throw new Error('Product ID and new Bill ID are required');
    }
    
    // Validate the target bill exists
    const billValidation = await validateBillAssociation(newBillId);
    if (!billValidation.isValid) {
      throw new Error(`Target bill validation failed: ${billValidation.error}`);
    }
    
    // Get the current product to find old bill
    const product = await getShopProduct(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    
    const oldBillId = product.billId;
    
    // Update product with new bill reference
    await updateShopProduct(productId, {
      billId: newBillId,
      billNumber: billValidation.bill.billNumber
    });
    
    // Recalculate totals for both bills
    if (oldBillId && oldBillId !== newBillId) {
      await recalculateBillTotalsFromProduct(oldBillId);
    }
    await recalculateBillTotalsFromProduct(newBillId);
    
    return await getShopProduct(productId);
  } catch (error) {
    console.error('Error moving product to bill: ', error);
    throw error;
  }
};

// Get products with bill information included
export const getProductsWithBillInfo = async () => {
  try {
    const products = await getShopProducts();
    
    // Group products by billId to minimize bill lookups
    const billIds = [...new Set(products.map(p => p.billId).filter(Boolean))];
    const billsMap = new Map();
    
    // Fetch all unique bills
    for (const billId of billIds) {
      try {
        const { getBill } = await import('./billService');
        const bill = await getBill(billId);
        if (bill) {
          billsMap.set(billId, bill);
        }
      } catch (error) {
        console.warn(`Failed to fetch bill ${billId}:`, error);
      }
    }
    
    // Enhance products with bill information
    return products.map(product => ({
      ...product,
      bill: product.billId ? billsMap.get(product.billId) : null
    }));
  } catch (error) {
    console.error('Error getting products with bill info: ', error);
    throw error;
  }
};

// Remove product from bill (sets billId to null)
export const removeProductFromBill = async (productId) => {
  try {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    
    const product = await getShopProduct(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    
    const oldBillId = product.billId;
    
    // Remove bill association
    await updateShopProduct(productId, {
      billId: null,
      billNumber: null
    });
    
    // Recalculate totals for the old bill
    if (oldBillId) {
      await recalculateBillTotalsFromProduct(oldBillId);
    }
    
    return await getShopProduct(productId);
  } catch (error) {
    console.error('Error removing product from bill: ', error);
    throw error;
  }
};

// Get products that are not associated with any bill
export const getUnassignedProducts = async () => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('billId', '==', null),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const products = [];
    
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return products;
  } catch (error) {
    console.error('Error getting unassigned products: ', error);
    throw error;
  }
};

// Bulk move products to a bill
export const bulkMoveProductsToBill = async (productIds, billId) => {
  try {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new Error('Product IDs array is required and cannot be empty');
    }
    
    if (!billId) {
      throw new Error('Bill ID is required');
    }
    
    // Validate the target bill
    const billValidation = await validateBillAssociation(billId);
    if (!billValidation.isValid) {
      throw new Error(`Bill validation failed: ${billValidation.error}`);
    }
    
    const results = [];
    const affectedBillIds = new Set([billId]);
    
    // Move each product
    for (const productId of productIds) {
      try {
        const product = await getShopProduct(productId);
        if (product && product.billId) {
          affectedBillIds.add(product.billId);
        }
        
        await updateShopProduct(productId, {
          billId: billId,
          billNumber: billValidation.bill.billNumber
        });
        
        results.push({ productId, success: true });
      } catch (error) {
        console.error(`Failed to move product ${productId}:`, error);
        results.push({ productId, success: false, error: error.message });
      }
    }
    
    // Recalculate totals for all affected bills
    for (const affectedBillId of affectedBillIds) {
      try {
        await recalculateBillTotalsFromProduct(affectedBillId);
      } catch (error) {
        console.warn(`Failed to recalculate totals for bill ${affectedBillId}:`, error);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error bulk moving products to bill: ', error);
    throw error;
  }
};

// Bill-product relationship validation
export const validateBillAssociation = async (billId) => {
  try {
    if (!billId) {
      return { isValid: false, error: 'Bill ID is required' };
    }
    
    // Import getBill function to avoid circular dependency
    const { getBill } = await import('./billService');
    const bill = await getBill(billId);
    
    if (!bill) {
      return { isValid: false, error: 'Bill not found' };
    }
    
    if (bill.status === 'archived') {
      return { isValid: false, error: 'Cannot associate products with archived bills' };
    }
    
    return { isValid: true, bill };
  } catch (error) {
    console.error('Error validating bill association: ', error);
    return { isValid: false, error: error.message };
  }
};

// Helper function to recalculate bill totals when products change
const recalculateBillTotalsFromProduct = async (billId) => {
  try {
    if (!billId) return;
    
    // Import debouncedRecalculateBillTotals to avoid circular dependency and improve performance
    const { debouncedRecalculateBillTotals } = await import('./billService');
    debouncedRecalculateBillTotals(billId);
  } catch (error) {
    console.error('Error recalculating bill totals from product: ', error);
    // Don't throw error to avoid breaking product operations
  }
};

// Optimistic update functions for products
export const optimisticUpdateProduct = (productId, updateData, currentProducts, callback) => {
  try {
    // Create optimistic update
    const optimisticProducts = currentProducts.map(product => {
      if (product.id === productId) {
        return {
          ...product,
          ...updateData,
          updatedAt: new Date(),
          _metadata: {
            ...product._metadata,
            hasPendingWrites: true,
            optimistic: true
          }
        };
      }
      return product;
    });
    
    // Immediately update UI
    callback(optimisticProducts, {
      metadata: { optimistic: true },
      changes: [{
        type: 'modified',
        product: optimisticProducts.find(p => p.id === productId),
        optimistic: true
      }]
    });
    
    return optimisticProducts;
  } catch (error) {
    console.error('Error in optimistic product update: ', error);
    return currentProducts;
  }
};

export const optimisticAddProduct = (productData, currentProducts, callback) => {
  try {
    const tempId = `temp_${Date.now()}`;
    const optimisticProduct = {
      id: tempId,
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date(),
      _metadata: {
        hasPendingWrites: true,
        optimistic: true,
        tempId: true
      }
    };
    
    const optimisticProducts = [optimisticProduct, ...currentProducts];
    
    // Immediately update UI
    callback(optimisticProducts, {
      metadata: { optimistic: true },
      changes: [{
        type: 'added',
        product: optimisticProduct,
        optimistic: true,
        newIndex: 0
      }]
    });
    
    return { optimisticProducts, tempId };
  } catch (error) {
    console.error('Error in optimistic product add: ', error);
    return { optimisticProducts: currentProducts, tempId: null };
  }
};

export const optimisticDeleteProduct = (productId, currentProducts, callback) => {
  try {
    const productToDelete = currentProducts.find(p => p.id === productId);
    if (!productToDelete) return currentProducts;
    
    const optimisticProducts = currentProducts.filter(product => product.id !== productId);
    
    // Immediately update UI
    callback(optimisticProducts, {
      metadata: { optimistic: true },
      changes: [{
        type: 'removed',
        product: productToDelete,
        optimistic: true
      }]
    });
    
    return optimisticProducts;
  } catch (error) {
    console.error('Error in optimistic product delete: ', error);
    return currentProducts;
  }
};

export const optimisticMoveProduct = (productId, newBillId, newBillNumber, currentProducts, callback) => {
  try {
    const optimisticProducts = currentProducts.map(product => {
      if (product.id === productId) {
        return {
          ...product,
          billId: newBillId,
          billNumber: newBillNumber,
          updatedAt: new Date(),
          _metadata: {
            ...product._metadata,
            hasPendingWrites: true,
            optimistic: true
          }
        };
      }
      return product;
    });
    
    // Immediately update UI
    callback(optimisticProducts, {
      metadata: { optimistic: true },
      changes: [{
        type: 'modified',
        product: optimisticProducts.find(p => p.id === productId),
        optimistic: true
      }]
    });
    
    return optimisticProducts;
  } catch (error) {
    console.error('Error in optimistic product move: ', error);
    return currentProducts;
  }
};

// Enhanced product queries that include bill references
export const getProductsWithBillFilter = async (filters = {}) => {
  try {
    let q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    
    // Apply bill-specific filters
    if (filters.billId) {
      q = query(
        collection(db, COLLECTION_NAME),
        where('billId', '==', filters.billId),
        orderBy('createdAt', 'desc')
      );
    } else if (filters.hasBill === true) {
      q = query(
        collection(db, COLLECTION_NAME),
        where('billId', '!=', null),
        orderBy('createdAt', 'desc')
      );
    } else if (filters.hasBill === false) {
      q = query(
        collection(db, COLLECTION_NAME),
        where('billId', '==', null),
        orderBy('createdAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    const products = [];
    
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Apply additional filters that can't be done in Firestore query
    let filteredProducts = products;
    
    if (filters.billNumber) {
      filteredProducts = filteredProducts.filter(product => 
        product.billNumber && product.billNumber.toLowerCase().includes(filters.billNumber.toLowerCase())
      );
    }
    
    if (filters.vendor) {
      // This would require joining with bill data, so we'll fetch bill info
      const productsWithBills = await Promise.all(
        filteredProducts.map(async (product) => {
          if (product.billId) {
            try {
              const { getBill } = await import('./billService');
              const bill = await getBill(product.billId);
              return { ...product, bill };
            } catch (error) {
              return { ...product, bill: null };
            }
          }
          return { ...product, bill: null };
        })
      );
      
      filteredProducts = productsWithBills.filter(product => 
        product.bill && product.bill.vendor && 
        product.bill.vendor.toLowerCase().includes(filters.vendor.toLowerCase())
      );
    }
    
    return filteredProducts;
  } catch (error) {
    console.error('Error getting products with bill filter: ', error);
    throw error;
  }
};