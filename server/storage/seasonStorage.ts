import { db } from "../db";
import {
    seasons,
    playoffs,
    type Season, type InsertSeason,
    type Playoff, type InsertPlayoff
} from "@shared/schema";
import { eq, and, desc, asc, isNotNull as drizzleIsNotNull } from "drizzle-orm"; // Added isNotNull
import { nanoid } from "nanoid";

export class SeasonStorage {

  // Season Operations
  async createSeason(seasonData: Omit<InsertSeason, 'id' | 'createdAt' | 'updatedAt' | 'year' | 'name'> & { yearInput: number }): Promise<Season> {
    const dataToInsert: InsertSeason = {
      id: nanoid(),
      name: `Season ${seasonData.yearInput}`,
      year: seasonData.yearInput,
      status: seasonData.status || 'active',
      startDate: seasonData.startDate || new Date(),
      endDate: seasonData.endDate, // Can be null
      playoffStartDate: seasonData.playoffStartDate, // Can be null
      championTeamId: seasonData.championTeamId, // Can be null
      createdAt: new Date(),
      updatedAt: new Date(),
      // Add any other non-nullable fields from InsertSeason that need defaults
      // For example, if your schema has 'currentDay' on seasons:
      // currentDay: seasonData.currentDay || 1,
    };
    const [newSeason] = await db.insert(seasons).values(dataToInsert).returning();
    return newSeason;
  }

  async getSeasonById(id: string): Promise<Season | undefined> {
    const [season] = await db.select().from(seasons).where(eq(seasons.id, id)).limit(1);
    return season;
  }

  async getCurrentSeason(): Promise<Season | undefined> {
    const [season] = await db.select().from(seasons)
      .where(eq(seasons.status, "active"))
      .orderBy(desc(seasons.startDate))
      .limit(1);
    return season;
  }

  async getLatestSeasonOverall(): Promise<Season | undefined> { // Renamed for clarity
    const [season] = await db.select().from(seasons)
      .orderBy(desc(seasons.year), desc(seasons.startDate))
      .limit(1);
    return season;
  }

  async updateSeason(id: string, updates: Partial<Omit<InsertSeason, 'id' | 'createdAt' | 'updatedAt' | 'year' | 'name'>>): Promise<Season | undefined> {
    const existing = await this.getSeasonById(id);
    if (!existing) {
        console.warn(`Season with ID ${id} not found for update.`);
        return undefined;
    }

    const { yearInput, ...validUpdates } = updates as any;

    const [updatedSeason] = await db.update(seasons)
      .set({ ...validUpdates, updatedAt: new Date() })
      .where(eq(seasons.id, id))
      .returning();
    return updatedSeason;
  }

  async getChampionshipHistory(limit: number = 10): Promise<Season[]> {
    return await db.select().from(seasons)
        .where(and(eq(seasons.status, "completed"), drizzleIsNotNull(seasons.championTeamId)))
        .orderBy(desc(seasons.year))
        .limit(limit);
  }


  // Playoff Operations
  async createPlayoffMatch(playoffData: Omit<InsertPlayoff, 'id' | 'createdAt'>): Promise<Playoff> {
    const dataToInsert: InsertPlayoff = {
      id: nanoid(),
      ...playoffData,
      status: playoffData.status || 'pending',
      createdAt: new Date(),
      // Ensure team1Id, team2Id, seasonId, division, round are provided
    };
    const [newPlayoffMatch] = await db.insert(playoffs).values(dataToInsert).returning();
    return newPlayoffMatch;
  }

  async getPlayoffMatchById(id: string): Promise<Playoff | undefined> {
    const [match] = await db.select().from(playoffs).where(eq(playoffs.id, id)).limit(1);
    return match;
  }

  async getPlayoffsBySeasonAndDivision(seasonId: string, division: number): Promise<Playoff[]> {
    return await db.select().from(playoffs)
      .where(and(eq(playoffs.seasonId, seasonId), eq(playoffs.division, division)))
      .orderBy(asc(playoffs.round), asc(playoffs.id));
  }

  async updatePlayoffMatch(id: string, updates: Partial<Omit<InsertPlayoff, 'id' | 'createdAt' | 'seasonId' | 'division' | 'round' | 'team1Id' | 'team2Id'>>): Promise<Playoff | undefined> {
    const existing = await this.getPlayoffMatchById(id);
    if(!existing) {
        console.warn(`Playoff match with ID ${id} not found for update.`);
        return undefined;
    }
    // Note: No `updatedAt` in playoffs schema in prompt, add if it exists.
    const [updatedMatch] = await db.update(playoffs)
      .set(updates)
      .where(eq(playoffs.id, id))
      .returning();
    return updatedMatch;
  }
}

export const seasonStorage = new SeasonStorage();
