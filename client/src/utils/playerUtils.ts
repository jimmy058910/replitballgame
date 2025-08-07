/**
 * Player Utility Functions
 * Centralized player calculations and utilities for consistency across the app
 */

export interface Player {
  id: number;
  name: string;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  agility?: number;
  staminaAttribute?: number;
  stamina?: number;
  leadership?: number;
  role?: string;
  rosterPosition?: number;
  salary?: number;
  age?: number;
  experience?: number;
  marketValue?: number;
  contractLength?: number;
  isInjured?: boolean;
  injuryType?: string;
  injuryWeeks?: number;
  morale?: number;
  form?: number;
  potential?: number;
  nationality?: string;
  height?: number;
  weight?: number;
}

/**
 * Calculate player power rating based on core attributes
 * Uses average of all 8 main attributes (CAR - Core Athleticism Rating)
 */
export function calculatePlayerPower(player: Player): number {
  const attributes = [
    player.speed || 0,
    player.power || 0,
    player.throwing || 0,
    player.catching || 0,
    player.kicking || 0,
    player.agility || 0,
    player.staminaAttribute || player.stamina || 0,
    player.leadership || 0
  ];
  
  const total = attributes.reduce((sum, attr) => sum + attr, 0);
  return Math.round(total / 8);
}

/**
 * Calculate player value based on age, power, and potential
 */
export function calculatePlayerValue(player: Player): number {
  const basePower = calculatePlayerPower(player);
  const age = player.age || 25;
  const potential = player.potential || basePower;
  
  // Age factor: peak at 25-28, decline after 30
  let ageFactor = 1.0;
  if (age < 22) ageFactor = 0.7; // Young, unproven
  else if (age < 25) ageFactor = 0.9; // Developing
  else if (age <= 28) ageFactor = 1.0; // Peak years
  else if (age <= 32) ageFactor = 0.8; // Declining
  else ageFactor = 0.6; // Veteran
  
  // Potential factor
  const potentialFactor = Math.min(potential / basePower, 1.5);
  
  // Base value calculation
  const baseValue = basePower * 10000; // $10k per power point
  
  return Math.round(baseValue * ageFactor * potentialFactor);
}

/**
 * Get player role color for UI display
 */
export function getPlayerRoleColor(role: string): string {
  switch (role?.toLowerCase()) {
    case 'passer':
      return 'bg-blue-500';
    case 'runner':
      return 'bg-green-500';
    case 'blocker':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Get player status color based on injury and form
 */
export function getPlayerStatusColor(player: Player): string {
  if (player.isInjured) return 'bg-red-500';
  if ((player.form || 0) >= 80) return 'bg-green-500';
  if ((player.form || 0) >= 60) return 'bg-yellow-500';
  if ((player.form || 0) >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

/**
 * Format player salary for display
 */
export function formatPlayerSalary(salary: number): string {
  if (salary >= 1000000) {
    return `$${(salary / 1000000).toFixed(1)}M`;
  } else if (salary >= 1000) {
    return `$${(salary / 1000).toFixed(0)}K`;
  } else {
    return `$${salary}`;
  }
}

/**
 * Get player age category
 */
export function getPlayerAgeCategory(age: number): string {
  if (age < 22) return 'Rookie';
  if (age < 25) return 'Young';
  if (age <= 28) return 'Prime';
  if (age <= 32) return 'Veteran';
  return 'Elder';
}

/**
 * Calculate player development potential
 */
export function calculateDevelopmentPotential(player: Player): number {
  const currentPower = calculatePlayerPower(player);
  const age = player.age || 25;
  const potential = player.potential || currentPower;
  
  // Younger players have more room for improvement
  const ageModifier = Math.max(0, (30 - age) / 10);
  const potentialGap = potential - currentPower;
  
  return Math.round(potentialGap * ageModifier);
}

/**
 * Check if player is in taxi squad
 */
export function isPlayerInTaxiSquad(player: Player): boolean {
  return (player.rosterPosition || 0) >= 13;
}

/**
 * Get player efficiency rating based on role
 */
export function getPlayerEfficiency(player: Player): number {
  const role = player.role?.toLowerCase();
  
  switch (role) {
    case 'passer':
      return Math.round(((player.throwing || 0) + (player.leadership || 0) + (player.agility || 0)) / 3);
    case 'runner':
      return Math.round(((player.speed || 0) + (player.agility || 0) + (player.power || 0)) / 3);
    case 'blocker':
      return Math.round(((player.power || 0) + (player.staminaAttribute || player.stamina || 0)) / 2);
    default:
      return calculatePlayerPower(player);
  }
}

/**
 * Sort players by power rating (descending)
 */
export function sortPlayersByPower(players: Player[]): Player[] {
  return [...players].sort((a, b) => calculatePlayerPower(b) - calculatePlayerPower(a));
}

/**
 * Filter players by role
 */
export function filterPlayersByRole(players: Player[], role: string): Player[] {
  if (role === 'all') return players;
  if (role === 'taxi-squad') return players.filter(p => isPlayerInTaxiSquad(p));
  return players.filter(p => p.role?.toLowerCase() === role.toLowerCase());
}

/**
 * Get player statistics summary
 */
export function getPlayerStatsSummary(players: Player[]) {
  const stats = {
    total: players.length,
    passer: 0,
    runner: 0,
    blocker: 0,
    taxiSquad: 0,
    injured: 0,
    averagePower: 0,
    totalSalary: 0
  };

  let totalPower = 0;
  
  players.forEach(player => {
    const role = player.role?.toLowerCase();
    if (role === 'passer') stats.passer++;
    else if (role === 'runner') stats.runner++;
    else if (role === 'blocker') stats.blocker++;
    
    if (isPlayerInTaxiSquad(player)) stats.taxiSquad++;
    if (player.isInjured) stats.injured++;
    
    totalPower += calculatePlayerPower(player);
    stats.totalSalary += player.salary || 0;
  });

  stats.averagePower = players.length > 0 ? Math.round(totalPower / players.length) : 0;
  
  return stats;
}