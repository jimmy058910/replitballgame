import { prisma } from '../db.js';

export class EnhancedGameEconomyService {

  // **CURRENCY SYSTEM**
  
  /**
   * Starting amounts for new teams - Master Economy Specification
   */
  static readonly STARTING_CREDITS = 50000;
  static readonly STARTING_GEMS = 0;

  /**
   * Gem to Credit exchange rates with bulk discounts - Master Economy v5
   */
  static readonly GEM_EXCHANGE_RATES = [
    { gems: 10, credits: 4000, ratio: 400 },
    { gems: 50, credits: 22500, ratio: 450 },
    { gems: 300, credits: 150000, ratio: 500 },
    { gems: 1000, credits: 550000, ratio: 550 }
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
    teamId: number, 
    gemAmount: number
  ): Promise<{ success: boolean; creditsReceived?: number; error?: string }> {
    try {
      const rate = this.getBestExchangeRate(gemAmount);
      if (!rate) {
        return { success: false, error: 'Minimum 10 gems required for exchange' };
      }

      const team = await prisma.team.findFirst({
        where: { id: teamId }
      });
      if (!team) {
        return { success: false, error: 'Team not found' };
      }

      const creditsReceived = Math.floor((gemAmount / rate.gems) * rate.credits);

      // Update team finances
      // Note: gems property removed from Team schema
      // await prisma.team.update({
      //   where: { id: teamId },
      //   data: { gems: (team.gems ?? 0) - gemAmount }
      // });

      const teamFinance = await prisma.teamFinances.findFirst({
        where: { teamId: parseInt(teamId.toString(), 10) }
      });
      if (teamFinance) {
        await prisma.teamFinances.update({
          where: { teamId: parseInt(teamId.toString(), 10) },
          data: { credits: (teamFinance.credits || 0) + creditsReceived }
        });
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
    const stadium = await prisma.stadium.findFirst({
      where: { teamId: teamId }
    });
    
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

    // Master Economy attendance calculation with division scaling
    const team = await prisma.team.findFirst({
      where: { id: teamId }
    });
    const division = team?.division || 4;
    const fanLoyalty = team?.fanLoyalty || 50;
    const winStreak = 0; // Default no win streak
    
    const actualAttendance = this.calculateGameAttendance(capacity, division, fanLoyalty, winStreak);
    
    // Division scaling: Higher divisions have higher per-fan revenue
    // Division 1-2: ×1.5, Division 3-5: ×1.2, Division 6-7: ×1.1, Division 8: ×1.0
    let divisionMultiplier = 1.0;
    if (division <= 2) divisionMultiplier = 1.5;
    else if (division <= 5) divisionMultiplier = 1.2;
    else if (division <= 7) divisionMultiplier = 1.1;
    
    const breakdown = {
      // Ticket Sales: ActualAttendance × 25₡ × Division Multiplier
      ticketSales: Math.floor(actualAttendance * 25 * divisionMultiplier * multiplier),
      
      // Concessions: ActualAttendance × 8₡ × ConcessionsLevel × Division Multiplier
      concessions: Math.floor(actualAttendance * 8 * concessionsLevel * divisionMultiplier * multiplier),
      
      // Parking: (ActualAttendance × 0.3) × 10₡ × ParkingLevel × Division Multiplier
      parking: Math.floor(actualAttendance * 0.3 * 10 * parkingLevel * divisionMultiplier * multiplier),
      
      // VIP Suites: VIPSuitesLevel × 5000₡ (flat rate, no division scaling)
      vipSuites: Math.floor(vipSuitesLevel * 5000 * multiplier),
      
      // Apparel Sales: ActualAttendance × 3₡ × MerchandisingLevel × Division Multiplier
      apparelSales: Math.floor(actualAttendance * 3 * merchandisingLevel * divisionMultiplier * multiplier),
      
      // Atmosphere Bonus: Small credit bonus per attendee if FanLoyalty very high
      atmosphereBonus: fanLoyalty > 80 ? Math.floor(actualAttendance * 2 * multiplier) : 0
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
      const teamFinance = await prisma.teamFinances.findFirst({
        where: { teamId: teamId }
      });
      if (teamFinance) {
        await prisma.teamFinances.update({
          where: { teamId: teamId },
          data: { credits: (teamFinance.credits || 0) + revenue.totalRevenue }
        });
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
        // ₡15k for +5k seats (strategic mid-season choice)
        return 15000;
      
      case 'concessions':
        // ~75% increase for 4-6 game ROI: 30k → 52.5k
        return 52500 * Math.pow(1.5, currentLevel);
      
      case 'parking':
        // ~75% increase for 4-6 game ROI: 25k → 43.75k
        return 43750 * Math.pow(1.5, currentLevel);
      
      case 'vip_suites':
        // Keep as prestige capstone: 100k base
        return 100000 * Math.pow(1.5, currentLevel);
      
      case 'merchandising':
        // ~75% increase for 4-6 game ROI: 20k → 35k base
        return 35000 * Math.pow(1.5, currentLevel);
      
      case 'lighting':
        // Keep same for loyalty growth: 40k base
        return 40000 * Math.pow(1.5, currentLevel);
      
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
      const stadium = await prisma.stadium.findFirst({
        where: { teamId: teamId }
      });
      const teamFinance = await prisma.teamFinances.findFirst({
        where: { teamId: teamId }
      });

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
      await prisma.teamFinances.update({
        where: { teamId: teamId },
        data: { credits: (teamFinance.credits || 0) - cost }
      });

      await prisma.stadium.update({
        where: { teamId: teamId },
        data: updateData
      });

      return { success: true, cost, newLevel };
    } catch (error) {
      console.error('Error upgrading stadium:', error);
      return { success: false, error: 'Database error' };
    }
  }

  // **STADIUM & FINANCIAL MECHANICS - MASTER ECONOMY SPECIFICATION**

  /**
   * Division modifiers for fan attendance
   */
  static readonly DIVISION_MODIFIERS = {
    1: 1.2,
    2: 1.1,
    3: 1.05,
    4: 1.0,
    5: 0.95,
    6: 0.9,
    7: 0.85,
    8: 0.8
  };

  /**
   * Calculate game attendance based on Master Economy algorithm
   */
  static calculateGameAttendance(
    baseCapacity: number,
    division: number,
    fanLoyalty: number, // 0-100%
    winStreak: number
  ): number {
    const divisionModifier = this.DIVISION_MODIFIERS[division] || 1.0;
    const fanLoyaltyModifier = Math.min(1.25, Math.max(0.75, 0.75 + (fanLoyalty * 0.005))); // 0.75x to 1.25x
    
    let winStreakModifier = 1.0;
    if (winStreak >= 8) {
      winStreakModifier = 1.5;
    } else if (winStreak >= 5) {
      winStreakModifier = 1.25;
    } else if (winStreak >= 3) {
      winStreakModifier = 1.1;
    }
    
    const attendance = baseCapacity * divisionModifier * fanLoyaltyModifier * winStreakModifier;
    return Math.floor(Math.min(attendance, baseCapacity)); // Cannot exceed capacity
  }

  /**
   * Calculate home game income streams per Master Economy specification
   */
  static calculateHomeGameIncome(
    gameAttendance: number,
    concessionsLevel: number,
    parkingLevel: number,
    vipSuitesLevel: number,
    merchandisingLevel: number
  ): {
    ticketSales: number;
    concessions: number;
    parking: number;
    vipSuites: number;
    apparelSales: number;
    total: number;
  } {
    const ticketSales = gameAttendance * 25;
    const concessions = gameAttendance * 8 * concessionsLevel;
    const parking = Math.floor(gameAttendance * 0.3) * 10 * parkingLevel;
    const vipSuites = vipSuitesLevel * 5000;
    const apparelSales = gameAttendance * 3 * merchandisingLevel;
    
    return {
      ticketSales,
      concessions,
      parking,
      vipSuites,
      apparelSales,
      total: ticketSales + concessions + parking + vipSuites + apparelSales
    };
  }

  /**
   * Calculate daily facilities maintenance cost per Master Economy specification
   */
  static calculateDailyMaintenanceCost(totalStadiumInvestment: number): number {
    return Math.floor(totalStadiumInvestment * 0.002); // 0.2% daily
  }

  // **STAFF & PLAYER SALARY FORMULAS**

  /**
   * Calculate player salary based on skill and contract length
   */
  static calculatePlayerSalary(overallSkill: number, contractLength: number): number {
    // Master Economy specification: Overall Skill × 150₡ as base
    const baseSalary = overallSkill * 150;
    
    let contractModifier = 1.0;
    switch (contractLength) {
      case 1:
        contractModifier = 1.2; // 1 season: high risk, high cost
        break;
      case 2:
        contractModifier = 1.0; // 2 seasons: standard
        break;
      case 3:
        contractModifier = 0.85; // 3 seasons: long-term discount
        break;
      default:
        contractModifier = 1.0;
    }
    
    return Math.floor(baseSalary * contractModifier);
  }

  /**
   * Calculate staff salaries based on skill (1-100)
   */
  static calculateStaffSalaries(staffSkill: number, staffType: 'head_coach' | 'scout'): number {
    switch (staffType) {
      case 'head_coach':
        return 15000 + (staffSkill * 250);
      case 'scout':
        return 10000 + (staffSkill * 150);
      default:
        return 10000 + (staffSkill * 150);
    }
  }

  // **TOURNAMENT REWARDS SYSTEM**

  /**
   * Daily Divisional Tournament Rewards
   */
  static readonly DAILY_TOURNAMENT_REWARDS = {
    divisions_5_8: {
      first: { credits: 5000, items: ['advanced_recovery_serum'] },
      second: { credits: 2000 }
    },
    divisions_1_4: {
      first: { credits: 10000, items: ['advanced_treatment'] },
      second: { credits: 4000 }
    }
  };

  /**
   * Mid-Season Cup Rewards by Division
   */
  static readonly MID_SEASON_CUP_REWARDS = {
    div_1: {
      champion: { credits: 750000, gems: 300, equipment: 'random_epic' },
      runner_up: { credits: 300000, gems: 100, equipment: 'random_rare' },
      semi_finalists: { credits: 100000, gems: 25 }
    },
    div_2: {
      champion: { credits: 300000, gems: 100, equipment: 'random_rare' },
      runner_up: { credits: 125000, gems: 40 },
      semi_finalists: { credits: 50000, gems: 15 }
    },
    div_3: {
      champion: { credits: 150000, gems: 60, equipment: 'random_uncommon' },
      runner_up: { credits: 60000, gems: 20 },
      semi_finalists: { credits: 25000, gems: 10 }
    },
    div_4: {
      champion: { credits: 75000, gems: 30 },
      runner_up: { credits: 30000, gems: 10 },
      semi_finalists: { credits: 12500 }
    },
    div_5: {
      champion: { credits: 50000, gems: 20 },
      runner_up: { credits: 20000, gems: 8 },
      semi_finalists: { credits: 8000 }
    },
    div_6: {
      champion: { credits: 30000, gems: 12 },
      runner_up: { credits: 12000, gems: 5 },
      semi_finalists: { credits: 5000 }
    },
    div_7: {
      champion: { credits: 20000, gems: 8 },
      runner_up: { credits: 8000 },
      semi_finalists: { credits: 3000 }
    },
    div_8: {
      champion: { credits: 10000, gems: 5 },
      runner_up: { credits: 4000 },
      semi_finalists: { credits: 1500 }
    }
  };

  /**
   * League & Playoff Rewards by Division
   */
  static readonly LEAGUE_PLAYOFF_REWARDS = {
    div_1: {
      playoff_champion: { credits: 1000000, gems: 500 },
      playoff_runner_up: { credits: 400000, gems: 150 },
      regular_season_winner: { credits: 100000, gems: 50 },
      promotion_bonus: 0 // No promotion from Division 1
    },
    div_2: {
      playoff_champion: { credits: 400000, gems: 150 },
      playoff_runner_up: { credits: 150000, gems: 50 },
      regular_season_winner: { credits: 40000, gems: 20 },
      promotion_bonus: 50000
    },
    div_3: {
      playoff_champion: { credits: 200000, gems: 75 },
      playoff_runner_up: { credits: 75000, gems: 25 },
      regular_season_winner: { credits: 20000, gems: 10 },
      promotion_bonus: 25000
    },
    div_4: {
      playoff_champion: { credits: 100000, gems: 40 },
      playoff_runner_up: { credits: 40000, gems: 15 },
      regular_season_winner: { credits: 10000, gems: 5 },
      promotion_bonus: 15000
    },
    div_5: {
      playoff_champion: { credits: 60000, gems: 25 },
      playoff_runner_up: { credits: 25000, gems: 10 },
      regular_season_winner: { credits: 6000 },
      promotion_bonus: 10000
    },
    div_6: {
      playoff_champion: { credits: 40000, gems: 15 },
      playoff_runner_up: { credits: 15000, gems: 5 },
      regular_season_winner: { credits: 4000 },
      promotion_bonus: 5000
    },
    div_7: {
      playoff_champion: { credits: 25000, gems: 10 },
      playoff_runner_up: { credits: 10000 },
      regular_season_winner: { credits: 2500 },
      promotion_bonus: 2500
    },
    div_8: {
      playoff_champion: { credits: 15000, gems: 5 },
      playoff_runner_up: { credits: 5000 },
      regular_season_winner: { credits: 1500 },
      promotion_bonus: 1500
    }
  };

  /**
   * Player & Individual Awards by Division
   */
  static readonly INDIVIDUAL_AWARDS = {
    sub_divisional_mvp: {
      div_1: { credits: 175000, gems: 75 },
      div_2: { credits: 125000, gems: 50 },
      div_3: { credits: 80000, gems: 30 },
      div_4: { credits: 60000, gems: 20 },
      div_5: { credits: 40000, gems: 15 },
      div_6: { credits: 25000, gems: 12 },
      div_7: { credits: 15000, gems: 8 },
      div_8: { credits: 10000, gems: 5 }
    },
    positional_awards: {
      div_1: { credits: 75000 },
      div_2: { credits: 50000 },
      div_3: { credits: 30000 },
      div_4: { credits: 20000 },
      div_5: { credits: 12500 },
      div_6: { credits: 7500 },
      div_7: { credits: 4000 },
      div_8: { credits: 2500 }
    }
  };

  /**
   * Trophy Case Crafting Costs
   */
  static readonly TROPHY_CRAFTING_COSTS = {
    positional_award_plaque: 10000,
    sub_divisional_mvp_trophy: {
      div_1: 100000,
      div_2: 80000,
      div_3: 60000,
      div_4: 40000,
      div_5: 30000,
      div_6: 25000,
      div_7: 20000,
      div_8: 15000
    },
    championship_trophy: {
      div_1: 250000,
      div_2: 200000,
      div_3: 150000,
      div_4: 100000,
      div_5: 75000,
      div_6: 50000,
      div_7: 30000,
      div_8: 15000
    }
  };

  // **PREMIUM BOX LOOT SYSTEM**

  /**
   * Premium Box loot tables for 50-ad milestone reward
   */
  static readonly PREMIUM_BOX_LOOT = {
    currency: [
      { reward: { credits: 10000 }, chance: 0.80, description: '10,000 Credits' },
      { reward: { credits: 25000 }, chance: 0.15, description: '25,000 Credits' },
      { reward: { gems: 10 }, chance: 0.05, description: '10 Gems' }
    ],
    consumables: [
      { reward: { itemId: 'advanced_recovery_serum', quantity: 2 }, chance: 0.60, description: '2x Advanced Recovery Serum' },
      { reward: { itemId: 'advanced_treatment', quantity: 2 }, chance: 0.30, description: '2x Advanced Treatment' },
      { reward: { itemId: 'phoenix_elixir', quantity: 1 }, chance: 0.10, description: '1x Phoenix Elixir' }
    ],
    equipment: [
      { rarity: 'uncommon', chance: 0.75, description: 'Random Uncommon Equipment' },
      { rarity: 'rare', chance: 0.20, description: 'Random Rare Equipment' },
      { rarity: 'epic', chance: 0.05, description: 'Random Epic Equipment' }
    ]
  };

  /**
   * Get random reward from loot table based on weighted probabilities
   */
  static getRandomReward(lootTable: any[]): any {
    const random = Math.random();
    let cumulativeChance = 0;
    
    for (const item of lootTable) {
      cumulativeChance += item.chance;
      if (random <= cumulativeChance) {
        return item;
      }
    }
    
    // Fallback to first item if something goes wrong
    return lootTable[0];
  }

  /**
   * Get random equipment item of specified rarity
   */
  static getRandomEquipmentByRarity(rarity: string): any {
    const allEquipment = [
      ...this.STORE_ITEMS.helmets,
      ...this.STORE_ITEMS.chestArmor,
      ...this.STORE_ITEMS.gloves,
      ...this.STORE_ITEMS.footwear
    ];
    
    const equipmentByRarity = allEquipment.filter(item => 
      item.tier === rarity && !item.special?.includes('cosmetic')
    );
    
    if (equipmentByRarity.length === 0) {
      // Fallback to any equipment if no items found
      return allEquipment[Math.floor(Math.random() * allEquipment.length)];
    }
    
    return equipmentByRarity[Math.floor(Math.random() * equipmentByRarity.length)];
  }

  /**
   * Open Premium Box and generate rewards
   */
  static async openPremiumBox(teamId: string): Promise<{
    success: boolean;
    rewards?: {
      currency: any;
      consumable: any;
      equipment: any;
    };
    error?: string;
  }> {
    try {
      // Generate rewards from each category
      const currencyReward = this.getRandomReward(this.PREMIUM_BOX_LOOT.currency);
      const consumableReward = this.getRandomReward(this.PREMIUM_BOX_LOOT.consumables);
      const equipmentRarity = this.getRandomReward(this.PREMIUM_BOX_LOOT.equipment);
      const equipmentReward = this.getRandomEquipmentByRarity(equipmentRarity.rarity);

      // Apply currency reward
      const teamFinance = await prisma.teamFinances.findFirst({
        where: { teamId: teamId }
      });
      
      if (!teamFinance) {
        return { success: false, error: 'Team finances not found' };
      }

      const currencyUpdate: any = {};
      if (currencyReward.reward.credits) {
        currencyUpdate.credits = (teamFinance.credits || 0) + currencyReward.reward.credits;
      }
      if (currencyReward.reward.gems) {
        currencyUpdate.gems = (teamFinance.gems || 0) + currencyReward.reward.gems;
      }

      await prisma.teamFinances.update({
        where: { teamId: teamId },
        data: currencyUpdate
      });

      // Add consumable to inventory
      await prisma.inventory.upsert({
        where: {
          teamId_itemId: {
            teamId: teamId,
            itemId: consumableReward.reward.itemId
          }
        },
        create: {
          teamId: teamId,
          itemId: consumableReward.reward.itemId,
          quantity: consumableReward.reward.quantity,
          acquiredAt: new Date()
        },
        update: {
          quantity: {
            increment: consumableReward.reward.quantity
          }
        }
      });

      // Add equipment to inventory
      await prisma.inventory.upsert({
        where: {
          teamId_itemId: {
            teamId: teamId,
            itemId: equipmentReward.id
          }
        },
        create: {
          teamId: teamId,
          itemId: equipmentReward.id,
          quantity: 1,
          acquiredAt: new Date()
        },
        update: {
          quantity: {
            increment: 1
          }
        }
      });

      return {
        success: true,
        rewards: {
          currency: {
            ...currencyReward.reward,
            description: currencyReward.description
          },
          consumable: {
            ...consumableReward.reward,
            description: consumableReward.description,
            name: this.getItemName(consumableReward.reward.itemId)
          },
          equipment: {
            id: equipmentReward.id,
            name: equipmentReward.name,
            rarity: equipmentRarity.rarity,
            description: equipmentRarity.description
          }
        }
      };
    } catch (error) {
      console.error('Error opening Premium Box:', error);
      return { success: false, error: 'Database error' };
    }
  }

  /**
   * Award division-based rewards
   */
  static async awardDivisionRewards(
    teamId: string,
    rewardType: 'daily_tournament' | 'mid_season_cup' | 'league_playoff' | 'individual_award',
    division: number,
    placement: string
  ): Promise<{ success: boolean; rewards?: any; error?: string }> {
    try {
      let rewards: any = {};
      
      switch (rewardType) {
        case 'daily_tournament':
          const divisionGroup = division <= 4 ? 'divisions_1_4' : 'divisions_5_8';
          rewards = this.DAILY_TOURNAMENT_REWARDS[divisionGroup][placement];
          break;
        case 'mid_season_cup':
          rewards = this.MID_SEASON_CUP_REWARDS[`div_${division}`]?.[placement];
          break;
        case 'league_playoff':
          rewards = this.LEAGUE_PLAYOFF_REWARDS[`div_${division}`]?.[placement];
          break;
        case 'individual_award':
          rewards = this.INDIVIDUAL_AWARDS[placement]?.[`div_${division}`];
          break;
      }
      
      if (!rewards) {
        return { success: false, error: 'No rewards found for this placement/division' };
      }

      // Apply credit rewards
      if (rewards.credits) {
        const teamFinance = await prisma.teamFinances.findFirst({
          where: { teamId: teamId }
        });
        if (teamFinance) {
          await prisma.teamFinances.update({
            where: { teamId: teamId },
            data: { credits: (teamFinance.credits || 0) + rewards.credits }
          });
        }
      }

      // Apply gem rewards
      if (rewards.gems) {
        const teamFinance = await prisma.teamFinances.findFirst({
          where: { teamId: teamId }
        });
        if (teamFinance) {
          await prisma.teamFinances.update({
            where: { teamId: teamId },
            data: { gems: (teamFinance.gems || 0) + rewards.gems }
          });
        }
      }

      // Apply item rewards
      if (rewards.items) {
        for (const itemId of rewards.items) {
          await prisma.inventory.upsert({
            where: {
              teamId_itemId: {
                teamId: teamId,
                itemId: itemId
              }
            },
            create: {
              teamId: teamId,
              itemId: itemId,
              quantity: 1,
              acquiredAt: new Date()
            },
            update: {
              quantity: { increment: 1 }
            }
          });
        }
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
    try {
      const stadium = await prisma.stadium.findFirst({
        where: { teamId: teamId }
      });
      
      if (!stadium) {
        return 0;
      }

      // Calculate total stadium investment (rough estimation)
      const capacity = stadium.capacity || 10000;
      const concessionsLevel = stadium.concessionsLevel || 1;
      const parkingLevel = stadium.parkingLevel || 1;
      const vipSuitesLevel = stadium.vipSuitesLevel || 0;
      const merchandisingLevel = stadium.merchandisingLevel || 1;
      const lightingLevel = stadium.lightingLevel || 0;

      // Estimate total investment based on upgrades
      let totalInvestment = 100000; // Base stadium value
      totalInvestment += (capacity - 10000) / 5000 * 50000; // Capacity upgrades
      totalInvestment += (concessionsLevel - 1) * 30000; // Concessions upgrades
      totalInvestment += (parkingLevel - 1) * 25000; // Parking upgrades
      totalInvestment += vipSuitesLevel * 50000; // VIP suites
      totalInvestment += (merchandisingLevel - 1) * 20000; // Merchandising upgrades
      totalInvestment += lightingLevel * 40000; // Lighting upgrades

      return this.calculateDailyMaintenanceCost(totalInvestment);
    } catch (error) {
      console.error('Error calculating maintenance costs:', error);
      return 0;
    }
  }

  /**
   * Apply daily maintenance costs
   */
  static async applyMaintenanceCosts(teamId: string): Promise<number> {
    try {
      const maintenanceCost = await this.calculateMaintenanceCosts(teamId);
      
      if (maintenanceCost > 0) {
        const teamFinance = await prisma.teamFinances.findFirst({
          where: { teamId: teamId }
        });
        if (teamFinance) {
          await prisma.teamFinances.update({
            where: { teamId: teamId },
            data: { credits: Math.max(0, (teamFinance.credits || 0) - maintenanceCost) }
          });
        }
      }

      return maintenanceCost;
    } catch (error) {
      console.error('Error applying maintenance costs:', error);
      return 0;
    }
  }

  /**
   * Get comprehensive team economy status
   */
  static async getTeamEconomyStatus(teamId: string): Promise<{
    finances: any;
    dailyRevenue: number;
    dailyMaintenance: number;
    netDaily: number;
    stadiumStats: any;
    nextUpgradeCosts: any;
  }> {
    try {
      const teamFinance = await prisma.teamFinances.findFirst({
        where: { teamId: teamId }
      });
      
      const dailyRevenue = await this.calculateStadiumRevenue(teamId, true);
      const dailyMaintenance = await this.calculateMaintenanceCosts(teamId);
      
      const stadium = await prisma.stadium.findFirst({
        where: { teamId: teamId }
      });

      const nextUpgradeCosts = {
        capacity: this.calculateUpgradeCost('capacity', 0, stadium?.capacity || 10000),
        concessions: this.calculateUpgradeCost('concessions', stadium?.concessionsLevel || 1),
        parking: this.calculateUpgradeCost('parking', stadium?.parkingLevel || 1),
        vip_suites: this.calculateUpgradeCost('vip_suites', stadium?.vipSuitesLevel || 0),
        merchandising: this.calculateUpgradeCost('merchandising', stadium?.merchandisingLevel || 1),
        lighting: this.calculateUpgradeCost('lighting', stadium?.lightingLevel || 0)
      };

      return {
        finances: teamFinance,
        dailyRevenue: dailyRevenue.totalRevenue,
        dailyMaintenance,
        netDaily: dailyRevenue.totalRevenue - dailyMaintenance,
        stadiumStats: stadium,
        nextUpgradeCosts
      };
    } catch (error) {
      console.error('Error getting team economy status:', error);
      return {
        finances: null,
        dailyRevenue: 0,
        dailyMaintenance: 0,
        netDaily: 0,
        stadiumStats: null,
        nextUpgradeCosts: {}
      };
    }
  }

  /**
   * Get item name from item ID
   */
  static getItemName(itemId: string): string {
    const allItems = [
      ...this.STORE_ITEMS.consumables,
      ...this.STORE_ITEMS.performance
    ];
    
    const item = allItems.find(i => i.id === itemId);
    return item ? item.name : itemId;
  }

  /**
   * Check if user is eligible for Premium Box (50 ads watched)
   */
  static async checkPremiumBoxEligibility(teamId: string): Promise<{
    eligible: boolean;
    adsWatched: number;
    adsRequired: number;
  }> {
    try {
      // Get team's ad watching progress (assuming we track this somewhere)
      const teamFinance = await prisma.teamFinances.findFirst({
        where: { teamId: teamId }
      });
      
      // For now, we'll assume there's a field to track ads watched
      // This would need to be added to the database schema
      const adsWatched = 0; // TODO: Implement ad tracking
      const adsRequired = 50;
      
      return {
        eligible: adsWatched >= adsRequired,
        adsWatched,
        adsRequired
      };
    } catch (error) {
      console.error('Error checking Premium Box eligibility:', error);
      return {
        eligible: false,
        adsWatched: 0,
        adsRequired: 50
      };
    }
  }

  // **STORE PRICING SYSTEM - MASTER ECONOMY V5**

  /**
   * Store items with dual currency pricing - Combined Store System
   */
  static readonly STORE_ITEMS = {
    helmets: [
      { id: 'standard_leather_helmet', name: 'Standard Leather Helmet', credits: 1000, gems: null, tier: 'common', raceRestriction: null, statEffects: { stamina: 2 }, slot: 'Helmet' },
      { id: 'reinforced_steel_helm', name: 'Reinforced Steel Helm', credits: 4000, gems: 8, tier: 'uncommon', raceRestriction: null, statEffects: { stamina: 5 }, slot: 'Helmet' },
      { id: 'human_tactical_helm', name: 'Human Tactical Helm', credits: 6000, gems: 12, tier: 'uncommon', raceRestriction: 'HUMAN', statEffects: { leadership: 5, throwing: 3 }, slot: 'Helmet' },
      { id: 'gryllstone_plated_helm', name: 'Gryllstone Plated Helm', credits: 6000, gems: 12, tier: 'uncommon', raceRestriction: 'GRYLL', statEffects: { power: 8 }, slot: 'Helmet' },
      { id: 'sylvan_barkwood_circlet', name: 'Sylvan Barkwood Circlet', credits: 6000, gems: 12, tier: 'uncommon', raceRestriction: 'SYLVAN', statEffects: { agility: 5, catching: 3 }, slot: 'Helmet' },
      { id: 'umbral_cowl', name: 'Umbral Cowl', credits: 35000, gems: 25, tier: 'rare', raceRestriction: 'UMBRA', statEffects: { agility: 8, throwing: 5 }, slot: 'Helmet' },
      { id: 'lumina_radiant_crest', name: 'Lumina Radiant Crest', credits: 35000, gems: 25, tier: 'rare', raceRestriction: 'LUMINA', statEffects: { leadership: 8, kicking: 5 }, slot: 'Helmet' },
      { id: 'warlords_greathelm', name: 'Warlord\'s Greathelm', credits: 75000, gems: 50, tier: 'epic', raceRestriction: null, statEffects: { power: 10, leadership: 5 }, slot: 'Helmet' }
    ],
    chestArmor: [
      { id: 'padded_leather_armor', name: 'Padded Leather Armor', credits: 1500, gems: null, tier: 'common', raceRestriction: null, statEffects: { stamina: 3 }, slot: 'Chest Armor' },
      { id: 'steel_scale_mail', name: 'Steel Scale Mail', credits: 5000, gems: 10, tier: 'uncommon', raceRestriction: null, statEffects: { stamina: 6 }, slot: 'Chest Armor' },
      { id: 'quarterbacks_pauldrons', name: 'Quarterback\'s Pauldrons', credits: 8000, gems: 16, tier: 'uncommon', raceRestriction: null, statEffects: { throwing: 8 }, slot: 'Chest Armor' },
      { id: 'human_plate_carrier', name: 'Human Plate Carrier', credits: 7500, gems: 15, tier: 'uncommon', raceRestriction: 'HUMAN', statEffects: { stamina: 6, power: 2 }, slot: 'Chest Armor' },
      { id: 'gryll_forged_plate', name: 'Gryll Forged Plate', credits: 40000, gems: 30, tier: 'rare', raceRestriction: 'GRYLL', statEffects: { power: 12, speed: -2 }, slot: 'Chest Armor' },
      { id: 'umbral_shadow_weave_tunic', name: 'Umbral Shadow-Weave Tunic', credits: 40000, gems: 30, tier: 'rare', raceRestriction: 'UMBRA', statEffects: { agility: 10, stamina: 3 }, slot: 'Chest Armor' },
      { id: 'luminas_aegis_of_light', name: 'Lumina\'s Aegis of Light', credits: 80000, gems: 55, tier: 'epic', raceRestriction: 'LUMINA', statEffects: { leadership: 10, stamina: 8 }, slot: 'Chest Armor' },
      { id: 'sylvan_heartwood_plate', name: 'Sylvan Heartwood Plate', credits: 80000, gems: 55, tier: 'epic', raceRestriction: 'SYLVAN', statEffects: { agility: 10, stamina: 8 }, special: 'stamina_regen', slot: 'Chest Armor' }
    ],
    gloves: [
      { id: 'standard_leather_gloves', name: 'Standard Leather Gloves', credits: 800, gems: null, tier: 'common', raceRestriction: null, statEffects: { catching: 2 }, slot: 'Gloves' },
      { id: 'receivers_gloves', name: 'Receiver\'s Gloves', credits: 4000, gems: 8, tier: 'uncommon', raceRestriction: null, statEffects: { catching: 6 }, slot: 'Gloves' },
      { id: 'steel_gauntlets', name: 'Steel Gauntlets', credits: 3500, gems: 7, tier: 'uncommon', raceRestriction: null, statEffects: { power: 4, catching: 2 }, slot: 'Gloves' },
      { id: 'human_marksmans_gloves', name: 'Human Marksman\'s Gloves', credits: 30000, gems: 20, tier: 'rare', raceRestriction: 'HUMAN', statEffects: { throwing: 8, agility: 3 }, slot: 'Gloves' },
      { id: 'gryll_stonefists', name: 'Gryll Stonefists', credits: 30000, gems: 20, tier: 'rare', raceRestriction: 'GRYLL', statEffects: { power: 8, stamina: 4 }, slot: 'Gloves' },
      { id: 'umbral_shadowgrips', name: 'Umbral Shadowgrips', credits: 30000, gems: 20, tier: 'rare', raceRestriction: 'UMBRA', statEffects: { agility: 7, catching: 3 }, slot: 'Gloves' },
      { id: 'sylvan_gripping_vines', name: 'Sylvan Gripping Vines', credits: 70000, gems: 45, tier: 'epic', raceRestriction: 'SYLVAN', statEffects: { catching: 12 }, slot: 'Gloves' }
    ],
    footwear: [
      { id: 'worn_cleats', name: 'Worn Cleats', credits: 1000, gems: null, tier: 'common', raceRestriction: null, statEffects: { speed: 2 }, slot: 'Shoes' },
      { id: 'kickers_cleats', name: 'Kicker\'s Cleats', credits: 4500, gems: 9, tier: 'uncommon', raceRestriction: null, statEffects: { kicking: 6 }, slot: 'Shoes' },
      { id: 'plated_greaves', name: 'Plated Greaves', credits: 4500, gems: 9, tier: 'uncommon', raceRestriction: null, statEffects: { stamina: 4, speed: 2 }, slot: 'Shoes' },
      { id: 'boots_of_the_gryll', name: 'Boots of the Gryll', credits: 5500, gems: 11, tier: 'uncommon', raceRestriction: 'GRYLL', statEffects: { power: 6 }, slot: 'Shoes' },
      { id: 'sylvan_swift_striders', name: 'Sylvan Swift-Striders', credits: 38000, gems: 28, tier: 'rare', raceRestriction: 'SYLVAN', statEffects: { speed: 10 }, slot: 'Shoes' },
      { id: 'luminas_light_treads', name: 'Lumina\'s Light-Treads', credits: 38000, gems: 28, tier: 'rare', raceRestriction: 'LUMINA', statEffects: { agility: 10 }, slot: 'Shoes' }
    ],
    consumables: [
      { id: 'basic_energy_drink', name: 'Basic Energy Drink', credits: 500, gems: null, tier: 'common', effect: 'restore_stamina_25' },
      { id: 'basic_medical_kit', name: 'Basic Medical Kit', credits: 1000, gems: null, tier: 'common', effect: 'reduce_injury_1' },
      { id: 'advanced_recovery_serum', name: 'Advanced Recovery Serum', credits: 2000, gems: 5, tier: 'uncommon', effect: 'restore_stamina_75' },
      { id: 'advanced_treatment', name: 'Advanced Treatment', credits: 3000, gems: 10, tier: 'uncommon', effect: 'reduce_injury_2' },
      { id: 'regenerative_salve', name: 'Regenerative Salve', credits: 2500, gems: 8, tier: 'uncommon', effect: 'restore_stamina_20_and_reduce_injury_1' },
      { id: 'miracle_tincture', name: 'Miracle Tincture', credits: 50000, gems: 35, tier: 'legendary', effect: 'heal_any_injury' },
      { id: 'phoenix_elixir', name: 'Phoenix Elixir', credits: 40000, gems: 30, tier: 'legendary', effect: 'restore_team_stamina_100' }
    ],
    performance: [
      { id: 'team_leadership_draft', name: 'Team Leadership Draft', credits: 1200, gems: 3, tier: 'common', effect: 'team_leadership_3' },
      { id: 'team_power_draught', name: 'Team Power Draught', credits: 2500, gems: 5, tier: 'uncommon', effect: 'team_power_5' },
      { id: 'team_agility_tonic', name: 'Team Agility Tonic', credits: 2500, gems: 5, tier: 'uncommon', effect: 'team_agility_5' },
      { id: 'team_stamina_brew', name: 'Team Stamina Brew', credits: 10000, gems: 12, tier: 'rare', effect: 'team_stamina_8' },
      { id: 'champions_blessing', name: 'Champion\'s Blessing', credits: 30000, gems: 20, tier: 'epic', effect: 'team_all_stats_5' }
    ],
    entries: [
      { id: 'exhibition_match', name: 'Exhibition Match', credits: 5000, gems: 10, tier: 'entry', limit: '3 per day' },
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
      return (this.STORE_ITEMS as Record<string, any>)[category] || [];
    }
    return this.STORE_ITEMS;
  }

  /**
   * Generate 8-item daily rotation store - Master Economy v5 Combined Store System
   */
  static generateDailyRotationStore(date: Date = new Date()): any[] {
    // Use date as seed for consistent daily rotation
    const seed = date.getFullYear() * 10000 + date.getMonth() * 100 + date.getDate();
    const random = this.seededRandom(seed);
    
    // All equipment items from all categories
    const allEquipment = [
      ...this.STORE_ITEMS.helmets,
      ...this.STORE_ITEMS.chestArmor,
      ...this.STORE_ITEMS.gloves,
      ...this.STORE_ITEMS.footwear
    ];
    
    // All consumables
    const allConsumables = [
      ...this.STORE_ITEMS.consumables,
      ...this.STORE_ITEMS.performance
    ];
    
    // Combine all items
    const allItems = [...allEquipment, ...allConsumables];
    
    // Rarity weights for selection (Master Economy v5 specification)
    const rarityWeights = {
      common: 40,
      uncommon: 30,
      rare: 20,
      epic: 8,
      legendary: 2
    };
    
    const selectedItems = [];
    
    // Select 8 items with weighted probability
    for (let i = 0; i < 8; i++) {
      const availableItems = allItems.filter(item => 
        !selectedItems.some(selected => selected.id === item.id)
      );
      
      if (availableItems.length === 0) break;
      
      // Calculate total weight
      const totalWeight = availableItems.reduce((sum, item) => {
        return sum + (rarityWeights[item.tier as keyof typeof rarityWeights] || 1);
      }, 0);
      
      // Select item based on weighted probability
      let randomWeight = random() * totalWeight;
      let selectedItem = null;
      
      for (const item of availableItems) {
        const weight = rarityWeights[item.tier as keyof typeof rarityWeights] || 1;
        randomWeight -= weight;
        if (randomWeight <= 0) {
          selectedItem = item;
          break;
        }
      }
      
      if (selectedItem) {
        selectedItems.push(selectedItem);
      }
    }
    
    return selectedItems;
  }

  /**
   * Seeded random number generator for consistent daily rotation
   */
  private static seededRandom(seed: number): () => number {
    let x = seed;
    return () => {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      return x / 0x80000000;
    };
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
      const divisionRewards = (this.DIVISION_REWARDS as Record<number, any>)[division];
      if (!divisionRewards) {
        return { success: false, error: 'Invalid division' };
      }

      const rewards = divisionRewards[rewardType];
      if (!rewards) {
        return { success: false, error: 'Invalid reward type' };
      }

      // Update team finances
      const teamFinance = await prisma.teamFinances.findFirst({
        where: { teamId: teamId }
      });
      const team = await prisma.team.findFirst({
        where: { id: teamId }
      });

      if (!teamFinance || !team) {
        return { success: false, error: 'Team not found' };
      }

      if (rewards.credits > 0) {
        await prisma.teamFinances.update({
          where: { teamId: teamId },
          data: { credits: (teamFinance.credits || 0) + rewards.credits }
        });
      }

      if (rewards.gems > 0) {
        await prisma.team.update({
          where: { id: teamId },
          data: { gems: (team.gems || 0) + rewards.gems }
        });
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
    const stadium = await prisma.stadium.findFirst({
      where: { teamId: teamId }
    });
    
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
      const teamFinance = await prisma.teamFinances.findFirst({
        where: { teamId: teamId }
      });
      if (teamFinance) {
        await prisma.teamFinances.update({
          where: { teamId: teamId },
          data: { credits: Math.max(0, (teamFinance.credits || 0) - maintenanceCost) }
        });
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
    const teamFinance = await prisma.teamFinances.findFirst({
      where: { teamId: teamId }
    });
    const team = await prisma.team.findFirst({
      where: { id: teamId }
    });
    const stadium = await prisma.stadium.findFirst({
      where: { teamId: teamId }
    });

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

    // Use proper stadium system for value calculation instead of hardcoded multipliers
    const stadiumValue = stadium ? 
      await import('../../shared/stadiumSystem').then(({ calculateFacilityQuality }) => {
        const facilityQuality = calculateFacilityQuality(stadium);
        return 100000 + (facilityQuality * 5000); // Base value + quality-based enhancement
      }) : 0;

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