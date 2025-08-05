/**
 * Production User & Team Creation Script
 * Creates user profile and Oakland Cougars team with full roster in production
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_PRODUCTION || process.env.DATABASE_URL
    }
  }
});

async function createUserAndTeam() {
  console.log('🚀 Creating production user and team...');
  
  try {
    // Step 1: Create user profile
    console.log('📝 Creating user profile for jimmy058910@gmail.com...');
    const userProfile = await prisma.userProfile.upsert({
      where: { email: 'jimmy058910@gmail.com' },
      update: {},
      create: {
        userId: 'jimmy058910@gmail.com',
        email: 'jimmy058910@gmail.com',
        firstName: 'Jimmy',
        lastName: 'User',
        ndaAccepted: true,
        ndaAcceptedAt: new Date(),
        ndaVersion: '1.0'
      }
    });
    console.log('✅ User profile created:', userProfile.id);

    // Step 2: Create Season if needed
    console.log('📅 Creating game season...');
    const season = await prisma.season.upsert({
      where: { id: 'season-1' },
      update: {},
      create: {
        id: 'season-1',
        seasonNumber: 1,
        startDate: new Date(),
        endDate: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000), // 17 days
        currentDay: 1,
        phase: 'REGULAR_SEASON'
      }
    });
    console.log('✅ Season created:', season.id);

    // Step 3: Create League
    console.log('🏆 Creating league...');
    const league = await prisma.league.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: 'Main League',
        division: 8,
        seasonId: 'season-1'
      }
    });
    console.log('✅ League created:', league.id);

    // Step 4: Create Team
    console.log('🏈 Creating Oakland Cougars team...');
    const team = await prisma.team.upsert({
      where: { userProfileId: userProfile.id },
      update: {},
      create: {
        userProfileId: userProfile.id,
        name: 'Oakland Cougars',
        camaraderie: 75.0,
        fanLoyalty: 70.0,
        homeField: 'STANDARD',
        tacticalFocus: 'BALANCED',
        leagueId: 1,
        division: 8,
        subdivision: 'B',
        wins: 0,
        losses: 0,
        points: 0
      }
    });
    console.log('✅ Team created:', team.id);

    // Step 5: Generate Players (12 total)
    console.log('👥 Generating 12 players...');
    const playerPositions = [
      // 3 Passers
      { position: 'PASSER', name: 'Jake Thompson' },
      { position: 'PASSER', name: 'Marcus Johnson' },
      { position: 'PASSER', name: 'Ryan Wilson' },
      // 4 Blockers  
      { position: 'BLOCKER', name: 'David Rodriguez' },
      { position: 'BLOCKER', name: 'Michael Brown' },
      { position: 'BLOCKER', name: 'Chris Davis' },
      { position: 'BLOCKER', name: 'James Miller' },
      // 4 Runners
      { position: 'RUNNER', name: 'Alex Garcia' },
      { position: 'RUNNER', name: 'Kevin Martinez' },
      { position: 'RUNNER', name: 'Tyler Anderson' },
      { position: 'RUNNER', name: 'Brandon Lee' },
      // 1 Flexible
      { position: 'RUNNER', name: 'Jordan Taylor' }
    ];

    const races = ['HUMAN', 'ELF', 'DWARF', 'ORC', 'HALFLING'];
    
    for (let i = 0; i < playerPositions.length; i++) {
      const playerData = playerPositions[i];
      const player = await prisma.player.create({
        data: {
          teamId: team.id,
          name: playerData.name,
          position: playerData.position,
          race: races[i % races.length],
          // Base stats
          speed: Math.floor(Math.random() * 20) + 40,
          agility: Math.floor(Math.random() * 20) + 40,
          strength: Math.floor(Math.random() * 20) + 40,
          stamina: Math.floor(Math.random() * 20) + 40,
          awareness: Math.floor(Math.random() * 20) + 40,
          confidence: Math.floor(Math.random() * 20) + 40,
          // Position-specific stats  
          passing: playerData.position === 'PASSER' ? Math.floor(Math.random() * 20) + 50 : Math.floor(Math.random() * 30) + 20,
          blocking: playerData.position === 'BLOCKER' ? Math.floor(Math.random() * 20) + 50 : Math.floor(Math.random() * 30) + 20,
          tackling: Math.floor(Math.random() * 20) + 30,
          catching: playerData.position === 'RUNNER' ? Math.floor(Math.random() * 20) + 40 : Math.floor(Math.random() * 30) + 20,
          kicking: Math.floor(Math.random() * 40) + 10,
          // Other attributes
          age: Math.floor(Math.random() * 8) + 18,
          salary: Math.floor(Math.random() * 50000) + 30000,
          energy: 100,
          morale: Math.floor(Math.random() * 20) + 70,
          teamChemistry: Math.floor(Math.random() * 20) + 60
        }
      });
      console.log(`✅ Created ${playerData.position}: ${playerData.name}`);
    }

    // Step 6: Generate Staff (7 total)
    console.log('👔 Generating 7 staff members...');
    const staffRoles = [
      { role: 'HEAD_COACH', name: 'Coach Williams' },
      { role: 'RECOVERY_SPECIALIST', name: 'Dr. Sarah Chen' },
      { role: 'PASSER_TRAINER', name: 'Coach Mitchell' },
      { role: 'BLOCKER_TRAINER', name: 'Coach Roberts' },
      { role: 'RUNNER_TRAINER', name: 'Coach Jackson' },
      { role: 'SCOUT', name: 'Scout Peterson' },
      { role: 'SCOUT', name: 'Scout Morgan' }
    ];

    for (const staffData of staffRoles) {
      const staff = await prisma.staff.create({
        data: {
          teamId: team.id,
          name: staffData.name,
          role: staffData.role,
          effectiveness: Math.floor(Math.random() * 30) + 60,
          salary: Math.floor(Math.random() * 30000) + 40000,
          contractLength: Math.floor(Math.random() * 3) + 1
        }
      });
      console.log(`✅ Created ${staffData.role}: ${staffData.name}`);
    }

    console.log('\n🎉 SUCCESS! Oakland Cougars team created with:');
    console.log(`- User: ${userProfile.email}`);
    console.log(`- Team: ${team.name}`);
    console.log(`- Players: 12 (3 passers, 4 blockers, 4 runners, 1 flexible)`);
    console.log(`- Staff: 7 (coaches, trainers, scouts)`);
    console.log('\n🔗 You can now refresh https://www.realmrivalry.com to see your full roster!');

  } catch (error) {
    console.error('❌ Error creating user and team:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createUserAndTeam();