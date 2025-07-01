import { db } from "../db";
import { 
  mvpAwards, 
  seasonAwards, 
  teamAwards,
  teamSeasonHistory,
  playerMatchStats,
  teamMatchStats,
  players,
  teams,
  matches
} from "../../shared/schema";
import { eq, desc, and, asc, sum, max, count, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { 
  MvpAward,
  InsertMvpAward,
  SeasonAward,
  InsertSeasonAward,
  TeamAward,
  InsertTeamAward,
  TeamSeasonHistory,
  InsertTeamSeasonHistory
} from "../../shared/schema";

export class AwardsService {
  
  /**
   * Calculate and award MVP for a completed match
   * MVP is awarded based on best overall performance stats
   */
  async awardMatchMVP(matchId: string): Promise<MvpAward | null> {
    try {
      // Check if MVP already awarded for this match
      const existingMvp = await db
        .select()
        .from(mvpAwards)
        .where(eq(mvpAwards.matchId, matchId))
        .limit(1);

      if (existingMvp.length > 0) {
        return existingMvp[0];
      }

      // Get match details to determine type
      const match = await db
        .select()
        .from(matches)
        .where(eq(matches.id, matchId))
        .limit(1);

      if (!match.length) {
        throw new Error("Match not found");
      }

      const matchData = match[0];
      
      // Skip MVP for exhibition games and tournaments
      if (matchData.matchType === "exhibition" || matchData.matchType === "tournament") {
        return null;
      }

      // Get all player stats for this match
      const playerStats = await db
        .select({
          playerId: playerMatchStats.playerId,
          teamId: playerMatchStats.teamId,
          scores: playerMatchStats.scores,
          catches: playerMatchStats.catches,
          passingAttempts: playerMatchStats.passingAttempts,
          rushingYards: playerMatchStats.rushingYards,
          knockdownsInflicted: playerMatchStats.knockdownsInflicted,
          tackles: playerMatchStats.tackles,
          player: {
            firstName: players.firstName,
            lastName: players.lastName,
            race: players.race
          }
        })
        .from(playerMatchStats)
        .innerJoin(players, eq(playerMatchStats.playerId, players.id))
        .where(eq(playerMatchStats.matchId, matchId));

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

      const result = await db.insert(mvpAwards).values(mvpAward).returning();
      return result[0];

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
      const existingAwards = await db
        .select()
        .from(seasonAwards)
        .where(eq(seasonAwards.seasonId, seasonId));

      if (existingAwards.length > 0) {
        return existingAwards;
      }

      const awards: InsertSeasonAward[] = [];

      // Get all player stats for the season (regular season + playoffs only)
      const seasonStats = await db
        .select({
          playerId: playerMatchStats.playerId,
          teamId: playerMatchStats.teamId,
          goals: sum(playerMatchStats.goals).mapWith(Number),
          assists: sum(playerMatchStats.assists).mapWith(Number),
          passes: sum(playerMatchStats.passes).mapWith(Number),
          rushingYards: sum(playerMatchStats.rushingYards).mapWith(Number),
          blocks: sum(playerMatchStats.blocks).mapWith(Number),
          tackles: sum(playerMatchStats.tackles).mapWith(Number),
          gamesPlayed: count(playerMatchStats.matchId).mapWith(Number),
          player: {
            firstName: players.firstName,
            lastName: players.lastName,
            race: players.race,
            age: players.age
          }
        })
        .from(playerMatchStats)
        .innerJoin(players, eq(playerMatchStats.playerId, players.id))
        .innerJoin(matches, eq(playerMatchStats.matchId, matches.id))
        .where(
          and(
            eq(matches.seasonId, seasonId),
            eq(matches.matchType, "regular") // Only regular season for awards
          )
        )
        .groupBy(playerMatchStats.playerId, playerMatchStats.teamId, players.firstName, players.lastName, players.race, players.age);

      if (!seasonStats.length) {
        return [];
      }

      // Player of the Year (highest overall performance)
      const playerOfYear = seasonStats.reduce((best, current) => {
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

      // Rookie of the Year (best performance among players age 22 or under)
      const rookies = seasonStats.filter(p => p.player.age <= 22);
      if (rookies.length > 0) {
        const rookieOfYear = rookies.reduce((best, current) => {
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
          playerId: rookieOfYear.playerId,
          teamId: rookieOfYear.teamId,
          seasonId,
          awardType: "Rookie of the Year",
          awardCategory: "individual",
          statValue: (rookieOfYear.goals * 10) + (rookieOfYear.assists * 5) + 
                    (rookieOfYear.passes * 0.5) + (rookieOfYear.rushingYards * 0.1) +
                    (rookieOfYear.blocks * 2) + (rookieOfYear.tackles * 1.5),
          awardDate: new Date(),
          createdAt: new Date()
        });
      }

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
      const bestPasser = seasonStats.reduce((best, current) => 
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
      const bestRunner = seasonStats.reduce((best, current) => 
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

      // Best Defender
      const bestDefender = seasonStats.reduce((best, current) => 
        (current.blocks + current.tackles) > (best.blocks + best.tackles) ? current : best
      );
      awards.push({
        id: nanoid(),
        playerId: bestDefender.playerId,
        teamId: bestDefender.teamId,
        seasonId,
        awardType: "Best Defender",
        awardCategory: "positional",
        statValue: bestDefender.blocks + bestDefender.tackles,
        awardDate: new Date(),
        createdAt: new Date()
      });

      // Insert all awards
      const result = await db.insert(seasonAwards).values(awards).returning();
      return result;

    } catch (error) {
      console.error("Error calculating season awards:", error);
      return [];
    }
  }

  /**
   * Get all MVP awards for a player
   */
  async getPlayerMVPAwards(playerId: string): Promise<MvpAward[]> {
    return await db
      .select()
      .from(mvpAwards)
      .where(eq(mvpAwards.playerId, playerId))
      .orderBy(desc(mvpAwards.awardDate));
  }

  /**
   * Get all season awards for a player
   */
  async getPlayerSeasonAwards(playerId: string): Promise<SeasonAward[]> {
    return await db
      .select()
      .from(seasonAwards)
      .where(eq(seasonAwards.playerId, playerId))
      .orderBy(desc(seasonAwards.awardDate));
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
    const teamStats = await db
      .select({
        wins: sum(sql`CASE WHEN ${teamMatchStats.goalsFor} > ${teamMatchStats.goalsAgainst} THEN 1 ELSE 0 END`).mapWith(Number),
        losses: sum(sql`CASE WHEN ${teamMatchStats.goalsFor} < ${teamMatchStats.goalsAgainst} THEN 1 ELSE 0 END`).mapWith(Number),
        goalsFor: sum(teamMatchStats.goalsFor).mapWith(Number),
        goalsAgainst: sum(teamMatchStats.goalsAgainst).mapWith(Number)
      })
      .from(teamMatchStats)
      .innerJoin(matches, eq(teamMatchStats.matchId, matches.id))
      .where(
        and(
          eq(teamMatchStats.teamId, teamId),
          eq(matches.seasonId, seasonId),
          eq(matches.matchType, "regular")
        )
      );

    const stats = teamStats[0] || { wins: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
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

    const result = await db.insert(teamSeasonHistory).values(historyRecord).returning();
    return result[0];
  }

  /**
   * Get team's complete season history
   */
  async getTeamSeasonHistory(teamId: string): Promise<TeamSeasonHistory[]> {
    return await db
      .select()
      .from(teamSeasonHistory)
      .where(eq(teamSeasonHistory.teamId, teamId))
      .orderBy(desc(teamSeasonHistory.seasonNumber));
  }

  /**
   * Calculate and award team achievements
   */
  async calculateTeamAwards(seasonId: string): Promise<TeamAward[]> {
    try {
      const awards: InsertTeamAward[] = [];

      // Get all team stats for the season
      const teamStats = await db
        .select({
          teamId: teamMatchStats.teamId,
          goalsFor: sum(teamMatchStats.goalsFor).mapWith(Number),
          goalsAgainst: sum(teamMatchStats.goalsAgainst).mapWith(Number),
          gamesPlayed: count(teamMatchStats.matchId).mapWith(Number)
        })
        .from(teamMatchStats)
        .innerJoin(matches, eq(teamMatchStats.matchId, matches.id))
        .where(
          and(
            eq(matches.seasonId, seasonId),
            eq(matches.matchType, "regular")
          )
        )
        .groupBy(teamMatchStats.teamId);

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
      const result = await db.insert(teamAwards).values(awards).returning();
      return result;

    } catch (error) {
      console.error("Error calculating team awards:", error);
      return [];
    }
  }

  /**
   * Get all awards for a team
   */
  async getTeamAwards(teamId: string): Promise<TeamAward[]> {
    return await db
      .select()
      .from(teamAwards)
      .where(eq(teamAwards.teamId, teamId))
      .orderBy(desc(teamAwards.awardDate));
  }
}

export const awardsService = new AwardsService();