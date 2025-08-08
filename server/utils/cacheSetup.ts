/**
 * CACHE SETUP UTILITY
 * Initialize caching system and register cache invalidation hooks
 */

import { simpleCache, invalidateCache } from '../middleware/cacheMiddleware.js';

// Track cache activity for compute optimization
let totalCacheHits = 0;
let totalComputeSaved = 0;

/**
 * Initialize cache system
 */
export function initializeCache(): void {
  console.log('🧠 [CACHE-INIT] Starting in-memory cache system for compute optimization');
  
  // Log cache statistics every 10 minutes
  setInterval(() => {
    const stats = simpleCache.getStats();
    const currentHits = parseInt(stats.hits.toString());
    const newHits = currentHits - totalCacheHits;
    
    if (newHits > 0) {
      totalCacheHits = currentHits;
      totalComputeSaved += newHits * 0.1; // Estimate 100ms saved per cache hit
      
      console.log(`🧠 [CACHE-STATS] Cache hits: ${stats.hits}, Hit rate: ${stats.hitRate}, Compute saved: ~${totalComputeSaved.toFixed(1)}s`);
    }
  }, 10 * 60 * 1000);
  
  console.log('🧠 [CACHE-INIT] Cache system initialized - expecting 30-50% query reduction');
}

/**
 * Smart cache invalidation for data mutations
 */
export function invalidateCacheOnUpdate(type: string, id?: string | number): void {
  switch (type) {
    case 'team':
      invalidateCache('/api/teams');
      if (id) invalidateCache(`team:${id}`);
      break;
      
    case 'player':
      invalidateCache('/api/players');
      if (id) invalidateCache(`player:${id}`);
      break;
      
    case 'user':
      invalidateCache('/api/auth');
      if (id) invalidateCache(`user:${id}`);
      break;
      
    case 'league':
      invalidateCache('/api/leagues');
      invalidateCache('/api/standings');
      break;
      
    default:
      console.log(`🧠 [CACHE-INVALIDATE] Unknown type: ${type}`);
  }
}

/**
 * Emergency cache clear for troubleshooting
 */
export function emergencyCacheClear(): void {
  simpleCache.clear();
  console.log('🧠 [CACHE-EMERGENCY] All cache cleared for troubleshooting');
}

/**
 * Get cache performance metrics
 */
export function getCacheMetrics() {
  const stats = simpleCache.getStats();
  
  return {
    ...stats,
    totalComputeSaved: `${totalComputeSaved.toFixed(1)}s`,
    estimatedDatabaseQueriesAvoided: totalCacheHits,
    optimizationActive: true
  };
}