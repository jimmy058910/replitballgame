import { db } from "../db";
import {
    sponsorshipDeals,
    stadiumRevenue,
    type SponsorshipDeal, type InsertSponsorshipDeal,
    type StadiumRevenue, type InsertStadiumRevenue
} from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

export class SponsorshipStorage {

  // SponsorshipDeal Operations
  async createSponsorshipDeal(dealData: Omit<InsertSponsorshipDeal, 'id' | 'signedDate' | 'expiryDate' | 'isActive' | 'createdAt' | 'updatedAt'>): Promise<SponsorshipDeal> {
    const duration = dealData.duration || 1;
    const signedDate = new Date();
    const expiryDate = new Date(signedDate.getFullYear() + duration, signedDate.getMonth(), signedDate.getDate());

    const dataToInsert: InsertSponsorshipDeal = {
      id: nanoid(),
      ...dealData,
      duration,
      remainingYears: dealData.remainingYears === undefined ? duration : dealData.remainingYears,
      status: dealData.status || 'active',
      signedDate,
      expiryDate,
      bonusConditions: typeof dealData.bonusConditions === 'object' ? dealData.bonusConditions : dealData.bonusConditions || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const [newDeal] = await db.insert(sponsorshipDeals).values(dataToInsert).returning();
    return newDeal;
  }

  async getSponsorshipDealById(id: string): Promise<SponsorshipDeal | undefined> {
    const [deal] = await db.select().from(sponsorshipDeals).where(eq(sponsorshipDeals.id, id)).limit(1);
    return deal;
  }

  async getSponsorshipsByTeam(teamId: string, activeOnly: boolean = true): Promise<SponsorshipDeal[]> {
    const conditions = [eq(sponsorshipDeals.teamId, teamId)];
    if (activeOnly) {
      conditions.push(eq(sponsorshipDeals.status, 'active'));
    }
    return await db.select().from(sponsorshipDeals)
      .where(and(...conditions))
      .orderBy(desc(sponsorshipDeals.value)); // Order by highest value
  }

  async updateSponsorshipDeal(id: string, updates: Partial<Omit<InsertSponsorshipDeal, 'id' | 'teamId' | 'signedDate' | 'createdAt'>>): Promise<SponsorshipDeal | undefined> {
    const existing = await this.getSponsorshipDealById(id);
    if (!existing) {
        console.warn(`Sponsorship deal with ID ${id} not found for update.`);
        return undefined;
    }
    if (updates.duration && !updates.expiryDate) {
        updates.expiryDate = new Date(existing.signedDate.getFullYear() + updates.duration, existing.signedDate.getMonth(), existing.signedDate.getDate());
    }
    if (updates.bonusConditions && typeof updates.bonusConditions === 'object') {
        // updates.bonusConditions = JSON.stringify(updates.bonusConditions); // Drizzle handles objects for jsonb
    }

    const [updatedDeal] = await db.update(sponsorshipDeals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sponsorshipDeals.id, id))
      .returning();
    return updatedDeal;
  }

  // StadiumRevenue Operations
  async getStadiumRevenueForTeamBySeason(teamId: string, season: number): Promise<StadiumRevenue[]> {
    return await db.select().from(stadiumRevenue)
      .where(and(eq(stadiumRevenue.teamId, teamId), eq(stadiumRevenue.season, season)))
      .orderBy(asc(stadiumRevenue.month)); // Assuming 'month' field exists (1-12)
  }

  async getStadiumRevenueForTeamByMonth(teamId: string, season: number, month: number): Promise<StadiumRevenue | undefined> {
    const [revenueRecord] = await db.select().from(stadiumRevenue)
      .where(and(
          eq(stadiumRevenue.teamId, teamId),
          eq(stadiumRevenue.season, season),
          eq(stadiumRevenue.month, month)
      ))
      .limit(1);
    return revenueRecord;
  }


  async upsertStadiumRevenue(revenueData: InsertStadiumRevenue): Promise<StadiumRevenue> {
    // Ensure all required fields for InsertStadiumRevenue are present or have defaults
    const dataToUpsert: InsertStadiumRevenue = {
        id: revenueData.id || nanoid(),
        teamId: revenueData.teamId,
        season: revenueData.season,
        month: revenueData.month, // Ensure month is provided
        ticketSales: revenueData.ticketSales || 0,
        concessionSales: revenueData.concessionSales || 0,
        merchandiseSales: revenueData.merchandiseSales || 0,
        parkingRevenue: revenueData.parkingRevenue || 0,
        corporateBoxes: revenueData.corporateBoxes || 0,
        namingRights: revenueData.namingRights || 0,
        totalRevenue: revenueData.totalRevenue || 0, // Should be calculated if components are provided
        updatedAt: new Date(),
        // createdAt: revenueData.createdAt, // Handled by DB or on initial insert
    };

    // Recalculate totalRevenue if individual components are present
    dataToUpsert.totalRevenue = (dataToUpsert.ticketSales || 0) +
                                (dataToUpsert.concessionSales || 0) +
                                (dataToUpsert.merchandiseSales || 0) +
                                (dataToUpsert.parkingRevenue || 0) +
                                (dataToUpsert.corporateBoxes || 0) +
                                (dataToUpsert.namingRights || 0);


    const [revenue] = await db.insert(stadiumRevenue)
      .values(dataToUpsert)
      .onConflictDoUpdate({ // Assumes unique constraint on (teamId, season, month)
        target: [stadiumRevenue.teamId, stadiumRevenue.season, stadiumRevenue.month],
        set: {
            ticketSales: dataToUpsert.ticketSales,
            concessionSales: dataToUpsert.concessionSales,
            merchandiseSales: dataToUpsert.merchandiseSales,
            parkingRevenue: dataToUpsert.parkingRevenue,
            corporateBoxes: dataToUpsert.corporateBoxes,
            namingRights: dataToUpsert.namingRights,
            totalRevenue: dataToUpsert.totalRevenue,
            updatedAt: new Date()
        }
      })
      .returning();
    return revenue;
  }
}

export const sponsorshipStorage = new SponsorshipStorage();
