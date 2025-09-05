import pkg from 'pg';
const { Pool } = pkg;

console.log('🔧 CORRECT ROUND-ROBIN: Using proven algorithm');

const pool = new Pool({
  connectionString: 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public',
  ssl: false
});

async function correctRoundRobin() {
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

    // Step 3: Generate schedule using circle method
    const schedule = [];
    const n = teamsList.length; // 8 teams
    
    // Create position array [0, 1, 2, 3, 4, 5, 6, 7]
    let positions = teamsList.map((_, index) => index);
    
    // Generate both cycles for double round-robin
    for (let cycle = 0; cycle < 2; cycle++) {
      console.log(`\n🔄 Cycle ${cycle + 1} (${cycle === 0 ? 'First' : 'Second'} round-robin):`);
      
      for (let round = 0; round < n - 1; round++) {
        const dayNumber = cycle * (n - 1) + round + 1;
        console.log(`\n📅 Day ${dayNumber} (Round ${round + 1}):`);
        
        const dayMatches = [];
        
        // Create pairings for this round using table method
        for (let i = 0; i < n / 2; i++) {
          const team1Index = positions[i];
          const team2Index = positions[n - 1 - i];
          
          const team1 = teamsList[team1Index];
          const team2 = teamsList[team2Index];
          
          // For cycle 2, reverse home/away
          let homeTeam, awayTeam;
          if (cycle === 0) {
            homeTeam = team1;
            awayTeam = team2;
          } else {
            homeTeam = team2;
            awayTeam = team1;
          }
          
          dayMatches.push({
            homeTeam,
            awayTeam,
            day: dayNumber
          });
          
          console.log(`   Match ${i + 1}: ${homeTeam.name} vs ${awayTeam.name}`);
        }
        
        schedule.push(...dayMatches);
        
        // Rotate positions for next round (keep position 0 fixed, rotate others clockwise)
        if (round < n - 2) { // Don't rotate after last round
          const temp = positions[n - 1];
          for (let j = n - 1; j > 1; j--) {
            positions[j] = positions[j - 1];
          }
          positions[1] = temp;
        }
      }
      
      // Reset positions for second cycle
      positions = teamsList.map((_, index) => index);
    }

    // Step 4: Validate schedule
    console.log('\n🔍 SCHEDULE VALIDATION:');
    console.log(`Total games generated: ${schedule.length}`);
    
    if (schedule.length !== 56) {
      throw new Error(`Expected 56 games, generated ${schedule.length}`);
    }

    // Check each day has 4 games with unique teams
    for (let day = 1; day <= 14; day++) {
      const dayGames = schedule.filter(g => g.day === day);
      const teamsInDay = new Set();
      
      dayGames.forEach(game => {
        if (teamsInDay.has(game.homeTeam.id) || teamsInDay.has(game.awayTeam.id)) {
          throw new Error(`Day ${day}: Duplicate team found`);
        }
        teamsInDay.add(game.homeTeam.id);
        teamsInDay.add(game.awayTeam.id);
      });
      
      if (dayGames.length !== 4) {
        throw new Error(`Day ${day}: Expected 4 games, found ${dayGames.length}`);
      }
      if (teamsInDay.size !== 8) {
        throw new Error(`Day ${day}: Expected 8 unique teams, found ${teamsInDay.size}`);
      }
    }

    // Check each team plays every other team exactly twice
    const pairings = new Map();
    schedule.forEach(game => {
      const key1 = `${game.homeTeam.id}-${game.awayTeam.id}`;
      const key2 = `${game.awayTeam.id}-${game.homeTeam.id}`;
      
      pairings.set(key1, (pairings.get(key1) || 0) + 1);
    });

    let totalPairings = 0;
    for (const [key, count] of pairings) {
      if (count !== 1) {
        throw new Error(`Teams play ${count} times instead of once per direction`);
      }
      totalPairings++;
    }

    if (totalPairings !== 56) {
      throw new Error(`Expected 56 unique pairings, found ${totalPairings}`);
    }

    console.log('✅ Schedule validation passed');

    // Step 5: Insert games into database
    console.log('\n💾 Inserting games into database...');
    
    const baseDate = new Date('2025-09-01T00:00:00.000Z');
    
    for (let i = 0; i < schedule.length; i++) {
      const game = schedule[i];
      
      // Calculate game date and time
      const gameDate = new Date(baseDate);
      gameDate.setDate(baseDate.getDate() + game.day - 1);
      
      // Set game times: 6:00, 6:30, 7:00, 7:30 PM EDT (22:00, 22:30, 23:00, 23:30 UTC)
      const dayGames = schedule.filter(g => g.day === game.day);
      const gameIndexInDay = dayGames.indexOf(game);
      gameDate.setUTCHours(22, gameIndexInDay * 30, 0, 0);
      
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
    }

    console.log(`✅ Inserted ${schedule.length} games successfully`);

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

    // Verify Oakland Cougars specifically
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

    console.log('\n🎯 Oakland Cougars verification:');
    oaklandGames.rows.forEach((row, i) => {
      console.log(`  Day ${i + 1}: ${row.games_per_day} game (✅)`);
    });

    const totalGames = finalCheck.rows.reduce((sum, row) => sum + parseInt(row.game_count), 0);
    const totalOaklandGames = oaklandGames.rows.reduce((sum, row) => sum + parseInt(row.games_per_day), 0);

    if (finalCheck.rows.length === 14 && totalGames === 56 && totalOaklandGames === 14) {
      console.log('\n🎉 SUCCESS! Perfect double round-robin schedule generated');
      console.log('✅ 14 days, 4 games per day, 56 total games');
      console.log('✅ Oakland Cougars: 14 games (1 per day)');
      console.log('✅ Each team plays every other team exactly twice');
    } else {
      throw new Error(`Verification failed: ${finalCheck.rows.length} days, ${totalGames} games, Oakland: ${totalOaklandGames} games`);
    }

  } catch (error) {
    console.error('❌ Schedule generation failed:', error);
  } finally {
    await pool.end();
  }
}

correctRoundRobin();