/**
 * UPDATE TEAM SCORING STATISTICS
 * Fix the missing TS, SA, and SD columns in standings
 * Calculate from completed games and update Team records
 */

import { PrismaClient } from '../prisma/generated/client/index.js';

const prisma = new PrismaClient();

async function updateTeamScoringStats() {
  try {
    console.log('🔧 UPDATING TEAM SCORING STATISTICS...');
    
    // Get all teams in Division 7 Alpha
    const teams = await prisma.team.findMany({
      where: {
        division: 7,
        subdivision: 'alpha'
      },
      select: { id: true, name: true }
    });
    
    console.log(`✅ Found ${teams.length} teams in Division 7 Alpha`);
    
    // Get all completed games
    const completedGames = await prisma.game.findMany({
      where: {
        status: 'COMPLETED',
        OR: [
          { homeTeam: { division: 7, subdivision: 'alpha' } },
          { awayTeam: { division: 7, subdivision: 'alpha' } }
        ]
      },
      include: {
        homeTeam: { select: { name: true, division: true, subdivision: true } },
        awayTeam: { select: { name: true, division: true, subdivision: true } }
      }
    });
    
    console.log(`📊 Processing ${completedGames.length} completed games...`);
    
    // Calculate statistics for each team
    for (const team of teams) {
      console.log(`\nCalculating stats for ${team.name}...`);
      
      // Get games where this team played
      const teamGames = completedGames.filter(game => 
        game.homeTeamId === team.id || game.awayTeamId === team.id
      );
      
      let totalScore = 0;      // TS - Team Score (total points scored)
      let totalAgainst = 0;    // SA - Score Against (total points allowed)
      
      teamGames.forEach(game => {
        if (game.homeTeamId === team.id) {
          // Team played at home
          totalScore += game.homeScore || 0;
          totalAgainst += game.awayScore || 0;
        } else {
          // Team played away
          totalScore += game.awayScore || 0;
          totalAgainst += game.homeScore || 0;
        }
      });
      
      const scoreDifference = totalScore - totalAgainst; // SD - Score Difference
      
      // Update team record
      await prisma.team.update({
        where: { id: team.id },
        data: {
          totalScore: totalScore,        // TS
          totalScoreAgainst: totalAgainst, // SA  
          scoreDifference: scoreDifference  // SD
        }
      });
      
      console.log(`  ${team.name}: TS=${totalScore}, SA=${totalAgainst}, SD=${scoreDifference} (${teamGames.length} games)`);
    }
    
    // Verify the updates
    console.log('\n📈 VERIFICATION - Updated team statistics:');
    
    const updatedTeams = await prisma.team.findMany({
      where: {
        division: 7,
        subdivision: 'alpha'
      },
      select: {
        name: true,
        wins: true,
        losses: true,
        draws: true,
        points: true,
        totalScore: true,
        totalScoreAgainst: true,
        scoreDifference: true
      },
      orderBy: { points: 'desc' }
    });
    
    updatedTeams.forEach(team => {
      console.log(`  ${team.name}: ${team.wins}W-${team.losses}L-${team.draws}D (${team.points}pts) | TS=${team.totalScore}, SA=${team.totalScoreAgainst}, SD=${team.scoreDifference}`);
    });
    
    console.log('\n✅ TEAM SCORING STATISTICS UPDATE COMPLETE!');
    console.log(`📊 Updated ${teams.length} teams with calculated TS, SA, and SD values`);
    console.log('🏆 Standings table should now display complete statistics');
    
  } catch (error) {
    console.error('❌ Error updating team scoring statistics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTeamScoringStats();