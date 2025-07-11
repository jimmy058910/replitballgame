import { prisma } from '../db';

/**
 * Integrated Stadium, Finance & Atmosphere Service
 * 
 * Implements comprehensive fan loyalty and atmosphere system that connects
 * financial health, stadium infrastructure, and fan base to on-field performance.
 * 
 * Features:
 * - Fan Loyalty tracking (0-100 persistent score)
 * - Dynamic attendance calculation based on performance
 * - Home field advantage through Intimidation Factor
 * - Stadium revenue system with actual attendance impact
 * - Facility upgrades affecting loyalty and atmosphere
 */
export class StadiumAtmosphereService {
  
  /**
   * Fan Loyalty calculation constants
   */
  static readonly LOYALTY_CONFIG = {
    BASE_ATTENDANCE: 0.35, // 35% minimum attendance
    MAX_ATTENDANCE: 0.85,   // 85% maximum from loyalty alone
    WIN_STREAK_BONUS: 0.05, // 5% per 3-win streak
    MAX_WIN_STREAK_BONUS: 0.15, // Maximum 15% bonus
    
    // Season-end loyalty modifiers
    HIGH_PERFORMANCE_THRESHOLD: 0.60, // 60% win rate
    LOW_PERFORMANCE_THRESHOLD: 0.40,  // 40% win rate
    HIGH_PERFORMANCE_BONUS: 10,
    LOW_PERFORMANCE_PENALTY: -10,
    CHAMPIONSHIP_BONUS: 15,
    STRONG_FINISH_BONUS: 5, // Won last 3 games
    
    // Intimidation factor
    INTIMIDATION_MULTIPLIER: 10,
    CROWD_NOISE_THRESHOLD: 2, // Every 2 points of intimidation = -1 to away team
    
    // Revenue multipliers
    BASE_TICKET_PRICE: 25,
    CONCESSION_MULTIPLIER: 8,
    PARKING_RATE: 10,
    PARKING_USAGE: 0.3, // 30% of attendees use parking
    APPAREL_MULTIPLIER: 3,
    VIP_SUITE_REVENUE: 5000,
    ATMOSPHERE_BONUS_THRESHOLD: 80,
    ATMOSPHERE_BONUS_MULTIPLIER: 2
  };

  /**
   * Stadium upgrade costs and effects
   */
  static readonly UPGRADE_CONFIG = {
    CAPACITY_COST_MULTIPLIER: 10, // Cost per current capacity for next 5,000 seats
    CAPACITY_INCREMENT: 5000,
    
    FACILITY_BASE_COSTS: {
      concessions: 25000,
      parking: 25000,
      merchandising: 30000,
      lighting: 35000,
      screens: 40000,
      vipSuites: 50000
    },
    
    // Cost increases per level
    FACILITY_COST_SCALING: 1.5 // Each level costs 50% more
  };

  /**
   * Team power tiers for UI display
   */
  static readonly POWER_TIERS = {
    1: { min: 1, max: 15, name: 'Foundation', description: 'Building for the future.' },
    2: { min: 16, max: 20, name: 'Developing', description: 'Showing signs of promise.' },
    3: { min: 21, max: 25, name: 'Competitive', description: 'Can challenge any team on a good day.' },
    4: { min: 26, max: 30, name: 'Contender', description: 'A true championship threat.' },
    5: { min: 31, max: 40, name: 'Elite', description: 'A powerhouse of the league.' }
  };

  /**
   * Calculate Fan Loyalty for end-of-season update
   */
  static async calculateEndOfSeasonLoyalty(
    teamId: string, 
    season: number
  ): Promise<{
    oldLoyalty: number;
    newLoyalty: number;
    breakdown: {
      performanceModifier: number;
      formModifier: number;
      facilityBonus: number;
      championshipBonus: number;
    };
  }> {
    // Get current team data
    const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team.length) throw new Error('Team not found');
    
    const stadium = await db.select().from(stadiums).where(eq(stadiums.teamId, teamId)).limit(1);
    if (!stadium.length) throw new Error('Stadium not found');
    
    const oldLoyalty = team[0].fanLoyalty || 50; // Default starting loyalty
    const wins = team[0].wins || 0;
    const losses = team[0].losses || 0;
    const totalGames = wins + losses;
    const winPercentage = totalGames > 0 ? wins / totalGames : 0;
    
    // Performance modifier based on win percentage
    let performanceModifier = 0;
    if (winPercentage > this.LOYALTY_CONFIG.HIGH_PERFORMANCE_THRESHOLD) {
      performanceModifier = this.LOYALTY_CONFIG.HIGH_PERFORMANCE_BONUS;
    } else if (winPercentage < this.LOYALTY_CONFIG.LOW_PERFORMANCE_THRESHOLD) {
      performanceModifier = this.LOYALTY_CONFIG.LOW_PERFORMANCE_PENALTY;
    }
    
    // Form modifier - check last 3 games of season
    const lastThreeGames = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.season, season),
          eq(matches.status, 'completed')
        )
      )
      .orderBy(desc(matches.gameDay))
      .limit(3);
    
    const formModifier = this.calculateFormModifier(lastThreeGames, teamId);
    
    // Facility bonus from stadium upgrades
    const facilityBonus = Math.floor(
      ((stadium[0].lightingLevel || 0) + (stadium[0].screensLevel || 0)) / 2
    );
    
    // Championship bonus (would need playoff results)
    // For now, implement as team finishing in top position of their division
    const championshipBonus = team[0].position === 1 ? this.LOYALTY_CONFIG.CHAMPIONSHIP_BONUS : 0;
    
    const newLoyalty = Math.max(0, Math.min(100, 
      oldLoyalty + performanceModifier + formModifier + facilityBonus + championshipBonus
    ));
    
    // Update team's fan loyalty
    await db
      .update(teams)
      .set({ fanLoyalty: newLoyalty })
      .where(eq(teams.id, teamId));
    
    return {
      oldLoyalty,
      newLoyalty,
      breakdown: {
        performanceModifier,
        formModifier,
        facilityBonus,
        championshipBonus
      }
    };
  }

  /**
   * Calculate form modifier based on last 3 games
   */
  static calculateFormModifier(lastThreeGames: any[], teamId: string): number {
    if (lastThreeGames.length < 3) return 0;
    
    let wins = 0;
    for (const game of lastThreeGames) {
      const isHomeTeam = game.homeTeamId === teamId;
      const isAwayTeam = game.awayTeamId === teamId;
      
      if (isHomeTeam && game.homeScore > game.awayScore) wins++;
      if (isAwayTeam && game.awayScore > game.homeScore) wins++;
    }
    
    return wins === 3 ? this.LOYALTY_CONFIG.STRONG_FINISH_BONUS : 0;
  }

  /**
   * Calculate matchday atmosphere for a home game
   */
  static async calculateMatchdayAtmosphere(homeTeamId: string): Promise<{
    attendanceRate: number;
    actualAttendance: number;
    intimidationFactor: number;
    crowdNoiseDebuff: number;
    atmosphereBonus: boolean;
  }> {
    // Get team and stadium data
    const team = await db.select().from(teams).where(eq(teams.id, homeTeamId)).limit(1);
    if (!team.length) throw new Error('Team not found');
    
    const stadium = await db.select().from(stadiums).where(eq(stadiums.teamId, homeTeamId)).limit(1);
    if (!stadium.length) throw new Error('Stadium not found');
    
    const fanLoyalty = team[0].fanLoyalty || 50;
    const capacity = stadium[0].capacity || 15000;
    
    // Calculate base attendance from fan loyalty
    const baseAttendance = this.LOYALTY_CONFIG.BASE_ATTENDANCE + 
      (fanLoyalty / 200); // 35% base + up to 50% from loyalty
    
    // Calculate winning streak bonus
    const winStreakBonus = await this.calculateWinStreakBonus(homeTeamId);
    
    // Final attendance rate
    const attendanceRate = Math.max(0, Math.min(1, baseAttendance + winStreakBonus));
    const actualAttendance = Math.floor(capacity * attendanceRate);
    
    // Calculate intimidation factor
    const intimidationFactor = (attendanceRate * this.LOYALTY_CONFIG.INTIMIDATION_MULTIPLIER) * (fanLoyalty / 100);
    
    // Calculate crowd noise debuff for away team
    const crowdNoiseDebuff = Math.floor(intimidationFactor / this.LOYALTY_CONFIG.CROWD_NOISE_THRESHOLD);
    
    // Check for atmosphere bonus
    const atmosphereBonus = fanLoyalty > this.LOYALTY_CONFIG.ATMOSPHERE_BONUS_THRESHOLD;
    
    return {
      attendanceRate,
      actualAttendance,
      intimidationFactor,
      crowdNoiseDebuff,
      atmosphereBonus
    };
  }

  /**
   * Calculate winning streak bonus for attendance
   */
  static async calculateWinStreakBonus(teamId: string): Promise<number> {
    // Get recent completed matches for this team
    const recentMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.status, 'completed')
        )
      )
      .orderBy(desc(matches.gameDay))
      .limit(10); // Look at last 10 games max
    
    let consecutiveWins = 0;
    for (const match of recentMatches) {
      const isHomeTeam = match.homeTeamId === teamId;
      const isAwayTeam = match.awayTeamId === teamId;
      const won = (isHomeTeam && match.homeScore! > match.awayScore!) || 
                  (isAwayTeam && match.awayScore! > match.homeScore!);
      
      if (won) {
        consecutiveWins++;
      } else {
        break; // Streak broken
      }
    }
    
    // +5% for every 3 consecutive wins, max +15%
    const streakBonuses = Math.floor(consecutiveWins / 3);
    return Math.min(streakBonuses * this.LOYALTY_CONFIG.WIN_STREAK_BONUS, 
                   this.LOYALTY_CONFIG.MAX_WIN_STREAK_BONUS);
  }

  /**
   * Calculate home game revenue based on actual attendance
   */
  static async calculateHomeGameRevenue(homeTeamId: string): Promise<{
    totalRevenue: number;
    breakdown: {
      ticketSales: number;
      concessions: number;
      parking: number;
      apparel: number;
      vipSuites: number;
      atmosphereBonus: number;
    };
    actualAttendance: number;
  }> {
    const atmosphere = await this.calculateMatchdayAtmosphere(homeTeamId);
    const stadium = await db.select().from(stadiums).where(eq(stadiums.teamId, homeTeamId)).limit(1);
    const team = await db.select().from(teams).where(eq(teams.id, homeTeamId)).limit(1);
    
    if (!stadium.length || !team.length) {
      throw new Error('Stadium or team not found');
    }
    
    const actualAttendance = atmosphere.actualAttendance;
    const fanLoyalty = team[0].fanLoyalty || 50;
    
    // Calculate revenue components
    const ticketSales = actualAttendance * this.LOYALTY_CONFIG.BASE_TICKET_PRICE;
    
    const concessions = actualAttendance * this.LOYALTY_CONFIG.CONCESSION_MULTIPLIER * 
                       (stadium[0].concessionsLevel || 1);
    
    const parking = (actualAttendance * this.LOYALTY_CONFIG.PARKING_USAGE) * 
                   this.LOYALTY_CONFIG.PARKING_RATE * (stadium[0].parkingLevel || 1);
    
    const apparel = actualAttendance * this.LOYALTY_CONFIG.APPAREL_MULTIPLIER * 
                   (stadium[0].merchandisingLevel || 1);
    
    const vipSuites = (stadium[0].vipSuitesLevel || 0) * this.LOYALTY_CONFIG.VIP_SUITE_REVENUE;
    
    const atmosphereBonus = atmosphere.atmosphereBonus ? 
                           actualAttendance * this.LOYALTY_CONFIG.ATMOSPHERE_BONUS_MULTIPLIER : 0;
    
    const totalRevenue = ticketSales + concessions + parking + apparel + vipSuites + atmosphereBonus;
    
    return {
      totalRevenue,
      breakdown: {
        ticketSales,
        concessions,
        parking,
        apparel,
        vipSuites,
        atmosphereBonus
      },
      actualAttendance
    };
  }

  /**
   * Calculate stadium upgrade costs
   */
  static calculateUpgradeCost(
    upgradeType: 'capacity' | 'concessions' | 'parking' | 'merchandising' | 'lighting' | 'screens' | 'vipSuites',
    currentLevel: number,
    currentCapacity?: number
  ): number {
    if (upgradeType === 'capacity') {
      if (!currentCapacity) throw new Error('Current capacity required for capacity upgrade');
      return currentCapacity * this.UPGRADE_CONFIG.CAPACITY_COST_MULTIPLIER;
    }
    
    const baseCost = this.UPGRADE_CONFIG.FACILITY_BASE_COSTS[upgradeType as keyof typeof this.UPGRADE_CONFIG.FACILITY_BASE_COSTS];
    if (!baseCost) throw new Error('Invalid upgrade type');
    
    // Each level costs 50% more than the previous
    return Math.floor(baseCost * Math.pow(this.UPGRADE_CONFIG.FACILITY_COST_SCALING, currentLevel));
  }

  /**
   * Get team power tier information
   */
  static getTeamPowerTier(teamPower: number): {
    tier: number;
    name: string;
    description: string;
    min: number;
    max: number;
  } {
    for (const [tier, info] of Object.entries(this.POWER_TIERS)) {
      if (teamPower >= info.min && teamPower <= info.max) {
        return {
          tier: parseInt(tier),
          name: info.name,
          description: info.description,
          min: info.min,
          max: info.max
        };
      }
    }
    
    // Default to elite if above max
    return {
      tier: 5,
      name: 'Elite',
      description: 'A powerhouse of the league.',
      min: 31,
      max: 40
    };
  }

  /**
   * Apply crowd noise debuff to away team players
   */
  static applyCrowdNoiseDebuff(awayPlayers: any[], crowdNoiseDebuff: number): any[] {
    if (crowdNoiseDebuff <= 0) return awayPlayers;
    
    return awayPlayers.map(player => ({
      ...player,
      // Apply temporary debuff to Catching and Throwing
      catching: Math.max(1, (player.catching || 0) - crowdNoiseDebuff),
      throwing: Math.max(1, (player.throwing || 0) - crowdNoiseDebuff),
      // Mark as having crowd noise debuff for UI display
      crowdNoiseDebuff: crowdNoiseDebuff
    }));
  }

  /**
   * Calculate Core Athleticism Rating (CAR) for a player
   */
  static calculatePlayerCAR(player: any): number {
    const stats = [
      player.speed || 0,
      player.power || 0,
      player.agility || 0,
      player.throwing || 0,
      player.catching || 0,
      player.kicking || 0
    ];
    
    return Math.round(stats.reduce((sum, stat) => sum + stat, 0) / stats.length);
  }

  /**
   * Process league-wide end-of-season loyalty updates
   */
  static async processLeagueEndOfSeasonLoyalty(season: number): Promise<{
    teamsProcessed: number;
    averageLoyaltyChange: number;
    loyaltyUpdates: Array<{
      teamId: string;
      teamName: string;
      oldLoyalty: number;
      newLoyalty: number;
      change: number;
    }>;
  }> {
    const allTeams = await db.select().from(teams);
    const loyaltyUpdates = [];
    let totalChange = 0;
    
    for (const team of allTeams) {
      const result = await this.calculateEndOfSeasonLoyalty(team.id, season);
      const change = result.newLoyalty - result.oldLoyalty;
      
      loyaltyUpdates.push({
        teamId: team.id,
        teamName: team.name,
        oldLoyalty: result.oldLoyalty,
        newLoyalty: result.newLoyalty,
        change
      });
      
      totalChange += change;
    }
    
    return {
      teamsProcessed: allTeams.length,
      averageLoyaltyChange: allTeams.length > 0 ? totalChange / allTeams.length : 0,
      loyaltyUpdates
    };
  }

  /**
   * Get comprehensive stadium analytics for a team
   */
  static async getStadiumAnalytics(teamId: string): Promise<{
    currentStats: {
      fanLoyalty: number;
      estimatedAttendance: number;
      intimidationFactor: number;
      powerTier: ReturnType<typeof StadiumAtmosphereService.getTeamPowerTier>;
    };
    projectedRevenue: {
      perGame: number;
      perSeason: number; // Assuming 8-9 home games
      breakdown: any;
    };
    upgradeOptions: Array<{
      type: string;
      currentLevel: number;
      upgradeCost: number;
      effect: string;
    }>;
  }> {
    const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    const stadium = await db.select().from(stadiums).where(eq(stadiums.teamId, teamId)).limit(1);
    
    if (!team.length || !stadium.length) {
      throw new Error('Team or stadium not found');
    }
    
    const atmosphere = await this.calculateMatchdayAtmosphere(teamId);
    const revenue = await this.calculateHomeGameRevenue(teamId);
    const powerTier = this.getTeamPowerTier(team[0].teamPower || 0);
    
    // Calculate upgrade options
    const upgradeOptions = [
      {
        type: 'capacity',
        currentLevel: Math.floor((stadium[0].capacity || 15000) / 5000),
        upgradeCost: this.calculateUpgradeCost('capacity', 0, stadium[0].capacity || 15000),
        effect: `+${this.UPGRADE_CONFIG.CAPACITY_INCREMENT.toLocaleString()} seats, increased revenue potential`
      },
      {
        type: 'concessions',
        currentLevel: stadium[0].concessionsLevel || 1,
        upgradeCost: this.calculateUpgradeCost('concessions', stadium[0].concessionsLevel || 1),
        effect: `Increases concession revenue per attendee`
      },
      {
        type: 'parking',
        currentLevel: stadium[0].parkingLevel || 1,
        upgradeCost: this.calculateUpgradeCost('parking', stadium[0].parkingLevel || 1),
        effect: `Increases parking revenue per attendee`
      },
      {
        type: 'lighting',
        currentLevel: stadium[0].lightingLevel || 1,
        upgradeCost: this.calculateUpgradeCost('lighting', stadium[0].lightingLevel || 1),
        effect: `+0.5 fan loyalty per season (combined with screens)`
      }
    ];
    
    return {
      currentStats: {
        fanLoyalty: team[0].fanLoyalty || 50,
        estimatedAttendance: atmosphere.actualAttendance,
        intimidationFactor: atmosphere.intimidationFactor,
        powerTier
      },
      projectedRevenue: {
        perGame: revenue.totalRevenue,
        perSeason: revenue.totalRevenue * 8, // Estimate 8 home games
        breakdown: revenue.breakdown
      },
      upgradeOptions
    };
  }
}