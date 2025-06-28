export interface DivisionInfo {
  name: string;
  tier: string;
  description: string;
  color: string;
  prestigeLevel: number;
}

export const DIVISION_INFO: Record<number, DivisionInfo> = {
  1: {
    name: "Diamond Division",
    tier: "Elite",
    description: "The pinnacle of competitive excellence",
    color: "text-blue-400",
    prestigeLevel: 8
  },
  2: {
    name: "Platinum Division", 
    tier: "Premier",
    description: "Home to championship contenders",
    color: "text-slate-300",
    prestigeLevel: 7
  },
  3: {
    name: "Gold Division",
    tier: "Professional",
    description: "Where legends are forged",
    color: "text-yellow-400",
    prestigeLevel: 6
  },
  4: {
    name: "Silver Division",
    tier: "Advanced", 
    description: "Rising stars and proven veterans",
    color: "text-gray-300",
    prestigeLevel: 5
  },
  5: {
    name: "Bronze Division",
    tier: "Competitive",
    description: "Fierce competition and emerging talent",
    color: "text-orange-400",
    prestigeLevel: 4
  },
  6: {
    name: "Copper Division",
    tier: "Developing",
    description: "Building foundations for greatness",
    color: "text-orange-600",
    prestigeLevel: 3
  },
  7: {
    name: "Iron Division", 
    tier: "Foundational",
    description: "Strength through determination",
    color: "text-gray-500",
    prestigeLevel: 2
  },
  8: {
    name: "Stone Division",
    tier: "Rookie",
    description: "Where every champion begins their journey",
    color: "text-stone-400", 
    prestigeLevel: 1
  }
};

export function getDivisionName(division: number): string {
  return DIVISION_INFO[division]?.name || `Division ${division}`;
}

export function getDivisionTier(division: number): string {
  return DIVISION_INFO[division]?.tier || "Unknown";
}

export function getDivisionInfo(division: number): DivisionInfo | null {
  return DIVISION_INFO[division] || null;
}

export function getFullDivisionTitle(division: number): string {
  const info = DIVISION_INFO[division];
  if (!info) return `Division ${division}`;
  return `${info.name} (${info.tier})`;
}