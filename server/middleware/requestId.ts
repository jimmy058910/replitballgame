import { Request, Response, NextFunction } from 'express.js';
import { nanoid } from 'nanoid.js';

// Request ID interface now defined centrally in types/express/index.d.ts

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