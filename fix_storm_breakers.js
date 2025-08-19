// Simple script to move Storm Breakers to beta subdivision through teamStorage
const fetch = require('node-fetch');

async function fixStormBreakers() {
  try {
    // We'll access through the server's storage directly
    const { storage } = await import('./server/storage/index.ts');
    const { getPrismaClient } = await import('./server/database.ts');
    
    console.log('🔧 Moving Storm Breakers 346 to beta subdivision...');
    
    const prisma = await getPrismaClient();
    
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
    
    console.log(`✅ Moved Storm Breakers 346 from '${stormBreakers.subdivision}' to '${updatedTeam.subdivision}'`);
    
    // Get updated counts
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
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('Error moving Storm Breakers:', error);
  }
}

fixStormBreakers();