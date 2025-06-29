import { db } from "../db";
import { matches, teams, type Match, type InsertMatch } from "@shared/schema";
import { eq, or, desc, asc, and, inArray } from "drizzle-orm";

export class MatchStorage {
  async createMatch(matchData: InsertMatch): Promise<Match> {
    // Ensure team names are populated if not provided, or handle this at service layer
    if (!matchData.homeTeamName || !matchData.awayTeamName) {
        const homeTeam = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, matchData.homeTeamId)).limit(1);
        const awayTeam = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, matchData.awayTeamId)).limit(1);
        matchData.homeTeamName = homeTeam[0]?.name || "Home";
        matchData.awayTeamName = awayTeam[0]?.name || "Away";
    }

    const [newMatch] = await db.insert(matches).values(matchData).returning();
    return newMatch;
  }

  async getMatchById(id: string): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    // Enhance with team names if not already denormalized or if needed consistently
    if (match && (!match.homeTeamName || !match.awayTeamName)) {
        const homeTeam = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, match.homeTeamId)).limit(1);
        const awayTeam = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, match.awayTeamId)).limit(1);
        match.homeTeamName = homeTeam[0]?.name || match.homeTeamName || "Home";
        match.awayTeamName = awayTeam[0]?.name || match.awayTeamName || "Away";
    }
    return match;
  }

  async getMatchesByTeamId(teamId: string): Promise<Match[]> {
    const teamMatches = await db
      .select()
      .from(matches)
      .where(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)))
      .orderBy(desc(matches.scheduledTime)); // Or desc(matches.createdAt)

    // Enhance with team names
    return Promise.all(teamMatches.map(async match => {
        if (!match.homeTeamName || !match.awayTeamName) {
            const home = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, match.homeTeamId)).limit(1);
            const away = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, match.awayTeamId)).limit(1);
            match.homeTeamName = home[0]?.name || "Home";
            match.awayTeamName = away[0]?.name || "Away";
        }
        return match;
    }));
  }

  async getMatchesByDivision(division: number, seasonId?: string): Promise<Match[]> {
    // This requires joining with teams table or fetching team IDs first
    const divisionTeams = await db.select({ id: teams.id }).from(teams).where(eq(teams.division, division));
    const teamIdsInDivision = divisionTeams.map(t => t.id);

    if (teamIdsInDivision.length === 0) return [];

    let query = db.select().from(matches)
      .where(and(
        inArray(matches.homeTeamId, teamIdsInDivision),
        inArray(matches.awayTeamId, teamIdsInDivision),
        // eq(matches.matchType, "league") // Assuming these are league matches
      ))
      .orderBy(asc(matches.gameDay), asc(matches.scheduledTime));

    // if (seasonId && matches.seasonId) { // If schema has seasonId on matches
    //     query = query.where(eq(matches.seasonId, seasonId));
    // }

    const divisionMatches = await query;
    // Enhance with team names
    return Promise.all(divisionMatches.map(async match => {
        if (!match.homeTeamName || !match.awayTeamName) {
            const home = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, match.homeTeamId)).limit(1);
            const away = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, match.awayTeamId)).limit(1);
            match.homeTeamName = home[0]?.name || "Home";
            match.awayTeamName = away[0]?.name || "Away";
        }
        return match;
    }));
  }

  async updateMatch(id: string, updates: Partial<InsertMatch>): Promise<Match | undefined> {
    const existingMatch = await this.getMatchById(id);
    if (!existingMatch) {
        console.warn(`Match with ID ${id} not found for update.`);
        return undefined;
    }
    const [updatedMatch] = await db
      .update(matches)
      .set({ ...updates, updatedAt: new Date() }) // Assuming 'updatedAt' in schema
      .where(eq(matches.id, id))
      .returning();
    return updatedMatch;
  }

  async getLiveMatches(): Promise<Match[]> {
    const live = await db
      .select()
      .from(matches)
      .where(eq(matches.status, "live"))
      .orderBy(desc(matches.scheduledTime));

    // Enhance with team names
    return Promise.all(live.map(async match => {
        if (!match.homeTeamName || !match.awayTeamName) {
            const home = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, match.homeTeamId)).limit(1);
            const away = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, match.awayTeamId)).limit(1);
            match.homeTeamName = home[0]?.name || "Home";
            match.awayTeamName = away[0]?.name || "Away";
        }
        return match;
    }));
  }

  async getScheduledMatchesForDay(gameDay: number, leagueId?: string): Promise<Match[]> {
    let query = db.select().from(matches)
        .where(and(
            eq(matches.status, "scheduled"),
            eq(matches.gameDay, gameDay)
        ))
        .orderBy(asc(matches.scheduledTime));

    // if (leagueId && matches.leagueId) { // If schema has leagueId on matches
    //     query = query.where(eq(matches.leagueId, leagueId));
    // }
    return await query;
  }
}

export const matchStorage = new MatchStorage();
