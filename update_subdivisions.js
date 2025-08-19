// Update existing teams from main to alpha subdivision
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function updateSubdivisions() {
  try {
    console.log('🔧 Updating existing teams from "main" to "alpha" subdivision...');
    
    // Find all teams in Division 8 with "main" subdivision
    const mainTeams = await prisma.team.findMany({
      where: {
        division: 8,
        subdivision: 'main'
      },
      select: { id: true, name: true, subdivision: true }
    });
    
    console.log(`📍 Found ${mainTeams.length} teams in "main" subdivision:`);
    mainTeams.forEach(team => console.log(`  - ${team.name}`));
    
    if (mainTeams.length > 0) {
      // Update all teams from "main" to "alpha"
      const result = await prisma.team.updateMany({
        where: {
          division: 8,
          subdivision: 'main'
        },
        data: {
          subdivision: 'alpha'
        }
      });
      
      console.log(`✅ Updated ${result.count} teams from "main" to "alpha" subdivision`);
    }
    
    // Verify the update
    const alphaTeams = await prisma.team.findMany({
      where: {
        division: 8,
        subdivision: 'alpha'
      },
      select: { name: true }
    });
    
    console.log(`📊 Teams now in "alpha" subdivision: ${alphaTeams.length}`);
    alphaTeams.forEach(team => console.log(`  - ${team.name}`));
    
  } catch (error) {
    console.error('Error updating subdivisions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSubdivisions();