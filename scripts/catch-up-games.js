#!/usr/bin/env node

/**
 * Comprehensive Game Catch-Up Script
 * 
 * This script handles the automation catch-up for overdue games.
 * It will:
 * 1. Check for overdue games on Days 8 and 9
 * 2. Simulate them using the proper game mechanics
 * 3. Update team standings and statistics
 * 4. Ensure the automation system is working for future games
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getPrismaClient } from '../server/database.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('🚀 Starting comprehensive game catch-up...');
  
  try {
    const prisma = await getPrismaClient();
    
    // Step 1: Check current season status
    console.log('\n📊 Checking current season status...');
    const currentSeason = await prisma.season.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!currentSeason) {
      console.error('❌ No active season found!');
      process.exit(1);
    }
    
    console.log(`✅ Found active season: Season ${currentSeason.seasonNumber}, Day ${currentSeason.currentDay}`);
    
    // Step 2: Find all overdue games
    console.log('\n🔍 Finding overdue scheduled games...');
    const overdueGames = await prisma.game.findMany({
      where: {
        status: 'SCHEDULED',
        scheduleId: { not: null },
        gameDay: { in: [8, 9] } // Focus on Days 8 and 9 as mentioned
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: [
        { gameDay: 'asc' },
        { gameDate: 'asc' }
      ]
    });
    
    console.log(`📋 Found ${overdueGames.length} overdue games:`);
    
    // Group by day for display
    const gamesByDay = overdueGames.reduce((acc, game) => {
      if (!acc[game.gameDay]) acc[game.gameDay] = [];
      acc[game.gameDay].push(game);
      return acc;
    }, {});
    
    for (const [day, games] of Object.entries(gamesByDay)) {
      console.log(`\n  Day ${day} (${games.length} games):`);
      games.forEach((game, index) => {
        const gameTime = new Date(game.gameDate).toLocaleString('en-US', { 
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        console.log(`    ${index + 1}. ${game.homeTeam.name} vs ${game.awayTeam.name} (${gameTime} EDT)`);
      });
    }
    
    if (overdueGames.length === 0) {
      console.log('✅ No overdue games found! The catch-up may have already been completed.');
      process.exit(0);
    }
    
    // Step 3: Import and use the automation services
    console.log('\n🎮 Starting game simulation process...');
    
    const { MatchSimulationService } = await import('../server/services/automation/matchSimulationService.js');
    const { QuickMatchSimulation } = await import('../server/services/quickMatchSimulation.js');
    
    let simulatedCount = 0;
    let errorCount = 0;
    
    // Process games day by day
    for (const [day, dayGames] of Object.entries(gamesByDay)) {
      console.log(`\n🏈 Processing Day ${day} (${dayGames.length} games)...`);
      
      for (let i = 0; i < dayGames.length; i++) {
        const game = dayGames[i];
        
        try {
          console.log(`  ⚡ [${i+1}/${dayGames.length}] Simulating: ${game.homeTeam.name} vs ${game.awayTeam.name}...`);
          
          // Update game status to IN_PROGRESS
          await prisma.game.update({
            where: { id: game.id },
            data: { 
              status: 'IN_PROGRESS',
              gameDate: new Date() // Start now
            }
          });
          
          // Run the actual simulation
          const simulationResult = await QuickMatchSimulation.runQuickSimulation(game.id.toString());
          
          // Update game with final results
          await prisma.game.update({
            where: { id: game.id },
            data: {
              status: 'COMPLETED',
              homeScore: simulationResult.finalScore.home,
              awayScore: simulationResult.finalScore.away
            }
          });
          
          console.log(`    ✅ Result: ${game.homeTeam.name} ${simulationResult.finalScore.home}-${simulationResult.finalScore.away} ${game.awayTeam.name}`);
          simulatedCount++;
          
        } catch (error) {
          console.error(`    ❌ Failed to simulate ${game.homeTeam.name} vs ${game.awayTeam.name}:`, error.message);
          
          // Revert game status back to SCHEDULED on failure
          try {
            await prisma.game.update({
              where: { id: game.id },
              data: { status: 'SCHEDULED' }
            });
          } catch (revertError) {
            console.error(`    ⚠️ Failed to revert game status: ${revertError.message}`);
          }
          
          errorCount++;
        }
      }
      
      console.log(`✅ Day ${day} completed: ${dayGames.length - errorCount} successes, ${errorCount} errors`);
    }
    
    // Step 4: Summary and automation check
    console.log('\n📊 CATCH-UP SUMMARY:');
    console.log(`✅ Games simulated successfully: ${simulatedCount}`);
    console.log(`❌ Games with errors: ${errorCount}`);
    
    if (errorCount > 0) {
      console.log('\n⚠️ Some games failed to simulate. Check the logs above for details.');
    }
    
    // Step 5: Check automation system status
    console.log('\n🔧 Checking automation system status...');
    
    try {
      const { SeasonTimingAutomationService } = await import('../server/services/seasonTimingAutomationService.js');
      const automationService = SeasonTimingAutomationService.getInstance();
      const status = automationService.getStatus();
      
      console.log(`🤖 Automation system status: ${status.isRunning ? '✅ RUNNING' : '❌ STOPPED'}`);
      
      if (!status.isRunning) {
        console.log('🔄 Attempting to start automation system...');
        await automationService.start();
        console.log('✅ Automation system started successfully');
      }
      
    } catch (autoError) {
      console.error('❌ Failed to check/start automation system:', autoError.message);
    }
    
    // Step 6: Final verification
    console.log('\n🔍 Final verification - checking for remaining scheduled games...');
    const remainingScheduled = await prisma.game.findMany({
      where: {
        status: 'SCHEDULED',
        scheduleId: { not: null },
        gameDay: { in: [8, 9] }
      }
    });
    
    if (remainingScheduled.length === 0) {
      console.log('🎉 SUCCESS: All overdue games have been caught up!');
    } else {
      console.log(`⚠️ WARNING: ${remainingScheduled.length} games still remain scheduled on Days 8-9`);
    }
    
    console.log('\n🏆 Catch-up process completed!');
    
  } catch (error) {
    console.error('❌ FATAL ERROR during catch-up process:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);