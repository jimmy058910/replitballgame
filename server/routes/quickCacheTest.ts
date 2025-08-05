/**
 * QUICK CACHE TEST ROUTES
 * Test cache functionality and demonstrate immediate compute savings
 */

import { Router, type Response } from "express";
import { cacheResponse, simpleCache } from "../middleware/cacheMiddleware";
import { asyncHandler } from "../services/errorService";

const router = Router();

// Test route WITHOUT caching
router.get('/test-no-cache', asyncHandler(async (req: any, res: Response) => {
  const start = Date.now();
  
  // Simulate database query delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const duration = Date.now() - start;
  
  res.json({
    message: 'No cache test - simulates database query',
    queryTime: `${duration}ms`,
    timestamp: new Date().toISOString(),
    cached: false
  });
}));

// Test route WITH caching (30 second TTL for testing)
router.get('/test-with-cache', cacheResponse(30), asyncHandler(async (req: any, res: Response) => {
  const start = Date.now();
  
  // Simulate database query delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const duration = Date.now() - start;
  
  res.json({
    message: 'Cached test - first hit slow, subsequent hits fast',
    queryTime: `${duration}ms`,
    timestamp: new Date().toISOString(),
    cached: false,
    note: 'Call this endpoint again immediately to see caching in action'
  });
}));

// Cache performance demonstration
router.get('/cache-demo', asyncHandler(async (req: any, res: Response) => {
  const stats = simpleCache.getStats();
  
  res.json({
    title: 'Cache Performance Demonstration',
    cacheStats: stats,
    instructions: {
      step1: 'Call /api/cache-test/test-with-cache twice quickly',
      step2: 'Compare response times - second call should be <10ms',
      step3: 'Check /api/cache/stats for updated metrics'
    },
    computeOptimization: {
      expectedSavings: '30-50% database query reduction',
      targetOutcome: 'Reduce Neon compute hours from 6.18h to <2h'
    }
  });
}));

export default router;