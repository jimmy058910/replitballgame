import { prisma } from '../server/lib/prisma';

/**
 * Emergency Production Data Creation
 * Creates Oakland Cougars team with full roster for jimmy058910@gmail.com
 */

async function createProductionData() {
  console.log('🚀 Creating production data for Oakland Cougars...');
  
  try {
    // Force connection to production database
    await prisma.$connect();
    
    // Step 1: Create user profile
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

    // Step 2: Create Season
    const season = await prisma.season.upsert({
      where: { id: 'season-1' },
      update: {},
      create: {
        id: 'season-1',
        seasonNumber: 1,
        startDate: new Date(),
        endDate: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
        currentDay: 1,
        phase: 'REGULAR_SEASON'
      }
    });

    // Step 3: Create League
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

    // Step 4: Create Team
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
    console.log('✅ Team created:', team.name);

    // Step 5: Create 12 Players
    const players = [
      // 3 Passers
      { position: 'PASSER', name: 'Jake Thompson', race: 'HUMAN' },
      { position: 'PASSER', name: 'Marcus Johnson', race: 'ELF' },
      { position: 'PASSER', name: 'Ryan Wilson', race: 'DWARF' },
      // 4 Blockers
      { position: 'BLOCKER', name: 'David Rodriguez', race: 'ORC' },
      { position: 'BLOCKER', name: 'Michael Brown', race: 'HUMAN' },
      { position: 'BLOCKER', name: 'Chris Davis', race: 'DWARF' },
      { position: 'BLOCKER', name: 'James Miller', race: 'ORC' },
      // 5 Runners (4 + 1 flexible)
      { position: 'RUNNER', name: 'Alex Garcia', race: 'ELF' },
      { position: 'RUNNER', name: 'Kevin Martinez', race: 'HALFLING' },
      { position: 'RUNNER', name: 'Tyler Anderson', race: 'HUMAN' },
      { position: 'RUNNER', name: 'Brandon Lee', race: 'ELF' },
      { position: 'RUNNER', name: 'Jordan Taylor', race: 'HALFLING' }
    ];

    for (const playerData of players) {
      await prisma.player.create({
        data: {
          teamId: team.id,
          name: playerData.name,
          position: playerData.position,
          race: playerData.race,
          speed: Math.floor(Math.random() * 20) + 45,
          agility: Math.floor(Math.random() * 20) + 45,
          strength: Math.floor(Math.random() * 20) + 45,
          stamina: Math.floor(Math.random() * 20) + 45,
          awareness: Math.floor(Math.random() * 20) + 45,
          confidence: Math.floor(Math.random() * 20) + 45,
          passing: playerData.position === 'PASSER' ? Math.floor(Math.random() * 20) + 55 : Math.floor(Math.random() * 25) + 25,
          blocking: playerData.position === 'BLOCKER' ? Math.floor(Math.random() * 20) + 55 : Math.floor(Math.random() * 25) + 25,
          tackling: Math.floor(Math.random() * 20) + 35,
          catching: playerData.position === 'RUNNER' ? Math.floor(Math.random() * 20) + 45 : Math.floor(Math.random() * 25) + 25,
          kicking: Math.floor(Math.random() * 30) + 15,
          age: Math.floor(Math.random() * 8) + 20,
          salary: Math.floor(Math.random() * 40000) + 35000,
          energy: 100,
          morale: Math.floor(Math.random() * 15) + 75,
          teamChemistry: Math.floor(Math.random() * 15) + 65
        }
      });
      console.log(`✅ Created ${playerData.position}: ${playerData.name}`);
    }

    // Step 6: Create 7 Staff
    const staff = [
      { role: 'HEAD_COACH', name: 'Coach Williams' },
      { role: 'RECOVERY_SPECIALIST', name: 'Dr. Sarah Chen' },
      { role: 'PASSER_TRAINER', name: 'Coach Mitchell' },
      { role: 'BLOCKER_TRAINER', name: 'Coach Roberts' },
      { role: 'RUNNER_TRAINER', name: 'Coach Jackson' },
      { role: 'SCOUT', name: 'Scout Peterson' },
      { role: 'SCOUT', name: 'Scout Morgan' }
    ];

    for (const staffData of staff) {
      await prisma.staff.create({
        data: {
          teamId: team.id,
          name: staffData.name,
          role: staffData.role,
          effectiveness: Math.floor(Math.random() * 25) + 65,
          salary: Math.floor(Math.random() * 25000) + 45000,
          contractLength: Math.floor(Math.random() * 3) + 2
        }
      });
      console.log(`✅ Created ${staffData.role}: ${staffData.name}`);
    }

    console.log('\n🎉 SUCCESS! Oakland Cougars team fully created:');
    console.log('- 12 players with proper positions and stats');
    console.log('- 7 staff members with roles');
    console.log('- Complete team setup ready for gameplay');
    console.log('\n🔄 Refresh https://www.realmrivalry.com to see your roster!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createProductionData();