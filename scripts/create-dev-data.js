/**
 * Development data creation script
 * Creates essential data for local development after database reset
 */

import { PrismaClient } from '../prisma/generated/client/index.js';

const prisma = new PrismaClient();

async function createDevData() {
  console.log('🚀 Creating development data...');
  
  try {
    // 1. Create UserProfile for dev-user-123
    console.log('👤 Creating development user profile...');
    const userProfile = await prisma.userProfile.create({
      data: {
        userId: 'dev-user-123',
        email: 'developer@realmrivalry.com',
        firstName: 'Dev',
        lastName: 'User',
        role: 'USER',
        ndaAccepted: true,
        ndaAcceptedAt: new Date(),
        ndaVersion: '1.0'
      }
    });
    console.log(`✅ UserProfile created: ${userProfile.id}`);

    // 2. Create a Season
    console.log('📅 Creating development season...');
    const season = await prisma.season.create({
      data: {
        id: 'season-1-dev',
        seasonNumber: 1,
        startDate: new Date('2025-09-05'),
        endDate: new Date('2025-12-01'),
        currentDay: 5,
        phase: 'REGULAR_SEASON'
      }
    });
    console.log(`✅ Season created: ${season.id}`);

    // 3. Create a League
    console.log('🏆 Creating development league...');
    const league = await prisma.league.create({
      data: {
        id: 1,
        division: 8,
        name: 'Stone Division',
        seasonId: season.id
      }
    });
    console.log(`✅ League created: ${league.id}`);

    // 4. Create Team for the user
    console.log('⚽ Creating development team...');
    const team = await prisma.team.create({
      data: {
        userProfileId: userProfile.id,
        name: 'Dev Thunder',
        wins: 3,
        losses: 1,
        draws: 1,
        points: 10,
        division: 8,
        subdivision: 'main',
        leagueId: league.id
      }
    });
    console.log(`✅ Team created: ${team.id} - ${team.name}`);

    // 5. Create TeamFinances
    console.log('💰 Creating team finances...');
    const finances = await prisma.teamFinances.create({
      data: {
        teamId: team.id,
        credits: BigInt(50000),
        gems: 100
      }
    });
    console.log(`✅ TeamFinances created for team ${team.id}`);

    // 6. Create basic players
    console.log('🏃 Creating development players...');
    const players = await Promise.all([
      prisma.player.create({
        data: {
          teamId: team.id,
          firstName: 'Alex',
          lastName: 'Striker',
          race: 'HUMAN',
          age: 25,
          role: 'PASSER',
          speed: 85,
          power: 75,
          throwing: 90,
          catching: 80,
          kicking: 70,
          staminaAttribute: 85,
          leadership: 80,
          agility: 85,
          potentialRating: 8.5
        }
      }),
      prisma.player.create({
        data: {
          teamId: team.id,
          firstName: 'Maya',
          lastName: 'Runner',
          race: 'SYLVAN',
          age: 22,
          role: 'RUNNER',
          speed: 95,
          power: 70,
          throwing: 60,
          catching: 85,
          kicking: 65,
          staminaAttribute: 90,
          leadership: 75,
          agility: 95,
          potentialRating: 9.0
        }
      }),
      prisma.player.create({
        data: {
          teamId: team.id,
          firstName: 'Thok',
          lastName: 'Blocker',
          race: 'GRYLL',
          age: 28,
          role: 'BLOCKER',
          speed: 60,
          power: 95,
          throwing: 50,
          catching: 70,
          kicking: 55,
          staminaAttribute: 95,
          leadership: 85,
          agility: 60,
          potentialRating: 7.5
        }
      })
    ]);
    console.log(`✅ Created ${players.length} players`);

    // 7. Create opponent user profiles and teams
    console.log('🎯 Creating opponent teams...');
    
    // Create user profile for Lightning Bolts
    const opponentUser1 = await prisma.userProfile.create({
      data: {
        userId: 'ai-user-lightning',
        email: 'lightning@ai.realmrivalry.com',
        firstName: 'Lightning',
        lastName: 'AI',
        role: 'USER'
      }
    });

    // Create user profile for Fire Dragons
    const opponentUser2 = await prisma.userProfile.create({
      data: {
        userId: 'ai-user-fire',
        email: 'fire@ai.realmrivalry.com',
        firstName: 'Fire',
        lastName: 'AI',
        role: 'USER'
      }
    });

    const opponentTeams = await Promise.all([
      prisma.team.create({
        data: {
          userProfileId: opponentUser1.id,
          name: 'Lightning Bolts',
          wins: 2,
          losses: 2,
          draws: 1,
          points: 7,
          division: 8,
          subdivision: 'main',
          leagueId: league.id,
          isAI: true
        }
      }),
      prisma.team.create({
        data: {
          userProfileId: opponentUser2.id,
          name: 'Fire Dragons',
          wins: 4,
          losses: 1,
          draws: 0,
          points: 12,
          division: 8,
          subdivision: 'main',
          leagueId: league.id,
          isAI: true
        }
      })
    ]);
    console.log(`✅ Created ${opponentTeams.length} opponent teams`);

    // 8. Create some game data
    console.log('🎮 Creating sample games...');
    const games = await Promise.all([
      prisma.game.create({
        data: {
          leagueId: league.id,
          homeTeamId: team.id,
          awayTeamId: opponentTeams[0].id,
          homeScore: 15,
          awayScore: 8,
          gameDate: new Date('2025-09-06'),
          simulated: true,
          matchType: 'LEAGUE',
          status: 'COMPLETED',
          seasonId: season.id,
          gameDay: 1
        }
      }),
      prisma.game.create({
        data: {
          leagueId: league.id,
          homeTeamId: opponentTeams[1].id,
          awayTeamId: team.id,
          homeScore: 12,
          awayScore: 18,
          gameDate: new Date('2025-09-08'),
          simulated: true,
          matchType: 'LEAGUE',
          status: 'COMPLETED',
          seasonId: season.id,
          gameDay: 3
        }
      }),
      prisma.game.create({
        data: {
          leagueId: league.id,
          homeTeamId: team.id,
          awayTeamId: opponentTeams[1].id,
          homeScore: null,
          awayScore: null,
          gameDate: new Date('2025-09-12'),
          simulated: false,
          matchType: 'LEAGUE',
          status: 'SCHEDULED',
          seasonId: season.id,
          gameDay: 7
        }
      })
    ]);
    console.log(`✅ Created ${games.length} games`);

    console.log('\n🎉 Development data creation complete!');
    console.log(`📊 Summary:`);
    console.log(`  - UserProfile: ${userProfile.email}`);
    console.log(`  - Team: ${team.name} (ID: ${team.id})`);
    console.log(`  - Season: ${season.seasonNumber} (${season.phase})`);
    console.log(`  - League: ${league.name}`);
    console.log(`  - Players: ${players.length}`);
    console.log(`  - Games: ${games.length}`);
    
  } catch (error) {
    console.error('❌ Error creating development data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDevData();