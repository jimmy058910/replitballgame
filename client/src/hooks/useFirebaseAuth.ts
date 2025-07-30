import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { getRedirectResult } from 'firebase/auth';
import { auth, onAuthStateChange, signInWithGoogle, logOut } from '@/lib/firebase';

export const useFirebaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle redirect result on page load
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('✅ Firebase login successful:', result.user.email);
        }
      } catch (error: any) {
        console.error('❌ Firebase redirect error:', error);
        setError(error.message);
      }
    };

    handleRedirectResult();
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) {
        console.log('✅ User authenticated:', firebaseUser.email);
      } else {
        console.log('👤 User logged out');
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setError(error.message);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await logOut();
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      setError(error.message);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user
  };
};