import express, { Request, Response, NextFunction } from 'express';
import { OaklandCougarsDevService } from '../../services/development/oaklandCougarsDevService.js';
import { DevAuthService } from '../../services/development/devAuthService.js';
import { DevSeedDataService } from '../../services/development/devSeedDataService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

/**
 * Development-only routes for testing and development fixtures
 * These routes are only available when NODE_ENV=development
 */

// Middleware to ensure development environment
router.use((req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ 
      error: 'Development endpoints are only available in development environment' 
    });
  }
  next();
});

/**
 * POST /dev/setup-test-user
 * 
 * Sets up the Oakland Cougars development user for testing
 * This replaces the old /dev-setup-test-user endpoint from leagueRoutes
 */
router.post('/setup-test-user', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Development test user setup requested');
    
    const setupResult = await OaklandCougarsDevService.performCompleteDevSetup();
    
    res.json({
      success: true,
      message: setupResult.message,
      userProfile: {
        id: setupResult.userProfile.id,
        firebaseUid: setupResult.userProfile.firebaseUid,
        email: setupResult.userProfile.email,
        displayName: setupResult.userProfile.displayName
      },
      team: {
        id: setupResult.team.id,
        name: setupResult.team.name,
        userProfileId: setupResult.team.userProfileId
      },
      usage: `Use "${setupResult.authToken}" as Bearer token to authenticate as Oakland Cougars owner`
    });
    
  } catch (error) {
    logger.error('Error setting up development test user', { error });
    next(error);
  }
});

/**
 * GET /dev/setup-status
 * 
 * Gets the current development setup status for Oakland Cougars
 * Useful for debugging and validation
 */
router.get('/setup-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Development setup status requested');
    
    const status = await OaklandCougarsDevService.getDevSetupStatus();
    
    res.json({
      success: true,
      status,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error getting development setup status', { error });
    next(error);
  }
});

/**
 * POST /dev/reset-oakland-cougars
 * 
 * Resets Oakland Cougars development setup
 * Useful for testing from a clean slate
 */
router.post('/reset-oakland-cougars', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Oakland Cougars development reset requested');
    
    // For now, just re-run the setup (idempotent)
    // In the future, this could include cleanup logic
    const setupResult = await OaklandCougarsDevService.performCompleteDevSetup();
    
    res.json({
      success: true,
      message: 'Oakland Cougars development environment reset successfully',
      setupResult: {
        userProfileId: setupResult.userProfile.id,
        teamId: setupResult.team.id
      }
    });
    
  } catch (error) {
    logger.error('Error resetting Oakland Cougars development setup', { error });
    next(error);
  }
});

/**
 * GET /dev/auth-info
 * 
 * Gets information about development authentication system
 * No authentication required - provides documentation
 */
router.get('/auth-info', (req: Request, res: Response) => {
  try {
    const documentation = DevAuthService.getDocumentation();
    
    res.json({
      success: true,
      ...documentation,
      environment: process.env.NODE_ENV
    });
    
  } catch (error) {
    logger.error('Error getting development auth info', { error });
    res.status(500).json({ error: 'Failed to get development auth info' });
  }
});

/**
 * GET /dev/validate-token
 * 
 * Validates a development token and returns user information
 * Requires valid development token
 */
router.get('/validate-token', DevAuthService.createAuthMiddleware(), (req: Request, res: Response) => {
  try {
    const userInfo = (req as any).devUser;
    
    res.json({
      success: true,
      message: 'Development token is valid',
      userInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error validating development token', { error });
    res.status(500).json({ error: 'Failed to validate development token' });
  }
});

/**
 * GET /dev/oakland-status
 * 
 * Gets Oakland Cougars-specific development status
 * Requires Oakland Cougars development token
 */
router.get('/oakland-status', DevAuthService.createAuthMiddleware('team_owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify this is specifically the Oakland Cougars user
    if (!DevAuthService.isOaklandCougarsRequest(req)) {
      return res.status(403).json({
        error: 'This endpoint requires Oakland Cougars development token',
        requiredToken: 'dev-token-oakland-cougars'
      });
    }
    
    const status = await OaklandCougarsDevService.getDevSetupStatus();
    
    res.json({
      success: true,
      oaklandCougarsStatus: status,
      userInfo: (req as any).devUser,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error getting Oakland Cougars development status', { error });
    next(error);
  }
});

/**
 * POST /dev/seed-teams
 * 
 * Creates development teams for testing
 * Requires admin development token
 */
router.post('/seed-teams', DevAuthService.createAuthMiddleware('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { division = 8, subdivision = 'alpha', count = 3, prefix = 'Dev Team' } = req.body;
    
    logger.info('Development team seeding requested', { division, subdivision, count, prefix });
    
    const teams = await DevSeedDataService.createDevelopmentTeams({
      division,
      subdivision,
      count,
      prefix
    });
    
    res.json({
      success: true,
      message: `${teams.length} development teams created successfully`,
      teams: teams.map(({ team, userProfile }) => ({
        teamId: team.id,
        teamName: team.name,
        division: team.division,
        subdivision: team.subdivision,
        userProfileId: userProfile.id,
        firebaseUid: userProfile.firebaseUid
      }))
    });
    
  } catch (error) {
    logger.error('Error seeding development teams', { error });
    next(error);
  }
});

/**
 * POST /dev/seed-complete
 * 
 * Creates a complete development environment
 * Requires admin development token
 */
router.post('/seed-complete', DevAuthService.createAuthMiddleware('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      division = 8, 
      includeOaklandCougars = true, 
      createPlayers = true 
    } = req.body;
    
    logger.info('Complete development environment seeding requested', {
      division,
      includeOaklandCougars,
      createPlayers
    });
    
    const result = await DevSeedDataService.createCompleteDevEnvironment({
      division,
      includeOaklandCougars,
      createPlayers
    });
    
    res.json({
      success: true,
      ...result,
      requestedBy: (req as any).devUser.firebaseUid
    });
    
  } catch (error) {
    logger.error('Error creating complete development environment', { error });
    next(error);
  }
});

export { router as devRoutes };