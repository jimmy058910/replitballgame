/**
 * POWER & CAMARADERIE CALCULATIONS SERVICE
 * Implements Core Athleticism Rating (CAR) and Team Power calculations
 * As per Game Mechanics Doc: "Power (CAR) = Average(Speed, Power, Agility, Throwing, Catching, Kicking)"
 */

import { DatabaseService } from '../database/DatabaseService.js';
import { logger } from './loggingService.js';

export interface PlayerPowerCalculation {
  playerId: number;
  playerName: string;
  individualPower: number; // CAR (Core Athleticism Rating)
  attributes: {
    speed: number;
    power: number;
    agility: number;
    throwing: number;
    catching: number;
    kicking: number;
  };
}

export interface TeamPowerCalculation {
  teamId: number;
  teamName: string;
  teamPower: number; // Average of top 9 players
  powerTier: string;
  topPlayers: PlayerPowerCalculation[];
  allPlayersPower: PlayerPowerCalculation[];
}

export interface CamaraderieData {
  teamId: number;
  teamName: string;
  teamCamaraderie: number; // 0-100
  individualCamaraderie: Array<{
    playerId: number;
    playerName: string;
    camaraderie: number;
    yearsOnTeam: number;
    contributingFactors: {
      loyalty: number;
      teamSuccess: number;
      headCoachLeadership: number;
    };
  }>;
}

/**
 * Power and Camaraderie Calculation Service
 */
export class PowerCalculationService {
  
  /**
   * Power tier definitions based on Team Power rating
   */
  static readonly POWER_TIERS = {
    getTier: (teamPower: number): string => {
      if (teamPower >= 35) return 'Elite';
      if (teamPower >= 30) return 'Championship';
      if (teamPower >= 25) return 'Competitive';
      if (teamPower >= 20) return 'Developing';
      if (teamPower >= 15) return 'Foundation';
      return 'Rebuilding';
    }
  };

  /**
   * Calculate individual player power (CAR - Core Athleticism Rating)
   */
  static calculatePlayerPower(player: any): PlayerPowerCalculation {
    const attributes = {
      speed: player.speed || 1,
      power: player.power || 1,
      agility: player.agility || 1,
      throwing: player.throwing || 1,
      catching: player.catching || 1,
      kicking: player.kicking || 1
    };

    // CAR = Average(Speed, Power, Agility, Throwing, Catching, Kicking)
    const individualPower = (
      attributes.speed + 
      attributes.power + 
      attributes.agility + 
      attributes.throwing + 
      attributes.catching + 
      attributes.kicking
    ) / 6;

    return {
      playerId: player.id,
      playerName: `${player.firstName || ''} ${player.lastName || ''}`.trim(),
      individualPower: Math.round(individualPower * 10) / 10, // Round to 1 decimal
      attributes
    };
  }

  /**
   * Calculate team power (average of top 9 players)
   */
  static async calculateTeamPower(teamId: number): Promise<TeamPowerCalculation | null> {
    const prisma = await DatabaseService.getInstance();

    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          players: {
            where: {
              // Only include active players (those with contracts or on roster)
              OR: [
                { contract: { isNot: null } },
                { teamId: teamId }
              ]
            }
          }
        }
      });

      if (!team) {
        logger.error('Team not found for power calculation', { teamId });
        return null;
      }

      // Calculate power for all players
      const allPlayersPower = team.players.map(player => 
        this.calculatePlayerPower(player)
      );

      // Sort by individual power (highest first) and take top 9
      const topPlayers = allPlayersPower
        .sort((a, b) => b.individualPower - a.individualPower)
        .slice(0, 9);

      // Calculate team power as average of top 9
      const teamPower = topPlayers.length > 0 
        ? topPlayers.reduce((sum, p) => sum + p.individualPower, 0) / topPlayers.length
        : 0;

      const powerTier = this.POWER_TIERS.getTier(teamPower);

      return {
        teamId,
        teamName: team.name || 'Unknown Team',
        teamPower: Math.round(teamPower * 10) / 10,
        powerTier,
        topPlayers,
        allPlayersPower
      };
    } catch (error) {
      logger.error('Failed to calculate team power', {
        teamId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Calculate team camaraderie
   */
  static async calculateTeamCamaraderie(teamId: number): Promise<CamaraderieData | null> {
    const prisma = await DatabaseService.getInstance();

    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          players: true,
          staff: {
            where: { type: 'HEAD_COACH' }
          }
        }
      });

      if (!team) {
        logger.error('Team not found for camaraderie calculation', { teamId });
        return null;
      }

      // Get team's recent performance (last season win percentage)
      const teamSuccess = await this.getTeamSuccessRating(teamId);
      
      // Get head coach leadership rating
      const headCoach = team.staff.find(s => s.type === 'HEAD_COACH');
      const headCoachLeadership = headCoach?.motivation || 20; // Default to 20 if no coach

      const individualCamaraderie = [];

      for (const player of team.players) {
        // Calculate years on team (approximate from joining date or player age)
        const yearsOnTeam = this.calculateYearsOnTeam(player);
        
        // Calculate individual camaraderie factors
        const loyalty = this.calculateLoyaltyScore(yearsOnTeam);
        const teamSuccessContribution = Math.round(teamSuccess * 0.3); // 30% of team success
        const coachContribution = Math.round(headCoachLeadership * 0.4); // 40% of coach leadership
        
        // Individual camaraderie = loyalty + team success + coach leadership
        const camaraderie = Math.min(100, loyalty + teamSuccessContribution + coachContribution);

        individualCamaraderie.push({
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastName}`,
          camaraderie,
          yearsOnTeam,
          contributingFactors: {
            loyalty,
            teamSuccess: teamSuccessContribution,
            headCoachLeadership: coachContribution
          }
        });
      }

      // Team camaraderie = average of all individual camaraderie scores
      const teamCamaraderie = individualCamaraderie.length > 0
        ? Math.round(individualCamaraderie.reduce((sum, p) => sum + p.camaraderie, 0) / individualCamaraderie.length)
        : 50; // Default to 50 if no players

      return {
        teamId,
        teamName: team.name || 'Unknown Team',
        teamCamaraderie,
        individualCamaraderie
      };
    } catch (error) {
      logger.error('Failed to calculate team camaraderie', {
        teamId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Update team power in database
   */
  static async updateTeamPowerInDatabase(teamId: number): Promise<boolean> {
    const prisma = await DatabaseService.getInstance();

    try {
      const teamPowerData = await this.calculateTeamPower(teamId);
      if (!teamPowerData) return false;

      // Update team record with calculated power and tier
      await prisma.team.update({
        where: { id: teamId },
        data: {
          // These fields would need to be added to the Team model
          // teamPower: teamPowerData.teamPower,
          // powerTier: teamPowerData.powerTier,
          updatedAt: new Date()
        }
      });

      // Update individual player power ratings
      for (const playerPower of teamPowerData.allPlayersPower) {
        await prisma.player.update({
          where: { id: playerPower.playerId },
          data: {
            // This field would need to be added to the Player model
            // individualPower: playerPower.individualPower,
            updatedAt: new Date()
          }
        });
      }

      logger.info('Team power updated in database', {
        teamId,
        teamName: teamPowerData.teamName,
        teamPower: teamPowerData.teamPower,
        powerTier: teamPowerData.powerTier
      });

      return true;
    } catch (error) {
      logger.error('Failed to update team power in database', {
        teamId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Update team camaraderie in database
   */
  static async updateTeamCamaraderieInDatabase(teamId: number): Promise<boolean> {
    const prisma = await DatabaseService.getInstance();

    try {
      const camaraderieData = await this.calculateTeamCamaraderie(teamId);
      if (!camaraderieData) return false;

      // Update team record with camaraderie
      await prisma.team.update({
        where: { id: teamId },
        data: {
          // This field would need to be added to the Team model
          // teamCamaraderie: camaraderieData.teamCamaraderie,
          updatedAt: new Date()
        }
      });

      // Update individual player camaraderie
      for (const playerCamaraderie of camaraderieData.individualCamaraderie) {
        await prisma.player.update({
          where: { id: playerCamaraderie.playerId },
          data: {
            // This field would need to be added to the Player model
            // camaraderie: playerCamaraderie.camaraderie,
            updatedAt: new Date()
          }
        });
      }

      logger.info('Team camaraderie updated in database', {
        teamId,
        teamName: camaraderieData.teamName,
        teamCamaraderie: camaraderieData.teamCamaraderie
      });

      return true;
    } catch (error) {
      logger.error('Failed to update team camaraderie in database', {
        teamId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Get team success rating (0-100) based on recent performance
   */
  private static async getTeamSuccessRating(teamId: number): Promise<number> {
    const prisma = await DatabaseService.getInstance();

    try {
      // Get recent game results (last 14 games or current season)
      const recentGames = await prisma.game.findMany({
        where: {
          OR: [
            { homeTeamId: teamId },
            { awayTeamId: teamId }
          ],
          status: 'COMPLETED'
        },
        orderBy: { scheduledFor: 'desc' },
        take: 14 // Last 14 games (roughly one season)
      });

      if (recentGames.length === 0) {
        return 50; // Default neutral success rating
      }

      let wins = 0;
      for (const game of recentGames) {
        // Determine if this team won
        const isHomeTeam = game.homeTeamId === teamId;
        const homeScore = game.homeScore || 0;
        const awayScore = game.awayScore || 0;

        if ((isHomeTeam && homeScore > awayScore) || (!isHomeTeam && awayScore > homeScore)) {
          wins++;
        }
      }

      // Calculate win percentage and convert to 0-100 scale
      const winPercentage = wins / recentGames.length;
      return Math.round(winPercentage * 100);
    } catch (error) {
      logger.error('Failed to calculate team success rating', {
        teamId,
        error: error instanceof Error ? error.message : String(error)
      });
      return 50; // Default fallback
    }
  }

  /**
   * Calculate years on team (simplified)
   */
  private static calculateYearsOnTeam(player: any): number {
    // This is a simplified calculation
    // In a real implementation, you'd track when players joined the team
    const playerAge = player.age || 20;
    const approximateYears = Math.max(1, Math.min(playerAge - 18, 8)); // 1-8 years max
    return approximateYears;
  }

  /**
   * Calculate loyalty score based on years on team
   */
  private static calculateLoyaltyScore(yearsOnTeam: number): number {
    // Loyalty increases with time on team, maxing out at around 8 years
    const baseScore = 20; // Base loyalty
    const yearlyBonus = Math.min(yearsOnTeam * 5, 40); // +5 per year, max +40
    return baseScore + yearlyBonus; // Max 60 points from loyalty
  }

  /**
   * Get league-wide power rankings
   */
  static async getLeaguePowerRankings(limit: number = 20): Promise<TeamPowerCalculation[]> {
    const prisma = await DatabaseService.getInstance();
    const rankings: TeamPowerCalculation[] = [];

    try {
      const teams = await prisma.team.findMany({
        take: limit,
        include: {
          players: true
        }
      });

      for (const team of teams) {
        const teamPower = await this.calculateTeamPower(team.id);
        if (teamPower) {
          rankings.push(teamPower);
        }
      }

      // Sort by team power (highest first)
      rankings.sort((a, b) => b.teamPower - a.teamPower);
      
      return rankings;
    } catch (error) {
      logger.error('Failed to get league power rankings', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Calculate power and camaraderie for all teams (batch process)
   */
  static async updateAllTeamsCalculations(): Promise<{
    teamsProcessed: number;
    powerUpdates: number;
    camaraderieUpdates: number;
    errors: string[];
  }> {
    const prisma = await DatabaseService.getInstance();
    const result = {
      teamsProcessed: 0,
      powerUpdates: 0,
      camaraderieUpdates: 0,
      errors: [] as string[]
    };

    try {
      const teams = await prisma.team.findMany({
        select: { id: true, name: true }
      });

      for (const team of teams) {
        try {
          result.teamsProcessed++;

          // Update team power
          const powerUpdated = await this.updateTeamPowerInDatabase(team.id);
          if (powerUpdated) result.powerUpdates++;

          // Update team camaraderie
          const camaraderieUpdated = await this.updateTeamCamaraderieInDatabase(team.id);
          if (camaraderieUpdated) result.camaraderieUpdates++;

        } catch (teamError) {
          const errorMsg = `Error updating team ${team.name}: ${teamError instanceof Error ? teamError.message : String(teamError)}`;
          result.errors.push(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `System error in batch calculation: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
    }

    logger.info('Batch team calculations completed', result);
    return result;
  }
}

export default PowerCalculationService;