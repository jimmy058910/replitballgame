/**
 * Unified Potential/Star Rating System
 * Standardizes potential generation, display, and gameplay effects
 */

export interface PotentialConfig {
  min: number;
  max: number;
  weight: number; // Controls distribution curve (higher = bias toward max)
}

export interface StarRatingProps {
  potential: number;
  showDecimal?: boolean;
  compact?: boolean;
  scoutAccuracy?: number; // Scout rating 1-40 for fog of war
}

export interface PotentialGenerationParams {
  type: 'basic_tryout' | 'advanced_tryout' | 'elite_scouting' | 'veteran_pool' | 'hidden_gem' | 'released_player';
  ageModifier?: number; // Affects potential for older players
  randomSeed?: number; // For deterministic generation
}

/**
 * Potential generation configurations for different player types
 */
export const POTENTIAL_CONFIGS: Record<string, PotentialConfig> = {
  basic_tryout: { min: 0.5, max: 3.0, weight: 1.5 },
  advanced_tryout: { min: 2.0, max: 4.5, weight: 2.0 },
  elite_scouting: { min: 3.5, max: 5.0, weight: 1.8 },
  veteran_pool: { min: 1.0, max: 3.5, weight: 1.2 },
  hidden_gem: { min: 2.5, max: 4.5, weight: 2.5 },
  released_player: { min: 0.5, max: 4.0, weight: 1.0 }
};

/**
 * Generate standardized potential rating
 */
export function generatePotential(params: PotentialGenerationParams): number {
  const config = POTENTIAL_CONFIGS[params.type];
  if (!config) {
    throw new Error(`Invalid potential generation type: ${params.type}`);
  }

  // Use seed for deterministic generation if provided
  const random = params.randomSeed ? 
    Math.sin(params.randomSeed * 9999) * 0.5 + 0.5 : 
    Math.random();

  // Apply weight curve (higher weight = bias toward higher values)
  const weighted = Math.pow(random, 1 / config.weight);
  
  // Calculate base potential
  let potential = config.min + (weighted * (config.max - config.min));
  
  // Apply age modifier for older players (reduces potential)
  if (params.ageModifier && params.ageModifier > 0) {
    const ageReduction = Math.max(0, (params.ageModifier - 25) * 0.1);
    potential = Math.max(config.min, potential - ageReduction);
  }
  
  // Round to 1 decimal place and enforce bounds
  potential = Math.round(potential * 10) / 10;
  return Math.max(0.5, Math.min(5.0, potential));
}

/**
 * Validate potential rating is within valid range
 */
export function validatePotential(potential: number): boolean {
  return potential >= 0.5 && potential <= 5.0 && (potential * 10) % 1 === 0;
}

/**
 * Normalize potential to valid range (for data cleanup)
 */
export function normalizePotential(potential: number): number {
  if (isNaN(potential) || potential < 0.5) return 0.5;
  if (potential > 5.0) return 5.0;
  return Math.round(potential * 10) / 10;
}

/**
 * Convert potential to stat cap (40-point scale)
 */
export function potentialToStatCap(potential: number): number {
  return Math.round(potential * 8); // 0.5 → 4, 5.0 → 40
}

/**
 * Calculate progression bonus from potential
 */
export function getPotentialProgressionBonus(potential: number): number {
  return Math.round(((potential - 0.5) / 4.5) * 13.5); // 0% to 13.5% bonus
}

/**
 * Apply scout accuracy to potential display (fog of war)
 */
export function applyScoutAccuracy(actualPotential: number, scoutRating: number): {
  displayPotential: number;
  isExact: boolean;
  range: { min: number; max: number };
} {
  if (scoutRating <= 0) {
    return {
      displayPotential: 0,
      isExact: false,
      range: { min: 0.5, max: 5.0 }
    };
  }

  // Calculate accuracy based on scout rating
  let accuracy: number;
  if (scoutRating >= 36) accuracy = 0.0; // Elite scout - exact
  else if (scoutRating >= 26) accuracy = 0.1; // Good scout - ±0.1
  else if (scoutRating >= 16) accuracy = 0.3; // Average scout - ±0.3
  else accuracy = 0.5; // Poor scout - ±0.5

  if (accuracy === 0.0) {
    return {
      displayPotential: actualPotential,
      isExact: true,
      range: { min: actualPotential, max: actualPotential }
    };
  }

  // Generate display potential with accuracy variance
  const variance = (Math.random() - 0.5) * 2 * accuracy; // -accuracy to +accuracy
  const displayPotential = normalizePotential(actualPotential + variance);
  
  return {
    displayPotential,
    isExact: false,
    range: {
      min: Math.max(0.5, actualPotential - accuracy),
      max: Math.min(5.0, actualPotential + accuracy)
    }
  };
}

/**
 * Calculate contract value multiplier based on potential and age
 */
export function getPotentialContractMultiplier(potential: number, age: number): number {
  const normalizedPotential = (potential - 0.5) / 4.5; // 0-1 scale
  const ageModifier = Math.max(0.3, Math.min(1.5, (30 - age) / 15)); // Young players get premium
  return 1 + (normalizedPotential * ageModifier * 0.5); // Up to 75% premium for young high-potential
}

/**
 * Get full star count from potential rating
 */
export function getFullStars(potential: number): number {
  return Math.floor(potential);
}

/**
 * Check if potential should show half star
 */
export function hasHalfStar(potential: number): boolean {
  return (potential % 1) >= 0.5;
}

/**
 * Get empty star count for display
 */
export function getEmptyStars(potential: number): number {
  const fullStars = getFullStars(potential);
  const halfStar = hasHalfStar(potential) ? 1 : 0;
  return 5 - fullStars - halfStar;
}

/**
 * Get potential tier description
 */
export function getPotentialTier(potential: number): {
  tier: string;
  description: string;
  color: string;
} {
  if (potential >= 4.5) return { tier: 'Elite', description: 'Exceptional talent with superstar potential', color: 'text-purple-400' };
  if (potential >= 3.5) return { tier: 'High', description: 'Strong potential for significant development', color: 'text-blue-400' };
  if (potential >= 2.5) return { tier: 'Good', description: 'Solid development potential', color: 'text-green-400' };
  if (potential >= 1.5) return { tier: 'Average', description: 'Moderate development potential', color: 'text-yellow-400' };
  return { tier: 'Limited', description: 'Minimal development potential', color: 'text-red-400' };
}

/**
 * Generate potential distribution for analytics
 */
export function generatePotentialDistribution(count: number, type: string): number[] {
  const potentials: number[] = [];
  for (let i = 0; i < count; i++) {
    potentials.push(generatePotential({ type: type as any, randomSeed: i }));
  }
  return potentials.sort((a, b) => b - a);
}