/**
 * ANALYZE GAME DUPLICATES
 * Identify the exact duplicate game problem created during restoration
 */

import { PrismaClient } from '../prisma/generated/client/index.js';

const prisma = new PrismaClient();

async function analyzeGameDuplicates() {
  try {
    console.log('🔍 ANALYZING GAME DUPLICATES...');
    
    const games = await prisma.game.findMany({
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: [{ gameDay: 'asc' }, { id: 'asc' }]
    });
    
    console.log(`Total games: ${games.length}`);
    
    // Group by game day
    const gamesByDay = {};
    games.forEach(game => {
      const day = game.gameDay || 'NULL';
      if (!gamesByDay[day]) gamesByDay[day] = [];
      gamesByDay[day].push(game);
    });
    
    // Show distribution by day
    console.log('\n=== GAMES BY DAY ===');
    Object.keys(gamesByDay).sort((a,b) => parseInt(a) - parseInt(b)).forEach(day => {
      console.log(`Day ${day}: ${gamesByDay[day].length} games`);
      gamesByDay[day].forEach((game, i) => {
        console.log(`  ${i+1}. ${game.homeTeam.name} vs ${game.awayTeam.name} (${game.status})`);
      });
    });
    
    // Look for exact duplicates
    console.log('\n=== DUPLICATE DETECTION ===');
    const matchups = {};
    let duplicates = 0;
    
    games.forEach(game => {
      const key = `${game.homeTeamId}-${game.awayTeamId}-${game.gameDay}`;
      if (matchups[key]) {
        matchups[key]++;
        duplicates++;
        console.log(`DUPLICATE: Day ${game.gameDay} - ${game.homeTeam.name} vs ${game.awayTeam.name} (appears ${matchups[key]} times)`);
      } else {
        matchups[key] = 1;
      }
    });
    
    console.log(`\nTotal duplicates found: ${duplicates}`);
    
    // Check team game counts
    console.log('\n=== TEAM GAME COUNTS ===');
    const teamCounts = {};
    games.forEach(game => {
      teamCounts[game.homeTeamId] = (teamCounts[game.homeTeamId] || 0) + 1;
      teamCounts[game.awayTeamId] = (teamCounts[game.awayTeamId] || 0) + 1;
    });
    
    const teams = await prisma.team.findMany({ select: { id: true, name: true } });
    teams.forEach(team => {
      const count = teamCounts[team.id] || 0;
      console.log(`${team.name}: ${count} games`);
    });
    
  } catch (error) {
    console.error('Error analyzing games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeGameDuplicates();