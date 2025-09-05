import pkg from 'pg';
const { Pool } = pkg;

console.log('🧹 Starting SQL database cleanup...');

// Use the same DATABASE_URL format as server but disable SSL for localhost
const DATABASE_URL = 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false
});

async function clearDatabase() {
  try {
    console.log('🔗 Connecting to database...');
    
    // Delete all games
    console.log('🗑️  Deleting all games...');
    const deleteResult = await pool.query('DELETE FROM "Game"');
    console.log(`✅ Deleted ${deleteResult.rowCount} games`);
    
    // Reset all team statistics
    console.log('📊 Resetting team statistics...');
    const resetTeams = await pool.query(`
      UPDATE "Team" SET 
        wins = 0, 
        losses = 0, 
        draws = 0, 
        points = 0
    `);
    console.log(`✅ Reset ${resetTeams.rowCount} teams`);
    
    // Reset season to Day 1
    console.log('📅 Resetting seasons to Day 1...');
    const resetSeasons = await pool.query('UPDATE "Season" SET "currentDay" = 1');
    console.log(`✅ Reset ${resetSeasons.rowCount} seasons`);
    
    console.log('🎉 Database cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await pool.end();
  }
}

clearDatabase();