import { db } from "../db";
import { logInfo, logError, ErrorCreators } from "./errorService";
import { eq, sql } from "drizzle-orm";
import * as schema from "@shared/schema";

/**
 * Comprehensive Team & Player Camaraderie System
 * 
 * Manages individual player camaraderie and team-wide effects including:
 * - End-of-season camaraderie updates based on team performance
 * - Contract negotiation willingness adjustments
 * - In-game stat bonuses/penalties
 * - Player development and injury risk modifications
 */

export interface CamaraderieEffects {
  teamCamaraderie: number;
  status: 'in_sync' | 'neutral' | 'out_of_sorts';
  contractNegotiationBonus: number;
  inGameStatBonus: {
    catching: number;
    agility: number;
    passAccuracy: number;
  };
  developmentBonus: number;
  injuryReduction: number;
}

export interface SeasonEndCamaraderieUpdate {
  playerId: string;
  oldCamaraderie: number;
  newCamaraderie: number;
  factors: {
    decay: number;
    loyaltyBonus: number;
    winningBonus: number;
    championshipBonus: number;
    coachBonus: number;
    losingPenalty: number;
  };
}

export class CamaraderieService {
  
  /**
   * Calculate team camaraderie as average of all player camaraderie scores
   */
  static async getTeamCamaraderie(teamId: string): Promise<number> {
    try {
      const result = await db
        .select({
          avgCamaraderie: sql<number>`COALESCE(AVG(${schema.players.camaraderie}), 50)`
        })
        .from(schema.players)
        .where(eq(schema.players.teamId, teamId));
      
      return Math.round(result[0]?.avgCamaraderie || 50);
    } catch (error) {
      logError(error as Error, undefined, { teamId, operation: 'getTeamCamaraderie' });
      return 50; // Default neutral camaraderie
    }
  }
  
  /**
   * Get comprehensive camaraderie effects for a team
   */
  static async getCamaraderieEffects(teamId: string): Promise<CamaraderieEffects> {
    const teamCamaraderie = await this.getTeamCamaraderie(teamId);
    
    // Determine status
    let status: 'in_sync' | 'neutral' | 'out_of_sorts' = 'neutral';
    if (teamCamaraderie > 75) status = 'in_sync';
    else if (teamCamaraderie < 35) status = 'out_of_sorts';
    
    // Contract negotiation effects
    const contractNegotiationBonus = (teamCamaraderie - 50) * 0.2;
    
    // In-game stat effects
    let catching = 0, agility = 0, passAccuracy = 0;
    if (status === 'in_sync') {
      catching = 2;
      agility = 2;
      passAccuracy = 2; // Reduced pass inaccuracy
    } else if (status === 'out_of_sorts') {
      catching = -2;
      agility = -1;
      passAccuracy = -2; // Increased pass inaccuracy
    }
    
    // Development bonus for high camaraderie teams
    const developmentBonus = teamCamaraderie > 75 ? 5 : 0; // 5% boost to progression
    
    // Injury reduction for very high camaraderie
    const injuryReduction = teamCamaraderie > 80 ? 2 : 0; // 2% reduction in injury chance
    
    return {
      teamCamaraderie,
      status,
      contractNegotiationBonus,
      inGameStatBonus: { catching, agility, passAccuracy },
      developmentBonus,
      injuryReduction
    };
  }
  
  /**
   * Update individual player camaraderie based on end-of-season factors
   */
  static async updatePlayerCamaraderieEndOfSeason(
    playerId: string,
    teamPerformance: {
      winPercentage: number;
      wonChampionship: boolean;
    },
    headCoachLeadership: number
  ): Promise<SeasonEndCamaraderieUpdate> {
    
    try {
      // Get current player data
      const player = await db.query.players.findFirst({
        where: eq(schema.players.id, playerId),
        columns: { 
          id: true, 
          camaraderie: true, 
          yearsOnTeam: true 
        }
      });
      
      if (!player) {
        throw ErrorCreators.notFound(`Player ${playerId} not found`);
      }
      
      const oldCamaraderie = player.camaraderie || 50;
      let newCamaraderie = oldCamaraderie;
      
      // Initialize factor tracking
      const factors = {
        decay: -5,
        loyaltyBonus: 0,
        winningBonus: 0,
        championshipBonus: 0,
        coachBonus: 0,
        losingPenalty: 0
      };
      
      // 1. Apply annual decay
      newCamaraderie -= 5;
      
      // 2. Years with team loyalty bonus
      const yearsBonus = (player.yearsOnTeam || 0) * 2;
      factors.loyaltyBonus = yearsBonus;
      newCamaraderie += yearsBonus;
      
      // 3. Team success bonuses
      if (teamPerformance.wonChampionship) {
        factors.championshipBonus = 25;
        newCamaraderie += 25;
      } else if (teamPerformance.winPercentage >= 0.60) {
        factors.winningBonus = 10;
        newCamaraderie += 10;
      }
      
      // 4. Head coach leadership influence
      const coachBonus = Math.round(headCoachLeadership * 0.5);
      factors.coachBonus = coachBonus;
      newCamaraderie += coachBonus;
      
      // 5. Team failure penalty
      if (teamPerformance.winPercentage <= 0.40) {
        factors.losingPenalty = -10;
        newCamaraderie -= 10;
      }
      
      // 6. Clamp to valid range (0-100)
      newCamaraderie = Math.max(0, Math.min(100, newCamaraderie));
      
      // Update player camaraderie in database
      await db.update(schema.players)
        .set({ camaraderie: newCamaraderie })
        .where(eq(schema.players.id, playerId));
      
      logInfo("Player camaraderie updated", {
        playerId,
        oldCamaraderie,
        newCamaraderie,
        factors
      });
      
      return {
        playerId,
        oldCamaraderie,
        newCamaraderie,
        factors
      };
      
    } catch (error) {
      logError(error as Error, undefined, { 
        playerId, 
        operation: 'updatePlayerCamaraderieEndOfSeason' 
      });
      throw error;
    }
  }
  
  /**
   * Update camaraderie for all players on a team at end of season
   */
  static async updateTeamCamaraderieEndOfSeason(teamId: string): Promise<SeasonEndCamaraderieUpdate[]> {
    try {
      // Get team performance data
      const team = await db.query.teams.findFirst({
        where: eq(schema.teams.id, teamId),
        columns: { 
          wins: true, 
          losses: true, 
          draws: true 
        }
      });
      
      if (!team) {
        throw ErrorCreators.notFound(`Team ${teamId} not found`);
      }
      
      // Calculate win percentage
      const totalGames = (team.wins || 0) + (team.losses || 0) + (team.draws || 0);
      const winPercentage = totalGames > 0 ? (team.wins || 0) / totalGames : 0;
      
      // Get head coach leadership (using coachingRating)
      const headCoach = await db.query.staff.findFirst({
        where: eq(schema.staff.teamId, teamId),
        columns: { coachingRating: true }
      });
      
      const headCoachLeadership = headCoach?.coachingRating || 20; // Default coaching rating
      
      // Determine if team won championship (placeholder - would need tournament/playoff data)
      const wonChampionship = false; // TODO: Integrate with playoff/tournament system
      
      // Get all players on the team
      const players = await db.query.players.findMany({
        where: eq(schema.players.teamId, teamId),
        columns: { id: true }
      });
      
      // Update each player's camaraderie
      const updates: SeasonEndCamaraderieUpdate[] = [];
      for (const player of players) {
        const update = await this.updatePlayerCamaraderieEndOfSeason(
          player.id,
          { winPercentage, wonChampionship },
          headCoachLeadership
        );
        updates.push(update);
      }
      
      logInfo("Team camaraderie updated for end of season", {
        teamId,
        playersUpdated: updates.length,
        teamPerformance: { winPercentage, wonChampionship }
      });
      
      return updates;
      
    } catch (error) {
      logError(error as Error, undefined, { 
        teamId, 
        operation: 'updateTeamCamaraderieEndOfSeason' 
      });
      throw error;
    }
  }
  
  /**
   * Apply camaraderie effects to contract negotiation
   */
  static applyContractNegotiationEffects(
    playerId: string,
    playerCamaraderie: number,
    baseWillingnessToSign: number
  ): number {
    const camaraderieBonus = (playerCamaraderie - 50) * 0.2;
    const adjustedWillingness = baseWillingnessToSign + camaraderieBonus;
    
    logInfo("Contract negotiation camaraderie effect applied", {
      playerId,
      playerCamaraderie,
      camaraderieBonus,
      baseWillingnessToSign,
      adjustedWillingness
    });
    
    return Math.max(0, Math.min(100, adjustedWillingness));
  }
  
  /**
   * Apply temporary in-game stat modifications based on team camaraderie
   */
  static async applyMatchStatModifications(teamId: string): Promise<{
    catching: number;
    agility: number;
    passAccuracy: number;
    status: string;
  }> {
    const effects = await this.getCamaraderieEffects(teamId);
    
    logInfo("Match stat modifications applied", {
      teamId,
      teamCamaraderie: effects.teamCamaraderie,
      status: effects.status,
      statBonuses: effects.inGameStatBonus
    });
    
    return {
      ...effects.inGameStatBonus,
      status: effects.status
    };
  }
  
  /**
   * Check if team qualifies for development bonus
   */
  static async getProgressionBonus(teamId: string): Promise<number> {
    const effects = await this.getCamaraderieEffects(teamId);
    return effects.developmentBonus;
  }
  
  /**
   * Get injury risk reduction for high-camaraderie teams
   */
  static async getInjuryReduction(teamId: string): Promise<number> {
    const effects = await this.getCamaraderieEffects(teamId);
    return effects.injuryReduction;
  }
  
  /**
   * Increment years on team for all players (called during season transitions)
   */
  static async incrementYearsOnTeam(teamId: string): Promise<void> {
    try {
      await db.update(schema.players)
        .set({ 
          yearsOnTeam: sql`${schema.players.yearsOnTeam} + 1` 
        })
        .where(eq(schema.players.teamId, teamId));
      
      logInfo("Years on team incremented", { teamId });
    } catch (error) {
      logError(error as Error, undefined, { 
        teamId, 
        operation: 'incrementYearsOnTeam' 
      });
      throw error;
    }
  }
  
  /**
   * Get camaraderie summary for team management UI
   */
  static async getCamaraderieSummary(teamId: string): Promise<{
    teamCamaraderie: number;
    status: string;
    playerCount: number;
    highMoraleCount: number;
    lowMoraleCount: number;
    averageYearsOnTeam: number;
    effects: CamaraderieEffects;
  }> {
    try {
      const effects = await this.getCamaraderieEffects(teamId);
      
      const playerStats = await db
        .select({
          playerCount: sql<number>`COUNT(*)`,
          highMoraleCount: sql<number>`COUNT(CASE WHEN ${schema.players.camaraderie} >= 75 THEN 1 END)`,
          lowMoraleCount: sql<number>`COUNT(CASE WHEN ${schema.players.camaraderie} <= 35 THEN 1 END)`,
          avgYearsOnTeam: sql<number>`COALESCE(AVG(${schema.players.yearsOnTeam}), 0)`
        })
        .from(schema.players)
        .where(eq(schema.players.teamId, teamId));
      
      const stats = playerStats[0];
      
      return {
        teamCamaraderie: effects.teamCamaraderie,
        status: effects.status,
        playerCount: Number(stats.playerCount),
        highMoraleCount: Number(stats.highMoraleCount),
        lowMoraleCount: Number(stats.lowMoraleCount),
        averageYearsOnTeam: Math.round(Number(stats.avgYearsOnTeam) * 10) / 10,
        effects
      };
    } catch (error) {
      logError(error as Error, undefined, { 
        teamId, 
        operation: 'getCamaraderieSummary' 
      });
      throw error;
    }
  }
}