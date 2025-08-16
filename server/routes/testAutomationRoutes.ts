import { Router, type Request, type Response } from "express";
import { seasonTimingAutomationService } from '../services/seasonTimingAutomationService.js';

const router = Router();

// Test route to manually trigger automation systems
router.post('/trigger-season-check', async (req: Request, res: Response) => {
  try {
    console.log('🔧 Manual trigger: Running season automation check...');
    
    // Manually trigger the missed progression check which should create a season
    await (seasonTimingAutomationService as any).checkAndExecuteMissedDailyProgressions();
    
    res.json({ 
      success: true, 
      message: 'Season automation check triggered successfully' 
    });
  } catch (error) {
    console.error('❌ Error triggering season check:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test route to get current season from storage
router.get('/season-status', async (req: Request, res: Response) => {
  try {
    const { storage } = await import('../storage/index.js');
    const currentSeason = await storage.seasons.getCurrentSeason();
    
    res.json({
      seasonExists: !!currentSeason,
      season: currentSeason,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error checking season status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;