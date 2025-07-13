import { prisma } from '../db';
import { ErrorCreators } from './errorService';

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
   */
  static async getPlayerStats(playerId: string, seasonOnly = false): Promise<PlayerStats> {
    try {
      // Get player info
      const player = await prisma.player.findUnique({
        where: { id: parseInt(playerId) }
      });

      if (!player) {
        throw ErrorCreators.notFound('Player not found');
      }

      // Get aggregated stats
      const stats = await prisma.playerMatchStats.findMany({
        where: { playerId: parseInt(playerId) }
      });

      // Calculate aggregated values manually
      const playerData = stats.reduce((acc, stat) => ({
        gamesPlayed: acc.gamesPlayed + 1,
        totalScores: acc.totalScores + (stat.scores || 0),
        totalPassingAttempts: acc.totalPassingAttempts + (stat.passingAttempts || 0),
        totalPassesCompleted: acc.totalPassesCompleted + (stat.passesCompleted || 0),
        totalPassingYards: acc.totalPassingYards + (stat.passingYards || 0),
        totalRushingYards: acc.totalRushingYards + (stat.carrierYards || 0),
        totalCatches: acc.totalCatches + (stat.catches || 0),
        totalReceivingYards: acc.totalReceivingYards + (stat.receivingYards || 0),
        totalDrops: acc.totalDrops + (stat.drops || 0),
        totalFumblesLost: acc.totalFumblesLost + (stat.fumblesLost || 0),
        totalTackles: acc.totalTackles + (stat.tackles || 0),
        totalKnockdowns: acc.totalKnockdowns + (stat.knockdownsInflicted || 0),
        totalInterceptions: acc.totalInterceptions + (stat.interceptionsCaught || 0),
        totalPassesDefended: acc.totalPassesDefended + (stat.passesDefended || 0)
      }), {
        gamesPlayed: 0,
        totalScores: 0,
        totalPassingAttempts: 0,
        totalPassesCompleted: 0,
        totalPassingYards: 0,
        totalRushingYards: 0,
        totalCatches: 0,
        totalReceivingYards: 0,
        totalDrops: 0,
        totalFumblesLost: 0,
        totalTackles: 0,
        totalKnockdowns: 0,
        totalInterceptions: 0,
        totalPassesDefended: 0
      });

      const passingPercentage = playerData.totalPassingAttempts > 0 
        ? (playerData.totalPassesCompleted / playerData.totalPassingAttempts) * 100 
        : 0;

      const result: PlayerStats = {
        playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.role,
        gamesPlayed: playerData.gamesPlayed || 0,
        offensive: {
          scores: playerData.totalScores || 0,
          passingAttempts: playerData.totalPassingAttempts || 0,
          passesCompleted: playerData.totalPassesCompleted || 0,
          passingPercentage: Math.round(passingPercentage * 10) / 10,
          passingYards: playerData.totalPassingYards || 0,
          rushingYards: playerData.totalRushingYards || 0,
          catches: playerData.totalCatches || 0,
          receivingYards: playerData.totalReceivingYards || 0,
          dropsFumbles: (playerData.totalDrops || 0) + (playerData.totalFumblesLost || 0)
        },
        defensive: {
          tackles: playerData.totalTackles || 0,
          knockdownsInflicted: playerData.totalKnockdowns || 0,
          interceptions: playerData.totalInterceptions || 0,
          passesDefended: playerData.totalPassesDefended || 0
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
      throw ErrorCreators.internal('Failed to retrieve player stats', { playerId, error });
    }
  }

  /**
   * Get comprehensive team stats
   */
  static async getTeamStats(teamId: string, seasonOnly = false): Promise<TeamStats> {
    try {
      // Get team info
      const team = await prisma.team.findUnique({
        where: { id: parseInt(teamId) }
      });

      // Get aggregated team stats
      const stats = await prisma.teamMatchStats.findMany({
        where: { teamId: parseInt(teamId) }
      });

      // Calculate aggregated values manually
      const teamData = stats.reduce((acc, stat) => ({
        gamesPlayed: acc.gamesPlayed + 1,
        totalOffensiveYards: acc.totalOffensiveYards + (stat.totalOffensiveYards || 0),
        totalPassingYards: acc.totalPassingYards + (stat.passingYards || 0),
        totalRushingYards: acc.totalRushingYards + (stat.carrierYards || 0),
        totalTimeOfPossession: acc.totalTimeOfPossession + (stat.timeOfPossessionSeconds || 0),
        totalTurnovers: acc.totalTurnovers + (stat.turnovers || 0),
        totalKnockdowns: acc.totalKnockdowns + (stat.totalKnockdownsInflicted || 0)
      }), {
        gamesPlayed: 0,
        totalOffensiveYards: 0,
        totalPassingYards: 0,
        totalRushingYards: 0,
        totalTimeOfPossession: 0,
        totalTurnovers: 0,
        totalKnockdowns: 0
      });

      const result: TeamStats = {
        teamId,
        teamName: team?.name || `Team ${teamId}`,
        gamesPlayed: teamData.gamesPlayed || 0,
        totalScore: 0, // Team score needs to be calculated from player stats
        totalOffensiveYards: teamData.totalOffensiveYards || 0,
        passingYards: teamData.totalPassingYards || 0,
        rushingYards: teamData.totalRushingYards || 0,
        timeOfPossession: teamData.totalTimeOfPossession || 0,
        turnovers: teamData.totalTurnovers || 0,
        totalKnockdowns: teamData.totalKnockdowns || 0
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
      throw ErrorCreators.internal('Failed to retrieve team stats', { teamId, error });
    }
  }

  /**
   * Get match-specific stats display for live viewing
   */
  static async getMatchStatsDisplay(matchId: string): Promise<MatchStatsDisplay> {
    try {
      // Get match info
      const matchData = await prisma.game.findUnique({
        where: { id: matchId }
      });

      if (!matchData) {
        throw ErrorCreators.notFound('Match not found');
      }

      // Get team stats for this match
      const homeTeamStats = await this.getTeamMatchStats(matchId, matchData.homeTeamId);
      const awayTeamStats = await this.getTeamMatchStats(matchId, matchData.awayTeamId);

      // Get top performers for this match
      const topPerformers = await this.getMatchTopPerformers(matchId);

      return {
        matchId,
        homeTeam: homeTeamStats,
        awayTeam: awayTeamStats,
        topPerformers
      };
    } catch (error) {
      throw ErrorCreators.internal('Failed to retrieve match stats display', { matchId, error });
    }
  }

  /**
   * Get team stats for a specific match
   */
  private static async getTeamMatchStats(matchId: string, teamId: string): Promise<TeamStats> {
    const teamStat = await prisma.teamMatchStats.findFirst({
      where: {
        matchId,
        teamId: parseInt(teamId)
      }
    });
    
    return {
      teamId,
      teamName: `Team ${teamId}`,
      gamesPlayed: 1,
      totalScore: teamStat?.score || 0,
      totalOffensiveYards: (teamStat?.passingYards || 0) + (teamStat?.rushingYards || 0),
      passingYards: teamStat?.passingYards || 0,
      rushingYards: teamStat?.rushingYards || 0,
      timeOfPossession: teamStat?.timeOfPossession || 0,
      turnovers: teamStat?.turnovers || 0,
      totalKnockdowns: teamStat?.knockdowns || 0
    };
  }

  /**
   * Get top performers for a specific match
   */
  private static async getMatchTopPerformers(matchId: string): Promise<MatchStatsDisplay['topPerformers']> {
    // Most scores
    const mostScores = await prisma.playerMatchStats.findFirst({
      where: { matchId },
      orderBy: { scores: 'desc' }
    });

    // Most yards (passing + rushing + receiving)
    const mostYardsQuery = `
      SELECT *, (passing_yards + rushing_yards + receiving_yards) as total_yards
      FROM player_match_stats 
      WHERE match_id = $1 
      ORDER BY total_yards DESC 
      LIMIT 1
    `;

    // Most tackles
    const mostTackles = await prisma.playerMatchStats.findFirst({
      where: { matchId },
      orderBy: { tackles: 'desc' }
    });

    // Most knockdowns
    const mostKnockdowns = await prisma.playerMatchStats.findFirst({
      where: { matchId },
      orderBy: { knockdownsInflicted: 'desc' }
    });

    // Convert to PlayerStats format (simplified for match display)
    const convertToPlayerStats = (stat: any): PlayerStats => ({
      playerId: stat.playerId,
      playerName: `Player ${stat.playerId}`,
      position: 'Unknown',
      gamesPlayed: 1,
      offensive: {
        scores: stat.scores || 0,
        passingAttempts: stat.passingAttempts || 0,
        passesCompleted: stat.passesCompleted || 0,
        passingPercentage: 0,
        passingYards: stat.passingYards || 0,
        rushingYards: stat.rushingYards || 0,
        catches: stat.catches || 0,
        receivingYards: stat.receivingYards || 0,
        dropsFumbles: stat.dropsFumbles || 0
      },
      defensive: {
        tackles: stat.tackles || 0,
        knockdownsInflicted: stat.knockdownsInflicted || 0,
        interceptions: stat.interceptions || 0,
        passesDefended: stat.passesDefended || 0
      }
    });

    return {
      mostScores: mostScores[0] ? convertToPlayerStats(mostScores[0]) : {} as PlayerStats,
      mostYards: mostScores[0] ? convertToPlayerStats(mostScores[0]) : {} as PlayerStats, // Will need proper query
      mostTackles: mostTackles[0] ? convertToPlayerStats(mostTackles[0]) : {} as PlayerStats,
      mostKnockdowns: mostKnockdowns[0] ? convertToPlayerStats(mostKnockdowns[0]) : {} as PlayerStats
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