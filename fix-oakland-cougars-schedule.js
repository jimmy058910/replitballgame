#!/usr/bin/env node

/**
 * Fix Oakland Cougars Schedule
 * 
 * CRITICAL ISSUE: Games are scheduled for Days 9-18 (Aug 24-Sep 2)
 * REQUIRED FIX: Move games to Days 5-14 (Aug 20-29)
 * 
 * This moves all Oakland Cougars games 4 days earlier to match late signup requirements
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOaklandCougarsSchedule() {
  console.log('🔧 FIXING Oakland Cougars Schedule - Moving games from Days 9-18 to Days 5-14...\n');
  
  try {
    // Find Oakland Cougars team
    const oaklandCougars = await prisma.team.findFirst({
      where: { name: 'Oakland Cougars' }
    });
    
    if (!oaklandCougars) {
      console.log('❌ Oakland Cougars team not found!');
      return;
    }
    
    console.log(`✅ Found Oakland Cougars team: ${oaklandCougars.id}`);
    
    // Find all games involving Oakland Cougars
    const cougarsGames = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: oaklandCougars.id },
          { awayTeamId: oaklandCougars.id }
        ],
        matchType: 'LEAGUE'
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });
    
    console.log(`\n📊 Found ${cougarsGames.length} Oakland Cougars games:`);
    
    // Calculate current day for each game (based on season start Aug 16)
    const seasonStart = new Date('2025-08-16T15:40:19.081Z'); // From database
    
    cougarsGames.forEach((game, index) => {
      const gameDate = new Date(game.gameDate);
      const daysDiff = Math.floor((gameDate - seasonStart) / (1000 * 60 * 60 * 24));
      const currentGameDay = daysDiff + 1;
      
      console.log(`  ${index + 1}. ${game.homeTeam.name} vs ${game.awayTeam.name}`);
      console.log(`     Current: ${gameDate.toISOString().split('T')[0]} (Day ${currentGameDay})`);
    });
    
    if (cougarsGames.length === 0) {
      console.log('❌ No Oakland Cougars games found!');
      return;
    }
    
    // Move games 4 days earlier (from Day 9+ to Day 5+)
    console.log('\n🔄 Moving games 4 days earlier...');
    
    const updates = [];
    
    for (const game of cougarsGames) {
      const currentDate = new Date(game.gameDate);
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 4); // Move 4 days earlier
      
      const daysDiff = Math.floor((newDate - seasonStart) / (1000 * 60 * 60 * 24));
      const newGameDay = daysDiff + 1;
      
      updates.push({
        gameId: game.id,
        oldDate: currentDate,
        newDate: newDate,
        newGameDay: newGameDay
      });
      
      console.log(`  📅 ${game.homeTeam.name} vs ${game.awayTeam.name}: Day ${newGameDay} (${newDate.toISOString().split('T')[0]})`);
    }
    
    // Apply the updates
    console.log('\n💾 Applying schedule updates...');
    
    for (const update of updates) {
      await prisma.game.update({
        where: { id: update.gameId },
        data: { gameDate: update.newDate }
      });
    }
    
    console.log(`\n✅ SUCCESS: Updated ${updates.length} Oakland Cougars games!`);
    console.log('📋 NEW SCHEDULE SUMMARY:');
    console.log(`   Games now run: Days 5-14 (Aug 20-29)`);
    console.log(`   First game: Today (Day 5 - Aug 20)`);
    console.log(`   Last game: Day 14 (Aug 29)`);
    console.log(`   Total games: ${updates.length}`);
    
    // Verify the fix
    console.log('\n🔍 VERIFICATION - Checking updated schedule...');
    const verifyGames = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: oaklandCougars.id },
          { awayTeamId: oaklandCougars.id }
        ],
        matchType: 'LEAGUE'
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });
    
    verifyGames.forEach((game, index) => {
      const gameDate = new Date(game.gameDate);
      const daysDiff = Math.floor((gameDate - seasonStart) / (1000 * 60 * 60 * 24));
      const gameDay = daysDiff + 1;
      
      console.log(`  ${index + 1}. Day ${gameDay}: ${game.homeTeam.name} vs ${game.awayTeam.name} (${gameDate.toISOString().split('T')[0]})`);
    });
    
    const firstGameDay = Math.floor((new Date(verifyGames[0].gameDate) - seasonStart) / (1000 * 60 * 60 * 24)) + 1;
    const lastGameDay = Math.floor((new Date(verifyGames[verifyGames.length-1].gameDate) - seasonStart) / (1000 * 60 * 60 * 24)) + 1;
    
    if (firstGameDay === 5 && lastGameDay === 14) {
      console.log('\n🎉 PERFECT! Oakland Cougars schedule is now correctly set for Days 5-14!');
    } else {
      console.log(`\n⚠️ WARNING: Games span Days ${firstGameDay}-${lastGameDay} instead of 5-14`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing Oakland Cougars schedule:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixOaklandCougarsSchedule()
  .then(() => {
    console.log('\n✅ Oakland Cougars schedule fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Oakland Cougars schedule fix failed:', error);
    process.exit(1);
  });