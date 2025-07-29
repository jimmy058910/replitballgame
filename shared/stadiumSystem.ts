/**
 * Comprehensive Stadium, Finance & Atmosphere System
 * Implements fan loyalty, revenue calculations, and in-game home field advantage
 */

// Stadium type definitions (matching Prisma schema)
export interface Stadium {
  id?: number;
  teamId?: number;
  capacity: number;
  concessionsLevel?: number;
  parkingLevel?: number;
  vipSuitesLevel?: number;
  merchandisingLevel?: number;
  lightingScreensLevel?: number;
  lightingLevel?: number;
  screensLevel?: number;
  securityLevel?: number;
  level?: number;
  fieldSize?: string;
  maintenanceCost?: number;
  fanLoyalty?: number;
}

export interface StadiumRevenue {
  ticketSales: number;
  concessionSales: number;
  parkingRevenue: number;
  apparelSales: number;
  vipSuiteRevenue: number;
  totalRevenue: number;
  maintenanceCost: number;
  netRevenue: number;
}

export interface FacilityUpgrade {
  name: string;
  level: number;
  maxLevel: number;
  upgradeCost: number;
  description: string;
}

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
  facilityKey?: string;
  currentLevel?: number;
  canUpgrade?: boolean;
  effect?: string;
  roi?: string;
}

// Stadium Configuration - Loaded from config/stadium_config.json
let STADIUM_CONFIG: any = null;

/**
 * Load stadium configuration from JSON file
 */
async function loadStadiumConfig() {
  if (STADIUM_CONFIG) return STADIUM_CONFIG;
  
  try {
    // Node.js environment - use ES module imports
    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.join(process.cwd(), 'config', 'stadium_config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    STADIUM_CONFIG = JSON.parse(configData);
  } catch (error) {
    console.error('Failed to load stadium config, using defaults:', error);
    // Fallback to basic configuration
    STADIUM_CONFIG = {
      stadium_defaults: { base_capacity: 5000, max_capacity: 75000, base_fan_loyalty: 50 },
      facilities: {
        concessions: { max_level: 5, base_cost: 15000, revenue_multiplier_per_level: 0.15 },
        parking: { max_level: 5, base_cost: 20000, revenue_multiplier_per_level: 0.10 },
        merchandising: { max_level: 5, base_cost: 12000, revenue_multiplier_per_level: 0.12 },
        vip_suites: { max_level: 3, base_cost: 75000, flat_revenue_per_level: 5000 },
        lighting: { max_level: 5, base_cost: 30000, atmosphere_bonus_per_level: 2 },
        screens: { max_level: 4, base_cost: 40000, atmosphere_bonus_per_level: 3 },
        security: { max_level: 5, base_cost: 35000, capacity_bonus_per_level: 2000 }
      }
    };
  }
  
  return STADIUM_CONFIG;
}

/**
 * Get stadium configuration (async)
 */
export async function getStadiumConfig() {
  return await loadStadiumConfig();
}

// Legacy support - will be deprecated
export const STADIUM_CONFIG_LEGACY = {
  BASE_CAPACITY: 5000,
  MAX_CAPACITY: 75000,
  BASE_FAN_LOYALTY: 50,
  REVENUE_RATES: {
    ticketSales: 25, // $25 per person
    concessionSales: 8, // $8 per person
    parkingRevenue: 10, // $10 per person (30% of attendees use parking)
    apparelSales: 3, // $3 per person
    vipSuiteRevenue: 5000 // $5000 flat per VIP suite level
  },

  // Division Modifiers for attendance calculation
  DIVISION_MODIFIERS: {
    1: 1.2, // Div 1: 1.2x
    2: 1.1, // Div 2: 1.1x
    3: 1.05, // Div 3: 1.05x
    4: 1.0, // Div 4: 1.0x
    5: 0.95, // Div 5: 0.95x
    6: 0.9, // Div 6: 0.9x
    7: 0.85, // Div 7: 0.85x
    8: 0.8  // Div 8: 0.8x
  },

  // Win Streak Modifiers for attendance calculation
  WIN_STREAK_MODIFIERS: {
    3: 1.1, // 3-game streak: 1.1x
    5: 1.25, // 5-game streak: 1.25x
    8: 1.5  // 8+ game streak: 1.5x
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
  division: number,
  winStreak: number,
  opponentQuality: number, // 1-100
  isImportantGame: boolean = false,
  weather: 'good' | 'fair' | 'poor' = 'good'
): { attendance: number; attendanceRate: number } {
  let baseRate = 0.35; // 35% base attendance
  
  // Fan loyalty impact
  baseRate += (fanLoyalty / 100) * 0.4; // Up to +40%
  
  // Division modifier
  const divisionModifier = STADIUM_CONFIG.DIVISION_MODIFIERS[division as keyof typeof STADIUM_CONFIG.DIVISION_MODIFIERS] || 1.0;
  baseRate *= divisionModifier;
  
  // Win streak modifier
  let winStreakModifier = 1.0;
  if (winStreak >= 8) {
    winStreakModifier = STADIUM_CONFIG.WIN_STREAK_MODIFIERS[8];
  } else if (winStreak >= 5) {
    winStreakModifier = STADIUM_CONFIG.WIN_STREAK_MODIFIERS[5];
  } else if (winStreak >= 3) {
    winStreakModifier = STADIUM_CONFIG.WIN_STREAK_MODIFIERS[3];
  }
  baseRate *= winStreakModifier;
  
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
  const calculatedAttendance = Math.floor((stadium.capacity || 15000) * attendanceRate);
  
  // CRITICAL: Ensure attendance never exceeds stadium capacity
  const attendance = Math.min(calculatedAttendance, stadium.capacity || 15000);
  
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
  
  // Base revenue calculations using legacy rates (will be updated to use async config)
  let ticketSales = attendance * STADIUM_CONFIG_LEGACY.REVENUE_RATES.ticketSales;
  let concessionSales = attendance * STADIUM_CONFIG_LEGACY.REVENUE_RATES.concessionSales;
  let parkingRevenue = (attendance * 0.3) * STADIUM_CONFIG_LEGACY.REVENUE_RATES.parkingRevenue; // 30% of attendees use parking
  let apparelSales = attendance * STADIUM_CONFIG_LEGACY.REVENUE_RATES.apparelSales;
  let vipSuiteRevenue = (stadium.vipSuitesLevel || 0) * STADIUM_CONFIG_LEGACY.REVENUE_RATES.vipSuiteRevenue; // Flat 5000 per VIP suite level
  
  // Apply facility bonuses
  concessionSales *= (1 + ((stadium.concessionsLevel || 0) * 0.15));
  parkingRevenue *= (1 + ((stadium.parkingLevel || 0) * 0.10));
  apparelSales *= (1 + ((stadium.merchandisingLevel || 0) * 0.12));
  // VIP suite revenue already calculated as flat amount, no multiplier needed
  
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
 * Get available facility upgrades for a stadium using configuration
 */
export async function getAvailableFacilityUpgrades(stadium: Stadium): Promise<FacilityInfo[]> {
  const config = await getStadiumConfig();
  const upgrades: FacilityInfo[] = [];
  
  const facilityMappings = [
    { key: 'concessionsLevel', configKey: 'concessions', name: 'Concessions', current: stadium.concessionsLevel },
    { key: 'parkingLevel', configKey: 'parking', name: 'Parking', current: stadium.parkingLevel },
    { key: 'merchandisingLevel', configKey: 'merchandising', name: 'Merchandising', current: stadium.merchandisingLevel },
    { key: 'vipSuitesLevel', configKey: 'vip_suites', name: 'VIP Suites', current: stadium.vipSuitesLevel },
    { key: 'lightingScreensLevel', configKey: 'screens', name: 'Video Screens', current: stadium.lightingScreensLevel },
    { key: 'lightingLevel', configKey: 'lighting', name: 'Lighting', current: stadium.lightingLevel },
    { key: 'securityLevel', configKey: 'security', name: 'Security', current: stadium.securityLevel }
  ];
  
  facilityMappings.forEach(facility => {
    const facilityConfig = config.facilities[facility.configKey];
    if (!facilityConfig) return;
    
    const currentLevel = facility.current || (facility.configKey === 'vip_suites' ? 0 : 1);
    
    if (currentLevel < facilityConfig.max_level) {
      const nextLevel = currentLevel + 1;
      const upgradeCostData = facilityConfig.upgrade_costs?.find((cost: any) => cost.level === nextLevel);
      const upgradeCost = upgradeCostData?.cost || Math.floor(facilityConfig.base_cost * Math.pow(facilityConfig.cost_multiplier, currentLevel));
      
      upgrades.push({
        facilityKey: facility.key,
        name: facilityConfig.name || facility.name,
        description: facilityConfig.description,
        currentLevel,
        maxLevel: facilityConfig.max_level,
        upgradeCost,
        canUpgrade: true,
        effect: upgradeCostData?.description || `Level ${nextLevel} upgrade`,
        roi: facilityConfig.roi_category || 'medium'
      });
    } else {
      upgrades.push({
        facilityKey: facility.key,
        name: facilityConfig.name || facility.name,
        description: facilityConfig.description,
        currentLevel,
        maxLevel: facilityConfig.max_level,
        upgradeCost: 0,
        canUpgrade: false,
        effect: 'Maximum level reached',
        roi: facilityConfig.roi_category || 'medium'
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