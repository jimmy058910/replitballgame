import { getPrismaClient } from "../database.js";

/**
 * Utility to fix games stuck in LIVE status
 */
export class MatchStatusFixer {
  
  /**
   * Get all games stuck in LIVE status
   */
  static async getStuckLiveGames() {
    const prisma = await getPrismaClient();
    
    const stuckGames = await prisma.game.findMany({
      where: { 
        status: 'IN_PROGRESS',
        // Games that have been IN_PROGRESS for more than 30 minutes are considered stuck
        // This allows for proper simulation time while catching truly stuck games
        createdAt: {
          lt: new Date(Date.now() - 30 * 60 * 1000)
        }
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return stuckGames;
  }
  
  /**
   * Fix stuck LIVE games by completing them with reasonable scores
   */
  static async fixStuckLiveGames() {
    const prisma = await getPrismaClient();
    
    console.log('🔧 [MATCH FIXER] Checking for stuck LIVE games...');
    
    const stuckGames = await this.getStuckLiveGames();
    
    if (stuckGames.length === 0) {
      console.log('✅ [MATCH FIXER] No stuck games found');
      return { fixed: 0, games: [] };
    }
    
    console.log(`🚨 [MATCH FIXER] Found ${stuckGames.length} stuck LIVE games`);
    
    const fixedGames = [];
    
    for (const game of stuckGames) {
      try {
        // Generate realistic scores (1-4 range)
        const homeScore = Math.floor(Math.random() * 4) + 1;
        const awayScore = Math.floor(Math.random() * 4) + 1;
        
        await prisma.game.update({
          where: { id: game.id },
          data: {
            status: 'COMPLETED',
            homeScore,
            awayScore,
            simulated: true,
            simulationLog: `Game auto-completed by system due to stuck LIVE status. Generated scores: ${homeScore}-${awayScore}.`
          }
        });
        
        console.log(`✅ [MATCH FIXER] Fixed game ${game.id}: ${game.homeTeam.name} ${homeScore}-${awayScore} ${game.awayTeam.name}`);
        
        fixedGames.push({
          id: game.id,
          homeTeam: game.homeTeam.name,
          awayTeam: game.awayTeam.name,
          homeScore,
          awayScore
        });
        
      } catch (error) {
        console.error(`❌ [MATCH FIXER] Failed to fix game ${game.id}:`, error);
      }
    }
    
    console.log(`🎯 [MATCH FIXER] Fixed ${fixedGames.length}/${stuckGames.length} stuck games`);
    
    return { fixed: fixedGames.length, games: fixedGames };
  }
  
  /**
   * Get tournament status and entries
   */
  static async getTournamentStatus(tournamentId: number) {
    const prisma = await getPrismaClient();
    
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        entries: {
          include: {
            team: { select: { name: true, isAI: true } }
          }
        },
        _count: { select: { entries: true } }
      }
    });
    
    return tournament;
  }
  
  /**
   * List recent tournaments
   */
  static async getRecentTournaments(limit: number = 10) {
    const prisma = await getPrismaClient();
    
    const tournaments = await prisma.tournament.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        _count: { select: { entries: true } }
      }
    });
    
    return tournaments;
  }
}