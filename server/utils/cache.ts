/**
 * Redis Caching Service
 * Implements caching for frequently accessed data
 */
import Redis from 'ioredis.js';

class CacheService {
  private redis: Redis | null = null;
  private memoryCache: Map<string, { data: any; expires: number }> = new Map();
  private readonly DEFAULT_TTL = 300; // 5 minutes

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        console.log('✅ Redis connection established');
      } else {
        console.log('📝 Redis not configured, using memory cache');
      }
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      this.redis = null;
    }
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redis) {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      }
      
      // Fallback to memory cache
      const cached = this.memoryCache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.data;
      }
      
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  async set(key: string, data: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.setex(key, ttl, JSON.stringify(data));
        return;
      }
      
      // Fallback to memory cache
      this.memoryCache.set(key, {
        data,
        expires: Date.now() + (ttl * 1000)
      });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key);
      }
      this.memoryCache.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.flushall();
      }
      this.memoryCache.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get or set cached data with function
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFunction();
    await this.set(key, data, ttl);
    return data;
  }

  /**
   * Cache with tags for batch invalidation
   */
  async setWithTags(key: string, data: any, tags: string[], ttl: number = this.DEFAULT_TTL): Promise<void> {
    await this.set(key, data, ttl);
    
    // Store tag relationships
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const taggedKeys = await this.get<string[]>(tagKey) || [];
      if (!taggedKeys.includes(key)) {
        taggedKeys.push(key);
        await this.set(tagKey, taggedKeys, ttl);
      }
    }
  }

  /**
   * Invalidate all keys with specific tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    const tagKey = `tag:${tag}`;
    const taggedKeys = await this.get<string[]>(tagKey) || [];
    
    for (const key of taggedKeys) {
      await this.delete(key);
    }
    
    await this.delete(tagKey);
  }

  /**
   * Cache keys for common queries
   */
  static keys = {
    team: (teamId: number) => `team:${teamId}`,
    teamPlayers: (teamId: number) => `team:${teamId}:players`,
    teamStats: (teamId: number) => `team:${teamId}:stats`,
    leagueStandings: (leagueId: number) => `league:${leagueId}:standings`,
    playerStats: (playerId: number) => `player:${playerId}:stats`,
    matchStats: (matchId: number) => `match:${matchId}:stats`,
    tournamentBracket: (tournamentId: string) => `tournament:${tournamentId}:bracket`,
    userProfile: (userId: number) => `user:${userId}:profile`,
    gameEvents: (gameId: number) => `game:${gameId}:events`,
    marketplaceListings: () => 'marketplace:listings',
    seasonStats: (seasonId: string) => `season:${seasonId}:stats`,
  };

  /**
   * Common cache tags
   */
  static tags = {
    teams: 'teams',
    players: 'players',
    matches: 'matches',
    tournaments: 'tournaments',
    leagues: 'leagues',
    marketplace: 'marketplace',
    seasons: 'seasons',
  };
}

export const cacheService = new CacheService();
export default cacheService;