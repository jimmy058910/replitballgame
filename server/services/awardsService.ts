import { getPrismaClient } from "../database.js";
import { nanoid } from "nanoid";
import type { 
  Prisma
} from "../db";

export class AwardsService {
  
  /**
   * Calculate and award MVP for a completed match
   * MVP is awarded based on best overall performance stats
   */
  async awardMatchMVP(matchId: number): Promise<any | null> {
    try {
      // Check if MVP already awarded for this match (placeholder - playerAward table needs to be created)
      // const existingMvp = await prisma.playerAward.findFirst({
      //   where: { matchId }
      // });

      // if (existingMvp) {
      //   return existingMvp;
      // }

      // Get match details to determine type
      const match = await prisma.game.findFirst({
        where: { id: matchId }
      });

      if (!match) {
        throw new Error("Match not found");
      }

      const matchData = match;
      
      // Skip MVP for exhibition games and tournaments
      if (matchData.matchType === "EXHIBITION" || matchData.matchType === "TOURNAMENT_DAILY") {
        return null;
      }

      // Get all player stats for this match (placeholder - playerGameStats table needs to be created)
      // const playerStats = await prisma.playerGameStats.findMany({
      //   where: { gameId: matchId },
      //   include: {
      //     player: {
      //       select: {
      //         firstName: true,
      //         lastName: true,
      //         race: true
      //       }
      //     }
      //   }
      // });

      const playerStats: any[] = []; // Placeholder until playerGameStats table is created

      if (!playerStats.length) {
        return null;
      }

      // Calculate MVP score for each player
      const playersWithScores = playerStats.map((p: any) => {
        const mvpScore = 
          (p.scores * 10) +                    // Scores are worth 10 points
          (p.catches * 3) +                    // Catches worth 3 points
          (p.passingAttempts * 0.5) +          // Passing attempts worth 0.5 points each
          ((p.rushingYards || 0) * 0.1) +      // Rushing yards worth 0.1 per yard
          (p.knockdowns * 2) +        // Knockdowns worth 2 points
          ((p.tackles || 0) * 1.5);            // Tackles worth 1.5 points

        return {
          ...p,
          mvpScore,
          performanceStats: {
            scores: p.scores,
            catches: p.catches,
            passingAttempts: p.passingAttempts,
            rushingYards: p.rushingYards,
            knockdowns: p.knockdowns,
            tackles: p.tackles,
            mvpScore
          }
        };
      });

      // Find player with highest MVP score
      const mvpPlayer = playersWithScores.reduce((best, current) => 
        current.mvpScore > best.mvpScore ? current : best
      );

      // Determine match type for award
      let matchType = "REGULAR";
      if (matchData.matchType === "PLAYOFF") matchType = "PLAYOFF";

      // Create MVP award
      const mvpAward: any = {
        id: nanoid(),
        matchId: matchId,
        playerId: mvpPlayer.playerId,
        teamId: mvpPlayer.teamId,
        awardType: `MVP_${matchType}`,
        performanceStats: mvpPlayer.performanceStats,
        awardDate: new Date(),
        createdAt: new Date()
      };

      // const result = await prisma.playerAward.create({ // Placeholder until playerAward table is created
      //   data: mvpAward
      // });
      return mvpAward; // Return the MVP data until playerAward table is created

    } catch (error) {
      console.error("Error awarding MVP:", error);
      return null;
    }
  }

  /**
   * Calculate and award all season awards after league completion
   */
  async calculateSeasonAwards(seasonId: string): Promise<any[]> {
    try {
      // Check if season awards already calculated
      // const existingAwards = await prisma.seasonAward.findMany({ // Placeholder until seasonAward table is created
      //   where: { seasonId }
      // });
      const existingAwards: any[] = [];

      if (existingAwards.length > 0) {
        return existingAwards;
      }

      const awards: any[] = [];

      // Get all player stats for the season (regular season + playoffs only) 
      // const seasonStats = await prisma.playerMatchStats.groupBy({ // Placeholder until playerMatchStats table is created
      //   by: ['playerId', 'teamId'],
      //   where: {
      //     match: {
      //       seasonId,
      //       matchType: 'regular'
      //     }
      //   },
      //   _sum: {
      //     goals: true,
      //     assists: true,
      //     passes: true,
      //     rushingYards: true,
      //     blocks: true,
      //     tackles: true
      //   },
      //   _count: {
      //     matchId: true
      //   }
      // });
      const seasonStats: any[] = []; // Placeholder until playerMatchStats table is created

      // Get player details for each player
      const playersDetails = await prisma.player.findMany({
        where: {
          id: {
            in: seasonStats.map(s => s.playerId)
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          race: true,
          age: true
        }
      });

      // Combine stats with player details
      const enrichedSeasonStats = seasonStats.map((stat: any) => {
        const playerDetail = playersDetails.find((p: any) => p.id === stat.playerId);
        return {
          playerId: stat.playerId,
          teamId: stat.teamId,
          scores: stat._sum.scores || 0,
          assists: stat._sum.assists || 0,
          passes: stat._sum.passesCompleted || 0,
          rushingYards: stat._sum.rushingYards || 0,
          knockdowns: stat._sum.knockdowns || 0,
          tackles: stat._sum.tackles || 0,
          gamesPlayed: stat._count.gameId || 0,
          player: playerDetail
        };
      });

      if (!enrichedSeasonStats.length) {
        return [];
      }

      // Player of the Year (highest overall performance)
      const playerOfYear = enrichedSeasonStats.reduce((best: any, current: any) => {
        const currentScore = (current.scores * 10) + (current.assists * 5) +
                           (current.passes * 0.5) + (current.rushingYards * 0.1) +
                           (current.knockdowns * 2) + (current.tackles * 1.5);
        const bestScore = (best.scores * 10) + (best.assists * 5) +
                         (best.passes * 0.5) + (best.rushingYards * 0.1) +
                         (best.knockdowns * 2) + (best.tackles * 1.5);
        return currentScore > bestScore ? current : best;
      });

      awards.push({
        id: nanoid(),
        playerId: playerOfYear.playerId,
        teamId: playerOfYear.teamId,
        seasonId,
        awardType: "Player of the Year",
        awardCategory: "individual",
        statValue: (playerOfYear.scores * 10) + (playerOfYear.assists * 5) +
                  (playerOfYear.passes * 0.5) + (playerOfYear.rushingYards * 0.1) +
                  (playerOfYear.knockdowns * 2) + (playerOfYear.tackles * 1.5),
        awardDate: new Date(),
        createdAt: new Date()
      });



      // Statistical Awards
      // Top Scorer
      const topScorer = enrichedSeasonStats.reduce((best: any, current: any) =>
        current.scores > best.scores ? current : best
      );
      awards.push({
        id: nanoid(),
        playerId: topScorer.playerId,
        teamId: topScorer.teamId,
        seasonId,
        awardType: "Top Scorer",
        awardCategory: "statistical",
        statValue: topScorer.scores,
        awardDate: new Date(),
        createdAt: new Date()
      });

      // Best Passer
      const bestPasser = enrichedSeasonStats.reduce((best: any, current: any) =>
        current.passes > best.passes ? current : best
      );
      awards.push({
        id: nanoid(),
        playerId: bestPasser.playerId,
        teamId: bestPasser.teamId,
        seasonId,
        awardType: "Best Passer",
        awardCategory: "positional",
        statValue: bestPasser.passes,
        awardDate: new Date(),
        createdAt: new Date()
      });

      // Best Runner
      const bestRunner = enrichedSeasonStats.reduce((best: any, current: any) =>
        current.rushingYards > best.rushingYards ? current : best
      );
      awards.push({
        id: nanoid(),
        playerId: bestRunner.playerId,
        teamId: bestRunner.teamId,
        seasonId,
        awardType: "Best Runner",
        awardCategory: "positional",
        statValue: bestRunner.rushingYards,
        awardDate: new Date(),
        createdAt: new Date()
      });

      // Best Blocker
      const bestBlocker = enrichedSeasonStats.reduce((best: any, current: any) =>
        (current.knockdowns + current.tackles) > (best.knockdowns + best.tackles) ? current : best
      );
      awards.push({
        id: nanoid(),
        playerId: bestBlocker.playerId,
        teamId: bestBlocker.teamId,
        seasonId,
        awardType: "Best Blocker",
        awardCategory: "positional",
        statValue: bestBlocker.knockdowns + bestBlocker.tackles,
        awardDate: new Date(),
        createdAt: new Date()
      });

      // Insert all awards
      // const result = await prisma.playerAward.createMany({ // Table not in schema
      //   data: awards
      // });
      
      // Return the created awards
      // return await prisma.playerAward.findMany({ // Table not in schema
      //   where: { seasonId }
      // });
      return awards; // Return local data until table is created

    } catch (error) {
      console.error("Error calculating season awards:", error);
      return [];
    }
  }

  /**
   * Get all MVP awards for a player
   */
  async getPlayerMVPAwards(playerId: number): Promise<any[]> {
    // return await prisma.playerAward.findMany({ // Table not in schema
    //   where: { playerId },
    //   orderBy: { awardDate: 'desc' }
    // });
    return []; // Return empty until table is created
  }

  /**
   * Get all season awards for a player
   */
  async getPlayerSeasonAwards(playerId: number): Promise<any[]> {
    // return await prisma.playerAward.findMany({ // Table not in schema
    //   where: { playerId },
    //   orderBy: { awardDate: 'desc' }
    // });
    return []; // Return empty until table is created
  }

  /**
   * Get all awards for a player (MVP + Season)
   */
  async getPlayerAllAwards(playerId: number): Promise<{ mvpAwards: any[], seasonAwards: any[] }> {
    const [mvpAwardsResult, seasonAwardsResult] = await Promise.all([
      this.getPlayerMVPAwards(playerId),
      this.getPlayerSeasonAwards(playerId)
    ]);

    return {
      mvpAwards: mvpAwardsResult,
      seasonAwards: seasonAwardsResult
    };
  }

  /**
   * Create team season history record
   */
  async createTeamSeasonHistory(teamId: number, seasonId: number, seasonNumber: number, divisionId: number): Promise<any> {
    // Get team's season statistics
    // const teamStatsRaw = await prisma.teamGameStats.findMany({ // Table not in schema
    //   where: {
    //     teamId,
    //     game: {
    //       seasonId,
    //       matchType: "REGULAR"
    //     }
    //   },
    //   select: {
    //     score: true,
    //   }
    // });

    // Calculate stats from raw data
    let wins = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    // teamStatsRaw.forEach((stat: any) => { // Commented until table exists
    //     goalsFor += stat.score;
    // });

    const stats = { wins, losses, goalsFor, goalsAgainst };
    const totalPoints = stats.wins * 3; // 3 points per win

    const historyRecord: any = {
      id: nanoid(),
      teamId: teamId,
      seasonId,
      seasonNumber,
      divisionId,
      finalPosition: null, // To be updated later
      wins: stats.wins,
      losses: stats.losses,
      goalsFor: stats.goalsFor,
      goalsAgainst: stats.goalsAgainst,
      playoffResult: null, // To be updated later
      specialAchievements: [],
      totalPoints,
      createdAt: new Date()
    };

    // const result = await prisma.teamSeasonStats.create({ // Table not in schema
    //   data: historyRecord
    // });
    const result = historyRecord; // Return local data until table exists
    return result;
  }

  /**
   * Get team's complete season history
   */
  async getTeamSeasonHistory(teamId: number): Promise<any[]> {
    // return await prisma.teamSeasonStats.findMany({ // Table not in schema
    //   where: { teamId },
    //   orderBy: { seasonNumber: 'desc' }
    // });
    return []; // Return empty until table exists
  }

  /**
   * Calculate and award team achievements
   */
  async calculateTeamAwards(seasonId: string): Promise<any[]> {
    try {
      const awards: any[] = [];

      // Get all team stats for the season
      // Note: teamMatchStats table doesn't exist in current schema - using mock data
      // const teamStatsRaw = await prisma.teamMatchStats.findMany({
      //   where: {
      //     match: {
      //       seasonId,
      //       matchType: "regular"  
      //     }
      //   },
      //   select: {
      //     teamId: true,
      //     goalsFor: true,
      //     goalsAgainst: true,
      //     matchId: true
      //   }
      // });
      const teamStatsRaw: any[] = [];

      // Group and calculate stats manually
      const teamStatsMap = new Map();
      teamStatsRaw.forEach((stat: any) => {
        if (!teamStatsMap.has(stat.teamId)) {
          teamStatsMap.set(stat.teamId, {
            teamId: stat.teamId,
            goalsFor: 0,
            goalsAgainst: 0,
            gamesPlayed: 0
          });
        }
        const team = teamStatsMap.get(stat.teamId);
        team.goalsFor += stat.score;
        team.gamesPlayed += 1;
      });

      const teamStats = Array.from(teamStatsMap.values());

      if (!teamStats.length) {
        return [];
      }

      // Most Goals Scored
      const highestScoringTeam = teamStats.reduce((best, current) => 
        current.goalsFor > best.goalsFor ? current : best
      );
      awards.push({
        id: nanoid(),
        teamId: highestScoringTeam.teamId,
        seasonId,
        awardType: "Most Goals Scored",
        awardCategory: "statistical",
        statValue: highestScoringTeam.goalsFor,
        awardDate: new Date(),
        createdAt: new Date()
      });

      // Best Defense (fewest goals allowed)
      const bestDefenseTeam = teamStats.reduce((best, current) => 
        current.goalsAgainst < best.goalsAgainst ? current : best
      );
      awards.push({
        id: nanoid(),
        teamId: bestDefenseTeam.teamId,
        seasonId,
        awardType: "Best Defense",
        awardCategory: "statistical",
        statValue: bestDefenseTeam.goalsAgainst,
        awardDate: new Date(),
        createdAt: new Date()
      });

      // Note: teamAward table doesn't exist in current schema
      // await prisma.teamAward.createMany({
      //   data: awards
      // });
      
      // Return the awards (mock data until table exists)
      return awards;

    } catch (error) {
      console.error("Error calculating team awards:", error);
      return [];
    }
  }

  /**
   * Get all awards for a team
   */
  async getTeamAwards(teamId: number): Promise<any[]> {
    // Note: teamAward table doesn't exist in current schema
    // return await prisma.teamAward.findMany({
    //   where: { teamId },
    //   orderBy: { awardDate: 'desc' }
    // });
    return []; // Return empty until table exists
  }
}

export const awardsService = new AwardsService();