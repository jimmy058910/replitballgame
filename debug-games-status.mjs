import { PrismaClient } from './prisma/generated/client/index.js';
import pkg from 'pg';
const { Client } = pkg;

async function debugGamesStatus() {
  console.log('🔍 Debugging games status for Days 1-5...');

  // Use direct PostgreSQL connection for comprehensive investigation  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Get games from Days 1-5 (Aug 31 - Sep 4)
    const query = `
      SELECT 
        id,
        "homeTeamId",
        "awayTeamId", 
        "gameDate",
        status,
        simulated,
        "homeScore",
        "awayScore",
        "matchType"
      FROM "Game" 
      WHERE "gameDate" >= '2025-08-31' 
        AND "gameDate" <= '2025-09-05'
        AND "matchType" = 'LEAGUE'
      ORDER BY "gameDate" ASC
    `;

    const result = await client.query(query);
    console.log(`\n📊 Found ${result.rows.length} league games between Aug 31 - Sep 5:`);
    
    const gamesByDay = {};
    
    result.rows.forEach(game => {
      const gameDate = new Date(game.gameDate);
      const dayKey = gameDate.toDateString();
      
      if (!gamesByDay[dayKey]) {
        gamesByDay[dayKey] = [];
      }
      
      gamesByDay[dayKey].push({
        id: game.id,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        status: game.status,
        simulated: game.simulated,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        matchType: game.matchType
      });
    });

    // Display results by day
    Object.entries(gamesByDay).forEach(([day, games]) => {
      console.log(`\n📅 ${day}:`);
      games.forEach(game => {
        const statusInfo = game.status === 'COMPLETED' ? '✅ COMPLETED' : 
                          game.status === 'SCHEDULED' ? '📅 SCHEDULED' : 
                          game.simulated ? '🎮 SIMULATED' : '❓ UNKNOWN';
        const scoreInfo = game.homeScore !== null && game.awayScore !== null ? 
                         `(${game.homeScore}-${game.awayScore})` : '(no score)';
        
        console.log(`  Game ${game.id}: Team ${game.homeTeamId} vs Team ${game.awayTeamId} - ${statusInfo} ${scoreInfo}`);
      });
    });

    // Special check: Look for completed games
    const completedGames = result.rows.filter(game => 
      game.status === 'COMPLETED' || 
      game.simulated === true ||
      (game.homeScore !== null && game.awayScore !== null)
    );
    
    console.log(`\n🏆 COMPLETED GAMES ANALYSIS:`);
    console.log(`Total completed games: ${completedGames.length}`);
    
    if (completedGames.length > 0) {
      console.log('Completed games by criteria:');
      completedGames.forEach(game => {
        const gameDate = new Date(game.gameDate).toDateString();
        console.log(`  Game ${game.id} (${gameDate}): status=${game.status}, simulated=${game.simulated}, score=${game.homeScore}-${game.awayScore}`);
      });
    }

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await client.end();
    console.log('🔒 Database connection closed');
  }
}

// Run the debug function
debugGamesStatus();