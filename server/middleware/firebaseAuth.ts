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
  try {
    console.log('🔍 requireAuth middleware - checking Firebase token...');
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No Firebase Bearer token provided');
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.log('❌ Empty Firebase token');
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    try {
      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || `${decodedToken.uid}@realmrivalry.com`,
        claims: decodedToken
      };
      console.log('✅ Firebase token verified for user:', decodedToken.email || decodedToken.uid);
      next();
    } catch (tokenError: any) {
      console.error('❌ Firebase token verification failed:', tokenError.message);
      
      // For development with custom tokens, implement fallback verification
      if (process.env.NODE_ENV === 'development' && tokenError.message.includes('Decoding Firebase ID token failed')) {
        console.log('🔄 Development: Using custom token fallback verification...');
        
        try {
          // Verify basic JWT structure for development
          if (token.includes('.') && token.split('.').length === 3) {
            console.log('✅ Development: Custom token structure valid - allowing access');
            
            req.user = {
              uid: 'dev-user-123',
              email: 'developer@realmrivalry.com',
              claims: { uid: 'dev-user-123', dev: true }
            };
            
            return next();
          }
        } catch (fallbackError) {
          console.log('❌ Development fallback verification failed:', fallbackError);
        }
      }
      
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    res.status(500).json({ error: 'Authentication system error' });
    return;
  }
};

export default { requireAuth };