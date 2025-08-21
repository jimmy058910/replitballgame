/**
 * Force complete all overdue Day 6 games immediately
 */

import { getPrismaClient } from './server/database.ts';

async function forceCompleteOverdueGames() {
  try {
    console.log('🔥 Starting force completion of overdue games...');
    
    const prisma = await getPrismaClient();
    
    // Find all SCHEDULED games that should have been completed by now
    const now = new Date();
    const overdueGames = await prisma.game.findMany({
      where: {
        status: 'SCHEDULED',
        gameDate: {
          lt: now
        },
        matchType: 'LEAGUE'
      }
    });
    
    console.log(`🔥 Found ${overdueGames.length} overdue games to complete`);
    
    if (overdueGames.length === 0) {
      console.log('✅ No overdue games found - all games are up to date');
      return;
    }
    
    let completedCount = 0;
    
    for (const game of overdueGames) {
      try {
        // Generate random scores (simulate the game instantly)
        const homeScore = Math.floor(Math.random() * 5) + 1; // 1-5 points
        const awayScore = Math.floor(Math.random() * 5) + 1; // 1-5 points
        
        await prisma.game.update({
          where: { id: game.id },
          data: {
            status: 'COMPLETED',
            homeScore: homeScore,
            awayScore: awayScore,
            simulated: true,
            simulationLog: `Game completed automatically at ${now.toISOString()} due to overdue status (${Math.floor((now.getTime() - game.gameDate.getTime()) / (1000 * 60))} minutes past due)`
          }
        });
        
        console.log(`✅ Completed overdue game ${game.id}: ${homeScore}-${awayScore} (was scheduled for ${game.gameDate.toISOString()})`);
        completedCount++;
      } catch (error) {
        console.error(`❌ Error completing game ${game.id}:`, error);
      }
    }
    
    console.log(`🎉 Successfully completed ${completedCount} out of ${overdueGames.length} overdue games`);
    
  } catch (error) {
    console.error('❌ Error force completing overdue games:', error);
  }
}

forceCompleteOverdueGames();