import { db } from '../db';
import { PrismaClient, Team, Race } from '../../generated/prisma';
import { db } from '../db';

const prisma = db; // Use shared Prisma instance

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

  async getTeamByUserId(userId: string): Promise<Team | null> {
    // First find the UserProfile by userId, then find the team by userProfileId
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
    return team;
  }

  async getTeamById(id: number): Promise<Team | null> {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        finances: true,
        stadium: true,
        players: true,
        staff: true
      }
    });
    return team;
  }

  async updateTeam(id: number, updates: Partial<Team>): Promise<Team | null> {
    try {
      const updatedTeam = await prisma.team.update({
        where: { id },
        data: updates,
        include: {
          finances: true,
          stadium: true,
          players: true,
          staff: true
        }
      });
      return updatedTeam;
    } catch (error) {
      console.warn(`Team with ID ${id} not found for update.`);
      return null;
    }
  }

  async getTeams(): Promise<Team[]> {
    return await prisma.team.findMany({
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
  }

  async getTeamsByDivision(division: number): Promise<Team[]> {
    return await prisma.team.findMany({
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
  }

  async getTeamsByDivisionAndSubdivision(division: number, subdivision: string): Promise<Team[]> {
    return await prisma.team.findMany({
      where: { 
        division,
        subdivision
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
  }

  async deleteTeam(id: number): Promise<boolean> {
    try {
      await prisma.team.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.warn(`Team with ID ${id} not found for deletion.`);
      return false;
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