import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { cacheMiddleware } from "../middleware/cache";

const router = Router();

// Universal Team Power Rankings with 5-minute cache
router.get("/global-rankings", cacheMiddleware({ ttl: 300 }), isAuthenticated, async (req, res) => {
  try {
    const teams = await storage.teams.getAllTeamsWithStats();
    
    // Calculate Enhanced True Strength Rating for each team with simplified fallbacks
    const rankedTeams = teams.map((team) => {
      const divisionMultiplier = getDivisionMultiplier(team.division);
      const winPercentage = team.wins + team.losses + team.draws > 0 
        ? team.wins / (team.wins + team.losses + team.draws) 
        : 0;
      
      // Simplified calculations with fallbacks (no async for reliability)
      const strengthOfSchedule = 25; // Neutral default
      const recentFormBias = 0; // No recent form bias for now
      const healthFactor = 1.0; // Full health default
      
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
    rankedTeams.sort((a, b) => b.trueStrengthRating - a.trueStrengthRating);
    
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

// Add alias for frontend compatibility
router.get("/rankings", isAuthenticated, async (req, res) => {
  // Enhanced rankings endpoint with same algorithm as global-rankings
  try {
    const rankingsData = await storage.teams.getAllTeamsWithStats();
    const teams = Array.isArray(rankingsData) ? rankingsData : rankingsData.rankings || [];
    
    // Calculate Enhanced True Strength Rating for each team with async calculations
    const rankedTeams = await Promise.all(teams.map(async (team) => {
      const divisionMultiplier = getDivisionMultiplier(team.division);
      const winPercentage = team.wins + team.losses + team.draws > 0 
        ? team.wins / (team.wins + team.losses + team.draws) 
        : 0;
      
      // Calculate advanced metrics (async operations)
      const strengthOfSchedule = await calculateStrengthOfSchedule(team);
      const recentFormBias = await calculateRecentForm(team);
      const healthFactor = await calculateHealthFactor(team);
      
      // Enhanced True Strength Rating Algorithm (Research-Based Formula)
      const baseRating = (team.teamPower || 0) * 10;           // Base: 40% weight (250 max)
      const divisionBonus = divisionMultiplier * 100;          // Division: 15% weight (200 max)
      const recordBonus = winPercentage * 120;                 // Record: 18% weight (120 max) - REDUCED from 200
      const sosBonus = strengthOfSchedule * 1.5;               // SOS: 15% weight (~75 avg)
      const camaraderieBonus = (team.teamCamaraderie || 0) * 2; // Chemistry: 12% weight (200 max)
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
    }));
    
    // Sort by True Strength Rating (descending)
    rankedTeams.sort((a, b) => b.trueStrengthRating - a.trueStrengthRating);
    
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

// World Statistics Dashboard
router.get("/statistics", isAuthenticated, async (req, res) => {
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
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10);
    
    // Best records across all divisions
    const bestRecords = teams
      .filter(t => t.wins + t.losses + t.draws > 0)
      .map(t => ({
        ...t,
        winPercentage: t.wins / (t.wins + t.losses + t.draws)
      }))
      .sort((a, b) => b.winPercentage - a.winPercentage)
      .slice(0, 10);
    
    // Strongest players globally
    const strongestPlayers = players
      .map(p => ({
        ...p,
        overallRating: Math.round((p.speed + p.power + p.throwing + p.catching + p.kicking + p.stamina + p.leadership + p.agility) / 8)
      }))
      .sort((a, b) => b.overallRating - a.overallRating)
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

// Hall of Fame Section
router.get("/hall-of-fame", isAuthenticated, async (req, res) => {
  try {
    const teams = await storage.teams.getAllTeamsWithStats();
    const players = await storage.players.getAllPlayersWithStats();
    const tournaments = await storage.tournaments.getAllTournamentHistory();
    
    // Record holders
    const recordHolders = {
      highestTeamPower: teams.reduce((prev, current) => 
        (prev.teamPower > current.teamPower) ? prev : current
      ),
      mostWins: teams.reduce((prev, current) => 
        (prev.wins > current.wins) ? prev : current
      ),
      bestWinPercentage: teams
        .filter(t => t.wins + t.losses + t.draws >= 5) // Minimum 5 games
        .reduce((prev, current) => {
          const prevPercent = prev.wins / (prev.wins + prev.losses + prev.draws);
          const currentPercent = current.wins / (current.wins + current.losses + current.draws);
          return prevPercent > currentPercent ? prev : current;
        }),
      mostExperiencedPlayer: players.reduce((prev, current) => 
        (prev.age > current.age) ? prev : current
      ),
      mostPotentialPlayer: players.reduce((prev, current) => 
        (prev.potentialRating > current.potentialRating) ? prev : current
      )
    };
    
    // Tournament champions (from completed tournaments)
    const recentChampions = tournaments
      .filter(t => t.finalRank === 1)
      .sort((a, b) => new Date(b.tournament.completedAt || b.registeredAt).getTime() - new Date(a.tournament.completedAt || a.registeredAt).getTime())
      .slice(0, 10);
    
    // Notable achievements
    const achievements = [
      {
        title: "Highest Team Power",
        description: `${recordHolders.highestTeamPower.name} with ${recordHolders.highestTeamPower.teamPower} power`,
        team: recordHolders.highestTeamPower
      },
      {
        title: "Most Wins",
        description: `${recordHolders.mostWins.name} with ${recordHolders.mostWins.wins} wins`,
        team: recordHolders.mostWins
      },
      {
        title: "Best Win Percentage",
        description: `${recordHolders.bestWinPercentage.name} with ${Math.round((recordHolders.bestWinPercentage.wins / (recordHolders.bestWinPercentage.wins + recordHolders.bestWinPercentage.losses + recordHolders.bestWinPercentage.draws)) * 100)}%`,
        team: recordHolders.bestWinPercentage
      }
    ];
    
    res.json({
      recordHolders,
      recentChampions,
      achievements
    });
  } catch (error) {
    console.error("Error fetching hall of fame:", error);
    res.status(500).json({ error: "Failed to fetch hall of fame" });
  }
});

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
      .filter(match => match.status === 'COMPLETED')
      .sort((a, b) => new Date(b.gameDate || b.createdAt).getTime() - new Date(a.gameDate || a.createdAt).getTime())
      .slice(0, 5); // Last 5 completed matches
    
    if (completedMatches.length === 0) return 0;
    
    // Calculate recent wins
    let recentWins = 0;
    completedMatches.forEach(match => {
      const isHome = match.homeTeamId === team.id;
      const teamScore = isHome ? match.homeScore : match.awayScore;
      const opponentScore = isHome ? match.awayScore : match.homeScore;
      
      if (teamScore > opponentScore) recentWins++;
    });
    
    const recentWinPct = recentWins / completedMatches.length;
    const seasonWinPct = team.wins + team.losses + team.draws > 0 
      ? team.wins / (team.wins + team.losses + team.draws) 
      : 0;
    
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
    
    // Calculate injury impact for main roster players
    const mainRosterPlayers = players.slice(0, 12); // First 12 players (main roster)
    
    mainRosterPlayers.forEach(player => {
      playerCount++;
      
      // Factor in current injury status
      if (player.injuryStatus === 'INJURED') {
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

export default router;