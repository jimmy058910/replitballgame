#!/usr/bin/env node

// Fix subdivision naming system and empty standings issue

import { getPrismaClient } from './server/database.ts';

async function main() {
  console.log('🔧 FIXING SUBDIVISION NAMING & EMPTY STANDINGS...\n');
  
  const prisma = await getPrismaClient();

  console.log('1️⃣ UPDATING SUBDIVISION NAMING SYSTEM...');
  
  // Current naming system analysis
  console.log('\n📋 CURRENT SUBDIVISION NAMES:');
  const allDiv8Teams = await prisma.team.findMany({
    where: { division: 8 },
    select: { subdivision: true, name: true },
    orderBy: { subdivision: 'asc' }
  });

  const currentSubdivisions = [...new Set(allDiv8Teams.map(t => t.subdivision))];
  console.log('Found subdivisions:', currentSubdivisions);

  // Update naming from "late_alpha" -> "alpha"
  if (currentSubdivisions.includes('late_alpha')) {
    const updateResult = await prisma.team.updateMany({
      where: {
        division: 8,
        subdivision: 'late_alpha'
      },
      data: {
        subdivision: 'alpha'
      }
    });
    console.log(`✅ Updated ${updateResult.count} teams from "late_alpha" to "alpha"`);
  }

  console.log('\n2️⃣ CHECKING STANDINGS/LEAGUE DATA...');
  
  // Check if there are leagues for Division 8
  const div8Leagues = await prisma.league.findMany({
    where: { division: 8 },
    include: { teams: true }
  });

  console.log(`Found ${div8Leagues.length} leagues for Division 8`);
  
  div8Leagues.forEach((league, i) => {
    console.log(`   League ${i+1}: ${league.name} (${league.teams.length} teams)`);
  });

  // Check if there are games for Division 8
  const div8Games = await prisma.game.count({
    where: {
      OR: [
        { homeTeam: { division: 8 } },
        { awayTeam: { division: 8 } }
      ]
    }
  });

  console.log(`Found ${div8Games} games for Division 8 teams`);

  console.log('\n3️⃣ VERIFYING OAKLAND COUGARS POSITION...');
  
  const oaklandTeam = await prisma.team.findFirst({
    where: { name: { contains: 'Oakland' } },
    include: { 
      user: true,
      league: true
    }
  });

  console.log(`Oakland Cougars:`);
  console.log(`   Subdivision: "${oaklandTeam?.subdivision}"`);
  console.log(`   League ID: ${oaklandTeam?.leagueId || 'NONE'}`);
  console.log(`   League Name: ${oaklandTeam?.league?.name || 'NO LEAGUE'}`);

  // Check all teams in same subdivision
  const sameSubdivisionTeams = await prisma.team.findMany({
    where: {
      division: oaklandTeam?.division,
      subdivision: oaklandTeam?.subdivision
    },
    include: { league: true },
    orderBy: { name: 'asc' }
  });

  console.log(`\n📋 TEAMS IN "${oaklandTeam?.subdivision}" SUBDIVISION:`);
  sameSubdivisionTeams.forEach((team, i) => {
    const hasLeague = team.leagueId ? '✅ Has League' : '❌ No League';
    console.log(`   ${i+1}. ${team.name} - ${hasLeague}`);
  });

  console.log('\n4️⃣ PROPOSED FIXES:');
  
  if (div8Leagues.length === 0) {
    console.log('❌ ISSUE: No leagues created for Division 8');
    console.log('   FIX: Need to create league for the subdivision');
  }
  
  if (div8Games === 0) {
    console.log('❌ ISSUE: No games scheduled for Division 8');
    console.log('   FIX: Need to generate season schedule');
  }

  if (sameSubdivisionTeams.some(team => !team.leagueId)) {
    console.log('❌ ISSUE: Teams not assigned to leagues');
    console.log('   FIX: Need to assign teams to appropriate leagues');
  }

  console.log('\n🎯 COMPLETE GREEK ALPHABET SYSTEM:');
  console.log('   Primary: alpha, beta, gamma, delta');
  console.log('   Extended: epsilon, zeta, eta, theta');
}

main().catch(console.error);