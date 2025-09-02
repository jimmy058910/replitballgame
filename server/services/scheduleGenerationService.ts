import { getPrismaClient } from '../database.js';
import { logInfo } from './errorService.js';

/**
 * Schedule Generation Service for Realm Rivalry
 * 
 * Generates correct schedule for Division 8 Alpha:
 * - 40 total games across Days 5-14 (10 days)
 * - 4 games per day, each team plays once per day
 * - Times: 4:00, 4:15, 4:30, 4:45 PM EDT
 * - Each team in 8-team subdivision
 */
export class ScheduleGenerationService {
  
  /**
   * Generate complete schedule for Division 8 Alpha (Main Function)
   */
  static async generateCompleteSchedule(): Promise<{
    totalMatches: number;
    daysScheduled: number;
    error?: string;
  }> {
    try {
      const prisma = await getPrismaClient();
      
      // Clear existing games
      await prisma.game.deleteMany();
      logInfo('Cleared existing games');
      
      // Get all teams in Division 7, Subdivision Alpha
      const teams = await prisma.team.findMany({
        where: {
          division: 7,
          subdivision: 'alpha'
        },
        select: {
          id: true,
          name: true
        }
      });
      
      logInfo(`Found ${teams.length} teams in Division 7 Alpha`);
      
      if (teams.length !== 8) {
        throw new Error(`Expected exactly 8 teams in Division 7 Alpha, found ${teams.length}`);
      }
      
      // Generate schedule for Days 5-14
      const scheduledGames = await this.generateDivisionSchedule(teams);
      
      return {
        totalMatches: scheduledGames,
        daysScheduled: 10
      };
      
    } catch (error) {
      logInfo(`Schedule generation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        totalMatches: 0,
        daysScheduled: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Generate schedule for Division 7 Alpha - 56 games across Days 5-14
   */
  static async generateDivisionSchedule(teams: any[]): Promise<number> {
    const prisma = await getPrismaClient();
    
    if (teams.length !== 8) {
      throw new Error(`Division schedule requires exactly 8 teams, got ${teams.length}`);
    }
    
    logInfo(`Generating complete schedule for Days 5-14 with 8 teams`);
    
    const scheduledGames = [];
    const baseDate = new Date("2025-08-20");
    
    // For each day (Days 5-14)
    for (let day = 5; day <= 14; day++) {
      logInfo(`Generating Day ${day} schedule...`);
      
      const gameDate = new Date(baseDate);
      gameDate.setDate(baseDate.getDate() + day - 1);
      
      // Create 4 matches where each team plays once
      // With 8 teams, we need to pair them: [1v2, 3v4, 5v6, 7v8]
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
      
      const dayMatches = [];
      for (let i = 0; i < 8; i += 2) {
        dayMatches.push({
          home: shuffledTeams[i],
          away: shuffledTeams[i + 1]
        });
      }
      
      // Schedule the 4 matches with correct times
      for (let timeSlot = 0; timeSlot < dayMatches.length; timeSlot++) {
        const match = dayMatches[timeSlot];
        
        // Times: 4:00, 4:15, 4:30, 4:45 PM EDT
        const matchDate = new Date(gameDate);
        const startHour = 16; // 4 PM
        const startMinute = timeSlot * 15; // 0, 15, 30, 45 minutes
        
        matchDate.setHours(startHour, startMinute, 0, 0);
        
        const gameData = {
          homeTeamId: match.home.id,
          awayTeamId: match.away.id,
          gameDate: matchDate,
          matchType: 'LEAGUE' as const,
          status: 'SCHEDULED' as const,
          homeScore: 0,
          awayScore: 0
        };
        
        scheduledGames.push(gameData);
      }
    }
    
    // Insert all games into database
    if (scheduledGames.length > 0) {
      await prisma.game.createMany({
        data: scheduledGames
      });
    }
    
    logInfo(`Successfully generated ${scheduledGames.length} games for Days 5-14`);
    return scheduledGames.length;
  }
}