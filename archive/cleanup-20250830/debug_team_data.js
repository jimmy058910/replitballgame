// Debug script to check team data in database
import { getPrismaClient } from './server/database.js';

async function debugTeamData() {
  const prisma = await getPrismaClient();
  
  // Get team 4 (Oakland Cougars) with all related data
  const team = await prisma.team.findUnique({
    where: { id: 4 },
    include: {
      finances: true,
      players: true,
      userProfile: true,
      stadium: true
    }
  });
  
  console.log('=== TEAM DATA ===');
  console.log('Team:', team?.name);
  console.log('User Profile:', team?.userProfile?.email);
  console.log('Players count:', team?.players?.length || 0);
  console.log('Finances gems:', team?.finances?.gems || 0);
  console.log('Finances credits:', team?.finances?.credits || 0);
  
  if (team?.players?.length === 0) {
    // Check if there are any players in the database at all
    const allPlayers = await prisma.player.findMany({
      select: { id: true, name: true, teamId: true }
    });
    console.log('=== ALL PLAYERS IN DATABASE ===');
    console.log('Total players:', allPlayers.length);
    allPlayers.forEach(p => console.log(`Player ${p.id}: ${p.name} (Team: ${p.teamId})`));
    
    // Check for orphaned players (no team assignment)
    const orphanedPlayers = allPlayers.filter(p => !p.teamId);
    console.log('Orphaned players (no team):', orphanedPlayers.length);
  }
  
  await prisma.$disconnect();
}

debugTeamData().catch(console.error);