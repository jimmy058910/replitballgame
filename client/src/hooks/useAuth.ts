import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithRedirect, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🔥 Setting up Firebase Auth listener...');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔥 Firebase Auth state changed:', user ? 'authenticated' : 'not authenticated');
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAuthenticated = !!user;

  const login = (usePopup?: boolean) => {
    console.log('🔥 Starting Firebase Google Auth...');
    setIsLoading(true);
    signInWithRedirect(auth, googleProvider);
  };

  const logout = async () => {
    try {
      console.log('🔥 Signing out from Firebase...');
      await signOut(auth);
      console.log('🔥 Successfully signed out');
    } catch (error) {
      console.error('Firebase logout failed:', error);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    error: null
  };
}
