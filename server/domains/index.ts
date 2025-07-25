import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { AppError, createErrorResponse } from './core/errors';
import { Logger } from './core/logger';

// Import domain routes
import authRoutes from './auth/routes';
import tournamentRoutes from './tournaments/routes';
import matchRoutes from './matches/routes';
import economyRoutes from './economy/routes';

const router = Router();

// Mount domain routes
router.use('/auth', authRoutes);
router.use('/tournaments', tournamentRoutes);
router.use('/matches', matchRoutes);
router.use('/economy', economyRoutes);

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Global error handler for domains
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string;
  
  Logger.logError('Domain error occurred', error, {
    requestId,
    path: req.path,
    method: req.method,
    userId: req.user?.userId
  });

  if (error instanceof AppError) {
    return res.status(error.statusCode).json(createErrorResponse(error, requestId));
  }

  // Unknown error - don't expose to client
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(requestId && { requestId })
  });
});

export default router;