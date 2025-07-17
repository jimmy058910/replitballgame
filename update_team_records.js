import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateTeamRecords() {
  try {
    console.log('Starting team records update...');
    
    // Get all completed games for eta subdivision
    const completedGames = await prisma.game.findMany({
      where: {
        status: 'COMPLETED'
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    console.log(`Found ${completedGames.length} completed games`);

    // Filter for eta subdivision games only
    const etaGames = completedGames.filter(game => 
      game.homeTeam.subdivision === 'eta' && game.awayTeam.subdivision === 'eta'
    );

    console.log(`Found ${etaGames.length} completed eta subdivision games`);

    // Initialize team stats
    const teamStats = new Map();
    const etaTeams = await prisma.team.findMany({
      where: { subdivision: 'eta' }
    });

    etaTeams.forEach(team => {
      teamStats.set(team.id, {
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0
      });
    });

    // Process each game
    for (const game of etaGames) {
      const homeTeamId = game.homeTeamId;
      const awayTeamId = game.awayTeamId;
      const homeScore = game.homeScore;
      const awayScore = game.awayScore;

      const homeStats = teamStats.get(homeTeamId);
      const awayStats = teamStats.get(awayTeamId);

      if (homeScore > awayScore) {
        // Home team wins
        homeStats.wins++;
        homeStats.points += 3;
        awayStats.losses++;
      } else if (awayScore > homeScore) {
        // Away team wins
        awayStats.wins++;
        awayStats.points += 3;
        homeStats.losses++;
      } else {
        // Draw
        homeStats.draws++;
        homeStats.points += 1;
        awayStats.draws++;
        awayStats.points += 1;
      }

      console.log(`Game: ${game.homeTeam.name} ${homeScore}-${awayScore} ${game.awayTeam.name}`);
    }

    // Update team records in database
    for (const [teamId, stats] of teamStats.entries()) {
      await prisma.team.update({
        where: { id: teamId },
        data: {
          wins: stats.wins,
          losses: stats.losses,
          draws: stats.draws,
          points: stats.points
        }
      });
      
      const team = etaTeams.find(t => t.id === teamId);
      console.log(`Updated ${team.name}: ${stats.wins}W-${stats.losses}L-${stats.draws}D (${stats.points} pts)`);
    }

    console.log('Team records updated successfully!');
    
  } catch (error) {
    console.error('Error updating team records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTeamRecords();