/**
 * Centralized division naming and utilities
 * Provides consistent division names across the entire application
 */

export const DIVISION_NAMES = {
  1: "Diamond League",
  2: "Platinum League", 
  3: "Gold League",
  4: "Silver League",
  5: "Bronze League",
  6: "Iron League",
  7: "Stone League",
  8: "Copper League",
} as const;

export function getDivisionName(division: number): string {
  return DIVISION_NAMES[division as keyof typeof DIVISION_NAMES] || `Division ${division}`;
}

// Sub-division names for Division 8 (Copper League) to add uniqueness
const DIVISION_8_SUBDIVISIONS = [
  "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta",
  "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi",
  "Rho", "Sigma", "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega"
];

export function getDivisionNameWithSubdivision(division: number, teamId?: string): string {
  const baseName = getDivisionName(division);
  
  // Handle the new sub-division system for Division 8 (Copper League)
  if (division === 8) {
    return `${baseName} - Main`;
  } else if (division === 80) {
    return `${baseName} - Alpha`;
  } else if (division === 800) {
    return `${baseName} - Beta`;
  } else if (division === 8000) {
    return `${baseName} - Gamma`;
  } else if (division === 80000) {
    return `${baseName} - Delta`;
  }
  
  // For any other division 8 sub-divisions, use a fallback naming
  if (division.toString().startsWith('8') && division !== 8) {
    const subDivisionNumber = Math.floor(Math.log10(division / 8));
    const subDivision = DIVISION_8_SUBDIVISIONS[subDivisionNumber - 1] || `Sub-${subDivisionNumber}`;
    return `${baseName} - ${subDivision}`;
  }
  
  return baseName;
}

export function getDivisionColor(division: number): string {
  const colors = {
    1: "text-blue-400",      // Diamond
    2: "text-purple-400",    // Platinum
    3: "text-yellow-400",    // Gold
    4: "text-gray-400",      // Silver
    5: "text-orange-600",    // Bronze
    6: "text-gray-600",      // Iron
    7: "text-stone-500",     // Stone
    8: "text-green-400",     // Copper
  };
  
  // All Division 8 sub-divisions use the same color as Division 8 (Copper League)
  if (division === 8 || division === 80 || division === 800 || division === 8000 || division === 80000) {
    return colors[8];
  }
  
  return colors[division as keyof typeof colors] || "text-gray-300";
}

export function getDivisionBadgeColor(division: number): string {
  const colors = {
    1: "bg-blue-600",        // Diamond
    2: "bg-purple-600",      // Platinum
    3: "bg-yellow-600",      // Gold
    4: "bg-gray-500",        // Silver
    5: "bg-orange-600",      // Bronze
    6: "bg-gray-700",        // Iron
    7: "bg-stone-600",       // Stone
    8: "bg-green-600",       // Copper
  };
  
  // All Division 8 sub-divisions use the same color as Division 8 (Copper League)
  if (division === 8 || division === 80 || division === 800 || division === 8000 || division === 80000) {
    return colors[8];
  }
  
  return colors[division as keyof typeof colors] || "bg-gray-600";
}