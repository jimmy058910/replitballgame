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

  // Tournament routes
  app.get('/api/tournaments/:division', isAuthenticated, async (req, res) => {
    try {
      const division = parseInt(req.params.division);
      // Create mock tournaments for now - in production this would come from database
      const tournaments = [
        {
          id: `tournament-${division}-1`,
          name: `${getDivisionName(division)} Daily Tournament`,
          division,
          entryFee: division <= 4 ? 1000 : 500,
          maxTeams: 8,
          status: "open",
          prizes: { first: division <= 4 ? 5000 : 2500, second: division <= 4 ? 2000 : 1000 }
        }
      ];
      res.json(tournaments);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      res.status(500).json({ message: "Failed to fetch tournaments" });
    }
  });

  app.post('/api/tournaments/:id/enter', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const finances = await storage.getTeamFinances(team.id);
      if (!finances || finances.credits < 1000) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Deduct entry fee and create tournament entry
      await storage.updateTeamFinances(team.id, { credits: finances.credits - 1000 });
      
      res.json({ success: true, message: "Tournament entry successful" });
    } catch (error) {
      console.error("Error entering tournament:", error);
      res.status(500).json({ message: "Failed to enter tournament" });
    }
  });

  app.get('/api/tournaments/my-entries', isAuthenticated, async (req, res) => {
    try {
      res.json([]); // Empty for now - would fetch from database in production
    } catch (error) {
      console.error("Error fetching tournament entries:", error);
      res.status(500).json({ message: "Failed to fetch tournament entries" });
    }
  });

  app.get('/api/tournaments/history', isAuthenticated, async (req, res) => {
    try {
      res.json([]); // Empty for now - would fetch tournament history from database
    } catch (error) {
      console.error("Error fetching tournament history:", error);
      res.status(500).json({ message: "Failed to fetch tournament history" });
    }
  });

  // Exhibition routes
  app.get('/api/exhibitions/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = {
        gamesPlayedToday: 0,
        totalWins: 0,
        totalLosses: 0,
        totalDraws: 0,
        totalGames: 0,
        winRate: 0,
        chemistryGained: 0
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching exhibition stats:", error);
      res.status(500).json({ message: "Failed to fetch exhibition stats" });
    }
  });

  app.post('/api/exhibitions/find-match', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Find a random opponent team for exhibition match
      const allTeams = await storage.getTeamsByDivision(team.division);
      const opponents = allTeams.filter(t => t.id !== team.id);
      
      if (opponents.length === 0) {
        return res.status(404).json({ message: "No opponents available" });
      }

      const opponent = opponents[Math.floor(Math.random() * opponents.length)];
      
      // Create exhibition match
      const match = await storage.createMatch({
        homeTeamId: team.id,
        awayTeamId: opponent.id,
        matchType: "exhibition",
        status: "live"
      });

      res.json({ matchId: match.id });
    } catch (error) {
      console.error("Error finding exhibition match:", error);
      res.status(500).json({ message: "Failed to find exhibition match" });
    }
  });

  app.get('/api/exhibitions/recent', isAuthenticated, async (req, res) => {
    try {
      res.json([]); // Empty for now - would fetch recent exhibition games from database
    } catch (error) {
      console.error("Error fetching recent exhibition games:", error);
      res.status(500).json({ message: "Failed to fetch recent exhibition games" });
    }
  });

  // Inventory routes
  app.get('/api/inventory/:teamId', isAuthenticated, async (req, res) => {
    try {
      res.json([]); // Empty for now - would fetch team inventory from database
    } catch (error) {
      console.error("Error fetching team inventory:", error);
      res.status(500).json({ message: "Failed to fetch team inventory" });
    }
  });

  // Enhanced Marketplace routes
  app.get('/api/marketplace', isAuthenticated, async (req, res) => {
    try {
      const marketplacePlayers = await storage.getMarketplacePlayers();
      res.json(marketplacePlayers);
    } catch (error) {
      console.error("Error fetching marketplace players:", error);
      res.status(500).json({ message: "Failed to fetch marketplace players" });
    }
  });

  app.post('/api/marketplace/list-player', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const { playerId, price, duration } = req.body;
      const player = await storage.getPlayerById(playerId);
      
      if (!player || player.teamId !== team.id) {
        return res.status(404).json({ message: "Player not found or not owned" });
      }

      // Check team constraints (must have 10+ players, max 3 on market)
      const teamPlayers = await storage.getPlayersByTeamId(team.id);
      const playersOnMarket = teamPlayers.filter(p => p.isMarketplace);
      
      if (teamPlayers.length <= 10) {
        return res.status(400).json({ message: "Cannot list player - team must have at least 10 players" });
      }
      
      if (playersOnMarket.length >= 3) {
        return res.status(400).json({ message: "Cannot list player - maximum 3 players can be on market" });
      }

      // List player with listing fee (2% of price)
      const listingFee = Math.floor(price * 0.02);
      const finances = await storage.getTeamFinances(team.id);
      if (!finances || finances.credits < listingFee) {
        return res.status(400).json({ message: "Insufficient credits for listing fee" });
      }

      await storage.updateTeamFinances(team.id, { credits: finances.credits - listingFee });
      
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + parseInt(duration));

      await storage.updatePlayer(playerId, {
        isMarketplace: true,
        marketplacePrice: price,
        marketplaceEndTime: endTime
      });

      res.json({ success: true, message: "Player listed successfully" });
    } catch (error) {
      console.error("Error listing player:", error);
      res.status(500).json({ message: "Failed to list player" });
    }
  });

  app.post('/api/marketplace/buy-player', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const { playerId } = req.body;
      const player = await storage.getPlayerById(playerId);
      
      if (!player || !player.isMarketplace) {
        return res.status(404).json({ message: "Player not available for purchase" });
      }

      // Check team constraints (max 13 players)
      const teamPlayers = await storage.getPlayersByTeamId(team.id);
      if (teamPlayers.length >= 13) {
        return res.status(400).json({ message: "Cannot buy player - team roster is full (13 players max)" });
      }

      // Check credits and complete purchase
      const finances = await storage.getTeamFinances(team.id);
      const totalPrice = player.marketplacePrice + Math.floor(player.marketplacePrice * 0.05); // 5% transaction fee
      
      if (!finances || finances.credits < totalPrice) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Transfer player and handle payments
      const sellerTeam = await storage.getTeamById(player.teamId);
      const sellerFinances = await storage.getTeamFinances(player.teamId);
      const saleAmount = Math.floor(player.marketplacePrice * 0.95); // 5% marketplace fee

      await storage.updateTeamFinances(team.id, { credits: finances.credits - totalPrice });
      await storage.updateTeamFinances(player.teamId, { 
        credits: sellerFinances.credits + saleAmount 
      });

      await storage.updatePlayer(playerId, {
        teamId: team.id,
        isMarketplace: false,
        marketplacePrice: null,
        marketplaceEndTime: null
      });

      res.json({ success: true, message: "Player purchased successfully" });
    } catch (error) {
      console.error("Error buying player:", error);
      res.status(500).json({ message: "Failed to buy player" });
    }
  });

  app.post('/api/marketplace/remove-listing', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const { playerId } = req.body;
      const player = await storage.getPlayerById(playerId);
      
      if (!player || player.teamId !== team.id || !player.isMarketplace) {
        return res.status(404).json({ message: "Player not found or not listed" });
      }

      // Remove listing with penalty fee (1% of listing price)
      const penaltyFee = Math.floor(player.marketplacePrice * 0.01);
      const finances = await storage.getTeamFinances(team.id);
      
      await storage.updateTeamFinances(team.id, { credits: finances.credits - penaltyFee });
      await storage.updatePlayer(playerId, {
        isMarketplace: false,
        marketplacePrice: null,
        marketplaceEndTime: null
      });

      res.json({ success: true, message: "Listing removed successfully" });
    } catch (error) {
      console.error("Error removing listing:", error);
      res.status(500).json({ message: "Failed to remove listing" });
    }
  });

  // Abilities system routes
  app.post('/api/players/:id/train-abilities', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const playerId = req.params.id;
      const player = await storage.getPlayerById(playerId);
      
      if (!player || player.teamId !== team.id) {
        return res.status(404).json({ message: "Player not found or not owned" });
      }

      // Training cost (1000 credits)
      const trainingCost = 1000;
      const finances = await storage.getTeamFinances(team.id);
      if (!finances || finances.credits < trainingCost) {
        return res.status(400).json({ message: "Insufficient credits for training" });
      }

      // Import abilities system and roll for new ability
      const { rollForAbility } = await import("@shared/abilities");
      const newAbility = rollForAbility(player);
      
      if (newAbility) {
        const currentAbilities = player.abilities || [];
        const updatedAbilities = [...currentAbilities, newAbility.id];
        
        await storage.updatePlayer(playerId, { abilities: updatedAbilities });
        await storage.updateTeamFinances(team.id, { credits: finances.credits - trainingCost });
        
        res.json({ 
          success: true, 
          newAbility: newAbility.name,
          message: `${player.name} learned ${newAbility.name}!` 
        });
      } else {
        await storage.updateTeamFinances(team.id, { credits: finances.credits - trainingCost });
        res.json({ 
          success: false, 
          message: "Training completed but no new ability was learned" 
        });
      }
    } catch (error) {
      console.error("Error training player abilities:", error);
      res.status(500).json({ message: "Failed to train player abilities" });
    }
  });

  // Team inactivity tracking
  app.post('/api/teams/update-activity', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      await storage.updateTeam(team.id, { 
        lastActivityAt: new Date(),
        seasonsInactive: 0 
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating team activity:", error);
      res.status(500).json({ message: "Failed to update team activity" });
    }
  });

  function getDivisionName(division: number) {
    const names: { [key: number]: string } = {
      1: "Diamond", 2: "Ruby", 3: "Emerald", 4: "Sapphire",
      5: "Gold", 6: "Silver", 7: "Bronze", 8: "Iron"
    };
    return names[division] || `Division ${division}`;
  }

  const httpServer = createServer(app);
  return httpServer;
}
