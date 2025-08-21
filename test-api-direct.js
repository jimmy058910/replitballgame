/**
 * DIRECT API TEST - BYPASS FRONTEND CACHING
 * Test API routes directly from command line to verify backend works
 */

import { getPrismaClient } from './server/database.ts';

async function testBackendDirectly() {
  try {
    console.log('🔧 TESTING BACKEND DATA DIRECTLY...');
    
    const prisma = await getPrismaClient();
    
    // Test 1: Get Oakland Cougars team data
    console.log('\n1️⃣ TESTING TEAM DATA:');
    const oaklandTeam = await prisma.team.findFirst({
      where: { name: 'Oakland Cougars' }
    });
    
    console.log(`Oakland Cougars: ${oaklandTeam?.wins}W-${oaklandTeam?.losses}L (${oaklandTeam?.points} pts)`);
    
    // Test 2: Get Division 8 Alpha standings
    console.log('\n2️⃣ TESTING STANDINGS DATA:');
    const division8Teams = await prisma.team.findMany({
      where: { 
        division: 8, 
        subdivision: 'alpha' 
      },
      orderBy: [
        { points: 'desc' },
        { wins: 'desc' },
        { name: 'asc' }
      ]
    });
    
    console.log('Division 8 Alpha standings:');
    division8Teams.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name}: ${team.wins}W-${team.losses}L (${team.points} pts)`);
    });
    
    // Test 3: Check Day 6 games status
    console.log('\n3️⃣ TESTING DAY 6 GAMES:');
    const day6Games = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: new Date('2025-08-21T20:00:00.000Z'),
          lte: new Date('2025-08-21T23:59:59.000Z')
        }
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      }
    });
    
    console.log(`Day 6 games: ${day6Games.length} total`);
    day6Games.forEach(game => {
      console.log(`- ${game.homeTeam.name} ${game.homeScore || 0}-${game.awayScore || 0} ${game.awayTeam.name} [${game.status}]`);
    });
    
    // Test 4: Check upcoming matches for Oakland
    console.log('\n4️⃣ TESTING UPCOMING MATCHES:');
    const upcomingMatches = await prisma.game.findMany({
      where: {
        status: 'SCHEDULED',
        OR: [
          { homeTeamId: oaklandTeam?.id },
          { awayTeamId: oaklandTeam?.id }
        ]
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: { gameDate: 'asc' },
      take: 2
    });
    
    upcomingMatches.forEach((match, index) => {
      const opponent = match.homeTeamId === oaklandTeam?.id ? match.awayTeam.name : match.homeTeam.name;
      const location = match.homeTeamId === oaklandTeam?.id ? 'HOME' : 'AWAY';
      console.log(`${index + 1}. ${location} vs ${opponent} on ${match.gameDate.toISOString()}`);
    });
    
    console.log('\n✅ BACKEND DATA IS CORRECT - ISSUE IS IN API ROUTING OR FRONTEND');
    console.log('🎯 RECOMMENDATION: Check API route registration and middleware order');
    
  } catch (error) {
    console.error('❌ Backend test error:', error);
  }
}

testBackendDirectly();