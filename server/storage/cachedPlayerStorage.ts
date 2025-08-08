/**
 * CACHED PLAYER STORAGE
 * Wraps playerStorage with caching for player data
 */

import { storage } from './index';
import { memoryCache } from '../utils/memoryCache';
import type { Player } from '../../generated/prisma';

export class CachedPlayerStorage {
  private readonly PLAYERS_TTL = 8 * 60 * 1000; // 8 minutes (changes during training/games)
  private readonly PLAYER_TTL = 10 * 60 * 1000; // 10 minutes
  
  /**
   * Get players by team with caching
   */
  async getPlayersByTeam(teamId: number): Promise<Player[]> {
    const cacheKey = `players:team:${teamId}`;
    
    return await memoryCache.getOrSet(
      cacheKey,
      () => storage.players.getPlayersByTeamId(teamId),
      this.PLAYERS_TTL
    );
  }
  
  /**
   * Get single player with caching
   */
  async getPlayer(playerId: number): Promise<Player | null> {
    const cacheKey = `player:${playerId}`;
    
    return await memoryCache.getOrSet(
      cacheKey,
      () => storage.players.getPlayerById(playerId),
      this.PLAYER_TTL
    );
  }
  
  /**
   * Update player and invalidate cache
   */
  async updatePlayer(playerId: number, updateData: any): Promise<Player> {
    const player = await storage.players.updatePlayer(playerId, updateData);
    
    if (!player) {
      throw new Error(`Player with ID ${playerId} not found`);
    }
    
    // Invalidate player and team cache
    memoryCache.delete(`player:${playerId}`);
    if (player.teamId) {
      memoryCache.delete(`players:team:${player.teamId}`);
    }
    
    console.log(`🧠 [CACHE] Updated player and invalidated cache: ${playerId}`);
    return player;
  }
  
  /**
   * Clear player cache
   */
  clearPlayerCache(teamId?: number): void {
    if (teamId) {
      memoryCache.delete(`players:team:${teamId}`);
      memoryCache.invalidatePattern(`player:`);
    } else {
      memoryCache.invalidatePattern('players:team:');
      memoryCache.invalidatePattern('player:');
    }
    console.log(`🧠 [CACHE] Cleared player cache${teamId ? ` for team: ${teamId}` : ' (all players)'}`);
  }
}

export const cachedPlayerStorage = new CachedPlayerStorage();