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
    serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

const COLLECTION_NAME = 'priceList';

// Add a new price list item
export const addPriceListItem = async (itemData) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...itemData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { id: docRef.id, ...itemData };
    } catch (error) {
        console.error('Error adding price list item: ', error);
        throw error;
    }
};

// Get all price list items
export const getPriceListItems = async () => {
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const items = [];
        querySnapshot.forEach((doc) => {
            items.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return items;
    } catch (error) {
        console.error('Error getting price list items: ', error);
        throw error;
    }
};

// Subscribe to price list items
export const subscribeToPriceList = (callback) => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
        const items = [];
        querySnapshot.forEach((doc) => {
            items.push({
                id: doc.id,
                ...doc.data()
            });
        });
        callback(items);
    });
};

// Update a price list item
export const updatePriceListItem = async (itemId, updateData) => {
    try {
        const itemRef = doc(db, COLLECTION_NAME, itemId);
        await updateDoc(itemRef, {
            ...updateData,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating price list item: ', error);
        throw error;
    }
};

// Delete a price list item
export const deletePriceListItem = async (itemId) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, itemId));
    } catch (error) {
        console.error('Error deleting price list item: ', error);
        throw error;
    }
};
