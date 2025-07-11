import { PrismaClient, SponsorshipDeal, StadiumRevenue } from '../../generated/prisma';

const prisma = new PrismaClient();

export class SponsorshipStorage {
  async createSponsorshipDeal(dealData: {
    teamId: number;
    sponsorName: string;
    dealType: string;
    value: bigint;
    duration: number;
    status?: string;
    bonusConditions?: any;
  }): Promise<SponsorshipDeal> {
    const signedDate = new Date();
    const expiryDate = new Date(signedDate.getFullYear() + dealData.duration, signedDate.getMonth(), signedDate.getDate());

    const newDeal = await prisma.sponsorshipDeal.create({
      data: {
        teamId: dealData.teamId,
        sponsorName: dealData.sponsorName,
        dealType: dealData.dealType,
        value: dealData.value,
        duration: dealData.duration,
        remainingYears: dealData.duration,
        status: dealData.status || 'active',
        signedDate,
        expiryDate,
        bonusConditions: dealData.bonusConditions || {},
      },
      include: {
        team: { select: { name: true } }
      }
    });
    return newDeal;
  }

  async getSponsorshipDealById(id: number): Promise<SponsorshipDeal | null> {
    const deal = await prisma.sponsorshipDeal.findUnique({
      where: { id },
      include: {
        team: { select: { name: true } }
      }
    });
    return deal;
  }

  async getSponsorshipsByTeam(teamId: number, activeOnly: boolean = true): Promise<SponsorshipDeal[]> {
    return await prisma.sponsorshipDeal.findMany({
      where: {
        teamId,
        ...(activeOnly ? { status: 'active' } : {})
      },
      include: {
        team: { select: { name: true } }
      },
      orderBy: { value: 'desc' }
    });
  }

  async updateSponsorshipDeal(id: number, updates: Partial<SponsorshipDeal>): Promise<SponsorshipDeal | null> {
    try {
      const updatedDeal = await prisma.sponsorshipDeal.update({
        where: { id },
        data: { ...updates, updatedAt: new Date() },
        include: {
          team: { select: { name: true } }
        }
      });
      return updatedDeal;
    } catch (error) {
      console.warn(`Sponsorship deal with ID ${id} not found for update.`);
      return null;
    }
  }

  // Stadium Revenue Operations
  async createStadiumRevenue(revenueData: {
    teamId: number;
    gameId?: number;
    ticketSales: bigint;
    concessions: bigint;
    parking: bigint;
    merchandise: bigint;
    vipSuites: bigint;
    totalRevenue: bigint;
    attendanceCount: number;
  }): Promise<StadiumRevenue> {
    const newRevenue = await prisma.stadiumRevenue.create({
      data: {
        teamId: revenueData.teamId,
        gameId: revenueData.gameId,
        ticketSales: revenueData.ticketSales,
        concessions: revenueData.concessions,
        parking: revenueData.parking,
        merchandise: revenueData.merchandise,
        vipSuites: revenueData.vipSuites,
        totalRevenue: revenueData.totalRevenue,
        attendanceCount: revenueData.attendanceCount,
      },
      include: {
        team: { select: { name: true } },
        game: { select: { homeTeamId: true, awayTeamId: true } }
      }
    });
    return newRevenue;
  }

  async getStadiumRevenueByTeam(teamId: number, limit: number = 50): Promise<StadiumRevenue[]> {
    return await prisma.stadiumRevenue.findMany({
      where: { teamId },
      include: {
        team: { select: { name: true } },
        game: { select: { homeTeamId: true, awayTeamId: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}

export const sponsorshipStorage = new SponsorshipStorage();