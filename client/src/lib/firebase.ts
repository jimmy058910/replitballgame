import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: "108005641993",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: "G-FJFXN5RC80"
};

// Validate environment variables
const requiredEnvVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

console.log('🔧 Environment Variables Check:', {
  apiKey: requiredEnvVars.apiKey ? `${requiredEnvVars.apiKey.substring(0, 15)}...` : '❌ MISSING',
  projectId: requiredEnvVars.projectId || '❌ MISSING',
  appId: requiredEnvVars.appId ? `${requiredEnvVars.appId.substring(0, 20)}...` : '❌ MISSING'
});

// Throw error if any required environment variables are missing
const missingVars = Object.entries(requiredEnvVars).filter(([key, value]) => !value);
if (missingVars.length > 0) {
  throw new Error(`Missing required Firebase environment variables: ${missingVars.map(([key]) => `VITE_FIREBASE_${key.toUpperCase()}`).join(', ')}`);
}

console.log('🔧 Firebase Config Debug:', {
  apiKey: firebaseConfig.apiKey?.substring(0, 15) + '...',
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId?.substring(0, 20) + '...',
  authDomain: firebaseConfig.authDomain
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Set up Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  'client_id': '108005641993-17bnfj23rukv0d27s4t0g11ddh18h2bn.apps.googleusercontent.com'
});
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Authentication functions
export const signInWithGoogle = () => {
  console.log('🔐 Starting Google sign-in with redirect...');
  return signInWithRedirect(auth, googleProvider);
};

export const logOut = () => {
  return signOut(auth);
};

// Auth state listener
export const onAuthStateChange = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};

export default app;