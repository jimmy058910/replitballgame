import { prisma } from "../db.js";
import type { Player } from "../../generated/prisma";

export interface AgingResult {
  playerId: string;
  playerName: string;
  action: 'retired' | 'declined' | 'aged' | 'none';
  details?: string;
}

export interface RetirementCalculation {
  baseAgeChance: number;
  injuryModifier: number;
  playingTimeModifier: number;
  totalChance: number;
  willRetire: boolean;
}

export interface DeclineCalculation {
  declineChance: number;
  willDecline: boolean;
  affectedStat?: string;
  statValue?: number;
}

export class AgingService {
  
  /**
   * Generate age for new players based on generation type
   */
  static generatePlayerAge(generationType: 'tryout' | 'freeAgent' | 'initial'): number {
    switch (generationType) {
      case 'tryout':
        // Tryout players: 16-20 years old
        return Math.floor(Math.random() * 5) + 16;
      case 'freeAgent':
      case 'initial':
        // Free agents and initial players: 18-35 years old
        return Math.floor(Math.random() * 18) + 18;
      default:
        return 20;
    }
  }

  /**
   * Calculate retirement chance for a player aged 35+
   */
  static calculateRetirementChance(player: Player): RetirementCalculation {
    if (player.age < 35) {
      return {
        baseAgeChance: 0,
        injuryModifier: 0,
        playingTimeModifier: 0,
        totalChance: 0,
        willRetire: false
      };
    }

    // Base age chance increases significantly with each year
    const baseAgeChances: Record<number, number> = {
      35: 5, 36: 8, 37: 12, 38: 18, 39: 25,
      40: 35, 41: 50, 42: 65, 43: 80, 44: 95
    };

    const baseAgeChance = player.age >= 45 ? 100 : (baseAgeChances[player.age] || 0);

    // Injury modifier: 2% per career injury
    const injuryModifier = (player.careerInjuries || 0) * 2;

    // Playing time modifier
    let playingTimeModifier = 0;
    const gamesPlayed = player.gamesPlayedLastSeason || 0;
    if (gamesPlayed < 5) {
      playingTimeModifier = 15;
    } else if (gamesPlayed < 10) {
      playingTimeModifier = 5;
    }

    const totalChance = baseAgeChance + injuryModifier + playingTimeModifier;
    const willRetire = Math.random() * 100 < totalChance;

    return {
      baseAgeChance,
      injuryModifier,
      playingTimeModifier,
      totalChance,
      willRetire
    };
  }

  /**
   * Calculate stat decline chance for players aged 31+
   */
  static calculateStatDecline(player: Player): DeclineCalculation {
    if (player.age < 31) {
      return {
        declineChance: 0,
        willDecline: false
      };
    }

    // Decline chance: (age - 30) * 2.5%
    const declineChance = (player.age - 30) * 2.5;
    const willDecline = Math.random() * 100 < declineChance;

    if (!willDecline) {
      return { declineChance, willDecline };
    }

    // Select stat to decline (Speed and Agility are twice as likely)
    const physicalStats = ['speed', 'speed', 'agility', 'agility', 'power'];
    const selectedStat = physicalStats[Math.floor(Math.random() * physicalStats.length)];
    
    return {
      declineChance,
      willDecline,
      affectedStat: selectedStat,
      statValue: Math.max(1, player[selectedStat as keyof Player] as number - 1)
    };
  }

  /**
   * Process end-of-season aging for all players
   */
  static async processEndOfSeasonAging(): Promise<AgingResult[]> {
    console.log('Starting end-of-season aging process...');
    
    // Get all players in the system
    const allPlayers = await prisma.player.findMany();
    console.log(`Processing aging for ${allPlayers.length} players`);

    const results: AgingResult[] = [];

    for (const player of allPlayers) {
      try {
        const result = await this.processPlayerAging(player);
        results.push(result);
      } catch (error) {
        console.error(`Error processing aging for player ${player.id}:`, error);
        results.push({
          playerId: String(player.id),
          playerName: `${player.firstName} ${player.lastName}`,
          action: 'none',
          details: 'Error during processing'
        });
      }
    }

    // Reset games played last season for all players
    await prisma.player.updateMany({
      data: { gamesPlayedLastSeason: 0 }
    });

    console.log(`Aging process complete. Processed ${results.length} players`);
    return results;
  }

  /**
   * Process aging for a single player
   */
  static async processPlayerAging(player: Player): Promise<AgingResult> {
    const playerName = `${player.firstName} ${player.lastName}`;

    // Get current season day to determine if retirements should be processed
    const currentSeason = await prisma.season.findFirst({
      orderBy: { seasonNumber: 'desc' }
    });
    
    const isOffSeason = currentSeason && currentSeason.currentDay >= 16;

    // Step 1: Check for retirement (35+ only, and only during off season - Game Day 16+)
    if (player.age >= 35 && isOffSeason) {
      const retirementCalc = this.calculateRetirementChance(player);
      
      if (retirementCalc.willRetire) {
        // Mark player as retired and age them to their retirement age
        await prisma.player.update({
          where: { id: player.id },
          data: { 
            age: player.age + 1,
            isRetired: true
          }
        });

        return {
          playerId: String(player.id),
          playerName,
          action: 'retired',
          details: `Retired at age ${player.age + 1} (${retirementCalc.totalChance}% chance)`
        };
      }
    }

    // Step 2: Check for stat decline (31+ only)
    let declineDetails = '';
    if (player.age >= 31) {
      const declineCalc = this.calculateStatDecline(player);
      
      if (declineCalc.willDecline && declineCalc.affectedStat && declineCalc.statValue !== undefined) {
        // Build update object based on which stat declined
        let updateData: any = {};
        switch (declineCalc.affectedStat) {
          case 'speed':
            updateData.speed = declineCalc.statValue;
            break;
          case 'agility':
            updateData.agility = declineCalc.statValue;
            break;
          case 'power':
            updateData.power = declineCalc.statValue;
            break;
          default:
            updateData[declineCalc.affectedStat] = declineCalc.statValue;
        }
        
        await prisma.player.update({
          where: { id: player.id },
          data: updateData
        });

        declineDetails = `${declineCalc.affectedStat} declined to ${declineCalc.statValue}`;
      }
    }

    // Step 3: Age all players by +1 year (but only during off season and if not already retired)
    let ageUpdateData: any = {};
    if (isOffSeason && !player.isRetired) {
      ageUpdateData.age = player.age + 1;
    }
    
    // Apply age update if needed
    if (Object.keys(ageUpdateData).length > 0) {
      await prisma.player.update({
        where: { id: player.id },
        data: ageUpdateData
      });
    }

    return {
      playerId: String(player.id),
      playerName,
      action: declineDetails ? 'declined' : (isOffSeason ? 'aged' : 'none'),
      details: declineDetails || (isOffSeason ? `Aged to ${player.age + 1}` : 'No aging during regular season')
    };
  }

  /**
   * Update career injuries when a player gets injured
   */
  static async incrementCareerInjuries(playerId: string): Promise<void> {
    const playerIdNumber = Number(playerId);
    const currentPlayer = await prisma.player.findFirst({
      where: { id: playerIdNumber }
    });
    if (currentPlayer) {
      await prisma.player.update({
        where: { id: playerIdNumber },
        data: { careerInjuries: (currentPlayer.careerInjuries || 0) + 1 }
      });
    }
  }

  /**
   * Update games played this season
   */
  static async incrementGamesPlayed(playerId: string): Promise<void> {
    const playerIdNumber = Number(playerId);
    const currentPlayer = await prisma.player.findFirst({
      where: { id: playerIdNumber }
    });
    if (currentPlayer) {
      await prisma.player.update({
        where: { id: playerIdNumber },
        data: { gamesPlayedLastSeason: (currentPlayer.gamesPlayedLastSeason || 0) + 1 }
      });
    }
  }

  /**
   * Get aging statistics for all players
   */
  static async getAgingStatistics(): Promise<{
    totalPlayers: number;
    retirementEligible: number;
    declineEligible: number;
    averageAge: number;
    ageDistribution: Record<string, number>;
  }> {
    const allPlayers = await prisma.player.findMany();
    
    const totalPlayers = allPlayers.length;
    const retirementEligible = allPlayers.filter(p => p.age >= 35).length;
    const declineEligible = allPlayers.filter(p => p.age >= 31).length;
    const averageAge = allPlayers.reduce((sum, p) => sum + p.age, 0) / totalPlayers;

    const ageDistribution: Record<string, number> = {};
    allPlayers.forEach(player => {
      const ageRange = `${Math.floor(player.age / 5) * 5}-${Math.floor(player.age / 5) * 5 + 4}`;
      ageDistribution[ageRange] = (ageDistribution[ageRange] || 0) + 1;
    });

    return {
      totalPlayers,
      retirementEligible,
      declineEligible,
      averageAge: Math.round(averageAge * 10) / 10,
      ageDistribution
    };
  }

  /**
   * Process daily aging for all players (called by automation system)
   */
  static async processDailyAging(): Promise<{
    playersProcessed: number;
    retirementsProcessed: number;
    playersDeclined: number;
    errors: string[];
  }> {
    console.log('[AGING SERVICE] Starting daily aging process...');
    const startTime = Date.now();
    const errors: string[] = [];
    let playersProcessed = 0;
    let retirementsProcessed = 0;
    let playersDeclined = 0;

    try {
      // Get all active players
      const allPlayers = await prisma.player.findMany({
        where: { 
          isOnMarket: false // Only process active roster players
        }
      });

      console.log(`[AGING SERVICE] Found ${allPlayers.length} players to process`);

      for (const player of allPlayers) {
        try {
          const result = await this.processPlayerAging(player);
          playersProcessed++;

          if (result.action === 'retired') {
            retirementsProcessed++;
            console.log(`[AGING SERVICE] ${result.playerName} retired: ${result.details}`);
          } else if (result.action === 'declined') {
            playersDeclined++;
            console.log(`[AGING SERVICE] ${result.playerName} declined: ${result.details}`);
          }

        } catch (error) {
          const errorMsg = `Failed to age player ${player.firstName} ${player.lastName} (${player.id}): ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[AGING SERVICE] ${errorMsg}`);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[AGING SERVICE] Completed in ${duration}ms. Processed ${playersProcessed} players, ${retirementsProcessed} retirements, ${playersDeclined} declined`);

      return {
        playersProcessed,
        retirementsProcessed,
        playersDeclined,
        errors
      };

    } catch (error) {
      console.error('[AGING SERVICE] Fatal error in daily aging:', error);
      throw error;
    }
  }
}