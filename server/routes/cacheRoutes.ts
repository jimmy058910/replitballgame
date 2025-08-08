/**
 * CACHE MANAGEMENT ROUTES
 * Admin endpoints for monitoring and managing cache
 */

import { Router, Response } from 'express.js';
import { memoryCache } from '../utils/memoryCache.js';
import { cachedUserStorage } from '../storage/cachedUserStorage.js';
import { cachedTeamStorage } from '../storage/cachedTeamStorage.js';
import { cachedPlayerStorage } from '../storage/cachedPlayerStorage.js';
import { asyncHandler } from '../services/errorService.js';

const router = Router();

// Get cache statistics
router.get('/stats', asyncHandler(async (req: any, res: Response) => {
  const stats = memoryCache.getStats();
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    cache: stats,
    computeSavings: {
      estimatedQueriesAvoided: stats.hits,
      estimatedComputeTimeSaved: `${Math.round(stats.hits * 0.1)} seconds`,
      hitRate: stats.hitRate
    }
  });
}));

// Clear specific cache types
router.delete('/clear/:type', asyncHandler(async (req: any, res: Response): Promise<void> => {
  const { type } = req.params;
  let cleared = 0;
  
  switch (type) {
    case 'users':
      memoryCache.invalidatePattern('user:');
      memoryCache.invalidatePattern('nda:');
      cleared = 1;
      break;
      
    case 'teams':
      cachedTeamStorage.clearTeamCache();
      cleared = 1;
      break;
      
    case 'players':
      cachedPlayerStorage.clearPlayerCache();
      cleared = 1;
      break;
      
    case 'all':
      memoryCache.clear();
      cleared = 1;
      break;
      
    default:
      res.status(400).json({ 
        success: false, 
        message: 'Invalid cache type. Use: users, teams, players, or all' 
      });
      return;
  }
  
  res.json({
    success: true,
    message: `Cache cleared for: ${type}`,
    timestamp: new Date().toISOString()
  });
}));

// Get cache contents (for debugging)
router.get('/debug', asyncHandler(async (req: any, res: Response) => {
  const stats = memoryCache.getStats();
  
  res.json({
    success: true,
    stats,
    message: 'Cache debug information',
    optimizationActive: true,
    expectedComputeReduction: '30-50%'
  });
}));

export default router;