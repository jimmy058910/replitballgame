/**
 * LEAGUE STANDINGS ROUTES
 * Extracted from monolithic leagueRoutes.ts
 * Handles: Division standings, rankings, team statistics
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';

const router = Router();

/**
 * Get division standings
 * GET /:division/standings
 */
router.get('/:division/standings', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const division = parseInt(req.params.division);
    
    logger.info('Getting division standings', { division });
    
    const standings = await storage.leagues.getLeagueStandings(division);
    
    // Debug: Check what teams exist in this division
    const prisma = await (await import('../../database/DatabaseService.js')).DatabaseService.getInstance();
    const teamsInDivision = await prisma.team.findMany({ 
      where: { division: division },
      select: { id: true, name: true, division: true, wins: true, losses: true, draws: true, points: true }
    });
    logger.info('Teams in division for standings', { 
      division, 
      teamsCount: teamsInDivision.length, 
      teams: teamsInDivision 
    });
    
    // Debug: Check if LeagueStanding table has any records
    const allStandings = await prisma.leagueStanding.findMany();
    logger.info('All LeagueStanding records in database', { count: allStandings.length, data: allStandings.slice(0, 3) });
    const standingsForDivision = await prisma.leagueStanding.findMany({ where: { leagueId: division } });
    logger.info('LeagueStanding records for this division', { division, count: standingsForDivision.length });
    
    logger.info('Division standings results', { 
      division, 
      standingsCount: Array.isArray(standings) ? standings.length : 'NOT_ARRAY',
      standingsType: typeof standings,
      standingsKeys: standings ? Object.keys(standings) : 'NULL',
      standingsData: JSON.stringify(standings, null, 2)
    });
    
    res.json({
      success: true,
      standings
    });
  } catch (error) {
    logger.error('Failed to get division standings', { 
      division: req.params.division, 
      error: error instanceof Error ? error.message : String(error) 
    });
    next(error);
  }
});

/**
 * Development endpoint to populate division 7 with test teams
 * POST /7/populate-test-teams
 */
router.post('/7/populate-test-teams', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Populating division 7 with test teams for development');
    
    const prisma = await (await import('../../database/DatabaseService.js')).DatabaseService.getInstance();
    
    // Check if division 7 already has teams (besides Oakland Cougars)
    const existingTeams = await prisma.team.findMany({
      where: { division: 7 },
      select: { id: true, name: true }
    });
    
    logger.info('Existing teams in division 7', { count: existingTeams.length, teams: existingTeams });
    
    // Define test teams to add
    const testTeams = [
      { name: 'Shadow Runners 197', wins: 3, losses: 2, draws: 0, points: 9 },
      { name: 'Fire Hawks 261', wins: 2, losses: 2, draws: 1, points: 7 },
      { name: 'Iron Wolves 858', wins: 2, losses: 3, draws: 0, points: 6 },
      { name: 'Thunder Eagles', wins: 1, losses: 3, draws: 1, points: 4 },
      { name: 'Desert Hawks 2025', wins: 1, losses: 4, draws: 0, points: 3 }
    ];
    
    const createdTeams = [];
    
    for (const teamData of testTeams) {
      // Check if team already exists
      const existing = existingTeams.find(team => team.name === teamData.name);
      if (existing) {
        logger.info('Team already exists, skipping', { name: teamData.name });
        continue;
      }
      
      // Create the team
      const newTeam = await prisma.team.create({
        data: {
          name: teamData.name,
          division: 7,
          subdivision: 'alpha',
          wins: teamData.wins,
          losses: teamData.losses,
          draws: teamData.draws,
          points: teamData.points,
          // Basic required fields
          credits: 1000000,
          teamPower: 75 + Math.floor(Math.random() * 20), // Random between 75-95
          stadiumId: null,
          userProfileId: null // Test teams don't have owners
        }
      });
      
      createdTeams.push(newTeam);
      logger.info('Created test team', { name: newTeam.name, id: newTeam.id });
    }
    
    logger.info('Division 7 population completed', { 
      existingCount: existingTeams.length, 
      createdCount: createdTeams.length,
      totalCount: existingTeams.length + createdTeams.length 
    });
    
    res.json({
      success: true,
      message: `Division 7 populated with ${createdTeams.length} test teams`,
      existing: existingTeams.length,
      created: createdTeams.length,
      total: existingTeams.length + createdTeams.length,
      teams: createdTeams.map(team => ({ id: team.id, name: team.name, points: team.points }))
    });
    
  } catch (error) {
    logger.error('Failed to populate division 7 test teams', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    next(error);
  }
});

export default router;