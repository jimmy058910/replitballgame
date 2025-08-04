import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK with enhanced error handling and proper Cloud Run credentials
if (!admin.apps.length) {
  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'direct-glider-465821-p7';
    
    console.log('🔥 Initializing Firebase Admin SDK with proper credentials...');
    
    // Enhanced configuration for different environments
    const firebaseConfig: any = {
      projectId: projectId
    };
    
    // In production Cloud Run, explicitly use Application Default Credentials
    if (process.env.NODE_ENV === 'production' && process.env.K_SERVICE) {
      console.log('🔧 Production Cloud Run: Using Application Default Credentials for Firebase');
      console.log('🔍 Cloud Run environment:', {
        googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT,
        kService: process.env.K_SERVICE,
        kRevision: process.env.K_REVISION || 'not-set',
        projectId: projectId
      });
      
      // Set GOOGLE_CLOUD_PROJECT if not set (required for ADC)
      if (!process.env.GOOGLE_CLOUD_PROJECT) {
        process.env.GOOGLE_CLOUD_PROJECT = projectId;
      }
      
      // Explicitly use Application Default Credentials for Cloud Run
      firebaseConfig.credential = admin.credential.applicationDefault();
    } else {
      console.log('🔧 Development: Using project ID only for Firebase');
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
      
      console.log('🔍 Firebase token verification debug:', {
        tokenPrefix: idToken.substring(0, 50) + '...',
        tokenLength: idToken.length,
        projectId: admin.apps[0]?.options?.projectId,
        timestamp: new Date().toISOString()
      });
      
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
        errorCode: (tokenError as any)?.code || 'unknown',
        errorStack: process.env.NODE_ENV === 'development' ? (tokenError as any)?.stack : undefined,
        tokenLength: idToken?.length || 0,
        firebaseAppsCount: admin.apps.length,
        projectId: admin.apps[0]?.options?.projectId || 'unknown',
        hasCredential: !!(admin.apps[0]?.options?.credential),
        timestamp: new Date().toISOString(),
        cloudRun: !!process.env.K_SERVICE,
        googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT
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