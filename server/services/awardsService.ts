import { prisma } from "../db";
import { nanoid } from "nanoid";
import type { 
  MvpAward,
  SeasonAward,
  TeamAward,
  TeamSeasonHistory,
  Prisma
} from "../../generated/prisma";

export class AwardsService {
  
  /**
   * Calculate and award MVP for a completed match
   * MVP is awarded based on best overall performance stats
   */
  async awardMatchMVP(matchId: string): Promise<MvpAward | null> {
    try {
      // Check if MVP already awarded for this match
      const existingMvp = await prisma.mvpAward.findFirst({
        where: { matchId }
      });

      if (existingMvp) {
        return existingMvp;
      }

      // Get match details to determine type
      const match = await prisma.game.findFirst({
        where: { id: matchId }
      });

      if (!match) {
        throw new Error("Match not found");
      }

      const matchData = match;
      
      // Skip MVP for exhibition games and tournaments
      if (matchData.matchType === "exhibition" || matchData.matchType === "tournament") {
        return null;
      }

      // Get all player stats for this match
      const playerStats = await prisma.playerMatchStats.findMany({
        where: { matchId },
        include: {
          player: {
            select: {
              firstName: true,
              lastName: true,
              race: true
            }
          }
        }
      });

      if (!playerStats.length) {
        return null;
      }

      // Calculate MVP score for each player
      const playersWithScores = playerStats.map(p => {
        const mvpScore = 
          (p.scores * 10) +                    // Scores are worth 10 points
          (p.catches * 3) +                    // Catches worth 3 points
          (p.passingAttempts * 0.5) +          // Passing attempts worth 0.5 points each
          ((p.rushingYards || 0) * 0.1) +      // Rushing yards worth 0.1 per yard
          (p.knockdownsInflicted * 2) +        // Knockdowns worth 2 points
          ((p.tackles || 0) * 1.5);            // Tackles worth 1.5 points

        return {
          ...p,
          mvpScore,
          performanceStats: {
            scores: p.scores,
            catches: p.catches,
            passingAttempts: p.passingAttempts,
            rushingYards: p.rushingYards,
            knockdownsInflicted: p.knockdownsInflicted,
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
      let matchType = "regular";
      if (matchData.matchType === "playoff") matchType = "playoff";
      if (matchData.matchType === "championship") matchType = "championship";

      // Create MVP award
      const mvpAward: InsertMvpAward = {
        id: nanoid(),
        matchId: matchId,
        playerId: mvpPlayer.playerId,
        teamId: mvpPlayer.teamId,
        seasonId: matchData.seasonId || null,
        matchType,
        performanceStats: mvpPlayer.performanceStats,
        awardDate: new Date(),
        createdAt: new Date()
      };

      const result = await prisma.mvpAward.create({
        data: mvpAward
      });
      return result;

    } catch (error) {
      console.error("Error awarding MVP:", error);
      return null;
    }
  }

  /**
   * Calculate and award all season awards after league completion
   */
  async calculateSeasonAwards(seasonId: string): Promise<SeasonAward[]> {
    try {
      // Check if season awards already calculated
      const existingAwards = await prisma.seasonAward.findMany({
        where: { seasonId }
      });

      if (existingAwards.length > 0) {
        return existingAwards;
      }

      const awards: InsertSeasonAward[] = [];

      // Get all player stats for the season (regular season + playoffs only)
      const seasonStats = await prisma.playerMatchStats.groupBy({
        by: ['playerId', 'teamId'],
        where: {
          match: {
            seasonId,
            matchType: 'regular'
          }
        },
        _sum: {
          goals: true,
          assists: true,
          passes: true,
          rushingYards: true,
          blocks: true,
          tackles: true
        },
        _count: {
          matchId: true
        }
      });

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
      const enrichedSeasonStats = seasonStats.map(stat => {
        const playerDetail = playersDetails.find(p => p.id === stat.playerId);
        return {
          playerId: stat.playerId,
          teamId: stat.teamId,
          goals: stat._sum.goals || 0,
          assists: stat._sum.assists || 0,
          passes: stat._sum.passes || 0,
          rushingYards: stat._sum.rushingYards || 0,
          blocks: stat._sum.blocks || 0,
          tackles: stat._sum.tackles || 0,
          gamesPlayed: stat._count.matchId || 0,
          player: playerDetail
        };
      });

      if (!enrichedSeasonStats.length) {
        return [];
      }

      // Player of the Year (highest overall performance)
      const playerOfYear = enrichedSeasonStats.reduce((best, current) => {
        const currentScore = (current.goals * 10) + (current.assists * 5) + 
                           (current.passes * 0.5) + (current.rushingYards * 0.1) +
                           (current.blocks * 2) + (current.tackles * 1.5);
        const bestScore = (best.goals * 10) + (best.assists * 5) + 
                         (best.passes * 0.5) + (best.rushingYards * 0.1) +
                         (best.blocks * 2) + (best.tackles * 1.5);
        return currentScore > bestScore ? current : best;
      });

      awards.push({
        id: nanoid(),
        playerId: playerOfYear.playerId,
        teamId: playerOfYear.teamId,
        seasonId,
        awardType: "Player of the Year",
        awardCategory: "individual",
        statValue: (playerOfYear.goals * 10) + (playerOfYear.assists * 5) + 
                  (playerOfYear.passes * 0.5) + (playerOfYear.rushingYards * 0.1) +
                  (playerOfYear.blocks * 2) + (playerOfYear.tackles * 1.5),
        awardDate: new Date(),
        createdAt: new Date()
      });



      // Statistical Awards
      // Top Scorer
      const topScorer = seasonStats.reduce((best, current) => 
        current.goals > best.goals ? current : best
      );
      awards.push({
        id: nanoid(),
        playerId: topScorer.playerId,
        teamId: topScorer.teamId,
        seasonId,
        awardType: "Top Scorer",
        awardCategory: "statistical",
        statValue: topScorer.goals,
        awardDate: new Date(),
        createdAt: new Date()
      });

      // Best Passer
      const bestPasser = enrichedSeasonStats.reduce((best, current) => 
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
      const bestRunner = enrichedSeasonStats.reduce((best, current) => 
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
      const bestBlocker = enrichedSeasonStats.reduce((best, current) => 
        (current.blocks + current.tackles) > (best.blocks + best.tackles) ? current : best
      );
      awards.push({
        id: nanoid(),
        playerId: bestBlocker.playerId,
        teamId: bestBlocker.teamId,
        seasonId,
        awardType: "Best Blocker",
        awardCategory: "positional",
        statValue: bestBlocker.blocks + bestBlocker.tackles,
        awardDate: new Date(),
        createdAt: new Date()
      });

      // Insert all awards
      const result = await prisma.seasonAward.createMany({
        data: awards
      });
      
      // Return the created awards
      return await prisma.seasonAward.findMany({
        where: { seasonId }
      });

    } catch (error) {
      console.error("Error calculating season awards:", error);
      return [];
    }
  }

  /**
   * Get all MVP awards for a player
   */
  async getPlayerMVPAwards(playerId: string): Promise<MvpAward[]> {
    return await prisma.mvpAward.findMany({
      where: { playerId },
      orderBy: { awardDate: 'desc' }
    });
  }

  /**
   * Get all season awards for a player
   */
  async getPlayerSeasonAwards(playerId: string): Promise<SeasonAward[]> {
    return await prisma.seasonAward.findMany({
      where: { playerId },
      orderBy: { awardDate: 'desc' }
    });
  }

  /**
   * Get all awards for a player (MVP + Season)
   */
  async getPlayerAllAwards(playerId: string): Promise<{ mvpAwards: MvpAward[], seasonAwards: SeasonAward[] }> {
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
  async createTeamSeasonHistory(teamId: string, seasonId: string, seasonNumber: number, divisionId: string): Promise<TeamSeasonHistory> {
    // Get team's season statistics
    const teamStatsRaw = await prisma.teamMatchStats.findMany({
      where: {
        teamId,
        match: {
          seasonId,
          matchType: "regular"
        }
      },
      select: {
        goalsFor: true,
        goalsAgainst: true
      }
    });

    // Calculate stats from raw data
    let wins = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    teamStatsRaw.forEach(stat => {
      if (stat.goalsFor > stat.goalsAgainst) wins++;
      else if (stat.goalsFor < stat.goalsAgainst) losses++;
      
      goalsFor += stat.goalsFor;
      goalsAgainst += stat.goalsAgainst;
    });

    const stats = { wins, losses, goalsFor, goalsAgainst };
    const totalPoints = stats.wins * 3; // 3 points per win

    const historyRecord: InsertTeamSeasonHistory = {
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

    const result = await prisma.teamSeasonHistory.create({
      data: historyRecord
    });
    return result;
  }

  /**
   * Get team's complete season history
   */
  async getTeamSeasonHistory(teamId: string): Promise<TeamSeasonHistory[]> {
    return await prisma.teamSeasonHistory.findMany({
      where: { teamId },
      orderBy: { seasonNumber: 'desc' }
    });
  }

  /**
   * Calculate and award team achievements
   */
  async calculateTeamAwards(seasonId: string): Promise<TeamAward[]> {
    try {
      const awards: InsertTeamAward[] = [];

      // Get all team stats for the season
      const teamStatsRaw = await prisma.teamMatchStats.findMany({
        where: {
          match: {
            seasonId,
            matchType: "regular"
          }
        },
        select: {
          teamId: true,
          goalsFor: true,
          goalsAgainst: true,
          matchId: true
        }
      });

      // Group and calculate stats manually
      const teamStatsMap = new Map();
      teamStatsRaw.forEach(stat => {
        if (!teamStatsMap.has(stat.teamId)) {
          teamStatsMap.set(stat.teamId, {
            teamId: stat.teamId,
            goalsFor: 0,
            goalsAgainst: 0,
            gamesPlayed: 0
          });
        }
        const team = teamStatsMap.get(stat.teamId);
        team.goalsFor += stat.goalsFor;
        team.goalsAgainst += stat.goalsAgainst;
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

      // Insert team awards
      await prisma.teamAward.createMany({
        data: awards
      });
      
      // Return the created awards
      return await prisma.teamAward.findMany({
        where: { seasonId }
      });

    } catch (error) {
      console.error("Error calculating team awards:", error);
      return [];
    }
  }

  /**
   * Get all awards for a team
   */
  async getTeamAwards(teamId: string): Promise<TeamAward[]> {
    return await prisma.teamAward.findMany({
      where: { teamId },
      orderBy: { awardDate: 'desc' }
    });
  }
}

export const awardsService = new AwardsService();