import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";

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
const validateFirebaseConfig = () => {
  console.log('🔧 Validating Firebase configuration...');
  console.log('🔧 API Key present:', !!firebaseConfig.apiKey);
  console.log('🔧 Project ID:', firebaseConfig.projectId);
  console.log('🔧 Auth Domain:', firebaseConfig.authDomain);
  console.log('🔧 App ID:', firebaseConfig.appId);
  
  // Check required fields directly
  const isValid = firebaseConfig.apiKey && 
                 firebaseConfig.projectId && 
                 firebaseConfig.authDomain && 
                 firebaseConfig.appId;
  
  if (!isValid) {
    console.error('❌ Missing required Firebase configuration fields');
    return false;
  }
  
  console.log('✅ Firebase configuration valid');
  return true;
};

const testFirebaseConnection = async () => {
  try {
    console.log('🧪 Testing Firebase API connection...');
    
    if (!validateFirebaseConfig()) {
      console.error('❌ Firebase configuration invalid - skipping connection test');
      return;
    }
    
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${firebaseConfig.apiKey}`);
    console.log('🧪 API Response status:', response.status);
    
    if (response.status === 400) {
      console.error('🚨 API KEY IS INVALID');
      console.log('🔧 Current key preview:', firebaseConfig.apiKey.substring(0, 20) + '...');
    } else if (response.status === 200) {
      console.log('✅ Firebase API connection successful');
    }
    
    const data = await response.text();
    console.log('🧪 Response preview:', data.substring(0, 100));
  } catch (error) {
    console.error('🧪 Connection test failed:', error);
  }
};

// Authentication functions with popup fallback
export const signInWithGoogle = async (usePopup = false) => {
  console.log(`🔐 Starting Google sign-in with ${usePopup ? 'popup' : 'redirect'}...`);
  console.log('🌐 Current domain:', window.location.hostname);
  console.log('🔧 Authorized domain needed:', window.location.hostname);
  
  await testFirebaseConnection();
  
  try {
    if (usePopup) {
      console.log('🪟 Using popup authentication...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ Popup authentication successful:', result.user.email);
      return result;
    } else {
      console.log('🔄 Using redirect authentication...');
      console.log('⚠️ If authentication fails, the domain above needs to be added to Firebase Console → Authentication → Settings → Authorized domains');
      return signInWithRedirect(auth, googleProvider);
    }
  } catch (error: any) {
    console.error('❌ Authentication error:', error);
    console.error('❌ Error code:', error.code);
    
    if (error.code === 'auth/unauthorized-domain') {
      console.error('🚨 DOMAIN NOT AUTHORIZED!');
      console.error('📝 Add this domain to Firebase Console:');
      console.error(`   Domain to add: ${window.location.hostname}`);
      console.error('   Path: Authentication → Settings → Authorized domains');
    }
    
    throw error;
  }
};

export const logOut = () => {
  return signOut(auth);
};

// Auth state listener
export const onAuthStateChange = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};

export default app;