import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTournaments() {
  try {
    // Find all tournaments from yesterday and today
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    console.log('Checking tournaments from', yesterday.toISOString(), 'to', tomorrow.toISOString());
    
    const tournaments = await prisma.tournament.findMany({
      where: {
        createdAt: {
          gte: yesterday,
          lt: tomorrow
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n=== TOURNAMENTS FROM YESTERDAY/TODAY ===');
    console.log(`Found ${tournaments.length} tournaments:`);
    tournaments.forEach((t, i) => {
      console.log(`\n${i+1}. Tournament ${t.tournamentId}:`);
      console.log(`   Name: ${t.name}`);
      console.log(`   Status: ${t.status}`);
      console.log(`   Type: ${t.type}`);
      console.log(`   Division: ${t.division}`);
      console.log(`   Created: ${t.createdAt}`);
      console.log(`   Registration End: ${t.registrationEndTime}`);
      console.log(`   Start Time: ${t.startTime}`);
      console.log(`   End Time: ${t.endTime}`);
    });
    
    // Check tournament registrations
    for (const tournament of tournaments) {
      const registrations = await prisma.tournamentRegistration.findMany({
        where: { tournamentId: tournament.id },
        include: { team: { select: { name: true, id: true } } }
      });
      
      console.log(`\n   Registrations (${registrations.length}):`);
      registrations.forEach(reg => {
        console.log(`     - Team ${reg.team.id}: ${reg.team.name} (registered: ${reg.registeredAt})`);
      });
    }
    
    // Check any tournament games
    console.log('\n=== TOURNAMENT GAMES ===');
    const tournamentGames = await prisma.game.findMany({
      where: {
        matchType: 'TOURNAMENT',
        createdAt: {
          gte: yesterday,
          lt: tomorrow
        }
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        tournament: { select: { name: true, tournamentId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${tournamentGames.length} tournament games:`);
    tournamentGames.forEach((game, i) => {
      console.log(`\n${i+1}. Game ${game.id}:`);
      console.log(`   Tournament: ${game.tournament?.name} (${game.tournament?.tournamentId})`);
      console.log(`   Match: ${game.homeTeam.name} vs ${game.awayTeam.name}`);
      console.log(`   Status: ${game.status}`);
      console.log(`   Score: ${game.homeScore} - ${game.awayScore}`);
      console.log(`   Scheduled: ${game.gameDate}`);
      console.log(`   Created: ${game.createdAt}`);
    });

  } catch (error) {
    console.error('Error checking tournaments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTournaments();
