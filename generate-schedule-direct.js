#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

async function generateCompleteSchedule() {
  console.log('🔧 === GENERATING COMPLETE SCHEDULE FOR DAYS 5-14 ===');
  
  const prisma = new PrismaClient();
  
  try {
    // Get all teams in Division 8, Subdivision Alpha
    console.log('\n📋 Getting teams in Division 8, Subdivision Alpha...');
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
    
    // Generate complete schedule: Days 5-14 (10 days)
    console.log('\n⚽ Generating complete schedule for Days 5-14...');
    
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
      dayMatches.forEach(match => {
        console.log(`    ${match.home.name} vs ${match.away.name}`);
      });
      
      // Schedule the 4 matches with correct times (4:00, 4:15, 4:30, 4:45 PM EDT)
      for (let timeSlot = 0; timeSlot < dayMatches.length; timeSlot++) {
        const match = dayMatches[timeSlot];
        
        // Times: 4:00, 4:15, 4:30, 4:45 PM EDT
        const matchDate = new Date(gameDate);
        const startHour = 16; // 4 PM
        const startMinute = timeSlot * 15; // 0, 15, 30, 45 minutes
        
        matchDate.setHours(startHour, startMinute, 0, 0);
        
        const gameData = {
          homeTeamId: match.home.id,
          awayTeamId: match.away.id,
          gameDate: matchDate,
          matchType: 'LEAGUE',
          status: 'SCHEDULED',
          homeScore: 0,
          awayScore: 0
        };
        
        const createdGame = await prisma.game.create({ data: gameData });
        scheduledGames.push(createdGame);
        
        console.log(`    ✅ ${match.home.name} vs ${match.away.name} at ${matchDate.toLocaleString('en-US', { 
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric', 
          hour: 'numeric',
          minute: '2-digit',
          hour12: true 
        })} EDT`);
      }
    }
    
    console.log(`\n✅ SCHEDULE GENERATION COMPLETE`);
    console.log(`📊 Total games created: ${scheduledGames.length}`);
    console.log(`📅 Days covered: 5-14 (10 days)`);
    console.log(`⏰ Times: 4:00, 4:15, 4:30, 4:45 PM EDT each day`);
    
    // Verify the schedule
    console.log('\n🔍 SCHEDULE VERIFICATION:');
    for (let day = 5; day <= 14; day++) {
      const dayGames = scheduledGames.filter(g => {
        const gameDay = Math.floor((new Date(g.gameDate).getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return gameDay === day;
      });
      console.log(`  Day ${day}: ${dayGames.length} games`);
    }
    
  } catch (error) {
    console.error('❌ Schedule generation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateCompleteSchedule().catch(console.error);