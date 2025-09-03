const { PrismaClient } = require('@prisma/client');

async function fixDivision7AlphaStandings() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 FIXING DIVISION 7 ALPHA STANDINGS - DIRECT DATABASE APPROACH');
    console.log('================================================================');
    
    // Get Division 7 Alpha teams
    const teams = await prisma.team.findMany({
      where: { 
        division: 7,
        subdivision: 'alpha'
      }
    });
    
    console.log(`🔍 Found ${teams.length} teams in Division 7 Alpha:`);
    teams.forEach(team => console.log(`  - ${team.name} (ID: ${team.id})`));
    
    // Get ALL completed league games involving these teams
    const completedGames = await prisma.game.findMany({
      where: {
        matchType: 'LEAGUE',
        homeScore: { not: null },
        awayScore: { not: null },
        OR: [
          { homeTeamId: { in: teams.map(t => t.id) } },
          { awayTeamId: { in: teams.map(t => t.id) } }
        ]
      },
      include: {
        homeTeam: true,
        awayTeam: true
      },
      orderBy: {
        gameDate: 'asc'
      }
    });
    
    console.log(`📋 Found ${completedGames.length} completed games involving Division 7 Alpha teams:`);
    completedGames.forEach(game => {
      console.log(`  Game ${game.id}: ${game.homeTeam.name} ${game.homeScore}-${game.awayScore} ${game.awayTeam.name} (${game.gameDate})`);
    });
    
    // Reset all Division 7 Alpha teams to 0 standings
    console.log('\n🔄 Resetting all Division 7 Alpha team standings to 0...');
    await prisma.team.updateMany({
      where: {
        division: 7,
        subdivision: 'alpha'
      },
      data: {
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0
      }
    });
    
    // Process each completed game
    console.log('\n🏈 Processing each completed game:');
    for (const game of completedGames) {
      const homeScore = game.homeScore || 0;
      const awayScore = game.awayScore || 0;
      
      console.log(`\nProcessing Game ${game.id}: ${game.homeTeam.name} (${homeScore}) vs ${game.awayTeam.name} (${awayScore})`);
      
      if (homeScore > awayScore) {
        // Home team wins
        await prisma.team.update({
          where: { id: game.homeTeam.id },
          data: {
            wins: { increment: 1 },
            points: { increment: 3 }
          }
        });
        
        await prisma.team.update({
          where: { id: game.awayTeam.id },
          data: {
            losses: { increment: 1 }
          }
        });
        
        console.log(`  ✅ ${game.homeTeam.name} WINS`);
        
      } else if (awayScore > homeScore) {
        // Away team wins
        await prisma.team.update({
          where: { id: game.awayTeam.id },
          data: {
            wins: { increment: 1 },
            points: { increment: 3 }
          }
        });
        
        await prisma.team.update({
          where: { id: game.homeTeam.id },
          data: {
            losses: { increment: 1 }
          }
        });
        
        console.log(`  ✅ ${game.awayTeam.name} WINS`);
      }
    }
    
    // Show final standings
    const finalStandings = await prisma.team.findMany({
      where: {
        division: 7,
        subdivision: 'alpha'
      },
      select: {
        name: true,
        wins: true,
        losses: true,
        draws: true,
        points: true
      },
      orderBy: [
        { points: 'desc' },
        { wins: 'desc' }
      ]
    });
    
    console.log('\n📊 FINAL DIVISION 7 ALPHA STANDINGS:');
    console.log('====================================');
    finalStandings.forEach((team, index) => {
      const gamesPlayed = (team.wins || 0) + (team.losses || 0) + (team.draws || 0);
      console.log(`${index + 1}. ${team.name}: GP=${gamesPlayed}, W=${team.wins || 0}, L=${team.losses || 0}, Pts=${team.points || 0}`);
    });
    
    console.log('\n✅ Division 7 Alpha standings fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing Division 7 Alpha standings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDivision7AlphaStandings();