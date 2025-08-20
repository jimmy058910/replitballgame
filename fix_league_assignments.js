#!/usr/bin/env node

// Fix team-league assignments to enable schedule generation
// This script will properly associate teams with leagues

import { getPrismaClient } from './server/database.js';

async function fixLeagueAssignments() {
  console.log('🔧 === FIXING TEAM-LEAGUE ASSIGNMENTS ===');
  
  const prisma = await getPrismaClient();
  
  try {
    // Step 1: Check current state
    console.log('🔍 Checking current database state...');
    
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        leagueId: true,
        division: true,
        subdivision: true
      }
    });
    
    const leagues = await prisma.league.findMany({
      select: {
        id: true,
        name: true,
        division: true,
        seasonId: true
      }
    });
    
    const seasons = await prisma.season.findMany({
      select: {
        id: true,
        startDate: true,
        endDate: true
      }
    });
    
    console.log(`Found: ${teams.length} teams, ${leagues.length} leagues, ${seasons.length} seasons`);
    
    // Step 2: Create a current season if none exists
    let currentSeason = seasons[0];
    if (!currentSeason) {
      console.log('🏗️ Creating current season...');
      const now = new Date();
      const seasonStart = new Date(now);
      const seasonEnd = new Date(now);
      seasonEnd.setDate(seasonEnd.getDate() + 17); // 17-day season
      
      currentSeason = await prisma.season.create({
        data: {
          startDate: seasonStart,
          endDate: seasonEnd
        }
      });
      console.log(`✅ Created season ${currentSeason.id}`);
    }
    
    // Step 3: Create leagues for each division if they don't exist
    const divisionsNeeded = [1, 2, 3, 4, 5, 6, 7, 8];
    const leaguesByDivision = new Map();
    
    for (const division of divisionsNeeded) {
      let league = leagues.find(l => l.division === division);
      
      if (!league) {
        console.log(`🏗️ Creating league for Division ${division}...`);
        league = await prisma.league.create({
          data: {
            name: `Division ${division} League`,
            division: division,
            seasonId: currentSeason.id
          }
        });
        console.log(`✅ Created league ${league.id} for Division ${division}`);
      } else {
        console.log(`✅ Found existing league ${league.id} for Division ${division}`);
      }
      
      leaguesByDivision.set(division, league);
    }
    
    // Step 4: Assign teams to leagues based on their division
    let assignedTeams = 0;
    
    for (const team of teams) {
      if (team.division && !team.leagueId) {
        const league = leaguesByDivision.get(team.division);
        
        if (league) {
          console.log(`🔗 Assigning ${team.name} to Division ${team.division} league...`);
          await prisma.team.update({
            where: { id: team.id },
            data: { leagueId: league.id }
          });
          assignedTeams++;
        } else {
          console.log(`⚠️ No league found for ${team.name} in division ${team.division}`);
        }
      } else if (team.leagueId) {
        console.log(`✅ ${team.name} already assigned to league ${team.leagueId}`);
      }
    }
    
    console.log(`✅ Assigned ${assignedTeams} teams to leagues`);
    
    // Step 5: Verify the fix
    console.log('\n📊 === VERIFICATION ===');
    
    const updatedLeagues = await prisma.league.findMany({
      include: {
        teams: {
          select: {
            id: true,
            name: true,
            division: true
          }
        }
      }
    });
    
    console.log('Final league structure:');
    updatedLeagues.forEach((league, i) => {
      console.log(`  ${i+1}. ${league.name} (ID: ${league.id}) - ${league.teams.length} teams`);
      league.teams.forEach(team => {
        console.log(`     → ${team.name} (Division ${team.division})`);
      });
    });
    
    // Step 6: Find a test league for schedule generation
    const testLeague = updatedLeagues.find(l => l.teams.length >= 2);
    if (testLeague) {
      console.log(`\n🎯 Test league found: ${testLeague.name} with ${testLeague.teams.length} teams`);
      console.log('Ready for schedule generation testing!');
    } else {
      console.log('\n⚠️ No league has 2+ teams for schedule generation');
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixLeagueAssignments().catch(console.error);