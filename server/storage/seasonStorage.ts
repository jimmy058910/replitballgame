import { getPrismaClient } from '../db';



export class SeasonStorage {

  // Season Operations
  async createSeason(seasonData: {
    name: string;
    year: number;
    phase?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    const result = await prisma.$executeRaw`
      INSERT INTO "Season" (id, "seasonNumber", phase, "startDate", "endDate", "currentDay", "createdAt")
      VALUES (${`season-${seasonData.year}-${Date.now()}`}, ${seasonData.year}, ${seasonData.phase || 'REGULAR_SEASON'}, ${seasonData.startDate || new Date()}, ${seasonData.endDate}, ${1}, NOW())
    `;
    return result;
  }

  async getSeasonById(id: string): Promise<any | null> {
    const seasons = await prisma.$queryRaw`
      SELECT * FROM "Season" WHERE id = ${id} LIMIT 1
    `;
    return (seasons as any[])[0] || null;
  }

  async getCurrentSeason(): Promise<any | null> {
    try {
      console.log('Attempting to find current season with raw SQL...');
      const seasons = await prisma.$queryRaw`
        SELECT * FROM "Season" ORDER BY "startDate" DESC LIMIT 1
      `;
      const season = (seasons as any[])[0] || null;
      console.log('Found season:', season);
      return season;
    } catch (error) {
      console.error('Error finding current season:', error);
      return null;
    }
  }

  async getLatestSeasonOverall(): Promise<any | null> {
    const seasons = await prisma.$queryRaw`
      SELECT * FROM "Season" ORDER BY year DESC, start_date DESC LIMIT 1
    `;
    return (seasons as any[])[0] || null;
  }

  async updateSeason(id: string, updates: any): Promise<any | null> {
    try {
      const setClause = Object.keys(updates)
        .map(key => `${key} = $${key}`)
        .join(', ');
      
      await prisma.$executeRaw`
        UPDATE "Season" SET ${setClause}, updated_at = NOW() WHERE id = ${id}
      `;
      
      return await this.getSeasonById(id);
    } catch (error) {
      console.warn(`Season with ID ${id} not found for update.`);
      return null;
    }
  }

  async getChampionshipHistory(limit: number = 10): Promise<any[]> {
    const seasons = await prisma.$queryRaw`
      SELECT * FROM "Season" WHERE status = 'completed' AND end_date < NOW()
      ORDER BY year DESC LIMIT ${limit}
    `;
    return seasons as any[];
  }

}

export const seasonStorage = new SeasonStorage();
