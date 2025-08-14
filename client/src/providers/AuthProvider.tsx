import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInWithCustomToken, signOut, User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Using Firebase custom tokens - no need for Google OAuth provider

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔥 Setting up Firebase authentication system...');
    
    // No redirect result needed for custom token auth
    setIsLoading(false);

    // Set up Firebase auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔥 Firebase Auth state changed:', user ? `authenticated: ${user.email}` : 'not authenticated');
      
      if (user) {
        // Store fresh ID token for API requests
        try {
          const idToken = await user.getIdToken(true); // Force refresh
          localStorage.setItem('firebase_token', idToken);
          console.log('✅ Firebase ID token refreshed and stored (length:', idToken.length, ')');
        } catch (error) {
          console.error('❌ Failed to get ID token:', error);
        }
        setUser(user);
        setError(null);
      } else {
        localStorage.removeItem('firebase_token');
        setUser(null);
      }
      
      setIsLoading(false);
    });

    return () => {
      console.log('🧹 Cleaning up Firebase Auth listener');
      unsubscribe();
    };
  }, []);

  const isAuthenticated = !!user;

  const login = async () => {
    console.log('🔥 Starting Firebase custom token authentication...');
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Using custom token to bypass domain restrictions...');
      
      // Get custom token from backend
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get authentication token');
      }
      
      const { customToken } = await response.json();
      
      // Sign in with custom token (bypasses domain restrictions)
      const result = await signInWithCustomToken(auth, customToken);
      console.log('✅ Firebase custom token authentication successful:', result.user.email);
      
      // Get the proper Firebase ID token for API requests
      const idToken = await result.user.getIdToken(true); // Force refresh to get fresh token
      localStorage.setItem('firebase_token', idToken);
      console.log('✅ Firebase ID token stored for API requests');
      console.log('🔍 Token type verification - First 50 chars:', idToken.substring(0, 50));
      console.log('🔍 Token is custom token?', idToken.includes('identitytoolkit'));
      
      setUser(result.user);
      setError(null);
    } catch (error: any) {
      console.error('🚨 Firebase authentication error:', error);
      setError(`Authentication error: ${error.message}`);
    }
    setIsLoading(false);
  };

  const logout = async () => {
    try {
      console.log('🔥 Signing out from Firebase...');
      localStorage.removeItem('firebase_token');
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