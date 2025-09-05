import { getPrismaClient } from '../database.js';
import { getEasternTime } from '../../shared/timezone.js';

/**
 * Dynamic Season Service
 * 
 * Provides bulletproof season date calculation based on actual game data
 * instead of hard-coded season start dates.
 * 
 * Core Principle: Season start date is DERIVED from the earliest game,
 * not manually set. This ensures day calculations are always accurate
 * regardless of when games are generated or how the schedule changes.
 */
export class DynamicSeasonService {
  private static instance: DynamicSeasonService;
  private prisma: any = null;

  private constructor() {}

  static getInstance(): DynamicSeasonService {
    if (!DynamicSeasonService.instance) {
      DynamicSeasonService.instance = new DynamicSeasonService();
    }
    return DynamicSeasonService.instance;
  }

  private async getPrisma() {
    if (!this.prisma) {
      this.prisma = await getPrismaClient();
    }
    return this.prisma;
  }

  /**
   * Get the true season start date by finding the earliest league game
   * This is the SOURCE OF TRUTH for all date calculations
   * 
   * IMPORTANT: Handles both regular seasons and Division 8 shortened seasons.
   * Division 8 late signup teams get shortened seasons that start mid-cycle.
   */
  async getTrueSeasonStartDate(divisionFilter?: number): Promise<Date> {
    const prisma = await this.getPrisma();
    
    let whereClause: any = {
      matchType: 'LEAGUE'
    };

    // If filtering by division, add team filter
    if (divisionFilter) {
      whereClause.OR = [
        {
          homeTeam: {
            division: divisionFilter
          }
        },
        {
          awayTeam: {
            division: divisionFilter
          }
        }
      ];
    }
    
    // Find the earliest league game (not tournament games)
    const earliestGame = await prisma.game.findFirst({
      where: whereClause,
      orderBy: {
        gameDate: 'asc'
      },
      select: {
        gameDate: true,
        homeTeam: {
          select: {
            division: true,
            subdivision: true
          }
        },
        awayTeam: {
          select: {
            division: true,
            subdivision: true
          }
        }
      }
    });

    if (!earliestGame) {
      // Fallback: if no games exist, use current date minus 4 days
      // This handles the case where season exists but games haven't been generated yet
      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() - 4);
      fallbackDate.setHours(0, 0, 0, 0); // Start of day
      console.log('⚠️ [DYNAMIC SEASON] No games found, using fallback date:', fallbackDate.toISOString().split('T')[0]);
      return fallbackDate;
    }

    // Extract just the date part (ignore time) from the earliest game
    const gameDate = new Date(earliestGame.gameDate);
    const seasonStartDate = new Date(gameDate.getFullYear(), gameDate.getMonth(), gameDate.getDate());
    
    // Log info about the detected season type
    const isDiv8 = earliestGame.homeTeam?.division === 8 || earliestGame.awayTeam?.division === 8;
    if (isDiv8) {
      console.log('🔍 [DYNAMIC SEASON] Detected Division 8 (potentially shortened season)');
    }
    
    return seasonStartDate;
  }

  /**
   * Calculate current season day based on actual date difference
   * This is the CORRECT way to calculate days - no timezone issues
   */
  async getCurrentSeasonDay(): Promise<number> {
    const seasonStartDate = await this.getTrueSeasonStartDate();
    const now = new Date();
    
    // Get current date at start of day for clean comparison
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate days since season started
    const diffTime = currentDate.getTime() - seasonStartDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Season day is 1-based (Day 1, Day 2, etc.)
    return Math.max(1, diffDays + 1);
  }

  /**
   * Get current season day for display purposes (1-17 cycle)
   * Handles the 17-day cycle properly
   */
  async getCurrentDisplayDay(): Promise<number> {
    const absoluteDay = await this.getCurrentSeasonDay();
    
    // 17-day cycles: Days 1-17, then 1-17 again
    const cycleDay = ((absoluteDay - 1) % 17) + 1;
    
    return cycleDay;
  }

  /**
   * Synchronize database season record with actual game dates
   * This should be called whenever games are generated or modified
   */
  async synchronizeSeasonDates(): Promise<void> {
    const prisma = await this.getPrisma();
    const trueStartDate = await this.getTrueSeasonStartDate();
    const currentDay = await this.getCurrentSeasonDay();

    console.log('🔄 [DYNAMIC SEASON] Synchronizing season dates...');
    console.log('🎯 [DYNAMIC SEASON] True season start:', trueStartDate.toISOString());
    console.log('📅 [DYNAMIC SEASON] Current season day:', currentDay);

    // Update ALL seasons to use the correct start date
    const result = await prisma.season.updateMany({
      data: {
        startDate: trueStartDate,
        currentDay: currentDay
      }
    });

    console.log('✅ [DYNAMIC SEASON] Updated', result.count, 'season records');
  }

  /**
   * Get game day number for a specific date
   * Used by the schedule API to display correct day numbers
   */
  async getGameDayNumber(gameDate: Date): Promise<number> {
    const seasonStartDate = await this.getTrueSeasonStartDate();
    
    // Extract just the date part for clean comparison
    const gameDateOnly = new Date(gameDate.getFullYear(), gameDate.getMonth(), gameDate.getDate());
    const seasonStartOnly = new Date(seasonStartDate.getFullYear(), seasonStartDate.getMonth(), seasonStartDate.getDate());
    
    // Calculate day difference
    const diffTime = gameDateOnly.getTime() - seasonStartOnly.getTime();
    const daysDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Return 1-based day number
    return daysDiff + 1;
  }

  /**
   * Check if a team is in Division 8 (late signup division)
   * Division 8 teams may have shortened seasons starting mid-cycle
   */
  async isTeamInDivision8(teamId: number): Promise<boolean> {
    const prisma = await this.getPrisma();
    
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { division: true }
    });
    
    return team?.division === 8;
  }

  /**
   * Get season start date for a specific team's division/subdivision
   * This handles Division 8 shortened seasons that start mid-cycle
   */
  async getSeasonStartForTeam(teamId: number): Promise<Date> {
    const prisma = await this.getPrisma();
    
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { 
        division: true,
        subdivision: true 
      }
    });

    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    // For Division 8, find the earliest game for this specific subdivision
    // as they may have shortened seasons starting at different times
    if (team.division === 8) {
      console.log(`🔍 [DYNAMIC SEASON] Getting shortened season start for Division 8 ${team.subdivision}`);
      
      const earliestGameForSubdivision = await prisma.game.findFirst({
        where: {
          matchType: 'LEAGUE',
          OR: [
            {
              homeTeam: {
                division: 8,
                subdivision: team.subdivision
              }
            },
            {
              awayTeam: {
                division: 8,
                subdivision: team.subdivision
              }
            }
          ]
        },
        orderBy: {
          gameDate: 'asc'
        },
        select: {
          gameDate: true
        }
      });

      if (earliestGameForSubdivision) {
        const gameDate = new Date(earliestGameForSubdivision.gameDate);
        const subdivisionStartDate = new Date(gameDate.getFullYear(), gameDate.getMonth(), gameDate.getDate());
        console.log(`📅 [DYNAMIC SEASON] Division 8 ${team.subdivision} starts: ${subdivisionStartDate.toISOString().split('T')[0]}`);
        return subdivisionStartDate;
      }
    }

    // For all other divisions, use the regular season start
    return await this.getTrueSeasonStartDate();
  }

  /**
   * Get the effective season length for a team
   * Regular seasons: 14 days, Division 8 shortened: varies based on start day
   */
  async getSeasonLengthForTeam(teamId: number): Promise<{ totalDays: number, isShortened: boolean }> {
    const prisma = await this.getPrisma();
    
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { division: true, subdivision: true }
    });

    if (!team) {
      return { totalDays: 14, isShortened: false };
    }

    // Division 8 may have shortened seasons
    if (team.division === 8) {
      const teamSeasonStart = await this.getSeasonStartForTeam(teamId);
      const globalSeasonStart = await this.getTrueSeasonStartDate();
      
      // Calculate how many days late this subdivision started
      const daysDiff = Math.floor((teamSeasonStart.getTime() - globalSeasonStart.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(1, 14 - daysDiff);
      
      const isShortened = remainingDays < 14;
      console.log(`📊 [DYNAMIC SEASON] Division 8 ${team.subdivision}: ${remainingDays} days remaining (shortened: ${isShortened})`);
      
      return { totalDays: remainingDays, isShortened };
    }

    return { totalDays: 14, isShortened: false };
  }

  /**
   * Validate that the current season data is consistent
   * Returns issues found, if any
   * Now includes Division 8 shortened season validation
   */
  async validateSeasonConsistency(): Promise<string[]> {
    const issues: string[] = [];
    const prisma = await this.getPrisma();
    
    try {
      const trueStartDate = await this.getTrueSeasonStartDate();
      const currentSeason = await prisma.season.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      
      if (!currentSeason) {
        issues.push('No season record found in database');
        return issues;
      }

      const dbStartDate = new Date(currentSeason.startDate);
      const dbStartDateOnly = new Date(dbStartDate.getFullYear(), dbStartDate.getMonth(), dbStartDate.getDate());
      
      // Check if database season start matches true start
      if (dbStartDateOnly.getTime() !== trueStartDate.getTime()) {
        issues.push(`Season start date mismatch: DB=${dbStartDateOnly.toISOString().split('T')[0]}, True=${trueStartDate.toISOString().split('T')[0]}`);
      }

      // Check if current day matches calculation
      const calculatedDay = await this.getCurrentSeasonDay();
      if (currentSeason.currentDay !== calculatedDay) {
        issues.push(`Current day mismatch: DB=${currentSeason.currentDay}, Calculated=${calculatedDay}`);
      }

      // Check for Division 8 shortened seasons
      const div8Teams = await prisma.team.findMany({
        where: { division: 8 },
        select: { id: true, subdivision: true },
        distinct: ['subdivision']
      });

      for (const team of div8Teams) {
        try {
          const seasonLength = await this.getSeasonLengthForTeam(team.id);
          if (seasonLength.isShortened) {
            console.log(`ℹ️ [VALIDATION] Division 8 ${team.subdivision} has shortened season: ${seasonLength.totalDays} days`);
          }
        } catch (error) {
          issues.push(`Division 8 ${team.subdivision} validation error: ${error.message}`);
        }
      }

    } catch (error) {
      issues.push(`Validation error: ${error.message}`);
    }
    
    return issues;
  }
}

// Export singleton instance
export const dynamicSeasonService = DynamicSeasonService.getInstance();