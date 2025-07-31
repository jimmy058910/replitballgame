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

// Test API connection before attempting auth
const testFirebaseConnection = async () => {
  try {
    console.log('🧪 Testing Firebase API connection...');
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${firebaseConfig.apiKey}`);
    console.log('🧪 API Response status:', response.status);
    
    if (response.status === 400) {
      console.error('❌ API Key Invalid - Check Google Cloud Console');
      console.log('🔧 Troubleshooting steps:');
      console.log('1. Go to Google Cloud Console → APIs & Services → Credentials');
      console.log('2. Find your API key and check if it has restrictions');
      console.log('3. Enable Identity Toolkit API in Google Cloud Console');
      console.log('4. Make sure billing is enabled on your project');
    }
    
    const data = await response.text();
    console.log('🧪 Response data:', data.substring(0, 200));
  } catch (error) {
    console.error('🧪 Connection test failed:', error);
  }
};

// Authentication functions
export const signInWithGoogle = async () => {
  console.log('🔐 Starting Google sign-in with redirect...');
  await testFirebaseConnection();
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