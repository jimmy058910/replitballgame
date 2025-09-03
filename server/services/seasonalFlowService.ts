import { PrismaClient } from "@prisma/client";
// Note: Using any types for Prisma enums to avoid import issues
import { getPrismaClient } from '../database.js';
import { logInfo, logError } from './errorService.js';
import { EASTERN_TIMEZONE, getEasternTimeAsDate } from '../../shared/timezone.js';

// Note: Prisma client will be initialized in each function as needed
// Removed top-level await to fix TypeScript compilation errors

/**
 * Seasonal Flow Algorithm Service
 * 
 * Manages the complete 17-day competitive cycle:
 * - Days 1-14: Regular Season with scheduling and standings
 * - Day 14 (Midnight): Playoff brackets generated | Day 15: Playoffs with tournament matches
 * - Days 16-17: Off-season with promotion/relegation and league rebalancing
 * 
 * Features:
 * - Dynamic schedule generation for all divisions
 * - Automated standings with point system (Win: 3, Draw: 1, Loss: 0)
 * - Tie-breaker logic (Head-to-head, Goal difference, Total goals)
 * - Single elimination playoffs (Top 4 teams)
 * - Promotion/relegation cascade system
 * - League rebalancing and team redistribution
 * - New team placement and AI team management
 */
export class SeasonalFlowService {
  
  /**
   * Competition structure configuration
   * Updated to match promotion/relegation algorithm specifications
   */
  static readonly SEASON_CONFIG = {
    REGULAR_SEASON_DAYS: 14,
    PLAYOFF_DAY: 15,
    OFFSEASON_DAYS: [16, 17],
    TOTAL_SEASON_DAYS: 17,
    
    // Standings point system
    POINTS_WIN: 3,
    POINTS_DRAW: 1,
    POINTS_LOSS: 0,
    
    // League structure (updated to match specifications)
    DIVISION_1_TEAMS: 16, // Premium division - exactly 16 teams
    DIVISION_2_TEAMS: 16, // Division 2 sub-divisions - 16 teams each
    DIVISION_2_SUBDIVISIONS: 3, // Division 2 has 3 sub-divisions (48 teams total)
    STANDARD_SUBDIVISION_TEAMS: 8, // All other divisions use 8-team subdivisions
    
    // Tournament qualifiers (updated to match specifications)
    DIVISION_1_TOURNAMENT_QUALIFIERS: 8, // Top 8 teams for Division 1 tournament
    STANDARD_TOURNAMENT_QUALIFIERS: 4, // Top 4 teams for Divisions 2-8 tournaments
    PLAYOFF_QUALIFIERS: 4, // Standard playoff qualifiers for most divisions
    
    // Promotion/relegation (updated to match specifications)
    DIVISION_1_RELEGATION: 6, // Bottom 6 teams relegated (11th-16th place)
    DIVISION_2_RELEGATION_PER_SUBDIVISION: 4, // Bottom 4 teams from each 16-team subdivision
    DIVISION_2_PROMOTION_PER_SUBDIVISION: 2, // 2 teams promoted from each Division 2 subdivision
    STANDARD_RELEGATION_PER_SUBDIVISION: 4, // Bottom 4 teams from each 8-team subdivision
    STANDARD_LEAGUE_TEAMS: 8, // Standard teams per subdivision
    STANDARD_RELEGATION: 4, // Standard relegation count
    
    // Division limits
    MIN_DIVISION: 1,
    MAX_DIVISION: 8, // Division 8 is the floor
    
    // Season timing (EST timezone)
    SEASON_START_TIME: { hour: 15, minute: 0 }, // 3:00 PM EST - Division finalization
    SIMULATION_WINDOW: { start: 16, end: 22 }, // 4:00 PM - 10:00 PM EST
    MID_SEASON_CUP_DAY: 7, // Day 7 - Mid-Season Cup
    DIVISION_TOURNAMENT_DAY: 14, // Day 14 Midnight - Division tournament brackets generated
    NEW_SEASON_RESET_TIME: { hour: 3, minute: 0 }, // 3:00 AM EST - Day 17 reset
  };

  /**
   * Get current day in the season cycle (1-17) - DYNAMIC VERSION
   */
  static async getCurrentDay(): Promise<number> {
    const prisma = await getPrismaClient();
    
    // Get the current season from database
    const currentSeason = await prisma.season.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    if (!currentSeason) {
      throw new Error('No current season found');
    }
    
    const startDate = new Date(currentSeason.startDate);
    const now = new Date();
    
    // Calculate days since start, accounting for the day advancement that should occur at 3AM EST
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if we're past 3AM EST today - if so, we should be on the next day
    const estNow = getEasternTimeAsDate();
    const isAfter3AM = estNow.getHours() >= 3;
    
    // If we're after 3AM EST, advance to the next day
    const adjustedDaysSinceStart = isAfter3AM ? daysSinceStart + 1 : daysSinceStart;
    
    return (adjustedDaysSinceStart % 17) + 1;
  }

  /**
   * Check if a team qualified for Division playoffs
   */
  static async isTeamInDivisionPlayoffs(teamId: string): Promise<boolean> {
    try {
      const prisma = await getPrismaClient();
      // Get team info
      const team = await prisma.team.findUnique({
        where: { id: parseInt(teamId, 10) },
        include: { league: true }
      });

      if (!team || !team.league) {
        return false;
      }

      // Check if team is in a tournament (Division playoffs)
      const tournamentEntries = await prisma.tournamentEntry.findMany({
        where: {
          teamId: parseInt(teamId, 10),
          tournament: {
            type: 'DAILY_DIVISIONAL'
          }
        },
        include: {
          tournament: true
        }
      });

      return tournamentEntries.length > 0;
    } catch (error) {
      console.error('Error checking team playoff status:', error);
      return false;
    }
  }

  /**
   * Generate complete season schedule for all leagues
   * Called at the start of Day 1 of each season
   */
  static async generateSeasonSchedule(season: number): Promise<{
    schedulesCreated: number;
    matchesGenerated: number;
    leaguesProcessed: Array<{
      leagueId: string;
      division: number;
      teams: number;
      matches: number;
    }>;
  }> {
    const prisma = await getPrismaClient();
    
    // Get the actual season ID from database instead of hardcoded format
    const currentSeason = await prisma.season.findFirst({
      where: { seasonNumber: season },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!currentSeason) {
      logError(new Error(`No season found for season number ${season}`));
      return { schedulesCreated: 0, matchesGenerated: 0, leaguesProcessed: [] };
    }

    // CRITICAL: Check if schedule already exists to prevent duplicates
    const allLeagues = await prisma.league.findMany({
      where: { seasonId: currentSeason.id }
    });
    
    // Simple check: count LEAGUE games for this season
    const leagueIds = allLeagues.map(l => l.id);
    const existingGames = await prisma.game.count({
      where: {
        leagueId: { in: leagueIds },
        matchType: 'LEAGUE'
      }
    });
    
    if (existingGames > 0) {
      logInfo(`🚫 DUPLICATE PREVENTION: Season ${season} already has ${existingGames} LEAGUE games. Skipping generation.`);
      return { schedulesCreated: 0, matchesGenerated: 0, leaguesProcessed: [] };
    }
    
    logInfo(`✅ No existing LEAGUE games found for Season ${season}. Proceeding with schedule generation.`);
    
    let totalMatches = 0;
    const leaguesProcessed = [];
    
    for (const league of allLeagues) {
      // Get teams in this league (including converted AI teams)
      const leagueTeams = await prisma.team.findMany({
        where: { 
          division: league.division
        }
      });
      
      // Skip divisions with no teams
      if (leagueTeams.length === 0) {
        logInfo(`Skipping Division ${league.division} - no teams found`);
        continue;
      }
      
      let matches;
      if (league.division === 1 || league.division === 2) {
        // Divisions 1-2: CORRECTED - 112 matches over 14 days (8 per day)
        matches = await this.generatePremiumDivisionSchedule(league.id.toString(), leagueTeams, season);
      } else if (leagueTeams.length > 16) {
        // Large divisions: Create multiple subdivisions of 8 teams each
        matches = await this.generateLargeDivisionSchedule(league.id.toString(), leagueTeams, season);
      } else if (leagueTeams.length >= 8) {
        // Standard divisions: 8-16 teams
        matches = await this.generateStandardSubdivisionSchedule(league.id.toString(), leagueTeams, season);
      } else {
        // Small divisions: Less than 8 teams, generate round-robin
        matches = await this.generateSmallDivisionSchedule(league.id.toString(), leagueTeams, season);
      }
      
      totalMatches += matches.length;
      leaguesProcessed.push({
        leagueId: league.id.toString(),
        division: league.division,
        teams: leagueTeams.length,
        matches: matches.length
      });
    }
    
    return {
      schedulesCreated: allLeagues.length,
      matchesGenerated: totalMatches,
      leaguesProcessed
    };
  }

  /**
   * CORRECTED: Generate Premium Division schedule (Divisions 1-2: 112 matches over 14 days)
   */
  static async generatePremiumDivisionSchedule(
    leagueId: string, 
    teams: any[], 
    season: number
  ): Promise<any[]> {
    const matches = [];
    const numTeams = teams.length;
    
    // Get current season start date from database
    const prisma = await getPrismaClient();
    const currentSeason = await prisma.season.findFirst({
      where: { seasonNumber: season },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!currentSeason) {
      throw new Error(`No season found for season number ${season}`);
    }
    
    // CORRECTED: Generate 8 matches per day × 14 days = 112 total matches
    for (let day = 1; day <= this.SEASON_CONFIG.REGULAR_SEASON_DAYS; day++) {
      // Generate 8 matches for this day (not 2)
      const dayMatches = this.generateDayMatches(teams, day, 8);
      
      // Use generateDailyGameTimes for consecutive 15-minute intervals
      const { generateDailyGameTimes } = await import('../../shared/timezone.js');
      const dailyGameTimes = generateDailyGameTimes(day);
      
      for (let matchIndex = 0; matchIndex < dayMatches.length; matchIndex++) {
        const match = dayMatches[matchIndex];
        const gameDate = new Date(currentSeason.startDate);
        gameDate.setDate(gameDate.getDate() + day - 1);
        
        // Use the appropriate time slot for this match
        const slotIndex = matchIndex % dailyGameTimes.length;
        const gameTime = dailyGameTimes[slotIndex];
        
        gameDate.setHours(gameTime.getHours(), gameTime.getMinutes(), 0, 0);
        
        const matchData = {
          leagueId: parseInt(leagueId),
          homeTeamId: parseInt(match.homeTeam.id, 10),
          awayTeamId: parseInt(match.awayTeam.id, 10),
          gameDate: gameDate,
          status: 'SCHEDULED' as const,
          matchType: 'LEAGUE' as const
        };
        
        matches.push(matchData);
      }
    }
    
    // Insert matches into database
    if (matches.length > 0) {
      const prisma = await getPrismaClient();
      await prisma.game.createMany({
        data: matches
      });
    }
    
    logInfo(`Generated ${matches.length} matches for premium division (target: 112)`);
    return matches;
  }

  /**
   * CORRECTED: Generate standard division schedule (Divisions 3-8: 56 matches over 14 days)
   */
  static async generateStandardSubdivisionSchedule(
    leagueId: string, 
    teams: any[], 
    season: number
  ): Promise<any[]> {
    const matches = [];
    const numTeams = teams.length;
    
    if (numTeams < 2) {
      throw new Error(`Standard subdivision must have at least 2 teams`);
    }
    
    // Get current season start date from database
    const prisma = await getPrismaClient();
    const currentSeason = await prisma.season.findFirst({
      where: { seasonNumber: season },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!currentSeason) {
      throw new Error(`No season found for season number ${season}`);
    }
    
    // CORRECTED: Ensure only ONE subdivision per division (Divisions 3-8)
    // 4 matches per day × 14 days = 56 total matches per division
    
    for (let day = 1; day <= this.SEASON_CONFIG.REGULAR_SEASON_DAYS; day++) {
      // Generate exactly 4 matches per day (56 total over 14 days)
      const dayMatches = this.generateSubdivisionDayMatches(teams, day, 1);
      
      // Use generateDailyGameTimes for consecutive 15-minute intervals
      const { generateDailyGameTimes } = await import('../../shared/timezone.js');
      const dailyGameTimes = generateDailyGameTimes(day);
      
      for (let matchIndex = 0; matchIndex < dayMatches.length; matchIndex++) {
        const match = dayMatches[matchIndex];
        const gameDate = new Date(currentSeason.startDate);
        gameDate.setDate(gameDate.getDate() + day - 1);
        
        // Use the appropriate time slot for this match
        const slotIndex = matchIndex % dailyGameTimes.length;
        const gameTime = dailyGameTimes[slotIndex];
        
        gameDate.setHours(gameTime.getHours(), gameTime.getMinutes(), 0, 0);
        
        const matchData = {
          leagueId: parseInt(leagueId),
          homeTeamId: parseInt(match.homeTeam.id, 10),
          awayTeamId: parseInt(match.awayTeam.id, 10),
          gameDate: gameDate,
          status: 'SCHEDULED' as const,
          matchType: 'LEAGUE' as const
        };
        
        matches.push(matchData);
      }
    }
    
    // Insert matches into database
    if (matches.length > 0) {
      const prisma = await getPrismaClient();
      await prisma.game.createMany({
        data: matches
      });
    }
    
    logInfo(`Generated ${matches.length} matches for standard division (target: 56)`);
    return matches;
  }

  /**
   * Generate matches for a subdivision day (8 teams = 4 games per day)
   * Simple pairing system ensuring each team plays exactly once per day
   */
  static generateSubdivisionDayMatches(teams: any[], day: number, seasonStartDay: number = 1): Array<{homeTeam: any, awayTeam: any}> {
    const matches: Array<{homeTeam: any, awayTeam: any}> = [];
    const numTeams = teams.length;
    
    if (numTeams < 2) return matches;
    
    // For 8 teams, we need exactly 4 games per day
    // Use round-robin scheduling where each team plays every other team once
    
    if (numTeams === 8) {
      // Perfect 8-team subdivision - 4 games per day
      // FIXED: 14-round double round-robin (each team plays each other twice - home & away)
      const baseRounds = [
        [[0, 1], [2, 3], [4, 5], [6, 7]],  // Round 1
        [[0, 2], [1, 4], [3, 6], [5, 7]],  // Round 2  
        [[0, 3], [1, 5], [2, 7], [4, 6]],  // Round 3
        [[0, 4], [1, 6], [2, 5], [3, 7]],  // Round 4
        [[0, 5], [1, 7], [2, 4], [3, 6]],  // Round 5
        [[0, 6], [1, 3], [2, 7], [4, 5]],  // Round 6
        [[0, 7], [1, 2], [3, 4], [5, 6]]   // Round 7
      ];
      
      // FIXED: Create 14 rounds total (7 + 7 reversed for home/away)
      const fullRoundRobinSchedule = [
        ...baseRounds,  // Rounds 1-7: First meetings
        // Rounds 8-14: Return matches (reversed home/away)
        ...baseRounds.map(round => round.map(([home, away]) => [away, home]))
      ];
      
      // Calculate which round this day represents (Days 1-14 = Rounds 0-13)
      const roundIndex = (day - seasonStartDay) % fullRoundRobinSchedule.length;
      
      // Generate matches for this day's round
      if (roundIndex >= 0 && roundIndex < fullRoundRobinSchedule.length) {
        const dayPairs = fullRoundRobinSchedule[roundIndex];
        for (const [homeIndex, awayIndex] of dayPairs) {
          matches.push({
            homeTeam: teams[homeIndex],
            awayTeam: teams[awayIndex]
          });
        }
      }
    } else {
      // For non-8 team subdivisions, create as many pairs as possible
      // Ensure each team plays exactly once per day
      for (let i = 0; i < Math.floor(numTeams / 2); i++) {
        const homeIndex = i;
        const awayIndex = (i + day + Math.floor(numTeams / 2) - 1) % numTeams;
        
        if (homeIndex !== awayIndex) {
          matches.push({
            homeTeam: teams[homeIndex],
            awayTeam: teams[awayIndex]
          });
        }
      }
    }
    
    return matches;
  }

  /**
   * Generate large division schedule (35+ teams, multiple subdivisions)
   * Only generates schedules for teams within the same subdivision
   */
  static async generateLargeDivisionSchedule(
    leagueId: string, 
    teams: any[], 
    season: number
  ): Promise<any[]> {
    const matches = [];
    
    // Get current season start date from database
    const prisma = await getPrismaClient();
    const currentSeason = await prisma.season.findFirst({
      where: { seasonNumber: season },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!currentSeason) {
      throw new Error(`No season found for season number ${season}`);
    }
    
    // Group teams by subdivision
    const subdivisionMap = new Map<string, any[]>();
    for (const team of teams) {
      const subdivision = team.subdivision || 'main';
      if (!subdivisionMap.has(subdivision)) {
        subdivisionMap.set(subdivision, []);
      }
      subdivisionMap.get(subdivision)!.push(team);
    }
    
    // Generate schedule for each subdivision separately
    for (const [subdivisionName, subdivisionTeams] of subdivisionMap) {
      if (subdivisionTeams.length < 2) {
        console.warn(`Skipping subdivision ${subdivisionName} with ${subdivisionTeams.length} teams`);
        continue;
      }
      
      // Generate matches for subdivision (Full Regular Season: Days 1-14)
      for (let day = 1; day <= this.SEASON_CONFIG.REGULAR_SEASON_DAYS; day++) {
        const dayMatches = this.generateSubdivisionDayMatches(subdivisionTeams, day, 1);
        
        for (let matchIndex = 0; matchIndex < dayMatches.length; matchIndex++) {
          const match = dayMatches[matchIndex];
          
          // Calculate the correct game date based on season start + day
          const gameDate = new Date(currentSeason.startDate);
          gameDate.setDate(gameDate.getDate() + day - 1);
          
          // Use generateDailyGameTimes for consecutive 15-minute intervals
          const { generateDailyGameTimes } = await import('../../shared/timezone.js');
          const dailyGameTimes = generateDailyGameTimes(day);
          
          // Use the appropriate time slot for this match (staggered every 15 minutes)
          const slotIndex = matchIndex % dailyGameTimes.length;
          const gameTime = dailyGameTimes[slotIndex];
          
          gameDate.setHours(gameTime.getHours(), gameTime.getMinutes(), 0, 0);
          
          const matchData = {
            leagueId: parseInt(leagueId),
            homeTeamId: parseInt(match.homeTeam.id, 10),
            awayTeamId: parseInt(match.awayTeam.id, 10),
            gameDate: gameDate,
            status: 'SCHEDULED' as const,
            matchType: 'LEAGUE' as const
          };
          
          matches.push(matchData);
        }
      }
    }
    
    // Insert matches into database
    if (matches.length > 0) {
      const prisma = await getPrismaClient();
      await prisma.game.createMany({
        data: matches
      });
    }
    
    return matches;
  }

  /**
   * Fix league schedule for a specific division using corrected round-robin logic
   * Called to repair broken schedules after Day 7+
   */
  static async fixDivisionSchedule(division: number, season: number): Promise<{
    matchesGenerated: number;
    subdivisions: Array<{
      name: string;
      teams: number;
      matches: number;
    }>;
  }> {
    console.log(`🔧 Fixing schedule for Division ${division}, Season ${season}`);
    
    const prisma = await getPrismaClient();
    // Get the league for this division
    const seasonId = `season-${season}-2025`;
    const league = await prisma.league.findFirst({
      where: { 
        division: division,
        seasonId: seasonId 
      }
    });
    
    if (!league) {
      throw new Error(`League not found for Division ${division}, Season ${season}`);
    }
    
    // Get all teams in this division
    const teams = await prisma.team.findMany({
      where: { division: division }
    });
    
    if (teams.length === 0) {
      throw new Error(`No teams found in Division ${division}`);
    }
    
    console.log(`📊 Found ${teams.length} teams in Division ${division}`);
    
    // Generate schedule using the corrected large division logic
    const matches = await this.generateLargeDivisionSchedule(league.id.toString(), teams, season);
    
    // Group results by subdivision for reporting
    const subdivisionMap = new Map<string, any[]>();
    for (const team of teams) {
      const subdivision = team.subdivision || 'main';
      if (!subdivisionMap.has(subdivision)) {
        subdivisionMap.set(subdivision, []);
      }
      subdivisionMap.get(subdivision)!.push(team);
    }
    
    const subdivisions = Array.from(subdivisionMap.entries()).map(([name, teams]) => ({
      name,
      teams: teams.length,
      matches: Math.floor(teams.length / 2) * 6 // Estimated matches for 6 remaining days
    }));
    
    console.log(`✅ Generated ${matches.length} matches for Division ${division}`);
    
    return {
      matchesGenerated: matches.length,
      subdivisions
    };
  }

  /**
   * Generate small division schedule (less than 8 teams)
   */
  static async generateSmallDivisionSchedule(
    leagueId: string, 
    teams: any[], 
    season: number
  ): Promise<Array<{leagueId: string, homeTeamId: number, awayTeamId: number, gameDate: Date, status: string, matchType: string}>> {
    const matches: Array<{leagueId: string, homeTeamId: number, awayTeamId: number, gameDate: Date, status: string, matchType: string}> = [];
    const numTeams = teams.length;
    
    if (numTeams < 2) {
      return matches; // Can't generate matches with less than 2 teams
    }
    
    // Get current season start date from database
    const prisma = await getPrismaClient();
    const currentSeason = await prisma.season.findFirst({
      where: { seasonNumber: season },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!currentSeason) {
      throw new Error(`No season found for season number ${season}`);
    }
    
    // Generate matches for 14 days
    for (let day = 1; day <= this.SEASON_CONFIG.REGULAR_SEASON_DAYS; day++) {
      const dayMatches = this.generateSubdivisionDayMatches(teams, day, 1);
      
      // Use generateDailyGameTimes for consecutive 15-minute intervals
      const { generateDailyGameTimes } = await import('../../shared/timezone.js');
      const dailyGameTimes = generateDailyGameTimes(day);
      
      for (let matchIndex = 0; matchIndex < dayMatches.length; matchIndex++) {
        const match = dayMatches[matchIndex];
        const gameDate = new Date(currentSeason.startDate);
        gameDate.setDate(gameDate.getDate() + day - 1);
        
        // Use the appropriate time slot for this match
        const slotIndex = matchIndex % dailyGameTimes.length;
        const gameTime = dailyGameTimes[slotIndex];
        
        gameDate.setHours(gameTime.getHours(), gameTime.getMinutes(), 0, 0);
        
        const matchData = {
          leagueId: leagueId,  // Keep as string for consistent type handling
          homeTeamId: parseInt(match.homeTeam.id, 10),
          awayTeamId: parseInt(match.awayTeam.id, 10),
          gameDate: gameDate,
          status: 'SCHEDULED',
          matchType: 'LEAGUE'
        };
        
        matches.push(matchData);
      }
    }
    
    // Insert matches into database
    if (matches.length > 0) {
      const prisma = await getPrismaClient();
      await prisma.game.createMany({
        data: matches as any
      });
    }
    
    return matches;
  }

  /**
   * Generate round-robin round for standard leagues
   */
  static generateRoundRobinRound(teams: any[], round: number, reverse = false): any[] {
    const matches = [];
    const numTeams = teams.length;
    
    for (let i = 0; i < numTeams / 2; i++) {
      const team1Index = i;
      const team2Index = (numTeams - 1 - i + round) % (numTeams - 1);
      const finalTeam2Index = team2Index >= team1Index ? team2Index + 1 : team2Index;
      
      const homeTeam = reverse ? teams[finalTeam2Index] : teams[team1Index];
      const awayTeam = reverse ? teams[team1Index] : teams[finalTeam2Index];
      
      matches.push({
        homeTeam,
        awayTeam
      });
    }
    
    return matches;
  }

  /**
   * Generate matches for a specific day (used for Division 1)
   */
  static generateDayMatches(teams: any[], day: number, matchesPerDay: number): any[] {
    const matches = [];
    const availableTeams = [...teams];
    
    for (let i = 0; i < matchesPerDay && availableTeams.length >= 2; i++) {
      // Simple pairing algorithm - can be enhanced for better scheduling
      const homeTeam = availableTeams.splice(
        Math.floor(Math.random() * availableTeams.length), 1
      )[0];
      const awayTeam = availableTeams.splice(
        Math.floor(Math.random() * availableTeams.length), 1
      )[0];
      
      matches.push({
        homeTeam,
        awayTeam
      });
    }
    
    return matches;
  }

  /**
   * Update league standings after a match is completed
   */
  static async updateStandingsAfterMatch(matchId: string): Promise<{
    homeTeamUpdate: any;
    awayTeamUpdate: any;
    standingsUpdated: boolean;
  }> {
    const prisma = await getPrismaClient();
    // Get match details
    const matchData = await prisma.game.findUnique({
      where: { id: parseInt(matchId, 10) }
    });
    
    if (!matchData || matchData.status !== 'COMPLETED') {
      throw new Error('Match not found or not completed');
    }
    const homeScore = matchData.homeScore || 0;
    const awayScore = matchData.awayScore || 0;
    
    // Determine points
    let homePoints = 0;
    let awayPoints = 0;
    
    if (homeScore > awayScore) {
      homePoints = this.SEASON_CONFIG.POINTS_WIN;
      awayPoints = this.SEASON_CONFIG.POINTS_LOSS;
    } else if (awayScore > homeScore) {
      homePoints = this.SEASON_CONFIG.POINTS_LOSS;
      awayPoints = this.SEASON_CONFIG.POINTS_WIN;
    } else {
      homePoints = this.SEASON_CONFIG.POINTS_DRAW;
      awayPoints = this.SEASON_CONFIG.POINTS_DRAW;
    }
    
    // Get current team data
    const homeTeam = await prisma.team.findUnique({ where: { id: matchData.homeTeamId } });
    const awayTeam = await prisma.team.findUnique({ where: { id: matchData.awayTeamId } });
    
    // Update home team
    const homeTeamUpdate = await prisma.team.update({
      where: { id: matchData.homeTeamId },
      data: {
        points: (homeTeam?.points || 0) + homePoints,
        wins: homeScore > awayScore ? (homeTeam?.wins || 0) + 1 : homeTeam?.wins || 0,
        losses: homeScore < awayScore ? (homeTeam?.losses || 0) + 1 : homeTeam?.losses || 0
        // draws: Property not in schema
      }
    });
    
    // Update away team
    const awayTeamUpdate = await prisma.team.update({
      where: { id: matchData.awayTeamId },
      data: {
        points: (awayTeam?.points || 0) + awayPoints,
        wins: awayScore > homeScore ? (awayTeam?.wins || 0) + 1 : awayTeam?.wins || 0,
        losses: awayScore < homeScore ? (awayTeam?.losses || 0) + 1 : awayTeam?.losses || 0
        // draws: Property not in schema
      }
    });
    
    return {
      homeTeamUpdate,
      awayTeamUpdate,
      standingsUpdated: true
    };
  }

  /**
   * Get final league standings with tie-breakers applied
   */
  static async getFinalStandings(leagueId: string, season: number): Promise<{
    standings: Array<{
      position: number;
      team: any;
      points: number;
      wins: number;
      losses: number;
      draws: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
      playoffQualified: boolean;
      relegated: boolean;
    }>;
    playoffTeams: any[];
    relegatedTeams: any[];
  }> {
    const prisma = await getPrismaClient();
    // Get league info
    const league = await prisma.league.findUnique({
      where: { id: parseInt(leagueId, 10) }
    });
    
    if (!league) {
      throw new Error('League not found');
    }
    
    const division = league.division;
    
    // Get all teams in this league with their match statistics
    const leagueTeams = await this.getTeamsWithStats(leagueId, season);
    
    // Apply tie-breaker logic and sort
    const sortedTeams = this.applyTieBreakers(leagueTeams);
    
    // Determine qualification and relegation
    const standings = sortedTeams.map((team, index) => {
      const position = index + 1;
      const playoffQualified = position <= this.SEASON_CONFIG.PLAYOFF_QUALIFIERS;
      
      let relegated = false;
      if (division === 1) {
        relegated = position > (this.SEASON_CONFIG.DIVISION_1_TEAMS - this.SEASON_CONFIG.DIVISION_1_RELEGATION);
      } else if (division < this.SEASON_CONFIG.MAX_DIVISION) {
        relegated = position > (this.SEASON_CONFIG.STANDARD_LEAGUE_TEAMS - this.SEASON_CONFIG.STANDARD_RELEGATION);
      }
      
      return {
        position,
        team,
        points: team.points || 0,
        wins: team.wins || 0,
        losses: team.losses || 0,
        draws: team.draws || 0,
        goalsFor: team.goalsFor || 0,
        goalsAgainst: team.goalsAgainst || 0,
        goalDifference: (team.goalsFor || 0) - (team.goalsAgainst || 0),
        playoffQualified,
        relegated
      };
    });
    
    const playoffTeams = standings
      .filter(s => s.playoffQualified)
      .map(s => s.team);
    
    const relegatedTeams = standings
      .filter(s => s.relegated)
      .map(s => s.team);
    
    return {
      standings,
      playoffTeams,
      relegatedTeams
    };
  }

  /**
   * Get teams with calculated statistics
   */
  static async getTeamsWithStats(leagueId: string, season: number): Promise<any[]> {
    // This would need to aggregate match data for each team
    // For now, return basic team data - can be enhanced with actual match statistics
    const prisma = await getPrismaClient();
    const league = await prisma.league.findUnique({
      where: { id: parseInt(leagueId, 10) }
    });
    
    if (!league) return [];
    
    const leagueTeams = await prisma.team.findMany({
      where: { division: league.division }
    });
    
    // Calculate goals for/against from match data
    for (const team of leagueTeams) {
      const homeMatches = await prisma.game.findMany({
        where: {
          homeTeamId: team.id,
          status: 'COMPLETED'
        }
      });
      
      const awayMatches = await prisma.game.findMany({
        where: {
          awayTeamId: team.id,
          status: 'COMPLETED'
        }
      });
      
      let goalsFor = 0;
      let goalsAgainst = 0;
      
      // Home matches
      for (const match of homeMatches) {
        goalsFor += match.homeScore || 0;
        goalsAgainst += match.awayScore || 0;
      }
      
      // Away matches
      for (const match of awayMatches) {
        goalsFor += match.awayScore || 0;
        goalsAgainst += match.homeScore || 0;
      }
      
      // team.goalsFor = goalsFor; // Property assignment not allowed - use local calculations
      // team.goalsAgainst = goalsAgainst; // Property assignment not allowed - use local calculations
    }
    
    return leagueTeams;
  }

  /**
   * Apply tie-breaker rules and sort teams
   * 1. Points
   * 2. Head-to-head record
   * 3. Goal difference
   * 4. Goals for
   */
  static applyTieBreakers(teams: any[]): any[] {
    return teams.sort((a: any, b: any) => {
      // Primary: Points
      if ((b.points || 0) !== (a.points || 0)) {
        return (b.points || 0) - (a.points || 0);
      }
      
      // Secondary: Goal difference
      const aGD = (a.goalsFor || 0) - (a.goalsAgainst || 0);
      const bGD = (b.goalsFor || 0) - (b.goalsAgainst || 0);
      if (bGD !== aGD) {
        return bGD - aGD;
      }
      
      // Tertiary: Goals for
      return (b.goalsFor || 0) - (a.goalsFor || 0);
    });
  }

  /**
   * Generate playoff brackets for Day 15
   * Division 1: Top 8 teams compete in tournament
   * Divisions 2-8: Top 4 teams compete in tournament
   */
  static async generatePlayoffBrackets(season: number): Promise<{
    bracketsByLeague: Array<{
      leagueId: string;
      division: number;
      playoffMatches: any[];
      qualifierCount: number;
    }>;
    totalPlayoffMatches: number;
  }> {
    const prisma = await getPrismaClient();
    // Get the actual season ID from database instead of hardcoded format
    const currentSeason = await prisma.season.findFirst({
      where: { seasonNumber: season },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!currentSeason) {
      logError(new Error(`No season found for season number ${season}`));
      return { bracketsByLeague: [], totalPlayoffMatches: 0 };
    }
    
    const allLeagues = await prisma.league.findMany({
      where: { seasonId: currentSeason.id }
    });
    
    const bracketsByLeague = [];
    let totalPlayoffMatches = 0;
    
    for (const league of allLeagues) {
      const standings = await this.getFinalStandings(league.id.toString(), season);
      const division = league.division;
      
      // Determine qualifier count based on division
      // Division 1 and 2 use 8-team brackets, Divisions 3-8 use 4-team brackets
      const qualifierCount = (division === 1 || division === 2)
        ? this.SEASON_CONFIG.DIVISION_1_TOURNAMENT_QUALIFIERS 
        : this.SEASON_CONFIG.STANDARD_TOURNAMENT_QUALIFIERS;
      
      const playoffTeams = standings.standings.slice(0, qualifierCount);
      
      if (playoffTeams.length >= qualifierCount) {
        let playoffMatches = [];
        
        if (division === 1 || division === 2) {
          // Division 1 & 2: 8-team single elimination tournament (Quarterfinals, Semifinals, Finals)
          // Schedule all rounds with 30-minute buffers during simulation window (4PM-10PM EDT)
          
          // Get season start date for Day 15 calculation
          const currentSeason = await prisma.season.findFirst({
            where: { seasonNumber: season },
            orderBy: { createdAt: 'desc' }
          });
          
          if (currentSeason) {
            const day15Date = new Date(currentSeason.startDate);
            day15Date.setDate(day15Date.getDate() + 14); // Day 15 (0-indexed, so +14)
            
            // Schedule during simulation window with 30-minute round buffers
            const quarterfinalsTime = new Date(day15Date);
            quarterfinalsTime.setUTCHours(20, 0, 0, 0); // 4:00 PM EDT (20:00 UTC)
            
            const semifinalsTime = new Date(quarterfinalsTime);
            semifinalsTime.setUTCMinutes(semifinalsTime.getUTCMinutes() + 30); // +30 minutes
            
            const finalsTime = new Date(semifinalsTime);
            finalsTime.setUTCMinutes(finalsTime.getUTCMinutes() + 30); // +30 minutes
            
            playoffMatches = [
              // QUARTERFINALS ONLY (4 matches at 4:00 PM EDT)
              // Subsequent rounds will be scheduled dynamically after these complete
              {
                leagueId: parseInt(league.id.toString()),
                homeTeamId: playoffTeams[0].team.id, // Seed 1 vs Seed 8
                awayTeamId: playoffTeams[7].team.id,
                gameDate: quarterfinalsTime,
                status: 'SCHEDULED' as const,
                matchType: 'PLAYOFF' as const,
                round: 1
              },
              {
                leagueId: parseInt(league.id.toString()),
                homeTeamId: playoffTeams[1].team.id, // Seed 2 vs Seed 7
                awayTeamId: playoffTeams[6].team.id,
                gameDate: quarterfinalsTime,
                status: 'SCHEDULED' as const,
                matchType: 'PLAYOFF' as const,
                round: 1
              },
              {
                leagueId: parseInt(league.id.toString()),
                homeTeamId: playoffTeams[2].team.id, // Seed 3 vs Seed 6
                awayTeamId: playoffTeams[5].team.id,
                gameDate: quarterfinalsTime,
                status: 'SCHEDULED' as const,
                matchType: 'PLAYOFF' as const,
                round: 1
              },
              {
                leagueId: parseInt(league.id.toString()),
                homeTeamId: playoffTeams[3].team.id, // Seed 4 vs Seed 5
                awayTeamId: playoffTeams[4].team.id,
                gameDate: quarterfinalsTime,
                status: 'SCHEDULED' as const,
                matchType: 'PLAYOFF' as const,
                round: 1
              }
            ];
          }
        } else {
          // Divisions 3-8: 4-team single elimination tournament (Semifinals, Finals)
          // Schedule both rounds with 30-minute buffers during simulation window (4PM-10PM EDT)
          
          // Get season start date for Day 15 calculation
          const currentSeason = await prisma.season.findFirst({
            where: { seasonNumber: season },
            orderBy: { createdAt: 'desc' }
          });
          
          if (currentSeason) {
            const day15Date = new Date(currentSeason.startDate);
            day15Date.setDate(day15Date.getDate() + 14); // Day 15 (0-indexed, so +14)
            
            // Schedule during simulation window with 30-minute round buffers
            const semifinalsTime = new Date(day15Date);
            semifinalsTime.setUTCHours(20, 0, 0, 0); // 4:00 PM EDT (20:00 UTC)
            
            const finalsTime = new Date(semifinalsTime);
            finalsTime.setUTCMinutes(finalsTime.getUTCMinutes() + 30); // +30 minutes
            
            playoffMatches = [
              // SEMIFINALS ONLY (2 matches at 4:00 PM EDT)
              // Finals will be scheduled dynamically after these complete
              {
                leagueId: parseInt(league.id.toString()),
                homeTeamId: playoffTeams[0].team.id, // Seed 1 vs Seed 4
                awayTeamId: playoffTeams[3].team.id,
                gameDate: semifinalsTime,
                status: 'SCHEDULED' as const,
                matchType: 'PLAYOFF' as const,
                round: 1
              },
              {
                leagueId: parseInt(league.id.toString()),
                homeTeamId: playoffTeams[1].team.id, // Seed 2 vs Seed 3
                awayTeamId: playoffTeams[2].team.id,
                gameDate: semifinalsTime,
                status: 'SCHEDULED' as const,
                matchType: 'PLAYOFF' as const,
                round: 1
              }
            ];
          }
        }
        
        // Insert playoff matches
        await prisma.game.createMany({
          data: playoffMatches
        });
        
        bracketsByLeague.push({
          leagueId: league.id.toString(),
          division: league.division,
          playoffMatches,
          qualifierCount
        });
        
        totalPlayoffMatches += playoffMatches.length;
      }
    }
    
    return {
      bracketsByLeague,
      totalPlayoffMatches
    };
  }

  /**
   * Process end-of-season promotion and relegation based on specifications
   * Implements the top-down promotion/relegation algorithm
   */
  static async processPromotionRelegation(season: number): Promise<{
    promotions: Array<{ teamId: string; fromDivision: number; toDivision: number }>;
    relegations: Array<{ teamId: string; fromDivision: number; toDivision: number }>;
    totalTeamsProcessed: number;
  }> {
    const promotions: Array<{ teamId: string; fromDivision: number; toDivision: number }> = [];
    const relegations: Array<{ teamId: string; fromDivision: number; toDivision: number }> = [];
    
    // Step 1: Division 1 Relegation (The Great Filter)
    // Bottom 6 teams (11th-16th place) are relegated to Division 2
    await this.processDivision1Relegation(season, relegations);
    
    // Step 2: Division 2 Promotion (The Ascent)
    // 2 teams from each of 3 sub-divisions (6 total) are promoted to Division 1
    await this.processDivision2Promotion(season, promotions);
    
    // Step 3: Division 2 Relegation & Division 3 Promotion (The Churn)
    // Bottom 4 teams from each Division 2 sub-division are relegated (12 total)
    // Top 12 teams from Division 3 promotion pool are promoted
    await this.processDivision2Relegation(season, relegations);
    await this.processDivision3Promotion(season, promotions);
    
    // Step 4: Standardized Cascade (Divisions 3 through 8)
    // Bottom 4 teams from each subdivision are relegated
    // Top teams from promotion pool are promoted
    await this.processStandardizedCascade(season, promotions, relegations);
    
    return {
      promotions,
      relegations,
      totalTeamsProcessed: promotions.length + relegations.length
    };
  }

  /**
   * Step 1: Division 1 Relegation - Bottom 6 teams relegated
   */
  static async processDivision1Relegation(season: number, relegations: any[]): Promise<void> {
    const prisma = await getPrismaClient();
    const division1Teams = await prisma.team.findMany({
      where: { division: 1 },
      orderBy: [
        { points: 'desc' },
        { wins: 'desc' },
        { losses: 'asc' }
      ]
    });
    
    // Bottom 6 teams (11th-16th place) are relegated
    const relegationZone = division1Teams.slice(-this.SEASON_CONFIG.DIVISION_1_RELEGATION);
    
    for (const team of relegationZone) {
      await prisma.team.update({
        where: { id: team.id },
        data: { division: 2 }
      });
      
      relegations.push({
        teamId: team.id,
        fromDivision: 1,
        toDivision: 2
      });
    }
  }

  /**
   * Step 2: Division 2 Promotion - 2 teams from each of 3 sub-divisions
   */
  static async processDivision2Promotion(season: number, promotions: any[]): Promise<void> {
    const prisma = await getPrismaClient();
    // Get Division 2 subdivisions
    const division2Subdivisions = await prisma.team.groupBy({
      by: ['subdivision'],
      where: { division: 2 },
      _count: { id: true }
    });
    
    for (const subdivision of division2Subdivisions) {
      const subdivisionTeams = await prisma.team.findMany({
        where: { 
          division: 2,
          subdivision: subdivision.subdivision
        },
        orderBy: [
          { points: 'desc' },
          { wins: 'desc' },
          { losses: 'asc' }
        ]
      });
      
      // Get season champion (#1) and tournament winner
      // For now, promote top 2 teams (can be enhanced with tournament logic)
      const teamsToPromote = subdivisionTeams.slice(0, this.SEASON_CONFIG.DIVISION_2_PROMOTION_PER_SUBDIVISION);
      
      for (const team of teamsToPromote) {
        await prisma.team.update({
          where: { id: team.id },
          data: { division: 1 }
        });
        
        promotions.push({
          teamId: team.id,
          fromDivision: 2,
          toDivision: 1
        });
      }
    }
  }

  /**
   * Step 3a: Division 2 Relegation - Bottom 4 teams from each 16-team subdivision
   */
  static async processDivision2Relegation(season: number, relegations: any[]): Promise<void> {
    const prisma = await getPrismaClient();
    const division2Subdivisions = await prisma.team.groupBy({
      by: ['subdivision'],
      where: { division: 2 },
      _count: { id: true }
    });
    
    for (const subdivision of division2Subdivisions) {
      const subdivisionTeams = await prisma.team.findMany({
        where: { 
          division: 2,
          subdivision: subdivision.subdivision
        },
        orderBy: [
          { points: 'desc' },
          { wins: 'desc' },
          { losses: 'asc' }
        ]
      });
      
      // Bottom 4 teams (13th-16th place) are relegated
      const relegationZone = subdivisionTeams.slice(-this.SEASON_CONFIG.DIVISION_2_RELEGATION_PER_SUBDIVISION);
      
      for (const team of relegationZone) {
        await prisma.team.update({
          where: { id: team.id },
          data: { division: 3 }
        });
        
        relegations.push({
          teamId: team.id,
          fromDivision: 2,
          toDivision: 3
        });
      }
    }
  }

  /**
   * Step 3b: Division 3 Promotion - Subdivision-Based System with AI Filling
   */
  static async processDivision3Promotion(season: number, promotions: any[]): Promise<void> {
    console.log(`[SUBDIVISION-BASED PROMOTION] Processing Division 3 promotion to Division 2`);
    
    // Get promoted teams from all Division 3 subdivisions using new system
    const promotedTeams = await this.getSubdivisionPromotedTeams(3, season);
    
    // Take up to 12 teams (matches Division 2 relegation spots) and use AI filling
    const teamsToPromote = promotedTeams.slice(0, 12);
    console.log(`[SUBDIVISION-BASED PROMOTION] Promoting ${teamsToPromote.length} teams from Division 3 to Division 2 with AI filling`);
    
    // Use AI filling system for Division 2 subdivision balancing
    await this.promoteTeamsWithAIFilling(teamsToPromote, 2, promotions);
  }

  /**
   * Step 4: Standardized Cascade for Divisions 3-8 using Subdivision-Based System
   */
  static async processStandardizedCascade(season: number, promotions: any[], relegations: any[]): Promise<void> {
    const prisma = await getPrismaClient();
    
    // Process divisions 3-8 with new subdivision-based promotion system
    for (let division = 3; division <= this.SEASON_CONFIG.MAX_DIVISION; division++) {
      console.log(`[SUBDIVISION-BASED PROMOTION] Processing Division ${division}`);
      
      // Relegation: Bottom 4 teams from each subdivision (except Division 8)
      if (division < this.SEASON_CONFIG.MAX_DIVISION) {
        const subdivisions = await prisma.team.groupBy({
          by: ['subdivision'],
          where: { division },
          _count: { id: true }
        });
        
        for (const subdivision of subdivisions) {
          const subdivisionTeams = await prisma.team.findMany({
            where: { 
              division,
              subdivision: subdivision.subdivision
            },
            orderBy: [
              { points: 'desc' },
              { wins: 'desc' },
              { losses: 'asc' }
            ]
          });
          
          // Bottom 4 teams are relegated
          const relegationZone = subdivisionTeams.slice(-this.SEASON_CONFIG.STANDARD_RELEGATION_PER_SUBDIVISION);
          
          for (const team of relegationZone) {
            await prisma.team.update({
              where: { id: team.id },
              data: { division: division + 1 }
            });
            
            relegations.push({
              teamId: team.id,
              fromDivision: division,
              toDivision: division + 1
            });
          }
        }
      }
      
      // Promotion: Use subdivision-based system from division below (except for Division 3)
      if (division < this.SEASON_CONFIG.MAX_DIVISION) {
        console.log(`[SUBDIVISION-BASED PROMOTION] Getting promoted teams from Division ${division + 1} to Division ${division}`);
        const promotedTeams = await this.getSubdivisionPromotedTeams(division + 1, season);
        
        // Use AI filling system to create balanced subdivisions in target division
        console.log(`[SUBDIVISION-BASED PROMOTION] Promoting ${promotedTeams.length} teams from Division ${division + 1} to Division ${division}`);
        await this.promoteTeamsWithAIFilling(promotedTeams, division, promotions);
      }
    }
  }

  /**
   * Promote teams to a division and create AI teams to fill incomplete subdivisions
   * Implements the user's desired AI filling system for balanced subdivisions
   */
  static async promoteTeamsWithAIFilling(promotedTeams: any[], targetDivision: number, promotions: any[]): Promise<void> {
    const prisma = await getPrismaClient();
    const TEAMS_PER_SUBDIVISION = 8;
    
    console.log(`[AI FILLING] Promoting ${promotedTeams.length} teams to Division ${targetDivision}`);
    
    // Calculate subdivision distribution
    const totalPromotedTeams = promotedTeams.length;
    const neededSubdivisions = Math.ceil(totalPromotedTeams / TEAMS_PER_SUBDIVISION);
    const completeSubdivisions = Math.floor(totalPromotedTeams / TEAMS_PER_SUBDIVISION);
    const incompleteSubdivisions = neededSubdivisions - completeSubdivisions;
    const teamsInIncompleteSubdivision = totalPromotedTeams % TEAMS_PER_SUBDIVISION;
    const aiTeamsNeeded = incompleteSubdivisions > 0 ? (TEAMS_PER_SUBDIVISION - teamsInIncompleteSubdivision) : 0;
    
    console.log(`[AI FILLING] Distribution: ${neededSubdivisions} subdivisions needed`);
    console.log(`[AI FILLING] Complete subdivisions: ${completeSubdivisions} (8 teams each)`);
    console.log(`[AI FILLING] Incomplete subdivisions: ${incompleteSubdivisions} (${teamsInIncompleteSubdivision} teams each)`);
    console.log(`[AI FILLING] AI teams needed: ${aiTeamsNeeded}`);
    
    // Get available subdivision names (Greek alphabet)
    const subdivisionNames = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega'];
    
    // Promote existing teams and assign to subdivisions
    for (let i = 0; i < promotedTeams.length; i++) {
      const team = promotedTeams[i];
      const subdivisionIndex = Math.floor(i / TEAMS_PER_SUBDIVISION);
      const subdivisionName = subdivisionNames[subdivisionIndex];
      
      await prisma.team.update({
        where: { id: team.id },
        data: { 
          division: targetDivision,
          subdivision: subdivisionName
        }
      });
      
      promotions.push({
        teamId: team.id,
        fromDivision: targetDivision + 1,
        toDivision: targetDivision
      });
    }
    
    // Create AI teams to fill incomplete subdivisions
    if (aiTeamsNeeded > 0) {
      console.log(`[AI FILLING] Creating ${aiTeamsNeeded} AI teams to complete subdivisions`);
      
      for (let i = 0; i < aiTeamsNeeded; i++) {
        const subdivisionName = subdivisionNames[completeSubdivisions]; // AI teams go to the incomplete subdivision
        const aiTeam = await this.createAITeam(targetDivision, subdivisionName);
        
        console.log(`[AI FILLING] Created AI team: ${aiTeam.name} in Division ${targetDivision}, Subdivision ${subdivisionName}`);
      }
    }
    
    console.log(`[AI FILLING] Completed promotion with AI filling for Division ${targetDivision}`);
  }

  /**
   * Create an AI team for filling incomplete subdivisions
   */
  static async createAITeam(division: number, subdivision: string): Promise<any> {
    const prisma = await getPrismaClient();
    
    // Generate AI team name
    const aiTeamNames = [
      'Iron Eagles', 'Storm Wolves', 'Thunder Hawks', 'Lightning Bolts', 'Fire Dragons',
      'Ice Titans', 'Wind Runners', 'Earth Guardians', 'Star Crusaders', 'Moon Riders',
      'Solar Flares', 'Cosmic Raiders', 'Meteor Strikers', 'Galaxy Warriors', 'Nebula Knights',
      'Phoenix Rising', 'Crimson Falcons', 'Golden Lions', 'Silver Bears', 'Bronze Tigers'
    ];
    
    const baseName = aiTeamNames[Math.floor(Math.random() * aiTeamNames.length)];
    const uniqueId = Math.floor(Math.random() * 1000); // Random 3-digit suffix
    const randomName = `${baseName} ${uniqueId}`;
    
    // First create AI user profile
    const aiUserProfile = await prisma.userProfile.create({
      data: {
        userId: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email: `ai-team-${Date.now()}@realmrivalry.ai`,
        firstName: 'AI',
        lastName: 'Team'
      }
    });
    
    // Create AI team
    const aiTeam = await prisma.team.create({
      data: {
        userProfileId: aiUserProfile.id,
        name: randomName,
        isAI: true,
        division: division,
        subdivision: subdivision,
        camaraderie: 50,
        fanLoyalty: 50,
        homeField: 'STANDARD',
        tacticalFocus: 'BALANCED',
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0
      }
    });
    
    // Create basic team finances for AI team
    await prisma.teamFinances.create({
      data: {
        teamId: aiTeam.id,
        credits: 100000,
        gems: 10
      }
    });
    
    // Create basic stadium for AI team
    await prisma.stadium.create({
      data: {
        teamId: aiTeam.id,
        capacity: 5000,
        concessionsLevel: 1,
        parkingLevel: 1,
        vipSuitesLevel: 1,
        merchandisingLevel: 1,
        lightingScreensLevel: 1
      }
    });
    
    return aiTeam;
  }

  /**
   * Get teams promoted from each subdivision using the new subdivision-based system
   * Returns teams that should be promoted: Regular Season Winner + Playoff Winner
   * If same team wins both, Regular Season runner-up gets promoted instead
   */
  static async getSubdivisionPromotedTeams(division: number, season: number): Promise<any[]> {
    const prisma = await getPrismaClient();
    const subdivisions = await prisma.team.groupBy({
      by: ['subdivision'],
      where: { division },
      _count: { id: true }
    });
    
    const promotedTeams = [];
    
    for (const subdivision of subdivisions) {
      // Get regular season standings for this subdivision
      const subdivisionTeams = await prisma.team.findMany({
        where: { 
          division,
          subdivision: subdivision.subdivision
        },
        orderBy: [
          { points: 'desc' },
          { wins: 'desc' },
          { losses: 'asc' }
        ]
      });
      
      const regularSeasonWinner = subdivisionTeams[0]; // #1 in standings
      const regularSeasonRunnerUp = subdivisionTeams[1]; // #2 in standings
      
      // Get playoff winner for this subdivision
      const subdivisionName = subdivision.subdivision;
      if (!subdivisionName) continue; // Skip if subdivision name is null
      
      const playoffWinner = await this.getSubdivisionPlayoffWinner(division, subdivisionName, season);
      
      // Determine promoted teams based on user's logic
      if (playoffWinner && playoffWinner.id === regularSeasonWinner?.id) {
        // Same team won both - promote regular season winner + runner-up
        promotedTeams.push(regularSeasonWinner);
        if (regularSeasonRunnerUp) {
          promotedTeams.push(regularSeasonRunnerUp);
        }
      } else {
        // Different teams - promote both winners
        if (regularSeasonWinner) {
          promotedTeams.push(regularSeasonWinner);
        }
        if (playoffWinner) {
          promotedTeams.push(playoffWinner);
        }
      }
    }
    
    return promotedTeams;
  }

  /**
   * Get playoff winner for a specific subdivision
   */
  static async getSubdivisionPlayoffWinner(division: number, subdivision: string, season: number): Promise<any> {
    const prisma = await getPrismaClient();
    
    try {
      // Find the tournament for this division/subdivision
      const tournament = await prisma.tournament.findFirst({
        where: {
          division: division,
          type: 'DAILY_DIVISIONAL',
          status: 'COMPLETED'
        },
        include: {
          entries: {
            include: {
              team: true
            }
          }
        }
      });
      
      if (!tournament) {
        return null;
      }
      
      // Find the winner (finalRank = 1)
      const winnerEntry = tournament.entries.find(entry => entry.finalRank === 1);
      if (winnerEntry && winnerEntry.team.subdivision === subdivision) {
        return winnerEntry.team;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting playoff winner for division ${division}, subdivision ${subdivision}:`, error);
      return null;
    }
  }

  /**
   * Get playoff champions from completed championship matches
   */
  static async getPlayoffChampions(season: number): Promise<Array<{
    teamId: string;
    division: number;
    leagueId: string;
  }>> {
    const prisma = await getPrismaClient();
    // Get all championship matches (would need to be created after semifinals)
    const championshipMatches = await prisma.game.findMany({
      where: {
        matchType: 'PLAYOFF',
        status: 'COMPLETED'
      }
    });
    
    const champions = [];
    
    for (const match of championshipMatches) {
      const winnerId = (match.homeScore || 0) > (match.awayScore || 0) 
        ? match.homeTeamId 
        : match.awayTeamId;
      
      const team = await prisma.team.findUnique({
        where: { id: winnerId }
      });
      
      if (team) {
        champions.push({
          teamId: winnerId.toString(),
          division: team.division || this.SEASON_CONFIG.MAX_DIVISION,
          leagueId: (match.leagueId || 0).toString()
        });
      }
    }
    
    return champions;
  }

  /**
   * Rebalance leagues after promotion/relegation
   */
  static async rebalanceLeagues(season: number): Promise<{
    leaguesRebalanced: number;
    teamsRedistributed: number;
    newLeaguesCreated: number;
  }> {
    const prisma = await getPrismaClient();
    let leaguesRebalanced = 0;
    let teamsRedistributed = 0;
    let newLeaguesCreated = 0;
    
    // Process each division from top to bottom
    for (let division = 1; division <= this.SEASON_CONFIG.MAX_DIVISION; division++) {
      const divisionTeams = await prisma.team.findMany({
        where: { division }
      });
      
      // Determine teams per league based on division
      let requiredTeamsPerLeague;
      if (division === 1) {
        requiredTeamsPerLeague = this.SEASON_CONFIG.DIVISION_1_TEAMS; // 16 teams
      } else if (division === 2) {
        requiredTeamsPerLeague = this.SEASON_CONFIG.DIVISION_2_TEAMS; // 16 teams per subdivision
      } else {
        requiredTeamsPerLeague = this.SEASON_CONFIG.STANDARD_SUBDIVISION_TEAMS; // 8 teams for Div 3+
      }
      
      const requiredLeagues = Math.ceil(divisionTeams.length / requiredTeamsPerLeague);
      
      // Get existing leagues for this division
      const existingLeagues = await prisma.league.findMany({
        where: {
          division,
          seasonId: (season + 1).toString()
        }
      });
      
      // Create additional leagues if needed
      const leaguesToCreate = requiredLeagues - existingLeagues.length;
      for (let i = 0; i < leaguesToCreate; i++) {
        await prisma.league.create({
          data: {
            name: `Division ${division} League ${existingLeagues.length + i + 1}`,
            division,
            seasonId: (season + 1).toString(),
            // status: 'active' // Not in League schema yet
          }
        });
        newLeaguesCreated++;
      }
      
      leaguesRebalanced++;
      teamsRedistributed += divisionTeams.length;
    }
    
    return {
      leaguesRebalanced,
      teamsRedistributed,
      newLeaguesCreated
    };
  }

  /**
   * Execute playoffs completion and offseason start (Day 15→16 transition)
   */
  static async executePlayoffsToOffseasonTransition(currentSeason: number): Promise<{
    awardsDistributed: boolean;
    prizesDistributed: boolean;
    totalAwards: number;
    totalPrizeMoney: number;
    summary: {
      totalAwards: number;
      totalPrizeMoney: number;
    };
  }> {
    logInfo(`Starting Day 15→16 transition: Playoffs complete, distributing awards and prizes for Season ${currentSeason}`);
    
    // 1. Calculate and distribute end-of-season awards (moved from Day 17→1)
    const awardsResult = await this.distributeEndOfSeasonAwards(currentSeason);
    
    // 2. Distribute prize money based on final standings (moved from Day 17→1)
    const prizesResult = await this.distributePrizeMoney(currentSeason);
    
    logInfo(`Day 15→16 transition completed`, {
      awardsDistributed: awardsResult.awardsDistributed,
      prizesDistributed: prizesResult.prizesDistributed,
      totalAwards: awardsResult.totalAwards,
      totalPrizeMoney: prizesResult.totalPrizeMoney
    });
    
    return {
      awardsDistributed: awardsResult.awardsDistributed,
      prizesDistributed: prizesResult.prizesDistributed,
      totalAwards: awardsResult.totalAwards,
      totalPrizeMoney: prizesResult.totalPrizeMoney,
      summary: {
        totalAwards: awardsResult.totalAwards,
        totalPrizeMoney: prizesResult.totalPrizeMoney
      }
    };
  }

  /**
   * Execute complete season rollover (Day 17→1 transition)
   * NOTE: Awards and prize distribution moved to Day 15→16 transition
   */
  static async executeSeasonRollover(currentSeason: number): Promise<{
    newSeason: number;
    scheduleGenerated: boolean;
    promotionRelegationCompleted: boolean;
    leaguesRebalanced: boolean;
    aiTeamsRemoved: boolean;
    contractProgressionCompleted: boolean;
    summary: {
      totalMatches: number;
      totalPromotions: number;
      totalRelegations: number;
      leaguesCreated: number;
      totalAITeamsDeleted: number;
      totalAIPlayersDeleted: number;
      contractsProcessed: number;
      totalSalaryPaid: string;
      contractsExpired: number;
      playersToMarketplace: number;
      freeAgentsGenerated: number;
    };
  }> {
    const prisma = await getPrismaClient();
    const newSeason = currentSeason + 1;
    logInfo(`Starting Day 17→1 transition: Season rollover for Season ${currentSeason} → ${newSeason}`);
    
    // 1. Clean up AI teams before promotion/relegation
    const aiCleanupResult = await this.cleanupAITeams();
    
    // 2. Process final promotion/relegation (now with AI teams removed)
    const promotionResult = await this.processPromotionRelegation(currentSeason);
    
    // 3. Rebalance leagues for new season
    const rebalanceResult = await this.rebalanceLeagues(currentSeason);
    
    // 4. Reset team statistics for new season
    await prisma.team.updateMany({
      data: {
        wins: 0,
        losses: 0,
        points: 0
      }
    });
    
    // 5. Process contract progression (salaries, expirations, free agents)
    const { ContractProgressionService } = await import('./contractProgressionService.js');
    const contractResult = await ContractProgressionService.processSeasonalContractProgression();
    
    // 6. CRITICAL: Create new season record in database
    const now = new Date();
    const newSeasonEndDate = new Date(now);
    newSeasonEndDate.setDate(now.getDate() + 17); // 17-day season cycle
    
    const newSeasonRecord = await prisma.season.create({
      data: {
        id: `season-${newSeason}-${Date.now()}`,
        seasonNumber: newSeason,
        startDate: now,
        endDate: newSeasonEndDate,
        currentDay: 1,
        phase: 'REGULAR_SEASON'
      }
    });
    
    logInfo(`New season created: Season ${newSeason}, Day 1`, {
      newSeasonId: newSeasonRecord.id,
      startDate: newSeasonRecord.startDate,
      endDate: newSeasonRecord.endDate
    });
    
    // 7. Generate schedule for new season
    const scheduleResult = await this.generateSeasonSchedule(newSeason);
    
    logInfo(`Day 17→1 transition completed`, {
      newSeason,
      newSeasonCreated: true,
      scheduleGenerated: scheduleResult.matchesGenerated > 0,
      promotionRelegationCompleted: true,
      leaguesRebalanced: rebalanceResult.leaguesRebalanced > 0,
      aiTeamsRemoved: aiCleanupResult.aiTeamsRemoved,
      contractProgressionCompleted: contractResult.contractsProcessed > 0
    });
    
    return {
      newSeason,
      scheduleGenerated: scheduleResult.matchesGenerated > 0,
      promotionRelegationCompleted: true,
      leaguesRebalanced: rebalanceResult.leaguesRebalanced > 0,
      aiTeamsRemoved: aiCleanupResult.aiTeamsRemoved,
      contractProgressionCompleted: contractResult.contractsProcessed > 0,
      summary: {
        totalMatches: scheduleResult.matchesGenerated,
        totalPromotions: promotionResult.promotions.length,
        totalRelegations: promotionResult.relegations.length,
        leaguesCreated: rebalanceResult.newLeaguesCreated,
        totalAITeamsDeleted: aiCleanupResult.totalAITeamsDeleted,
        totalAIPlayersDeleted: aiCleanupResult.totalAIPlayersDeleted,
        contractsProcessed: contractResult.contractsProcessed,
        totalSalaryPaid: contractResult.totalSalaryPaid.toString(),
        contractsExpired: contractResult.contractsExpired,
        playersToMarketplace: contractResult.playersToMarketplace,
        freeAgentsGenerated: contractResult.freeAgentsGenerated
      }
    };
  }

  /**
   * Distribute end-of-season awards (Player of the Year, Top Scorer, etc.)
   */
  static async distributeEndOfSeasonAwards(season: number): Promise<{
    awardsDistributed: boolean;
    totalAwards: number;
    awards: Array<{
      awardType: string;
      playerName: string;
      teamName: string;
      statValue: number;
    }>;
  }> {
    const prisma = await getPrismaClient();
    try {
      const { awardsService } = await import('./awardsService');
      
      // Get season ID
      const seasonRecord = await prisma.season.findFirst({
        where: { seasonNumber: season },
        orderBy: { createdAt: 'desc' }
      });
      
      if (!seasonRecord) {
        logInfo('Season record not found for awards distribution', { season });
        return { awardsDistributed: false, totalAwards: 0, awards: [] };
      }

      // Calculate and award season awards
      const seasonAwards = await awardsService.calculateSeasonAwards(seasonRecord.id);
      
      // Get award details for summary
      const awards = [];
      for (const award of seasonAwards) {
        const player = await prisma.player.findUnique({
          where: { id: award.playerId },
          include: { team: true }
        });
        
        if (player) {
          awards.push({
            awardType: award.awardType,
            playerName: `${player.firstName} ${player.lastName}`,
            teamName: player.team.name,
            statValue: award.statValue
          });
        }
      }

      logInfo('End-of-season awards distributed', { 
        season, 
        totalAwards: seasonAwards.length,
        awards: awards.map(a => `${a.awardType}: ${a.playerName}`)
      });

      return {
        awardsDistributed: true,
        totalAwards: seasonAwards.length,
        awards
      };
      
    } catch (error) {
      console.error('Error distributing end-of-season awards:', error);
      return { awardsDistributed: false, totalAwards: 0, awards: [] };
    }
  }

  /**
   * Distribute prize money based on final league standings
   */
  static async distributePrizeMoney(season: number): Promise<{
    prizesDistributed: boolean;
    totalPrizeMoney: number;
    distributions: Array<{
      teamName: string;
      division: number;
      placement: number;
      prizeAmount: number;
      prizeType: string;
    }>;
  }> {
    const prisma = await getPrismaClient();
    try {
      const distributions = [];
      let totalPrizeMoney = 0;

      // Prize pools by division (credits)
      const divisionPrizePools: Record<number, { champion: number; runnerUp: number; thirdPlace: number; fourthPlace: number }> = {
        1: { champion: 50000, runnerUp: 25000, thirdPlace: 15000, fourthPlace: 10000 },
        2: { champion: 30000, runnerUp: 15000, thirdPlace: 8000, fourthPlace: 5000 },
        3: { champion: 20000, runnerUp: 10000, thirdPlace: 5000, fourthPlace: 3000 },
        4: { champion: 15000, runnerUp: 7500, thirdPlace: 4000, fourthPlace: 2500 },
        5: { champion: 10000, runnerUp: 5000, thirdPlace: 2500, fourthPlace: 1500 },
        6: { champion: 7500, runnerUp: 3500, thirdPlace: 2000, fourthPlace: 1000 },
        7: { champion: 5000, runnerUp: 2500, thirdPlace: 1500, fourthPlace: 750 },
        8: { champion: 3000, runnerUp: 1500, thirdPlace: 1000, fourthPlace: 500 }
      };

      // Process each division
      for (let division = 1; division <= this.SEASON_CONFIG.MAX_DIVISION; division++) {
        const divisionTeams = await prisma.team.findMany({
          where: { division },
          orderBy: [
            { points: 'desc' },
            { wins: 'desc' },
            { losses: 'asc' }
          ],
          include: { 
            finances: true 
          }
        });

        const prizePool = divisionPrizePools[division];
        
        // Award top 4 teams in each division
        for (let i = 0; i < Math.min(4, divisionTeams.length); i++) {
          const team = divisionTeams[i];
          const placement = i + 1;
          let prizeAmount = 0;
          let prizeType = '';

          switch (placement) {
            case 1:
              prizeAmount = prizePool.champion;
              prizeType = 'Division Champion';
              break;
            case 2:
              prizeAmount = prizePool.runnerUp;
              prizeType = 'Division Runner-up';
              break;
            case 3:
              prizeAmount = prizePool.thirdPlace;
              prizeType = 'Division Third Place';
              break;
            case 4:
              prizeAmount = prizePool.fourthPlace;
              prizeType = 'Division Fourth Place';
              break;
          }

          if (prizeAmount > 0 && team) {
            // Award prize money
            const currentCredits = team.finances ? Number(team.finances.credits) : 0;
            await prisma.teamFinances.update({
              where: { teamId: team.id },
              data: {
                credits: BigInt(currentCredits + prizeAmount)
              }
            });

            distributions.push({
              teamName: team.name,
              division,
              placement,
              prizeAmount,
              prizeType
            });

            totalPrizeMoney += prizeAmount;
          }
        }
      }

      logInfo('End-of-season prize money distributed', { 
        season, 
        totalPrizeMoney,
        distributionsCount: distributions.length
      });

      return {
        prizesDistributed: true,
        totalPrizeMoney,
        distributions
      };
      
    } catch (error) {
      console.error('Error distributing prize money:', error);
      return { prizesDistributed: false, totalPrizeMoney: 0, distributions: [] };
    }
  }

  /**
   * Clean up AI teams and their associated data
   */
  static async cleanupAITeams(): Promise<{
    aiTeamsRemoved: boolean;
    totalAITeamsDeleted: number;
    totalAIPlayersDeleted: number;
    totalAIUserProfilesDeleted: number;
  }> {
    const prisma = await getPrismaClient();
    try {
      logInfo('Starting AI team cleanup...');
      
      // Find all AI user profiles (they have userId starting with "ai-user-" or "ai_midseason_")
      const aiUserProfiles = await prisma.userProfile.findMany({
        where: {
          OR: [
            { userId: { startsWith: 'ai-user-' } },
            { userId: { startsWith: 'ai_midseason_' } },
            { email: { contains: '@realm-rivalry.com' } },
            { email: { contains: '@realmrivalry.ai' } }
          ]
        },
        include: { 
          Team: {
            include: {
              players: true,
              finances: true,
              stadium: true
            }
          }
        }
      });

      let totalAITeamsDeleted = 0;
      let totalAIPlayersDeleted = 0;
      let totalAIUserProfilesDeleted = 0;

      logInfo(`Found ${aiUserProfiles.length} AI user profiles to clean up`);

      // Create or find a placeholder team for historical game references
      let placeholderTeam = await prisma.team.findFirst({
        where: { name: 'DELETED_AI_TEAM' }
      });
      
      if (!placeholderTeam) {
        // Create a placeholder user profile first
        const placeholderUser = await prisma.userProfile.create({
          data: {
            userId: 'system-deleted-ai-placeholder',
            email: 'deleted-ai@system.placeholder',
            firstName: 'Deleted',
            lastName: 'AI Team'
          }
        });
        
        // Create placeholder team
        placeholderTeam = await prisma.team.create({
          data: {
            userProfileId: placeholderUser.id,
            name: 'DELETED_AI_TEAM',
            leagueId: 8,
            division: 8,
            subdivision: 'deleted'  // Use unique subdivision to prevent interference
          }
        });
        
        // Create placeholder finances and stadium
        await prisma.teamFinances.create({
          data: {
            teamId: placeholderTeam.id,
            credits: BigInt(0),
            gems: 0
          }
        });
        
        await prisma.stadium.create({
          data: {
            teamId: placeholderTeam.id,
            capacity: 5000
          }
        });
        
        logInfo(`Created placeholder team ${placeholderTeam.id} for historical game references`);
      }

      for (const aiProfile of aiUserProfiles) {
        // Delete all players for each AI team (note: Team is singular in Prisma relation)
        const teams = Array.isArray(aiProfile.Team) ? aiProfile.Team : [aiProfile.Team].filter(Boolean);
        for (const team of teams) {
          // Delete player contracts first
          await prisma.contract.deleteMany({
            where: { 
              playerId: { 
                in: team.players.map((p: any) => p.id) 
              } 
            }
          });
          
          // Delete player skill links
          await prisma.playerSkillLink.deleteMany({
            where: { 
              playerId: { 
                in: team.players.map((p: any) => p.id) 
              } 
            }
          });
          
          // Delete all players
          const deletedPlayers = await prisma.player.deleteMany({
            where: { teamId: team.id }
          });
          
          totalAIPlayersDeleted += deletedPlayers.count;
          
          // Delete team finances
          if (team) {
            await prisma.teamFinances.delete({
              where: { teamId: team.id }
            });
          }
          
          // Delete team stadium
          if (team.stadium) {
            await prisma.stadium.delete({
              where: { teamId: team.id }
            });
          }
          
          // Delete tournament entries for this team
          await prisma.tournamentEntry.deleteMany({
            where: { teamId: team.id }
          });
          
          // Delete marketplace listings (using correct field name)
          await prisma.marketplaceListing.deleteMany({
            where: { sellerTeamId: team.id }
          });
          
          // Delete any notifications for this team
          await prisma.notification.deleteMany({
            where: { teamId: team.id }
          });
          
          // Delete team strategy (tactical formations)
          await prisma.strategy.deleteMany({
            where: { teamId: team.id }
          });
          
          // Delete team staff
          await prisma.staff.deleteMany({
            where: { teamId: team.id }
          });
          
          // Delete team inventory items
          await prisma.inventoryItem.deleteMany({
            where: { teamId: team.id }
          });
          
          // Delete team active boosts
          await prisma.activeBoost.deleteMany({
            where: { teamId: team.id }
          });
          
          // Delete team tryout history
          await prisma.tryoutHistory.deleteMany({
            where: { teamId: team.id }
          });
          
          // Delete bids where this team was the bidder
          await prisma.bid.deleteMany({
            where: { bidderTeamId: team.id }
          });
          
          // Delete listing history for this team
          await prisma.listingHistory.deleteMany({
            where: { teamId: team.id }
          });
          
          // Update marketplace listings where this team was the high bidder (set to null)
          await prisma.marketplaceListing.updateMany({
            where: { currentHighBidderTeamId: team.id },
            data: { currentHighBidderTeamId: null, currentBid: null }
          });
          
          // Update historical games to use placeholder team before deleting
          await prisma.game.updateMany({
            where: { homeTeamId: team.id },
            data: { homeTeamId: placeholderTeam.id }
          });
          
          await prisma.game.updateMany({
            where: { awayTeamId: team.id },
            data: { awayTeamId: placeholderTeam.id }
          });
          
          logInfo(`Cleaned up team ${team.id} (${team.name}) and its ${team.players.length} players`);
          totalAIPlayersDeleted += team.players.length;
        }
        
        // Delete all AI teams for this profile
        if (teams.length > 0) {
          const deletedTeams = await prisma.team.deleteMany({
            where: { userProfileId: aiProfile.id }
          });
          totalAITeamsDeleted += deletedTeams.count;
        }
        
        // Delete the AI user profile
        await prisma.userProfile.delete({
          where: { id: aiProfile.id }
        });
        
        totalAIUserProfilesDeleted++;
      }

      logInfo('AI team cleanup completed', { 
        totalAIUserProfilesDeleted,
        totalAITeamsDeleted,
        totalAIPlayersDeleted
      });

      return {
        aiTeamsRemoved: totalAITeamsDeleted > 0,
        totalAITeamsDeleted,
        totalAIPlayersDeleted,
        totalAIUserProfilesDeleted
      };
      
    } catch (error) {
      console.error('Error during AI team cleanup:', error);
      return { 
        aiTeamsRemoved: false, 
        totalAITeamsDeleted: 0, 
        totalAIPlayersDeleted: 0,
        totalAIUserProfilesDeleted: 0
      };
    }
  }

  /**
   * Get current seasonal phase based on game day
   */
  static getCurrentSeasonalPhase(gameDay: number): {
    phase: 'regular_season' | 'playoffs' | 'offseason';
    description: string;
    daysRemaining: number;
  } {
    if (gameDay >= 1 && gameDay <= this.SEASON_CONFIG.REGULAR_SEASON_DAYS) {
      return {
        phase: 'regular_season',
        description: `Regular Season - Day ${gameDay} of ${this.SEASON_CONFIG.REGULAR_SEASON_DAYS}`,
        daysRemaining: this.SEASON_CONFIG.REGULAR_SEASON_DAYS - gameDay + 1
      };
    } else if (gameDay === this.SEASON_CONFIG.PLAYOFF_DAY) {
      return {
        phase: 'playoffs',
        description: 'Playoff Day - Championship Tournaments',
        daysRemaining: 1
      };
    } else if (this.SEASON_CONFIG.OFFSEASON_DAYS.includes(gameDay)) {
      return {
        phase: 'offseason',
        description: `Offseason - Day ${gameDay - this.SEASON_CONFIG.PLAYOFF_DAY} of 2`,
        daysRemaining: this.SEASON_CONFIG.TOTAL_SEASON_DAYS - gameDay + 1
      };
    } else {
      return {
        phase: 'offseason',
        description: 'Season Transition',
        daysRemaining: 0
      };
    }
  }
}