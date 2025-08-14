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
    
    const checkAuthStatus = async () => {
      try {
        console.log('🔍 Checking authentication status...');
        const response = await fetch('/api/auth/status', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('🔍 Auth status:', data);
          
          if (data.isAuthenticated && data.user) {
            console.log('✅ User authenticated:', data.user.email);
            // Create Firebase-compatible user object from server data
            const serverUser = {
              uid: data.user.id,
              email: data.user.email,
              displayName: data.user.displayName,
              photoURL: data.user.profileImageUrl,
              emailVerified: true,
              isAnonymous: false,
              metadata: {
                creationTime: data.user.createdAt,
                lastSignInTime: new Date().toISOString()
              },
              providerData: [],
              refreshToken: '',
              tenantId: null
            } as User;
            
            setUser(serverUser);
            setError(null);
            setIsLoading(false);
            return;
          }
        }
        
        console.log('🔍 No authentication found');
        setIsLoading(false);
      } catch (error: any) {
        console.error('🚨 Auth check error:', error);
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const isAuthenticated = !!user;

  const login = async () => {
    console.log('🔥 Starting authentication...');
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Using working Passport authentication...');
      window.location.href = '/api/auth/login';
    } catch (error: any) {
      console.error('🚨 Authentication error:', error);
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