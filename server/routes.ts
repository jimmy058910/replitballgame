import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
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
import { matchStateManager } from "./services/matchStateManager";
import { getDivisionName, getDivisionInfo, getFullDivisionTitle } from "../shared/divisions";
import { z } from "zod";
import { db } from "./db";
import { items, stadiums, facilityUpgrades, stadiumEvents, teams, players, matches, teamFinances, playerInjuries, staff, teamInventory } from "@shared/schema";
import { eq, isNotNull, gte, lte, and, desc, or } from "drizzle-orm";
import { randomUUID } from "crypto";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-05-28.basil",
});

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
    const positions = ["Passer", "Runner", "Blocker"];
    const { generateRandomName } = await import("@shared/names");
    const { ABILITIES, rollForAbility } = await import("@shared/abilities");
    
    for (let j = 0; j < 12; j++) {
      const race = races[Math.floor(Math.random() * races.length)];
      const position = positions[Math.floor(Math.random() * positions.length)];
      
      // Generate proper name for the race
      const nameData = generateRandomName(race.toLowerCase());
      const playerName = `${nameData.firstName} ${nameData.lastName}`;
      
      // Generate position-based stats with some variance
      let baseStats = {
        speed: 15 + Math.floor(Math.random() * 20),
        power: 15 + Math.floor(Math.random() * 20),
        throwing: 15 + Math.floor(Math.random() * 20),
        catching: 15 + Math.floor(Math.random() * 20),
        kicking: 15 + Math.floor(Math.random() * 20),
        stamina: 15 + Math.floor(Math.random() * 20),
        leadership: 15 + Math.floor(Math.random() * 20),
        agility: 15 + Math.floor(Math.random() * 20),
      };
      
      // Enhance stats based on position
      switch (position) {
        case "Passer":
          baseStats.throwing += 5 + Math.floor(Math.random() * 10);
          baseStats.leadership += 3 + Math.floor(Math.random() * 7);
          baseStats.agility += 2 + Math.floor(Math.random() * 6);
          break;
        case "Runner":
          baseStats.speed += 5 + Math.floor(Math.random() * 10);
          baseStats.agility += 4 + Math.floor(Math.random() * 8);
          baseStats.catching += 3 + Math.floor(Math.random() * 7);
          break;
        case "Blocker":
          baseStats.power += 5 + Math.floor(Math.random() * 10);
          baseStats.stamina += 4 + Math.floor(Math.random() * 8);
          baseStats.leadership += 2 + Math.floor(Math.random() * 6);
          break;
      }
      
      // Cap stats at 40
      Object.keys(baseStats).forEach(key => {
        baseStats[key] = Math.min(40, baseStats[key]);
      });
      
      // Create player object for ability generation
      const playerObj = {
        ...baseStats,
        race: race,
        position: position,
        age: 18 + Math.floor(Math.random() * 15)
      };
      
      // Roll for abilities (AI players get 1-3 abilities)
      const playerAbilities = [];
      const abilityRolls = 1 + Math.floor(Math.random() * 3); // 1-3 abilities
      
      for (let k = 0; k < abilityRolls; k++) {
        const ability = rollForAbility(playerObj);
        if (ability && !playerAbilities.includes(ability.id)) {
          playerAbilities.push(ability.id);
        }
      }
      
      await storage.createPlayer({
        name: playerName,
        firstName: nameData.firstName,
        lastName: nameData.lastName,
        teamId: team.id,
        position: position,
        race: race,
        age: playerObj.age,
        speed: baseStats.speed,
        power: baseStats.power,
        throwing: baseStats.throwing,
        catching: baseStats.catching,
        kicking: baseStats.kicking,
        stamina: baseStats.stamina,
        leadership: baseStats.leadership,
        agility: baseStats.agility,
        salary: 1000 + Math.floor(Math.random() * 4000),
        contractValue: 5000 + Math.floor(Math.random() * 20000),
        isMarketplace: false,
        marketplacePrice: null,
        abilities: JSON.stringify(playerAbilities)
      });
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Emergency Stadium API bypass - direct route without auth for testing
  app.get('/api/stadium/emergency', async (req, res) => {
    try {
      console.log("=== EMERGENCY STADIUM API REACHED ===");
      res.setHeader('Content-Type', 'application/json');
      res.json({ 
        test: "Emergency stadium API working", 
        timestamp: new Date().toISOString(),
        stadium: {
          level: 1,
          name: "Default Stadium",
          capacity: 5000,
          atmosphere: 50,
          revenueBoost: 0
        }
      });
    } catch (error) {
      console.error("Emergency stadium API error:", error);
      res.status(500).json({ error: "Emergency API failed" });
    }
  });

  // Remove the test stadium route that might be interfering
  // app.get('/api/stadium/test', async (req, res) => {
  //   console.log("=== STADIUM TEST API REACHED ===");
  //   res.json({ test: "Stadium API routes are working", timestamp: new Date().toISOString() });
  // });
  
  // Auth middleware
  await setupAuth(app);

  // PRIORITY: Stadium API - placed after auth setup to prevent route conflicts
  app.get('/api/stadium/full', isAuthenticated, async (req: any, res) => {
    try {
      console.log("=== STADIUM FULL API REACHED ===");
      
      // Set explicit JSON headers to prevent Vite interference
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache');
      
      const userId = req.user.claims.sub;
      console.log("Processing stadium for user:", userId);
      
      const team = await storage.getTeamByUserId(userId);
      console.log("Team found:", team?.id, team?.name);
      
      if (!team) {
        console.log("No team found for user");
        return res.status(404).json({ message: "Team not found" });
      }

      let stadium = await storage.getTeamStadium(team.id);
      
      // Create default stadium if none exists
      if (!stadium) {
        stadium = await storage.createStadium({
          teamId: team.id,
          name: `${team.name} Arena`,
          capacity: 15000,
          level: 1,
          fieldType: "standard",
          fieldSize: "regulation",
          lighting: "basic",
          surface: "grass",
          drainage: "basic",
          facilities: JSON.stringify({
            seating: 1,
            concessions: 1,
            parking: 1,
            lighting: 1,
            screens: 1,
            vip: 1,
            merchandising: 1
          }),
          revenueMultiplier: 100
        });
      }

      // Calculate atmosphere based on team performance and stadium level
      const matches = await storage.getMatchesByTeamId(team.id);
      const homeMatches = matches.filter(m => m.homeTeamId === team.id && m.status === 'completed');
      const winRate = homeMatches.length > 0 ? 
        homeMatches.filter(m => (m.homeScore || 0) > (m.awayScore || 0)).length / homeMatches.length : 0.5;
      
      const atmosphere = Math.min(95, 30 + ((stadium.level || 1) * 10) + (winRate * 40));
      const revenueBoost = (stadium.level || 1) * 5;

      // Parse facilities if they're stored as JSON string
      const facilities = typeof stadium.facilities === 'string' ? 
        JSON.parse(stadium.facilities) : stadium.facilities || {};

      // Get available upgrades
      const availableUpgrades = [
        {
          id: "capacity-1",
          name: "Expand Seating",
          type: "capacity",
          cost: 50000,
          effect: "Increase capacity by 5,000",
          description: "Add more general seating areas",
          available: (stadium.capacity || 0) < 50000
        },
        {
          id: "concessions-1", 
          name: "Premium Concessions",
          type: "facility",
          cost: 30000,
          effect: "Boost concession revenue by 25%",
          description: "Upgrade food and beverage options",
          available: (facilities.concessions || 0) < 3
        },
        {
          id: "parking-1",
          name: "Expand Parking",
          type: "facility", 
          cost: 25000,
          effect: "Increase parking revenue by 20%",
          description: "Add more parking spaces",
          available: (facilities.parking || 0) < 3
        }
      ].filter(upgrade => upgrade.available);

      // Calculate revenue breakdown
      const baseMatchRevenue = (stadium.capacity || 0) * 25; // $25 per seat average
      const revenue = {
        matchDay: Math.floor(baseMatchRevenue * ((stadium.revenueMultiplier || 100) / 100)),
        concessions: Math.floor((stadium.capacity || 0) * 8 * (facilities.concessions || 1)),
        parking: Math.floor((stadium.capacity || 0) * 0.3 * 10 * (facilities.parking || 1)),
        vip: Math.floor((facilities.vip || 1) * 5000),
        apparel: Math.floor((stadium.capacity || 0) * 3 * (facilities.merchandising || 1)),
        total: 0
      };
      revenue.total = revenue.matchDay + revenue.concessions + revenue.parking + revenue.vip + revenue.apparel;

      // Get recent match history
      const homeMatches_history = matches
        .filter(m => m.homeTeamId === team.id && m.status === 'completed')
        .slice(0, 5)
        .map(match => ({
          opponent: match.awayTeamId,
          date: match.scheduledTime,
          result: (match.homeScore || 0) > (match.awayScore || 0) ? 'W' : (match.homeScore || 0) < (match.awayScore || 0) ? 'L' : 'D',
          attendance: Math.floor((stadium.capacity || 0) * (0.7 + Math.random() * 0.3)),
          revenue: Math.floor(revenue.total * (0.8 + Math.random() * 0.4)),
          atmosphere: Math.floor(atmosphere * (0.8 + Math.random() * 0.2))
        }));

      // Calculate season stats
      const completedHomeMatches = matches.filter(m => 
        m.homeTeamId === team.id && m.status === 'completed'
      );
      const homeWins = completedHomeMatches.filter(m => (m.homeScore || 0) > (m.awayScore || 0)).length;
      const totalHomeMatches = completedHomeMatches.length || 1;

      const responseData = {
        stadium: {
          ...stadium,
          atmosphere,
          revenueBoost,
          avgAttendance: Math.floor((stadium.capacity || 0) * 0.85),
          seasonRevenue: revenue.total * totalHomeMatches,
          homeWinRate: Math.floor((homeWins / totalHomeMatches) * 100)
        },
        availableUpgrades,
        revenue,
        matchHistory: homeMatches_history
      };
      
      console.log("Stadium API Response Data:", JSON.stringify(responseData, null, 2));
      console.log("=== END STADIUM API DEBUG ===");
      
      // Ensure JSON response is properly sent and returned
      res.json(responseData);
      return;

    } catch (error) {
      console.error("=== STADIUM API ERROR ===");
      console.error("Error fetching stadium data:", error);
      console.error("Error stack:", (error as any).stack);
      console.error("=== END STADIUM API ERROR ===");
      res.status(500).json({ message: "Failed to fetch stadium data" });
    }
  });

  // CRITICAL: Formation routes must be first to prevent conflicts
  // Formation saving route
  app.post('/api/teams/:teamId/formation', isAuthenticated, async (req, res) => {
    console.log("=== FORMATION SAVE REQUEST ===");
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);
    console.log("Content-Type:", req.headers['content-type']);
    console.log("User authenticated:", req.isAuthenticated());
    console.log("Request body:", req.body);
    
    try {
      let teamId = req.params.teamId;
      
      if (teamId === "my") {
        const userId = (req.user as any)?.claims?.sub;
        console.log("Looking up team for user:", userId);
        const team = await storage.getTeamByUserId(userId);
        if (!team) {
          console.log("Team not found for user:", userId);
          return res.status(404).json({ message: "Team not found" });
        }
        teamId = team.id;
        console.log("Found team:", teamId);
      }

      const { formation, substitutionOrder } = req.body;
      
      console.log("Formation data received:", { formationLength: formation?.length, substitutionOrder });
      
      // Validate formation data
      if (!formation || !Array.isArray(formation)) {
        console.log("Invalid formation data");
        return res.status(400).json({ message: "Invalid formation data" });
      }
      
      // Store formation in team data
      await storage.updateTeam(teamId, { 
        formation: JSON.stringify(formation),
        substitutionOrder: JSON.stringify(substitutionOrder || {})
      });

      console.log("Formation saved successfully for team:", teamId);
      console.log("Sending JSON response");
      res.setHeader('Content-Type', 'application/json');
      res.json({ success: true, message: "Formation saved successfully" });
    } catch (error) {
      console.error("Error saving formation:", error);
      res.status(500).json({ message: "Failed to save formation" });
    }
  });

  // Formation loading route
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
        substitutionOrder: team.substitutionOrder ? JSON.parse(team.substitutionOrder) : null
      });
    } catch (error) {
      console.error("Error fetching formation:", error);
      res.status(500).json({ message: "Failed to fetch formation" });
    }
  });

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

      // If match is live, get synchronized state
      if (match.status === 'live') {
        const liveState = await matchStateManager.syncMatchState(matchId);
        if (liveState) {
          // Return match with live state data for synchronized viewing
          res.json({
            ...match,
            liveState: {
              gameTime: liveState.gameTime,
              currentHalf: liveState.currentHalf,
              team1Score: liveState.team1Score,
              team2Score: liveState.team2Score,
              recentEvents: liveState.gameEvents.slice(-10), // Last 10 events
              maxTime: liveState.maxTime,
              isRunning: liveState.status === 'live'
            }
          });
          return;
        }
      }
      
      res.json(match);
    } catch (error) {
      console.error("Error fetching match:", error);
      res.status(500).json({ message: "Failed to fetch match" });
    }
  });

  // Manual match completion endpoint for admin
  app.post('/api/matches/:matchId/complete-now', isAuthenticated, async (req, res) => {
    try {
      const { matchId } = req.params;
      
      // Stop the match in state manager
      await matchStateManager.stopMatch(matchId);
      
      res.json({ message: "Match completed successfully" });
    } catch (error) {
      console.error("Error completing match:", error);
      res.status(500).json({ message: "Failed to complete match" });
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

  // Taxi squad management routes
  app.get("/api/teams/:teamId/taxi-squad", isAuthenticated, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const userId = req.user.claims.sub;

      // Verify team ownership
      const team = await storage.getTeamById(teamId);
      if (!team || team.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get taxi squad players
      const players = await storage.getPlayersByTeamId(teamId);
      const taxiSquadPlayers = players.filter(player => player.isOnTaxi);

      res.json(taxiSquadPlayers);
    } catch (error) {
      console.error("Error fetching taxi squad:", error);
      res.status(500).json({ message: "Failed to fetch taxi squad" });
    }
  });

  app.post("/api/teams/:teamId/taxi-squad/:playerId/promote", isAuthenticated, async (req: any, res) => {
    try {
      const { teamId, playerId } = req.params;
      const userId = req.user.claims.sub;

      // Check if we're in off-season (Day 16 or 17)
      const currentSeason = await storage.getCurrentSeason();
      if (!currentSeason) {
        return res.status(400).json({ message: "No active season found" });
      }

      const seasonStartDate = currentSeason.startDate || new Date();
      const currentDate = new Date();
      const daysSinceStart = Math.floor((currentDate.getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentDay = ((daysSinceStart % 17) + 1);

      if (currentDay < 16 || currentDay > 17) {
        return res.status(400).json({ 
          message: "Player promotion is only allowed during off-season (Days 16-17)",
          currentDay: currentDay,
          allowedDays: "16-17"
        });
      }

      // Verify team ownership
      const team = await storage.getTeamById(teamId);
      if (!team || team.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get player and verify it's on taxi squad
      const player = await storage.getPlayerById(playerId);
      if (!player || player.teamId !== teamId || !player.isOnTaxi) {
        return res.status(404).json({ message: "Player not found on taxi squad" });
      }

      // Check roster space
      const allPlayers = await storage.getPlayersByTeamId(teamId);
      const activeRosterCount = allPlayers.filter(p => !p.isOnTaxi).length;
      
      if (activeRosterCount >= 15) {
        return res.status(400).json({ message: "Active roster is full (15 players maximum)" });
      }

      // Promote to main roster
      const updatedPlayer = await storage.updatePlayer(playerId, {
        isOnTaxi: false,
        salary: 5000, // Base salary for promoted players
        contractValue: 10000,
        contractSeasons: 2
      });

      res.json({ 
        message: "Player promoted to main roster", 
        player: updatedPlayer 
      });
    } catch (error) {
      console.error("Error promoting player:", error);
      res.status(500).json({ message: "Failed to promote player" });
    }
  });

  app.delete("/api/teams/:teamId/taxi-squad/:playerId", isAuthenticated, async (req: any, res) => {
    try {
      const { teamId, playerId } = req.params;
      const userId = req.user.claims.sub;

      // Verify team ownership
      const team = await storage.getTeamById(teamId);
      if (!team || team.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get player and verify it's on taxi squad
      const player = await storage.getPlayerById(playerId);
      if (!player || player.teamId !== teamId || !player.isOnTaxi) {
        return res.status(404).json({ message: "Player not found on taxi squad" });
      }

      // Remove player from team (this will effectively release them)
      await storage.updatePlayer(playerId, {
        teamId: null,
        isOnTaxi: false,
        isMarketplace: false
      });

      res.json({ message: "Player released from taxi squad" });
    } catch (error) {
      console.error("Error releasing player:", error);
      res.status(500).json({ message: "Failed to release player" });
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

  // Add tryout candidates to taxi squad
  app.post("/api/teams/:teamId/taxi-squad/add-candidates", isAuthenticated, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const { candidates } = req.body;
      const userId = req.user.claims.sub;

      // Verify team ownership
      const team = await storage.getTeamById(teamId);
      if (!team || team.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check taxi squad capacity
      const players = await storage.getPlayersByTeamId(teamId);
      const currentTaxiSquadCount = players.filter(p => p.isOnTaxi).length;
      
      if (currentTaxiSquadCount + candidates.length > 2) {
        return res.status(400).json({ message: "Taxi squad capacity exceeded (2 players maximum)" });
      }

      const addedPlayers = [];

      // Add each candidate to taxi squad
      for (const candidate of candidates) {
        // Parse candidate name for firstName and lastName
        const nameParts = candidate.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || firstName;

        const playerData = {
          name: candidate.name,
          firstName,
          lastName,
          teamId,
          race: candidate.race,
          age: candidate.age,
          speed: candidate.speed,
          power: candidate.power,
          throwing: candidate.throwing,
          catching: candidate.catching || Math.floor(Math.random() * 15) + 15,
          kicking: candidate.kicking || Math.floor(Math.random() * 15) + 15,
          stamina: candidate.stamina,
          leadership: candidate.leadership,
          agility: candidate.agility,
          position: "Utility", // Default position for tryout candidates
          isOnTaxi: true,
          isMarketplace: false,
          marketplacePrice: null,
          salary: 0, // Taxi squad players don't have salary
          contractValue: 0,
          contractSeasons: 0,
          abilities: "[]", // Empty abilities array
          marketValue: candidate.marketValue || 50000
        };

        const newPlayer = await storage.createPlayer(playerData);
        addedPlayers.push(newPlayer);
      }

      res.json({ 
        message: `${addedPlayers.length} players added to taxi squad`,
        players: addedPlayers 
      });
    } catch (error) {
      console.error("Error adding candidates to taxi squad:", error);
      res.status(500).json({ message: "Failed to add candidates to taxi squad" });
    }
  });

  app.post("/api/teams/:teamId/taxi-squad", isAuthenticated, async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const { candidates } = req.body;
      
      console.log("Adding to taxi squad:", { teamId, candidates });
      
      if (!candidates || candidates.length === 0) {
        return res.status(400).json({ message: "No candidates provided" });
      }

      const addedPlayers = [];
      
      // Create actual player records for taxi squad candidates
      for (const candidate of candidates) {
        const playerData = {
          teamId: teamId,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          name: `${candidate.firstName} ${candidate.lastName}`,
          race: candidate.race,
          age: candidate.age,
          position: "player",
          speed: candidate.speed,
          power: candidate.power,
          throwing: candidate.throwing,
          catching: candidate.catching || 20,
          kicking: candidate.kicking || 20,
          stamina: candidate.stamina || 25,
          leadership: candidate.leadership || 20,
          agility: candidate.agility || 25,
          salary: Math.floor(Math.random() * 5000) + 2000, // Random salary 2-7k
          contractSeasons: 3,
          contractStartSeason: 1,
          contractValue: Math.floor(Math.random() * 15000) + 10000,
          isStarter: false,
          isOnTaxi: true, // Mark as taxi squad player
          abilities: "[]"
        };

        const player = await storage.createPlayer(playerData);
        addedPlayers.push(player);
        console.log("Created taxi squad player:", player.firstName, player.lastName);
      }
      
      res.json({ 
        success: true, 
        addedCount: addedPlayers.length,
        players: addedPlayers 
      });
    } catch (error) {
      console.error("Error adding to taxi squad:", error);
      res.status(500).json({ message: "Failed to add to taxi squad" });
    }
  });

  // Get taxi squad players
  app.get("/api/teams/:teamId/taxi-squad", isAuthenticated, async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const allPlayers = await storage.getPlayersByTeamId(teamId);
      const taxiSquadPlayers = allPlayers.filter(player => player.isOnTaxi);
      
      res.json(taxiSquadPlayers);
    } catch (error) {
      console.error("Error getting taxi squad:", error);
      res.status(500).json({ message: "Failed to get taxi squad" });
    }
  });



  // Release taxi squad player
  app.delete("/api/teams/:teamId/taxi-squad/:playerId", isAuthenticated, async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const playerId = req.params.playerId;
      
      // In a real system, you might want to soft delete or transfer to free agency
      // For now, we'll just remove them from the team
      const players = await storage.getPlayersByTeamId(teamId);
      const playerToRemove = players.find(p => p.id === playerId && p.isOnTaxi);
      
      if (!playerToRemove) {
        return res.status(404).json({ message: "Taxi squad player not found" });
      }
      
      // Delete the player (or you could set teamId to null for free agency)
      await storage.updatePlayer(playerId, { teamId: null });
      
      res.json({ success: true, message: "Player released from taxi squad" });
    } catch (error) {
      console.error("Error releasing player:", error);
      res.status(500).json({ message: "Failed to release player" });
    }
  });

  // Helper function for division names - now using unified division system

  // Tournament routes
  app.get('/api/tournaments/:division', isAuthenticated, async (req, res) => {
    try {
      const division = parseInt(req.params.division);
      
      // Create tournaments for the requested division
      const tournaments = [
        {
          id: `tournament-${division}-daily`,
          name: `${getDivisionName(division)} Daily Tournament`,
          division,
          entryFee: division <= 4 ? 1000 : 500,
          entryCost: {
            credits: division <= 4 ? 1000 : 500,
            gems: Math.floor((division <= 4 ? 1000 : 500) / 10)
          },
          maxTeams: 8,
          status: "open",
          prizes: { 
            first: division <= 4 ? 5000 : 2500, 
            second: division <= 4 ? 2000 : 1000,
            third: division <= 4 ? 1000 : 500
          },
          startTime: new Date(Date.now() + 3600000), // 1 hour from now
          description: `Compete against other ${getDivisionName(division)} teams for glory and prizes!`
        },
        {
          id: `tournament-${division}-weekly`,
          name: `${getDivisionName(division)} Weekly Championship`,
          division,
          entryFee: division <= 4 ? 2500 : 1200,
          entryCost: {
            credits: division <= 4 ? 2500 : 1200,
            gems: Math.floor((division <= 4 ? 2500 : 1200) / 8)
          },
          maxTeams: 16,
          status: "open",
          prizes: { 
            first: division <= 4 ? 12000 : 6000, 
            second: division <= 4 ? 5000 : 2500,
            third: division <= 4 ? 2500 : 1200
          },
          startTime: new Date(Date.now() + 7 * 24 * 3600000), // 1 week from now
          description: `The ultimate test for ${getDivisionName(division)} teams - bigger prizes, tougher competition!`
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

  // New instant match endpoint
  app.post('/api/exhibitions/instant-match', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Find a random opponent team for exhibition match from same division
      const allTeams = await storage.getTeamsByDivision(team.division);
      const opponents = allTeams.filter(t => t.id !== team.id);
      
      if (opponents.length === 0) {
        return res.status(404).json({ message: "No opponents available in your division" });
      }

      const opponent = opponents[Math.floor(Math.random() * opponents.length)];
      
      // Create exhibition match
      const match = await storage.createMatch({
        homeTeamId: team.id,
        awayTeamId: opponent.id,
        matchType: "exhibition",
        status: "live",
        scheduledTime: new Date()
      });

      res.json({ matchId: match.id });
    } catch (error) {
      console.error("Error finding instant exhibition match:", error);
      res.status(500).json({ message: "Failed to find instant exhibition match" });
    }
  });

  // Get available opponents for selection
  app.get('/api/exhibitions/available-opponents', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Get all teams in same division (excluding player's team)
      const allTeams = await storage.getTeamsByDivision(team.division);
      const opponents = allTeams.filter(t => t.id !== team.id);
      
      // Return up to 8 opponents
      const availableOpponents = opponents.slice(0, 8);

      res.json(availableOpponents);
    } catch (error) {
      console.error("Error fetching available opponents:", error);
      res.status(500).json({ message: "Failed to fetch available opponents" });
    }
  });

  // Challenge specific opponent
  app.post('/api/exhibitions/challenge-opponent', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { opponentId } = req.body;

      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const opponent = await storage.getTeamById(opponentId);
      if (!opponent) {
        return res.status(404).json({ message: "Opponent team not found" });
      }

      // Verify opponent is in same division
      if (opponent.division !== team.division) {
        return res.status(400).json({ message: "Can only challenge teams in your division" });
      }

      // Create exhibition match
      const match = await storage.createMatch({
        homeTeamId: team.id,
        awayTeamId: opponent.id,
        matchType: "exhibition",
        status: "live",
        scheduledTime: new Date()
      });

      res.json({ matchId: match.id });
    } catch (error) {
      console.error("Error challenging opponent:", error);
      res.status(500).json({ message: "Failed to challenge opponent" });
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

  // Initialize comprehensive item database
  const initializeItemDatabase = () => {
    // Equipment items based on provided database
    const equipment = [
      // Helmets
      { itemId: 101, name: "Standard Leather Helmet", type: "Equipment", itemType: "helmet", rarity: "common", rarityId: 1, slot: "helmet", slotId: 1, description: "Standard issue. Better than nothing.", statBoosts: { stamina: 1 }, isUniversal: true, raceRestrictions: [], creditPrice: 5000, gemPrice: null, isPremium: false },
      { itemId: 102, name: "Gryllstone Plated Helm", type: "Equipment", itemType: "helmet", rarity: "rare", rarityId: 3, slot: "helmet", slotId: 1, description: "Incredibly durable, but heavy.", statBoosts: { power: 4, speed: -2 }, isUniversal: false, raceRestrictions: [3], creditPrice: null, gemPrice: 25, isPremium: true },
      { itemId: 103, name: "Sylvan Barkwood Circlet", type: "Equipment", itemType: "helmet", rarity: "rare", rarityId: 3, slot: "helmet", slotId: 1, description: "Imbued with the resilience of an ancient tree.", statBoosts: { stamina: 5 }, isUniversal: false, raceRestrictions: [2], creditPrice: null, gemPrice: 30, isPremium: true },
      { itemId: 104, name: "Umbral Cowl", type: "Equipment", itemType: "helmet", rarity: "epic", rarityId: 4, slot: "helmet", slotId: 1, description: "A light hood that seems to absorb light and sound.", statBoosts: { agility: 3 }, isUniversal: false, raceRestrictions: [5], creditPrice: null, gemPrice: 45, isPremium: true },
      { itemId: 105, name: "Helm of Command", type: "Equipment", itemType: "helmet", rarity: "legendary", rarityId: 5, slot: "helmet", slotId: 1, description: "A helmet worn by legendary Human captains.", statBoosts: { leadership: 3, throwing: 3 }, isUniversal: false, raceRestrictions: [1], creditPrice: null, gemPrice: 75, isPremium: true },
      
      // Armor
      { itemId: 201, name: "Padded Leather Armor", type: "Equipment", itemType: "armor", rarity: "common", rarityId: 1, slot: "armor", slotId: 2, description: "Standard issue, offers minimal protection.", statBoosts: { power: 1 }, isUniversal: true, raceRestrictions: [], creditPrice: 5000, gemPrice: null, isPremium: false },
      { itemId: 202, name: "Lumina's Radiant Aegis", type: "Equipment", itemType: "armor", rarity: "legendary", rarityId: 5, slot: "armor", slotId: 2, description: "Glows with a soft, protective light.", statBoosts: { stamina: 7, agility: 3 }, isUniversal: false, raceRestrictions: [4], creditPrice: null, gemPrice: 100, isPremium: true },
      { itemId: 203, name: "Gryll Forged Plate", type: "Equipment", itemType: "armor", rarity: "epic", rarityId: 4, slot: "armor", slotId: 2, description: "Unyieldingly solid, designed for head-on collisions.", statBoosts: { power: 6 }, isUniversal: false, raceRestrictions: [3], creditPrice: null, gemPrice: 60, isPremium: true },
      
      // Gloves
      { itemId: 301, name: "Standard Leather Gloves", type: "Equipment", itemType: "gloves", rarity: "common", rarityId: 1, slot: "gloves", slotId: 3, description: "Provides basic grip.", statBoosts: { catching: 1 }, isUniversal: true, raceRestrictions: [], creditPrice: 3000, gemPrice: null, isPremium: false },
      { itemId: 302, name: "Sylvan Gripping Vines", type: "Equipment", itemType: "gloves", rarity: "epic", rarityId: 4, slot: "gloves", slotId: 3, description: "Living vines wrap around the hands for an uncanny grip.", statBoosts: { catching: 6 }, isUniversal: false, raceRestrictions: [2], creditPrice: null, gemPrice: 50, isPremium: true },
      { itemId: 303, name: "Umbral Shadowgrips", type: "Equipment", itemType: "gloves", rarity: "rare", rarityId: 3, slot: "gloves", slotId: 3, description: "Dark gloves that help quiet the sound of catching a ball.", statBoosts: { catching: 3, agility: 2 }, isUniversal: false, raceRestrictions: [5], creditPrice: null, gemPrice: 35, isPremium: true },
      
      // Footwear
      { itemId: 401, name: "Worn Cleats", type: "Equipment", itemType: "footwear", rarity: "common", rarityId: 1, slot: "footwear", slotId: 4, description: "Standard issue footwear.", statBoosts: { speed: 1 }, isUniversal: true, raceRestrictions: [], creditPrice: 4000, gemPrice: null, isPremium: false },
      { itemId: 402, name: "Boots of the Gryll", type: "Equipment", itemType: "footwear", rarity: "uncommon", rarityId: 2, slot: "footwear", slotId: 4, description: "Heavy and stable, providing an unmovable base.", statBoosts: { power: 3, speed: -1 }, isUniversal: false, raceRestrictions: [3], creditPrice: 8000, gemPrice: null, isPremium: false },
      { itemId: 403, name: "Lumina's Light-Treads", type: "Equipment", itemType: "footwear", rarity: "epic", rarityId: 4, slot: "footwear", slotId: 4, description: "Footwear that seems to almost float over the ground.", statBoosts: { speed: 4, agility: 2 }, isUniversal: false, raceRestrictions: [4], creditPrice: null, gemPrice: 55, isPremium: true }
    ];
    
    // Consumable items
    const consumables = [
      // Injury recovery
      { itemId: 501, name: "Salve Pouch", type: "Consumable", itemType: "injury_recovery", rarity: "common", rarityId: 1, description: "A simple herbal remedy.", effectType: "InjuryRecovery", effectValue: 15, duration: 0, creditPrice: 2000, gemPrice: null, isPremium: false },
      { itemId: 504, name: "Gryllstone Dust", type: "Consumable", itemType: "injury_recovery", rarity: "rare", rarityId: 3, description: "A potent but gritty powder that knits wounds.", effectType: "InjuryRecovery", effectValue: 50, duration: 0, creditPrice: null, gemPrice: 20, isPremium: true },
      
      // Stamina recovery
      { itemId: 502, name: "Energy Bar", type: "Consumable", itemType: "stamina_recovery", rarity: "common", rarityId: 1, description: "Packed with nutrients for a quick boost.", effectType: "StaminaRecovery", effectValue: 20, duration: 0, creditPrice: 1500, gemPrice: null, isPremium: false },
      { itemId: 503, name: "Sylvan Sap", type: "Consumable", itemType: "stamina_recovery", rarity: "uncommon", rarityId: 2, description: "A thick, sweet sap that revitalizes the weary.", effectType: "StaminaRecovery", effectValue: 40, duration: 0, creditPrice: 5000, gemPrice: null, isPremium: false },
      
      // Combined recovery
      { itemId: 505, name: "Lumina's Radiance", type: "Consumable", itemType: "stamina_recovery", rarity: "epic", rarityId: 4, description: "A captured mote of pure light that restores both body and energy.", effectType: "StaminaAndInjury", effectValue: 35, duration: 0, creditPrice: null, gemPrice: 30, isPremium: true }
    ];
    
    return { equipment, consumables };
  };

  // Helper functions for store (must be defined before use)
  function getRarityIcon(rarity: string): string {
    const icons: { [key: string]: string } = {
      common: "⚪",
      uncommon: "🟢",
      rare: "🔵",
      epic: "🟣",
      legendary: "🟡",
      mythic: "🔴",
      divine: "✨"
    };
    return icons[rarity] || "⚪";
  }
  
  function getConsumableIcon(itemType: string): string {
    const icons: { [key: string]: string } = {
      injury_recovery: "🩹",
      stamina_recovery: "⚡",
      stat_boost: "💪"
    };
    return icons[itemType] || "💊";
  }

  // Test endpoint to force debug output
  app.get('/api/store/debug', isAuthenticated, async (req: any, res) => {
    console.log('=== FORCE DEBUG TEST ===');
    console.log('Store debug endpoint hit at:', new Date().toISOString());
    res.json({ message: 'Debug endpoint working', timestamp: Date.now() });
  });

  // Main store endpoint with comprehensive item database
  app.get('/api/store', isAuthenticated, async (req: any, res) => {
    // Force fresh response every time
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('ETag', Date.now().toString()); // Force unique response
    try {
      const userId = req.user?.claims?.sub;
      const team = await storage.getTeamByUserId(userId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Get team's inventory
      const inventory = await db.select()
        .from(teamInventory)
        .where(eq(teamInventory.teamId, team.id));

      // Equipment database
      const equipment = [
        // Helmets
        { itemId: "101", name: "Standard Leather Helmet", description: "Standard issue. Better than nothing.", slot: "helmet", rarity: "common", isPremium: false, creditPrice: 1000, gemPrice: 0, statBoosts: { stamina: 1 } },
        { itemId: "102", name: "Gryllstone Plated Helm", description: "Incredibly durable, but heavy.", slot: "helmet", rarity: "rare", isPremium: false, creditPrice: 5000, gemPrice: 10, statBoosts: { power: 4, speed: -2 }, raceRestrictions: ["Gryll"] },
        { itemId: "103", name: "Sylvan Barkwood Circlet", description: "Imbued with the resilience of an ancient tree.", slot: "helmet", rarity: "rare", isPremium: false, creditPrice: 5000, gemPrice: 10, statBoosts: { stamina: 5 }, raceRestrictions: ["Sylvan"] },
        { itemId: "104", name: "Umbral Cowl", description: "A light hood that seems to absorb light and sound.", slot: "helmet", rarity: "epic", isPremium: true, creditPrice: 0, gemPrice: 25, statBoosts: { agility: 3 }, raceRestrictions: ["Umbra"] },
        { itemId: "105", name: "Helm of Command", description: "A helmet worn by legendary Human captains.", slot: "helmet", rarity: "legendary", isPremium: true, creditPrice: 0, gemPrice: 50, statBoosts: { leadership: 3, throwing: 3 }, raceRestrictions: ["Human"] },
        
        // Armor
        { itemId: "201", name: "Padded Leather Armor", description: "Standard issue, offers minimal protection.", slot: "armor", rarity: "common", isPremium: false, creditPrice: 1000, gemPrice: 0, statBoosts: { power: 1 } },
        { itemId: "202", name: "Lumina's Radiant Aegis", description: "Glows with a soft, protective light.", slot: "armor", rarity: "legendary", isPremium: true, creditPrice: 0, gemPrice: 50, statBoosts: { stamina: 7, agility: 3 }, raceRestrictions: ["Lumina"] },
        { itemId: "203", name: "Gryll Forged Plate", description: "Unyieldingly solid, designed for head-on collisions.", slot: "armor", rarity: "epic", isPremium: true, creditPrice: 0, gemPrice: 25, statBoosts: { power: 6 }, raceRestrictions: ["Gryll"] },
        
        // Gloves
        { itemId: "301", name: "Standard Leather Gloves", description: "Provides basic grip.", slot: "gloves", rarity: "common", isPremium: false, creditPrice: 1000, gemPrice: 0, statBoosts: { catching: 1 } },
        { itemId: "302", name: "Sylvan Gripping Vines", description: "Living vines wrap around the hands for an uncanny grip.", slot: "gloves", rarity: "epic", isPremium: true, creditPrice: 0, gemPrice: 25, statBoosts: { catching: 6 }, raceRestrictions: ["Sylvan"] },
        { itemId: "303", name: "Umbral Shadowgrips", description: "Dark gloves that help quiet the sound of catching a ball.", slot: "gloves", rarity: "rare", isPremium: false, creditPrice: 5000, gemPrice: 10, statBoosts: { catching: 3, agility: 2 }, raceRestrictions: ["Umbra"] },
        
        // Footwear
        { itemId: "401", name: "Worn Cleats", description: "Standard issue footwear.", slot: "footwear", rarity: "common", isPremium: false, creditPrice: 1000, gemPrice: 0, statBoosts: { speed: 1 } },
        { itemId: "402", name: "Boots of the Gryll", description: "Heavy and stable, providing an unmovable base.", slot: "footwear", rarity: "uncommon", isPremium: false, creditPrice: 2500, gemPrice: 5, statBoosts: { power: 3, speed: -1 }, raceRestrictions: ["Gryll"] },
        { itemId: "403", name: "Lumina's Light-Treads", description: "Footwear that seems to almost float over the ground.", slot: "footwear", rarity: "epic", isPremium: true, creditPrice: 0, gemPrice: 25, statBoosts: { speed: 4, agility: 2 }, raceRestrictions: ["Lumina"] }
      ];

      // Consumables database
      const consumables = [
        // Stamina Recovery
        { itemId: "1001", name: "Basic Energy Drink", description: "Restores 20 stamina points.", itemType: "stamina_recovery", rarity: "common", isPremium: false, creditPrice: 500, gemPrice: 0, effect: { stamina: 20 } },
        { itemId: "1002", name: "Advanced Recovery Serum", description: "Restores 50 stamina points.", itemType: "stamina_recovery", rarity: "rare", isPremium: false, creditPrice: 2000, gemPrice: 5, effect: { stamina: 50 } },
        { itemId: "1003", name: "Phoenix Elixir", description: "Fully restores stamina.", itemType: "stamina_recovery", rarity: "legendary", isPremium: true, creditPrice: 0, gemPrice: 20, effect: { stamina: 100 } },
        
        // Injury Recovery
        { itemId: "2001", name: "Basic Medical Kit", description: "Reduces injury time by 1 day.", itemType: "injury_recovery", rarity: "common", isPremium: false, creditPrice: 1000, gemPrice: 0, effect: { daysReduced: 1 } },
        { itemId: "2002", name: "Advanced Treatment", description: "Reduces injury time by 3 days.", itemType: "injury_recovery", rarity: "rare", isPremium: false, creditPrice: 3000, gemPrice: 10, effect: { daysReduced: 3 } },
        { itemId: "2003", name: "Miracle Cure", description: "Instantly heals all injuries.", itemType: "injury_recovery", rarity: "legendary", isPremium: true, creditPrice: 0, gemPrice: 30, effect: { instantHeal: true } },
        
        // Temporary Stat Boosts
        { itemId: "3001", name: "Speed Boost Tonic", description: "+5 Speed for next game.", itemType: "stat_boost", rarity: "uncommon", isPremium: false, creditPrice: 1500, gemPrice: 3, effect: { speed: 5, duration: 1 } },
        { itemId: "3002", name: "Power Surge Potion", description: "+5 Power for next game.", itemType: "stat_boost", rarity: "uncommon", isPremium: false, creditPrice: 1500, gemPrice: 3, effect: { power: 5, duration: 1 } },
        { itemId: "3003", name: "Champion's Blessing", description: "+3 to all stats for next game.", itemType: "stat_boost", rarity: "epic", isPremium: true, creditPrice: 0, gemPrice: 15, effect: { allStats: 3, duration: 1 } }
      ];

      // Entries (Exhibition and Tournament)
      const entries = [
        {
          itemId: "entry_exhibition",
          name: "Exhibition Match Entry",
          description: "Challenge another team to a friendly match. Win rewards based on performance!",
          itemType: "entry",
          rarity: "common",
          creditPrice: 5000,
          gemPrice: 5,
          dailyLimit: 3
        },
        {
          itemId: "entry_tournament",
          name: "Tournament Entry",
          description: "Enter the weekly tournament for massive prizes and glory!",
          itemType: "entry",
          rarity: "rare",
          creditPrice: 10000,
          gemPrice: 10,
          dailyLimit: 1
        }
      ];

      // Gem Packages
      const gemPackages = [
        {
          itemId: "gems_50",
          name: "Small Gem Pack",
          description: "50 Premium Gems",
          price: 4.99,
          gems: 50,
          bonus: null
        },
        {
          itemId: "gems_120",
          name: "Medium Gem Pack",
          description: "120 Premium Gems",
          price: 9.99,
          gems: 120,
          bonus: "20% Bonus"
        },
        {
          itemId: "gems_300",
          name: "Large Gem Pack",
          description: "300 Premium Gems",
          price: 19.99,
          gems: 300,
          bonus: "50% Bonus"
        },
        {
          itemId: "gems_1000",
          name: "Mega Gem Pack",
          description: "1000 Premium Gems",
          price: 49.99,
          gems: 1000,
          bonus: "BEST VALUE"
        }
      ];

      // Daily rotation logic
      const now = new Date();
      const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
      
      // Filter items for daily rotation
      const premiumItems = [...equipment.filter(item => item.isPremium), ...consumables.filter(item => item.isPremium)];
      const creditItems = [...equipment.filter(item => !item.isPremium), ...consumables.filter(item => !item.isPremium)];
      
      // Rotate 6 premium items daily (mix of equipment and consumables)
      const dailyPremiumItems = [];
      for (let i = 0; i < 6; i++) {
        const index = (dayOfYear + i) % premiumItems.length;
        dailyPremiumItems.push(premiumItems[index]);
      }
      
      // Rotate 6 credit items daily (mix of equipment and consumables)
      const dailyCreditItems = [];
      for (let i = 0; i < 6; i++) {
        const index = (dayOfYear + i) % creditItems.length;
        dailyCreditItems.push(creditItems[index]);
      }

      // Check daily purchase limits
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const exhibitionPurchases = await db.select()
        .from(teamInventory)
        .where(and(
          eq(teamInventory.teamId, team.id),
          eq(teamInventory.name, "Exhibition Match Entry"),
          gte(teamInventory.acquiredAt, today)
        ));
        
      const tournamentPurchases = await db.select()
        .from(teamInventory)
        .where(and(
          eq(teamInventory.teamId, team.id),
          eq(teamInventory.name, "Tournament Entry"),
          gte(teamInventory.acquiredAt, today)
        ));

      // Debug logging
      console.log('=== STORE API DEBUG ===');
      console.log('Equipment total:', equipment.length);
      console.log('Consumables total:', consumables.length);
      console.log('Equipment premium items:', equipment.filter(item => item.isPremium).length);
      console.log('Equipment credit items:', equipment.filter(item => !item.isPremium).length);
      console.log('Consumables premium items:', consumables.filter(item => item.isPremium).length);
      console.log('Consumables credit items:', consumables.filter(item => !item.isPremium).length);
      console.log('Premium items count:', premiumItems.length);
      console.log('Credit items count:', creditItems.length);
      console.log('Daily premium items:', dailyPremiumItems.length);
      console.log('Daily credit items:', dailyCreditItems.length);
      console.log('Entries count:', entries.length);
      console.log('Gem packages count:', gemPackages.length);
      console.log('Day of year:', dayOfYear);
      console.log('=====================');

      // Get team finances
      const teamFinances = await storage.getTeamFinances(team.id);

      // Format response
      res.json({
        finances: {
          credits: teamFinances?.credits || 0,
          premiumCurrency: teamFinances?.premiumCurrency || 0
        },
        equipment: equipment.map(item => ({
          ...item,
          icon: getRarityIcon(item.rarity),
          owned: inventory.some(inv => inv.itemId === item.itemId)
        })),
        consumables: consumables.map(item => ({
          ...item,
          icon: getConsumableIcon(item.itemType),
          quantityOwned: inventory.filter(inv => inv.itemId === item.itemId).length
        })),
        dailyPremiumItems: dailyPremiumItems.map(item => ({
          ...item,
          icon: getRarityIcon(item.rarity),
          owned: inventory.some(inv => inv.itemId === item.itemId)
        })),
        dailyCreditItems: dailyCreditItems.map(item => ({
          ...item,
          icon: getRarityIcon(item.rarity),
          owned: inventory.some(inv => inv.itemId === item.itemId)
        })),
        entries: entries.map(entry => ({
          ...entry,
          icon: entry.itemType === "entry" ? (entry.itemId.includes("exhibition") ? "🏟️" : "🏆") : "🎮",
          purchasedToday: entry.itemId === "entry_exhibition" ? exhibitionPurchases.length : tournamentPurchases.length,
          canPurchase: entry.itemId === "entry_exhibition" 
            ? exhibitionPurchases.length < entry.dailyLimit
            : tournamentPurchases.length < entry.dailyLimit
        })),
        gemPackages,
        nextRotation: new Date(today.getTime() + 86400000).toISOString()
      });
    } catch (error) {
      console.error("Store error:", error);
      res.status(500).json({ message: "Failed to load store" });
    }
  });

  // Store purchase endpoint
  app.post('/api/store/purchase', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { itemId, currency } = req.body;
      
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const finances = await storage.getTeamFinances(team.id);
      if (!finances) {
        return res.status(404).json({ message: "Team finances not found" });
      }

      // Get all item data
      const allItems = [
        // Equipment
        { itemId: "101", name: "Standard Leather Helmet", itemType: "equipment", creditPrice: 1000, gemPrice: 0, isPremium: false },
        { itemId: "102", name: "Gryllstone Plated Helm", itemType: "equipment", creditPrice: 5000, gemPrice: 10, isPremium: false },
        { itemId: "103", name: "Sylvan Barkwood Circlet", itemType: "equipment", creditPrice: 5000, gemPrice: 10, isPremium: false },
        { itemId: "104", name: "Umbral Cowl", itemType: "equipment", creditPrice: 0, gemPrice: 25, isPremium: true },
        { itemId: "105", name: "Helm of Command", itemType: "equipment", creditPrice: 0, gemPrice: 50, isPremium: true },
        { itemId: "201", name: "Padded Leather Armor", itemType: "equipment", creditPrice: 1000, gemPrice: 0, isPremium: false },
        { itemId: "202", name: "Lumina's Radiant Aegis", itemType: "equipment", creditPrice: 0, gemPrice: 50, isPremium: true },
        { itemId: "203", name: "Gryll Forged Plate", itemType: "equipment", creditPrice: 0, gemPrice: 25, isPremium: true },
        { itemId: "301", name: "Standard Leather Gloves", itemType: "equipment", creditPrice: 1000, gemPrice: 0, isPremium: false },
        { itemId: "302", name: "Sylvan Gripping Vines", itemType: "equipment", creditPrice: 0, gemPrice: 25, isPremium: true },
        { itemId: "303", name: "Umbral Shadowgrips", itemType: "equipment", creditPrice: 5000, gemPrice: 10, isPremium: false },
        { itemId: "401", name: "Worn Cleats", itemType: "equipment", creditPrice: 1000, gemPrice: 0, isPremium: false },
        { itemId: "402", name: "Boots of the Gryll", itemType: "equipment", creditPrice: 2500, gemPrice: 5, isPremium: false },
        { itemId: "403", name: "Lumina's Light-Treads", itemType: "equipment", creditPrice: 0, gemPrice: 25, isPremium: true },
        // Consumables
        { itemId: "1001", name: "Basic Energy Drink", itemType: "consumable", creditPrice: 500, gemPrice: 0, isPremium: false },
        { itemId: "1002", name: "Advanced Recovery Serum", itemType: "consumable", creditPrice: 2000, gemPrice: 5, isPremium: false },
        { itemId: "1003", name: "Phoenix Elixir", itemType: "consumable", creditPrice: 0, gemPrice: 20, isPremium: true },
        { itemId: "2001", name: "Basic Medical Kit", itemType: "consumable", creditPrice: 1000, gemPrice: 0, isPremium: false },
        { itemId: "2002", name: "Advanced Treatment", itemType: "consumable", creditPrice: 3000, gemPrice: 10, isPremium: false },
        { itemId: "2003", name: "Miracle Cure", itemType: "consumable", creditPrice: 0, gemPrice: 30, isPremium: true },
        { itemId: "3001", name: "Speed Boost Tonic", itemType: "consumable", creditPrice: 1500, gemPrice: 3, isPremium: false },
        { itemId: "3002", name: "Power Surge Potion", itemType: "consumable", creditPrice: 1500, gemPrice: 3, isPremium: false },
        { itemId: "3003", name: "Champion's Blessing", itemType: "consumable", creditPrice: 0, gemPrice: 15, isPremium: true },
        // Entries
        { itemId: "entry_exhibition", name: "Exhibition Match Entry", itemType: "entry", creditPrice: 5000, gemPrice: 5, isPremium: false, dailyLimit: 3 },
        { itemId: "entry_tournament", name: "Tournament Entry", itemType: "entry", creditPrice: 10000, gemPrice: 10, isPremium: false, dailyLimit: 1 }
      ];

      const item = allItems.find(i => i.itemId === itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      // Check daily purchase limits for entries
      if (item.itemType === "entry" && item.dailyLimit) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayPurchases = await db.select()
          .from(teamInventory)
          .where(and(
            eq(teamInventory.teamId, team.id),
            eq(teamInventory.itemId, itemId),
            gte(teamInventory.purchasedAt, today)
          ));
          
        if (todayPurchases.length >= item.dailyLimit) {
          return res.status(400).json({ message: `Daily limit reached for ${item.name}` });
        }
      }

      // Check equipment isn't already owned
      if (item.itemType === "equipment") {
        const existing = await db.select()
          .from(teamInventory)
          .where(and(
            eq(teamInventory.teamId, team.id),
            eq(teamInventory.itemId, itemId)
          ));
          
        if (existing.length > 0) {
          return res.status(400).json({ message: "You already own this equipment" });
        }
      }

      // Check currency and deduct payment
      let cost = 0;
      if (currency === "credits") {
        cost = item.creditPrice;
        if (cost === 0 || item.isPremium) {
          return res.status(400).json({ message: "This item cannot be purchased with credits" });
        }
        if ((finances.credits || 0) < cost) {
          return res.status(400).json({ message: "Insufficient credits" });
        }
        await storage.updateTeamCredits(team.id, (finances.credits || 0) - cost);
      } else if (currency === "gems") {
        cost = item.gemPrice;
        if (cost === 0) {
          return res.status(400).json({ message: "This item cannot be purchased with gems" });
        }
        if ((finances.premiumCurrency || 0) < cost) {
          return res.status(400).json({ message: "Insufficient premium gems" });
        }
        await storage.updateTeamPremiumCurrency(team.id, (finances.premiumCurrency || 0) - cost);
      } else {
        return res.status(400).json({ message: "Invalid currency type" });
      }

      // Add item to inventory
      await db.insert(teamInventory).values({
        teamId: team.id,
        itemType: item.itemType,
        name: item.name,
        description: item.description || "",
        rarity: item.rarity || "common",
        quantity: 1,
        acquiredAt: new Date()
      });

      // Create notification
      await storage.createNotification({
        userId: userId,
        type: 'purchase',
        title: 'Purchase Successful',
        message: `You purchased ${item.name} for ${cost} ${currency === "credits" ? "credits" : "gems"}`
      });

      res.json({ 
        success: true, 
        message: `Purchased ${item.name}`,
        remainingCredits: currency === "credits" ? (finances.credits || 0) - cost : finances.credits,
        remainingGems: currency === "gems" ? (finances.premiumCurrency || 0) - cost : finances.premiumCurrency
      });
    } catch (error) {
      console.error("Purchase error:", error);
      res.status(500).json({ message: "Failed to complete purchase" });
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

  // Stadium routes - OLD REMOVED
  /* app.get('/api/stadium', isAuthenticated, async (req, res) => {
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
      
      // Clean referral data - no mock statistics
      const referralData = {
        myCode: `REF${userId.slice(-6).toUpperCase()}`,
        totalReferrals: 0,
        creditsEarned: 0,
        gemsEarned: 0,
        activeReferrals: 0,
        hasUsedReferral: false,
        recentReferrals: []
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
      // Clean redemption history - no mock entries
      const history = [];
      
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

  // Division names now handled by unified division system

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

      // Start the live match in the state manager
      await matchStateManager.startLiveMatch(match.id, true);

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

  // Stadium Management Routes - OLD REMOVED
  /* app.get('/api/stadium', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/injuries/:playerId/use-recovery-item', isAuthenticated, async (req: any, res) => {
    try {
      const { playerId } = req.params;
      const { itemType, recoveryPoints } = req.body;
      const userId = req.user.claims.sub;

      // Get team and player
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const player = await storage.getPlayerById(playerId);
      if (!player || player.teamId !== team.id) {
        return res.status(404).json({ message: "Player not found or doesn't belong to your team" });
      }

      // Check daily item usage limit
      if ((player.dailyItemsUsed || 0) >= 3) {
        return res.status(400).json({ message: "Player has reached daily item limit (3 items)" });
      }

      // Apply recovery points and increment usage
      const updatedPlayer = await storage.applyRecoveryPoints(playerId, recoveryPoints);
      await storage.incrementPlayerItemUsage(playerId);

      res.json({
        success: true,
        message: `Applied ${recoveryPoints} recovery points to ${player.name}`,
        player: updatedPlayer,
        itemsUsedToday: (player.dailyItemsUsed || 0) + 1
      });
    } catch (error) {
      console.error("Error using recovery item:", error);
      res.status(500).json({ message: "Failed to use recovery item" });
    }
  });

  app.get('/api/team/:teamId/injured-players', isAuthenticated, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const userId = req.user.claims.sub;

      const team = await storage.getTeamByUserId(userId);
      if (!team || team.id !== teamId) {
        return res.status(403).json({ message: "Unauthorized to view this team" });
      }

      const players = await storage.getPlayersByTeamId(teamId);
      const injuredPlayers = players.filter(p => 
        p.injuryStatus && p.injuryStatus !== "Healthy" && (p.recoveryPointsNeeded || 0) > 0
      );

      res.json(injuredPlayers);
    } catch (error) {
      console.error("Error fetching injured players:", error);
      res.status(500).json({ message: "Failed to fetch injured players" });
    }
  });

  // Stadium routes - REMOVED: Duplicate route that conflicts with /api/stadium/full

  // REMOVED: Duplicate stadium upgrade route - conflicts with earlier definition

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
        
        // Handle tackle event with injury calculation
        if (randomEventType === 'tackle' && match.type !== 'exhibition') {
          const tackler = randomPlayer;
          const carrier = allPlayers[Math.floor(Math.random() * allPlayers.length)];
          
          if (tackler.id !== carrier.id) {
            // Calculate injury chance based on game mode
            let baseInjuryChance = 0;
            if (match.type === 'league') {
              baseInjuryChance = 20;
            } else if (match.type === 'tournament') {
              baseInjuryChance = 5;
            } // Exhibition matches have 0% chance (already handled)
            
            // Calculate power modifier
            const powerModifier = ((tackler.power || 20) - (carrier.agility || 20)) * 0.5;
            
            // Calculate stamina modifier
            let staminaModifier = 0;
            if ((carrier.dailyStaminaLevel || 100) < 50) {
              staminaModifier = 10;
            }
            
            const finalInjuryChance = baseInjuryChance + powerModifier + staminaModifier;
            const injuryRoll = Math.random() * 100;
            
            if (injuryRoll <= finalInjuryChance) {
              // Injury occurs - determine severity
              const severityRoll = Math.random() * 100;
              let injuryStatus = "Minor Injury";
              let recoveryPointsNeeded = 100;
              
              if (severityRoll > 95) {
                injuryStatus = "Severe Injury";
                recoveryPointsNeeded = 750;
              } else if (severityRoll > 70) {
                injuryStatus = "Moderate Injury";
                recoveryPointsNeeded = 300;
              }
              
              // Update player injury status
              await storage.updatePlayerInjury(carrier.id, injuryStatus, recoveryPointsNeeded);
              
              // Add injury event with special description
              events.push({
                id: `event-${Date.now()}-${i}`,
                type: 'injury',
                playerId: carrier.id,
                playerName: carrier.name,
                playerRace: carrier.race,
                description: `[${formatGameTime(match.timeRemaining || 900)}] ${carrier.name} is leveled by a powerful tackle from ${tackler.name}! He's slow to get up... the team trainer reports a ${injuryStatus.toLowerCase()}.`,
                intensity: 'critical',
                timestamp: Date.now(),
                position: {
                  x: Math.random() * 800,
                  y: Math.random() * 400
                },
                quarter: match.quarter || 1,
                gameTime: match.timeRemaining || 900,
                injuryDetails: {
                  injuryStatus,
                  recoveryPointsNeeded,
                  tackler: tackler.name,
                  carrier: carrier.name
                }
              });
              
              continue; // Skip normal tackle event
            }
          }
        }
        
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

  function formatGameTime(seconds: number): string {
    const minutes = Math.floor((900 - seconds) / 60);
    const secs = Math.floor((900 - seconds) % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        return res.json({ schedule: {} });
      }

      // Get all league matches, grouped by day
      const allMatches = [];
      for (let division = 1; division <= 8; division++) {
        const divisionMatches = await storage.getMatchesByDivision(division);
        allMatches.push(...divisionMatches);
      }

      // Group matches by game day and populate team names
      const scheduleByDay = {};
      
      for (let day = 1; day <= 17; day++) {
        const dayMatches = allMatches.filter(match => match.gameDay === day);
        
        if (dayMatches.length > 0) {
          // Ensure exactly 4 games per League Day
          const selectedMatches = dayMatches.slice(0, 4);
          
          // Generate 4 daily game times with 15-minute intervals
          const daySchedule = generateDailyGameTimes(day);
          
          // Populate team names for each match
          const matchesWithTeamNames = await Promise.all(
            selectedMatches.map(async (match, index) => {
              const homeTeam = await storage.getTeamById(match.homeTeamId);
              const awayTeam = await storage.getTeamById(match.awayTeamId);
              
              return {
                ...match,
                homeTeamName: homeTeam?.name || `Team ${match.homeTeamId.slice(0, 8)}`,
                awayTeamName: awayTeam?.name || `Team ${match.awayTeamId.slice(0, 8)}`,
                scheduledTime: daySchedule[index],
                scheduledTimeFormatted: formatEasternTime(daySchedule[index]),
                isLive: match.status === 'in_progress',
                canWatch: match.status === 'in_progress' || match.status === 'scheduled',
                watchUrl: `/match/${match.id}`
              };
            })
          );
          
          scheduleByDay[day] = matchesWithTeamNames;
        }
      }

      res.json({ 
        schedule: scheduleByDay,
        totalDays: 17,
        currentDay: currentSeason.currentDay || 1
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

  // Generate Season Schedule (SuperUser only)
  app.post('/api/superuser/generate-schedule', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      
      if (!team || team.name !== "Macomb Cougars") {
        return res.status(403).json({ message: "Unauthorized: SuperUser access required" });
      }

      const currentSeason = await storage.getCurrentSeason();
      if (!currentSeason) {
        return res.status(400).json({ message: "No active season found" });
      }

      let totalMatches = 0;

      // Generate matches for each division (1-8)
      for (let division = 1; division <= 8; division++) {
        const teams = await storage.getTeamsByDivision(division);
        console.log(`Generating matches for Division ${division} with ${teams.length} teams`);
        
        if (teams.length < 2) continue;

        // Create league for this division if it doesn't exist
        let league = await storage.getActiveLeagueByDivision(division);
        if (!league) {
          league = await storage.createLeague({
            name: `Division ${division} League`,
            division: division,
            seasonId: currentSeason.id,
            status: 'active'
          });
        }

        // Generate balanced schedule (each team plays every other team twice)
        const matches = [];
        for (let i = 0; i < teams.length; i++) {
          for (let j = i + 1; j < teams.length; j++) {
            const homeTeam = teams[i];
            const awayTeam = teams[j];

            // Create two matches (home and away)
            matches.push({ homeTeam, awayTeam });
            matches.push({ homeTeam: awayTeam, awayTeam: homeTeam });
          }
        }

        // Distribute matches evenly across 14 game days (regular season)
        // We want exactly 4 games per League Day maximum
        const gamesPerDay = 4;
        const totalGameDays = 14; // Days 1-14 are regular season
        
        matches.forEach((match, index) => {
          const gameDay = Math.floor(index / gamesPerDay) + 1;
          // Ensure we don't exceed 14 days by wrapping around
          const finalGameDay = Math.min(gameDay, totalGameDays);
          
          storage.createMatch({
            leagueId: league.id,
            homeTeamId: match.homeTeam.id,
            awayTeamId: match.awayTeam.id,
            status: 'scheduled',
            gameDay: finalGameDay,
            scheduledTime: null
          });
          totalMatches++;
        });
      }

      res.json({ 
        message: `Season schedule generated successfully! Created ${totalMatches} matches across all divisions.`,
        totalMatches
      });
    } catch (error) {
      console.error("Error generating schedule:", error);
      res.status(500).json({ message: "Failed to generate schedule" });
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
        if (currentDay === 16) {
          description = "Promotion & Relegation";
          details = "League re-shuffle in progress. Teams move between divisions based on performance.";
        } else {
          description = "Management Phase";
          details = "Sign free agents, handle contracts, and prepare for the upcoming season.";
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

      // Perform daily reset operations
      await storage.resetAllPlayersDailyItems();
      await storage.performDailyRecovery();

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

  // SuperUser Player Management
  app.post('/api/superuser/add-players', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (userId !== "44010914") {
        return res.status(403).json({ message: "Unauthorized: SuperUser access required" });
      }

      const { teamId, count = 3 } = req.body;
      const createdPlayers = [];

      const races = ['human', 'sylvan', 'gryll', 'lumina', 'umbra'];
      const firstNames = {
        human: ['Alex', 'Jordan', 'Casey', 'Morgan', 'Riley'],
        sylvan: ['Elarian', 'Thalanis', 'Silviana', 'Vaelthore', 'Nimrodel'],
        gryll: ['Grimjaw', 'Thokgar', 'Urdnot', 'Grimaxe', 'Thorgrim'],
        lumina: ['Celestine', 'Aurelius', 'Luminara', 'Radiance', 'Stellaris'],
        umbra: ['Shadowbane', 'Voidwhisper', 'Darkstorm', 'Nightfall', 'Vex']
      };
      const lastNames = {
        human: ['Stone', 'River', 'Hill', 'Cross', 'Vale'],
        sylvan: ['Moonwhisper', 'Starleaf', 'Windrunner', 'Dawnblade', 'Nightshade'],
        gryll: ['Ironhide', 'Stormfist', 'Rockbreaker', 'Wildaxe', 'Bloodfang'],
        lumina: ['Starshard', 'Lightbringer', 'Dawnfire', 'Brightblade', 'Sunward'],
        umbra: ['Voidstep', 'Darkbane', 'Shadowweaver', 'Nightblade', 'Grimheart']
      };

      for (let i = 0; i < count; i++) {
        const race = races[Math.floor(Math.random() * races.length)];
        const firstName = firstNames[race][Math.floor(Math.random() * firstNames[race].length)];
        const lastName = lastNames[race][Math.floor(Math.random() * lastNames[race].length)];
        const name = `${firstName} ${lastName}`;

        // Generate random stats (18-35 range for balanced players)
        const speed = 18 + Math.floor(Math.random() * 18);
        const power = 18 + Math.floor(Math.random() * 18);
        const throwing = 18 + Math.floor(Math.random() * 18);
        const catching = 18 + Math.floor(Math.random() * 18);
        const kicking = 18 + Math.floor(Math.random() * 18);
        const stamina = 18 + Math.floor(Math.random() * 18);
        const leadership = 18 + Math.floor(Math.random() * 18);
        const agility = 18 + Math.floor(Math.random() * 18);

        // Determine tactical role based on stats
        const passerScore = (throwing * 2) + (leadership * 1.5);
        const runnerScore = (speed * 2) + (agility * 1.5);
        const blockerScore = (power * 2) + (stamina * 1.5);
        const maxScore = Math.max(passerScore, runnerScore, blockerScore);
        
        let tacticalRole = "Blocker";
        if (maxScore === passerScore) tacticalRole = "Passer";
        else if (maxScore === runnerScore) tacticalRole = "Runner";

        const player = await storage.createPlayer({
          teamId: teamId,
          firstName: firstName,
          lastName: lastName,
          name: name,
          race: race,
          speed: speed,
          power: power,
          throwing: throwing,
          catching: catching,
          kicking: kicking,
          stamina: stamina,
          leadership: leadership,
          agility: agility,
          age: 18 + Math.floor(Math.random() * 10),
          position: tacticalRole,
          tacticalRole: tacticalRole,
          salary: 30000 + Math.floor(Math.random() * 25000),
          contractSeasons: 3,
          contractStartSeason: 0,
          isStarter: false,
          isMarketplace: false
        });
        
        createdPlayers.push(player);
      }

      res.json({ 
        message: `Successfully created ${count} players`,
        players: createdPlayers
      });
    } catch (error) {
      console.error("Error creating players:", error);
      res.status(500).json({ message: "Failed to create players" });
    }
  });

  // Stripe Payment Processing Routes

  // Seed default credit packages (run once)
  app.post('/api/payments/seed-packages', async (req, res) => {
    try {
      const defaultPackages = [
        {
          name: "Starter Pack",
          description: "Perfect for getting started",
          credits: 5000,
          price: 499, // $4.99 in cents
          bonusCredits: 0,
          isActive: true,
          popularTag: false,
          discountPercent: 0
        },
        {
          name: "Growth Pack",
          description: "Great value for active players",
          credits: 15000,
          price: 999, // $9.99 in cents
          bonusCredits: 2000,
          isActive: true,
          popularTag: true,
          discountPercent: 0
        },
        {
          name: "Pro Pack",
          description: "For serious competitors",
          credits: 35000,
          price: 1999, // $19.99 in cents
          bonusCredits: 8000,
          isActive: true,
          popularTag: false,
          discountPercent: 0
        },
        {
          name: "Elite Pack",
          description: "Maximum value for champions",
          credits: 75000,
          price: 3999, // $39.99 in cents
          bonusCredits: 20000,
          isActive: true,
          popularTag: false,
          discountPercent: 0
        }
      ];

      const createdPackages = [];
      for (const packageData of defaultPackages) {
        const pkg = await storage.createCreditPackage(packageData);
        createdPackages.push(pkg);
      }

      res.json({ 
        message: "Credit packages seeded successfully",
        packages: createdPackages
      });
    } catch (error) {
      console.error("Error seeding credit packages:", error);
      res.status(500).json({ message: "Failed to seed credit packages" });
    }
  });

  // Get available credit packages
  app.get('/api/payments/packages', async (req, res) => {
    try {
      const packages = await storage.getCreditPackages();
      res.json(packages);
    } catch (error) {
      console.error("Error fetching credit packages:", error);
      res.status(500).json({ message: "Failed to fetch credit packages" });
    }
  });

  // Create payment intent for credit purchase
  app.post("/api/payments/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { packageId } = req.body;

      const creditPackage = await storage.getCreditPackageById(packageId);
      if (!creditPackage) {
        return res.status(404).json({ message: "Credit package not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create Stripe customer if not exists
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: userId,
            realmRivalryUser: true
          }
        });
        stripeCustomerId = customer.id;
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: creditPackage.price,
        currency: "usd",
        customer: stripeCustomerId,
        metadata: {
          userId: userId,
          packageId: packageId,
          credits: creditPackage.credits.toString(),
          bonusCredits: creditPackage.bonusCredits?.toString() || "0"
        },
      });

      // Store transaction in database
      await storage.createPaymentTransaction({
        userId: userId,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: stripeCustomerId,
        amount: creditPackage.price,
        credits: creditPackage.credits + (creditPackage.bonusCredits || 0),
        status: "pending",
        currency: "usd"
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        packageName: creditPackage.name,
        totalCredits: creditPackage.credits + (creditPackage.bonusCredits || 0)
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Webhook to handle successful payments
  app.post("/api/payments/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      if (endpointSecret) {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } else {
        event = req.body;
      }
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      
      try {
        // Find the transaction
        const transaction = await storage.getPaymentTransactionByStripeId(paymentIntent.id);
        if (!transaction) {
          console.error("Transaction not found for payment intent:", paymentIntent.id);
          return res.status(404).json({ message: "Transaction not found" });
        }

        // Update transaction status
        await storage.updatePaymentTransaction(transaction.id, {
          status: "completed",
          completedAt: new Date(),
          receiptUrl: paymentIntent.charges?.data?.[0]?.receipt_url
        });

        // Add credits to user's team
        const user = await storage.getUser(transaction.userId);
        if (user) {
          const team = await storage.getTeamByUserId(user.id);
          if (team) {
            const finances = await storage.getTeamFinances(team.id);
            if (finances) {
              await storage.updateTeamFinances(team.id, {
                credits: (finances.credits || 0) + transaction.credits
              });
            }
          }
        }

        console.log(`Payment completed successfully for user ${transaction.userId}, ${transaction.credits} credits added`);
      } catch (error) {
        console.error("Error processing payment success:", error);
      }
    }

    res.json({ received: true });
  });

  // Get user's payment history
  app.get('/api/payments/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const history = await storage.getUserPaymentHistory(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ message: "Failed to fetch payment history" });
    }
  });

  // Premium Gem purchase with Stripe
  app.post("/api/payments/purchase-gems", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { packageId } = req.body;

      // Find the gem package
      const gemPackages = [
        { id: "gems_starter", price: 499, gems: 50, bonus: 0 },
        { id: "gems_regular", price: 999, gems: 110, bonus: 10 },
        { id: "gems_premium", price: 1999, gems: 250, bonus: 50 },
        { id: "gems_ultimate", price: 4999, gems: 700, bonus: 200 }
      ];

      const gemPackage = gemPackages.find(pkg => pkg.id === packageId);
      if (!gemPackage) {
        return res.status(404).json({ message: "Gem package not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create payment intent for gems
      const paymentIntent = await stripe.paymentIntents.create({
        amount: gemPackage.price,
        currency: "usd",
        metadata: {
          userId: userId,
          packageId: packageId,
          gems: gemPackage.gems.toString(),
          bonusGems: gemPackage.bonus.toString(),
          type: "gem_purchase"
        }
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error: any) {
      console.error("Error creating gem payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Premium Gem to Credits conversion
  app.post("/api/store/convert-gems", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { gemsAmount } = req.body;

      if (!gemsAmount || gemsAmount < 1) {
        return res.status(400).json({ message: "Invalid gems amount" });
      }

      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const finances = await storage.getTeamFinances(team.id);
      if (!finances) {
        return res.status(404).json({ message: "Team finances not found" });
      }

      if ((finances.premiumCurrency || 0) < gemsAmount) {
        return res.status(400).json({ message: "Insufficient Premium Gems" });
      }

      // Conversion rate: 1 gem = 1000 credits
      const creditsToAdd = gemsAmount * 1000;

      await storage.updateTeamFinances(team.id, {
        premiumCurrency: (finances.premiumCurrency || 0) - gemsAmount,
        credits: (finances.credits || 0) + creditsToAdd
      });

      res.json({ 
        success: true,
        gemsSpent: gemsAmount,
        creditsGained: creditsToAdd,
        message: `Converted ${gemsAmount} Premium Gems to ${creditsToAdd} Credits`
      });
    } catch (error) {
      console.error("Error converting gems to credits:", error);
      res.status(500).json({ message: "Failed to convert gems" });
    }
  });

  // Removed test stadium route to prevent conflicts

  // Comprehensive Stadium API - NEW VERSION
  app.get('/api/stadium/full', isAuthenticated, async (req: any, res) => {
    try {
      console.log("=== STADIUM FULL API REACHED ===");
      
      // Set explicit JSON headers to prevent Vite interference
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache');
      
      const userId = req.user.claims.sub;
      console.log("Processing stadium for user:", userId);
      
      const team = await storage.getTeamByUserId(userId);
      console.log("Team found:", team?.id, team?.name);
      
      if (!team) {
        console.log("No team found for user");
        return res.status(404).json({ message: "Team not found" });
      }

      let stadium = await storage.getTeamStadium(team.id);
      
      // Create default stadium if none exists
      if (!stadium) {
        stadium = await storage.createStadium({
          teamId: team.id,
          name: `${team.name} Arena`,
          capacity: 15000,
          level: 1,
          fieldType: "standard",
          fieldSize: "regulation",
          lighting: "basic",
          surface: "grass",
          drainage: "basic",
          facilities: JSON.stringify({
            seating: 1,
            concessions: 1,
            parking: 1,
            lighting: 1,
            screens: 1,
            medical: 1,
            security: 1,
            training: 1,
            vip: 1
          }),
          upgradeCost: 100000,
          maintenanceCost: 10000,
          revenueMultiplier: 100,
          weatherResistance: 50,
          homeAdvantage: 5
        });
      }

      // Parse facilities if it's a string
      if (typeof stadium.facilities === 'string') {
        stadium.facilities = JSON.parse(stadium.facilities);
      }

      // Calculate stadium stats
      const atmosphere = Math.min(100, 
        stadium.level * 10 + 
        (stadium.facilities.vip || 0) * 5 + 
        (stadium.facilities.screens || 0) * 3
      );

      const revenueBoost = stadium.revenueMultiplier - 100;

      // Generate available upgrades based on current stadium
      const availableUpgrades = [];
      
      // Capacity upgrades
      if (stadium.capacity < 50000) {
        availableUpgrades.push({
          id: 'capacity-expansion',
          name: 'Capacity Expansion',
          type: 'seating',
          cost: stadium.capacity * 10,
          effect: `+${Math.floor(stadium.capacity * 0.2)} seats`,
          description: 'Expand seating capacity to accommodate more fans',
          available: true
        });
      }

      // Facility upgrades
      const facilityTypes = ['concessions', 'parking', 'screens', 'vip', 'security', 'medical'];
      facilityTypes.forEach(type => {
        const currentLevel = stadium.facilities[type] || 1;
        if (currentLevel < 5) {
          availableUpgrades.push({
            id: `${type}-upgrade`,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} Upgrade`,
            type: 'facility',
            cost: currentLevel * 25000,
            effect: `Level ${currentLevel} → ${currentLevel + 1}`,
            description: `Improve ${type} facilities for better fan experience`,
            available: stadium.level >= Math.floor(currentLevel / 2),
            requirements: stadium.level < Math.floor(currentLevel / 2) ? `Stadium Level ${Math.floor(currentLevel / 2)}` : undefined
          });
        }
      });

      // Field upgrades
      if (stadium.surface === 'grass' && stadium.level >= 3) {
        availableUpgrades.push({
          id: 'hybrid-surface',
          name: 'Hybrid Surface Installation',
          type: 'field',
          cost: 150000,
          effect: 'Weather resistance +20%',
          description: 'Install modern hybrid grass for all-weather play',
          available: true
        });
      }

      // Calculate revenue breakdown
      const baseMatchRevenue = stadium.capacity * 25; // $25 per seat average
      const revenue = {
        matchDay: Math.floor(baseMatchRevenue * (stadium.revenueMultiplier / 100)),
        concessions: Math.floor(stadium.capacity * 8 * (stadium.facilities.concessions || 1)),
        parking: Math.floor(stadium.capacity * 0.3 * 10 * (stadium.facilities.parking || 1)),
        vip: Math.floor((stadium.facilities.vip || 1) * 5000),
        apparel: Math.floor(stadium.capacity * 3 * (stadium.facilities.merchandising || 1)), // New apparel revenue
        total: 0
      };
      revenue.total = revenue.matchDay + revenue.concessions + revenue.parking + revenue.vip + revenue.apparel;

      // Get recent match history
      const matches = await storage.getMatchesByTeamId(team.id);
      const homeMatches = matches
        .filter(m => m.homeTeamId === team.id && m.status === 'completed')
        .slice(0, 5)
        .map(match => ({
          opponent: match.awayTeamId, // Would need to fetch team name
          date: match.scheduledTime,
          result: match.homeScore > match.awayScore ? 'W' : match.homeScore < match.awayScore ? 'L' : 'D',
          attendance: Math.floor(stadium.capacity * (0.7 + Math.random() * 0.3)),
          revenue: Math.floor(revenue.total * (0.8 + Math.random() * 0.4)),
          atmosphere: Math.floor(atmosphere * (0.8 + Math.random() * 0.2))
        }));

      // Calculate season stats
      const completedHomeMatches = matches.filter(m => 
        m.homeTeamId === team.id && m.status === 'completed'
      );
      const homeWins = completedHomeMatches.filter(m => m.homeScore > m.awayScore).length;
      const totalHomeMatches = completedHomeMatches.length || 1;

      const responseData = {
        stadium: {
          ...stadium,
          atmosphere,
          revenueBoost,
          avgAttendance: Math.floor(stadium.capacity * 0.85),
          seasonRevenue: revenue.total * totalHomeMatches,
          homeWinRate: Math.floor((homeWins / totalHomeMatches) * 100)
        },
        availableUpgrades,
        revenue,
        matchHistory: homeMatches
      };
      
      console.log("Stadium API Response Data:", JSON.stringify(responseData, null, 2));
      console.log("=== END STADIUM API DEBUG ===");
      
      // Ensure JSON response is properly sent and returned
      res.json(responseData);
      return;

    } catch (error) {
      console.error("=== STADIUM API ERROR ===");
      console.error("Error fetching stadium data:", error);
      console.error("Error stack:", error.stack);
      console.error("=== END STADIUM API ERROR ===");
      res.status(500).json({ message: "Failed to fetch stadium data" });
    }
  });

  const httpServer = createServer(app);
  // Ad System Routes
  app.post('/api/ads/view', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { adType, placement, rewardType, rewardAmount, completed } = req.body;

      // Create ad view record
      const adView = await storage.createAdView({
        userId,
        adType,
        placement,
        rewardType,
        rewardAmount,
        completed,
        completedAt: completed ? new Date() : null
      });

      // Award rewards if ad was completed
      if (completed && rewardType !== 'none' && rewardAmount > 0) {
        const team = await storage.getTeamByUserId(userId);
        if (team) {
          const finances = await storage.getTeamFinances(team.id);
          if (finances) {
            if (rewardType === 'credits') {
              await storage.updateTeamFinances(team.id, {
                credits: (finances.credits || 0) + rewardAmount
              });
            } else if (rewardType === 'premium_currency') {
              await storage.updateTeamFinances(team.id, {
                premiumCurrency: (finances.premiumCurrency || 0) + rewardAmount
              });
            }
          }
        }
      }

      res.json({ success: true, adView });
    } catch (error) {
      console.error('Error processing ad view:', error);
      res.status(500).json({ message: 'Failed to process ad view' });
    }
  });

  app.get('/api/ads/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const dailyViews = await storage.getDailyAdViews(userId);
      const allViews = await storage.getAdViewsByUser(userId);
      
      res.json({
        dailyViews,
        totalViews: allViews.length,
        completedViews: allViews.filter(v => v.completed).length
      });
    } catch (error) {
      console.error('Error fetching ad stats:', error);
      res.status(500).json({ message: 'Failed to fetch ad statistics' });
    }
  });

  // ===== TEAM SCOUTING SYSTEM =====

  // Get team scouting report (based on user's scouting capabilities)
  app.get("/api/teams/:teamId/scout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { teamId } = req.params;
      const userTeam = await storage.getTeamByUserId(userId);
      
      if (!userTeam) {
        return res.status(404).json({ message: "User team not found" });
      }

      // Get the target team
      const targetTeam = await storage.getTeamById(teamId);
      if (!targetTeam) {
        return res.status(404).json({ message: "Target team not found" });
      }

      // Get user's scouting staff to determine accuracy level
      const userStaff = await storage.getStaffByTeamId(userTeam.id);
      const scouts = userStaff.filter(staff => 
        staff.type === 'head_scout' || staff.type === 'recruiting_scout'
      );

      // Calculate total scouting power (affects accuracy)
      let scoutingPower = 0;
      scouts.forEach(scout => {
        scoutingPower += scout.scoutingRating || 0;
      });

      // Base scouting level (everyone gets basic info)
      let scoutingLevel = 1;
      if (scoutingPower >= 50) scoutingLevel = 2; // Decent scouting
      if (scoutingPower >= 100) scoutingLevel = 3; // Good scouting
      if (scoutingPower >= 150) scoutingLevel = 4; // Excellent scouting

      // Get target team data
      const [targetPlayers, targetStaff, targetFinances, targetStadium] = await Promise.all([
        storage.getPlayersByTeamId(teamId),
        storage.getStaffByTeamId(teamId),
        storage.getTeamFinances(teamId),
        storage.getTeamStadium(teamId)
      ]);

      // Generate scouting report based on level
      const scoutingReport = {
        teamInfo: {
          id: targetTeam.id,
          name: targetTeam.name,
          division: targetTeam.division,
          wins: targetTeam.wins,
          losses: targetTeam.losses,
          draws: targetTeam.draws,
          points: targetTeam.points,
          teamPower: scoutingLevel >= 2 ? targetTeam.teamPower : "Unknown"
        },
        scoutingLevel,
        scoutingPower,
        confidence: Math.min(95, 40 + scoutingPower / 2), // 40-95% confidence
        
        // Stadium info (basic info always available)
        stadium: targetStadium ? {
          name: targetStadium.name,
          capacity: scoutingLevel >= 2 ? targetStadium.capacity : "Unknown",
          level: scoutingLevel >= 3 ? targetStadium.level : "Unknown",
          facilities: scoutingLevel >= 4 ? targetStadium.facilities : "Unknown"
        } : null,

        // Player information (accuracy depends on scouting level)
        players: targetPlayers.map(player => {
          const baseInfo = {
            id: player.id,
            firstName: player.firstName,
            lastName: player.lastName,
            race: player.race,
            age: scoutingLevel >= 2 ? player.age : "Unknown",
            position: player.position
          };

          // Add stat ranges based on scouting level
          if (scoutingLevel >= 2) {
            // Level 2: Wide stat ranges (±8 points)
            const variance = scoutingLevel === 2 ? 8 : scoutingLevel === 3 ? 5 : 2;
            baseInfo.stats = {
              speed: getStatRange(player.speed, variance),
              power: getStatRange(player.power, variance),
              throwing: getStatRange(player.throwing, variance),
              catching: getStatRange(player.catching, variance),
              kicking: getStatRange(player.kicking, variance),
              stamina: getStatRange(player.stamina, variance),
              leadership: getStatRange(player.leadership, variance),
              agility: getStatRange(player.agility, variance)
            };
          }

          // Add salary info for higher scouting levels
          if (scoutingLevel >= 3) {
            baseInfo.salary = getSalaryRange(player.salary, scoutingLevel);
          }

          return baseInfo;
        }),

        // Staff information
        staff: targetStaff.map(staffMember => {
          const baseInfo = {
            name: staffMember.name,
            type: staffMember.type,
            level: scoutingLevel >= 2 ? staffMember.level : "Unknown"
          };

          if (scoutingLevel >= 3) {
            baseInfo.salary = getSalaryRange(staffMember.salary, scoutingLevel);
            baseInfo.ratings = {
              offense: staffMember.offenseRating || 0,
              defense: staffMember.defenseRating || 0,
              scouting: staffMember.scoutingRating || 0,
              recruiting: staffMember.recruitingRating || 0
            };
          }

          return baseInfo;
        }),

        // Financial information (limited)
        finances: scoutingLevel >= 4 ? {
          estimatedBudget: targetFinances ? getFinancialRange(targetFinances.credits) : "Unknown",
          salaryCapUsage: "Unknown" // Could add this later
        } : null,

        // Scouting report notes
        notes: generateScoutingNotes(targetTeam, targetPlayers, scoutingLevel),
        generatedAt: new Date()
      };

      res.json(scoutingReport);
    } catch (error) {
      console.error("Error generating scouting report:", error);
      res.status(500).json({ message: "Failed to generate scouting report" });
    }
  });

  // Get list of teams available for scouting (same division + nearby divisions)
  app.get("/api/teams/scoutable", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userTeam = await storage.getTeamByUserId(userId);
      
      if (!userTeam) {
        return res.status(404).json({ message: "User team not found" });
      }

      // Get teams from same division and adjacent divisions
      const scoutableDivisions = [
        userTeam.division,
        Math.max(1, userTeam.division - 1),
        Math.min(8, userTeam.division + 1)
      ].filter((div, index, arr) => arr.indexOf(div) === index); // Remove duplicates

      const scoutableTeams = [];
      
      for (const division of scoutableDivisions) {
        const divisionTeams = await storage.getTeamsByDivision(division);
        // Filter out user's own team
        const otherTeams = divisionTeams.filter(team => team.id !== userTeam.id);
        scoutableTeams.push(...otherTeams.map(team => ({
          ...team,
          scoutingCost: division === userTeam.division ? 0 : 1000 // Free for same division
        })));
      }

      res.json({
        teams: scoutableTeams,
        userDivision: userTeam.division,
        scoutableDivisions
      });
    } catch (error) {
      console.error("Error fetching scoutabl teams:", error);
      res.status(500).json({ message: "Failed to fetch scoutabl teams" });
    }
  });

  return httpServer;
}

// Helper functions for scouting system
function getStatRange(actualStat: number, variance: number): string {
  const min = Math.max(1, actualStat - variance);
  const max = Math.min(40, actualStat + variance);
  
  if (variance <= 2) {
    // High accuracy scouting
    return `${min}-${max}`;
  } else {
    // Lower accuracy - return broader ranges
    return `${min}-${max}`;
  }
}

function getSalaryRange(actualSalary: number, scoutingLevel: number): string {
  const variance = scoutingLevel === 4 ? 0.1 : 0.2; // 10% or 20% variance
  const min = Math.floor(actualSalary * (1 - variance));
  const max = Math.floor(actualSalary * (1 + variance));
  
  return `${min.toLocaleString()} - ${max.toLocaleString()}`;
}

function getFinancialRange(actualCredits: number): string {
  // Always give broad financial estimates
  if (actualCredits < 100000) return "Low (<100K)";
  if (actualCredits < 500000) return "Moderate (100K-500K)";
  if (actualCredits < 1000000) return "Good (500K-1M)";
  return "Excellent (>1M)";
}

function generateScoutingNotes(team: any, players: any[], scoutingLevel: number): string[] {
  const notes = [];
  
  // Basic notes always available
  notes.push(`${team.name} competes in Division ${team.division}`);
  notes.push(`Current record: ${team.wins}W-${team.losses}L-${team.draws}D`);
  
  if (scoutingLevel >= 2) {
    const avgAge = players.reduce((sum, p) => sum + p.age, 0) / players.length;
    notes.push(`Squad average age: ${avgAge.toFixed(1)} years`);
    
    const raceDistribution = {};
    players.forEach(p => {
      raceDistribution[p.race] = (raceDistribution[p.race] || 0) + 1;
    });
    const dominantRace = Object.entries(raceDistribution).sort((a, b) => b[1] - a[1])[0];
    notes.push(`Dominant race: ${dominantRace[0]} (${dominantRace[1]} players)`);
  }
  
  if (scoutingLevel >= 3) {
    const avgPower = players.reduce((sum, p) => sum + (p.speed + p.power + p.throwing + p.catching + p.kicking), 0) / (players.length * 5);
    notes.push(`Estimated team strength: ${avgPower > 25 ? 'Strong' : avgPower > 20 ? 'Average' : 'Developing'}`);
  }
  
  if (scoutingLevel >= 4) {
    notes.push("Detailed financial analysis available");
    notes.push("Complete staff evaluation included");
  }
  
  return notes;
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
  
  // Merchandising facilities
  const merchandisingLevel = stadium.facilities?.merchandising || 0;
  if (merchandisingLevel < 3) {
    upgrades.push({
      type: "merchandising",
      name: `Team Store Level ${merchandisingLevel + 1}`,
      description: "Enhanced apparel and merchandise sales facilities",
      cost: 30000 + (merchandisingLevel * 15000),
      effect: { 
        facilities: { ...stadium.facilities, merchandising: merchandisingLevel + 1 }
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
}*/

  // Tournament entry route with multiple payment options
  app.post('/api/tournaments/enter', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const { paymentType, tournamentId } = req.body; // 'credits' or 'entry'
      
      // Extract division and entry costs from tournament ID
      const divisionMatch = tournamentId.match(/tournament-(\d+)-/);
      if (!divisionMatch) {
        return res.status(400).json({ message: "Invalid tournament ID" });
      }
      
      const division = parseInt(divisionMatch[1]);
      const isDaily = tournamentId.includes('daily');
      
      const entryFee = {
        credits: isDaily ? (division <= 4 ? 1000 : 500) : (division <= 4 ? 2500 : 1200),
        gems: isDaily ? Math.floor((division <= 4 ? 1000 : 500) / 10) : Math.floor((division <= 4 ? 2500 : 1200) / 8)
      };

      const finances = await storage.getTeamFinances(team.id);
      if (!finances) {
        return res.status(404).json({ message: "Team finances not found" });
      }

      // Check payment type and deduct accordingly
      if (paymentType === 'credits') {
        if ((finances.credits || 0) < entryFee.credits) {
          return res.status(400).json({ 
            message: `Insufficient credits. Need ${entryFee.credits} ₡, have ${finances.credits || 0} ₡` 
          });
        }
        
        await storage.updateTeamFinances(team.id, {
          credits: (finances.credits || 0) - entryFee.credits
        });
        
      } else if (paymentType === 'entry') {
        // For now, simulate consuming tournament entry item
        // This allows the "Use Tournament Entry" button to work
        // In future, would check actual inventory for tournament entry items
        res.json({ 
          success: true, 
          message: `Successfully entered ${isDaily ? 'daily' : 'weekly'} tournament using Tournament Entry!`,
          tournamentId,
          paymentType: 'entry',
          amountPaid: 'Tournament Entry Item'
        });
        return;
      } else {
        return res.status(400).json({ message: "Invalid payment type" });
      }

      // Create tournament entry record for credit payment
      res.json({ 
        success: true, 
        message: `Successfully entered ${isDaily ? 'daily' : 'weekly'} tournament!`,
        tournamentId,
        paymentType,
        amountPaid: entryFee.credits
      });

    } catch (error) {
      console.error("Error entering tournament:", error);
      res.status(500).json({ message: "Failed to enter tournament" });
    }
  });

  // Simple tournaments endpoint that redirects to division-specific
  app.get('/api/tournaments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Redirect to team's division tournaments
      const division = team.division || 8;
      res.redirect(`/api/tournaments/${division}`);

    } catch (error) {
      console.error("Error fetching tournaments:", error);
      res.status(500).json({ message: "Failed to fetch tournaments" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
