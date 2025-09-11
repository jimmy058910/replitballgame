/**
 * COMPLETE DEVELOPMENT ENVIRONMENT RESTORATION
 * Restores the full development environment that was lost during database reset
 */

import { DevSeedDataService } from '../server/services/development/devSeedDataService.ts';
import { OaklandCougarsDevService } from '../server/services/development/oaklandCougarsDevService.ts';
import { getPrismaClient } from '../server/database.js';

const prisma = await getPrismaClient();

async function restoreCompleteEnvironment() {
  console.log('🚀 COMPLETE DEVELOPMENT ENVIRONMENT RESTORATION...');
  console.log('This will restore all teams, games, standings, and Oakland Cougars data that was lost.');
  
  try {
    // Step 1: Use DevSeedDataService to create complete environment
    console.log('🏗️ Creating complete development environment...');
    const environment = await DevSeedDataService.createCompleteDevEnvironment({
      division: 7, // Division 7 where Oakland Cougars belongs
      includeOaklandCougars: true,
      createPlayers: true
    });
    
    console.log('✅ Development environment created:', environment);
    
    // Step 2: Create games between teams
    console.log('🎮 Creating games between teams...');
    
    // Get all teams in Division 7
    const division7Teams = await prisma.team.findMany({
      where: { division: 7 },
      include: { user: true }
    });
    
    console.log(`Found ${division7Teams.length} teams in Division 7`);
    
    // Get the season
    const season = await prisma.season.findFirst({
      where: { seasonNumber: 1 }
    });
    
    if (!season) {
      throw new Error('Season 1 not found');
    }
    
    // Create a simple round-robin schedule for the first few days
    const games = [];
    const gameDate = new Date('2025-09-06'); // Start from Day 1
    
    // Create games for Days 1-5 (current day)
    for (let day = 1; day <= 5; day++) {
      const currentDate = new Date(gameDate);
      currentDate.setDate(gameDate.getDate() + (day - 1));
      
      // Create 2-3 games per day
      for (let gameNum = 0; gameNum < Math.min(3, Math.floor(division7Teams.length / 2)); gameNum++) {
        const homeTeamIndex = (day - 1 + gameNum * 2) % division7Teams.length;
        const awayTeamIndex = (homeTeamIndex + 1) % division7Teams.length;
        
        const homeTeam = division7Teams[homeTeamIndex];
        const awayTeam = division7Teams[awayTeamIndex];
        
        if (homeTeam.id === awayTeam.id) continue; // Skip if same team
        
        // Generate realistic scores (completed games only for Days 1-4)
        const isCompleted = day < 5;
        const homeScore = isCompleted ? Math.floor(Math.random() * 20) + 10 : null;
        const awayScore = isCompleted ? Math.floor(Math.random() * 20) + 10 : null;
        
        const game = await prisma.game.create({
          data: {
            seasonId: season.id,
            leagueId: division7Teams[0].leagueId, // All teams should be in same league
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            homeScore,
            awayScore,
            gameDate: currentDate,
            gameDay: day,
            simulated: isCompleted,
            matchType: 'LEAGUE',
            status: isCompleted ? 'COMPLETED' : 'SCHEDULED'
          }
        });
        
        games.push(game);
        console.log(`  Day ${day}: ${homeTeam.name} vs ${awayTeam.name} ${isCompleted ? `(${homeScore}-${awayScore})` : '(scheduled)'}`);
      }
    }
    
    // Step 3: Update team records based on completed games
    console.log('📊 Calculating team standings from games...');
    
    for (const team of division7Teams) {
      const homeGames = await prisma.game.findMany({
        where: { 
          homeTeamId: team.id, 
          status: 'COMPLETED',
          homeScore: { not: null },
          awayScore: { not: null }
        }
      });
      
      const awayGames = await prisma.game.findMany({
        where: { 
          awayTeamId: team.id, 
          status: 'COMPLETED',
          homeScore: { not: null },
          awayScore: { not: null }
        }
      });
      
      let wins = 0, losses = 0, draws = 0;
      
      // Calculate from home games
      homeGames.forEach(game => {
        if (game.homeScore > game.awayScore) wins++;
        else if (game.homeScore < game.awayScore) losses++;
        else draws++;
      });
      
      // Calculate from away games  
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
    
    console.log('\\n🎉 COMPLETE ENVIRONMENT RESTORATION SUCCESSFUL!');
    console.log('📊 Summary:');
    console.log(`  - Teams created: ${environment.teams}`);
    console.log(`  - Players created: ${environment.players}`);
    console.log(`  - Games created: ${games.length}`);
    console.log(`  - Oakland Cougars setup: ${environment.oaklandCougarsSetup ? '✅' : '❌'}`);
    console.log('\\n✨ The Competition Center should now display complete standings and schedule data!');
    
  } catch (error) {
    console.error('❌ Error restoring complete environment:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreCompleteEnvironment();