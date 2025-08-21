import { PrismaClient } from '@prisma/client';

async function fixMultipleMatches() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 CRITICAL FIX: Removing duplicate matches for Oakland Cougars on Aug 21...');
    
    // Find all matches for Oakland Cougars on August 21st
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
      console.log(`- Match ${match.id}: ${match.homeTeam.name} vs ${match.awayTeam.name} at ${match.gameDate} (${match.status})`);
    });

    if (matches.length <= 1) {
      console.log('✅ No duplicate matches found.');
      return;
    }

    // Delete the duplicate matches (2431 and 2435), keep the correct scheduled one (2439)
    const matchesToDelete = [2431, 2435]; // Iron Wolves 686 and Fire Hawks 509 duplicates
    
    for (const matchId of matchesToDelete) {
      const matchToDelete = matches.find(m => m.id === matchId);
      if (matchToDelete) {
        console.log(`🗑️ Deleting duplicate match: ${matchId} (${matchToDelete.homeTeam.name} vs ${matchToDelete.awayTeam.name})`);
        
        await prisma.match.delete({
          where: { id: matchId }
        });
        
        console.log(`✅ Deleted match ${matchId}`);
      }
    }

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

    console.log(`✅ VERIFICATION: ${remainingMatches.length} match(es) remaining for Oakland Cougars on 2025-08-21:`);
    remainingMatches.forEach(match => {
      console.log(`- Match ${match.id}: ${match.homeTeam.name} vs ${match.awayTeam.name} at ${match.gameDate} (${match.status})`);
    });

    if (remainingMatches.length === 1) {
      console.log('🎯 SUCCESS: One game per day rule restored!');
    } else {
      console.log('⚠️ WARNING: Still multiple matches remaining!');
    }

  } catch (error) {
    console.error('❌ Error fixing multiple matches:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixMultipleMatches();