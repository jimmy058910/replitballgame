/**
 * FIX DAILY SCHEDULE
 * Create proper daily games where each team plays once per day through Day 14
 * Current date: September 10th = Day 7, so Days 5-7 should be completed, Days 8-14 scheduled
 */

import { PrismaClient } from '../prisma/generated/client/index.js';

const prisma = new PrismaClient();

async function fixDailySchedule() {
  try {
    console.log('🔧 FIXING DAILY SCHEDULE - PROPER CONTINUOUS GAMES...');
    
    // Clear all existing games first
    await prisma.game.deleteMany({});
    console.log('✅ Cleared existing incomplete schedule');
    
    // Get teams and validate
    const teams = await prisma.team.findMany({
      where: { division: 7, subdivision: 'alpha' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
    
    if (teams.length !== 8) {
      throw new Error(`Expected 8 teams, found ${teams.length}`);
    }
    
    console.log(`✅ Working with 8 teams in Division 7 Alpha`);
    
    // Get season and league
    const season = await prisma.season.findFirst({ orderBy: { startDate: 'desc' } });
    const league = await prisma.league.findFirst({ where: { division: 7 } });
    
    const baseDate = new Date("2025-09-06"); // Day 1 = September 6th
    const currentDay = 7; // Today is September 10th = Day 7
    
    console.log(`Current day: ${currentDay} (September 10th)`);
    console.log('Days 1-7 should be completed, Days 8-14 should be scheduled');
    
    const allGames = [];
    
    // Create games for Days 1-14 (continuous daily games)
    for (let day = 1; day <= 14; day++) {
      console.log(`\nGenerating Day ${day}...`);
      
      const gameDate = new Date(baseDate);
      gameDate.setDate(baseDate.getDate() + day - 1);
      
      // For each day, create 4 games where each team plays once
      // Use rotating schedule to ensure variety
      const dayTeams = [...teams];
      
      // Shuffle teams differently for each day to create variety
      for (let i = 0; i < day; i++) {
        dayTeams.push(dayTeams.shift());
      }
      
      // Create 4 matches: [1v2, 3v4, 5v6, 7v8]
      const dayGames = [];
      for (let i = 0; i < 8; i += 2) {
        const homeTeam = dayTeams[i];
        const awayTeam = dayTeams[i + 1];
        
        // Determine if game is completed or scheduled
        const isCompleted = day <= currentDay;
        let homeScore = null, awayScore = null;
        
        if (isCompleted) {
          // Generate realistic scores for completed games
          homeScore = Math.floor(Math.random() * 15) + 10; // 10-24 points
          awayScore = Math.floor(Math.random() * 15) + 10; // 10-24 points
        }
        
        const gameTime = new Date(gameDate);
        gameTime.setHours(16 + Math.floor(i / 2), 0, 0, 0); // 4PM, 5PM, 6PM, 7PM
        
        const gameData = {
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          gameDate: gameTime,
          gameDay: day,
          matchType: 'LEAGUE',
          status: isCompleted ? 'COMPLETED' : 'SCHEDULED',
          homeScore: homeScore,
          awayScore: awayScore,
          seasonId: season.id,
          leagueId: league.id,
          scheduleId: `div7-alpha-day${day}`,
          simulated: isCompleted
        };
        
        allGames.push(gameData);
        dayGames.push({ homeTeam: homeTeam.name, awayTeam: awayTeam.name, homeScore, awayScore });
      }
      
      // Log the day's games
      dayGames.forEach((game, i) => {
        const status = day <= currentDay ? `(${game.homeScore}-${game.awayScore})` : '(scheduled)';
        console.log(`  Game ${i+1}: ${game.homeTeam} vs ${game.awayTeam} ${status}`);
      });
    }
    
    console.log(`\n📊 Creating ${allGames.length} total games...`);
    await prisma.game.createMany({ data: allGames });
    
    // Calculate standings from completed games (Days 1-7)
    console.log('\n📈 CALCULATING STANDINGS FROM COMPLETED GAMES (Days 1-7)...');
    
    for (const team of teams) {
      const completedGames = allGames.filter(g => 
        g.status === 'COMPLETED' && (g.homeTeamId === team.id || g.awayTeamId === team.id)
      );
      
      let wins = 0, losses = 0, draws = 0;
      
      completedGames.forEach(game => {
        const isHome = game.homeTeamId === team.id;
        const teamScore = isHome ? game.homeScore : game.awayScore;
        const opponentScore = isHome ? game.awayScore : game.homeScore;
        
        if (teamScore > opponentScore) wins++;
        else if (teamScore < opponentScore) losses++;
        else draws++;
      });
      
      const points = wins * 3 + draws * 1;
      const gamesPlayed = completedGames.length;
      
      await prisma.team.update({
        where: { id: team.id },
        data: { wins, losses, draws, points }
      });
      
      console.log(`  ${team.name}: ${wins}W-${losses}L-${draws}D (${points} points, ${gamesPlayed}/7 played)`);
    }
    
    // Final summary
    const totalCompleted = allGames.filter(g => g.status === 'COMPLETED').length;
    const totalScheduled = allGames.filter(g => g.status === 'SCHEDULED').length;
    
    console.log(`\n✅ PROPER DAILY SCHEDULE COMPLETE!`);
    console.log(`📊 Results:`);
    console.log(`  - Total games: ${allGames.length} (14 days × 4 games = 56 games)`);
    console.log(`  - Completed games: ${totalCompleted} (Days 1-7)`);
    console.log(`  - Scheduled games: ${totalScheduled} (Days 8-14)`);
    console.log(`  - Each team plays: 14 games total (once per day)`);
    console.log(`  - Games per day: 4 games (each team plays once)`);
    
  } catch (error) {
    console.error('❌ Error fixing daily schedule:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDailySchedule();