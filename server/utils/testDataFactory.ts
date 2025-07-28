/**
 * Test Data Factory - Industry Standard Test Data Generation
 * Generates random teams, players, and match scenarios for comprehensive testing
 */

// Type definitions for test data generation
type Race = 'HUMAN' | 'SYLVAN' | 'GRYLL' | 'LUMINA' | 'UMBRA';
type PlayerRole = 'BLOCKER' | 'RUNNER' | 'PASSER';
type InjuryStatus = 'HEALTHY' | 'MINOR' | 'MODERATE' | 'MAJOR' | 'SEVERE';

export interface TestTeamConfig {
  powerLevel: 'weak' | 'average' | 'strong' | 'elite';
  raceDistribution?: Partial<Record<Race, number>>;
  roleDistribution?: Partial<Record<PlayerRole, number>>;
  stadiumLevel?: 'basic' | 'medium' | 'advanced';
}

export interface TestPlayerConfig {
  race?: Race;
  role?: PlayerRole;
  powerLevel?: 'low' | 'medium' | 'high' | 'elite';
  age?: number;
  potentialRating?: number;
  injuryStatus?: InjuryStatus;
}

export interface TestMatchConfig {
  homeTeamPower: number;
  awayTeamPower: number;
  expectedOutcome?: 'home_win' | 'away_win' | 'close_game' | 'blowout';
  stadiumEffects?: boolean;
  weatherConditions?: 'normal' | 'adverse';
}

export class TestDataFactory {
  private static teamNamePrefixes = [
    'Thunder', 'Lightning', 'Storm', 'Inferno', 'Frost', 'Shadow', 'Crystal', 'Iron',
    'Golden', 'Silver', 'Crimson', 'Azure', 'Emerald', 'Obsidian', 'Radiant', 'Mystic'
  ];

  private static teamNameSuffixes = [
    'Warriors', 'Guardians', 'Rangers', 'Titans', 'Knights', 'Wolves', 'Eagles', 'Lions',
    'Dragons', 'Phoenix', 'Serpents', 'Hawks', 'Bears', 'Tigers', 'Stallions', 'Falcons'
  ];

  private static firstNames = {
    HUMAN: ['Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn', 'Sage'],
    SYLVAN: ['Aria', 'Lyra', 'Sage', 'Rowan', 'Fern', 'Ivy', 'Oak', 'Willow'],
    GRYLL: ['Thane', 'Grimm', 'Stone', 'Boulder', 'Granite', 'Flint', 'Iron', 'Steel'],
    LUMINA: ['Luminous', 'Radiant', 'Brilliant', 'Shining', 'Gleaming', 'Bright', 'Nova', 'Star'],
    UMBRA: ['Shadow', 'Shade', 'Dusk', 'Twilight', 'Eclipse', 'Midnight', 'Raven', 'Void']
  };

  private static lastNames = {
    HUMAN: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'],
    SYLVAN: ['Leafwhisper', 'Treewalker', 'Forestsong', 'Windrunner', 'Moonleaf', 'Starbloom'],
    GRYLL: ['Ironforge', 'Stonebreaker', 'Mountainheart', 'Deepdelver', 'Rocksmash', 'Boulderhand'],
    LUMINA: ['Lightbringer', 'Dawnstrider', 'Sunweaver', 'Starforge', 'Prismheart', 'Raywalker'],
    UMBRA: ['Shadowbane', 'Nightfall', 'Darkweaver', 'Voidstep', 'Mistwalker', 'Eclipseheart']
  };

  /**
   * Generate a random test team with specified configuration
   */
  static generateTestTeam(config: TestTeamConfig = { powerLevel: 'average' }): any {
    const teamName = `${this.randomChoice(this.teamNamePrefixes)} ${this.randomChoice(this.teamNameSuffixes)}`;
    
    // Power level distributions
    const powerRanges = {
      weak: { min: 15, max: 25 },
      average: { min: 20, max: 30 },
      strong: { min: 25, max: 35 },
      elite: { min: 30, max: 40 }
    };

    const powerRange = powerRanges[config.powerLevel];
    
    // Generate 13-15 players with specified distribution
    const players = this.generateTestRoster({
      count: this.randomInt(13, 15),
      powerLevel: config.powerLevel,
      raceDistribution: config.raceDistribution,
      roleDistribution: config.roleDistribution
    });

    // Generate stadium based on level
    const stadium = this.generateTestStadium(config.stadiumLevel || 'medium');

    return {
      name: teamName,
      players,
      stadium,
      finances: this.generateTestFinances(config.powerLevel),
      camaraderie: this.randomInt(40, 90),
      fanLoyalty: this.randomInt(30, 85),
      tacticalFocus: this.randomChoice(['BALANCED_ATTACK', 'ALL_OUT_ATTACK', 'DEFENSIVE_WALL', 'BALL_CONTROL', 'QUICK_STRIKE']),
      formation: this.randomChoice(['BALANCED', 'OFFENSIVE', 'DEFENSIVE', 'SPEED_FORMATION', 'POWER_FORMATION'])
    };
  }

  /**
   * Generate a roster of test players
   */
  static generateTestRoster(config: {
    count: number;
    powerLevel: 'weak' | 'average' | 'strong' | 'elite';
    raceDistribution?: Partial<Record<Race, number>>;
    roleDistribution?: Partial<Record<PlayerRole, number>>;
  }): any[] {
    const players = [];
    
    // Default role distribution (minimum requirements)
    const roles = [
      ...Array(4).fill('BLOCKER'),
      ...Array(4).fill('RUNNER'),
      ...Array(3).fill('PASSER')
    ];
    
    // Add extra players randomly
    while (roles.length < config.count) {
      roles.push(this.randomChoice(['BLOCKER', 'RUNNER', 'PASSER']));
    }

    for (let i = 0; i < config.count; i++) {
      const race = this.selectRaceByDistribution(config.raceDistribution);
      const role = roles[i] as PlayerRole;
      
      players.push(this.generateTestPlayer({
        race,
        role,
        powerLevel: this.mapTeamPowerToPlayerPower(config.powerLevel),
        age: this.randomInt(18, 35),
        potentialRating: this.generatePotentialRating()
      }));
    }

    return players;
  }

  /**
   * Generate a single test player
   */
  static generateTestPlayer(config: TestPlayerConfig = {}): any {
    const race = config.race || this.randomChoice(['HUMAN', 'SYLVAN', 'GRYLL', 'LUMINA', 'UMBRA']) as Race;
    const role = config.role || this.randomChoice(['BLOCKER', 'RUNNER', 'PASSER']) as PlayerRole;
    const age = config.age || this.randomInt(18, 35);
    
    const firstName = this.randomChoice(this.firstNames[race]);
    const lastName = this.randomChoice(this.lastNames[race]);

    // Generate base attributes
    const baseAttributes = this.generateBaseAttributes(role, config.powerLevel || 'medium');
    
    // Apply racial modifiers
    const attributes = this.applyRacialModifiers(baseAttributes, race);
    
    return {
      firstName,
      lastName,
      race,
      role,
      age,
      ...attributes,
      potentialRating: config.potentialRating || this.generatePotentialRating(),
      dailyStaminaLevel: this.randomInt(80, 100),
      injuryStatus: config.injuryStatus || 'HEALTHY',
      injuryRecoveryPointsNeeded: 0,
      injuryRecoveryPointsCurrent: 0,
      camaraderieScore: this.randomInt(50, 90),
      contractSalary: this.calculateTestSalary(attributes, age),
      seasonMinutesLeague: 0,
      seasonMinutesTournament: 0,
      seasonMinutesExhibition: 0
    };
  }

  /**
   * Generate base attributes for a role and power level
   */
  private static generateBaseAttributes(role: PlayerRole, powerLevel: 'low' | 'medium' | 'high' | 'elite') {
    const powerRanges = {
      low: { primary: [8, 15], secondary: [5, 12] },
      medium: { primary: [15, 25], secondary: [10, 18] },
      high: { primary: [22, 32], secondary: [15, 25] },
      elite: { primary: [28, 38], secondary: [20, 30] }
    };

    const range = powerRanges[powerLevel];
    
    // Role-based attribute priorities
    const roleAttributes: Record<PlayerRole, { primary: string[], secondary: string[] }> = {
      BLOCKER: {
        primary: ['power', 'stamina', 'leadership'],
        secondary: ['agility', 'speed', 'throwing', 'catching', 'kicking']
      },
      RUNNER: {
        primary: ['speed', 'agility', 'catching'],
        secondary: ['power', 'stamina', 'throwing', 'kicking', 'leadership']
      },
      PASSER: {
        primary: ['throwing', 'leadership', 'agility'],
        secondary: ['catching', 'speed', 'power', 'stamina', 'kicking']
      }
    };

    const attributes: Record<string, number> = {};
    const roleConfig = roleAttributes[role];

    // Generate primary attributes (role strengths)
    roleConfig.primary.forEach((attr: string) => {
      attributes[attr] = this.randomInt(range.primary[0], range.primary[1]);
    });

    // Generate secondary attributes
    roleConfig.secondary.forEach((attr: string) => {
      attributes[attr] = this.randomInt(range.secondary[0], range.secondary[1]);
    });

    return {
      speed: attributes.speed,
      power: attributes.power,
      throwing: attributes.throwing,
      catching: attributes.catching,
      kicking: attributes.kicking,
      staminaAttribute: attributes.stamina,
      leadership: attributes.leadership,
      agility: attributes.agility
    };
  }

  /**
   * Apply racial modifiers to base attributes
   */
  private static applyRacialModifiers(attributes: any, race: Race) {
    const modifiers: Record<Race, Record<string, number>> = {
      HUMAN: { speed: 1, power: 1, throwing: 1, catching: 1, kicking: 1, staminaAttribute: 1, leadership: 1, agility: 1 },
      SYLVAN: { speed: 3, agility: 4, power: -2 },
      GRYLL: { power: 5, staminaAttribute: 3, speed: -3, agility: -2 },
      LUMINA: { throwing: 4, leadership: 3, staminaAttribute: -1 },
      UMBRA: { speed: 2, agility: 3, power: -3, leadership: -1 }
    };

    const raceModifiers = modifiers[race] || {};
    const result = { ...attributes };

    Object.keys(raceModifiers).forEach((attr: string) => {
      if (result[attr] !== undefined) {
        result[attr] = Math.max(1, Math.min(40, result[attr] + raceModifiers[attr]));
      }
    });

    return result;
  }

  /**
   * Generate test stadium configuration
   */
  private static generateTestStadium(level: 'basic' | 'medium' | 'advanced') {
    const stadiumConfigs = {
      basic: {
        capacity: this.randomInt(5000, 15000),
        concessionsLevel: this.randomInt(1, 2),
        parkingLevel: this.randomInt(1, 2),
        vipSuitesLevel: this.randomInt(0, 1),
        merchandisingLevel: this.randomInt(1, 2),
        lightingScreensLevel: this.randomInt(1, 2)
      },
      medium: {
        capacity: this.randomInt(15000, 35000),
        concessionsLevel: this.randomInt(2, 4),
        parkingLevel: this.randomInt(2, 4),
        vipSuitesLevel: this.randomInt(1, 2),
        merchandisingLevel: this.randomInt(2, 4),
        lightingScreensLevel: this.randomInt(2, 4)
      },
      advanced: {
        capacity: this.randomInt(35000, 75000),
        concessionsLevel: this.randomInt(4, 5),
        parkingLevel: this.randomInt(4, 5),
        vipSuitesLevel: this.randomInt(2, 3),
        merchandisingLevel: this.randomInt(4, 5),
        lightingScreensLevel: this.randomInt(4, 5)
      }
    };

    return stadiumConfigs[level];
  }

  /**
   * Generate test team finances
   */
  private static generateTestFinances(powerLevel: 'weak' | 'average' | 'strong' | 'elite') {
    const financeRanges = {
      weak: { credits: [5000, 25000], gems: [0, 50] },
      average: { credits: [15000, 45000], gems: [25, 150] },
      strong: { credits: [35000, 75000], gems: [100, 300] },
      elite: { credits: [60000, 150000], gems: [200, 500] }
    };

    const range = financeRanges[powerLevel];
    
    return {
      credits: this.randomInt(range.credits[0], range.credits[1]),
      gems: this.randomInt(range.gems[0], range.gems[1]),
      escrowCredits: 0,
      escrowGems: 0,
      projectedIncome: this.randomInt(5000, 15000),
      projectedExpenses: this.randomInt(3000, 12000)
    };
  }

  /**
   * Generate potential rating with realistic distribution
   */
  private static generatePotentialRating(): number {
    const weights = [
      { value: 0.5, weight: 5 },   // 5% - Very poor potential
      { value: 1.0, weight: 15 },  // 15% - Poor potential
      { value: 1.5, weight: 25 },  // 25% - Below average
      { value: 2.0, weight: 30 },  // 30% - Average potential
      { value: 2.5, weight: 15 },  // 15% - Above average
      { value: 3.0, weight: 7 },   // 7% - Good potential
      { value: 3.5, weight: 2.5 }, // 2.5% - Very good
      { value: 4.0, weight: 0.4 }, // 0.4% - Excellent
      { value: 4.5, weight: 0.08 },// 0.08% - Outstanding
      { value: 5.0, weight: 0.02 } // 0.02% - Legendary
    ];

    return this.weightedRandom(weights);
  }

  /**
   * Utility functions
   */
  private static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private static randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private static weightedRandom(weights: { value: any, weight: number }[]): any {
    const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of weights) {
      if (random < item.weight) {
        return item.value;
      }
      random -= item.weight;
    }
    
    return weights[weights.length - 1].value;
  }

  private static selectRaceByDistribution(distribution?: Partial<Record<Race, number>>): Race {
    if (!distribution) {
      return this.randomChoice(['HUMAN', 'SYLVAN', 'GRYLL', 'LUMINA', 'UMBRA']) as Race;
    }

    const races = Object.keys(distribution) as Race[];
    const weights = races.map(race => ({ value: race, weight: distribution[race] || 1 }));
    return this.weightedRandom(weights);
  }

  private static mapTeamPowerToPlayerPower(teamPower: 'weak' | 'average' | 'strong' | 'elite'): 'low' | 'medium' | 'high' | 'elite' {
    const mapping = {
      weak: 'low' as const,
      average: 'medium' as const,
      strong: 'high' as const,
      elite: 'elite' as const
    };
    return mapping[teamPower];
  }

  private static calculateTestSalary(attributes: any, age: number): number {
    const totalPower = (attributes.speed + attributes.power + attributes.throwing + 
                       attributes.catching + attributes.kicking + attributes.agility) / 6;
    const ageMultiplier = age < 25 ? 1.2 : age > 30 ? 0.8 : 1.0;
    return Math.round(totalPower * 1000 * ageMultiplier);
  }

  /**
   * Generate comprehensive test scenarios
   */
  static generateTestScenarios(): TestMatchConfig[] {
    return [
      // Power imbalance scenarios
      { homeTeamPower: 35, awayTeamPower: 15, expectedOutcome: 'blowout', stadiumEffects: true },
      { homeTeamPower: 15, awayTeamPower: 35, expectedOutcome: 'blowout', stadiumEffects: true },
      
      // Close matchups
      { homeTeamPower: 25, awayTeamPower: 24, expectedOutcome: 'close_game', stadiumEffects: true },
      { homeTeamPower: 30, awayTeamPower: 31, expectedOutcome: 'close_game', stadiumEffects: true },
      
      // Home field advantage tests
      { homeTeamPower: 22, awayTeamPower: 25, expectedOutcome: 'home_win', stadiumEffects: true },
      { homeTeamPower: 20, awayTeamPower: 20, expectedOutcome: 'home_win', stadiumEffects: true },
      
      // Weather conditions
      { homeTeamPower: 25, awayTeamPower: 25, expectedOutcome: 'close_game', weatherConditions: 'adverse' },
      
      // No stadium effects
      { homeTeamPower: 25, awayTeamPower: 25, expectedOutcome: 'close_game', stadiumEffects: false }
    ];
  }
}

export default TestDataFactory;