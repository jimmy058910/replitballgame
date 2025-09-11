/**
 * CORRECT DIVISION 7 ALPHA SCHEDULE GENERATION
 * Creates proper schedule with balanced games and correct filtering
 */

import { PrismaClient } from '../prisma/generated/client/index.js';

const prisma = new PrismaClient();

async function generateCorrectSchedule() {
  try {
    console.log('🔧 GENERATING CORRECT DIVISION 7 ALPHA SCHEDULE...');
    
    // Get all teams in Division 7 Alpha
    const teams = await prisma.team.findMany({
      where: {
        division: 7,
        subdivision: 'alpha'
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
    
    console.log(`✅ Found ${teams.length} teams in Division 7 Alpha:`);
    teams.forEach(team => console.log(`  - ${team.name}`));
    
    if (teams.length !== 8) {
      throw new Error(`Expected exactly 8 teams in Division 7 Alpha, found ${teams.length}`);
    }
    
    // Get current season
    const currentSeason = await prisma.season.findFirst({
      orderBy: { startDate: 'desc' }
    });
    
    if (!currentSeason) {
      throw new Error('No active season found');
    }
    
    console.log(`✅ Using season ${currentSeason.seasonNumber} (ID: ${currentSeason.id})`);
    
    // Create/get league for Division 7
    let league = await prisma.league.findFirst({
      where: { division: 7 }
    });
    
    if (!league) {
      league = await prisma.league.create({
        data: {
          division: 7,
          name: 'Division 7 Alpha',
          seasonId: currentSeason.id
        }
      });
      console.log(`✅ Created Division 7 league (ID: ${league.id})`);
    } else {
      console.log(`✅ Using existing Division 7 league (ID: ${league.id})`);
    }
    
    // Generate schedule for Days 1-5 (current progress) with some completed games
    // and Days 6-14 as scheduled games
    const allGames = [];
    const baseDate = new Date("2025-09-06"); // Starting date
    
    // Create balanced round-robin schedule
    // For 8 teams, each team should play 7 other teams once = 7 games per team
    // Total games = (8 × 7) ÷ 2 = 28 games across the season
    
    console.log('\n🎮 Creating balanced round-robin schedule...');
    
    // Round-robin algorithm for 8 teams
    const schedule = [];
    const teamList = [...teams];
    
    // Generate round-robin matchups (7 rounds for 8 teams)
    for (let round = 0; round < 7; round++) {
      const roundMatches = [];
      
      // In each round, team 0 is fixed, others rotate
      for (let i = 0; i < 4; i++) {
        let home, away;
        
        if (i === 0) {
          home = teamList[0];
          away = teamList[7 - round];
        } else {
          const pos1 = (i + round) % 7 + 1;
          const pos2 = (7 - i + round) % 7 + 1;
          home = teamList[Math.min(pos1, pos2)];
          away = teamList[Math.max(pos1, pos2)];
        }
        
        roundMatches.push({ home, away });
      }
      
      schedule.push(roundMatches);
    }
    
    // Distribute the 7 rounds across Days 1-14 (not all days have games)
    const gameDays = [1, 2, 3, 4, 5, 8, 11]; // Spread across the season
    
    for (let roundIndex = 0; roundIndex < schedule.length; roundIndex++) {
      const day = gameDays[roundIndex];
      const roundMatches = schedule[roundIndex];
      
      console.log(`\nDay ${day}: ${roundMatches.length} games`);
      
      for (let matchIndex = 0; matchIndex < roundMatches.length; matchIndex++) {
        const match = roundMatches[matchIndex];
        
        // Create game date
        const gameDate = new Date(baseDate);
        gameDate.setDate(baseDate.getDate() + day - 1);
        gameDate.setHours(16 + matchIndex, 0, 0, 0); // 4 PM, 5 PM, 6 PM, 7 PM
        
        // Determine if game is completed (Days 1-4) or scheduled (Day 5+)
        const isCompleted = day <= 4;
        let homeScore = null, awayScore = null;
        
        if (isCompleted) {
          // Generate realistic scores for completed games
          homeScore = Math.floor(Math.random() * 15) + 10; // 10-24 points
          awayScore = Math.floor(Math.random() * 15) + 10; // 10-24 points
        }
        
        const gameData = {
          homeTeamId: match.home.id,
          awayTeamId: match.away.id,
          gameDate: gameDate,
          gameDay: day,
          matchType: 'LEAGUE',
          status: isCompleted ? 'COMPLETED' : 'SCHEDULED',
          homeScore: homeScore,
          awayScore: awayScore,
          seasonId: currentSeason.id,
          leagueId: league.id,
          scheduleId: `div7-alpha-day${day}`,
          simulated: isCompleted
        };
        
        allGames.push(gameData);
        console.log(`  ${match.home.name} vs ${match.away.name} ${isCompleted ? `(${homeScore}-${awayScore})` : '(scheduled)'}`);
      }
    }
    
    // Insert all games
    console.log(`\n📊 Creating ${allGames.length} total games...`);
    await prisma.game.createMany({
      data: allGames
    });
    
    // Calculate standings from completed games
    console.log('\n📈 CALCULATING TEAM STANDINGS...');
    
    const completedGames = allGames.filter(g => g.status === 'COMPLETED');
    
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
      const gamesPlayed = homeGames.length + awayGames.length;
      
      await prisma.team.update({
        where: { id: team.id },
        data: { wins, losses, draws, points }
      });
      
      console.log(`  ${team.name}: ${wins}W-${losses}L-${draws}D (${points} points, ${gamesPlayed} played)`);
    }
    
    // Final validation
    const totalGames = await prisma.game.count();
    const teamGameCounts = {};
    
    const allCreatedGames = await prisma.game.findMany({
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      }
    });
    
    allCreatedGames.forEach(game => {
      teamGameCounts[game.homeTeam.name] = (teamGameCounts[game.homeTeam.name] || 0) + 1;
      teamGameCounts[game.awayTeam.name] = (teamGameCounts[game.awayTeam.name] || 0) + 1;
    });
    
    console.log(`\n✅ CORRECT SCHEDULE GENERATION COMPLETE!`);
    console.log(`📊 Final Results:`);
    console.log(`  - Total games: ${totalGames}`);
    console.log(`  - Each team's games:`);
    Object.entries(teamGameCounts).forEach(([team, count]) => {
      console.log(`    ${team}: ${count} games`);
    });
    
    const completedCount = allCreatedGames.filter(g => g.status === 'COMPLETED').length;
    const scheduledCount = allCreatedGames.filter(g => g.status === 'SCHEDULED').length;
    console.log(`  - Completed games: ${completedCount}`);
    console.log(`  - Scheduled games: ${scheduledCount}`);
    
  } catch (error) {
    console.error('❌ Error generating correct schedule:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateCorrectSchedule();