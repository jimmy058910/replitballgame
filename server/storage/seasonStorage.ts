import { PrismaClient, Season, SeasonPhase } from '../../generated/prisma';

const prisma = new PrismaClient();

export class SeasonStorage {

  // Season Operations
  async createSeason(seasonData: {
    seasonNumber: number;
    startDate?: Date;
    endDate?: Date;
    currentDay?: number;
    phase?: SeasonPhase;
  }): Promise<Season> {
    const newSeason = await prisma.season.create({
      data: {
        seasonNumber: seasonData.seasonNumber,
        startDate: seasonData.startDate || new Date(),
        endDate: seasonData.endDate || new Date(Date.now() + 17 * 24 * 60 * 60 * 1000), // 17 days from now
        currentDay: seasonData.currentDay || 1,
        phase: seasonData.phase || SeasonPhase.REGULAR_SEASON,
      },
    });
    return newSeason;
  }

  async getSeasonById(id: string): Promise<Season | null> {
    const season = await prisma.season.findUnique({
      where: { id },
    });
    return season;
  }

  async getCurrentSeason(): Promise<Season | null> {
    const season = await prisma.season.findFirst({
      where: { phase: { not: SeasonPhase.OFF_SEASON } },
      orderBy: { startDate: 'desc' }
    });
    return season;
  }

  async getLatestSeasonOverall(): Promise<Season | null> { // Renamed for clarity
    const season = await prisma.season.findFirst({
      orderBy: [
        { seasonNumber: 'desc' },
        { startDate: 'desc' }
      ]
    });
    return season;
  }

  async updateSeason(id: number, updates: Partial<Season>): Promise<Season | null> {
    try {
      const updatedSeason = await prisma.season.update({
        where: { id },
        data: updates
      });
      return updatedSeason;
    } catch (error) {
      console.warn(`Season with ID ${id} not found for update.`);
      return null;
    }
  }

  async getChampionshipHistory(limit: number = 10): Promise<Season[]> {
    return await prisma.season.findMany({
      where: {
        phase: SeasonPhase.OFF_SEASON,
        endDate: { lt: new Date() }
      },
      orderBy: { seasonNumber: 'desc' },
      take: limit
    });
  }


}

export const seasonStorage = new SeasonStorage();
