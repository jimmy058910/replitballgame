#!/usr/bin/env node

// Comprehensive debug of the exact standings issue

import { getPrismaClient } from './server/database.ts';

async function main() {
  console.log('🔍 COMPREHENSIVE STANDINGS DEBUG - NO SIMULATION...\n');
  
  const prisma = await getPrismaClient();

  console.log('1️⃣ CHECKING OAKLAND COUGARS DATA...');
  
  const oaklandTeam = await prisma.team.findFirst({
    where: { name: { contains: 'Oakland' } },
    include: { 
      user: true 
    }
  });

  if (!oaklandTeam) {
    console.log('❌ Oakland Cougars not found');
    return;
  }

  console.log(`✅ Oakland Cougars Found:`);
  console.log(`   ID: ${oaklandTeam.id}`);
  console.log(`   Division: ${oaklandTeam.division}`);
  console.log(`   Subdivision: "${oaklandTeam.subdivision}"`);
  console.log(`   W-L-P: ${oaklandTeam.wins}-${oaklandTeam.losses}-${oaklandTeam.points}`);
  console.log(`   User ID: ${oaklandTeam.user?.userId || 'NONE'}`);

  console.log('\n2️⃣ CHECKING SUBDIVISION QUERY...');
  
  // Simulate the exact API query from leagueRoutes.ts
  const userSubdivision = oaklandTeam.subdivision || 'eta';
  console.log(`API will query subdivision: "${userSubdivision}"`);
  
  const teamsInSubdivision = await prisma.team.findMany({
    where: {
      division: oaklandTeam.division,
      subdivision: userSubdivision
    }
  });

  console.log(`Teams in subdivision "${userSubdivision}": ${teamsInSubdivision.length}`);
  teamsInSubdivision.forEach((team, i) => {
    console.log(`   ${i+1}. ${team.name} (${team.wins}W-${team.losses}L-${team.points}P)`);
  });

  console.log('\n3️⃣ TESTING API AUTHENTICATION...');
  
  // Test if user exists in proper format for API
  console.log(`User for authentication: ${oaklandTeam.user?.userId}`);
  
  if (!oaklandTeam.user?.userId) {
    console.log('❌ CRITICAL ISSUE: No user linked to Oakland Cougars');
    console.log('   This will cause API authentication to fail');
  }

  console.log('\n4️⃣ CHECKING COMPLETED GAMES (FOR GOAL CALCULATIONS)...');
  
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

  console.log(`Completed matches for goal calculations: ${completedMatches.length}`);
  
  if (completedMatches.length > 0) {
    completedMatches.slice(0, 3).forEach((match, i) => {
      console.log(`   Match ${i+1}: ${match.homeScore}-${match.awayScore} (${match.status})`);
    });
  }

  console.log('\n5️⃣ SIMULATING EXACT API RESPONSE...');
  
  // This is the exact logic from leagueRoutes.ts
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
    
    const goalDifference = goalsFor - goalsAgainst;
    
    const wins = team.wins || 0;
    const losses = team.losses || 0;
    const draws = team.draws || 0;
    
    let streakType = 'N';
    let currentStreak = 0;
    
    if (wins > losses) {
      streakType = 'W';
      currentStreak = Math.max(1, Math.min(wins - losses, 5));
    } else if (losses > wins) {
      streakType = 'L';
      currentStreak = Math.max(1, Math.min(losses - wins, 5));
    } else if (draws > 0) {
      streakType = 'D';
      currentStreak = Math.min(draws, 3);
    }
    
    const totalGames = wins + losses + draws;
    let form = 'N/A';
    if (totalGames > 0) {
      const winRate = wins / totalGames;
      if (winRate >= 0.8) form = 'WWWWW';
      else if (winRate >= 0.6) form = 'WWWDL';
      else if (winRate >= 0.4) form = 'WLDWL';
      else if (winRate >= 0.2) form = 'LLWLL';
      else form = 'LLLLL';
    }

    return {
      ...team,
      draws: draws || 0,
      currentStreak,
      streakType,
      form: form.slice(0, Math.min(5, totalGames)),
      goalsFor,
      goalsAgainst,
      goalDifference,
      played: totalGames
    };
  });

  const sortedTeams = enhancedTeams.sort((a, b) => {
    const aPoints = a.points || 0;
    const bPoints = b.points || 0;
    const aWins = a.wins || 0;
    const bWins = b.wins || 0;
    const aLosses = a.losses || 0;
    const bLosses = b.losses || 0;
    const aGoalDiff = a.goalDifference || 0;
    const bGoalDiff = b.goalDifference || 0;

    if (bPoints !== aPoints) return bPoints - aPoints;
    if (bGoalDiff !== aGoalDiff) return bGoalDiff - aGoalDiff;
    if (bWins !== aWins) return bWins - aWins;
    return aLosses - bLosses;
  });

  console.log(`\n📋 EXACT API RESPONSE SIMULATION:`);
  console.log(`Array length: ${sortedTeams.length}`);
  console.log(`Response type: ${typeof sortedTeams}`);
  console.log(`Is array: ${Array.isArray(sortedTeams)}`);
  
  if (sortedTeams.length === 0) {
    console.log('❌ EMPTY ARRAY - This explains the frontend issue!');
  } else {
    console.log('Teams in response:');
    sortedTeams.forEach((team, i) => {
      console.log(`   ${i+1}. ${team.name} - ${team.points}pts, ${team.wins}W-${team.losses}L`);
    });
  }

  console.log('\n6️⃣ CHECKING FRONTEND LOGIC...');
  
  // The frontend likely checks: divisionStandings && divisionStandings.length > 0
  console.log(`Frontend check: divisionStandings.length > 0: ${sortedTeams.length > 0}`);
  console.log(`Any team with points > 0: ${sortedTeams.some(t => t.points > 0)}`);
  console.log(`Any team with wins > 0: ${sortedTeams.some(t => t.wins > 0)}`);

  console.log('\n🎯 ROOT CAUSE ANALYSIS:');
  
  if (teamsInSubdivision.length === 0) {
    console.log('❌ ISSUE: No teams found in subdivision query');
    console.log('   CAUSE: Subdivision filtering is excluding all teams');
    console.log('   FIX: Check subdivision values in database vs API logic');
  } else if (sortedTeams.length === 0) {
    console.log('❌ ISSUE: Teams found but response is empty');
    console.log('   CAUSE: Processing logic is filtering out teams');
  } else if (!oaklandTeam.user?.userId) {
    console.log('❌ ISSUE: Authentication will fail');
    console.log('   CAUSE: Oakland Cougars has no linked user');
    console.log('   FIX: Link proper user to team for API auth');
  } else {
    console.log('✅ DATA AVAILABLE: Teams found and processed');
    console.log('❌ ISSUE: API route not working or frontend not receiving data');
    console.log('   FIX: Check API route registration and authentication');
  }

  console.log('\n🔧 NEXT STEPS:');
  console.log('1. Test actual API endpoint with curl + auth');
  console.log('2. Check API route authentication requirements');
  console.log('3. Verify frontend is calling correct endpoint');
  console.log('4. Check browser network tab for API errors');
}

main().catch(console.error);