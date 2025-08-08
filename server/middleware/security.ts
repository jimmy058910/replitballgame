/**
 * Security middleware for input validation and sanitization
 */
import { Request, Response, NextFunction } from 'express.js';
import { z } from 'zod.js';
import { sanitizeInput } from '../utils/sanitize.js';
import logger from '../utils/logger.js';

// Enhanced input validation schema
export const secureStringSchema = z.string()
  .min(1)
  .max(1000)
  .regex(/^[a-zA-Z0-9\s\-_.,!?'"@#$%&*()+=\[\]{}|;:<>?/~`]+$/, 'Invalid characters detected');

export const secureTextSchema = z.string()
  .min(1)
  .max(5000)
  .regex(/^[a-zA-Z0-9\s\-_.,!?'"@#$%&*()+=\[\]{}|;:<>?/~`\n\r]+$/, 'Invalid characters detected');

// Input sanitization middleware
export const sanitizeInputMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeInput(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeInput(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeInput(req.params);
    }

    next();
  } catch (error) {
    logger.error('Input sanitization error:', error);
    res.status(400).json({ error: 'Invalid input detected' });
  }
};

// Security headers middleware
export const securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

// Authentication failure tracking
const failedAttempts = new Map<string, { count: number; lastAttempt: Date }>();

export const trackAuthFailures = (ip: string) => {
  const current = failedAttempts.get(ip) || { count: 0, lastAttempt: new Date() };
  current.count++;
  current.lastAttempt = new Date();
  failedAttempts.set(ip, current);
  
  // Log security event
  logger.warn('Authentication failure tracked', {
    ip,
    failureCount: current.count,
    timestamp: current.lastAttempt
  });
  
  // Clean up old entries (older than 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [key, value] of failedAttempts.entries()) {
    if (value.lastAttempt < oneHourAgo) {
      failedAttempts.delete(key);
    }
  }
};

export const isIPBlocked = (ip: string): boolean => {
  const attempts = failedAttempts.get(ip);
  return attempts ? attempts.count >= 5 : false;
};