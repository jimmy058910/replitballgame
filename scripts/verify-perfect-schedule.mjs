import pkg from 'pg';
const { Pool } = pkg;

console.log('🔍 Verifying the perfect schedule in database...');

const pool = new Pool({
  connectionString: 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public',
  ssl: false
});

async function verifySchedule() {
  try {
    // Get all games with detailed info
    const result = await pool.query(`
      SELECT 
        g.id,
        g."gameDate",
        DATE(g."gameDate" AT TIME ZONE 'UTC') as game_date_only,
        g."gameDate"::date as simple_date,
        ht.name as home_team,
        at.name as away_team
      FROM "Game" g
      JOIN "Team" ht ON g."homeTeamId" = ht.id
      JOIN "Team" at ON g."awayTeamId" = at.id
      WHERE g."matchType" = 'LEAGUE'
      ORDER BY g."gameDate"
    `);
    
    console.log(`📊 Total games found: ${result.rows.length}`);
    
    // Group by date using simple date comparison
    const gamesByDate = {};
    result.rows.forEach(game => {
      const dateKey = game.simple_date.toISOString().split('T')[0];
      if (!gamesByDate[dateKey]) {
        gamesByDate[dateKey] = [];
      }
      gamesByDate[dateKey].push(game);
    });
    
    console.log('\n📅 Games per day (corrected grouping):');
    const dates = Object.keys(gamesByDate).sort();
    
    dates.forEach((date, index) => {
      const dayGames = gamesByDate[date];
      const status = dayGames.length === 4 ? '✅' : '❌';
      console.log(`   ${status} Day ${index + 1} (${date}): ${dayGames.length} games`);
      
      if (dayGames.length !== 4) {
        console.log(`      Games on this day:`);
        dayGames.forEach(game => {
          console.log(`        ${game.home_team} vs ${game.away_team} at ${game.gameDate.toISOString()}`);
        });
      }
    });
    
    // Summary
    const totalDays = dates.length;
    const perfectDays = dates.filter(date => gamesByDate[date].length === 4).length;
    
    console.log(`\n📊 Summary: ${perfectDays}/${totalDays} days have exactly 4 games`);
    
    if (totalDays === 14 && perfectDays === 14) {
      console.log('🎉 PERFECT! All 14 days have exactly 4 games each!');
    } else if (totalDays === 14) {
      console.log('📅 Correct number of days (14) but some have incorrect game counts');
    } else {
      console.log(`❌ Incorrect number of days: expected 14, got ${totalDays}`);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await pool.end();
  }
}

verifySchedule();