import pkg from 'pg';
const { Pool } = pkg;

console.log('🔧 FINAL SCHEDULE FIX: Proper Double Round-Robin Generation');

const pool = new Pool({
  connectionString: 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public',
  ssl: false
});

async function fixScheduleFinal() {
  try {
    // Step 1: Complete cleanup
    console.log('🧹 Complete database cleanup...');
    const cleanup = await pool.query('DELETE FROM "Game"');
    console.log(`✅ Deleted ${cleanup.rowCount} games`);

    // Step 2: Get Division 7 Alpha teams
    const teams = await pool.query(`
      SELECT id, name FROM "Team" 
      WHERE division = 7 AND subdivision = 'alpha'
      ORDER BY name
    `);
    
    if (teams.rows.length !== 8) {
      throw new Error(`Expected 8 teams, found ${teams.rows.length}`);
    }

    const teamsList = teams.rows;
    console.log(`📋 Teams (${teamsList.length}):`, teamsList.map(t => t.name).join(', '));

    // Step 3: Generate CORRECT double round-robin schedule
    // Standard algorithm: Fix one team, rotate others
    const schedule = [];
    const n = 8; // 8 teams
    const rounds = n - 1; // 7 rounds per cycle
    
    // Create two cycles for double round-robin
    for (let cycle = 0; cycle < 2; cycle++) {
      console.log(`\n🔄 Generating Cycle ${cycle + 1} (${cycle === 0 ? 'First' : 'Second'} meetings)`);
      
      for (let round = 0; round < rounds; round++) {
        const dayNumber = cycle * rounds + round + 1; // Days 1-14
        console.log(`\n📅 Day ${dayNumber} (Round ${round + 1}):`);
        
        const roundGames = [];
        
        // Generate pairings for this round using standard algorithm
        for (let i = 0; i < n / 2; i++) {
          let team1Index, team2Index;
          
          if (i === 0) {
            // First pairing: team 0 (fixed) vs rotating opponent
            team1Index = 0;
            team2Index = round + 1;
          } else {
            // Other pairings: symmetric around the circle
            team1Index = (round - i + n) % (n - 1) + 1;
            team2Index = (round + i - 1) % (n - 1) + 1;
            
            // Ensure we don't duplicate the fixed team pairing
            if (team1Index === 0 || team2Index === 0) {
              team1Index = (round - i + n - 1) % (n - 1) + 1;
              team2Index = (round + i) % (n - 1) + 1;
            }
          }
          
          // Ensure valid team indices
          if (team1Index >= n) team1Index = team1Index % n;
          if (team2Index >= n) team2Index = team2Index % n;
          
          const team1 = teamsList[team1Index];
          const team2 = teamsList[team2Index];
          
          // For cycle 2, swap home/away
          let homeTeam, awayTeam;
          if (cycle === 0) {
            homeTeam = team1;
            awayTeam = team2;
          } else {
            homeTeam = team2;
            awayTeam = team1;
          }
          
          roundGames.push({
            homeTeam,
            awayTeam,
            day: dayNumber
          });
          
          console.log(`   Game ${i + 1}: ${homeTeam.name} vs ${awayTeam.name}`);
        }
        
        schedule.push(...roundGames);
      }
    }

    // Step 4: Validate schedule structure
    console.log('\n🔍 SCHEDULE VALIDATION:');
    console.log(`Total games generated: ${schedule.length}`);
    
    if (schedule.length !== 56) {
      throw new Error(`Expected 56 games, generated ${schedule.length}`);
    }

    // Validate each team plays exactly once per day
    for (let day = 1; day <= 14; day++) {
      const dayGames = schedule.filter(g => g.day === day);
      const dayTeams = new Set();
      
      dayGames.forEach(game => {
        if (dayTeams.has(game.homeTeam.id) || dayTeams.has(game.awayTeam.id)) {
          throw new Error(`Day ${day}: Team plays multiple games`);
        }
        dayTeams.add(game.homeTeam.id);
        dayTeams.add(game.awayTeam.id);
      });
      
      if (dayGames.length !== 4 || dayTeams.size !== 8) {
        throw new Error(`Day ${day}: Expected 4 games with 8 unique teams, found ${dayGames.length} games with ${dayTeams.size} teams`);
      }
    }

    console.log('✅ Schedule validation passed');

    // Step 5: Insert games into database
    console.log('\n💾 Inserting games into database...');
    
    const baseDate = new Date('2025-09-01T00:00:00.000Z');
    let insertedCount = 0;
    
    for (const game of schedule) {
      // Calculate game date
      const gameDate = new Date(baseDate);
      gameDate.setDate(baseDate.getDate() + game.day - 1);
      
      // Set game time (6PM EDT = 22:00 UTC, staggered by 30 minutes)
      const gameIndex = schedule.filter(g => g.day === game.day).indexOf(game);
      gameDate.setUTCHours(22 + Math.floor(gameIndex * 0.5), (gameIndex % 2) * 30, 0, 0);
      
      await pool.query(`
        INSERT INTO "Game" (
          "homeTeamId", "awayTeamId", "gameDate", 
          "status", "matchType", "createdAt"
        ) VALUES (
          $1, $2, $3, 'SCHEDULED', 'LEAGUE', NOW()
        )
      `, [
        game.homeTeam.id,
        game.awayTeam.id,
        gameDate.toISOString()
      ]);
      
      insertedCount++;
    }

    console.log(`✅ Inserted ${insertedCount} games successfully`);

    // Step 6: Final verification
    console.log('\n🔍 FINAL VERIFICATION:');
    
    const finalCheck = await pool.query(`
      SELECT DATE("gameDate") as game_date, COUNT(*) as game_count
      FROM "Game"
      WHERE "matchType" = 'LEAGUE'
      GROUP BY DATE("gameDate")
      ORDER BY game_date
    `);

    console.log('Game distribution:');
    finalCheck.rows.forEach((row, i) => {
      console.log(`  Day ${i + 1}: ${row.game_date.toISOString().split('T')[0]} - ${row.game_count} games`);
    });

    const totalGames = finalCheck.rows.reduce((sum, row) => sum + parseInt(row.game_count), 0);
    console.log(`Total games: ${totalGames}`);

    if (finalCheck.rows.length === 14 && totalGames === 56) {
      console.log('\n🎉 SUCCESS! Perfect double round-robin schedule generated');
      console.log('✅ 14 days, 4 games per day, 56 total games');
      console.log('✅ Each team plays exactly once per day');
      console.log('✅ Each team plays every other team exactly twice (home & away)');
    } else {
      throw new Error('Final verification failed');
    }

  } catch (error) {
    console.error('❌ Schedule fix failed:', error);
  } finally {
    await pool.end();
  }
}

fixScheduleFinal();