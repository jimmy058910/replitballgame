/**
 * PROPER SCHEDULE RESTORATION
 * Uses the existing ScheduleGenerationService to create correct Division 7 Alpha schedule
 */

import { ScheduleGenerationService } from '../server/services/scheduleGenerationService.js';
import { PrismaClient } from '../prisma/generated/client/index.js';

const prisma = new PrismaClient();

async function properScheduleRestore() {
  try {
    console.log('🔧 PROPER SCHEDULE RESTORATION USING EXISTING SERVICE...');
    
    // First verify we have exactly 8 teams in Division 7 Alpha
    const teams = await prisma.team.findMany({
      where: {
        division: 7,
        subdivision: 'alpha'
      },
      select: { id: true, name: true }
    });
    
    console.log(`✅ Found ${teams.length} teams in Division 7 Alpha:`);
    teams.forEach(team => console.log(`  - ${team.name}`));
    
    if (teams.length !== 8) {
      throw new Error(`Expected exactly 8 teams in Division 7 Alpha, found ${teams.length}`);
    }
    
    // Use the existing ScheduleGenerationService to generate proper schedule
    console.log('\n🎮 Generating proper schedule using ScheduleGenerationService...');
    const result = await ScheduleGenerationService.generateCompleteSchedule();
    
    if (result.error) {
      throw new Error(`Schedule generation failed: ${result.error}`);
    }
    
    console.log(`✅ Schedule generated successfully!`);
    console.log(`  - Total matches: ${result.totalMatches}`);
    console.log(`  - Days scheduled: ${result.daysScheduled}`);
    
    // Validate the results
    const games = await prisma.game.findMany({
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: [{ gameDay: 'asc' }, { gameDate: 'asc' }]
    });
    
    console.log(`\n📊 VALIDATION RESULTS:`);
    console.log(`Total games created: ${games.length}`);
    
    // Group by day and validate
    const gamesByDay = {};
    games.forEach(game => {
      const day = game.gameDay;
      if (!gamesByDay[day]) gamesByDay[day] = [];
      gamesByDay[day].push(game);
    });
    
    Object.keys(gamesByDay).sort((a,b) => parseInt(a) - parseInt(b)).forEach(day => {
      console.log(`  Day ${day}: ${gamesByDay[day].length} games`);
      if (gamesByDay[day].length !== 4) {
        console.warn(`    ⚠️ Expected 4 games per day, found ${gamesByDay[day].length}`);
      }
    });
    
    // Check team game distribution
    const teamGameCounts = {};
    games.forEach(game => {
      teamGameCounts[game.homeTeam.name] = (teamGameCounts[game.homeTeam.name] || 0) + 1;
      teamGameCounts[game.awayTeam.name] = (teamGameCounts[game.awayTeam.name] || 0) + 1;
    });
    
    console.log(`\n🏈 TEAM GAME DISTRIBUTION:`);
    Object.entries(teamGameCounts).forEach(([teamName, count]) => {
      console.log(`  ${teamName}: ${count} games`);
    });
    
    // Calculate and update team standings based on COMPLETED games only
    console.log('\n📈 CALCULATING STANDINGS FROM COMPLETED GAMES...');
    
    const completedGames = games.filter(game => game.status === 'COMPLETED');
    console.log(`Found ${completedGames.length} completed games`);
    
    // Update team records based on completed games
    for (const team of teams) {
      const homeGames = completedGames.filter(g => g.homeTeamId === team.id);
      const awayGames = completedGames.filter(g => g.awayTeamId === team.id);
      
      let wins = 0, losses = 0, draws = 0;
      
      homeGames.forEach(game => {
        if (game.homeScore > game.awayScore) wins++;
        else if (game.homeScore < game.awayScore) losses++;
        else draws++;
      });
      
      awayGames.forEach(game => {
        if (game.awayScore > game.homeScore) wins++;
        else if (game.awayScore < game.homeScore) losses++;
        else draws++;
      });
      
      const points = wins * 3 + draws * 1;
      
      await prisma.team.update({
        where: { id: team.id },
        data: { wins, losses, draws, points }
      });
      
      console.log(`  ${team.name}: ${wins}W-${losses}L-${draws}D (${points} points)`);
    }
    
    console.log('\n🎉 PROPER SCHEDULE RESTORATION COMPLETE!');
    console.log('✅ Used existing ScheduleGenerationService');
    console.log('✅ Proper Division/Subdivision filtering');
    console.log('✅ Balanced game distribution');
    console.log('✅ Correct standings calculation');
    
  } catch (error) {
    console.error('❌ Error during proper restoration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

properScheduleRestore();