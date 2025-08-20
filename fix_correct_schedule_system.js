#!/usr/bin/env node

// CORRECT SCHEDULE SYSTEM FIX
// Days 5-14 (10 days), 4 matches per day, each team plays once daily

import { getPrismaClient } from './server/database.js';

async function fixCorrectScheduleSystem() {
  console.log('🔧 === CORRECT SCHEDULE SYSTEM FIX ===');
  
  const prisma = await getPrismaClient();
  
  try {
    // Get all teams in Division 8, Subdivision Alpha
    console.log('\n📋 Getting teams...');
    const teams = await prisma.team.findMany({
      where: {
        division: 8,
        subdivision: 'alpha'
      },
      select: {
        id: true,
        name: true
      }
    });
    
    console.log(`Found ${teams.length} teams:`);
    teams.forEach((team, i) => {
      console.log(`  ${i+1}. ${team.name} (ID: ${team.id})`);
    });
    
    if (teams.length !== 8) {
      throw new Error(`Expected exactly 8 teams, found ${teams.length}`);
    }
    
    // Clear existing games
    console.log('\n🧹 Clearing existing games...');
    const deletedGames = await prisma.game.deleteMany();
    console.log(`✅ Deleted ${deletedGames.count} existing games`);
    
    // Generate correct schedule: Days 5-14 (10 days)
    console.log('\n⚽ Generating correct schedule for Days 5-14...');
    
    const scheduledGames = [];
    const baseDate = new Date("2025-08-20");
    
    // For each day (Days 5-14)
    for (let day = 5; day <= 14; day++) {
      console.log(`\n📅 Generating Day ${day}...`);
      
      const gameDate = new Date(baseDate);
      gameDate.setDate(baseDate.getDate() + day - 1);
      
      // Create 4 matches where each team plays once
      // With 8 teams, we need to pair them: [1v2, 3v4, 5v6, 7v8]
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
      
      const dayMatches = [];
      for (let i = 0; i < 8; i += 2) {
        dayMatches.push({
          home: shuffledTeams[i],
          away: shuffledTeams[i + 1]
        });
      }
      
      console.log(`  Day ${day} matches:`);
      
      // Schedule the 4 matches with correct times
      dayMatches.forEach((match, timeSlot) => {
        // Times: 4:00, 4:15, 4:30, 4:45 PM
        const matchDate = new Date(gameDate);
        const startHour = 16; // 4 PM
        const startMinute = timeSlot * 15; // 0, 15, 30, 45 minutes
        
        matchDate.setHours(startHour, startMinute, 0, 0);
        
        const gameData = {
          leagueId: 8,
          homeTeamId: match.home.id,
          awayTeamId: match.away.id,
          gameDate: matchDate,
          status: 'SCHEDULED',
          matchType: 'LEAGUE'
        };
        
        scheduledGames.push(gameData);
        
        const timeStr = `${startHour}:${startMinute.toString().padStart(2, '0')}`;
        console.log(`    ${timeStr} - ${match.home.name} vs ${match.away.name}`);
      });
    }
    
    console.log(`\n📊 Schedule Summary:`);
    console.log(`  Days: 5-14 (10 days)`);
    console.log(`  Games per day: 4`);
    console.log(`  Total games: ${scheduledGames.length}`);
    console.log(`  Each team plays: once per day`);
    
    // Insert games into database
    console.log('\n💾 Inserting games into database...');
    await prisma.game.createMany({
      data: scheduledGames
    });
    
    console.log('✅ Schedule generation completed!');
    
    // Verify schedule
    console.log('\n🔍 Verifying schedule...');
    const verifyGames = await prisma.game.findMany({
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });
    
    // Group by day and verify
    const dayGroups = new Map();
    verifyGames.forEach(game => {
      const gameDate = new Date(game.gameDate);
      const dayOfSeason = Math.floor((gameDate - baseDate) / (1000 * 60 * 60 * 24)) + 1;
      
      if (!dayGroups.has(dayOfSeason)) {
        dayGroups.set(dayOfSeason, []);
      }
      dayGroups.get(dayOfSeason).push(game);
    });
    
    console.log('\nSchedule verification:');
    for (const [day, games] of dayGroups.entries()) {
      console.log(`  Day ${day}: ${games.length} games`);
      
      // Check that each team appears exactly once
      const teamsInDay = new Set();
      games.forEach(game => {
        teamsInDay.add(game.homeTeamId);
        teamsInDay.add(game.awayTeamId);
      });
      
      if (teamsInDay.size === 8) {
        console.log(`    ✅ All 8 teams play exactly once`);
      } else {
        console.log(`    ⚠️ Only ${teamsInDay.size} teams scheduled`);
      }
    }
    
    console.log('\n🎉 CORRECT SCHEDULE SYSTEM FIX COMPLETED!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the correct fix
fixCorrectScheduleSystem().catch(console.error);