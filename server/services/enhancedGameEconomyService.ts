import { db } from '../db.js';
import { teams, teamFinances, stadiums } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

export class EnhancedGameEconomyService {

  // **CURRENCY SYSTEM**
  
  /**
   * Starting amounts for new teams
   */
  static readonly STARTING_CREDITS = 50000;
  static readonly STARTING_GEMS_MIN = 0;
  static readonly STARTING_GEMS_MAX = 100;

  /**
   * Gem to Credit exchange rates with bulk discounts
   */
  static readonly GEM_EXCHANGE_RATES = [
    { gems: 10, credits: 4500, ratio: 450 },
    { gems: 50, credits: 25000, ratio: 500 },
    { gems: 300, credits: 165000, ratio: 550 },
    { gems: 1000, credits: 600000, ratio: 600 }
  ];

  /**
   * Get best exchange rate for gem amount
   */
  static getBestExchangeRate(gemAmount: number): { gems: number; credits: number; ratio: number } | null {
    const validRates = this.GEM_EXCHANGE_RATES.filter(rate => gemAmount >= rate.gems);
    if (validRates.length === 0) return null;
    
    // Return highest ratio (best value)
    return validRates[validRates.length - 1];
  }

  /**
   * Exchange gems for credits
   */
  static async exchangeGemsForCredits(
    teamId: string, 
    gemAmount: number
  ): Promise<{ success: boolean; creditsReceived?: number; error?: string }> {
    try {
      const rate = this.getBestExchangeRate(gemAmount);
      if (!rate) {
        return { success: false, error: 'Minimum 10 gems required for exchange' };
      }

      const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
      if (!team || (team.gems ?? 0) < gemAmount) {
        return { success: false, error: 'Insufficient gems' };
      }

      const creditsReceived = Math.floor((gemAmount / rate.gems) * rate.credits);

      // Update team finances
      await db.update(teams)
        .set({ gems: (team.gems ?? 0) - gemAmount })
        .where(eq(teams.id, teamId));

      const [teamFinance] = await db.select().from(teamFinances).where(eq(teamFinances.teamId, teamId));
      if (teamFinance) {
        await db.update(teamFinances)
          .set({ credits: (teamFinance.credits || 0) + creditsReceived })
          .where(eq(teamFinances.teamId, teamId));
      }

      return { success: true, creditsReceived };
    } catch (error) {
      console.error('Error exchanging gems:', error);
      return { success: false, error: 'Database error' };
    }
  }

  // **STADIUM REVENUE SYSTEM**

  /**
   * Calculate daily stadium revenue for a team
   */
  static async calculateStadiumRevenue(teamId: string, isHomeGameDay: boolean = false): Promise<{
    totalRevenue: number;
    breakdown: {
      ticketSales: number;
      concessions: number;
      parking: number;
      vipSuites: number;
      apparelSales: number;
      atmosphereBonus: number;
    };
  }> {
    const [stadium] = await db.select().from(stadiums).where(eq(stadiums.teamId, teamId));
    
    if (!stadium) {
      return {
        totalRevenue: 0,
        breakdown: {
          ticketSales: 0,
          concessions: 0,
          parking: 0,
          vipSuites: 0,
          apparelSales: 0,
          atmosphereBonus: 0
        }
      };
    }

    const capacity = stadium.capacity || 10000;
    const concessionsLevel = stadium.concessionsLevel || 1;
    const parkingLevel = stadium.parkingLevel || 1;
    const vipSuitesLevel = stadium.vipSuitesLevel || 0;
    const merchandisingLevel = stadium.merchandisingLevel || 1;

    // Revenue only applies on home game days
    const multiplier = isHomeGameDay ? 1 : 0;

    // Calculate actual attendance (would need fan loyalty and attendance calculation)
    // For now using capacity * attendance rate assumption, but should use actual attendance
    const attendanceRate = 0.75; // Default 75% attendance rate
    const actualAttendance = Math.floor(capacity * attendanceRate);
    
    const breakdown = {
      // Ticket Sales: ActualAttendance × 25₡
      ticketSales: Math.floor(actualAttendance * 25 * multiplier),
      
      // Concessions: ActualAttendance × 8₡ × ConcessionsLevel
      concessions: Math.floor(actualAttendance * 8 * concessionsLevel * multiplier),
      
      // Parking: (ActualAttendance × 0.3) × 10₡ × ParkingLevel
      parking: Math.floor(actualAttendance * 0.3 * 10 * parkingLevel * multiplier),
      
      // VIP Suites: VIPSuitesLevel × 5000₡
      vipSuites: Math.floor(vipSuitesLevel * 5000 * multiplier),
      
      // Apparel Sales: ActualAttendance × 3₡ × MerchandisingLevel
      apparelSales: Math.floor(actualAttendance * 3 * merchandisingLevel * multiplier),
      
      // Atmosphere Bonus: Small credit bonus per attendee if FanLoyalty very high
      atmosphereBonus: 0 // TODO: Implement based on fan loyalty
    };

    const totalRevenue = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    return { totalRevenue, breakdown };
  }

  /**
   * Apply daily stadium revenue to team finances
   */
  static async applyDailyStadiumRevenue(teamId: string, isHomeGameDay: boolean = false): Promise<number> {
    const revenue = await this.calculateStadiumRevenue(teamId, isHomeGameDay);
    
    if (revenue.totalRevenue > 0) {
      const [teamFinance] = await db.select().from(teamFinances).where(eq(teamFinances.teamId, teamId));
      if (teamFinance) {
        await db.update(teamFinances)
          .set({ credits: (teamFinance.credits || 0) + revenue.totalRevenue })
          .where(eq(teamFinances.teamId, teamId));
      }
    }

    return revenue.totalRevenue;
  }

  // **STADIUM UPGRADE SYSTEM**

  /**
   * Calculate cost for stadium upgrade
   */
  static calculateUpgradeCost(upgradeType: string, currentLevel: number, currentCapacity?: number): number {
    switch (upgradeType) {
      case 'capacity':
        // Current Capacity * 10 ₡ (increases capacity by 5,000)
        return (currentCapacity || 10000) * 10;
      
      case 'concessions':
        // 30,000 ₡ per level
        return 30000;
      
      case 'parking':
        // 25,000 ₡ per level
        return 25000;
      
      case 'vip_suites':
        // Variable increasing cost: 50,000 + (level * 25,000)
        return 50000 + (currentLevel * 25000);
      
      case 'merchandising':
        // Variable increasing cost: 20,000 + (level * 10,000)
        return 20000 + (currentLevel * 10000);
      
      case 'lighting':
        // Variable increasing cost: 40,000 + (level * 20,000)
        return 40000 + (currentLevel * 20000);
      
      default:
        return 0;
    }
  }

  /**
   * Perform stadium upgrade
   */
  static async upgradeStadium(
    teamId: string, 
    upgradeType: string
  ): Promise<{ success: boolean; cost?: number; error?: string; newLevel?: number }> {
    try {
      const [stadium] = await db.select().from(stadiums).where(eq(stadiums.teamId, teamId));
      const [teamFinance] = await db.select().from(teamFinances).where(eq(teamFinances.teamId, teamId));

      if (!stadium || !teamFinance) {
        return { success: false, error: 'Stadium or team finances not found' };
      }

      let cost: number;
      let newLevel: number;
      const updateData: any = {};

      switch (upgradeType) {
        case 'capacity':
          cost = this.calculateUpgradeCost('capacity', 0, stadium.capacity ?? 10000);
          updateData.capacity = (stadium.capacity || 10000) + 5000;
          newLevel = updateData.capacity;
          break;
        
        case 'concessions':
          cost = this.calculateUpgradeCost('concessions', stadium.concessionsLevel || 1);
          newLevel = (stadium.concessionsLevel || 1) + 1;
          updateData.concessionsLevel = newLevel;
          break;
        
        case 'parking':
          cost = this.calculateUpgradeCost('parking', stadium.parkingLevel || 1);
          newLevel = (stadium.parkingLevel || 1) + 1;
          updateData.parkingLevel = newLevel;
          break;
        
        case 'vip_suites':
          cost = this.calculateUpgradeCost('vip_suites', stadium.vipSuitesLevel || 0);
          newLevel = (stadium.vipSuitesLevel || 0) + 1;
          updateData.vipSuitesLevel = newLevel;
          break;
        
        case 'merchandising':
          cost = this.calculateUpgradeCost('merchandising', stadium.merchandisingLevel || 1);
          newLevel = (stadium.merchandisingLevel || 1) + 1;
          updateData.merchandisingLevel = newLevel;
          break;
        
        case 'lighting':
          cost = this.calculateUpgradeCost('lighting', stadium.lightingLevel || 0);
          newLevel = (stadium.lightingLevel || 0) + 1;
          updateData.lightingLevel = newLevel;
          break;
        
        default:
          return { success: false, error: 'Invalid upgrade type' };
      }

      if ((teamFinance.credits || 0) < cost) {
        return { success: false, error: 'Insufficient credits for upgrade' };
      }

      // Deduct cost and apply upgrade
      await db.update(teamFinances)
        .set({ credits: (teamFinance.credits || 0) - cost })
        .where(eq(teamFinances.teamId, teamId));

      await db.update(stadiums)
        .set(updateData)
        .where(eq(stadiums.teamId, teamId));

      return { success: true, cost, newLevel };
    } catch (error) {
      console.error('Error upgrading stadium:', error);
      return { success: false, error: 'Database error' };
    }
  }

  // **STORE PRICING SYSTEM**

  /**
   * Store items with dual currency pricing
   */
  static readonly STORE_ITEMS = {
    helmets: [
      { id: 'standard_helmet', name: 'Standard Leather Helmet', credits: 1000, gems: null, tier: 'basic' },
      { id: 'gryllstone_helm', name: 'Gryllstone Plated Helm', credits: 5000, gems: 10, tier: 'uncommon' },
      { id: 'sylvan_circlet', name: 'Sylvan Barkwood Circlet', credits: 5000, gems: 10, tier: 'uncommon' },
      { id: 'umbral_cowl', name: 'Umbral Cowl', credits: 40000, gems: 25, tier: 'rare' },
      { id: 'helm_command', name: 'Helm of Command', credits: null, gems: 50, tier: 'cosmetic' }
    ],
    footwear: [
      { id: 'worn_cleats', name: 'Worn Cleats', credits: 1000, gems: null, tier: 'basic' },
      { id: 'gryll_boots', name: 'Boots of the Gryll', credits: 2500, gems: 5, tier: 'uncommon' },
      { id: 'lumina_treads', name: 'Lumina\'s Light-Treads', credits: 40000, gems: 25, tier: 'rare' }
    ],
    consumables: [
      { id: 'energy_drink', name: 'Basic Energy Drink', credits: 500, gems: null, tier: 'basic' },
      { id: 'recovery_serum', name: 'Advanced Recovery Serum', credits: 2000, gems: 5, tier: 'uncommon' },
      { id: 'phoenix_elixir', name: 'Phoenix Elixir', credits: 30000, gems: 20, tier: 'legendary' },
      { id: 'medical_kit', name: 'Basic Medical Kit', credits: 1000, gems: null, tier: 'basic' },
      { id: 'advanced_treatment', name: 'Advanced Treatment', credits: 3000, gems: 10, tier: 'uncommon' },
      { id: 'miracle_cure', name: 'Miracle Cure', credits: 45000, gems: 30, tier: 'legendary' }
    ],
    performance: [
      { id: 'speed_tonic', name: 'Speed Boost Tonic', credits: 1500, gems: 3, tier: 'uncommon' },
      { id: 'power_potion', name: 'Power Surge Potion', credits: 1500, gems: 3, tier: 'uncommon' },
      { id: 'champions_blessing', name: 'Champion\'s Blessing', credits: 25000, gems: 15, tier: 'legendary' }
    ],
    entries: [
      { id: 'exhibition_match', name: 'Exhibition Match', credits: 5000, gems: 5, tier: 'entry', limit: '3 per day' },
      { id: 'tournament_daily_low', name: 'Daily Tournament (Div 5-8)', credits: 500, gems: 10, tier: 'entry' },
      { id: 'tournament_daily_high', name: 'Daily Tournament (Div 1-4)', credits: 1000, gems: 10, tier: 'entry' },
      { id: 'tournament_weekly_low', name: 'Weekly Tournament (Div 5-8)', credits: 1200, gems: 8, tier: 'entry' },
      { id: 'tournament_weekly_high', name: 'Weekly Tournament (Div 1-4)', credits: 2500, gems: 8, tier: 'entry' }
    ]
  };

  /**
   * Get store items by category
   */
  static getStoreItems(category?: string) {
    if (category) {
      return (this.STORE_ITEMS as any)[category] || [];
    }
    return this.STORE_ITEMS;
  }

  // **LEAGUE REWARDS SYSTEM**

  /**
   * Division-based reward structure
   */
  static readonly DIVISION_REWARDS = {
    1: {
      champion: { credits: 1000000, gems: 500 },
      runnerUp: { credits: 400000, gems: 150 },
      regularWinner: { credits: 100000, gems: 50 },
      promotion: { credits: 0, gems: 0 }
    },
    2: {
      champion: { credits: 400000, gems: 150 },
      runnerUp: { credits: 150000, gems: 50 },
      regularWinner: { credits: 40000, gems: 20 },
      promotion: { credits: 50000, gems: 0 }
    },
    3: {
      champion: { credits: 200000, gems: 75 },
      runnerUp: { credits: 75000, gems: 25 },
      regularWinner: { credits: 20000, gems: 10 },
      promotion: { credits: 25000, gems: 0 }
    },
    4: {
      champion: { credits: 100000, gems: 40 },
      runnerUp: { credits: 40000, gems: 15 },
      regularWinner: { credits: 10000, gems: 5 },
      promotion: { credits: 15000, gems: 0 }
    },
    5: {
      champion: { credits: 60000, gems: 25 },
      runnerUp: { credits: 25000, gems: 10 },
      regularWinner: { credits: 6000, gems: 0 },
      promotion: { credits: 10000, gems: 0 }
    },
    6: {
      champion: { credits: 40000, gems: 15 },
      runnerUp: { credits: 15000, gems: 5 },
      regularWinner: { credits: 4000, gems: 0 },
      promotion: { credits: 5000, gems: 0 }
    },
    7: {
      champion: { credits: 25000, gems: 10 },
      runnerUp: { credits: 10000, gems: 0 },
      regularWinner: { credits: 2500, gems: 0 },
      promotion: { credits: 2500, gems: 0 }
    },
    8: {
      champion: { credits: 15000, gems: 5 },
      runnerUp: { credits: 5000, gems: 0 },
      regularWinner: { credits: 1500, gems: 0 },
      promotion: { credits: 1500, gems: 0 }
    }
  };

  /**
   * Award division-based rewards
   */
  static async awardDivisionRewards(
    teamId: string, 
    division: number, 
    rewardType: 'champion' | 'runnerUp' | 'regularWinner' | 'promotion'
  ): Promise<{ success: boolean; rewards?: { credits: number; gems: number }; error?: string }> {
    try {
      const divisionRewards = (this.DIVISION_REWARDS as any)[division];
      if (!divisionRewards) {
        return { success: false, error: 'Invalid division' };
      }

      const rewards = divisionRewards[rewardType];
      if (!rewards) {
        return { success: false, error: 'Invalid reward type' };
      }

      // Update team finances
      const [teamFinance] = await db.select().from(teamFinances).where(eq(teamFinances.teamId, teamId));
      const [team] = await db.select().from(teams).where(eq(teams.id, teamId));

      if (!teamFinance || !team) {
        return { success: false, error: 'Team not found' };
      }

      if (rewards.credits > 0) {
        await db.update(teamFinances)
          .set({ credits: (teamFinance.credits || 0) + rewards.credits })
          .where(eq(teamFinances.teamId, teamId));
      }

      if (rewards.gems > 0) {
        await db.update(teams)
          .set({ gems: (team.gems || 0) + rewards.gems })
          .where(eq(teams.id, teamId));
      }

      return { success: true, rewards };
    } catch (error) {
      console.error('Error awarding division rewards:', error);
      return { success: false, error: 'Database error' };
    }
  }

  /**
   * Calculate daily facility maintenance costs
   */
  static async calculateMaintenanceCosts(teamId: string): Promise<number> {
    const [stadium] = await db.select().from(stadiums).where(eq(stadiums.teamId, teamId));
    
    if (!stadium) return 0;

    // Calculate total facility value
    const baseValue = (stadium.capacity || 10000) * 2; // Base stadium value
    const upgradeValue = 
      ((stadium.concessionsLevel || 1) * 30000) +
      ((stadium.parkingLevel || 1) * 25000) +
      ((stadium.vipSuitesLevel || 0) * 75000) +
      ((stadium.merchandisingLevel || 1) * 30000) +
      ((stadium.lightingLevel || 0) * 60000);

    const totalValue = baseValue + upgradeValue;
    
    // 0.5% daily maintenance cost
    return Math.floor(totalValue * 0.005);
  }

  /**
   * Apply daily maintenance costs
   */
  static async applyMaintenanceCosts(teamId: string): Promise<number> {
    const maintenanceCost = await this.calculateMaintenanceCosts(teamId);
    
    if (maintenanceCost > 0) {
      const [teamFinance] = await db.select().from(teamFinances).where(eq(teamFinances.teamId, teamId));
      if (teamFinance) {
        await db.update(teamFinances)
          .set({ credits: Math.max(0, (teamFinance.credits || 0) - maintenanceCost) })
          .where(eq(teamFinances.teamId, teamId));
      }
    }

    return maintenanceCost;
  }

  /**
   * Get comprehensive team economy status
   */
  static async getTeamEconomyStatus(teamId: string): Promise<{
    finances: { credits: number; gems: number };
    stadiumRevenue: any;
    maintenanceCosts: number;
    stadiumValue: number;
    nextUpgradeCosts: any;
  }> {
    const [teamFinance] = await db.select().from(teamFinances).where(eq(teamFinances.teamId, teamId));
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
    const [stadium] = await db.select().from(stadiums).where(eq(stadiums.teamId, teamId));

    const stadiumRevenue = await this.calculateStadiumRevenue(teamId, true);
    const maintenanceCosts = await this.calculateMaintenanceCosts(teamId);

    const nextUpgradeCosts = stadium ? {
      capacity: this.calculateUpgradeCost('capacity', 0, stadium.capacity ?? 10000),
      concessions: this.calculateUpgradeCost('concessions', stadium.concessionsLevel || 1),
      parking: this.calculateUpgradeCost('parking', stadium.parkingLevel || 1),
      vipSuites: this.calculateUpgradeCost('vip_suites', stadium.vipSuitesLevel || 0),
      merchandising: this.calculateUpgradeCost('merchandising', stadium.merchandisingLevel || 1),
      lighting: this.calculateUpgradeCost('lighting', stadium.lightingLevel || 0)
    } : {};

    const stadiumValue = stadium ? (
      (stadium.capacity || 10000) * 2 +
      ((stadium.concessionsLevel || 1) * 30000) +
      ((stadium.parkingLevel || 1) * 25000) +
      ((stadium.vipSuitesLevel || 0) * 75000) +
      ((stadium.merchandisingLevel || 1) * 30000) +
      ((stadium.lightingLevel || 0) * 60000)
    ) : 0;

    return {
      finances: {
        credits: teamFinance?.credits || 0,
        gems: team?.gems || 0
      },
      stadiumRevenue,
      maintenanceCosts,
      stadiumValue,
      nextUpgradeCosts
    };
  }
}