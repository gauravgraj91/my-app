import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  subscribeToVendors,
  addVendor,
  updateVendor,
  deleteVendor,
  addVendorProduct,
  updateVendorProduct,
  deleteVendorProduct,
  subscribeToVendorProducts,
} from '../firebase/vendorService';
import { useAuth } from './AuthContext';

const VendorsContext = createContext();

export const useVendors = () => {
  const context = useContext(VendorsContext);
  if (!context) {
    throw new Error('useVendors must be used within a VendorsProvider');
  }
  return context;
};

export const VendorsProvider = ({ children }) => {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [vendors, setVendors] = useState([]);
  const [vendorProducts, setVendorProducts] = useState({}); // { vendorId: [products] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const productUnsubscribes = useRef({});

  // Cleanup all product subscriptions on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(productUnsubscribes.current).forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, []);

  // Subscribe to vendors
  useEffect(() => {
    if (!tenantId) return;
    const unsubscribe = subscribeToVendors(tenantId, (data) => {
      setVendors(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [tenantId]);

  // Load products for a specific vendor (on demand)
  const loadVendorProducts = useCallback((vendorId) => {
    if (vendorProducts[vendorId] || productUnsubscribes.current[vendorId]) return; // already loaded or subscribing
    const unsubscribe = subscribeToVendorProducts(vendorId, (products) => {
      setVendorProducts(prev => ({ ...prev, [vendorId]: products }));
    });
    productUnsubscribes.current[vendorId] = unsubscribe;
    return unsubscribe;
  }, [vendorProducts]);

  const handleAddVendor = useCallback(async (vendorData) => {
    try {
      const id = await addVendor(vendorData, tenantId);
      return id;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [tenantId]);

  const handleUpdateVendor = useCallback(async (vendorId, updates) => {
    try {
      await updateVendor(vendorId, updates);
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const handleDeleteVendor = useCallback(async (vendorId) => {
    try {
      await deleteVendor(vendorId);
      setVendorProducts(prev => {
        const next = { ...prev };
        delete next[vendorId];
        return next;
      });
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const handleAddVendorProduct = useCallback(async (vendorId, productData) => {
    try {
      const id = await addVendorProduct(vendorId, productData);
      return id;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const handleUpdateVendorProduct = useCallback(async (vendorId, productId, updates) => {
    try {
      await updateVendorProduct(vendorId, productId, updates);
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const handleDeleteVendorProduct = useCallback(async (vendorId, productId) => {
    try {
      await deleteVendorProduct(vendorId, productId);
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const value = {
    vendors,
    vendorProducts,
    loading,
    error,
    loadVendorProducts,
    handleAddVendor,
    handleUpdateVendor,
    handleDeleteVendor,
    handleAddVendorProduct,
    handleUpdateVendorProduct,
    handleDeleteVendorProduct,
  };

  return (
    <VendorsContext.Provider value={value}>
      {children}
    </VendorsContext.Provider>
  );
};
