/**
 * SIMPLE COMPLETE ENVIRONMENT RESTORATION
 * Creates Oakland Cougars and opponents directly without using broken services
 */

import { PrismaClient } from '../prisma/generated/client/index.js';

const prisma = new PrismaClient();

async function restoreSimpleEnvironment() {
  console.log('🚀 SIMPLE COMPLETE ENVIRONMENT RESTORATION...');
  
  try {
    // Step 1: Get existing season
    const season = await prisma.season.findFirst({
      where: { seasonNumber: 1 }
    });
    
    if (!season) {
      throw new Error('Season 1 not found');
    }
    console.log('✅ Using season:', season.id, 'Day', season.currentDay);
    
    // Step 2: Create or get Division 7 Alpha league
    let league = await prisma.league.findFirst({
      where: { division: 7 }
    });
    
    if (!league) {
      // Check the highest league ID to avoid conflicts
      const maxLeague = await prisma.league.findFirst({
        orderBy: { id: 'desc' }
      });
      const nextId = (maxLeague?.id || 0) + 1;
      
      league = await prisma.league.create({
        data: {
          id: nextId,
          division: 7,
          name: 'Division 7 Alpha',
          seasonId: season.id
        }
      });
      console.log('✅ Created league:', league.name, 'ID:', league.id);
    } else {
      console.log('✅ Using existing league:', league.name, 'ID:', league.id);
    }
    
    // Step 3: Create team data
    const teamsData = [
      { name: 'Oakland Cougars', wins: 4, losses: 2, draws: 1, points: 13, userId: 'dev-user-123' },
      { name: 'Lightning Wolves', wins: 3, losses: 3, draws: 1, points: 10, userId: 'ai-lightning' },
      { name: 'Thunder Hawks', wins: 5, losses: 1, draws: 1, points: 16, userId: 'ai-thunder' },
      { name: 'Fire Dragons', wins: 2, losses: 4, draws: 1, points: 7, userId: 'ai-fire' },
      { name: 'Storm Eagles', wins: 4, losses: 3, draws: 0, points: 12, userId: 'ai-storm' },
      { name: 'Ice Wolves', wins: 1, losses: 5, draws: 1, points: 4, userId: 'ai-ice' },
      { name: 'Mountain Lions', wins: 3, losses: 2, draws: 2, points: 11, userId: 'ai-mountain' },
      { name: 'River Sharks', wins: 2, losses: 3, draws: 2, points: 8, userId: 'ai-river' }
    ];
    
    const teams = [];
    
    // Step 4: Create UserProfiles and Teams
    for (const teamData of teamsData) {
      // Create or update UserProfile
      const userProfile = await prisma.userProfile.upsert({
        where: { userId: teamData.userId },
        create: {
          userId: teamData.userId,
          email: `${teamData.name.toLowerCase().replace(/\\s+/g, '.')}@realmrivalry.dev`,
          firstName: teamData.name.split(' ')[0],
          lastName: 'Owner',
          role: 'USER'
        },
        update: {
          email: `${teamData.name.toLowerCase().replace(/\\s+/g, '.')}@realmrivalry.dev`
        }
      });
      
      // Create or update Team
      const team = await prisma.team.upsert({
        where: { userProfileId: userProfile.id },
        create: {
          userProfileId: userProfile.id,
          name: teamData.name,
          wins: teamData.wins,
          losses: teamData.losses,
          draws: teamData.draws,
          points: teamData.points,
          division: 7,
          subdivision: 'alpha',
          leagueId: league.id,
          isAI: teamData.userId.startsWith('ai-')
        },
        update: {
          wins: teamData.wins,
          losses: teamData.losses,
          draws: teamData.draws,
          points: teamData.points,
          leagueId: league.id
        }
      });
      
      teams.push(team);
      console.log(`✅ ${team.name}: ${team.wins}W-${team.losses}L-${team.draws}D (${team.points} points)`);
    }
    
    // Step 5: Create games
    console.log('🎮 Creating games...');
    const completedGames = [
      // Day 1
      { homeTeam: 0, awayTeam: 1, homeScore: 18, awayScore: 12, day: 1, date: '2025-09-06' }, // Oakland WIN vs Lightning
      { homeTeam: 2, awayTeam: 3, homeScore: 24, awayScore: 10, day: 1, date: '2025-09-06' }, // Thunder vs Fire
      
      // Day 2  
      { homeTeam: 4, awayTeam: 0, homeScore: 14, awayScore: 21, day: 2, date: '2025-09-07' }, // Oakland WIN vs Storm
      { homeTeam: 5, awayTeam: 6, homeScore: 8, awayScore: 16, day: 2, date: '2025-09-07' }, // Ice vs Mountain
      
      // Day 3
      { homeTeam: 0, awayTeam: 2, homeScore: 15, awayScore: 15, day: 3, date: '2025-09-08' }, // Oakland DRAW vs Thunder
      { homeTeam: 3, awayTeam: 7, homeScore: 19, awayScore: 13, day: 3, date: '2025-09-08' }, // Fire vs River
      
      // Day 4
      { homeTeam: 6, awayTeam: 0, homeScore: 9, awayScore: 22, day: 4, date: '2025-09-09' }, // Oakland WIN vs Mountain
      { homeTeam: 1, awayTeam: 4, homeScore: 17, awayScore: 11, day: 4, date: '2025-09-09' }, // Lightning vs Storm
      
      // Day 5 (most recent)
      { homeTeam: 7, awayTeam: 0, homeScore: 20, awayScore: 16, day: 5, date: '2025-09-10' }, // Oakland LOSS vs River
      { homeTeam: 2, awayTeam: 5, homeScore: 28, awayScore: 6, day: 5, date: '2025-09-10' }, // Thunder vs Ice
      
      // Additional games to make realistic
      { homeTeam: 0, awayTeam: 3, homeScore: 25, awayScore: 18, day: 3, date: '2025-09-08' }, // Oakland WIN vs Fire
      { homeTeam: 5, awayTeam: 0, homeScore: 14, awayScore: 12, day: 4, date: '2025-09-09' }, // Oakland LOSS vs Ice
    ];
    
    for (const gameData of completedGames) {
      const game = await prisma.game.create({
        data: {
          leagueId: league.id,
          homeTeamId: teams[gameData.homeTeam].id,
          awayTeamId: teams[gameData.awayTeam].id,
          homeScore: gameData.homeScore,
          awayScore: gameData.awayScore,
          gameDate: new Date(gameData.date),
          simulated: true,
          matchType: 'LEAGUE',
          status: 'COMPLETED',
          seasonId: season.id,
          gameDay: gameData.day
        }
      });
      console.log(`  Day ${gameData.day}: ${teams[gameData.homeTeam].name} ${gameData.homeScore}-${gameData.awayScore} ${teams[gameData.awayTeam].name}`);
    }
    
    // Step 6: Create upcoming games
    const upcomingGames = [
      { homeTeam: 0, awayTeam: 5, day: 6, date: '2025-09-11' }, // Oakland vs Ice
      { homeTeam: 3, awayTeam: 0, day: 7, date: '2025-09-12' }, // Fire vs Oakland
      { homeTeam: 0, awayTeam: 7, day: 8, date: '2025-09-13' }, // Oakland vs River
    ];
    
    for (const gameData of upcomingGames) {
      const game = await prisma.game.create({
        data: {
          leagueId: league.id,
          homeTeamId: teams[gameData.homeTeam].id,
          awayTeamId: teams[gameData.awayTeam].id,
          homeScore: null,
          awayScore: null,
          gameDate: new Date(gameData.date),
          simulated: false,
          matchType: 'LEAGUE',
          status: 'SCHEDULED',
          seasonId: season.id,
          gameDay: gameData.day
        }
      });
      console.log(`  Day ${gameData.day}: ${teams[gameData.homeTeam].name} vs ${teams[gameData.awayTeam].name} (scheduled)`);
    }
    
    // Step 7: Create players for Oakland Cougars
    console.log('🏃 Creating Oakland Cougars players...');
    const oaklandCougars = teams.find(t => t.name === 'Oakland Cougars' || t.name === 'Dev Thunder');
    
    const playersData = [
      { firstName: 'Marcus', lastName: 'Johnson', race: 'HUMAN', role: 'PASSER', speed: 78, power: 72, throwing: 88, catching: 82, kicking: 75, staminaAttribute: 85, leadership: 90, agility: 80, potentialRating: 8.2 },
      { firstName: 'Zara', lastName: 'Lightfoot', race: 'SYLVAN', role: 'RUNNER', speed: 95, power: 65, throwing: 58, catching: 89, kicking: 62, staminaAttribute: 92, leadership: 75, agility: 98, potentialRating: 9.1 },
      { firstName: 'Thorgrim', lastName: 'Ironwall', race: 'GRYLL', role: 'BLOCKER', speed: 58, power: 96, throwing: 45, catching: 68, kicking: 52, staminaAttribute: 94, leadership: 88, agility: 55, potentialRating: 7.8 },
      { firstName: 'Elena', lastName: 'Starweaver', race: 'LUMINA', role: 'PASSER', speed: 82, power: 70, throwing: 91, catching: 86, kicking: 80, staminaAttribute: 88, leadership: 85, agility: 84, potentialRating: 8.7 },
      { firstName: 'Kai', lastName: 'Shadowstep', race: 'UMBRA', role: 'RUNNER', speed: 91, power: 68, throwing: 62, catching: 87, kicking: 65, staminaAttribute: 90, leadership: 78, agility: 93, potentialRating: 8.5 },
      { firstName: 'Rex', lastName: 'Bulldozer', race: 'GRYLL', role: 'BLOCKER', speed: 62, power: 94, throwing: 48, catching: 71, kicking: 55, staminaAttribute: 93, leadership: 82, agility: 59, potentialRating: 8.0 }
    ];
    
    for (const playerData of playersData) {
      await prisma.player.create({
        data: {
          teamId: oaklandCougars.id,
          firstName: playerData.firstName,
          lastName: playerData.lastName,
          race: playerData.race,
          role: playerData.role,
          age: 20 + Math.floor(Math.random() * 10),
          speed: playerData.speed,
          power: playerData.power,
          throwing: playerData.throwing,
          catching: playerData.catching,
          kicking: playerData.kicking,
          staminaAttribute: playerData.staminaAttribute,
          leadership: playerData.leadership,
          agility: playerData.agility,
          potentialRating: playerData.potentialRating
        }
      });
      console.log(`  ✅ ${playerData.firstName} ${playerData.lastName} (${playerData.race} ${playerData.role})`);
    }
    
    console.log('\\n🎉 COMPLETE ENVIRONMENT RESTORATION SUCCESSFUL!');
    console.log('📊 Summary:');
    console.log(`  - Teams: ${teams.length} in Division 7 Alpha`);
    console.log(`  - Completed games: ${completedGames.length}`);
    console.log(`  - Upcoming games: ${upcomingGames.length}`);
    console.log(`  - Oakland Cougars: 4W-2L-1D (13 points) with 6 players`);
    console.log('\\n✨ The Competition Center should now display all data correctly!');
    
  } catch (error) {
    console.error('❌ Error restoring environment:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreSimpleEnvironment();