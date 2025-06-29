import { db } from "../db";
import {
    stadiums,
    facilityUpgrades,
    stadiumEvents,
    type Stadium, type InsertStadium,
    type FacilityUpgrade, type InsertFacilityUpgrade,
    type StadiumEvent, type InsertStadiumEvent
} from "@shared/schema";
import { eq, and, desc, asc, gte } from "drizzle-orm"; // Added gte
import { randomUUID } from "crypto";

export class StadiumStorage {

  // Stadium Operations
  async createStadium(stadiumData: Omit<InsertStadium, 'id' | 'constructionDate' | 'lastUpgrade' | 'createdAt' | 'updatedAt'>): Promise<Stadium> {
    const dataToInsert: InsertStadium = {
      id: randomUUID(),
      ...stadiumData,
      constructionDate: new Date(),
      facilities: typeof stadiumData.facilities === 'object' ? JSON.stringify(stadiumData.facilities) : stadiumData.facilities || JSON.stringify({}),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const [newStadium] = await db.insert(stadiums).values(dataToInsert).returning();
    return newStadium;
  }

  async getStadiumById(id: string): Promise<Stadium | undefined> {
    const [stadium] = await db.select().from(stadiums).where(eq(stadiums.id, id)).limit(1);
    return stadium;
  }

  async getTeamStadium(teamId: string): Promise<Stadium | undefined> {
    const [stadium] = await db.select().from(stadiums).where(eq(stadiums.teamId, teamId)).limit(1);
    return stadium;
  }

  async updateStadium(id: string, updates: Partial<Omit<InsertStadium, 'id' | 'teamId' | 'constructionDate' | 'createdAt'>>): Promise<Stadium | undefined> {
    const existing = await this.getStadiumById(id);
    if (!existing) {
        console.warn(`Stadium with ID ${id} not found for update.`);
        return undefined;
    }

    let facilitiesUpdate = updates.facilities;
    if (facilitiesUpdate && typeof facilitiesUpdate === 'object') {
        facilitiesUpdate = JSON.stringify(facilitiesUpdate);
    }

    const [updatedStadium] = await db.update(stadiums)
      .set({ ...updates, facilities: facilitiesUpdate, lastUpgrade: new Date(), updatedAt: new Date() })
      .where(eq(stadiums.id, id))
      .returning();
    return updatedStadium;
  }

  // FacilityUpgrade Operations
  async createFacilityUpgrade(upgradeData: Omit<InsertFacilityUpgrade, 'id' | 'installedAt'>): Promise<FacilityUpgrade> { // Assuming installedAt from schema
    const dataToInsert: InsertFacilityUpgrade = {
      id: randomUUID(),
      ...upgradeData,
      installedAt: new Date(), // Assuming schema uses installedAt
      effect: typeof upgradeData.effect === 'object' ? JSON.stringify(upgradeData.effect) : upgradeData.effect || JSON.stringify({}),
      requirements: typeof upgradeData.requirements === 'object' ? JSON.stringify(upgradeData.requirements) : upgradeData.requirements || JSON.stringify({}),
    };
    const [newUpgrade] = await db.insert(facilityUpgrades).values(dataToInsert).returning();
    return newUpgrade;
  }

  async getStadiumUpgrades(stadiumId: string): Promise<FacilityUpgrade[]> {
    return await db.select().from(facilityUpgrades)
      .where(eq(facilityUpgrades.stadiumId, stadiumId))
      .orderBy(desc(facilityUpgrades.installedAt)); // Assuming installedAt
  }

  // StadiumEvent Operations
  async createStadiumEvent(eventData: Omit<InsertStadiumEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<StadiumEvent> {
     const dataToInsert: InsertStadiumEvent = {
        id: randomUUID(),
        ...eventData,
        status: eventData.status || 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date(),
     };
    const [newEvent] = await db.insert(stadiumEvents).values(dataToInsert).returning();
    return newEvent;
  }

  async getStadiumEventById(id: string): Promise<StadiumEvent | undefined> {
      const [event] = await db.select().from(stadiumEvents).where(eq(stadiumEvents.id, id)).limit(1);
      return event;
  }

  async getStadiumEvents(stadiumId: string, upcomingOnly: boolean = false): Promise<StadiumEvent[]> {
    const conditions = [eq(stadiumEvents.stadiumId, stadiumId)];
    if (upcomingOnly) {
      conditions.push(gte(stadiumEvents.eventDate, new Date()));
      conditions.push(eq(stadiumEvents.status, "scheduled"));
    }
    return await db.select().from(stadiumEvents)
      .where(and(...conditions))
      .orderBy(asc(stadiumEvents.eventDate));
  }

  async updateStadiumEvent(id: string, updates: Partial<Omit<InsertStadiumEvent, 'id' | 'stadiumId' | 'createdAt'>>): Promise<StadiumEvent | undefined> {
    const existing = await this.getStadiumEventById(id);
    if (!existing) return undefined;

    const [updatedEvent] = await db.update(stadiumEvents)
      .set({...updates, updatedAt: new Date()})
      .where(eq(stadiumEvents.id, id))
      .returning();
    return updatedEvent;
  }
}

export const stadiumStorage = new StadiumStorage();
