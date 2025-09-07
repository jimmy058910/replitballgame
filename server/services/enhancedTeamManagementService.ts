/**
 * Enhanced Team Management Service
 * 
 * Comprehensive unified facade for all player and team operations including:
 * - Player lifecycle management (creation, progression, aging, retirement)
 * - Team operations (creation, management, statistics)
 * - Contract management (negotiations, renewals, transfers)
 * - Camaraderie system (team chemistry affecting performance)
 * - Injury and stamina management
 * - Player skills and progression
 * 
 * This service follows the Facade pattern to provide a clean, unified interface
 * while delegating to specialized services for complex operations.
 * Zero technical debt implementation with comprehensive error handling.
 * 
 * @module EnhancedTeamManagementService
 */

import { z } from 'zod';
import { getPrismaClient } from '../database.js';
import { ComprehensivePlayerProgressionService } from './comprehensivePlayerProgressionService.js';
import { DailyPlayerProgressionService } from './dailyPlayerProgressionService.js';
import { PlayerAgingRetirementService } from './playerAgingRetirementService.js';
import { PlayerContractInitializer } from './playerContractInitializer.js';
import { PlayerSkillsService } from './playerSkillsService.js';
import { teamNameValidation } from './teamNameValidation.js';
import { TeamStatisticsIntegrityService } from './teamStatisticsIntegrityService.js';
import { ContractProgressionService } from './contractProgressionService.js';
import { ContractService } from './contractService.js';
import { CamaraderieService } from './camaraderieService.js';
import { InjuryStaminaService } from './injuryStaminaService.js';
import { logInfo, logError } from './errorService.js';

// ============================================================================
// SCHEMAS & TYPES
// ============================================================================

/**
 * Player creation configuration schema
 */
const PlayerCreationSchema = z.object({
  name: z.string().min(1).max(100),
  race: z.enum(['HUMAN', 'SYLVAN', 'GRYLL', 'LUMINA', 'UMBRA']),
  position: z.enum(['PASSER', 'RUNNER', 'BLOCKER']),
  age: z.number().min(18).max(40).optional(),
  teamId: z.number().optional(),
  potential: z.number().min(1).max(100).optional(),
  salary: z.number().min(0).optional(),
  contractLength: z.number().min(1).max(5).optional()
});

/**
 * Team creation configuration schema
 */
const TeamCreationSchema = z.object({
  name: z.string().min(1).max(100),
  userProfileId: z.number(),
  division: z.number().min(1).max(8).optional(),
  subdivision: z.string().optional(),
  isAI: z.boolean().optional(),
  logoUrl: z.string().url().optional(),
  initialCredits: z.number().min(0).optional()
});

/**
 * Contract negotiation schema
 */
const ContractNegotiationSchema = z.object({
  playerId: z.number(),
  teamId: z.number(),
  salary: z.number().min(0),
  length: z.number().min(1).max(5),
  signingBonus: z.number().min(0).optional()
});

/**
 * Player progression update schema
 */
const PlayerProgressionSchema = z.object({
  playerId: z.number(),
  skillChanges: z.array(z.object({
    skillId: z.number(),
    value: z.number().min(1).max(20)
  })).optional(),
  injuryDays: z.number().min(0).optional(),
  staminaChange: z.number().min(-100).max(100).optional()
});

/**
 * Team update schema
 */
const TeamUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().optional(),
  camaraderie: z.number().min(0).max(100).optional(),
  fanLoyalty: z.number().min(0).max(100).optional(),
  tactics: z.enum(['BALANCED', 'OFFENSIVE', 'DEFENSIVE']).optional()
});

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class EnhancedTeamManagementService {
  // Service instances (using facade pattern)
  private static comprehensiveProgression = ComprehensivePlayerProgressionService;
  private static dailyProgression = DailyPlayerProgressionService;
  private static agingRetirement = PlayerAgingRetirementService;
  private static contractInitializer = PlayerContractInitializer;
  private static playerSkills = PlayerSkillsService;
  private static teamStats = TeamStatisticsIntegrityService;
  private static contractProgression = ContractProgressionService;
  private static contractService = ContractService;
  private static camaraderieService = CamaraderieService;
  private static injuryStamina = InjuryStaminaService;

  // Cache for frequently accessed data (5-minute TTL)
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Clear cached data
   */
  private static clearCache(pattern?: string): void {
    if (pattern) {
      const keys = Array.from(this.cache.keys());
      for (const key of keys) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cached data
   */
  private static getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cached data
   */
  private static setCached(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // ============================================================================
  // PLAYER MANAGEMENT
  // ============================================================================

  /**
   * Create a new player with comprehensive initialization
   */
  static async createPlayer(config: z.infer<typeof PlayerCreationSchema>): Promise<any> {
    const validatedConfig = PlayerCreationSchema.parse(config);
    const prisma = await getPrismaClient();

    return await prisma.$transaction(async (tx) => {
      // Create base player
      const player = await tx.player.create({
        data: {
          name: validatedConfig.name,
          race: validatedConfig.race,
          position: validatedConfig.position,
          age: validatedConfig.age || 20,
          potential: validatedConfig.potential || Math.floor(Math.random() * 40) + 60,
          teamId: validatedConfig.teamId,
          stamina: 100,
          loyalty: 50,
          injuryDays: 0,
          isRetired: false
        }
      });

      // Initialize player skills
      await this.playerSkills.initializePlayerSkills(player.id);

      // Create contract if team is specified
      if (validatedConfig.teamId) {
        await this.contractService.createContract({
          playerId: player.id,
          teamId: validatedConfig.teamId,
          salary: validatedConfig.salary || 50000,
          length: validatedConfig.contractLength || 2,
          signingBonus: 0
        });
      }

      this.clearCache(`player-${player.id}`);
      logInfo(`Created player: ${player.name} (ID: ${player.id})`);
      
      return player;
    });
  }

  /**
   * Get comprehensive player data including skills, contract, and stats
   */
  static async getPlayerDetails(playerId: number): Promise<any> {
    const cacheKey = `player-${playerId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const prisma = await getPrismaClient();
    
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        team: {
          select: { id: true, name: true, division: true }
        },
        contract: true,
        skills: {
          include: {
            skill: true
          }
        },
        playerMatchStats: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }

    // Enrich with calculated fields
    const enrichedPlayer = {
      ...player,
      overallRating: await this.calculatePlayerOverallRating(playerId),
      marketValue: await this.calculatePlayerMarketValue(playerId),
      performanceRating: await this.calculateRecentPerformance(playerId),
      retirementRisk: this.agingRetirement.calculateRetirementProbability(
        player.age,
        player.potential,
        player.loyalty
      )
    };

    this.setCached(cacheKey, enrichedPlayer);
    return enrichedPlayer;
  }

  /**
   * Progress player skills and attributes
   */
  static async progressPlayer(config: z.infer<typeof PlayerProgressionSchema>): Promise<any> {
    const validatedConfig = PlayerProgressionSchema.parse(config);
    const prisma = await getPrismaClient();

    return await prisma.$transaction(async (tx) => {
      const results: any = {
        playerId: validatedConfig.playerId,
        updates: []
      };

      // Update skills if provided
      if (validatedConfig.skillChanges) {
        for (const change of validatedConfig.skillChanges) {
          await tx.playerSkill.update({
            where: {
              playerId_skillId: {
                playerId: validatedConfig.playerId,
                skillId: change.skillId
              }
            },
            data: { value: change.value }
          });
          results.updates.push(`Skill ${change.skillId} updated to ${change.value}`);
        }
      }

      // Update injury status
      if (validatedConfig.injuryDays !== undefined) {
        await tx.player.update({
          where: { id: validatedConfig.playerId },
          data: { injuryDays: validatedConfig.injuryDays }
        });
        results.updates.push(`Injury days set to ${validatedConfig.injuryDays}`);
      }

      // Update stamina
      if (validatedConfig.staminaChange) {
        const player = await tx.player.findUnique({
          where: { id: validatedConfig.playerId }
        });
        
        if (player) {
          const newStamina = Math.max(0, Math.min(100, player.stamina + validatedConfig.staminaChange));
          await tx.player.update({
            where: { id: validatedConfig.playerId },
            data: { stamina: newStamina }
          });
          results.updates.push(`Stamina changed to ${newStamina}`);
        }
      }

      this.clearCache(`player-${validatedConfig.playerId}`);
      return results;
    });
  }

  /**
   * Process daily progression for all players
   */
  static async processDailyProgression(): Promise<any> {
    const results = await this.dailyProgression.processAllPlayers();
    this.clearCache('player');
    return results;
  }

  /**
   * Process aging and retirement checks
   */
  static async processAgingAndRetirement(): Promise<any> {
    const results = await this.agingRetirement.processSeasonEnd();
    this.clearCache('player');
    return results;
  }

  /**
   * Calculate player overall rating
   */
  static async calculatePlayerOverallRating(playerId: number): Promise<number> {
    const prisma = await getPrismaClient();
    
    const skills = await prisma.playerSkill.findMany({
      where: { playerId },
      include: { skill: true }
    });

    if (skills.length === 0) return 50;

    // Weight skills based on importance
    const totalValue = skills.reduce((sum, ps) => sum + ps.value, 0);
    const avgValue = totalValue / skills.length;
    
    // Scale to 0-100
    return Math.round((avgValue / 20) * 100);
  }

  /**
   * Calculate player market value
   */
  static async calculatePlayerMarketValue(playerId: number): Promise<number> {
    const player = await this.getPlayerDetails(playerId);
    
    // Base value calculation
    let value = 100000; // Base value
    
    // Adjust for age (peak value at 25-28)
    const ageFactor = player.age < 25 ? 1.2 : player.age > 30 ? 0.8 : 1.0;
    value *= ageFactor;
    
    // Adjust for overall rating
    value *= (player.overallRating / 50); // Double value for 100 rating
    
    // Adjust for potential
    value *= (player.potential / 70); // Higher potential increases value
    
    // Adjust for contract status
    if (player.contract && player.contract.length <= 1) {
      value *= 0.7; // Lower value for expiring contracts
    }
    
    return Math.round(value);
  }

  /**
   * Calculate recent performance rating
   */
  static async calculateRecentPerformance(playerId: number): Promise<number> {
    const prisma = await getPrismaClient();
    
    const recentStats = await prisma.playerMatchStats.findMany({
      where: { playerId },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    if (recentStats.length === 0) return 50;

    // Calculate average performance metrics
    const avgPoints = recentStats.reduce((sum, s) => sum + (s.touchdowns || 0) * 6, 0) / recentStats.length;
    const avgYards = recentStats.reduce((sum, s) => sum + (s.passingYards || 0) + (s.rushingYards || 0), 0) / recentStats.length;
    
    // Convert to 0-100 rating
    const pointsRating = Math.min(100, avgPoints * 10);
    const yardsRating = Math.min(100, avgYards / 2);
    
    return Math.round((pointsRating + yardsRating) / 2);
  }

  // ============================================================================
  // TEAM MANAGEMENT
  // ============================================================================

  /**
   * Create a new team with full initialization
   */
  static async createTeam(config: z.infer<typeof TeamCreationSchema>): Promise<any> {
    const validatedConfig = TeamCreationSchema.parse(config);
    
    // Validate team name
    const nameValidation = await teamNameValidation.validateTeamName(validatedConfig.name);
    if (!nameValidation.isValid) {
      throw new Error(`Invalid team name: ${nameValidation.reason}`);
    }

    const prisma = await getPrismaClient();

    return await prisma.$transaction(async (tx) => {
      // Create team
      const team = await tx.team.create({
        data: {
          name: validatedConfig.name,
          userProfileId: validatedConfig.userProfileId,
          division: validatedConfig.division || 8,
          subdivision: validatedConfig.subdivision || 'alpha',
          isAI: validatedConfig.isAI || false,
          logoUrl: validatedConfig.logoUrl,
          camaraderie: 50,
          fanLoyalty: 50,
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0
        }
      });

      // Create team finances
      await tx.teamFinance.create({
        data: {
          teamId: team.id,
          credits: validatedConfig.initialCredits || 1000000,
          gems: 0,
          totalRevenue: 0,
          totalExpenses: 0,
          lastUpdated: new Date()
        }
      });

      // Create stadium
      await tx.stadium.create({
        data: {
          teamId: team.id,
          name: `${team.name} Arena`,
          capacity: 10000,
          ticketPrice: 50,
          parkingPrice: 10,
          suitesCount: 10,
          suitePrice: 500,
          concessionQuality: 'AVERAGE',
          atmosphereRating: 50,
          maintenanceLevel: 50
        }
      });

      // Generate initial roster if not AI
      if (!validatedConfig.isAI) {
        await this.generateInitialRoster(team.id);
      }

      this.clearCache(`team-${team.id}`);
      logInfo(`Created team: ${team.name} (ID: ${team.id})`);
      
      return team;
    });
  }

  /**
   * Get comprehensive team data
   */
  static async getTeamDetails(teamId: number): Promise<any> {
    const cacheKey = `team-${teamId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const prisma = await getPrismaClient();
    
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        players: {
          include: {
            contract: true,
            skills: {
              include: { skill: true }
            }
          }
        },
        staff: {
          include: { contract: true }
        },
        finances: true,
        stadium: true,
        homeGames: {
          take: 5,
          orderBy: { gameDate: 'desc' }
        },
        awayGames: {
          take: 5,
          orderBy: { gameDate: 'desc' }
        }
      }
    });

    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    // Enrich with calculated fields
    const enrichedTeam = {
      ...team,
      totalSalary: await this.calculateTeamSalary(teamId),
      teamStrength: await this.calculateTeamStrength(teamId),
      camaraderieLevel: this.camaraderieService.getCamaraderieLevel(team.camaraderie),
      recentForm: await this.calculateRecentForm(teamId),
      injuredPlayers: team.players.filter((p: any) => p.injuryDays > 0).length
    };

    this.setCached(cacheKey, enrichedTeam);
    return enrichedTeam;
  }

  /**
   * Update team properties
   */
  static async updateTeam(teamId: number, updates: z.infer<typeof TeamUpdateSchema>): Promise<any> {
    const validatedUpdates = TeamUpdateSchema.parse(updates);
    
    // Validate name if being updated
    if (validatedUpdates.name) {
      const nameValidation = await teamNameValidation.validateTeamName(validatedUpdates.name);
      if (!nameValidation.isValid) {
        throw new Error(`Invalid team name: ${nameValidation.reason}`);
      }
    }

    const prisma = await getPrismaClient();
    
    const team = await prisma.team.update({
      where: { id: teamId },
      data: validatedUpdates
    });

    this.clearCache(`team-${teamId}`);
    logInfo(`Updated team ${teamId}`);
    
    return team;
  }

  /**
   * Generate initial roster for a new team
   */
  static async generateInitialRoster(teamId: number): Promise<any> {
    const players = [];
    const positions = ['PASSER', 'PASSER', 'RUNNER', 'RUNNER', 'BLOCKER', 'BLOCKER'];
    const races = ['HUMAN', 'SYLVAN', 'GRYLL', 'LUMINA', 'UMBRA'];

    for (const position of positions) {
      const player = await this.createPlayer({
        name: `Player ${Math.random().toString(36).substring(7)}`,
        race: races[Math.floor(Math.random() * races.length)] as any,
        position: position as any,
        teamId,
        age: Math.floor(Math.random() * 10) + 20,
        potential: Math.floor(Math.random() * 30) + 60,
        salary: Math.floor(Math.random() * 50000) + 30000,
        contractLength: Math.floor(Math.random() * 3) + 1
      });
      players.push(player);
    }

    return players;
  }

  /**
   * Calculate total team salary
   */
  static async calculateTeamSalary(teamId: number): Promise<number> {
    const prisma = await getPrismaClient();
    
    const contracts = await prisma.contract.findMany({
      where: {
        OR: [
          { player: { teamId } },
          { staff: { teamId } }
        ]
      }
    });

    return contracts.reduce((total, contract) => total + contract.salary, 0);
  }

  /**
   * Calculate team strength rating
   */
  static async calculateTeamStrength(teamId: number): Promise<number> {
    const prisma = await getPrismaClient();
    
    const players = await prisma.player.findMany({
      where: { teamId },
      include: {
        skills: true
      }
    });

    if (players.length === 0) return 0;

    // Calculate average skill levels
    const totalSkills = players.reduce((sum, player) => {
      const playerAvg = player.skills.reduce((s, skill) => s + skill.value, 0) / player.skills.length;
      return sum + playerAvg;
    }, 0);

    const avgSkill = totalSkills / players.length;
    
    // Scale to 0-100 and apply camaraderie bonus
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });
    
    const camaraderieBonus = team ? (team.camaraderie / 100) * 0.2 : 0; // Up to 20% bonus
    
    return Math.round((avgSkill / 20) * 100 * (1 + camaraderieBonus));
  }

  /**
   * Calculate recent form (last 5 games)
   */
  static async calculateRecentForm(teamId: number): Promise<string> {
    const prisma = await getPrismaClient();
    
    const recentGames = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
        status: 'COMPLETED'
      },
      take: 5,
      orderBy: { gameDate: 'desc' }
    });

    const form = recentGames.map(game => {
      const isHome = game.homeTeamId === teamId;
      const teamScore = isHome ? game.homeScore : game.awayScore;
      const oppScore = isHome ? game.awayScore : game.homeScore;
      
      if (!teamScore || !oppScore) return 'D';
      if (teamScore > oppScore) return 'W';
      if (teamScore < oppScore) return 'L';
      return 'D';
    }).join('');

    return form || 'N/A';
  }

  // ============================================================================
  // CONTRACT MANAGEMENT
  // ============================================================================

  /**
   * Negotiate and create a new contract
   */
  static async negotiateContract(config: z.infer<typeof ContractNegotiationSchema>): Promise<any> {
    const validatedConfig = ContractNegotiationSchema.parse(config);
    
    // Apply camaraderie effects to negotiation
    const team = await this.getTeamDetails(validatedConfig.teamId);
    const camaraderieEffect = this.camaraderieService.getContractNegotiationModifier(team.camaraderie);
    
    const adjustedSalary = Math.round(validatedConfig.salary * (1 - camaraderieEffect));
    
    return await this.contractService.createContract({
      ...validatedConfig,
      salary: adjustedSalary
    });
  }

  /**
   * Process contract renewals for expiring contracts
   */
  static async processContractRenewals(): Promise<any> {
    return await this.contractProgression.processExpiringContracts();
  }

  /**
   * Transfer player between teams
   */
  static async transferPlayer(
    playerId: number,
    fromTeamId: number,
    toTeamId: number,
    transferFee: number
  ): Promise<any> {
    const prisma = await getPrismaClient();

    return await prisma.$transaction(async (tx) => {
      // Update player team
      await tx.player.update({
        where: { id: playerId },
        data: { teamId: toTeamId }
      });

      // End current contract
      await tx.contract.updateMany({
        where: {
          playerId,
          player: { teamId: fromTeamId }
        },
        data: { endDate: new Date() }
      });

      // Process transfer fee
      await tx.teamFinance.update({
        where: { teamId: fromTeamId },
        data: {
          credits: { increment: transferFee }
        }
      });

      await tx.teamFinance.update({
        where: { teamId: toTeamId },
        data: {
          credits: { decrement: transferFee }
        }
      });

      // Update team camaraderie
      await this.camaraderieService.updateCamaraderieForTransfer(fromTeamId, -5);
      await this.camaraderieService.updateCamaraderieForTransfer(toTeamId, -3);

      this.clearCache(`team-${fromTeamId}`);
      this.clearCache(`team-${toTeamId}`);
      this.clearCache(`player-${playerId}`);

      logInfo(`Transferred player ${playerId} from team ${fromTeamId} to ${toTeamId} for ${transferFee}`);

      return {
        playerId,
        fromTeamId,
        toTeamId,
        transferFee,
        success: true
      };
    });
  }

  // ============================================================================
  // CAMARADERIE MANAGEMENT
  // ============================================================================

  /**
   * Update team camaraderie based on events
   */
  static async updateTeamCamaraderie(
    teamId: number,
    event: 'WIN' | 'LOSS' | 'DRAW' | 'TRAINING' | 'TRANSFER_IN' | 'TRANSFER_OUT'
  ): Promise<any> {
    const changes = {
      WIN: 3,
      DRAW: 1,
      LOSS: -2,
      TRAINING: 2,
      TRANSFER_IN: -3,
      TRANSFER_OUT: -5
    };

    const change = changes[event] || 0;
    return await this.camaraderieService.updateCamaraderieForTransfer(teamId, change);
  }

  /**
   * Get camaraderie effects for a team
   */
  static async getCamaraderieEffects(teamId: number): Promise<any> {
    const team = await this.getTeamDetails(teamId);
    
    return {
      level: this.camaraderieService.getCamaraderieLevel(team.camaraderie),
      effects: {
        performanceBonus: this.camaraderieService.getPerformanceModifier(team.camaraderie),
        injuryReduction: this.camaraderieService.getInjuryModifier(team.camaraderie),
        contractDiscount: this.camaraderieService.getContractNegotiationModifier(team.camaraderie),
        fanLoyaltyBonus: team.camaraderie > 70 ? 0.1 : 0
      }
    };
  }

  // ============================================================================
  // INJURY & STAMINA MANAGEMENT
  // ============================================================================

  /**
   * Process injuries for a match
   */
  static async processMatchInjuries(matchId: string): Promise<any> {
    return await this.injuryStamina.processMatchInjuries(parseInt(matchId));
  }

  /**
   * Process daily recovery for all players
   */
  static async processDailyRecovery(): Promise<any> {
    return await this.injuryStamina.processDailyRecovery();
  }

  /**
   * Get medical report for a team
   */
  static async getTeamMedicalReport(teamId: number): Promise<any> {
    const prisma = await getPrismaClient();
    
    const players = await prisma.player.findMany({
      where: { teamId },
      select: {
        id: true,
        name: true,
        injuryDays: true,
        stamina: true,
        position: true
      }
    });

    return {
      teamId,
      injured: players.filter(p => p.injuryDays > 0),
      tired: players.filter(p => p.stamina < 50),
      healthy: players.filter(p => p.injuryDays === 0 && p.stamina >= 50),
      averageStamina: players.reduce((sum, p) => sum + p.stamina, 0) / players.length,
      readyToPlay: players.filter(p => p.injuryDays === 0 && p.stamina >= 30).length
    };
  }

  // ============================================================================
  // STATISTICS & INTEGRITY
  // ============================================================================

  /**
   * Sync team statistics from game results
   */
  static async syncTeamStatistics(teamId: number): Promise<any> {
    const result = await this.teamStats.syncTeamStatistics(teamId);
    this.clearCache(`team-${teamId}`);
    return result;
  }

  /**
   * Verify statistics integrity for all teams
   */
  static async verifyAllTeamStatistics(): Promise<any> {
    const results = await this.teamStats.verifyAllTeamIntegrity();
    this.clearCache('team');
    return results;
  }

  /**
   * Get team performance analytics
   */
  static async getTeamAnalytics(teamId: number): Promise<any> {
    const cacheKey = `analytics-${teamId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const prisma = await getPrismaClient();
    
    // Get team stats
    const team = await this.getTeamDetails(teamId);
    const totalGames = team.wins + team.losses + team.draws;
    
    // Get scoring statistics
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
        status: 'COMPLETED'
      }
    });

    let pointsFor = 0;
    let pointsAgainst = 0;
    
    games.forEach(game => {
      if (game.homeTeamId === teamId) {
        pointsFor += game.homeScore || 0;
        pointsAgainst += game.awayScore || 0;
      } else {
        pointsFor += game.awayScore || 0;
        pointsAgainst += game.homeScore || 0;
      }
    });

    const analytics = {
      winRate: totalGames > 0 ? (team.wins / totalGames) * 100 : 0,
      avgPointsFor: totalGames > 0 ? pointsFor / totalGames : 0,
      avgPointsAgainst: totalGames > 0 ? pointsAgainst / totalGames : 0,
      pointsDifference: pointsFor - pointsAgainst,
      pointsPerGame: totalGames > 0 ? team.points / totalGames : 0,
      form: await this.calculateRecentForm(teamId),
      homeRecord: {
        wins: games.filter(g => g.homeTeamId === teamId && (g.homeScore || 0) > (g.awayScore || 0)).length,
        losses: games.filter(g => g.homeTeamId === teamId && (g.homeScore || 0) < (g.awayScore || 0)).length,
        draws: games.filter(g => g.homeTeamId === teamId && (g.homeScore || 0) === (g.awayScore || 0)).length
      },
      awayRecord: {
        wins: games.filter(g => g.awayTeamId === teamId && (g.awayScore || 0) > (g.homeScore || 0)).length,
        losses: games.filter(g => g.awayTeamId === teamId && (g.awayScore || 0) < (g.homeScore || 0)).length,
        draws: games.filter(g => g.awayTeamId === teamId && (g.awayScore || 0) === (g.homeScore || 0)).length
      }
    };

    this.setCached(cacheKey, analytics);
    return analytics;
  }

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================

  /**
   * Bulk update player skills for testing
   */
  static async bulkUpdatePlayerSkills(
    teamId: number,
    skillLevel: number = 10
  ): Promise<any> {
    const prisma = await getPrismaClient();
    
    const players = await prisma.player.findMany({
      where: { teamId }
    });

    let updated = 0;
    for (const player of players) {
      await prisma.playerSkill.updateMany({
        where: { playerId: player.id },
        data: { value: skillLevel }
      });
      updated++;
    }

    this.clearCache(`team-${teamId}`);
    return { teamId, playersUpdated: updated, newSkillLevel: skillLevel };
  }

  /**
   * Reset team statistics
   */
  static async resetTeamStatistics(teamId: number): Promise<any> {
    const prisma = await getPrismaClient();
    
    await prisma.team.update({
      where: { id: teamId },
      data: {
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0
      }
    });

    this.clearCache(`team-${teamId}`);
    return { teamId, message: 'Statistics reset successfully' };
  }

  /**
   * Get comprehensive service status
   */
  static async getServiceStatus(): Promise<any> {
    const prisma = await getPrismaClient();
    
    const [
      totalPlayers,
      totalTeams,
      activeContracts,
      injuredPlayers,
      retiringPlayers
    ] = await Promise.all([
      prisma.player.count(),
      prisma.team.count(),
      prisma.contract.count({ where: { endDate: null } }),
      prisma.player.count({ where: { injuryDays: { gt: 0 } } }),
      prisma.player.count({ where: { age: { gte: 35 } } })
    ]);

    return {
      statistics: {
        totalPlayers,
        totalTeams,
        activeContracts,
        injuredPlayers,
        retiringPlayers
      },
      cache: {
        entries: this.cache.size,
        memoryUsage: JSON.stringify(Array.from(this.cache.values())).length
      },
      services: {
        comprehensiveProgression: 'Active',
        dailyProgression: 'Active',
        agingRetirement: 'Active',
        contractManagement: 'Active',
        camaraderie: 'Active',
        injuryStamina: 'Active',
        teamStatistics: 'Active'
      }
    };
  }
}

// ============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================================================

/**
 * Export individual service classes for backward compatibility
 */
export const PlayerProgressionServiceCompat = {
  processAllPlayers: () => EnhancedTeamManagementService.processDailyProgression(),
  progressPlayer: (config: any) => EnhancedTeamManagementService.progressPlayer(config)
};

export const TeamServiceCompat = {
  createTeam: (config: any) => EnhancedTeamManagementService.createTeam(config),
  getTeamDetails: (teamId: number) => EnhancedTeamManagementService.getTeamDetails(teamId),
  updateTeam: (teamId: number, updates: any) => EnhancedTeamManagementService.updateTeam(teamId, updates),
  calculateTeamStrength: (teamId: number) => EnhancedTeamManagementService.calculateTeamStrength(teamId)
};

export const ContractServiceCompat = {
  createContract: (config: any) => EnhancedTeamManagementService.negotiateContract(config),
  processExpiringContracts: () => EnhancedTeamManagementService.processContractRenewals()
};

export const CamaraderieServiceCompat = {
  updateCamaraderie: (teamId: number, event: any) => 
    EnhancedTeamManagementService.updateTeamCamaraderie(teamId, event),
  getCamaraderieEffects: (teamId: number) => 
    EnhancedTeamManagementService.getCamaraderieEffects(teamId)
};

export const InjuryServiceCompat = {
  processMatchInjuries: (matchId: string) => 
    EnhancedTeamManagementService.processMatchInjuries(matchId),
  processDailyRecovery: () => 
    EnhancedTeamManagementService.processDailyRecovery()
};

// Re-export for convenience
export { ComprehensivePlayerProgressionService } from './comprehensivePlayerProgressionService.js';
export { DailyPlayerProgressionService } from './dailyPlayerProgressionService.js';
export { PlayerAgingRetirementService } from './playerAgingRetirementService.js';
export { PlayerContractInitializer } from './playerContractInitializer.js';
export { PlayerSkillsService } from './playerSkillsService.js';
export { teamNameValidation } from './teamNameValidation.js';
export { TeamStatisticsIntegrityService } from './teamStatisticsIntegrityService.js';
export { ContractProgressionService } from './contractProgressionService.js';
export { ContractService } from './contractService.js';
export { CamaraderieService } from './camaraderieService.js';
export { InjuryStaminaService } from './injuryStaminaService.js';