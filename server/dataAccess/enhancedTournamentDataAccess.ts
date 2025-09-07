/**
 * ENHANCED TOURNAMENT DATA ACCESS LAYER
 * 
 * Production-grade data access facade for all tournament and competition operations.
 * Implements caching, query optimization, and standardized error handling.
 * 
 * This consolidates functionality from:
 * - tournamentStorage.ts
 * - tournamentEntryStorage.ts
 * - bracketStorage.ts
 * - rewardStorage.ts
 */

import {
  PrismaClient,
  Tournament,
  TournamentEntry,
  Game,
  Team,
  Prisma,
  TournamentType,
  TournamentStatus,
  RewardType
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

interface TournamentQueryOptions {
  type?: TournamentType;
  status?: TournamentStatus;
  division?: number;
  includeEntries?: boolean;
  includeGames?: boolean;
  includePrizes?: boolean;
}

interface CreateTournamentData {
  name: string;
  type: TournamentType;
  division?: number;
  startTime: Date;
  registrationEndTime?: Date;
  entryFeeCredits?: bigint;
  entryFeeGems?: number;
  prizePool: any;
  maxEntries?: number;
  minEntries?: number;
  seasonDay?: number;
}

interface TournamentEntryData {
  tournamentId: number;
  teamId: number;
  seed?: number;
}

interface BracketMatchData {
  tournamentId: number;
  round: number;
  matchNumber: number;
  homeTeamId: number;
  awayTeamId: number;
  gameDate: Date;
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
  private static SHORT_TTL = 30 * 1000; // 30 seconds for active tournaments

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

  static invalidateTournament(tournamentId: number): void {
    this.invalidate(`tournament-${tournamentId}`);
  }
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

class QueryHelpers {
  static getTournamentIncludes(options: TournamentQueryOptions = {}): any {
    return {
      entries: options.includeEntries && {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              division: true,
              subdivision: true
            }
          }
        },
        orderBy: { seed: 'asc' as const }
      },
      games: options.includeGames && {
        include: {
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } }
        },
        orderBy: [
          { bracketRound: 'asc' as const },
          { bracketPosition: 'asc' as const }
        ]
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

  static serializePrizes(prizePool: any): any {
    if (!prizePool) return null;
    
    // Convert BigInt values in prize pool to strings
    const serialized = JSON.parse(JSON.stringify(prizePool, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
    
    return serialized;
  }
}

// ============================================================================
// BRACKET GENERATION HELPERS
// ============================================================================

class BracketGenerator {
  /**
   * Generate single elimination bracket
   */
  static generateSingleElimination(teams: number[]): BracketMatchData[] {
    const matches: BracketMatchData[] = [];
    const numTeams = teams.length;
    const rounds = Math.ceil(Math.log2(numTeams));
    
    // Shuffle teams for randomization if no seeding
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    
    // Generate first round matches
    let currentRoundTeams = shuffled;
    let matchNumber = 0;
    
    for (let round = 1; round <= rounds; round++) {
      const numMatches = Math.floor(currentRoundTeams.length / 2);
      const nextRoundTeams: number[] = [];
      
      for (let i = 0; i < numMatches; i++) {
        const homeTeamId = currentRoundTeams[i * 2];
        const awayTeamId = currentRoundTeams[i * 2 + 1];
        
        if (homeTeamId && awayTeamId) {
          matches.push({
            tournamentId: 0, // Will be set when creating
            round,
            matchNumber: matchNumber++,
            homeTeamId,
            awayTeamId,
            gameDate: new Date() // Will be set based on schedule
          });
        }
        
        // Placeholder for winner
        nextRoundTeams.push(0);
      }
      
      // Handle bye if odd number
      if (currentRoundTeams.length % 2 === 1) {
        nextRoundTeams.push(currentRoundTeams[currentRoundTeams.length - 1]);
      }
      
      currentRoundTeams = nextRoundTeams;
    }
    
    return matches;
  }

  /**
   * Generate round robin matches
   */
  static generateRoundRobin(teams: number[]): BracketMatchData[] {
    const matches: BracketMatchData[] = [];
    let matchNumber = 0;
    
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        // Home game
        matches.push({
          tournamentId: 0,
          round: 1,
          matchNumber: matchNumber++,
          homeTeamId: teams[i],
          awayTeamId: teams[j],
          gameDate: new Date()
        });
        
        // Away game
        matches.push({
          tournamentId: 0,
          round: 2,
          matchNumber: matchNumber++,
          homeTeamId: teams[j],
          awayTeamId: teams[i],
          gameDate: new Date()
        });
      }
    }
    
    return matches;
  }
}

// ============================================================================
// ENHANCED TOURNAMENT DATA ACCESS
// ============================================================================

export class EnhancedTournamentDataAccess {
  
  // ==========================================================================
  // TOURNAMENT OPERATIONS
  // ==========================================================================

  /**
   * Get active tournaments
   */
  static async getActiveTournaments(
    options: TournamentQueryOptions & PaginationOptions = {}
  ): Promise<Tournament[]> {
    const cacheKey = `tournaments-active-${JSON.stringify(options)}`;
    const cached = CacheManager.get<Tournament[]>(cacheKey);
    if (cached) return cached;

    const where: any = {
      status: options.status || { in: ['REGISTRATION_OPEN', 'IN_PROGRESS'] }
    };

    if (options.type) {
      where.type = options.type;
    }
    if (options.division !== undefined) {
      where.division = options.division;
    }

    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.tournament.findMany({
          where,
          ...QueryHelpers.getPaginationParams(options),
          include: QueryHelpers.getTournamentIncludes(options),
          orderBy: options.orderBy || { startTime: 'asc' }
        });
      },
      'getActiveTournaments'
    );

    CacheManager.set(cacheKey, result, CacheManager.SHORT_TTL);
    return result;
  }

  /**
   * Get tournament by ID
   */
  static async getTournament(
    tournamentId: number,
    includeDetails = true
  ): Promise<any | null> {
    const cacheKey = `tournament-${tournamentId}-${includeDetails}`;
    const cached = CacheManager.get(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        const tournament = await prisma.tournament.findUnique({
          where: { id: tournamentId },
          include: includeDetails ? {
            entries: {
              include: {
                team: {
                  select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    division: true
                  }
                }
              },
              orderBy: { seed: 'asc' }
            },
            games: {
              include: {
                homeTeam: { select: { id: true, name: true } },
                awayTeam: { select: { id: true, name: true } }
              },
              orderBy: [
                { bracketRound: 'asc' },
                { bracketPosition: 'asc' }
              ]
            }
          } : undefined
        });

        if (tournament) {
          return {
            ...tournament,
            entryFeeCredits: tournament.entryFeeCredits?.toString(),
            prizePoolJson: QueryHelpers.serializePrizes(tournament.prizePoolJson)
          };
        }

        return null;
      },
      `getTournament(${tournamentId})`
    );

    if (result) {
      const ttl = result.status === 'COMPLETED' ? CacheManager.DEFAULT_TTL : CacheManager.SHORT_TTL;
      CacheManager.set(cacheKey, result, ttl);
    }

    return result;
  }

  /**
   * Create new tournament
   */
  static async createTournament(data: CreateTournamentData): Promise<Tournament> {
    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.tournament.create({
          data: {
            name: data.name,
            type: data.type,
            division: data.division,
            status: 'REGISTRATION_OPEN',
            startTime: data.startTime,
            registrationEndTime: data.registrationEndTime || data.startTime,
            entryFeeCredits: data.entryFeeCredits,
            entryFeeGems: data.entryFeeGems,
            prizePoolJson: data.prizePool,
            maxEntries: data.maxEntries,
            minEntries: data.minEntries,
            seasonDay: data.seasonDay
          }
        });
      },
      'createTournament'
    );

    CacheManager.invalidate('tournaments-active');
    return result;
  }

  /**
   * Update tournament status
   */
  static async updateTournamentStatus(
    tournamentId: number,
    status: TournamentStatus
  ): Promise<Tournament> {
    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.tournament.update({
          where: { id: tournamentId },
          data: {
            status,
            ...(status === 'COMPLETED' && { endTime: new Date() })
          }
        });
      },
      `updateTournamentStatus(${tournamentId})`
    );

    CacheManager.invalidateTournament(tournamentId);
    CacheManager.invalidate('tournaments-active');
    return result;
  }

  // ==========================================================================
  // ENTRY OPERATIONS
  // ==========================================================================

  /**
   * Register team for tournament
   */
  static async registerTeam(data: TournamentEntryData): Promise<TournamentEntry> {
    const result = await executePrismaTransaction(async (tx) => {
      // Check tournament is open
      const tournament = await tx.tournament.findUnique({
        where: { id: data.tournamentId },
        include: {
          entries: { where: { teamId: data.teamId } }
        }
      });

      if (!tournament) {
        throw new PrismaError('Tournament not found');
      }

      if (tournament.status !== 'REGISTRATION_OPEN') {
        throw new PrismaError('Tournament registration is closed');
      }

      if (tournament.entries.length > 0) {
        throw new PrismaError('Team already registered');
      }

      if (tournament.maxEntries && tournament.entriesCount >= tournament.maxEntries) {
        throw new PrismaError('Tournament is full');
      }

      // Check team has funds for entry fee
      if (tournament.entryFeeCredits) {
        const finances = await tx.teamFinances.findUnique({
          where: { teamId: data.teamId }
        });

        if (!finances || finances.credits < tournament.entryFeeCredits) {
          throw new PrismaError('Insufficient funds for entry fee');
        }

        // Deduct entry fee
        await tx.teamFinances.update({
          where: { teamId: data.teamId },
          data: { credits: { decrement: tournament.entryFeeCredits } }
        });
      }

      // Create entry
      const entry = await tx.tournamentEntry.create({
        data: {
          tournamentId: data.tournamentId,
          teamId: data.teamId,
          seed: data.seed || tournament.entriesCount + 1
        }
      });

      // Update tournament entry count
      await tx.tournament.update({
        where: { id: data.tournamentId },
        data: { entriesCount: { increment: 1 } }
      });

      return entry;
    });

    CacheManager.invalidateTournament(data.tournamentId);
    return result;
  }

  /**
   * Get tournament entries
   */
  static async getTournamentEntries(tournamentId: number): Promise<any[]> {
    const cacheKey = `entries-${tournamentId}`;
    const cached = CacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        const entries = await prisma.tournamentEntry.findMany({
          where: { tournamentId },
          include: {
            team: {
              include: {
                players: {
                  where: { isRetired: false },
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    overallRating: true
                  }
                }
              }
            }
          },
          orderBy: { seed: 'asc' }
        });

        return entries;
      },
      `getTournamentEntries(${tournamentId})`
    );

    CacheManager.set(cacheKey, result, CacheManager.SHORT_TTL);
    return result;
  }

  /**
   * Update entry results
   */
  static async updateEntryResult(
    entryId: number,
    updates: {
      wins?: number;
      losses?: number;
      finalRank?: number;
      eliminated?: boolean;
    }
  ): Promise<TournamentEntry> {
    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.tournamentEntry.update({
          where: { id: entryId },
          data: updates
        });
      },
      `updateEntryResult(${entryId})`
    );

    const entry = await this.getEntry(entryId);
    if (entry) {
      CacheManager.invalidateTournament(entry.tournamentId);
    }

    return result;
  }

  /**
   * Get entry by ID
   */
  static async getEntry(entryId: number): Promise<TournamentEntry | null> {
    return await executePrismaOperation(
      async (prisma) => {
        return await prisma.tournamentEntry.findUnique({
          where: { id: entryId }
        });
      },
      `getEntry(${entryId})`
    );
  }

  // ==========================================================================
  // BRACKET OPERATIONS
  // ==========================================================================

  /**
   * Generate tournament bracket
   */
  static async generateBracket(tournamentId: number): Promise<number> {
    const result = await executePrismaTransaction(async (tx) => {
      // Get tournament with entries
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          entries: {
            orderBy: { seed: 'asc' }
          }
        }
      });

      if (!tournament) {
        throw new PrismaError('Tournament not found');
      }

      if (tournament.entries.length < (tournament.minEntries || 2)) {
        throw new PrismaError('Not enough entries to start tournament');
      }

      // Generate bracket based on tournament type
      const teamIds = tournament.entries.map(e => e.teamId);
      let matches: BracketMatchData[];

      if (tournament.type === 'SINGLE_ELIMINATION') {
        matches = BracketGenerator.generateSingleElimination(teamIds);
      } else if (tournament.type === 'ROUND_ROBIN') {
        matches = BracketGenerator.generateRoundRobin(teamIds);
      } else {
        throw new PrismaError(`Unsupported tournament type: ${tournament.type}`);
      }

      // Create games for bracket
      const baseDate = tournament.startTime;
      const gamesCreated = await tx.game.createMany({
        data: matches.map((match, index) => ({
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          tournamentId,
          matchType: 'TOURNAMENT' as const,
          bracketRound: match.round,
          bracketPosition: match.matchNumber,
          gameDate: new Date(baseDate.getTime() + (match.round - 1) * 30 * 60 * 1000), // 30 min between rounds
          status: 'SCHEDULED' as const
        }))
      });

      // Update tournament status
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: 'IN_PROGRESS' }
      });

      return gamesCreated.count;
    });

    CacheManager.invalidateTournament(tournamentId);
    CacheManager.invalidate('tournaments-active');
    return result;
  }

  /**
   * Advance tournament bracket
   */
  static async advanceBracket(
    tournamentId: number,
    gameId: number,
    winnerId: number
  ): Promise<void> {
    await executePrismaTransaction(async (tx) => {
      // Get the completed game
      const game = await tx.game.findUnique({
        where: { id: gameId }
      });

      if (!game || game.tournamentId !== tournamentId) {
        throw new PrismaError('Game not found in tournament');
      }

      if (!game.bracketRound || game.bracketPosition === null) {
        return; // Not a bracket game
      }

      // Find next round game
      const nextRound = game.bracketRound + 1;
      const nextPosition = Math.floor(game.bracketPosition / 2);
      const isHomeTeam = game.bracketPosition % 2 === 0;

      const nextGame = await tx.game.findFirst({
        where: {
          tournamentId,
          bracketRound: nextRound,
          bracketPosition: nextPosition
        }
      });

      if (nextGame) {
        // Update next game with winner
        await tx.game.update({
          where: { id: nextGame.id },
          data: isHomeTeam 
            ? { homeTeamId: winnerId }
            : { awayTeamId: winnerId }
        });
      }

      // Update entry record
      const loser = winnerId === game.homeTeamId ? game.awayTeamId : game.homeTeamId;
      
      await tx.tournamentEntry.updateMany({
        where: {
          tournamentId,
          teamId: winnerId
        },
        data: { wins: { increment: 1 } }
      });

      await tx.tournamentEntry.updateMany({
        where: {
          tournamentId,
          teamId: loser
        },
        data: {
          losses: { increment: 1 },
          eliminated: true
        }
      });
    });

    CacheManager.invalidateTournament(tournamentId);
  }

  // ==========================================================================
  // REWARD OPERATIONS
  // ==========================================================================

  /**
   * Distribute tournament rewards
   */
  static async distributeRewards(tournamentId: number): Promise<void> {
    await executePrismaTransaction(async (tx) => {
      // Get tournament with final rankings
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          entries: {
            where: { finalRank: { not: null } },
            orderBy: { finalRank: 'asc' }
          }
        }
      });

      if (!tournament) {
        throw new PrismaError('Tournament not found');
      }

      if (tournament.status === 'COMPLETED') {
        throw new PrismaError('Rewards already distributed');
      }

      const prizePool = tournament.prizePoolJson as any;
      if (!prizePool || !prizePool.rewards) {
        return; // No rewards to distribute
      }

      // Distribute rewards based on ranking
      for (const entry of tournament.entries) {
        const rankRewards = prizePool.rewards[entry.finalRank!];
        if (!rankRewards) continue;

        // Credits reward
        if (rankRewards.credits) {
          await tx.teamFinances.update({
            where: { teamId: entry.teamId },
            data: {
              credits: { increment: BigInt(rankRewards.credits) }
            }
          });
        }

        // Gems reward
        if (rankRewards.gems) {
          await tx.teamFinances.update({
            where: { teamId: entry.teamId },
            data: {
              gems: { increment: rankRewards.gems }
            }
          });
        }

        // Item rewards
        if (rankRewards.items) {
          for (const itemId of rankRewards.items) {
            await tx.inventoryItem.create({
              data: {
                teamId: entry.teamId,
                itemId,
                quantity: 1
              }
            });
          }
        }

        // Mark rewards claimed
        await tx.tournamentEntry.update({
          where: { id: entry.id },
          data: { rewardsClaimed: true }
        });
      }

      // Mark tournament complete
      await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          status: 'COMPLETED',
          endTime: new Date()
        }
      });
    });

    CacheManager.invalidateTournament(tournamentId);
    CacheManager.invalidate('tournaments-active');
  }

  /**
   * Calculate prize pool from entries
   */
  static async calculatePrizePool(
    entryFee: bigint,
    entryCount: number,
    distribution: number[] = [0.5, 0.3, 0.2] // Default: 50%, 30%, 20%
  ): Promise<any> {
    const totalPool = entryFee * BigInt(entryCount);
    const rewards: any = {};

    distribution.forEach((percentage, index) => {
      const rank = index + 1;
      rewards[rank] = {
        credits: (totalPool * BigInt(Math.floor(percentage * 100)) / BigInt(100)).toString()
      };
    });

    return {
      total: totalPool.toString(),
      rewards
    };
  }

  // ==========================================================================
  // DAILY TOURNAMENT OPERATIONS
  // ==========================================================================

  /**
   * Create daily tournaments for all divisions
   */
  static async createDailyTournaments(seasonDay: number): Promise<number> {
    const result = await executePrismaTransaction(async (tx) => {
      const tournaments: any[] = [];
      const baseTime = new Date();
      baseTime.setHours(20, 0, 0, 0); // 8 PM

      // Create tournaments for each division
      for (let division = 1; division <= 8; division++) {
        // Main daily tournament
        tournaments.push({
          name: `Division ${division} Daily Tournament`,
          type: 'SINGLE_ELIMINATION' as TournamentType,
          division,
          status: 'REGISTRATION_OPEN' as TournamentStatus,
          startTime: baseTime,
          registrationEndTime: baseTime,
          entryFeeCredits: BigInt(1000 * division),
          prizePoolJson: await this.calculatePrizePool(
            BigInt(1000 * division),
            8,
            [0.5, 0.3, 0.2]
          ),
          maxEntries: 16,
          minEntries: 4,
          seasonDay
        });

        // Premium tournament (higher stakes)
        if (division <= 4) {
          const premiumTime = new Date(baseTime);
          premiumTime.setHours(21, 0, 0, 0);
          
          tournaments.push({
            name: `Division ${division} Premium Daily`,
            type: 'SINGLE_ELIMINATION' as TournamentType,
            division,
            status: 'REGISTRATION_OPEN' as TournamentStatus,
            startTime: premiumTime,
            registrationEndTime: premiumTime,
            entryFeeCredits: BigInt(5000 * division),
            entryFeeGems: 10,
            prizePoolJson: await this.calculatePrizePool(
              BigInt(5000 * division),
              8,
              [0.6, 0.25, 0.15]
            ),
            maxEntries: 8,
            minEntries: 4,
            seasonDay
          });
        }
      }

      const created = await tx.tournament.createMany({
        data: tournaments
      });

      return created.count;
    });

    CacheManager.invalidate('tournaments-active');
    return result;
  }

  /**
   * Auto-fill tournament with AI teams
   */
  static async autoFillTournament(tournamentId: number): Promise<number> {
    const result = await executePrismaTransaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          entries: true
        }
      });

      if (!tournament) {
        throw new PrismaError('Tournament not found');
      }

      const spotsToFill = (tournament.minEntries || 4) - tournament.entries.length;
      if (spotsToFill <= 0) {
        return 0; // Already has enough entries
      }

      // Find AI teams in same division
      const aiTeams = await tx.team.findMany({
        where: {
          isAI: true,
          division: tournament.division || 1,
          id: {
            notIn: tournament.entries.map(e => e.teamId)
          }
        },
        take: spotsToFill
      });

      // Register AI teams
      const entries = aiTeams.map((team, index) => ({
        tournamentId,
        teamId: team.id,
        seed: tournament.entries.length + index + 1
      }));

      const created = await tx.tournamentEntry.createMany({
        data: entries
      });

      // Update tournament entry count
      await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          entriesCount: { increment: created.count }
        }
      });

      return created.count;
    });

    CacheManager.invalidateTournament(tournamentId);
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

export const tournamentStorage = {
  getActiveTournaments: EnhancedTournamentDataAccess.getActiveTournaments,
  getTournament: EnhancedTournamentDataAccess.getTournament,
  createTournament: EnhancedTournamentDataAccess.createTournament,
  updateTournamentStatus: EnhancedTournamentDataAccess.updateTournamentStatus,
  generateBracket: EnhancedTournamentDataAccess.generateBracket,
  advanceBracket: EnhancedTournamentDataAccess.advanceBracket,
  distributeRewards: EnhancedTournamentDataAccess.distributeRewards,
  createDailyTournaments: EnhancedTournamentDataAccess.createDailyTournaments,
  autoFillTournament: EnhancedTournamentDataAccess.autoFillTournament
};

export const tournamentEntryStorage = {
  registerTeam: EnhancedTournamentDataAccess.registerTeam,
  getTournamentEntries: EnhancedTournamentDataAccess.getTournamentEntries,
  updateEntryResult: EnhancedTournamentDataAccess.updateEntryResult
};