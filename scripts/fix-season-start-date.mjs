import pkg from 'pg';
const { Pool } = pkg;

console.log('🔧 Fixing season start date to match game schedule...');

const pool = new Pool({
  connectionString: 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public',
  ssl: false
});

async function fixSeasonStartDate() {
  try {
    // Get current season
    const currentSeason = await pool.query(`
      SELECT * FROM "Season" ORDER BY id DESC LIMIT 1
    `);
    
    if (currentSeason.rows.length === 0) {
      console.log('❌ No season found!');
      return;
    }
    
    const season = currentSeason.rows[0];
    console.log('📊 Current season:', season.id, '- Start Date:', season.startDate);
    
    // Get first game date to determine correct season start  
    const firstGame = await pool.query(`
      SELECT "gameDate" 
      FROM "Game" 
      WHERE "matchType" = 'LEAGUE'
      ORDER BY "gameDate" ASC 
      LIMIT 1
    `);
    
    if (firstGame.rows.length === 0) {
      console.log('❌ No games found!');
      return;
    }
    
    const firstGameDate = new Date(firstGame.rows[0].gameDate);
    console.log('🎮 First game date:', firstGameDate.toISOString());
    
    // Create correct season start date: September 1, 2025 at 00:00 UTC
    const correctStartDate = new Date('2025-09-01T00:00:00.000Z');
    console.log('✅ Correct season start date should be:', correctStartDate.toISOString());
    
    // Update season start date
    const updateResult = await pool.query(`
      UPDATE "Season" 
      SET "startDate" = $1
      WHERE id = $2
    `, [correctStartDate, season.id]);
    
    console.log(`✅ Updated ${updateResult.rowCount} season record`);
    
    // Verify the update
    const updatedSeason = await pool.query(`
      SELECT * FROM "Season" WHERE id = $1
    `, [season.id]);
    
    const updated = updatedSeason.rows[0];
    console.log('🔍 Updated season start date:', updated.startDate);
    
    // Calculate what day we should be on now
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - correctStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentDay = Math.max(1, Math.min(17, daysSinceStart + 1));
    
    console.log(`📅 Based on correct start date, current day should be: ${currentDay}`);
    
    // Update current day too
    const updateDay = await pool.query(`
      UPDATE "Season" 
      SET "currentDay" = $1
      WHERE id = $2
    `, [currentDay, season.id]);
    
    console.log(`✅ Updated current day to ${currentDay}`);
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await pool.end();
  }
}

fixSeasonStartDate();