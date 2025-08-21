/**
 * Manual Game Simulation Trigger
 * Directly simulates today's scheduled games for immediate testing
 */

import { getPrismaClient } from './server/database.js';

async function simulateTodaysGames() {
  try {
    console.log('🎮 Starting manual game simulation for Day 6...');
    
    const prisma = await getPrismaClient();
    
    // Get current date range for Day 6 (today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log(`📅 Simulating games for: ${today.toISOString().split('T')[0]}`);
    
    // Find all scheduled games for today
    const scheduledGames = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: today,
          lt: tomorrow
        },
        status: 'SCHEDULED',
        matchType: 'LEAGUE'
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });
    
    console.log(`🎯 Found ${scheduledGames.length} scheduled games for today`);
    
    if (scheduledGames.length === 0) {
      console.log('ℹ️ No scheduled games found for today');
      return;
    }
    
    // Simple simulation logic for immediate results
    for (const game of scheduledGames) {
      const homeScore = Math.floor(Math.random() * 5) + 1; // 1-5 goals
      const awayScore = Math.floor(Math.random() * 5) + 1; // 1-5 goals
      
      await prisma.game.update({
        where: { id: game.id },
        data: {
          homeScore,
          awayScore,
          status: 'COMPLETED',
          simulated: true,
          simulationLog: `Simulated match: ${game.homeTeam.name} ${homeScore} - ${awayScore} ${game.awayTeam.name}`
        }
      });
      
      console.log(`⚽ COMPLETED: ${game.homeTeam.name} ${homeScore} - ${awayScore} ${game.awayTeam.name}`);
    }
    
    console.log(`✅ Successfully simulated ${scheduledGames.length} games!`);
    
  } catch (error) {
    console.error('❌ Game simulation failed:', error.message);
  } finally {
    process.exit(0);
  }
}

simulateTodaysGames();