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
  startAfter
} from 'firebase/firestore';
import { db } from './config';

const COLLECTION_NAME = 'shopProducts';

// Add a new shop product
export const addShopProduct = async (productData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...productData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef;
  } catch (error) {
    console.error('Error adding shop product: ', error);
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

// Delete a shop product
export const deleteShopProduct = async (productId) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, productId));
  } catch (error) {
    console.error('Error deleting shop product: ', error);
    throw error;
  }
};

// Update a shop product
export const updateShopProduct = async (productId, updateData) => {
  try {
    const productRef = doc(db, COLLECTION_NAME, productId);
    await updateDoc(productRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating shop product: ', error);
    throw error;
  }
};

// Real-time listener for shop products
export const subscribeToShopProducts = (callback) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(products);
  });
};

// Paginated fetch
export const fetchShopProductsPaginated = async (pageLimit = 20, startAfterDoc = null) => {
  let q = query(
    collection(db, COLLECTION_NAME),
    orderBy('createdAt', 'desc'),
    fbLimit(pageLimit)
  );
  if (startAfterDoc) {
    q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc'),
      startAfter(startAfterDoc),
      fbLimit(pageLimit)
    );
  }
  const querySnapshot = await getDocs(q);
  const products = [];
  let lastDoc = null;
  querySnapshot.forEach((doc) => {
    products.push({ id: doc.id, ...doc.data() });
    lastDoc = doc;
  });
  return {
    products,
    lastDoc,
    hasMore: querySnapshot.size === pageLimit
  };
}; 