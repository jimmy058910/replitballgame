import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInWithRedirect, signOut, GoogleAuthProvider, getRedirectResult, User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔥 Setting up Firebase authentication system...');
    
    const checkRedirectResult = async () => {
      try {
        console.log('🔍 Checking Firebase redirect result...');
        const result = await getRedirectResult(auth);
        
        if (result && result.user) {
          console.log('✅ Firebase redirect successful:', result.user.email);
          const idToken = await result.user.getIdToken();
          localStorage.setItem('firebase_token', idToken);
          setUser(result.user);
          setError(null);
        }
      } catch (error: any) {
        console.error('🚨 Firebase redirect error:', error);
        setError(`Authentication error: ${error.message}`);
      }
      setIsLoading(false);
    };

    checkRedirectResult();

    // Set up Firebase auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔥 Firebase Auth state changed:', user ? `authenticated: ${user.email}` : 'not authenticated');
      
      if (user) {
        try {
          const idToken = await user.getIdToken();
          localStorage.setItem('firebase_token', idToken);
          setUser(user);
          setError(null);
        } catch (error: any) {
          console.error('🚨 Error getting Firebase token:', error);
          setError(error.message);
        }
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
    console.log('🔥 Starting Firebase authentication...');
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Using Firebase authentication with redirect...');
      await signInWithRedirect(auth, googleProvider);
      console.log('🔄 Firebase redirect initiated...');
    } catch (error: any) {
      console.error('🚨 Firebase authentication error:', error);
      setError(`Authentication failed: ${error.message}`);
      setIsLoading(false);
    }
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