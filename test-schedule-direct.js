#!/usr/bin/env node

// Direct test of the new robust schedule generation algorithm
// This bypasses API routing issues and tests the core functionality

import { getPrismaClient } from './server/database.js';
import { ScheduleGenerationService } from './server/services/scheduleGenerationService.js';

async function testScheduleGeneration() {
  console.log('🧪 === DIRECT SCHEDULE GENERATION TEST ===');
  
  const prisma = await getPrismaClient();
  
  try {
    // Step 1: Clear all existing games
    console.log('🧹 Clearing existing games...');
    const deletedCount = await prisma.game.deleteMany({});
    console.log(`✅ Deleted ${deletedCount.count} existing games`);
    
    // Step 2: Reset team standings
    console.log('🔄 Resetting team standings...');
    const teamReset = await prisma.team.updateMany({
      data: {
        wins: 0,
        losses: 0,
        points: 0
      }
    });
    console.log(`✅ Reset ${teamReset.count} team standings`);
    
    // Step 3: Get Division 8 league (where all teams are assigned)
    console.log('🔍 Finding Division 8 league...');
    const league = await prisma.league.findFirst({
      where: { division: 8 },
      include: {
        teams: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!league || league.teams.length === 0) {
      console.log('Available leagues:');
      const allLeagues = await prisma.league.findMany({
        include: {
          teams: { select: { id: true, name: true } }
        }
      });
      allLeagues.forEach(l => {
        console.log(`  League ${l.id} (Division ${l.division}): ${l.teams.length} teams`);
      });
      throw new Error('Division 8 league not found or has no teams');
    }
    
    console.log(`📋 Testing with league: ${league.name} (${league.teams.length} teams)`);
    league.teams.forEach((team, i) => {
      console.log(`  ${i+1}. ${team.name} (ID: ${team.id})`);
    });
    
    // Step 4: Test the new robust schedule generation
    console.log('\n🚀 Generating schedule with robust algorithm...');
    const startTime = Date.now();
    
    const gamesCreated = await ScheduleGenerationService.generateLeagueSchedule(
      league.id.toString(), 
      league.teams
    );
    
    const endTime = Date.now();
    console.log(`⚡ Schedule generation completed in ${endTime - startTime}ms`);
    console.log(`✅ Created ${gamesCreated} games`);
    
    // Step 5: Analyze the results
    console.log('\n📊 === SCHEDULE QUALITY ANALYSIS ===');
    
    const createdGames = await prisma.game.findMany({
      where: { leagueId: league.id },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });
    
    console.log(`Database contains: ${createdGames.length} games for this league`);
    
    // Check for duplicates
    const matchups = new Map();
    let duplicates = 0;
    
    for (const game of createdGames) {
      const team1 = Math.min(game.homeTeamId, game.awayTeamId);
      const team2 = Math.max(game.homeTeamId, game.awayTeamId);
      const matchupKey = `${team1}-${team2}`;
      
      if (matchups.has(matchupKey)) {
        duplicates++;
        console.log(`🔴 DUPLICATE FOUND: ${game.homeTeam.name} vs ${game.awayTeam.name}`);
      } else {
        matchups.set(matchupKey, true);
      }
    }
    
    console.log(`\n📈 RESULTS:`);
    console.log(`   Total games: ${createdGames.length}`);
    console.log(`   Unique matchups: ${matchups.size}`);
    console.log(`   Duplicate matchups: ${duplicates}`);
    console.log(`   Quality: ${duplicates === 0 ? '✅ EXCELLENT' : '❌ NEEDS IMPROVEMENT'}`);
    
    // Show first few games as examples
    console.log('\n📅 Sample scheduled games:');
    createdGames.slice(0, 8).forEach((game, i) => {
      const date = new Date(game.gameDate);
      console.log(`   ${i+1}. ${game.homeTeam.name} vs ${game.awayTeam.name} - ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
    });
    
    console.log('\n🎉 Schedule generation test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testScheduleGeneration().catch(console.error);