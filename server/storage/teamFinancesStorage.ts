import { db } from "../db";
import { teamFinances, type TeamFinances, type InsertTeamFinances } from "@shared/schema";
import { eq } from "drizzle-orm";

export class TeamFinancesStorage {
  async getTeamFinances(teamId: string): Promise<TeamFinances | undefined> {
    const [finances] = await db.select().from(teamFinances).where(eq(teamFinances.teamId, teamId)).limit(1);
    return finances;
  }

  async createTeamFinances(financesData: InsertTeamFinances): Promise<TeamFinances> {
    // Ensure all required fields are present or have defaults in schema
    const dataToInsert = {
        ...financesData,
        // Ensure defaults for non-nullable fields if not always provided
        // season: financesData.season || 1,
        // credits: financesData.credits || 0,
        // premiumCurrency: financesData.premiumCurrency || 0,
        // ... other fields
    };
    const [newFinances] = await db.insert(teamFinances).values(dataToInsert).returning();
    return newFinances;
  }

  async updateTeamFinances(teamId: string, updates: Partial<InsertTeamFinances>): Promise<TeamFinances | undefined> {
    const existingFinances = await this.getTeamFinances(teamId);
    if (!existingFinances) {
        // Option 1: Create if not exists (effectively an upsert logic)
        // console.warn(`Finances for team ${teamId} not found. Creating new record.`);
        // const newRecord = await this.createTeamFinances({ teamId, ...updates } as InsertTeamFinances);
        // return newRecord;
        // Option 2: Return undefined or throw error if update target must exist
        console.warn(`Finances for team ${teamId} not found. Cannot update.`);
        return undefined;
    }

    const [updatedFinances] = await db
      .update(teamFinances)
      .set({ ...updates, updatedAt: new Date() }) // Assuming 'updatedAt' in schema
      .where(eq(teamFinances.teamId, teamId))
      .returning();
    return updatedFinances;
  }

  async upsertTeamFinances(teamId: string, data: Partial<InsertTeamFinances>): Promise<TeamFinances> {
    const valuesToInsert: InsertTeamFinances = {
        teamId,
        season: data.season || 1, // Default or ensure it's passed
        credits: data.credits || 0,
        premiumCurrency: data.premiumCurrency || 0,
        ticketSales: data.ticketSales || 0,
        concessionSales: data.concessionSales || 0,
        jerseySales: data.jerseySales || 0,
        sponsorships: data.sponsorships || 0,
        playerSalaries: data.playerSalaries || 0,
        staffSalaries: data.staffSalaries || 0,
        facilities: data.facilities || 0,
        totalIncome: data.totalIncome || 0,
        totalExpenses: data.totalExpenses || 0,
        netIncome: data.netIncome || 0,
        updatedAt: new Date(),
        // id: data.id, // should be omitted or handled by DB
        // createdAt: data.createdAt, // should be omitted or handled by DB
    };

    const [result] = await db.insert(teamFinances)
        .values(valuesToInsert)
        .onConflictDoUpdate({
            target: teamFinances.teamId, // Assuming teamId is unique or part of a PK for finances
            set: {
                ...data, // Apply all updates from 'data'
                updatedAt: new Date()
            }
        })
        .returning();
    return result;
  }

  // Add other finance-specific storage methods, e.g., for transactions, logs, seasonal summaries
}

export const teamFinancesStorage = new TeamFinancesStorage();
