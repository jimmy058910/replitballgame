import { Router, type Request, type Response, type NextFunction } from "express";
import { teamStorage } from "../storage/teamStorage"; // Updated import
import { playerStorage } from "../storage/playerStorage"; // Updated import
import { isAuthenticated } from "../replitAuth";
import { generateRandomPlayer } from "../services/leagueService";
import { z } from "zod";
// import { players as playersTable } from "@shared/schema"; // Not directly used here anymore

const router = Router();

// TODO: Move this to a dedicated TeamService or LeagueService
function calculateTeamPower(players: any[]): number {
  if (!players || players.length === 0) return 0;

  const playersWithPower = players.map(player => ({
    ...player,
    individualPower: (player.speed || 20) + (player.power || 20) + (player.throwing || 20) +
                    (player.catching || 20) + (player.kicking || 20)
  }));

  const topPlayers = playersWithPower
    .sort((a, b) => b.individualPower - a.individualPower)
    .slice(0, 9);

  const totalPower = topPlayers.reduce((sum, player) => sum + player.individualPower, 0);
  return Math.round(totalPower / Math.max(1, topPlayers.length));
}

const createTeamSchema = z.object({
  name: z.string().min(1).max(50),
});

// Team routes
router.post('/', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { name } = createTeamSchema.parse(req.body);

    const existingTeam = await teamStorage.getTeamByUserId(userId); // Use teamStorage
    if (existingTeam) {
      return res.status(400).json({ message: "User already has a team" });
    }

    // teamStorage.createTeam now handles default staff and finances
    const team = await teamStorage.createTeam({ // Use teamStorage
      userId,
      name,
      division: 8,
    });

    const races = ["human", "sylvan", "gryll", "lumina", "umbra"];
    const positions = ["passer", "runner", "blocker"];
    const playerNames = [
      "Thorek", "Elysian", "Luxaria", "Shadowex", "Marcus",
      "Whisperwind", "Ironhold", "Brightbane", "Voidwalker", "Sarah"
    ];

    // Generate 10 players with varied positions and races
    for (let i = 0; i < 10; i++) {
      const race = races[i % races.length];
      const position = positions[i % positions.length];
      
      try {
        const playerData = generateRandomPlayer(playerNames[i], race, team.id);
        // Set the position for the player
        playerData.position = position;
        await playerStorage.createPlayer(playerData);
      } catch (playerError) {
        console.error(`Error creating player ${i + 1}:`, playerError);
      }
    }



    res.status(201).json(team);
  } catch (error) {
    console.error("Error creating team:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid team data", errors: error.errors });
    }
    next(error);
  }
});

router.get('/my', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await teamStorage.getTeamByUserId(userId); // Use teamStorage

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const teamPlayers = await playerStorage.getPlayersByTeamId(team.id); // Use playerStorage
    const teamPower = calculateTeamPower(teamPlayers);

    res.json({ ...team, teamPower });
  } catch (error) {
    console.error("Error fetching team:", error);
    next(error);
  }
});

router.get('/:id', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const team = await teamStorage.getTeamById(id); // Use teamStorage

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const teamPlayers = await playerStorage.getPlayersByTeamId(team.id); // Use playerStorage
    const teamPower = calculateTeamPower(teamPlayers);

    res.json({ ...team, teamPower });
  } catch (error) {
    console.error("Error fetching team:", error);
    next(error);
  }
});

router.get('/:id/players', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const teamPlayers = await playerStorage.getPlayersByTeamId(id); // Use playerStorage
    res.json(teamPlayers);
  } catch (error) {
    console.error("Error fetching players:", error);
    next(error);
  }
});

// Formation saving route
router.post('/:teamId/formation', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    let teamId = req.params.teamId;

    if (teamId === "my") {
      const userId = req.user?.claims?.sub;
      const team = await teamStorage.getTeamByUserId(userId); // Use teamStorage
      if (!team) {
        return res.status(404).json({ message: "Team not found for current user" });
      }
      teamId = team.id;
    } else {
      const teamToUpdate = await teamStorage.getTeamById(teamId); // Use teamStorage
      if (!teamToUpdate || teamToUpdate.userId !== req.user?.claims?.sub) {
          return res.status(403).json({ message: "Forbidden: You do not own this team." });
      }
    }

    const { formation, substitutionOrder } = req.body;

    if (typeof formation !== 'object' || formation === null) {
        return res.status(400).json({ message: "Invalid formation data" });
    }
     if (substitutionOrder && (typeof substitutionOrder !== 'object' || substitutionOrder === null)) {
        return res.status(400).json({ message: "Invalid substitution order data" });
    }

    await teamStorage.updateTeam(teamId, { // Use teamStorage
      formation: JSON.stringify(formation),
      substitutionOrder: substitutionOrder ? JSON.stringify(substitutionOrder) : JSON.stringify({}),
      updatedAt: new Date()
    });

    res.json({ success: true, message: "Formation saved successfully" });
  } catch (error) {
    console.error("Error saving formation:", error);
    next(error);
  }
});

router.get('/:teamId/formation', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    let teamId = req.params.teamId;

    if (teamId === "my") {
      const userId = req.user?.claims?.sub;
      const team = await teamStorage.getTeamByUserId(userId); // Use teamStorage
      if (!team) {
        return res.status(404).json({ message: "Team not found for current user" });
      }
      teamId = team.id;
    }

    const team = await teamStorage.getTeamById(teamId); // Use teamStorage
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const formationData = team.formation ? JSON.parse(team.formation as string) : null;
    const substitutionOrderData = team.substitutionOrder ? JSON.parse(team.substitutionOrder as string) : {};

    res.json({
      formation: formationData,
      substitutionOrder: substitutionOrderData
    });
  } catch (error) {
    console.error("Error fetching formation:", error);
    if (error instanceof SyntaxError) {
        return res.status(500).json({ message: "Failed to parse formation data from database." });
    }
    next(error);
  }
});

// Team inactivity tracking
router.post('/update-activity', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await teamStorage.getTeamByUserId(userId); // Use teamStorage
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    await teamStorage.updateTeam(team.id, { // Use teamStorage
      lastActivityAt: new Date(),
      seasonsInactive: 0
    });

    res.json({ success: true, message: "Team activity updated." });
  } catch (error) {
    console.error("Error updating team activity:", error);
    next(error);
  }
});


export default router;
