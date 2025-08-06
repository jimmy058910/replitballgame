import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../core/errors';
import { Logger } from '../core/logger';

// DEPRECATED - Use server/middleware/firebaseAuth.ts instead
// This middleware is being replaced with proper Firebase token verification
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      throw new UnauthorizedError('Authentication required');
    }
    
    if (!req.user) {
      throw new UnauthorizedError('Invalid user session');
    }
    
    next();
  } catch (error) {
    Logger.logWarn('Authentication failed', { 
      path: req.path, 
      method: req.method,
      userAgent: req.get('User-Agent')
    });
    next(error);
  }
}

// Admin-only middleware
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new ForbiddenError('Admin access required');
    }
    
    next();
  } catch (error) {
    Logger.logWarn('Admin access denied', { 
      user: req.user,
      path: req.path,
      method: req.method
    });
    next(error);
  }
}

// Team ownership middleware
export function requireTeamOwnership(req: Request, res: Response, next: NextFunction) {
  // This will be implemented with team validation logic
  next();
}