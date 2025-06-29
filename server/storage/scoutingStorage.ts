import { db } from "../db";
import {
    scouts,
    scoutingReports,
    type Scout, type InsertScout,
    type ScoutingReport, type InsertScoutingReport
} from "@shared/schema";
import { eq, and, desc, asc, inArray } from "drizzle-orm"; // Added inArray
import { randomUUID } from "crypto";

export class ScoutingStorage {

  // Scout Operations
  async createScout(scoutData: Omit<InsertScout, 'id' | 'createdAt' | 'updatedAt'>): Promise<Scout> {
    const dataToInsert: InsertScout = {
      id: randomUUID(),
      ...scoutData,
      isActive: scoutData.isActive === undefined ? true : scoutData.isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
      quality: scoutData.quality || 50,
      experience: scoutData.experience || 1,
      salary: scoutData.salary || 30000,
      contractLength: scoutData.contractLength || 1,
    };
    const [newScout] = await db.insert(scouts).values(dataToInsert).returning();
    return newScout;
  }

  async getScoutById(id: string): Promise<Scout | undefined> {
    const [scout] = await db.select().from(scouts).where(eq(scouts.id, id)).limit(1);
    return scout;
  }

  async getScoutsByTeam(teamId: string, activeOnly: boolean = true): Promise<Scout[]> {
    const conditions = [eq(scouts.teamId, teamId)];
    if (activeOnly) {
      conditions.push(eq(scouts.isActive, true));
    }
    return await db.select().from(scouts)
      .where(and(...conditions))
      .orderBy(desc(scouts.quality));
  }

  async updateScout(id: string, updates: Partial<Omit<InsertScout, 'id' | 'teamId' | 'createdAt' | 'updatedAt'>>): Promise<Scout | undefined> {
    const existing = await this.getScoutById(id);
    if (!existing) {
        console.warn(`Scout with ID ${id} not found for update.`);
        return undefined;
    }
    const [updatedScout] = await db.update(scouts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(scouts.id, id))
      .returning();
    return updatedScout;
  }

  // ScoutingReport Operations
  async createScoutingReport(reportData: Omit<InsertScoutingReport, 'id' | 'createdAt'>): Promise<ScoutingReport> {
    const dataToInsert: InsertScoutingReport = {
      id: randomUUID(),
      ...reportData,
      // Ensure all required fields from InsertScoutingReport are covered
      scoutId: reportData.scoutId, // Must be provided
      reportType: reportData.reportType, // Must be provided
      confidence: reportData.confidence || 50,
      prospectData: typeof reportData.prospectData === 'object' ? reportData.prospectData : reportData.prospectData || null, // Null if not applicable
      statRanges: typeof reportData.statRanges === 'object' ? reportData.statRanges : reportData.statRanges || null, // Null if not applicable
      // playerId can be null for prospect reports
      createdAt: new Date(),
    };
    const [newReport] = await db.insert(scoutingReports).values(dataToInsert).returning();
    return newReport;
  }

  async getScoutingReportById(id: string): Promise<ScoutingReport | undefined> {
    const [report] = await db.select().from(scoutingReports).where(eq(scoutingReports.id, id)).limit(1);
    return report;
  }

  async getScoutingReportsByScout(scoutId: string, limit: number = 20): Promise<ScoutingReport[]> {
    return await db.select().from(scoutingReports)
      .where(eq(scoutingReports.scoutId, scoutId))
      .orderBy(desc(scoutingReports.createdAt))
      .limit(limit);
  }

  async getScoutingReportsForPlayer(playerId: string, limit: number = 5): Promise<ScoutingReport[]> {
    return await db.select().from(scoutingReports)
      .where(eq(scoutingReports.playerId, playerId)) // Ensure playerId is not null for this query
      .orderBy(desc(scoutingReports.createdAt))
      .limit(limit);
  }

  async getScoutingReportsByTeamScouts(teamId: string, reportType?: 'player' | 'prospect' | 'team', limit: number = 20): Promise<ScoutingReport[]> {
    const teamScouts = await this.getScoutsByTeam(teamId, false);
    if (teamScouts.length === 0) return [];

    const scoutIds = teamScouts.map(s => s.id);
    const conditions = [inArray(scoutingReports.scoutId, scoutIds)];
    if (reportType) {
        conditions.push(eq(scoutingReports.reportType, reportType));
    }

    return await db.select().from(scoutingReports)
      .where(and(...conditions))
      .orderBy(desc(scoutingReports.createdAt))
      .limit(limit);
  }
}

export const scoutingStorage = new ScoutingStorage();
