import { db } from "../db";
import { leagues, leagueStandings, type League, type InsertLeague, type LeagueStanding, type InsertLeagueStanding } from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";

export class LeagueStorage {
  async createLeague(leagueData: InsertLeague): Promise<League> {
    const [newLeague] = await db.insert(leagues).values(leagueData).returning();
    return newLeague;
  }

  async getLeagueById(id: string): Promise<League | undefined> {
    const [league] = await db.select().from(leagues).where(eq(leagues.id, id)).limit(1);
    return league;
  }

  async getActiveLeagueByDivision(division: number, season?: number): Promise<League | undefined> {
    const conditions = [eq(leagues.division, division), eq(leagues.status, "active")];
    if (season !== undefined && leagues.season) { // Check if season column exists
        conditions.push(eq(leagues.season, season));
    }
    const [league] = await db
      .select()
      .from(leagues)
      .where(and(...conditions))
      .orderBy(desc(leagues.startDate)) // Get the most recent active one
      .limit(1);
    return league;
  }

  async updateLeague(id: string, updates: Partial<InsertLeague>): Promise<League | undefined> {
    const existing = await this.getLeagueById(id);
    if (!existing) return undefined;

    const [updatedLeague] = await db
      .update(leagues)
      .set({ ...updates, updatedAt: new Date() }) // Assuming updatedAt in schema
      .where(eq(leagues.id, id))
      .returning();
    return updatedLeague;
  }

  // League Standings specific methods
  async getLeagueStandings(leagueId: string): Promise<LeagueStanding[]> {
    return await db
      .select()
      .from(leagueStandings)
      .where(eq(leagueStandings.leagueId, leagueId))
      .orderBy(asc(leagueStandings.position), desc(leagueStandings.points)); // Primary sort by position, then points
  }

  async getTeamStandingInLeague(teamId: string, leagueId: string): Promise<LeagueStanding | undefined> {
    const [standing] = await db
      .select()
      .from(leagueStandings)
      .where(and(eq(leagueStandings.teamId, teamId), eq(leagueStandings.leagueId, leagueId)))
      .limit(1);
    return standing;
  }

  async upsertLeagueStanding(standingData: InsertLeagueStanding): Promise<LeagueStanding> {
    // Calculate goalDifference if not provided
    if (standingData.goalDifference === undefined && standingData.goalsFor !== undefined && standingData.goalsAgainst !== undefined) {
        standingData.goalDifference = standingData.goalsFor - standingData.goalsAgainst;
    }
    // Calculate points if not provided (3 for win, 1 for draw)
    if (standingData.points === undefined && standingData.wins !== undefined && standingData.draws !== undefined) {
        standingData.points = (standingData.wins * 3) + standingData.draws;
    }


    const [standing] = await db
      .insert(leagueStandings)
      .values(standingData)
      .onConflictDoUpdate({ // Assumes a unique constraint on (leagueId, teamId)
        target: [leagueStandings.leagueId, leagueStandings.teamId],
        set: {
            ...standingData,
            updatedAt: new Date() // Assuming updatedAt in schema
        }
      })
      .returning();
    return standing;
  }

  // Method to recalculate and update standings positions for a league (e.g., after matches)
  async updateLeaguePositions(leagueId: string): Promise<void> {
    const currentStandings = await this.getLeagueStandings(leagueId);

    // Sort by points, then goal difference, then goals for
    const sortedStandings = currentStandings.sort((a, b) => {
      if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0);
      if ((b.goalDifference || 0) !== (a.goalDifference || 0)) return (b.goalDifference || 0) - (a.goalDifference || 0);
      return (b.goalsFor || 0) - (a.goalsFor || 0);
    });

    for (let i = 0; i < sortedStandings.length; i++) {
      const standing = sortedStandings[i];
      if (standing.position !== i + 1) {
        await db.update(leagueStandings)
          .set({ position: i + 1, updatedAt: new Date() })
          .where(eq(leagueStandings.id, standing.id));
      }
    }
  }
}

export const leagueStorage = new LeagueStorage();
