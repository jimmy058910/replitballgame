/**
 * EMERGENCY GAME CLEANUP
 * Delete ALL corrupted games and reset LeagueStanding records
 */

import { PrismaClient } from '../prisma/generated/client/index.js';

const prisma = new PrismaClient();

async function emergencyCleanup() {
  try {
    console.log('🚨 EMERGENCY GAME CLEANUP - DELETING ALL CORRUPTED GAMES...');
    
    // Delete all games first 
    const deletedGames = await prisma.game.deleteMany({});
    console.log(`✅ Deleted ${deletedGames.count} corrupted games`);
    
    // Delete all league standings (they're corrupted due to duplicate games)
    const deletedStandings = await prisma.leagueStanding.deleteMany({});
    console.log(`✅ Deleted ${deletedStandings.count} corrupted standings`);
    
    // Reset team statistics to zero
    await prisma.team.updateMany({
      data: {
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0
      }
    });
    console.log('✅ Reset all team statistics to zero');
    
    // Check final state
    const remainingGames = await prisma.game.count();
    const teams = await prisma.team.findMany({ 
      select: { name: true, wins: true, losses: true, draws: true, points: true } 
    });
    
    console.log('\n📊 CLEANUP COMPLETE');
    console.log(`Remaining games: ${remainingGames}`);
    console.log('Team statistics:');
    teams.forEach(team => {
      console.log(`  ${team.name}: ${team.wins}W-${team.losses}L-${team.draws}D (${team.points} pts)`);
    });
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

emergencyCleanup();