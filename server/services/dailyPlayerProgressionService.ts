import { prisma } from '../db';
import type { InsertPlayerDevelopmentHistory } from '../../shared/schema';
import { getEasternTime } from '../../shared/timezone';

/**
 * Daily Player Progression & Development System
 * 
 * Implements organic player development through daily progression checks
 * based on activity, potential, age, staff effects, and team environment.
 */
export class DailyPlayerProgressionService {
  
  // Configuration constants
  private static readonly CONFIG = {
    // Base progression chance
    BASE_CHANCE: 5.0, // 5% base chance
    
    // Activity scoring weights
    ACTIVITY_WEIGHTS: {
      LEAGUE_GAMES: 10,
      TOURNAMENT_GAMES: 7,
      EXHIBITION_GAMES: 2
    },
    
    // Performance bonus
    PERFORMANCE_BONUS: 5.0, // +5% for standout performance
    
    // Rolls per activity points
    ROLLS_PER_ACTIVITY: 5, // floor(ActivityScore / 5)
    
    // Potential modifiers by star rating
    POTENTIAL_MODIFIERS: {
      1: 5.0,  // 1-Star: +5%
      2: 10.0, // 2-Stars: +10%
      3: 20.0, // 3-Stars: +20%
      4: 30.0, // 4-Stars: +30%
      5: 40.0  // 5-Stars: +40%
    },
    
    // Age modifiers
    AGE_MODIFIERS: {
      YOUTH_MIN: 16,
      YOUTH_MAX: 23,
      YOUTH_BONUS: 15.0, // +15% for youth (16-23)
      
      PRIME_MIN: 24,
      PRIME_MAX: 30,
      PRIME_BONUS: 5.0, // +5% for prime (24-30)
      
      VETERAN_MIN: 31,
      VETERAN_PENALTY: -20.0, // -20% for veterans (31+)
      
      PHYSICAL_DECLINE_AGE: 34 // No physical stat improvements at 34+
    },
    
    // Staff modifiers
    STAFF_MODIFIERS: {
      TRAINER_MULTIPLIER: 0.15, // TrainerBonus = Teaching * 0.15%
      HEAD_COACH_AMPLIFIER: 0.01 // Amplified by (1 + HeadCoach.Development / 100)
    },
    
    // Camaraderie modifier
    CAMARADERIE_MULTIPLIER: 0.05, // (camaraderie - 50) * 0.05%
    
    // Injury modifiers
    INJURY_MODIFIERS: {
      'Minor Injury': -5.0,    // -5% penalty
      'Moderate Injury': -15.0, // -15% penalty
      'Severe Injury': -100.0   // Ineligible (-100% = 0% chance)
    },
    
    // Luck range
    LUCK_RANGE: 1.0, // ±1.0% random variance
    
    // Physical stats that can't improve after age 34
    PHYSICAL_STATS: ['speed', 'agility', 'power'],
    
    // All core stats for progression
    CORE_STATS: ['speed', 'power', 'throwing', 'catching', 'kicking', 'stamina', 'leadership', 'agility'],
    
    // Performance thresholds for bonus
    PERFORMANCE_THRESHOLDS: {
      MULTIPLE_SCORES: 2,     // 2+ scores in a match
      HIGH_KNOCKDOWNS: 3,     // 3+ knockdowns in a match
      HIGH_TACKLES: 5,        // 5+ tackles in a match
      HIGH_PASSING_YARDS: 50, // 50+ passing yards in a match
      HIGH_RUSHING_YARDS: 30  // 30+ rushing yards in a match
    }
  };

  /**
   * Execute daily progression for all players on active rosters
   * Called at 3 AM Eastern Time reset
   */
  static async executeDailyProgression(): Promise<{
    totalPlayersProcessed: number;
    totalProgressions: number;
    progressionsByTeam: Record<string, number>;
    errors: string[];
  }> {
    console.log('[DAILY PROGRESSION] Starting daily progression system...');
    
    const startTime = Date.now();
    const errors: string[] = [];
    let totalPlayersProcessed = 0;
    let totalProgressions = 0;
    const progressionsByTeam: Record<string, number> = {};
    
    try {
      // Get all players on active rosters (not on taxi squad)
      const activePlayers = await db
        .select({
          id: players.id,
          teamId: players.teamId,
          firstName: players.firstName,
          lastName: players.lastName
        })
        .from(players)
        .where(eq(players.isOnTaxi, false));
      
      console.log(`[DAILY PROGRESSION] Found ${activePlayers.length} active players to process`);
      
      for (const player of activePlayers) {
        try {
          const result = await this.processPlayerDailyProgression(player.id);
          totalPlayersProcessed++;
          totalProgressions += result.progressions.length;
          
          const teamId = player.teamId || 'unknown';
          if (!progressionsByTeam[teamId]) {
            progressionsByTeam[teamId] = 0;
          }
          progressionsByTeam[teamId] += result.progressions.length;
          
          if (result.progressions.length > 0) {
            console.log(`[DAILY PROGRESSION] ${player.firstName} ${player.lastName}: ${result.progressions.length} progressions`);
          }
        } catch (error) {
          const errorMsg = `Failed to process player ${player.firstName} ${player.lastName} (${player.id}): ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[DAILY PROGRESSION] ${errorMsg}`);
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`[DAILY PROGRESSION] Completed in ${duration}ms. Processed ${totalPlayersProcessed} players, ${totalProgressions} total progressions`);
      
      return {
        totalPlayersProcessed,
        totalProgressions,
        progressionsByTeam,
        errors
      };
      
    } catch (error) {
      console.error('[DAILY PROGRESSION] Fatal error in daily progression:', error);
      throw error;
    }
  }

  /**
   * Process daily progression for a single player
   */
  static async processPlayerDailyProgression(playerId: string): Promise<{
    progressions: Array<{ 
      stat: string; 
      oldValue: number; 
      newValue: number; 
      chance: number; 
      roll: number;
      activityScore: number;
      numberOfRolls: number;
    }>;
    activityScore: number;
    numberOfRolls: number;
    performanceBonus: boolean;
  }> {
    // Get player data
    const [player] = await db.select().from(players).where(eq(players.id, playerId));
    if (!player) {
      throw new Error('Player not found');
    }
    
    // Step 1: Calculate Daily ActivityScore
    const activityData = await this.calculateActivityScore(playerId);
    
    // Step 2: Determine Number of Progression Rolls
    const numberOfRolls = Math.floor(activityData.activityScore / this.CONFIG.ROLLS_PER_ACTIVITY);
    
    // Step 3: Execute Progression Rolls
    const progressions = [];
    
    for (let rollIndex = 0; rollIndex < numberOfRolls; rollIndex++) {
      // Randomly select an attribute for potential increase
      const randomStat = this.CONFIG.CORE_STATS[Math.floor(Math.random() * this.CONFIG.CORE_STATS.length)];
      
      // Check if this stat can be improved
      const currentValue = (player as any)[randomStat] || 0;
      const statCap = this.getStatCap(player, randomStat);
      
      // Skip if already at cap
      if (currentValue >= statCap) continue;
      
      // Check physical stat age restriction
      if (this.CONFIG.PHYSICAL_STATS.includes(randomStat) && (player.age || 20) >= this.CONFIG.AGE_MODIFIERS.PHYSICAL_DECLINE_AGE) {
        continue;
      }
      
      // Calculate progression chance for this stat
      const progressionChance = await this.calculateProgressionChance(player, randomStat, activityData.performanceBonus);
      
      // Roll for success
      const roll = Math.random() * 100;
      const success = roll < progressionChance;
      
      if (success) {
        const newValue = Math.min(statCap, currentValue + 1);
        
        // Update player stat in database
        await db.update(players)
          .set({ [randomStat]: newValue } as any)
          .where(eq(players.id, playerId));
        
        // Record development history
        const developmentRecord: InsertPlayerDevelopmentHistory = {
          playerId,
          season: 0, // Default season for daily progression
          developmentType: 'daily_progression',
          statChanged: randomStat,
          oldValue: currentValue,
          newValue,
          progressionChance,
          actualRoll: roll,
          success: true,
          ageAtTime: player.age || 20,
          gamesPlayedLastSeason: 0, // Daily system doesn't use this
          potentialAtTime: player.overallPotentialStars ? Number(player.overallPotentialStars) : 0
        };
        
        await db.insert(playerDevelopmentHistory).values(developmentRecord);
        
        progressions.push({
          stat: randomStat,
          oldValue: currentValue,
          newValue,
          chance: progressionChance,
          roll,
          activityScore: activityData.activityScore,
          numberOfRolls
        });
      }
    }
    
    return {
      progressions,
      activityScore: activityData.activityScore,
      numberOfRolls,
      performanceBonus: activityData.performanceBonus
    };
  }

  /**
   * Calculate daily activity score based on games played yesterday
   */
  private static async calculateActivityScore(playerId: string): Promise<{
    activityScore: number;
    performanceBonus: boolean;
    gamesBreakdown: {
      leagueGames: number;
      tournamentGames: number;
      exhibitionGames: number;
    };
  }> {
    const easternTime = getEasternTime();
    const yesterday = easternTime.clone().subtract(1, 'day');
    const yesterdayStart = yesterday.clone().startOf('day').toDate();
    const yesterdayEnd = yesterday.clone().endOf('day').toDate();
    
    // Get all matches the player participated in yesterday
    const matchStats = await db
      .select({
        matchId: playerMatchStats.matchId,
        matchType: matches.matchType,
        scores: playerMatchStats.scores,
        knockdownsInflicted: playerMatchStats.knockdownsInflicted,
        tackles: playerMatchStats.tackles,
        passingYards: playerMatchStats.passingYards,
        rushingYards: playerMatchStats.rushingYards
      })
      .from(playerMatchStats)
      .innerJoin(matches, eq(playerMatchStats.matchId, matches.id))
      .where(
        and(
          eq(playerMatchStats.playerId, playerId),
          gte(matches.createdAt, yesterdayStart),
          lt(matches.createdAt, yesterdayEnd)
        )
      );
    
    // Count games by type
    const gamesBreakdown = {
      leagueGames: 0,
      tournamentGames: 0,
      exhibitionGames: 0
    };
    
    let hasStandoutPerformance = false;
    
    for (const stat of matchStats) {
      // Count game types
      if (stat.matchType === 'league') {
        gamesBreakdown.leagueGames++;
      } else if (stat.matchType === 'tournament') {
        gamesBreakdown.tournamentGames++;
      } else if (stat.matchType === 'exhibition') {
        gamesBreakdown.exhibitionGames++;
      }
      
      // Check for standout performance
      if (
        (stat.scores || 0) >= this.CONFIG.PERFORMANCE_THRESHOLDS.MULTIPLE_SCORES ||
        (stat.knockdownsInflicted || 0) >= this.CONFIG.PERFORMANCE_THRESHOLDS.HIGH_KNOCKDOWNS ||
        (stat.tackles || 0) >= this.CONFIG.PERFORMANCE_THRESHOLDS.HIGH_TACKLES ||
        (stat.passingYards || 0) >= this.CONFIG.PERFORMANCE_THRESHOLDS.HIGH_PASSING_YARDS ||
        (stat.rushingYards || 0) >= this.CONFIG.PERFORMANCE_THRESHOLDS.HIGH_RUSHING_YARDS
      ) {
        hasStandoutPerformance = true;
      }
    }
    
    // Calculate base activity score
    const baseActivityScore = 
      (gamesBreakdown.leagueGames * this.CONFIG.ACTIVITY_WEIGHTS.LEAGUE_GAMES) +
      (gamesBreakdown.tournamentGames * this.CONFIG.ACTIVITY_WEIGHTS.TOURNAMENT_GAMES) +
      (gamesBreakdown.exhibitionGames * this.CONFIG.ACTIVITY_WEIGHTS.EXHIBITION_GAMES);
    
    // Add performance bonus if applicable
    const activityScore = baseActivityScore + (hasStandoutPerformance ? this.CONFIG.PERFORMANCE_BONUS : 0);
    
    return {
      activityScore,
      performanceBonus: hasStandoutPerformance,
      gamesBreakdown
    };
  }

  /**
   * Calculate progression chance for a specific attribute
   */
  private static async calculateProgressionChance(
    player: any, 
    statName: string, 
    hasPerformanceBonus: boolean
  ): Promise<number> {
    let progressionChance = this.CONFIG.BASE_CHANCE;
    
    // 1. Potential Modifier
    const potentialRating = this.getStatPotential(player, statName);
    const potentialStars = Math.min(5, Math.max(1, Math.round(potentialRating)));
    progressionChance += this.CONFIG.POTENTIAL_MODIFIERS[potentialStars as keyof typeof this.CONFIG.POTENTIAL_MODIFIERS];
    
    // 2. Age Modifier
    const age = player.age || 20;
    if (age >= this.CONFIG.AGE_MODIFIERS.YOUTH_MIN && age <= this.CONFIG.AGE_MODIFIERS.YOUTH_MAX) {
      progressionChance += this.CONFIG.AGE_MODIFIERS.YOUTH_BONUS;
    } else if (age >= this.CONFIG.AGE_MODIFIERS.PRIME_MIN && age <= this.CONFIG.AGE_MODIFIERS.PRIME_MAX) {
      progressionChance += this.CONFIG.AGE_MODIFIERS.PRIME_BONUS;
    } else if (age >= this.CONFIG.AGE_MODIFIERS.VETERAN_MIN) {
      progressionChance += this.CONFIG.AGE_MODIFIERS.VETERAN_PENALTY;
    }
    
    // 3. Staff Modifier
    const staffModifier = await this.calculateStaffModifier(player.teamId, statName);
    progressionChance += staffModifier;
    
    // 4. Camaraderie Modifier
    const camaraderieModifier = ((player.camaraderie || 50) - 50) * this.CONFIG.CAMARADERIE_MULTIPLIER;
    progressionChance += camaraderieModifier;
    
    // 5. Injury Modifier
    const injuryStatus = player.injuryStatus || 'Healthy';
    if (injuryStatus in this.CONFIG.INJURY_MODIFIERS) {
      progressionChance += this.CONFIG.INJURY_MODIFIERS[injuryStatus as keyof typeof this.CONFIG.INJURY_MODIFIERS];
    }
    
    // 6. Luck Factor
    const luck = (Math.random() - 0.5) * 2 * this.CONFIG.LUCK_RANGE; // ±1.0%
    progressionChance += luck;
    
    // Ensure non-negative probability
    return Math.max(0, progressionChance);
  }

  /**
   * Calculate staff modifier for progression
   */
  private static async calculateStaffModifier(teamId: string, statName: string): Promise<number> {
    // Get team staff
    const teamStaff = await db
      .select()
      .from(staff)
      .where(eq(staff.teamId, teamId));
    
    let trainerBonus = 0;
    let headCoachDevelopment = 0;
    
    // Find relevant trainer and head coach
    for (const staffMember of teamStaff) {
      if (staffMember.type === 'head_coach') {
        headCoachDevelopment = staffMember.coachingRating || 0;
      } else if (staffMember.type === 'trainer') {
        // Map stat to trainer specialty - use physical/offense/defense ratings
        const trainerRating = Math.max(
          staffMember.physicalRating || 0,
          staffMember.offenseRating || 0,
          staffMember.defenseRating || 0
        );
        trainerBonus = Math.max(trainerBonus, trainerRating);
      }
    }
    
    // Calculate final staff modifier
    const baseTrainerBonus = trainerBonus * this.CONFIG.STAFF_MODIFIERS.TRAINER_MULTIPLIER;
    const headCoachMultiplier = 1 + (headCoachDevelopment * this.CONFIG.STAFF_MODIFIERS.HEAD_COACH_AMPLIFIER);
    
    return baseTrainerBonus * headCoachMultiplier;
  }

  /**
   * Get stat potential rating for a player
   */
  private static getStatPotential(player: any, statName: string): number {
    // Use overall potential as base, with some stat-specific variance
    const basePotential = player.overallPotentialStars || 2.5;
    
    // Add small random variance for individual stats (±0.5 stars)
    const variance = (Math.random() - 0.5) * 1.0;
    
    return Math.min(5.0, Math.max(0.5, basePotential + variance));
  }

  /**
   * Get stat cap based on potential
   */
  private static getStatCap(player: any, statName: string): number {
    const potential = this.getStatPotential(player, statName);
    
    // Convert potential stars to stat cap (1-5 stars = 25-45 stat cap)
    return Math.round(20 + (potential * 5));
  }

  /**
   * Get detailed progression statistics for analysis
   */
  static async getProgressionStatistics(days: number = 30): Promise<{
    totalProgressions: number;
    progressionsByAge: Record<number, number>;
    progressionsByStat: Record<string, number>;
    topPerformers: Array<{
      playerId: string;
      playerName: string;
      totalProgressions: number;
    }>;
  }> {
    const easternTime = getEasternTime();
    const startDate = easternTime.clone().subtract(days, 'days').startOf('day').toDate();
    
    const progressions = await db
      .select()
      .from(playerDevelopmentHistory)
      .where(
        and(
          eq(playerDevelopmentHistory.developmentType, 'daily_progression'),
          eq(playerDevelopmentHistory.success, true),
          gte(playerDevelopmentHistory.createdAt, startDate)
        )
      );
    
    const progressionsByAge: Record<number, number> = {};
    const progressionsByStat: Record<string, number> = {};
    const playerProgressions: Record<string, { playerId: string; playerName: string; count: number }> = {};
    
    for (const progression of progressions) {
      // By age
      const age = progression.ageAtTime || 20;
      progressionsByAge[age] = (progressionsByAge[age] || 0) + 1;
      
      // By stat
      const stat = progression.statChanged || 'unknown';
      progressionsByStat[stat] = (progressionsByStat[stat] || 0) + 1;
      
      // By player
      const playerId = progression.playerId;
      if (!playerProgressions[playerId]) {
        playerProgressions[playerId] = {
          playerId,
          playerName: 'Unknown Player', // Would need to join with players table
          count: 0
        };
      }
      playerProgressions[playerId].count++;
    }
    
    const topPerformers = Object.values(playerProgressions)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(p => ({
        playerId: p.playerId,
        playerName: p.playerName,
        totalProgressions: p.count
      }));
    
    return {
      totalProgressions: progressions.length,
      progressionsByAge,
      progressionsByStat,
      topPerformers
    };
  }
}