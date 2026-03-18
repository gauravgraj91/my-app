import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthChange, getUserProfile } from '../firebase/authService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const unsub = onAuthChange(async (firebaseUser) => {
      if (cancelled) return;
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        if (cancelled) return;
        if (profile) {
          setUser(profile);
        } else {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const value = { user, loading };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontSize: '16px', color: '#64748b',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
