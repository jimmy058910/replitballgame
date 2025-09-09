/**
 * EXTRACTED SERVICE LAYER - League Routes
 * 
 * This is the refactored version replacing the 511-line standings function
 * with proper service layer separation following Clean Architecture principles.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { LeagueStandingsService } from '../services/leagues/standings.service.js';
import { storage } from '../storage/index.js';
import { requireAuth } from "../middleware/firebaseAuth.js";
import logger from '../utils/logger.js';

const router = Router();

// =============================================================================
// STANDARDIZED ERROR HANDLING (Service Layer Pattern)
// =============================================================================

class ServiceError extends Error {
  constructor(
    message: string,
    public cause?: Error,
    public code?: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

const handleServiceError = (error: any, res: Response) => {
  if (error instanceof ServiceError) {
    logger.error('Service error occurred', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      cause: error.cause?.message
    });
    return res.status(error.statusCode).json({ 
      message: error.message,
      code: error.code
    });
  }
  
  logger.error('Unexpected error', { error: error.message, stack: error.stack });
  res.status(500).json({ message: "Internal server error" });
};

// =============================================================================
// STANDARDIZED API RESPONSE FORMATTING
// =============================================================================

const formatSuccessResponse = <T>(data: T, message?: string) => ({
  success: true,
  data,
  message: message || 'Request completed successfully'
});

const validateDivisionParams = (params: any): { division: number } => {
  const division = parseInt(params.division);
  if (isNaN(division) || division < 1 || division > 8) {
    throw new ServiceError("Invalid division parameter", undefined, "INVALID_DIVISION", 400);
  }
  return { division };
};

const getUserIdFromAuth = async (req: Request): Promise<string> => {
  const userId = req.user?.uid;
  if (!userId) {
    throw new ServiceError("Authentication required", undefined, "AUTH_REQUIRED", 401);
  }
  return userId;
};

// =============================================================================
// USER SUBDIVISION RESOLUTION SERVICE
// =============================================================================

/**
 * Resolves user subdivision for dome ball league standings
 * Handles special cases for development (Oakland Cougars lookup)
 */
class UserSubdivisionService {
  static async resolveUserSubdivision(
    userId: string, 
    division: number
  ): Promise<{ subdivision: string; userTeam?: any }> {
    try {
      // Get user's team
      let userTeam = await storage.teams.getTeamByUserId(userId);
      let subdivision = userTeam?.subdivision || 'main';

      logger.info('Resolving user subdivision', {
        userId,
        division,
        teamFound: !!userTeam,
        teamName: userTeam?.name,
        teamSubdivision: userTeam?.subdivision,
        defaultSubdivision: subdivision
      });

      // Handle development/testing cases - Oakland Cougars lookup
      if (!userTeam || (userTeam && userTeam.name !== 'Oakland Cougars')) {
        if (userTeam) {
          logger.info('User has different team, searching for Oakland Cougars in all subdivisions');
        } else {
          logger.info('No team found for user, searching all subdivisions for Oakland Cougars');
        }

        // Search all Greek alphabet subdivisions for Oakland Cougars
        const subdivisions = ['alpha', 'beta', 'gamma', 'main', 'delta', 'epsilon'];
        
        for (const sub of subdivisions) {
          const teamsInSub = await storage.teams.getTeamsByDivisionAndSubdivision(division, sub);
          const oaklandInSub = teamsInSub.find(team => team.name.includes('Oakland Cougars'));
          
          if (oaklandInSub) {
            logger.info('Oakland Cougars found in subdivision', { subdivision: sub });
            subdivision = sub;
            break;
          }
        }
      }

      return { subdivision, userTeam };
    } catch (error) {
      logger.error('Error resolving user subdivision', { error, userId, division });
      throw new ServiceError('Failed to resolve user subdivision', error);
    }
  }
}

// =============================================================================
// EXTRACTED LEAGUE STANDINGS ENDPOINT (Thin Controller Pattern)
// =============================================================================

/**
 * GET /:division/standings
 * 
 * BEFORE: 511 lines of embedded business logic
 * AFTER: Clean route handler using service layer
 */
router.get('/:division/standings', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  logger.info('League standings request received', {
    division: req.params.division,
    userId: req.user?.uid,
    url: req.originalUrl
  });

  try {
    // Input validation
    const { division } = validateDivisionParams(req.params);
    const userId = await getUserIdFromAuth(req);
    
    // Resolve user subdivision (handles Oakland Cougars dev case)
    const { subdivision, userTeam } = await UserSubdivisionService.resolveUserSubdivision(userId, division);
    
    // Get standings using service layer
    const standingsService = new LeagueStandingsService();
    const standings = await standingsService.getStandings(
      division,
      subdivision,
      true // includeStats for enhanced standings
    );

    // Ensure exactly 8 teams per subdivision (dome ball requirement)
    const cappedStandings = standings.slice(0, 8);

    // Add request context for client
    const responseData = {
      standings: cappedStandings,
      subdivision,
      userTeam: userTeam ? {
        id: userTeam.id,
        name: userTeam.name,
        division: userTeam.division,
        subdivision: userTeam.subdivision
      } : null,
      division
    };

    const duration = Date.now() - startTime;
    logger.info('League standings request completed', {
      division,
      subdivision,
      standingsCount: cappedStandings.length,
      duration,
      userId
    });

    res.json(formatSuccessResponse(responseData, 'League standings retrieved successfully'));
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('League standings request failed', {
      error: error.message,
      duration,
      division: req.params.division,
      userId: req.user?.uid
    });
    
    handleServiceError(error, res);
  }
});

// =============================================================================
// DOME BALL SPECIFIC BUSINESS LOGIC SERVICE
// =============================================================================

/**
 * Enhanced Dome Ball Standings Service
 * Extends LeagueStandingsService with dome ball specific calculations
 */
class DomeBallStandingsService extends LeagueStandingsService {
  /**
   * Get dome ball standings with specific calculation rules
   */
  async getDomeBallStandings(
    division: number,
    subdivision: string,
    scheduleId?: string
  ): Promise<any[]> {
    try {
      // Use parent service for base standings
      const baseStandings = await this.getStandings(division, subdivision, true);
      
      // Apply dome ball specific enhancements
      const enhancedStandings = await this.enhanceWithDomeBallStats(
        baseStandings,
        division,
        subdivision,
        scheduleId
      );
      
      // Sort using dome ball tiebreaker rules
      return this.sortByDomeBallRules(enhancedStandings);
    } catch (error) {
      logger.error('Error getting dome ball standings', { error, division, subdivision });
      throw new ServiceError('Failed to get dome ball standings', error);
    }
  }

  /**
   * Enhance standings with dome ball specific statistics
   */
  private async enhanceWithDomeBallStats(
    standings: any[],
    division: number,
    subdivision: string,
    scheduleId?: string
  ): Promise<any[]> {
    // Implementation would include:
    // - Score totals (not goals) for dome ball
    // - Head-to-head records
    // - Streak calculations
    // - Greek alphabet subdivision handling
    // - Real-time game completion checking
    
    return standings.map(standing => ({
      ...standing,
      // Dome ball specific fields
      totalScores: standing.goalsFor || 0, // Dome ball uses "scores" not "goals"  
      scoresAgainst: standing.goalsAgainst || 0,
      scoreDifference: (standing.goalsFor || 0) - (standing.goalsAgainst || 0),
      gamesPlayed: standing.wins + standing.losses + standing.draws,
      // Enhanced UI fields
      position: 0, // Will be set during sorting
      streak: this.calculateStreak(standing.recentGames),
      form: this.calculateForm(standing.recentGames)
    }));
  }

  /**
   * Sort teams using dome ball tiebreaker rules
   */
  private sortByDomeBallRules(teams: any[]): any[] {
    return teams.sort((a, b) => {
      // 1. Primary: Points (3 for win, 1 for draw)
      if (b.points !== a.points) return b.points - a.points;
      
      // 2. Tiebreaker: Score Difference  
      const aScoreDiff = a.scoreDifference || 0;
      const bScoreDiff = b.scoreDifference || 0;
      if (bScoreDiff !== aScoreDiff) return bScoreDiff - aScoreDiff;
      
      // 3. Tiebreaker: Total Scores (offensive output)
      const aTotalScores = a.totalScores || 0;
      const bTotalScores = b.totalScores || 0;
      if (bTotalScores !== aTotalScores) return bTotalScores - aTotalScores;
      
      // 4. Tiebreaker: Wins
      if (b.wins !== a.wins) return b.wins - a.wins;
      
      // 5. Final: Fewer losses
      return a.losses - b.losses;
    }).map((team, index) => ({
      ...team,
      position: index + 1
    }));
  }
}

export { router as extractedLeagueRoutes };