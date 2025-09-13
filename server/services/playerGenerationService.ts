/**
 * COMPREHENSIVE PLAYER GENERATION SERVICE
 * Implements TAP (Total Attribute Points) System from Game Mechanics Doc
 * Replaces simple random generation with proper potential-based distribution
 */

import { Race, PlayerRole } from '../../prisma/generated/client/index.js';
import { generatePotential } from '../../shared/potentialSystem.js';
import { generateRandomName } from '../../shared/names.js';

export interface TAPPlayerGenerationParams {
  type: 'basic_tryout' | 'advanced_tryout' | 'free_agent' | 'hidden_gem';
  race?: Race;
  role?: PlayerRole;
  ageRange?: { min: number; max: number };
}

export interface GeneratedPlayer {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  race: Race;
  role: PlayerRole;
  age: number;
  // 8 core attributes (1-40 scale)
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  staminaAttribute: number;
  leadership: number;
  agility: number;
  // System values
  potentialRating: number;
  marketValue: number;
  potential: string;
  tapUsed: number; // Total Attribute Points used
  tapAvailable: number; // Original TAP pool
}

/**
 * Comprehensive Player Generation Service with TAP System
 */
export class PlayerGenerationService {
  
  /**
   * Racial modifiers as per Game Mechanics Doc
   */
  static readonly RACIAL_MODIFIERS = {
    [Race.HUMAN]: { speed: 1, power: 1, throwing: 1, catching: 1, kicking: 1, staminaAttribute: 1, leadership: 1, agility: 1 },
    [Race.SYLVAN]: { speed: 3, power: -2, throwing: 0, catching: 0, kicking: 0, staminaAttribute: 0, leadership: 0, agility: 4 },
    [Race.GRYLL]: { speed: -3, power: 5, throwing: 0, catching: 0, kicking: 0, staminaAttribute: 3, leadership: 0, agility: -2 },
    [Race.LUMINA]: { speed: 0, power: 0, throwing: 4, catching: 0, kicking: 0, staminaAttribute: -1, leadership: 3, agility: 0 },
    [Race.UMBRA]: { speed: 2, power: -3, throwing: 0, catching: 0, kicking: 0, staminaAttribute: 0, leadership: -1, agility: 3 },
  };

  /**
   * Role-based attribute priorities for TAP distribution
   */
  static readonly ROLE_PRIORITIES = {
    [PlayerRole.PASSER]: {
      primary: ['throwing', 'leadership', 'agility'], // 60% of remaining TAP
      secondary: ['speed', 'catching', 'kicking'] // 40% of remaining TAP
    },
    [PlayerRole.RUNNER]: {
      primary: ['speed', 'agility', 'power'],
      secondary: ['catching', 'staminaAttribute', 'leadership']
    },
    [PlayerRole.BLOCKER]: {
      primary: ['power', 'staminaAttribute', 'leadership'],
      secondary: ['speed', 'agility', 'throwing']
    }
  };

  /**
   * TAP (Total Attribute Points) configuration per generation type
   */
  static readonly TAP_CONFIG = {
    basic_tryout: { basePoints: { min: 40, max: 60 }, potentialMultiplier: 4 },
    advanced_tryout: { basePoints: { min: 60, max: 85 }, potentialMultiplier: 4 },
    free_agent: { basePoints: { min: 35, max: 80 }, potentialMultiplier: 4 },
    hidden_gem: { basePoints: { min: 55, max: 75 }, potentialMultiplier: 4 }
  };

  /**
   * Generate player using TAP (Total Attribute Points) System
   */
  static generatePlayer(params: TAPPlayerGenerationParams): GeneratedPlayer {
    // Determine race and role
    const race = params.race || this.getRandomRace();
    const role = params.role || this.getRandomRole();
    
    // Generate age within range
    const ageRange = params.ageRange || this.getDefaultAgeRange(params.type);
    const age = Math.floor(Math.random() * (ageRange.max - ageRange.min + 1)) + ageRange.min;
    
    // Generate name
    const { firstName, lastName } = generateRandomName(race.toLowerCase());
    const name = `${firstName} ${lastName}`;
    
    // Generate potential rating
    const potentialType = this.mapGenerationTypeToPotential(params.type);
    const potentialRating = generatePotential({
      type: potentialType,
      ageModifier: age
    });
    
    // Calculate TAP (Total Attribute Points)
    const tapConfig = this.TAP_CONFIG[params.type];
    const basePoints = Math.floor(Math.random() * (tapConfig.basePoints.max - tapConfig.basePoints.min + 1)) + tapConfig.basePoints.min;
    const tapAvailable = basePoints + (potentialRating * tapConfig.potentialMultiplier);
    
    // Generate base attributes with TAP distribution
    const attributes = this.distributeAttributePoints(tapAvailable, role);
    
    // Apply racial modifiers
    const modifiers = this.RACIAL_MODIFIERS[race];
    const finalAttributes = {
      speed: Math.min(40, Math.max(1, attributes.speed + modifiers.speed)),
      power: Math.min(40, Math.max(1, attributes.power + modifiers.power)),
      throwing: Math.min(40, Math.max(1, attributes.throwing + modifiers.throwing)),
      catching: Math.min(40, Math.max(1, attributes.catching + modifiers.catching)),
      kicking: Math.min(40, Math.max(1, attributes.kicking + modifiers.kicking)),
      staminaAttribute: Math.min(40, Math.max(1, attributes.staminaAttribute + modifiers.staminaAttribute)),
      leadership: Math.min(40, Math.max(1, attributes.leadership + modifiers.leadership)),
      agility: Math.min(40, Math.max(1, attributes.agility + modifiers.agility)),
    };
    
    // Calculate market value based on stats and potential
    const avgStat = Object.values(finalAttributes).reduce((a, b) => a + b, 0) / 8;
    const marketValue = Math.floor(500 + (avgStat * 25) + (potentialRating * 500) + (Math.random() * 300));
    
    // Calculate TAP used
    const tapUsed = Object.values(attributes).reduce((a, b) => a + b, 0);
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      name,
      firstName,
      lastName,
      race,
      role,
      age,
      ...finalAttributes,
      potentialRating,
      marketValue,
      potential: this.getPotentialLabel(potentialRating),
      tapUsed,
      tapAvailable
    };
  }

  /**
   * Distribute attribute points using TAP system with role priorities
   */
  private static distributeAttributePoints(totalPoints: number, role: PlayerRole): Record<string, number> {
    const attributes = {
      speed: 3,
      power: 3,
      throwing: 3,
      catching: 3,
      kicking: 3,
      staminaAttribute: 3,
      leadership: 3,
      agility: 3
    };
    
    // Start with baseline of 3 points each (24 total)
    let remainingPoints = totalPoints - 24;
    
    const rolePriorities = this.ROLE_PRIORITIES[role];
    const allStats = Object.keys(attributes);
    
    // Distribute 60% to primary stats
    const primaryPoints = Math.floor(remainingPoints * 0.6);
    this.distributeToStats(attributes, rolePriorities.primary, primaryPoints);
    
    // Distribute 40% to secondary stats  
    const secondaryPoints = remainingPoints - primaryPoints;
    this.distributeToStats(attributes, rolePriorities.secondary, secondaryPoints);
    
    return attributes;
  }

  /**
   * Distribute points among specified stats
   */
  private static distributeToStats(attributes: Record<string, number>, stats: string[], points: number): void {
    const pointsPerStat = Math.floor(points / stats.length);
    const extraPoints = points % stats.length;
    
    for (let i = 0; i < stats.length; i++) {
      const stat = stats[i];
      attributes[stat] += pointsPerStat + (i < extraPoints ? 1 : 0);
      
      // Cap at 40 - redistribute overflow
      if (attributes[stat] > 40) {
        const overflow = attributes[stat] - 40;
        attributes[stat] = 40;
        
        // Add overflow to other stats in this category
        for (const otherStat of stats) {
          if (otherStat !== stat && attributes[otherStat] < 40) {
            const canAdd = Math.min(overflow, 40 - attributes[otherStat]);
            attributes[otherStat] += canAdd;
            break;
          }
        }
      }
    }
  }

  /**
   * Get default age ranges per generation type
   */
  private static getDefaultAgeRange(type: string): { min: number; max: number } {
    switch (type) {
      case 'basic_tryout':
      case 'advanced_tryout':
        return { min: 16, max: 20 }; // Rookies
      case 'free_agent':
        return { min: 18, max: 35 }; // Wide range
      case 'hidden_gem':
        return { min: 20, max: 28 }; // Prime age gems
      default:
        return { min: 18, max: 25 };
    }
  }

  /**
   * Map generation type to potential system type
   */
  private static mapGenerationTypeToPotential(type: string): any {
    switch (type) {
      case 'basic_tryout': return 'basic_tryout';
      case 'advanced_tryout': return 'advanced_tryout';
      case 'free_agent': return 'veteran_pool';
      case 'hidden_gem': return 'hidden_gem';
      default: return 'basic_tryout';
    }
  }

  /**
   * Get random race
   */
  private static getRandomRace(): Race {
    const races = [Race.HUMAN, Race.SYLVAN, Race.GRYLL, Race.LUMINA, Race.UMBRA];
    return races[Math.floor(Math.random() * races.length)];
  }

  /**
   * Get random role
   */
  private static getRandomRole(): PlayerRole {
    const roles = [PlayerRole.PASSER, PlayerRole.RUNNER, PlayerRole.BLOCKER];
    return roles[Math.floor(Math.random() * roles.length)];
  }

  /**
   * Get potential label from rating
   */
  private static getPotentialLabel(rating: number): string {
    if (rating >= 4.0) return "High";
    if (rating >= 2.5) return "Medium";
    return "Low";
  }

  /**
   * Generate multiple players at once
   */
  static generateMultiplePlayers(
    count: number, 
    params: TAPPlayerGenerationParams
  ): GeneratedPlayer[] {
    const players: GeneratedPlayer[] = [];
    for (let i = 0; i < count; i++) {
      players.push(this.generatePlayer(params));
    }
    return players;
  }

  /**
   * Generate free agent pool with age variance
   */
  static generateFreeAgentPool(count: number): GeneratedPlayer[] {
    const players: GeneratedPlayer[] = [];
    
    for (let i = 0; i < count; i++) {
      // Create age-based distribution for free agents
      const ageRoll = Math.random();
      let ageRange: { min: number; max: number };
      
      if (ageRoll < 0.3) {
        // Young prospects (30%)
        ageRange = { min: 18, max: 24 };
      } else if (ageRoll < 0.7) {
        // Prime players (40%) 
        ageRange = { min: 25, max: 30 };
      } else {
        // Veterans (30%)
        ageRange = { min: 31, max: 35 };
      }
      
      players.push(this.generatePlayer({
        type: 'free_agent',
        ageRange
      }));
    }
    
    return players;
  }
}

export default PlayerGenerationService;