import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log('🔥 Firebase Config - apiKey exists:', !!firebaseConfig.apiKey);
console.log('🔥 Firebase Config - apiKey length:', firebaseConfig.apiKey?.length);
console.log('🔥 Firebase Config - projectId:', firebaseConfig.projectId);
console.log('🔥 Firebase Config - appId exists:', !!firebaseConfig.appId);
console.log('🔥 Firebase Config - authDomain:', firebaseConfig.authDomain);
console.log('🔥 Firebase Config - environment:', import.meta.env.PROD ? 'production' : 'development');

console.log('🔍 Environment - VITE_FIREBASE_API_KEY exists:', !!import.meta.env.VITE_FIREBASE_API_KEY);
console.log('🔍 Environment - VITE_FIREBASE_PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
console.log('🔍 Environment - VITE_FIREBASE_APP_ID exists:', !!import.meta.env.VITE_FIREBASE_APP_ID);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider for realmrivalry.com
googleProvider.addScope('profile');
googleProvider.addScope('email');