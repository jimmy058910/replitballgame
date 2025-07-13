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
      const player = await db
        .select()
        .from(players)
        .where(eq(players.id, playerId))
        .limit(1);

      if (!player.length) {
        throw ErrorCreators.notFound('Player not found');
      }

      // Get aggregated stats
      const statsQuery = db
        .select({
          gamesPlayed: count(),
          totalScores: sum(playerMatchStats.scores),
          totalPassingAttempts: sum(playerMatchStats.passingAttempts),
          totalPassesCompleted: sum(playerMatchStats.passesCompleted),
          totalPassingYards: sum(playerMatchStats.passingYards),
          totalRushingYards: sum(playerMatchStats.rushingYards),
          totalCatches: sum(playerMatchStats.catches),
          totalReceivingYards: sum(playerMatchStats.receivingYards),
          totalDrops: sum(playerMatchStats.drops),
          totalFumblesLost: sum(playerMatchStats.fumblesLost),
          totalTackles: sum(playerMatchStats.tackles),
          totalKnockdowns: sum(playerMatchStats.knockdownsInflicted),
          totalInterceptions: sum(playerMatchStats.interceptionsCaught),
          totalPassesDefended: sum(playerMatchStats.passesDefended)
        })
        .from(playerMatchStats)
        .where(eq(playerMatchStats.playerId, playerId));

      const stats = await statsQuery;
      const playerData = stats[0];

      const passingPercentage = playerData.totalPassingAttempts > 0 
        ? (playerData.totalPassesCompleted / playerData.totalPassingAttempts) * 100 
        : 0;

      const result: PlayerStats = {
        playerId,
        playerName: `${player[0].firstName} ${player[0].lastName}`,
        position: player[0].position,
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
      const team = await db
        .select({ name: players.teamId }) // We'll need to get team name properly
        .from(players)
        .where(eq(players.teamId, teamId))
        .limit(1);

      // Get aggregated team stats
      const statsQuery = db
        .select({
          gamesPlayed: count(),
          totalOffensiveYards: sum(teamMatchStats.totalOffensiveYards),
          totalPassingYards: sum(teamMatchStats.passingYards),
          totalRushingYards: sum(teamMatchStats.rushingYards),
          totalTimeOfPossession: sum(teamMatchStats.timeOfPossessionSeconds),
          totalTurnovers: sum(teamMatchStats.turnovers),
          totalKnockdowns: sum(teamMatchStats.totalKnockdownsInflicted)
        })
        .from(teamMatchStats)
        .where(eq(teamMatchStats.teamId, teamId));

      const stats = await statsQuery;
      const teamData = stats[0];

      const result: TeamStats = {
        teamId,
        teamName: `Team ${teamId}`, // Will need proper team name lookup
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
      const match = await db
        .select()
        .from(matches)
        .where(eq(matches.id, matchId))
        .limit(1);

      if (!match.length) {
        throw ErrorCreators.notFound('Match not found');
      }

      const matchData = match[0];

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
    const stats = await db
      .select()
      .from(teamMatchStats)
      .where(and(
        eq(teamMatchStats.matchId, matchId),
        eq(teamMatchStats.teamId, teamId)
      ))
      .limit(1);

    const teamStat = stats[0];
    
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
    const mostScores = await db
      .select()
      .from(playerMatchStats)
      .where(eq(playerMatchStats.matchId, matchId))
      .orderBy(desc(playerMatchStats.scores))
      .limit(1);

    // Most yards (passing + rushing + receiving)
    const mostYardsQuery = `
      SELECT *, (passing_yards + rushing_yards + receiving_yards) as total_yards
      FROM player_match_stats 
      WHERE match_id = $1 
      ORDER BY total_yards DESC 
      LIMIT 1
    `;

    // Most tackles
    const mostTackles = await db
      .select()
      .from(playerMatchStats)
      .where(eq(playerMatchStats.matchId, matchId))
      .orderBy(desc(playerMatchStats.tackles))
      .limit(1);

    // Most knockdowns
    const mostKnockdowns = await db
      .select()
      .from(playerMatchStats)
      .where(eq(playerMatchStats.matchId, matchId))
      .orderBy(desc(playerMatchStats.knockdownsInflicted))
      .limit(1);

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