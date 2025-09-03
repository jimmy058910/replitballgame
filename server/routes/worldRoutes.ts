import { Router } from "express";
import { storage } from '../storage/index.js';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { cacheMiddleware } from "../middleware/cache.js";

const router = Router();

// Universal Team Power Rankings with 5-minute cache
router.get("/global-rankings", cacheMiddleware({ ttl: 300 }), requireAuth, async (req, res) => {
  try {
    const teams = await storage.teams.getAllTeamsWithStats();
    
    // Calculate Enhanced True Strength Rating for each team with simplified fallbacks
    const rankedTeams = teams.map((team) => {
      const divisionMultiplier = getDivisionMultiplier(team.division);
      
      // Enhanced calculations with safe fallbacks
      const strengthOfSchedule = calculateSimpleStrengthOfSchedule(team, teams);
      const recentFormBias = calculateSimpleRecentForm(team);
      const healthFactor = calculateSimpleHealthFactor(team);
      const winPercentage = (team.wins || 0) / ((team.wins || 0) + (team.losses || 0) + (team.draws || 0) || 1);
      
      // Enhanced True Strength Rating Algorithm (Research-Based Formula)
      const baseRating = (team.teamPower || 0) * 10;           // Base: 40% weight (250 max)
      const divisionBonus = divisionMultiplier * 100;          // Division: 15% weight (200 max)
      const recordBonus = winPercentage * 120;                 // Record: 18% weight (120 max) - REDUCED from 200
      const sosBonus = strengthOfSchedule * 1.5;               // SOS: 15% weight (~75 avg)
      const camaraderieBonus = (team.camaraderie || 0) * 2;    // Chemistry: 12% weight (200 max) - Fixed field name
      const recentFormBonus = recentFormBias * 30;             // Recent Form: ±30 range
      const healthBonus = healthFactor * 50;                   // Health: 50 max
      
      const trueStrengthRating = Math.round(
        baseRating + divisionBonus + recordBonus + sosBonus + 
        camaraderieBonus + recentFormBonus + healthBonus
      );
      
      // Convert BigInt fields to strings for JSON serialization
      const serializedTeam = {
        ...team,
        trueStrengthRating,
        winPercentage: Math.round(winPercentage * 100),
        divisionMultiplier,
        strengthOfSchedule: Math.round(strengthOfSchedule * 10) / 10,
        recentForm: Math.round(recentFormBias * 100),
        healthFactor: Math.round(healthFactor * 100)
      };
      
      // Convert any BigInt fields to strings
      if (serializedTeam.finances) {
        serializedTeam.finances = {
          ...serializedTeam.finances,
          credits: serializedTeam.finances.credits?.toString() || '0',
          gems: serializedTeam.finances.gems?.toString() || '0',
          projectedIncome: serializedTeam.finances.projectedIncome?.toString() || '0',
          projectedExpenses: serializedTeam.finances.projectedExpenses?.toString() || '0',
          lastSeasonRevenue: serializedTeam.finances.lastSeasonRevenue?.toString() || '0',
          lastSeasonExpenses: serializedTeam.finances.lastSeasonExpenses?.toString() || '0',
          facilitiesMaintenanceCost: serializedTeam.finances.facilitiesMaintenanceCost?.toString() || '0'
        };
      }
      
      return serializedTeam;
    });
    
    // Sort by True Strength Rating (descending)
    rankedTeams.sort((a: any, b: any) => b.trueStrengthRating - a.trueStrengthRating);
    
    // Add global rank
    const globalRankings = rankedTeams.slice(0, 100).map((team, index) => ({
      ...team,
      globalRank: index + 1
    }));
    
    res.json(globalRankings);
  } catch (error) {
    console.error("Error fetching global rankings:", error);
    res.status(500).json({ error: "Failed to fetch global rankings" });
  }
});

// Community Portal rankings endpoint - formatted for frontend compatibility
router.get("/rankings", requireAuth, async (req, res) => {
  try {
    const teams = await storage.teams.getAllTeamsWithStats();
    const players = await storage.players.getAllPlayersWithStats();
    
    if (!teams || teams.length === 0) {
      return res.json({
        teamPowerRankings: [],
        playerStats: [],
        totalTeams: 0,
        totalPlayers: 0
      });
    }
    
    // Calculate team power rankings
    const rankedTeams = teams.map((team) => {
      const divisionMultiplier = getDivisionMultiplier(team.division);
      
      // Simplified calculations for performance  
      const strengthOfSchedule = calculateSimpleStrengthOfSchedule(team, teams);
      const recentFormBias = calculateSimpleRecentForm(team);
      const healthFactor = calculateSimpleHealthFactor(team);
      
      // Enhanced True Strength Rating Algorithm
      const baseRating = (team.teamPower || 0) * 10;           // Base: 40% weight
      const divisionBonus = divisionMultiplier * 100;          // Division: 15% weight  
      const winPercentage = (team.wins || 0) / ((team.wins || 0) + (team.losses || 0) || 1);
      const recordBonus = winPercentage * 120;                 // Record: 18% weight
      const sosBonus = strengthOfSchedule * 1.5;               // SOS: 15% weight
      const camaraderieBonus = (team.camaraderie || 0) * 2;    // Chemistry: 12% weight
      const recentFormBonus = recentFormBias * 30;             // Recent Form: ±30 range
      const healthBonus = healthFactor * 50;                   // Health: 50 max
      
      const teamPower = Math.round(
        baseRating + divisionBonus + recordBonus + sosBonus + 
        camaraderieBonus + recentFormBonus + healthBonus
      );
      
      return {
        rank: 0, // Will be set after sorting
        teamName: team.name,
        division: team.division,
        teamPower: teamPower,
        wins: team.wins || 0,
        losses: team.losses || 0
      };
    });
    
    // Sort by team power and assign ranks
    rankedTeams.sort((a: any, b: any) => b.teamPower - a.teamPower);
    rankedTeams.forEach((team, index) => {
      team.rank = index + 1;
    });
    
    // Calculate player stats (top performers)
    const playerStats = players
      .map((p: any) => ({
        playerName: `${p.firstName} ${p.lastName}`,
        teamName: p.teamName || 'Unknown Team',
        statType: 'power',
        statValue: p.power || 0
      }))
      .sort((a: any, b: any) => b.statValue - a.statValue)
      .slice(0, 10);
    
    res.json({
      teamPowerRankings: rankedTeams.slice(0, 10),
      playerStats: playerStats,
      totalTeams: teams.length,
      totalPlayers: players.length
    });
  } catch (error) {
    console.error("Error fetching world rankings:", error);
    res.status(500).json({ error: "Failed to fetch world rankings" });
  }
});

// World Statistics Dashboard
router.get("/statistics", requireAuth, async (req, res) => {
  try {
    const teams = await storage.teams.getAllTeamsWithStats();
    const players = await storage.players.getAllPlayersWithStats();
    
    // Calculate statistics
    const totalTeams = teams.length;
    const totalPlayers = players.length;
    
    // Most powerful teams by division
    const divisionLeaders: { [key: number]: any } = {};
    for (let division = 1; division <= 8; division++) {
      const divisionTeams = teams.filter(t => t.division === division);
      if (divisionTeams.length > 0) {
        divisionLeaders[division] = divisionTeams.reduce((prev, current) => 
          (prev.teamPower > current.teamPower) ? prev : current
        );
      }
    }
    
    // Rising teams (placeholder - would need historical data)
    const risingTeams = teams
      .filter(t => t.wins > t.losses)
      .sort((a: any, b: any) => b.wins - a.wins)
      .slice(0, 10);
    
    // Best records across all divisions
    const bestRecords = teams
      .map((t: any) => ({
        ...t,
      }))
      .sort((a: any, b: any) => b.winPercentage - a.winPercentage)
      .slice(0, 10);
    
    // Strongest players globally
    const strongestPlayers = players
      .map((p: any) => ({
        ...p,
        overallRating: Math.round((p.speed + p.power + p.throwing + p.catching + p.kicking + p.stamina + p.leadership + p.agility) / 8)
      }))
      .sort((a: any, b: any) => b.overallRating - a.overallRating)
      .slice(0, 20);
    
    res.json({
      totalTeams,
      totalPlayers,
      divisionLeaders,
      risingTeams,
      bestRecords,
      strongestPlayers
    });
  } catch (error) {
    console.error("Error fetching world statistics:", error);
    res.status(500).json({ error: "Failed to fetch world statistics" });
  }
});

// Hall of Fame removed - no real backend implementation needed for Alpha

// Enhanced Global Rankings Helper Functions

// Enhanced division multiplier with exponential scaling for competitive balance
function getDivisionMultiplier(division: number): number {
  switch (division) {
    case 1: return 2.0; // Diamond League (most competitive)
    case 2: return 1.8; // Platinum League
    case 3: return 1.6; // Gold League
    case 4: return 1.4; // Silver League
    case 5: return 1.2; // Bronze League
    case 6: return 1.1; // Iron League
    case 7: return 1.0; // Stone League
    case 8: return 0.9; // Copper League (least competitive)
    default: return 1.0;
  }
}

// Simplified helper functions for synchronous calculations
function calculateSimpleStrengthOfSchedule(team: any, allTeams: any[]): number {
  const divisionTeams = allTeams.filter(t => t.division === team.division);
  if (divisionTeams.length <= 1) return 25; // Default if no division peers
  
  const totalPower = divisionTeams.reduce((sum, t) => sum + (t.teamPower || 0), 0);
  const avgPower = totalPower / divisionTeams.length;
  return Math.max(10, Math.min(40, avgPower)); // Cap between 10-40
}

function calculateSimpleRecentForm(team: any): number {
  // Simple calculation based on win percentage vs expected performance
  const totalGames = (team.wins || 0) + (team.losses || 0) + (team.draws || 0);
  if (totalGames === 0) return 0;
  
  const winPct = (team.wins || 0) / totalGames;
  const expectedWinPct = 0.5; // League average
  
  return Math.max(-1, Math.min(1, winPct - expectedWinPct));
}

function calculateSimpleHealthFactor(team: any): number {
  // Simplified health factor based on team power maintenance
  const expectedPower = 25; // League average
  const actualPower = team.teamPower || expectedPower;
  
  // Factor assumes healthy teams maintain higher power levels
  return Math.max(0.5, Math.min(1.5, actualPower / expectedPower));
}

// Calculate Strength of Schedule based on average opponent power
async function calculateStrengthOfSchedule(team: any): Promise<number> {
  try {
    // Get all matches for this team
    const matches = await storage.matches.getMatchesByTeamId(team.id);
    if (!matches || matches.length === 0) return 25; // Default neutral SOS
    
    let totalOpponentPower = 0;
    let matchCount = 0;
    
    // Calculate average opponent power from completed matches
    for (const match of matches) {
      if (match.status === 'COMPLETED') {
        const isHome = match.homeTeamId === team.id;
        const opponentId = isHome ? match.awayTeamId : match.homeTeamId;
        
        try {
          const opponent = await storage.teams.getTeamById(opponentId);
          if (opponent && opponent.teamPower) {
            totalOpponentPower += opponent.teamPower;
            matchCount++;
          }
        } catch (error) {
          // Skip opponent if not found, continue calculating
          continue;
        }
      }
    }
    
    // Return average opponent power, default to league average if no completed matches
    return matchCount > 0 ? totalOpponentPower / matchCount : 25;
  } catch (error) {
    console.error(`Error calculating SOS for team ${team.id}:`, error);
    return 25; // Default neutral SOS
  }
}

// Calculate recent form bias (last 5 games vs season performance)
async function calculateRecentForm(team: any): Promise<number> {
  try {
    const matches = await storage.matches.getMatchesByTeamId(team.id);
    const completedMatches = matches
      .filter((match: any) => match.status === 'COMPLETED')
      .sort((a: any, b: any) => new Date(b.gameDate || b.createdAt).getTime() - new Date(a.gameDate || a.createdAt).getTime())
      .slice(0, 5); // Last 5 completed matches
    
    if (completedMatches.length === 0) return 0;
    
    // Calculate recent wins
    let recentWins = 0;
    completedMatches.forEach(match => {
      const isHome = match.homeTeamId === team.id;
      const teamScore = isHome ? match.homeScore : match.awayScore;
      const opponentScore = isHome ? match.awayScore : match.homeScore;
      
      if ((teamScore || 0) > (opponentScore || 0)) recentWins++;
    });
    
    const recentWinPct = recentWins / completedMatches.length;
    const seasonWinPct = (team.wins || 0) / ((team.wins || 0) + (team.losses || 0) + (team.draws || 0) || 1);
    
    // Return the difference weighted by sample size
    const sampleSizeWeight = Math.min(completedMatches.length / 5, 1); // Full weight at 5+ games
    return (recentWinPct - seasonWinPct) * sampleSizeWeight;
  } catch (error) {
    console.error(`Error calculating recent form for team ${team.id}:`, error);
    return 0;
  }
}

// Calculate health factor based on injury impact
async function calculateHealthFactor(team: any): Promise<number> {
  try {
    const players = await storage.players.getPlayersByTeamId(team.id);
    if (!players || players.length === 0) return 1.0;
    
    let totalImpact = 0;
    let playerCount = 0;
    
    // Calculate injury impact for main roster players (flexible 13-15 players)
    const taxiSquadPlayers = players.slice(13); // Players beyond position 13 are taxi squad
    const mainRosterPlayers = players.slice(0, players.length - taxiSquadPlayers.length); // Rest are main roster
    
    mainRosterPlayers.forEach(player => {
      playerCount++;
      
      // Factor in current injury status
      if (player.injuryStatus !== 'HEALTHY') {
        const recoveryNeeded = player.injuryRecoveryPointsNeeded || 0;
        const injuryImpact = Math.min(recoveryNeeded / 100, 0.5); // Max 50% impact per player
        totalImpact += injuryImpact;
      }
      
      // Factor in stamina levels
      const staminaLevel = player.dailyStaminaLevel || 100;
      if (staminaLevel < 75) {
        const staminaImpact = (75 - staminaLevel) / 100 * 0.3; // Max 30% impact for low stamina
        totalImpact += staminaImpact;
      }
    });
    
    const averageImpact = playerCount > 0 ? totalImpact / playerCount : 0;
    return Math.max(1.0 - averageImpact, 0.5); // Minimum 50% health factor
  } catch (error) {
    console.error(`Error calculating health factor for team ${team.id}:`, error);
    return 1.0; // Default full health
  }
}

// Helper functions moved above for proper declaration order

// Helper: Get expected win rate by division
function getDivisionExpectedWinRate(division: number): number {
  switch (division) {
    case 1: return 0.65; // Diamond teams expected to win more
    case 2: return 0.58; // Platinum
    case 3: return 0.52; // Gold  
    case 4: return 0.50; // Silver (neutral)
    case 5: return 0.48; // Bronze
    case 6: return 0.42; // Iron
    case 7: return 0.38; // Stone
    case 8: return 0.35; // Copper
    default: return 0.50; // Neutral
  }
}

// Helper: Get expected team power by division
function getExpectedPowerForDivision(division: number): number {
  switch (division) {
    case 1: return 32; // Diamond League
    case 2: return 28; // Platinum
    case 3: return 26; // Gold
    case 4: return 24; // Silver
    case 5: return 22; // Bronze
    case 6: return 20; // Iron
    case 7: return 18; // Stone
    case 8: return 16; // Copper
    default: return 24; // Default
  }
}


export default router;