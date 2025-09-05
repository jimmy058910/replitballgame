import pkg from 'pg';
const { Pool } = pkg;

console.log('🔍 Analyzing current schedule...');

const pool = new Pool({
  connectionString: 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public',
  ssl: false
});

async function analyzeSchedule() {
  try {
    // Get all teams
    const teamsResult = await pool.query(`
      SELECT id, name 
      FROM "Team" 
      WHERE division = 7 AND subdivision = 'alpha'
      ORDER BY name
    `);
    const teams = teamsResult.rows;
    
    // Get all league games
    const gamesResult = await pool.query(`
      SELECT 
        g.id,
        g."homeTeamId",
        g."awayTeamId", 
        g."gameDate",
        DATE(g."gameDate") as game_date,
        ht.name as home_team_name,
        at.name as away_team_name
      FROM "Game" g
      JOIN "Team" ht ON g."homeTeamId" = ht.id
      JOIN "Team" at ON g."awayTeamId" = at.id
      WHERE g."matchType" = 'LEAGUE'
      ORDER BY g."gameDate"
    `);
    const games = gamesResult.rows;
    
    console.log(`📊 Found ${teams.length} teams and ${games.length} games`);
    
    // Analyze by day
    const gamesByDate = {};
    games.forEach(game => {
      const dateKey = game.game_date.toISOString().split('T')[0];
      if (!gamesByDate[dateKey]) gamesByDate[dateKey] = [];
      gamesByDate[dateKey].push(game);
    });
    
    console.log(`📅 Games span ${Object.keys(gamesByDate).length} days:`);
    Object.entries(gamesByDate).forEach(([date, dayGames], index) => {
      console.log(`   Day ${index + 1} (${date}): ${dayGames.length} games`);
    });
    
    // Analyze home/away balance per team
    const teamStats = {};
    teams.forEach(team => {
      teamStats[team.name] = {
        id: team.id,
        home: 0,
        away: 0,
        total: 0,
        opponents: new Set()
      };
    });
    
    games.forEach(game => {
      const homeTeam = game.home_team_name;
      const awayTeam = game.away_team_name;
      
      teamStats[homeTeam].home++;
      teamStats[homeTeam].total++;
      teamStats[homeTeam].opponents.add(awayTeam);
      
      teamStats[awayTeam].away++;
      teamStats[awayTeam].total++;
      teamStats[awayTeam].opponents.add(homeTeam);
    });
    
    console.log('\n📊 Team Statistics:');
    Object.entries(teamStats).forEach(([teamName, stats]) => {
      const status = stats.total === 14 && stats.home === 7 && stats.away === 7 ? '✅' : '❌';
      console.log(`${status} ${teamName}: ${stats.total} total (${stats.home} home, ${stats.away} away) vs ${stats.opponents.size} opponents`);
    });
    
    // Check matchup matrix (who plays whom)
    console.log('\n🔍 Matchup Analysis:');
    const matchupMatrix = {};
    teams.forEach(team1 => {
      matchupMatrix[team1.name] = {};
      teams.forEach(team2 => {
        if (team1.id !== team2.id) {
          matchupMatrix[team1.name][team2.name] = { home: 0, away: 0 };
        }
      });
    });
    
    games.forEach(game => {
      matchupMatrix[game.home_team_name][game.away_team_name].home++;
      matchupMatrix[game.away_team_name][game.home_team_name].away++;
    });
    
    // Check if every team plays every other team exactly twice
    let missingMatchups = 0;
    Object.entries(matchupMatrix).forEach(([team1, opponents]) => {
      Object.entries(opponents).forEach(([team2, games]) => {
        const total = games.home + games.away;
        if (total !== 2) {
          console.log(`❌ ${team1} vs ${team2}: ${total} games (${games.home} home, ${games.away} away) - Expected: 2`);
          missingMatchups++;
        }
      });
    });
    
    if (missingMatchups === 0) {
      console.log('✅ All teams play each other exactly twice');
    } else {
      console.log(`❌ Found ${missingMatchups} incorrect matchups`);
    }
    
    // Check for missing Day 14
    const sortedDates = Object.keys(gamesByDate).sort();
    const firstDate = new Date(sortedDates[0]);
    const expectedLastDate = new Date(firstDate);
    expectedLastDate.setDate(firstDate.getDate() + 13); // Day 14
    
    const actualLastDate = new Date(sortedDates[sortedDates.length - 1]);
    
    console.log(`\n📅 Date Analysis:`);
    console.log(`   First game: ${sortedDates[0]} (Day 1)`);
    console.log(`   Last game: ${sortedDates[sortedDates.length - 1]} (Day ${sortedDates.length})`);
    console.log(`   Expected last: ${expectedLastDate.toISOString().split('T')[0]} (Day 14)`);
    
    if (sortedDates.length !== 14) {
      console.log(`❌ Missing days! Expected 14, got ${sortedDates.length}`);
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await pool.end();
  }
}

analyzeSchedule();