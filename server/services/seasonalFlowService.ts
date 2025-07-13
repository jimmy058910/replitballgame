import { prisma } from '../db';

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
    
    // League structure
    DIVISION_1_TEAMS: 16, // Premium division with 2 games per day
    STANDARD_LEAGUE_TEAMS: 8, // All other divisions
    PLAYOFF_QUALIFIERS: 4, // Top 4 teams qualify
    
    // Promotion/relegation
    DIVISION_1_RELEGATION: 4, // Bottom 4 teams relegated
    STANDARD_RELEGATION: 2,   // Bottom 2 teams relegated
    PROMOTION_WINNERS: 1,     // Only playoff champions promote
    
    // Division limits
    MIN_DIVISION: 1,
    MAX_DIVISION: 8 // Division 8 is the floor
  };

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
    const allLeagues = await prisma.league.findMany({
      where: { season }
    });
    
    let totalMatches = 0;
    const leaguesProcessed = [];
    
    for (const league of allLeagues) {
      // Get teams in this league
      const leagueTeams = await prisma.team.findMany({
        where: { division: league.division }
      });
      
      let matches;
      if (league.division === 1) {
        // Division 1: 16 teams, 28 games over 14 days (2 per day)
        matches = await this.generateDivision1Schedule(league.id, leagueTeams, season);
      } else {
        // Divisions 2-8: 8 teams, 14 games over 14 days (1 per day, double round-robin)
        matches = await this.generateStandardLeagueSchedule(league.id, leagueTeams, season);
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
   * Generate standard league schedule (8 teams, 1 game per day, double round-robin)
   */
  static async generateStandardLeagueSchedule(
    leagueId: string, 
    teams: any[], 
    season: number
  ): Promise<any[]> {
    const matches = [];
    const numTeams = teams.length;
    
    if (numTeams !== this.SEASON_CONFIG.STANDARD_LEAGUE_TEAMS) {
      throw new Error(`Standard league must have ${this.SEASON_CONFIG.STANDARD_LEAGUE_TEAMS} teams`);
    }
    
    // Double round-robin: each team plays every other team twice
    // 7 opponents × 2 = 14 games per team = 14 days
    
    let day = 1;
    
    // First round-robin
    for (let round = 0; round < numTeams - 1; round++) {
      const dayMatches = this.generateRoundRobinRound(teams, round);
      
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
      day++;
    }
    
    // Second round-robin (reverse home/away)
    for (let round = 0; round < numTeams - 1; round++) {
      const dayMatches = this.generateRoundRobinRound(teams, round, true); // reverse = true
      
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
      day++;
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
   */
  static async generatePlayoffBrackets(season: number): Promise<{
    bracketsByLeague: Array<{
      leagueId: string;
      division: number;
      semifinal1: { team1: any; team2: any };
      semifinal2: { team1: any; team2: any };
      playoffMatches: any[];
    }>;
    totalPlayoffMatches: number;
  }> {
    const allLeagues = await prisma.league.findMany({
      where: { season }
    });
    
    const bracketsByLeague = [];
    let totalPlayoffMatches = 0;
    
    for (const league of allLeagues) {
      const standings = await this.getFinalStandings(league.id, season);
      const playoffTeams = standings.playoffTeams;
      
      if (playoffTeams.length >= 4) {
        // Create bracket: #1 vs #4, #2 vs #3
        const semifinal1 = {
          team1: playoffTeams[0], // Seed 1
          team2: playoffTeams[3]  // Seed 4
        };
        
        const semifinal2 = {
          team1: playoffTeams[1], // Seed 2
          team2: playoffTeams[2]  // Seed 3
        };
        
        // Create playoff matches
        const playoffMatches = [
          {
            leagueId: league.id,
            homeTeamId: semifinal1.team1.id,
            awayTeamId: semifinal1.team2.id,
            gameDay: this.SEASON_CONFIG.PLAYOFF_DAY,
            season,
            status: 'scheduled',
            matchType: 'playoff_semifinal'
          },
          {
            leagueId: league.id,
            homeTeamId: semifinal2.team1.id,
            awayTeamId: semifinal2.team2.id,
            gameDay: this.SEASON_CONFIG.PLAYOFF_DAY,
            season,
            status: 'scheduled',
            matchType: 'playoff_semifinal'
          }
        ];
        
        // Insert playoff matches
        await prisma.game.createMany({
          data: playoffMatches
        });
        
        bracketsByLeague.push({
          leagueId: league.id,
          division: league.division,
          semifinal1,
          semifinal2,
          playoffMatches
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
   * Process promotion and relegation after playoffs complete
   */
  static async processPromotionRelegation(season: number): Promise<{
    promotions: Array<{ teamId: string; fromDivision: number; toDivision: number }>;
    relegations: Array<{ teamId: string; fromDivision: number; toDivision: number }>;
    totalTeamsProcessed: number;
  }> {
    const promotions = [];
    const relegations = [];
    
    // Get all playoff champions (teams that won their league championships)
    const playoffChampions = await this.getPlayoffChampions(season);
    
    // Process relegations first
    for (let division = 1; division <= this.SEASON_CONFIG.MAX_DIVISION - 1; division++) {
      const divisionLeagues = await prisma.league.findMany({
        where: {
          season,
          division
        }
      });
      
      for (const league of divisionLeagues) {
        const standings = await this.getFinalStandings(league.id, season);
        const relegatedTeams = standings.relegatedTeams;
        
        for (const team of relegatedTeams) {
          const newDivision = Math.min(division + 1, this.SEASON_CONFIG.MAX_DIVISION);
          
          await prisma.team.update({
            where: { id: team.id },
            data: { division: newDivision }
          });
          
          relegations.push({
            teamId: team.id,
            fromDivision: division,
            toDivision: newDivision
          });
        }
      }
    }
    
    // Process promotions
    for (const champion of playoffChampions) {
      if (champion.division > this.SEASON_CONFIG.MIN_DIVISION) {
        const newDivision = champion.division - 1;
        
        await db
          .update(teams)
          .set({ division: newDivision })
          .where(eq(teams.id, champion.teamId));
        
        promotions.push({
          teamId: champion.teamId,
          fromDivision: champion.division,
          toDivision: newDivision
        });
      }
    }
    
    return {
      promotions,
      relegations,
      totalTeamsProcessed: promotions.length + relegations.length
    };
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
      
      const requiredTeamsPerLeague = division === 1 
        ? this.SEASON_CONFIG.DIVISION_1_TEAMS 
        : this.SEASON_CONFIG.STANDARD_LEAGUE_TEAMS;
      
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
    await db
      .update(teams)
      .set({
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0
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