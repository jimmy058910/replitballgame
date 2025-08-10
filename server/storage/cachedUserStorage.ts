/**
 * CACHED USER STORAGE
 * Wraps userStorage with intelligent caching to reduce database queries
 */

import { userStorage } from './userStorage.js';
import { memoryCache } from '../utils/memoryCache';
import type { UserProfile } from "@prisma/client";

export class CachedUserStorage {
  // Cache TTL configurations
  private readonly USER_PROFILE_TTL = 15 * 60 * 1000; // 15 minutes
  private readonly NDA_STATUS_TTL = 30 * 60 * 1000; // 30 minutes (rarely changes)
  
  /**
   * Get user with caching
   */
  async getUser(userId: string): Promise<UserProfile | null> {
    const cacheKey = `user:${userId}`;
    
    return await memoryCache.getOrSet(
      cacheKey,
      () => userStorage.getUser(userId),
      this.USER_PROFILE_TTL
    );
  }
  
  /**
   * Get user by email with caching
   */
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const cacheKey = `user:email:${email}`;
    
    return await memoryCache.getOrSet(
      cacheKey,
      () => userStorage.getUserByEmail(email),
      this.USER_PROFILE_TTL
    );
  }
  
  /**
   * Upsert user and invalidate cache
   */
  async upsertUser(userData: any): Promise<UserProfile> {
    const user = await userStorage.upsertUser(userData);
    
    // Invalidate related cache entries
    memoryCache.delete(`user:${user.userId}`);
    if (user.email) {
      memoryCache.delete(`user:email:${user.email}`);
    }
    memoryCache.delete(`nda:${user.userId}`);
    
    console.log(`🧠 [CACHE] Invalidated cache for user: ${user.userId}`);
    return user;
  }
  
  /**
   * Check NDA acceptance with caching
   */
  async checkNDAAcceptance(userId: string): Promise<boolean> {
    const cacheKey = `nda:${userId}`;
    
    return await memoryCache.getOrSet(
      cacheKey,
      () => userStorage.checkNDAAcceptance(userId),
      this.NDA_STATUS_TTL
    );
  }
  
  /**
   * Accept NDA and invalidate cache
   */
  async acceptNDA(userId: string, version: string): Promise<UserProfile> {
    const user = await userStorage.acceptNDA(userId, version);
    
    // Invalidate NDA and user cache
    memoryCache.delete(`nda:${userId}`);
    memoryCache.delete(`user:${userId}`);
    if (user.email) {
      memoryCache.delete(`user:email:${user.email}`);
    }
    
    console.log(`🧠 [CACHE] Invalidated NDA cache for user: ${userId}`);
    return user;
  }
  
  /**
   * Clear all user-related cache entries
   */
  clearUserCache(userId: string): void {
    memoryCache.delete(`user:${userId}`);
    memoryCache.delete(`nda:${userId}`);
    memoryCache.invalidatePattern(`user:email:`);
    console.log(`🧠 [CACHE] Cleared all cache for user: ${userId}`);
  }
}

export const cachedUserStorage = new CachedUserStorage();