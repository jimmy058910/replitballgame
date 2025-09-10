import express, { Request, Response, NextFunction } from 'express';
import { getPrismaClient } from '../../database.js';
import { logger } from '../../utils/logger.js';
import { ServiceError } from '../../utils/ServiceError.js';
import { AdminAuthService } from '../../services/admin/adminAuthService.js';

const router = express.Router();

/**
 * Emergency administrative routes for production hotfixes
 * 
 * IMPORTANT: These routes should be heavily protected and used only
 * for emergency situations. They are being extracted from leagueRoutes.ts
 * to provide proper separation of concerns and security.
 * 
 * TODO: Replace these emergency fixes with proper admin tools
 */

/**
 * GET /admin/emergency/auth-info
 * 
 * Gets information about emergency authentication system
 * No authentication required - provides documentation
 */
router.get('/auth-info', (req: Request, res: Response) => {
  try {
    const documentation = AdminAuthService.getDocumentation();
    
    res.json({
      success: true,
      ...documentation,
      environment: process.env.NODE_ENV,
      warning: 'Emergency operations require proper admin authentication and are heavily monitored'
    });
    
  } catch (error) {
    logger.error('Error getting emergency auth info', { error });
    res.status(500).json({ error: 'Failed to get emergency auth info' });
  }
});

/**
 * POST /admin/emergency/fix-team-contracts/:teamId
 * 
 * Emergency fix for team contract issues
 * MOVED FROM: leagueRoutes.ts /fix-team-contracts/:teamId
 */
router.post('/fix-team-contracts/:teamId', AdminAuthService.createAdminMiddleware('emergency_fixes'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = parseInt(req.params.teamId);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }

    logger.warn('Emergency team contract fix initiated', { teamId });

    const prisma = await getPrismaClient();
    
    // Get team info for logging
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        players: {
          include: {
            contracts: true
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    let contractsFixed = 0;
    let contractsCreated = 0;

    // Fix player contracts (emergency logic from original endpoint)
    for (const player of team.players) {
      if (player.contracts.length === 0) {
        // Create missing contract
        await prisma.contract.create({
          data: {
            playerId: player.id,
            teamId: teamId,
            salary: player.salary || 50000,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            isActive: true
          }
        });
        contractsCreated++;
      } else {
        // Fix existing contracts
        for (const contract of player.contracts) {
          if (!contract.isActive) {
            await prisma.contract.update({
              where: { id: contract.id },
              data: { isActive: true }
            });
            contractsFixed++;
          }
        }
      }
    }

    logger.warn('Emergency team contract fix completed', {
      teamId,
      teamName: team.name,
      contractsFixed,
      contractsCreated
    });

    res.json({
      success: true,
      message: 'Emergency contract fix completed',
      teamId,
      teamName: team.name,
      contractsFixed,
      contractsCreated,
      warning: 'This was an emergency operation - please investigate root cause'
    });

  } catch (error) {
    logger.error('Error in emergency team contract fix', { error, teamId: req.params.teamId });
    next(error);
  }
});

/**
 * POST /admin/emergency/fix-team-players/:teamId
 * 
 * Emergency fix for team player relationships
 * MOVED FROM: leagueRoutes.ts /fix-team-players/:teamId
 */
router.post('/fix-team-players/:teamId', AdminAuthService.createAdminMiddleware('emergency_fixes'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = parseInt(req.params.teamId);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }

    logger.warn('Emergency team player fix initiated', { teamId });

    const prisma = await getPrismaClient();
    
    // Get team info
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        players: true
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    let playersFixed = 0;

    // Fix player relationships (emergency logic from original endpoint)
    for (const player of team.players) {
      if (player.teamId !== teamId) {
        await prisma.player.update({
          where: { id: player.id },
          data: { teamId: teamId }
        });
        playersFixed++;
      }
    }

    logger.warn('Emergency team player fix completed', {
      teamId,
      teamName: team.name,
      playersFixed
    });

    res.json({
      success: true,
      message: 'Emergency player fix completed',
      teamId,
      teamName: team.name,
      playersFixed,
      warning: 'This was an emergency operation - please investigate root cause'
    });

  } catch (error) {
    logger.error('Error in emergency team player fix', { error, teamId: req.params.teamId });
    next(error);
  }
});

/**
 * POST /admin/emergency/move-team-subdivision
 * 
 * Emergency team subdivision move (generalized from Storm Breakers fix)
 * MOVED FROM: leagueRoutes.ts /admin/move-storm-breakers
 */
router.post('/move-team-subdivision', AdminAuthService.createAdminMiddleware('team_management'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamName, newSubdivision, newDivision } = req.body;

    if (!teamName || !newSubdivision) {
      return res.status(400).json({ 
        error: 'teamName and newSubdivision are required',
        example: {
          teamName: 'Storm Breakers',
          newSubdivision: 'beta',
          newDivision: 7
        }
      });
    }

    logger.warn('Emergency team subdivision move initiated', { 
      teamName, 
      newSubdivision, 
      newDivision 
    });

    const prisma = await getPrismaClient();
    
    // Find the team
    const team = await prisma.team.findFirst({
      where: { name: teamName }
    });

    if (!team) {
      return res.status(404).json({ error: `Team '${teamName}' not found` });
    }

    // Update team subdivision (and division if provided)
    const updateData: any = { subdivision: newSubdivision };
    if (newDivision) {
      updateData.division = newDivision;
    }

    const updatedTeam = await prisma.team.update({
      where: { id: team.id },
      data: updateData
    });

    logger.warn('Emergency team subdivision move completed', {
      teamId: team.id,
      teamName,
      oldSubdivision: team.subdivision,
      newSubdivision,
      oldDivision: team.division,
      newDivision: updatedTeam.division
    });

    res.json({
      success: true,
      message: 'Emergency team move completed',
      team: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        oldSubdivision: team.subdivision,
        newSubdivision: updatedTeam.subdivision,
        oldDivision: team.division,
        newDivision: updatedTeam.division
      },
      warning: 'This was an emergency operation - please investigate root cause'
    });

  } catch (error) {
    logger.error('Error in emergency team subdivision move', { error, body: req.body });
    next(error);
  }
});

/**
 * POST /admin/emergency/reset-division-subdivision
 * 
 * Emergency division/subdivision reset (generalized from division-7-alpha)
 * MOVED FROM: leagueRoutes.ts /reset-division-7-alpha
 */
router.post('/reset-division-subdivision', AdminAuthService.createConfirmationMiddleware('I understand this will delete all data for this division/subdivision', 'data_deletion'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { division, subdivision, confirm } = req.body;

    if (!division || !subdivision) {
      return res.status(400).json({ 
        error: 'division and subdivision are required',
        example: {
          division: 7,
          subdivision: 'alpha',
          confirm: 'I understand this will delete all data for this division/subdivision'
        }
      });
    }

    if (confirm !== 'I understand this will delete all data for this division/subdivision') {
      return res.status(400).json({
        error: 'Confirmation required for this destructive operation',
        requiredConfirmation: 'I understand this will delete all data for this division/subdivision'
      });
    }

    logger.warn('Emergency division/subdivision reset initiated', { 
      division, 
      subdivision,
      dangerLevel: 'EXTREME'
    });

    const prisma = await getPrismaClient();
    
    // Count what will be deleted
    const teamsToDelete = await prisma.team.count({
      where: { division, subdivision }
    });

    const playersToDelete = await prisma.player.count({
      where: { 
        team: { division, subdivision } 
      }
    });

    const gamesToDelete = await prisma.game.count({
      where: {
        OR: [
          { homeTeam: { division, subdivision } },
          { awayTeam: { division, subdivision } }
        ]
      }
    });

    // Perform the reset in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete players first (foreign key constraints)
      await tx.player.deleteMany({
        where: { team: { division, subdivision } }
      });

      // Delete games involving these teams
      await tx.game.deleteMany({
        where: {
          OR: [
            { homeTeam: { division, subdivision } },
            { awayTeam: { division, subdivision } }
          ]
        }
      });

      // Delete teams
      await tx.team.deleteMany({
        where: { division, subdivision }
      });
    });

    logger.warn('Emergency division/subdivision reset completed', {
      division,
      subdivision,
      teamsDeleted: teamsToDelete,
      playersDeleted: playersToDelete,
      gamesDeleted: gamesToDelete,
      dangerLevel: 'COMPLETED'
    });

    res.json({
      success: true,
      message: 'Emergency division/subdivision reset completed',
      deletedCounts: {
        teams: teamsToDelete,
        players: playersToDelete,
        games: gamesToDelete
      },
      division,
      subdivision,
      warning: 'This was a destructive emergency operation - all data for this division/subdivision has been permanently deleted'
    });

  } catch (error) {
    logger.error('Error in emergency division/subdivision reset', { error, body: req.body });
    next(error);
  }
});

export { router as emergencyRoutes };