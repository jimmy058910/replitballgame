import { getPrismaClient } from '../database.js';

/**
 * Bulletproof Standings Update Service
 * 
 * Automatically updates team standings when league games complete.
 * Simple, reliable, and efficient - only updates affected teams.
 */
export class StandingsUpdateService {
  
  /**
   * Updates standings for both teams when a league game completes
   * @param gameId - The completed game ID
   */
  static async updateStandingsForCompletedGame(gameId: number): Promise<void> {
    const prisma = await getPrismaClient();
    
    console.log(`🏆 [STANDINGS UPDATE] Processing completed game ${gameId}`);
    
    // Get the completed game with team info
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });
    
    if (!game) {
      console.log(`❌ [STANDINGS UPDATE] Game ${gameId} not found`);
      return;
    }
    
    // Only process COMPLETED LEAGUE games with valid scores
    if (game.matchType !== 'LEAGUE' || 
        game.status !== 'COMPLETED' || 
        game.homeScore === null || 
        game.awayScore === null) {
      console.log(`⏭️ [STANDINGS UPDATE] Game ${gameId} not eligible: matchType=${game.matchType}, status=${game.status}, scores=${game.homeScore}-${game.awayScore}`);
      return;
    }
    
    const homeScore = game.homeScore;
    const awayScore = game.awayScore;
    
    console.log(`🎮 [STANDINGS UPDATE] ${game.homeTeam.name} ${homeScore} - ${awayScore} ${game.awayTeam.name}`);
    
    // Determine winner and update standings
    if (homeScore > awayScore) {
      // Home team wins
      await this.incrementTeamWin(game.homeTeamId);
      await this.incrementTeamLoss(game.awayTeamId);
      console.log(`✅ [STANDINGS UPDATE] ${game.homeTeam.name} WIN, ${game.awayTeam.name} LOSS`);
      
    } else if (awayScore > homeScore) {
      // Away team wins  
      await this.incrementTeamWin(game.awayTeamId);
      await this.incrementTeamLoss(game.homeTeamId);
      console.log(`✅ [STANDINGS UPDATE] ${game.awayTeam.name} WIN, ${game.homeTeam.name} LOSS`);
      
    } else {
      // Draw - increment draws for both teams
      await this.incrementTeamDraw(game.homeTeamId);
      await this.incrementTeamDraw(game.awayTeamId);
      console.log(`✅ [STANDINGS UPDATE] ${game.homeTeam.name} and ${game.awayTeam.name} DRAW`);
    }
  }
  
  /**
   * Increment team wins and points (3 points for win)
   */
  private static async incrementTeamWin(teamId: number): Promise<void> {
    const prisma = await getPrismaClient();
    
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        wins: { increment: 1 },
        points: { increment: 3 }
      },
      select: { name: true, wins: true, losses: true, points: true }
    });
    
    console.log(`🏆 [WIN] ${updatedTeam.name}: ${updatedTeam.wins}W-${updatedTeam.losses}L = ${updatedTeam.points} points`);
  }
  
  /**
   * Increment team losses
   */
  private static async incrementTeamLoss(teamId: number): Promise<void> {
    const prisma = await getPrismaClient();
    
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        losses: { increment: 1 }
      },
      select: { name: true, wins: true, losses: true, points: true }
    });
    
    console.log(`😞 [LOSS] ${updatedTeam.name}: ${updatedTeam.wins}W-${updatedTeam.losses}L = ${updatedTeam.points} points`);
  }
  
  /**
   * Increment team draws and points (1 point for draw)
   */
  private static async incrementTeamDraw(teamId: number): Promise<void> {
    const prisma = await getPrismaClient();
    
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        draws: { increment: 1 },
        points: { increment: 1 }
      },
      select: { name: true, wins: true, losses: true, draws: true, points: true }
    });
    
    console.log(`🤝 [DRAW] ${updatedTeam.name}: ${updatedTeam.wins}W-${updatedTeam.draws || 0}D-${updatedTeam.losses}L = ${updatedTeam.points} points`);
  }
  
  /**
   * Hook function to be called whenever a game is marked as completed
   * @param gameId - The game that was just completed
   */
  static async onGameCompleted(gameId: number): Promise<void> {
    try {
      await this.updateStandingsForCompletedGame(gameId);
    } catch (error) {
      console.error(`❌ [STANDINGS UPDATE] Error updating standings for game ${gameId}:`, error);
    }
  }
}