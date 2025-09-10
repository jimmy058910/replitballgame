/**
 * TEAM FINANCES ROUTES
 * Financial operations and calculations for teams
 * Extracted from teamRoutes.ts for better maintainability
 */

import { Router, Request, Response } from 'express';
import { storage } from '../../storage/index.js';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';

const router = Router();

/**
 * Get user's team finances
 * GET /my/finances
 */
router.get('/my/finances', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  logger.debug('TEAM_FINANCES', 'User team finances requested');
  
  const userId = req?.user?.uid;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  const team = await storage.teams.getTeamByUserId(userId);
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  // Get team finances using storage layer
  const finances = await storage.teamFinances.getTeamFinances(team.id);
  if (!finances) {
    throw ErrorCreators.notFound("Team finances not found");
  }

  logger.info('TEAM_FINANCES', 'Successfully returned user team finances', { 
    teamId: team.id, 
    teamName: team.name 
  });

  res.json(finances);
}));

/**
 * Get team finances with comprehensive calculations
 * GET /:teamId/finances
 */
router.get('/:teamId/finances', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  logger.debug('TEAM_FINANCES', 'Team-specific finances requested');
  
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) {
    throw ErrorCreators.validation("Invalid team ID");
  }

  // Use EnhancedTeamManagementService for clean service layer architecture
  const { EnhancedTeamManagementService } = await import('../../services/enhancedTeamManagementService.js');
  const comprehensiveFinances = await EnhancedTeamManagementService.calculateComprehensiveFinances(teamId);
  
  // Create response object maintaining API compatibility
  const calculatedFinances = {
    ...comprehensiveFinances.rawFinances,
    // Calculated values for frontend
    playerSalaries: comprehensiveFinances.playerSalaries,
    staffSalaries: comprehensiveFinances.staffSalaries,
    totalExpenses: comprehensiveFinances.totalExpenses,
    netIncome: comprehensiveFinances.netIncome,
    // Maintenance cost in proper format
    maintenanceCosts: comprehensiveFinances.maintenanceCosts
  };

  logger.info('TEAM_FINANCES', 'Successfully returned calculated finances', {
    teamId,
    playerSalaries: comprehensiveFinances.playerSalaries,
    staffSalaries: comprehensiveFinances.staffSalaries,
    netIncome: comprehensiveFinances.netIncome
  });

  res.json(calculatedFinances);
}));

/**
 * Fix team financial balance (Admin operation)
 * POST /:teamId/fix-financial-balance
 */
router.post('/:teamId/fix-financial-balance', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) {
    throw ErrorCreators.validation("Invalid team ID");
  }

  logger.adminOperation('FIX_FINANCIAL_BALANCE', 'Admin financial balance fix requested', { teamId });

  try {
    const { getPrismaClient } = await import('../../database.js');
    const prisma = await getPrismaClient();
    
    // Get team information
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        finances: true,
        players: {
          include: { contracts: true }
        },
        staff: true
      }
    });

    if (!team) {
      throw ErrorCreators.notFound(`Team with ID ${teamId} not found`);
    }

    // Calculate player salaries
    let totalPlayerSalaries = 0;
    for (const player of team.players) {
      if (player.contracts && player.contracts.length > 0) {
        const activeContract = player.contracts[0]; // Assuming first contract is active
        totalPlayerSalaries += Number(activeContract.salary || 0);
      }
    }

    // Calculate staff salaries 
    let totalStaffSalaries = 0;
    for (const staff of team.staff) {
      totalStaffSalaries += Number(staff.salary || 0);
    }

    const totalExpenses = totalPlayerSalaries + totalStaffSalaries;
    const netIncome = Number(team.finances?.projectedIncome || 0) - totalExpenses;

    // Update team finances with corrected calculations
    await prisma.teamFinances.update({
      where: { teamId: teamId },
      data: {
        projectedExpenses: totalExpenses,
        // Add any other financial corrections needed
      }
    });

    const result = {
      teamId,
      teamName: team.name,
      corrections: {
        totalPlayerSalaries,
        totalStaffSalaries,
        totalExpenses,
        netIncome,
        previousExpenses: team.finances?.projectedExpenses || 0
      }
    };

    logger.adminSuccess('FIX_FINANCIAL_BALANCE', 'Financial balance corrected', result);

    res.json({
      success: true,
      message: `Financial balance fixed for ${team.name}`,
      corrections: result.corrections
    });

  } catch (error) {
    logger.adminError('FIX_FINANCIAL_BALANCE', 'Failed to fix financial balance', error, { teamId });
    throw error;
  }
}));

export default router;