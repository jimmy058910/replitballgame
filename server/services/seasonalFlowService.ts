import { prisma } from '../db';
import { logInfo } from './errorService';

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
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return (daysSinceStart % 17) + 1;
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
      if (league.division === 1) {
        // Division 1: 16 teams, 28 games over 14 days (2 per day)
        matches = await this.generateDivision1Schedule(league.id, leagueTeams, season);
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
   * Generate Division 1 schedule (16 teams, 2 games per day)
   */
  static async generateDivision1Schedule(
    leagueId: string, 
    teams: any[], 
    season: number
  ): Promise<any[]> {
    const matches = [];
    const numTeams = teams.length;
    
    // Generate round-robin schedule with 2 games per day
    for (let day = 1; day <= this.SEASON_CONFIG.REGULAR_SEASON_DAYS; day++) {
      // Generate 2 matches for this day
      const dayMatches = this.generateDayMatches(teams, day, 2);
      
      for (const match of dayMatches) {
        const matchData = {
          leagueId,
          homeTeamId: match.homeTeam.id,
          awayTeamId: match.awayTeam.id,
          gameDay: day,
          season,
          status: 'scheduled',
          matchType: 'league'
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
   * Generate standard subdivision schedule (16 teams, modified round-robin for 14 days)
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
    
    // Modified round-robin: 16 teams, 14 days of matches
    // Each team plays 14 games over 14 days (not full round-robin)
    
    for (let day = 1; day <= this.SEASON_CONFIG.REGULAR_SEASON_DAYS; day++) {
      // Generate matches per day based on team count
      const dayMatches = this.generateSubdivisionDayMatches(teams, day);
      
      for (const match of dayMatches) {
        const gameDate = new Date("2025-07-13");
        gameDate.setDate(gameDate.getDate() + day - 1);
        
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
   * Generate matches for a subdivision day (any number of teams)
   */
  static generateSubdivisionDayMatches(teams: any[], day: number): any[] {
    const matches = [];
    const numTeams = teams.length;
    
    // Use a systematic pairing approach based on the day
    for (let i = 0; i < Math.floor(numTeams / 2); i++) {
      const team1Index = i;
      const team2Index = (i + day + 7) % numTeams;
      
      // Ensure we don't pair a team with itself
      const finalTeam2Index = team2Index === team1Index ? (team2Index + 1) % numTeams : team2Index;
      
      const homeTeam = teams[team1Index];
      const awayTeam = teams[finalTeam2Index];
      
      matches.push({
        homeTeam,
        awayTeam
      });
    }
    
    return matches;
  }

  /**
   * Generate large division schedule (35+ teams, multiple subdivisions)
   */
  static async generateLargeDivisionSchedule(
    leagueId: string, 
    teams: any[], 
    season: number
  ): Promise<any[]> {
    const matches = [];
    const numTeams = teams.length;
    
    // Create subdivisions of 8 teams each
    const subdivisions = [];
    for (let i = 0; i < numTeams; i += 8) {
      subdivisions.push(teams.slice(i, i + 8));
    }
    
    // Generate schedule for each subdivision
    for (let subIndex = 0; subIndex < subdivisions.length; subIndex++) {
      const subdivision = subdivisions[subIndex];
      
      // Generate matches for this subdivision
      for (let day = 1; day <= this.SEASON_CONFIG.REGULAR_SEASON_DAYS; day++) {
        const dayMatches = this.generateSubdivisionDayMatches(subdivision, day);
        
        for (const match of dayMatches) {
          const gameDate = new Date("2025-07-13");
          gameDate.setDate(gameDate.getDate() + day - 1);
          
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
      const dayMatches = this.generateSubdivisionDayMatches(teams, day);
      
      for (const match of dayMatches) {
        const gameDate = new Date("2025-07-13");
        gameDate.setDate(gameDate.getDate() + day - 1);
        
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
    // Process divisions 3-7 (Division 8 has no relegation)
    for (let division = 3; division < this.SEASON_CONFIG.MAX_DIVISION; division++) {
      // Relegation: Bottom 4 teams from each subdivision
      const subdivisions = await prisma.team.groupBy({
        by: ['subdivision'],
        where: { division },
        _count: { id: true }
      });
      
      let totalRelegated = 0;
      
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
    summary: {
      totalMatches: number;
      totalPromotions: number;
      totalRelegations: number;
      leaguesCreated: number;
    };
  }> {
    const newSeason = currentSeason + 1;
    
    // 1. Process final promotion/relegation
    const promotionResult = await this.processPromotionRelegation(currentSeason);
    
    // 2. Rebalance leagues for new season
    const rebalanceResult = await this.rebalanceLeagues(currentSeason);
    
    // 3. Reset team statistics for new season
    await prisma.team.updateMany({
      data: {
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0
      }
    });
    
    // 4. Generate schedule for new season
    const scheduleResult = await this.generateSeasonSchedule(newSeason);
    
    return {
      newSeason,
      scheduleGenerated: scheduleResult.matchesGenerated > 0,
      promotionRelegationCompleted: true,
      leaguesRebalanced: rebalanceResult.leaguesRebalanced > 0,
      summary: {
        totalMatches: scheduleResult.matchesGenerated,
        totalPromotions: promotionResult.promotions.length,
        totalRelegations: promotionResult.relegations.length,
        leaguesCreated: rebalanceResult.newLeaguesCreated
      }
    };
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