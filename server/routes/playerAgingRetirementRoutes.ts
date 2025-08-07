import { Router } from 'express';
import { PlayerAgingRetirementService } from '../services/playerAgingRetirementService';
import { isAuthenticated } from '../googleAuth';
import { RBACService } from '../services/rbacService';

const router = Router();

/**
 * GET /api/player-aging/player/:playerId/stats
 * Get player development statistics and history
 */
router.get('/player/:playerId/stats', isAuthenticated, async (req, res) => {
  try {
    const { playerId } = req.params;
    
    const stats = await PlayerAgingRetirementService.getPlayerDevelopmentStats(playerId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting player development stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve player development statistics'
    });
  }
});

/**
 * POST /api/player-aging/player/:playerId/simulate
 * Simulate aging for a player over multiple seasons (testing only)
 */
router.post('/player/:playerId/simulate', isAuthenticated, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { numberOfSeasons = 5, avgGamesPerSeason = 10 } = req.body;
    
    if (numberOfSeasons < 1 || numberOfSeasons > 20) {
      return res.status(400).json({
        success: false,
        error: 'Number of seasons must be between 1 and 20'
      });
    }
    
    const simulation = await PlayerAgingRetirementService.simulatePlayerAging(
      playerId,
      numberOfSeasons,
      avgGamesPerSeason
    );
    
    res.json({
      success: true,
      data: simulation
    });
  } catch (error) {
    console.error('Error simulating player aging:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to simulate player aging'
    });
  }
});

/**
 * POST /api/player-aging/team/:teamId/process-development
 * Process end-of-season development for a team
 */
router.post('/team/:teamId/process-development', isAuthenticated, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { season } = req.body;
    
    if (!season || typeof season !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Season number is required'
      });
    }
    
    const results = await PlayerAgingRetirementService.processTeamEndOfSeasonDevelopment(teamId, season);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error processing team development:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process team development'
    });
  }
});

/**
 * POST /api/player-aging/league/process-development
 * Process end-of-season development for entire league
 */
router.post('/league/process-development', isAuthenticated, async (req, res) => {
  try {
    const { season } = req.body;
    
    if (!season || typeof season !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Season number is required'
      });
    }
    
    const results = await PlayerAgingRetirementService.processLeagueEndOfSeasonDevelopment(season);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error processing league development:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process league development'
    });
  }
});

/**
 * POST /api/player-aging/player/:playerId/force-retirement
 * Force retire a player (admin only)
 */
router.post('/player/:playerId/force-retirement', isAuthenticated, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { season, reason = 'administrative' } = req.body;
    
    if (!season || typeof season !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Season number is required'
      });
    }
    
    await PlayerAgingRetirementService.retirePlayer(playerId, season, reason);
    
    res.json({
      success: true,
      message: 'Player retired successfully'
    });
  } catch (error) {
    console.error('Error forcing player retirement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retire player'
    });
  }
});

/**
 * GET /api/player-aging/player/:playerId/progression-chance
 * Calculate progression chances for a player's stats
 */
router.get('/player/:playerId/progression-chance', isAuthenticated, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { gamesPlayed = 0 } = req.query;
    
    // Get player data (this would need to be implemented to fetch player)
    // For now, we'll return the calculation method
    
    const stats = ['speed', 'agility', 'power', 'throwing', 'catching', 'kicking', 'leadership', 'stamina'];
    const progressionChances = {};
    
    // This would need actual player data
    // For demonstration, showing the calculation structure
    for (const stat of stats) {
      // progressionChances[stat] = PlayerAgingRetirementService.calculateProgressionChance(player, stat, Number(gamesPlayed));
    }
    
    res.json({
      success: true,
      data: {
        playerId,
        gamesPlayed: Number(gamesPlayed),
        progressionChances,
        message: 'Progression chance calculation requires full player data'
      }
    });
  } catch (error) {
    console.error('Error calculating progression chances:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate progression chances'
    });
  }
});

/**
 * GET /api/player-aging/player/:playerId/retirement-chance
 * Calculate retirement chance for a player
 */
router.get('/player/:playerId/retirement-chance', isAuthenticated, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { age, careerInjuries = 0, gamesPlayedLastSeason = 0 } = req.query;
    
    if (!age) {
      return res.status(400).json({
        success: false,
        error: 'Player age is required'
      });
    }
    
    const retirementChance = PlayerAgingRetirementService.calculateRetirementChance(
      Number(age),
      Number(careerInjuries),
      Number(gamesPlayedLastSeason)
    );
    
    res.json({
      success: true,
      data: {
        playerId,
        age: Number(age),
        careerInjuries: Number(careerInjuries),
        gamesPlayedLastSeason: Number(gamesPlayedLastSeason),
        retirementChance
      }
    });
  } catch (error) {
    console.error('Error calculating retirement chance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate retirement chance'
    });
  }
});

/**
 * GET /api/player-aging/config
 * Get aging system configuration and formulas
 */
router.get('/config', isAuthenticated, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        ageRanges: PlayerAgingRetirementService.AGE_RANGES,
        developmentConfig: PlayerAgingRetirementService.DEVELOPMENT_CONFIG,
        retirementChances: PlayerAgingRetirementService.RETIREMENT_CHANCES,
        formulas: {
          progressionChance: 'BaseChance + PotentialModifier + AgeModifier + UsageModifier',
          declineChance: '(player.age - 30) * 2.5%',
          retirementChance: 'BaseAgeChance + InjuryModifier + PlayingTimeModifier'
        }
      }
    });
  } catch (error) {
    console.error('Error getting aging config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve aging configuration'
    });
  }
});

/**
 * POST /api/player-aging/generate-age
 * Generate appropriate age for player context
 */
router.post('/generate-age', isAuthenticated, async (req, res) => {
  try {
    const { context = 'general' } = req.body;
    
    if (!['tryout', 'free_agent', 'general'].includes(context)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid context. Must be: tryout, free_agent, or general'
      });
    }
    
    const age = PlayerAgingRetirementService.generatePlayerAge(context);
    
    res.json({
      success: true,
      data: {
        age,
        context,
        ageRange: context === 'tryout' 
          ? `${PlayerAgingRetirementService.AGE_RANGES.TRYOUT_MIN}-${PlayerAgingRetirementService.AGE_RANGES.TRYOUT_MAX}` 
          : `${PlayerAgingRetirementService.AGE_RANGES.FREE_AGENT_MIN}-${PlayerAgingRetirementService.AGE_RANGES.FREE_AGENT_MAX}`
        }
    });
  } catch (error) {
    console.error('Error generating player age:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate player age'
    });
  }
});

export default router;