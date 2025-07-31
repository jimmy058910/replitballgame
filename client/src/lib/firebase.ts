import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log('🔥 Firebase Config Debug:', {
  hasApiKey: !!firebaseConfig.apiKey,
  apiKeyLength: firebaseConfig.apiKey?.length || 0,
  apiKeyPrefix: firebaseConfig.apiKey?.substring(0, 15),
  apiKeySuffix: firebaseConfig.apiKey?.substring(-8),
  projectId: firebaseConfig.projectId,
  hasAppId: !!firebaseConfig.appId,
  appIdPrefix: firebaseConfig.appId?.substring(0, 15),
  authDomain: firebaseConfig.authDomain,
  environment: import.meta.env.PROD ? 'production' : 'development'
});

console.log('🔍 Raw Environment Variables:', {
  VITE_FIREBASE_API_KEY_exists: !!import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_API_KEY_length: import.meta.env.VITE_FIREBASE_API_KEY?.length,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_APP_ID_exists: !!import.meta.env.VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_APP_ID_length: import.meta.env.VITE_FIREBASE_APP_ID?.length,
  totalEnvVars: Object.keys(import.meta.env).length
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider for realmrivalry.com
googleProvider.addScope('profile');
googleProvider.addScope('email');