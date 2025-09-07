/**
 * Enhanced Competition Service - Phase 4D Consolidation
 * 
 * Unified competition system that provides a comprehensive facade over all tournament,
 * playoff, and competition functionality following zero technical debt principles.
 * 
 * This service acts as a facade/orchestrator that delegates to specialized services
 * while providing a unified interface for all competition-related operations.
 * 
 * Consolidates access to:
 * - tournamentService.ts (core tournament operations)
 * - tournamentFlowService.ts (tournament progression)
 * - tournamentRecoveryService.ts (error recovery)
 * - tournamentBracketValidator.ts (bracket validation)
 * - dailyTournamentAutoFillService.ts (AI auto-fill)
 * - unifiedTournamentAutomation.ts (automation)
 * - dynamicPlayoffService.ts (playoff management)
 */

import { getPrismaClient } from '../database.js';
import { z } from 'zod';
import logger from '../utils/logger.js';
import { randomUUID } from 'crypto';
import moment from 'moment-timezone';

// Import existing specialized services
import { TournamentService, tournamentService } from './tournamentService.js';
import { tournamentFlowService } from './tournamentFlowService.js';
import { tournamentRecoveryService } from './tournamentRecoveryService.js';
import { TournamentBracketValidator } from './tournamentBracketValidator.js';
import { dailyTournamentAutoFillService } from './dailyTournamentAutoFillService.js';
import { UnifiedTournamentAutomation } from './unifiedTournamentAutomation.js';
import { DynamicPlayoffService } from './dynamicPlayoffService.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TournamentReward {
  credits: number;
  gems: number;
  trophy?: string;
}

export interface TournamentConfig {
  type: "DAILY_DIVISIONAL" | "MID_SEASON_CLASSIC" | "PLAYOFF";
  division: number;
  season: number;
  gameDay?: number;
  entryFeeCredits?: number;
  entryFeeGems?: number;
  requiresEntryItem?: boolean;
  maxTeams: number;
  rewards: {
    champion: TournamentReward;
    runnerUp: TournamentReward;
    semifinalist?: TournamentReward;
  };
}

export interface CompetitionStatus {
  tournamentId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  currentRound: number;
  totalRounds: number;
  participantsCount: number;
  nextMatchTime?: Date;
  winner?: { teamId: number; teamName: string };
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const TournamentRegistrationSchema = z.object({
  teamId: z.number().int().positive(),
  tournamentId: z.number().int().positive(),
  paymentType: z.enum(['credits', 'gems', 'both']).optional()
});

const TournamentCreationSchema = z.object({
  division: z.number().int().min(1).max(8),
  type: z.enum(['DAILY_DIVISIONAL', 'MID_SEASON_CLASSIC', 'PLAYOFF']),
  maxTeams: z.number().int().min(2).max(64).optional(),
  entryFeeCredits: z.number().int().min(0).optional(),
  entryFeeGems: z.number().int().min(0).optional()
});

const PlayoffConfigSchema = z.object({
  division: z.number().int().min(1).max(8),
  subdivision: z.string().optional(),
  topTeamsCount: z.number().int().min(2).max(8).default(4),
  scheduleBuffer: z.number().int().min(5).max(60).default(30) // minutes
});

// ============================================================================
// ENHANCED COMPETITION SERVICE
// ============================================================================

export class EnhancedCompetitionService {
  // Cache for frequently accessed data
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Service instances
  private static tournamentService = tournamentService;
  private static tournamentFlowService = tournamentFlowService;
  private static tournamentRecoveryService = tournamentRecoveryService;
  private static bracketValidator = new TournamentBracketValidator();
  private static autoFillService = dailyTournamentAutoFillService;
  private static automationService = new UnifiedTournamentAutomation();
  private static playoffService = new DynamicPlayoffService();

  // ============================================================================
  // TOURNAMENT CREATION & MANAGEMENT
  // ============================================================================

  /**
   * Create a new tournament with comprehensive validation
   */
  static async createTournament(config: z.infer<typeof TournamentCreationSchema>): Promise<{
    success: boolean;
    tournamentId?: string;
    error?: string;
  }> {
    logger.info('[CompetitionService] Creating tournament', config);

    try {
      const validated = TournamentCreationSchema.parse(config);
      
      let tournamentId: string;

      switch (validated.type) {
        case 'DAILY_DIVISIONAL':
          tournamentId = await this.tournamentService.createDailyDivisionTournament(validated.division);
          break;
        case 'MID_SEASON_CLASSIC':
          tournamentId = await this.tournamentService.createMidSeasonCup(validated.division);
          break;
        case 'PLAYOFF':
          const result = await this.playoffService.generatePlayoffBracket(
            validated.division,
            undefined,
            validated.maxTeams || 4
          );
          tournamentId = result.tournamentId;
          break;
        default:
          throw new Error('Invalid tournament type');
      }

      // Clear cache
      this.clearCache('tournaments');

      logger.info('[CompetitionService] Tournament created', { tournamentId, type: validated.type });
      return { success: true, tournamentId };

    } catch (error) {
      logger.error('[CompetitionService] Tournament creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors[0].message };
      }
      
      return { success: false, error: error instanceof Error ? error.message : 'Tournament creation failed' };
    }
  }

  /**
   * Register a team for a tournament
   */
  static async registerForTournament(
    teamId: number,
    tournamentId: number,
    paymentType?: 'credits' | 'gems' | 'both'
  ): Promise<{ success: boolean; error?: string }> {
    logger.info('[CompetitionService] Tournament registration', { teamId, tournamentId });

    try {
      const validated = TournamentRegistrationSchema.parse({ teamId, tournamentId, paymentType });
      
      await this.tournamentService.registerForTournament(
        validated.teamId,
        validated.tournamentId,
        validated.paymentType
      );

      // Clear cache
      this.clearCache(`tournament-${tournamentId}`);
      this.clearCache(`team-tournaments-${teamId}`);

      logger.info('[CompetitionService] Registration successful', { teamId, tournamentId });
      return { success: true };

    } catch (error) {
      logger.error('[CompetitionService] Registration failed', {
        teamId,
        tournamentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return { success: false, error: error instanceof Error ? error.message : 'Registration failed' };
    }
  }

  /**
   * Get available tournaments for a team
   */
  static async getAvailableTournaments(teamId: number): Promise<any[]> {
    const cacheKey = `available-tournaments-${teamId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const tournaments = await this.tournamentService.getAvailableTournaments(teamId);
    this.setCache(cacheKey, tournaments);
    return tournaments;
  }

  /**
   * Get team's tournament history
   */
  static async getTeamTournamentHistory(teamId: number): Promise<{
    active: any[];
    completed: any[];
    stats: {
      totalTournaments: number;
      championships: number;
      runnerUps: number;
      totalEarnings: { credits: number; gems: number };
    };
  }> {
    const cacheKey = `team-tournament-history-${teamId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const [active, history, stats] = await Promise.all([
      this.tournamentService.getTeamTournaments(teamId),
      this.tournamentService.getTournamentHistory(teamId),
      this.tournamentService.getTournamentStats(teamId)
    ]);

    const result = {
      active,
      completed: history,
      stats
    };

    this.setCache(cacheKey, result);
    return result;
  }

  // ============================================================================
  // TOURNAMENT FLOW & PROGRESSION
  // ============================================================================

  /**
   * Process tournament round completion
   */
  static async processTournamentRound(tournamentId: number): Promise<{
    success: boolean;
    nextRound?: number;
    winner?: { teamId: number; teamName: string };
    error?: string;
  }> {
    logger.info('[CompetitionService] Processing tournament round', { tournamentId });

    try {
      const result = await this.tournamentFlowService.processTournamentRound(tournamentId);
      
      // Clear cache
      this.clearCache(`tournament-${tournamentId}`);
      this.clearCache('tournaments');

      logger.info('[CompetitionService] Round processed', { 
        tournamentId, 
        completed: result.isComplete,
        winner: result.winner
      });

      return {
        success: true,
        nextRound: result.nextRound,
        winner: result.winner
      };

    } catch (error) {
      logger.error('[CompetitionService] Round processing failed', {
        tournamentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return { success: false, error: error instanceof Error ? error.message : 'Processing failed' };
    }
  }

  /**
   * Advance tournament to next round
   */
  static async advanceTournamentRound(tournamentId: number, completedRound: number): Promise<{
    success: boolean;
    error?: string;
  }> {
    logger.info('[CompetitionService] Advancing tournament round', { tournamentId, completedRound });

    try {
      await this.tournamentService.advanceTournamentRound(tournamentId, completedRound);
      
      // Clear cache
      this.clearCache(`tournament-${tournamentId}`);

      logger.info('[CompetitionService] Round advanced', { tournamentId, completedRound });
      return { success: true };

    } catch (error) {
      logger.error('[CompetitionService] Round advancement failed', {
        tournamentId,
        completedRound,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return { success: false, error: error instanceof Error ? error.message : 'Advancement failed' };
    }
  }

  /**
   * Get tournament status
   */
  static async getTournamentStatus(tournamentId: number): Promise<CompetitionStatus | null> {
    const cacheKey = `tournament-status-${tournamentId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const prisma = await getPrismaClient();
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          matches: {
            orderBy: { round: 'desc' },
            take: 1
          },
          participants: {
            include: { team: true }
          }
        }
      });

      if (!tournament) return null;

      const status: CompetitionStatus = {
        tournamentId: tournament.id.toString(),
        status: tournament.status as any,
        currentRound: tournament.currentRound || 0,
        totalRounds: Math.ceil(Math.log2(tournament.maxParticipants || 8)),
        participantsCount: tournament.participants.length,
        nextMatchTime: tournament.matches[0]?.gameDate || undefined,
        winner: tournament.winnerId ? {
          teamId: tournament.winnerId,
          teamName: tournament.participants.find(p => p.teamId === tournament.winnerId)?.team?.name || 'Unknown'
        } : undefined
      };

      this.setCache(cacheKey, status);
      return status;

    } catch (error) {
      logger.error('[CompetitionService] Failed to get tournament status', {
        tournamentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  // ============================================================================
  // AUTO-FILL & AI MANAGEMENT
  // ============================================================================

  /**
   * Fill tournament with AI teams
   */
  static async fillTournamentWithAI(tournamentId: number, targetCount?: number): Promise<{
    success: boolean;
    teamsAdded: number;
    error?: string;
  }> {
    logger.info('[CompetitionService] Filling tournament with AI', { tournamentId, targetCount });

    try {
      const prisma = await getPrismaClient();
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { participants: true }
      });

      if (!tournament) {
        throw new Error('Tournament not found');
      }

      const spotsToFill = targetCount || (tournament.maxParticipants || 8) - tournament.participants.length;
      
      if (spotsToFill <= 0) {
        return { success: true, teamsAdded: 0 };
      }

      await this.tournamentService.fillTournamentWithAI(tournamentId, spotsToFill);
      
      // Clear cache
      this.clearCache(`tournament-${tournamentId}`);

      logger.info('[CompetitionService] AI teams added', { tournamentId, teamsAdded: spotsToFill });
      return { success: true, teamsAdded: spotsToFill };

    } catch (error) {
      logger.error('[CompetitionService] AI fill failed', {
        tournamentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return { success: false, teamsAdded: 0, error: error instanceof Error ? error.message : 'AI fill failed' };
    }
  }

  /**
   * Schedule auto-fill for tournament
   */
  static async scheduleAutoFill(tournamentId: number, delayMinutes: number = 5): Promise<{
    success: boolean;
    scheduledTime: Date;
    error?: string;
  }> {
    logger.info('[CompetitionService] Scheduling auto-fill', { tournamentId, delayMinutes });

    try {
      const scheduledTime = new Date(Date.now() + delayMinutes * 60 * 1000);
      
      await this.autoFillService.scheduleTournamentAutoFill(tournamentId, delayMinutes);
      
      logger.info('[CompetitionService] Auto-fill scheduled', { tournamentId, scheduledTime });
      return { success: true, scheduledTime };

    } catch (error) {
      logger.error('[CompetitionService] Auto-fill scheduling failed', {
        tournamentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return { 
        success: false, 
        scheduledTime: new Date(), 
        error: error instanceof Error ? error.message : 'Scheduling failed' 
      };
    }
  }

  // ============================================================================
  // BRACKET VALIDATION & RECOVERY
  // ============================================================================

  /**
   * Validate tournament bracket integrity
   */
  static async validateBracket(tournamentId: number): Promise<{
    isValid: boolean;
    issues: string[];
    canRecover: boolean;
  }> {
    logger.info('[CompetitionService] Validating bracket', { tournamentId });

    try {
      const validation = await this.bracketValidator.validateTournamentBracket(tournamentId);
      
      logger.info('[CompetitionService] Bracket validation complete', { 
        tournamentId, 
        isValid: validation.isValid,
        issueCount: validation.issues.length 
      });

      return validation;

    } catch (error) {
      logger.error('[CompetitionService] Bracket validation failed', {
        tournamentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        isValid: false,
        issues: ['Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error')],
        canRecover: false
      };
    }
  }

  /**
   * Recover tournament from error state
   */
  static async recoverTournament(tournamentId: number): Promise<{
    success: boolean;
    actionsTaken: string[];
    error?: string;
  }> {
    logger.info('[CompetitionService] Recovering tournament', { tournamentId });

    try {
      const result = await this.tournamentRecoveryService.recoverTournament(tournamentId);
      
      // Clear cache
      this.clearCache(`tournament-${tournamentId}`);

      logger.info('[CompetitionService] Tournament recovered', { 
        tournamentId, 
        success: result.recovered,
        actionCount: result.actions.length 
      });

      return {
        success: result.recovered,
        actionsTaken: result.actions,
        error: result.error
      };

    } catch (error) {
      logger.error('[CompetitionService] Tournament recovery failed', {
        tournamentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        actionsTaken: [],
        error: error instanceof Error ? error.message : 'Recovery failed'
      };
    }
  }

  // ============================================================================
  // PLAYOFF MANAGEMENT
  // ============================================================================

  /**
   * Generate playoff bracket for division
   */
  static async generatePlayoffBracket(config: z.infer<typeof PlayoffConfigSchema>): Promise<{
    success: boolean;
    tournamentId?: string;
    bracket?: any;
    error?: string;
  }> {
    logger.info('[CompetitionService] Generating playoff bracket', config);

    try {
      const validated = PlayoffConfigSchema.parse(config);
      
      const result = await this.playoffService.generatePlayoffBracket(
        validated.division,
        validated.subdivision,
        validated.topTeamsCount
      );

      // Schedule dynamic round progression
      if (result.tournamentId) {
        await this.playoffService.monitorAndScheduleNextRound(
          parseInt(result.tournamentId),
          validated.scheduleBuffer
        );
      }

      logger.info('[CompetitionService] Playoff bracket generated', { 
        tournamentId: result.tournamentId,
        teamCount: result.teams?.length 
      });

      return {
        success: true,
        tournamentId: result.tournamentId,
        bracket: result
      };

    } catch (error) {
      logger.error('[CompetitionService] Playoff generation failed', {
        config,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors[0].message };
      }
      
      return { success: false, error: error instanceof Error ? error.message : 'Playoff generation failed' };
    }
  }

  /**
   * Monitor playoff progression
   */
  static async monitorPlayoffProgression(tournamentId: number): Promise<{
    currentRound: number;
    isComplete: boolean;
    nextRoundScheduled?: Date;
    winner?: { teamId: number; teamName: string };
  }> {
    logger.info('[CompetitionService] Monitoring playoff progression', { tournamentId });

    try {
      const status = await this.getTournamentStatus(tournamentId);
      
      if (!status) {
        throw new Error('Tournament not found');
      }

      // Check if next round needs scheduling
      if (status.status === 'IN_PROGRESS' && !status.nextMatchTime) {
        await this.playoffService.monitorAndScheduleNextRound(tournamentId);
        
        // Refresh status
        this.clearCache(`tournament-status-${tournamentId}`);
        const updatedStatus = await this.getTournamentStatus(tournamentId);
        
        return {
          currentRound: updatedStatus?.currentRound || 0,
          isComplete: updatedStatus?.status === 'COMPLETED',
          nextRoundScheduled: updatedStatus?.nextMatchTime,
          winner: updatedStatus?.winner
        };
      }

      return {
        currentRound: status.currentRound,
        isComplete: status.status === 'COMPLETED',
        nextRoundScheduled: status.nextMatchTime,
        winner: status.winner
      };

    } catch (error) {
      logger.error('[CompetitionService] Playoff monitoring failed', {
        tournamentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        currentRound: 0,
        isComplete: false
      };
    }
  }

  // ============================================================================
  // AUTOMATION & SCHEDULING
  // ============================================================================

  /**
   * Start tournament automation
   */
  static async startAutomation(): Promise<{ success: boolean; error?: string }> {
    logger.info('[CompetitionService] Starting tournament automation');

    try {
      await this.automationService.startAutomation();
      
      logger.info('[CompetitionService] Automation started');
      return { success: true };

    } catch (error) {
      logger.error('[CompetitionService] Automation start failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return { success: false, error: error instanceof Error ? error.message : 'Automation failed' };
    }
  }

  /**
   * Stop tournament automation
   */
  static async stopAutomation(): Promise<{ success: boolean; error?: string }> {
    logger.info('[CompetitionService] Stopping tournament automation');

    try {
      await this.automationService.stopAutomation();
      
      logger.info('[CompetitionService] Automation stopped');
      return { success: true };

    } catch (error) {
      logger.error('[CompetitionService] Automation stop failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return { success: false, error: error instanceof Error ? error.message : 'Stop failed' };
    }
  }

  /**
   * Check and start pending tournaments
   */
  static async checkAndStartTournaments(): Promise<{
    started: number;
    errors: string[];
  }> {
    logger.info('[CompetitionService] Checking tournaments to start');

    try {
      await this.tournamentService.checkAndStartTournaments();
      
      // Get count of started tournaments (would need to track this)
      const started = 0; // TODO: Track started count
      
      logger.info('[CompetitionService] Tournament check complete', { started });
      return { started, errors: [] };

    } catch (error) {
      logger.error('[CompetitionService] Tournament check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        started: 0,
        errors: [error instanceof Error ? error.message : 'Check failed']
      };
    }
  }

  // ============================================================================
  // COMPREHENSIVE STATUS & REPORTING
  // ============================================================================

  /**
   * Get comprehensive competition status across all tournaments
   */
  static async getCompetitionOverview(): Promise<{
    active: {
      daily: number;
      midSeason: number;
      playoffs: number;
      total: number;
    };
    scheduled: number;
    completed: {
      today: number;
      thisWeek: number;
      thisSeason: number;
    };
    participation: {
      uniqueTeams: number;
      averagePerTournament: number;
    };
  }> {
    const cacheKey = 'competition-overview';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const prisma = await getPrismaClient();
      
      // Get active tournaments by type
      const [daily, midSeason, playoffs, allActive] = await Promise.all([
        prisma.tournament.count({
          where: { 
            status: 'IN_PROGRESS',
            type: 'DAILY_DIVISIONAL'
          }
        }),
        prisma.tournament.count({
          where: { 
            status: 'IN_PROGRESS',
            type: 'MID_SEASON_CUP'
          }
        }),
        prisma.tournament.count({
          where: { 
            status: 'IN_PROGRESS',
            type: 'PLAYOFF'
          }
        }),
        prisma.tournament.count({
          where: { status: 'IN_PROGRESS' }
        })
      ]);

      // Get scheduled tournaments
      const scheduled = await prisma.tournament.count({
        where: { status: 'PENDING' }
      });

      // Get completed tournaments
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      
      const [completedToday, completedThisWeek, completedThisSeason] = await Promise.all([
        prisma.tournament.count({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: todayStart }
          }
        }),
        prisma.tournament.count({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: weekStart }
          }
        }),
        prisma.tournament.count({
          where: { status: 'COMPLETED' }
        })
      ]);

      // Get participation stats
      const participationData = await prisma.tournamentParticipant.groupBy({
        by: ['teamId'],
        _count: true
      });

      const totalParticipants = await prisma.tournamentParticipant.count();
      const totalTournaments = await prisma.tournament.count();

      const overview = {
        active: {
          daily,
          midSeason,
          playoffs,
          total: allActive
        },
        scheduled,
        completed: {
          today: completedToday,
          thisWeek: completedThisWeek,
          thisSeason: completedThisSeason
        },
        participation: {
          uniqueTeams: participationData.length,
          averagePerTournament: totalTournaments > 0 ? Math.round(totalParticipants / totalTournaments) : 0
        }
      };

      this.setCache(cacheKey, overview);
      return overview;

    } catch (error) {
      logger.error('[CompetitionService] Failed to get competition overview', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        active: { daily: 0, midSeason: 0, playoffs: 0, total: 0 },
        scheduled: 0,
        completed: { today: 0, thisWeek: 0, thisSeason: 0 },
        participation: { uniqueTeams: 0, averagePerTournament: 0 }
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get cached data if still valid
   */
  private static getCached(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cache data
   */
  private static setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear cache entries matching pattern
   */
  private static clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// ============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================================================

// Export as TournamentService for backward compatibility
export { TournamentService, tournamentService } from './tournamentService.js';

// Export flow service
export { tournamentFlowService } from './tournamentFlowService.js';

// Export recovery service
export { tournamentRecoveryService } from './tournamentRecoveryService.js';

// Export bracket validator
export { TournamentBracketValidator } from './tournamentBracketValidator.js';

// Export auto-fill service
export { dailyTournamentAutoFillService } from './dailyTournamentAutoFillService.js';
export const DailyTournamentAutoFillService = {
  scheduleTournamentAutoFill: EnhancedCompetitionService.scheduleAutoFill.bind(EnhancedCompetitionService),
  recoverActiveTimers: async () => { /* Recovery handled internally */ }
};

// Export automation service
export { UnifiedTournamentAutomation } from './unifiedTournamentAutomation.js';

// Export playoff service
export { DynamicPlayoffService } from './dynamicPlayoffService.js';

// Default export
export default EnhancedCompetitionService;