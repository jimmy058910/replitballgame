import pkg from 'pg';
const { Pool } = pkg;

console.log('🔧 Fixing Azure Dragons roster - removing duplicate players...');

const pool = new Pool({
  connectionString: 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public',
  ssl: false
});

async function fixAzureDragonsRoster() {
  try {
    // Check current roster size
    const currentRoster = await pool.query(`
      SELECT COUNT(*) as player_count 
      FROM "Player" 
      WHERE "teamId" = 20
    `);
    
    console.log(`📊 Current Azure Dragons roster size: ${currentRoster.rows[0].player_count} players`);
    
    // List all players to identify the original 12
    const allPlayers = await pool.query(`
      SELECT id, "firstName", "lastName", "createdAt"
      FROM "Player" 
      WHERE "teamId" = 20
      ORDER BY id ASC
    `);
    
    console.log('📋 Current roster:');
    allPlayers.rows.forEach((player, index) => {
      const marker = index < 12 ? '✅ KEEP' : '❌ DELETE';
      console.log(`   ${marker} ID ${player.id}: ${player.firstName} ${player.lastName}`);
    });
    
    // Delete the duplicate players (IDs 313-324)
    console.log('\n🗑️ Removing duplicate players...');
    const deleteResult = await pool.query(`
      DELETE FROM "Player" 
      WHERE "teamId" = 20 AND id >= 313
    `);
    
    console.log(`✅ Deleted ${deleteResult.rowCount} duplicate players`);
    
    // Verify final roster
    const finalRoster = await pool.query(`
      SELECT COUNT(*) as player_count 
      FROM "Player" 
      WHERE "teamId" = 20
    `);
    
    console.log(`🎯 Final Azure Dragons roster size: ${finalRoster.rows[0].player_count} players`);
    
    // List final roster
    const finalPlayers = await pool.query(`
      SELECT id, "firstName", "lastName", role, "injuryStatus"
      FROM "Player" 
      WHERE "teamId" = 20
      ORDER BY id ASC
    `);
    
    console.log('\n📋 Final roster:');
    finalPlayers.rows.forEach((player) => {
      console.log(`   ✅ ID ${player.id}: ${player.firstName} ${player.lastName} (${player.role}) - ${player.injuryStatus}`);
    });
    
    console.log('\n🎉 Azure Dragons roster fixed! Ready for match simulation.');
    
  } catch (error) {
    console.error('❌ Error fixing roster:', error);
  } finally {
    await pool.end();
  }
}

fixAzureDragonsRoster();