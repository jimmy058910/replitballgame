import { prisma } from '../db';
import { PrismaClient, AdView } from '../../generated/prisma';



export class AdSystemStorage {
  async createAdView(adViewData: {
    userId: string;
    teamId?: number;
    placement?: string;
    rewardType?: string;
    rewardAmount?: number;
    completed?: boolean;
    completedAt?: Date;
  }): Promise<AdView> {
    const newAdView = await prisma.adView.create({
      data: {
        userId: adViewData.userId,
        teamId: adViewData.teamId,
        placement: adViewData.placement || 'unknown',
        rewardType: adViewData.rewardType || 'none',
        rewardAmount: adViewData.rewardAmount || 0,
        completed: adViewData.completed || false,
        completedAt: adViewData.completed ? (adViewData.completedAt || new Date()) : null,
      }
    });
    return newAdView;
  }

  async getAdViewById(id: number): Promise<AdView | null> {
    const adView = await prisma.adView.findUnique({
      where: { id }
    });
    return adView;
  }

  async getAdViewsByUser(userId: string, limit: number = 100, offset: number = 0): Promise<AdView[]> {
    return await prisma.adView.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  async getDailyAdViewsCountByUser(userId: string): Promise<number> {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const count = await prisma.adView.count({
        where: {
          userId,
          createdAt: {
            gte: todayStart
          }
        }
      });
      return count || 0;
    } catch (error) {
      console.error('Error getting daily ad views count:', error);
      return 0;
    }
  }

  async getDailyCompletedRewardedAdViewsCountByUser(userId: string): Promise<number> {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const count = await prisma.adView.count({
        where: {
          userId,
          completed: true,
          rewardAmount: { gt: 0 },
          createdAt: {
            gte: todayStart
          }
        }
      });
      return count || 0;
    } catch (error) {
      console.error('Error getting daily completed rewarded ad views count:', error);
      return 0;
    }
  }



  async getTotalRewardsByUser(userId: string, timeframe?: 'today' | 'week' | 'month'): Promise<number> {
    let dateFilter: Date | undefined;
    
    if (timeframe === 'today') {
      dateFilter = new Date();
      dateFilter.setHours(0, 0, 0, 0);
    } else if (timeframe === 'week') {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (timeframe === 'month') {
      dateFilter = new Date();
      dateFilter.setMonth(dateFilter.getMonth() - 1);
    }

    const result = await prisma.adView.aggregate({
      where: {
        userId,
        completed: true,
        ...(dateFilter ? { createdAt: { gte: dateFilter } } : {})
      },
      _sum: {
        rewardAmount: true
      }
    });

    return result._sum.rewardAmount || 0;
  }

  async getTotalAdViewsCountByUser(userId: string): Promise<number> {
    try {
      const count = await prisma.adView.count({
        where: {
          userId,
          completed: true
        }
      });
      return count || 0;
    } catch (error) {
      console.error('Error getting total ad views count:', error);
      return 0;
    }
  }

  async markAdCompleted(id: number, rewardAmount: number = 0): Promise<AdView | null> {
    try {
      const updatedAdView = await prisma.adView.update({
        where: { id },
        data: {
          completed: true,
          completedAt: new Date(),
          rewardAmount
        }
      });
      return updatedAdView;
    } catch (error) {
      console.warn(`Ad view with ID ${id} not found for completion.`);
      return null;
    }
  }
}

export const adSystemStorage = new AdSystemStorage();