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
        console.log('🌐 Current URL:', window.location.href);
        console.log('🌐 Current domain:', window.location.hostname);
        console.log('🔧 Auth domain:', auth.app.options.authDomain);
        console.log('🔧 Firebase project:', auth.app.options.projectId);
        
        // Check if this is a redirect from Firebase Auth
        const urlParams = new URLSearchParams(window.location.search);
        const hasAuthParams = urlParams.has('code') || urlParams.has('state') || window.location.hash.includes('access_token');
        console.log('🔍 Has auth params:', hasAuthParams);
        
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('✅ Firebase redirect result found!');
          console.log('✅ User email:', result.user.email);
          console.log('✅ User uid:', result.user.uid);
          console.log('✅ User display name:', result.user.displayName);
          setUser(result.user);
          setError(null); // Clear any previous errors
          setLoading(false);
          
          // Clear URL parameters to clean up the redirect
          if (hasAuthParams) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          return;
        } else {
          console.log('ℹ️ No redirect result found');
          if (hasAuthParams) {
            console.log('⚠️ Found auth params but no redirect result - this might indicate an issue');
          }
        }
      } catch (error: any) {
        console.error('❌ Firebase redirect error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Full error:', error);
        
        // Specific error handling
        if (error.code === 'auth/unauthorized-domain') {
          console.error('🚨 DOMAIN NOT AUTHORIZED!');
          setError(`Domain ${window.location.hostname} is not authorized in Firebase. Please add it to Firebase Console → Authentication → Settings → Authorized domains`);
        } else if (error.code === 'auth/popup-blocked') {
          console.error('🚨 POPUP BLOCKED - trying alternative method');
          setError('Popup was blocked. Please allow popups or try the redirect method.');
        } else {
          setError(`Authentication error: ${error.message}`);
        }
        
        setLoading(false);
      }
    };

    // Add a small delay to ensure Firebase is fully initialized
    const timer = setTimeout(handleRedirectResult, 100);
    
    return () => clearTimeout(timer);
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

  const login = async (usePopup = false) => {
    try {
      console.log('🚀 Login button clicked - attempting Firebase auth...');
      console.log('🔧 Current auth domain:', auth.app.options.authDomain);
      console.log('🔧 Current API key preview:', auth.app.options.apiKey?.substring(0, 15) + '...');
      console.log('🔧 Current project ID:', auth.app.options.projectId);
      setError(null);
      await signInWithGoogle(usePopup);
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