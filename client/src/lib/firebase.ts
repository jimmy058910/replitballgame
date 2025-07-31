import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";

// ✅ NEW API KEY: Fresh key created and configured
const firebaseConfig = {
  apiKey: "AIzaSyCTL2OXVHqv-P2s_zLswqqH2-bdnTw6Jls", // ✅ New valid key
  authDomain: "direct-glider-465821-p7.firebaseapp.com",
  projectId: "direct-glider-465821-p7",
  storageBucket: "direct-glider-465821-p7.firebasestorage.app",
  messagingSenderId: "108005641993",
  appId: "1:108005641993:web:cd17d54a26723d9c278dd8",
  measurementId: "G-FJFXN5RC80"
};

console.log('🔧 Firebase Config (Hardcoded):', {
  apiKey: firebaseConfig.apiKey.substring(0, 15) + '...',
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId.substring(0, 20) + '...',
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
      console.error('🚨 CURRENT API KEY IS INVALID - CREATE NEW KEY:');
      console.log('');
      console.log('🆕 CREATE NEW API KEY:');
      console.log('1. Go to Google Cloud Console → APIs & Services → Credentials');
      console.log('2. Click "+ CREATE CREDENTIALS" → "API key"');
      console.log('3. Copy the new key immediately');
      console.log('4. Replace the key in client/src/lib/firebase.ts');
      console.log('5. Leave it unrestricted for testing');
      console.log('');
      console.log('🔧 Current invalid key: AIzaSyCnaxQb4dpuOo70LdbpRiuKIMsETmc18');
      console.log('📝 Replace the apiKey value in firebase.ts with your new key');
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