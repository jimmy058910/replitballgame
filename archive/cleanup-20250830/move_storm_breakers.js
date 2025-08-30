import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function moveStormBreakers() {
  
  try {
    // Find Storm Breakers 346
    const stormBreakers = await prisma.team.findFirst({
      where: {
        name: 'Storm Breakers 346',
        division: 8
      }
    });
    
    if (!stormBreakers) {
      console.log('❌ Storm Breakers 346 not found');
      return;
    }
    
    console.log(`📍 Found Storm Breakers 346 in subdivision: ${stormBreakers.subdivision}`);
    
    // Move to beta subdivision
    const updatedTeam = await prisma.team.update({
      where: { id: stormBreakers.id },
      data: { subdivision: 'beta' }
    });
    
    console.log(`✅ Moved Storm Breakers 346 from '${stormBreakers.subdivision}' to '${updatedTeam.subdivision}' subdivision`);
    
    // Verify current team counts by subdivision
    const alphaTeams = await prisma.team.findMany({
      where: { division: 8, subdivision: 'alpha' },
      select: { name: true }
    });
    
    const betaTeams = await prisma.team.findMany({
      where: { division: 8, subdivision: 'beta' },
      select: { name: true }
    });
    
    console.log(`📊 Division 8 Alpha: ${alphaTeams.length} teams`);
    console.log(`📊 Division 8 Beta: ${betaTeams.length} teams`);
    console.log('Alpha teams:', alphaTeams.map(t => t.name));
    console.log('Beta teams:', betaTeams.map(t => t.name));
    
  } catch (error) {
    console.error('Error moving Storm Breakers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

moveStormBreakers();