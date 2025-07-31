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
  apiKeyPrefix: firebaseConfig.apiKey?.substring(0, 10) + '...',
  apiKeyFull: firebaseConfig.apiKey, // Temporary debug - remove after fixing
  projectId: firebaseConfig.projectId,
  hasAppId: !!firebaseConfig.appId,
  appIdFull: firebaseConfig.appId, // Temporary debug - remove after fixing
  authDomain: firebaseConfig.authDomain,
  environment: import.meta.env.PROD ? 'production' : 'development'
});

console.log('🔍 Environment Variables Debug:', {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  allEnvVars: Object.keys(import.meta.env)
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider for realmrivalry.com
googleProvider.addScope('profile');
googleProvider.addScope('email');