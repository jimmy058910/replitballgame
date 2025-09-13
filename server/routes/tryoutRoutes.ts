import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { getPrismaClient } from "../database.js";
import { Race, PlayerRole, SeasonPhase } from "../db";
import { generateRandomName } from "../../shared/names.js";
import { generatePotential } from "../../shared/potentialSystem.js";
import { PlayerGenerationService } from "../services/playerGenerationService.js";

const router = Router();

// Generate a random player for tryouts
function generateRandomPlayer(tryoutType: 'basic' | 'advanced' = 'basic') {
  // Use the comprehensive TAP system instead of simple random generation
  return PlayerGenerationService.generatePlayer({
    type: tryoutType === 'advanced' ? 'advanced_tryout' : 'basic_tryout'
  });
}

// Get tryout candidates
router.get('/candidates', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Generate 8-12 random candidates
    const candidateCount = Math.floor(Math.random() * 5) + 8;
    const candidates = [];
    
    for (let i = 0; i < candidateCount; i++) {
      candidates.push(generateRandomPlayer('basic')); // Generate candidates for basic tryouts
    }
    
    res.json(candidates);
  } catch (error) {
    console.error("Error generating tryout candidates:", error);
    next(error);
  }
});

// Conduct tryout (with seasonal restrictions) - matches frontend call pattern
router.post('/:teamId/tryouts', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const { type, selectedPlayers } = req.body;
    const userId = req.user.claims.sub;
    const prisma = await getPrismaClient();

    // Get userProfile to check team ownership
    const userProfile = await prisma.userProfile.findFirst({
      where: { userId: userId }
    });
    
    if (!userProfile) {
      return res.status(403).json({ error: "User profile not found" });
    }

    // Verify team ownership
    let team;
    if (teamId === "my") {
      team = await prisma.team.findFirst({
        where: { userProfileId: userProfile.id }
      });
    } else {
      team = await prisma.team.findFirst({
        where: { 
          id: parseInt(teamId),
          userProfileId: userProfile.id 
        }
      });
    }
    
    if (!team) {
      return res.status(403).json({ error: "You do not own this team" });
    }

    // Check seasonal restriction: only 1 tryout per season based on player count 
    // Teams start with 12 players, so if they have >12 players, they've already used their tryouts
    const currentPlayerCount = await prisma.player.count({
      where: { teamId: team.id }
    });
    
    if (currentPlayerCount > 12) {
      return res.status(400).json({ 
        error: "Teams can only conduct tryouts once per season (17-day cycle). You have already used your tryouts for this season." 
      });
    }
    
    // Check if team would exceed maximum roster size (15 players)
    const maxRosterSize = 15;
    const selectedPlayerCount = selectedPlayers ? selectedPlayers.length : 1;
    
    if (currentPlayerCount + selectedPlayerCount > maxRosterSize) {
      return res.status(400).json({ 
        error: `Maximum roster size is ${maxRosterSize} players. You currently have ${currentPlayerCount} players and are trying to add ${selectedPlayerCount} more.` 
      });
    }

    // Check costs and affordability
    const costs = { basic: 25000, advanced: 75000 };
    const cost = costs[type as keyof typeof costs];

    if (!cost) {
      return res.status(400).json({ error: "Invalid tryout type" });
    }

    const teamFinances = await prisma.teamFinances.findFirst({
      where: { teamId: team.id }
    });

    if (!teamFinances || Number(teamFinances.credits) < cost) {
      return res.status(400).json({ 
        error: `Insufficient credits. Required: ${cost}, Available: ${teamFinances?.credits || 0}` 
      });
    }

    // Deduct credits
    await prisma.teamFinances.update({
      where: { id: teamFinances.id },
      data: {
        credits: BigInt(BigInt(teamFinances.credits) - BigInt(cost))
      }
    });

    // Store tryout candidates for taxi squad - DON'T add to main roster yet
    const candidates = selectedPlayers.map((playerData: any) => {
      // Map role string to PlayerRole enum
      let roleEnum: PlayerRole;
      const roleString = playerData.role.toLowerCase();
      switch (roleString) {
        case 'passer':
          roleEnum = PlayerRole.PASSER;
          break;
        case 'runner':
          roleEnum = PlayerRole.RUNNER;
          break;
        case 'blocker':
          roleEnum = PlayerRole.BLOCKER;
          break;
        default:
          roleEnum = PlayerRole.RUNNER; // Default fallback
      }

      return {
        id: playerData.id,
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        race: playerData.race,
        age: playerData.age,
        role: roleEnum,
        speed: playerData.speed,
        power: playerData.power,
        throwing: playerData.throwing,
        catching: playerData.catching,
        kicking: playerData.kicking,
        staminaAttribute: playerData.staminaAttribute,
        leadership: playerData.leadership,
        agility: playerData.agility,
        potentialRating: playerData.potentialRating,
        marketValue: playerData.marketValue || 0
      };
    });

    // Return candidates for taxi squad selection - NOT added to database yet
    res.json({
      success: true,
      message: `Tryout completed successfully! ${candidates.length} candidates available for taxi squad.`,
      candidates: candidates,
      creditsSpent: cost,
      remainingCredits: (Number(teamFinances.credits) - cost).toString()
    });

  } catch (error) {
    console.error("Error conducting tryout:", error);
    res.status(500).json({ error: "Failed to conduct tryout" });
  }
});

export default router;