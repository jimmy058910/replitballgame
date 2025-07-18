import { prisma } from "../db";
import { logInfo, logError, ErrorCreators } from "./errorService";

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
  status: 'excellent' | 'good' | 'average' | 'low' | 'poor';
  contractNegotiationBonus: number;
  inGameStatBonus: {
    catching: number;
    agility: number;
    passAccuracy: number;
    fumbleRisk: number; // New: fumble risk for poor camaraderie
  };
  developmentBonus: number; // Now percentage bonus to progression chance
  injuryReduction: number;
  tier: {
    name: string;
    range: string;
    description: string;
  };
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
   * Calculate team camaraderie as average of only roster players (not on market, not retired)
   */
  static async getTeamCamaraderie(teamId: string): Promise<number> {
    try {
      const result = await prisma.player.aggregate({
        where: {
          teamId: parseInt(teamId),
          isOnMarket: false,
          isRetired: false
        },
        _avg: {
          camaraderieScore: true
        }
      });
      
      const teamCamaraderie = Math.round(Number(result._avg.camaraderieScore) || 50);
      
      logInfo("Team camaraderie calculated", {
        teamId,
        teamCamaraderie,
        note: "Only active roster players included"
      });
      
      return teamCamaraderie;
    } catch (error) {
      logError(error as Error, undefined, { 
        teamId, 
        operation: 'getTeamCamaraderie' 
      });
      return 50; // Default camaraderie if calculation fails
    }
  }
  
  /**
   * Get comprehensive camaraderie effects for a team
   * Enhanced tier system with more detailed effects
   */
  static async getCamaraderieEffects(teamId: string): Promise<CamaraderieEffects> {
    const teamCamaraderie = await this.getTeamCamaraderie(teamId);
    
    // Determine tier and status based on enhanced system
    let status: 'excellent' | 'good' | 'average' | 'low' | 'poor';
    let tier: { name: string; range: string; description: string };
    let catching = 0, agility = 0, passAccuracy = 0, fumbleRisk = 0;
    let injuryReduction = 0;
    
    if (teamCamaraderie >= 91) {
      // Excellent (91-100): Maximum bonuses
      status = 'excellent';
      tier = { 
        name: 'Excellent', 
        range: '91-100', 
        description: 'Team is in perfect sync!' 
      };
      catching = 2;
      agility = 2;
      passAccuracy = 3; // Significant accuracy boost
      injuryReduction = 3; // 3% injury reduction
    } else if (teamCamaraderie >= 76) {
      // Good (76-90): Solid bonuses
      status = 'good';
      tier = { 
        name: 'Good', 
        range: '76-90', 
        description: 'Strong team bonds.' 
      };
      catching = 1;
      agility = 1;
      passAccuracy = 1; // Minor accuracy boost
      injuryReduction = 1.5; // 1.5% injury reduction
    } else if (teamCamaraderie >= 41) {
      // Average (41-75): No bonuses or penalties
      status = 'average';
      tier = { 
        name: 'Average', 
        range: '41-75', 
        description: 'Room for improvement.' 
      };
      // All remain 0 (no bonuses or penalties)
    } else if (teamCamaraderie >= 26) {
      // Low (26-40): Minor penalties
      status = 'low';
      tier = { 
        name: 'Low', 
        range: '26-40', 
        description: 'Some friction in the ranks.' 
      };
      catching = -1;
      agility = -1;
      passAccuracy = -1; // Minor accuracy penalty
    } else {
      // Poor (0-25): Major penalties and fumble risk
      status = 'poor';
      tier = { 
        name: 'Poor', 
        range: '0-25', 
        description: 'Team spirit is suffering.' 
      };
      catching = -2;
      agility = -2;
      passAccuracy = -3; // Significant accuracy penalty
      fumbleRisk = 2; // 2% chance of miscommunication fumbles
    }
    
    // Enhanced contract negotiation effects using the formula from requirements
    const contractNegotiationBonus = (teamCamaraderie - 50) * 0.2;
    
    // Enhanced development bonus using the new formula: (TeamCamaraderie - 50) * 0.1
    const developmentBonus = (teamCamaraderie - 50) * 0.1;
    
    return {
      teamCamaraderie,
      status,
      contractNegotiationBonus,
      inGameStatBonus: { catching, agility, passAccuracy, fumbleRisk },
      developmentBonus,
      injuryReduction,
      tier
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
      const player = await prisma.player.findFirst({
        where: {
          id: playerId
        },
        select: {
          id: true,
          camaraderieScore: true,
          age: true
        }
      });
      
      if (!player) {
        throw ErrorCreators.notFound(`Player ${playerId} not found`);
      }
      
      const oldCamaraderie = player.camaraderieScore || 50;
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
      
      // 2. Age-based loyalty bonus (older players more loyal)
      const loyaltyBonus = Math.max(0, (player.age || 18) - 18);
      factors.loyaltyBonus = loyaltyBonus;
      newCamaraderie += loyaltyBonus;
      
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
      await prisma.player.update({
        where: { id: parseInt(playerId) },
        data: { camaraderieScore: newCamaraderie }
      });
      
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
      const team = await prisma.team.findFirst({
        where: {
          id: teamId
        },
        select: {
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
      const headCoach = await prisma.staff.findFirst({
        where: {
          teamId: teamId
        },
        select: {
          coachingRating: true
        }
      });
      
      const headCoachLeadership = headCoach?.coachingRating || 20; // Default coaching rating
      
      // Determine if team won championship (placeholder - would need tournament/playoff data)
      const wonChampionship = false; // TODO: Integrate with playoff/tournament system
      
      // Get all players on the team
      const players = await prisma.player.findMany({
        where: {
          teamId: teamId
        },
        select: {
          id: true
        }
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
    fumbleRisk: number;
    status: string;
    tier: string;
  }> {
    const effects = await this.getCamaraderieEffects(teamId);
    
    logInfo("Match stat modifications applied", {
      teamId,
      teamCamaraderie: effects.teamCamaraderie,
      status: effects.status,
      statBonuses: effects.inGameStatBonus,
      tier: effects.tier.name
    });
    
    return {
      ...effects.inGameStatBonus,
      status: effects.status,
      tier: effects.tier.name
    };
  }

  /**
   * Get comprehensive camaraderie summary for a team
   */
  static async getCamaraderieSummary(teamId: string): Promise<{
    teamId: string;
    teamName: string;
    averageCamaraderie: number;
    playerCount: number;
    highCamaraderieCount: number;
    lowCamaraderieCount: number;
    effects: CamaraderieEffects;
    topPlayers: any[];
    concernPlayers: any[];
  }> {
    try {
      // Get team information
      const team = await prisma.team.findFirst({
        where: { id: teamId },
        select: { 
          id: true, 
          name: true 
        }
      });
      
      if (!team) {
        throw ErrorCreators.notFound(`Team ${teamId} not found`);
      }
      
      // Get only active roster players on the team (not on market, not retired)
      const players = await prisma.player.findMany({
        where: { 
          teamId: teamId,
          isOnMarket: false,
          isRetired: false
        },
        select: { 
          id: true, 
          firstName: true, 
          lastName: true, 
          camaraderieScore: true,
          role: true,
          age: true,
          race: true
        }
      });
      
      // Calculate team camaraderie stats
      const playerCount = players.length;
      const averageCamaraderie = playerCount > 0 ? 
        players.reduce((sum, player) => sum + (player.camaraderieScore || 50), 0) / playerCount : 50;
      
      const highCamaraderieCount = players.filter(p => (p.camaraderieScore || 50) >= 70).length;
      const lowCamaraderieCount = players.filter(p => (p.camaraderieScore || 50) <= 30).length;
      
      // Get top performers (high camaraderie)
      const topPlayers = players
        .filter(p => (p.camaraderieScore || 50) >= 70)
        .sort((a, b) => (b.camaraderieScore || 50) - (a.camaraderieScore || 50))
        .slice(0, 5);
      
      // Get players of concern (low camaraderie)
      const concernPlayers = players
        .filter(p => (p.camaraderieScore || 50) <= 30)
        .sort((a, b) => (a.camaraderieScore || 50) - (b.camaraderieScore || 50))
        .slice(0, 5);
      
      // Get camaraderie effects
      const effects = await this.getCamaraderieEffects(teamId);
      
      return {
        teamId,
        teamName: team.name,
        teamCamaraderie: Math.round(averageCamaraderie),
        playerCount,
        highMoraleCount: highCamaraderieCount,
        lowMoraleCount: lowCamaraderieCount,
        effects,
        topPerformers: topPlayers,
        concernedPlayers: concernPlayers
      };
      
    } catch (error) {
      logError(error as Error, undefined, { 
        teamId, 
        operation: 'getCamaraderieSummary' 
      });
      throw error;
    }
  }

  /**
   * Get progression bonus for a team based on camaraderie
   */
  static async getProgressionBonus(teamId: string): Promise<number> {
    const effects = await this.getCamaraderieEffects(teamId);
    return effects.developmentBonus;
  }

  /**
   * Get injury reduction for a team based on camaraderie
   */
  static async getInjuryReduction(teamId: string): Promise<number> {
    const effects = await this.getCamaraderieEffects(teamId);
    return effects.injuryReduction;
  }

  /**
   * Increment years on team for all players in a team
   */
  static async incrementYearsOnTeam(teamId: string): Promise<void> {
    try {
      await prisma.player.updateMany({
        where: { teamId: teamId },
        data: { yearsOnTeam: { increment: 1 } }
      });
        
      logInfo("Years on team incremented for all players", {
        teamId
      });
    } catch (error) {
      logError(error as Error, undefined, { 
        teamId, 
        operation: 'incrementYearsOnTeam' 
      });
      throw error;
    }
  }
  
  /**
   * Get progression bonus for a specific player based on age and team camaraderie
   * Enhanced formula: ProgressionChance += (TeamCamaraderie - 50) * 0.1
   */
  static async getPlayerProgressionBonus(teamId: string, playerAge: number): Promise<number> {
    const effects = await this.getCamaraderieEffects(teamId);
    
    // Only apply development bonus to young players (23 and under)
    if (playerAge <= 23) {
      return effects.developmentBonus;
    }
    
    return 0; // No bonus for older players
  }
  
  /**
   * Check if team qualifies for development bonus
   * @deprecated Use getPlayerProgressionBonus instead for age-specific bonuses
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
      await prisma.player.updateMany({
        where: { teamId: parseInt(teamId) },
        data: { 
          yearsOnTeam: { increment: 1 }
        }
      });
      
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
    topPerformers: any[];
    concernedPlayers: any[];
  }> {
    try {
      const effects = await this.getCamaraderieEffects(teamId);
      
      const playerStats = await prisma.player.aggregate({
        where: {
          teamId: parseInt(teamId),
          isOnMarket: false,
          isRetired: false
        },
        _count: {
          id: true
        },
        _avg: {
          age: true
        }
      });
      
      const highMoraleCount = await prisma.player.count({
        where: {
          teamId: parseInt(teamId),
          isOnMarket: false,
          isRetired: false,
          camaraderieScore: {
            gte: 70
          }
        }
      });
      
      const lowMoraleCount = await prisma.player.count({
        where: {
          teamId: parseInt(teamId),
          isOnMarket: false,
          isRetired: false,
          camaraderieScore: {
            lte: 30
          }
        }
      });
      
      // Get top performers (high camaraderie players) - only roster players
      const topPerformers = await prisma.player.findMany({
        where: {
          teamId: parseInt(teamId),
          isOnMarket: false,
          isRetired: false,
          camaraderieScore: {
            gte: 70
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          camaraderieScore: true,
          role: true,
          age: true,
          race: true
        },
        orderBy: {
          camaraderieScore: 'desc'
        },
        take: 5
      });
      
      // Get players of concern (low camaraderie) - only roster players
      const concernedPlayers = await prisma.player.findMany({
        where: {
          teamId: parseInt(teamId),
          isOnMarket: false,
          isRetired: false,
          camaraderieScore: {
            lte: 30
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          camaraderieScore: true,
          role: true,
          age: true,
          race: true
        },
        orderBy: {
          camaraderieScore: 'asc'
        },
        take: 5
      });
      
      return {
        teamCamaraderie: effects.teamCamaraderie,
        status: effects.status,
        playerCount: Number(playerStats._count.id),
        highMoraleCount: Number(highMoraleCount),
        lowMoraleCount: Number(lowMoraleCount),
        averageYearsOnTeam: Math.round(Number(playerStats._avg.age || 18) * 10) / 10,
        effects,
        topPerformers,
        concernedPlayers
      };
    } catch (error) {
      logError(error as Error, undefined, { 
        teamId, 
        operation: 'getCamaraderieSummary' 
      });
      throw error;
    }
  }

  /**
   * Update camaraderie for all players on teams after a match
   * This provides immediate feedback based on match results
   */
  static async updatePostGameCamaraderie(
    homeTeamId: string,
    awayTeamId: string,
    homeScore: number,
    awayScore: number,
    matchType: 'LEAGUE' | 'EXHIBITION' | 'TOURNAMENT'
  ): Promise<void> {
    try {
      logInfo("Starting post-game camaraderie update", {
        homeTeamId,
        awayTeamId,
        homeScore,
        awayScore,
        matchType
      });

      // Determine match outcome
      const homeWon = homeScore > awayScore;
      const isDraw = homeScore === awayScore;
      
      // Calculate camaraderie changes based on match type and outcome
      let winnerChange = 0;
      let loserChange = 0;
      let drawChange = 0;

      switch (matchType) {
        case 'LEAGUE':
          winnerChange = 2;  // +2 for league wins
          loserChange = -1;  // -1 for league losses
          drawChange = 1;    // +1 for draws
          break;
        case 'TOURNAMENT':
          winnerChange = 3;  // +3 for tournament wins (more important)
          loserChange = -2;  // -2 for tournament losses
          drawChange = 0;    // No draws in tournaments typically
          break;
        case 'EXHIBITION':
          winnerChange = 1;  // +1 for exhibition wins (less impact)
          loserChange = 0;   // No penalty for exhibition losses
          drawChange = 0;    // No change for exhibition draws
          break;
      }

      // Update home team players
      const homeChange = isDraw ? drawChange : (homeWon ? winnerChange : loserChange);
      if (homeChange !== 0) {
        await prisma.player.updateMany({
          where: {
            teamId: parseInt(homeTeamId),
            isOnMarket: false,
            isRetired: false
          },
          data: {
            camaraderieScore: {
              increment: homeChange
            }
          }
        });
        
        // Clamp values to 0-100 range
        await prisma.$executeRaw`
          UPDATE "Player" 
          SET "camaraderieScore" = LEAST(100, GREATEST(0, "camaraderieScore"))
          WHERE "teamId" = ${parseInt(homeTeamId)} AND "isOnMarket" = false AND "isRetired" = false
        `;
      }

      // Update away team players
      const awayChange = isDraw ? drawChange : (homeWon ? loserChange : winnerChange);
      if (awayChange !== 0) {
        await prisma.player.updateMany({
          where: {
            teamId: parseInt(awayTeamId),
            isOnMarket: false,
            isRetired: false
          },
          data: {
            camaraderieScore: {
              increment: awayChange
            }
          }
        });
        
        // Clamp values to 0-100 range
        await prisma.$executeRaw`
          UPDATE "Player" 
          SET "camaraderieScore" = LEAST(100, GREATEST(0, "camaraderieScore"))
          WHERE "teamId" = ${parseInt(awayTeamId)} AND "isOnMarket" = false AND "isRetired" = false
        `;
      }

      logInfo("Post-game camaraderie update completed", {
        homeTeamId,
        awayTeamId,
        homeChange,
        awayChange,
        matchType,
        result: isDraw ? 'draw' : (homeWon ? 'home_win' : 'away_win')
      });

    } catch (error) {
      logError(error as Error, undefined, { 
        homeTeamId,
        awayTeamId,
        operation: 'updatePostGameCamaraderie' 
      });
    }
  }
}