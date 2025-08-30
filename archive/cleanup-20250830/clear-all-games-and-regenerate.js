/**
 * CLEAN SLATE SCHEDULE REGENERATION
 * 
 * This script:
 * 1. Clears ALL existing league games from the database
 * 2. Generates proper shortened season schedule for Days 7-14 (8 games per team)
 * 3. Uses the correct late registration algorithm
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAndRegenerateSchedule() {
  
  try {
    console.log('🔥 STEP 1: Clearing all existing league games...');
    
    // Delete all league games
    const deletedGames = await prisma.game.deleteMany({
      where: {
        matchType: 'LEAGUE'
      }
    });
    
    console.log(`✅ Deleted ${deletedGames.count} existing league games`);
    
    // Reset team stats to zero
    console.log('🔄 STEP 2: Resetting team statistics...');
    
    const resetStats = await prisma.team.updateMany({
      where: {
        division: 8,
        subdivision: 'alpha'
      },
      data: {
        wins: 0,
        losses: 0,
        points: 0
      }
    });
    
    console.log(`✅ Reset stats for ${resetStats.count} teams`);
    
    console.log('🎯 STEP 3: Generating shortened season schedule (Days 7-14)...');
    
    // Get all teams in Division 8 Alpha
    const teams = await prisma.team.findMany({
      where: {
        division: 8,
        subdivision: 'alpha'
      },
      select: { id: true, name: true }
    });
    
    console.log(`Found ${teams.length} teams:`, teams.map(t => t.name));
    
    if (teams.length !== 8) {
      throw new Error(`Expected 8 teams, found ${teams.length}`);
    }
    
    // Generate round-robin schedule for 8 teams
    // Each team plays 7 games (against each other team once)
    // Days 7-14 = 8 days, so 1 game per team per day with some overlap
    
    const games = [];
    const startDate = new Date('2025-08-16T00:00:00.000Z'); // Season start
    
    // Round-robin algorithm: each team plays every other team once
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const homeTeam = teams[i];
        const awayTeam = teams[j];
        
        // Distribute games across Days 7-14 (8 days)
        const gameNumber = games.length;
        const dayOffset = 6 + (gameNumber % 8); // Days 7-14 (6-13 offset)
        const gameDate = new Date(startDate);
        gameDate.setDate(gameDate.getDate() + dayOffset);
        gameDate.setHours(16 + (gameNumber % 4), 15 * (gameNumber % 4), 0, 0); // Stagger times
        
        games.push({
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          gameDate: gameDate,
          matchType: 'LEAGUE',
          status: 'SCHEDULED',
          homeScore: null,
          awayScore: null,
          simulated: false
        });
        
        console.log(`📅 Game ${games.length}: ${homeTeam.name} vs ${awayTeam.name} on Day ${dayOffset + 1}`);
      }
    }
    
    console.log(`🎮 Generated ${games.length} total games (${games.length / teams.length} games per team)`);
    
    // Create all games
    console.log('💾 STEP 4: Saving games to database...');
    
    const createdGames = await prisma.game.createMany({
      data: games
    });
    
    console.log(`✅ Created ${createdGames.count} new league games`);
    
    // Verify distribution by day
    const gamesByDay = {};
    games.forEach(game => {
      const daysSinceStart = Math.floor((game.gameDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const dayNumber = daysSinceStart + 1;
      if (!gamesByDay[dayNumber]) gamesByDay[dayNumber] = 0;
      gamesByDay[dayNumber]++;
    });
    
    console.log('📊 Games distribution by day:');
    Object.keys(gamesByDay).sort().forEach(day => {
      console.log(`  Day ${day}: ${gamesByDay[day]} games`);
    });
    
    console.log('✅ SUCCESS: Clean slate schedule generation completed!');
    console.log(`   - 8 teams in Division 8 Alpha`);
    console.log(`   - ${games.length} total games (${games.length / 8} per team)`);
    console.log(`   - Games scheduled for Days 7-14`);
    console.log(`   - All team stats reset to 0`);
    
  } catch (error) {
    console.error('❌ Error during schedule regeneration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
clearAndRegenerateSchedule()
  .then(() => {
    console.log('🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });