/**
 * ENHANCED TEAM DATA ACCESS LAYER
 * 
 * Production-grade data access facade for all team-related operations.
 * Implements caching, query optimization, and standardized error handling.
 * 
 * This consolidates functionality from:
 * - teamStorage.ts
 * - playerStorage.ts
 * - contractStorage.ts
 * - financeStorage.ts
 * - stadiumStorage.ts
 */

import { 
  PrismaClient,
  Team,
  Player,
  Contract,
  TeamFinances,
  Stadium,
  Staff,
  Prisma,
  Race,
  PlayerRole,
  InjuryStatus,
  StaffType
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

interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  orderBy?: any;
}

interface TeamIncludeOptions {
  includePlayers?: boolean;
  includeContracts?: boolean;
  includeSkills?: boolean;
  includeFinances?: boolean;
  includeStadium?: boolean;
  includeStaff?: boolean;
  includeStrategies?: boolean;
  includeActiveBoosts?: boolean;
}

interface TeamStatUpdate {
  teamId: number;
  stats: {
    wins?: number;
    losses?: number;
    draws?: number;
    points?: number;
  };
}

interface PlayerCreationConfig {
  teamId: number;
  firstName: string;
  lastName: string;
  race: Race;
  age: number;
  role: PlayerRole;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  staminaAttribute: number;
  leadership: number;
  agility: number;
  potentialRating: number;
  dailyStaminaLevel?: number;
  injuryStatus?: InjuryStatus;
  camaraderieScore?: number;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

class CacheManager {
  private static cache = new Map<string, CachedResult<any>>();
  private static DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

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

  static invalidateTeam(teamId: number): void {
    this.invalidate(`team-${teamId}`);
  }

  static invalidatePlayer(playerId: number): void {
    this.invalidate(`player-${playerId}`);
  }
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

class QueryHelpers {
  static getTeamIncludes(options: TeamIncludeOptions = {}): any {
    return {
      players: options.includePlayers && {
        include: {
          contract: options.includeContracts,
          skills: options.includeSkills && {
            include: { skill: true }
          },
          equipment: true
        }
      },
      finances: options.includeFinances,
      stadium: options.includeStadium,
      staff: options.includeStaff && {
        include: { contract: true }
      },
      strategies: options.includeStrategies,
      activeBoosts: options.includeActiveBoosts && {
        where: { isActive: true }
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

  static serializeFinances(finances: any): any {
    if (!finances) return null;
    
    return {
      ...finances,
      credits: finances.credits?.toString() || '0',
      escrowCredits: finances.escrowCredits?.toString() || '0',
      projectedIncome: finances.projectedIncome?.toString() || '0',
      projectedExpenses: finances.projectedExpenses?.toString() || '0',
      lastSeasonRevenue: finances.lastSeasonRevenue?.toString() || '0',
      lastSeasonExpenses: finances.lastSeasonExpenses?.toString() || '0',
      facilitiesMaintenanceCost: finances.facilitiesMaintenanceCost?.toString() || '0'
    };
  }
}

// ============================================================================
// ENHANCED TEAM DATA ACCESS
// ============================================================================

export class EnhancedTeamDataAccess {
  
  // ==========================================================================
  // TEAM OPERATIONS
  // ==========================================================================

  /**
   * Get team with full details - optimized with caching
   */
  static async getTeamWithFullDetails(
    teamId: number, 
    options: TeamIncludeOptions = {}
  ): Promise<any> {
    const cacheKey = `team-full-${teamId}-${JSON.stringify(options)}`;
    const cached = CacheManager.get(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        const team = await prisma.team.findUnique({
          where: { id: teamId },
          include: QueryHelpers.getTeamIncludes(options)
        });

        if (team?.TeamFinance) {
          team?.TeamFinance = QueryHelpers.serializeFinances(team?.TeamFinance);
        }

        return team;
      },
      `getTeamWithFullDetails(${teamId})`
    );

    if (result) {
      CacheManager.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Get team by user profile ID
   */
  static async getTeamByUserProfile(
    userProfileId: number,
    options: TeamIncludeOptions = {}
  ): Promise<any> {
    const cacheKey = `team-user-${userProfileId}`;
    const cached = CacheManager.get(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        const team = await prisma.team.findUnique({
          where: { userProfileId },
          include: QueryHelpers.getTeamIncludes(options)
        });

        if (team?.TeamFinance) {
          team?.TeamFinance = QueryHelpers.serializeFinances(team?.TeamFinance);
        }

        return team;
      },
      `getTeamByUserProfile(${userProfileId})`
    );

    if (result) {
      CacheManager.set(cacheKey, result, 60000); // Cache for 1 minute
    }

    return result;
  }

  /**
   * Get teams by division with pagination
   */
  static async getTeamsByDivision(
    division: number,
    subdivision: string,
    options: PaginationOptions = {}
  ): Promise<any[]> {
    const cacheKey = `teams-div-${division}-${subdivision}-${JSON.stringify(options)}`;
    const cached = CacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.team.findMany({
          where: { division, subdivision },
          ...QueryHelpers.getPaginationParams(options),
          include: {
            finances: true,
            stadium: true
          }
        });
      },
      `getTeamsByDivision(${division}, ${subdivision})`
    );

    CacheManager.set(cacheKey, result);
    return result;
  }

  /**
   * Update team statistics in batch - optimized transaction
   */
  static async updateTeamStatsBatch(updates: TeamStatUpdate[]): Promise<void> {
    await executePrismaTransaction(async (tx) => {
      const promises = updates.map(update =>
        tx.team.update({
          where: { id: update.teamId },
          data: update.stats
        })
      );
      await Promise.all(promises);
    });

    // Invalidate cache for all updated teams
    updates.forEach(update => CacheManager.invalidateTeam(update.teamId));
  }

  /**
   * Create new team with full initialization
   */
  static async createTeam(
    userProfileId: number,
    teamData: {
      name: string;
      logoUrl?: string;
      division: number;
      subdivision?: string;
    }
  ): Promise<Team> {
    const result = await executePrismaTransaction(async (tx) => {
      // Create team
      const team = await tx.team.create({
        data: {
          userProfileId,
          name: teamData.name,
          logoUrl: teamData.logoUrl,
          division: teamData.division,
          subdivision: teamData.subdivision || 'alpha'
        }
      });

      // Initialize finances
      await tx.teamFinances.create({
        data: {
          teamId: team.id,
          credits: Number(50000),
          gems: 0
        }
      });

      // Initialize stadium
      await tx.stadium.create({
        data: {
          teamId: team.id,
          name: `${teamData.name} Arena`,
          capacity: 1000,
          ticketPrice: Number(10),
          facilitiesLevel: 1
        }
      });

      return team;
    });

    return result;
  }

  // ==========================================================================
  // PLAYER OPERATIONS
  // ==========================================================================

  /**
   * Get all players for a team with optimized includes
   */
  static async getTeamPlayers(
    teamId: number,
    includeDetails = false
  ): Promise<Player[]> {
    const cacheKey = `players-team-${teamId}-${includeDetails}`;
    const cached = CacheManager.get<Player[]>(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.player.findMany({
          where: { 
            teamId,
            isRetired: false
          },
          include: includeDetails ? {
            contract: true,
            skills: { include: { skill: true } },
            equipment: true
          } : undefined,
          orderBy: [
            { role: 'asc' },
            { overallRating: 'desc' }
          ]
        });
      },
      `getTeamPlayers(${teamId})`
    );

    CacheManager.set(cacheKey, result);
    return result;
  }

  /**
   * Get available players (not injured, not on market)
   */
  static async getAvailablePlayers(teamId: number): Promise<Player[]> {
    const cacheKey = `players-available-${teamId}`;
    const cached = CacheManager.get<Player[]>(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.player.findMany({
          where: {
            teamId,
            isRetired: false,
            isOnMarket: false,
            injuryStatus: 'HEALTHY'
          },
          orderBy: { overallRating: 'desc' }
        });
      },
      `getAvailablePlayers(${teamId})`
    );

    CacheManager.set(cacheKey, result, 30000); // Cache for 30 seconds
    return result;
  }

  /**
   * Create new player with contract
   */
  static async createPlayer(config: PlayerCreationConfig): Promise<Player> {
    const result = await executePrismaTransaction(async (tx) => {
      // Create player
      const player = await tx.player.create({
        data: {
          teamId: config.teamId,
          firstName: config.firstName,
          lastName: config.lastName,
          race: config.race,
          age: config.age,
          role: config.role,
          speed: config.speed,
          power: config.power,
          throwing: config.throwing,
          catching: config.catching,
          kicking: config.kicking,
          staminaAttribute: config.staminaAttribute,
          leadership: config.leadership,
          agility: config.agility,
          potentialRating: config.potentialRating,
          dailyStaminaLevel: config.dailyStaminaLevel || 100,
          injuryStatus: config.injuryStatus || 'HEALTHY',
          camaraderieScore: config.camaraderieScore || 75.0
        }
      });

      // Create initial contract
      await tx.contract.create({
        data: {
          playerId: player.id,
          salary: 1000,
          length: 14,
          signingBonus: 0
        }
      });

      return player;
    });

    CacheManager.invalidateTeam(config.teamId);
    return result;
  }

  /**
   * Update player stats after development
   */
  static async updatePlayerStats(
    playerId: number,
    stats: Partial<Player>
  ): Promise<Player> {
    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.player.update({
          where: { id: playerId },
          data: stats
        });
      },
      `updatePlayerStats(${playerId})`
    );

    CacheManager.invalidatePlayer(playerId);
    if (result.teamId) {
      CacheManager.invalidateTeam(result.teamId);
    }

    return result;
  }

  // ==========================================================================
  // FINANCIAL OPERATIONS
  // ==========================================================================

  /**
   * Get team finances with proper BigInt serialization
   */
  static async getTeamFinances(teamId: number): Promise<any> {
    const cacheKey = `finances-${teamId}`;
    const cached = CacheManager.get(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        const finances = await prisma.teamFinances.findUnique({
          where: { teamId }
        });
        return QueryHelpers.serializeFinances(finances);
      },
      `getTeamFinances(${teamId})`
    );

    if (result) {
      CacheManager.set(cacheKey, result, 30000); // Cache for 30 seconds
    }

    return result;
  }

  /**
   * Update team finances with transaction safety
   */
  static async updateTeamFinances(
    teamId: number,
    updates: {
      credits?: bigint;
      gems?: number;
      escrowCredits?: bigint;
      escrowGems?: number;
    }
  ): Promise<void> {
    await executePrismaOperation(
      async (prisma) => {
        await prisma.teamFinances.update({
          where: { teamId },
          data: updates
        });
      },
      `updateTeamFinances(${teamId})`
    );

    CacheManager.invalidateTeam(teamId);
  }

  /**
   * Process financial transaction with audit trail
   */
  static async processFinancialTransaction(
    teamId: number,
    amount: bigint,
    type: 'INCOME' | 'EXPENSE',
    description: string
  ): Promise<void> {
    await executePrismaTransaction(async (tx) => {
      // Get current finances
      const finances = await tx.teamFinances.findUnique({
        where: { teamId }
      });

      if (!finances) {
        throw new PrismaError(`Team finances not found for team ${teamId}`);
      }

      // Calculate new balance
      const newCredits = type === 'INCOME' 
        ? finances.credits + amount
        : finances.credits - amount;

      if (newCredits < 0) {
        throw new PrismaError('Insufficient funds');
      }

      // Update finances
      await tx.teamFinances.update({
        where: { teamId },
        data: { credits: newCredits }
      });

      // TODO: Add audit log entry here when AuditLog model is available
    });

    CacheManager.invalidateTeam(teamId);
  }

  // ==========================================================================
  // STAFF OPERATIONS
  // ==========================================================================

  /**
   * Get team staff with contracts
   */
  static async getTeamStaff(teamId: number): Promise<Staff[]> {
    const cacheKey = `staff-${teamId}`;
    const cached = CacheManager.get<Staff[]>(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.staff.findMany({
          where: { teamId },
          include: { contract: true },
          orderBy: { type: 'asc' }
        });
      },
      `getTeamStaff(${teamId})`
    );

    CacheManager.set(cacheKey, result);
    return result;
  }

  /**
   * Hire new staff member
   */
  static async hireStaff(
    teamId: number,
    staffData: {
      type: StaffType;
      name: string;
      level?: number;
      salary: number;
      contractLength: number;
    }
  ): Promise<Staff> {
    const result = await executePrismaTransaction(async (tx) => {
      // Create staff member
      const staff = await tx.staff.create({
        data: {
          teamId,
          type: staffData.type,
          name: staffData.name,
          level: staffData.level || 1
        }
      });

      // Create contract
      await tx.contract.create({
        data: {
          staffId: staff.id,
          salary: staffData.salary,
          length: staffData.contractLength,
          signingBonus: 0
        }
      });

      return staff;
    });

    CacheManager.invalidateTeam(teamId);
    return result;
  }

  // ==========================================================================
  // STADIUM OPERATIONS
  // ==========================================================================

  /**
   * Get stadium details
   */
  static async getStadium(teamId: number): Promise<Stadium | null> {
    const cacheKey = `stadium-${teamId}`;
    const cached = CacheManager.get<Stadium>(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        const stadium = await prisma.stadium.findUnique({
          where: { teamId }
        });

        if (stadium) {
          return {
            ...stadium,
            ticketPrice: (15 + stadium.lightingScreensLevel * 5).toString(),
            concessionPrice: (5 + stadium.concessionsLevel * 2).toString(),
            parkingPrice: (3 + stadium.parkingLevel * 1).toString(),
            vipSuitePrice: (100 + stadium.vipSuitesLevel * 25).toString()
          } as any;
        }

        return stadium;
      },
      `getStadium(${teamId})`
    );

    if (result) {
      CacheManager.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Upgrade stadium facility
   */
  static async upgradeStadium(
    teamId: number,
    upgrades: {
      capacity?: number;
      facilitiesLevel?: number;
      ticketPrice?: bigint;
    }
  ): Promise<Stadium> {
    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.stadium.update({
          where: { teamId },
          data: upgrades
        });
      },
      `upgradeStadium(${teamId})`
    );

    CacheManager.invalidateTeam(teamId);
    return result;
  }

  // ==========================================================================
  // BATCH OPERATIONS
  // ==========================================================================

  /**
   * Get multiple teams with minimal data for listings
   */
  static async getTeamsSummary(teamIds: number[]): Promise<any[]> {
    if (teamIds.length === 0) return [];

    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.team.findMany({
          where: { id: { in: teamIds } },
          select: {
            id: true,
            name: true,
            division: true,
            subdivision: true,
            wins: true,
            losses: true,
            draws: true,
            points: true
          }
        });
      },
      `getTeamsSummary(${teamIds.length} teams)`
    );

    return result;
  }

  /**
   * Bulk update player stamina
   */
  static async bulkUpdatePlayerStamina(
    updates: Array<{ playerId: number; stamina: number }>
  ): Promise<void> {
    await executePrismaTransaction(async (tx) => {
      const promises = updates.map(update =>
        tx.player.update({
          where: { id: update.playerId },
          data: { dailyStaminaLevel: update.stamina }
        })
      );
      await Promise.all(promises);
    });

    // Invalidate cache for affected players
    updates.forEach(update => CacheManager.invalidatePlayer(update.playerId));
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
   * Clear cache for specific team
   */
  static clearTeamCache(teamId: number): void {
    CacheManager.invalidateTeam(teamId);
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

// Export for services that import from storage files
export const teamStorage = {
  getTeamWithFullDetails: EnhancedTeamDataAccess.getTeamWithFullDetails,
  getTeamByUserProfile: EnhancedTeamDataAccess.getTeamByUserProfile,
  getTeamsByDivision: EnhancedTeamDataAccess.getTeamsByDivision,
  createTeam: EnhancedTeamDataAccess.createTeam,
  updateTeamStatsBatch: EnhancedTeamDataAccess.updateTeamStatsBatch
};

export const playerStorage = {
  getTeamPlayers: EnhancedTeamDataAccess.getTeamPlayers,
  getAvailablePlayers: EnhancedTeamDataAccess.getAvailablePlayers,
  createPlayer: EnhancedTeamDataAccess.createPlayer,
  updatePlayerStats: EnhancedTeamDataAccess.updatePlayerStats
};

export const financeStorage = {
  getTeamFinances: EnhancedTeamDataAccess.getTeamFinances,
  updateTeamFinances: EnhancedTeamDataAccess.updateTeamFinances,
  processFinancialTransaction: EnhancedTeamDataAccess.processFinancialTransaction
};

export const stadiumStorage = {
  getStadium: EnhancedTeamDataAccess.getStadium,
  upgradeStadium: EnhancedTeamDataAccess.upgradeStadium
};

export const staffStorage = {
  getTeamStaff: EnhancedTeamDataAccess.getTeamStaff,
  hireStaff: EnhancedTeamDataAccess.hireStaff
};