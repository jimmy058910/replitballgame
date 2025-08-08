/**
 * LIGHTWEIGHT CACHING MIDDLEWARE
 * Simple in-memory caching to reduce database queries
 */

import type { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: any;
  expiry: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;

  constructor() {
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
    console.log('🧠 [CACHE] Simple in-memory cache initialized');
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry || Date.now() > entry.expiry) {
      this.misses++;
      if (entry) this.cache.delete(key);
      return null;
    }
    
    this.hits++;
    return entry.data;
  }

  set(key: string, data: any, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? `${((this.hits / total) * 100).toFixed(1)}%` : '0%'
    };
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧠 [CACHE] Cleaned up ${cleaned} expired entries`);
    }
  }
}

export const simpleCache = new SimpleCache();

/**
 * Cache middleware factory
 */
export function cacheResponse(ttlSeconds: number = 300) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${req.path}:${JSON.stringify(req.query)}:${(req as any).user?.uid || 'anonymous'}`;
    const cached = simpleCache.get(cacheKey);

    if (cached) {
      console.log(`🧠 [CACHE] Cache hit: ${req.path}`);
      return res.json(cached);
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      if (res.statusCode === 200) {
        simpleCache.set(cacheKey, data, ttlSeconds);
        console.log(`🧠 [CACHE] Cached response: ${req.path} (${ttlSeconds}s TTL)`);
      }
      return originalJson(data);
    };

    next();
  };
}

/**
 * Invalidate cache for specific patterns
 */
export function invalidateCache(pattern: string): void {
  const keys = Array.from(simpleCache['cache'].keys());
  let deleted = 0;
  
  for (const key of keys) {
    if (key.includes(pattern)) {
      simpleCache.delete(key);
      deleted++;
    }
  }
  
  console.log(`🧠 [CACHE] Invalidated ${deleted} entries matching: ${pattern}`);
}