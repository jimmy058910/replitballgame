import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithRedirect, signOut, User, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🔥 Setting up Firebase Auth listener...');
    
    // Handle redirect result from OAuth flow
    const handleRedirectResult = async () => {
      try {
        console.log('🔍 Checking for OAuth redirect result...');
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('🎉 OAuth redirect successful:', result.user.email);
          setUser(result.user);
        } else {
          console.log('🔍 No redirect result found');
        }
      } catch (error) {
        console.error('🚨 OAuth redirect error:', error);
      }
    };

    // Check for redirect result on page load
    handleRedirectResult();

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔥 Firebase Auth state changed:', user ? `authenticated: ${user.email}` : 'not authenticated');
      if (user) {
        console.log('🔍 User details:', { uid: user.uid, email: user.email, displayName: user.displayName });
      }
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
