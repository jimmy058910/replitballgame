import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { getRedirectResult } from 'firebase/auth';
import { auth, onAuthStateChange, signInWithGoogle, logOut } from '@/lib/firebase';

export const useFirebaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle redirect result on page load
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        console.log('🔄 Checking for redirect result...');
        console.log('🌐 Current domain:', window.location.hostname);
        console.log('🔧 Auth domain:', auth.app.options.authDomain);
        
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('✅ Firebase login successful:', result.user.email);
          console.log('🎯 User should now be authenticated!');
          setUser(result.user);
          setLoading(false);
          return; // Early return to avoid setting loading to false again
        } else {
          console.log('ℹ️ No redirect result (normal for direct page loads)');
        }
      } catch (error: any) {
        console.error('❌ Firebase redirect error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error details:', error);
        
        // Check for domain authorization issues
        if (error.code === 'auth/unauthorized-domain') {
          console.error('🚨 DOMAIN NOT AUTHORIZED! Current domain not in Firebase authorized domains');
          console.log('🔧 Current domain:', window.location.hostname);
          console.log('📝 Add this domain to Firebase Console → Authentication → Settings → Authorized domains');
        }
        
        setError(error.message);
        setLoading(false);
      }
    };

    handleRedirectResult();
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) {
        console.log('✅ User authenticated:', firebaseUser.email);
      } else {
        console.log('👤 User logged out');
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      console.log('🚀 Login button clicked - attempting Firebase auth...');
      console.log('🔧 Current auth domain:', auth.app.options.authDomain);
      console.log('🔧 Current API key preview:', auth.app.options.apiKey?.substring(0, 15) + '...');
      console.log('🔧 Current project ID:', auth.app.options.projectId);
      setError(null);
      await signInWithGoogle();
      console.log('✅ signInWithGoogle called successfully');
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.code);
      setError(error.message);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await logOut();
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      setError(error.message);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user
  };
};