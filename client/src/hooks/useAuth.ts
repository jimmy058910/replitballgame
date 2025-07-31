import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status from backend
  const { data: user, error, isLoading: queryLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Update loading state
  useEffect(() => {
    setIsLoading(queryLoading);
  }, [queryLoading]);

  const isAuthenticated = !!user && !error;

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
    error: error?.message || null
  };
}
