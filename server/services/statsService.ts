import { getPrismaClient } from "../database.js";

// Only track stats from meaningful match types (exclude exhibitions)
const MEANINGFUL_MATCH_TYPES = ['LEAGUE', 'PLAYOFF'] as const;

export interface PlayerOffensiveStats {
  scores: number;
  assists: number;
  passAttempts: number;
  passCompletions: number;
  passingAccuracy: number;
  passingYards: number;
  perfectPasses: number;
  rushingYards: number;
  breakawayRuns: number;
  catches: number;
  receivingYards: number;
  drops: number;
}

export interface PlayerDefensiveStats {
  tackles: number;
  tackleAttempts: number;
  tackleSuccessRate: number;
  knockdowns: number;
  blocks: number;
  injuriesInflicted: number;
  interceptions: number;
  ballStrips: number;
  passDeflections: number;
}

export interface PlayerMiscStats {
  fumblesLost: number;
  ballRetention: number;
  distanceCovered: number;
  ballPossessionTime: number;
  pressureApplied: number;
  injuries: number;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  position: string;
  gamesPlayed: number;
  minutesPlayed: number;
  performanceRating: number;
  camaraderieContribution: number;
  offensive: PlayerOffensiveStats;
  defensive: PlayerDefensiveStats;
  misc: PlayerMiscStats;
  averages?: {
    scoresPerGame: number;
    assistsPerGame: number;
    passingYardsPerGame: number;
    rushingYardsPerGame: number;
    tacklesPerGame: number;
    performanceRatingAvg: number;
  };
}

export interface TeamStats {
  teamId: string;
  teamName: string;
  gamesPlayed: number;
  
  // Possession & Territory Control
  totalTimeOfPossession: number;
  avgPossessionPercentage: number;
  avgFieldPosition: number;
  territoryGained: number;
  
  // Offensive Production
  totalScore: number;
  totalPassingYards: number;
  totalRushingYards: number;
  totalOffensiveYards: number;
  passingAccuracy: number;
  ballRetentionRate: number;
  scoringOpportunities: number;
  scoringEfficiency: number;
  
  // Defensive Performance
  totalTackles: number;
  totalKnockdowns: number;
  totalBlocks: number;
  totalInjuriesInflicted: number;
  totalInterceptions: number;
  totalBallStrips: number;
  passDeflections: number;
  defensiveStops: number;
  
  // Physical & Flow Metrics
  totalFumbles: number;
  turnoverDifferential: number;
  physicalDominance: number;
  ballSecurityRating: number;
  
  // Environment & Strategy
  homeFieldAdvantage: number;
  camaraderieTeamBonus: number;
  tacticalEffectiveness: number;
  equipmentAdvantage: number;
  physicalConditioning: number;
  
  averages?: {
    scorePerGame: number;
    yardsPerGame: number;
    tacklesPerGame: number;
    turnoverDifferentialPerGame: number;
    physicalDominancePerGame: number;
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
    mvpPerformance: PlayerStats;
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

      // Get meaningful match statistics (League + Division Tournament only, no exhibitions)
      const matchStats = await prisma.playerMatchStats.findMany({
        where: {
          playerId: parseInt(playerId),
          matchType: {
            in: ['LEAGUE', 'PLAYOFF']
          }
        },
        include: {
          game: {
            select: {
              matchType: true,
              gameDate: true,
              status: true
            }
          }
        }
      });

      // Calculate aggregated statistics
      const gamesPlayed = matchStats.length;
      
      if (gamesPlayed === 0) {
        // Return empty stats structure
        return this.getEmptyPlayerStats(playerId, `${player.firstName} ${player.lastName}`, player.role);
      }

      // Aggregate all statistics
      const aggregated = matchStats.reduce((acc, stat) => ({
        minutesPlayed: acc.minutesPlayed + stat.minutesPlayed,
        performanceRating: acc.performanceRating + (stat.performanceRating || 0),
        camaraderieContribution: acc.camaraderieContribution + stat.camaraderieContribution,
        
        // Scoring
        scores: acc.scores + stat.scores,
        assists: acc.assists + stat.assists,
        
        // Passing
        passAttempts: acc.passAttempts + stat.passAttempts,
        passCompletions: acc.passCompletions + stat.passCompletions,
        passingYards: acc.passingYards + stat.passingYards,
        perfectPasses: acc.perfectPasses + stat.perfectPasses,
        
        // Rushing
        rushingYards: acc.rushingYards + stat.rushingYards,
        breakawayRuns: acc.breakawayRuns + stat.breakawayRuns,
        
        // Receiving
        catches: acc.catches + stat.catches,
        receivingYards: acc.receivingYards + stat.receivingYards,
        drops: acc.drops + stat.drops,
        
        // Defense
        tackles: acc.tackles + stat.tackles,
        tackleAttempts: acc.tackleAttempts + stat.tackleAttempts,
        knockdowns: acc.knockdowns + stat.knockdowns,
        blocks: acc.blocks + stat.blocks,
        injuriesInflicted: acc.injuriesInflicted + stat.injuriesInflicted,
        interceptions: acc.interceptions + stat.interceptions,
        ballStrips: acc.ballStrips + stat.ballStrips,
        passDeflections: acc.passDeflections + stat.passDeflections,
        
        // Misc
        fumblesLost: acc.fumblesLost + stat.fumblesLost,
        ballRetention: acc.ballRetention + stat.ballRetention,
        distanceCovered: acc.distanceCovered + stat.distanceCovered,
        ballPossessionTime: acc.ballPossessionTime + stat.ballPossessionTime,
        pressureApplied: acc.pressureApplied + stat.pressureApplied,
        injuries: acc.injuries + stat.injuries,
      }), {
        minutesPlayed: 0, performanceRating: 0, camaraderieContribution: 0,
        scores: 0, assists: 0, passAttempts: 0, passCompletions: 0, passingYards: 0, perfectPasses: 0,
        rushingYards: 0, breakawayRuns: 0, catches: 0, receivingYards: 0, drops: 0,
        tackles: 0, tackleAttempts: 0, knockdowns: 0, blocks: 0, injuriesInflicted: 0,
        interceptions: 0, ballStrips: 0, passDeflections: 0, fumblesLost: 0, ballRetention: 0,
        distanceCovered: 0, ballPossessionTime: 0, pressureApplied: 0, injuries: 0
      });

      // Calculate derived stats
      const passingAccuracy = aggregated.passAttempts > 0 ? 
        Math.round((aggregated.passCompletions / aggregated.passAttempts) * 100 * 10) / 10 : 0;
      const tackleSuccessRate = aggregated.tackleAttempts > 0 ? 
        Math.round((aggregated.tackles / aggregated.tackleAttempts) * 100 * 10) / 10 : 0;

      const result: PlayerStats = {
        playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.role,
        gamesPlayed,
        minutesPlayed: aggregated.minutesPlayed,
        performanceRating: Math.round((aggregated.performanceRating / gamesPlayed) * 10) / 10,
        camaraderieContribution: Math.round((aggregated.camaraderieContribution / gamesPlayed) * 10) / 10,
        
        offensive: {
          scores: aggregated.scores,
          assists: aggregated.assists,
          passAttempts: aggregated.passAttempts,
          passCompletions: aggregated.passCompletions,
          passingAccuracy,
          passingYards: aggregated.passingYards,
          perfectPasses: aggregated.perfectPasses,
          rushingYards: aggregated.rushingYards,
          breakawayRuns: aggregated.breakawayRuns,
          catches: aggregated.catches,
          receivingYards: aggregated.receivingYards,
          drops: aggregated.drops
        },
        
        defensive: {
          tackles: aggregated.tackles,
          tackleAttempts: aggregated.tackleAttempts,
          tackleSuccessRate,
          knockdowns: aggregated.knockdowns,
          blocks: aggregated.blocks,
          injuriesInflicted: aggregated.injuriesInflicted,
          interceptions: aggregated.interceptions,
          ballStrips: aggregated.ballStrips,
          passDeflections: aggregated.passDeflections
        },
        
        misc: {
          fumblesLost: aggregated.fumblesLost,
          ballRetention: aggregated.ballRetention,
          distanceCovered: aggregated.distanceCovered,
          ballPossessionTime: aggregated.ballPossessionTime,
          pressureApplied: aggregated.pressureApplied,
          injuries: aggregated.injuries
        }
      };

      // Calculate averages
      if (result.gamesPlayed > 0) {
        result.averages = {
          scoresPerGame: Math.round((result.offensive.scores / result.gamesPlayed) * 10) / 10,
          assistsPerGame: Math.round((result.offensive.assists / result.gamesPlayed) * 10) / 10,
          passingYardsPerGame: Math.round((result.offensive.passingYards / result.gamesPlayed) * 10) / 10,
          rushingYardsPerGame: Math.round((result.offensive.rushingYards / result.gamesPlayed) * 10) / 10,
          tacklesPerGame: Math.round((result.defensive.tackles / result.gamesPlayed) * 10) / 10,
          performanceRatingAvg: result.performanceRating
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

      // Get meaningful team match statistics
      const teamStats = await prisma.teamMatchStats.findMany({
        where: {
          teamId: parseInt(teamId),
          matchType: {
            in: ['LEAGUE', 'PLAYOFF']
          }
        }
      });

      const gamesPlayed = teamStats.length;
      
      if (gamesPlayed === 0) {
        return this.getEmptyTeamStats(teamId, team.name);
      }

      // Aggregate team statistics
      const aggregated = teamStats.reduce((acc, stat) => ({
        timeOfPossession: acc.timeOfPossession + stat.timeOfPossession,
        possessionPercentage: acc.possessionPercentage + stat.possessionPercentage,
        averageFieldPosition: acc.averageFieldPosition + stat.averageFieldPosition,
        territoryGained: acc.territoryGained + stat.territoryGained,
        totalScore: acc.totalScore + stat.totalScore,
        totalPassingYards: acc.totalPassingYards + stat.totalPassingYards,
        totalRushingYards: acc.totalRushingYards + stat.totalRushingYards,
        totalOffensiveYards: acc.totalOffensiveYards + stat.totalOffensiveYards,
        passingAccuracy: acc.passingAccuracy + stat.passingAccuracy,
        ballRetentionRate: acc.ballRetentionRate + stat.ballRetentionRate,
        scoringOpportunities: acc.scoringOpportunities + stat.scoringOpportunities,
        scoringEfficiency: acc.scoringEfficiency + stat.scoringEfficiency,
        totalTackles: acc.totalTackles + stat.totalTackles,
        totalKnockdowns: acc.totalKnockdowns + stat.totalKnockdowns,
        totalBlocks: acc.totalBlocks + stat.totalBlocks,
        totalInjuriesInflicted: acc.totalInjuriesInflicted + stat.totalInjuriesInflicted,
        totalInterceptions: acc.totalInterceptions + stat.totalInterceptions,
        totalBallStrips: acc.totalBallStrips + stat.totalBallStrips,
        passDeflections: acc.passDeflections + stat.passDeflections,
        defensiveStops: acc.defensiveStops + stat.defensiveStops,
        totalFumbles: acc.totalFumbles + stat.totalFumbles,
        turnoverDifferential: acc.turnoverDifferential + stat.turnoverDifferential,
        physicalDominance: acc.physicalDominance + stat.physicalDominance,
        ballSecurityRating: acc.ballSecurityRating + stat.ballSecurityRating,
        homeFieldAdvantage: acc.homeFieldAdvantage + stat.homeFieldAdvantage,
        camaraderieTeamBonus: acc.camaraderieTeamBonus + stat.camaraderieTeamBonus,
        tacticalEffectiveness: acc.tacticalEffectiveness + stat.tacticalEffectiveness,
        equipmentAdvantage: acc.equipmentAdvantage + stat.equipmentAdvantage,
        physicalConditioning: acc.physicalConditioning + stat.physicalConditioning,
      }), {
        timeOfPossession: 0, possessionPercentage: 0, averageFieldPosition: 0, territoryGained: 0,
        totalScore: 0, totalPassingYards: 0, totalRushingYards: 0, totalOffensiveYards: 0,
        passingAccuracy: 0, ballRetentionRate: 0, scoringOpportunities: 0, scoringEfficiency: 0,
        totalTackles: 0, totalKnockdowns: 0, totalBlocks: 0, totalInjuriesInflicted: 0,
        totalInterceptions: 0, totalBallStrips: 0, passDeflections: 0, defensiveStops: 0,
        totalFumbles: 0, turnoverDifferential: 0, physicalDominance: 0, ballSecurityRating: 0,
        homeFieldAdvantage: 0, camaraderieTeamBonus: 0, tacticalEffectiveness: 0,
        equipmentAdvantage: 0, physicalConditioning: 0
      });

      const result: TeamStats = {
        teamId,
        teamName: team.name,
        gamesPlayed,
        
        // Possession & Territory Control
        totalTimeOfPossession: aggregated.timeOfPossession,
        avgPossessionPercentage: Math.round((aggregated.possessionPercentage / gamesPlayed) * 10) / 10,
        avgFieldPosition: Math.round((aggregated.averageFieldPosition / gamesPlayed) * 10) / 10,
        territoryGained: aggregated.territoryGained,
        
        // Offensive Production
        totalScore: aggregated.totalScore,
        totalPassingYards: aggregated.totalPassingYards,
        totalRushingYards: aggregated.totalRushingYards,
        totalOffensiveYards: aggregated.totalOffensiveYards,
        passingAccuracy: Math.round((aggregated.passingAccuracy / gamesPlayed) * 10) / 10,
        ballRetentionRate: Math.round((aggregated.ballRetentionRate / gamesPlayed) * 10) / 10,
        scoringOpportunities: aggregated.scoringOpportunities,
        scoringEfficiency: Math.round((aggregated.scoringEfficiency / gamesPlayed) * 10) / 10,
        
        // Defensive Performance
        totalTackles: aggregated.totalTackles,
        totalKnockdowns: aggregated.totalKnockdowns,
        totalBlocks: aggregated.totalBlocks,
        totalInjuriesInflicted: aggregated.totalInjuriesInflicted,
        totalInterceptions: aggregated.totalInterceptions,
        totalBallStrips: aggregated.totalBallStrips,
        passDeflections: aggregated.passDeflections,
        defensiveStops: aggregated.defensiveStops,
        
        // Physical & Flow Metrics
        totalFumbles: aggregated.totalFumbles,
        turnoverDifferential: aggregated.turnoverDifferential,
        physicalDominance: aggregated.physicalDominance,
        ballSecurityRating: Math.round((aggregated.ballSecurityRating / gamesPlayed) * 10) / 10,
        
        // Environment & Strategy
        homeFieldAdvantage: Math.round((aggregated.homeFieldAdvantage / gamesPlayed) * 10) / 10,
        camaraderieTeamBonus: Math.round((aggregated.camaraderieTeamBonus / gamesPlayed) * 10) / 10,
        tacticalEffectiveness: Math.round((aggregated.tacticalEffectiveness / gamesPlayed) * 10) / 10,
        equipmentAdvantage: Math.round((aggregated.equipmentAdvantage / gamesPlayed) * 10) / 10,
        physicalConditioning: Math.round((aggregated.physicalConditioning / gamesPlayed) * 10) / 10
      };

      // Calculate averages
      if (result.gamesPlayed > 0) {
        result.averages = {
          scorePerGame: Math.round((result.totalScore / result.gamesPlayed) * 10) / 10,
          yardsPerGame: Math.round((result.totalOffensiveYards / result.gamesPlayed) * 10) / 10,
          tacklesPerGame: Math.round((result.totalTackles / result.gamesPlayed) * 10) / 10,
          turnoverDifferentialPerGame: Math.round((result.turnoverDifferential / result.gamesPlayed) * 10) / 10,
          physicalDominancePerGame: Math.round((result.physicalDominance / result.gamesPlayed) * 10) / 10
        };
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to retrieve team stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get match-specific stats display for live viewing
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

      // Get top performers for this match
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
      
      // Get team match stats from database
      const teamMatchStat = await prisma.teamMatchStats.findUnique({
        where: {
          teamId_gameId: {
            teamId: teamId,
            gameId: parseInt(matchId)
          }
        }
      });

      const team = await prisma.team.findUnique({
        where: { id: teamId }
      });

      if (!team) {
        throw new Error('Team not found');
      }

      if (!teamMatchStat) {
        // Return empty stats if not found
        return this.getEmptyTeamStats(teamIdStr, team.name);
      }

      return {
        teamId: teamIdStr,
        teamName: team.name,
        gamesPlayed: 1,
        
        // Use actual match data
        totalTimeOfPossession: teamMatchStat.timeOfPossession,
        avgPossessionPercentage: teamMatchStat.possessionPercentage,
        avgFieldPosition: teamMatchStat.averageFieldPosition,
        territoryGained: teamMatchStat.territoryGained,
        totalScore: teamMatchStat.totalScore,
        totalPassingYards: teamMatchStat.totalPassingYards,
        totalRushingYards: teamMatchStat.totalRushingYards,
        totalOffensiveYards: teamMatchStat.totalOffensiveYards,
        passingAccuracy: teamMatchStat.passingAccuracy,
        ballRetentionRate: teamMatchStat.ballRetentionRate,
        scoringOpportunities: teamMatchStat.scoringOpportunities,
        scoringEfficiency: teamMatchStat.scoringEfficiency,
        totalTackles: teamMatchStat.totalTackles,
        totalKnockdowns: teamMatchStat.totalKnockdowns,
        totalBlocks: teamMatchStat.totalBlocks,
        totalInjuriesInflicted: teamMatchStat.totalInjuriesInflicted,
        totalInterceptions: teamMatchStat.totalInterceptions,
        totalBallStrips: teamMatchStat.totalBallStrips,
        passDeflections: teamMatchStat.passDeflections,
        defensiveStops: teamMatchStat.defensiveStops,
        totalFumbles: teamMatchStat.totalFumbles,
        turnoverDifferential: teamMatchStat.turnoverDifferential,
        physicalDominance: teamMatchStat.physicalDominance,
        ballSecurityRating: teamMatchStat.ballSecurityRating,
        homeFieldAdvantage: teamMatchStat.homeFieldAdvantage,
        camaraderieTeamBonus: teamMatchStat.camaraderieTeamBonus,
        tacticalEffectiveness: teamMatchStat.tacticalEffectiveness,
        equipmentAdvantage: teamMatchStat.equipmentAdvantage,
        physicalConditioning: teamMatchStat.physicalConditioning
      };
    } catch (error) {
      throw new Error(`Failed to get team match stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get top performers for a specific match
   */
  private static async getMatchTopPerformers(matchId: string): Promise<MatchStatsDisplay['topPerformers']> {
    try {
      const playerStats = await prisma.playerMatchStats.findMany({
        where: { gameId: parseInt(matchId) },
        include: {
          player: {
            select: {
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      });

      if (playerStats.length === 0) {
        // Return empty performers if no stats found
        const emptyPlayer = this.getEmptyPlayerStats('0', 'No Stats Available', 'N/A');
        return {
          mostScores: emptyPlayer,
          mostYards: emptyPlayer,
          mostTackles: emptyPlayer,
          mostKnockdowns: emptyPlayer,
          mvpPerformance: emptyPlayer
        };
      }

      // Find top performers
      const mostScores = playerStats.reduce((prev, curr) => curr.scores > prev.scores ? curr : prev);
      const mostYards = playerStats.reduce((prev, curr) => 
        (curr.rushingYards + curr.receivingYards) > (prev.rushingYards + prev.receivingYards) ? curr : prev);
      const mostTackles = playerStats.reduce((prev, curr) => curr.tackles > prev.tackles ? curr : prev);
      const mostKnockdowns = playerStats.reduce((prev, curr) => curr.knockdowns > prev.knockdowns ? curr : prev);
      const mvpPerformance = playerStats.reduce((prev, curr) => 
        (curr.performanceRating || 0) > (prev.performanceRating || 0) ? curr : prev);

      const convertToPlayerStats = (stat: any): PlayerStats => {
        const player = stat.player;
        const passingAccuracy = stat.passAttempts > 0 ? (stat.passCompletions / stat.passAttempts) * 100 : 0;
        const tackleSuccessRate = stat.tackleAttempts > 0 ? (stat.tackles / stat.tackleAttempts) * 100 : 0;

        return {
          playerId: stat.playerId.toString(),
          playerName: `${player.firstName} ${player.lastName}`,
          position: player.role,
          gamesPlayed: 1,
          minutesPlayed: stat.minutesPlayed,
          performanceRating: stat.performanceRating || 0,
          camaraderieContribution: stat.camaraderieContribution,
          offensive: {
            scores: stat.scores,
            assists: stat.assists,
            passAttempts: stat.passAttempts,
            passCompletions: stat.passCompletions,
            passingAccuracy: Math.round(passingAccuracy * 10) / 10,
            passingYards: stat.passingYards,
            perfectPasses: stat.perfectPasses,
            rushingYards: stat.rushingYards,
            breakawayRuns: stat.breakawayRuns,
            catches: stat.catches,
            receivingYards: stat.receivingYards,
            drops: stat.drops
          },
          defensive: {
            tackles: stat.tackles,
            tackleAttempts: stat.tackleAttempts,
            tackleSuccessRate: Math.round(tackleSuccessRate * 10) / 10,
            knockdowns: stat.knockdowns,
            blocks: stat.blocks,
            injuriesInflicted: stat.injuriesInflicted,
            interceptions: stat.interceptions,
            ballStrips: stat.ballStrips,
            passDeflections: stat.passDeflections
          },
          misc: {
            fumblesLost: stat.fumblesLost,
            ballRetention: stat.ballRetention,
            distanceCovered: stat.distanceCovered,
            ballPossessionTime: stat.ballPossessionTime,
            pressureApplied: stat.pressureApplied,
            injuries: stat.injuries
          }
        };
      };

      return {
        mostScores: convertToPlayerStats(mostScores),
        mostYards: convertToPlayerStats(mostYards),
        mostTackles: convertToPlayerStats(mostTackles),
        mostKnockdowns: convertToPlayerStats(mostKnockdowns),
        mvpPerformance: convertToPlayerStats(mvpPerformance)
      };
    } catch (error) {
      console.error('Error getting match top performers:', error);
      const emptyPlayer = this.getEmptyPlayerStats('0', 'Error Loading Stats', 'N/A');
      return {
        mostScores: emptyPlayer,
        mostYards: emptyPlayer,
        mostTackles: emptyPlayer,
        mostKnockdowns: emptyPlayer,
        mvpPerformance: emptyPlayer
      };
    }
  }

  /**
   * Get team leaderboards for various stats
   */
  static async getTeamLeaderboards(): Promise<{
    scoring: TeamStats[];
    offense: TeamStats[];
    defense: TeamStats[];
    physicalDominance: TeamStats[];
  }> {
    try {
      // Get all teams with meaningful stats
      const teams = await prisma.team.findMany({
        include: {
          teamMatchStats: {
            where: {
              matchType: {
                in: ['LEAGUE', 'PLAYOFF']
              }
            }
          }
        }
      });

      const teamStats: TeamStats[] = [];

      for (const team of teams) {
        if (team.teamMatchStats.length > 0) {
          const stats = await this.getTeamStats(team.id.toString());
          teamStats.push(stats);
        }
      }

      return {
        scoring: teamStats.sort((a, b) => (b.averages?.scorePerGame || 0) - (a.averages?.scorePerGame || 0)).slice(0, 10),
        offense: teamStats.sort((a, b) => (b.averages?.yardsPerGame || 0) - (a.averages?.yardsPerGame || 0)).slice(0, 10),
        defense: teamStats.sort((a, b) => (b.averages?.tacklesPerGame || 0) - (a.averages?.tacklesPerGame || 0)).slice(0, 10),
        physicalDominance: teamStats.sort((a, b) => (b.averages?.physicalDominancePerGame || 0) - (a.averages?.physicalDominancePerGame || 0)).slice(0, 10)
      };
    } catch (error) {
      console.error('Error getting team leaderboards:', error);
      return {
        scoring: [],
        offense: [],
        defense: [],
        physicalDominance: []
      };
    }
  }

  /**
   * Get player leaderboards for various stats
   */
  static async getPlayerLeaderboards(): Promise<{
    scoring: PlayerStats[];
    passing: PlayerStats[];
    rushing: PlayerStats[];
    defense: PlayerStats[];
    physicality: PlayerStats[];
  }> {
    try {
      // Get all players with meaningful stats
      const players = await prisma.player.findMany({
        where: {
          matchStats: {
            some: {
              game: {
                matchType: {
                  in: ['LEAGUE', 'PLAYOFF']
                }
              }
            }
          }
        },
        include: {
          matchStats: {
            where: {
              game: {
                matchType: {
                  in: ['LEAGUE', 'PLAYOFF']
                }
              }
            }
          }
        }
      });

      const playerStats: PlayerStats[] = [];

      for (const player of players) {
        if (player.matchStats.length > 0) {
          const stats = await this.getPlayerStats(player.id.toString());
          playerStats.push(stats);
        }
      }

      return {
        scoring: playerStats.sort((a, b) => (b.averages?.scoresPerGame || 0) - (a.averages?.scoresPerGame || 0)).slice(0, 10),
        passing: playerStats.sort((a, b) => (b.averages?.passingYardsPerGame || 0) - (a.averages?.passingYardsPerGame || 0)).slice(0, 10),
        rushing: playerStats.sort((a, b) => (b.averages?.rushingYardsPerGame || 0) - (a.averages?.rushingYardsPerGame || 0)).slice(0, 10),
        defense: playerStats.sort((a, b) => (b.averages?.tacklesPerGame || 0) - (a.averages?.tacklesPerGame || 0)).slice(0, 10),
        physicality: playerStats.sort((a, b) => b.defensive.knockdowns - a.defensive.knockdowns).slice(0, 10)
      };
    } catch (error) {
      console.error('Error getting player leaderboards:', error);
      return {
        scoring: [],
        passing: [],
        rushing: [],
        defense: [],
        physicality: []
      };
    }
  }

  /**
   * Helper method to create empty player stats
   */
  private static getEmptyPlayerStats(playerId: string, playerName: string, position: string): PlayerStats {
    return {
      playerId,
      playerName,
      position,
      gamesPlayed: 0,
      minutesPlayed: 0,
      performanceRating: 0,
      camaraderieContribution: 0,
      offensive: {
        scores: 0, assists: 0, passAttempts: 0, passCompletions: 0, passingAccuracy: 0,
        passingYards: 0, perfectPasses: 0, rushingYards: 0, breakawayRuns: 0,
        catches: 0, receivingYards: 0, drops: 0
      },
      defensive: {
        tackles: 0, tackleAttempts: 0, tackleSuccessRate: 0, knockdowns: 0, blocks: 0,
        injuriesInflicted: 0, interceptions: 0, ballStrips: 0, passDeflections: 0
      },
      misc: {
        fumblesLost: 0, ballRetention: 0, distanceCovered: 0, ballPossessionTime: 0,
        pressureApplied: 0, injuries: 0
      }
    };
  }

  /**
   * Helper method to create empty team stats
   */
  private static getEmptyTeamStats(teamId: string, teamName: string): TeamStats {
    return {
      teamId, teamName, gamesPlayed: 0,
      totalTimeOfPossession: 0, avgPossessionPercentage: 0, avgFieldPosition: 0, territoryGained: 0,
      totalScore: 0, totalPassingYards: 0, totalRushingYards: 0, totalOffensiveYards: 0,
      passingAccuracy: 0, ballRetentionRate: 0, scoringOpportunities: 0, scoringEfficiency: 0,
      totalTackles: 0, totalKnockdowns: 0, totalBlocks: 0, totalInjuriesInflicted: 0,
      totalInterceptions: 0, totalBallStrips: 0, passDeflections: 0, defensiveStops: 0,
      totalFumbles: 0, turnoverDifferential: 0, physicalDominance: 0, ballSecurityRating: 0,
      homeFieldAdvantage: 0, camaraderieTeamBonus: 0, tacticalEffectiveness: 0,
      equipmentAdvantage: 0, physicalConditioning: 0
    };
  }
}