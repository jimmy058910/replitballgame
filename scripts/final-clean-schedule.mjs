import pkg from 'pg';
const { Pool } = pkg;

console.log('🏆 FINAL CLEAN Division 7 Alpha Schedule Generation...');

const pool = new Pool({
  connectionString: 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public',
  ssl: false
});

async function getTeamsInDivision() {
  const result = await pool.query(`
    SELECT id, name 
    FROM "Team" 
    WHERE division = 7 AND subdivision = 'alpha'
    ORDER BY name
  `);
  return result.rows;
}

async function clearAllDivision7Games() {
  console.log('🧹 Clearing ALL Division 7 Alpha games...');
  
  // Get team IDs first
  const teams = await getTeamsInDivision();
  const teamIds = teams.map(t => t.id);
  
  console.log(`📋 Found ${teams.length} Division 7 Alpha teams:`, teams.map(t => t.name).join(', '));
  
  // Clear all games where BOTH teams are from Division 7 Alpha
  const deleteResult = await pool.query(`
    DELETE FROM "Game" 
    WHERE "matchType" = 'LEAGUE'
      AND "homeTeamId" = ANY($1)
      AND "awayTeamId" = ANY($1)
  `, [teamIds]);
  
  console.log(`✅ Cleared ${deleteResult.rowCount} Division 7 Alpha games`);
  return teams;
}

/**
 * FINAL Industry Standard Round-Robin Algorithm
 * Using the proven table rotation method
 */
function generateFinalSchedule(teams) {
  console.log('🎯 Generating FINAL industry standard schedule...');
  
  if (teams.length !== 8) {
    throw new Error(`Need exactly 8 teams, got ${teams.length}`);
  }
  
  const schedule = [];
  const numRounds = 7; // 7 rounds for single round-robin
  
  // Team positions: 0 stays fixed, 1-7 rotate
  let positions = [0, 1, 2, 3, 4, 5, 6, 7];
  
  // Generate dates starting September 2, 2025
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
  
  console.log(`📅 Generated ${gameDates.length} consecutive dates\\n`);
  
  // Double round-robin: 2 cycles of 7 rounds each
  for (let cycle = 0; cycle < 2; cycle++) {
    console.log(`🔄 CYCLE ${cycle + 1}:`);
    
    // Reset positions for each cycle
    positions = [0, 1, 2, 3, 4, 5, 6, 7];
    
    for (let round = 0; round < numRounds; round++) {
      const overallRound = cycle * numRounds + round;
      const dayData = gameDates[overallRound];
      
      console.log(`\\n📅 Round ${overallRound + 1} - Day ${dayData.day} (${dayData.date.toDateString()}):`);
      
      // Create table: top row vs bottom row (reversed)
      const topRow = [positions[0], positions[1], positions[2], positions[3]];
      const bottomRow = [positions[7], positions[6], positions[5], positions[4]];
      
      const roundGames = [];
      
      // Create 4 matches by pairing columns
      for (let match = 0; match < 4; match++) {
        const team1Idx = topRow[match];
        const team2Idx = bottomRow[match];
        
        // For second cycle, reverse home/away
        let homeTeam, awayTeam;
        if (cycle === 0) {
          homeTeam = teams[team1Idx];
          awayTeam = teams[team2Idx];
        } else {
          homeTeam = teams[team2Idx];  // Reversed
          awayTeam = teams[team1Idx];
        }
        
        // Create game time (staggered by 30 minutes)
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
        console.log(`   Match ${match + 1}: ${homeTeam.name} vs ${awayTeam.name}`);
      }
      
      schedule.push(...roundGames);
      
      // CRITICAL: Proper rotation for next round
      // Keep position 0 fixed, rotate positions 1-7 clockwise
      if (round < numRounds - 1) {
        const temp = positions[7]; // Save last position
        for (let i = 7; i > 1; i--) {
          positions[i] = positions[i - 1]; // Shift right
        }
        positions[1] = temp; // Move saved to position 1
      }
    }
  }
  
  return schedule;
}

async function validateAndInsertSchedule(schedule, teams) {
  console.log('\\n🔍 Final validation...');
  
  if (schedule.length !== 56) {
    throw new Error(`Expected 56 games, got ${schedule.length}`);
  }
  
  // Validate 4 games per day
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
  
  console.log('✅ Validation passed: 56 games, 14 days, 4 games per day');
  
  // Insert into database
  console.log('💾 Inserting final schedule...');
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
  
  console.log('🎉 FINAL SCHEDULE INSERTED SUCCESSFULLY!');
}

async function generateFinalCleanSchedule() {
  try {
    // Step 1: Clear all existing Division 7 Alpha games
    const teams = await clearAllDivision7Games();
    
    // Step 2: Generate fresh schedule
    const schedule = generateFinalSchedule(teams);
    
    // Step 3: Validate and insert
    await validateAndInsertSchedule(schedule, teams);
    
    console.log('\\n🏆 FINAL CLEAN SCHEDULE COMPLETE!');
    console.log('✅ 56 games generated using industry standard algorithm');
    console.log('✅ Perfect double round-robin with proper rotation');
    console.log('✅ 14 consecutive days, 4 games per day');
    console.log('✅ Each team plays every opponent exactly twice');
    console.log('🎯 Ready for alpha testing!');
    
  } catch (error) {
    console.error('❌ Final schedule generation failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

generateFinalCleanSchedule();