import pkg from 'pg';
const { Pool } = pkg;

console.log('🛠️ ABSOLUTE FINAL CLEAN: Division 7 Alpha ONLY...');

const pool = new Pool({
  connectionString: 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public',
  ssl: false
});

async function getDiv7AlphaTeams() {
  const result = await pool.query(`
    SELECT id, name 
    FROM "Team" 
    WHERE division = 7 AND subdivision = 'alpha'
    ORDER BY name
  `);
  return result.rows;
}

async function absoluteCleanDatabase() {
  console.log('🧹 ABSOLUTE DATABASE CLEAN...');
  
  // Get Division 7 Alpha teams
  const teams = await getDiv7AlphaTeams();
  const teamIds = teams.map(t => t.id);
  
  console.log(`📋 Division 7 Alpha teams (${teams.length}):`, teams.map(t => t.name).join(', '));
  
  // Step 1: Delete ALL games involving ANY Division 7 Alpha team
  console.log('\\n🗑️ Removing ALL games involving Division 7 Alpha teams...');
  const deleteAllResult = await pool.query(`
    DELETE FROM "Game" 
    WHERE "matchType" = 'LEAGUE'
      AND ("homeTeamId" = ANY($1) OR "awayTeamId" = ANY($1))
  `, [teamIds]);
  
  console.log(`✅ Deleted ${deleteAllResult.rowCount} contaminated games`);
  
  // Step 2: Verify complete clean
  const verifyResult = await pool.query(`
    SELECT COUNT(*) as count
    FROM "Game" g
    JOIN "Team" ht ON g."homeTeamId" = ht.id
    JOIN "Team" at ON g."awayTeamId" = at.id
    WHERE g."matchType" = 'LEAGUE'
      AND (ht.id = ANY($1) OR at.id = ANY($1))
  `, [teamIds]);
  
  console.log(`🔍 Verification: ${verifyResult.rows[0].count} remaining games involving Division 7 Alpha`);
  
  if (parseInt(verifyResult.rows[0].count) > 0) {
    throw new Error('Database still contaminated!');
  }
  
  console.log('✅ Database completely clean');
  return teams;
}

function generatePureDivision7Schedule(teams) {
  console.log('\\n🎯 Generating PURE Division 7 Alpha schedule...');
  
  if (teams.length !== 8) {
    throw new Error(`Need exactly 8 teams, got ${teams.length}`);
  }
  
  const schedule = [];
  const numRounds = 7;
  
  // Team positions for rotation (0 stays fixed)
  let positions = [0, 1, 2, 3, 4, 5, 6, 7];
  
  // Generate dates: September 2-15, 2025
  const startDate = new Date('2025-09-02');
  const gameDates = [];
  for (let day = 0; day < 14; day++) {
    const gameDate = new Date(startDate);
    gameDate.setDate(startDate.getDate() + day);
    gameDate.setHours(18, 0, 0, 0); // 6 PM EDT
    gameDates.push({
      day: day + 1,
      date: gameDate
    });
  }
  
  console.log(`📅 Generated ${gameDates.length} consecutive dates (${gameDates[0].date.toDateString()} to ${gameDates[13].date.toDateString()})\\n`);
  
  // Double round-robin: 2 cycles
  for (let cycle = 0; cycle < 2; cycle++) {
    console.log(`🔄 CYCLE ${cycle + 1} (${cycle === 0 ? 'First' : 'Second'} Round-Robin):`);
    
    // Reset positions for each cycle
    positions = [0, 1, 2, 3, 4, 5, 6, 7];
    
    for (let round = 0; round < numRounds; round++) {
      const overallRound = cycle * numRounds + round;
      const dayData = gameDates[overallRound];
      
      console.log(`\\n📅 Round ${overallRound + 1} - Day ${dayData.day} (${dayData.date.toDateString()}):`);
      
      // Table method: top vs bottom (reversed)
      const topRow = [positions[0], positions[1], positions[2], positions[3]];
      const bottomRow = [positions[7], positions[6], positions[5], positions[4]];
      
      const roundGames = [];
      
      // Create 4 matches
      for (let match = 0; match < 4; match++) {
        const team1Idx = topRow[match];
        const team2Idx = bottomRow[match];
        
        // Second cycle: reverse home/away
        let homeTeam, awayTeam;
        if (cycle === 0) {
          homeTeam = teams[team1Idx];
          awayTeam = teams[team2Idx];
        } else {
          homeTeam = teams[team2Idx];
          awayTeam = teams[team1Idx];
        }
        
        // Game time (staggered by 30 minutes)
        const gameTime = new Date(dayData.date);
        gameTime.setMinutes(match * 30);
        
        const game = {
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          homeTeamName: homeTeam.name,
          awayTeamName: awayTeam.name,
          gameDate: gameTime,
          day: dayData.day,
          round: overallRound + 1
        };
        
        roundGames.push(game);
        console.log(`   Game ${match + 1}: ${homeTeam.name} vs ${awayTeam.name}`);
      }
      
      schedule.push(...roundGames);
      
      // Rotate for next round (keep position 0 fixed)
      if (round < numRounds - 1) {
        const temp = positions[7];
        for (let i = 7; i > 1; i--) {
          positions[i] = positions[i - 1];
        }
        positions[1] = temp;
      }
    }
  }
  
  return schedule;
}

async function insertPureSchedule(schedule) {
  console.log('\\n💾 Inserting PURE Division 7 Alpha schedule...');
  
  if (schedule.length !== 56) {
    throw new Error(`Expected 56 games, got ${schedule.length}`);
  }
  
  // Validate 4 games per day for 14 days
  const gamesByDay = {};
  schedule.forEach(game => {
    if (!gamesByDay[game.day]) gamesByDay[game.day] = [];
    gamesByDay[game.day].push(game);
  });
  
  for (let day = 1; day <= 14; day++) {
    const dayGames = gamesByDay[day] || [];
    if (dayGames.length !== 4) {
      throw new Error(`Day ${day} has ${dayGames.length} games, expected 4`);
    }
  }
  
  console.log('✅ Pre-insertion validation: 56 games, 14 days, 4 games per day');
  
  // Insert games
  for (let i = 0; i < schedule.length; i++) {
    const game = schedule[i];
    await pool.query(`
      INSERT INTO "Game" (
        "homeTeamId", "awayTeamId", "gameDate", 
        "status", "matchType", "createdAt"
      ) VALUES (
        $1, $2, $3, 'SCHEDULED', 'LEAGUE', NOW()
      )
    `, [
      game.homeTeamId,
      game.awayTeamId,
      game.gameDate.toISOString()
    ]);
    
    if ((i + 1) % 14 === 0) {
      console.log(`✅ Inserted ${i + 1}/${schedule.length} games...`);
    }
  }
  
  console.log('✅ All 56 games inserted successfully');
}

async function finalVerification(teams) {
  console.log('\\n🔍 FINAL VERIFICATION...');
  
  const teamIds = teams.map(t => t.id);
  
  // Get all games involving Division 7 Alpha teams
  const result = await pool.query(`
    SELECT 
      g.id,
      DATE(g."gameDate") as game_date,
      ht.name as home_team,
      at.name as away_team,
      ht.division as home_div,
      ht.subdivision as home_sub,
      at.division as away_div,
      at.subdivision as away_sub
    FROM "Game" g
    JOIN "Team" ht ON g."homeTeamId" = ht.id
    JOIN "Team" at ON g."awayTeamId" = at.id
    WHERE g."matchType" = 'LEAGUE'
      AND (ht.id = ANY($1) OR at.id = ANY($1))
    ORDER BY g."gameDate"
  `, [teamIds]);
  
  // Check for contamination
  const pureGames = result.rows.filter(game => 
    game.home_div === 7 && game.home_sub === 'alpha' && 
    game.away_div === 7 && game.away_sub === 'alpha'
  );
  
  const contaminatedGames = result.rows.filter(game => 
    !(game.home_div === 7 && game.home_sub === 'alpha' && 
      game.away_div === 7 && game.away_sub === 'alpha')
  );
  
  console.log(`📊 Total games involving Division 7 Alpha: ${result.rows.length}`);
  console.log(`✅ Pure Division 7 Alpha games: ${pureGames.length}`);
  console.log(`❌ Contaminated games: ${contaminatedGames.length}`);
  
  if (contaminatedGames.length > 0) {
    console.log('\\n❌ CONTAMINATION STILL EXISTS:');
    contaminatedGames.forEach(game => {
      console.log(`   ${game.home_team} (${game.home_div}-${game.home_sub}) vs ${game.away_team} (${game.away_div}-${game.away_sub})`);
    });
    throw new Error('Schedule still contaminated!');
  }
  
  if (pureGames.length !== 56) {
    throw new Error(`Expected 56 pure games, got ${pureGames.length}`);
  }
  
  // Check game distribution
  const gamesByDate = {};
  pureGames.forEach(game => {
    const dateKey = game.game_date.toISOString().split('T')[0];
    if (!gamesByDate[dateKey]) gamesByDate[dateKey] = [];
    gamesByDate[dateKey].push(game);
  });
  
  const dates = Object.keys(gamesByDate).sort();
  console.log(`\\n📅 Game distribution across ${dates.length} days:`);
  dates.forEach((date, index) => {
    const dayGames = gamesByDate[date];
    const status = dayGames.length === 4 ? '✅' : '❌';
    console.log(`   ${status} Day ${index + 1} (${date}): ${dayGames.length} games`);
  });
  
  if (dates.length === 14 && dates.every(date => gamesByDate[date].length === 4)) {
    console.log('\\n🎉 ABSOLUTE SUCCESS!');
    console.log('✅ 56 pure Division 7 Alpha games');
    console.log('✅ 14 consecutive days');
    console.log('✅ 4 games per day');
    console.log('✅ Zero contamination');
    console.log('🎯 Schedule is PERFECT for alpha testing!');
  } else {
    throw new Error('Final verification failed');
  }
}

async function runAbsoluteFinalClean() {
  try {
    // Step 1: Absolute database clean
    const teams = await absoluteCleanDatabase();
    
    // Step 2: Generate pure schedule
    const schedule = generatePureDivision7Schedule(teams);
    
    // Step 3: Insert pure schedule
    await insertPureSchedule(schedule);
    
    // Step 4: Final verification
    await finalVerification(teams);
    
    console.log('\\n🏆 ABSOLUTE FINAL CLEAN COMPLETE!');
    console.log('🎯 Division 7 Alpha schedule is now 100% pure and ready!');
    
  } catch (error) {
    console.error('❌ Absolute final clean failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

runAbsoluteFinalClean();