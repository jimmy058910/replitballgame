import { db } from "../db";
import {
    playerInjuries,
    injuryTreatments,
    medicalStaff, // This might be better in staffStorage.ts if it's generic staff
    playerConditioning,
    injuryReports,
    type PlayerInjury, type InsertPlayerInjury,
    type InjuryTreatment, type InsertInjuryTreatment,
    type MedicalStaff, type InsertMedicalStaff, // If managed here
    type PlayerConditioning, type InsertPlayerConditioning,
    type InjuryReport, type InsertInjuryReport
} from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

export class InjuryStorage {

  // PlayerInjury Operations
  async createPlayerInjury(injuryData: Omit<InsertPlayerInjury, 'id' | 'injuredAt' | 'isActive' | 'remainingTime' | 'expectedRecovery'>): Promise<PlayerInjury> {
    const remainingTime = injuryData.recoveryTime; // Initially full duration
    const injuredAt = new Date();
    const expectedRecoveryDate = new Date(injuredAt.getTime() + remainingTime * 24 * 60 * 60 * 1000);

    const dataToInsert: InsertPlayerInjury = {
      id: randomUUID(),
      ...injuryData,
      remainingTime,
      injuredAt,
      expectedRecovery: expectedRecoveryDate,
      isActive: true,
      // Ensure statImpact is stringified if schema expects jsonb and input is object
      statImpact: typeof injuryData.statImpact === 'object' ? JSON.stringify(injuryData.statImpact) : injuryData.statImpact || JSON.stringify({}),
    };
    const [newInjury] = await db.insert(playerInjuries).values(dataToInsert).returning();
    return newInjury;
  }

  async getPlayerInjuryById(id: string): Promise<PlayerInjury | undefined> {
    const [injury] = await db.select().from(playerInjuries).where(eq(playerInjuries.id, id)).limit(1);
    return injury;
  }

  async getPlayerInjuries(playerId: string, activeOnly: boolean = false): Promise<PlayerInjury[]> {
    const conditions = [eq(playerInjuries.playerId, playerId)];
    if (activeOnly) {
      conditions.push(eq(playerInjuries.isActive, true));
    }
    return await db.select().from(playerInjuries).where(and(...conditions)).orderBy(desc(playerInjuries.injuredAt));
  }

  async getTeamInjuries(teamId: string, activeOnly: boolean = false): Promise<any[]> {
      // This requires a join with players table to link injuries to a team
      // For simplicity, this method might be better implemented in a service layer
      // or by fetching players first, then their injuries.
      // Placeholder:
      console.warn("getTeamInjuries in InjuryStorage is a placeholder and needs proper implementation with joins or service logic.");
      return [];
  }


  async updatePlayerInjury(id: string, updates: Partial<InsertPlayerInjury>): Promise<PlayerInjury | undefined> {
    const existing = await this.getPlayerInjuryById(id);
    if (!existing) return undefined;

    if (updates.statImpact && typeof updates.statImpact === 'object') {
        updates.statImpact = JSON.stringify(updates.statImpact);
    }
    if (updates.remainingTime !== undefined && updates.remainingTime <= 0) {
        updates.isActive = false; // Automatically set inactive if recovered
    }


    const [updatedInjury] = await db.update(playerInjuries)
      .set({ ...updates, updatedAt: new Date() }) // Assuming updatedAt in schema
      .where(eq(playerInjuries.id, id))
      .returning();
    return updatedInjury;
  }

  // InjuryTreatment Operations (Example - schema for treatments not fully defined in prompt)
  async addInjuryTreatment(treatmentData: Omit<InsertInjuryTreatment, 'id' | 'createdAt'>): Promise<InjuryTreatment> {
     const dataToInsert: InsertInjuryTreatment = {
        id: randomUUID(),
        ...treatmentData,
        // createdAt: new Date(), // Assuming schema has this
     };
    const [newTreatment] = await db.insert(injuryTreatments).values(dataToInsert).returning();
    return newTreatment;
  }

  async getTreatmentsForInjury(injuryId: string): Promise<InjuryTreatment[]> {
    return await db.select().from(injuryTreatments).where(eq(injuryTreatments.injuryId, injuryId)).orderBy(desc(injuryTreatments.startDate));
  }


  // PlayerConditioning Operations (Example)
  async getPlayerConditioning(playerId: string): Promise<PlayerConditioning | undefined> {
    const [conditioning] = await db.select().from(playerConditioning).where(eq(playerConditioning.playerId, playerId)).limit(1);
    return conditioning;
  }

  async upsertPlayerConditioning(conditioningData: InsertPlayerConditioning): Promise<PlayerConditioning> {
      const [result] = await db.insert(playerConditioning)
        .values({id: randomUUID(), ...conditioningData, updatedAt: new Date()})
        .onConflictDoUpdate({ // Assumes playerId is unique constraint for conditioning
            target: playerConditioning.playerId,
            set: { ...conditioningData, updatedAt: new Date() }
        })
        .returning();
      return result;
  }

  // InjuryReport Operations (Example - conceptual)
  async getTeamInjuryReport(teamId: string, season: string): Promise<InjuryReport | undefined> {
    const [report] = await db.select().from(injuryReports)
      .where(and(eq(injuryReports.teamId, teamId), eq(injuryReports.season, season)))
      .limit(1);
    return report;
  }

  async upsertTeamInjuryReport(reportData: InsertInjuryReport): Promise<InjuryReport> {
    const [report] = await db.insert(injuryReports)
      .values({id: randomUUID(), ...reportData, createdAt: new Date()})
      .onConflictDoUpdate({ // Assumes (teamId, season) is unique
          target: [injuryReports.teamId, injuryReports.season],
          set: { ...reportData }
      })
      .returning();
    return report;
  }
}

export const injuryStorage = new InjuryStorage();
