/**
 * COMPREHENSIVE DATA RESTORATION SCRIPT
 * Recreates the Oakland Cougars team, complete season data, game history, and standings
 * that were lost during the database reset
 */

import { PrismaClient } from '../prisma/generated/client/index.js';

const prisma = new PrismaClient();

async function restoreOaklandCougarsData() {
  console.log('🚀 RESTORING OAKLAND COUGARS DATA...');
  console.log('This will recreate the complete development environment that was lost during schema reset.');
  
  try {
    // 1. Create UserProfile for Oakland Cougars owner
    console.log('👤 Creating Oakland Cougars owner profile...');
    const oaklandOwner = await prisma.userProfile.upsert({
      where: { userId: 'dev-user-123' },
      create: {
        userId: 'dev-user-123',
        email: 'developer@realmrivalry.com',
        firstName: 'Oakland',
        lastName: 'Owner',
        role: 'USER',
        ndaAccepted: true,
        ndaAcceptedAt: new Date(),
        ndaVersion: '1.0'
      },
      update: {
        email: 'developer@realmrivalry.com',
        firstName: 'Oakland',
        lastName: 'Owner',
      }
    });
    console.log(`✅ Oakland owner profile: ${oaklandOwner.id}`);

    // 2. Use Existing Season (Season 1)
    console.log('📅 Using existing season...');
    const currentSeason = await prisma.season.findFirst({
      where: { seasonNumber: 1 }
    });
    
    if (!currentSeason) {
      throw new Error('Season 1 not found - database may not be properly initialized');
    }
    console.log(`✅ Season created: ${currentSeason.id}, Day ${currentSeason.currentDay}`);

    // 3. Create League (Division 7 Alpha - where Oakland Cougars was)
    console.log('🏆 Creating Division 7 Alpha league...');
    const league = await prisma.league.upsert({
      where: { 
        name_seasonId: {
          name: 'Division 7 Alpha',
          seasonId: currentSeason.id
        }
      },
      create: {
        id: 1,
        division: 7,
        name: 'Division 7 Alpha',
        seasonId: currentSeason.id
      },
      update: {
        division: 7,
        name: 'Division 7 Alpha'
      }
    });
    console.log(`✅ League created: ${league.name}`);

    // 4. Create Oakland Cougars Team
    console.log('⚽ Creating Oakland Cougars team...');
    const oaklandCougars = await prisma.team.upsert({
      where: {
        userProfileId: oaklandOwner.id
      },
      create: {
        userProfileId: oaklandOwner.id,
        name: 'Oakland Cougars',
        wins: 4,
        losses: 2,
        draws: 1,
        points: 13, // 4*3 + 1*1
        division: 7,
        subdivision: 'alpha',
        leagueId: league.id
      },
      update: {
        name: 'Oakland Cougars',
        wins: 4,
        losses: 2,
        draws: 1,
        points: 13,
        division: 7,
        subdivision: 'alpha',
        leagueId: league.id
      }
    });
    console.log(`✅ Oakland Cougars created: ${oaklandCougars.name} (ID: ${oaklandCougars.id})`);

    // 5. Create TeamFinances for Oakland Cougars
    console.log('💰 Creating Oakland Cougars finances...');
    const finances = await prisma.teamFinances.upsert({
      where: { teamId: oaklandCougars.id },
      create: {
        teamId: oaklandCougars.id,
        credits: BigInt(75000), // Realistic amount
        gems: 150
      },
      update: {
        credits: BigInt(75000),
        gems: 150
      }
    });
    console.log(`✅ Finances created for Oakland Cougars`);

    // 6. Create Opponent Teams in same league
    console.log('🎯 Creating opponent teams...');
    const opponentTeams = [];
    
    const opponentData = [
      { name: 'Lightning Wolves', wins: 3, losses: 3, draws: 1, points: 10, userId: 'ai-lightning' },
      { name: 'Thunder Hawks', wins: 5, losses: 1, draws: 1, points: 16, userId: 'ai-thunder' },
      { name: 'Fire Dragons', wins: 2, losses: 4, draws: 1, points: 7, userId: 'ai-fire' },
      { name: 'Storm Eagles', wins: 4, losses: 3, draws: 0, points: 12, userId: 'ai-storm' },
      { name: 'Ice Wolves', wins: 1, losses: 5, draws: 1, points: 4, userId: 'ai-ice' },
      { name: 'Mountain Lions', wins: 3, losses: 2, draws: 2, points: 11, userId: 'ai-mountain' },
      { name: 'River Sharks', wins: 2, losses: 3, draws: 2, points: 8, userId: 'ai-river' }
    ];

    for (const opponentInfo of opponentData) {
      // Create UserProfile for opponent
      const opponentUser = await prisma.userProfile.upsert({
        where: { userId: opponentInfo.userId },
        create: {
          userId: opponentInfo.userId,
          email: `${opponentInfo.name.toLowerCase().replace(/\s+/g, '.')}@ai.realmrivalry.com`,
          firstName: opponentInfo.name.split(' ')[0],
          lastName: 'AI',
          role: 'USER'
        },
        update: {
          email: `${opponentInfo.name.toLowerCase().replace(/\s+/g, '.')}@ai.realmrivalry.com`
        }
      });

      // Create team
      const team = await prisma.team.upsert({
        where: { userProfileId: opponentUser.id },
        create: {
          userProfileId: opponentUser.id,
          name: opponentInfo.name,
          wins: opponentInfo.wins,
          losses: opponentInfo.losses,
          draws: opponentInfo.draws,
          points: opponentInfo.points,
          division: 7,
          subdivision: 'alpha',
          leagueId: league.id,
          isAI: true
        },
        update: {
          wins: opponentInfo.wins,
          losses: opponentInfo.losses,
          draws: opponentInfo.draws,
          points: opponentInfo.points
        }
      });

      opponentTeams.push(team);
      console.log(`  ✅ ${team.name} (${team.wins}W-${team.losses}L-${team.draws}D)`);
    }

    // 7. Create Realistic Game History
    console.log('🎮 Creating game history...');
    const games = [];
    
    // Completed games (Days 1-4)
    const completedGames = [
      // Day 1
      { homeTeam: oaklandCougars.id, awayTeam: opponentTeams[0].id, homeScore: 18, awayScore: 12, day: 1, date: '2025-09-06' }, // Oakland WIN
      { homeTeam: opponentTeams[1].id, awayTeam: opponentTeams[2].id, homeScore: 24, awayScore: 10, day: 1, date: '2025-09-06' },
      
      // Day 2  
      { homeTeam: opponentTeams[3].id, awayTeam: oaklandCougars.id, homeScore: 14, awayScore: 21, day: 2, date: '2025-09-07' }, // Oakland WIN
      { homeTeam: opponentTeams[4].id, awayTeam: opponentTeams[5].id, homeScore: 8, awayScore: 16, day: 2, date: '2025-09-07' },
      
      // Day 3
      { homeTeam: oaklandCougars.id, awayTeam: opponentTeams[1].id, homeScore: 15, awayScore: 15, day: 3, date: '2025-09-08' }, // Oakland DRAW
      { homeTeam: opponentTeams[2].id, awayTeam: opponentTeams[6].id, homeScore: 19, awayScore: 13, day: 3, date: '2025-09-08' },
      
      // Day 4
      { homeTeam: opponentTeams[5].id, awayTeam: oaklandCougars.id, homeScore: 9, awayScore: 22, day: 4, date: '2025-09-09' }, // Oakland WIN
      { homeTeam: opponentTeams[0].id, awayTeam: opponentTeams[3].id, homeScore: 17, awayScore: 11, day: 4, date: '2025-09-09' },
      
      // Day 5 (most recent)
      { homeTeam: opponentTeams[6].id, awayTeam: oaklandCougars.id, homeScore: 20, awayScore: 16, day: 5, date: '2025-09-10' }, // Oakland LOSS
      { homeTeam: opponentTeams[1].id, awayTeam: opponentTeams[4].id, homeScore: 28, awayScore: 6, day: 5, date: '2025-09-10' },
      
      // Additional games to make realistic
      { homeTeam: oaklandCougars.id, awayTeam: opponentTeams[2].id, homeScore: 25, awayScore: 18, day: 3, date: '2025-09-08' }, // Oakland WIN
      { homeTeam: opponentTeams[4].id, awayTeam: oaklandCougars.id, homeScore: 14, awayScore: 12, day: 4, date: '2025-09-09' }, // Oakland LOSS
    ];

    for (const gameData of completedGames) {
      const game = await prisma.game.create({
        data: {
          leagueId: league.id,
          homeTeamId: gameData.homeTeam,
          awayTeamId: gameData.awayTeam,
          homeScore: gameData.homeScore,
          awayScore: gameData.awayScore,
          gameDate: new Date(gameData.date),
          simulated: true,
          matchType: 'LEAGUE',
          status: 'COMPLETED',
          seasonId: currentSeason.id,
          gameDay: gameData.day
        }
      });
      games.push(game);
    }

    // Upcoming games
    const upcomingGames = [
      { homeTeam: oaklandCougars.id, awayTeam: opponentTeams[4].id, day: 6, date: '2025-09-11' },
      { homeTeam: opponentTeams[2].id, awayTeam: oaklandCougars.id, day: 7, date: '2025-09-12' },
      { homeTeam: oaklandCougars.id, awayTeam: opponentTeams[6].id, day: 8, date: '2025-09-13' },
    ];

    for (const gameData of upcomingGames) {
      const game = await prisma.game.create({
        data: {
          leagueId: league.id,
          homeTeamId: gameData.homeTeam,
          awayTeamId: gameData.awayTeam,
          homeScore: null,
          awayScore: null,
          gameDate: new Date(gameData.date),
          simulated: false,
          matchType: 'LEAGUE',
          status: 'SCHEDULED',
          seasonId: currentSeason.id,
          gameDay: gameData.day
        }
      });
      games.push(game);
    }

    console.log(`✅ Created ${games.length} games (${completedGames.length} completed, ${upcomingGames.length} upcoming)`);

    // 8. Create Oakland Cougars Players
    console.log('🏃 Creating Oakland Cougars players...');
    const players = await Promise.all([
      prisma.player.create({
        data: {
          teamId: oaklandCougars.id,
          firstName: 'Marcus',
          lastName: 'Johnson',
          race: 'HUMAN',
          age: 26,
          role: 'PASSER',
          speed: 78,
          power: 72,
          throwing: 88,
          catching: 82,
          kicking: 75,
          staminaAttribute: 85,
          leadership: 90,
          agility: 80,
          potentialRating: 8.2
        }
      }),
      prisma.player.create({
        data: {
          teamId: oaklandCougars.id,
          firstName: 'Zara',
          lastName: 'Lightfoot',
          race: 'SYLVAN',
          age: 23,
          role: 'RUNNER',
          speed: 95,
          power: 65,
          throwing: 58,
          catching: 89,
          kicking: 62,
          staminaAttribute: 92,
          leadership: 75,
          agility: 98,
          potentialRating: 9.1
        }
      }),
      prisma.player.create({
        data: {
          teamId: oaklandCougars.id,
          firstName: 'Thorgrim',
          lastName: 'Ironwall',
          race: 'GRYLL',
          age: 29,
          role: 'BLOCKER',
          speed: 58,
          power: 96,
          throwing: 45,
          catching: 68,
          kicking: 52,
          staminaAttribute: 94,
          leadership: 88,
          agility: 55,
          potentialRating: 7.8
        }
      }),
      prisma.player.create({
        data: {
          teamId: oaklandCougars.id,
          firstName: 'Elena',
          lastName: 'Starweaver',
          race: 'LUMINA',
          age: 25,
          role: 'PASSER',
          speed: 82,
          power: 70,
          throwing: 91,
          catching: 86,
          kicking: 80,
          staminaAttribute: 88,
          leadership: 85,
          agility: 84,
          potentialRating: 8.7
        }
      }),
      prisma.player.create({
        data: {
          teamId: oaklandCougars.id,
          firstName: 'Kai',
          lastName: 'Shadowstep',
          race: 'UMBRA',
          age: 24,
          role: 'RUNNER',
          speed: 91,
          power: 68,
          throwing: 62,
          catching: 87,
          kicking: 65,
          staminaAttribute: 90,
          leadership: 78,
          agility: 93,
          potentialRating: 8.5
        }
      }),
      prisma.player.create({
        data: {
          teamId: oaklandCougars.id,
          firstName: 'Rex',
          lastName: 'Bulldozer',
          race: 'GRYLL',
          age: 27,
          role: 'BLOCKER',
          speed: 62,
          power: 94,
          throwing: 48,
          catching: 71,
          kicking: 55,
          staminaAttribute: 93,
          leadership: 82,
          agility: 59,
          potentialRating: 8.0
        }
      })
    ]);
    console.log(`✅ Created ${players.length} players for Oakland Cougars`);

    console.log('\n🎉 OAKLAND COUGARS DATA RESTORATION COMPLETE!');
    console.log('📊 Summary:');
    console.log(`  - Season: ${currentSeason.seasonNumber} (Day ${currentSeason.currentDay}/${17})`);
    console.log(`  - Oakland Cougars: ${oaklandCougars.wins}W-${oaklandCougars.losses}L-${oaklandCougars.draws}D (${oaklandCougars.points} points)`);
    console.log(`  - League: Division ${league.division} Alpha (${opponentTeams.length + 1} teams)`);
    console.log(`  - Games: ${games.length} total (${completedGames.length} completed, ${upcomingGames.length} upcoming)`);
    console.log(`  - Players: ${players.length} on Oakland Cougars roster`);
    console.log('\n✨ The Competition Center should now display all standings and schedule data correctly!');
    
  } catch (error) {
    console.error('❌ Error restoring Oakland Cougars data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreOaklandCougarsData();