import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { simulateMatch } from "./services/matchSimulation";
import { generateRandomPlayer } from "./services/leagueService";
import { z } from "zod";

// Helper function to calculate team power based on player stats
function calculateTeamPower(players: any[]): number {
  if (!players || players.length === 0) return 0;
  
  const totalPower = players.reduce((sum, player) => {
    const playerPower = (
      player.speed + player.agility + player.power + 
      player.stamina + player.throwing + player.catching + 
      player.leadership
    ) / 7;
    return sum + playerPower;
  }, 0);
  
  return Math.round(totalPower / players.length);
}

const createTeamSchema = z.object({
  name: z.string().min(1).max(50),
});

const createPlayerSchema = z.object({
  name: z.string().min(1).max(30),
  race: z.enum(["human", "sylvan", "gryll", "lumina", "umbra"]),
});

const bidPlayerSchema = z.object({
  playerId: z.string(),
  amount: z.number().min(1),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Team routes
  app.post('/api/teams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name } = createTeamSchema.parse(req.body);
      
      // Check if user already has a team
      const existingTeam = await storage.getTeamByUserId(userId);
      if (existingTeam) {
        return res.status(400).json({ message: "User already has a team" });
      }

      // Create team
      const team = await storage.createTeam({
        userId,
        name,
        division: 8, // Start in lowest division
      });

      // Generate starting players (10 players)
      const races = ["human", "sylvan", "gryll", "lumina", "umbra"];
      const playerNames = [
        "Thorek", "Elysian", "Luxaria", "Shadowex", "Marcus",
        "Whisperwind", "Ironhold", "Brightbane", "Voidwalker", "Sarah"
      ];

      for (let i = 0; i < 10; i++) {
        const race = races[i % races.length];
        const playerData = generateRandomPlayer(playerNames[i], race, team.id);
        await storage.createPlayer(playerData);
      }

      res.json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.get('/api/teams/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.get('/api/teams/:id/players', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Fetching players for team ID: ${id}`);
      const players = await storage.getPlayersByTeamId(id);
      console.log(`Found ${players.length} players for team ${id}`);
      res.json(players);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });

  // League routes
  app.get('/api/leagues/:division/standings', isAuthenticated, async (req, res) => {
    try {
      const division = parseInt(req.params.division);
      const teams = await storage.getTeamsByDivision(division);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching standings:", error);
      res.status(500).json({ message: "Failed to fetch standings" });
    }
  });

  // Match routes
  app.get('/api/matches/live', async (req, res) => {
    try {
      const liveMatches = await storage.getLiveMatches();
      res.json(liveMatches);
    } catch (error) {
      console.error("Error fetching live matches:", error);
      res.status(500).json({ message: "Failed to fetch live matches" });
    }
  });

  app.get('/api/matches/team/:teamId', isAuthenticated, async (req, res) => {
    try {
      const { teamId } = req.params;
      const matches = await storage.getMatchesByTeamId(teamId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching team matches:", error);
      res.status(500).json({ message: "Failed to fetch team matches" });
    }
  });

  app.post('/api/matches/:id/simulate', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const match = await storage.getMatchById(id);
      
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      const homeTeamPlayers = await storage.getPlayersByTeamId(match.homeTeamId);
      const awayTeamPlayers = await storage.getPlayersByTeamId(match.awayTeamId);

      const result = await simulateMatch(homeTeamPlayers, awayTeamPlayers);
      
      // Update match with results
      await storage.updateMatch(id, {
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        status: "completed",
        gameData: result.gameData,
        completedAt: new Date(),
      });

      res.json(result);
    } catch (error) {
      console.error("Error simulating match:", error);
      res.status(500).json({ message: "Failed to simulate match" });
    }
  });

  // Marketplace routes
  app.get('/api/marketplace', async (req, res) => {
    try {
      const players = await storage.getMarketplacePlayers();
      res.json(players);
    } catch (error) {
      console.error("Error fetching marketplace:", error);
      res.status(500).json({ message: "Failed to fetch marketplace" });
    }
  });

  app.post('/api/marketplace/bid', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { playerId, amount } = bidPlayerSchema.parse(req.body);
      
      const player = await storage.getPlayerById(playerId);
      const userTeam = await storage.getTeamByUserId(userId);
      
      if (!player || !userTeam) {
        return res.status(404).json({ message: "Player or team not found" });
      }

      if ((userTeam.credits || 0) < amount) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Simple bid system - highest bid wins
      if (!player.marketplacePrice || amount > player.marketplacePrice) {
        await storage.updatePlayer(playerId, {
          marketplacePrice: amount,
        });
      }

      res.json({ message: "Bid placed successfully" });
    } catch (error) {
      console.error("Error placing bid:", error);
      res.status(500).json({ message: "Failed to place bid" });
    }
  });

  // Staff routes
  app.get("/api/teams/:teamId/staff", isAuthenticated, async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const staff = await storage.getStaffByTeamId(teamId);
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.post("/api/teams/:teamId/staff", isAuthenticated, async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const staffData = { ...req.body, teamId };
      const staff = await storage.createStaff(staffData);
      res.json(staff);
    } catch (error) {
      console.error("Error creating staff:", error);
      res.status(500).json({ message: "Failed to create staff" });
    }
  });

  // Team finances routes
  app.get("/api/teams/:teamId/finances", isAuthenticated, async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const finances = await storage.getTeamFinances(teamId);
      res.json(finances || {
        teamId,
        season: 1,
        ticketSales: 250000,
        concessionSales: 75000,
        jerseySales: 50000,
        sponsorships: 100000,
        playerSalaries: 300000,
        staffSalaries: 150000,
        facilities: 50000,
        totalIncome: 475000,
        totalExpenses: 500000,
        netIncome: -25000,
        credits: 975000
      });
    } catch (error) {
      console.error("Error fetching finances:", error);
      res.status(500).json({ message: "Failed to fetch finances" });
    }
  });

  // Contract negotiation
  app.post("/api/players/:playerId/negotiate", isAuthenticated, async (req, res) => {
    try {
      const playerId = req.params.playerId;
      const { seasons, salary } = req.body;
      
      const updatedPlayer = await storage.updatePlayer(playerId, {
        contractSeasons: seasons,
        contractStartSeason: 1,
        salary: salary
      });
      
      res.json(updatedPlayer);
    } catch (error) {
      console.error("Error negotiating contract:", error);
      res.status(500).json({ message: "Failed to negotiate contract" });
    }
  });

  // Tryout system routes
  app.post("/api/teams/:teamId/tryouts", isAuthenticated, async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const { type } = req.body;
      
      const basicCost = 50000;
      const advancedCost = 150000;
      const cost = type === "basic" ? basicCost : advancedCost;
      const numCandidates = type === "basic" ? 3 : 5;
      
      const finances = await storage.getTeamFinances(teamId);
      if (!finances || (finances.credits || 0) < cost) {
        return res.status(400).json({ message: "Insufficient credits" });
      }
      
      // Generate tryout candidates
      const candidates = [];
      for (let i = 0; i < numCandidates; i++) {
        const age = Math.floor(Math.random() * 7) + 18; // 18-24 years old
        const races = ["Human", "Elf", "Dwarf", "Orc"];
        const names = ["Alex", "Jordan", "Taylor", "Casey", "Riley", "Morgan", "Avery", "Quinn"];
        
        const baseStats = type === "advanced" ? 60 : 45;
        const variance = type === "advanced" ? 25 : 20;
        
        candidates.push({
          id: `candidate_${Date.now()}_${i}`,
          name: names[Math.floor(Math.random() * names.length)] + " " + 
                ["Smith", "Jones", "Brown", "Davis", "Miller"][Math.floor(Math.random() * 5)],
          race: races[Math.floor(Math.random() * races.length)],
          age,
          leadership: Math.max(1, Math.min(99, baseStats + Math.floor(Math.random() * variance) - variance/2)),
          throwing: Math.max(1, Math.min(99, baseStats + Math.floor(Math.random() * variance) - variance/2)),
          speed: Math.max(1, Math.min(99, baseStats + Math.floor(Math.random() * variance) - variance/2)),
          agility: Math.max(1, Math.min(99, baseStats + Math.floor(Math.random() * variance) - variance/2)),
          power: Math.max(1, Math.min(99, baseStats + Math.floor(Math.random() * variance) - variance/2)),
          stamina: Math.max(1, Math.min(99, baseStats + Math.floor(Math.random() * variance) - variance/2)),
          marketValue: Math.floor(Math.random() * 200000) + 50000,
          potential: type === "advanced" && Math.random() > 0.5 ? "High" : 
                    Math.random() > 0.6 ? "Medium" : "Low"
        });
      }
      
      // Deduct cost from team finances
      await storage.updateTeamFinances(teamId, {
        credits: (finances.credits || 0) - cost
      });
      
      res.json({ type, candidates });
    } catch (error) {
      console.error("Error hosting tryout:", error);
      res.status(500).json({ message: "Failed to host tryout" });
    }
  });

  app.post("/api/teams/:teamId/taxi-squad", isAuthenticated, async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const { candidateIds } = req.body;
      
      // In a real implementation, you'd store these in a taxi_squad table
      // For now, just return success
      res.json({ success: true, addedCount: candidateIds.length });
    } catch (error) {
      console.error("Error adding to taxi squad:", error);
      res.status(500).json({ message: "Failed to add to taxi squad" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
