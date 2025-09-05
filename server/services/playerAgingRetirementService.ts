import { getPrismaClient } from "../database.js";
import { StaffType } from "../db";

export class PlayerAgingRetirementService {

  /**
   * Age generation ranges for different contexts
   */
  static readonly AGE_RANGES = {
    TRYOUT_MIN: 16,
    TRYOUT_MAX: 20,
    FREE_AGENT_MIN: 18,
    FREE_AGENT_MAX: 35,
    MANDATORY_RETIREMENT: 45
  };

  /**
   * Player development configuration
   */
  static readonly DEVELOPMENT_CONFIG = {
    BASE_PROGRESSION_CHANCE: 2, // 2% base chance for any stat to improve
    POTENTIAL_MODIFIERS: {
      1: 5,   // 1-star potential: +5%
      2: 5,   // 1.5-star potential: +5%
      3: 10,  // 2-star potential: +10%
      4: 10,  // 2.5-star potential: +10%
      5: 20,  // 3-star potential: +20%
      6: 20,  // 3.5-star potential: +20%
      7: 30,  // 4-star potential: +30%
      8: 30,  // 4.5-star potential: +30%
      9: 40,  // 5-star potential: +40%
      10: 40  // 5-star potential: +40%
    },
    AGE_MODIFIERS: {
      YOUTH_BONUS: 15,    // Ages 16-23: +15%
      PRIME_BONUS: 5,     // Ages 24-30: +5%
      VETERAN_PENALTY: -20 // Ages 31+: -20%
    },
    USAGE_MODIFIER_RATE: 5, // (GamesPlayed / 14) * 5%
    DECLINE_RATE: 2.5, // (age - 30) * 2.5% for decline chance
    PHYSICAL_STATS: ['speed', 'agility', 'power'],
    SKILL_STATS: ['throwing', 'catching', 'kicking', 'leadership'],
    DECLINE_WEIGHTS: {
      speed: 2,    // Speed is twice as likely to decline
      agility: 2,  // Agility is twice as likely to decline  
      power: 1     // Power has normal decline chance
    }
  };

  /**
   * Retirement chance by age
   */
  static readonly RETIREMENT_CHANCES = {
    35: 5,
    36: 8,
    37: 12,
    38: 18,
    39: 25,
    40: 35,
    41: 50,
    42: 65,
    43: 80,
    44: 95,
    45: 100
  };

  /**
   * Calculate progression chance for a specific stat
   */
  static async calculateProgressionChance(
    player: any,
    statName: string,
    gamesPlayedLastSeason: number = 0
  ): Promise<number> {
    const prisma = await getPrismaClient();
    const baseChance = this.DEVELOPMENT_CONFIG.BASE_PROGRESSION_CHANCE;
    
    // Get potential modifier based on stat's potential rating
    const statPotential = this.getStatPotential(player, statName);
    const potentialModifier = (this.DEVELOPMENT_CONFIG.POTENTIAL_MODIFIERS as any)[statPotential] || 0;
    
    // Age modifier
    const age = player.age || 20;
    let ageModifier = 0;
    if (age >= 16 && age <= 23) {
      ageModifier = this.DEVELOPMENT_CONFIG.AGE_MODIFIERS.YOUTH_BONUS;
    } else if (age >= 24 && age <= 30) {
      ageModifier = this.DEVELOPMENT_CONFIG.AGE_MODIFIERS.PRIME_BONUS;
    } else if (age >= 31) {
      ageModifier = this.DEVELOPMENT_CONFIG.AGE_MODIFIERS.VETERAN_PENALTY;
    }
    
    // Usage modifier based on games played
    const usageModifier = Math.min(gamesPlayedLastSeason, 14) / 14 * this.DEVELOPMENT_CONFIG.USAGE_MODIFIER_RATE;
    
    // TrainerBonus - Get team trainers and calculate bonus based on their effectiveness
    let trainerBonus = 0;
    if (player.teamId) {
      try {
        const trainers = await prisma.staff.findMany({
          where: {
            teamId: player.teamId,
            type: 'PHYSICAL_TRAINER' as StaffType
          }
        });
        
        // Calculate trainer effectiveness based on stat type
        let relevantTrainerRating = 0;
        if (this.DEVELOPMENT_CONFIG.PHYSICAL_STATS.includes(statName)) {
          // Physical stats improved by Physical Trainer
          const physicalTrainer = trainers.find((t: any) => t.type === ('PHYSICAL_TRAINER' as StaffType));
          relevantTrainerRating = physicalTrainer?.physiology || 0;
        } else if (['throwing', 'catching'].includes(statName)) {
          // Passing stats improved by Offensive Trainer  
          const offensiveTrainer = trainers.find((t: any) => t.type === ('TACTICAL_ANALYST' as StaffType));
          relevantTrainerRating = offensiveTrainer?.tactics || 0;
        } else if (['leadership', 'kicking'].includes(statName)) {
          // Mental/special stats improved by Defensive Trainer
          const defensiveTrainer = trainers.find((t: any) => t.type === ('MOTIVATIONAL_COACH' as StaffType));
          relevantTrainerRating = defensiveTrainer?.motivation || 0;
        }
        
        // TrainerBonus = (TrainerRating / 40) * 10% max bonus
        trainerBonus = (relevantTrainerRating / 40) * 10;
      } catch (error) {
        console.error('Error calculating trainer bonus:', error);
        // Continue with 0 trainer bonus if error occurs
      }
    }
    
    const totalChance = baseChance + potentialModifier + ageModifier + usageModifier + trainerBonus;
    return Math.max(0, Math.min(100, totalChance));
  }

  /**
   * Get stat potential rating (1-10 scale for half-stars)
   */
  static getStatPotential(player: any, statName: string): number {
    // Use overallPotentialStars as baseline, adjust per stat if needed
    const basePotential = player.overallPotentialStars || 5.0;
    return Math.round(basePotential * 2); // Convert to 1-10 scale
  }

  /**
   * Get stat cap based on potential
   */
  static getStatCap(potentialRating: number): number {
    // 1-star = 20 max, 2-star = 24 max, 3-star = 28 max, 4-star = 32 max, 5-star = 40 max
    const starLevel = Math.ceil(potentialRating / 2);
    return Math.min(40, 16 + (starLevel * 4));
  }

  /**
   * Calculate decline chance for veteran players
   */
  static calculateDeclineChance(age: number): number {
    if (age < 31) return 0;
    return (age - 30) * this.DEVELOPMENT_CONFIG.DECLINE_RATE;
  }

  /**
   * Calculate retirement chance
   */
  static calculateRetirementChance(
    age: number,
    careerInjuries: number = 0,
    gamesPlayedLastSeason: number = 0
  ): number {
    if (age < 35) return 0;
    if (age >= 45) return 100;
    
    const baseChance = (this.RETIREMENT_CHANCES as any)[age] || 0;
    const injuryModifier = careerInjuries * 2;
    
    let playingTimeModifier = 0;
    if (gamesPlayedLastSeason < 5) {
      playingTimeModifier = 15;
    } else if (gamesPlayedLastSeason < 10) {
      playingTimeModifier = 5;
    }
    
    return Math.min(100, baseChance + injuryModifier + playingTimeModifier);
  }

  /**
   * Process stat progression for a player
   */
  static async processPlayerProgression(
    playerId: string,
    season: number,
    gamesPlayedLastSeason: number = 0
  ): Promise<{
    progressions: Array<{ stat: string; oldValue: number; newValue: number; chance: number; roll: number }>;
    milestones: Array<{ type: string; description: string }>;
  }> {
    const prisma = await getPrismaClient();
    const player = await prisma.player.findFirst({
      where: { id: parseInt(playerId, 10) }
    });
    if (!player) {
      throw new Error('Player not found');
    }

    const progressions = [];
    const milestones = [];
    
    // Core stats to check for progression
    const coreStats = ['speed', 'agility', 'power', 'throwing', 'catching', 'kicking', 'leadership'];
    
    for (const statName of coreStats) {
      const currentValue = (player as any)[statName] || 0;
      const potentialRating = this.getStatPotential(player, statName);
      const statCap = this.getStatCap(potentialRating);
      
      // Skip if already at cap
      if (currentValue >= statCap) continue;
      
      // Physical stats can't improve for players 34+
      const isPhysicalStat = this.DEVELOPMENT_CONFIG.PHYSICAL_STATS.includes(statName);
      if (isPhysicalStat && player.age >= 34) continue;
      
      const progressionChance = await this.calculateProgressionChance(player, statName, gamesPlayedLastSeason);
      const roll = Math.random() * 100;
      
      const success = roll < progressionChance;
      const newValue = success ? Math.min(statCap, currentValue + 1) : currentValue;
      
      // Record development history (commenting out until schema updated)
      /* const developmentRecord: InsertPlayerDevelopmentHistory = {
        playerId,
        season,
        developmentType: 'progression',
        statChanged: statName,
        oldValue: currentValue,
        newValue,
        progressionChance,
        actualRoll: roll,
        success,
        ageAtTime: player.age || 20,
        gamesPlayedLastSeason,
        potentialAtTime: player.potentialRating || 0
      };
      await prisma.playerDevelopmentHistory.create({
        data: developmentRecord
      }); */
      
      if (success) {
        progressions.push({
          stat: statName,
          oldValue: currentValue,
          newValue,
          chance: progressionChance,
          roll
        });
        
        // Update player stat
        await prisma.player.update({
          where: { id: parseInt(playerId, 10) },
          data: { [statName]: newValue }
        });
        
        // Check for milestones
        if (newValue >= 35 && currentValue < 35) {
          milestones.push({
            type: 'elite_performance',
            description: `Reached elite level in ${statName} (35+)`
          });
        }
        
        if (newValue === statCap) {
          milestones.push({
            type: 'peak_potential',
            description: `Reached maximum potential in ${statName} (${statCap})`
          });
        }
      }
    }
    
    return { progressions, milestones };
  }

  /**
   * Process stat decline for veteran players
   */
  static async processPlayerDecline(
    playerId: string,
    season: number
  ): Promise<{
    declines: Array<{ stat: string; oldValue: number; newValue: number; chance: number; roll: number }>;
  }> {
    const prisma = await getPrismaClient();
    const player = await prisma.player.findFirst({
      where: { id: parseInt(playerId, 10) }
    });
    if (!player) {
      throw new Error('Player not found');
    }

    const declines: Array<{stat: string, oldValue: number, newValue: number, chance: number, roll: number}> = [];
    const age = player.age || 20;
    
    if (age < 31) return { declines };
    
    const declineChance = this.calculateDeclineChance(age);
    const roll = Math.random() * 100;
    
    if (roll < declineChance) {
      // Select random physical stat to decline, weighted
      const weightedStats: string[] = [];
      this.DEVELOPMENT_CONFIG.PHYSICAL_STATS.forEach(stat => {
        const weight = this.DEVELOPMENT_CONFIG.DECLINE_WEIGHTS[stat as keyof typeof this.DEVELOPMENT_CONFIG.DECLINE_WEIGHTS] || 1;
        for (let i = 0; i < weight; i++) {
          weightedStats.push(stat);
        }
      });
      
      const selectedStat = weightedStats[Math.floor(Math.random() * weightedStats.length)];
      const currentValue = (player as any)[selectedStat] || 0;
      const newValue = Math.max(1, currentValue - 1);
      
      // Record decline (commenting out until schema updated)
      /* const declineRecord: InsertPlayerDevelopmentHistory = {
        playerId,
        season,
        developmentType: 'decline',
        statChanged: selectedStat,
        oldValue: currentValue,
        newValue,
        progressionChance: declineChance,
        actualRoll: roll,
        success: true,
        ageAtTime: age,
        gamesPlayedLastSeason: 0,
        potentialAtTime: player.potentialRating || 0
      };
      await prisma.playerDevelopmentHistory.create({
        data: declineRecord
      }); */
      
      // Update player stat
      await prisma.player.update({
        where: { id: parseInt(playerId, 10) },
        data: { [selectedStat]: newValue }
      });
      
      declines.push({
        stat: selectedStat,
        oldValue: currentValue,
        newValue,
        chance: declineChance,
        roll
      });
    }
    
    return { declines };
  }

  /**
   * Process retirement check for veteran players
   */
  static async processRetirementCheck(
    playerId: string,
    season: number
  ): Promise<{
    retired: boolean;
    retirementChance: number;
    roll: number;
    reason?: string;
  }> {
    const prisma = await getPrismaClient();
    const player = await prisma.player.findFirst({
      where: { id: parseInt(playerId, 10) }
    });
    if (!player) {
      throw new Error('Player not found');
    }

    const age = player.age || 20;
    const careerInjuries = player.careerInjuries || 0;
    const gamesPlayedLastSeason = player.gamesPlayedLastSeason || 0;
    
    // Mandatory retirement at 45
    if (age >= this.AGE_RANGES.MANDATORY_RETIREMENT) {
      await this.retirePlayer(playerId, season, 'mandatory_age');
      return {
        retired: true,
        retirementChance: 100,
        roll: 0,
        reason: 'Mandatory retirement at age 45'
      };
    }
    
    const retirementChance = this.calculateRetirementChance(age, careerInjuries, gamesPlayedLastSeason);
    
    if (retirementChance === 0) {
      return { retired: false, retirementChance: 0, roll: 0 };
    }
    
    const roll = Math.random() * 100;
    const retired = roll < retirementChance;
    
    let reason = 'voluntary_retirement';
    if (retired) {
      if (careerInjuries >= 5) reason = 'injury_forced';
      if (gamesPlayedLastSeason < 5) reason = 'lack_of_playing_time';
      
      await this.retirePlayer(playerId, season, reason);
    }
    
    // Record retirement attempt (commenting out until schema updated)
    /* const retirementRecord: InsertPlayerDevelopmentHistory = {
      playerId,
      season,
      developmentType: 'retirement',
      statChanged: null,
      oldValue: null,
      newValue: null,
      progressionChance: retirementChance,
      actualRoll: roll,
      success: retired,
      ageAtTime: age,
      gamesPlayedLastSeason,
      potentialAtTime: player.potentialRating || 0
    };
    await prisma.playerDevelopmentHistory.create({
      data: retirementRecord
    }); */
    
    return {
      retired,
      retirementChance,
      roll,
      reason: retired ? reason : undefined
    };
  }

  /**
   * Retire a player
   */
  static async retirePlayer(playerId: string, season: number, reason: string): Promise<void> {
    const prisma = await getPrismaClient();
    const player = await prisma.player.findFirst({
      where: { id: parseInt(playerId, 10) }
    });
    if (!player) return;
    
    // Create retirement milestone (commenting out until schema updated)
    /* await prisma.playerCareerMilestone.create({
      data: {
        playerId,
        milestoneType: 'retirement',
        season,
        description: `Retired at age ${player.age} due to ${reason.replace('_', ' ')}`,
        statsSnapshot: {
          age: player.age,
          speed: player.speed,
          agility: player.agility,
          power: player.power,
          throwing: player.throwing,
          catching: player.catching,
          kicking: player.kicking,
          leadership: player.leadership,
          // stamina: player.stamina, // Property removed from schema
          careerInjuries: player.careerInjuries,
          gamesPlayedLastSeason: player.gamesPlayedLastSeason
        },
        significance: reason === 'mandatory_age' ? 2 : reason === 'injury_forced' ? 4 : 3
      }
    }); */
    
    // Remove player from team (retirement)
    await prisma.player.update({
      where: { id: parseInt(playerId, 10) },
      data: { 
        teamId: 0 // Remove from team (use 0 instead of null)
      }
    });
  }

  /**
   * Process end-of-season development for all players on a team
   */
  static async processTeamEndOfSeasonDevelopment(
    teamId: string,
    season: number
  ): Promise<{
    totalPlayers: number;
    progressions: number;
    declines: number;
    retirements: Array<{ playerId: string; playerName: string; age: number; reason: string }>;
    milestones: Array<{ playerId: string; playerName: string; type: string; description: string }>;
  }> {
    const prisma = await getPrismaClient();
    const teamPlayers = await prisma.player.findMany({
      where: { teamId: parseInt(teamId, 10) }
    });

    const results = {
      totalPlayers: teamPlayers.length,
      progressions: 0,
      declines: 0,
      retirements: [],
      milestones: []
    };

    for (const player of teamPlayers) {
      try {
        // 1. Process progression
        const progression = await this.processPlayerProgression(
          player.id.toString(),
          season,
          player.gamesPlayedLastSeason || 0
        );
        
        results.progressions += progression.progressions.length;
        
        // Add progression milestones
        progression.milestones.forEach(milestone => {
          (results.milestones as any[]).push({
            playerId: player.id.toString(),
            playerName: `${player.firstName} ${player.lastName}`,
            type: milestone.type,
            description: milestone.description
          });
        });

        // 2. Process decline (if not retired)
        const decline = await this.processPlayerDecline(player.id.toString(), season);
        results.declines += decline.declines.length;

        // 3. Process retirement check (if not retired)
        const retirement = await this.processRetirementCheck(player.id.toString(), season);
        if (retirement.retired) {
          (results.retirements as any[]).push({
            playerId: player.id.toString(),
            playerName: `${player.firstName} ${player.lastName}`,
            age: player.age || 0,
            reason: retirement.reason || 'unknown'
          });
        }

        // 4. Age increment and reset games played
        await prisma.player.update({
          where: { id: player.id },
          data: {
            age: (player.age || 20) + 1,
            gamesPlayedLastSeason: 0
          }
        });

      } catch (error) {
        console.error(`Error processing development for player ${player.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Process league-wide end-of-season development
   */
  static async processLeagueEndOfSeasonDevelopment(season: number): Promise<{
    teamsProcessed: number;
    totalPlayers: number;
    totalProgressions: number;
    totalDeclines: number;
    totalRetirements: number;
    retirementsByReason: Record<string, number>;
  }> {
    const prisma = await getPrismaClient();
    const allActivePlayers = await prisma.player.findMany({
      where: {
        teamId: {
          not: 0
        }
      }
    });

    const results = {
      teamsProcessed: 0,
      totalPlayers: allActivePlayers.length,
      totalProgressions: 0,
      totalDeclines: 0,
      totalRetirements: 0,
      retirementsByReason: {}
    };

    // Group players by team
    const playersByTeam = allActivePlayers.reduce((acc: any, player: any) => {
      if (player.teamId) {
        if (!acc[player.teamId]) acc[player.teamId] = [];
        acc[player.teamId].push(player);
      }
      return acc;
    }, {} as Record<number, any[]>);

    // Process each team
    for (const [teamId, teamPlayers] of Object.entries(playersByTeam)) {
      try {
        const teamResults = await this.processTeamEndOfSeasonDevelopment(teamId, season);
        
        results.teamsProcessed++;
        results.totalProgressions += teamResults.progressions;
        results.totalDeclines += teamResults.declines;
        results.totalRetirements += teamResults.retirements.length;
        
        // Count retirements by reason
        teamResults.retirements.forEach((retirement: any) => {
          const reason = retirement.reason || 'unknown';
          (results.retirementsByReason as any)[reason] = ((results.retirementsByReason as any)[reason] || 0) + 1;
        });
        
      } catch (error) {
        console.error(`Error processing team ${teamId}:`, error);
      }
    }

    return results;
  }

  /**
   * Generate player with appropriate age for context
   */
  static generatePlayerAge(context: 'tryout' | 'free_agent' | 'general'): number {
    switch (context) {
      case 'tryout':
        return Math.floor(Math.random() * (this.AGE_RANGES.TRYOUT_MAX - this.AGE_RANGES.TRYOUT_MIN + 1)) + this.AGE_RANGES.TRYOUT_MIN;
      
      case 'free_agent':
        return Math.floor(Math.random() * (this.AGE_RANGES.FREE_AGENT_MAX - this.AGE_RANGES.FREE_AGENT_MIN + 1)) + this.AGE_RANGES.FREE_AGENT_MIN;
      
      default:
        return Math.floor(Math.random() * (this.AGE_RANGES.FREE_AGENT_MAX - this.AGE_RANGES.FREE_AGENT_MIN + 1)) + this.AGE_RANGES.FREE_AGENT_MIN;
    }
  }

  /**
   * Get player development statistics (simplified without development history tables)
   */
  static async getPlayerDevelopmentStats(playerId: string): Promise<{
    totalProgressions: number;
    totalDeclines: number;
    progressionsByAge: Record<number, number>;
    declinesByAge: Record<number, number>;
    developmentHistory: any[];
    careerMilestones: any[];
  }> {
    // Note: Development history tables not yet implemented in schema
    // Return empty statistics for now
    return {
      totalProgressions: 0,
      totalDeclines: 0,
      progressionsByAge: {},
      declinesByAge: {},
      developmentHistory: [],
      careerMilestones: []
    };
  }

  /**
   * Simulate aging for testing purposes
   */
  static async simulatePlayerAging(
    playerId: string,
    numberOfSeasons: number,
    avgGamesPerSeason: number = 10
  ): Promise<{
    startingStats: any;
    endingStats: any;
    developmentSummary: any;
    retired: boolean;
    retirementAge?: number;
  }> {
    const prisma = await getPrismaClient();
    const startingPlayer = await prisma.player.findFirst({
      where: { id: parseInt(playerId, 10) }
    });
    if (!startingPlayer) {
      throw new Error('Player not found');
    }

    const startingStats = {
      age: startingPlayer.age,
      speed: startingPlayer.speed,
      agility: startingPlayer.agility,
      power: startingPlayer.power,
      throwing: startingPlayer.throwing,
      catching: startingPlayer.catching,
      kicking: startingPlayer.kicking,
      leadership: startingPlayer.leadership
      // stamina: startingPlayer.stamina // Property removed from schema
    };

    let totalProgressions = 0;
    let totalDeclines = 0;
    let retired = false;
    let retirementAge;

    for (let season = 1; season <= numberOfSeasons; season++) {
      if (retired) break;

      const gamesPlayed = Math.floor(Math.random() * 5) + avgGamesPerSeason - 2; // Some variance
      
      const progression = await this.processPlayerProgression(playerId, season, gamesPlayed);
      totalProgressions += progression.progressions.length;

      const decline = await this.processPlayerDecline(playerId, season);
      totalDeclines += decline.declines.length;

      const retirement = await this.processRetirementCheck(playerId, season);
      if (retirement.retired) {
        retired = true;
        retirementAge = (startingPlayer.age || 20) + season;
      }

      // Age increment
      await prisma.player.update({
        where: { id: parseInt(playerId, 10) },
        data: {
          age: (startingPlayer.age || 20) + season,
          gamesPlayedLastSeason: 0
        }
      });
    }

    const endingPlayer = await prisma.player.findFirst({
      where: { id: parseInt(playerId, 10) }
    });
    
    return {
      startingStats,
      endingStats: {
        age: endingPlayer?.age,
        speed: endingPlayer?.speed,
        agility: endingPlayer?.agility,
        power: endingPlayer?.power,
        throwing: endingPlayer?.throwing,
        catching: endingPlayer?.catching,
        kicking: endingPlayer?.kicking,
        leadership: endingPlayer?.leadership,
        // stamina: endingPlayer?.stamina // Property removed from schema
      },
      developmentSummary: {
        totalProgressions,
        totalDeclines,
        seasonsSimulated: numberOfSeasons
      },
      retired,
      retirementAge
    };
  }
}