import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { getPrismaClient } from "../database.js";
import { Race, PlayerRole, SeasonPhase } from "@prisma/client";

const router = Router();

// Generate a random player for tryouts
function generateRandomPlayer() {
  const races: Race[] = [Race.HUMAN, Race.SYLVAN, Race.GRYLL, Race.LUMINA, Race.UMBRA];
  const roles: PlayerRole[] = [PlayerRole.PASSER, PlayerRole.RUNNER, PlayerRole.BLOCKER];
  
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Sage', 'River'];
  const lastNames = ['Storm', 'Stone', 'Swift', 'Bright', 'Strong', 'Bold', 'True', 'Fair', 'Wild', 'Free'];
  
  const race = races[Math.floor(Math.random() * races.length)];
  const role = roles[Math.floor(Math.random() * roles.length)];
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  // Base stats (6-20 range to match new weaker player balance)
  const baseStats = {
    speed: Math.floor(Math.random() * 14) + 6,
    power: Math.floor(Math.random() * 14) + 6,
    throwing: Math.floor(Math.random() * 14) + 6,
    catching: Math.floor(Math.random() * 14) + 6,
    kicking: Math.floor(Math.random() * 14) + 6,
    staminaAttribute: Math.floor(Math.random() * 14) + 6,
    leadership: Math.floor(Math.random() * 14) + 6,
    agility: Math.floor(Math.random() * 14) + 6,
  };
  
  // Apply racial modifiers
  const racialModifiers = {
    [Race.HUMAN]: { speed: 1, power: 1, throwing: 1, catching: 1, kicking: 1, staminaAttribute: 1, leadership: 1, agility: 1 },
    [Race.SYLVAN]: { speed: 3, power: -2, throwing: 0, catching: 0, kicking: 0, staminaAttribute: 0, leadership: 0, agility: 4 },
    [Race.GRYLL]: { speed: -3, power: 5, throwing: 0, catching: 0, kicking: 0, staminaAttribute: 3, leadership: 0, agility: -2 },
    [Race.LUMINA]: { speed: 0, power: 0, throwing: 4, catching: 0, kicking: 0, staminaAttribute: -1, leadership: 3, agility: 0 },
    [Race.UMBRA]: { speed: 2, power: -3, throwing: 0, catching: 0, kicking: 0, staminaAttribute: 0, leadership: -1, agility: 3 },
  };
  
  const modifiers = racialModifiers[race];
  const finalStats = {
    speed: Math.min(40, Math.max(1, baseStats.speed + modifiers.speed)),
    power: Math.min(40, Math.max(1, baseStats.power + modifiers.power)),
    throwing: Math.min(40, Math.max(1, baseStats.throwing + modifiers.throwing)),
    catching: Math.min(40, Math.max(1, baseStats.catching + modifiers.catching)),
    kicking: Math.min(40, Math.max(1, baseStats.kicking + modifiers.kicking)),
    staminaAttribute: Math.min(40, Math.max(1, baseStats.staminaAttribute + modifiers.staminaAttribute)),
    leadership: Math.min(40, Math.max(1, baseStats.leadership + modifiers.leadership)),
    agility: Math.min(40, Math.max(1, baseStats.agility + modifiers.agility)),
  };
  
  // Generate potential (1.5 to 3.5 stars to match new weaker balance)
  const potentialRating = Math.random() * 2.0 + 1.5;
  
  // Calculate market value based on stats and potential
  const avgStat = Object.values(finalStats).reduce((a, b) => a + b, 0) / 8;
  const marketValue = Math.floor(500 + (avgStat * 25) + (potentialRating * 500) + (Math.random() * 300));
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    name: `${firstName} ${lastName}`,
    firstName,
    lastName,
    race,
    age: Math.floor(Math.random() * 5) + 16, // 16-20 years old
    role,
    ...finalStats,
    potentialRating,
    marketValue,
    potential: potentialRating >= 4.0 ? "High" : potentialRating >= 2.5 ? "Medium" : "Low",
  };
}

// Get tryout candidates
router.get('/candidates', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Generate 8-12 random candidates
    const candidateCount = Math.floor(Math.random() * 5) + 8;
    const candidates = [];
    
    for (let i = 0; i < candidateCount; i++) {
      candidates.push(generateRandomPlayer());
    }
    
    res.json(candidates);
  } catch (error) {
    console.error("Error generating tryout candidates:", error);
    next(error);
  }
});

// Conduct tryout (with seasonal restrictions)
router.post('/:teamId/conduct', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const { type, selectedPlayers } = req.body;
    const userId = req.user.claims.sub;

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