import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";
import { tournamentService } from "../services/tournamentService";
import { prisma } from "../db";
import moment from "moment-timezone";

const router = Router();

// Schema validation
const registerTournamentSchema = z.object({
  tournamentId: z.string().uuid("Invalid tournament ID format"),
});

const dailyTournamentRegisterSchema = z.object({
  division: z.number().min(2).max(8),
});

const midSeasonRegisterSchema = z.object({
  division: z.number().min(1).max(8),
  paymentType: z.enum(["credits", "gems", "both"]),
});

// Get available tournaments for team's division
router.get('/available', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const availableTournaments = await tournamentService.getAvailableTournaments(team.id);
    
    // Format tournaments with additional info
    const formattedTournaments = availableTournaments.map(tournament => ({
      id: tournament.id,
      name: tournament.name,
      tournamentId: tournament.tournamentId,
      type: tournament.type,
      division: tournament.division,
      entryFeeCredits: Number(tournament.entryFeeCredits || 0),
      entryFeeGems: tournament.entryFeeGems,
      requiresEntryItem: false, // Default value
      maxTeams: 8, // Default division tournament size
      registrationDeadline: tournament.registrationEndTime,
      tournamentStartTime: tournament.startTime,
      prizes: tournament.prizePoolJson,
      canRegister: new Date() < tournament.registrationEndTime!,
      timeUntilDeadline: tournament.registrationEndTime 
        ? Math.max(0, tournament.registrationEndTime.getTime() - Date.now())
        : 0
    }));

    res.json(formattedTournaments);
  } catch (error) {
    console.error("Error fetching available tournaments:", error);
    next(error);
  }
});

// Register for tournament
router.post('/register', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const { tournamentId } = registerTournamentSchema.parse(req.body);

    await tournamentService.registerForTournament(team.id, tournamentId);

    res.json({ 
      success: true, 
      message: "Successfully registered for tournament" 
    });
  } catch (error) {
    console.error("Error registering for tournament:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid request data", errors: error.errors });
    }
    
    // Handle specific tournament registration errors
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    
    next(error);
  }
});

// Register for Daily Divisional Tournament (on-demand creation)
router.post('/daily-tournament/register', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const { division } = dailyTournamentRegisterSchema.parse(req.body);
    
    const tournamentId = await tournamentService.createOrJoinDailyTournament(team.id, division);
    
    res.json({ 
      success: true, 
      message: "Successfully registered for Daily Division Tournament!",
      tournamentId
    });
  } catch (error) {
    console.error("Error registering for daily tournament:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid request data", 
        errors: error.errors 
      });
    }
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

// Register for Mid-Season Cup (on-demand creation)
router.post('/mid-season/register', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const { division, paymentType } = midSeasonRegisterSchema.parse(req.body);
    
    const tournamentId = await tournamentService.createOrJoinMidSeasonCup(team.id, division, paymentType);
    
    res.json({ 
      success: true, 
      message: "Successfully registered for Mid-Season Cup!",
      tournamentId,
      paymentType
    });
  } catch (error) {
    console.error("Error registering for mid-season tournament:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid request data", 
        errors: error.errors 
      });
    }
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

// Get team's registered tournaments
router.get('/my-tournaments', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const teamTournaments = await tournamentService.getTeamTournaments(team.id);
    
    const formattedTournaments = teamTournaments.map(({ tournament, entry }) => ({
      id: tournament.id,
      name: tournament.name,
      tournamentId: tournament.tournamentId,
      type: tournament.type,
      division: tournament.division,
      status: tournament.status,
      registrationDeadline: tournament.registrationDeadline,
      tournamentStartTime: tournament.tournamentStartTime,
      entryTime: entry.registeredAt,
      placement: entry.finalRank,
      creditsWon: 0,
      gemsWon: 0,
      trophyWon: false,
      isUpcoming: tournament.status === "open",
      isActive: tournament.status === "in_progress",
      isCompleted: tournament.status === "completed"
    }));

    res.json(formattedTournaments);
  } catch (error) {
    console.error("Error fetching team tournaments:", error);
    next(error);
  }
});

// Get tournament history
router.get('/history', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const history = await tournamentService.getTournamentHistory(team.id);
    // Convert BigInt fields to numbers for JSON serialization
    const serializedHistory = history.map(entry => ({
      ...entry,
      teamId: Number(entry.teamId),
      tournamentId: entry.tournamentId,
      id: entry.id,
      tournament: entry.tournament ? {
        ...entry.tournament,
        entryFeeCredits: Number(entry.tournament.entryFeeCredits || 0),
        entryFeeGems: Number(entry.tournament.entryFeeGems || 0)
      } : null
    }));
    
    res.json(serializedHistory);
  } catch (error) {
    console.error("Error fetching tournament history:", error);
    next(error);
  }
});

// Get tournament statistics
router.get('/stats', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const stats = await tournamentService.getTournamentStats(team.id);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching tournament stats:", error);
    next(error);
  }
});

// Get team's current tournament entries
router.get('/team/:teamId', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.claims.sub;
    
    // Verify team ownership
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team || team.id.toString() !== teamId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get current tournament entries
    const currentEntries = await prisma.tournamentEntry.findMany({
      where: {
        teamId: parseInt(teamId)
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            type: true,
            division: true,
            status: true,
            registrationEndTime: true,
            startTime: true,
            entryFeeCredits: true,
            entryFeeGems: true,
            prizePoolJson: true
          }
        }
      },
      orderBy: {
        registeredAt: 'desc'
      }
    });

    // Convert BigInt fields to numbers for JSON serialization
    const serializedEntries = currentEntries.map(entry => ({
      ...entry,
      teamId: Number(entry.teamId),
      tournamentId: Number(entry.tournamentId),
      id: Number(entry.id),
      finalRank: entry.finalRank ? Number(entry.finalRank) : null,
      tournament: {
        ...entry.tournament,
        id: Number(entry.tournament.id),
        entryFeeCredits: Number(entry.tournament.entryFeeCredits || 0),
        entryFeeGems: Number(entry.tournament.entryFeeGems || 0)
      }
    }));
    
    res.json(serializedEntries);
  } catch (error) {
    console.error("Error fetching team tournament entries:", error);
    next(error);
  }
});

// Get team's tournament history
router.get('/team/:teamId/history', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.claims.sub;
    
    // Verify team ownership
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team || team.id.toString() !== teamId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get tournament history with tournament details
    const history = await prisma.tournamentEntry.findMany({
      where: {
        teamId: parseInt(teamId),
        finalRank: { not: null } // Only completed tournaments
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            type: true,
            division: true,
            status: true,
            seasonDay: true,
            entryFeeCredits: true,
            entryFeeGems: true,
            prizePoolJson: true,
            tournamentId: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        registeredAt: 'desc'
      },
      take: 20
    });

    // Convert BigInt fields to numbers for JSON serialization
    const serializedHistory = history.map(entry => ({
      ...entry,
      teamId: Number(entry.teamId),
      tournamentId: Number(entry.tournamentId),
      id: Number(entry.id),
      finalRank: entry.finalRank ? Number(entry.finalRank) : null,
      placement: entry.finalRank ? Number(entry.finalRank) : null, // Add placement field for frontend compatibility
      tournament: {
        ...entry.tournament,
        id: Number(entry.tournament.id),
        entryFeeCredits: Number(entry.tournament.entryFeeCredits || 0),
        entryFeeGems: Number(entry.tournament.entryFeeGems || 0)
      }
    }));
    
    res.json(serializedHistory);
  } catch (error) {
    console.error("Error fetching team tournament history:", error);
    next(error);
  }
});

// Get tournament details by ID
router.get('/:tournamentId', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tournamentId } = req.params;
    
    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    // Get participants
    const participants = await db
      .select({
        teamId: tournamentEntries.teamId,
        teamName: teams.name,
        entryTime: tournamentEntries.entryTime,
        placement: tournamentEntries.placement,
        eliminated: tournamentEntries.eliminated
      })
      .from(tournamentEntries)
      .innerJoin(teams, eq(tournamentEntries.teamId, teams.id))
      .where(eq(tournamentEntries.tournamentId, tournamentId))
      .orderBy(asc(tournamentEntries.entryTime));

    const maxTeams = tournament.maxTeams || 16;
    const tournamentDetails = {
      ...tournament,
      participants,
      participantCount: participants.length,
      spotsRemaining: maxTeams - participants.length,
      canStillJoin: new Date() < tournament.registrationDeadline! && participants.length < maxTeams
    };

    res.json(tournamentDetails);
  } catch (error) {
    console.error("Error fetching tournament details:", error);
    next(error);
  }
});

// Get tournament overview (shows both types available for team's division)
router.get('/overview/:division', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const division = parseInt(req.params.division);
    if (isNaN(division) || division < 1 || division > 8) {
      return res.status(400).json({ message: "Invalid division number" });
    }

    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team || team.division !== division) {
      return res.status(403).json({ message: "Access denied for this division" });
    }

    // Get current season info
    const startDate = new Date("2025-01-01");
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const season = Math.floor(daysSinceStart / 17);
    const gameDay = (daysSinceStart % 17) + 1;

    // Check what tournaments are available
    const divisionNames = ["", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Copper", "Iron", "Stone"];
    const divisionName = divisionNames[division];

    const response = {
      division,
      divisionName,
      season,
      gameDay,
      tournaments: {
        dailyDivisionTournament: {
          available: division > 1, // Only divisions 2-8
          name: `${divisionName} Daily Division Tournament`,
          description: "Daily single-elimination tournament requiring Tournament Entry items",
          entryRequirement: "Tournament Entry Item",
          gameLength: "Short (like Exhibition)",
          injuryRisk: "Low (5%)",
          staminaCost: "Minimal (-10 points)",
          progressionBenefit: "Moderate",
          registrationWindow: "24 hours",
          tournamentTime: "8:00 PM EST",
          rewards: division > 1 ? tournamentService['getDailyDivisionTournamentRewards'](division) : null
        },
        midSeasonCup: {
          available: true, // Always show Mid-Season Cup
          name: `${divisionName} Mid-Season Cup`,
          description: "Premier seasonal tournament with substantial rewards and trophies",
          entryRequirement: "10,000 Credits OR 20 Gems",
          gameLength: "Standard (like League)",
          injuryRisk: "Normal (20%)",
          staminaCost: "High (-30 points)",
          progressionBenefit: "High",
          registrationWindow: gameDay >= 1 && gameDay < 7 ? "Registration open!" : gameDay === 7 ? "Final day - closes at 1PM EDT" : "Registration closed - next season",
          tournamentTime: "1:00 PM EST on Day 7",
          rewards: tournamentService['getMidSeasonCupRewards'](division)
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching tournament overview:", error);
    next(error);
  }
});

// Admin endpoint to create tournaments (for testing and management)
router.post('/admin/create-daily-cup/:division', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    // Check admin permissions (simplified for now)
    const userId = req.user.claims.sub;
    if (userId !== "44010914") { // Replace with proper admin check
      return res.status(403).json({ message: "Admin access required" });
    }

    const division = parseInt(req.params.division);
    if (isNaN(division) || division < 2 || division > 8) {
      return res.status(400).json({ message: "Invalid division for Daily Cup (2-8 only)" });
    }

    const tournamentId = await tournamentService.createDailyDivisionTournament(division);
    res.json({ 
      success: true, 
      tournamentId,
      message: `Daily Cup tournament created for division ${division}` 
    });
  } catch (error) {
    console.error("Error creating daily cup tournament:", error);
    next(error);
  }
});

// Admin endpoint to create Mid-Season Cup
router.post('/admin/create-mid-season/:division', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    // Check admin permissions (simplified for now)
    const userId = req.user.claims.sub;
    if (userId !== "44010914") { // Replace with proper admin check
      return res.status(403).json({ message: "Admin access required" });
    }

    const division = parseInt(req.params.division);
    if (isNaN(division) || division < 1 || division > 8) {
      return res.status(400).json({ message: "Invalid division number" });
    }

    const tournamentId = await tournamentService.createMidSeasonCup(division);
    res.json({ 
      success: true, 
      tournamentId,
      message: `Mid-Season Cup created for division ${division}` 
    });
  } catch (error) {
    console.error("Error creating Mid-Season Cup:", error);
    next(error);
  }
});

export default router;