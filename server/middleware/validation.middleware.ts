/**
 * Validation Middleware
 * 
 * Request validation using Zod schemas
 * Industry-standard input validation
 * 
 * @module ValidationMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import logger from '../utils/logger.js';

/**
 * Validates request against a Zod schema
 */
export const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate the request
      const validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Replace request properties with validated data
      req.body = validated.body || req.body;
      req.query = validated.query || req.query;
      req.params = validated.params || req.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: (err as any).message,
          code: err.code
        }));

        logger.warn('Validation failed', {
          path: req.path,
          errors
        });

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
      }

      // Non-validation error
      next(error);
    }
  };
};

/**
 * Sanitizes string input
 */
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/<[^>]*>?/gm, '');
};

/**
 * Validates and sanitizes ID parameters
 */
export const validateId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${paramName} parameter`
      });
    }

    req.params[paramName] = parseInt(id).toString();
    next();
  };
};