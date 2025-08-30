import { getPrismaClient } from './server/database.js';

async function clearAndTestSchedule() {
  const db = getPrismaClient();
  
  try {
    console.log('🔍 CHECKING CURRENT DATABASE STATE...');
    
    // Check current games
    const gameCount = await db.game.count({
      where: { matchType: 'LEAGUE' }
    });
    console.log(`📊 Current league games: ${gameCount}`);
    
    // Check Division 8 Alpha teams
    const alphaTeams = await db.team.findMany({
      where: {
        division: 8,
        subdivision: 'alpha'
      },
      select: {
        id: true,
        name: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`🏟️ Division 8 Alpha teams (${alphaTeams.length}):`);
    alphaTeams.forEach((team, i) => {
      console.log(`  ${i+1}. ${team.name} (ID: ${team.id}) - Created: ${team.createdAt}`);
    });
    
    console.log('\n🧹 CLEARING ALL LEAGUE GAMES...');
    const deleteResult = await db.game.deleteMany({
      where: { matchType: 'LEAGUE' }
    });
    console.log(`✅ Deleted ${deleteResult.count} league games`);
    
    console.log('\n📅 SCENARIO SETUP:');
    console.log('- Current Day: 5');
    console.log('- 8 teams registered on Day 5 at 5:33PM EDT (AFTER 3PM deadline)');
    console.log('- Expected: Shortened schedule from Day 6-14 (9 games each)');
    console.log('- Each team plays 9 games (one per day) with 2 duplicate opponents');
    
    console.log('\n⚙️ TRIGGERING LATE SIGNUP AUTOMATION...');
    
    // Import and trigger late signup service
    const { LateSignupService } = await import('./server/services/lateSignupService.js');
    
    // Check if we're in late signup window
    const isLateWindow = await LateSignupService.isLateSignupWindow();
    console.log(`🕒 Late signup window active: ${isLateWindow}`);
    
    // Test the shortened schedule generation logic
    const hasSchedule = await LateSignupService.checkAndGenerateShortenedSchedule('alpha', 8);
    console.log(`📋 Shortened schedule generated: ${hasSchedule}`);
    
    // Verify results
    const newGameCount = await db.game.count({
      where: { matchType: 'LEAGUE' }
    });
    console.log(`📊 New league games created: ${newGameCount}`);
    
    if (newGameCount > 0) {
      const scheduleGames = await db.game.findMany({
        where: {
          matchType: 'LEAGUE',
          OR: [
            { homeTeam: { division: 8, subdivision: 'alpha' } },
            { awayTeam: { division: 8, subdivision: 'alpha' } }
          ]
        },
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } }
        },
        orderBy: { gameDate: 'asc' },
        take: 10
      });
      
      console.log(`\n🎮 SAMPLE GAMES (first 10):`);
      scheduleGames.forEach((game, i) => {
        const date = new Date(game.gameDate).toLocaleDateString();
        const time = new Date(game.gameDate).toLocaleTimeString();
        console.log(`  ${i+1}. ${game.homeTeam.name} vs ${game.awayTeam.name} - ${date} ${time}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

clearAndTestSchedule();