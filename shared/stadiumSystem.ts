/**
 * Comprehensive Stadium, Finance & Atmosphere System
 * Implements fan loyalty, revenue calculations, and in-game home field advantage
 */

import type { Stadium, StadiumRevenue, FacilityUpgrade } from './schema';

export interface AtmosphereData {
  fanLoyalty: number; // 0-100
  homeAdvantage: number; // 0-100
  intimidationFactor: number; // 0-10
  attendance: number;
  attendanceRate: number; // 0.0-1.0
}

export interface RevenueCalculation {
  ticketSales: number;
  concessionSales: number;
  parkingRevenue: number;
  apparelSales: number;
  vipSuiteRevenue: number;
  atmosphereBonus: number;
  totalRevenue: number;
  maintenanceCost: number;
  netRevenue: number;
}

export interface FacilityInfo {
  name: string;
  level: number;
  maxLevel: number;
  upgradeCost: number;
  description: string;
  revenueBonus: number;
  atmosphereBonus: number;
}

// Stadium Configuration Constants
export const STADIUM_CONFIG = {
  BASE_CAPACITY: 15000,
  MAX_CAPACITY: 75000,
  BASE_FAN_LOYALTY: 50,
  
  // Facility Level Effects
  FACILITY_EFFECTS: {
    concessionsLevel: {
      revenueMultiplier: 0.15, // 15% per level
      maxLevel: 5,
      baseCost: 25000
    },
    parkingLevel: {
      revenueMultiplier: 0.10, // 10% per level
      maxLevel: 5,
      baseCost: 15000
    },
    merchandisingLevel: {
      revenueMultiplier: 0.12, // 12% per level
      maxLevel: 5,
      baseCost: 20000
    },
    vipSuitesLevel: {
      revenueMultiplier: 0.25, // 25% per level
      maxLevel: 3,
      baseCost: 100000
    },
    screensLevel: {
      atmosphereBonus: 3, // +3 per level
      maxLevel: 4,
      baseCost: 30000
    },
    lightingLevel: {
      atmosphereBonus: 2, // +2 per level
      homeAdvantageBonus: 1, // +1 per level
      maxLevel: 5,
      baseCost: 40000
    },
    securityLevel: {
      atmosphereBonus: 1, // +1 per level
      capacityBonus: 2000, // +2000 per level
      maxLevel: 5,
      baseCost: 35000
    }
  },
  
  // Field Size Effects
  FIELD_SIZE_EFFECTS: {
    standard: { name: "Standard Field", homeAdvantageBonus: 0, description: "Regulation size field" },
    large: { name: "Large Field", homeAdvantageBonus: 5, description: "Larger field favors speed and endurance" },
    small: { name: "Small Field", homeAdvantageBonus: 3, description: "Compact field favors power and quick plays" }
  },
  
  // Revenue Base Rates (per 1000 attendance)
  REVENUE_RATES: {
    ticketSales: 25, // $25 per person
    concessionSales: 12, // $12 per person
    parkingRevenue: 8, // $8 per person
    apparelSales: 5, // $5 per person
    vipSuiteRevenue: 150 // $150 per suite per person
  }
};

/**
 * Calculate fan loyalty based on team performance and stadium quality
 */
export function calculateFanLoyalty(
  currentLoyalty: number,
  teamRecord: string, // "wins-losses-draws"
  facilityQuality: number, // 1-100 based on upgrades
  winStreak: number,
  seasonPerformance: number // 0-100 based on league position
): number {
  let newLoyalty = currentLoyalty;
  
  // Team performance impact
  const [wins, losses] = teamRecord.split('-').map(Number);
  const winRate = wins / (wins + losses || 1);
  
  if (winRate > 0.7) newLoyalty += 8;
  else if (winRate > 0.5) newLoyalty += 3;
  else if (winRate < 0.3) newLoyalty -= 5;
  
  // Win streak bonus
  if (winStreak >= 5) newLoyalty += 5;
  else if (winStreak >= 3) newLoyalty += 2;
  
  // Facility quality impact
  const facilityBonus = Math.floor(facilityQuality / 20);
  newLoyalty += facilityBonus;
  
  // Season performance
  if (seasonPerformance > 80) newLoyalty += 3;
  else if (seasonPerformance < 20) newLoyalty -= 3;
  
  return Math.max(0, Math.min(100, newLoyalty));
}

/**
 * Calculate home field advantage based on stadium features and atmosphere
 */
export function calculateHomeAdvantage(stadium: Stadium, fanLoyalty: number): number {
  let homeAdvantage = 5; // Base advantage
  
  // Fan loyalty impact (major factor)
  homeAdvantage += Math.floor(fanLoyalty / 10);
  
  // Field size bonus
  const fieldEffect = STADIUM_CONFIG.FIELD_SIZE_EFFECTS[stadium.fieldSize as keyof typeof STADIUM_CONFIG.FIELD_SIZE_EFFECTS];
  if (fieldEffect) {
    homeAdvantage += fieldEffect.homeAdvantageBonus;
  }
  
  // Lighting level bonus
  homeAdvantage += stadium.lightingLevel || 1;
  
  // Stadium level general bonus
  homeAdvantage += Math.floor((stadium.level || 1) / 2);
  
  // Capacity intimidation factor
  const capacityFactor = Math.floor((stadium.capacity || 15000) / 5000);
  homeAdvantage += Math.min(capacityFactor, 8);
  
  return Math.max(5, Math.min(25, homeAdvantage));
}

/**
 * Calculate game attendance based on multiple factors
 */
export function calculateAttendance(
  stadium: Stadium,
  fanLoyalty: number,
  opponentQuality: number, // 1-100
  isImportantGame: boolean = false,
  weather: 'good' | 'fair' | 'poor' = 'good'
): { attendance: number; attendanceRate: number } {
  let baseRate = 0.35; // 35% base attendance
  
  // Fan loyalty impact
  baseRate += (fanLoyalty / 100) * 0.4; // Up to +40%
  
  // Opponent quality (better opponents draw more fans)
  baseRate += (opponentQuality / 100) * 0.15; // Up to +15%
  
  // Important game bonus
  if (isImportantGame) baseRate += 0.1; // +10%
  
  // Weather impact
  if (weather === 'poor') baseRate -= 0.1;
  else if (weather === 'fair') baseRate -= 0.05;
  
  // Stadium quality impact
  const qualityBonus = ((stadium.level || 1) / 10) * 0.05; // Up to +5% at max level
  baseRate += qualityBonus;
  
  // Cap attendance rate
  const attendanceRate = Math.max(0.15, Math.min(0.95, baseRate));
  const attendance = Math.floor((stadium.capacity || 15000) * attendanceRate);
  
  return { attendance, attendanceRate };
}

/**
 * Calculate comprehensive revenue for a game
 */
export function calculateGameRevenue(
  stadium: Stadium,
  attendance: number,
  fanLoyalty: number,
  isHomeGame: boolean = true
): RevenueCalculation {
  if (!isHomeGame) {
    return {
      ticketSales: 0,
      concessionSales: 0,
      parkingRevenue: 0,
      apparelSales: 0,
      vipSuiteRevenue: 0,
      atmosphereBonus: 0,
      totalRevenue: 0,
      maintenanceCost: stadium.maintenanceCost || 5000,
      netRevenue: -(stadium.maintenanceCost || 5000)
    };
  }
  
  const attendanceThousands = attendance / 1000;
  
  // Base revenue calculations
  let ticketSales = attendanceThousands * STADIUM_CONFIG.REVENUE_RATES.ticketSales;
  let concessionSales = attendanceThousands * STADIUM_CONFIG.REVENUE_RATES.concessionSales;
  let parkingRevenue = attendanceThousands * STADIUM_CONFIG.REVENUE_RATES.parkingRevenue;
  let apparelSales = attendanceThousands * STADIUM_CONFIG.REVENUE_RATES.apparelSales;
  let vipSuiteRevenue = ((stadium.vipSuitesLevel || 1) * 10) * STADIUM_CONFIG.REVENUE_RATES.vipSuiteRevenue;
  
  // Apply facility bonuses
  concessionSales *= (1 + ((stadium.concessionsLevel || 1) * 0.15));
  parkingRevenue *= (1 + ((stadium.parkingLevel || 1) * 0.10));
  apparelSales *= (1 + ((stadium.merchandisingLevel || 1) * 0.12));
  vipSuiteRevenue *= (1 + ((stadium.vipSuitesLevel || 1) * 0.25));
  
  // Fan loyalty atmosphere bonus
  const atmosphereBonus = Math.floor((fanLoyalty / 100) * (ticketSales * 0.1));
  
  const totalRevenue = ticketSales + concessionSales + parkingRevenue + apparelSales + vipSuiteRevenue + atmosphereBonus;
  const netRevenue = totalRevenue - (stadium.maintenanceCost || 5000);
  
  return {
    ticketSales: Math.floor(ticketSales),
    concessionSales: Math.floor(concessionSales),
    parkingRevenue: Math.floor(parkingRevenue),
    apparelSales: Math.floor(apparelSales),
    vipSuiteRevenue: Math.floor(vipSuiteRevenue),
    atmosphereBonus: Math.floor(atmosphereBonus),
    totalRevenue: Math.floor(totalRevenue),
    maintenanceCost: stadium.maintenanceCost || 5000,
    netRevenue: Math.floor(netRevenue)
  };
}

/**
 * Get available facility upgrades for a stadium
 */
export function getAvailableFacilityUpgrades(stadium: Stadium): FacilityInfo[] {
  const upgrades: FacilityInfo[] = [];
  
  const facilities = [
    { 
      key: 'concessionsLevel', 
      name: 'Concessions', 
      current: stadium.concessionsLevel,
      description: 'Food and beverage sales'
    },
    { 
      key: 'parkingLevel', 
      name: 'Parking', 
      current: stadium.parkingLevel,
      description: 'Parking capacity and quality'
    },
    { 
      key: 'merchandisingLevel', 
      name: 'Merchandising', 
      current: stadium.merchandisingLevel,
      description: 'Team store and apparel sales'
    },
    { 
      key: 'vipSuitesLevel', 
      name: 'VIP Suites', 
      current: stadium.vipSuitesLevel,
      description: 'Premium seating and hospitality'
    },
    { 
      key: 'screensLevel', 
      name: 'Video Screens', 
      current: stadium.screensLevel,
      description: 'Stadium video and sound systems'
    },
    { 
      key: 'lightingLevel', 
      name: 'Lighting', 
      current: stadium.lightingLevel,
      description: 'Stadium lighting and visibility'
    },
    { 
      key: 'securityLevel', 
      name: 'Security', 
      current: stadium.securityLevel,
      description: 'Safety and crowd management'
    }
  ];
  
  facilities.forEach(facility => {
    const config = STADIUM_CONFIG.FACILITY_EFFECTS[facility.key as keyof typeof STADIUM_CONFIG.FACILITY_EFFECTS];
    const currentLevel = facility.current || 1;
    if (currentLevel < config.maxLevel) {
      const nextLevel = currentLevel + 1;
      const upgradeCost = config.baseCost * Math.pow(1.5, currentLevel);
      
      upgrades.push({
        name: `${facility.name} Level ${nextLevel}`,
        level: nextLevel,
        maxLevel: config.maxLevel,
        upgradeCost: Math.floor(upgradeCost),
        description: facility.description,
        revenueBonus: (config as any).revenueMultiplier ? (config as any).revenueMultiplier * 100 : 0,
        atmosphereBonus: (config as any).atmosphereBonus || 0
      });
    }
  });
  
  return upgrades;
}

/**
 * Calculate total facility quality score (0-100)
 */
export function calculateFacilityQuality(stadium: Stadium): number {
  const facilities = [
    { current: stadium.concessionsLevel, max: 5 },
    { current: stadium.parkingLevel, max: 5 },
    { current: stadium.merchandisingLevel, max: 5 },
    { current: stadium.vipSuitesLevel, max: 3 },
    { current: stadium.screensLevel, max: 4 },
    { current: stadium.lightingLevel, max: 5 },
    { current: stadium.securityLevel, max: 5 }
  ];
  
  const totalPossible = facilities.reduce((sum, f) => sum + f.max, 0);
  const totalCurrent = facilities.reduce((sum, f) => sum + (f.current || 1), 0);
  
  return Math.floor((totalCurrent / totalPossible) * 100);
}

/**
 * Get stadium atmosphere description based on loyalty and facilities
 */
export function getAtmosphereDescription(fanLoyalty: number, facilityQuality: number): {
  level: string;
  description: string;
  color: string;
} {
  const combinedScore = (fanLoyalty + facilityQuality) / 2;
  
  if (combinedScore >= 80) {
    return {
      level: "Electric",
      description: "The crowd is deafening! Home field advantage is at maximum.",
      color: "text-green-600"
    };
  } else if (combinedScore >= 60) {
    return {
      level: "Energetic",
      description: "Fans are engaged and creating good atmosphere.",
      color: "text-blue-600"
    };
  } else if (combinedScore >= 40) {
    return {
      level: "Moderate",
      description: "Average crowd energy with some fan support.",
      color: "text-yellow-600"
    };
  } else if (combinedScore >= 20) {
    return {
      level: "Quiet",
      description: "Low energy crowd with minimal impact on the game.",
      color: "text-orange-600"
    };
  } else {
    return {
      level: "Hostile",
      description: "Fans are turning against the team. Negative atmosphere.",
      color: "text-red-600"
    };
  }
}