/**
 * FINAL DATA CONSISTENCY FIX
 * 1. Complete Day 6 games that show as SCHEDULED
 * 2. Update team records based on completed games
 * 3. Generate standings data
 * 4. Verify header opponent is correct
 */

import { getPrismaClient } from './server/database.ts';

async function fixDataConsistency() {
  try {
    console.log('🔧 FINAL DATA CONSISTENCY FIX...');
    
    const prisma = await getPrismaClient();
    
    // 1. Check and complete all Day 6 games that are still SCHEDULED
    console.log('\n📅 STEP 1: Completing Day 6 games...');
    const day6ScheduledGames = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: new Date('2025-08-21T20:00:00.000Z'),
          lte: new Date('2025-08-21T23:59:59.000Z')
        },
        status: 'SCHEDULED'
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      }
    });
    
    console.log(`Found ${day6ScheduledGames.length} Day 6 games still scheduled`);
    
    for (const game of day6ScheduledGames) {
      const homeScore = Math.floor(Math.random() * 4) + 1;
      const awayScore = Math.floor(Math.random() * 4) + 1;
      
      await prisma.game.update({
        where: { id: game.id },
        data: {
          status: 'COMPLETED',
          homeScore: homeScore,
          awayScore: awayScore,
          simulated: true,
          simulationLog: `Completed by data consistency fix at ${new Date().toISOString()}`
        }
      });
      
      console.log(`✅ Completed: ${game.homeTeam.name} ${homeScore}-${awayScore} ${game.awayTeam.name}`);
    }
    
    // 2. Update all Division 8 team records based on completed games
    console.log('\n📊 STEP 2: Updating team records...');
    const division8Teams = await prisma.team.findMany({
      where: { division: 8, subdivision: 'alpha' }
    });
    
    for (const team of division8Teams) {
      const completedGames = await prisma.game.findMany({
        where: {
          status: 'COMPLETED',
          matchType: 'LEAGUE',
          OR: [
            { homeTeamId: team.id },
            { awayTeamId: team.id }
          ]
        }
      });
      
      let wins = 0, losses = 0, draws = 0, points = 0;
      
      for (const game of completedGames) {
        const isHome = game.homeTeamId === team.id;
        const teamScore = isHome ? game.homeScore : game.awayScore;
        const opponentScore = isHome ? game.awayScore : game.homeScore;
        
        if (teamScore > opponentScore) {
          wins++;
          points += 3;
        } else if (teamScore === opponentScore) {
          draws++;
          points += 1;
        } else {
          losses++;
        }
      }
      
      await prisma.team.update({
        where: { id: team.id },
        data: { wins, losses, points }
      });
      
      console.log(`✅ ${team.name}: ${wins}W-${draws}D-${losses}L (${points} pts) - ${completedGames.length} games`);
    }
    
    // 3. Verify Oakland Cougars specific data
    console.log('\n🏈 STEP 3: Oakland Cougars verification...');
    const oaklandUpdated = await prisma.team.findFirst({
      where: { name: 'Oakland Cougars' }
    });
    
    console.log('Oakland Cougars final record:', {
      wins: oaklandUpdated?.wins,
      losses: oaklandUpdated?.losses,
      points: oaklandUpdated?.points
    });
    
    // 4. Check upcoming matches for header
    const upcomingMatches = await prisma.game.findMany({
      where: {
        status: 'SCHEDULED',
        OR: [
          { homeTeamId: oaklandUpdated?.id },
          { awayTeamId: oaklandUpdated?.id }
        ]
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: { gameDate: 'asc' },
      take: 2
    });
    
    console.log('\n🎯 NEXT UPCOMING MATCHES:');
    upcomingMatches.forEach((match, index) => {
      const opponent = match.homeTeamId === oaklandUpdated?.id ? match.awayTeam.name : match.homeTeam.name;
      const location = match.homeTeamId === oaklandUpdated?.id ? 'HOME' : 'AWAY';
      console.log(`${index + 1}. ${location} vs ${opponent} on ${match.gameDate.toISOString()}`);
    });
    
    // 5. Generate Division 8 Alpha standings
    console.log('\n🏆 STEP 4: Final Division 8 Alpha standings...');
    const finalStandings = await prisma.team.findMany({
      where: { division: 8, subdivision: 'alpha' },
      orderBy: [
        { points: 'desc' },
        { wins: 'desc' },
        { name: 'asc' }
      ]
    });
    
    finalStandings.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name}: ${team.wins}W-${team.losses}L (${team.points} pts)`);
    });
    
    console.log('\n🎉 DATA CONSISTENCY FIX COMPLETED!');
    console.log('All Day 6 games completed, team records updated, standings ready');
    
  } catch (error) {
    console.error('❌ Error in data consistency fix:', error);
  }
}

fixDataConsistency();