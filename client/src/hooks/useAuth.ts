import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface AuthResponse {
  authenticated: boolean;
  user: any;
  error?: string;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status from backend
  const { data: authResponse, error, isLoading: queryLoading } = useQuery<AuthResponse>({
    queryKey: ['/api/auth/user'],
    retry: false,
    refetchOnWindowFocus: false,
    throwOnError: false, // Don't throw on 401 errors
  });

  // Update loading state
  useEffect(() => {
    setIsLoading(queryLoading);
  }, [queryLoading]);

  // Handle both success and error responses properly
  const isAuthenticated = authResponse?.authenticated === true;
  const user = authResponse?.user || null;

  const login = (usePopup?: boolean) => {
    console.log('🚀 Redirecting to backend Google OAuth...');
    // Use backend's Google OAuth endpoint
    window.location.href = '/api/auth/login';
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
      // Force reload anyway
      window.location.reload();
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    error: error?.message || authResponse?.error || null
  };
}
