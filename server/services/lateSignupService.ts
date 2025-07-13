import { prisma } from '../db';
import { storage } from '../storage';
import { logInfo } from './errorService';

/**
 * Late Signup Service
 * 
 * Handles team registration between Day 1 3PM and Day 9 3PM
 * - Places teams in Division 8 shortened seasons
 * - Generates shortened schedules when 8 teams are reached
 * - Ensures teams can still participate in tournaments
 */
export class LateSignupService {
  
  /**
   * Check if we're currently in the late signup window
   */
  static async isLateSignupWindow(): Promise<boolean> {
    const currentSeason = await storage.seasons.getCurrentSeason();
    if (!currentSeason) return false;
    
    const { currentDayInCycle } = this.getCurrentSeasonInfo(currentSeason);
    const now = new Date();
    const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    
    // Late signup window: Day 1 3PM to Day 9 3PM
    if (currentDayInCycle === 1 && estTime.getHours() >= 15) {
      return true; // From Day 1 3PM onwards
    }
    
    if (currentDayInCycle >= 2 && currentDayInCycle <= 8) {
      return true; // Full Days 2-8
    }
    
    if (currentDayInCycle === 9 && estTime.getHours() < 15) {
      return true; // Until Day 9 3PM
    }
    
    return false;
  }
  
  /**
   * Get current season information
   */
  private static getCurrentSeasonInfo(currentSeason: any): {
    currentDayInCycle: number;
    seasonNumber: number;
  } {
    const seasonStartDate = currentSeason.startDateOriginal || currentSeason.startDate || new Date();
    const daysSinceStart = Math.floor((new Date().getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentDayInCycle = (daysSinceStart % 17) + 1;
    const seasonNumber = Math.floor(daysSinceStart / 17);
    
    return { currentDayInCycle, seasonNumber };
  }
  
  /**
   * Find or create a late signup subdivision in Division 8
   */
  static async findOrCreateLateSignupSubdivision(): Promise<string> {
    // Find existing late signup subdivisions with less than 8 teams
    const lateSignupSubdivisions = ["late_alpha", "late_beta", "late_gamma", "late_delta"];
    
    for (const subdivisionName of lateSignupSubdivisions) {
      const teamsInSubdivision = await storage.teams.getTeamsByDivisionAndSubdivision(8, subdivisionName);
      
      if (teamsInSubdivision.length < 8) {
        return subdivisionName;
      }
    }
    
    // If all late signup subdivisions are full, create a new one
    const newSubdivisionName = `late_${Date.now().toString().slice(-6)}`;
    return newSubdivisionName;
  }
  
  /**
   * Process late signup team creation
   */
  static async processLateSignup(teamData: {
    userId: string;
    name: string;
  }): Promise<{
    team: any;
    subdivision: string;
    needsScheduleGeneration: boolean;
  }> {
    // Find appropriate late signup subdivision
    const subdivision = await this.findOrCreateLateSignupSubdivision();
    
    // Create the team in Division 8 late signup subdivision
    const team = await storage.teams.createTeam({
      userId: teamData.userId,
      name: teamData.name,
      division: 8,
      subdivision: subdivision,
    });
    
    // Check if subdivision is now full (8 teams)
    const teamsInSubdivision = await storage.teams.getTeamsByDivisionAndSubdivision(8, subdivision);
    const needsScheduleGeneration = teamsInSubdivision.length === 8;
    
    if (needsScheduleGeneration) {
      await this.generateShortenedSeasonSchedule(subdivision, teamsInSubdivision);
    }
    
    logInfo(`Late signup team created`, {
      teamId: team.id,
      subdivision,
      teamsInSubdivision: teamsInSubdivision.length,
      scheduleGenerated: needsScheduleGeneration
    });
    
    return {
      team,
      subdivision,
      needsScheduleGeneration
    };
  }
  
  /**
   * Generate shortened season schedule for late signup subdivision
   */
  static async generateShortenedSeasonSchedule(
    subdivision: string,
    teams: any[]
  ): Promise<void> {
    const currentSeason = await storage.seasons.getCurrentSeason();
    if (!currentSeason) return;
    
    const { currentDayInCycle, seasonNumber } = this.getCurrentSeasonInfo(currentSeason);
    
    // Calculate remaining days in regular season
    const remainingDays = Math.max(0, 14 - currentDayInCycle + 1);
    
    if (remainingDays <= 0) {
      logInfo('No remaining days for shortened season schedule');
      return;
    }
    
    // Create league for late signup subdivision
    const league = await prisma.league.create({
      data: {
        id: `late-${subdivision}-${seasonNumber}`,
        season: seasonNumber,
        division: 8,
        subdivision: subdivision,
        name: `Division 8 Late Signup - ${subdivision.toUpperCase()}`,
        status: 'active'
      }
    });
    
    // Generate shortened schedule
    const matches = await this.generateShortenedMatches(
      league.id,
      teams,
      seasonNumber,
      currentDayInCycle,
      remainingDays
    );
    
    logInfo(`Shortened season schedule generated`, {
      leagueId: league.id,
      subdivision,
      teams: teams.length,
      matches: matches.length,
      remainingDays,
      startDay: currentDayInCycle
    });
  }
  
  /**
   * Generate shortened match schedule
   */
  private static async generateShortenedMatches(
    leagueId: string,
    teams: any[],
    season: number,
    startDay: number,
    remainingDays: number
  ): Promise<any[]> {
    const matches = [];
    const numTeams = teams.length;
    
    if (numTeams < 2) return matches;
    
    // Calculate total possible matches in a round-robin
    const totalPossibleMatches = (numTeams * (numTeams - 1)) / 2;
    
    // Calculate matches per day based on remaining days
    const matchesPerDay = Math.ceil(totalPossibleMatches / remainingDays);
    
    // Generate round-robin matchups
    const matchups = [];
    for (let i = 0; i < numTeams; i++) {
      for (let j = i + 1; j < numTeams; j++) {
        matchups.push([teams[i], teams[j]]);
      }
    }
    
    // Shuffle matchups for better distribution
    for (let i = matchups.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [matchups[i], matchups[j]] = [matchups[j], matchups[i]];
    }
    
    // Distribute matches across remaining days
    let currentDay = startDay;
    let matchCount = 0;
    
    for (const [homeTeam, awayTeam] of matchups) {
      if (currentDay > 14) break; // Don't schedule beyond regular season
      
      const match = await prisma.game.create({
        data: {
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          leagueId: leagueId,
          season: season,
          day: currentDay,
          gameDate: await this.calculateGameDate(currentDay),
          status: 'SCHEDULED',
          gameType: 'LEAGUE'
        }
      });
      
      matches.push(match);
      matchCount++;
      
      // Move to next day after reaching matches per day limit
      if (matchCount >= matchesPerDay) {
        currentDay++;
        matchCount = 0;
      }
    }
    
    return matches;
  }
  
  /**
   * Calculate game date for a specific day in the season
   */
  private static async calculateGameDate(day: number): Promise<Date> {
    const currentSeason = await storage.seasons.getCurrentSeason();
    if (!currentSeason) return new Date();
    
    const seasonStartDate = currentSeason.startDateOriginal || currentSeason.startDate || new Date();
    const gameDate = new Date(seasonStartDate);
    gameDate.setDate(gameDate.getDate() + day - 1);
    
    // Set to random time within match simulation window (4-10 PM EST)
    const randomHour = 16 + Math.floor(Math.random() * 6); // 4-9 PM
    const randomMinute = Math.floor(Math.random() * 60);
    gameDate.setHours(randomHour, randomMinute, 0, 0);
    
    return gameDate;
  }
  
  /**
   * Get late signup statistics
   */
  static async getLateSignupStats(): Promise<{
    isLateSignupWindow: boolean;
    activeSubdivisions: Array<{
      subdivision: string;
      teamCount: number;
      isComplete: boolean;
    }>;
    totalLateSignupTeams: number;
  }> {
    const isLateSignupWindow = this.isLateSignupWindow();
    
    // Get all late signup subdivisions
    const lateSignupSubdivisions = await prisma.team.findMany({
      where: {
        division: 8,
        subdivision: {
          startsWith: 'late_'
        }
      },
      select: {
        subdivision: true
      },
      distinct: ['subdivision']
    });
    
    const activeSubdivisions = [];
    let totalLateSignupTeams = 0;
    
    for (const { subdivision } of lateSignupSubdivisions) {
      const teams = await storage.teams.getTeamsByDivisionAndSubdivision(8, subdivision);
      activeSubdivisions.push({
        subdivision,
        teamCount: teams.length,
        isComplete: teams.length === 8
      });
      totalLateSignupTeams += teams.length;
    }
    
    return {
      isLateSignupWindow,
      activeSubdivisions,
      totalLateSignupTeams
    };
  }
}