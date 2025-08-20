import express from 'express';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { LateSignupService } from '../services/lateSignupService.js';
import { asyncHandler } from '../services/errorService.js';

const router = express.Router();

/**
 * GET /api/late-signup/status
 * Get current late signup window status and statistics
 */
import { Request, Response } from 'express';

router.get('/status', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const stats = await LateSignupService.getLateSignupStats();
  
  res.json({
    success: true,
    data: stats
  });
}));

/**
 * GET /api/late-signup/window
 * Check if currently in late signup window
 */
router.get('/window', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const isLateSignupWindow = await LateSignupService.isLateSignupWindow();
  
  res.json({
    success: true,
    data: {
      isLateSignupWindow,
      message: isLateSignupWindow 
        ? "Late signup is currently available (Day 1 3PM - Day 9 3PM)" 
        : "Late signup window is currently closed"
        }
  });
}));

/**
 * POST /api/late-signup/test-daily-processing
 * TESTING ENDPOINT: Manually trigger daily late signup processing
 */
router.post('/test-daily-processing', asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('🧪 Manual test trigger for daily late signup processing');
    await LateSignupService.processDailyLateSignups(4); // Day 4
    
    res.json({
      success: true,
      message: 'Daily late signup processing completed successfully'
    });
  } catch (error) {
    console.error('Error in test daily processing:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}));

/**
 * POST /api/late-signup/debug-alpha
 * DEBUG ENDPOINT: Directly handle Division 8 Alpha
 */
router.post('/debug-alpha', asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('🔧 DEBUG: Directly processing Division 8 Alpha subdivision');
    
    const { getPrismaClient } = await import('../database.js');
    const prisma = await getPrismaClient();
    
    // Find teams in Division 8 Alpha
    const teamsInAlpha = await prisma.team.findMany({
      where: {
        division: 8,
        subdivision: 'alpha'
      },
      include: {
        user: {
          select: {
            uid: true,
            displayName: true
          }
        }
      }
    });
    
    console.log(`Found ${teamsInAlpha.length} teams in Division 8 Alpha:`);
    teamsInAlpha.forEach(team => {
      console.log(`  - ${team.name} (${team.isAI ? 'AI' : 'Human'}) [ID: ${team.id}]`);
    });
    
    // Check existing matches
    const existingMatches = await prisma.match.findMany({
      where: {
        division: 8,
        subdivision: 'alpha'
      }
    });
    
    console.log(`Found ${existingMatches.length} existing matches in Division 8 Alpha`);
    
    let result = {
      teamsFound: teamsInAlpha.length,
      teamsData: teamsInAlpha.map(t => ({ name: t.name, isAI: t.isAI })),
      existingMatches: existingMatches.length,
      action: 'none'
    };
    
    // If subdivision has teams but less than 8, fill with AI
    if (teamsInAlpha.length > 0 && teamsInAlpha.length < 8) {
      const aiNeeded = 8 - teamsInAlpha.length;
      console.log(`Need to add ${aiNeeded} AI teams to complete subdivision`);
      
      await LateSignupService.generateAITeamsForSubdivision('alpha', aiNeeded);
      
      // Get all teams after AI generation
      const allTeams = await prisma.team.findMany({
        where: {
          division: 8,
          subdivision: 'alpha'
        }
      });
      
      // Generate schedule
      await LateSignupService.generateShortenedSeasonSchedule('alpha', allTeams);
      
      result.action = `Added ${aiNeeded} AI teams and generated schedule`;
      
    } else if (teamsInAlpha.length === 8 && existingMatches.length === 0) {
      console.log('Subdivision is full but no schedule exists - generating schedule...');
      await LateSignupService.generateShortenedSeasonSchedule('alpha', teamsInAlpha);
      result.action = 'Generated schedule for complete subdivision';
    }
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error in debug alpha:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}));

export default router;