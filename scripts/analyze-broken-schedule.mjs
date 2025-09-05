import pkg from 'pg';
const { Pool } = pkg;

console.log('🔍 Analyzing the broken schedule...');

const pool = new Pool({
  connectionString: 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public',
  ssl: false
});

async function analyzeBrokenSchedule() {
  try {
    // Check all games by date
    const allGames = await pool.query(`
      SELECT 
        DATE(g."gameDate") as game_date,
        COUNT(*) as game_count
      FROM "Game" g
      WHERE g."matchType" = 'LEAGUE'
      GROUP BY DATE(g."gameDate")
      ORDER BY game_date
    `);

    console.log('\n📅 COMPLETE SCHEDULE ANALYSIS:');
    console.log('='.repeat(50));

    const seasonStart = new Date('2025-09-01T00:00:00.000Z');
    allGames.rows.forEach((row, index) => {
      const gameDate = new Date(row.game_date);
      const daysDiff = Math.floor((gameDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
      const dayNumber = daysDiff + 1;
      
      console.log(`Day ${dayNumber}: ${row.game_date.toISOString().split('T')[0]} - ${row.game_count} games`);
      if (parseInt(row.game_count) !== 4) {
        console.log(`  ⚠️ INCORRECT: Expected 4 games, found ${row.game_count}`);
      }
    });

    console.log(`\nTotal game dates: ${allGames.rows.length}`);
    console.log(`Total games: ${allGames.rows.reduce((sum, row) => sum + parseInt(row.game_count), 0)}`);

    // Check for missing days
    const expectedDays = Array.from({length: 14}, (_, i) => i + 1);
    const actualDays = allGames.rows.map((row, index) => {
      const gameDate = new Date(row.game_date);
      const daysDiff = Math.floor((gameDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff + 1;
    });

    const missingDays = expectedDays.filter(day => !actualDays.includes(day));
    if (missingDays.length > 0) {
      console.log(`\n❌ MISSING DAYS: ${missingDays.join(', ')}`);
    }

    // Check Oakland Cougars specifically
    const oaklandGames = await pool.query(`
      SELECT 
        DATE(g."gameDate") as game_date,
        COUNT(*) as games_per_day
      FROM "Game" g
      JOIN "Team" ht ON g."homeTeamId" = ht.id
      JOIN "Team" at ON g."awayTeamId" = at.id
      WHERE (ht.name = 'Oakland Cougars' OR at.name = 'Oakland Cougars')
        AND g."matchType" = 'LEAGUE'
      GROUP BY DATE(g."gameDate")
      ORDER BY game_date
    `);

    console.log('\n🎯 OAKLAND COUGARS ANALYSIS:');
    console.log('='.repeat(30));
    oaklandGames.rows.forEach(row => {
      console.log(`${row.game_date.toISOString().split('T')[0]}: ${row.games_per_day} games`);
      if (parseInt(row.games_per_day) > 1) {
        console.log(`  ❌ VIOLATION: Oakland should have max 1 game per day, found ${row.games_per_day}`);
      }
    });

    console.log(`\nOakland total games: ${oaklandGames.rows.reduce((sum, row) => sum + parseInt(row.games_per_day), 0)}`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await pool.end();
  }
}

analyzeBrokenSchedule();