#!/usr/bin/env node

// COMPREHENSIVE SCHEDULE SYSTEM FIX
// Fixes: 1) Time slots, 2) Game structure, 3) Test Team removal, 4) Subdivision verification

import { getPrismaClient } from './server/database.js';

async function fixComprehensiveScheduleSystem() {
  console.log('🔧 === COMPREHENSIVE SCHEDULE SYSTEM FIX ===');
  
  const prisma = await getPrismaClient();
  
  try {
    // STEP 1: Remove unauthorized "Test Team"
    console.log('\n🗑️ Step 1: Removing unauthorized "Test Team"...');
    
    const testTeam = await prisma.team.findFirst({
      where: { name: 'Test Team' }
    });
    
    if (testTeam) {
      // Remove related data first
      await prisma.game.deleteMany({
        where: {
          OR: [
            { homeTeamId: testTeam.id },
            { awayTeamId: testTeam.id }
          ]
        }
      });
      
      await prisma.player.deleteMany({ where: { teamId: testTeam.id } });
      await prisma.teamFinances.deleteMany({ where: { teamId: testTeam.id } });
      await prisma.stadium.deleteMany({ where: { teamId: testTeam.id } });
      
      await prisma.team.delete({ where: { id: testTeam.id } });
      console.log('✅ Removed "Test Team" and all related data');
    } else {
      console.log('✅ No "Test Team" found');
    }
    
    // STEP 2: Verify subdivision structure (exactly 8 teams per subdivision)
    console.log('\n📊 Step 2: Verifying subdivision structure...');
    
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        division: true,
        subdivision: true
      },
      orderBy: [
        { division: 'asc' },
        { subdivision: 'asc' }
      ]
    });
    
    console.log(`Found ${teams.length} total teams`);
    
    // Group by division and subdivision
    const divisionMap = new Map();
    teams.forEach(team => {
      if (!divisionMap.has(team.division)) {
        divisionMap.set(team.division, new Map());
      }
      const subdivisionMap = divisionMap.get(team.division);
      if (!subdivisionMap.has(team.subdivision)) {
        subdivisionMap.set(team.subdivision, []);
      }
      subdivisionMap.get(team.subdivision).push(team);
    });
    
    // Verify each subdivision has exactly 8 teams
    let validSubdivisions = [];
    for (const [division, subdivisionMap] of divisionMap.entries()) {
      for (const [subdivision, teamList] of subdivisionMap.entries()) {
        console.log(`Division ${division}, Subdivision ${subdivision}: ${teamList.length} teams`);
        if (teamList.length === 8) {
          validSubdivisions.push({
            division,
            subdivision,
            teams: teamList
          });
          console.log(`  ✅ Valid subdivision (8 teams)`);
        } else {
          console.log(`  ⚠️ Invalid subdivision (${teamList.length} teams, need exactly 8)`);
        }
      }
    }
    
    if (validSubdivisions.length === 0) {
      throw new Error('No valid subdivisions with exactly 8 teams found');
    }
    
    // STEP 3: Clear existing games
    console.log('\n🧹 Step 3: Clearing existing games...');
    const deletedGames = await prisma.game.deleteMany();
    console.log(`✅ Deleted ${deletedGames.count} existing games`);
    
    // STEP 4: Generate correct schedule for each valid subdivision
    console.log('\n⚽ Step 4: Generating correct schedules...');
    
    for (const subdivision of validSubdivisions) {
      console.log(`\n🏆 Generating schedule for Division ${subdivision.division}, Subdivision ${subdivision.subdivision}`);
      
      const scheduleResult = await generateSubdivisionSchedule(subdivision, prisma);
      console.log(`✅ Created ${scheduleResult.gamesCreated} games for this subdivision`);
    }
    
    console.log('\n🎉 COMPREHENSIVE FIX COMPLETED!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Generate correct schedule for a subdivision (8 teams, 4 matches per day)
 */
async function generateSubdivisionSchedule(subdivision, prisma) {
  const { teams } = subdivision;
  
  // With 8 teams, we need 4 matches per day (each team plays once)
  // Over 14 days = 56 total matches
  // There are 28 possible unique pairings between 8 teams
  // So we'll have exactly 28 duplicated matches
  
  // Generate all possible pairings
  const allPairings = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      allPairings.push([teams[i], teams[j]]);
    }
  }
  
  console.log(`  Generated ${allPairings.length} unique pairings (need 56 total matches)`);
  
  // Duplicate pairings to reach 56 matches (exactly 2 of each pairing)
  const allMatches = [...allPairings, ...allPairings]; // 28 × 2 = 56 matches
  
  // Shuffle for variety
  for (let i = allMatches.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allMatches[i], allMatches[j]] = [allMatches[j], allMatches[i]];
  }
  
  console.log(`  Total matches to schedule: ${allMatches.length}`);
  
  // Schedule across 14 days, 4 matches per day
  const scheduledGames = [];
  const baseDate = new Date("2025-08-20");
  
  for (let day = 0; day < 14; day++) {
    const gameDate = new Date(baseDate);
    gameDate.setDate(baseDate.getDate() + day);
    
    // 4 matches per day at different times in 4PM-10PM window
    const dayMatches = allMatches.slice(day * 4, (day + 1) * 4);
    
    dayMatches.forEach((match, timeSlot) => {
      // Calculate time: 4:00 PM, 4:15 PM, 4:30 PM, 4:45 PM for the 4 daily matches
      const startHour = 16; // 4 PM
      const startMinute = timeSlot * 15; // 0, 15, 30, 45 minutes
      
      gameDate.setHours(startHour, startMinute, 0, 0);
      
      scheduledGames.push({
        leagueId: 8, // All teams are in Division 8 league
        homeTeamId: match[0].id,
        awayTeamId: match[1].id,
        gameDate: new Date(gameDate),
        status: 'SCHEDULED',
        matchType: 'LEAGUE'
      });
    });
  }
  
  // Insert games into database
  await prisma.game.createMany({
    data: scheduledGames
  });
  
  return {
    gamesCreated: scheduledGames.length
  };
}

// Run the comprehensive fix
fixComprehensiveScheduleSystem().catch(console.error);