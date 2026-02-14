import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { db } from './config';

const COLLECTION_NAME = 'shopVendors';

// Subscribe to real-time vendor updates
export const subscribeToVendors = (callback) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const vendors = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(vendors);
  }, (error) => {
    console.error('Error subscribing to vendors:', error);
    callback([]);
  });
};

// Add a new vendor
export const addVendor = async (vendorData) => {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...vendorData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

// Update a vendor
export const updateVendor = async (vendorId, updates) => {
  const docRef = doc(db, COLLECTION_NAME, vendorId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

// Delete a vendor
export const deleteVendor = async (vendorId) => {
  // Also delete vendor products subcollection
  const productsRef = collection(db, COLLECTION_NAME, vendorId, 'products');
  const productsSnapshot = await getDocs(productsRef);
  const deletePromises = productsSnapshot.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletePromises);
  await deleteDoc(doc(db, COLLECTION_NAME, vendorId));
};

// Get a single vendor
export const getVendor = async (vendorId) => {
  const docRef = doc(db, COLLECTION_NAME, vendorId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

// --- Vendor Products (subcollection) ---

// Subscribe to a vendor's product catalog
export const subscribeToVendorProducts = (vendorId, callback) => {
  const q = query(
    collection(db, COLLECTION_NAME, vendorId, 'products'),
    orderBy('productName', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(products);
  });
};

// Add product to vendor catalog
export const addVendorProduct = async (vendorId, productData) => {
  const docRef = await addDoc(
    collection(db, COLLECTION_NAME, vendorId, 'products'),
    {
      ...productData,
      priceHistory: productData.priceHistory || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );
  return docRef.id;
};

// Update vendor product (e.g., offered price)
export const updateVendorProduct = async (vendorId, productId, updates) => {
  const docRef = doc(db, COLLECTION_NAME, vendorId, 'products', productId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

// Delete vendor product
export const deleteVendorProduct = async (vendorId, productId) => {
  await deleteDoc(doc(db, COLLECTION_NAME, vendorId, 'products', productId));
};

// Get all products for a vendor (one-time fetch)
export const getVendorProducts = async (vendorId) => {
  const q = query(
    collection(db, COLLECTION_NAME, vendorId, 'products'),
    orderBy('productName', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
