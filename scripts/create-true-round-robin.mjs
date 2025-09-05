import pkg from 'pg';
const { Pool } = pkg;

console.log('🏆 Creating TRUE Round-Robin Schedule with Classic Algorithm...');

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

/**
 * TRUE Round-Robin Algorithm
 * Uses the classic "circle method" where teams are arranged in a circle
 * and one team stays fixed while others rotate around
 */
function createTrueRoundRobinSchedule(teams) {
  console.log('🎯 Using CLASSIC circle method round-robin algorithm...');
  
  if (teams.length !== 8) {
    throw new Error(`Need exactly 8 teams, got ${teams.length}`);
  }
  
  const schedule = [];
  const numTeams = teams.length;
  const numRounds = numTeams - 1; // 7 rounds for 8 teams
  
  // Create team array with one phantom team to make it even
  // Teams 0-7, where team 0 is fixed and teams 1-7 rotate
  const teamIndices = [0, 1, 2, 3, 4, 5, 6, 7];
  
  console.log('📋 Teams arranged for rotation:');
  teams.forEach((team, idx) => {
    console.log(`   Team ${idx}: ${team.name}`);
  });
  
  // Generate dates (September 1-14, 2025 in EDT)
  const startDate = new Date('2025-09-01');
  const gameDates = [];
  for (let day = 0; day < 14; day++) {
    const gameDate = new Date(startDate);
    gameDate.setDate(startDate.getDate() + day);
    // Set to 6 PM EDT initially
    gameDate.setHours(18, 0, 0, 0);
    gameDates.push({
      day: day + 1,
      date: gameDate
    });
  }
  
  // Generate double round-robin (2 cycles of 7 rounds each = 14 rounds total)
  for (let cycle = 0; cycle < 2; cycle++) {
    console.log(`\\n🔄 CYCLE ${cycle + 1} (${cycle === 0 ? 'First' : 'Second'} Round-Robin):`);
    
    // Initialize rotation array for this cycle
    let rotatingTeams = [1, 2, 3, 4, 5, 6, 7];
    
    for (let round = 0; round < numRounds; round++) {
      const overallRound = cycle * numRounds + round;
      const dayData = gameDates[overallRound];
      
      console.log(`\\n📅 Round ${overallRound + 1} - Day ${dayData.day} (${dayData.date.toDateString()}):`);
      
      const roundMatches = [];
      
      // Create matches for this round
      // Team 0 (fixed) always plays the first rotating team
      const team0Opponent = rotatingTeams[0];
      
      // Determine home/away (reverse for second cycle)
      let homeTeam, awayTeam;
      if (cycle === 0) {
        homeTeam = teams[0];          // Team 0 home
        awayTeam = teams[team0Opponent]; // Opponent away
      } else {
        homeTeam = teams[team0Opponent]; // Opponent home (reversed)
        awayTeam = teams[0];            // Team 0 away
      }
      
      // Game time staggered by 30 minutes
      const gameTime = new Date(dayData.date);
      gameTime.setMinutes(0); // Start at top of hour
      
      roundMatches.push({
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeTeamName: homeTeam.name,
        awayTeamName: awayTeam.name,
        gameDate: new Date(gameTime),
        day: dayData.day,
        round: overallRound + 1
      });
      
      console.log(`   Match 1: ${homeTeam.name} vs ${awayTeam.name}`);
      
      // Create the other 3 matches by pairing remaining teams
      for (let i = 1; i <= 3; i++) {
        const leftTeamIdx = rotatingTeams[i];
        const rightTeamIdx = rotatingTeams[rotatingTeams.length - i];
        
        // Determine home/away for other matches
        let homeTeam2, awayTeam2;
        if (cycle === 0) {
          homeTeam2 = teams[leftTeamIdx];
          awayTeam2 = teams[rightTeamIdx];
        } else {
          homeTeam2 = teams[rightTeamIdx];  // Reversed
          awayTeam2 = teams[leftTeamIdx];
        }
        
        gameTime.setMinutes(i * 30); // Stagger by 30 minutes
        
        roundMatches.push({
          homeTeamId: homeTeam2.id,
          awayTeamId: awayTeam2.id,
          homeTeamName: homeTeam2.name,
          awayTeamName: awayTeam2.name,
          gameDate: new Date(gameTime),
          day: dayData.day,
          round: overallRound + 1
        });
        
        console.log(`   Match ${i + 1}: ${homeTeam2.name} vs ${awayTeam2.name}`);
      }
      
      schedule.push(...roundMatches);
      
      // CRITICAL ROTATION: Move the last team to the front (classic method)
      const lastTeam = rotatingTeams.pop();
      rotatingTeams.unshift(lastTeam);
    }
  }
  
  return schedule;
}

async function generateTrueRoundRobin() {
  try {
    // Clear existing games
    console.log('🧹 Clearing all existing league games...');
    const deleteResult = await pool.query('DELETE FROM "Game" WHERE "matchType" = \'LEAGUE\'');
    console.log(`✅ Cleared ${deleteResult.rowCount} existing games`);
    
    // Get teams
    console.log('📋 Getting Division 7 Alpha teams...');
    const teams = await getTeamsInDivision();
    console.log(`✅ Found ${teams.length} teams:`, teams.map(t => t.name).join(', '));
    
    if (teams.length !== 8) {
      throw new Error(`Expected exactly 8 teams, got ${teams.length}`);
    }
    
    // Generate true round-robin schedule
    const schedule = createTrueRoundRobinSchedule(teams);
    
    console.log(`\\n📊 Generated ${schedule.length} total games`);
    
    // Quick validation: check if teams play different opponents
    const teamOpponents = {};
    teams.forEach(team => {
      teamOpponents[team.name] = new Set();
    });
    
    schedule.forEach(game => {
      teamOpponents[game.homeTeamName].add(game.awayTeamName);
      teamOpponents[game.awayTeamName].add(game.homeTeamName);
    });
    
    console.log('\\n🔍 Quick opponent validation:');
    Object.entries(teamOpponents).forEach(([teamName, opponents]) => {
      console.log(`   ${teamName}: plays ${opponents.size} different opponents`);
    });
    
    // Insert into database
    console.log('\\n💾 Inserting true round-robin schedule...');
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
    
    console.log(`\\n🏆 TRUE ROUND-ROBIN COMPLETE!`);
    console.log(`✅ Generated ${schedule.length} games using classic algorithm`);
    console.log(`✅ Each team should play every other team exactly twice`);
    console.log(`🎯 Ready for verification!`);
    
  } catch (error) {
    console.error('❌ True round-robin generation failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

generateTrueRoundRobin();