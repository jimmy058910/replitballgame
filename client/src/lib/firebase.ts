import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCnaxQb4dpuOo70LdbpRiuKIMsETmc18",
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
      console.error('❌ API Key Invalid - Follow these EXACT steps:');
      console.log('🔧 STEP 1: Go to Google Cloud Console → APIs & Services → Credentials');
      console.log('🔧 STEP 2: Find API key "AIzaSyCnaxQb4dpuOo70LdbpRiuKIMsETmc18"');
      console.log('🔧 STEP 3: Click the pencil icon to edit the key');
      console.log('🔧 STEP 4: Under "Application restrictions" → Select "HTTP referrers"');
      console.log('🔧 STEP 5: Add these referrers:');
      console.log('   - https://realmrivalry.com/*');
      console.log('   - https://*.replit.dev/*');
      console.log('   - http://localhost:*/*');
      console.log('🔧 STEP 6: Under "API restrictions" → Select "Restrict key"');
      console.log('🔧 STEP 7: Select only "Identity Toolkit API"');
      console.log('🔧 STEP 8: Click SAVE');
      console.log('🔧 STEP 9: Wait 5 minutes for changes to propagate');
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