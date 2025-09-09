/**
 * Cache Service
 * 
 * In-memory caching with TTL support
 * Production-ready caching layer
 * 
 * @module CacheService
 */

import logger from '../utils/logger.js';

interface CacheEntry {
  value: any;
  expires: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Run cleanup every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    logger.debug('Cache hit', { key });
    return entry.value as T;
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const expires = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expires });
    logger.debug('Cache set', { key, ttlSeconds });
  }

  /**
   * Delete specific key or pattern
   */
  async clear(pattern: string): Promise<void> {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      const keysToDelete: string[] = [];
      
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => this.cache.delete(key));
      logger.debug('Cache cleared by pattern', { pattern, cleared: keysToDelete.length });
    } else {
      this.cache.delete(pattern);
      logger.debug('Cache cleared', { key: pattern });
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('Cache cleared all', { entries: size });
  }

  /**
   * Get cache statistics
   */
  getStats(): { entries: number; size: number } {
    return {
      entries: this.cache.size,
      size: this.estimateSize()
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cache cleanup', { cleaned });
    }
  }

  /**
   * Estimate cache size in bytes
   */
  private estimateSize(): number {
    let size = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // Rough estimate for string size
      size += JSON.stringify(entry.value).length;
    }

    return size;
  }

  /**
   * Destroy cache service
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Export singleton instance
export const cacheService = new CacheService();