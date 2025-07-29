import { Router, type Request, type Response, type NextFunction } from "express";
import { matchStorage } from "../storage/matchStorage";
import { storage } from "../storage/index";
// playerStorage imported via storage index
import { isAuthenticated } from "../replitAuth";
import { simulateEnhancedMatch as fullMatchSimulation } from "../services/matchSimulation";
import { matchStateManager } from "../services/matchStateManager";
import { prisma } from "../db";

const router = Router();

// Stadium data endpoint for test matches
router.get('/:matchId/stadium-data', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    
    // For test matches (starting with 'live-test-'), return mock stadium data
    if (matchId.startsWith('live-test-')) {
      const mockStadiumData = {
        capacity: 25000,
        attendance: 18500,
        fanLoyalty: 75,
        atmosphere: 82,
        revenue: {
          tickets: 462500,
          concessions: 148000,
          parking: 55500,
          merchandise: 55500,
          vip: 15000,
          total: 736500
        },
        facilities: {
          concessions: 3,
          parking: 2,
          vip: 3,
          merchandising: 2,
          lighting: 4
        }
      };
      
      return res.json(mockStadiumData);
    }
    
    // For real matches, get actual stadium data from database
    const match = await prisma.game.findUnique({
      where: { id: parseInt(matchId) },
      include: {
        homeTeam: {
          include: { stadium: true }
        }
      }
    });
    
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }
    
    const stadium = match.homeTeam.stadium;
    if (!stadium) {
      return res.status(404).json({ message: "Stadium data not found" });
    }
    
    // Calculate stadium data
    const stadiumData = {
      capacity: stadium.capacity,
      attendance: Math.floor(stadium.capacity * 0.8), // Example calculation
      fanLoyalty: 75, // This would come from team data
      atmosphere: 80,
      revenue: {
        tickets: stadium.capacity * 25,
        concessions: stadium.capacity * 8 * stadium.concessionsLevel,
        parking: Math.floor(stadium.capacity * 0.3) * 10 * stadium.parkingLevel,
        merchandise: stadium.capacity * 3 * stadium.merchandisingLevel,
        vip: stadium.vipSuitesLevel * 5000,
        total: 0 // Will be calculated
      },
      facilities: {
        concessions: stadium.concessionsLevel,
        parking: stadium.parkingLevel,
        vip: stadium.vipSuitesLevel,
        merchandising: stadium.merchandisingLevel,
        lighting: stadium.lightingScreensLevel
      }
    };
    
    // Calculate total revenue
    stadiumData.revenue.total = Object.values(stadiumData.revenue).reduce((sum, val) => sum + val, 0) - stadiumData.revenue.total;
    
    res.json(stadiumData);
  } catch (error) {
    console.error("Error fetching stadium data:", error);
    next(error);
  }
});

// Utility function to serialize BigInt values to strings
function serializeBigIntValues(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => serializeBigIntValues(item));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = serializeBigIntValues(obj[key]);
      }
    }
    return result;
  }
  
  return obj;
}

// Match routes - ALL LIVE MATCHES across the game
router.get('/live', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get user's team ID from the authenticated user
    const userId = (req as any).user.claims?.sub || (req as any).user.userId;
    
    const userTeam = await storage.teams.getTeamByUserId(userId);
    const teamId = userTeam?.id;
    
    // Get ALL live matches across the game
    const allLiveMatches = await matchStorage.getLiveMatches();

    // Transform matches for comprehensive live hub display
    const transformedMatches = allLiveMatches.map(match => {
      // Determine match type based on context - fix to use matchType field from database
      const matchType = match.tournamentId ? 'TOURNAMENT' : 
                       match.matchType === 'EXHIBITION' ? 'EXHIBITION' : 'LEAGUE';
      
      // Determine priority and user involvement
      const userTeamInvolved = teamId && (match.homeTeamId === teamId || match.awayTeamId === teamId);
      
      let priority = 'MEDIUM';
      if (userTeamInvolved) priority = 'HIGH';
      else if (matchType === 'TOURNAMENT') priority = 'HIGH';
      else if (match.homeTeam?.division <= 2 || match.awayTeam?.division <= 2) priority = 'HIGH';
      
      return {
        id: match.id.toString(),
        type: matchType,
        status: match.status || 'LIVE',
        homeTeam: {
          id: match.homeTeamId.toString(),
          name: match.homeTeam?.name || 'Unknown Team',
          logo: null
        },
        awayTeam: {
          id: match.awayTeamId.toString(),
          name: match.awayTeam?.name || 'Unknown Team',
          logo: null
        },
        homeScore: match.homeScore || 0,
        awayScore: match.awayScore || 0,
        gameTime: match.gameTime || 0,
        maxGameTime: match.maxGameTime || 2400, // 40 minutes default
        division: match.homeTeam?.division || match.awayTeam?.division || 8,
        subdivision: match.homeTeam?.subdivision || match.awayTeam?.subdivision || match.league?.name || 'Unknown Subdivision',
        tournamentName: match.tournament?.name || (matchType === 'TOURNAMENT' ? 'Tournament Match' : null),
        priority: priority,
        userTeamInvolved: userTeamInvolved,
        gameDate: match.gameDate || new Date().toISOString(),
        estimatedEndTime: null,
        viewers: match.viewers || 0 // Mock viewer count for now
      };
    });

    // Return all transformed matches for comprehensive live hub
    res.json(transformedMatches);
  } catch (error) {
    console.error("Error fetching live matches:", error);
    next(error);
  }
});



router.get('/:matchId', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const matchIdNum = parseInt(matchId, 10);
    if (isNaN(matchIdNum)) {
      return res.status(400).json({ message: "Invalid match ID" });
    }
    const match = await matchStorage.getMatchById(matchIdNum); // Use matchStorage

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    // Fetch full team data for proper team information
    const homeTeam = await storage.teams.getTeamById(match.homeTeamId);
    const awayTeam = await storage.teams.getTeamById(match.awayTeamId);
    
    console.log(`Match ${matchId} - Home: ${match.homeTeamId}, Away: ${match.awayTeamId}`);
    console.log(`Team lookup - Home: ${homeTeam?.name}, Away: ${awayTeam?.name}`);
    
    const homeTeamName = homeTeam?.name || "Home";
    const awayTeamName = awayTeam?.name || "Away";
    
    // Convert team objects to avoid BigInt serialization issues
    const serializedHomeTeam = homeTeam ? JSON.parse(JSON.stringify(homeTeam, (key, value) => {
      return typeof value === 'bigint' ? value.toString() : value;
    })) : null;
    
    const serializedAwayTeam = awayTeam ? JSON.parse(JSON.stringify(awayTeam, (key, value) => {
      return typeof value === 'bigint' ? value.toString() : value;
    })) : null;

    if (match.status === 'IN_PROGRESS') {
      const liveState = await matchStateManager.syncMatchState(matchIdNum);
      if (liveState) {
        const responseData = {
          ...match,
          id: match.id.toString(),
          homeTeamId: match.homeTeamId.toString(),
          awayTeamId: match.awayTeamId.toString(),
          leagueId: match.leagueId ? match.leagueId.toString() : null,
          tournamentId: match.tournamentId ? match.tournamentId.toString() : null,
          homeTeamName, 
          awayTeamName,
          homeTeam: serializedHomeTeam ? { 
            id: serializedHomeTeam.id,
            name: serializedHomeTeam.name 
          } : null,
          awayTeam: serializedAwayTeam ? { 
            id: serializedAwayTeam.id,
            name: serializedAwayTeam.name 
          } : null,
          liveState: {
            gameTime: liveState.gameTime, currentHalf: liveState.currentHalf,
            team1Score: liveState.homeScore, team2Score: liveState.awayScore,
            homeScore: liveState.homeScore, awayScore: liveState.awayScore, // Add these for frontend compatibility
            recentEvents: liveState.gameEvents.slice(-10),
            maxTime: liveState.maxTime, isRunning: liveState.status === 'live'
          }
        };
        
        // Use the comprehensive BigInt serialization utility
        const finalResponse = serializeBigIntValues(responseData);
        return res.json(finalResponse);
      }
    }
    // Create response data with all required fields
    const responseData = {
      ...match,
      homeTeamName,
      awayTeamName,
      homeTeam: serializedHomeTeam ? { 
        id: serializedHomeTeam.id,
        name: serializedHomeTeam.name 
      } : null,
      awayTeam: serializedAwayTeam ? { 
        id: serializedAwayTeam.id,
        name: serializedAwayTeam.name 
      } : null
    };
    
    // Use the comprehensive BigInt serialization utility
    const finalResponse = serializeBigIntValues(responseData);
    res.json(finalResponse);
  } catch (error) {
    console.error("Error fetching match:", error);
    next(error);
  }
});

// Debug endpoint to test database access (no auth)
router.get('/:matchId/debug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    console.log(`Debug endpoint called for match ${matchId}`);
    
    // Return simple test data to verify the endpoint works
    res.json({
      debug: true,
      matchId: matchId,
      timestamp: new Date().toISOString(),
      message: "Debug endpoint working"
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Simple test endpoint to check routing (must be before parameterized routes)
router.get('/test', async (req: Request, res: Response) => {
  console.log("Simple test endpoint called");
  res.json({ message: "Test endpoint working", timestamp: new Date().toISOString() });
});

// Manual match start endpoint for tournament debugging
router.post('/start/:matchId', async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    console.log(`Manual match start requested for match ${matchId}`);
    
    const result = await matchStateManager.startLiveMatch(matchId);
    
    res.json({ 
      success: true, 
      message: `Match ${matchId} started successfully`,
      matchState: {
        matchId: result.matchId,
        status: result.status,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        gameTime: result.gameTime
      }
    });
  } catch (error) {
    console.error(`Error starting match ${req.params.matchId}:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Debug endpoint with specific path (must be before generic :matchId routes)
router.get('/debug/:matchId', async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    console.log(`Debug endpoint called for match ${matchId}`);
    
    // Return simple test data to verify the endpoint works
    res.json({
      debug: true,
      matchId: matchId,
      timestamp: new Date().toISOString(),
      message: "Debug endpoint working"
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Enhanced match data endpoint for real-time simulation data (auth disabled due to middleware hanging issue)
router.get('/:matchId/enhanced-data', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const matchIdNum = parseInt(matchId, 10);
    if (isNaN(matchIdNum)) {
      return res.status(400).json({ message: "Invalid match ID" });
    }
    
    console.log(`=== Enhanced data request for match ${matchId} ===`);
    
    // Get match data from database
    const match = await matchStorage.getMatchById(matchIdNum);
    
    if (!match) {
      console.log(`Match ${matchId} not found`);
      return res.status(404).json({ message: "Match not found" });
    }

    console.log(`Match ${matchId} found, status: ${match.status}`);
    
    // Extract MVP data from simulation log
    let mvpData = null;
    let teamStats = null;
    let simulationLogData = null;
    
    try {
      if (match.simulationLog) {
        simulationLogData = typeof match.simulationLog === 'string' 
          ? JSON.parse(match.simulationLog) 
          : match.simulationLog;
        
        console.log('Simulation log keys:', Object.keys(simulationLogData || {}));
        
        // Extract MVP data
        if (simulationLogData?.mvpData) {
          mvpData = simulationLogData.mvpData;
          console.log('MVP data found:', mvpData);
        } else if (simulationLogData?.mvpPlayers) {
          mvpData = simulationLogData.mvpPlayers;
          console.log('MVP players found:', mvpData);
        }
        
        // Extract team stats
        if (simulationLogData?.teamStats) {
          const rawTeamStats = simulationLogData.teamStats;
          teamStats = {
            home: rawTeamStats[match.homeTeamId.toString()] || {},
            away: rawTeamStats[match.awayTeamId.toString()] || {}
          };
          console.log('Team stats extracted:', teamStats);
        }
      }
    } catch (error) {
      console.error('Error parsing simulation log:', error);
    }
    
    // Calculate real-time MVP data if not found in simulation log
    if (!mvpData) {
      console.log('Calculating real-time MVP data...');
      console.log('Simulation log data exists:', !!simulationLogData);
      console.log('Player stats exist:', !!simulationLogData?.playerStats);
      console.log('Player stats keys:', simulationLogData?.playerStats ? Object.keys(simulationLogData.playerStats) : 'none');
      
      // Get player stats from simulation log
      let homeTopPlayer = null;
      let awayTopPlayer = null;
      let homeTopScore = 0;
      let awayTopScore = 0;
      
      if (simulationLogData?.playerStats) {
        const playerStats = simulationLogData.playerStats;
        
        // Calculate MVP scores for all players
        for (const [playerId, stats] of Object.entries(playerStats)) {
          // Get player info
          const player = await storage.players.getPlayerById(parseInt(playerId));
          if (!player) continue;
          
          // Calculate MVP score: scores*10 + tackles*3 + passes*2 + catches*2 + yards*0.1
          const mvpScore = (stats.scores || 0) * 10 + 
                          (stats.tackles || 0) * 3 + 
                          (stats.passesCompleted || 0) * 2 + 
                          (stats.catches || 0) * 2 + 
                          ((stats.carrierYards || 0) + (stats.passingYards || 0) + (stats.receivingYards || 0)) * 0.1;
          
          console.log(`Player ${player.firstName} ${player.lastName} MVP score: ${mvpScore}`
                    + ` (scores: ${stats.scores}, tackles: ${stats.tackles}, passes: ${stats.passesCompleted}, catches: ${stats.catches})`);
          
          // Check if this player belongs to home or away team
          if (player.teamId === match.homeTeamId) {
            if (mvpScore > homeTopScore) {
              homeTopScore = mvpScore;
              homeTopPlayer = {
                playerName: `${player.firstName} ${player.lastName}`,
                score: Math.round(mvpScore * 10) / 10,
                playerId: player.id
              };
            }
          } else if (player.teamId === match.awayTeamId) {
            if (mvpScore > awayTopScore) {
              awayTopScore = mvpScore;
              awayTopPlayer = {
                playerName: `${player.firstName} ${player.lastName}`,
                score: Math.round(mvpScore * 10) / 10,
                playerId: player.id
              };
            }
          }
        }
      }
      
      mvpData = {
        homeMVP: homeTopPlayer || {
          playerName: "No MVP Data Available",
          score: 0
        },
        awayMVP: awayTopPlayer || {
          playerName: "No MVP Data Available", 
          score: 0
        }
      };
      
      console.log('Real-time MVP data calculated:', mvpData);
    }
    
    // Fallback team stats if not found
    if (!teamStats) {
      teamStats = {
        home: {
          turnovers: 0,
          carrierYards: 0,
          passingYards: 0,
          totalOffensiveYards: 0,
          timeOfPossessionSeconds: 0,
          totalKnockdownsInflicted: 0
        },
        away: {
          turnovers: 0,
          carrierYards: 0,
          passingYards: 0,
          totalOffensiveYards: 0,
          timeOfPossessionSeconds: 0,
          totalKnockdownsInflicted: 0
        }
      };
    }

    const enhancedData = {
      atmosphereEffects: {
        homeFieldAdvantage: 0,
        crowdNoise: 75,
        intimidationFactor: 15,
        fieldSize: "Standard",
        attendance: 20000,
        fanLoyalty: 85
      },
      tacticalEffects: {
        homeTeamFocus: "Balanced",
        awayTeamFocus: "Balanced",
        homeTeamModifiers: { passing: 0, rushing: 0, defense: 0 },
        awayTeamModifiers: { passing: 0, rushing: 0, defense: 0 }
      },
      playerStats: {},
      mvpData: mvpData,
      teamStats: teamStats,
      gamePhase: "completed",
      possession: "home"
    };

    console.log(`Sending enhanced data response for match ${matchId}`);
    res.json(enhancedData);
  } catch (error) {
    console.error(`Error fetching enhanced match data for ${matchId}:`, error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Old enhanced-data endpoint (to be removed later)
router.get('/:matchId/enhanced-data-old', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const matchIdNum = parseInt(matchId, 10);
    if (isNaN(matchIdNum)) {
      return res.status(400).json({ message: "Invalid match ID" });
    }
    
    console.log(`=== Enhanced data request for match ${matchId} ===`);
    
    const match = await matchStorage.getMatchById(matchIdNum);
    
    if (!match) {
      console.log(`Match ${matchId} not found`);
      return res.status(404).json({ message: "Match not found" });
    }

    console.log(`Match ${matchId} found, status: ${match.status}`);

    // Get live match state if available
    const liveState = await matchStateManager.getLiveMatchState(matchId);
    
    console.log(`Live state found: ${liveState ? 'YES' : 'NO'}`);
    console.log(`Match status: ${match.status}`);
    console.log(`Match ID: ${matchIdNum}`);
    
    if (!liveState) {
      console.log('=== ENTERING COMPLETED MATCH SECTION ===');
      // For completed matches, try to get stored simulation data
      let simulationLogData = null;
      try {
        if (match.simulationLog) {
          // Check if it's already an object or needs parsing
          simulationLogData = typeof match.simulationLog === 'string' 
            ? JSON.parse(match.simulationLog) 
            : match.simulationLog;
        }
      } catch (error) {
        console.log('Error parsing simulation log:', error);
        simulationLogData = null;
      }
      
      // Transform teamStats to home/away format with sample data for testing
      const rawTeamStats = simulationLogData?.teamStats || {};
      console.log('Raw team stats:', JSON.stringify(rawTeamStats));
      console.log('Home team ID:', match.homeTeamId, 'Away team ID:', match.awayTeamId);
      
      let homeTeamStats = rawTeamStats[match.homeTeamId.toString()];
      let awayTeamStats = rawTeamStats[match.awayTeamId.toString()];
      
      // Ensure we have valid stats objects with fallback to zeros
      if (!homeTeamStats) {
        homeTeamStats = {
          turnovers: 0,
          carrierYards: 0,
          passingYards: 0,
          totalOffensiveYards: 0,
          timeOfPossessionSeconds: 0,
          totalKnockdownsInflicted: 0
        };
      }
      
      if (!awayTeamStats) {
        awayTeamStats = {
          turnovers: 0,
          carrierYards: 0,
          passingYards: 0,
          totalOffensiveYards: 0,
          timeOfPossessionSeconds: 0,
          totalKnockdownsInflicted: 0
        };
      }
      
      console.log('Home team stats:', JSON.stringify(homeTeamStats));
      console.log('Away team stats:', JSON.stringify(awayTeamStats));

      // Use actual MVP data from simulation log if available, otherwise null
      const mvpData = simulationLogData?.mvpData || null;

      console.log('Final MVP data being sent:', mvpData);

      const enhancedData = {
        atmosphereEffects: {
          homeFieldAdvantage: 5,
          crowdNoise: 75,
          intimidationFactor: 15,
          fieldSize: "Standard",
          attendance: 20000,
          fanLoyalty: 85
        },
        tacticalEffects: {
          homeTeamFocus: "Balanced",
          awayTeamFocus: "Balanced",
          homeTeamModifiers: { passing: 0, rushing: 0, defense: 0 },
          awayTeamModifiers: { passing: 0, rushing: 0, defense: 0 }
        },
        playerStats: simulationLogData?.playerStats || {},
        mvpData: mvpData,
        teamStats: {
          home: homeTeamStats,
          away: awayTeamStats
        },
        gamePhase: "completed",
        possession: "home"
      };
      
      return res.json(enhancedData);
    }

    // Get team data for enhanced atmospheric effects
    const homeTeam = await storage.teams.getTeamById(match.homeTeamId);
    const awayTeam = await storage.teams.getTeamById(match.awayTeamId);
    
    // Load team players for MVP calculation (removing duplicate - already loaded above)
    const liveHomePlayers = await prisma.player.findMany({
      where: { teamId: match.homeTeamId },
      select: { id: true, firstName: true, lastName: true, role: true, teamId: true }
    });

    const liveAwayPlayers = await prisma.player.findMany({
      where: { teamId: match.awayTeamId },
      select: { id: true, firstName: true, lastName: true, role: true, teamId: true }
    });

    // Create a lookup map for faster team assignment
    const playerTeamMap = new Map<string, number>();
    liveHomePlayers.forEach(p => playerTeamMap.set(p.id.toString(), p.teamId));
    liveAwayPlayers.forEach(p => playerTeamMap.set(p.id.toString(), p.teamId));
    
    console.log(`Team map populated: ${playerTeamMap.size} players`);
    console.log(`Home players: ${liveHomePlayers.length}, Away players: ${liveAwayPlayers.length}`);
    console.log(`Sample entries: ${JSON.stringify(Array.from(playerTeamMap.entries()).slice(0, 3))}`);
    
    // Get stadium data for atmospheric effects (simplified for integration)
    const homeStadium = homeTeam ? { 
      capacity: 25000, 
      fieldSize: "Standard" 
    } : null;
    
    // Calculate atmospheric effects
    const atmosphereEffects = {
      homeFieldAdvantage: homeStadium ? Math.min(homeStadium.capacity / 1000, 10) : 0,
      crowdNoise: Math.floor(Math.random() * 40) + 60, // 60-100%
      intimidationFactor: Math.floor(Math.random() * 20) + 10, // 10-30
      fieldSize: homeStadium?.fieldSize || "Standard",
      attendance: homeStadium ? Math.floor(homeStadium.capacity * 0.8) : 12000,
      fanLoyalty: Math.floor(Math.random() * 30) + 70 // 70-100%
    };

    // Get tactical effects (basic implementation)
    const tacticalEffects = {
      homeTeamFocus: homeTeam?.tacticalFocus || "Balanced",
      awayTeamFocus: awayTeam?.tacticalFocus || "Balanced",
      homeTeamModifiers: {
        passing: homeTeam?.tacticalFocus === "Passing" ? 2 : 0,
        rushing: homeTeam?.tacticalFocus === "Rushing" ? 2 : 0,
        defense: homeTeam?.tacticalFocus === "Defense" ? 2 : 0
      },
      awayTeamModifiers: {
        passing: awayTeam?.tacticalFocus === "Passing" ? 2 : 0,
        rushing: awayTeam?.tacticalFocus === "Rushing" ? 2 : 0,
        defense: awayTeam?.tacticalFocus === "Defense" ? 2 : 0
      }
    };

    // Get player stats from live state
    const playerStats = {};
    liveState.playerStats.forEach((stats, playerId) => {
      playerStats[playerId] = {
        scores: stats.scores,
        passingAttempts: stats.passingAttempts,
        passesCompleted: stats.passesCompleted,
        passingYards: stats.passingYards,
        carrierYards: stats.carrierYards,
        catches: stats.catches,
        receivingYards: stats.receivingYards,
        drops: stats.drops,
        tackles: stats.tackles,
        knockdownsInflicted: stats.knockdownsInflicted,

      };
    });

    // Calculate MVP players based on actual stats with error handling
    const calculateMVP = async (teamId: number) => {
      try {
        let mvpPlayer = null;
        let maxScore = 0;
        
        console.log(`Calculating MVP for team ${teamId}`);
        console.log(`Total players with stats: ${liveState.playerStats?.size || 0}`);
        
        if (!liveState.playerStats || liveState.playerStats.size === 0) {
          console.log(`No player stats available for team ${teamId}`);
          return "No MVP";
        }
        
        for (const [playerId, stats] of liveState.playerStats.entries()) {
          try {
            // Use the pre-loaded team map instead of individual queries
            const teamId_fromMap = playerTeamMap.get(playerId.toString());
            if (!teamId_fromMap || teamId_fromMap !== teamId) continue;
            
            // Find player in the pre-loaded arrays
            const player = [...liveHomePlayers, ...liveAwayPlayers].find(p => p.id.toString() === playerId.toString());
            if (!player) continue;
            
            // Calculate MVP score: scores * 10 + passing yards * 0.1 + carrier yards * 0.2 + tackles * 2
            const mvpScore = (stats.scores * 10) + 
                            (stats.passingYards * 0.1) + 
                            (stats.carrierYards * 0.2) + 
                            (stats.tackles * 2);
            
            console.log(`Player ${playerId} (${player.firstName} ${player.lastName}): team ${player.teamId}, MVP score: ${mvpScore}`);
            
            if (mvpScore > maxScore) {
              maxScore = mvpScore;
              mvpPlayer = `${player.firstName} ${player.lastName}`;
              console.log(`New MVP: ${mvpPlayer} with score ${mvpScore}`);
            }
          } catch (playerError) {
            console.log(`Error processing player ${playerId}:`, playerError);
            continue;
          }
        }
        
        console.log(`Final MVP for team ${teamId}: ${mvpPlayer || "No MVP"}`);
        return mvpPlayer || "No MVP";
      } catch (error) {
        console.error(`Error calculating MVP for team ${teamId}:`, error);
        return "No MVP";
      }
    };

    const mvpPlayers = {
      home: await calculateMVP(match.homeTeamId),
      away: await calculateMVP(match.awayTeamId)
    };

    // Calculate gamePhase including halftime detection
    let gamePhase = "early";
    if (liveState.currentHalf === 1 && liveState.gameTime >= (liveState.maxTime * 0.48) && liveState.gameTime <= (liveState.maxTime * 0.52)) {
      gamePhase = "halftime";
    } else if (liveState.gameTime < (liveState.maxTime * 0.33)) {
      gamePhase = "early";
    } else if (liveState.gameTime < (liveState.maxTime * 0.66)) {
      gamePhase = "mid";
    } else if (liveState.gameTime < (liveState.maxTime * 0.9)) {
      gamePhase = "late";
    } else {
      gamePhase = "clutch";
    }

    const enhancedData = {
      atmosphereEffects,
      tacticalEffects,
      playerStats,
      mvpPlayers,
      gamePhase,
      possession: {
        teamId: liveState.possessingTeamId,
        startTime: liveState.possessionStartTime
      },
      teamStats: {
        home: liveState.teamStats.get(match.homeTeamId) || {},
        away: liveState.teamStats.get(match.awayTeamId) || {}
      }
    };

    console.log(`Sending enhanced data response for match ${matchId}`);
    res.json(enhancedData);
  } catch (error) {
    console.error(`Error fetching enhanced match data for ${matchId}:`, error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

router.post('/:matchId/complete-now', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    // TODO: Add SuperUser/Admin check
    const { matchId } = req.params;
    const matchIdNum = parseInt(matchId);
    
    console.log(`🔍 Force completing match ${matchId}`);
    
    // First, stop the match state manager
    await matchStateManager.stopMatch(matchId);
    
    // Then, directly update the database to ensure completion
    await storage.matches.updateMatch(matchIdNum, {
      status: 'COMPLETED',
      homeScore: 0,
      awayScore: 0,
      completedAt: new Date(),
      gameData: {
        events: [],
        finalScores: { home: 0, away: 0 },
        forcedCompletion: true
      }
    });
    
    console.log(`✅ Match ${matchId} force completed successfully`);
    res.json({ message: "Match completion process completed successfully" });
  } catch (error) {
    console.error("Error completing match:", error);
    next(error);
  }
});

router.get('/team/:teamId', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const teamMatches = await matchStorage.getMatchesByTeamId(parseInt(teamId)); // Use matchStorage
    res.json(teamMatches);
  } catch (error) {
    console.error("Error fetching team matches:", error);
    next(error);
  }
});

router.post('/:id/simulate', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const match = await matchStorage.getMatchById(id); // Use matchStorage

    if (!match) return res.status(404).json({ message: "Match not found" });

    const homeTeam = await storage.teams.getTeamById(match.homeTeamId); // Use teamStorage
    const awayTeam = await storage.teams.getTeamById(match.awayTeamId); // Use teamStorage
    if (!homeTeam || !awayTeam) return res.status(404).json({ message: "One or both teams for the match not found." });

    const homeTeamPlayers = await storage.players.getPlayersByTeamId(match.homeTeamId); // Use playerStorage
    const awayTeamPlayers = await storage.players.getPlayersByTeamId(match.awayTeamId); // Use playerStorage
    if (homeTeamPlayers.length < 1 || awayTeamPlayers.length < 1) {
        return res.status(400).json({ message: "One or both teams do not have enough players to simulate." });
    }

    const result = await fullMatchSimulation(homeTeamPlayers, awayTeamPlayers);

    await matchStorage.updateMatch(id, { // Use matchStorage
      homeScore: result.homeScore, awayScore: result.awayScore,
      status: "completed", gameData: result.gameData as any,
      completedAt: new Date(),
    });
    res.json(result);
  } catch (error) {
    console.error("Error simulating match:", error);
    next(error);
  }
});

router.get('/:matchId/simulation-old', (req, res) => {
  res.status(410).json({ message: "This match simulation endpoint is deprecated. Use text-based match viewing." });
});
router.get('/:matchId/simulation', (req, res) => {
  res.status(410).json({ message: "This match simulation endpoint is deprecated. Use text-based match viewing." });
});

router.post('/:matchId/simulate-play', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const { speed = 1 } = req.body;

    const match = await matchStorage.getMatchById(parseInt(matchId)); // Use matchStorage
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (match.status !== 'IN_PROGRESS') return res.status(400).json({ message: "Match is not live. Cannot simulate play." });

    const eventTypes = ['pass', 'run', 'tackle', 'score', 'foul', 'interception'];
    const randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const homePlayers = await storage.players.getPlayersByTeamId(match.homeTeamId); // Use playerStorage
    const awayPlayers = await storage.players.getPlayersByTeamId(match.awayTeamId); // Use playerStorage
    const allPlayers = [...homePlayers, ...awayPlayers];
    const randomPlayer = allPlayers.length > 0 ? allPlayers[Math.floor(Math.random() * allPlayers.length)] : { name: "Player", race: "Unknown", id: "unknown" };

    const generateEventDescription = (type: string, playerName: string) => `[${type.toUpperCase()}] ${playerName} attempts a ${type}.`;
    const event = {
      id: `event-${Date.now()}`, type: randomEventType, playerId: randomPlayer.id,
      playerName: randomPlayer.name, playerRace: randomPlayer.race,
      description: generateEventDescription(randomEventType, randomPlayer.name), timestamp: Date.now(),
    };

    let { homeScore = 0, awayScore = 0, gameTime = 0, currentHalf = 1, status } = match.gameData as any || {};
    gameTime += (10 * speed);
    if (randomEventType === 'score') { if (Math.random() < 0.5) homeScore++; else awayScore++; }

    const maxTime = match.matchType === 'exhibition' ? 1200 : 1800;
    if (gameTime >= maxTime) { status = 'completed'; }
    else if (gameTime >= maxTime / 2 && currentHalf === 1) { currentHalf = 2; }

    const updatedGameData = {
        ...(match.gameData as any || {}),
        events: [...((match.gameData as any)?.events || []), event].slice(-20),
        homeScore, awayScore, gameTime, currentHalf, status
    };

    await matchStorage.updateMatch(matchId, { // Use matchStorage
      homeScore, awayScore, status,
      gameData: updatedGameData, lastPlay: event.description,
    });
    res.json({ events: [event], matchUpdate: { homeScore, awayScore, gameTime, currentHalf, status }});
  } catch (error) {
    console.error("Error simulating play:", error);
    next(error);
  }
});

router.post('/:matchId/reset', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    await matchStorage.updateMatch(matchId, { // Use matchStorage
      homeScore: 0, awayScore: 0, status: 'scheduled',
      gameData: { events: [], homeScore: 0, awayScore: 0, gameTime: 0, currentHalf: 1, status: 'scheduled' },
      lastPlay: null, completedAt: null,
    });
    matchStateManager.stopMatch(matchId);
    res.json({ message: "Match reset successfully" });
  } catch (error) {
    console.error("Error resetting match:", error);
    next(error);
  }
});

router.patch('/:id/complete', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { homeScore, awayScore } = req.body;
    if (typeof homeScore !== 'number' || typeof awayScore !== 'number') {
        return res.status(400).json({ message: "Invalid score format." });
    }

    const match = await matchStorage.getMatchById(id); // Use matchStorage
    if (!match) return res.status(404).json({ message: "Match not found" });

    const updatedMatch = await matchStorage.updateMatch(id, { // Use matchStorage
      status: "completed", homeScore, awayScore,
      completedAt: new Date(),
    });
    // TODO: Notification logic
    res.json(updatedMatch);
  } catch (error) {
    console.error("Error completing match:", error);
    next(error);
  }
});

// Get next league game for a team
router.get('/next-league-game/:teamId', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    
    // Get the team to ensure it exists
    const team = await storage.teams.getTeamById(parseInt(teamId));
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Get upcoming matches for this team
    const upcomingMatches = await matchStorage.getUpcomingMatches(parseInt(teamId));
    
    // Filter for league games (non-exhibition, non-tournament)
    const nextLeagueGame = upcomingMatches.find(match => 
      match.matchType === 'league' || match.matchType === 'regular_season'
    );

    if (!nextLeagueGame) {
      return res.status(404).json({ message: "No upcoming league games found" });
    }

    // Get team names for the match
    const homeTeamName = nextLeagueGame.homeTeamName || 
      (await storage.teams.getTeamById(nextLeagueGame.homeTeamId))?.name || "Home Team";
    const awayTeamName = nextLeagueGame.awayTeamName || 
      (await storage.teams.getTeamById(nextLeagueGame.awayTeamId))?.name || "Away Team";

    const enhancedMatch = {
      ...nextLeagueGame,
      homeTeamName,
      awayTeamName,
      isHomeGame: nextLeagueGame.homeTeamId === team.id
    };

    res.json(enhancedMatch);
  } catch (error) {
    console.error("Error fetching next league game:", error);
    next(error);
  }
});

// Create exhibition match endpoint
router.post('/exhibition/instant', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { opponentTeamId } = req.body;
    const userTeamId = req.user.claims.sub;
    
    // Get user's team
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: userTeamId },
      include: { Team: true }
    });
    
    if (!userProfile?.Team) {
      return res.status(404).json({ message: "User team not found" });
    }
    
    const team = userProfile.Team;
    
    // Create exhibition match
    const newMatch = await matchStorage.createMatch({
      homeTeamId: team.id,
      awayTeamId: parseInt(opponentTeamId),
      gameDate: new Date(),
      status: 'IN_PROGRESS',
      matchType: 'EXHIBITION'
    });
    
    // Start live match simulation
    await matchStateManager.startLiveMatch(newMatch.id.toString(), true);
    
    res.json({ 
      message: "Exhibition match created successfully",
      matchId: newMatch.id,
      match: newMatch
    });
  } catch (error) {
    console.error("Error creating exhibition match:", error);
    next(error);
  }
});

// Match sync endpoint for testing persistence
router.get('/:matchId/sync', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const matchIdNum = parseInt(matchId, 10);
    if (isNaN(matchIdNum)) {
      return res.status(400).json({ message: "Invalid match ID" });
    }
    
    const state = await matchStateManager.syncMatchState(matchIdNum);
    if (state) {
      res.json(state);
    } else {
      res.status(404).json({ error: 'Match not found or no longer active' });
    }
  } catch (error) {
    console.error('Error syncing match state:', error);
    next(error);
  }
});

export default router;
