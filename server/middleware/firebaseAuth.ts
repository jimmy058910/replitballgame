import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Initialize with minimal config - uses ADC (Application Default Credentials) in production
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'direct-glider-465821-p7'
    });
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
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
    
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
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
  } catch (error) {
    console.error('❌ Firebase token verification failed:', error);
    res.status(401).json({ 
      error: 'Invalid or expired token',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
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