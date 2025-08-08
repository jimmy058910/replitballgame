/**
 * Security utilities for enhanced error handling and protection
 */
import { Response } from 'express';
import logger from './logger';

export const handleError = (error: Error, res: Response) => {
  // Log detailed error securely
  logger.error('Server error:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // In production, return generic errors to prevent information disclosure
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: error.message });
  }
};

export const validateOrigin = (origin: string | undefined): boolean => {
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? ['https://realmrivalry.com', 'https://www.realmrivalry.com', 'https://realm-rivalry-o6fd46yesq-ul.a.run.app'] 
    : ['http://localhost:5000', 'https://localhost:5000'];

  // Add support for Replit development domains
  if (process.env.NODE_ENV !== 'production' && origin?.includes('.replit.dev')) {
    return true;
  }

  return allowedOrigins.includes(origin || '');
};