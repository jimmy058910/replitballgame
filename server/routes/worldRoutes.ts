import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";

const router = Router();

// Universal Team Power Rankings
router.get("/global-rankings", isAuthenticated, async (req, res) => {
  try {
    const teams = await storage.teams.getAllTeamsWithStats();
    
    // Calculate True Strength Rating for each team
    const rankedTeams = teams.map(team => {
      const divisionMultiplier = getDivisionMultiplier(team.division);
      const winPercentage = team.wins + team.losses + team.draws > 0 
        ? team.wins / (team.wins + team.losses + team.draws) 
        : 0;
      
      // True Strength Rating Algorithm
      const baseRating = (team.teamPower || 0) * 10; // Base team power
      const divisionBonus = divisionMultiplier * 100; // Division difficulty bonus
      const recordBonus = winPercentage * 200; // Win percentage bonus
      const camaraderieBonus = (team.teamCamaraderie || 0) * 2; // Team chemistry bonus
      
      const trueStrengthRating = Math.round(baseRating + divisionBonus + recordBonus + camaraderieBonus);
      
      return {
        ...team,
        trueStrengthRating,
        winPercentage: Math.round(winPercentage * 100),
        divisionMultiplier
      };
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

// World Statistics Dashboard
router.get("/statistics", isAuthenticated, async (req, res) => {
  try {
    const teams = await storage.teams.getAllTeamsWithStats();
    const players = await storage.players.getAllPlayersWithStats();
    
    // Calculate statistics
    const totalTeams = teams.length;
    const totalPlayers = players.length;
    
    // Most powerful teams by division
    const divisionLeaders = {};
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

// Helper function to calculate division multiplier
function getDivisionMultiplier(division: number): number {
  switch (division) {
    case 1: return 8; // Diamond League
    case 2: return 7; // Platinum League
    case 3: return 6; // Gold League
    case 4: return 5; // Silver League
    case 5: return 4; // Bronze League
    case 6: return 3; // Iron League
    case 7: return 2; // Stone League
    case 8: return 1; // Copper League
    default: return 1;
  }
}

export default router;