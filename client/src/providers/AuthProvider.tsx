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
        console.log('🔍 URL protocol:', window.location.protocol);
        console.log('🔍 URL hostname:', window.location.hostname);
        console.log('🔍 URL has OAuth params:', window.location.href.includes('code=') || window.location.href.includes('state='));
        console.log('🔍 URL params:', window.location.search);
        console.log('🔍 URL hash:', window.location.hash);
        console.log('🔍 Firebase authDomain:', auth.app.options.authDomain);
        
        const result = await getRedirectResult(auth);
        console.log('🔍 getRedirectResult returned:', !!result);
        console.log('🔍 getRedirectResult details:', result ? 'SUCCESS' : 'NO_RESULT');
        
        if (result) {
          console.log('🎉 OAuth redirect successful:', result.user.email);
          console.log('🎉 User UID:', result.user.uid);
          console.log('🎉 Provider data:', result.providerId);
          console.log('🎉 User verified:', result.user.emailVerified);
          setUser(result.user);
          setError(null);
        } else {
          console.log('🔍 No redirect result found - checking current auth state...');
          console.log('🔍 Current auth.currentUser:', !!auth.currentUser);
          if (auth.currentUser) {
            console.log('🔍 Current user email:', auth.currentUser.email);
            console.log('🔍 Current user UID:', auth.currentUser.uid);
            setUser(auth.currentUser);
          }
        }
      } catch (error: any) {
        console.error('🚨 OAuth redirect error:', error);
        console.error('🚨 Error code:', error.code);
        console.error('🚨 Error message:', error.message);
        console.error('🚨 Full error object:', error);
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
    setIsLoading(true);
    setError(null);
    
    try {
      // Always use redirect authentication for better cross-domain compatibility
      console.log('🔄 Using redirect authentication for better compatibility...');
      await signInWithRedirect(auth, googleProvider);
      console.log('🔄 Redirect initiated - user should be redirected to Google...');
      // Don't set isLoading to false here - the redirect will handle the state
    } catch (error: any) {
      console.error('🚨 Authentication error:', error);
      console.error('🚨 Error code:', error.code);
      console.error('🚨 Error message:', error.message);
      
      // Check if this is a network connectivity issue in development
      if (error.code === 'auth/network-request-failed' && !import.meta.env.PROD) {
        console.log('🔧 Development network issue detected - attempting fallback authentication...');
        
        try {
          // Use the backend Google OAuth as fallback for development
          const fallbackUrl = '/api/auth/login';
          console.log('🔄 Redirecting to backend Google OAuth fallback...');
          window.location.href = fallbackUrl;
          return; // Don't set loading to false since we're redirecting
        } catch (fallbackError) {
          console.error('🚨 Fallback authentication also failed:', fallbackError);
          setError('Authentication services unavailable in development environment. This will work in production.');
        }
      } else {
        // Provide user-friendly error messages for other errors
        let userMessage = error.message;
        if (error.code === 'auth/internal-error') {
          userMessage = 'Authentication service unavailable. This may be due to domain restrictions in development environment.';
        } else if (error.code === 'auth/popup-blocked') {
          userMessage = 'Popup was blocked. Please allow popups and try again.';
        } else if (error.code === 'auth/network-request-failed') {
          userMessage = 'Network connection to Firebase failed. Authentication will work in production environment.';
        }
        
        setError(userMessage);
      }
      
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