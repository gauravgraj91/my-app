import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

const COLLECTION_NAME = 'personalTransactions';
const BUDGETS_COLLECTION = 'personalBudgets';

// Add a new personal transaction
export const addPersonalTransaction = async (transactionData, tenantId) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...transactionData,
      tenantId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef;
  } catch (error) {
    console.error('Error adding personal transaction: ', error);
    throw error;
  }
};

// Update a personal transaction
export const updatePersonalTransaction = async (transactionId, updateData) => {
  try {
    await updateDoc(doc(db, COLLECTION_NAME, transactionId), {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating personal transaction: ', error);
    throw error;
  }
};

// Delete a personal transaction
export const deletePersonalTransaction = async (transactionId) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, transactionId));
  } catch (error) {
    console.error('Error deleting personal transaction: ', error);
    throw error;
  }
};

// Real-time listener for personal transactions
export const subscribeToPersonalTransactions = (tenantId, callback, onError) => {
  const q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId), orderBy('createdAt', 'desc'));

  return onSnapshot(q, (querySnapshot) => {
    const transactions = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      transactions.push({
        id: docSnap.id,
        ...data,
        date: data.date?.toDate?.() || data.date
      });
    });
    callback(transactions);
  }, (error) => {
    console.error('Error subscribing to personal transactions:', error);
    if (onError) onError(error);
  });
};

// Save the per-category monthly budgets map (one doc per tenant, id = tenantId)
export const setPersonalBudgets = async (tenantId, budgets) => {
  try {
    await setDoc(doc(db, BUDGETS_COLLECTION, tenantId), {
      tenantId,
      budgets,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving personal budgets: ', error);
    throw error;
  }
};

// Real-time listener for the budgets doc
export const subscribeToPersonalBudgets = (tenantId, callback, onError) => {
  return onSnapshot(doc(db, BUDGETS_COLLECTION, tenantId), (snap) => {
    callback(snap.exists() ? (snap.data().budgets || {}) : {});
  }, (error) => {
    console.error('Error subscribing to personal budgets:', error);
    if (onError) onError(error);
  });
};
