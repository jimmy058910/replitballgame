/**
 * CACHED TEAM STORAGE
 * Wraps teamStorage with intelligent caching for team-related queries
 */

import { storage } from './index';
import { memoryCache } from '../utils/memoryCache';
import type { Team } from '../../generated/prisma';

export class CachedTeamStorage {
  // Cache TTL configurations
  private readonly TEAM_DATA_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly USER_TEAM_TTL = 15 * 60 * 1000; // 15 minutes
  
  /**
   * Get team with caching
   */
  async getTeam(teamId: number): Promise<Team | null> {
    const cacheKey = `team:${teamId}`;
    
    return await memoryCache.getOrSet(
      cacheKey,
      () => storage.getTeam(teamId),
      this.TEAM_DATA_TTL
    );
  }
  
  /**
   * Get user's team with caching
   */
  async getUserTeam(userProfileId: number): Promise<Team | null> {
    const cacheKey = `user-team:${userProfileId}`;
    
    return await memoryCache.getOrSet(
      cacheKey,
      () => storage.getUserTeam(userProfileId),
      this.USER_TEAM_TTL
    );
  }
  
  /**
   * Create team and invalidate cache
   */
  async createTeam(teamData: any): Promise<Team> {
    const team = await storage.createTeam(teamData);
    
    // Invalidate user's team cache
    memoryCache.delete(`user-team:${teamData.userProfileId}`);
    
    console.log(`🧠 [CACHE] Created team and invalidated cache for user: ${teamData.userProfileId}`);
    return team;
  }
  
  /**
   * Delete team and invalidate cache
   */
  async deleteTeam(teamId: number): Promise<void> {
    await storage.deleteTeam(teamId);
    
    // Invalidate all related cache entries
    memoryCache.delete(`team:${teamId}`);
    memoryCache.invalidatePattern(`user-team:`);
    memoryCache.invalidatePattern(`players:team:${teamId}`);
    memoryCache.invalidatePattern(`staff:team:${teamId}`);
    
    console.log(`🧠 [CACHE] Deleted team and invalidated related cache: ${teamId}`);
  }
  
  /**
   * Update team and invalidate cache
   */
  async updateTeam(teamId: number, updateData: any): Promise<Team> {
    const team = await storage.updateTeam(teamId, updateData);
    
    // Invalidate team cache
    memoryCache.delete(`team:${teamId}`);
    if (team.userProfileId) {
      memoryCache.delete(`user-team:${team.userProfileId}`);
    }
    
    console.log(`🧠 [CACHE] Updated team and invalidated cache: ${teamId}`);
    return team;
  }
  
  /**
   * Clear all team-related cache
   */
  clearTeamCache(teamId?: number): void {
    if (teamId) {
      memoryCache.delete(`team:${teamId}`);
      memoryCache.invalidatePattern(`players:team:${teamId}`);
      memoryCache.invalidatePattern(`staff:team:${teamId}`);
    } else {
      memoryCache.invalidatePattern('team:');
      memoryCache.invalidatePattern('user-team:');
      memoryCache.invalidatePattern('players:team:');
      memoryCache.invalidatePattern('staff:team:');
    }
    console.log(`🧠 [CACHE] Cleared team cache${teamId ? ` for team: ${teamId}` : ' (all teams)'}`);
  }
}

export const cachedTeamStorage = new CachedTeamStorage();