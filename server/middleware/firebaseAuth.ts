import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK with proper credentials for all environments
if (!admin.apps.length) {
  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'direct-glider-465821-p7';
    
    console.log('🔥 Initializing Firebase Admin SDK with explicit credentials...');
    
    let firebaseConfig: any = {
      projectId: projectId
    };
    
    // Use service account key for authentication (works in all environments)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        firebaseConfig.credential = admin.credential.cert(serviceAccount);
        console.log('✅ Using service account credentials');
      } catch (parseError) {
        console.error('❌ Failed to parse service account key:', parseError);
        throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY format');
      }
    } else {
      console.log('⚠️ No service account key found, using default credentials');
    }
    
    admin.initializeApp(firebaseConfig);
    console.log('✅ Firebase Admin SDK initialized successfully');
    
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    throw error;
  }
}

// FIREBASE TOKEN AUTH MIDDLEWARE - Pure Firebase authentication
export const requireAuth = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  console.log('🔍 requireAuth middleware START - checking Firebase token...');
  
  try {
    const authHeader = req.headers.authorization;
    console.log('🔍 Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No Firebase Bearer token provided');
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    console.log('🔍 Token extracted, length:', token.length);
    
    if (!token) {
      console.log('❌ Empty Firebase token');
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    try {
      console.log('🔍 Token verification attempt - Token length:', token.length);
      console.log('🔍 Token first 50 chars:', token.substring(0, 50));
      
      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log('✅ Firebase token verification successful for user:', decodedToken.uid);
      
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || `${decodedToken.uid}@realmrivalry.com`,
        claims: decodedToken
      };
      console.log('✅ Firebase token verified for user:', decodedToken.email || decodedToken.uid);
      next();
    } catch (tokenError: any) {
      console.error('❌ Firebase token verification failed:', tokenError.message);
      
      // Industry-standard development bypass with proper user mapping
      if (process.env.NODE_ENV === 'development') {
        let devUser = null;
        
        // Map development tokens to actual user profiles for comprehensive testing
        switch (token) {
          case 'dev-token-oakland-cougars':
            // Maps to the real user who owns Oakland Cougars team (Division 7 Alpha)
            devUser = {
              uid: 'oakland-cougars-owner',
              email: 'oakland.cougars@realmrivalry.dev',
              claims: { uid: 'oakland-cougars-owner', email: 'oakland.cougars@realmrivalry.dev' }
            };
            break;
          case 'dev-token-123':
          case 'dev-token-local':
            // Generic development user - may not have team associations
            devUser = {
              uid: 'dev-user-123',
              email: 'developer@realmrivalry.com',
              claims: { uid: 'dev-user-123', email: 'developer@realmrivalry.com' }
            };
            break;
          default:
            break;
        }
        
        if (devUser) {
          console.log(`🔧 Development bypass activated for ${devUser.email}`);
          req.user = devUser;
          console.log(`✅ Development bypass authenticated for ${devUser.uid}`);
          next();
          return;
        }
      }
      
      console.log('❌ Firebase token verification failed');
      res.status(401).json({ message: 'Invalid Firebase token' });
      return;
    }
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    res.status(500).json({ error: 'Authentication system error' });
    return;
  }
};

export default { requireAuth };