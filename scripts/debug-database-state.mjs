import pkg from 'pg';
const { Pool } = pkg;

console.log('🔍 DEBUG: Analyzing complete database state...');

const pool = new Pool({
  connectionString: 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public',
  ssl: false
});

async function debugDatabaseState() {
  try {
    console.log('='.repeat(60));
    console.log('📊 COMPLETE DATABASE ANALYSIS');
    console.log('='.repeat(60));

    // 1. Get all Division 7 Alpha teams
    const div7Teams = await pool.query(`
      SELECT id, name, division, subdivision
      FROM "Team" 
      WHERE division = 7 AND subdivision = 'alpha'
      ORDER BY name
    `);
    
    console.log('\n🎯 Division 7 Alpha Teams:');
    div7Teams.rows.forEach(team => {
      console.log(`   ${team.id}: ${team.name}`);
    });
    
    const div7TeamIds = div7Teams.rows.map(t => t.id);
    const div7TeamNames = div7Teams.rows.map(t => t.name);
    
    // 2. Check ALL league games involving ANY Division 7 Alpha team
    const allGamesQuery = await pool.query(`
      SELECT 
        g.id,
        g."gameDate",
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
    `, [div7TeamIds]);
    
    console.log(`\n📈 ALL games involving Division 7 Alpha teams: ${allGamesQuery.rows.length}`);
    
    // 3. Categorize games
    const pureDiv7Games = [];
    const mixedDivisionGames = [];
    
    allGamesQuery.rows.forEach(game => {
      const homeIsDiv7 = div7TeamNames.includes(game.home_team);
      const awayIsDiv7 = div7TeamNames.includes(game.away_team);
      
      if (homeIsDiv7 && awayIsDiv7) {
        pureDiv7Games.push(game);
      } else {
        mixedDivisionGames.push(game);
      }
    });
    
    console.log(`\n📊 GAME BREAKDOWN:`);
    console.log(`   ✅ Pure Division 7 Alpha games: ${pureDiv7Games.length}`);
    console.log(`   ❌ Mixed division games: ${mixedDivisionGames.length}`);
    
    if (mixedDivisionGames.length > 0) {
      console.log(`\n❌ CONTAMINATION DETECTED - Mixed division games:`);
      mixedDivisionGames.slice(0, 10).forEach(game => {
        console.log(`   ${game.home_team} (Div ${game.home_div}-${game.home_sub}) vs ${game.away_team} (Div ${game.away_div}-${game.away_sub})`);
      });
      if (mixedDivisionGames.length > 10) {
        console.log(`   ... and ${mixedDivisionGames.length - 10} more mixed games`);
      }
    }
    
    // 4. Analyze Oakland Cougars specifically
    console.log(`\n🎯 OAKLAND COUGARS ANALYSIS:`);
    const oaklandGames = allGamesQuery.rows.filter(game => 
      game.home_team === 'Oakland Cougars' || game.away_team === 'Oakland Cougars'
    );
    
    console.log(`   Total Oakland Cougars games: ${oaklandGames.length}`);
    
    const oaklandOpponents = new Set();
    oaklandGames.forEach(game => {
      if (game.home_team === 'Oakland Cougars') {
        oaklandOpponents.add(game.away_team);
      } else {
        oaklandOpponents.add(game.home_team);
      }
    });
    
    console.log(`   Oakland opponents: ${Array.from(oaklandOpponents).join(', ')}`);
    console.log(`   Unique opponents: ${oaklandOpponents.size}`);
    
    // 5. Show games by date for pure Division 7
    if (pureDiv7Games.length > 0) {
      const gamesByDate = {};
      pureDiv7Games.forEach(game => {
        const dateKey = game.game_date.toISOString().split('T')[0];
        if (!gamesByDate[dateKey]) gamesByDate[dateKey] = [];
        gamesByDate[dateKey].push(game);
      });
      
      console.log(`\n📅 PURE DIVISION 7 ALPHA GAMES BY DATE:`);
      Object.keys(gamesByDate).sort().forEach(date => {
        console.log(`   ${date}: ${gamesByDate[date].length} games`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('❌ Debug analysis failed:', error);
  } finally {
    await pool.end();
  }
}

debugDatabaseState();