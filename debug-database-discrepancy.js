/**
 * CRITICAL DEBUG: Database Connection & Data Discrepancy Investigation
 * Compare what script sees vs what frontend displays
 */

import { getPrismaClient } from './server/database.ts';

async function debugDatabaseDiscrepancy() {
  try {
    console.log('🔍 CRITICAL DATABASE INVESTIGATION...');
    
    const prisma = await getPrismaClient();
    
    // 1. Verify database connection details
    console.log('\n📡 DATABASE CONNECTION INFO:');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Database URL exists:', !!process.env.DATABASE_URL);
    console.log('Database URL preview:', process.env.DATABASE_URL?.substring(0, 80) + '...');
    
    // 2. Check Oakland Cougars data directly
    console.log('\n🏈 OAKLAND COUGARS DIRECT DATABASE QUERY:');
    const oaklandTeam = await prisma.team.findFirst({
      where: { name: 'Oakland Cougars' },
      include: {
        _count: {
          select: {
            homeGames: { where: { status: 'COMPLETED' } },
            awayGames: { where: { status: 'COMPLETED' } }
          }
        }
      }
    });
    
    console.log('Oakland Team Data:', {
      id: oaklandTeam?.id,
      name: oaklandTeam?.name,
      wins: oaklandTeam?.wins,
      losses: oaklandTeam?.losses,
      points: oaklandTeam?.points,
      division: oaklandTeam?.division,
      subdivision: oaklandTeam?.subdivision,
      completedHomeGames: oaklandTeam?._count?.homeGames,
      completedAwayGames: oaklandTeam?._count?.awayGames
    });
    
    // 3. Check all Day 6 games status
    console.log('\n📅 ALL DAY 6 GAMES STATUS:');
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
      },
      orderBy: { gameDate: 'asc' }
    });
    
    day6Games.forEach(game => {
      console.log(`Game ${game.id}: ${game.homeTeam.name} vs ${game.awayTeam.name} - Status: ${game.status} - Score: ${game.homeScore}-${game.awayScore}`);
    });
    
    // 4. Check Oakland's upcoming matches
    console.log('\n🎯 OAKLAND UPCOMING MATCHES:');
    const upcomingGames = await prisma.game.findMany({
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
      take: 3
    });
    
    upcomingGames.forEach((game, index) => {
      const opponent = game.homeTeamId === oaklandTeam?.id ? game.awayTeam.name : game.homeTeam.name;
      console.log(`${index + 1}. vs ${opponent} on ${game.gameDate} (Game ID: ${game.id})`);
    });
    
    // 5. Check if there are multiple databases or connections
    console.log('\n🔄 DATABASE CONNECTIVITY TEST:');
    const testQuery = await prisma.$queryRaw`SELECT COUNT(*) as game_count FROM "Game" WHERE status = 'COMPLETED'`;
    console.log('Total completed games in database:', testQuery);
    
    const seasonCheck = await prisma.season.findFirst({
      orderBy: { startDate: 'desc' }
    });
    console.log('Current season:', {
      id: seasonCheck?.id,
      currentDay: seasonCheck?.currentDay,
      phase: seasonCheck?.phase
    });
    
    // 6. Check if frontend is using different API endpoint
    console.log('\n🌐 CHECKING FRONTEND DATA SOURCES:');
    console.log('If frontend shows different data, it may be using cached data or different endpoints');
    
  } catch (error) {
    console.error('❌ Database investigation error:', error);
  }
}

debugDatabaseDiscrepancy();