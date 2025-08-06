/**
 * Admin Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Admin authentication middleware
 * Restricts access to admin users only
 */
export function adminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      logger.warn('Unauthorized admin access attempt', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        requestId: (req as any).requestId
      });

      return res.status(401).json({
        error: 'Authentication required',
        message: 'Admin access requires authentication'
      });
    }

    // Check if user has admin privileges
    const userId = (req as any).user?.claims?.sub;
    const adminUsers = ['44010914']; // Admin user IDs
    
    if (!userId || !adminUsers.includes(userId)) {
      logger.warn('Unauthorized admin access attempt', {
        userId: userId || 'unknown',
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        requestId: (req as any).requestId
      });

      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Admin access required'
      });
    }

    // Log successful admin access
    logger.info('Admin access granted', {
      userId,
      ip: req.ip,
      path: req.path,
      requestId: (req as any).requestId
    });

    next();
  } catch (error) {
    logger.error('Admin authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: (req as any).requestId,
      ip: req.ip,
      path: req.path
    });

    return res.status(500).json({
      error: 'Authentication error',
      message: 'Unable to verify admin permissions'
    });
  }
}