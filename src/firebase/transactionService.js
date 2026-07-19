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
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

const COLLECTION_NAME = 'transactions';

// Add a new transaction
export const addTransaction = async (transactionData, tenantId) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...transactionData,
      tenantId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef;
  } catch (error) {
    console.error('Error adding transaction: ', error);
    throw error;
  }
};

// Get all transactions
export const getTransactions = async (tenantId) => {
  try {
    const querySnapshot = await getDocs(query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId)));
    const transactions = [];
    querySnapshot.forEach((doc) => {
      transactions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return transactions;
  } catch (error) {
    console.error('Error getting transactions: ', error);
    throw error;
  }
};

// Delete a transaction
export const deleteTransaction = async (transactionId) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, transactionId));
  } catch (error) {
    console.error('Error deleting transaction: ', error);
    throw error;
  }
};

// Update a transaction
export const updateTransaction = async (transactionId, updateData) => {
  try {
    const transactionRef = doc(db, COLLECTION_NAME, transactionId);
    await updateDoc(transactionRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating transaction: ', error);
    throw error;
  }
};

// Real-time listener for transactions
// orderBy must stay on 'date' — it matches the deployed composite index
// (tenantId ASC, date DESC) in firestore.indexes.json
export const subscribeToTransactions = (tenantId, callback, onError) => {
  const q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId), orderBy('date', 'desc'));

  return onSnapshot(q, (querySnapshot) => {
    const transactions = [];
    querySnapshot.forEach((doc) => {
      transactions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(transactions);
  }, (error) => {
    console.error('Error subscribing to transactions: ', error);
    if (onError) onError(error);
  });
};