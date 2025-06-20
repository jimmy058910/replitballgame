import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { simulateMatch } from "./services/matchSimulation";
import { generateRandomPlayer } from "./services/leagueService";
import { z } from "zod";

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
      const players = await storage.getPlayersByTeamId(id);
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

  const httpServer = createServer(app);
  return httpServer;
}
