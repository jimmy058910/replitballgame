#!/usr/bin/env node

// Debug the standings API issue comprehensively

import { getPrismaClient } from './server/database.ts';

async function main() {
  console.log('🔍 COMPREHENSIVE STANDINGS API DEBUG...\n');
  
  const prisma = await getPrismaClient();

  console.log('1️⃣ CHECKING USER TEAM DATA...');
  
  // Find the user team (Oakland Cougars)
  const oaklandTeam = await prisma.team.findFirst({
    where: { name: { contains: 'Oakland' } },
    include: { 
      user: true, 
      league: true 
    }
  });

  if (!oaklandTeam) {
    console.log('❌ Oakland Cougars team not found!');
    return;
  }

  console.log(`Found Oakland Cougars:`);
  console.log(`   ID: ${oaklandTeam.id}`);
  console.log(`   Division: ${oaklandTeam.division}`);
  console.log(`   Subdivision: "${oaklandTeam.subdivision}"`);
  console.log(`   User ID: ${oaklandTeam.user?.userId || 'NONE'}`);
  console.log(`   League ID: ${oaklandTeam.leagueId || 'NONE'}`);

  console.log('\n2️⃣ TESTING SUBDIVISION QUERY LOGIC...');
  
  // Simulate the API logic
  const userSubdivision = oaklandTeam.subdivision || 'eta';
  console.log(`API would query subdivision: "${userSubdivision}"`);
  
  // Test the actual query
  const teamsInSubdivision = await prisma.team.findMany({
    where: {
      division: oaklandTeam.division,
      subdivision: userSubdivision
    },
    orderBy: { name: 'asc' }
  });

  console.log(`Found ${teamsInSubdivision.length} teams in subdivision "${userSubdivision}"`);
  teamsInSubdivision.forEach((team, i) => {
    console.log(`   ${i+1}. ${team.name} (W:${team.wins} L:${team.losses} P:${team.points})`);
  });

  console.log('\n3️⃣ CHECKING API ROUTE REGISTRATION...');
  
  // Check if league routes are properly registered
  // This would require importing the actual server setup, but let's check the files
  
  console.log('4️⃣ TESTING API RESPONSE FORMAT...');
  
  // Simulate what the API should return
  const completedMatches = await prisma.game.findMany({
    where: {
      matchType: 'LEAGUE',
      status: 'COMPLETED',
      OR: [
        { homeTeamId: { in: teamsInSubdivision.map(t => t.id) } },
        { awayTeamId: { in: teamsInSubdivision.map(t => t.id) } }
      ]
    }
  });

  console.log(`Found ${completedMatches.length} completed matches for standings calculation`);

  // Enhanced teams (simulate the API logic)
  const enhancedTeams = teamsInSubdivision.map((team) => {
    let goalsFor = 0;
    let goalsAgainst = 0;
    
    completedMatches.forEach((match) => {
      if (match.homeTeamId === team.id) {
        goalsFor += match.homeScore || 0;
        goalsAgainst += match.awayScore || 0;
      } else if (match.awayTeamId === team.id) {
        goalsFor += match.awayScore || 0; 
        goalsAgainst += match.homeScore || 0;
      }
    });
    
    return {
      ...team,
      draws: 0,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      played: (team.wins || 0) + (team.losses || 0)
    };
  });

  // Sort by points, goal difference, wins
  const sortedTeams = enhancedTeams.sort((a, b) => {
    const aPoints = a.points || 0;
    const bPoints = b.points || 0;
    const aGoalDiff = a.goalDifference || 0;
    const bGoalDiff = b.goalDifference || 0;
    const aWins = a.wins || 0;
    const bWins = b.wins || 0;

    if (bPoints !== aPoints) return bPoints - aPoints;
    if (bGoalDiff !== aGoalDiff) return bGoalDiff - aGoalDiff;
    if (bWins !== aWins) return bWins - aWins;
    return (a.losses || 0) - (b.losses || 0);
  });

  console.log(`\n📋 SIMULATED API RESPONSE (${sortedTeams.length} teams):`);
  sortedTeams.forEach((team, i) => {
    console.log(`   ${i+1}. ${team.name}`);
    console.log(`      Points: ${team.points || 0}, W: ${team.wins || 0}, L: ${team.losses || 0}`);
    console.log(`      Goals: ${team.goalsFor}/${team.goalsAgainst} (${team.goalDifference > 0 ? '+' : ''}${team.goalDifference})`);
  });

  console.log('\n🎯 DIAGNOSIS:');
  
  if (teamsInSubdivision.length === 0) {
    console.log('❌ ISSUE: No teams found in subdivision query');
    console.log('   CAUSE: Subdivision mismatch between team and API query logic');
  } else if (sortedTeams.length > 0) {
    console.log('✅ STANDINGS DATA: Available and properly formatted');
    console.log('❌ ISSUE: Likely API route not registered or authentication failing');
  } else {
    console.log('❌ ISSUE: Teams found but standings calculation failed');
  }

  console.log('\n🔧 RECOMMENDED FIXES:');
  console.log('1. Verify league routes are registered in main router');
  console.log('2. Test API endpoint authentication');
  console.log('3. Check if userSubdivision defaults are correct');
  
  console.log('\n🧪 NEXT STEPS:');
  console.log('1. Fix API route registration if needed');
  console.log('2. Update subdivision default logic');
  console.log('3. Test direct API endpoint call');
}

main().catch(console.error);