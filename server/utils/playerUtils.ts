/**
 * Player utility functions
 */

import { PlayerRole } from '../../prisma/generated/client';
import type { Player } from '@shared/types/models';


/**
 * Calculate age modifier for player rating
 */
function calculateAgeModifier(age: number): number {
  if (age <= 22) return 0.95; // Young player penalty
  if (age <= 26) return 1.0;  // Prime years
  if (age <= 30) return 0.98; // Early decline
  if (age <= 34) return 0.95; // Significant decline
  return 0.90; // Late career
}

/**
 * Calculate a player's overall rating based on their attributes and role
 * Based on the official formula in REALM_RIVALRY_COMPLETE_DOCUMENTATION.md
 */
export function calculateOverallRating(player: Partial<Player>, includeModifiers: boolean = false): number {
  // Simple average calculation if no role specified
  if (!player.role) {
    const attributes = [
      player.speed || 0,
      player.power || 0,
      player.throwing || 0,
      player.catching || 0,
      player.kicking || 0,
      player.staminaAttribute || 0,
      player.leadership || 0,
      player.agility || 0
    ];
    return Math.round(attributes.reduce((sum: any, val: any) => sum + val, 0) / attributes.length);
  }

  // Role-based weighted calculation
  const roleWeights: Record<PlayerRole, { speed: number; power: number; throwing: number; catching: number }> = {
    PASSER: { speed: 0.3, power: 0.1, throwing: 0.4, catching: 0.2 },
    RUNNER: { speed: 0.4, power: 0.2, throwing: 0.1, catching: 0.3 },
    BLOCKER: { speed: 0.1, power: 0.5, throwing: 0.1, catching: 0.3 }
  };
  
  const weights = roleWeights[player.role];
  const baseRating = (
    (player.speed || 0) * weights.speed +
    (player.power || 0) * weights.power +
    (player.throwing || 0) * weights.throwing +
    (player.catching || 0) * weights.catching
  );
  
  // Include additional attributes with equal weighting
  const additionalAttributes = [
    player.kicking || 0,
    player.staminaAttribute || 0,
    player.leadership || 0,
    player.agility || 0
  ];
  
  const additionalAvg = additionalAttributes.reduce((sum: any, val: any) => sum + val, 0) / 4;
  const combinedRating = (baseRating * 0.7) + (additionalAvg * 0.3);
  
  if (!includeModifiers) {
    return Math.round(combinedRating);
  }
  
  // Apply age and experience modifiers if requested
  const ageModifier = player.age ? calculateAgeModifier(player.age) : 1.0;
  const experienceBonus = Math.min((player.gamesPlayedLastSeason || 0) * 0.1, 5);
  
  return Math.round(combinedRating * ageModifier + experienceBonus);
}

/**
 * Add overallRating to a player object
 */
export function withOverallRating<T extends Partial<Player>>(player: T): T & { overallRating: number } {
  return {
    ...player,
    overallRating: calculateOverallRating(player)
  };
}

/**
 * Add overallRating to multiple players
 */
export function withOverallRatings<T extends Partial<Player>>(players: T[]): (T & { overallRating: number })[] {
  return players.map(player => withOverallRating(player));
}