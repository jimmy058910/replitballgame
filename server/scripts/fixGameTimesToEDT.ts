#!/usr/bin/env tsx

/**
 * FIX ALL GAME TIMES TO PROPER EDT - Critical Alpha Readiness Script
 * 
 * This script fixes the fundamental timezone issue where games were created with
 * local system time instead of proper Eastern Time (EDT/EST).
 * 
 * ISSUE: Games showing as 12:00 AM because they're stored as UTC midnight
 * SOLUTION: Update all games to have proper 4PM-10PM EDT times
 */

import { PrismaClient } from '../../prisma/generated/client/index.js';
import { TimezoneService } from '../services/timezoneService.js';

const prisma = new PrismaClient();

interface GameToFix {
  id: number;
  gameDate: Date;
  homeTeam: { name: string };
  awayTeam: { name: string };
  matchType: string;
}

async function fixAllGameTimes() {
  console.log('🕐 === FIXING ALL GAME TIMES TO PROPER EDT ===');
  console.log('');
  
  try {
    // Get current server time info for debugging
    const timeInfo = TimezoneService.getServerTimeInfo();
    console.log('🌍 Server Time Information:');
    console.log(`  System Time: ${timeInfo.systemTimezone} ${timeInfo.systemTime.toISOString()}`);
    console.log(`  UTC Time: ${timeInfo.utcTime.toISOString()}`);
    console.log(`  EDT Time: ${timeInfo.edtFormatted}`);
    console.log(`  League Game Window: ${timeInfo.gameWindowHours}`);
    console.log('');

    // Get all games that need fixing
    console.log('📋 Finding all games that need time fixes...');
    const allGames = await prisma.game.findMany({
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });

    console.log(`📊 Found ${allGames.length} total games to analyze`);
    console.log('');

    // Categorize games by their current times
    const gamesByHour = new Map<number, GameToFix[]>();
    const gamesWithValidTimes: GameToFix[] = [];
    const gamesWithInvalidTimes: GameToFix[] = [];

    for (const game of allGames) {
      const edtTime = TimezoneService.convertToEDT(game.gameDate);
      const hour = edtTime.hour();
      
      if (!gamesByHour.has(hour)) {
        gamesByHour.set(hour, []);
      }
      gamesByHour.get(hour)!.push(game as GameToFix);

      if (TimezoneService.isValidLeagueGameTime(game.gameDate)) {
        gamesWithValidTimes.push(game as GameToFix);
      } else {
        gamesWithInvalidTimes.push(game as GameToFix);
      }
    }

    // Show current time distribution
    console.log('🕐 Current Game Time Distribution (EDT):');
    Array.from(gamesByHour.entries()).sort().forEach(([hour, games]) => {
      const timeStr = `${hour.toString().padStart(2, '0')}:xx`;
      const isValid = hour >= 16 && hour < 22; // 4PM-10PM
      const status = isValid ? '✅' : '❌';
      console.log(`  ${status} ${timeStr}: ${games.length} games`);
    });
    
    console.log('');
    console.log(`✅ Games with valid times (4PM-10PM EDT): ${gamesWithValidTimes.length}`);
    console.log(`❌ Games with invalid times: ${gamesWithInvalidTimes.length}`);
    console.log('');

    if (gamesWithInvalidTimes.length === 0) {
      console.log('🎉 All games already have proper EDT times! No fixes needed.');
      return;
    }

    // Fix invalid games
    console.log('🔧 FIXING GAMES WITH INVALID TIMES...');
    console.log('');

    let fixedCount = 0;
    const targetTimes = [16, 17, 18, 19]; // 4PM, 5PM, 6PM, 7PM EDT

    for (const game of gamesWithInvalidTimes) {
      const originalEDT = TimezoneService.convertToEDT(game.gameDate);
      
      // Determine which time slot this game should have
      // Use a simple rotation based on game ID to distribute games across available slots
      const timeSlotIndex = (game.id % targetTimes.length);
      const targetHour = targetTimes[timeSlotIndex];
      const targetMinute = 0; // Start all games at the top of the hour
      
      // Create the corrected EDT time
      const correctedDate = TimezoneService.createEDTTime(game.gameDate, targetHour, targetMinute);
      
      // Update the game in the database
      await prisma.game.update({
        where: { id: game.id },
        data: { gameDate: correctedDate }
      });
      
      const correctedEDT = TimezoneService.convertToEDT(correctedDate);
      
      console.log(`  ✅ Game ${game.id}: ${game.homeTeam.name} vs ${game.awayTeam.name}`);
      console.log(`     Before: ${originalEDT.format('YYYY-MM-DD h:mm A z')}`);
      console.log(`     After:  ${correctedEDT.format('YYYY-MM-DD h:mm A z')}`);
      console.log('');
      
      fixedCount++;
    }

    console.log(`🎉 Successfully fixed ${fixedCount} games!`);
    console.log('');

    // Verify the fixes
    console.log('🔍 Verifying fixes...');
    const updatedGames = await prisma.game.findMany({
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });

    const updatedGamesByHour = new Map<number, number>();
    let validGameCount = 0;

    for (const game of updatedGames) {
      const edtTime = TimezoneService.convertToEDT(game.gameDate);
      const hour = edtTime.hour();
      
      updatedGamesByHour.set(hour, (updatedGamesByHour.get(hour) || 0) + 1);
      
      if (TimezoneService.isValidLeagueGameTime(game.gameDate)) {
        validGameCount++;
      }
    }

    console.log('');
    console.log('🕐 Updated Game Time Distribution (EDT):');
    Array.from(updatedGamesByHour.entries()).sort().forEach(([hour, count]) => {
      const timeStr = `${hour.toString().padStart(2, '0')}:xx`;
      const isValid = hour >= 16 && hour < 22; // 4PM-10PM
      const status = isValid ? '✅' : '❌';
      console.log(`  ${status} ${timeStr}: ${count} games`);
    });

    console.log('');
    console.log(`✅ Total games with valid EDT times: ${validGameCount}/${updatedGames.length}`);
    
    if (validGameCount === updatedGames.length) {
      console.log('🎉 ALL GAMES NOW HAVE PROPER EDT TIMES!');
      console.log('🚀 Alpha testing is now ready - game times will display correctly!');
    } else {
      console.log(`⚠️  Still have ${updatedGames.length - validGameCount} games with invalid times.`);
    }

  } catch (error) {
    console.error('❌ Error fixing game times:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixAllGameTimes().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { fixAllGameTimes };