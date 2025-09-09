/**
 * League Standings Service
 * 
 * Business logic layer for league standings
 * Implements Clean Architecture principles with separation of concerns
 * 
 * @module LeagueStandingsService
 */

import { getPrismaClient } from '../../database.js';
import { LeagueStandingsRepository } from '../../repositories/leagues/standings.repository.js';
import { CacheService } from '../cache.service.js';
import logger from '../../utils/logger.js';
import { LeagueStanding, TeamStanding, StandingsHistory } from '../../types/leagues.types.js';
import type { League } from '@shared/types/models';


export class LeagueStandingsService {
  private repository: LeagueStandingsRepository;
  private cache: CacheService;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor() {
    this.repository = new LeagueStandingsRepository();
    this.cache = new CacheService();
  }

  /**
   * Get standings for a league or subdivision
   */
  async getStandings(
    leagueId: number,
    subdivision?: string,
    includeStats: boolean = false
  ): Promise<LeagueStanding[]> {
    const cacheKey = `standings:${leagueId}:${subdivision || 'all'}:${includeStats}`;
    
    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      logger.debug('Returning cached standings', { leagueId, subdivision });
      return cached;
    }

    try {
      // Get current season
      const prisma = await getPrismaClient();
      const currentSeason = await prisma.season.findFirst({
        where: { 
          isActive: true,
          leagueId: leagueId
        }
      });

      if (!currentSeason) {
        logger.warn('No active season found', { leagueId });
        return [];
      }

      // Fetch standings from repository
      const standings = await this.repository.getStandings(
        leagueId,
        currentSeason.id,
        subdivision,
        includeStats
      );

      // Calculate additional metrics
      const enhancedStandings = this.calculateStandingsMetrics(standings);

      // Cache the results
      await this.cache.set(cacheKey, enhancedStandings, this.CACHE_TTL);

      return enhancedStandings;
    } catch (error) {
      logger.error('Error fetching standings', { error, leagueId, subdivision });
      throw new Error('Failed to fetch league standings');
    }
  }

  /**
   * Get detailed standing for a specific team
   */
  async getTeamStanding(
    teamId: number
  ): Promise<TeamStanding | null> {
    try {
      // Need to get leagueId from team
      const prisma = await getPrismaClient();
      const team = await prisma.team.findUnique({ 
        where: { id: teamId },
        select: { division: true }
      });
      if (!team) return null;
      
      const standings = await this.getStandings(team.division, undefined, true);
      const teamStanding = standings.find(s => s.teamId === teamId);

      if (!teamStanding) {
        return null;
      }

      // Fetch additional team-specific data
      const recentForm = await this.repository.getTeamRecentForm(teamId, 5);
      const headToHead = await this.repository.getHeadToHeadStats(teamId);

      return {
        ...teamStanding,
        recentForm,
        headToHead,
        projectedFinish: this.calculateProjectedFinish(teamStanding, standings)
      };
    } catch (error) {
      logger.error('Error fetching team standing', { error, teamId });
      throw new Error('Failed to fetch team standing');
    }
  }

  /**
   * Recalculate standings (admin function)
   */
  async recalculateStandings(
    leagueId: number,
    subdivision?: string,
    force: boolean = false): Promise<{ updated: number; message: string }> {
    try {
      // Clear cache if forcing recalculation
      if (force) {
        await this.cache.clear(`standings:${leagueId}:*`);
      }

      // Get all completed games for the current season
      const prisma = await getPrismaClient();
      const currentSeason = await prisma.season.findFirst({
        where: { 
          isActive: true,
          leagueId: leagueId
        }
      });

      if (!currentSeason) {
        throw new Error('No active season found');
      }

      // Recalculate standings from games
      const updated = await this.repository.recalculateFromGames(
        leagueId,
        currentSeason.id,
        subdivision
      );

      // Clear all related caches
      await this.cache.clear(`standings:${leagueId}:*`);

      logger.info('Standings recalculated', { leagueId, subdivision, updated });

      return {
        updated,
        message: `Successfully recalculated standings for ${updated} teams`
      };
    } catch (error) {
      logger.error('Error recalculating standings', { error, leagueId });
      throw new Error('Failed to recalculate standings');
    }
  }

  /**
   * Get historical standings data
   */
  async getStandingsHistory(
    leagueId: number,
    days: number): Promise<StandingsHistory[]> {
    try {
      return await this.repository.getStandingsHistory(leagueId, days);
    } catch (error) {
      logger.error('Error fetching standings history', { error, leagueId });
      throw new Error('Failed to fetch standings history');
    }
  }

  /**
   * Check if user has admin permissions
   */
  async checkAdminPermissions(userId: string): Promise<boolean> {
    try {
      const prisma = await getPrismaClient();
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId }
      });

      // Check for admin role or specific admin list
      return userProfile?.role === 'ADMIN' || 
             ['dev-user-123'].includes(userId);
    } catch (error) {
      logger.error('Error checking admin permissions', { error, userId });
      return false;
    }
  }

  /**
   * Calculate additional standings metrics
   */
  private calculateStandingsMetrics(standings: any[]): LeagueStanding[] {
    return standings.map((standing, index) => ({
      ...standing,
      position: index + 1,
      gamesPlayed: standing.wins + standing.losses + standing.draws,
      winPercentage: this.calculateWinPercentage(standing),
      pointsPerGame: this.calculatePointsPerGame(standing),
      form: this.calculateForm(standing.recentGames),
      streak: this.calculateStreak(standing.recentGames)
    }));
  }

  /**
   * Calculate win percentage
   */
  private calculateWinPercentage(standing: any): number {
    const total = standing.wins + standing.losses + standing.draws;
    if (total === 0) return 0;
    return Math.round((standing.wins / total) * 1000) / 10;
  }

  /**
   * Calculate points per game
   */
  private calculatePointsPerGame(standing: any): number {
    const gamesPlayed = standing.wins + standing.losses + standing.draws;
    if (gamesPlayed === 0) return 0;
    return Math.round((standing.points / gamesPlayed) * 10) / 10;
  }

  /**
   * Calculate recent form (W/D/L for last 5 games)
   */
  private calculateForm(recentGames: any[]): string {
    if (!recentGames || recentGames.length === 0) return '-';
    
    return recentGames
      .slice(0, 5)
      .map(game => {
        if (game.result === 'WIN') return 'W';
        if (game.result === 'DRAW') return 'D';
        return 'L';
      })
      .join('');
  }

  /**
   * Calculate current streak
   */
  private calculateStreak(recentGames: any[]): string {
    if (!recentGames || recentGames.length === 0) return '-';
    
    const lastResult = recentGames[0].result;
    let count = 1;
    
    for (let i = 1; i < recentGames.length; i++) {
      if (recentGames[i].result === lastResult) {
        count++;
      } else {
        break;
      }
    }
    
    const prefix = lastResult === 'WIN' ? 'W' : lastResult === 'DRAW' ? 'D' : 'L';
    return `${prefix}${count}`;
  }

  /**
   * Calculate projected finish position
   */
  private calculateProjectedFinish(
    teamStanding: any,
    allStandings: any[]
  ): number {
    // Simple projection based on current points per game
    const remainingGames = 14 - teamStanding.gamesPlayed;
    const projectedPoints = teamStanding.points + 
      (teamStanding.pointsPerGame * remainingGames);
    
    // Count how many teams would be ahead
    let position = 1;
    for (const standing of allStandings) {
      if (standing.teamId === teamStanding.teamId) continue;
      
      const otherProjected = standing.points + 
        (standing.pointsPerGame * (14 - standing.gamesPlayed));
      
      if (otherProjected > projectedPoints) {
        position++;
      }
    }
    
    return position;
  }
}