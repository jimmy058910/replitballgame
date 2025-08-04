import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK with enhanced error handling and ADC configuration
if (!admin.apps.length) {
  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'direct-glider-465821-p7';
    
    // In production, ensure Google Cloud Project is set for ADC
    if (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_CLOUD_PROJECT) {
      console.log('🔧 Setting GOOGLE_CLOUD_PROJECT for Firebase Admin SDK...');
      process.env.GOOGLE_CLOUD_PROJECT = projectId;
    }
    
    // Enhanced configuration for Cloud Run with explicit credential handling
    const firebaseConfig: any = {
      projectId: projectId
    };
    
    // In production Cloud Run, use Application Default Credentials (ADC)
    if (process.env.NODE_ENV === 'production' && process.env.K_SERVICE) {
      console.log('🔧 Configuring Firebase Admin SDK for Cloud Run with ADC...');
      // Cloud Run automatically provides ADC, just ensure project ID is set
      firebaseConfig.credential = admin.credential.applicationDefault();
    }
    
    admin.initializeApp(firebaseConfig);
    
    // Test Firebase Admin SDK initialization
    const testAuth = admin.auth();
    console.log('✅ Firebase Admin SDK initialized successfully', {
      projectId: projectId,
      nodeEnv: process.env.NODE_ENV,
      googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT,
      cloudRun: !!process.env.K_SERVICE,
      authServiceExists: !!testAuth
    });
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      nodeEnv: process.env.NODE_ENV,
      googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT,
      cloudRun: !!process.env.K_SERVICE
    });
    
    // In development, don't throw - allow server to start with warning
    if (process.env.NODE_ENV !== 'development') {
      throw error;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    uid: string;
    email?: string;
    name?: string;
    userId: string;
    claims: { sub: string };
  };
}

/**
 * Industry-standard Firebase token verification middleware
 * Verifies JWT tokens from Firebase Auth frontend
 */
export async function verifyFirebaseToken(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No valid authorization token provided' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Check if Firebase Admin SDK is properly initialized
    if (!admin.apps.length) {
      console.error('❌ Firebase Admin SDK not initialized in auth middleware');
      res.status(500).json({ error: 'Authentication service not initialized' });
      return;
    }
    
    try {
      // Verify the Firebase ID token with enhanced error handling
      const auth = admin.auth();
      const decodedToken = await auth.verifyIdToken(idToken);
      
      // Set authenticated user on request
      (req as AuthenticatedRequest).user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        userId: decodedToken.uid, // Use Firebase UID as userId
        claims: { sub: decodedToken.uid }
      };

      console.log('✅ Firebase token verified for user:', decodedToken.uid);
      next();
    } catch (tokenError) {
      console.error('❌ Firebase token verification failed:', {
        error: tokenError instanceof Error ? tokenError.message : 'Unknown error',
        tokenLength: idToken?.length || 0,
        firebaseAppsCount: admin.apps.length,
        projectId: admin.apps[0]?.options?.projectId || 'unknown'
      });
      res.status(401).json({ 
        error: 'Invalid or expired token',
        details: process.env.NODE_ENV === 'development' ? tokenError : undefined
      });
    }
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    res.status(500).json({ error: 'Authentication service error' });
  }
}

/**
 * Development-only bypass middleware for local testing
 */
export function developmentBypass(
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  if (process.env.NODE_ENV === 'development') {
    (req as AuthenticatedRequest).user = {
      uid: '44010914',
      email: 'jimmy058910@gmail.com',
      name: 'Jimmy Dev',
      userId: '44010914',
      claims: { sub: '44010914' }
    };
    console.log('🔧 Development bypass - mock user set');
    return next();
  }
  next();
}

/**
 * Combined authentication middleware:
 * - Development: Uses mock user for local testing
 * - Production: Verifies real Firebase tokens
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'development') {
    return developmentBypass(req, res, next);
  }
  
  verifyFirebaseToken(req, res, next);
}

// Export Firebase Admin SDK status for debugging
export function getFirebaseAdminStatus() {
  try {
    const hasApp = admin.apps.length > 0;
    const firebaseApp = hasApp ? admin.app() : null;
    
    // Test if auth service is working
    let authServiceTest = 'not-tested';
    try {
      if (hasApp) {
        const auth = admin.auth();
        authServiceTest = 'available';
      }
    } catch (authError) {
      authServiceTest = `auth-error: ${authError instanceof Error ? authError.message : 'unknown'}`;
    }
    
    return {
      firebaseAdminStatus: hasApp ? 'initialized' : 'not-initialized',
      projectId: firebaseApp?.options?.projectId || 'not-set',
      authService: authServiceTest,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || 'not-set',
        VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || 'not-set',
        hasCredentials: !!firebaseApp?.options?.credential,
        K_SERVICE: process.env.K_SERVICE || 'not-set'
      }
    };
  } catch (error) {
    return {
      firebaseAdminStatus: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      authService: 'error',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || 'not-set',
        VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || 'not-set',
        hasCredentials: false,
        K_SERVICE: process.env.K_SERVICE || 'not-set'
      }
    };
  }
}