// Simple script to test database queries via the existing API infrastructure
import { getPrismaClient } from './server/database.js';

async function debugGamesStatus() {
  console.log('🔍 Debugging games status for Days 1-5...');

  try {
    const prisma = await getPrismaClient();
    console.log('✅ Connected to database via Prisma');

    // Get games from Days 1-5 (Aug 31 - Sep 5)
    const games = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: new Date('2025-08-31T00:00:00Z'),
          lte: new Date('2025-09-05T23:59:59Z')
        },
        matchType: 'LEAGUE'
      },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });

    console.log(`\n📊 Found ${games.length} league games between Aug 31 - Sep 5:`);
    
    const gamesByDay = {};
    
    games.forEach(game => {
      const gameDate = new Date(game.gameDate);
      const dayKey = gameDate.toDateString();
      
      if (!gamesByDay[dayKey]) {
        gamesByDay[dayKey] = [];
      }
      
      gamesByDay[dayKey].push({
        id: game.id,
        homeTeam: game.homeTeam?.name || `Team ${game.homeTeamId}`,
        awayTeam: game.awayTeam?.name || `Team ${game.awayTeamId}`,
        status: game.status,
        simulated: game.simulated,
        homeScore: game.homeScore,
        awayScore: game.awayScore
      });
    });

    // Display results by day
    Object.entries(gamesByDay).forEach(([day, dayGames]) => {
      console.log(`\n📅 ${day}:`);
      dayGames.forEach(game => {
        const statusInfo = game.status === 'COMPLETED' ? '✅ COMPLETED' : 
                          game.status === 'SCHEDULED' ? '📅 SCHEDULED' : 
                          game.simulated ? '🎮 SIMULATED' : `❓ ${game.status}`;
        const scoreInfo = game.homeScore !== null && game.awayScore !== null ? 
                         `(${game.homeScore}-${game.awayScore})` : '(no score)';
        
        console.log(`  Game ${game.id}: ${game.homeTeam} vs ${game.awayTeam} - ${statusInfo} ${scoreInfo}`);
      });
    });

    // Special check: Look for completed games that should appear in the API
    const completedGames = games.filter(game => 
      game.status === 'COMPLETED' || 
      game.simulated === true ||
      (game.homeScore !== null && game.awayScore !== null)
    );
    
    console.log(`\n🏆 COMPLETED GAMES ANALYSIS:`);
    console.log(`Total games with completion indicators: ${completedGames.length}`);
    
    if (completedGames.length > 0) {
      console.log('\nCompleted games by criteria:');
      completedGames.forEach(game => {
        const gameDate = new Date(game.gameDate).toDateString();
        console.log(`  Game ${game.id} (${gameDate}): status="${game.status}", simulated=${game.simulated}, score=${game.homeScore}-${game.awayScore}`);
      });
    }

    // Check Oakland Cougars involvement
    const oaklandGames = games.filter(game => 
      game.homeTeamId === 4 || game.awayTeamId === 4
    );
    
    console.log(`\n🏈 OAKLAND COUGARS GAMES:`);
    console.log(`Total Oakland Cougars games: ${oaklandGames.length}`);
    
    oaklandGames.forEach(game => {
      const gameDate = new Date(game.gameDate).toDateString();
      const vsTeam = game.homeTeamId === 4 ? game.awayTeam?.name : game.homeTeam?.name;
      const statusInfo = game.status === 'COMPLETED' ? '✅ COMPLETED' : 
                        game.status === 'SCHEDULED' ? '📅 SCHEDULED' : 
                        `❓ ${game.status}`;
      console.log(`  ${gameDate}: vs ${vsTeam} - ${statusInfo} (${game.homeScore}-${game.awayScore})`);
    });

  } catch (error) {
    console.error('❌ Database error:', error);
  }
}

// Run the debug function
debugGamesStatus();