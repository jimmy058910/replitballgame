import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  getServerTimeInfo, 
  generateLeagueGameSchedule, 
  generateDailyGameTimes,
  getNextLeagueGameSlot,
  isWithinSchedulingWindow,
  formatEasternTime,
  LEAGUE_GAME_START_HOUR,
  LEAGUE_GAME_END_HOUR
} from "@shared/timezone";
import { createDemoNotifications } from "./testNotifications";
import { NotificationService } from "./services/notificationService";
import { simulateMatch } from "./services/matchSimulation";
import { generateRandomPlayer } from "./services/leagueService";
import { z } from "zod";
import { db } from "./db";
import { items, stadiums, facilityUpgrades, stadiumEvents, teams, players, matches, teamFinances, playerInjuries, staff } from "@shared/schema";
import { eq, isNotNull, gte, lte, and, desc, or } from "drizzle-orm";
import { randomUUID } from "crypto";

// Helper function to calculate team power based on top 9 players (starters + first substitution)
function calculateTeamPower(players: any[]): number {
  if (!players || players.length === 0) return 0;
  
  // Calculate individual player power using 5 core stats (same as frontend)
  const playersWithPower = players.map(player => ({
    ...player,
    individualPower: (player.speed || 20) + (player.power || 20) + (player.throwing || 20) + 
                    (player.catching || 20) + (player.kicking || 20)
  }));
  
  // Sort by power and take top 9 players (starters + first substitution)
  const topPlayers = playersWithPower
    .sort((a, b) => b.individualPower - a.individualPower)
    .slice(0, 9);
  
  // Calculate team power as average of top 9 players
  const totalPower = topPlayers.reduce((sum, player) => sum + player.individualPower, 0);
  return Math.round(totalPower / topPlayers.length);
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

// Helper function to create AI teams for a division
async function createAITeamsForDivision(division: number) {
  const aiTeamNames = [
    "Thunder Hawks", "Storm Eagles", "Fire Dragons", "Ice Wolves", 
    "Lightning Bolts", "Shadow Panthers", "Golden Lions", "Silver Sharks",
    "Crimson Tigers", "Azure Phoenix", "Emerald Serpents", "Violet Raptors"
  ];

  const races = ["Human", "Sylvan", "Gryll", "Lumina", "Umbra"];
  
  for (let i = 0; i < 8; i++) { // Create 8 AI teams per division
    const teamName = aiTeamNames[i] || `Division ${division} Team ${i + 1}`;
    
    // Create AI user first
    const aiUser = await storage.upsertUser({
      id: `ai_user_div${division}_team${i}`,
      email: `ai_div${division}_team${i}@realmrivalry.ai`,
      firstName: "AI",
      lastName: "Coach",
      profileImageUrl: null
    });

    // Create team
    const team = await storage.createTeam({
      name: teamName,
      userId: aiUser.id,
      division: division,
      wins: Math.floor(Math.random() * 5),
      losses: Math.floor(Math.random() * 5),
      points: Math.floor(Math.random() * 100),
      formation: JSON.stringify({
        starters: [],
        substitutes: []
      }),
      substitutionOrder: JSON.stringify({})
    });

    // Create team finances
    await storage.createTeamFinances({
      teamId: team.id,
      credits: 50000 + Math.floor(Math.random() * 50000),
      premiumCurrency: Math.floor(Math.random() * 100)
    });

    // Create 12 players for each team (6 starters + 6 subs)
    for (let j = 0; j < 12; j++) {
      const race = races[Math.floor(Math.random() * races.length)];
      const positions = ["Passer", "Runner", "Blocker"];
      const position = positions[Math.floor(Math.random() * positions.length)];
      
      await storage.createPlayer({
        name: `${race} Player ${j + 1}`,
        teamId: team.id,
        position: position,
        race: race,
        speed: 10 + Math.floor(Math.random() * 30),
        power: 10 + Math.floor(Math.random() * 30),
        throwing: 10 + Math.floor(Math.random() * 30),
        catching: 10 + Math.floor(Math.random() * 30),
        kicking: 10 + Math.floor(Math.random() * 30),
        stamina: 10 + Math.floor(Math.random() * 30),
        leadership: 10 + Math.floor(Math.random() * 30),
        agility: 10 + Math.floor(Math.random() * 30),
        isMarketplace: false,
        marketplacePrice: null,
        abilities: JSON.stringify([])
      });
    }
  }
}

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

      // Get team players and calculate team power
      const players = await storage.getPlayersByTeamId(team.id);
      const teamPower = calculateTeamPower(players);

      res.json({ ...team, teamPower });
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.get('/api/teams/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const team = await storage.getTeamById(id);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Get team players and calculate team power
      const players = await storage.getPlayersByTeamId(team.id);
      const teamPower = calculateTeamPower(players);

      res.json({ ...team, teamPower });
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
      if (isNaN(division) || division < 1 || division > 8) {
        return res.status(400).json({ message: "Invalid division parameter" });
      }
      let teams = await storage.getTeamsByDivision(division);
      
      // If no teams exist in this division, create AI teams
      if (teams.length === 0) {
        console.log(`Creating AI teams for division ${division}`);
        
        const aiTeamNames = [
          "Thunder Hawks", "Storm Eagles", "Fire Dragons", "Ice Wolves", 
          "Lightning Bolts", "Shadow Panthers", "Golden Lions", "Silver Sharks"
        ];
        const races = ["Human", "Sylvan", "Gryll", "Lumina", "Umbra"];
        
        for (let i = 0; i < 8; i++) {
          const teamName = aiTeamNames[i] || `Division ${division} Team ${i + 1}`;
          
          // Create AI user first
          const aiUser = await storage.upsertUser({
            id: `ai_user_div${division}_team${i}`,
            email: `ai_div${division}_team${i}@realmrivalry.ai`,
            firstName: "AI",
            lastName: "Coach",
            profileImageUrl: null
          });

          // Create team
          const team = await storage.createTeam({
            name: teamName,
            userId: aiUser.id,
            division: division,
            wins: Math.floor(Math.random() * 5),
            losses: Math.floor(Math.random() * 5),
            points: Math.floor(Math.random() * 100),
            formation: JSON.stringify({
              starters: [],
              substitutes: []
            }),
            substitutionOrder: JSON.stringify({})
          });

          // Create team finances
          await storage.createTeamFinances({
            teamId: team.id,
            credits: 50000 + Math.floor(Math.random() * 50000),
            premiumCurrency: Math.floor(Math.random() * 100)
          });

          // Create 12 players for each team
          for (let j = 0; j < 12; j++) {
            const race = races[Math.floor(Math.random() * races.length)];
            const positions = ["Passer", "Runner", "Blocker"];
            const position = positions[Math.floor(Math.random() * positions.length)];
            
            await storage.createPlayer({
              name: `${race} Player ${j + 1}`,
              firstName: `${race}`,
              lastName: `Player ${j + 1}`,
              teamId: team.id,
              position: position,
              race: race,
              age: 18 + Math.floor(Math.random() * 12),
              speed: 15 + Math.floor(Math.random() * 15),
              power: 15 + Math.floor(Math.random() * 15),
              throwing: 15 + Math.floor(Math.random() * 15),
              catching: 15 + Math.floor(Math.random() * 15),
              kicking: 15 + Math.floor(Math.random() * 15),
              stamina: 15 + Math.floor(Math.random() * 15),
              leadership: 15 + Math.floor(Math.random() * 15),
              agility: 15 + Math.floor(Math.random() * 15),
              salary: 25000 + Math.floor(Math.random() * 50000),
              contractValue: 100000 + Math.floor(Math.random() * 200000),
              isMarketplace: false,
              marketplacePrice: null,
              abilities: JSON.stringify([])
            });
          }
        }
        
        teams = await storage.getTeamsByDivision(division);
        console.log(`Created ${teams.length} AI teams for division ${division}`);
      }
      
      // Sort teams by league standings (points, then wins, then goals for tie-breaking)
      const sortedTeams = teams.sort((a, b) => {
        const aPoints = a.points || 0;
        const bPoints = b.points || 0;
        const aWins = a.wins || 0;
        const bWins = b.wins || 0;
        const aLosses = a.losses || 0;
        const bLosses = b.losses || 0;
        
        if (bPoints !== aPoints) return bPoints - aPoints;
        if (bWins !== aWins) return bWins - aWins;
        return aLosses - bLosses; // fewer losses is better
      });
      
      res.json(sortedTeams);
    } catch (error) {
      console.error("Error fetching standings:", error);
      res.status(500).json({ message: "Failed to fetch standings" });
    }
  });

  // Get teams by division for browsing/challenges
  app.get('/api/teams/division/:division', isAuthenticated, async (req, res) => {
    try {
      const division = parseInt(req.params.division);
      if (isNaN(division) || division < 1 || division > 8) {
        return res.status(400).json({ message: "Invalid division parameter" });
      }
      
      let teams = await storage.getTeamsByDivision(division);
      
      // If no teams exist in this division, create AI teams
      if (teams.length === 0) {
        console.log(`Creating AI teams for division ${division} (Browse Teams)`);
        
        const aiTeamNames = [
          "Thunder Hawks", "Storm Eagles", "Fire Dragons", "Ice Wolves", 
          "Lightning Bolts", "Shadow Panthers", "Golden Lions", "Silver Sharks"
        ];
        const races = ["Human", "Sylvan", "Gryll", "Lumina", "Umbra"];
        
        for (let i = 0; i < 8; i++) {
          const teamName = aiTeamNames[i] || `Division ${division} Team ${i + 1}`;
          
          // Create AI user first
          const aiUser = await storage.upsertUser({
            id: `ai_user_div${division}_team${i}_browse`,
            email: `ai_div${division}_team${i}_browse@realmrivalry.ai`,
            firstName: "AI",
            lastName: "Coach",
            profileImageUrl: null
          });

          // Create team
          const team = await storage.createTeam({
            name: teamName,
            userId: aiUser.id,
            division: division,
            wins: Math.floor(Math.random() * 5),
            losses: Math.floor(Math.random() * 5),
            points: Math.floor(Math.random() * 100),
            formation: JSON.stringify({
              starters: [],
              substitutes: []
            }),
            substitutionOrder: JSON.stringify({})
          });

          // Create team finances
          await storage.createTeamFinances({
            teamId: team.id,
            credits: 50000 + Math.floor(Math.random() * 50000),
            premiumCurrency: Math.floor(Math.random() * 100)
          });

          // Create 12 players for each team
          for (let j = 0; j < 12; j++) {
            const race = races[Math.floor(Math.random() * races.length)];
            const positions = ["Passer", "Runner", "Blocker"];
            const position = positions[Math.floor(Math.random() * positions.length)];
            
            await storage.createPlayer({
              name: `${race} Player ${j + 1}`,
              firstName: `${race}`,
              lastName: `Player ${j + 1}`,
              teamId: team.id,
              position: position,
              race: race,
              age: 18 + Math.floor(Math.random() * 12),
              speed: 15 + Math.floor(Math.random() * 15),
              power: 15 + Math.floor(Math.random() * 15),
              throwing: 15 + Math.floor(Math.random() * 15),
              catching: 15 + Math.floor(Math.random() * 15),
              kicking: 15 + Math.floor(Math.random() * 15),
              stamina: 15 + Math.floor(Math.random() * 15),
              leadership: 15 + Math.floor(Math.random() * 15),
              agility: 15 + Math.floor(Math.random() * 15),
              salary: 25000 + Math.floor(Math.random() * 50000),
              contractValue: 100000 + Math.floor(Math.random() * 200000),
              isMarketplace: false,
              marketplacePrice: null,
              abilities: JSON.stringify([])
            });
          }
        }
        
        teams = await storage.getTeamsByDivision(division);
        console.log(`Created ${teams.length} AI teams for division ${division} (Browse Teams)`);
      }
      
      // Add team power calculations for each team
      const teamsWithPower = await Promise.all(teams.map(async (team) => {
        const players = await storage.getPlayersByTeamId(team.id);
        const teamPower = calculateTeamPower(players);
        return { ...team, teamPower };
      }));

      res.json(teamsWithPower);
    } catch (error) {
      console.error("Error fetching division teams:", error);
      res.status(500).json({ message: "Failed to fetch division teams" });
    }
  });



  // Match routes
  app.get('/api/matches/live', isAuthenticated, async (req, res) => {
    try {
      const liveMatches = await storage.getLiveMatches();
      
      // Enhance with team names for proper display
      const enhancedMatches = await Promise.all(liveMatches.map(async (match) => {
        const homeTeam = await storage.getTeamById(match.homeTeamId);
        const awayTeam = await storage.getTeamById(match.awayTeamId);
        
        return {
          ...match,
          homeTeamName: homeTeam?.name || "Home",
          awayTeamName: awayTeam?.name || "Away"
        };
      }));
      
      res.json(enhancedMatches);
    } catch (error) {
      console.error("Error fetching live matches:", error);
      res.status(500).json({ message: "Failed to fetch live matches" });
    }
  });

  app.get('/api/matches/:matchId', isAuthenticated, async (req, res) => {
    try {
      const { matchId } = req.params;
      const match = await storage.getMatchById(matchId);
      
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      res.json(match);
    } catch (error) {
      console.error("Error fetching match:", error);
      res.status(500).json({ message: "Failed to fetch match" });
    }
  });

  app.get('/api/team-matches/:teamId', isAuthenticated, async (req, res) => {
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
      let teamId = req.params.teamId;
      
      // Handle "my" keyword by looking up user's team
      if (teamId === "my") {
        const userId = (req.user as any)?.claims?.sub;
        const team = await storage.getTeamByUserId(userId);
        if (!team) {
          return res.status(404).json({ message: "Team not found" });
        }
        teamId = team.id;
      }
      
      let finances = await storage.getTeamFinances(teamId);
      
      // Create default finances if none exist - start with modest amount
      if (!finances) {
        finances = await storage.createTeamFinances({
          teamId,
          season: 1,
          ticketSales: 0,
          concessionSales: 0,
          jerseySales: 0,
          sponsorships: 0,
          playerSalaries: 0,
          staffSalaries: 0,
          facilities: 0,
          credits: 50000, // Starting credits for new teams
          totalIncome: 0,
          totalExpenses: 0,
          netIncome: 0,
          premiumCurrency: 0
        });
      }
      
      res.json(finances);
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
        const races = ["Human", "Sylvan", "Gryll", "Lumina", "Umbra"];
        const names = ["Alex", "Jordan", "Taylor", "Casey", "Riley", "Morgan", "Avery", "Quinn"];
        
        // Young players start with lower stats (1-40 range)
        const baseStats = type === "advanced" ? 20 : 15;
        const variance = type === "advanced" ? 15 : 12;
        
        candidates.push({
          id: `candidate_${Date.now()}_${i}`,
          name: names[Math.floor(Math.random() * names.length)] + " " + 
                ["Smith", "Jones", "Brown", "Davis", "Miller"][Math.floor(Math.random() * 5)],
          race: races[Math.floor(Math.random() * races.length)],
          age,
          leadership: Math.max(1, Math.min(40, baseStats + Math.floor(Math.random() * variance))),
          throwing: Math.max(1, Math.min(40, baseStats + Math.floor(Math.random() * variance))),
          speed: Math.max(1, Math.min(40, baseStats + Math.floor(Math.random() * variance))),
          agility: Math.max(1, Math.min(40, baseStats + Math.floor(Math.random() * variance))),
          power: Math.max(1, Math.min(40, baseStats + Math.floor(Math.random() * variance))),
          stamina: Math.max(1, Math.min(40, baseStats + Math.floor(Math.random() * variance))),
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

      // Add credits for testing (Macomb Cougars)
      if (team.name === "Macomb Cougars") {
        await storage.updateTeamFinances(team.id, { 
          credits: (finances.credits || 0) + 250000,
          premiumCurrency: 500 
        });
      } else {
        // Deduct entry fee and create tournament entry
        await storage.updateTeamFinances(team.id, { credits: finances.credits - 1000 });
      }
      
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
        team1Id: team.id,
        team2Id: opponent.id,
        matchType: "exhibition",
        status: "live",
        homeTeamName: team.name,
        awayTeamName: opponent.name
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

      // Import abilities system and roll for new ability
      const { rollForAbility } = await import("@shared/abilities");
      const newAbility = rollForAbility(player);
      
      if (newAbility) {
        const currentAbilities = player.abilities || [];
        const updatedAbilities = [...currentAbilities, newAbility.id];
        
        await storage.updatePlayer(playerId, { abilities: updatedAbilities });
        
        res.json({ 
          success: true, 
          newAbility: newAbility.name,
          message: `${player.name} learned ${newAbility.name}!` 
        });
      } else {
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

  // Store routes
  app.get('/api/store', isAuthenticated, async (req, res) => {
    try {
      // Generate daily rotating store items
      const today = new Date().toDateString();
      const storeItems = [
        {
          id: "helmet_basic",
          name: "Basic Helmet",
          description: "Standard protection headgear",
          price: 5000,
          currency: "credits",
          rarity: "common",
          icon: "🪖",
          statBoosts: { power: 2, stamina: 1 }
        },
        {
          id: "shoes_speed",
          name: "Speed Boots",
          description: "Lightweight boots for enhanced speed",
          price: 8000,
          currency: "credits",
          rarity: "rare",
          icon: "👟",
          statBoosts: { speed: 5, agility: 3 }
        },
        {
          id: "training_credits",
          name: "Training Package",
          description: "Credits for player development",
          price: 10,
          currency: "currency",
          rarity: "common",
          icon: "💰"
        }
      ];

      const premiumItems = [
        {
          id: "legendary_armor",
          name: "Legendary Armor Set",
          description: "Complete protection with massive stat boosts",
          price: 100,
          currency: "currency",
          rarity: "legendary",
          icon: "⚔️",
          statBoosts: { power: 10, stamina: 8, leadership: 5 }
        }
      ];

      const resetTime = new Date();
      resetTime.setHours(24, 0, 0, 0); // Next midnight

      res.json({
        items: storeItems,
        premiumItems,
        resetTime
      });
    } catch (error) {
      console.error("Error fetching store:", error);
      res.status(500).json({ message: "Failed to fetch store" });
    }
  });

  app.get('/api/store/ads', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Mock ad data - would track in database
      res.json({
        adsWatchedToday: 0,
        basicBoxes: 0,
        premiumBoxes: 0
      });
    } catch (error) {
      console.error("Error fetching ad data:", error);
      res.status(500).json({ message: "Failed to fetch ad data" });
    }
  });

  app.post('/api/store/watch-ad', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Simulate ad reward
      const reward = Math.floor(Math.random() * 400) + 100; // 100-500 credits
      const finances = await storage.getTeamFinances(team.id);
      
      await storage.updateTeamFinances(team.id, { 
        credits: (finances?.credits || 0) + reward 
      });

      res.json({ 
        success: true, 
        reward: `+${reward} credits earned!` 
      });
    } catch (error) {
      console.error("Error processing ad reward:", error);
      res.status(500).json({ message: "Failed to process ad reward" });
    }
  });

  app.post('/api/store/purchase', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const { itemId, currency } = req.body;
      const finances = await storage.getTeamFinances(team.id);

      // Mock purchase logic - would validate item price and deduct currency
      res.json({ success: true, message: "Item purchased successfully" });
    } catch (error) {
      console.error("Error purchasing item:", error);
      res.status(500).json({ message: "Failed to purchase item" });
    }
  });

  // Stadium routes
  app.get('/api/stadium', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Mock stadium data - would be stored in database
      res.json({
        level: 1,
        name: "Basic Stadium",
        totalCapacity: 10000,
        basicSeating: 8000,
        premiumSeating: 1500,
        vipSeating: 400,
        corporateSeating: 100,
        fieldSize: "medium",
        monthlyRevenue: 50000,
        sponsors: []
      });
    } catch (error) {
      console.error("Error fetching stadium:", error);
      res.status(500).json({ message: "Failed to fetch stadium" });
    }
  });

  app.post('/api/stadium/upgrade', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const { type, tier, cost } = req.body;
      const finances = await storage.getTeamFinances(team.id);
      
      if (!finances || (finances.credits || 0) < cost) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      await storage.updateTeamFinances(team.id, { 
        credits: (finances.credits || 0) - cost 
      });

      res.json({ success: true, message: "Stadium upgraded successfully" });
    } catch (error) {
      console.error("Error upgrading stadium:", error);
      res.status(500).json({ message: "Failed to upgrade stadium" });
    }
  });

  app.post('/api/stadium/field-size', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const { fieldSize } = req.body;
      const cost = 50000;
      const finances = await storage.getTeamFinances(team.id);
      
      if (!finances || (finances.credits || 0) < cost) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      await storage.updateTeamFinances(team.id, { 
        credits: (finances.credits || 0) - cost 
      });

      res.json({ success: true, message: "Field size changed successfully" });
    } catch (error) {
      console.error("Error changing field size:", error);
      res.status(500).json({ message: "Failed to change field size" });
    }
  });

  app.post('/api/stadium/sponsors', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const { sponsorTier, cost, monthlyRevenue } = req.body;
      const finances = await storage.getTeamFinances(team.id);
      
      if (!finances || (finances.credits || 0) < cost) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      await storage.updateTeamFinances(team.id, { 
        credits: (finances.credits || 0) - cost 
      });

      res.json({ success: true, message: "Sponsor contract signed successfully" });
    } catch (error) {
      console.error("Error managing sponsors:", error);
      res.status(500).json({ message: "Failed to manage sponsors" });
    }
  });

  // Equipment marketplace routes
  app.get('/api/marketplace/equipment', isAuthenticated, async (req, res) => {
    try {
      // Mock equipment marketplace data
      const equipment = [
        {
          id: "helmet_legendary",
          name: "Dragon Scale Helmet",
          description: "Legendary protection forged from ancient dragon scales",
          price: 150000,
          rarity: "legendary",
          slot: "helmet",
          statBoosts: { power: 8, stamina: 6, leadership: 4 },
          seller: "Elite Equipment Co."
        },
        {
          id: "boots_rare", 
          name: "Wind Walker Boots",
          description: "Enchanted boots that enhance speed and agility",
          price: 75000,
          rarity: "rare",
          slot: "boots",
          statBoosts: { speed: 6, agility: 5 },
          seller: "Speed Demons LLC"
        },
        {
          id: "armor_epic",
          name: "Titan's Plate Armor",
          description: "Heavy armor providing maximum protection",
          price: 200000,
          rarity: "epic", 
          slot: "armor",
          statBoosts: { power: 10, stamina: 8, throwing: -2 },
          seller: "Fortress Gear"
        },
        {
          id: "gloves_common",
          name: "Grip Master Gloves",
          description: "Basic gloves with enhanced grip",
          price: 15000,
          rarity: "common",
          slot: "gloves",
          statBoosts: { catching: 3, throwing: 2 },
          seller: "Basic Sports"
        }
      ];

      res.json(equipment);
    } catch (error) {
      console.error("Error fetching equipment marketplace:", error);
      res.status(500).json({ message: "Failed to fetch equipment marketplace" });
    }
  });

  // Formation saving route
  app.post('/api/teams/:teamId/formation', isAuthenticated, async (req, res) => {
    try {
      let teamId = req.params.teamId;
      
      if (teamId === "my") {
        const userId = (req.user as any)?.claims?.sub;
        const team = await storage.getTeamByUserId(userId);
        if (!team) {
          return res.status(404).json({ message: "Team not found" });
        }
        teamId = team.id;
      }

      const { formation, substitutionOrder } = req.body;
      
      // Store formation in team data
      await storage.updateTeam(teamId, { 
        formation: JSON.stringify(formation),
        substitutionOrder: JSON.stringify(substitutionOrder || {}),
        updatedAt: new Date()
      });

      res.json({ success: true, message: "Formation saved successfully" });
    } catch (error) {
      console.error("Error saving formation:", error);
      res.status(500).json({ message: "Failed to save formation" });
    }
  });

  app.get('/api/teams/:teamId/formation', isAuthenticated, async (req, res) => {
    try {
      let teamId = req.params.teamId;
      
      if (teamId === "my") {
        const userId = (req.user as any)?.claims?.sub;
        const team = await storage.getTeamByUserId(userId);
        if (!team) {
          return res.status(404).json({ message: "Team not found" });
        }
        teamId = team.id;
      }

      const team = await storage.getTeamById(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      res.json({
        formation: team.formation ? JSON.parse(team.formation) : null,
        substitutionOrder: team.substitutionOrder ? JSON.parse(team.substitutionOrder) : {}
      });
    } catch (error) {
      console.error("Error fetching formation:", error);
      res.status(500).json({ message: "Failed to fetch formation" });
    }
  });

  // Equipment marketplace routes
  app.get('/api/marketplace/equipment', isAuthenticated, async (req, res) => {
    try {
      // Generate comprehensive equipment marketplace data
      const equipment = [
        {
          id: "helm_dragon",
          name: "Dragonscale Guardian Helm",
          description: "Legendary protection forged from ancient dragon scales",
          marketplacePrice: 185000,
          rarity: "legendary",
          slot: "helmet",
          statBoosts: { power: 10, stamina: 8, leadership: 6 },
          seller: "Legendary Smiths Guild",
          condition: "Perfect"
        },
        {
          id: "boots_phantom", 
          name: "Phantom Step Boots",
          description: "Mythical boots that grant supernatural speed",
          marketplacePrice: 125000,
          rarity: "mythic",
          slot: "boots",
          statBoosts: { speed: 12, agility: 10, stamina: 4 },
          seller: "Ethereal Crafters",
          condition: "Excellent"
        },
        {
          id: "armor_titan",
          name: "Titan's Fortress Plate",
          description: "Impenetrable armor providing maximum protection",
          marketplacePrice: 225000,
          rarity: "epic", 
          slot: "armor",
          statBoosts: { power: 15, stamina: 12, throwing: -3 },
          seller: "Iron Fortress Co.",
          condition: "Very Good"
        },
        {
          id: "gloves_sorcerer",
          name: "Sorcerer's Grip Gloves",
          description: "Enchanted gloves with supernatural catching ability",
          marketplacePrice: 45000,
          rarity: "rare",
          slot: "gloves",
          statBoosts: { catching: 8, throwing: 6, agility: 3 },
          seller: "Mystic Sports",
          condition: "Good"
        },
        {
          id: "staff_champion",
          name: "Champion's Battle Staff",
          description: "Ceremonial staff carried by championship teams",
          marketplacePrice: 95000,
          rarity: "epic",
          slot: "weapon",
          statBoosts: { leadership: 10, power: 6, throwing: 4 },
          seller: "Victory Armaments",
          condition: "Excellent"
        },
        {
          id: "shield_aegis",
          name: "Guardian's Aegis Shield",
          description: "Protective shield that enhances defensive capabilities",
          marketplacePrice: 65000,
          rarity: "rare",
          slot: "shield",
          statBoosts: { stamina: 8, power: 5, speed: -1 },
          seller: "Defense Masters",
          condition: "Very Good"
        }
      ];

      res.json(equipment);
    } catch (error) {
      console.error("Error fetching equipment marketplace:", error);
      res.status(500).json({ message: "Failed to fetch equipment marketplace" });
    }
  });

  app.post('/api/marketplace/equipment/:itemId/buy', isAuthenticated, async (req, res) => {
    try {
      const itemId = req.params.itemId;
      const userId = (req.user as any)?.claims?.sub;
      
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const item = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
      if (!item.length || !item[0].marketplacePrice) {
        return res.status(404).json({ message: "Item not available for purchase" });
      }

      const equipmentItem = item[0];
      const finances = await storage.getTeamFinances(team.id);
      
      if (!finances || (finances.credits || 0) < equipmentItem.marketplacePrice) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Remove from marketplace and add to team inventory
      await db.update(items)
        .set({ 
          marketplacePrice: null,
          teamId: team.id,
          updatedAt: new Date()
        })
        .where(eq(items.id, itemId));

      // Update team finances
      await storage.updateTeamFinances(team.id, {
        credits: (finances.credits || 0) - equipmentItem.marketplacePrice
      });

      res.json({ success: true, message: `Purchased ${equipmentItem.name}` });
    } catch (error) {
      console.error("Error buying equipment:", error);
      res.status(500).json({ message: "Failed to purchase equipment" });
    }
  });

  app.post('/api/marketplace/equipment/:itemId/sell', isAuthenticated, async (req, res) => {
    try {
      const itemId = req.params.itemId;
      const { price } = req.body;
      const userId = (req.user as any)?.claims?.sub;
      
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Verify item ownership
      const item = await db.select().from(items)
        .where(and(eq(items.id, itemId), eq(items.teamId, team.id)))
        .limit(1);
        
      if (!item.length) {
        return res.status(404).json({ message: "Item not found or not owned by your team" });
      }

      if (price < 100 || price > 50000) {
        return res.status(400).json({ message: "Price must be between 100 and 50,000 credits" });
      }

      // List item on marketplace
      await db.update(items)
        .set({ 
          marketplacePrice: price,
          updatedAt: new Date()
        })
        .where(eq(items.id, itemId));

      res.json({ success: true, message: `${item[0].name} listed for ${price} credits` });
    } catch (error) {
      console.error("Error listing equipment:", error);
      res.status(500).json({ message: "Failed to list equipment" });
    }
  });

  // Referral System API Routes
  app.get('/api/referrals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Generate mock referral data for demonstration
      const referralData = {
        myCode: `REF${userId.slice(-6).toUpperCase()}`,
        totalReferrals: Math.floor(Math.random() * 15),
        creditsEarned: Math.floor(Math.random() * 50000),
        gemsEarned: Math.floor(Math.random() * 100),
        activeReferrals: Math.floor(Math.random() * 10),
        hasUsedReferral: Math.random() > 0.7,
        recentReferrals: [
          { username: "Player123", joinedAt: new Date().toISOString(), isActive: true },
          { username: "Gamer456", joinedAt: new Date(Date.now() - 86400000).toISOString(), isActive: false }
        ]
      };
      
      res.json(referralData);
    } catch (error) {
      console.error("Error fetching referral data:", error);
      res.status(500).json({ message: "Failed to fetch referral data" });
    }
  });

  app.post('/api/referrals/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const referralCode = `REF${userId.slice(-6).toUpperCase()}`;
      
      res.json({ code: referralCode, message: "Referral code generated successfully" });
    } catch (error) {
      console.error("Error generating referral code:", error);
      res.status(500).json({ message: "Failed to generate referral code" });
    }
  });

  app.post('/api/referrals/claim', isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.body;
      const userId = (req.user as any).claims.sub;
      
      if (!code || code.length < 6) {
        return res.status(400).json({ message: "Invalid referral code" });
      }

      // Mock validation - in a real app, you'd check against a database
      if (code === `REF${userId.slice(-6).toUpperCase()}`) {
        return res.status(400).json({ message: "Cannot use your own referral code" });
      }

      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const finances = await storage.getTeamFinances(team.id);
      if (!finances) {
        return res.status(404).json({ message: "Team finances not found" });
      }

      // Add referral bonus
      await storage.updateTeamFinances(team.id, {
        credits: (finances.credits || 0) + 10000,
        premiumCurrency: (finances.premiumCurrency || 0) + 5
      });

      res.json({ 
        message: "Referral bonus claimed successfully!",
        rewards: ["10,000₡", "5💎"]
      });
    } catch (error) {
      console.error("Error claiming referral:", error);
      res.status(500).json({ message: "Failed to claim referral bonus" });
    }
  });

  // Create AI teams for leagues
  app.post('/api/leagues/create-ai-teams', isAuthenticated, async (req, res) => {
    try {
      const { division = 8 } = req.body;
      
      const aiTeamNames = [
        "Shadow Hunters", "Storm Riders", "Iron Eagles", "Fire Wolves", 
        "Thunder Hawks", "Ice Bears", "Lightning Tigers", "Stone Lions",
        "Wind Falcons", "Flame Panthers", "Steel Sharks", "Dark Ravens",
        "Frost Wolves", "Electric Dragons", "Mystic Foxes", "Savage Bulls"
      ];

      const createdTeams = [];
      
      for (let i = 0; i < 15; i++) { // Create 15 AI teams
        const teamName = aiTeamNames[i % aiTeamNames.length] + ` ${Math.floor(Math.random() * 100)}`;
        
        // Create AI user first
        const aiUserId = `ai-${Date.now()}-${i}`;
        await storage.upsertUser({
          id: aiUserId,
          email: `ai${i}@realm-rivalry.com`,
          firstName: `AI`,
          lastName: `Team${i + 1}`,
          profileImageUrl: null
        });

        // Create AI team
        const team = await storage.createTeam({
          name: teamName,
          userId: aiUserId,
          division: division,
          wins: Math.floor(Math.random() * 5),
          losses: Math.floor(Math.random() * 5),
          draws: Math.floor(Math.random() * 2),
          points: Math.floor(Math.random() * 15),
          teamPower: 60 + Math.floor(Math.random() * 20)
        });

        // Create team finances for AI team
        await storage.createTeamFinances({
          teamId: team.id,
          credits: 10000 + Math.floor(Math.random() * 20000),
          season: 1
        });

        // Generate AI players for the team
        const races = ["human", "sylvan", "gryll", "lumina", "umbra"];

        for (let j = 0; j < 10; j++) {
          const race = races[Math.floor(Math.random() * races.length)];
          
          await storage.createPlayer(generateRandomPlayer("AI Player", race, team.id));
        }

        createdTeams.push(team);
      }

      res.json({ 
        message: `Created ${createdTeams.length} AI teams for Division ${division}`,
        teams: createdTeams.map(t => ({ id: t.id, name: t.name, division: t.division }))
      });
    } catch (error) {
      console.error("Error creating AI teams:", error);
      res.status(500).json({ message: "Failed to create AI teams" });
    }
  });

  // Redemption Codes API Routes
  app.get('/api/redemption-codes/history', isAuthenticated, async (req: any, res) => {
    try {
      // Mock redemption history for demonstration
      const history = [
        {
          code: "WELCOME2024",
          description: "Welcome Bonus Package",
          redeemedAt: new Date().toISOString(),
          rewards: [
            { type: "credits", amount: 5000 },
            { type: "gems", amount: 10 }
          ]
        },
        {
          code: "LAUNCH100",
          description: "Launch Week Special",
          redeemedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          rewards: [
            { type: "item", itemName: "Elite Training Equipment" },
            { type: "credits", amount: 2500 }
          ]
        }
      ];
      
      res.json(history);
    } catch (error) {
      console.error("Error fetching redemption history:", error);
      res.status(500).json({ message: "Failed to fetch redemption history" });
    }
  });

  app.post('/api/redemption-codes/redeem', isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.body;
      const userId = (req.user as any).claims.sub;
      
      if (!code || code.length < 4) {
        return res.status(400).json({ message: "Invalid redemption code" });
      }

      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const finances = await storage.getTeamFinances(team.id);
      if (!finances) {
        return res.status(404).json({ message: "Team finances not found" });
      }

      // Mock code validation and rewards
      const validCodes: { [key: string]: any } = {
        "WELCOME2024": {
          rewards: ["5,000₡", "10💎"],
          credits: 5000,
          gems: 10,
          description: "Welcome Bonus Package"
        },
        "NEWPLAYER": {
          rewards: ["3,000₡", "5💎"],
          credits: 3000,
          gems: 5,
          description: "New Player Bonus"
        },
        "COMMUNITY": {
          rewards: ["2,000₡", "Basic Mystery Box"],
          credits: 2000,
          gems: 0,
          description: "Community Appreciation"
        }
      };

      const codeData = validCodes[code.toUpperCase()];
      if (!codeData) {
        return res.status(400).json({ message: "Invalid or expired redemption code" });
      }

      // Apply rewards
      await storage.updateTeamFinances(team.id, {
        credits: (finances.credits || 0) + codeData.credits,
        premiumCurrency: (finances.premiumCurrency || 0) + codeData.gems
      });

      res.json({ 
        message: `Code redeemed successfully!`,
        rewards: codeData.rewards,
        description: codeData.description
      });
    } catch (error) {
      console.error("Error redeeming code:", error);
      res.status(500).json({ message: "Failed to redeem code" });
    }
  });

  function getDivisionName(division: number) {
    const names: { [key: number]: string } = {
      1: "Diamond", 2: "Ruby", 3: "Emerald", 4: "Sapphire",
      5: "Gold", 6: "Silver", 7: "Bronze", 8: "Iron"
    };
    return names[division] || `Division ${division}`;
  }

  // Auction routes
  app.get('/api/auctions', isAuthenticated, async (req: any, res) => {
    try {
      const auctions = await storage.getActiveAuctions();
      res.json(auctions);
    } catch (error) {
      console.error("Error fetching auctions:", error);
      res.status(500).json({ message: "Failed to fetch auctions" });
    }
  });

  app.post('/api/auctions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const { playerId, startingBid, duration } = req.body;
      
      const player = await storage.getPlayerById(playerId);
      if (!player || player.teamId !== team.id) {
        return res.status(404).json({ message: "Player not found or not owned by team" });
      }

      const endTime = new Date();
      endTime.setHours(endTime.getHours() + (duration || 24));

      const auction = await storage.createAuction({
        playerId,
        sellerId: team.id,
        startingBid: startingBid || 1000,
        currentBid: startingBid || 1000,
        endTime,
        status: 'active'
      });

      res.json(auction);
    } catch (error) {
      console.error("Error creating auction:", error);
      res.status(500).json({ message: "Failed to create auction" });
    }
  });

  app.post('/api/auctions/:id/bid', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const auctionId = req.params.id;
      const { amount } = req.body;

      const auction = await storage.getAuctionById(auctionId);
      if (!auction || auction.status !== 'active') {
        return res.status(404).json({ message: "Auction not found or not active" });
      }

      if (auction.sellerId === team.id) {
        return res.status(400).json({ message: "Cannot bid on your own auction" });
      }

      const finances = await storage.getTeamFinances(team.id);
      if (!finances || (finances.credits || 0) < amount) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      const currentTopBid = await storage.getTopBidForAuction(auctionId);
      if (currentTopBid && amount <= currentTopBid.amount) {
        return res.status(400).json({ message: "Bid must be higher than current bid" });
      }

      const bid = await storage.createBid({
        auctionId,
        bidderId: team.id,
        amount
      });

      await storage.updateAuction(auctionId, {
        currentBid: amount,
        topBidderId: team.id
      });

      // Create notification for seller
      await storage.createNotification({
        userId: auction.sellerId,
        type: 'auction',
        title: 'New Bid on Your Auction',
        message: `Your player auction received a bid of ${amount.toLocaleString()} credits`,
        priority: 'medium'
      });

      res.json(bid);
    } catch (error) {
      console.error("Error placing bid:", error);
      res.status(500).json({ message: "Failed to place bid" });
    }
  });

  // Injury Management Routes
  app.get('/api/injuries/:teamId', isAuthenticated, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const injuries = await storage.getTeamInjuries(teamId);
      res.json(injuries);
    } catch (error) {
      console.error("Error fetching injuries:", error);
      res.status(500).json({ message: "Failed to fetch injuries" });
    }
  });

  app.post('/api/injuries', isAuthenticated, async (req: any, res) => {
    try {
      const injuryData = req.body;
      const player = await storage.getPlayerById(injuryData.playerId);
      
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }

      const injury = await storage.createInjury({
        ...injuryData,
        id: undefined,
      });

      // Send notification
      const team = await storage.getTeamById(player.teamId);
      if (team) {
        await NotificationService.notifyPlayerInjured(
          team.id,
          player.name,
          injuryData.injuryType,
          injuryData.severity
        );
      }

      res.json(injury);
    } catch (error) {
      console.error("Error creating injury:", error);
      res.status(500).json({ message: "Failed to create injury" });
    }
  });

  app.patch('/api/injuries/:id/treatment', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const treatmentData = req.body;
      
      const injury = await storage.updateInjury(id, treatmentData);
      res.json(injury);
    } catch (error) {
      console.error("Error updating treatment:", error);
      res.status(500).json({ message: "Failed to update treatment" });
    }
  });

  // Medical Staff Routes
  app.get('/api/medical-staff/:teamId', isAuthenticated, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const staff = await storage.getMedicalStaffByTeam(teamId);
      res.json(staff);
    } catch (error) {
      console.error("Error fetching medical staff:", error);
      res.status(500).json({ message: "Failed to fetch medical staff" });
    }
  });

  app.post('/api/medical-staff', isAuthenticated, async (req: any, res) => {
    try {
      const staffData = req.body;
      const staff = await storage.createMedicalStaff({
        ...staffData,
        id: undefined,
      });
      res.json(staff);
    } catch (error) {
      console.error("Error hiring medical staff:", error);
      res.status(500).json({ message: "Failed to hire medical staff" });
    }
  });

  // Player Conditioning Routes
  app.get('/api/conditioning/:teamId', isAuthenticated, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const conditioning = await storage.getPlayerConditioningByTeam(teamId);
      res.json(conditioning);
    } catch (error) {
      console.error("Error fetching conditioning:", error);
      res.status(500).json({ message: "Failed to fetch conditioning data" });
    }
  });

  app.patch('/api/conditioning/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const conditioning = await storage.updatePlayerConditioning(id, updates);
      res.json(conditioning);
    } catch (error) {
      console.error("Error updating conditioning:", error);
      res.status(500).json({ message: "Failed to update conditioning" });
    }
  });

  // Enhanced notification system with automatic triggers
  app.post('/api/auctions/:id/bid', isAuthenticated, async (req: any, res) => {
    try {
      const { id: auctionId } = req.params;
      const { bidAmount, bidType, maxAutoBid } = req.body;
      const userId = req.user.claims.sub;
      
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const auction = await storage.getAuctionById(auctionId);
      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }

      // Get current top bid
      const currentTopBid = await storage.getTopBidForAuction(auctionId);
      
      // Notify previous top bidder they've been outbid
      if (currentTopBid && currentTopBid.bidderId !== team.id) {
        const previousTopTeam = await storage.getTeamById(currentTopBid.bidderId);
        if (previousTopTeam) {
          const player = await storage.getPlayerById(auction.playerId);
          if (player) {
            await NotificationService.notifyOutbid(
              previousTopTeam.userId,
              player.name,
              bidAmount,
              auctionId
            );
          }
        }
      }

      const bid = await storage.createBid({
        id: undefined,
        auctionId,
        bidderId: team.id,
        bidAmount,
        bidType,
        maxAutoBid,
        isWinning: true,
        timestamp: new Date(),
      });

      res.json(bid);
    } catch (error) {
      console.error("Error placing bid:", error);
      res.status(500).json({ message: "Failed to place bid" });
    }
  });

  // Tournament and league notifications
  app.post('/api/tournaments/start/:division', isAuthenticated, async (req: any, res) => {
    try {
      const { division } = req.params;
      
      // Send tournament start notifications
      await NotificationService.notifyTournamentStart(parseInt(division));
      
      res.json({ message: "Tournament started and notifications sent" });
    } catch (error) {
      console.error("Error starting tournament:", error);
      res.status(500).json({ message: "Failed to start tournament" });
    }
  });

  // Match result notifications
  app.patch('/api/matches/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { homeScore, awayScore } = req.body;
      
      const match = await storage.getMatchById(id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      const updatedMatch = await storage.updateMatch(id, {
        status: "finished",
        homeScore,
        awayScore,
        endTime: new Date(),
      });

      // Send match result notifications
      await NotificationService.notifyMatchResult(
        match.homeTeamId,
        match.awayTeamId,
        homeScore,
        awayScore,
        id
      );

      res.json(updatedMatch);
    } catch (error) {
      console.error("Error completing match:", error);
      res.status(500).json({ message: "Failed to complete match" });
    }
  });

  // Exhibition Match Routes
  app.get('/api/exhibitions/available', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Get available exhibition opponents (other teams in same division)
      const availableTeams = await storage.getTeamsByDivision(team.division);
      const opponents = availableTeams.filter(t => t.id !== team.id);

      // Generate exhibition match options
      const exhibitions = opponents.map(opponent => ({
        id: `exhibition-${opponent.id}`,
        opponent,
        rewards: {
          credits: Math.floor(Math.random() * 500) + 100,
          experience: Math.floor(Math.random() * 200) + 50
        },
        difficulty: calculateTeamPower([]) // Simplified for now
      }));

      res.json(exhibitions);
    } catch (error) {
      console.error("Error fetching exhibitions:", error);
      res.status(500).json({ message: "Failed to fetch exhibitions" });
    }
  });

  app.post('/api/exhibitions/challenge', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { opponentId } = req.body;
      
      console.log(`Challenge request: userId=${userId}, opponentId=${opponentId}`);
      
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const opponent = await storage.getTeamById(opponentId);
      if (!opponent) {
        console.log(`Opponent not found: ${opponentId}`);
        return res.status(404).json({ message: "Opponent team not found" });
      }

      // Create immediate live exhibition match
      const match = await storage.createMatch({
        homeTeamId: team.id,
        awayTeamId: opponent.id,
        status: "live",
        gameDay: 0, // Exhibition matches don't count toward season
        scheduledTime: new Date(),
        matchType: "exhibition"
      });

      res.json({
        match,
        matchId: match.id,
        message: "Exhibition match started! Game is now live."
      });
    } catch (error) {
      console.error("Error creating exhibition:", error);
      res.status(500).json({ message: "Failed to create exhibition match" });
    }
  });

  // Contract expiration checks (would typically run as a scheduled job)
  app.post('/api/system/check-contracts', isAuthenticated, async (req: any, res) => {
    try {
      // This would typically be a scheduled job - simplified for now
      res.json({ message: "Contract check completed", count: 0 });
    } catch (error) {
      console.error("Error checking contracts:", error);
      res.status(500).json({ message: "Failed to check contracts" });
    }
  });

  // Demo notifications endpoint - creates sample notifications directly
  app.post('/api/notifications/demo', isAuthenticated, async (req: any, res) => {
    try {
      console.log("Demo notifications request received");
      
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      console.log("Creating demo notifications...");
      
      // Create demo notifications directly using storage
      await storage.createNotification({
        id: randomUUID(),
        userId,
        type: "match",
        title: "League Game Starting Soon",
        message: "League game starts in 10 minutes",
        priority: "medium",
        actionUrl: "/match/demo-match-1",
        metadata: { matchId: "demo-match-1", type: "match_starting" },
        isRead: false,
        createdAt: new Date(),
      });

      await storage.createNotification({
        id: randomUUID(),
        userId,
        type: "match",
        title: "League Game Complete",
        message: "League game complete, see the result!",
        priority: "medium",
        actionUrl: "/match/demo-match-2",
        metadata: { 
          matchId: "demo-match-2", 
          homeScore: 3, 
          awayScore: 1, 
          type: "match_complete",
          resultHidden: true 
        },
        isRead: false,
        createdAt: new Date(),
      });

      await storage.createNotification({
        id: randomUUID(),
        userId,
        type: "tournament",
        title: "Tournament Starting Soon",
        message: "Tournament filled and starts in 10 minutes",
        priority: "high",
        actionUrl: "/tournaments",
        metadata: { division: 1, event: "tournament_filled", minutesUntilStart: 10 },
        isRead: false,
        createdAt: new Date(),
      });

      await storage.createNotification({
        id: randomUUID(),
        userId,
        type: "auction",
        title: "Outbid!",
        message: "You've been outbid on Marcus Swift. New bid: $45,000",
        priority: "medium",
        actionUrl: "/marketplace/auction/demo-auction-1",
        metadata: { auctionId: "demo-auction-1", playerName: "Marcus Swift", newBidAmount: 45000 },
        isRead: false,
        createdAt: new Date(),
      });

      await storage.createNotification({
        id: randomUUID(),
        userId,
        type: "injury",
        title: "Player Injured",
        message: "Kai Thunderstrike has suffered a moderate hamstring strain",
        priority: "medium",
        actionUrl: "/injuries",
        metadata: { teamId: team.id, playerName: "Kai Thunderstrike", injuryType: "hamstring strain", severity: 5 },
        isRead: false,
        createdAt: new Date(),
      });

      await storage.createNotification({
        id: randomUUID(),
        userId,
        type: "achievement",
        title: "Achievement Unlocked!",
        message: "First Victory: Win your first league match",
        priority: "medium",
        actionUrl: "/achievements",
        metadata: { achievementName: "First Victory" },
        isRead: false,
        createdAt: new Date(),
      });

      await storage.createNotification({
        id: randomUUID(),
        userId,
        type: "contract",
        title: "Contract Expiring",
        message: "Viktor Ironshield's contract expires in 7 days",
        priority: "high",
        actionUrl: "/contracts",
        metadata: { teamId: team.id, playerName: "Viktor Ironshield", daysRemaining: 7 },
        isRead: false,
        createdAt: new Date(),
      });

      await storage.createNotification({
        id: randomUUID(),
        userId,
        type: "league",
        title: "Promotion!",
        message: "Your team has been promoted to Division 2!",
        priority: "high",
        actionUrl: "/league",
        metadata: { teamId: team.id, newDivision: 2 },
        isRead: false,
        createdAt: new Date(),
      });
      
      console.log("Demo notifications created successfully");
      res.json({ message: "Demo notifications created successfully", count: 8 });
    } catch (error) {
      console.error("Error creating demo notifications:", error);
      res.status(500).json({ message: "Failed to create demo notifications", error: error.message });
    }
  });

  // Stadium Management Routes
  app.get('/api/stadium', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      let stadium = await storage.getTeamStadium(team.id);
      
      // Create default stadium if none exists
      if (!stadium) {
        stadium = await storage.createStadium({
          teamId: team.id,
          name: `${team.name} Stadium`,
          level: 1,
          capacity: 5000,
          fieldType: "standard",
          fieldSize: "regulation",
          lighting: "basic",
          surface: "grass",
          drainage: "basic",
          facilities: {},
          upgradeCost: 50000,
          maintenanceCost: 5000,
          revenueMultiplier: 100,
          weatherResistance: 50,
          homeAdvantage: 5,
        });
      }

      const upgrades = await storage.getStadiumUpgrades(stadium.id);
      const events = await storage.getStadiumEvents(stadium.id);

      res.json({
        stadium,
        upgrades,
        events,
        availableUpgrades: getAvailableUpgrades(stadium)
      });
    } catch (error) {
      console.error("Error fetching stadium:", error);
      res.status(500).json({ message: "Failed to fetch stadium" });
    }
  });

  app.post('/api/stadium/upgrade', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { upgradeType, upgradeName } = req.body;
      
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const stadium = await storage.getTeamStadium(team.id);
      if (!stadium) {
        return res.status(404).json({ message: "Stadium not found" });
      }

      const finances = await storage.getTeamFinances(team.id);
      if (!finances) {
        return res.status(404).json({ message: "Team finances not found" });
      }

      const upgrade = getUpgradeDetails(upgradeType, upgradeName, stadium);
      if (!upgrade) {
        return res.status(400).json({ message: "Invalid upgrade" });
      }

      if ((finances.credits || 0) < upgrade.cost) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Apply upgrade
      await storage.createFacilityUpgrade({
        stadiumId: stadium.id,
        upgradeType,
        name: upgradeName,
        description: upgrade.description,
        cost: upgrade.cost,
        effect: upgrade.effect,
      });

      // Update stadium stats
      const updatedStats = applyUpgradeEffect(stadium, upgrade.effect);
      await storage.updateStadium(stadium.id, updatedStats);

      // Deduct cost
      await storage.updateTeamFinances(team.id, {
        credits: (finances.credits || 0) - upgrade.cost
      });

      res.json({ message: "Stadium upgraded successfully", upgrade });
    } catch (error) {
      console.error("Error upgrading stadium:", error);
      res.status(500).json({ message: "Failed to upgrade stadium" });
    }
  });

  app.post('/api/stadium/event', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { eventType, name, eventDate } = req.body;
      
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const stadium = await storage.getTeamStadium(team.id);
      if (!stadium) {
        return res.status(404).json({ message: "Stadium not found" });
      }

      const eventDetails = generateEventDetails(eventType, stadium);
      
      const event = await storage.createStadiumEvent({
        stadiumId: stadium.id,
        eventType,
        name,
        revenue: eventDetails.revenue,
        cost: eventDetails.cost,
        attendees: eventDetails.attendees,
        eventDate: new Date(eventDate),
        duration: eventDetails.duration,
        status: "scheduled",
      });

      res.json({ event, message: "Event scheduled successfully" });
    } catch (error) {
      console.error("Error creating stadium event:", error);
      res.status(500).json({ message: "Failed to create stadium event" });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationRead(id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch('/api/notifications/mark-all-read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete('/api/notifications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteNotification(id);
      res.json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  app.delete('/api/notifications-delete-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteAllNotifications(userId);
      res.json({ message: "All notifications deleted" });
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      res.status(500).json({ message: "Failed to delete all notifications" });
    }
  });

  // Demo route to create sample notifications  
  app.post('/api/demo/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Create demo notifications using direct storage calls
      await storage.createNotification({
        id: `demo-${Date.now()}-1`,
        userId,
        type: "match",
        title: "League Game Starting Soon",
        message: "League game starts in 10 minutes",
        priority: "medium",
        actionUrl: "/match/demo-match-1",
        metadata: { matchId: "demo-match-1", type: "match_starting" },
        isRead: false,
        createdAt: new Date(),
      });

      await storage.createNotification({
        id: `demo-${Date.now()}-2`,
        userId,
        type: "match",
        title: "League Game Complete",
        message: "League game complete, see the result!",
        priority: "medium",
        actionUrl: "/match/demo-match-2",
        metadata: { 
          matchId: "demo-match-2", 
          homeScore: 3, 
          awayScore: 1, 
          type: "match_complete",
          resultHidden: true 
        },
        isRead: false,
        createdAt: new Date(),
      });

      await storage.createNotification({
        id: `demo-${Date.now()}-3`,
        userId,
        type: "tournament",
        title: "Tournament Starting Soon",
        message: "Tournament filled and starts in 10 minutes",
        priority: "high",
        actionUrl: "/tournaments",
        metadata: { division: 1, event: "tournament_filled", minutesUntilStart: 10 },
        isRead: false,
        createdAt: new Date(),
      });

      await storage.createNotification({
        id: `demo-${Date.now()}-4`,
        userId,
        type: "auction",
        title: "Outbid!",
        message: "You've been outbid on Marcus Swift. New bid: $45,000",
        priority: "medium",
        actionUrl: "/marketplace/auction/demo-auction-1",
        metadata: { auctionId: "demo-auction-1", playerName: "Marcus Swift", newBidAmount: 45000 },
        isRead: false,
        createdAt: new Date(),
      });

      await storage.createNotification({
        id: `demo-${Date.now()}-5`,
        userId,
        type: "injury",
        title: "Player Injured",
        message: "Kai Thunderstrike has suffered a moderate hamstring strain",
        priority: "medium",
        actionUrl: "/injuries",
        metadata: { teamId: team.id, playerName: "Kai Thunderstrike", injuryType: "hamstring strain", severity: 5 },
        isRead: false,
        createdAt: new Date(),
      });

      await storage.createNotification({
        id: `demo-${Date.now()}-6`,
        userId,
        type: "achievement",
        title: "Achievement Unlocked!",
        message: "First Victory: Win your first league match",
        priority: "medium",
        actionUrl: "/achievements",
        metadata: { achievementName: "First Victory" },
        isRead: false,
        createdAt: new Date(),
      });

      res.json({ message: "Demo notifications created successfully!" });
    } catch (error) {
      console.error("Error creating demo notifications:", error);
      res.status(500).json({ message: "Failed to create demo notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const notificationId = req.params.id;
      await storage.markNotificationRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Injury routes
  app.get('/api/injuries/team/:teamId', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = req.params.teamId;
      const players = await storage.getPlayersByTeamId(teamId);
      
      const injuries = [];
      for (const player of players) {
        const playerInjuries = await storage.getPlayerInjuries(player.id);
        injuries.push(...playerInjuries.map(injury => ({
          ...injury,
          player: {
            id: player.id,
            name: player.name,
            race: player.race,
            position: player.position
          }
        })));
      }
      
      res.json(injuries);
    } catch (error) {
      console.error("Error fetching team injuries:", error);
      res.status(500).json({ message: "Failed to fetch team injuries" });
    }
  });

  app.post('/api/injuries/:id/treat', isAuthenticated, async (req: any, res) => {
    try {
      const injuryId = req.params.id;
      const { treatmentType } = req.body;

      const injury = await storage.updateInjury(injuryId, {
        treatmentType,
        recoveryProgress: Math.min(100, (injury?.recoveryProgress || 0) + 25)
      });

      res.json(injury);
    } catch (error) {
      console.error("Error treating injury:", error);
      res.status(500).json({ message: "Failed to treat injury" });
    }
  });

  // Stadium routes
  app.get('/api/stadium', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      let stadium = await storage.getTeamStadium(team.id);
      
      // Create default stadium if none exists
      if (!stadium) {
        stadium = await storage.createStadium({
          teamId: team.id,
          name: `${team.name} Arena`,
          capacity: 25000,
          level: 1,
          atmosphere: 50,
          facilities: JSON.stringify({
            concessions: 1,
            parking: 1,
            training: 1,
            medical: 1,
            security: 1
          }),
          revenueMultiplier: 1.0,
          maintenanceCost: 5000
        });
      }

      const upgrades = await storage.getStadiumUpgrades(stadium.id);
      const events = await storage.getStadiumEvents(stadium.id);

      res.json({
        stadium,
        upgrades,
        events,
        availableUpgrades: getAvailableUpgrades(stadium)
      });
    } catch (error) {
      console.error("Error fetching stadium:", error);
      res.status(500).json({ message: "Failed to fetch stadium" });
    }
  });

  app.post('/api/stadium/upgrade', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const { upgradeType, upgradeName } = req.body;
      const stadium = await storage.getTeamStadium(team.id);
      if (!stadium) {
        return res.status(404).json({ message: "Stadium not found" });
      }

      const upgradeDetails = getUpgradeDetails(upgradeType, upgradeName, stadium);
      if (!upgradeDetails) {
        return res.status(400).json({ message: "Invalid upgrade" });
      }

      const finances = await storage.getTeamFinances(team.id);
      if (!finances || (finances.credits || 0) < upgradeDetails.cost) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Deduct cost and apply upgrade
      await storage.updateTeamFinances(team.id, {
        credits: (finances.credits || 0) - upgradeDetails.cost
      });

      await storage.createFacilityUpgrade({
        stadiumId: stadium.id,
        upgradeType,
        upgradeName,
        cost: upgradeDetails.cost,
        effect: JSON.stringify(upgradeDetails.effect),
        completedAt: new Date()
      });

      // Apply upgrade effects to stadium
      const updatedStadium = await applyUpgradeEffect(stadium, upgradeDetails.effect);

      res.json({
        success: true,
        message: `${upgradeName} upgrade completed!`,
        stadium: updatedStadium
      });
    } catch (error) {
      console.error("Error upgrading stadium:", error);
      res.status(500).json({ message: "Failed to upgrade stadium" });
    }
  });

  app.post('/api/stadium/event', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const { eventType } = req.body;
      const stadium = await storage.getTeamStadium(team.id);
      if (!stadium) {
        return res.status(404).json({ message: "Stadium not found" });
      }

      const eventDetails = generateEventDetails(eventType, stadium);
      
      const event = await storage.createStadiumEvent({
        stadiumId: stadium.id,
        eventType,
        eventName: eventDetails.name,
        description: eventDetails.description,
        cost: eventDetails.cost,
        revenue: eventDetails.revenue,
        attendees: eventDetails.attendees,
        eventDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        status: "scheduled"
      });

      res.json({
        success: true,
        message: `${eventDetails.name} scheduled successfully!`,
        event
      });
    } catch (error) {
      console.error("Error creating stadium event:", error);
      res.status(500).json({ message: "Failed to create stadium event" });
    }
  });

  // ===== SEASON CHAMPIONSHIPS & PLAYOFFS ROUTES =====
  
  // Get current season
  app.get("/api/seasons/current", async (req, res) => {
    try {
      const season = await storage.getCurrentSeason();
      res.json(season || {});
    } catch (error) {
      console.error("Error fetching current season:", error);
      res.status(500).json({ message: "Failed to fetch current season" });
    }
  });

  // Get championship history
  app.get("/api/seasons/champions", async (req, res) => {
    try {
      const history = await storage.getChampionshipHistory();
      res.json(history);
    } catch (error) {
      console.error("Error fetching championship history:", error);
      res.status(500).json({ message: "Failed to fetch championship history" });
    }
  });

  // Get playoffs by division
  app.get("/api/playoffs/:division", async (req, res) => {
    try {
      const division = parseInt(req.params.division);
      const season = await storage.getCurrentSeason();
      if (!season) {
        return res.json([]);
      }
      const playoffs = await storage.getPlayoffsByDivision(season.id, division);
      res.json(playoffs);
    } catch (error) {
      console.error("Error fetching playoffs:", error);
      res.status(500).json({ message: "Failed to fetch playoffs" });
    }
  });

  // Start playoffs for a season
  app.post("/api/seasons/:seasonId/playoffs/start", isAuthenticated, async (req, res) => {
    try {
      const { seasonId } = req.params;
      const { division } = req.body;
      
      // Generate playoff bracket for the division - Final 4 teams only
      const teams = await storage.getTeamsByDivision(division);
      const sortedTeams = teams.sort((a, b) => {
        // Sort by wins, then by points differential, then by total points scored
        const aWins = a.wins || 0;
        const bWins = b.wins || 0;
        if (aWins !== bWins) return bWins - aWins;
        
        const aPointsDiff = (a.pointsFor || 0) - (a.pointsAgainst || 0);
        const bPointsDiff = (b.pointsFor || 0) - (b.pointsAgainst || 0);
        if (aPointsDiff !== bPointsDiff) return bPointsDiff - aPointsDiff;
        
        return (b.pointsFor || 0) - (a.pointsFor || 0);
      });
      
      const topTeams = sortedTeams.slice(0, 4); // Final 4 teams make tournament
      
      // Create semifinals: #1 vs #4, #2 vs #3
      const playoffMatches = [
        {
          seasonId,
          division,
          round: 1, // Semifinal
          team1Id: topTeams[0].id,
          team2Id: topTeams[3].id,
          status: "pending",
          matchName: "Semifinal 1",
        },
        {
          seasonId,
          division,
          round: 1, // Semifinal
          team1Id: topTeams[1].id,
          team2Id: topTeams[2].id,
          status: "pending",
          matchName: "Semifinal 2",
        }
      ];

      for (const match of playoffMatches) {
        await storage.createPlayoffMatch(match);
      }

      res.json({ message: "Playoffs started successfully" });
    } catch (error) {
      console.error("Error starting playoffs:", error);
      res.status(500).json({ message: "Failed to start playoffs" });
    }
  });

  // ===== CONTRACT SYSTEM ROUTES =====

  // Get team contracts
  app.get("/api/contracts/:teamId", async (req, res) => {
    try {
      const { teamId } = req.params;
      const contracts = await storage.getTeamContracts(teamId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  // Get team salary cap
  app.get("/api/salary-cap/:teamId", async (req, res) => {
    try {
      const { teamId } = req.params;
      const salaryCap = await storage.getTeamSalaryCap(teamId);
      res.json(salaryCap || {});
    } catch (error) {
      console.error("Error fetching salary cap:", error);
      res.status(500).json({ message: "Failed to fetch salary cap" });
    }
  });

  // Negotiate new contract
  app.post("/api/contracts/negotiate", isAuthenticated, async (req, res) => {
    try {
      const contractData = {
        ...req.body,
        signedDate: new Date(),
        expiryDate: new Date(Date.now() + (req.body.duration * 365 * 24 * 60 * 60 * 1000)),
        remainingYears: req.body.duration,
      };
      const contract = await storage.createPlayerContract(contractData);
      
      // Update salary cap
      await storage.updateSalaryCap(req.body.teamId, {
        totalSalary: 0, // Will be recalculated
      });

      res.json(contract);
    } catch (error) {
      console.error("Error negotiating contract:", error);
      res.status(500).json({ message: "Failed to negotiate contract" });
    }
  });

  // Renew contract
  app.post("/api/contracts/:contractId/renew", isAuthenticated, async (req, res) => {
    try {
      const { contractId } = req.params;
      const newTerms = {
        ...req.body,
        remainingYears: req.body.duration,
        expiryDate: new Date(Date.now() + (req.body.duration * 365 * 24 * 60 * 60 * 1000)),
      };
      const contract = await storage.renewContract(contractId, newTerms);
      res.json(contract);
    } catch (error) {
      console.error("Error renewing contract:", error);
      res.status(500).json({ message: "Failed to renew contract" });
    }
  });

  // Release player contract
  app.delete("/api/contracts/:contractId/release", isAuthenticated, async (req, res) => {
    try {
      const { contractId } = req.params;
      await storage.releasePlayerContract(contractId);
      res.json({ message: "Player released successfully" });
    } catch (error) {
      console.error("Error releasing player:", error);
      res.status(500).json({ message: "Failed to release player" });
    }
  });

  // Get contract templates
  app.get("/api/contracts/templates", async (req, res) => {
    try {
      const templates = [
        { id: "1", name: "Rookie Deal", type: "rookie", duration: 4, avgSalary: 2000000, description: "Standard rookie contract" },
        { id: "2", name: "Veteran Minimum", type: "veteran", duration: 1, avgSalary: 1500000, description: "Minimum veteran salary" },
        { id: "3", name: "Star Player", type: "standard", duration: 5, avgSalary: 15000000, description: "Max contract for elite players" },
        { id: "4", name: "Role Player", type: "standard", duration: 3, avgSalary: 5000000, description: "Mid-tier player contract" },
      ];
      res.json(templates);
    } catch (error) {
      console.error("Error fetching contract templates:", error);
      res.status(500).json({ message: "Failed to fetch contract templates" });
    }
  });

  // ===== SPONSORSHIP SYSTEM ROUTES =====

  // Get team sponsorships
  app.get("/api/sponsorships/:teamId", async (req, res) => {
    try {
      const { teamId } = req.params;
      const sponsorships = await storage.getTeamSponsorships(teamId);
      res.json(sponsorships);
    } catch (error) {
      console.error("Error fetching sponsorships:", error);
      res.status(500).json({ message: "Failed to fetch sponsorships" });
    }
  });

  // Get stadium revenue
  app.get("/api/stadium/revenue/:teamId", async (req, res) => {
    try {
      const { teamId } = req.params;
      const revenue = await storage.getStadiumRevenue(teamId);
      res.json(revenue);
    } catch (error) {
      console.error("Error fetching stadium revenue:", error);
      res.status(500).json({ message: "Failed to fetch stadium revenue" });
    }
  });

  // Negotiate sponsorship deal
  app.post("/api/sponsorships/negotiate", isAuthenticated, async (req, res) => {
    try {
      const dealData = {
        ...req.body,
        signedDate: new Date(),
        expiryDate: new Date(Date.now() + (req.body.duration * 365 * 24 * 60 * 60 * 1000)),
        remainingYears: req.body.duration,
        status: "active",
      };
      const deal = await storage.createSponsorshipDeal(dealData);
      res.json(deal);
    } catch (error) {
      console.error("Error negotiating sponsorship:", error);
      res.status(500).json({ message: "Failed to negotiate sponsorship" });
    }
  });

  // Renew sponsorship deal
  app.post("/api/sponsorships/:dealId/renew", isAuthenticated, async (req, res) => {
    try {
      const { dealId } = req.params;
      const newTerms = {
        ...req.body,
        remainingYears: req.body.duration,
        expiryDate: new Date(Date.now() + (req.body.duration * 365 * 24 * 60 * 60 * 1000)),
      };
      const deal = await storage.renewSponsorshipDeal(dealId, newTerms);
      res.json(deal);
    } catch (error) {
      console.error("Error renewing sponsorship:", error);
      res.status(500).json({ message: "Failed to renew sponsorship" });
    }
  });

  // Upgrade stadium
  app.post("/api/stadium/upgrade", isAuthenticated, async (req, res) => {
    try {
      const { teamId, cost, revenue } = req.body;
      
      // Update stadium revenue potential
      await storage.updateStadiumRevenue(teamId, {
        totalRevenue: revenue,
      });

      res.json({ message: "Stadium upgraded successfully" });
    } catch (error) {
      console.error("Error upgrading stadium:", error);
      res.status(500).json({ message: "Failed to upgrade stadium" });
    }
  });

  // Get available sponsors
  app.get("/api/sponsorships/available", async (req, res) => {
    try {
      const sponsors = [
        { id: "1", name: "TechCorp", industry: "Technology", maxValue: 5000000, preferredDealType: "jersey", minDuration: 2, interestLevel: 8 },
        { id: "2", name: "SportsDrink Co", industry: "Beverage", maxValue: 3000000, preferredDealType: "stadium", minDuration: 3, interestLevel: 9 },
        { id: "3", name: "AutoMotive Inc", industry: "Automotive", maxValue: 8000000, preferredDealType: "naming_rights", minDuration: 5, interestLevel: 7 },
        { id: "4", name: "FoodChain", industry: "Restaurant", maxValue: 2000000, preferredDealType: "equipment", minDuration: 1, interestLevel: 6 },
      ];
      res.json(sponsors);
    } catch (error) {
      console.error("Error fetching available sponsors:", error);
      res.status(500).json({ message: "Failed to fetch available sponsors" });
    }
  });



  // ===== MATCH SIMULATION & ANIMATION ROUTES =====

  // Get match simulation data with animations
  // REMOVED: Live match simulation - replaced with text-based system
  app.get("/api/matches/:matchId/simulation", async (req, res) => {
    // This endpoint is deprecated - text-based simulation handles match viewing
    res.status(410).json({ message: "Live simulation removed - use text-based matches instead" });
  });

  // Original simulation endpoint for reference (to be removed)
  app.get("/api/matches/:matchId/simulation-old", async (req, res) => {
    try {
      const { matchId } = req.params;
      
      // Handle demo match
      if (matchId === "demo-match-1") {
        const demoMatch = {
          id: "demo-match-1",
          team1Id: "demo-team-1",
          team2Id: "demo-team-2",
          team1Score: 14,
          team2Score: 7,
          status: "live",
          quarter: 2,
          timeRemaining: 720,
          lastPlay: "Touchdown by Grimjaw the Orc!"
        };
        
        const simulationData = {
          ...demoMatch,
          team1: {
            id: "demo-team-1",
            name: "Thunder Orcs",
            logo: "🏈",
            score: 14,
            players: [
              {
                id: "p1",
                name: "Grimjaw",
                race: "Orc",
                position: "Blitzer",
                overall: 85,
                fatigue: 35,
                health: 90,
                isInjured: false,
                abilities: ["Mighty Blow", "Block"],
                stats: { rushing: 45, passing: 12, receiving: 8, tackles: 12, interceptions: 1 }
              },
              {
                id: "p2", 
                name: "Smasher",
                race: "Orc",
                position: "Black Orc",
                overall: 78,
                fatigue: 45,
                health: 95,
                isInjured: false,
                abilities: ["Block"],
                stats: { rushing: 23, passing: 2, receiving: 1, tackles: 18, interceptions: 0 }
              },
              {
                id: "p3",
                name: "Speedfang",
                race: "Goblin",
                position: "Runner",
                overall: 72,
                fatigue: 25,
                health: 65,
                isInjured: true,
                abilities: ["Dodge", "Sure Hands"],
                stats: { rushing: 67, passing: 34, receiving: 23, tackles: 3, interceptions: 2 }
              }
            ]
          },
          team2: {
            id: "demo-team-2",
            name: "Elite Elves",
            logo: "🏹",
            score: 7,
            players: [
              {
                id: "p4",
                name: "Silverwing",
                race: "Elf",
                position: "Thrower",
                overall: 82,
                fatigue: 20,
                health: 85,
                isInjured: false,
                abilities: ["Pass", "Accurate"],
                stats: { rushing: 12, passing: 78, receiving: 15, tackles: 4, interceptions: 0 }
              },
              {
                id: "p5",
                name: "Moonrunner",
                race: "Elf",
                position: "Catcher",
                overall: 79,
                fatigue: 30,
                health: 80,
                isInjured: false,
                abilities: ["Catch", "Dodge"],
                stats: { rushing: 34, passing: 8, receiving: 56, tackles: 2, interceptions: 1 }
              },
              {
                id: "p6",
                name: "Ironleaf",
                race: "Elf",
                position: "Lineman",
                overall: 68,
                fatigue: 55,
                health: 70,
                isInjured: false,
                abilities: [],
                stats: { rushing: 15, passing: 5, receiving: 12, tackles: 8, interceptions: 0 }
              }
            ]
          },
          currentQuarter: 2,
          timeRemaining: 720,
          possession: "demo-team-1",
          lastPlay: "Touchdown by Grimjaw the Orc!",
          stadium: "Bloodbowl Arena",
          weather: "Perfect conditions",
          gameEvents: []
        };
        
        return res.json(simulationData);
      }
      
      const match = await storage.getMatchById(matchId);
      
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Get actual team data
      const team1 = await storage.getTeamById(match.team1Id);
      const team2 = await storage.getTeamById(match.team2Id);
      const team1Players = await storage.getPlayersByTeamId(match.team1Id);
      const team2Players = await storage.getPlayersByTeamId(match.team2Id);

      // For exhibition matches, use proper timing (10-minute halves)
      const isExhibition = match.matchType === "exhibition";
      const maxTime = isExhibition ? 600 : 900; // 10 minutes for exhibition, 15 for regular
      let currentQuarter = match.quarter || 1;
      let timeRemaining = match.timeRemaining !== undefined ? match.timeRemaining : maxTime;
      
      // For exhibition: 1st half = 0:00-10:00, 2nd half = 10:00-20:00
      let displayTime = 0;
      if (isExhibition) {
        // Real-time compression: 20 game minutes (1200 seconds) in 6 real minutes (360 seconds)
        // So 1 real second = 1200/360 = 3.33 game seconds
        const matchStartTime = new Date(match.createdAt).getTime();
        const realTimeElapsed = Math.floor((Date.now() - matchStartTime) / 1000);
        // Apply 3.33x compression factor consistently
        const gameTimeElapsed = Math.min(Math.floor(realTimeElapsed * 3.333333), 1200);
        
        displayTime = gameTimeElapsed;
        
        // Update current quarter based on elapsed game time
        if (gameTimeElapsed >= 600) { // After 10 minutes (600 seconds)
          currentQuarter = 2;
        } else {
          currentQuarter = 1;
        }
        
        // Calculate time remaining in current half
        if (currentQuarter === 1) {
          timeRemaining = Math.max(0, 600 - gameTimeElapsed); // First half
        } else {
          timeRemaining = Math.max(0, 1200 - gameTimeElapsed); // Second half
        }
        
        // When time is up, end the match
        if (gameTimeElapsed >= 1200) {
          await storage.updateMatch(match.id, {
            status: "completed",
            timeRemaining: 0,
            quarter: 2
          });
          return res.json({ message: "Match completed" });
        }
      } else {
        displayTime = maxTime - timeRemaining;
      }

      const simulationData = {
        ...match,
        homeTeamName: team1?.name || "Home",
        awayTeamName: team2?.name || "Away",
        currentQuarter: currentQuarter,
        timeRemaining: Math.max(0, timeRemaining),
        displayTime: displayTime,
        team1: {
          id: match.team1Id,
          name: team1?.name || "Home",
          score: match.team1Score || 0,
          players: team1Players.slice(0, 6).map(player => ({
            ...player,
            displayName: player.lastName || player.firstName || (player.name && player.name.includes(' ') ? player.name.split(' ').slice(-1)[0] : player.name) || `P${Math.floor(Math.random() * 99)}`,
            fatigue: Math.random() * 100,
            health: 80 + Math.random() * 20,
            isInjured: Math.random() < 0.1,
            stats: {
              rushing: Math.floor(Math.random() * 100),
              passing: Math.floor(Math.random() * 100),
              receiving: Math.floor(Math.random() * 100),
              tackles: Math.floor(Math.random() * 20),
              interceptions: Math.floor(Math.random() * 5),
            }
          }))
        },
        team2: {
          id: match.team2Id,
          name: team2?.name || "Away",
          score: match.team2Score || 0,
          players: team2Players.slice(0, 6).map(player => ({
            ...player,
            displayName: player.lastName || player.firstName || (player.name && player.name.includes(' ') ? player.name.split(' ').slice(-1)[0] : player.name) || `D${Math.floor(Math.random() * 99)}`,
            fatigue: Math.random() * 100,
            health: 80 + Math.random() * 20,
            isInjured: Math.random() < 0.1,
            stats: {
              rushing: Math.floor(Math.random() * 100),
              passing: Math.floor(Math.random() * 100),
              receiving: Math.floor(Math.random() * 100),
              tackles: Math.floor(Math.random() * 20),
              interceptions: Math.floor(Math.random() * 5),
            }
          }))
        },
        maxTime,
        isExhibition,
        possession: Math.random() < 0.5 ? match.team1Id : match.team2Id,
        lastPlay: generateGameplayEvent(team1Players, team2Players),
        stadium: isExhibition ? "Exhibition Arena" : "Fantasy Stadium",
        weather: "Clear skies",
        gameEvents: []
      };

      res.json(simulationData);
    } catch (error) {
      console.error("Error fetching match simulation:", error);
      res.status(500).json({ message: "Failed to fetch match simulation" });
    }
  });

  // Helper function to generate realistic gameplay events
  function generateGameplayEvent(team1Players: any[], team2Players: any[]): string {
    const events = [
      // Runner events
      () => {
        const runner = [...team1Players, ...team2Players].find(p => p.role === 'runner');
        return runner ? `${runner.lastName || runner.name} breaks through the defense!` : "Runner charging forward!";
      },
      // Passer events
      () => {
        const passer = [...team1Players, ...team2Players].find(p => p.role === 'passer');
        return passer ? `${passer.lastName || passer.name} looks for an opening to pass!` : "Quarterback scanning the field!";
      },
      // Blocker events
      () => {
        const blocker = [...team1Players, ...team2Players].find(p => p.role === 'blocker');
        return blocker ? `${blocker.lastName || blocker.name} delivers a crushing block!` : "Massive collision in the trenches!";
      },
      // General events
      () => "Players clash in the center of the arena!",
      () => "Intense battle for field position!",
      () => "The crowd roars as action intensifies!"
    ];
    
    return events[Math.floor(Math.random() * events.length)]();
  }

  // Simulate a single play
  app.post("/api/matches/:matchId/simulate-play", isAuthenticated, async (req, res) => {
    try {
      const { matchId } = req.params;
      const { speed = 1 } = req.body;
      
      const match = await storage.getMatchById(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Generate random game events based on simulation
      const eventTypes = [
        'skill', 'fatigue', 'knockdown', 'pushback', 'celebration',
        'throwing', 'catching', 'fumble', 'injury', 'running',
        'tackle', 'block', 'dodge', 'interception', 'touchdown'
      ];

      const players = await storage.getPlayersByTeamId(match.team1Id);
      const allPlayers = [...players, ...(await storage.getPlayersByTeamId(match.team2Id))];
      
      const events = [];
      const numEvents = Math.floor(Math.random() * 3) + 1; // 1-3 events per play

      for (let i = 0; i < numEvents; i++) {
        const randomPlayer = allPlayers[Math.floor(Math.random() * allPlayers.length)];
        const randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        
        events.push({
          id: `event-${Date.now()}-${i}`,
          type: randomEventType,
          playerId: randomPlayer.id,
          playerName: randomPlayer.name,
          playerRace: randomPlayer.race,
          description: generateEventDescription(randomEventType, randomPlayer.name),
          intensity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
          timestamp: Date.now(),
          position: {
            x: Math.random() * 800,
            y: Math.random() * 400
          },
          quarter: match.quarter || 1,
          gameTime: match.timeRemaining || 900
        });
      }

      // Update match time and potentially score
      const newTimeRemaining = Math.max(0, (match.timeRemaining || 900) - (30 * speed));
      let newQuarter = match.quarter || 1;
      let finalTime = newTimeRemaining;

      if (newTimeRemaining === 0 && newQuarter < 4) {
        newQuarter += 1;
        finalTime = 900; // Reset to 15 minutes
      }

      // Chance for scoring
      let team1Score = match.team1Score || 0;
      let team2Score = match.team2Score || 0;
      let newStatus = match.status;

      if (events.some(e => e.type === 'touchdown')) {
        if (Math.random() < 0.5) {
          team1Score += 7;
        } else {
          team2Score += 7;
        }
      }

      // Handle game completion and overtime
      if (newQuarter > 4 && finalTime === 0) {
        if (team1Score === team2Score) {
          newStatus = 'overtime';
          newQuarter = 5; // Overtime quarter
          finalTime = 900;
        } else {
          newStatus = 'completed';
        }
      }

      // Update match in database
      await storage.updateMatch(matchId, {
        quarter: newQuarter,
        timeRemaining: finalTime,
        team1Score,
        team2Score,
        status: newStatus,
        lastPlay: events[0]?.description || "Play completed"
      });

      res.json({
        events,
        matchUpdate: {
          quarter: newQuarter,
          timeRemaining: finalTime,
          team1Score,
          team2Score,
          status: newStatus
        }
      });
    } catch (error) {
      console.error("Error simulating play:", error);
      res.status(500).json({ message: "Failed to simulate play" });
    }
  });

  // Reset match simulation
  app.post("/api/matches/:matchId/reset", isAuthenticated, async (req, res) => {
    try {
      const { matchId } = req.params;
      
      await storage.updateMatch(matchId, {
        quarter: 1,
        timeRemaining: 900,
        team1Score: 0,
        team2Score: 0,
        status: 'pending',
        lastPlay: null
      });

      res.json({ message: "Match reset successfully" });
    } catch (error) {
      console.error("Error resetting match:", error);
      res.status(500).json({ message: "Failed to reset match" });
    }
  });

  // Tournament bracket with tie-breaking
  app.get("/api/tournaments/:division/bracket", async (req, res) => {
    try {
      const division = parseInt(req.params.division);
      const teams = await storage.getTeamsByDivision(division);
      
      // Advanced tie-breaking system
      const sortedTeams = teams.sort((a, b) => {
        // 1. Most wins
        const aWins = a.wins || 0;
        const bWins = b.wins || 0;
        if (aWins !== bWins) return bWins - aWins;
        
        // 2. Head-to-head record (simulated for now)
        const headToHead = Math.random() - 0.5;
        if (Math.abs(headToHead) > 0.3) return headToHead > 0 ? -1 : 1;
        
        // 3. Point differential
        const aPointsDiff = (a.points || 0) - ((a.points || 0) * 0.8); // Simulated points against
        const bPointsDiff = (b.points || 0) - ((b.points || 0) * 0.8);
        if (Math.abs(aPointsDiff - bPointsDiff) > 10) return bPointsDiff - aPointsDiff;
        
        // 4. Total points scored
        const aTotal = a.points || 0;
        const bTotal = b.points || 0;
        if (aTotal !== bTotal) return bTotal - aTotal;
        
        // 5. Strength of schedule (simulated)
        const aStrength = Math.random() * 100;
        const bStrength = Math.random() * 100;
        if (Math.abs(aStrength - bStrength) > 5) return bStrength - aStrength;
        
        // 6. Random tiebreaker (coin flip)
        return Math.random() - 0.5;
      });

      const topFour = sortedTeams.slice(0, 4);
      
      const bracket = {
        semifinals: [
          {
            id: 'semi1',
            name: 'Semifinal 1',
            team1: topFour[0],
            team2: topFour[3],
            seed1: 1,
            seed2: 4,
            status: 'pending'
          },
          {
            id: 'semi2',
            name: 'Semifinal 2',
            team1: topFour[1],
            team2: topFour[2],
            seed1: 2,
            seed2: 3,
            status: 'pending'
          }
        ],
        final: {
          id: 'final',
          name: 'Championship',
          team1: null,
          team2: null,
          status: 'pending'
        },
        tieBreakingRules: [
          "1. Head-to-head record",
          "2. Point differential",
          "3. Total points scored",
          "4. Strength of schedule",
          "5. Coin flip"
        ]
      };

      res.json(bracket);
    } catch (error) {
      console.error("Error generating tournament bracket:", error);
      res.status(500).json({ message: "Failed to generate tournament bracket" });
    }
  });

  function generateEventDescription(eventType: string, playerName: string): string {
    const descriptions = {
      skill: `${playerName} activates special ability!`,
      fatigue: `${playerName} shows signs of fatigue`,
      knockdown: `${playerName} gets knocked to the ground!`,
      pushback: `${playerName} forces opponent backward`,
      celebration: `${playerName} celebrates an amazing play!`,
      throwing: `${playerName} launches a precise throw`,
      catching: `${playerName} makes a spectacular catch`,
      fumble: `${playerName} loses control of the ball!`,
      injury: `${playerName} suffers an injury on the play`,
      running: `${playerName} breaks through the defense`,
      tackle: `${playerName} brings down the ball carrier`,
      block: `${playerName} delivers a crushing block`,
      dodge: `${playerName} evades the tackle attempt`,
      interception: `${playerName} steals the ball away!`,
      touchdown: `${playerName} scores a magnificent touchdown!`
    };
    
    return descriptions[eventType] || `${playerName} makes a play`;
  }

  // ===== SERVER TIME & SCHEDULING ROUTES =====

  // Get server time information
  app.get('/api/server/time', (req, res) => {
    try {
      const serverTime = getServerTimeInfo();
      res.json(serverTime);
    } catch (error) {
      console.error("Error getting server time:", error);
      res.status(500).json({ message: "Failed to get server time" });
    }
  });

  // Get next available league game slot
  app.get('/api/league/next-slot', (req, res) => {
    try {
      const nextSlot = getNextLeagueGameSlot();
      res.json({
        nextSlot: nextSlot ? formatEasternTime(nextSlot) : null,
        nextSlotDate: nextSlot,
        isWithinWindow: isWithinSchedulingWindow(),
        schedulingWindow: `${LEAGUE_GAME_START_HOUR}:00-${LEAGUE_GAME_END_HOUR}:00 Eastern`
      });
    } catch (error) {
      console.error("Error getting next league slot:", error);
      res.status(500).json({ message: "Failed to get next league slot" });
    }
  });

  // Generate league game schedule
  app.post('/api/league/schedule', (req, res) => {
    try {
      const { numberOfGames, startDate } = req.body;
      const games = numberOfGames || 1;
      const schedule = generateLeagueGameSchedule(games, startDate ? new Date(startDate) : undefined);
      
      res.json({
        schedule: schedule.map(date => ({
          scheduledTime: formatEasternTime(date),
          scheduledDate: date,
          isWithinWindow: true
        })),
        totalGames: games,
        schedulingWindow: `${LEAGUE_GAME_START_HOUR}:00-${LEAGUE_GAME_END_HOUR}:00 Eastern`
      });
    } catch (error) {
      console.error("Error generating league schedule:", error);
      res.status(500).json({ message: "Failed to generate league schedule" });
    }
  });

  // Get daily league schedule
  app.get('/api/league/daily-schedule', async (req, res) => {
    try {
      const currentSeason = await storage.getCurrentSeason();
      if (!currentSeason) {
        return res.json({ schedule: [] });
      }

      // Get all league matches, grouped by day
      const allMatches = [];
      for (let division = 1; division <= 8; division++) {
        const divisionMatches = await storage.getMatchesByDivision(division);
        allMatches.push(...divisionMatches);
      }

      // Group matches by game day
      const scheduleByDay = {};
      
      for (let day = 1; day <= 17; day++) {
        const dayMatches = allMatches.filter(match => match.gameDay === day);
        
        if (dayMatches.length > 0) {
          // Generate 4 daily game times with 15-minute intervals
          const daySchedule = generateDailyGameTimes(day);
          
          scheduleByDay[day] = dayMatches.slice(0, 4).map((match, index) => ({
            ...match,
            scheduledTime: daySchedule[index],
            scheduledTimeFormatted: formatEasternTime(daySchedule[index]),
            isLive: match.status === 'in_progress',
            canWatch: match.status === 'in_progress'
          }));
        }
      }

      res.json({ 
        schedule: scheduleByDay,
        totalDays: 17,
        currentDay: currentSeason.currentDay
      });
    } catch (error) {
      console.error("Error getting daily schedule:", error);
      res.status(500).json({ message: "Failed to get daily schedule" });
    }
  });

  // ===== SUPERUSER ROUTES =====

  // Grant credits (SuperUser only)
  app.post('/api/superuser/grant-credits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      
      if (!team || team.name !== "Macomb Cougars") {
        return res.status(403).json({ message: "Unauthorized: SuperUser access required" });
      }

      const { credits = 50000, premiumCurrency = 100 } = req.body;

      // Get current finances
      const currentFinances = await storage.getTeamFinances(team.id);
      
      if (!currentFinances) {
        // Create new finances entry
        await storage.createTeamFinances({
          teamId: team.id,
          credits: credits,
          premiumCurrency: premiumCurrency,
          revenue: 0,
          expenses: 0,
          salaryCapUsed: 0,
          salaryCapLimit: 5000000
        });
      } else {
        // Add to existing credits
        await storage.updateTeamFinances(team.id, {
          credits: currentFinances.credits + credits,
          premiumCurrency: currentFinances.premiumCurrency + premiumCurrency
        });
      }
      
      res.json({ message: `${credits.toLocaleString()} regular credits and ${premiumCurrency} premium credits granted` });
    } catch (error) {
      console.error("Error granting credits:", error);
      res.status(500).json({ message: "Failed to grant credits" });
    }
  });

  // Advance week (SuperUser only)
  app.post('/api/superuser/advance-week', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      
      if (!team || team.name !== "Macomb Cougars") {
        return res.status(403).json({ message: "Unauthorized: SuperUser access required" });
      }

      res.json({ message: "Week advanced successfully" });
    } catch (error) {
      console.error("Error advancing week:", error);
      res.status(500).json({ message: "Failed to advance week" });
    }
  });

  // Start tournament (SuperUser only)
  app.post('/api/superuser/start-tournament', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      
      if (!team || team.name !== "Macomb Cougars") {
        return res.status(403).json({ message: "Unauthorized: SuperUser access required" });
      }

      const { division } = req.body;
      res.json({ message: `Tournament started for Division ${division}` });
    } catch (error) {
      console.error("Error starting tournament:", error);
      res.status(500).json({ message: "Failed to start tournament" });
    }
  });

  // Reset season (SuperUser only)
  app.post('/api/superuser/reset-season', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      
      if (!team || team.name !== "Macomb Cougars") {
        return res.status(403).json({ message: "Unauthorized: SuperUser access required" });
      }

      // Reset all teams' statistics across all divisions
      const divisions = [1, 2, 3, 4, 5, 6, 7, 8];
      let totalTeamsReset = 0;

      for (const division of divisions) {
        const teams = await storage.getTeamsByDivision(division);
        for (const team of teams) {
          await storage.updateTeam(team.id, {
            wins: 0,
            losses: 0,
            draws: 0,
            points: 0
          });
          totalTeamsReset++;
        }
      }

      res.json({ message: `Season reset successfully! Cleared statistics for ${totalTeamsReset} teams across all divisions.` });
    } catch (error) {
      console.error("Error resetting season:", error);
      res.status(500).json({ message: "Failed to reset season" });
    }
  });

  // Clean up division to 8 teams max (SuperUser only)
  app.post('/api/superuser/cleanup-division', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      
      if (!team || team.name !== "Macomb Cougars") {
        return res.status(403).json({ message: "Unauthorized: SuperUser access required" });
      }

      const { division } = req.body;
      if (!division || division < 1 || division > 8) {
        return res.status(400).json({ message: "Invalid division number. Must be 1-8." });
      }

      // Get all teams in the division
      const allTeams = await storage.getTeamsByDivision(division);
      console.log(`Found ${allTeams.length} teams in division ${division}`);

      if (allTeams.length <= 8) {
        return res.json({
          success: true,
          message: `Division ${division} already has ${allTeams.length} teams (within limit)`,
          teamsRemoved: 0,
          remainingTeams: allTeams.length
        });
      }

      // Debug: Log all team names for analysis
      console.log('All teams in division:', allTeams.map(t => `"${t.name}"`));
      
      // User teams are only those that don't match AI patterns - most teams are AI generated
      // AI teams have patterns like "Word Word Number" or specific AI team names
      const userTeams = allTeams.filter(t => {
        // Known user team - keep Macomb Cougars
        if (t.name === 'Macomb Cougars') return true;
        
        // AI patterns to identify:
        // 1. Any team name with format "Word Word Number" (like "Wind Falcons 26")
        // 2. Specific AI team base names with or without numbers
        const hasNumberPattern = /^[A-Za-z]+ [A-Za-z]+ \d+$/.test(t.name);
        const hasAIPrefix = t.name.includes('AI ') || t.name.includes('Team ');
        const isAITeamName = /^(Thunder Hawks|Storm Eagles|Fire Dragons|Ice Wolves|Lightning Bolts|Shadow Panthers|Golden Lions|Silver Sharks)( \d+)?$/.test(t.name);
        
        // If it matches any AI pattern, it's NOT a user team
        return !(hasNumberPattern || hasAIPrefix || isAITeamName);
      });
      
      const aiTeams = allTeams.filter(t => {
        // Inverse of user team logic - anything that's not a user team is AI
        if (t.name === 'Macomb Cougars') return false;
        
        const hasNumberPattern = /^[A-Za-z]+ [A-Za-z]+ \d+$/.test(t.name);
        const hasAIPrefix = t.name.includes('AI ') || t.name.includes('Team ');
        const isAITeamName = /^(Thunder Hawks|Storm Eagles|Fire Dragons|Ice Wolves|Lightning Bolts|Shadow Panthers|Golden Lions|Silver Sharks)( \d+)?$/.test(t.name);
        
        return hasNumberPattern || hasAIPrefix || isAITeamName;
      });
      
      console.log(`User teams: ${userTeams.length}, AI teams: ${aiTeams.length}`);

      // Keep user teams + enough AI teams to total 8
      const maxAiTeams = Math.max(0, 8 - userTeams.length);
      const aiTeamsToKeep = aiTeams.slice(0, maxAiTeams);
      const teamsToRemove = aiTeams.slice(maxAiTeams);

      console.log(`Removing ${teamsToRemove.length} AI teams to maintain 8 teams per division`);

      // Remove excess teams and their associated data
      for (const teamToRemove of teamsToRemove) {
        try {
          console.log(`Deleting team: ${teamToRemove.name} (${teamToRemove.id})`);
          
          // Delete all players for this team first (to handle foreign key constraints)
          await db.delete(players).where(eq(players.teamId, teamToRemove.id));
          console.log(`Deleted players for team ${teamToRemove.id}`);

          // Delete team staff (to handle foreign key constraints)
          try {
            await db.delete(staff).where(eq(staff.teamId, teamToRemove.id));
            console.log(`Deleted staff for team ${teamToRemove.id}`);
          } catch (error) {
            console.log(`No staff to delete for team ${teamToRemove.id}`);
          }

          // Delete team finances
          try {
            await db.delete(teamFinances).where(eq(teamFinances.teamId, teamToRemove.id));
            console.log(`Deleted finances for team ${teamToRemove.id}`);
          } catch (error) {
            console.log(`No finances to delete for team ${teamToRemove.id}`);
          }

          // Delete team matches
          try {
            await db.delete(matches).where(
              or(
                eq(matches.homeTeamId, teamToRemove.id),
                eq(matches.awayTeamId, teamToRemove.id)
              )
            );
            console.log(`Deleted matches for team ${teamToRemove.id}`);
          } catch (error) {
            console.log(`Error deleting matches for team ${teamToRemove.id}:`, error);
          }

          // Delete the team itself
          await db.delete(teams).where(eq(teams.id, teamToRemove.id));
          console.log(`Successfully deleted team: ${teamToRemove.name} (${teamToRemove.id})`);
        } catch (error) {
          console.error(`Failed to delete team ${teamToRemove.name}:`, error);
        }
      }

      const remainingTeams = await storage.getTeamsByDivision(division);
      
      res.json({
        success: true,
        message: `Division ${division} cleaned up successfully`,
        teamsRemoved: teamsToRemove.length,
        remainingTeams: remainingTeams.length,
        details: {
          userTeams: userTeams.length,
          aiTeamsKept: aiTeamsToKeep.length,
          aiTeamsRemoved: teamsToRemove.length,
          removedTeamNames: teamsToRemove.map(t => t.name)
        }
      });
    } catch (error) {
      console.error("Error cleaning up division:", error);
      res.status(500).json({ message: "Failed to clean up division" });
    }
  });

  // Stop all games (SuperUser only)
  app.post('/api/superuser/stop-all-games', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      
      if (!team || team.name !== "Macomb Cougars") {
        return res.status(403).json({ message: "Unauthorized: SuperUser access required" });
      }

      const liveMatches = await storage.getLiveMatches();
      let stoppedCount = 0;
      
      for (const match of liveMatches) {
        await storage.updateMatch(match.id, { status: "completed" });
        stoppedCount++;
      }

      res.json({ message: `Successfully stopped ${stoppedCount} live games` });
    } catch (error) {
      console.error("Error stopping games:", error);
      res.status(500).json({ message: "Failed to stop games" });
    }
  });

  // Get current season/week (SuperUser)
  app.get('/api/season/current-week', isAuthenticated, async (req: any, res) => {
    try {
      res.json({ 
        week: 1, 
        season: 1, 
        status: "active" 
      });
    } catch (error) {
      console.error("Error fetching current week:", error);
      res.status(500).json({ message: "Failed to fetch current week" });
    }
  });

  // Get current seasonal cycle day and phase
  app.get('/api/season/current-cycle', isAuthenticated, async (req: any, res) => {
    try {
      // For now, we'll simulate a cycle. In a real implementation, this would be calculated
      // based on the actual season start date and current time
      let currentSeason = await storage.getCurrentSeason();
      
      // Create initial season if none exists or update existing season to new format
      if (!currentSeason) {
        currentSeason = await storage.createSeason({
          name: "Season 0",
          year: 0,
          status: "active",
          startDate: new Date()
        });
      } else if (currentSeason.name && currentSeason.name.includes("Championship")) {
        // Update old season format to new format
        const year = currentSeason.year || 0;
        await storage.updateSeason(currentSeason.id, {
          name: `Season ${year}`,
        });
        currentSeason.name = `Season ${year}`;
      }
      
      // Simulate current day (1-17) - this would be calculated from season start date
      const seasonStartDate = currentSeason?.startDate || new Date();
      const currentDate = new Date();
      const daysSinceStart = Math.floor((currentDate.getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentDay = ((daysSinceStart % 17) + 1); // 1-17 cycle
      
      let phase: string = "Regular Season";
      let description: string = "Day 1 - Regular Season Matches";
      let details: string = "Teams compete in regular season matches.";
      
      if (currentDay >= 1 && currentDay <= 14) {
        phase = "Regular Season";
        description = `Day ${currentDay} - Regular Season Matches`;
        if (currentDay <= 7) {
          details = "First half of regular season. Teams play to secure playoff positioning.";
        } else {
          details = "Second half of regular season. Every match counts for playoff qualification.";
        }
      } else if (currentDay === 15) {
        phase = "Playoffs";
        description = "Day 15 - Championship Playoffs";
        details = "Single-elimination playoffs. Top 4 teams per division compete for promotion.";
      } else if (currentDay >= 16 && currentDay <= 17) {
        phase = "Off-Season";
        description = `Day ${currentDay} - Off-Season Management`;
        if (currentDay === 16) {
          details = "Promotion & Relegation processing. League re-shuffle in progress.";
        } else {
          details = "Player management phase. Sign free agents, handle contracts, prepare for next season.";
        }
      }
      
      res.json({
        currentDay,
        phase,
        description,
        details,
        season: currentSeason?.name || `Season ${currentSeason?.year || 0}`,
        cycleLength: 17,
        daysUntilPlayoffs: Math.max(0, 15 - currentDay),
        daysUntilNewSeason: currentDay >= 17 ? 0 : (17 - currentDay)
      });
    } catch (error) {
      console.error("Error fetching seasonal cycle:", error);
      res.status(500).json({ message: "Failed to fetch seasonal cycle" });
    }
  });

  // Season Management endpoints (SuperUser)
  app.post('/api/superuser/advance-day', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      console.log(`SuperUser advancing day - User: ${userId}`);

      // Get current season
      const currentSeason = await storage.getCurrentSeason();
      if (!currentSeason) {
        return res.status(404).json({ message: "No active season found" });
      }

      // Calculate next day
      const seasonStartDate = currentSeason.startDate || new Date();
      const currentDate = new Date();
      const daysSinceStart = Math.floor((currentDate.getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentDay = ((daysSinceStart % 17) + 1);
      const nextDay = currentDay >= 17 ? 1 : currentDay + 1;

      // If moving to day 1, start new season cycle
      if (nextDay === 1) {
        // Complete current season
        await storage.updateSeason(currentSeason.id, {
          status: "completed",
          endDate: new Date()
        });
        
        // Create new season with incremented year
        const newYear = (currentSeason.year || 0) + 1;
        await storage.createSeason({
          name: `Season ${newYear}`,
          year: newYear,
          status: "active",
          startDate: new Date()
        });
      } else {
        // Just advance the day by updating start date
        const newStartDate = new Date(seasonStartDate);
        newStartDate.setDate(newStartDate.getDate() + 1);
        
        await storage.updateSeason(currentSeason.id, {
          startDate: newStartDate
        });
      }

      res.json({ 
        message: "Day advanced successfully",
        newDay: nextDay,
        isNewSeason: nextDay === 1
      });
    } catch (error) {
      console.error("Error advancing day:", error);
      res.status(500).json({ message: "Failed to advance day" });
    }
  });

  app.post('/api/superuser/reset-season', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      console.log(`SuperUser resetting season to Day 1 - User: ${userId}`);

      // Get current season
      const currentSeason = await storage.getCurrentSeason();
      if (!currentSeason) {
        return res.status(404).json({ message: "No active season found" });
      }

      // Reset season to Day 1 by setting start date to today
      const newStartDate = new Date();
      await storage.updateSeason(currentSeason.id, {
        startDate: newStartDate,
        endDate: null,
        playoffStartDate: null,
        championTeamId: null
      });

      // Reset all team statistics for new season
      const allTeams = [];
      for (let division = 1; division <= 8; division++) {
        const divisionTeams = await storage.getTeamsByDivision(division);
        allTeams.push(...divisionTeams);
      }

      for (const team of allTeams) {
        await storage.updateTeam(team.id, {
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0
        });
      }

      // Stop all active matches
      const liveMatches = await storage.getLiveMatches();
      for (const match of liveMatches) {
        await storage.updateMatch(match.id, {
          status: "completed",
          completedAt: new Date()
        });
      }

      res.json({ 
        message: "Season reset to Day 1 successfully",
        teamsReset: allTeams.length,
        matchesStopped: liveMatches.length
      });
    } catch (error) {
      console.error("Error resetting season:", error);
      res.status(500).json({ message: "Failed to reset season" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Stadium management helper functions
function getAvailableUpgrades(stadium: any) {
  const upgrades = [];
  
  // Field upgrades
  if (stadium.fieldSize === "regulation") {
    upgrades.push({
      type: "field",
      name: "Extended Field",
      description: "Larger field provides more strategic options",
      cost: 75000,
      effect: { fieldSize: "extended", homeAdvantage: 8 }
    });
  }
  
  if (stadium.surface === "grass") {
    upgrades.push({
      type: "field",
      name: "Hybrid Surface",
      description: "Weather-resistant hybrid surface",
      cost: 50000,
      effect: { surface: "hybrid", weatherResistance: 75 }
    });
  } else if (stadium.surface === "hybrid") {
    upgrades.push({
      type: "field",
      name: "Premium Synthetic Surface",
      description: "All-weather synthetic surface with optimal performance",
      cost: 85000,
      effect: { surface: "synthetic", weatherResistance: 95 }
    });
  }
  
  // Lighting upgrades
  if (stadium.lighting === "basic") {
    upgrades.push({
      type: "lighting",
      name: "Professional Lighting",
      description: "Better visibility for players",
      cost: 30000,
      effect: { lighting: "professional", homeAdvantage: 7 }
    });
  }
  
  if (stadium.lighting === "professional") {
    upgrades.push({
      type: "lighting",
      name: "Premium LED System",
      description: "State-of-the-art LED lighting",
      cost: 60000,
      effect: { lighting: "premium", homeAdvantage: 10 }
    });
  }
  
  // Capacity upgrades
  if (stadium.capacity < 50000) {
    const expansionSize = stadium.capacity < 10000 ? 5000 : 
                         stadium.capacity < 20000 ? 7500 : 10000;
    upgrades.push({
      type: "seating",
      name: "Capacity Expansion",
      description: `Add ${expansionSize.toLocaleString()} more seats`,
      cost: 75000 + (stadium.capacity / 100),
      effect: { 
        capacity: stadium.capacity + expansionSize, 
        revenueMultiplier: stadium.revenueMultiplier + 15,
        level: Math.min(5, stadium.level + 1)
      }
    });
  }
  
  // Weather resistance upgrades
  if (stadium.weatherResistance < 90) {
    upgrades.push({
      type: "weather",
      name: "Advanced Weather Systems",
      description: "Install premium weather protection (+25% weather resistance)",
      cost: 45000,
      effect: { weatherResistance: Math.min(95, stadium.weatherResistance + 25) }
    });
  }
  
  // Training facility upgrades
  const trainingLevel = stadium.facilities?.training || 0;
  if (trainingLevel < 3) {
    upgrades.push({
      type: "training",
      name: `Training Facility Level ${trainingLevel + 1}`,
      description: "Enhance player development and recovery systems",
      cost: 40000 + (trainingLevel * 25000),
      effect: { 
        facilities: { ...stadium.facilities, training: trainingLevel + 1 },
        homeAdvantage: stadium.homeAdvantage + 1
      }
    });
  }
  
  // Medical facility upgrades
  const medicalLevel = stadium.facilities?.medical || 0;
  if (medicalLevel < 3) {
    upgrades.push({
      type: "medical",
      name: `Medical Center Level ${medicalLevel + 1}`,
      description: "Improve injury prevention and recovery capabilities",
      cost: 35000 + (medicalLevel * 20000),
      effect: { 
        facilities: { ...stadium.facilities, medical: medicalLevel + 1 }
      }
    });
  }
  
  // VIP amenities
  const vipLevel = stadium.facilities?.vip || 0;
  if (vipLevel < 2) {
    upgrades.push({
      type: "vip",
      name: `VIP Suite Level ${vipLevel + 1}`,
      description: "Premium hospitality facilities increase revenue",
      cost: 90000 + (vipLevel * 50000),
      effect: { 
        facilities: { ...stadium.facilities, vip: vipLevel + 1 },
        revenueMultiplier: stadium.revenueMultiplier + 20
      }
    });
  }
  
  return upgrades;
}

function getUpgradeDetails(upgradeType: string, upgradeName: string, stadium: any) {
  const availableUpgrades = getAvailableUpgrades(stadium);
  return availableUpgrades.find(u => u.type === upgradeType && u.name === upgradeName);
}

function applyUpgradeEffect(stadium: any, effect: any) {
  const updates: any = {};
  
  Object.keys(effect).forEach(key => {
    updates[key] = effect[key];
  });
  
  updates.lastUpgrade = new Date();
  return updates;
}

function generateEventDetails(eventType: string, stadium: any) {
  const baseAttendees = Math.floor(stadium.capacity * 0.6);
  
  switch (eventType) {
    case "concert":
      return {
        revenue: baseAttendees * 25,
        cost: baseAttendees * 8,
        attendees: baseAttendees,
        duration: 4
      };
    case "exhibition":
      return {
        revenue: baseAttendees * 15,
        cost: baseAttendees * 5,
        attendees: baseAttendees,
        duration: 2
      };
    case "corporate":
      return {
        revenue: Math.floor(stadium.capacity * 0.3) * 50,
        cost: Math.floor(stadium.capacity * 0.3) * 15,
        attendees: Math.floor(stadium.capacity * 0.3),
        duration: 6
      };
    default:
      return {
        revenue: baseAttendees * 10,
        cost: baseAttendees * 3,
        attendees: baseAttendees,
        duration: 2
      };
  }
}
