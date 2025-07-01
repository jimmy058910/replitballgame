import { db } from "../db";
import { adViews, users, type AdView, type InsertAdView } from "@shared/schema";
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

  /**
   * Process ad watch with comprehensive reward tracking
   */
  async processAdWatch(userId: string, adType: string, placement: string, rewardType: string, rewardAmount: number): Promise<{
    adView: AdView;
    dailyCount: number;
    totalCount: number;
    premiumRewardProgress: number;
    premiumRewardEarned: boolean;
    premiumReward?: any;
  }> {
    // Create ad view record
    const adView = await this.createAdView({
      userId,
      adType: adType as any,
      placement,
      rewardType: rewardType as any,
      rewardAmount,
      completed: true,
      completedAt: new Date()
    });

    // Update user ad tracking
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new Error("User not found");
    }

    const isNewDay = !user.lastAdWatchDate || user.lastAdWatchDate < today;
    const newDailyCount = isNewDay ? 1 : (user.dailyAdWatchCount || 0) + 1;
    const newTotalCount = (user.totalAdWatchCount || 0) + 1;
    const newProgress = (user.premiumRewardProgress || 0) + 1;

    // Check if premium reward earned (50 ads)
    const premiumRewardEarned = newProgress >= 50;
    const finalProgress = premiumRewardEarned ? 0 : newProgress;

    // Update user tracking
    await db.update(users)
      .set({
        dailyAdWatchCount: newDailyCount,
        lastAdWatchDate: new Date(),
        totalAdWatchCount: newTotalCount,
        premiumRewardProgress: finalProgress
      })
      .where(eq(users.id, userId));

    // Generate premium reward if earned
    let premiumReward;
    if (premiumRewardEarned) {
      premiumReward = this.generatePremiumReward();
    }

    return {
      adView,
      dailyCount: newDailyCount,
      totalCount: newTotalCount,
      premiumRewardProgress: finalProgress,
      premiumRewardEarned,
      premiumReward
    };
  }

  /**
   * Generate premium reward contents (loot box style)
   */
  private generatePremiumReward(): any {
    const rewardTypes = [
      { type: "credits", weight: 30, min: 5000, max: 15000 },
      { type: "premium_currency", weight: 20, min: 50, max: 200 },
      { type: "equipment", weight: 25 },
      { type: "tournament_entry", weight: 15 },
      { type: "special_bonus", weight: 10, min: 20000, max: 50000 }
    ];

    const totalWeight = rewardTypes.reduce((sum, type) => sum + type.weight, 0);
    const random = Math.random() * totalWeight;
    let currentWeight = 0;

    for (const rewardType of rewardTypes) {
      currentWeight += rewardType.weight;
      if (random <= currentWeight) {
        switch (rewardType.type) {
          case "credits":
            return {
              type: "credits",
              amount: Math.floor(Math.random() * (rewardType.max - rewardType.min + 1)) + rewardType.min,
              description: "Premium Credits Reward"
            };
          case "premium_currency":
            return {
              type: "premium_currency", 
              amount: Math.floor(Math.random() * (rewardType.max - rewardType.min + 1)) + rewardType.min,
              description: "Premium Gems Reward"
            };
          case "equipment":
            return {
              type: "equipment",
              rarity: Math.random() < 0.1 ? "legendary" : Math.random() < 0.3 ? "epic" : "rare",
              description: "Premium Equipment Piece"
            };
          case "tournament_entry":
            return {
              type: "tournament_entry",
              amount: 1,
              description: "Free Tournament Entry"
            };
          case "special_bonus":
            return {
              type: "credits",
              amount: Math.floor(Math.random() * (rewardType.max - rewardType.min + 1)) + rewardType.min,
              description: "Special Premium Bonus"
            };
        }
      }
    }

    // Fallback
    return {
      type: "credits",
      amount: 10000,
      description: "Premium Reward"
    };
  }

  /**
   * Get user ad tracking statistics
   */
  async getUserAdStats(userId: string): Promise<{
    dailyCount: number;
    totalCount: number;
    premiumProgress: number;
    canWatchMore: boolean;
    resetTime?: Date;
  }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new Error("User not found");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isNewDay = !user.lastAdWatchDate || user.lastAdWatchDate < today;
    
    const dailyCount = isNewDay ? 0 : (user.dailyAdWatchCount || 0);
    const canWatchMore = dailyCount < 20; // Max 20 ads per day

    const resetTime = new Date();
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(0, 0, 0, 0);

    return {
      dailyCount,
      totalCount: user.totalAdWatchCount || 0,
      premiumProgress: user.premiumRewardProgress || 0,
      canWatchMore,
      resetTime
    };
  }

}

export const adSystemStorage = new AdSystemStorage();
