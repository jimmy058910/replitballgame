import { prisma } from '../db';
import { logInfo } from './errorService';
import { EASTERN_TIMEZONE, getEasternTimeAsDate } from '../../shared/timezone';

/**
 * Seasonal Flow Algorithm Service
 * 
 * Manages the complete 17-day competitive cycle:
 * - Days 1-14: Regular Season with scheduling and standings
 * - Day 15: Playoffs with single elimination tournaments
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
    
    // Promotion/relegation (updated to match specifications)
    DIVISION_1_RELEGATION: 6, // Bottom 6 teams relegated (11th-16th place)
    DIVISION_2_RELEGATION_PER_SUBDIVISION: 4, // Bottom 4 teams from each 16-team subdivision
    DIVISION_2_PROMOTION_PER_SUBDIVISION: 2, // 2 teams promoted from each Division 2 subdivision
    STANDARD_RELEGATION_PER_SUBDIVISION: 4, // Bottom 4 teams from each 8-team subdivision
    
    // Division limits
    MIN_DIVISION: 1,
    MAX_DIVISION: 8, // Division 8 is the floor
    
    // Season timing (EST timezone)
    SEASON_START_TIME: { hour: 15, minute: 0 }, // 3:00 PM EST - Division finalization
    SIMULATION_WINDOW: { start: 16, end: 22 }, // 4:00 PM - 10:00 PM EST
    MID_SEASON_CUP_DAY: 7, // Day 7 - Mid-Season Cup
    DIVISION_TOURNAMENT_DAY: 15, // Day 15 - Division tournaments
    NEW_SEASON_RESET_TIME: { hour: 3, minute: 0 }, // 3:00 AM EST - Day 17 reset
  };

  /**
   * Get current day in the season cycle (1-17)
   */
  static getCurrentDay(): number {
    const startDate = new Date("2025-07-13");
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
      // Get team info
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { league: true }
      });

      if (!team || !team.league) {
        return false;
      }

      // Check if team is in a tournament (Division playoffs)
      const tournamentEntries = await prisma.tournamentEntry.findMany({
        where: {
          teamId: teamId,
          tournament: {
            tournamentType: 'DIVISION_PLAYOFFS'
          }
        },
        include: {
          tournament: true
        }
      });

      return tournamentEntries.some(entry => 
        entry.tournament.status === 'IN_PROGRESS' || 
        entry.tournament.status === 'COMPLETED'
      );
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
    const seasonId = `season-${season}-2025`;
    const allLeagues = await prisma.league.findMany({
      where: { seasonId: seasonId }
    });
    
    let totalMatches = 0;
    const leaguesProcessed = [];
    
    for (const league of allLeagues) {
      // Get teams in this league
      const leagueTeams = await prisma.team.findMany({
        where: { division: league.division }
      });
      
      // Skip divisions with no teams
      if (leagueTeams.length === 0) {
        logInfo(`Skipping Division ${league.division} - no teams found`);
        continue;
      }
      
      let matches;
      if (league.division === 1 || league.division === 2) {
        // Divisions 1-2: CORRECTED - 112 matches over 14 days (8 per day)
        matches = await this.generatePremiumDivisionSchedule(league.id, leagueTeams, season);
      } else if (leagueTeams.length > 16) {
        // Large divisions: Create multiple subdivisions of 8 teams each
        matches = await this.generateLargeDivisionSchedule(league.id, leagueTeams, season);
      } else if (leagueTeams.length >= 8) {
        // Standard divisions: 8-16 teams
        matches = await this.generateStandardSubdivisionSchedule(league.id, leagueTeams, season);
      } else {
        // Small divisions: Less than 8 teams, generate round-robin
        matches = await this.generateSmallDivisionSchedule(league.id, leagueTeams, season);
      }
      
      totalMatches += matches.length;
      leaguesProcessed.push({
        leagueId: league.id,
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
    
    // CORRECTED: Generate 8 matches per day × 14 days = 112 total matches
    for (let day = 1; day <= this.SEASON_CONFIG.REGULAR_SEASON_DAYS; day++) {
      // Generate 8 matches for this day (not 2)
      const dayMatches = this.generateDayMatches(teams, day, 8);
      
      // Use generateDailyGameTimes for consecutive 15-minute intervals
      const { generateDailyGameTimes } = await import('../../shared/timezone');
      const dailyGameTimes = generateDailyGameTimes(day);
      
      for (let matchIndex = 0; matchIndex < dayMatches.length; matchIndex++) {
        const match = dayMatches[matchIndex];
        const gameDate = new Date("2025-07-13");
        gameDate.setDate(gameDate.getDate() + day - 1);
        
        // Use the appropriate time slot for this match
        const slotIndex = matchIndex % dailyGameTimes.length;
        const gameTime = dailyGameTimes[slotIndex];
        
        gameDate.setHours(gameTime.getHours(), gameTime.getMinutes(), 0, 0);
        
        const matchData = {
          leagueId,
          homeTeamId: match.homeTeam.id,
          awayTeamId: match.awayTeam.id,
          gameDate: gameDate,
          season,
          status: 'SCHEDULED',
          matchType: 'LEAGUE'
        };
        
        matches.push(matchData);
      }
    }
    
    // Insert matches into database
    if (matches.length > 0) {
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
    
    // CORRECTED: Ensure only ONE subdivision per division (Divisions 3-8)
    // 4 matches per day × 14 days = 56 total matches per division
    
    for (let day = 1; day <= this.SEASON_CONFIG.REGULAR_SEASON_DAYS; day++) {
      // Generate exactly 4 matches per day (56 total over 14 days)
      const dayMatches = this.generateSubdivisionDayMatches(teams, day, 1);
      
      // Use generateDailyGameTimes for consecutive 15-minute intervals
      const { generateDailyGameTimes } = await import('../../shared/timezone');
      const dailyGameTimes = generateDailyGameTimes(day);
      
      for (let matchIndex = 0; matchIndex < dayMatches.length; matchIndex++) {
        const match = dayMatches[matchIndex];
        const gameDate = new Date("2025-07-13");
        gameDate.setDate(gameDate.getDate() + day - 1);
        
        // Use the appropriate time slot for this match
        const slotIndex = matchIndex % dailyGameTimes.length;
        const gameTime = dailyGameTimes[slotIndex];
        
        gameDate.setHours(gameTime.getHours(), gameTime.getMinutes(), 0, 0);
        
        const matchData = {
          leagueId,
          homeTeamId: match.homeTeam.id,
          awayTeamId: match.awayTeam.id,
          gameDate: gameDate,
          status: 'SCHEDULED',
          matchType: 'LEAGUE'
        };
        
        matches.push(matchData);
      }
    }
    
    // Insert matches into database
    if (matches.length > 0) {
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
  static generateSubdivisionDayMatches(teams: any[], day: number, seasonStartDay: number = 1): any[] {
    const matches = [];
    const numTeams = teams.length;
    
    if (numTeams < 2) return matches;
    
    // For 8 teams, we need exactly 4 games per day
    // Use round-robin scheduling where each team plays every other team once
    
    if (numTeams === 8) {
      // Perfect 8-team subdivision - 4 games per day
      // Proper round-robin schedule: 7 rounds total (each team plays every other team exactly once)
      const roundRobinSchedule = [
        [[0, 1], [2, 3], [4, 5], [6, 7]],  // Round 1
        [[0, 2], [1, 4], [3, 6], [5, 7]],  // Round 2  
        [[0, 3], [1, 5], [2, 7], [4, 6]],  // Round 3
        [[0, 4], [1, 6], [2, 5], [3, 7]],  // Round 4
        [[0, 5], [1, 7], [2, 4], [3, 6]],  // Round 5
        [[0, 6], [1, 3], [2, 7], [4, 5]],  // Round 6
        [[0, 7], [1, 2], [3, 4], [5, 6]]   // Round 7 (final round)
      ];
      
      // Calculate which round this day represents based on the season start day
      // For full season (Days 1-14): day 1 = round 0, day 2 = round 1, etc.
      // For shortened season (Days 7-14): day 7 = round 0, day 8 = round 1, etc.
      // With 7 rounds total, teams complete their round-robin schedule in 7 days
      const roundIndex = (day - seasonStartDay) % roundRobinSchedule.length;
      
      // Only schedule matches if we haven't exceeded the round-robin schedule
      // After 7 rounds, all teams have played each other exactly once
      
      if (roundIndex >= 0 && roundIndex < roundRobinSchedule.length) {
        const dayPairs = roundRobinSchedule[roundIndex];
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
          const gameDate = new Date("2025-07-13"); // Season start date
          gameDate.setDate(gameDate.getDate() + day - 1);
          
          // Use generateDailyGameTimes for consecutive 15-minute intervals
          const { generateDailyGameTimes } = await import('../../shared/timezone');
          const dailyGameTimes = generateDailyGameTimes(day);
          
          // Use the appropriate time slot for this match (staggered every 15 minutes)
          const slotIndex = matchIndex % dailyGameTimes.length;
          const gameTime = dailyGameTimes[slotIndex];
          
          gameDate.setHours(gameTime.getHours(), gameTime.getMinutes(), 0, 0);
          
          const matchData = {
            leagueId,
            homeTeamId: match.homeTeam.id,
            awayTeamId: match.awayTeam.id,
            gameDate: gameDate,
            status: 'SCHEDULED',
            matchType: 'LEAGUE'
          };
          
          matches.push(matchData);
        }
      }
    }
    
    // Insert matches into database
    if (matches.length > 0) {
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
    const matches = await this.generateLargeDivisionSchedule(league.id, teams, season);
    
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
  ): Promise<any[]> {
    const matches = [];
    const numTeams = teams.length;
    
    if (numTeams < 2) {
      return matches; // Can't generate matches with less than 2 teams
    }
    
    // Generate matches for 14 days
    for (let day = 1; day <= this.SEASON_CONFIG.REGULAR_SEASON_DAYS; day++) {
      const dayMatches = this.generateSubdivisionDayMatches(teams, day, 1);
      
      // Use generateDailyGameTimes for consecutive 15-minute intervals
      const { generateDailyGameTimes } = await import('../../shared/timezone');
      const dailyGameTimes = generateDailyGameTimes(day);
      
      for (let matchIndex = 0; matchIndex < dayMatches.length; matchIndex++) {
        const match = dayMatches[matchIndex];
        const gameDate = new Date("2025-07-13");
        gameDate.setDate(gameDate.getDate() + day - 1);
        
        // Use the appropriate time slot for this match
        const slotIndex = matchIndex % dailyGameTimes.length;
        const gameTime = dailyGameTimes[slotIndex];
        
        gameDate.setHours(gameTime.getHours(), gameTime.getMinutes(), 0, 0);
        
        const matchData = {
          leagueId,
          homeTeamId: match.homeTeam.id,
          awayTeamId: match.awayTeam.id,
          gameDate: gameDate,
          status: 'SCHEDULED',
          matchType: 'LEAGUE'
        };
        
        matches.push(matchData);
      }
    }
    
    // Insert matches into database
    if (matches.length > 0) {
      await prisma.game.createMany({
        data: matches
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
    // Get match details
    const matchData = await prisma.game.findUnique({
      where: { id: matchId }
    });
    
    if (!matchData || matchData.status !== 'completed') {
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
        losses: homeScore < awayScore ? (homeTeam?.losses || 0) + 1 : homeTeam?.losses || 0,
        draws: homeScore === awayScore ? (homeTeam?.draws || 0) + 1 : homeTeam?.draws || 0
      }
    });
    
    // Update away team
    const awayTeamUpdate = await prisma.team.update({
      where: { id: matchData.awayTeamId },
      data: {
        points: (awayTeam?.points || 0) + awayPoints,
        wins: awayScore > homeScore ? (awayTeam?.wins || 0) + 1 : awayTeam?.wins || 0,
        losses: awayScore < homeScore ? (awayTeam?.losses || 0) + 1 : awayTeam?.losses || 0,
        draws: homeScore === awayScore ? (awayTeam?.draws || 0) + 1 : awayTeam?.draws || 0
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
    // Get league info
    const league = await prisma.league.findUnique({
      where: { id: leagueId }
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
    const league = await prisma.league.findUnique({
      where: { id: leagueId }
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
          season,
          status: 'completed'
        }
      });
      
      const awayMatches = await prisma.game.findMany({
        where: {
          awayTeamId: team.id,
          season,
          status: 'completed'
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
      
      team.goalsFor = goalsFor;
      team.goalsAgainst = goalsAgainst;
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
    return teams.sort((a, b) => {
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
    const allLeagues = await prisma.league.findMany({
      where: { seasonId: season }
    });
    
    const bracketsByLeague = [];
    let totalPlayoffMatches = 0;
    
    for (const league of allLeagues) {
      const standings = await this.getFinalStandings(league.id, season);
      const division = league.division;
      
      // Determine qualifier count based on division
      const qualifierCount = division === 1 
        ? this.SEASON_CONFIG.DIVISION_1_TOURNAMENT_QUALIFIERS 
        : this.SEASON_CONFIG.STANDARD_TOURNAMENT_QUALIFIERS;
      
      const playoffTeams = standings.finalStandings.slice(0, qualifierCount);
      
      if (playoffTeams.length >= qualifierCount) {
        let playoffMatches = [];
        
        if (division === 1) {
          // Division 1: 8-team single elimination tournament
          // Quarterfinals: 1v8, 2v7, 3v6, 4v5
          playoffMatches = [
            {
              leagueId: league.id,
              homeTeamId: playoffTeams[0].id, // Seed 1
              awayTeamId: playoffTeams[7].id, // Seed 8
              gameDay: this.SEASON_CONFIG.PLAYOFF_DAY,
              season,
              status: 'scheduled',
              matchType: 'playoff_quarterfinal'
            },
            {
              leagueId: league.id,
              homeTeamId: playoffTeams[1].id, // Seed 2
              awayTeamId: playoffTeams[6].id, // Seed 7
              gameDay: this.SEASON_CONFIG.PLAYOFF_DAY,
              season,
              status: 'scheduled',
              matchType: 'playoff_quarterfinal'
            },
            {
              leagueId: league.id,
              homeTeamId: playoffTeams[2].id, // Seed 3
              awayTeamId: playoffTeams[5].id, // Seed 6
              gameDay: this.SEASON_CONFIG.PLAYOFF_DAY,
              season,
              status: 'scheduled',
              matchType: 'playoff_quarterfinal'
            },
            {
              leagueId: league.id,
              homeTeamId: playoffTeams[3].id, // Seed 4
              awayTeamId: playoffTeams[4].id, // Seed 5
              gameDay: this.SEASON_CONFIG.PLAYOFF_DAY,
              season,
              status: 'scheduled',
              matchType: 'playoff_quarterfinal'
            }
          ];
        } else {
          // Divisions 2-8: 4-team single elimination tournament
          // Semifinals: 1v4, 2v3
          playoffMatches = [
            {
              leagueId: league.id,
              homeTeamId: playoffTeams[0].id, // Seed 1
              awayTeamId: playoffTeams[3].id, // Seed 4
              gameDay: this.SEASON_CONFIG.PLAYOFF_DAY,
              season,
              status: 'scheduled',
              matchType: 'playoff_semifinal'
            },
            {
              leagueId: league.id,
              homeTeamId: playoffTeams[1].id, // Seed 2
              awayTeamId: playoffTeams[2].id, // Seed 3
              gameDay: this.SEASON_CONFIG.PLAYOFF_DAY,
              season,
              status: 'scheduled',
              matchType: 'playoff_semifinal'
            }
          ];
        }
        
        // Insert playoff matches
        await prisma.game.createMany({
          data: playoffMatches
        });
        
        bracketsByLeague.push({
          leagueId: league.id,
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
    const promotions = [];
    const relegations = [];
    
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
   * Step 3b: Division 3 Promotion - Promotion Pool System
   */
  static async processDivision3Promotion(season: number, promotions: any[]): Promise<void> {
    // Create promotion pool from all Division 3 subdivisions
    const promotionPool = await this.createPromotionPool(3, season);
    
    // Promote top 12 teams from the pool
    const teamsToPromote = promotionPool.slice(0, 12);
    
    for (const team of teamsToPromote) {
      await prisma.team.update({
        where: { id: team.id },
        data: { division: 2 }
      });
      
      promotions.push({
        teamId: team.id,
        fromDivision: 3,
        toDivision: 2
      });
    }
  }

  /**
   * Step 4: Standardized Cascade for Divisions 3-8
   */
  static async processStandardizedCascade(season: number, promotions: any[], relegations: any[]): Promise<void> {
    // Process divisions 3-8 (Division 8 has promotions but no relegations)
    for (let division = 3; division <= this.SEASON_CONFIG.MAX_DIVISION; division++) {
      // Relegation: Bottom 4 teams from each subdivision (except Division 8)
      let totalRelegated = 0;
      
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
            
            totalRelegated++;
          }
        }
      }
      
      // Promotion: Top teams from promotion pool of division below
      if (division < this.SEASON_CONFIG.MAX_DIVISION) {
        const promotionPool = await this.createPromotionPool(division + 1, season);
        const teamsToPromote = promotionPool.slice(0, totalRelegated);
        
        for (const team of teamsToPromote) {
          await prisma.team.update({
            where: { id: team.id },
            data: { division: division }
          });
          
          promotions.push({
            teamId: team.id,
            fromDivision: division + 1,
            toDivision: division
          });
        }
      }
    }
    
    // Special case: Division 8 promotions to Division 7
    // Since Division 8 has no relegations, we need to handle its promotions separately
    const division8PromotionPool = await this.createPromotionPool(this.SEASON_CONFIG.MAX_DIVISION, season);
    
    // Promote top 2 teams from each Division 8 subdivision
    // Calculate how many spots are available in Division 7 based on relegations
    const division7Subdivisions = await prisma.team.groupBy({
      by: ['subdivision'],
      where: { division: 7 },
      _count: { id: true }
    });
    
    // Each Division 7 subdivision relegated 4 teams, so we have space for promotions
    const availablePromotionSpots = division7Subdivisions.length * this.SEASON_CONFIG.STANDARD_RELEGATION_PER_SUBDIVISION;
    const teamsToPromoteFromDiv8 = division8PromotionPool.slice(0, availablePromotionSpots);
    
    for (const team of teamsToPromoteFromDiv8) {
      await prisma.team.update({
        where: { id: team.id },
        data: { division: 7 }
      });
      
      promotions.push({
        teamId: team.id,
        fromDivision: 8,
        toDivision: 7
      });
    }
  }

  /**
   * Create promotion pool for a division
   * Returns top teams ranked by win percentage with point differential as tiebreaker
   */
  static async createPromotionPool(division: number, season: number): Promise<any[]> {
    const subdivisions = await prisma.team.groupBy({
      by: ['subdivision'],
      where: { division },
      _count: { id: true }
    });
    
    const promotionPool = [];
    
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
      
      // Add season champion (#1) and tournament winner (#2) to pool
      // For now, add top 2 teams (can be enhanced with tournament logic)
      const poolEntries = subdivisionTeams.slice(0, 2);
      promotionPool.push(...poolEntries);
    }
    
    // Sort promotion pool by win percentage and point differential
    return promotionPool.sort((a, b) => {
      const aWinPct = (a.wins || 0) / Math.max(1, (a.wins || 0) + (a.losses || 0) + (a.draws || 0));
      const bWinPct = (b.wins || 0) / Math.max(1, (b.wins || 0) + (b.losses || 0) + (b.draws || 0));
      
      if (bWinPct !== aWinPct) {
        return bWinPct - aWinPct;
      }
      
      // Tiebreaker: Point differential
      const aPointDiff = (a.points || 0) - (a.losses || 0);
      const bPointDiff = (b.points || 0) - (b.losses || 0);
      return bPointDiff - aPointDiff;
    });
  }

  /**
   * Get playoff champions from completed championship matches
   */
  static async getPlayoffChampions(season: number): Promise<Array<{
    teamId: string;
    division: number;
    leagueId: string;
  }>> {
    // Get all championship matches (would need to be created after semifinals)
    const championshipMatches = await prisma.game.findMany({
      where: {
        season,
        matchType: 'playoff_championship',
        status: 'completed'
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
          teamId: winnerId,
          division: team.division || this.SEASON_CONFIG.MAX_DIVISION,
          leagueId: match.leagueId || ''
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
          season: season + 1 // Next season
        }
      });
      
      // Create additional leagues if needed
      const leaguesToCreate = requiredLeagues - existingLeagues.length;
      for (let i = 0; i < leaguesToCreate; i++) {
        await prisma.league.create({
          data: {
            name: `Division ${division} League ${existingLeagues.length + i + 1}`,
            division,
            season: season + 1,
            maxTeams: requiredTeamsPerLeague,
            status: 'active'
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
   * Execute complete season rollover
   */
  static async executeSeasonRollover(currentSeason: number): Promise<{
    newSeason: number;
    scheduleGenerated: boolean;
    promotionRelegationCompleted: boolean;
    leaguesRebalanced: boolean;
    awardsDistributed: boolean;
    prizesDistributed: boolean;
    aiTeamsRemoved: boolean;
    summary: {
      totalMatches: number;
      totalPromotions: number;
      totalRelegations: number;
      leaguesCreated: number;
      totalAwards: number;
      totalPrizeMoney: number;
      totalAITeamsDeleted: number;
      totalAIPlayersDeleted: number;
    };
  }> {
    const newSeason = currentSeason + 1;
    
    // 1. Calculate and distribute end-of-season awards
    const awardsResult = await this.distributeEndOfSeasonAwards(currentSeason);
    
    // 2. Distribute prize money based on final standings
    const prizesResult = await this.distributePrizeMoney(currentSeason);
    
    // 3. Clean up AI teams before promotion/relegation
    const aiCleanupResult = await this.cleanupAITeams();
    
    // 4. Process final promotion/relegation (now with AI teams removed)
    const promotionResult = await this.processPromotionRelegation(currentSeason);
    
    // 5. Rebalance leagues for new season
    const rebalanceResult = await this.rebalanceLeagues(currentSeason);
    
    // 6. Reset team statistics for new season
    await prisma.team.updateMany({
      data: {
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0
      }
    });
    
    // 7. Generate schedule for new season
    const scheduleResult = await this.generateSeasonSchedule(newSeason);
    
    return {
      newSeason,
      scheduleGenerated: scheduleResult.matchesGenerated > 0,
      promotionRelegationCompleted: true,
      leaguesRebalanced: rebalanceResult.leaguesRebalanced > 0,
      awardsDistributed: awardsResult.awardsDistributed,
      prizesDistributed: prizesResult.prizesDistributed,
      aiTeamsRemoved: aiCleanupResult.aiTeamsRemoved,
      summary: {
        totalMatches: scheduleResult.matchesGenerated,
        totalPromotions: promotionResult.promotions.length,
        totalRelegations: promotionResult.relegations.length,
        leaguesCreated: rebalanceResult.newLeaguesCreated,
        totalAwards: awardsResult.totalAwards,
        totalPrizeMoney: prizesResult.totalPrizeMoney,
        totalAITeamsDeleted: aiCleanupResult.totalAITeamsDeleted,
        totalAIPlayersDeleted: aiCleanupResult.totalAIPlayersDeleted
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
    try {
      const distributions = [];
      let totalPrizeMoney = 0;

      // Prize pools by division (credits)
      const divisionPrizePools = {
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

          if (prizeAmount > 0 && team.finances) {
            // Award prize money
            const currentCredits = parseInt(team.finances.credits);
            await prisma.teamFinances.update({
              where: { teamId: team.id },
              data: {
                credits: (currentCredits + prizeAmount).toString()
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
            subdivision: 'system'
          }
        });
        
        // Create placeholder finances and stadium
        await prisma.teamFinances.create({
          data: {
            teamId: placeholderTeam.id,
            credits: '0',
            gems: '0'
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
                in: team.players.map(p => p.id) 
              } 
            }
          });
          
          // Delete player skill links
          await prisma.playerSkillLink.deleteMany({
            where: { 
              playerId: { 
                in: team.players.map(p => p.id) 
              } 
            }
          });
          
          // Delete all players
          const deletedPlayers = await prisma.player.deleteMany({
            where: { teamId: team.id }
          });
          
          totalAIPlayersDeleted += deletedPlayers.count;
          
          // Delete team finances
          if (team.finances) {
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