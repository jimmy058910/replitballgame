import { Router, Request, Response, NextFunction } from 'express';
import { isAuthenticated } from '../replitAuth';
import { prisma } from '../db';
import { Race, PlayerRole } from '../../generated/prisma';

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
  
  // Base stats (15-35 range)
  const baseStats = {
    speed: Math.floor(Math.random() * 20) + 15,
    power: Math.floor(Math.random() * 20) + 15,
    throwing: Math.floor(Math.random() * 20) + 15,
    catching: Math.floor(Math.random() * 20) + 15,
    kicking: Math.floor(Math.random() * 20) + 15,
    staminaAttribute: Math.floor(Math.random() * 20) + 15,
    leadership: Math.floor(Math.random() * 20) + 15,
    agility: Math.floor(Math.random() * 20) + 15,
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
  
  // Generate potential (0.5 to 5 stars)
  const potentialRating = Math.random() * 4.5 + 0.5;
  
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
router.get('/candidates', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
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

export default router;