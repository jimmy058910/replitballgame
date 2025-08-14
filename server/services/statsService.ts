import { getPrismaClient } from "../database.js";

// Only track stats from meaningful match types (exclude exhibitions)
const MEANINGFUL_MATCH_TYPES = ['LEAGUE', 'PLAYOFF'] as const;

export interface PlayerOffensiveStats {
  scores: number;
  passingAttempts: number;
  passesCompleted: number;
  passingPercentage: number;
  passingYards: number;
  rushingYards: number;
  catches: number;
  receivingYards: number;
  dropsFumbles: number;
}

export interface PlayerDefensiveStats {
  tackles: number;
  knockdownsInflicted: number;
  interceptions: number;
  passesDefended: number;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  position: string;
  gamesPlayed: number;
  offensive: PlayerOffensiveStats;
  defensive: PlayerDefensiveStats;
  averages?: {
    scoresPerGame: number;
    passingYardsPerGame: number;
    rushingYardsPerGame: number;
    tacklesPerGame: number;
  };
}

export interface TeamStats {
  teamId: string;
  teamName: string;
  gamesPlayed: number;
  totalScore: number;
  totalOffensiveYards: number;
  passingYards: number;
  rushingYards: number;
  timeOfPossession: number; // in seconds
  turnovers: number;
  totalKnockdowns: number;
  averages?: {
    scorePerGame: number;
    yardsPerGame: number;
    turnoverDifferential: number;
  };
}

export interface MatchStatsDisplay {
  matchId: string;
  homeTeam: TeamStats;
  awayTeam: TeamStats;
  topPerformers: {
    mostScores: PlayerStats;
    mostYards: PlayerStats;
    mostTackles: PlayerStats;
    mostKnockdowns: PlayerStats;
  };
}

export class StatsService {
  /**
   * Get comprehensive player stats for a specific player
   * Only includes stats from League matches and Division Tournament matches (PLAYOFF)
   * Completely excludes exhibition match stats
   */
  static async getPlayerStats(playerId: string, seasonOnly = false): Promise<PlayerStats> {
    try {
      // Get player info
      const player = await prisma.player.findUnique({
        where: { id: parseInt(playerId) }
      });

      if (!player) {
        throw new Error('Player not found');
      }

      // Get meaningful games (League + Division Tournament only, no exhibitions)
      const meaningfulGames = await prisma.game.findMany({
        where: {
          matchType: {
            in: ['LEAGUE', 'PLAYOFF']
          },
          status: 'COMPLETED',
          OR: [
            { homeTeamId: player.teamId },
            { awayTeamId: player.teamId }
          ]
        },
        orderBy: {
          gameDate: 'desc'
        }
      });

      // Use season-level stats from Player model for aggregated data
      // These fields track meaningful minutes (league + tournament, not exhibition)
      const seasonLeagueMinutes = player.seasonMinutesLeague || 0;
      const seasonTournamentMinutes = player.seasonMinutesTournament || 0;
      const totalMeaningfulMinutes = seasonLeagueMinutes + seasonTournamentMinutes;
      
      // Calculate games played based on meaningful matches only
      const gamesPlayed = meaningfulGames.length;

      // For now, provide basic stat structure based on available Player model data
      // TODO: When match-level stats are implemented, extract from simulationLog
      const result: PlayerStats = {
        playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.role,
        gamesPlayed: gamesPlayed,
        offensive: {
          scores: 0, // TODO: Extract from simulationLog when available
          passingAttempts: 0,
          passesCompleted: 0,
          passingPercentage: 0,
          passingYards: 0,
          rushingYards: 0,
          catches: 0,
          receivingYards: 0,
          dropsFumbles: 0
        },
        defensive: {
          tackles: 0,
          knockdownsInflicted: 0,
          interceptions: 0,
          passesDefended: 0
        }
      };

      // Calculate averages if games played > 0
      if (result.gamesPlayed > 0) {
        result.averages = {
          scoresPerGame: Math.round((result.offensive.scores / result.gamesPlayed) * 10) / 10,
          passingYardsPerGame: Math.round((result.offensive.passingYards / result.gamesPlayed) * 10) / 10,
          rushingYardsPerGame: Math.round((result.offensive.rushingYards / result.gamesPlayed) * 10) / 10,
          tacklesPerGame: Math.round((result.defensive.tackles / result.gamesPlayed) * 10) / 10
        };
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to retrieve player stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get comprehensive team stats
   * Only includes stats from League matches and Division Tournament matches (PLAYOFF)
   * Completely excludes exhibition match stats
   */
  static async getTeamStats(teamId: string, seasonOnly = false): Promise<TeamStats> {
    try {
      // Get team info
      const team = await prisma.team.findUnique({
        where: { id: parseInt(teamId) }
      });

      if (!team) {
        throw new Error('Team not found');
      }

      // Get meaningful games (League + Division Tournament only, no exhibitions)
      const meaningfulGames = await prisma.game.findMany({
        where: {
          matchType: {
            in: ['LEAGUE', 'PLAYOFF']
          },
          status: 'COMPLETED',
          OR: [
            { homeTeamId: parseInt(teamId) },
            { awayTeamId: parseInt(teamId) }
          ]
        },
        orderBy: {
          gameDate: 'desc'
        }
      });

      // Calculate team score from meaningful games
      let totalScore = 0;
      meaningfulGames.forEach((game: any) => {
        if (game.homeTeamId === parseInt(teamId)) {
          totalScore += game.homeScore || 0;
        } else {
          totalScore += game.awayScore || 0;
        }
      });

      const result: TeamStats = {
        teamId,
        teamName: team.name,
        gamesPlayed: meaningfulGames.length,
        totalScore: totalScore,
        totalOffensiveYards: 0, // TODO: Extract from simulationLog when available
        passingYards: 0,
        rushingYards: 0,
        timeOfPossession: 0,
        turnovers: 0,
        totalKnockdowns: 0
      };

      // Calculate averages
      if (result.gamesPlayed > 0) {
        result.averages = {
          scorePerGame: Math.round((result.totalScore / result.gamesPlayed) * 10) / 10,
          yardsPerGame: Math.round((result.totalOffensiveYards / result.gamesPlayed) * 10) / 10,
          turnoverDifferential: Math.round((result.turnovers / result.gamesPlayed) * 10) / 10
        };
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to retrieve team stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get match-specific stats display for live viewing
   * Only processes meaningful matches (League and Division Tournament)
   */
  static async getMatchStatsDisplay(matchId: string): Promise<MatchStatsDisplay> {
    try {
      // Get match info
      const matchData = await prisma.game.findUnique({
        where: { id: parseInt(matchId) },
        include: {
          homeTeam: true,
          awayTeam: true
        }
      });

      if (!matchData) {
        throw new Error('Match not found');
      }

      // Only process meaningful match types (exclude exhibitions)
      if (!MEANINGFUL_MATCH_TYPES.includes(matchData.matchType as any)) {
        throw new Error('Cannot display stats for exhibition matches - only League and Division Tournament matches are tracked');
      }

      // Get team stats for this match
      const homeTeamStats = await this.getTeamMatchStats(matchId, matchData.homeTeamId.toString());
      const awayTeamStats = await this.getTeamMatchStats(matchId, matchData.awayTeamId.toString());

      // Get top performers for this match (using placeholder data until simulationLog parsing is implemented)
      const topPerformers = await this.getMatchTopPerformers(matchId);

      return {
        matchId,
        homeTeam: homeTeamStats,
        awayTeam: awayTeamStats,
        topPerformers
      };
    } catch (error) {
      throw new Error(`Failed to retrieve match stats display: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get team stats for a specific match
   */
  private static async getTeamMatchStats(matchId: string, teamIdStr: string): Promise<TeamStats> {
    try {
      const teamId = parseInt(teamIdStr);
      
      // Get match data
      const matchData = await prisma.game.findUnique({
        where: { id: parseInt(matchId) },
        include: {
          homeTeam: true,
          awayTeam: true
        }
      });

      if (!matchData) {
        throw new Error('Match not found');
      }

      // Get team name
      const team = teamId === matchData.homeTeamId ? matchData.homeTeam : matchData.awayTeam;
      const teamScore = teamId === matchData.homeTeamId ? matchData.homeScore : matchData.awayScore;
      
      return {
        teamId: teamIdStr,
        teamName: team?.name || `Team ${teamId}`,
        gamesPlayed: 1,
        totalScore: teamScore || 0,
        totalOffensiveYards: 0, // TODO: Extract from simulationLog when available
        passingYards: 0,
        rushingYards: 0,
        timeOfPossession: 0,
        turnovers: 0,
        totalKnockdowns: 0
      };
    } catch (error) {
      throw new Error(`Failed to get team match stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get top performers for a specific match
   * Returns placeholder data until simulationLog parsing is implemented
   */
  private static async getMatchTopPerformers(matchId: string): Promise<MatchStatsDisplay['topPerformers']> {
    // TODO: Parse simulationLog to extract actual player performance data
    // For now, return placeholder structure
    const placeholderPlayerStats: PlayerStats = {
      playerId: '0',
      playerName: 'Stats Coming Soon',
      position: 'N/A',
      gamesPlayed: 1,
      offensive: {
        scores: 0,
        passingAttempts: 0,
        passesCompleted: 0,
        passingPercentage: 0,
        passingYards: 0,
        rushingYards: 0,
        catches: 0,
        receivingYards: 0,
        dropsFumbles: 0
      },
      defensive: {
        tackles: 0,
        knockdownsInflicted: 0,
        interceptions: 0,
        passesDefended: 0
      }
    };

    return {
      mostScores: placeholderPlayerStats,
      mostYards: placeholderPlayerStats,
      mostTackles: placeholderPlayerStats,
      mostKnockdowns: placeholderPlayerStats
    };
  }

  /**
   * Get team leaderboards for various stats
   */
  static async getTeamLeaderboards(): Promise<{
    scoring: TeamStats[];
    offense: TeamStats[];
    defense: TeamStats[];
  }> {
    // Implementation for team leaderboards
    return {
      scoring: [],
      offense: [],
      defense: []
    };
  }

  /**
   * Get player leaderboards for various stats
   */
  static async getPlayerLeaderboards(): Promise<{
    scoring: PlayerStats[];
    passing: PlayerStats[];
    rushing: PlayerStats[];
    defense: PlayerStats[];
  }> {
    // Implementation for player leaderboards
    return {
      scoring: [],
      passing: [],
      rushing: [],
      defense: []
    };
  }
}