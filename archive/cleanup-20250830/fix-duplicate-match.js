import { PrismaClient } from '@prisma/client';

async function fixDuplicateMatch() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking for duplicate matches for Oakland Cougars on 2025-08-21...');
    
    // Find all matches for Oakland Cougars (team ID 4) on August 21st
    const matches = await prisma.match.findMany({
      where: {
        AND: [
          {
            OR: [
              { homeTeamId: 4 },
              { awayTeamId: 4 }
            ]
          },
          {
            gameDate: {
              gte: new Date('2025-08-21T00:00:00.000Z'),
              lt: new Date('2025-08-22T00:00:00.000Z')
            }
          }
        ]
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    console.log(`Found ${matches.length} matches for Oakland Cougars on 2025-08-21:`);
    matches.forEach(match => {
      console.log(`- Match ${match.id}: ${match.homeTeam.name} vs ${match.awayTeam.name} at ${match.gameDate}`);
    });

    if (matches.length <= 1) {
      console.log('✅ No duplicate matches found. Data is consistent.');
      return;
    }

    // Identify the duplicate to remove
    // Keep match 2359 (Oakland Cougars vs Iron Wolves 686) - this appears to be the correct one
    // Remove match 2367 (Oakland Cougars vs Shadow Runners 197) - this is the duplicate
    
    const duplicateMatch = matches.find(m => 
      (m.homeTeam.name === 'Oakland Cougars' && m.awayTeam.name === 'Shadow Runners 197') ||
      (m.awayTeam.name === 'Oakland Cougars' && m.homeTeam.name === 'Shadow Runners 197')
    );

    if (!duplicateMatch) {
      console.log('❓ Could not identify the duplicate match to remove.');
      return;
    }

    console.log(`🗑️ Removing duplicate match: ${duplicateMatch.id} (${duplicateMatch.homeTeam.name} vs ${duplicateMatch.awayTeam.name})`);

    // Delete the duplicate match
    await prisma.match.delete({
      where: {
        id: duplicateMatch.id
      }
    });

    console.log('✅ Duplicate match removed successfully!');
    
    // Verify the fix
    const remainingMatches = await prisma.match.findMany({
      where: {
        AND: [
          {
            OR: [
              { homeTeamId: 4 },
              { awayTeamId: 4 }
            ]
          },
          {
            gameDate: {
              gte: new Date('2025-08-21T00:00:00.000Z'),
              lt: new Date('2025-08-22T00:00:00.000Z')
            }
          }
        ]
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    console.log(`✅ Verification: ${remainingMatches.length} match(es) remaining for Oakland Cougars on 2025-08-21:`);
    remainingMatches.forEach(match => {
      console.log(`- Match ${match.id}: ${match.homeTeam.name} vs ${match.awayTeam.name} at ${match.gameDate}`);
    });

  } catch (error) {
    console.error('❌ Error fixing duplicate match:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixDuplicateMatch();