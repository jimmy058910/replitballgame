import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';

// Extend Request interface to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

// Middleware to add unique request ID to each request
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use existing X-Request-ID header or generate new one
  const requestId = (req.headers['x-request-id'] as string) || nanoid(10);
  
  // Add to request object
  req.requestId = requestId;
  
  // Add to response headers for client visibility
  res.setHeader('X-Request-ID', requestId);
  
  next();
}