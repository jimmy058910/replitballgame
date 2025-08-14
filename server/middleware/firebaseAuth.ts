import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK with Cloud Run optimized configuration
if (!admin.apps.length) {
  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'direct-glider-465821-p7';
    
    console.log('🔥 Initializing Firebase Admin SDK for Cloud Run...');
    
    // Cloud Run optimized configuration - no explicit credentials needed
    // Cloud Run automatically provides service account access when properly configured
    const firebaseConfig: any = {
      projectId: projectId
    };
    
    // For production, rely on Cloud Run's built-in service account
    if (process.env.NODE_ENV === 'production' && process.env.K_SERVICE) {
      console.log('🔧 Production Cloud Run: Using built-in service account');
      console.log('🔍 Environment check:', {
        googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT,
        kService: process.env.K_SERVICE,
        projectId: projectId
      });
      
      // Ensure GOOGLE_CLOUD_PROJECT is set for Firebase
      if (!process.env.GOOGLE_CLOUD_PROJECT) {
        process.env.GOOGLE_CLOUD_PROJECT = projectId;
      }
    }
    
    admin.initializeApp(firebaseConfig);
    console.log('✅ Firebase Admin SDK initialized for Cloud Run');
    
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
        email: decodedToken.email,
        claims: decodedToken
      };
      console.log('✅ Firebase token verified for user:', decodedToken.email);
      next();
    } catch (tokenError: any) {
      console.error('❌ Firebase token verification failed:', tokenError.message);
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