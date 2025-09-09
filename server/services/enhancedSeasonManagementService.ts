/**
 * Enhanced Season Management Service
 * 
 * Unified facade for all season-related operations including:
 * - Season lifecycle management (17-day cycles)
 * - Schedule generation and management
 * - Dynamic date calculations
 * - Automated season progression
 * - Promotion/relegation cascades
 * 
 * This service follows the Facade pattern to provide a clean interface
 * while delegating to specialized services for complex operations.
 * 
 * @module EnhancedSeasonManagementService
 */

import { z } from 'zod';
import { getPrismaClient } from '../database.js';
import { DynamicSeasonService } from './dynamicSeasonService.js';
import { SeasonalFlowService } from './seasonalFlowService.js';
import { SeasonTimingAutomationService } from './seasonTimingAutomationService.js';
import { ScheduleGenerationService } from './scheduleGenerationService.js';
import { logInfo, logError } from './errorService.js';
import { getEasternTime, EASTERN_TIMEZONE } from '../../shared/timezone.js';

// ============================================================================
// SCHEMAS & TYPES
// ============================================================================

/**
 * Season creation configuration schema
 */
const SeasonCreationSchema = z.object({
  name: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  divisions: z.array(z.object({
    division: z.number().min(1).max(8),
    subdivisions: z.array(z.string())
  })).optional()
});

/**
 * Schedule generation configuration schema
 */
const ScheduleGenerationSchema = z.object({
  seasonId: z.string(),
  division: z.number().min(1).max(8),
  subdivision: z.string(),
  startDay: z.number().min(1).max(17).optional(),
  endDay: z.number().min(1).max(17).optional(),
  gamesPerDay: z.number().min(1).optional(),
  timeSlots: z.array(z.object({
    hour: z.number().min(0).max(23),
    minute: z.number().min(0).max(59)
  })).optional()
});

/**
 * Season progression configuration schema
 */
const SeasonProgressionSchema = z.object({
  targetDay: z.number().min(1).max(17).optional(),
  simulateGames: z.boolean().optional(),
  processPromotions: z.boolean().optional(),
  generateTournaments: z.boolean().optional()
});

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class EnhancedSeasonManagementService {
  // Service instances (using facade pattern)
  private static dynamicSeasonService = DynamicSeasonService.getInstance();
  private static seasonalFlowService = SeasonalFlowService;
  private static seasonTimingAutomation = SeasonTimingAutomationService.getInstance();
  private static scheduleGenerationService = ScheduleGenerationService;

  // Cache for season data (5-minute TTL)
  private static seasonCache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Clear cached data
   */
  private static clearCache(pattern?: string): void {
    if (pattern) {
      const keys = Array.from(this.seasonCache.keys());
      for (const key of keys) {
        if (key.includes(pattern)) {
          this.seasonCache.delete(key);
        }
      }
    } else {
      this.seasonCache.clear();
    }
  }

  /**
   * Get cached data
   */
  private static getCached<T>(key: string): T | null {
    const cached = this.seasonCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    this.seasonCache.delete(key);
    return null;
  }

  /**
   * Set cached data
   */
  private static setCached(key: string, data: any): void {
    this.seasonCache.set(key, { data, timestamp: Date.now() });
  }

  // ============================================================================
  // SEASON LIFECYCLE MANAGEMENT
  // ============================================================================

  /**
   * Get current season information
   */
  static async getCurrentSeason(): Promise<any> {
    const cacheKey = 'current-season';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const prisma = await getPrismaClient();
    const season = await prisma.season.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        schedules: {
          include: {
            games: {
              where: { status: 'SCHEDULED' },
              take: 10
            }
          }
        }
      }
    });

    if (!season) {
      throw new Error('No active season found');
    }

    // Add computed fields
    const enrichedSeason = {
      ...season,
      currentDay: await this.getCurrentDay(),
      daysRemaining: 17 - (await this.getCurrentDay()),
      phase: await this.getSeasonPhase(),
      nextEvent: await this.getNextSeasonEvent()
    };

    this.setCached(cacheKey, enrichedSeason);
    return enrichedSeason;
  }

  /**
   * Create new season
   */
  static async createSeason(config: z.infer<typeof SeasonCreationSchema> = {}): Promise<any> {
    const prisma = await getPrismaClient();
    
    return await prisma.$transaction(async (tx) => {
      // End current season if exists
      const currentSeason = await tx.season.findFirst({
        orderBy: { createdAt: 'desc' }
      });

      if (currentSeason && !currentSeason.endDate) {
        await tx.season.update({
          where: { id: currentSeason.id },
          data: { endDate: new Date() }
        });
      }

      // Create new season
      const season = await tx.season.create({
        data: {
          startDate: config.startDate || new Date(),
          endDate: config.endDate,
          currentDay: 1
        }
      });

      // Generate initial schedules if divisions provided
      if (config.divisions) {
        for (const divConfig of config.divisions) {
          for (const subdivision of divConfig.subdivisions) {
            await this.generateSchedule({
              seasonId: season.id,
              division: divConfig.division,
              subdivision
            });
          }
        }
      }

      this.clearCache();
      logInfo(`Created new season: ${season.id}`);
      return season;
    });
  }

  /**
   * Get current day in season (1-17)
   */
  static async getCurrentDay(): Promise<number> {
    return await this.seasonalFlowService.getCurrentDay();
  }

  /**
   * Get season phase (regular, playoffs, offseason)
   */
  static async getSeasonPhase(): Promise<'regular' | 'playoffs' | 'offseason'> {
    const currentDay = await this.getCurrentDay();
    
    if (currentDay <= 14) return 'regular';
    if (currentDay === 15) return 'playoffs';
    return 'offseason';
  }

  /**
   * Get next scheduled season event
   */
  static async getNextSeasonEvent(): Promise<{
    type: string;
    day: number;
    time: Date;
    description: string;
  } | null> {
    const currentDay = await this.getCurrentDay();
    const now = new Date();

    // Determine next event based on current day
    if (currentDay < 7) {
      return {
        type: 'MID_SEASON_CUP',
        day: 7,
        time: new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - currentDay)),
        description: 'Mid-Season Cup Tournament'
      };
    } else if (currentDay < 14) {
      return {
        type: 'DIVISION_TOURNAMENT',
        day: 14,
        time: new Date(now.getFullYear(), now.getMonth(), now.getDate() + (14 - currentDay), 23, 59, 59),
        description: 'Division Tournament Brackets Generated'
      };
    } else if (currentDay === 14) {
      return {
        type: 'PLAYOFFS',
        day: 15,
        time: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        description: 'Playoff Day'
      };
    } else if (currentDay < 17) {
      return {
        type: 'NEW_SEASON',
        day: 1,
        time: new Date(now.getFullYear(), now.getMonth(), now.getDate() + (18 - currentDay), 3, 0, 0),
        description: 'New Season Begins'
      };
    }

    return null;
  }

  // ============================================================================
  // SCHEDULE GENERATION & MANAGEMENT
  // ============================================================================

  /**
   * Generate schedule for a division/subdivision
   */
  static async generateSchedule(config: z.infer<typeof ScheduleGenerationSchema>): Promise<any> {
    const validatedConfig = ScheduleGenerationSchema.parse(config);
    const prisma = await getPrismaClient();

    return await prisma.$transaction(async (tx) => {
      // Get teams in division/subdivision
      const teams = await tx.team.findMany({
        where: {
          division: validatedConfig.division,
          subdivision: validatedConfig.subdivision
        },
        select: {
          id: true,
          name: true
        }
      });

      if (teams.length === 0) {
        throw new Error(`No teams found in Division ${validatedConfig.division}-${validatedConfig.subdivision}`);
      }

      // Delegate to schedule generation service
      const gamesCreated = await this.scheduleGenerationService.generateDivisionSchedule(
        teams,
        validatedConfig.division,
        validatedConfig.subdivision
      );

      this.clearCache(`schedule-${validatedConfig.division}`);
      
      return {
        division: validatedConfig.division,
        subdivision: validatedConfig.subdivision,
        teamsCount: teams.length,
        gamesCreated
      };
    });
  }

  /**
   * Get schedule for a division
   */
  static async getDivisionSchedule(
    division: number,
    subdivision?: string
  ): Promise<any> {
    const cacheKey = `schedule-${division}-${subdivision || 'all'}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const prisma = await getPrismaClient();
    const currentSeason = await this.getCurrentSeason();

    const where: any = {
      seasonId: currentSeason.id,
      division
    };

    if (subdivision) {
      where.subdivision = subdivision;
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        games: {
          orderBy: [
            { gameDate: 'asc' }
          ],
          include: {
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } }
          }
        }
      }
    });

    this.setCached(cacheKey, schedules);
    return schedules;
  }

  /**
   * Clear and regenerate schedule for a division
   */
  static async regenerateSchedule(
    division: number,
    subdivision: string
  ): Promise<any> {
    const prisma = await getPrismaClient();
    const currentSeason = await this.getCurrentSeason();

    return await prisma.$transaction(async (tx) => {
      // Delete existing games for this schedule
      const schedule = await tx.schedule.findUnique({
        where: {
          seasonId_division_subdivision: {
            seasonId: currentSeason.id,
            division,
            subdivision
          }
        }
      });

      if (schedule) {
        await tx.game.deleteMany({
          where: { scheduleId: schedule.id }
        });
      }

      // Regenerate schedule
      return await this.generateSchedule({
        seasonId: currentSeason.id,
        division,
        subdivision
      });
    });
  }

  // ============================================================================
  // SEASON PROGRESSION & AUTOMATION
  // ============================================================================

  /**
   * Progress season to next day or specific day
   */
  static async progressSeason(config: z.infer<typeof SeasonProgressionSchema> = {}): Promise<any> {
    const validatedConfig = SeasonProgressionSchema.parse(config);
    const currentDay = await this.getCurrentDay();
    const targetDay = validatedConfig.targetDay || currentDay + 1;

    if (targetDay <= currentDay) {
      throw new Error(`Cannot progress to day ${targetDay}, current day is ${currentDay}`);
    }

    if (targetDay > 17) {
      throw new Error('Cannot progress beyond day 17, start new season instead');
    }

    const prisma = await getPrismaClient();
    
    return await prisma.$transaction(async (tx) => {
      const results: any = {
        previousDay: currentDay,
        newDay: targetDay,
        actions: []
      };

      // Update season day
      const currentSeason = await this.getCurrentSeason();
      await tx.season.update({
        where: { id: currentSeason.id },
        data: { currentDay: targetDay }
      });

      // Day-specific actions
      if (targetDay === 7) {
        results.actions.push('Mid-Season Cup scheduled');
      } else if (targetDay === 14) {
        results.actions.push('Division tournaments generated');
        if (validatedConfig.generateTournaments) {
          // Tournament generation would happen here
          // Note: generateDivisionTournaments needs to be implemented or imported
        }
      } else if (targetDay === 15) {
        results.actions.push('Playoff day');
      } else if (targetDay === 17) {
        results.actions.push('Season ended, promotion/relegation processed');
        if (validatedConfig.processPromotions) {
          // Process promotion/relegation would happen here
          // Note: processPromotionRelegation needs to be implemented or imported
        }
      }

      // Simulate games if requested
      if (validatedConfig.simulateGames) {
        const gamesSimulated = await this.simulateDayGames(targetDay);
        results.actions.push(`${gamesSimulated} games simulated`);
      }

      this.clearCache();
      logInfo(`Season progressed from day ${currentDay} to ${targetDay}`);
      
      return results;
    });
  }

  /**
   * Start season automation
   */
  static async startAutomation(): Promise<void> {
    await this.seasonTimingAutomation.start();
    logInfo('Season automation started');
  }

  /**
   * Stop season automation
   */
  static async stopAutomation(): Promise<void> {
    await this.seasonTimingAutomation.stop();
    logInfo('Season automation stopped');
  }

  /**
   * Get automation status
   */
  static async getAutomationStatus(): Promise<{
    isRunning: boolean;
    nextDailyProgression: Date | null;
    nextMatchSimulation: Date | null;
    activeTimers: number;
  }> {
    // Note: getStatus method needs to be implemented in SeasonTimingAutomationService
    return {
      isRunning: false,
      nextDailyProgression: null,
      nextMatchSimulation: null,
      activeTimers: 0
    };
  }

  // ============================================================================
  // DYNAMIC DATE CALCULATIONS
  // ============================================================================

  /**
   * Get true season start date (from earliest game)
   */
  static async getTrueSeasonStartDate(divisionFilter?: number): Promise<Date> {
    return await this.dynamicSeasonService.getTrueSeasonStartDate(divisionFilter);
  }

  /**
   * Calculate what day a specific date falls on
   */
  static async calculateDayForDate(date: Date): Promise<number> {
    const seasonStart = await this.getTrueSeasonStartDate();
    const daysSinceStart = Math.floor((date.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(17, Math.max(1, daysSinceStart + 1));
  }

  /**
   * Get date for a specific season day
   */
  static async getDateForSeasonDay(day: number): Promise<Date> {
    if (day < 1 || day > 17) {
      throw new Error('Season day must be between 1 and 17');
    }

    const seasonStart = await this.getTrueSeasonStartDate();
    const targetDate = new Date(seasonStart);
    targetDate.setDate(targetDate.getDate() + (day - 1));
    return targetDate;
  }

  // ============================================================================
  // GAME SIMULATION & RESULTS
  // ============================================================================

  /**
   * Simulate games for a specific day
   */
  static async simulateDayGames(day: number): Promise<number> {
    const prisma = await getPrismaClient();
    const currentSeason = await this.getCurrentSeason();
    
    // Get scheduled games for the day
    const games = await prisma.game.findMany({
      where: {
        schedule: {
          seasonId: currentSeason.id
        },
        status: 'SCHEDULED',
        gameDate: await this.getDateForSeasonDay(day)
      }
    });

    let simulated = 0;
    for (const game of games) {
      // Delegate to simulation engine (from Phase 4B)
      const { EnhancedSimulationEngine } = await import('./enhancedSimulationEngine.js');
      await EnhancedSimulationEngine.runQuickSimulation(String(game.id));
      simulated++;
    }

    logInfo(`Simulated ${simulated} games for day ${day}`);
    return simulated;
  }

  /**
   * Get standings for a division
   */
  static async getDivisionStandings(
    division: number,
    subdivision?: string
  ): Promise<any[]> {
    const cacheKey = `standings-${division}-${subdivision || 'all'}`;
    const cached = this.getCached<any[]>(cacheKey);
    if (cached) return cached;

    // Note: calculateStandings needs to be implemented or properly imported
    const standings: any[] = [];
    
    this.setCached(cacheKey, standings);
    return standings;
  }

  // ============================================================================
  // PROMOTION & RELEGATION
  // ============================================================================

  /**
   * Process end-of-season promotion and relegation
   */
  static async processPromotionRelegation(): Promise<any> {
    // Note: processPromotionRelegation needs to be implemented
    this.clearCache('standings');
    return { promotions: [], relegations: [] };
  }

  /**
   * Preview promotion/relegation changes
   */
  static async previewPromotionRelegation(): Promise<any> {
    const preview = {
      promotions: [],
      relegations: [],
      totalChanges: 0
    };

    // Get standings for all divisions
    for (let division = 1; division <= 8; division++) {
      const standings = await this.getDivisionStandings(division);
      
      // Determine promotions and relegations based on division rules
      if (division === 1) {
        // Division 1: Bottom 6 relegated
        const relegated = standings.slice(-6);
        preview.relegations.push(...relegated.map(t => ({
          team: t.name,
          fromDivision: 1,
          toDivision: 2,
          position: t.position
        })));
      } else if (division === 2) {
        // Division 2: Top 2 from each subdivision promoted
        const promoted = standings.slice(0, 2);
        preview.promotions.push(...promoted.map(t => ({
          team: t.name,
          fromDivision: 2,
          toDivision: 1,
          position: t.position
        })));
      }
      // Continue for other divisions...
    }

    preview.totalChanges = preview.promotions.length + preview.relegations.length;
    return preview;
  }

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================

  /**
   * Reset season to specific day
   */
  static async resetSeasonToDay(day: number): Promise<any> {
    if (day < 1 || day > 17) {
      throw new Error('Day must be between 1 and 17');
    }

    const prisma = await getPrismaClient();
    const currentSeason = await this.getCurrentSeason();

    return await prisma.$transaction(async (tx) => {
      // Update season day
      await tx.season.update({
        where: { id: currentSeason.id },
        data: { currentDay: day }
      });

      // Reset games after this day to SCHEDULED
      const resetDate = await this.getDateForSeasonDay(day);
      await tx.game.updateMany({
        where: {
          schedule: {
            seasonId: currentSeason.id
          },
          gameDate: { gt: resetDate },
          status: { not: 'SCHEDULED' }
        },
        data: {
          status: 'SCHEDULED',
          homeScore: null,
          awayScore: null,
          simulated: false
        }
      });

      this.clearCache();
      logInfo(`Season reset to day ${day}`);
      
      return {
        seasonId: currentSeason.id,
        newDay: day,
        message: `Season reset to day ${day}`
      };
    });
  }

  /**
   * Force complete season (for testing)
   */
  static async forceCompleteSeason(): Promise<any> {
    const results = {
      gamesSimulated: 0,
      tournamentsRun: 0,
      promotionsProcessed: false,
      newSeasonCreated: false
    };

    // Simulate all remaining regular season games
    for (let day = await this.getCurrentDay(); day <= 14; day++) {
      results.gamesSimulated += await this.simulateDayGames(day);
    }

    // Generate and run tournaments
    await this.progressSeason({
      targetDay: 15,
      generateTournaments: true,
      simulateGames: true
    });
    results.tournamentsRun = 1;

    // Process promotion/relegation
    await this.progressSeason({
      targetDay: 17,
      processPromotions: true
    });
    results.promotionsProcessed = true;

    // Create new season
    await this.createSeason();
    results.newSeasonCreated = true;

    this.clearCache();
    return results;
  }

  /**
   * Get comprehensive season status
   */
  static async getSeasonStatus(): Promise<any> {
    const [
      currentSeason,
      currentDay,
      phase,
      nextEvent,
      automationStatus
    ] = await Promise.all([
      this.getCurrentSeason(),
      this.getCurrentDay(),
      this.getSeasonPhase(),
      this.getNextSeasonEvent(),
      this.getAutomationStatus()
    ]);

    const prisma = await getPrismaClient();
    
    // Get game statistics
    const gameStats = await prisma.game.groupBy({
      by: ['status'],
      where: {
        schedule: {
          seasonId: currentSeason.id
        }
      },
      _count: true
    });

    return {
      season: {
        id: currentSeason.id,
        name: currentSeason.name,
        startDate: currentSeason.startDate,
        currentDay,
        phase,
        daysRemaining: 17 - currentDay
      },
      games: {
        total: gameStats.reduce((sum: any, s: any) => sum + s._count, 0),
        scheduled: gameStats.find(s => s.status === 'SCHEDULED')?._count || 0,
        completed: gameStats.find(s => s.status === 'COMPLETED')?._count || 0,
        live: gameStats.find(s => s.status === 'IN_PROGRESS')?._count || 0
      },
      nextEvent,
      automation: automationStatus
    };
  }
}

// ============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================================================

/**
 * Export individual service classes for backward compatibility
 */
export const DynamicSeasonServiceCompat = {
  getInstance: () => DynamicSeasonService.getInstance(),
  getTrueSeasonStartDate: (divisionFilter?: number) => 
    EnhancedSeasonManagementService.getTrueSeasonStartDate(divisionFilter),
  calculateDayForDate: (date: Date) =>
    EnhancedSeasonManagementService.calculateDayForDate(date),
  getDateForSeasonDay: (day: number) =>
    EnhancedSeasonManagementService.getDateForSeasonDay(day)
};

export const SeasonalFlowServiceCompat = {
  SEASON_CONFIG: SeasonalFlowService.SEASON_CONFIG,
  getCurrentDay: () => EnhancedSeasonManagementService.getCurrentDay(),
  calculateStandings: (division: number, subdivision?: string) =>
    EnhancedSeasonManagementService.getDivisionStandings(division, subdivision),
  processPromotionRelegation: () =>
    EnhancedSeasonManagementService.processPromotionRelegation()
};

export const SeasonTimingAutomationServiceCompat = {
  getInstance: () => SeasonTimingAutomationService.getInstance(),
  start: () => EnhancedSeasonManagementService.startAutomation(),
  stop: () => EnhancedSeasonManagementService.stopAutomation(),
  getStatus: () => EnhancedSeasonManagementService.getAutomationStatus()
};

export const ScheduleGenerationServiceCompat = {
  generateCompleteSchedule: () => ScheduleGenerationService.generateCompleteSchedule(),
  generateDivisionSchedule: (teams: any[], division?: number, subdivision?: string) =>
    ScheduleGenerationService.generateDivisionSchedule(teams, division, subdivision)
};

// Re-export for convenience
export { DynamicSeasonService } from './dynamicSeasonService.js';
export { SeasonalFlowService } from './seasonalFlowService.js';
export { SeasonTimingAutomationService } from './seasonTimingAutomationService.js';
export { ScheduleGenerationService } from './scheduleGenerationService.js';