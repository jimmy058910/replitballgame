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
  
  if (division === 8 && teamId) {
    // Generate consistent sub-division based on team ID
    const hash = teamId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const subDivisionIndex = Math.abs(hash) % DIVISION_8_SUBDIVISIONS.length;
    const subDivision = DIVISION_8_SUBDIVISIONS[subDivisionIndex];
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
    8: "text-green-400",     // Rookie
  };
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
  return colors[division as keyof typeof colors] || "bg-gray-600";
}