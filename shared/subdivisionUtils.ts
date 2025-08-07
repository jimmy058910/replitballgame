/**
 * Utility functions for handling subdivision names and display formatting
 */

/**
 * Convert database subdivision name to user-friendly display format
 * Examples:
 * - "alpha" → "Alpha"
 * - "beta_3" → "Beta 3"  
 * - "omega_12" → "Omega 12"
 * - "overflow_123456" → "Overflow Division 123456"
 */
export function formatSubdivisionName(subdivisionName: string): string {
  if (!subdivisionName) return "Unknown";
  
  // Handle overflow divisions
  if (subdivisionName.startsWith('overflow_')) {
    const id = subdivisionName.replace('overflow_', '');
    return `Overflow Division ${id}`;
  }
  
  // Handle numbered subdivisions (e.g., "alpha_3")
  if (subdivisionName.includes('_')) {
    const [baseName, number] = subdivisionName.split('_');
    const capitalizedBase = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    return `${capitalizedBase} ${number}`;
  }
  
  // Handle base subdivisions (e.g., "alpha")
  return subdivisionName.charAt(0).toUpperCase() + subdivisionName.slice(1);
}

/**
 * Get subdivision capacity information
 * Returns max teams per subdivision and theoretical total capacity
 */
export function getSubdivisionCapacityInfo() {
  const TEAMS_PER_SUBDIVISION = 8;
  const BASE_SUBDIVISIONS = 25; // Full Greek alphabet + "main"
  const MAX_NUMBERED_EXTENSIONS = 100; // Per base subdivision
  
  const baseCapacity = BASE_SUBDIVISIONS * TEAMS_PER_SUBDIVISION;
  const numberedCapacity = BASE_SUBDIVISIONS * MAX_NUMBERED_EXTENSIONS * TEAMS_PER_SUBDIVISION;
  const totalCapacity = baseCapacity + numberedCapacity;
  
  return {
    teamsPerSubdivision: TEAMS_PER_SUBDIVISION,
    baseSubdivisions: BASE_SUBDIVISIONS,
    maxNumberedExtensions: MAX_NUMBERED_EXTENSIONS,
    baseCapacity,
    numberedCapacity,
    totalCapacity,
    formattedTotalCapacity: totalCapacity.toLocaleString()
  };
}

/**
 * Generate subdivision name suggestions for admin/testing purposes
 * Shows how the system will progress through subdivision names
 */
export function generateSubdivisionProgression(count: number = 50): string[] {
  const greekAlphabet = [
    "main", "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", 
    "theta", "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", 
    "pi", "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega"
  ];
  
  const progression: string[] = [];
  
  // Add base names first
  for (const baseName of greekAlphabet) {
    progression.push(baseName);
    if (progression.length >= count) break;
  }
  
  // Add numbered extensions
  if (progression.length < count) {
    for (const baseName of greekAlphabet) {
      for (let i = 1; i <= 100; i++) {
        progression.push(`${baseName}_${i}`);
        if (progression.length >= count) break;
      }
      if (progression.length >= count) break;
    }
  }
  
  return progression.slice(0, count);
}

/**
 * Validate subdivision name format
 * Ensures subdivision names follow expected patterns
 */
export function validateSubdivisionName(subdivisionName: string): {
  isValid: boolean;
  type: 'base' | 'numbered' | 'overflow' | 'invalid';
  baseName?: string;
  number?: number;
} {
  if (!subdivisionName || typeof subdivisionName !== 'string') {
    return { isValid: false, type: 'invalid' };
  }
  
  const greekAlphabet = [
    "main", "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", 
    "theta", "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", 
    "pi", "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega"
  ];
  
  // Check overflow format
  if (subdivisionName.startsWith('overflow_')) {
    return { isValid: true, type: 'overflow' };
  }
  
  // Check numbered format (e.g., "alpha_3")
  if (subdivisionName.includes('_')) {
    const [baseName, numberStr] = subdivisionName.split('_');
    const number = parseInt(numberStr);
    
    if (greekAlphabet.includes(baseName) && !isNaN(number) && number > 0) {
      return { isValid: true, type: 'numbered', baseName, number };
    }
    
    return { isValid: false, type: 'invalid' };
  }
  
  // Check base format
  if (greekAlphabet.includes(subdivisionName)) {
    return { isValid: true, type: 'base', baseName: subdivisionName };
  }
  
  return { isValid: false, type: 'invalid' };
}