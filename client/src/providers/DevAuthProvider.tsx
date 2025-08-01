import React, { createContext, useContext, useState, useEffect } from 'react';
import { DevAuthService } from '../lib/devAuth';

interface DevAuthContextType {
  user: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const DevAuthContext = createContext<DevAuthContextType | undefined>(undefined);

export function DevAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔧 DEV: Setting up development authentication...');
    
    const initAuth = async () => {
      try {
        // Check if already authenticated
        let authUser = await DevAuthService.checkAuthStatus();
        
        // If not authenticated, auto-login for development
        if (!authUser) {
          console.log('🔧 DEV: Auto-logging in development user...');
          authUser = await DevAuthService.loginDevelopmentUser();
        }
        
        if (authUser) {
          console.log('🔧 DEV: Authentication successful:', authUser.email);
          setUser(authUser);
          setError(null);
        } else {
          console.log('🔧 DEV: Authentication failed');
          setError('Development authentication failed');
        }
      } catch (error: any) {
        console.error('🔧 DEV: Auth initialization error:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const authUser = await DevAuthService.loginDevelopmentUser();
      if (authUser) {
        setUser(authUser);
        console.log('🔧 DEV: Manual login successful');
      } else {
        setError('Login failed');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      DevAuthService.logout();
      setUser(null);
      setError(null);
    } catch (error: any) {
      console.error('🔧 DEV: Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    error
  };

  return (
    <DevAuthContext.Provider value={contextValue}>
      {children}
    </DevAuthContext.Provider>
  );
}

export function useDevAuth() {
  const context = useContext(DevAuthContext);
  if (context === undefined) {
    throw new Error('useDevAuth must be used within a DevAuthProvider');
  }
  return context;
}