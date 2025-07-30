import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCnaxQb4dpuOo70LdbpRiuKIMsETmc18",
  authDomain: "direct-glider-465821-p7.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "direct-glider-465821-p7",
  storageBucket: "direct-glider-465821-p7.firebasestorage.app",
  messagingSenderId: "108005641993",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:108005641993:web:cd17d54a26723d9c278dd8",
  measurementId: "G-FJFXN5RC80"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Set up Google Auth Provider
const googleProvider = new GoogleAuthProvider();
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