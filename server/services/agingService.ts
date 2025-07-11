import { prisma } from "../db";
import type { Player } from "@shared/schema";

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
    const allPlayers = await db.select().from(players);
    console.log(`Processing aging for ${allPlayers.length} players`);

    const results: AgingResult[] = [];

    for (const player of allPlayers) {
      try {
        const result = await this.processPlayerAging(player);
        results.push(result);
      } catch (error) {
        console.error(`Error processing aging for player ${player.id}:`, error);
        results.push({
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastName}`,
          action: 'none',
          details: 'Error during processing'
        });
      }
    }

    // Reset games played last season for all players
    await db.update(players)
      .set({ gamesPlayedLastSeason: 0 });

    console.log(`Aging process complete. Processed ${results.length} players`);
    return results;
  }

  /**
   * Process aging for a single player
   */
  static async processPlayerAging(player: Player): Promise<AgingResult> {
    const playerName = `${player.firstName} ${player.lastName}`;

    // Step 1: Check for retirement (35+ only)
    if (player.age >= 35) {
      const retirementCalc = this.calculateRetirementChance(player);
      
      if (retirementCalc.willRetire) {
        // Mark player as retired by removing from team
        await db.update(players)
          .set({ 
            teamId: null,
            isStarter: false,
            isOnTaxi: false,
            age: player.age + 1
          })
          .where(eq(players.id, player.id));

        return {
          playerId: player.id,
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
        
        await db.update(players)
          .set(updateData)
          .where(eq(players.id, player.id));

        declineDetails = `${declineCalc.affectedStat} declined to ${declineCalc.statValue}`;
      }
    }

    // Step 3: Increment age for all non-retired players
    await db.update(players)
      .set({ age: player.age + 1 })
      .where(eq(players.id, player.id));

    return {
      playerId: player.id,
      playerName,
      action: declineDetails ? 'declined' : 'aged',
      details: declineDetails || `Aged to ${player.age + 1}`
    };
  }

  /**
   * Update career injuries when a player gets injured
   */
  static async incrementCareerInjuries(playerId: string): Promise<void> {
    const currentPlayer = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
    if (currentPlayer.length > 0) {
      await db.update(players)
        .set({ careerInjuries: (currentPlayer[0].careerInjuries || 0) + 1 })
        .where(eq(players.id, playerId));
    }
  }

  /**
   * Update games played this season
   */
  static async incrementGamesPlayed(playerId: string): Promise<void> {
    const currentPlayer = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
    if (currentPlayer.length > 0) {
      await db.update(players)
        .set({ gamesPlayedLastSeason: (currentPlayer[0].gamesPlayedLastSeason || 0) + 1 })
        .where(eq(players.id, playerId));
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
    const allPlayers = await db.select().from(players);
    
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
}