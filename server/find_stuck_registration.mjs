import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findStuckRegistration() {
  try {
    console.log('Looking for Oakland Cougars tournament registrations...');
    
    // First, find the team ID for Oakland Cougars
    const team = await prisma.team.findFirst({
      where: { name: 'Oakland Cougars' }
    });
    
    if (!team) {
      console.log('Oakland Cougars team not found');
      return;
    }
    
    console.log(`Found Oakland Cougars: Team ID ${team.id}`);
    
    // Check all tournament registrations for this team
    const registrations = await prisma.tournamentRegistration.findMany({
      where: { teamId: team.id },
      include: {
        tournament: true
      },
      orderBy: { registeredAt: 'desc' }
    });
    
    console.log(`\nFound ${registrations.length} tournament registrations:`);
    
    registrations.forEach((reg, i) => {
      console.log(`\n${i+1}. Registration ID: ${reg.id}`);
      console.log(`   Tournament: ${reg.tournament?.name || 'MISSING TOURNAMENT'}`);
      console.log(`   Tournament ID: ${reg.tournamentId}`);
      console.log(`   Tournament Status: ${reg.tournament?.status || 'MISSING'}`);
      console.log(`   Registered: ${reg.registeredAt}`);
      console.log(`   Tournament Type: ${reg.tournament?.type || 'MISSING'}`);
      console.log(`   Division: ${reg.tournament?.division || 'MISSING'}`);
    });
    
    // Check for orphaned registrations (registrations without tournaments)
    const orphanedRegs = registrations.filter(reg => !reg.tournament);
    if (orphanedRegs.length > 0) {
      console.log(`\n🚨 FOUND ${orphanedRegs.length} ORPHANED REGISTRATIONS:`);
      orphanedRegs.forEach(reg => {
        console.log(`   Registration ID ${reg.id} -> Tournament ID ${reg.tournamentId} (MISSING)`);
      });
    }
    
    // Check for active tournaments in Division 8
    console.log(`\n=== ACTIVE DIVISION 8 TOURNAMENTS ===`);
    const activeTournaments = await prisma.tournament.findMany({
      where: {
        division: 8,
        status: { in: ['REGISTRATION_OPEN', 'IN_PROGRESS', 'ACTIVE'] }
      }
    });
    
    console.log(`Found ${activeTournaments.length} active Division 8 tournaments:`);
    activeTournaments.forEach(t => {
      console.log(`  - Tournament ${t.tournamentId}: ${t.name} (${t.status})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findStuckRegistration();
