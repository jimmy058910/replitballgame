import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from '../storage/index.js'; // Adjusted path
import { requireAuth } from "../middleware/firebaseAuth.js";
import { z } from "zod"; // For validation
import { getPrismaClient } from "../database.js";
// import { NotificationService } from '../services/notificationService.js'; // If needed for injury notifications

const router = Router();

// Zod schemas for validation
const createInjurySchema = z.object({
  playerId: z.string().uuid(),
  injuryType: z.string().min(1), // e.g., "Sprain", "Strain", "Fracture"
  injuryName: z.string().min(1), // e.g., "Ankle Sprain", "Hamstring Strain"
  description: z.string().optional(),
  severity: z.number().min(1).max(10), // 1-10 scale
  recoveryTime: z.number().min(1), // in days
  // statImpact: z.record(z.number()).optional(), // e.g., { speed: -5, agility: -3 }
});

const treatmentSchema = z.object({
  treatmentType: z.string().min(1), // e.g., "Rest", "Physical Therapy"
  // recoveryProgressBoost: z.number().min(0).max(100).optional(), // If treatment boosts progress directly
  // cost: z.number().min(0).optional(),
});

const medicalStaffSchema = z.object({
    teamId: z.string().uuid(), // Should be derived from user or path, not body usually
    name: z.string().min(1),
    specialty: z.string().min(1),
    experience: z.number().min(0),
    effectiveness: z.number().min(1).max(100),
    salary: z.number().min(0),
    // contractLength: z.number().min(1),
});

const conditioningUpdateSchema = z.object({
    fitnessLevel: z.number().min(0).max(100).optional(),
    // ... other conditionable stats
});


// Injury Management Routes
// GET /api/injuries/:teamId (consolidated from /api/injuries/team/:teamId)
router.get('/team/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    // TODO: Validate teamId format if necessary (e.g., UUID)
    // Optional: Check if user has permission to view this team's injuries

    const teamPlayers = await storage.players.getPlayersByTeamId(parseInt(teamId));
    if (teamPlayers.length === 0) {
        return res.json([]); // No players, so no injuries
    }

    const allInjuries = [];
    for (const player of teamPlayers) {
      const playerInjuries = await storage.injuries.getPlayerInjuries(player.id); // Fetches all, active or not
      allInjuries.push(...playerInjuries.map((injury: any) => ({
        ...injury,
        player: { // Attach basic player info for context
          id: player.id,
          name: `${player.firstName} ${player.lastName}`,
          firstName: player.firstName,
          lastName: player.lastName,
          race: player.race,
          position: player.role
        }
      })));
    }

    res.json(allInjuries);
  } catch (error) {
    console.error("Error fetching team injuries:", error);
    next(error);
  }
});

router.post('/', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const injuryData = createInjurySchema.parse(req.body);

    const player = await storage.players.getPlayerById(parseInt(injuryData.playerId.toString()));
    if (!player || !player.teamId) { // Ensure player exists and belongs to a team
      return res.status(404).json({ message: "Player not found or not assigned to a team." });
    }

    // Optional: Check if user creating injury owns the player's team
    // const userTeam = await storage.getTeamByUserId(req.user.claims.sub);
    // if (!userTeam || userTeam.id !== player.teamId) {
    //     return res.status(403).json({ message: "Forbidden: Cannot create injury for player not on your team." });
    // }

    const prisma = await getPrismaClient();
    const newInjury = await prisma.player.update({
      where: { id: parseInt(injuryData.playerId.toString()) },
      data: {
        injuryStatus: 'MINOR_INJURY',
        injuryRecoveryPointsNeeded: injuryData.recoveryTime || 100,
        injuryRecoveryPointsCurrent: 0,
      }
    });

    // Send notification (example, actual NotificationService might have more specific methods)
    // const team = await storage.getTeamById(player.teamId);
    // if (team) {
    //   await NotificationService.sendNotification({
    //     userId: team.userId, // Notify team owner
    //     type: 'player_injury',
    //     title: 'Player Injured!',
    //     message: `${player.name} suffered a ${injuryData.injuryName} (${injuryData.severity}/10 severity). Expected recovery: ${injuryData.recoveryTime} days.`,
    //     priority: 'medium',
    //     actionUrl: `/team/${team.id}/injuries`
    //   });
    // }

    res.status(201).json(newInjury);
  } catch (error) {
    console.error("Error creating injury:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid injury data", errors: error.errors });
    }
    next(error);
  }
});

// PATCH /api/injuries/:id/treatment (consolidated from POST /api/injuries/:id/treat)
router.patch('/:injuryId/treatment', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { injuryId } = req.params;
    const treatmentData = treatmentSchema.parse(req.body);

    const prisma = await getPrismaClient();
    const injury = await prisma.player.findUnique({ where: { id: parseInt(injuryId) } });
    if (!injury) {
        return res.status(404).json({ message: "Injury record not found." });
    }
    // Optional: Check ownership or permissions to treat this injury

    // Example treatment logic: improve recovery progress
    // This is highly game-specific.
    let recoveryProgress = injury.injuryRecoveryPointsCurrent || 0;
    const recoveryNeeded = injury.injuryRecoveryPointsNeeded || 100;

    // Simulate treatment effect
    if (treatmentData.treatmentType === "Advanced Therapy") {
        recoveryProgress = Math.min(recoveryNeeded, recoveryProgress + 25);
    } else {
        recoveryProgress = Math.min(recoveryNeeded, recoveryProgress + 10);
    }

    const updatedInjury = await prisma.player.update({
      where: { id: injuryId },
      data: {
        injuryRecoveryPointsCurrent: recoveryProgress,
        injuryStatus: recoveryProgress >= recoveryNeeded ? 'HEALTHY' : injury.injuryStatus,
      }
    });
    res.json(updatedInjury);
  } catch (error) {
    console.error("Error updating injury treatment:", error);
     if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid treatment data", errors: error.errors });
    }
    next(error);
  }
});

// Medical Staff Routes
router.get('/medical-staff/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    // Optional: Permission check
    const staffList = await storage.staff.getStaffByTeamId(teamId);
    const medicalStaffList = staffList.filter(s =>
        ["recovery_specialist", "trainer_physical", "doctor", "physiotherapist"].includes(s.type) // Example medical types
    );
    res.json(medicalStaffList);
  } catch (error) {
    console.error("Error fetching medical staff:", error);
    next(error);
  }
});

router.post('/medical-staff', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    // teamId should come from the authenticated user's team, not body, to prevent misuse.
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) {
        return res.status(404).json({ message: "Your team not found. Cannot hire staff." });
    }

    const staffDataFromRequest = medicalStaffSchema.omit({ teamId: true }).parse(req.body);
    const prisma = await getPrismaClient();
    const newStaffMember = await prisma.staff.create({
      data: {
        ...staffDataFromRequest,
        teamId: team.id, // Assign to user's team
        type: 'DOCTOR',
        // id: undefined, // Handled by DB or storage
      }
    } as any);
    res.status(201).json(newStaffMember);
  } catch (error) {
    console.error("Error hiring medical staff:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid medical staff data", errors: error.errors });
    }
    next(error);
  }
});

// Player Conditioning Routes
router.get('/conditioning/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    // Optional: Permission check
    // TODO: storage.getPlayerConditioningByTeam(teamId) needs to be implemented
    // This might involve fetching all players of a team and their conditioning stats.
    // For now, returning a placeholder.
    const playersOnTeam = await storage.players.getPlayersByTeamId(parseInt(teamId));
    const conditioningData = playersOnTeam.map((p: any) => ({
        playerId: p.id,
        playerName: p.name,
        fitnessLevel: p.stamina, // Example mapping
        // ... other conditioning attributes from player or a dedicated conditioning table
    }));
    res.json(conditioningData);
  } catch (error) {
    console.error("Error fetching conditioning data:", error);
    next(error);
  }
});

router.patch('/conditioning/:playerId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    const updates = conditioningUpdateSchema.parse(req.body);

    // Optional: Check if player belongs to user's team
    // const player = await storage.getPlayerById(playerId);
    // const userTeam = await storage.getTeamByUserId(req.user.claims.sub);
    // if (!player || !userTeam || player.teamId !== userTeam.id) {
    //     return res.status(403).json({ message: "Cannot update conditioning for this player." });
    // }

    // TODO: storage.updatePlayerConditioning(playerId, updates) or storage.updatePlayer(playerId, { stamina: updates.fitnessLevel ... })
    // For now, mocking the update.
    const prisma = await getPrismaClient();
    const updatedPlayer = await prisma.player.update({
      where: { id: parseInt(playerId) },
      data: { staminaAttribute: updates.fitnessLevel }
    }); // Example update

    res.json(updatedPlayer);
  } catch (error) {
    console.error("Error updating player conditioning:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid conditioning data", errors: error.errors });
    }
    next(error);
  }
});

export default router;
