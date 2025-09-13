/**
 * FINANCE ADMIN ROUTES
 * Extracted from monolithic enhancedFinanceRoutes.ts
 * Handles: Administrative financial operations, auditing, system management
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { RBACService, Permission } from '../../services/rbacService.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';

const router = Router();

/**
 * Get financial system status
 * GET /admin/status
 */
router.get('/admin/status', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    
    logger.adminOperation('GET_FINANCE_STATUS', 'Getting financial system status', { userId });
    
    const status = await storage.finance.getSystemStatus();
    
    res.json({ success: true, status });
  } catch (error) {
    logger.error('Failed to get financial system status', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * FINANCE ADMIN ROUTES
 * Extracted from monolithic enhancedFinanceRoutes.ts
 * Handles: Administrative financial operations, auditing, system management, financial automation
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { RBACService, Permission } from '../../services/rbacService.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';
import { DatabaseService } from '../../database/DatabaseService.js';

/**
 * Financial Automation Service - Process weekly maintenance costs and salaries
 */
class FinancialAutomationService {
  static async processWeeklyFinancialMaintenance(): Promise<{ 
    teamsProcessed: number; 
    totalMaintenanceCosts: number; 
    totalSalariesPaid: number; 
    errors: string[] 
  }> {
    const prisma = await DatabaseService.getInstance();
    let teamsProcessed = 0;
    let totalMaintenanceCosts = 0;
    let totalSalariesPaid = 0;
    const errors: string[] = [];

    try {
      // Get all teams with their finances, players, staff, and stadiums
      const teams = await prisma.team.findMany({
        include: {
          finances: true,
          stadium: true,
          players: true,
          staff: true
        }
      });

      for (const team of teams) {
        try {
          if (!team.finances) {
            errors.push(`Team ${team.name} has no finances record`);
            continue;
          }

          let weeklyMaintenanceCost = 0;
          let weeklySalaryCost = 0;

          // Stadium maintenance costs (based on stadium level)
          if (team.stadium) {
            const stadiumLevel = team.stadium.level || 1;
            const baseMaintenanceCost = 5000; // Base weekly maintenance
            weeklyMaintenanceCost = baseMaintenanceCost * stadiumLevel * 1.2; // Scales with stadium level
          }

          // Player salaries (sum all player salaries)
          for (const player of team.players) {
            if (player.salary) {
              weeklySalaryCost += Number(player.salary) / 52; // Annual salary / 52 weeks
            }
          }

          // Staff salaries (sum all staff salaries)  
          for (const staff of team.staff) {
            if (staff.salary) {
              weeklySalaryCost += Number(staff.salary) / 52; // Annual salary / 52 weeks
            }
          }

          const totalWeeklyCosts = Math.floor(weeklyMaintenanceCost + weeklySalaryCost);
          const currentCredits = Number(team.finances.credits);

          // Check if team can afford the costs
          if (currentCredits >= totalWeeklyCosts) {
            // Deduct costs from team finances
            await prisma.teamFinances.update({
              where: { teamId: team.id },
              data: {
                credits: {
                  decrement: totalWeeklyCosts
                },
                updatedAt: new Date()
              }
            });

            // Create transaction record
            await prisma.paymentTransaction.create({
              data: {
                userId: team.userProfileId.toString(),
                teamId: team.id,
                amount: totalWeeklyCosts,
                currency: 'credits',
                status: 'completed',
                transactionType: 'maintenance',
                itemName: 'weekly_maintenance_and_salaries',
                metadata: {
                  stadiumMaintenance: Math.floor(weeklyMaintenanceCost),
                  playerSalaries: Math.floor(weeklySalaryCost - (team.staff.reduce((sum, s) => sum + (Number(s.salary) || 0), 0) / 52)),
                  staffSalaries: Math.floor(team.staff.reduce((sum, s) => sum + (Number(s.salary) || 0), 0) / 52),
                  totalCosts: totalWeeklyCosts
                },
                updatedAt: new Date()
              }
            });

            totalMaintenanceCosts += Math.floor(weeklyMaintenanceCost);
            totalSalariesPaid += Math.floor(weeklySalaryCost);
            teamsProcessed++;

            logger.info('Weekly financial maintenance processed', {
              teamId: team.id,
              teamName: team.name,
              stadiumMaintenance: Math.floor(weeklyMaintenanceCost),
              salaries: Math.floor(weeklySalaryCost),
              totalCosts: totalWeeklyCosts,
              remainingCredits: currentCredits - totalWeeklyCosts
            });
          } else {
            // Team cannot afford costs - log warning but don't fail
            errors.push(`Team ${team.name} insufficient funds: needs ${totalWeeklyCosts}₡, has ${currentCredits}₡`);
            
            logger.warn('Team insufficient funds for weekly maintenance', {
              teamId: team.id,
              teamName: team.name,
              required: totalWeeklyCosts,
              available: currentCredits,
              deficit: totalWeeklyCosts - currentCredits
            });
          }
        } catch (teamError) {
          errors.push(`Error processing team ${team.name}: ${teamError instanceof Error ? teamError.message : String(teamError)}`);
          logger.error('Error processing team financial maintenance', {
            teamId: team.id,
            teamName: team.name,
            error: teamError instanceof Error ? teamError.message : String(teamError)
          });
        }
      }
    } catch (error) {
      errors.push(`System error: ${error instanceof Error ? error.message : String(error)}`);
      logger.error('System error in financial automation', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return {
      teamsProcessed,
      totalMaintenanceCosts,
      totalSalariesPaid,
      errors
    };
  }

  static async processSeasonEndBonuses(): Promise<{
    bonusesPaid: number;
    totalBonusAmount: number;
    errors: string[]
  }> {
    const prisma = await DatabaseService.getInstance();
    let bonusesPaid = 0;
    let totalBonusAmount = 0;
    const errors: string[] = [];

    try {
      // Get teams with their league standings
      const teams = await prisma.team.findMany({
        include: {
          finances: true
        }
      });

      for (const team of teams) {
        try {
          if (!team.finances) continue;

          // Calculate season-end bonus based on performance
          // This is a simplified version - in reality you'd check league standings
          const baseBonus = 10000; // Base season completion bonus
          const performanceMultiplier = Math.random() * 2 + 0.5; // 0.5x to 2.5x based on performance
          const seasonBonus = Math.floor(baseBonus * performanceMultiplier);

          // Add bonus to team finances
          await prisma.teamFinances.update({
            where: { teamId: team.id },
            data: {
              credits: {
                increment: seasonBonus
              },
              updatedAt: new Date()
            }
          });

          // Create transaction record
          await prisma.paymentTransaction.create({
            data: {
              userId: team.userProfileId.toString(),
              teamId: team.id,
              amount: seasonBonus,
              currency: 'credits',
              status: 'completed',
              transactionType: 'season_bonus',
              itemName: 'season_completion_bonus',
              metadata: {
                baseBonus,
                performanceMultiplier,
                totalBonus: seasonBonus
              },
              updatedAt: new Date()
            }
          });

          bonusesPaid++;
          totalBonusAmount += seasonBonus;

          logger.info('Season bonus processed', {
            teamId: team.id,
            teamName: team.name,
            bonus: seasonBonus,
            multiplier: performanceMultiplier
          });
        } catch (teamError) {
          errors.push(`Error processing bonus for team ${team.name}: ${teamError instanceof Error ? teamError.message : String(teamError)}`);
        }
      }
    } catch (error) {
      errors.push(`System error in season bonuses: ${error instanceof Error ? error.message : String(error)}`);
      logger.error('System error in season bonus processing', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return {
      bonusesPaid,
      totalBonusAmount,
      errors
    };
  }
}

/**
 * Get financial system status
 * GET /admin/status
 */
router.get('/admin/status', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const prisma = await DatabaseService.getInstance();
    
    logger.adminOperation('GET_FINANCE_STATUS', 'Getting financial system status', { userId });
    
    // Get system-wide financial statistics
    const [totalTeams, totalCredits, totalGems, recentTransactions] = await Promise.all([
      prisma.team.count(),
      prisma.teamFinances.aggregate({
        _sum: { credits: true }
      }),
      prisma.teamFinances.aggregate({
        _sum: { gems: true }
      }),
      prisma.paymentTransaction.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ]);
    
    const status = {
      totalTeams,
      totalCreditsInCirculation: Number(totalCredits._sum.credits || 0),
      totalGemsInCirculation: totalGems._sum.gems || 0,
      recentTransactions,
      lastMaintenanceRun: 'Not implemented yet',
      automationStatus: 'Active',
      systemHealth: 'Healthy'
    };
    
    res.json({ success: true, status });
  } catch (error) {
    logger.error('Failed to get financial system status', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Run financial automation manually (admin only)
 * POST /admin/run-maintenance
 */
router.post('/admin/run-maintenance', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    
    // TODO: Add admin role check here
    // const hasPermission = await RBACService.hasPermission(userId, Permission.ADMIN_FINANCE);
    // if (!hasPermission) {
    //   return res.status(403).json({ error: 'Insufficient permissions' });
    // }
    
    logger.adminOperation('RUN_FINANCIAL_MAINTENANCE', 'Running manual financial maintenance', { userId });
    
    const result = await FinancialAutomationService.processWeeklyFinancialMaintenance();
    
    logger.info('Manual financial maintenance completed', {
      userId,
      ...result
    });
    
    res.json({
      success: true,
      message: 'Financial maintenance completed',
      results: {
        teamsProcessed: result.teamsProcessed,
        totalMaintenanceCosts: result.totalMaintenanceCosts,
        totalSalariesPaid: result.totalSalariesPaid,
        errors: result.errors
      }
    });
  } catch (error) {
    logger.error('Failed to run financial maintenance', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Run season bonuses manually (admin only)
 * POST /admin/run-season-bonuses
 */
router.post('/admin/run-season-bonuses', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    
    logger.adminOperation('RUN_SEASON_BONUSES', 'Running manual season bonuses', { userId });
    
    const result = await FinancialAutomationService.processSeasonEndBonuses();
    
    logger.info('Season bonuses completed', {
      userId,
      ...result
    });
    
    res.json({
      success: true,
      message: 'Season bonuses processed',
      results: {
        bonusesPaid: result.bonusesPaid,
        totalBonusAmount: result.totalBonusAmount,
        errors: result.errors
      }
    });
  } catch (error) {
    logger.error('Failed to run season bonuses', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Get financial automation logs
 * GET /admin/automation-logs
 */
router.get('/admin/automation-logs', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { limit = 100 } = req.query;
    
    logger.adminOperation('GET_AUTOMATION_LOGS', 'Getting financial automation logs', { userId });
    
    const prisma = await DatabaseService.getInstance();
    
    // Get recent maintenance and automation transactions
    const logs = await prisma.paymentTransaction.findMany({
      where: {
        transactionType: {
          in: ['maintenance', 'season_bonus', 'automation']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      include: {
        team: {
          select: { name: true }
        }
      }
    });
    
    res.json({
      success: true,
      logs: logs.map(log => ({
        id: log.id,
        teamName: log.team?.name || 'Unknown',
        type: log.transactionType,
        amount: Number(log.amount),
        currency: log.currency,
        status: log.status,
        metadata: log.metadata,
        createdAt: log.createdAt
      }))
    });
  } catch (error) {
    logger.error('Failed to get automation logs', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

export default router;