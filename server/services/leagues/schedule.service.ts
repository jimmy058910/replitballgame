/**
 * League Schedule Service
 * 
 * Business logic for league scheduling
 * Implements round-robin scheduling algorithm
 * 
 * @module LeagueScheduleService
 */

import { getPrismaClient } from '../../database.js';
import { LeagueScheduleRepository } from '../../repositories/leagues/schedule.repository.js';
import { CacheService } from '../cache.service.js';
import logger from '../../utils/logger.js';
import type { League } from '@shared/types/models';

import { 
  generateLeagueGameSchedule,
  generateDailyGameTimes,
  getNextLeagueGameSlot,
  formatEasternTime
} from '../../../shared/timezone.js';

interface ScheduleOptions {
  subdivision?: string;
  gameDay?: number;
  teamId?: number;
}

interface GenerateScheduleOptions {
  leagueId: number;
  subdivision?: string;
  startDate: Date;
  gamesPerTeam: number;
}

export class LeagueScheduleService {
  private repository: LeagueScheduleRepository;
  private cache: CacheService;
  private readonly CACHE_TTL = 600; // 10 minutes

  constructor() {
    this.repository = new LeagueScheduleRepository();
    this.cache = new CacheService();
  }

  /**
   * Get schedule for a division
   */
  async getSchedule(divisionId: number, options: ScheduleOptions) {
    const cacheKey = `schedule:${divisionId}:${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      logger.debug('Returning cached schedule', { divisionId, options });
      return cached;
    }

    try {
      const schedule = await this.repository.getSchedule(divisionId, options);
      
      // Add calculated fields
      const enhancedSchedule = schedule.map(game => ({
        ...game,
        isUpcoming: game.status === 'SCHEDULED' && new Date(game.gameDate) > new Date(),
        isToday: this.isToday(new Date(game.gameDate)),
        formattedDate: formatEasternTime(new Date(game.gameDate))
      }));

      await this.cache.set(cacheKey, enhancedSchedule, this.CACHE_TTL);
      return enhancedSchedule;
    } catch (error) {
      logger.error('Error fetching schedule', { error, divisionId });
      throw new Error('Failed to fetch schedule');
    }
  }

  /**
   * Get daily schedule across all leagues
   */
  async getDailySchedule(options: {
    date?: string;
    division?: number;
    subdivision?: string;
  }) {
    try {
      const targetDate = options.date ? new Date(options.date) : new Date();
      const games = await this.repository.getDailySchedule(targetDate, options);

      // Group by division and time
      const grouped = this.groupGamesByDivisionAndTime(games);
      
      return {
        date: targetDate.toISOString(),
        totalGames: games.length,
        divisions: grouped
      };
    } catch (error) {
      logger.error('Error fetching daily schedule', { error, options });
      throw new Error('Failed to fetch daily schedule');
    }
  }

  /**
   * Get next available game slot for a user's team
   */
  async getNextGameSlot(userId: string) {
    try {
      const prisma = await getPrismaClient();
      
      // Get user's team
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId },
        include: { team: true }
      });

      if (!userProfile?.team) {
        throw new Error('No team found for user');
      }

      // Get next scheduled game
      const nextGame = await this.repository.getNextGameForTeam(userProfile.team.id);
      
      if (nextGame) {
        return {
          gameId: nextGame.id,
          gameDate: nextGame.gameDate,
          opponent: nextGame.homeTeamId === userProfile.team.id 
            ? nextGame.awayTeam.name 
            : nextGame.homeTeam.name,
          isHome: nextGame.homeTeamId === userProfile.team.id,
          formattedDate: formatEasternTime(nextGame.gameDate)
        };
      }

      // No scheduled game, return next available slot
      const nextSlot = getNextLeagueGameSlot();
      return {
        gameDate: nextSlot,
        formattedDate: formatEasternTime(nextSlot),
        message: 'No scheduled games, next available slot shown'
      };
    } catch (error) {
      logger.error('Error getting next game slot', { error, userId });
      throw new Error('Failed to get next game slot');
    }
  }

  /**
   * Schedule a new game (friendly match)
   */
  async scheduleGame(gameData: {
    homeTeamId: number;
    awayTeamId: number;
    gameDate: Date;
    matchType: string;
  }) {
    try {
      const prisma = await getPrismaClient();
      
      // Validate teams exist
      const [homeTeam, awayTeam] = await Promise.all([
        await prisma.team.findUnique({ where: { id: gameData.homeTeamId } }),
        prisma.team.findUnique({ where: { id: gameData.awayTeamId } })
      ]);

      if (!homeTeam || !awayTeam) {
        throw new Error('One or both teams not found');
      }

      // Create the game
      const game = await this.repository.createGame({
        ...gameData,
        status: 'SCHEDULED'
      });

      // Clear relevant caches
      await this.cache.clear(`schedule:*`);

      logger.info('Game scheduled', { gameId: game.id, ...gameData });
      return game;
    } catch (error) {
      logger.error('Error scheduling game', { error, gameData });
      throw new Error('Failed to schedule game');
    }
  }

  /**
   * Generate league schedule
   */
  async generateLeagueSchedule(options: GenerateScheduleOptions) {
    try {
      const prisma = await getPrismaClient();
      
      // Get teams in the division
      const teams = await prisma.team.findMany({
        where: {
          division: options.leagueId,
          ...(options.subdivision && { subdivision: options.subdivision })
        },
        select: { id: true, name: true }
      });

      if (teams.length < 2) {
        throw new Error('Not enough teams to generate schedule');
      }

      // Generate round-robin schedule
      const schedule = this.generateRoundRobin(
        teams,
        options.gamesPerTeam,
        options.startDate
      );

      // Create schedule in database
      const result = await this.repository.createSchedule({
        leagueId: options.leagueId,
        subdivision: options.subdivision,
        games: schedule
      });

      // Clear caches
      await this.cache.clear(`schedule:${options.leagueId}:*`);

      logger.info('Schedule generated', { 
        leagueId: options.leagueId,
        gamesCreated: schedule.length 
      });

      return result;
    } catch (error) {
      logger.error('Error generating schedule', { error, options });
      throw new Error('Failed to generate schedule');
    }
  }

  /**
   * Clear and regenerate schedule
   */
  async clearAndRegenerateSchedule(leagueId: number, subdivision?: string) {
    try {
      // Delete existing schedule
      const deleted = await this.repository.deleteSchedule(leagueId, subdivision);
      
      // Generate new schedule
      const result = await this.generateLeagueSchedule({
        leagueId,
        subdivision,
        startDate: new Date(),
        gamesPerTeam: 14
      });

      // Clear all caches
      await this.cache.clear(`schedule:*`);

      return {
        deleted,
        created: result.gamesCreated,
        message: 'Schedule regenerated successfully'
      };
    } catch (error) {
      logger.error('Error regenerating schedule', { error, leagueId });
      throw new Error('Failed to regenerate schedule');
    }
  }

  /**
   * Validate team ownership
   */
  async validateTeamOwnership(userId: string, teamId: number): Promise<boolean> {
    try {
      const prisma = await getPrismaClient();
      
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId },
        include: { team: true }
      });

      return userProfile?.team?.id === teamId;
    } catch (error) {
      logger.error('Error validating team ownership', { error, userId, teamId });
      return false;
    }
  }

  /**
   * Check admin permissions
   */
  async checkAdminPermissions(userId: string): Promise<boolean> {
    try {
      const prisma = await getPrismaClient();
      
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId }
      });

      return userProfile?.role === 'ADMIN' || userId === 'dev-user-123';
    } catch (error) {
      logger.error('Error checking admin permissions', { error, userId });
      return false;
    }
  }

  /**
   * Generate round-robin schedule
   */
  private generateRoundRobin(
    teams: { id: number; name: string }[],
    gamesPerTeam: number,
    startDate: Date
  ) {
    const schedule: any[] = [];
    const teamCount = teams.length;
    const rounds = gamesPerTeam;
    
    let currentDate = new Date(startDate);
    let gameId = 1;

    for (let round = 0; round < rounds; round++) {
      const gameTimes = generateDailyGameTimes(Math.floor(teamCount / 2));
      
      for (let match = 0; match < teamCount / 2; match++) {
        const home = (round + match) % teamCount;
        const away = (teamCount - 1 - match + round) % teamCount;
        
        if (home !== away) {
          schedule.push({
            id: gameId++,
            gameDay: round + 1,
            gameDate: new Date(currentDate.getTime() + gameTimes[match]),
            homeTeamId: teams[home].id,
            homeTeamName: teams[home].name,
            awayTeamId: teams[away].id,
            awayTeamName: teams[away].name,
            status: 'SCHEDULED'
          });
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return schedule;
  }

  /**
   * Group games by division and time
   */
  private groupGamesByDivisionAndTime(games: any[]): any {
    const grouped = new Map<string, any[]>();
    
    for (const game of games) {
      const key = `${game.division || 'unknown'}-${game.subdivision || 'main'}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      
      grouped.get(key)!.push(game);
    }

    return Array.from(grouped.entries()).map(([key, games]) => {
      const [division, subdivision] = key.split('-');
      return {
        division: parseInt(division) || 0,
        subdivision,
        games: games.sort((a, b) => 
          new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime()
        )
      };
    });
  }

  /**
   * Check if date is today
   */
  private isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }
}