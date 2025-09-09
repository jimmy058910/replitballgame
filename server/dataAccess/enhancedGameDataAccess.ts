/**
 * ENHANCED GAME DATA ACCESS LAYER
 * 
 * Production-grade data access facade for all game and match-related operations.
 * Implements caching, query optimization, and standardized error handling.
 * 
 * This consolidates functionality from:
 * - gameStorage.ts
 * - scheduleStorage.ts
 * - leagueStorage.ts
 * - seasonStorage.ts
 */

import {
  PrismaClient,
  Game,
  League,
  LeagueStanding,
  Season,
  Schedule,
  PlayerMatchStats,
  TeamMatchStats,
  Prisma,
  GameStatus,
  MatchType,
  SeasonPhase
} from '../../prisma/generated/client';

import {
  getPrismaClient,
  executePrismaOperation,
  executePrismaTransaction,
  PrismaError
} from '../utils/prismaUtils';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface CachedResult<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface GameQueryOptions {
  includeTeams?: boolean;
  includeStats?: boolean;
  includeTournament?: boolean;
  includeLeague?: boolean;
}

interface ScheduleQueryOptions {
  division?: number;
  subdivision?: string;
  gameDay?: number;
  status?: GameStatus;
  includeGames?: boolean;
}

interface StandingsOptions {
  division: number;
  subdivision?: string;
  seasonId?: string;
}

interface GameCreationData {
  homeTeamId: number;
  awayTeamId: number;
  gameDate: Date;
  matchType: MatchType;
  leagueId?: number;
  tournamentId?: number;
  scheduleId?: string;
  seasonId?: string;
  gameDay?: number;
  subdivision?: string;
}

interface GameUpdateData {
  homeScore?: number;
  awayScore?: number;
  status?: GameStatus;
  simulated?: boolean;
  simulationLog?: any;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  orderBy?: any;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

class CacheManager {
  private static cache = new Map<string, CachedResult<any>>();
  private static DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private static SHORT_TTL = 30 * 1000; // 30 seconds for frequently changing data

  static get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  static set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    });
  }

  static invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  static invalidateGame(gameId: number): void {
    this.invalidate(`game-${gameId}`);
  }

  static invalidateSchedule(scheduleId: string): void {
    this.invalidate(`schedule-${scheduleId}`);
  }

  static invalidateStandings(division: number): void {
    this.invalidate(`standings-${division}`);
  }
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

class QueryHelpers {
  static getGameIncludes(options: GameQueryOptions = {}): any {
    return {
      homeTeam: options.includeTeams && {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          division: true,
          subdivision: true
        }
      },
      awayTeam: options.includeTeams && {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          division: true,
          subdivision: true
        }
      },
      playerMatchStats: options.includeStats,
      teamMatchStats: options.includeStats,
      tournament: options.includeTournament && {
        select: {
          id: true,
          name: true,
          type: true,
          status: true
        }
      },
      league: options.includeLeague && {
        select: {
          id: true,
          name: true,
          division: true
        }
      }
    };
  }

  static getPaginationParams(options: PaginationOptions = {}) {
    const { page = 1, limit = 20, cursor, orderBy } = options;
    
    if (cursor) {
      return {
        take: limit,
        skip: 1,
        cursor: { id: parseInt(cursor) },
        orderBy: orderBy || { id: 'asc' }
      };
    }

    return {
      skip: (page - 1) * limit,
      take: limit,
      orderBy: orderBy || { id: 'asc' }
    };
  }
}

// ============================================================================
// ENHANCED GAME DATA ACCESS
// ============================================================================

export class EnhancedGameDataAccess {
  
  // ==========================================================================
  // GAME OPERATIONS
  // ==========================================================================

  /**
   * Get game by ID with options for includes
   */
  static async getGame(
    gameId: number,
    options: GameQueryOptions = {}
  ): Promise<Game | null> {
    const cacheKey = `game-${gameId}-${JSON.stringify(options)}`;
    const cached = CacheManager.get<Game>(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.game.findUnique({
          where: { id: gameId },
          include: QueryHelpers.getGameIncludes(options)
        });
      },
      `getGame(${gameId})`
    );

    if (result) {
      const ttl = result.status === 'COMPLETED' ? CacheManager.DEFAULT_TTL : CacheManager.SHORT_TTL;
      CacheManager.set(cacheKey, result, ttl);
    }

    return result;
  }

  /**
   * Get games for a specific schedule with pagination
   */
  static async getScheduleGames(
    scheduleId: string,
    options: PaginationOptions & GameQueryOptions = {}
  ): Promise<Game[]> {
    const cacheKey = `games-schedule-${scheduleId}-${JSON.stringify(options)}`;
    const cached = CacheManager.get<Game[]>(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.game.findMany({
          where: { scheduleId },
          ...QueryHelpers.getPaginationParams(options),
          include: QueryHelpers.getGameIncludes(options),
          orderBy: options.orderBy || { gameDate: 'asc' }
        });
      },
      `getScheduleGames(${scheduleId})`
    );

    CacheManager.set(cacheKey, result, CacheManager.SHORT_TTL);
    return result;
  }

  /**
   * Get games for a specific team
   */
  static async getTeamGames(
    teamId: number,
    options: {
      matchType?: MatchType;
      status?: GameStatus;
      limit?: number;
      includeStats?: boolean;
    } = {}
  ): Promise<Game[]> {
    const cacheKey = `games-team-${teamId}-${JSON.stringify(options)}`;
    const cached = CacheManager.get<Game[]>(cacheKey);
    if (cached) return cached;

    const where: any = {
      OR: [
        { homeTeamId: teamId },
        { awayTeamId: teamId }
      ]
    };

    if (options.matchType) {
      where.matchType = options.matchType;
    }
    if (options.status) {
      where.status = options.status;
    }

    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.game.findMany({
          where,
          take: options.limit || 20,
          include: {
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } },
            ...(options.includeStats && {
              playerMatchStats: true,
              teamMatchStats: true
            })
          },
          orderBy: { gameDate: 'desc' }
        });
      },
      `getTeamGames(${teamId})`
    );

    CacheManager.set(cacheKey, result, CacheManager.SHORT_TTL);
    return result;
  }

  /**
   * Get upcoming games across all leagues
   */
  static async getUpcomingGames(
    limit = 10,
    matchType?: MatchType
  ): Promise<Game[]> {
    const cacheKey = `games-upcoming-${limit}-${matchType || 'all'}`;
    const cached = CacheManager.get<Game[]>(cacheKey);
    if (cached) return cached;

    const where: any = {
      status: 'SCHEDULED',
      gameDate: { gte: new Date() }
    };

    if (matchType) {
      where.matchType = matchType;
    }

    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.game.findMany({
          where,
          take: limit,
          include: {
            homeTeam: { select: { id: true, name: true, logoUrl: true } },
            awayTeam: { select: { id: true, name: true, logoUrl: true } },
            league: { select: { name: true, division: true } },
            tournament: { select: { name: true, type: true } }
          },
          orderBy: { gameDate: 'asc' }
        });
      },
      `getUpcomingGames(${limit})`
    );

    CacheManager.set(cacheKey, result, CacheManager.SHORT_TTL);
    return result;
  }

  /**
   * Create a new game
   */
  static async createGame(data: GameCreationData): Promise<Game> {
    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.game.create({
          data: {
            homeTeamId: data.homeTeamId,
            awayTeamId: data.awayTeamId,
            gameDate: data.gameDate,
            matchType: data.matchType,
            leagueId: data.leagueId,
            tournamentId: data.tournamentId,
            scheduleId: data.scheduleId,
            seasonId: data.seasonId,
            gameDay: data.gameDay,
            subdivision: data.subdivision,
            status: 'SCHEDULED'
          }
        });
      },
      'createGame'
    );

    // Invalidate relevant caches
    if (data.scheduleId) {
      CacheManager.invalidateSchedule(data.scheduleId);
    }
    CacheManager.invalidate('games-upcoming');

    return result;
  }

  /**
   * Update game result and status
   */
  static async updateGame(
    gameId: number,
    updates: GameUpdateData
  ): Promise<Game> {
    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.game.update({
          where: { id: gameId },
          data: updates
        });
      },
      `updateGame(${gameId})`
    );

    // Invalidate caches
    CacheManager.invalidateGame(gameId);
    if (result.scheduleId) {
      CacheManager.invalidateSchedule(result.scheduleId);
    }
    if (result.homeTeamId && result.awayTeamId) {
      CacheManager.invalidate(`games-team-${result.homeTeamId}`);
      CacheManager.invalidate(`games-team-${result.awayTeamId}`);
    }

    return result;
  }

  /**
   * Bulk create games for a schedule
   */
  static async createScheduleGames(
    games: GameCreationData[]
  ): Promise<number> {
    const result = await executePrismaTransaction(async (tx) => {
      const created = await tx.game.createMany({
        data: games.map(game => ({
          ...game,
          status: 'SCHEDULED' as GameStatus
        }))
      });
      return created.count;
    });

    // Invalidate schedule caches
    const scheduleIds = [...new Set(games.map(g => g.scheduleId).filter(Boolean))];
    scheduleIds.forEach(id => {
      if (id) CacheManager.invalidateSchedule(id);
    });

    return result;
  }

  // ==========================================================================
  // SCHEDULE OPERATIONS
  // ==========================================================================

  /**
   * Get current schedule for a division
   */
  static async getCurrentSchedule(
    division: number,
    subdivision?: string
  ): Promise<Schedule | null> {
    const cacheKey = `schedule-current-${division}-${subdivision || 'all'}`;
    const cached = CacheManager.get<Schedule>(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        const where: any = {
          division,
          isActive: true
        };

        if (subdivision) {
          where.subdivision = subdivision;
        }

        return await prisma.schedule.findFirst({
          where,
          include: {
            season: true
          }
        });
      },
      `getCurrentSchedule(${division}, ${subdivision})`
    );

    if (result) {
      CacheManager.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Get schedule by ID with games
   */
  static async getScheduleWithGames(scheduleId: string): Promise<any> {
    const cacheKey = `schedule-full-${scheduleId}`;
    const cached = CacheManager.get(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        const schedule = await prisma.schedule.findUnique({
          where: { id: scheduleId },
          include: {
            season: true
          }
        });

        if (!schedule) return null;

        const games = await prisma.game.findMany({
          where: { scheduleId },
          include: {
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } }
          },
          orderBy: [
            { gameDay: 'asc' },
            { gameDate: 'asc' }
          ]
        });

        return {
          ...schedule,
          games
        };
      },
      `getScheduleWithGames(${scheduleId})`
    );

    if (result) {
      CacheManager.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Create new schedule
   */
  static async createSchedule(
    seasonId: string,
    division: number,
    subdivision: string,
    totalGames: number
  ): Promise<Schedule> {
    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.schedule.create({
          data: {
            seasonId,
            division,
            subdivision,
            totalGames,
            isActive: true
          }
        });
      },
      'createSchedule'
    );

    CacheManager.invalidate(`schedule-current-${division}`);
    return result;
  }

  // ==========================================================================
  // STANDINGS OPERATIONS
  // ==========================================================================

  /**
   * Get league standings with optimized query
   */
  static async getLeagueStandings(
    options: StandingsOptions
  ): Promise<LeagueStanding[]> {
    const cacheKey = `standings-${options.division}-${options.subdivision || 'all'}-${options.seasonId || 'current'}`;
    const cached = CacheManager.get<LeagueStanding[]>(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        // First get the league
        const league = await prisma.league.findFirst({
          where: {
            division: options.division,
            ...(options.seasonId && { seasonId: options.seasonId })
          }
        });

        if (!league) return [];

        // Get standings - LeagueStanding model has teamName, no team relation
        const standings = await prisma.leagueStanding.findMany({
          where: { leagueId: league.id },
          orderBy: [
            { rank: 'asc' },
            { wins: 'desc' },
            { pointDifferential: 'desc' }
          ]
        });

        // Note: Subdivision filtering would need to be done via Team lookup if needed
        // For now, return all standings since LeagueStanding doesn't have subdivision info directly

        return standings;
      },
      `getLeagueStandings(${options.division})`
    );

    CacheManager.set(cacheKey, result, CacheManager.SHORT_TTL);
    return result;
  }

  /**
   * Update standings after game completion
   */
  static async updateStandingsAfterGame(gameId: number): Promise<void> {
    await executePrismaTransaction(async (tx) => {
      // Get the game
      const game = await tx.game.findUnique({
        where: { id: gameId }
      });

      if (!game || !game.leagueId || game.homeScore === null || game.awayScore === null) {
        return;
      }

      // Calculate points
      const homeWon = game.homeScore > game.awayScore;
      const awayWon = game.awayScore > game.homeScore;
      const draw = game.homeScore === game.awayScore;

      // Update home team standings
      const homeStanding = await tx.leagueStanding.findFirst({
        where: {
          leagueId: game.leagueId!,
          teamId: game.homeTeamId
        }
      });

      if (homeStanding) {
        await tx.leagueStanding.update({
          where: { id: homeStanding.id },
          data: {
            gamesPlayed: { increment: 1 },
            wins: homeWon ? { increment: 1 } : undefined,
            losses: awayWon ? { increment: 1 } : undefined,
            draws: draw ? { increment: 1 } : undefined,
            points: { increment: homeWon ? 3 : (draw ? 1 : 0) },
            goalsFor: { increment: game.homeScore },
            goalsAgainst: { increment: game.awayScore },
            goalDifference: { increment: game.homeScore - game.awayScore }
          }
        });
      }

      // Update away team standings
      const awayStanding = await tx.leagueStanding.findFirst({
        where: {
          leagueId: game.leagueId!,
          teamId: game.awayTeamId
        }
      });

      if (awayStanding) {
        await tx.leagueStanding.update({
          where: { id: awayStanding.id },
          data: {
            gamesPlayed: { increment: 1 },
            wins: awayWon ? { increment: 1 } : undefined,
            losses: homeWon ? { increment: 1 } : undefined,
            draws: draw ? { increment: 1 } : undefined,
            points: { increment: awayWon ? 3 : (draw ? 1 : 0) },
            goalsFor: { increment: game.awayScore },
            goalsAgainst: { increment: game.homeScore },
            goalDifference: { increment: game.awayScore - game.homeScore }
          }
        });
      }

      // Update team records
      await tx.team.update({
        where: { id: game.homeTeamId },
        data: {
          wins: homeWon ? { increment: 1 } : undefined,
          losses: awayWon ? { increment: 1 } : undefined,
          draws: draw ? { increment: 1 } : undefined,
          points: { increment: homeWon ? 3 : (draw ? 1 : 0) }
        }
      });

      await tx.team.update({
        where: { id: game.awayTeamId },
        data: {
          wins: awayWon ? { increment: 1 } : undefined,
          losses: homeWon ? { increment: 1 } : undefined,
          draws: draw ? { increment: 1 } : undefined,
          points: { increment: awayWon ? 3 : (draw ? 1 : 0) }
        }
      });
    });

    // Invalidate standings cache - get game with leagueId for cache invalidation
    const gameForCache = await executePrismaOperation(
      async (prisma) => await prisma.game.findUnique({ 
        where: { id: gameId }, 
        include: { league: true } 
      }),
      'getGameForCacheInvalidation'
    );
    if (gameForCache?.league) {
      CacheManager.invalidateStandings(gameForCache.league.division);
    }
  }

  // ==========================================================================
  // SEASON OPERATIONS
  // ==========================================================================

  /**
   * Get current season
   */
  static async getCurrentSeason(): Promise<Season | null> {
    const cacheKey = 'season-current';
    const cached = CacheManager.get<Season>(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.season.findFirst({
          where: { phase: { not: 'COMPLETED' } },
          orderBy: { startDate: 'desc' }
        });
      },
      'getCurrentSeason'
    );

    if (result) {
      CacheManager.set(cacheKey, result, CacheManager.SHORT_TTL);
    }

    return result;
  }

  /**
   * Update season progress
   */
  static async updateSeasonDay(
    seasonId: string,
    currentDay: number,
    phase?: SeasonPhase
  ): Promise<Season> {
    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.season.update({
          where: { id: seasonId },
          data: {
            currentDay,
            ...(phase && { phase })
          }
        });
      },
      `updateSeasonDay(${seasonId}, ${currentDay})`
    );

    CacheManager.invalidate('season-current');
    return result;
  }

  // ==========================================================================
  // STATISTICS OPERATIONS
  // ==========================================================================

  /**
   * Save player match statistics
   */
  static async savePlayerMatchStats(
    stats: Omit<PlayerMatchStats, 'id'>[]
  ): Promise<number> {
    const result = await executePrismaTransaction(async (tx) => {
      const created = await tx.playerMatchStats.createMany({
        data: stats
      });
      return created.count;
    });

    // Invalidate game cache for affected games
    const gameIds = [...new Set(stats.map(s => s.gameId))];
    gameIds.forEach(id => CacheManager.invalidateGame(id));

    return result;
  }

  /**
   * Save team match statistics
   */
  static async saveTeamMatchStats(
    stats: Omit<TeamMatchStats, 'id'>[]
  ): Promise<number> {
    const result = await executePrismaTransaction(async (tx) => {
      const created = await tx.teamMatchStats.createMany({
        data: stats
      });
      return created.count;
    });

    // Invalidate game cache for affected games
    const gameIds = [...new Set(stats.map(s => s.gameId))];
    gameIds.forEach(id => CacheManager.invalidateGame(id));

    return result;
  }

  /**
   * Get aggregated player statistics
   */
  static async getPlayerSeasonStats(
    playerId: number,
    seasonId?: string
  ): Promise<any> {
    const cacheKey = `player-stats-${playerId}-${seasonId || 'all'}`;
    const cached = CacheManager.get(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        const where: any = { playerId };
        if (seasonId) {
          where.seasonId = seasonId;
        }

        const stats = await prisma.playerMatchStats.aggregate({
          where,
          _sum: {
            minutesPlayed: true,
            points: true,
            goals: true,
            assists: true,
            passes: true,
            passesCompleted: true,
            rushes: true,
            rushYards: true,
            blocks: true,
            blocksSuccess: true,
            tackles: true,
            interceptions: true,
            fumbles: true
          },
          _avg: {
            rating: true,
            stamina: true
          },
          _count: true
        });

        return {
          gamesPlayed: stats._count,
          totals: stats._sum,
          averages: stats._avg
        };
      },
      `getPlayerSeasonStats(${playerId})`
    );

    CacheManager.set(cacheKey, result);
    return result;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Clear all cached data
   */
  static clearCache(): void {
    CacheManager.invalidate();
  }

  /**
   * Clear cache for specific patterns
   */
  static clearCachePattern(pattern: string): void {
    CacheManager.invalidate(pattern);
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    const cache = (CacheManager as any).cache as Map<string, any>;
    return {
      size: cache.size,
      keys: Array.from(cache.keys())
    };
  }
}

// ============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================================================

export const gameStorage = {
  getGame: EnhancedGameDataAccess.getGame,
  getScheduleGames: EnhancedGameDataAccess.getScheduleGames,
  getTeamGames: EnhancedGameDataAccess.getTeamGames,
  createGame: EnhancedGameDataAccess.createGame,
  updateGame: EnhancedGameDataAccess.updateGame,
  createScheduleGames: EnhancedGameDataAccess.createScheduleGames
};

export const scheduleStorage = {
  getCurrentSchedule: EnhancedGameDataAccess.getCurrentSchedule,
  getScheduleWithGames: EnhancedGameDataAccess.getScheduleWithGames,
  createSchedule: EnhancedGameDataAccess.createSchedule
};

export const standingsStorage = {
  getLeagueStandings: EnhancedGameDataAccess.getLeagueStandings,
  updateStandingsAfterGame: EnhancedGameDataAccess.updateStandingsAfterGame
};

export const seasonStorage = {
  getCurrentSeason: EnhancedGameDataAccess.getCurrentSeason,
  updateSeasonDay: EnhancedGameDataAccess.updateSeasonDay
};