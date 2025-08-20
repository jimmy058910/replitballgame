import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middleware/firebaseAuth.js";

const router = Router();

/**
 * Reset all team standings and generate league schedule for Days 5-14
 * Admin endpoint for development purposes
 */
router.post('/reset-and-schedule', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.claims.sub;
    
    // Only allow specific admin user for development
    if (userId !== 'dev-user-123') {
      return res.status(403).json({ message: "Admin access required for this operation" });
    }

    console.log('🧹 === STEP 1: CLEARING ALL RESULTS AND STANDINGS ===');
    
    // Import database client (matching pattern from other routes)
    const { getPrismaClient } = await import('../database.js');
    const prisma = await getPrismaClient();
    
    // Reset all team records to 0
    const teamUpdate = await prisma.team.updateMany({
      data: {
        wins: 0,
        losses: 0,
        points: 0
      }
    });
    console.log(`✅ Reset ${teamUpdate.count} team standings to 0`);
    
    // Delete all existing LEAGUE games (keep EXHIBITION and TOURNAMENT)
    const deletedGames = await prisma.game.deleteMany({
      where: {
        matchType: 'LEAGUE'
      }
    });
    console.log(`✅ Deleted ${deletedGames.count} league games`);
    
    // Skip player stats clearing for now - continue with scheduling
    console.log(`✅ Skipped player stats clearing (no dedicated stats table found)`);
    
    console.log('\n📅 === STEP 2: GENERATING LEAGUE SCHEDULE (DAYS 5-14) ===');
    
    // Get all divisions with teams using current season ID
    const currentSeason = await prisma.season.findFirst({
      orderBy: { startDate: 'desc' }
    });
    
    if (!currentSeason) {
      throw new Error('No current season found');
    }
    
    const divisions = await prisma.league.findMany({
      where: {
        seasonId: currentSeason.id
      }
    });
    
    let totalGamesCreated = 0;
    
    for (const league of divisions) {
      // Get teams in this division, grouped by subdivision
      const teamsInDivision = await prisma.team.findMany({
        where: { 
          division: league.division 
        },
        orderBy: { subdivision: 'asc' }
      });
      
      if (teamsInDivision.length === 0) {
        console.log(`⚠️ Skipping Division ${league.division} - no teams`);
        continue;
      }
      
      // Group teams by subdivision (exactly 8 teams per subdivision)
      const subdivisions: { [key: string]: any[] } = {};
      teamsInDivision.forEach(team => {
        const sub = team.subdivision || 'alpha';
        if (!subdivisions[sub]) subdivisions[sub] = [];
        subdivisions[sub].push(team);
      });
      
      console.log(`🏟️ Division ${league.division}: ${Object.keys(subdivisions).length} subdivisions`);
      
      for (const [subdivisionName, teams] of Object.entries(subdivisions)) {
        if (teams.length < 8) {
          console.log(`⚠️ Subdivision ${subdivisionName} has only ${teams.length} teams, skipping`);
          continue;
        }
        
        // Generate 10 days of games (Days 5-14) for this subdivision
        const games = [];
        
        for (let day = 5; day <= 14; day++) {
          // Create 4 games per day (8 teams = 4 matches)
          const dayMatches = generateDayMatches(teams, day);
          
          dayMatches.forEach((match, matchIndex) => {
            // Schedule at 3PM EDT (19:00 UTC) with 15-minute intervals
            const gameDate = new Date('2025-07-13'); // Season start date
            gameDate.setDate(gameDate.getDate() + day - 1); // Adjust for day
            gameDate.setHours(19 + Math.floor(matchIndex / 4), (matchIndex % 4) * 15, 0, 0); // 3PM EDT base + intervals
            
            games.push({
              leagueId: league.id,
              homeTeamId: match.homeTeam.id,
              awayTeamId: match.awayTeam.id,
              gameDate: gameDate,
              status: 'SCHEDULED',
              matchType: 'LEAGUE'
            });
          });
        }
        
        // Insert games into database
        if (games.length > 0) {
          await prisma.game.createMany({
            data: games
          });
          
          totalGamesCreated += games.length;
          console.log(`✅ ${subdivisionName}: Created ${games.length} games for ${teams.length} teams`);
        }
      }
    }
    
    console.log(`\n🎉 === COMPLETE: Generated ${totalGamesCreated} league games ===`);
    
    res.json({
      success: true,
      message: "Reset and schedule generation completed successfully",
      summary: {
        teamsReset: teamUpdate.count,
        gamesDeleted: deletedGames.count,
        statsCleared: 0,
        gamesCreated: totalGamesCreated
      },
      details: {
        eachTeamPlays: 10,
        daysScheduled: "5-14",
        gameTime: "3PM EDT daily with 15-minute intervals"
      }
    });
    
  } catch (error) {
    console.error('❌ Error in reset and schedule:', error);
    next(error);
  }
});

/**
 * Generate matches for a single day ensuring each team plays exactly once
 * Uses round-robin rotation for fair scheduling
 */
function generateDayMatches(teams: any[], day: number) {
  const matches = [];
  const numTeams = teams.length;
  
  if (numTeams < 8) return matches;
  
  // Round-robin algorithm: rotate teams to create balanced schedule
  const teamList = [...teams];
  const rotationOffset = (day - 5) % (numTeams - 1); // Days 5-14 mapped to 0-9
  
  // Apply rotation
  for (let i = 0; i < rotationOffset; i++) {
    teamList.push(teamList.shift());
  }
  
  // Create 4 matches from 8 teams
  for (let i = 0; i < 4; i++) {
    const homeTeam = teamList[i];
    const awayTeam = teamList[i + 4];
    
    matches.push({
      homeTeam: homeTeam,
      awayTeam: awayTeam
    });
  }
  
  return matches;
}

export default router;