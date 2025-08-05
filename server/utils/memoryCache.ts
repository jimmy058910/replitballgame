/**
 * SIMPLE IN-MEMORY CACHING SYSTEM
 * Reduces database queries by caching frequently accessed data
 */

interface CacheItem<T> {
  data: T;
  expiry: number;
  key: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0
  };
  
  // Cache configuration
  private readonly maxSize = 1000; // Maximum cache entries
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes default
  
  constructor() {
    // Cleanup expired entries every 2 minutes
    setInterval(() => this.cleanup(), 2 * 60 * 1000);
    console.log('🧠 [CACHE] In-memory cache initialized with 5-minute default TTL');
  }
  
  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }
    
    this.stats.hits++;
    return item.data;
  }
  
  /**
   * Set data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const expiry = Date.now() + (ttlMs || this.defaultTTL);
    
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    this.cache.set(key, { data, expiry, key });
    this.stats.sets++;
  }
  
  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    console.log(`🧠 [CACHE] Cleared ${size} cache entries`);
  }
  
  /**
   * Get or set pattern - executes function if cache miss
   */
  async getOrSet<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    console.log(`🧠 [CACHE] Cache miss for ${key} - fetching from database`);
    const data = await fetchFn();
    this.set(key, data, ttlMs);
    return data;
  }
  
  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    this.stats.deletes += deleted;
    console.log(`🧠 [CACHE] Invalidated ${deleted} entries matching pattern: ${pattern}`);
    return deleted;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { size: number; hitRate: string } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) : '0.0';
    
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: `${hitRate}%`
    };
  }
  
  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.stats.evictions += cleaned;
      console.log(`🧠 [CACHE] Cleaned up ${cleaned} expired entries`);
    }
  }
  
  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    // Simple LRU: remove first entry (oldest)
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
      this.stats.evictions++;
    }
  }
}

// Singleton instance
export const memoryCache = new MemoryCache();