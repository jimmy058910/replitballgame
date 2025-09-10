/**
 * TEAM CONTRACTS & TRANSACTIONS ROUTES
 * Contract management and transaction history for teams
 * Extracted from teamRoutes.ts for better maintainability
 */

import { Router, Request, Response } from 'express';
import { storage } from '../../storage/index.js';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';

const router = Router();

/**
 * Get team player contracts
 * GET /:teamId/contracts
 */
router.get('/:teamId/contracts', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  logger.debug('TEAM_CONTRACTS', 'Team contracts requested');
  
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) {
    throw ErrorCreators.validation("Invalid team ID");
  }

  const userId = req?.user?.uid;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  // Verify team ownership
  const userTeam = await storage.teams.getTeamByUserId(userId);
  if (!userTeam || userTeam.id !== teamId) {
    throw ErrorCreators.forbidden("Team not found or you don't have permission to access this team");
  }

  // Get all player contracts for the team
  const { getPrismaClient } = await import('../../database.js');
  const prisma = await getPrismaClient();
  
  const contracts = await prisma.contract.findMany({
    where: { 
      playerId: { not: null },
      player: {
        teamId: teamId
      }
    },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          race: true,
          age: true,
          role: true
        }
      }
    }
  });
  
  // Transform contracts to display format
  const contractsWithPlayer = contracts.map(contract => ({
    ...contract,
    salary: contract.salary,
    signingBonus: contract.signingBonus,
    player: contract.player
  }));
  
  logger.info('TEAM_CONTRACTS', 'Successfully returned team contracts', {
    teamId,
    contractCount: contractsWithPlayer.length
  });

  res.json({
    success: true,
    contracts: contractsWithPlayer,
    totalContracts: contractsWithPlayer.length,
    players: contractsWithPlayer.map(contract => ({
      id: contract.player?.id,
      firstName: contract.player?.firstName,
      lastName: contract.player?.lastName,
      race: contract.player?.race,
      age: contract.player?.age,
      role: contract.player?.role,
      salary: contract.salary,
      contractLength: contract.length,
      signingBonus: contract.signingBonus,
      startDate: contract.startDate
    }))
  });
}));

/**
 * Get team transaction history
 * GET /:teamId/transactions
 */
router.get('/:teamId/transactions', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  logger.debug('TEAM_CONTRACTS', 'Team transactions requested');
  
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) {
    throw ErrorCreators.validation("Invalid team ID");
  }

  const userId = req?.user?.uid;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  // Verify team ownership
  const userTeam = await storage.teams.getTeamByUserId(userId);
  if (!userTeam || userTeam.id !== teamId) {
    throw ErrorCreators.forbidden("Team not found or you don't have permission to access this team");
  }

  try {
    const { PaymentHistoryService } = await import('../../services/paymentHistoryService.js');
    
    // Get team payment history and user payment history
    const teamTransactions = await PaymentHistoryService.getTeamPaymentHistory(teamId);
    const userTransactions = await PaymentHistoryService.getUserPaymentHistory(userId, {
      limit: 50,
      offset: 0,
      currencyFilter: "both"
    });
    
    // Combine and sort by date
    const allTransactions = [
      ...(Array.isArray(teamTransactions) ? teamTransactions : teamTransactions?.transactions || []),
      ...(Array.isArray(userTransactions) ? userTransactions : userTransactions?.transactions || [])
    ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    logger.info('TEAM_CONTRACTS', 'Successfully returned team transactions', {
      teamId,
      transactionCount: allTransactions.length
    });

    res.json({
      success: true,
      transactions: allTransactions,
      totalCount: allTransactions.length
    });

  } catch (error) {
    logger.error('TEAM_CONTRACTS', 'Error fetching transactions', error, { teamId });
    throw ErrorCreators.internal("Failed to fetch transactions");
  }
}));

/**
 * Legacy transactions endpoint for backward compatibility
 * GET /transactions
 */
router.get('/transactions', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  logger.debug('TEAM_CONTRACTS', 'Legacy transactions endpoint accessed');
  
  const userId = req?.user?.uid;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }

  // Get user's team first
  const userTeam = await storage.teams.getTeamByUserId(userId);
  if (!userTeam) {
    throw ErrorCreators.notFound("Team not found");
  }

  // Redirect to team-specific endpoint logic
  try {
    const { PaymentHistoryService } = await import('../../services/paymentHistoryService.js');
    
    const userTransactions = await PaymentHistoryService.getUserPaymentHistory(userId, {
      limit: 100,
      offset: 0,
      currencyFilter: "both"
    });
    
    logger.info('TEAM_CONTRACTS', 'Successfully returned user transactions', {
      userId,
      teamId: userTeam.id,
      transactionCount: Array.isArray(userTransactions) ? userTransactions.length : userTransactions?.transactions?.length || 0
    });

    res.json({
      success: true,
      transactions: Array.isArray(userTransactions) ? userTransactions : userTransactions?.transactions || [],
      totalCount: Array.isArray(userTransactions) ? userTransactions.length : userTransactions?.transactions?.length || 0
    });

  } catch (error) {
    logger.error('TEAM_CONTRACTS', 'Error fetching user transactions', error, { userId });
    throw ErrorCreators.internal("Failed to fetch user transactions");
  }
}));

/**
 * Get team transactions/payment history
 * GET /transactions
 */
router.get('/transactions', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  LoggingService.info('/api/teams/transactions route called');
  
  const userId = req?.user?.uid;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  // Get user's team first
  const team = await storage.teams.getTeamByUserId(userId);
  if (!team) {
    return res.status(404).json({ message: "Team not found" });
  }
  
  try {
    // Get team payment history and convert BigInt to strings
    const { PaymentHistoryService } = await import('../../services/paymentHistoryService.js');
    const transactions = await PaymentHistoryService.getTeamPaymentHistory(team.id.toString());
    
    // Convert BigInt values to strings for JSON serialization
    const serializedTransactions = transactions.map((transaction: any) => ({
      ...transaction,
      creditsAmount: transaction.creditsAmount?.toString() || '0',
      gemsAmount: transaction.gemsAmount || 0
    }));
    
    LoggingService.info(`Found ${serializedTransactions.length} transactions for team ${team.id}`);
    res.json(serializedTransactions);
  } catch (error) {
    LoggingService.error('Error getting transactions', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Failed to get transactions" });
  }
}));

export default router;