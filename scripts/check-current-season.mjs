import pkg from 'pg';
const { Pool } = pkg;

console.log('🔍 Checking current season data...');

const pool = new Pool({
  connectionString: 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public',
  ssl: false
});

async function checkCurrentSeason() {
  try {
    // Get current season
    const currentSeason = await pool.query(`
      SELECT * FROM "Season" ORDER BY id DESC LIMIT 1
    `);
    
    if (currentSeason.rows.length > 0) {
      const season = currentSeason.rows[0];
      console.log('\n📊 CURRENT SEASON DATA:');
      console.log('   ID:', season.id);
      console.log('   Season Number:', season.seasonNumber);
      console.log('   Start Date:', season.startDate);
      console.log('   Current Day:', season.currentDay);
      console.log('   Day In Cycle:', season.dayInCycle);
      console.log('   Status:', season.status);
      console.log('   Created At:', season.createdAt);
    } else {
      console.log('❌ No season data found!');
    }
    
    // Check first game date
    const firstGame = await pool.query(`
      SELECT "gameDate" 
      FROM "Game" 
      WHERE "matchType" = 'LEAGUE'
      ORDER BY "gameDate" ASC 
      LIMIT 1
    `);
    
    if (firstGame.rows.length > 0) {
      const gameDate = new Date(firstGame.rows[0].gameDate);
      console.log('\n🎮 FIRST GAME DATE:');
      console.log('   Date:', gameDate.toISOString());
      console.log('   Formatted:', gameDate.toDateString());
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await pool.end();
  }
}

checkCurrentSeason();