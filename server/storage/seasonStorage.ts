import { getPrismaClient } from '../database.js';

export class SeasonStorage {

  // Season Operations
  async createSeason(seasonData: {
    name: string;
    year: number;
    phase?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    const prisma = await getPrismaClient();
    // Use Prisma's safe create method instead of raw SQL
    const result = await prisma.season.create({
      data: {
        id: `season-${seasonData.year}-${Date.now()}`,
        seasonNumber: seasonData.year,
        phase: seasonData.phase || 'REGULAR_SEASON' as any,
        startDate: seasonData.startDate || new Date(),
        endDate: seasonData.endDate,
        currentDay: 1,
        createdAt: new Date()
      }
    });
    return result;
  }

  async getSeasonById(id: string): Promise<any | null> {
    const prisma = await getPrismaClient();
    // FIX: Use Prisma's safe findUnique instead of raw SQL with template literals
    const season = await prisma.season.findUnique({
      where: { id: id }
    });
    return season;
  }

  async getCurrentSeason(): Promise<any | null> {
    try {
      console.log('Attempting to find current season...');
      const prisma = await getPrismaClient();
      // Use Prisma's safe findFirst instead of raw SQL
      const season = await prisma.season.findFirst({
        orderBy: { startDate: 'desc' }
      });
      console.log('Found season:', season);
      return season;
    } catch (error) {
      console.error('Error finding current season:', error);
      return null;
    }
  }

  async getLatestSeasonOverall(): Promise<any | null> {
    const prisma = await getPrismaClient();
    // Use Prisma's safe findFirst instead of raw SQL
    const season = await prisma.season.findFirst({
      orderBy: [
        { year: 'desc' },
        { startDate: 'desc' }
      ]
    });
    return season;
  }

  async updateSeason(id: string, updates: any): Promise<any | null> {
    try {
      const prisma = await getPrismaClient();
      // FIX: Use Prisma's safe update method instead of raw SQL with dynamic SET clauses
      const validUpdateFields = ['seasonNumber', 'phase', 'startDate', 'endDate', 'currentDay'];
      const safeUpdates: any = {};
      
      // Validate and sanitize update fields
      Object.keys(updates).forEach(key => {
        if (validUpdateFields.includes(key)) {
          safeUpdates[key] = updates[key];
        }
      });
      
      const updatedSeason = await prisma.season.update({
        where: { id: id },
        data: {
          ...safeUpdates,
          updatedAt: new Date()
        }
      });
      
      return updatedSeason;
    } catch (error) {
      console.warn(`Season with ID ${id} not found for update.`);
      return null;
    }
  }

  async getChampionshipHistory(limit: number = 10): Promise<any[]> {
    const prisma = await getPrismaClient();
    // FIX: Use Prisma's safe query methods instead of raw SQL with template literals
    const validLimit = Math.min(Math.max(1, Math.floor(limit)), 100); // Sanitize limit: 1-100
    
    const seasons = await prisma.season.findMany({
      where: {
        status: 'completed',
        endDate: { lt: new Date() }
      },
      orderBy: { year: 'desc' },
      take: validLimit
    });
    
    return seasons;
  }

}

export const seasonStorage = new SeasonStorage();
