import { db } from "../db";
import { tournaments, tournamentEntries, teams, teamInventory, matches } from "../../shared/schema";
import { eq, and, gte, desc, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import moment from "moment-timezone";

export interface TournamentReward {
  credits: number;
  gems: number;
  trophy?: string;
}

export interface TournamentConfig {
  type: "daily_divisional_cup" | "mid_season_classic";
  division: number;
  season: number;
  gameDay?: number;
  entryFeeCredits?: number;
  entryFeeGems?: number;
  requiresEntryItem?: boolean;
  maxTeams: number;
  rewards: {
    champion: TournamentReward;
    runnerUp: TournamentReward;
    semifinalist?: TournamentReward;
  };
}

export class TournamentService {
  
  // Daily Divisional Cup reward structure (divisions 2-8)
  private getDailyCupRewards(division: number): TournamentConfig["rewards"] {
    const rewardTable: Record<number, TournamentConfig["rewards"]> = {
      2: { // Platinum
        champion: { credits: 16000, gems: 8 },
        runnerUp: { credits: 6000, gems: 0 }
      },
      3: { // Gold
        champion: { credits: 12000, gems: 5 },
        runnerUp: { credits: 4500, gems: 0 }
      },
      4: { // Silver
        champion: { credits: 9000, gems: 3 },
        runnerUp: { credits: 3000, gems: 0 }
      },
      5: { // Bronze
        champion: { credits: 6000, gems: 0 },
        runnerUp: { credits: 2000, gems: 0 }
      },
      6: { // Copper
        champion: { credits: 4000, gems: 0 },
        runnerUp: { credits: 1500, gems: 0 }
      },
      7: { // Iron
        champion: { credits: 2500, gems: 0 },
        runnerUp: { credits: 1000, gems: 0 }
      },
      8: { // Stone
        champion: { credits: 1500, gems: 0 },
        runnerUp: { credits: 500, gems: 0 }
      }
    };
    return rewardTable[division] || rewardTable[8];
  }

  // Mid-Season Classic reward structure (all divisions)
  private getMidSeasonRewards(division: number): TournamentConfig["rewards"] {
    const divisionNames = ["", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Copper", "Iron", "Stone"];
    const trophyName = `${divisionNames[division]} Mid-Season Classic Trophy`;
    
    const rewardTable: Record<number, TournamentConfig["rewards"]> = {
      1: { // Diamond
        champion: { credits: 200000, gems: 75, trophy: trophyName },
        runnerUp: { credits: 80000, gems: 30 },
        semifinalist: { credits: 30000, gems: 0 }
      },
      2: { // Platinum
        champion: { credits: 150000, gems: 60, trophy: trophyName },
        runnerUp: { credits: 60000, gems: 25 },
        semifinalist: { credits: 25000, gems: 0 }
      },
      3: { // Gold
        champion: { credits: 100000, gems: 40, trophy: trophyName },
        runnerUp: { credits: 40000, gems: 15 },
        semifinalist: { credits: 15000, gems: 0 }
      },
      4: { // Silver
        champion: { credits: 75000, gems: 30, trophy: trophyName },
        runnerUp: { credits: 30000, gems: 10 },
        semifinalist: { credits: 10000, gems: 0 }
      },
      5: { // Bronze
        champion: { credits: 50000, gems: 20, trophy: trophyName },
        runnerUp: { credits: 20000, gems: 5 },
        semifinalist: { credits: 7500, gems: 0 }
      },
      6: { // Copper
        champion: { credits: 30000, gems: 15, trophy: trophyName },
        runnerUp: { credits: 12000, gems: 0 },
        semifinalist: { credits: 5000, gems: 0 }
      },
      7: { // Iron
        champion: { credits: 20000, gems: 10, trophy: trophyName },
        runnerUp: { credits: 8000, gems: 0 },
        semifinalist: { credits: 2500, gems: 0 }
      },
      8: { // Stone
        champion: { credits: 15000, gems: 5, trophy: trophyName },
        runnerUp: { credits: 6000, gems: 0 },
        semifinalist: { credits: 2000, gems: 0 }
      }
    };
    return rewardTable[division] || rewardTable[8];
  }

  // Get current season number based on 17-day cycles
  private getCurrentSeason(): number {
    const startDate = new Date("2025-01-01");
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor(daysSinceStart / 17);
  }

  // Get current game day (1-17 within season)
  private getCurrentGameDay(): number {
    const startDate = new Date("2025-01-01");
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return (daysSinceStart % 17) + 1;
  }

  // Create Daily Divisional Cup tournament
  async createDailyCupTournament(division: number): Promise<string> {
    if (division === 1) {
      throw new Error("Division 1 (Diamond) does not have Daily Divisional Cups");
    }

    const season = this.getCurrentSeason();
    const gameDay = this.getCurrentGameDay();
    const rewards = this.getDailyCupRewards(division);
    
    const divisionNames = ["", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Copper", "Iron", "Stone"];
    const tournamentName = `${divisionNames[division]} Daily Cup - Day ${gameDay}`;

    const tournament = {
      id: randomUUID(),
      name: tournamentName,
      type: "daily_divisional_cup" as const,
      division,
      season,
      gameDay,
      entryFee: 0, // Add this for database compatibility
      entryFeeCredits: 0,
      entryFeeGems: 0,
      requiresEntryItem: true,
      maxTeams: 16,
      status: "open" as const,
      prizes: rewards,
      registrationDeadline: moment.tz("America/New_York").add(20, 'hours').toDate(), // 8 PM EST
      tournamentStartTime: moment.tz("America/New_York").add(20, 'hours').toDate(),
      createdAt: new Date()
    };

    const [created] = await db.insert(tournaments).values(tournament).returning();
    return created.id;
  }

  // Create Mid-Season Classic tournament
  async createMidSeasonClassic(division: number): Promise<string> {
    const season = this.getCurrentSeason();
    const gameDay = 7; // Always Day 7
    const rewards = this.getMidSeasonRewards(division);
    
    const divisionNames = ["", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Copper", "Iron", "Stone"];
    const tournamentName = `${divisionNames[division]} Mid-Season Classic - Season ${season}`;

    const tournament = {
      id: randomUUID(),
      name: tournamentName,
      type: "mid_season_classic" as const,
      division,
      season,
      gameDay,
      entryFee: 10000, // Add this for database compatibility  
      entryFeeCredits: 10000,
      entryFeeGems: 20, // Alternative payment
      requiresEntryItem: false,
      maxTeams: 16,
      status: "open" as const,
      prizes: rewards,
      registrationDeadline: moment.tz("America/New_York").endOf('day').toDate(), // End of Day 6
      tournamentStartTime: moment.tz("America/New_York").add(1, 'day').hour(13).minute(0).toDate(), // 1 PM EST Day 7
      createdAt: new Date()
    };

    const [created] = await db.insert(tournaments).values(tournament).returning();
    return created.id;
  }

  // Ensure tournaments exist for current day and division
  async ensureTournamentsExist(division: number): Promise<void> {
    const season = this.getCurrentSeason();
    const gameDay = this.getCurrentGameDay();

    // Check if Daily Divisional Cup exists for this division and day
    if (division >= 2 && division <= 8) {
      const existingDailyCup = await db
        .select()
        .from(tournaments)
        .where(
          and(
            eq(tournaments.type, "daily_divisional_cup"),
            eq(tournaments.division, division),
            eq(tournaments.season, season),
            eq(tournaments.gameDay, gameDay)
          )
        )
        .limit(1);

      if (existingDailyCup.length === 0) {
        try {
          await this.createDailyCupTournament(division);
          console.log(`Created Daily Divisional Cup for Division ${division}, Day ${gameDay}`);
        } catch (error) {
          console.error(`Failed to create Daily Divisional Cup for Division ${division}:`, error);
        }
      }
    }

    // Check if Mid-Season Classic exists for this division (only create on Day 1-6)
    if (gameDay <= 6) {
      const existingMidSeason = await db
        .select()
        .from(tournaments)
        .where(
          and(
            eq(tournaments.type, "mid_season_classic"),
            eq(tournaments.division, division),
            eq(tournaments.season, season)
          )
        )
        .limit(1);

      if (existingMidSeason.length === 0) {
        try {
          await this.createMidSeasonClassic(division);
          console.log(`Created Mid-Season Classic for Division ${division}, Season ${season}`);
        } catch (error) {
          console.error(`Failed to create Mid-Season Classic for Division ${division}:`, error);
        }
      }
    }
  }

  // Get available tournaments for a team
  async getAvailableTournaments(teamId: string) {
    const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team[0]) throw new Error("Team not found");

    const division = team[0].division;
    const season = this.getCurrentSeason();
    const gameDay = this.getCurrentGameDay();

    // Get open tournaments for this division and season
    const availableTournaments = await db
      .select()
      .from(tournaments)
      .where(
        and(
          eq(tournaments.division, division),
          eq(tournaments.season, season),
          eq(tournaments.status, "open")
        )
      )
      .orderBy(asc(tournaments.registrationDeadline));

    // Check if team is already registered for any tournaments
    const existingEntries = await db
      .select({ tournamentId: tournamentEntries.tournamentId })
      .from(tournamentEntries)
      .where(eq(tournamentEntries.teamId, teamId));

    const registeredTournamentIds = new Set(existingEntries.map(e => e.tournamentId));

    return availableTournaments.filter(t => !registeredTournamentIds.has(t.id));
  }

  // Register team for tournament
  async registerForTournament(teamId: string, tournamentId: string): Promise<void> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
    if (!tournament) throw new Error("Tournament not found");

    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) throw new Error("Team not found");

    // Check if registration is still open
    if (new Date() > tournament.registrationDeadline!) {
      throw new Error("Registration deadline has passed");
    }

    // Check if team is in correct division
    if (team.division !== tournament.division) {
      throw new Error("Team is not in the correct division for this tournament");
    }

    // Check entry requirements
    if (tournament.requiresEntryItem) {
      // Daily Divisional Cup - requires Tournament Entry item
      const entryItems = await db
        .select()
        .from(teamInventory)
        .where(
          and(
            eq(teamInventory.teamId, teamId),
            eq(teamInventory.itemType, "tournament_entry"),
            gte(teamInventory.quantity, 1)
          )
        );

      if (entryItems.length === 0) {
        throw new Error("No Tournament Entry items available");
      }

      // Consume entry item
      const entryItem = entryItems[0];
      if ((entryItem.quantity || 0) > 1) {
        await db
          .update(teamInventory)
          .set({ quantity: (entryItem.quantity || 0) - 1 })
          .where(eq(teamInventory.id, entryItem.id));
      } else {
        await db
          .delete(teamInventory)
          .where(eq(teamInventory.id, entryItem.id));
      }
    } else {
      // Mid-Season Classic - requires credits or gems
      const entryFeeCredits = tournament.entryFeeCredits || 0;
      const entryFeeGems = tournament.entryFeeGems || 0;
      const teamCredits = team.credits || 0;
      const teamGems = team.gems || 0;
      
      if (teamCredits >= entryFeeCredits) {
        // Pay with credits
        await db
          .update(teams)
          .set({ credits: teamCredits - entryFeeCredits })
          .where(eq(teams.id, teamId));
      } else if (teamGems >= entryFeeGems) {
        // Pay with gems
        await db
          .update(teams)
          .set({ gems: teamGems - entryFeeGems })
          .where(eq(teams.id, teamId));
      } else {
        throw new Error("Insufficient credits or gems for entry fee");
      }
    }

    // Create tournament entry
    await db.insert(tournamentEntries).values({
      id: randomUUID(),
      tournamentId,
      teamId,
      entryTime: new Date()
    });
  }

  // Get tournaments a team is registered for
  async getTeamTournaments(teamId: string) {
    const entries = await db
      .select({
        tournament: tournaments,
        entry: tournamentEntries
      })
      .from(tournamentEntries)
      .innerJoin(tournaments, eq(tournamentEntries.tournamentId, tournaments.id))
      .where(eq(tournamentEntries.teamId, teamId))
      .orderBy(desc(tournamentEntries.entryTime));

    return entries;
  }

  // Get tournament history for a team
  async getTournamentHistory(teamId: string) {
    const completedTournaments = await db
      .select({
        tournament: tournaments,
        entry: tournamentEntries
      })
      .from(tournamentEntries)
      .innerJoin(tournaments, eq(tournamentEntries.tournamentId, tournaments.id))
      .where(
        and(
          eq(tournamentEntries.teamId, teamId),
          eq(tournaments.status, "completed")
        )
      )
      .orderBy(desc(tournaments.completedAt));

    return completedTournaments.map(({ tournament, entry }) => ({
      id: tournament.id,
      name: tournament.name,
      type: tournament.type,
      division: tournament.division,
      season: tournament.season,
      placement: entry.placement,
      creditsWon: entry.creditsWon || 0,
      gemsWon: entry.gemsWon || 0,
      trophyWon: entry.trophyWon,
      completedAt: tournament.completedAt
    }));
  }

  // Get tournament statistics for a team
  async getTournamentStats(teamId: string) {
    const entries = await db
      .select()
      .from(tournamentEntries)
      .where(eq(tournamentEntries.teamId, teamId));

    const totalTournaments = entries.length;
    const wins = entries.filter(e => e.placement === 1).length;
    const runnerUps = entries.filter(e => e.placement === 2).length;
    const totalCreditsWon = entries.reduce((sum, e) => sum + (e.creditsWon || 0), 0);
    const totalGemsWon = entries.reduce((sum, e) => sum + (e.gemsWon || 0), 0);
    const trophiesWon = entries.filter(e => e.trophyWon).length;

    return {
      totalTournaments,
      wins,
      runnerUps,
      totalCreditsWon,
      totalGemsWon,
      trophiesWon,
      winRate: totalTournaments > 0 ? (wins / totalTournaments) * 100 : 0
    };
  }

  async createOrJoinDailyTournament(teamId: string, division: number): Promise<string> {
    const gameDay = this.getCurrentGameDay();
    const season = this.getCurrentSeason();

    // Check if tournament already exists for this division/day
    const existingTournament = await db.select()
      .from(tournaments)
      .where(and(
        eq(tournaments.division, division),
        eq(tournaments.type, "daily_divisional_cup"),
        eq(tournaments.gameDay, gameDay),
        eq(tournaments.season, season),
        eq(tournaments.status, "open")
      ))
      .limit(1);

    let tournamentId: string;

    if (existingTournament.length > 0) {
      // Tournament exists, join it
      tournamentId = existingTournament[0].id;
    } else {
      // Create new tournament
      tournamentId = await this.createDailyCupTournament(division);
    }

    // Register the team (this will check for entry items and handle payments)
    await this.registerForTournament(teamId, tournamentId);

    return tournamentId;
  }

  async createOrJoinMidSeasonClassic(teamId: string, division: number, paymentType: "credits" | "gems"): Promise<string> {
    const season = this.getCurrentSeason();

    // Check if tournament already exists for this division
    const existingTournament = await db.select()
      .from(tournaments)
      .where(and(
        eq(tournaments.division, division),
        eq(tournaments.type, "mid_season_classic"),
        eq(tournaments.season, season),
        eq(tournaments.status, "open")
      ))
      .limit(1);

    let tournamentId: string;

    if (existingTournament.length > 0) {
      // Tournament exists, join it
      tournamentId = existingTournament[0].id;
    } else {
      // Create new tournament
      tournamentId = await this.createMidSeasonClassic(division);
    }

    // Handle payment based on user choice
    const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (team.length === 0) {
      throw new Error("Team not found");
    }

    if (paymentType === "credits") {
      if (team[0].credits < 10000) {
        throw new Error("Insufficient credits for Mid-Season Classic entry (10,000₡ required)");
      }
      await db.update(teams)
        .set({ credits: team[0].credits - 10000 })
        .where(eq(teams.id, teamId));
    } else if (paymentType === "gems") {
      if (team[0].gems < 20) {
        throw new Error("Insufficient gems for Mid-Season Classic entry (20💎 required)");
      }
      await db.update(teams)
        .set({ gems: team[0].gems - 20 })
        .where(eq(teams.id, teamId));
    }

    // Create tournament entry directly (payment already handled above)
    await db.insert(tournamentEntries).values({
      id: randomUUID(),
      tournamentId,
      teamId,
      entryTime: new Date()
    });

    return tournamentId;
  }
}

export const tournamentService = new TournamentService();