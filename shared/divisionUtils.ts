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
  8: "Rookie League",
} as const;

export function getDivisionName(division: number): string {
  return DIVISION_NAMES[division as keyof typeof DIVISION_NAMES] || `Division ${division}`;
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
    8: "bg-green-600",       // Rookie
  };
  return colors[division as keyof typeof colors] || "bg-gray-600";
}