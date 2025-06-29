import { db } from "../db";
import {
    exhibitionGames,
    // teams, // For fetching team names if needed - better done at service layer
    type ExhibitionGame, type InsertExhibitionGame
} from "@shared/schema";
import { eq, and, or, desc, gte, lte } from "drizzle-orm"; // Added lte
import { randomUUID } from "crypto";

export class ExhibitionGameStorage {
  async createExhibitionGame(gameData: Omit<InsertExhibitionGame, 'id' | 'playedDate'>): Promise<ExhibitionGame> {
    const dataToInsert: InsertExhibitionGame = {
      id: randomUUID(),
      ...gameData,
      playedDate: new Date(),
      gameData: typeof gameData.gameData === 'object' ? gameData.gameData : gameData.gameData || {},
    };
    const [newGame] = await db.insert(exhibitionGames).values(dataToInsert).returning();
    return newGame;
  }

  async getExhibitionGameById(id: string): Promise<ExhibitionGame | undefined> {
    const [game] = await db.select().from(exhibitionGames).where(eq(exhibitionGames.id, id)).limit(1);
    return game;
  }

  async getExhibitionGamesByTeam(teamId: string, limit: number = 10): Promise<ExhibitionGame[]> {
    // This assumes `teamId` in exhibitionGames is the primary team that initiated or is focused on.
    // If it means "games involving this team", the query would be different (using OR for teamId and opponentTeamId).
    // The original schema had `teamId` and `opponentTeamId`.
    // Assuming `teamId` is the one we are querying for.
    return await db
      .select()
      .from(exhibitionGames)
      .where(eq(exhibitionGames.teamId, teamId))
      .orderBy(desc(exhibitionGames.playedDate))
      .limit(limit);
  }

  async getExhibitionGamesPlayedTodayByTeam(teamId: string): Promise<ExhibitionGame[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return await db
      .select()
      .from(exhibitionGames)
      .where(and(
        eq(exhibitionGames.teamId, teamId), // Games initiated by this team
        gte(exhibitionGames.playedDate, todayStart),
        lte(exhibitionGames.playedDate, todayEnd)
      ))
      .orderBy(desc(exhibitionGames.playedDate));
  }


  async deleteExhibitionGame(id: string): Promise<boolean> {
    const result = await db.delete(exhibitionGames).where(eq(exhibitionGames.id, id)).returning({id: exhibitionGames.id});
    return result.length > 0;
  }
}

export const exhibitionGameStorage = new ExhibitionGameStorage();
