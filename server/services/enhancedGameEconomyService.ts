import { prisma } from '../db.js';

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

      const team = await prisma.team.findFirst({
        where: { id: teamId }
      });
      if (!team || (team.gems ?? 0) < gemAmount) {
        return { success: false, error: 'Insufficient gems' };
      }

      const creditsReceived = Math.floor((gemAmount / rate.gems) * rate.credits);

      // Update team finances
      await prisma.team.update({
        where: { id: teamId },
        data: { gems: (team.gems ?? 0) - gemAmount }
      });

      const teamFinance = await prisma.teamFinance.findFirst({
        where: { teamId: teamId }
      });
      if (teamFinance) {
        await prisma.teamFinance.update({
          where: { teamId: teamId },
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
      const teamFinance = await prisma.teamFinance.findFirst({
        where: { teamId: teamId }
      });
      if (teamFinance) {
        await prisma.teamFinance.update({
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
      const stadium = await prisma.stadium.findFirst({
        where: { teamId: teamId }
      });
      const teamFinance = await prisma.teamFinance.findFirst({
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
      await prisma.teamFinance.update({
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
      const teamFinance = await prisma.teamFinance.findFirst({
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

      await prisma.teamFinance.update({
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
      const teamFinance = await prisma.teamFinance.findFirst({
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

  // **STORE PRICING SYSTEM**

  /**
   * Store items with dual currency pricing
   */
  static readonly STORE_ITEMS = {
    helmets: [
      { id: 'standard_leather_helmet', name: 'Standard Leather Helmet', credits: 1000, gems: null, tier: 'common', raceRestriction: null, statEffects: { toughness: 2 } },
      { id: 'reinforced_steel_helm', name: 'Reinforced Steel Helm', credits: 2500, gems: 5, tier: 'uncommon', raceRestriction: null, statEffects: { toughness: 5 } },
      { id: 'human_tactical_helm', name: 'Human Tactical Helm', credits: 3000, gems: 8, tier: 'uncommon', raceRestriction: 'HUMAN', statEffects: { intelligence: 5, toughness: 3 } },
      { id: 'gryllstone_plated_helm', name: 'Gryllstone Plated Helm', credits: 3500, gems: 10, tier: 'uncommon', raceRestriction: 'GRYLL', statEffects: { toughness: 8 } },
      { id: 'sylvan_barkwood_circlet', name: 'Sylvan Barkwood Circlet', credits: 4000, gems: 10, tier: 'uncommon', raceRestriction: 'SYLVAN', statEffects: { agility: 5, intelligence: 3 } },
      { id: 'umbral_cowl', name: 'Umbral Cowl', credits: 15000, gems: 25, tier: 'rare', raceRestriction: 'UMBRA', statEffects: { agility: 8, intelligence: 5 } },
      { id: 'lumina_radiant_crest', name: 'Lumina Radiant Crest', credits: 18000, gems: 30, tier: 'rare', raceRestriction: 'LUMINA', statEffects: { intelligence: 8, strength: 5 } },
      { id: 'warlords_greathelm', name: 'Warlord\'s Greathelm', credits: 50000, gems: 75, tier: 'epic', raceRestriction: null, statEffects: { toughness: 10, strength: 5 } }
    ],
    chestArmor: [
      { id: 'padded_leather_armor', name: 'Padded Leather Armor', credits: 1500, gems: null, tier: 'common', raceRestriction: null, statEffects: { toughness: 3 } },
      { id: 'steel_scale_mail', name: 'Steel Scale Mail', credits: 3000, gems: 8, tier: 'uncommon', raceRestriction: null, statEffects: { toughness: 6 } },
      { id: 'human_plate_carrier', name: 'Human Plate Carrier', credits: 4000, gems: 10, tier: 'uncommon', raceRestriction: 'HUMAN', statEffects: { toughness: 6, strength: 2 } },
      { id: 'gryll_forged_plate', name: 'Gryll Forged Plate', credits: 20000, gems: 35, tier: 'rare', raceRestriction: 'GRYLL', statEffects: { toughness: 12, agility: -2 } },
      { id: 'umbral_shadow_weave_tunic', name: 'Umbral Shadow-Weave Tunic', credits: 18000, gems: 30, tier: 'rare', raceRestriction: 'UMBRA', statEffects: { agility: 10, toughness: 3 } },
      { id: 'luminas_aegis_of_light', name: 'Lumina\'s Aegis of Light', credits: 60000, gems: 100, tier: 'epic', raceRestriction: 'LUMINA', statEffects: { intelligence: 10, toughness: 8 } },
      { id: 'sylvan_heartwood_plate', name: 'Sylvan Heartwood Plate', credits: 65000, gems: 110, tier: 'epic', raceRestriction: 'SYLVAN', statEffects: { agility: 10, toughness: 8 }, special: 'stamina_regen' }
    ],
    gloves: [
      { id: 'standard_leather_gloves', name: 'Standard Leather Gloves', credits: 800, gems: null, tier: 'common', raceRestriction: null, statEffects: { strength: 2 } },
      { id: 'steel_gauntlets', name: 'Steel Gauntlets', credits: 2000, gems: 5, tier: 'uncommon', raceRestriction: null, statEffects: { strength: 4, toughness: 2 } },
      { id: 'human_marksmans_gloves', name: 'Human Marksman\'s Gloves', credits: 12000, gems: 20, tier: 'rare', raceRestriction: 'HUMAN', statEffects: { intelligence: 8, agility: 3 } },
      { id: 'gryll_stonefists', name: 'Gryll Stonefists', credits: 15000, gems: 25, tier: 'rare', raceRestriction: 'GRYLL', statEffects: { strength: 8, toughness: 4 } },
      { id: 'umbral_shadowgrips', name: 'Umbral Shadowgrips', credits: 14000, gems: 22, tier: 'rare', raceRestriction: 'UMBRA', statEffects: { agility: 7, strength: 3 } },
      { id: 'sylvan_gripping_vines', name: 'Sylvan Gripping Vines', credits: 45000, gems: 70, tier: 'epic', raceRestriction: 'SYLVAN', statEffects: { agility: 12 } }
    ],
    footwear: [
      { id: 'worn_cleats', name: 'Worn Cleats', credits: 600, gems: null, tier: 'common', raceRestriction: null, statEffects: { agility: 2 } },
      { id: 'plated_greaves', name: 'Plated Greaves', credits: 1800, gems: 4, tier: 'uncommon', raceRestriction: null, statEffects: { toughness: 4, agility: 2 } },
      { id: 'boots_of_the_gryll', name: 'Boots of the Gryll', credits: 3000, gems: 8, tier: 'uncommon', raceRestriction: 'GRYLL', statEffects: { toughness: 6 } },
      { id: 'sylvan_swift_striders', name: 'Sylvan Swift-Striders', credits: 18000, gems: 30, tier: 'rare', raceRestriction: 'SYLVAN', statEffects: { agility: 10 } },
      { id: 'luminas_light_treads', name: 'Lumina\'s Light-Treads', credits: 20000, gems: 35, tier: 'rare', raceRestriction: 'LUMINA', statEffects: { agility: 10 } }
    ],
    consumables: [
      { id: 'basic_energy_drink', name: 'Basic Energy Drink', credits: 500, gems: null, tier: 'common', effect: 'restore_stamina_25' },
      { id: 'basic_medical_kit', name: 'Basic Medical Kit', credits: 750, gems: null, tier: 'common', effect: 'reduce_injury_1' },
      { id: 'advanced_recovery_serum', name: 'Advanced Recovery Serum', credits: 1500, gems: 3, tier: 'uncommon', effect: 'restore_stamina_75' },
      { id: 'advanced_treatment', name: 'Advanced Treatment', credits: 2000, gems: 5, tier: 'uncommon', effect: 'reduce_injury_2' },
      { id: 'regenerative_salve', name: 'Regenerative Salve', credits: 2500, gems: 6, tier: 'uncommon', effect: 'restore_stamina_20_and_reduce_injury_1' },
      { id: 'miracle_tincture', name: 'Miracle Tincture', credits: 40000, gems: 60, tier: 'legendary', effect: 'heal_any_injury' },
      { id: 'phoenix_elixir', name: 'Phoenix Elixir', credits: 50000, gems: 80, tier: 'legendary', effect: 'restore_team_stamina_100' }
    ],
    performance: [
      { id: 'team_focus_draft', name: 'Team Focus Draft', credits: 1200, gems: 2, tier: 'common', effect: 'team_intelligence_3' },
      { id: 'team_vigor_draught', name: 'Team Vigor Draught', credits: 2000, gems: 4, tier: 'uncommon', effect: 'team_strength_5' },
      { id: 'team_reflex_tonic', name: 'Team Reflex Tonic', credits: 2200, gems: 5, tier: 'uncommon', effect: 'team_agility_5' },
      { id: 'team_resilience_brew', name: 'Team Resilience Brew', credits: 8000, gems: 15, tier: 'rare', effect: 'team_toughness_8' },
      { id: 'champions_blessing', name: 'Champion\'s Blessing', credits: 35000, gems: 50, tier: 'epic', effect: 'team_all_stats_5' }
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
      const teamFinance = await prisma.teamFinance.findFirst({
        where: { teamId: teamId }
      });
      const team = await prisma.team.findFirst({
        where: { id: teamId }
      });

      if (!teamFinance || !team) {
        return { success: false, error: 'Team not found' };
      }

      if (rewards.credits > 0) {
        await prisma.teamFinance.update({
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
      const teamFinance = await prisma.teamFinance.findFirst({
        where: { teamId: teamId }
      });
      if (teamFinance) {
        await prisma.teamFinance.update({
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
    const teamFinance = await prisma.teamFinance.findFirst({
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