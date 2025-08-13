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
    console.log('🔥 Setting up unified authentication system...');
    
    // Check server authentication status first
    const checkServerAuthStatus = async () => {
      try {
        console.log('🔍 Checking server authentication status...');
        const response = await fetch('/api/auth/status', {
          credentials: 'include' // Include session cookies
        });
        
        if (response.ok) {
          const serverAuth = await response.json();
          console.log('🔍 Server auth status:', serverAuth);
          
          if (serverAuth.isAuthenticated && serverAuth.user) {
            console.log('✅ User authenticated on server:', serverAuth.user.email);
            // Create a user object compatible with Firebase User interface
            const serverUser = {
              uid: serverAuth.user.id,
              email: serverAuth.user.email,
              displayName: serverAuth.user.displayName || `${serverAuth.user.firstName} ${serverAuth.user.lastName}`,
              photoURL: serverAuth.user.profileImageUrl,
              emailVerified: true,
              // Add minimal Firebase User interface properties
              isAnonymous: false,
              metadata: {
                creationTime: serverAuth.user.createdAt,
                lastSignInTime: new Date().toISOString()
              },
              providerData: [],
              refreshToken: '',
              tenantId: null
            } as User;
            
            setUser(serverUser);
            setError(null);
            setIsLoading(false);
            return; // Skip Firebase check if server auth works
          }
        }
        
        console.log('🔍 No server authentication - checking Firebase...');
      } catch (error) {
        console.log('🔍 Server auth check failed, falling back to Firebase:', error);
      }
      
      // Fallback to Firebase authentication
      await handleFirebaseAuth();
    };
    
    // Handle Firebase redirect result
    const handleFirebaseAuth = async () => {
      try {
        console.log('🔍 Checking Firebase redirect result...');
        const result = await getRedirectResult(auth);
        
        if (result) {
          console.log('🎉 Firebase OAuth successful:', result.user.email);
          setUser(result.user);
          setError(null);
        } else if (auth.currentUser) {
          console.log('🔍 Using existing Firebase user:', auth.currentUser.email);
          setUser(auth.currentUser);
        }
      } catch (error: any) {
        console.error('🚨 Firebase auth error:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    // Start with server auth check
    checkServerAuthStatus();

    // Set up Firebase auth state listener as backup
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔥 Firebase Auth state changed:', user ? `authenticated: ${user.email}` : 'not authenticated');
      if (user && !isAuthenticated) { // Only update if not already authenticated via server
        console.log('🔍 Firebase user details:', { uid: user.uid, email: user.email, displayName: user.displayName });
        setUser(user);
        setIsLoading(false);
        setError(null);
      }
    });

    return () => {
      console.log('🧹 Cleaning up Firebase Auth listener');
      unsubscribe();
    };
  }, []); // Empty dependency array - only run once

  const isAuthenticated = !!user;

  const login = async (usePopup?: boolean) => {
    console.log('🔥 Starting unified authentication...');
    setIsLoading(true);
    setError(null);
    
    try {
      // In development, use server-side Google OAuth directly for better reliability
      if (!import.meta.env.PROD) {
        console.log('🔄 Development mode: Using server-side Google OAuth...');
        window.location.href = '/api/auth/login';
        return; // Don't set loading to false since we're redirecting
      }
      
      // In production, try Firebase first
      console.log('🔄 Production mode: Using Firebase authentication...');
      await signInWithRedirect(auth, googleProvider);
      console.log('🔄 Firebase redirect initiated...');
      
    } catch (error: any) {
      console.error('🚨 Authentication error:', error);
      console.error('🚨 Error code:', error.code);
      
      // Fallback to server auth for any Firebase issues
      console.log('🔄 Falling back to server-side authentication...');
      window.location.href = '/api/auth/login';
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