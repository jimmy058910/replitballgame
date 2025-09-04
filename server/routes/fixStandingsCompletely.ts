import { Router } from 'express';
import { getPrismaClient } from '../database.js';
import { requireAuth } from '../middleware/firebaseAuth.js';

const router = Router();

/**
 * COMPREHENSIVE STANDINGS FIX
 * Recalculates ALL team standings from actual completed game results
 * Handles missing draws field and ensures accurate points calculation
 */
router.post('/fix-standings-completely', requireAuth, async (req, res) => {
  console.log('🔧 COMPREHENSIVE STANDINGS FIX - Recalculating ALL standings from actual game results');
  console.log('==================================================================================');
  
  try {
    const prisma = await getPrismaClient();
    
    // Get all Division 8 Alpha teams
    const teams = await prisma.team.findMany({
      where: { 
        division: 8,
        subdivision: 'alpha'
      },
      select: { id: true, name: true }
    });
    
    console.log(`🔍 Found ${teams.length} teams in Division 8 Alpha: [${teams.map(t => t.name).join(', ')}]`);
    
    // Get ALL completed games with actual scores
    const completedGames = await prisma.game.findMany({
      where: {
        matchType: 'LEAGUE',
        homeScore: { not: null },
        awayScore: { not: null },
        OR: [
          { homeTeamId: { in: teams.map(t => t.id) } },
          { awayTeamId: { in: teams.map(t => t.id) } }
        ]
      },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });
    
    console.log(`📋 Found ${completedGames.length} completed games with scores`);
    
    // Calculate standings for each team from scratch
    const teamStandings = new Map();
    
    // Initialize all teams with zero records
    teams.forEach(team => {
      teamStandings.set(team.id, {
        id: team.id,
        name: team.name,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        gamesPlayed: 0,
        scoresFor: 0,
        scoresAgainst: 0
      });
    });
    
    console.log('\n📊 Processing each completed game...');
    
    // Process each game and update team records
    completedGames.forEach((game, index) => {
      const homeScore = game.homeScore || 0;
      const awayScore = game.awayScore || 0;
      
      console.log(`${index + 1}. ${game.homeTeam.name} ${homeScore} - ${awayScore} ${game.awayTeam.name}`);
      
      // Get team standings
      const homeTeamStats = teamStandings.get(game.homeTeamId);
      const awayTeamStats = teamStandings.get(game.awayTeamId);
      
      if (homeTeamStats) {
        homeTeamStats.gamesPlayed++;
        homeTeamStats.scoresFor += homeScore;
        homeTeamStats.scoresAgainst += awayScore;
      }
      
      if (awayTeamStats) {
        awayTeamStats.gamesPlayed++;
        awayTeamStats.scoresFor += awayScore;
        awayTeamStats.scoresAgainst += homeScore;
      }
      
      // Determine result
      if (homeScore > awayScore) {
        // Home team wins
        if (homeTeamStats) {
          homeTeamStats.wins++;
          homeTeamStats.points += 3;
        }
        if (awayTeamStats) {
          awayTeamStats.losses++;
        }
        console.log(`   → ${game.homeTeam.name} WINS`);
      } else if (awayScore > homeScore) {
        // Away team wins
        if (awayTeamStats) {
          awayTeamStats.wins++;
          awayTeamStats.points += 3;
        }
        if (homeTeamStats) {
          homeTeamStats.losses++;
        }
        console.log(`   → ${game.awayTeam.name} WINS`);
      } else {
        // Draw
        if (homeTeamStats) {
          homeTeamStats.draws++;
          homeTeamStats.points += 1;
        }
        if (awayTeamStats) {
          awayTeamStats.draws++;
          awayTeamStats.points += 1;
        }
        console.log(`   → DRAW`);
      }
    });
    
    console.log('\n✅ Game processing complete. Updating database...');
    
    // Update all team records in database (without draws field since it doesn't exist)
    const updateResults = [];
    
    for (const [teamId, stats] of teamStandings) {
      try {
        const updatedTeam = await prisma.team.update({
          where: { id: teamId },
          data: {
            wins: stats.wins,
            losses: stats.losses,
            points: stats.points
            // Note: Not updating draws since field doesn't exist in schema
          },
          select: { id: true, name: true, wins: true, losses: true, points: true }
        });
        
        updateResults.push({
          team: stats.name,
          record: `${stats.wins}W-${stats.draws}D-${stats.losses}L`,
          points: stats.points,
          gamesPlayed: stats.gamesPlayed,
          scoreDiff: stats.scoresFor - stats.scoresAgainst,
          updated: true
        });
        
        console.log(`✅ ${stats.name}: ${stats.wins}W-${stats.draws}D-${stats.losses}L = ${stats.points} points (${stats.gamesPlayed} games)`);
      } catch (error: any) {
        console.error(`❌ Failed to update ${stats.name}:`, error);
        updateResults.push({
          team: stats.name,
          error: error.message,
          updated: false
        });
      }
    }
    
    // Sort final standings by points (highest to lowest)
    const finalStandings = Array.from(teamStandings.values())
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return (b.scoresFor - b.scoresAgainst) - (a.scoresFor - a.scoresAgainst);
      });
    
    console.log('\n🏆 CORRECTED FINAL STANDINGS:');
    console.log('=====================================');
    finalStandings.forEach((team, index) => {
      const scoreDiff = team.scoresFor - team.scoresAgainst;
      console.log(`${index + 1}. ${team.name}: ${team.wins}W-${team.draws}D-${team.losses}L = ${team.points} pts (GD: ${scoreDiff >= 0 ? '+' : ''}${scoreDiff})`);
    });
    
    res.json({
      success: true,
      message: 'Standings completely recalculated from actual game results',
      gamesProcessed: completedGames.length,
      teamsUpdated: updateResults.filter(r => r.updated).length,
      finalStandings: finalStandings.map((team, index) => ({
        position: index + 1,
        team: team.name,
        wins: team.wins,
        draws: team.draws,
        losses: team.losses,
        points: team.points,
        gamesPlayed: team.gamesPlayed,
        scoresFor: team.scoresFor,
        scoresAgainst: team.scoresAgainst,
        scoreDifference: team.scoresFor - team.scoresAgainst
      })),
      updateResults
    });
    
  } catch (error) {
    console.error('❌ Error in comprehensive standings fix:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fix standings completely',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;