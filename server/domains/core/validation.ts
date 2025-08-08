import { z } from 'zod.js';
import { Request, Response, NextFunction } from 'express.js';

// Common validation schemas
export const commonSchemas = {
  id: z.string().min(1, 'ID is required'),
  bigIntId: z.coerce.number().min(1, 'Valid ID is required'),
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20)
  }),
  teamId: z.coerce.number().min(1, 'Valid team ID is required'),
  playerId: z.coerce.number().min(1, 'Valid player ID is required'),
  tournamentId: z.coerce.number().min(1, 'Valid tournament ID is required'),
  matchId: z.coerce.number().min(1, 'Valid match ID is required'),
};

// Request validation middleware factory
export function validateRequest(schema: {
  body?: z.ZodType<any>;
  params?: z.ZodType<any>;
  query?: z.ZodType<any>;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
        return;
      }
      next(error);
    }
  };
}

// Response validation utility
export function validateResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}