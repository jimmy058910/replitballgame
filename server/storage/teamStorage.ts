import { prisma } from '../db';
import { PrismaClient, Team, Race } from '../../generated/prisma';



export class TeamStorage {
  async createTeam(teamData: {
    name: string;
    userId: string;
    division?: number;
    subdivision?: string;
  }): Promise<Team> {
    // First, find the UserProfile by userId to get the correct id for foreign key
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: teamData.userId }
    });
    
    if (!userProfile) {
      throw new Error(`UserProfile not found for userId: ${teamData.userId}`);
    }
    
    const newTeam = await prisma.team.create({
      data: {
        name: teamData.name,
        userProfileId: userProfile.id, // Use the UserProfile's id, not the userId
        division: teamData.division || 8,
        subdivision: teamData.subdivision || "main",
        camaraderie: 50.0,
        fanLoyalty: 50.0,
      },
      include: {
        finances: true,
        stadium: true,
        players: true,
        staff: true
      }
    });

    // Create default finances and stadium
    await this.createDefaultFinancesForTeam(newTeam.id);
    await this.createDefaultStadiumForTeam(newTeam.id);

    return newTeam;
  }

  async getTeamByUserId(userId: string): Promise<any> {
    // First find the UserProfile by userId, then find the team by userProfileId
    if (!userId) {
      return null;
    }
    
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: userId }
    });
    
    if (!userProfile) {
      return null;
    }
    
    const team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id },
      include: {
        finances: true,
        stadium: true,
        players: true,
        staff: true
      }
    });
    
    // Convert BigInt fields to strings for JSON serialization
    if (team && team.finances) {
      team.finances = {
        ...team.finances,
        credits: team.finances.credits.toString(),
        projectedIncome: team.finances.projectedIncome.toString(),
        projectedExpenses: team.finances.projectedExpenses.toString(),
        lastSeasonRevenue: team.finances.lastSeasonRevenue.toString(),
        lastSeasonExpenses: team.finances.lastSeasonExpenses.toString(),
        facilitiesMaintenanceCost: team.finances.facilitiesMaintenanceCost.toString(),
      };
    }
    
    return team;
  }

  async getTeamById(id: number): Promise<any> {
    const team = await prisma.team.findUnique({
      where: { id: parseInt(id.toString()) },
      include: {
        finances: true,
        stadium: true,
        players: true,
        staff: true
      }
    });
    
    // Convert BigInt fields to strings for JSON serialization
    if (team && team.finances) {
      team.finances = {
        ...team.finances,
        credits: team.finances.credits.toString(),
        projectedIncome: team.finances.projectedIncome.toString(),
        projectedExpenses: team.finances.projectedExpenses.toString(),
        lastSeasonRevenue: team.finances.lastSeasonRevenue.toString(),
        lastSeasonExpenses: team.finances.lastSeasonExpenses.toString(),
        facilitiesMaintenanceCost: team.finances.facilitiesMaintenanceCost.toString(),
      };
    }
    
    return team;
  }

  async getAllTeamsWithStats(): Promise<any[]> {
    const teams = await prisma.team.findMany({
      include: {
        finances: true,
        stadium: true,
        players: true,
        staff: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    return teams.map(team => ({
      ...team,
      teamPower: team.players.length > 0 ? Math.round(team.players.reduce((sum, player) => {
        return sum + (player.speed + player.power + player.throwing + player.catching + player.kicking + player.stamina + player.leadership + player.agility) / 8;
      }, 0) / Math.min(team.players.length, 9)) : 0,
      teamCamaraderie: team.camaraderie || 0,
      credits: team.finances?.credits ? team.finances.credits.toString() : '0'
    }));
  }

  async updateTeam(id: number, updates: any): Promise<any> {
    try {
      const updatedTeam = await prisma.team.update({
        where: { id: parseInt(id.toString()) },
        data: updates,
        include: {
          finances: true,
          stadium: true,
          players: true,
          staff: true
        }
      });
      
      // Convert BigInt fields to strings for JSON serialization
      if (updatedTeam && updatedTeam.finances) {
        updatedTeam.finances = {
          ...updatedTeam.finances,
          credits: updatedTeam.finances.credits.toString(),
          projectedIncome: updatedTeam.finances.projectedIncome.toString(),
          projectedExpenses: updatedTeam.finances.projectedExpenses.toString(),
          lastSeasonRevenue: updatedTeam.finances.lastSeasonRevenue.toString(),
          lastSeasonExpenses: updatedTeam.finances.lastSeasonExpenses.toString(),
          facilitiesMaintenanceCost: updatedTeam.finances.facilitiesMaintenanceCost.toString(),
        };
      }
      
      return updatedTeam;
    } catch (error) {
      console.warn(`Team with ID ${id} not found for update.`);
      return null;
    }
  }

  async getTeams(): Promise<Team[]> {
    const teams = await prisma.team.findMany({
      include: {
        finances: true,
        stadium: true,
        players: true,
        staff: true
      },
      orderBy: [
        { division: 'asc' },
        { points: 'desc' },
        { wins: 'desc' }
      ]
    });
    
    // Convert BigInt fields to strings for JSON serialization
    return teams.map(team => {
      if (team.finances) {
        team.finances = {
          ...team.finances,
          credits: team.finances.credits.toString(),
          projectedIncome: team.finances.projectedIncome.toString(),
          projectedExpenses: team.finances.projectedExpenses.toString(),
          lastSeasonRevenue: team.finances.lastSeasonRevenue.toString(),
          lastSeasonExpenses: team.finances.lastSeasonExpenses.toString(),
          facilitiesMaintenanceCost: team.finances.facilitiesMaintenanceCost.toString(),
        };
      }
      return team;
    });
  }

  async getTeamsByDivision(division: number): Promise<Team[]> {
    const teams = await prisma.team.findMany({
      where: { division },
      include: {
        finances: true,
        stadium: true,
        players: true,
        staff: true
      },
      orderBy: [
        { points: 'desc' },
        { wins: 'desc' }
      ]
    });

    // Convert BigInt fields to strings for JSON serialization
    return teams.map(team => {
      if (team.finances) {
        team.finances = {
          ...team.finances,
          credits: team.finances.credits.toString(),
          projectedIncome: team.finances.projectedIncome.toString(),
          projectedExpenses: team.finances.projectedExpenses.toString(),
          lastSeasonRevenue: team.finances.lastSeasonRevenue.toString(),
          lastSeasonExpenses: team.finances.lastSeasonExpenses.toString(),
          facilitiesMaintenanceCost: team.finances.facilitiesMaintenanceCost.toString(),
        };
      }
      return team;
    });
  }

  async getTeamsByDivisionAndSubdivision(division: number, subdivision: string): Promise<Team[]> {
    const teams = await prisma.team.findMany({
      where: { 
        division: division,
        subdivision: subdivision
      },
      include: {
        finances: true,
        stadium: true,
        players: true,
        staff: true
      },
      orderBy: [
        { points: 'desc' },
        { wins: 'desc' }
      ]
    });

    // Convert BigInt fields to strings for JSON serialization
    return teams.map(team => {
      if (team.finances) {
        team.finances = {
          ...team.finances,
          credits: team.finances.credits.toString(),
          projectedIncome: team.finances.projectedIncome.toString(),
          projectedExpenses: team.finances.projectedExpenses.toString(),
          lastSeasonRevenue: team.finances.lastSeasonRevenue.toString(),
          lastSeasonExpenses: team.finances.lastSeasonExpenses.toString(),
          facilitiesMaintenanceCost: team.finances.facilitiesMaintenanceCost.toString(),
        };
      }
      return team;
    });
  }



  async deleteTeam(id: number): Promise<boolean> {
    try {
      await prisma.team.delete({
        where: { id: parseInt(id.toString()) }
      });
      return true;
    } catch (error) {
      console.warn(`Team with ID ${id} not found for deletion.`);
      return false;
    }
  }

  async getTeamSeasonalData(teamId: number): Promise<any> {
    try {
      // Get current season
      const currentSeason = await prisma.season.findFirst({
        where: { phase: 'REGULAR_SEASON' },
        orderBy: { startDate: 'desc' }
      });
      
      if (!currentSeason) {
        return {
          teamId: teamId,
          tryoutsUsed: false,
        };
      }
      
      // Check if team has tryout history for current season
      const tryoutHistory = await prisma.tryoutHistory.findUnique({
        where: {
          teamId_seasonId: {
            teamId: teamId,
            seasonId: currentSeason.id
          }
        }
      });
      
      return {
        teamId: teamId,
        tryoutsUsed: !!tryoutHistory,
        seasonId: currentSeason.id,
        tryoutHistory: tryoutHistory
      };
    } catch (error) {
      console.error('Error fetching team seasonal data:', error);
      return {
        teamId: teamId,
        tryoutsUsed: false,
      };
    }
  }

  async updateTeamSeasonalData(teamId: number, data: any): Promise<void> {
    try {
      // This method is deprecated - seasonal data should be handled through TryoutHistory
      // For backward compatibility, we'll just return success
      console.log('updateTeamSeasonalData called (deprecated) - using TryoutHistory instead');
      return;
    } catch (error) {
      console.error('Error updating team seasonal data:', error);
      throw error;
    }
  }

  async markTryoutsUsed(teamId: number): Promise<void> {
    try {
      await prisma.team.update({
        where: { id: parseInt(teamId.toString()) },
        data: {
          tryoutsUsed: true
        }
      });
    } catch (error) {
      console.error('Error marking tryouts as used:', error);
      throw error;
    }
  }

  private async createDefaultFinancesForTeam(teamId: number): Promise<void> {
    await prisma.teamFinances.create({
      data: {
        teamId,
        credits: BigInt(50000), // Starting credits
        gems: 0, // Starting gems
        projectedIncome: BigInt(0),
        projectedExpenses: BigInt(0),
        lastSeasonRevenue: BigInt(0),
        lastSeasonExpenses: BigInt(0),
        facilitiesMaintenanceCost: BigInt(0)
      }
    });
  }

  private async createDefaultStadiumForTeam(teamId: number): Promise<void> {
    await prisma.stadium.create({
      data: {
        teamId,
        capacity: 5000, // Starting capacity
        concessionsLevel: 1,
        parkingLevel: 1,
        vipSuitesLevel: 1,
        merchandisingLevel: 1,
        lightingScreensLevel: 1
      }
    });
  }
}

export const teamStorage = new TeamStorage();