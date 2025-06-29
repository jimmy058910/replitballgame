import { db } from "../db";
import { adViews, type AdView, type InsertAdView } from "@shared/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm"; // Added sql and desc
import { nanoid } from "nanoid";

export class AdSystemStorage {
  async createAdView(adViewData: Omit<InsertAdView, 'id' | 'createdAt'>): Promise<AdView> {
    const dataToInsert: InsertAdView = {
      id: nanoid(),
      ...adViewData,
      placement: adViewData.placement || 'unknown',
      rewardType: adViewData.rewardType || 'none',
      rewardAmount: adViewData.rewardAmount || 0,
      completed: adViewData.completed || false,
      createdAt: new Date(),
      completedAt: adViewData.completed ? (adViewData.completedAt || new Date()) : null,
    };
    const [newAdView] = await db.insert(adViews).values(dataToInsert).returning();
    return newAdView;
  }

  async getAdViewById(id: string): Promise<AdView | undefined> {
    const [adView] = await db.select().from(adViews).where(eq(adViews.id, id)).limit(1);
    return adView;
  }

  async getAdViewsByUser(userId: string, limit: number = 100, offset: number = 0): Promise<AdView[]> {
    return await db
      .select()
      .from(adViews)
      .where(eq(adViews.userId, userId))
      .orderBy(desc(adViews.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getDailyAdViewsCountByUser(userId: string): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(adViews)
      .where(and(
        eq(adViews.userId, userId),
        gte(adViews.createdAt, todayStart)
      ));
    return result[0]?.count || 0;
  }

  async getDailyCompletedRewardedAdViewsCountByUser(userId: string): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(adViews)
      .where(and(
        eq(adViews.userId, userId),
        gte(adViews.completedAt, todayStart),
        eq(adViews.completed, true),
        sql`${adViews.rewardType} IS NOT NULL AND ${adViews.rewardType} != 'none'`,
        sql`${adViews.rewardAmount} > 0`
      ));
    return result[0]?.count || 0;
  }

}

export const adSystemStorage = new AdSystemStorage();
