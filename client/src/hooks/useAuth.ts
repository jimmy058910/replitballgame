import { useFirebaseAuth } from './useFirebaseAuth';

export function useAuth() {
  const { user, loading, error, login, logout, isAuthenticated } = useFirebaseAuth();

  return {
    user,
    isLoading: loading,
    isAuthenticated,
    login,
    logout,
    error
  };
}
