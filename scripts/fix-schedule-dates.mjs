import pkg from 'pg';
const { Pool } = pkg;

console.log('🗓️  Fixing schedule date distribution...');

const pool = new Pool({
  connectionString: 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public',
  ssl: false
});

async function fixScheduleDates() {
  try {
    // Get all current games in order
    console.log('📋 Getting current games...');
    const gamesResult = await pool.query(`
      SELECT 
        id,
        "homeTeamId",
        "awayTeamId",
        "gameDate"
      FROM "Game" 
      WHERE "matchType" = 'LEAGUE'
      ORDER BY "gameDate", id
    `);
    
    const games = gamesResult.rows;
    console.log(`✅ Found ${games.length} games to redistribute`);
    
    if (games.length !== 56) {
      throw new Error(`Expected 56 games, got ${games.length}`);
    }
    
    // Generate 14 consecutive dates starting September 2, 2025
    console.log('📅 Generating 14 consecutive game dates...');
    const baseDates = [];
    const startDate = new Date('2025-09-02T00:00:00.000Z'); // September 2, 2025
    
    for (let day = 0; day < 14; day++) {
      const gameDate = new Date(startDate);
      gameDate.setDate(startDate.getDate() + day);
      
      // Set evening times with variety (6-8 PM EDT)
      const hour = 18 + (day % 3); // 6 PM, 7 PM, or 8 PM
      const minute = (day * 15) % 60; // Varying minutes
      gameDate.setHours(hour, minute, 0, 0);
      
      baseDates.push({
        day: day + 1,
        date: gameDate
      });
    }
    
    console.log(`📅 Created dates for Days 1-14:`);
    baseDates.forEach(dateInfo => {
      console.log(`   Day ${dateInfo.day}: ${dateInfo.date.toDateString()} ${dateInfo.date.toTimeString().split(' ')[0]}`);
    });
    
    // Redistribute games: exactly 4 games per day
    console.log('🔄 Redistributing games across 14 days (4 games each)...');
    
    const gamesPerDay = 4;
    let gameIndex = 0;
    
    for (let dayIndex = 0; dayIndex < 14; dayIndex++) {
      const baseDate = baseDates[dayIndex].date;
      
      console.log(`📅 Processing Day ${dayIndex + 1} (${baseDate.toDateString()})...`);
      
      // Update exactly 4 games for this day
      for (let gameInDay = 0; gameInDay < gamesPerDay; gameInDay++) {
        if (gameIndex >= games.length) {
          console.error(`❌ Ran out of games at day ${dayIndex + 1}, game ${gameInDay + 1}`);
          break;
        }
        
        const game = games[gameIndex];
        
        // Create specific time for this game (staggered by 15 minutes)
        const gameTime = new Date(baseDate);
        gameTime.setMinutes(gameTime.getMinutes() + (gameInDay * 15));
        
        // Update the game in database
        await pool.query(`
          UPDATE "Game" 
          SET "gameDate" = $1 
          WHERE id = $2
        `, [gameTime.toISOString(), game.id]);
        
        console.log(`   ✅ Game ${gameIndex + 1}: Updated to ${gameTime.toTimeString()}`);
        gameIndex++;
      }
    }
    
    console.log(`🎉 Successfully redistributed ${gameIndex} games across 14 days!`);
    
    // Verification
    console.log('🔍 Verifying final distribution...');
    const verificationResult = await pool.query(`
      SELECT 
        DATE("gameDate") as game_date,
        COUNT(*) as games_count
      FROM "Game" 
      WHERE "matchType" = 'LEAGUE'
      GROUP BY DATE("gameDate")
      ORDER BY game_date
    `);
    
    console.log('📊 Final distribution:');
    verificationResult.rows.forEach((row, index) => {
      const status = row.games_count === '4' ? '✅' : '❌';
      console.log(`   ${status} Day ${index + 1} (${row.game_date.toDateString()}): ${row.games_count} games`);
    });
    
    const totalDays = verificationResult.rows.length;
    const correctDays = verificationResult.rows.filter(row => row.games_count === '4').length;
    
    console.log(`\n📊 Summary: ${correctDays}/${totalDays} days have exactly 4 games`);
    
    if (totalDays === 14 && correctDays === 14) {
      console.log('🎉 PERFECT! Schedule now spans exactly 14 days with 4 games each!');
    } else {
      console.log('❌ Schedule distribution still has issues');
    }
    
  } catch (error) {
    console.error('❌ Failed to fix schedule dates:', error);
  } finally {
    await pool.end();
  }
}

fixScheduleDates();