import pkg from 'pg';
const { Pool } = pkg;

console.log('🔍 Checking frontend vs backend schedule mismatch...');

const pool = new Pool({
  connectionString: 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public',
  ssl: false
});

async function checkScheduleMismatch() {
  try {
    // Get Division 7 Alpha teams
    const teams = await pool.query(`
      SELECT id, name 
      FROM "Team" 
      WHERE division = 7 AND subdivision = 'alpha'
      ORDER BY name
    `);
    const teamIds = teams.rows.map(t => t.id);
    
    // Get all games with full details
    const games = await pool.query(`
      SELECT 
        g.id,
        g."gameDate",
        DATE(g."gameDate") as game_date,
        EXTRACT(EPOCH FROM g."gameDate") as epoch_time,
        ht.name as home_team,
        at.name as away_team
      FROM "Game" g
      JOIN "Team" ht ON g."homeTeamId" = ht.id
      JOIN "Team" at ON g."awayTeamId" = at.id
      WHERE g."matchType" = 'LEAGUE'
        AND ht.id = ANY($1)
        AND at.id = ANY($1)
      ORDER BY g."gameDate"
    `, [teamIds]);
    
    console.log(`📊 Total Division 7 Alpha games: ${games.rows.length}`);
    
    if (games.rows.length === 0) {
      console.log('❌ No games found!');
      return;
    }
    
    // Analyze date distribution
    const gamesByDate = {};
    games.rows.forEach(game => {
      const dateKey = game.game_date.toISOString().split('T')[0];
      if (!gamesByDate[dateKey]) {
        gamesByDate[dateKey] = [];
      }
      gamesByDate[dateKey].push(game);
    });
    
    const dates = Object.keys(gamesByDate).sort();
    console.log(`\\n📅 BACKEND DATABASE: Games across ${dates.length} dates:`);
    
    dates.forEach((date, index) => {
      const dayGames = gamesByDate[date];
      const jsDate = new Date(date);
      const dayName = jsDate.toLocaleDateString('en-US', { weekday: 'long' });
      const monthDay = jsDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      
      console.log(`   Day ${index + 1}: ${date} (${dayName}, ${monthDay}) - ${dayGames.length} games`);
      
      // Show first game of each day
      if (dayGames.length > 0) {
        const firstGame = dayGames[0];
        const gameTime = new Date(firstGame.gameDate);
        console.log(`      First game: ${firstGame.home_team} vs ${firstGame.away_team} at ${gameTime.toLocaleTimeString()}`);
      }
    });
    
    // Check what frontend should be seeing
    console.log(`\\n🖥️ FRONTEND EXPECTATION:`);
    console.log(`   Should show: Days 1-14 (September 1-14, 2025)`);
    console.log(`   Actually showing: Days 1-13 (September 2-14, 2025) according to your screenshot`);
    console.log(`   Missing: Day 1 (September 1, 2025)`);
    
    // Check if September 1st games exist
    const sept1Games = games.rows.filter(game => {
      const gameDate = new Date(game.gameDate);
      return gameDate.getFullYear() === 2025 && 
             gameDate.getMonth() === 8 && // September = month 8 (0-indexed)
             gameDate.getDate() === 1;
    });
    
    console.log(`\\n🎯 SEPTEMBER 1ST CHECK:`);
    console.log(`   Games on September 1, 2025: ${sept1Games.length}`);
    
    if (sept1Games.length > 0) {
      console.log(`   September 1st games found:`);
      sept1Games.forEach((game, idx) => {
        const gameTime = new Date(game.gameDate);
        console.log(`      Game ${idx + 1}: ${game.home_team} vs ${game.away_team} at ${gameTime.toLocaleTimeString()}`);
      });
    } else {
      console.log(`   ❌ No games found for September 1st!`);
    }
    
    // Check earliest and latest games
    const firstGame = games.rows[0];
    const lastGame = games.rows[games.rows.length - 1];
    
    console.log(`\\n📊 DATE RANGE:`);
    console.log(`   First game: ${new Date(firstGame.gameDate).toLocaleDateString()} at ${new Date(firstGame.gameDate).toLocaleTimeString()}`);
    console.log(`   Last game: ${new Date(lastGame.gameDate).toLocaleDateString()} at ${new Date(lastGame.gameDate).toLocaleTimeString()}`);
    
    // Calculate expected vs actual
    const expectedDays = 14;
    const actualDays = dates.length;
    const expectedFirstDate = '2025-09-01';
    const expectedLastDate = '2025-09-14';
    const actualFirstDate = dates[0];
    const actualLastDate = dates[dates.length - 1];
    
    console.log(`\\n🎯 ANALYSIS:`);
    console.log(`   Expected days: ${expectedDays}, Actual days: ${actualDays}`);
    console.log(`   Expected range: ${expectedFirstDate} to ${expectedLastDate}`);
    console.log(`   Actual range: ${actualFirstDate} to ${actualLastDate}`);
    
    if (actualDays === expectedDays && actualFirstDate === expectedFirstDate && actualLastDate === expectedLastDate) {
      console.log(`   ✅ Backend schedule is PERFECT`);
      console.log(`   ❌ Issue is in FRONTEND display logic`);
    } else {
      console.log(`   ❌ Backend schedule has issues`);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await pool.end();
  }
}

checkScheduleMismatch();