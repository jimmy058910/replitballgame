import { PrismaClient, TeamFinances } from '../../generated/prisma';

const prisma = new PrismaClient();

export class TeamFinancesStorage {
  async getTeamFinances(teamId: number): Promise<TeamFinances | null> {
    const finances = await prisma.teamFinances.findFirst({
      where: { teamId },
      include: {
        team: { select: { name: true } }
      }
    });
    return finances;
  }

  async createTeamFinances(financesData: {
    teamId: number;
    credits?: bigint;
    gems?: number;
    projectedIncome?: bigint;
    projectedExpenses?: bigint;
    lastSeasonRevenue?: bigint;
    lastSeasonExpenses?: bigint;
    facilitiesMaintenanceCost?: bigint;
  }): Promise<TeamFinances> {
    const newFinances = await prisma.teamFinances.create({
      data: {
        teamId: financesData.teamId,
        credits: financesData.credits || BigInt(50000),
        gems: financesData.gems || 0,
        projectedIncome: financesData.projectedIncome || BigInt(0),
        projectedExpenses: financesData.projectedExpenses || BigInt(0),
        lastSeasonRevenue: financesData.lastSeasonRevenue || BigInt(0),
        lastSeasonExpenses: financesData.lastSeasonExpenses || BigInt(0),
        facilitiesMaintenanceCost: financesData.facilitiesMaintenanceCost || BigInt(0),
      },
      include: {
        team: { select: { name: true } }
      }
    });
    return newFinances;
  }

  async updateTeamFinances(teamId: number, updates: Partial<TeamFinances>): Promise<TeamFinances | null> {
    try {
      const existingFinances = await this.getTeamFinances(teamId);
      if (!existingFinances) {
        console.warn(`Finances for team ${teamId} not found. Cannot update.`);
        return null;
      }

      const updatedFinances = await prisma.teamFinances.update({
        where: { id: existingFinances.id },
        data: updates,
        include: {
          team: { select: { name: true } }
        }
      });
      return updatedFinances;
    } catch (error) {
      console.warn(`Error updating finances for team ${teamId}:`, error);
      return null;
    }
  }

  async upsertTeamFinances(teamId: number, data: Partial<TeamFinances>): Promise<TeamFinances> {
    const existingFinances = await this.getTeamFinances(teamId);
    
    if (existingFinances) {
      // Update existing
      return await this.updateTeamFinances(teamId, data) || existingFinances;
    } else {
      // Create new
      return await this.createTeamFinances({
        teamId,
        credits: data.credits,
        gems: data.gems,
        projectedIncome: data.projectedIncome,
        projectedExpenses: data.projectedExpenses,
        lastSeasonRevenue: data.lastSeasonRevenue,
        lastSeasonExpenses: data.lastSeasonExpenses,
        facilitiesMaintenanceCost: data.facilitiesMaintenanceCost,
      });
    }
  }

  async addCredits(teamId: number, amount: bigint): Promise<TeamFinances | null> {
    try {
      const existingFinances = await this.getTeamFinances(teamId);
      if (!existingFinances) {
        console.warn(`Finances for team ${teamId} not found. Cannot add credits.`);
        return null;
      }

      const updatedFinances = await prisma.teamFinances.update({
        where: { id: existingFinances.id },
        data: {
          credits: existingFinances.credits + amount
        },
        include: {
          team: { select: { name: true } }
        }
      });
      return updatedFinances;
    } catch (error) {
      console.warn(`Error adding credits to team ${teamId}:`, error);
      return null;
    }
  }

  async deductCredits(teamId: number, amount: bigint): Promise<TeamFinances | null> {
    try {
      const existingFinances = await this.getTeamFinances(teamId);
      if (!existingFinances) {
        console.warn(`Finances for team ${teamId} not found. Cannot deduct credits.`);
        return null;
      }

      if (existingFinances.credits < amount) {
        console.warn(`Insufficient credits for team ${teamId}. Available: ${existingFinances.credits}, Required: ${amount}`);
        return null;
      }

      const updatedFinances = await prisma.teamFinances.update({
        where: { id: existingFinances.id },
        data: {
          credits: existingFinances.credits - amount
        },
        include: {
          team: { select: { name: true } }
        }
      });
      return updatedFinances;
    } catch (error) {
      console.warn(`Error deducting credits from team ${teamId}:`, error);
      return null;
    }
  }

  async addGems(teamId: number, amount: number): Promise<TeamFinances | null> {
    try {
      const existingFinances = await this.getTeamFinances(teamId);
      if (!existingFinances) {
        console.warn(`Finances for team ${teamId} not found. Cannot add gems.`);
        return null;
      }

      const updatedFinances = await prisma.teamFinances.update({
        where: { id: existingFinances.id },
        data: {
          gems: existingFinances.gems + amount
        },
        include: {
          team: { select: { name: true } }
        }
      });
      return updatedFinances;
    } catch (error) {
      console.warn(`Error adding gems to team ${teamId}:`, error);
      return null;
    }
  }
}

export const teamFinancesStorage = new TeamFinancesStorage();