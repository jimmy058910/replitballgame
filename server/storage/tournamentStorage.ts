import { db } from "../db";
import {
    tournaments,
    tournamentEntries,
    type Tournament, type InsertTournament,
    type TournamentEntry, type InsertTournamentEntry
} from "@shared/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm"; // Added sql
import { randomUUID } from "crypto";

export class TournamentStorage {

  // Tournament Operations
  async createTournament(tournamentData: Omit<InsertTournament, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tournament> {
    const dataToInsert: InsertTournament = {
      id: randomUUID(),
      ...tournamentData,
      status: tournamentData.status || 'open',
      prizes: typeof tournamentData.prizes === 'object' ? tournamentData.prizes : tournamentData.prizes || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const [newTournament] = await db.insert(tournaments).values(dataToInsert).returning();
    return newTournament;
  }

  async getTournamentById(id: string): Promise<Tournament | undefined> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
    return tournament;
  }

  async getTournamentsByDivision(division: number, status?: 'open' | 'in_progress' | 'completed'): Promise<Tournament[]> {
    const conditions = [eq(tournaments.division, division)];
    if (status) {
      conditions.push(eq(tournaments.status, status));
    }
    return await db.select().from(tournaments).where(and(...conditions)).orderBy(desc(tournaments.startTime)); // Assuming startTime exists
  }

  async getAllTournaments(status?: 'open' | 'in_progress' | 'completed'): Promise<Tournament[]> {
    const conditions = [];
    if (status) {
      conditions.push(eq(tournaments.status, status));
    }
    return await db.select().from(tournaments)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(tournaments.startTime)); // Assuming startTime exists
  }


  async updateTournament(id: string, updates: Partial<Omit<InsertTournament, 'id' | 'createdAt' | 'division' | 'updatedAt'>>): Promise<Tournament | undefined> {
    const existing = await this.getTournamentById(id);
    if (!existing) {
        console.warn(`Tournament with ID ${id} not found for update.`);
        return undefined;
    }

    // Drizzle's jsonb should handle object directly for prizes
    // if (updates.prizes && typeof updates.prizes === 'object') {}

    const [updatedTournament] = await db.update(tournaments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tournaments.id, id))
      .returning();
    return updatedTournament;
  }

  // TournamentEntry Operations
  async createTournamentEntry(entryData: Omit<InsertTournamentEntry, 'id' | 'entryTime'>): Promise<TournamentEntry> {
     const dataToInsert: InsertTournamentEntry = {
        id: randomUUID(),
        ...entryData,
        entryTime: new Date(),
        // prizeWon and placement would typically be null/0 initially
        prizeWon: entryData.prizeWon || 0,
        placement: entryData.placement // Can be null
     };
    const [newEntry] = await db.insert(tournamentEntries).values(dataToInsert).returning();
    return newEntry;
  }

  async getTournamentEntry(tournamentId: string, teamId: string): Promise<TournamentEntry | undefined> {
    const [entry] = await db.select().from(tournamentEntries)
      .where(and(eq(tournamentEntries.tournamentId, tournamentId), eq(tournamentEntries.teamId, teamId)))
      .limit(1);
    return entry;
  }

  async getEntriesByTournament(tournamentId: string): Promise<TournamentEntry[]> {
    return await db.select().from(tournamentEntries)
      .where(eq(tournamentEntries.tournamentId, tournamentId))
      .orderBy(asc(tournamentEntries.entryTime));
  }

  async getEntriesByTeam(teamId: string): Promise<TournamentEntry[]> {
    return await db.select().from(tournamentEntries)
      .where(eq(tournamentEntries.teamId, teamId))
      .orderBy(desc(tournamentEntries.entryTime));
  }

  async updateTournamentEntry(id: string, updates: Partial<Omit<InsertTournamentEntry, 'id' | 'tournamentId' | 'teamId' | 'entryTime'>>): Promise<TournamentEntry | undefined> {
    const existing = await db.select().from(tournamentEntries).where(eq(tournamentEntries.id, id)).limit(1);
    if(!existing[0]) return undefined;

    const [updatedEntry] = await db.update(tournamentEntries)
        .set(updates) // Assuming no specific updatedAt for entries, or handled by trigger
        .where(eq(tournamentEntries.id, id))
        .returning();
    return updatedEntry;
  }

  async getTournamentParticipantCount(tournamentId: string): Promise<number> {
      const result = await db.select({ count: sql<number>`count(*)::int`}).from(tournamentEntries)
        .where(eq(tournamentEntries.tournamentId, tournamentId));
      return result[0]?.count || 0;
  }
}

export const tournamentStorage = new TournamentStorage();
