/**
 * IMMEDIATE CACHE INTEGRATION
 * Apply caching to existing high-traffic routes for instant compute savings
 */

import { simpleCache } from '../middleware/cacheMiddleware';

// Cache configuration for different data types
export const CACHE_CONFIGS = {
  userProfile: 300,    // 5 minutes - user data changes infrequently
  teamData: 240,       // 4 minutes - team data updates during games
  playerStats: 180,    // 3 minutes - player stats change during training
  leagueStandings: 600, // 10 minutes - standings update after matches
  seasonInfo: 900,     // 15 minutes - season data rarely changes
  matchHistory: 300    // 5 minutes - match results are static once complete
};

/**
 * Apply caching to a database query function
 */
export function withCache<T>(
  cacheKey: string,
  queryFunction: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  const cached = simpleCache.get(cacheKey);
  
  if (cached !== null) {
    console.log(`🧠 [CACHE-HIT] ${cacheKey}`);
    return Promise.resolve(cached);
  }
  
  console.log(`🧠 [CACHE-MISS] ${cacheKey} - executing query`);
  return queryFunction().then(result => {
    simpleCache.set(cacheKey, result, ttlSeconds);
    console.log(`🧠 [CACHE-SET] ${cacheKey} (${ttlSeconds}s TTL)`);
    return result;
  });
}

/**
 * Clear cache when data is updated
 */
export function clearRelatedCache(pattern: string): void {
  const cache = simpleCache as any;
  const keys = Array.from(cache.cache.keys());
  let cleared = 0;
  
  for (const key of keys) {
    // @ts-expect-error TS18046
    if (key.includes(pattern)) {
      // @ts-expect-error TS2345
      simpleCache.delete(key);
      cleared++;
    }
  }
  
  if (cleared > 0) {
    console.log(`🧠 [CACHE-CLEAR] Cleared ${cleared} entries for pattern: ${pattern}`);
  }
}

/**
 * Get current cache performance metrics
 */
export function getCacheMetrics() {
  const stats = simpleCache.getStats();
  const currentTime = new Date().toISOString();
  
  return {
    timestamp: currentTime,
    performance: stats,
    computeOptimization: {
      cacheHits: stats.hits,
      cacheMisses: stats.misses,
      hitRate: stats.hitRate,
      estimatedQueriesSaved: stats.hits,
      estimatedComputeTimeSaved: `${(parseInt(stats.hits.toString()) * 0.1).toFixed(1)}s`
    },
    status: 'active',
    expectedImpact: '30-50% database query reduction'
  };
}