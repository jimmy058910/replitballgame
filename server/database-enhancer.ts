/**
 * Database Enhancement Service
 * This service adds real database functionality to the ultra-minimal server
 * after it has successfully started and is serving traffic.
 */

import { PrismaClient } from "./db";

export class DatabaseEnhancer {
  private static instance: DatabaseEnhancer;
  private prisma: PrismaClient | null = null;
  private isConnected = false;

  static getInstance(): DatabaseEnhancer {
    if (!DatabaseEnhancer.instance) {
      DatabaseEnhancer.instance = new DatabaseEnhancer();
    }
    return DatabaseEnhancer.instance;
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing database enhancer...');
      
      if (!process.env.DATABASE_URL) {
        console.log('📝 No database URL configured, skipping database enhancement');
        return;
      }

      this.prisma = new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_URL } },
        log: ['error'],
        errorFormat: 'minimal'
      });

      // Test connection with timeout
      await Promise.race([
        this.prisma.$connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout')), 10000)
        )
      ]);

      await this.prisma.$queryRaw`SELECT 1 as test`;
      
      this.isConnected = true;
      console.log('✅ Database enhancer connected');
      
    } catch (error) {
      console.error('⚠️ Database enhancer failed to connect:', error);
      this.isConnected = false;
    }
  }

  async enhanceApiRoutes(app: any): Promise<void> {
    if (!this.isConnected || !this.prisma) {
      console.log('📝 Database not connected, keeping hardcoded API responses');
      return;
    }

    console.log('🔄 Enhancing API routes with database functionality...');

    // Enhanced team endpoint
    app.get('/api/teams/my', async (req: any, res: any) => {
      try {
        const teams = await this.prisma!.team.findMany({ take: 1 });
        if (teams.length === 0) {
          res.json({ needsTeamCreation: true });
        } else {
          res.json(teams[0]);
        }
      } catch (error) {
        console.error('Database error in /api/teams/my:', error);
        res.json({ needsTeamCreation: true });
      }
    });

    // Enhanced season endpoint
    app.get('/api/season/current-cycle', async (req: any, res: any) => {
      try {
        const season = await this.prisma!.season.findFirst({
          orderBy: { startDate: 'desc' }
        });
        
        if (season) {
          res.json({ 
            currentDay: season?.currentDay, 
            seasonNumber: season.seasonNumber, 
            phase: season.phase,
            status: 'active' 
          });
        } else {
          res.json({ 
            currentDay: 1, 
            seasonNumber: 1, 
            phase: 'REGULAR_SEASON',
            status: 'initializing' 
          });
        }
      } catch (error) {
        console.error('Database error in /api/season/current-cycle:', error);
        res.json({ 
          currentDay: 1, 
          seasonNumber: 1, 
          phase: 'REGULAR_SEASON',
          status: 'error' 
        });
      }
    });

    // Enhanced matches endpoint
    app.get('/api/matches/live', async (req: any, res: any) => {
      try {
        const liveMatches = await this.prisma!.game.findMany({
          where: { status: 'IN_PROGRESS' },
          take: 5
        });
        res.json(liveMatches);
      } catch (error) {
        console.error('Database error in /api/matches/live:', error);
        res.json([]);
      }
    });

    // Enhanced exhibitions endpoint
    app.get('/api/exhibitions/stats', async (req: any, res: any) => {
      try {
        const exhibitionCount = await this.prisma!.game.count({
          where: { matchType: 'EXHIBITION' }
        });
        
        res.json({ 
          totalExhibitions: exhibitionCount,
          wins: 0,
          losses: 0,
          gamesPlayedToday: 0
        });
      } catch (error) {
        console.error('Database error in /api/exhibitions/stats:', error);
        res.json({ totalExhibitions: 0, wins: 0, losses: 0, gamesPlayedToday: 0 });
      }
    });

    // Enhanced database status endpoint
    app.get('/api/db-status', async (req: any, res: any) => {
      try {
        await this.prisma!.$queryRaw`SELECT 1 as test`;
        res.json({ status: 'connected', timestamp: new Date().toISOString() });
      } catch (error) {
        res.status(500).json({ 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    console.log('✅ API routes enhanced with database functionality');
  }

  async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.isConnected = false;
      console.log('✅ Database enhancer disconnected');
    }
  }
}