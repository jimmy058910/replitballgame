#!/usr/bin/env node

/**
 * SCHEDULE RESET SCRIPT
 * Resets games for Days 9-14 back to SCHEDULED status with proper future dates
 * Allows normal progression testing to continue
 */

import { getPrismaClient } from '../server/database.ts';

async function resetSchedule() {
  console.log('🔧 [SCHEDULE RESET] Starting schedule reset for Days 9-14...');
  
  try {
    const prisma = await getPrismaClient();
    
    // Get current season to understand the timing
    const currentSeason = await prisma.season.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!currentSeason) {
      console.error('❌ [SCHEDULE RESET] No active season found');
      return;
    }
    
    console.log(`📊 [SCHEDULE RESET] Current season: ${currentSeason.seasonNumber}, Day: ${currentSeason.currentDay}`);
    console.log(`📅 [SCHEDULE RESET] Season started: ${currentSeason.startDate}`);
    
    // Find all games for Days 8-14 that were completed with wrong simulation
    const gamesToReset = await prisma.game.findMany({
      where: {
        gameDay: { gte: 8, lte: 14 },
        status: 'COMPLETED',
        scheduleId: { not: null } // Only regular league games
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      }
    });
    
    console.log(`🎯 [SCHEDULE RESET] Found ${gamesToReset.length} games to reset (Days 8-14)`);
    console.log('💡 [SCHEDULE RESET] This will fix both Day 8 wrong scoring AND Days 9-14 premature simulation');
    
    if (gamesToReset.length === 0) {
      console.log('✅ [SCHEDULE RESET] No games need resetting - schedule is already correct');
      return;
    }
    
    // Calculate proper future dates for each day
    const seasonStart = new Date(currentSeason.startDate);
    const resetResults = [];
    
    for (const game of gamesToReset) {
      try {
        // Calculate when this game day should occur (3AM EDT boundaries)
        const gameDayDate = new Date(seasonStart);
        gameDayDate.setDate(seasonStart.getDate() + (game.gameDay - 1));
        
        if (game.gameDay === 8) {
          // For Day 8: Set to past time so it gets simulated correctly by smart progression
          gameDayDate.setHours(15, 0, 0, 0); // 3 PM that day (in the past)
        } else {
          // For Days 9-14: Set to future times for proper scheduling
          gameDayDate.setHours(19, 0, 0, 0); // 7 PM EDT that day
        }
        
        // Reset the game to SCHEDULED status
        const updatedGame = await prisma.game.update({
          where: { id: game.id },
          data: {
            status: 'SCHEDULED',
            homeScore: null,
            awayScore: null,
            gameDate: gameDayDate
          }
        });
        
        console.log(`✅ [SCHEDULE RESET] Day ${game.gameDay}: ${game.homeTeam.name} vs ${game.awayTeam.name} → ${gameDayDate.toLocaleString('en-US', { timeZone: 'America/New_York' })} EDT`);
        
        resetResults.push({
          gameId: game.id,
          gameDay: game.gameDay,
          teams: `${game.homeTeam.name} vs ${game.awayTeam.name}`,
          newDate: gameDayDate
        });
        
      } catch (gameError) {
        console.error(`❌ [SCHEDULE RESET] Failed to reset game ${game.id}:`, gameError.message);
      }
    }
    
    // Summary
    console.log(`\n🏆 [SCHEDULE RESET] Successfully reset ${resetResults.length} games`);
    console.log('📅 [SCHEDULE RESET] Games by day:');
    
    const gamesByDay = resetResults.reduce((acc, game) => {
      if (!acc[game.gameDay]) acc[game.gameDay] = 0;
      acc[game.gameDay]++;
      return acc;
    }, {});
    
    Object.keys(gamesByDay).forEach(day => {
      console.log(`   Day ${day}: ${gamesByDay[day]} games reset`);
    });
    
    console.log('\n✅ [SCHEDULE RESET] Schedule reset complete! Normal progression can now continue.');
    console.log('🎮 [SCHEDULE RESET] The automation system will now properly simulate games as each day arrives.');
    
  } catch (error) {
    console.error('❌ [SCHEDULE RESET] Failed to reset schedule:', error);
    throw error;
  }
}

// Run the script
resetSchedule().catch(error => {
  console.error('💥 [SCHEDULE RESET] Script failed:', error);
  process.exit(1);
});