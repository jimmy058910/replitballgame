import { Request, Response, NextFunction } from 'express';

// Simple in-memory cache for API responses
class APICache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxSize = 1000; // Maximum cache entries

  set(key: string, data: any, ttlSeconds: number = 300): void {
    // Clear old entries if cache is getting too large
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const apiCache = new APICache();

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  skipAuth?: boolean; // Skip caching for authenticated requests
  keyGenerator?: (req: Request) => string;
}

export function cacheMiddleware(options: CacheOptions = {}) {
  const { ttl = 300, skipAuth = false, keyGenerator } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching for authenticated requests if configured
    if (skipAuth && req.user) {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator ? 
      keyGenerator(req) : 
      `${req.method}:${req.originalUrl}:${(req.user as any)?.claims?.sub || 'anonymous'}`;

    // Try to get from cache
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      console.log(`[CACHE HIT] ${cacheKey}`);
      return res.json(cachedData);
    }

    // Store original json method
    const originalJson = res.json;
    let responseData: any;

    // Override json method to capture response
    res.json = function(data: any) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Override end method to cache successful responses
    const originalEnd = res.end;
    res.end = function(chunk?: any) {
      if (res.statusCode === 200 && responseData) {
        console.log(`[CACHE SET] ${cacheKey} (TTL: ${ttl}s)`);
        apiCache.set(cacheKey, responseData, ttl);
      }
      return originalEnd.call(this, chunk);
    };

    next();
  };
}

// Cache invalidation helpers
export const cacheUtils = {
  invalidateTeam: (teamId: string) => {
    apiCache.invalidate(`team:${teamId}`);
    apiCache.invalidate('/api/teams');
  },
  
  invalidatePlayer: (playerId: string, teamId?: string) => {
    apiCache.invalidate(`player:${playerId}`);
    if (teamId) {
      apiCache.invalidate(`team:${teamId}`);
    }
  },
  
  invalidateWorldRankings: () => {
    apiCache.invalidate('/api/world/rankings');
  },
  
  invalidateStoreData: () => {
    apiCache.invalidate('/api/store');
  },
  
  invalidateSeasonData: () => {
    apiCache.invalidate('/api/season');
  },
  
  clear: () => {
    apiCache.clear();
  },
  
  getStats: () => ({
    size: apiCache.size(),
    maxSize: 1000
  })
};

export default apiCache;