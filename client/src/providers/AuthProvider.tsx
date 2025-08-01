import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithRedirect, signInWithPopup, signOut, User, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (usePopup?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔥 Setting up SINGLE Firebase Auth listener...');
    
    // Handle redirect result from OAuth flow - only check once
    const handleRedirectResult = async () => {
      try {
        console.log('🔍 Checking for OAuth redirect result...');
        console.log('🔍 Current URL:', window.location.href);
        console.log('🔍 URL has OAuth params:', window.location.href.includes('code=') || window.location.href.includes('state='));
        
        const result = await getRedirectResult(auth);
        console.log('🔍 getRedirectResult returned:', !!result);
        
        if (result) {
          console.log('🎉 OAuth redirect successful:', result.user.email);
          console.log('🎉 User UID:', result.user.uid);
          console.log('🎉 Provider data:', result.providerId);
          setUser(result.user);
          setError(null);
        } else {
          console.log('🔍 No redirect result found - checking current auth state...');
          console.log('🔍 Current auth.currentUser:', !!auth.currentUser);
          if (auth.currentUser) {
            console.log('🔍 Current user email:', auth.currentUser.email);
          }
        }
      } catch (error: any) {
        console.error('🚨 OAuth redirect error:', error);
        console.error('🚨 Error details:', error.code, error.message);
        setError(error.message);
      }
    };

    // Check for redirect result on mount
    handleRedirectResult();

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔥 Firebase Auth state changed:', user ? `authenticated: ${user.email}` : 'not authenticated');
      if (user) {
        console.log('🔍 User details:', { uid: user.uid, email: user.email, displayName: user.displayName });
      }
      setUser(user);
      setIsLoading(false);
      setError(null);
    });

    return () => {
      console.log('🧹 Cleaning up Firebase Auth listener');
      unsubscribe();
    };
  }, []); // Empty dependency array - only run once

  const isAuthenticated = !!user;

  const login = async (usePopup?: boolean) => {
    console.log('🔥 Starting Firebase Google Auth...');
    console.log('🔥 Auth method:', usePopup ? 'popup' : 'redirect');
    setIsLoading(true);
    setError(null);
    
    try {
      if (usePopup) {
        console.log('🪟 Using popup authentication...');
        const result = await signInWithPopup(auth, googleProvider);
        console.log('🎉 Popup authentication successful:', result.user.email);
      } else {
        console.log('🔄 Using redirect authentication...');
        await signInWithRedirect(auth, googleProvider);
        console.log('🔄 Redirect initiated - user should be redirected to Google...');
      }
    } catch (error: any) {
      console.error('🚨 Authentication error:', error);
      console.error('🚨 Error code:', error.code);
      console.error('🚨 Error message:', error.message);
      setError(error.message);
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🔥 Signing out from Firebase...');
      setError(null);
      await signOut(auth);
      console.log('🔥 Successfully signed out');
    } catch (error: any) {
      console.error('Firebase logout failed:', error);
      setError(error.message);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}