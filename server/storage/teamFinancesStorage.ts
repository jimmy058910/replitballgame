import { getPrismaClient } from '../database.js';
import { PrismaClient, TeamFinances } from "@prisma/client";



export class TeamFinancesStorage {
  async getTeamFinances(teamId: number): Promise<any> {
    const prisma = await getPrismaClient();
    const finances = await prisma.teamFinances.findFirst({
      where: { teamId },
      include: {
        team: { select: { name: true } }
      }
    });
    
    // Convert BigInt fields to strings for JSON serialization
    if (finances) {
      return {
        ...finances,
        credits: finances.credits?.toString() || '0',
        gems: finances.gems?.toString() || '0',
        escrowCredits: finances.escrowCredits?.toString() || '0',
        escrowGems: finances.escrowGems?.toString() || '0',
        projectedIncome: finances.projectedIncome?.toString() || '0',
        projectedExpenses: finances.projectedExpenses?.toString() || '0',
        lastSeasonRevenue: finances.lastSeasonRevenue?.toString() || '0',
        lastSeasonExpenses: finances.lastSeasonExpenses?.toString() || '0',
        facilitiesMaintenanceCost: finances.facilitiesMaintenanceCost?.toString() || '0',
      };
    }
    
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
  }): Promise<any> {
    const prisma = await getPrismaClient();
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

  async updateTeamFinances(teamId: number, updates: any): Promise<any> {
    try {
      const existingFinances = await this.getTeamFinances(teamId);
      if (!existingFinances) {
        console.warn(`Finances for team ${teamId} not found. Cannot update.`);
        return null;
      }

      // Convert string credits back to BigInt for database update
      const updateData = { ...updates };
      if (updateData.credits !== undefined) {
        updateData.credits = BigInt(updateData.credits.toString());
      }
      if (updateData.projectedIncome !== undefined) {
        updateData.projectedIncome = BigInt(updateData.projectedIncome.toString());
      }
      if (updateData.projectedExpenses !== undefined) {
        updateData.projectedExpenses = BigInt(updateData.projectedExpenses.toString());
      }
      if (updateData.lastSeasonRevenue !== undefined) {
        updateData.lastSeasonRevenue = BigInt(updateData.lastSeasonRevenue.toString());
      }
      if (updateData.lastSeasonExpenses !== undefined) {
        updateData.lastSeasonExpenses = BigInt(updateData.lastSeasonExpenses.toString());
      }
      if (updateData.facilitiesMaintenanceCost !== undefined) {
        updateData.facilitiesMaintenanceCost = BigInt(updateData.facilitiesMaintenanceCost.toString());
      }

      const updatedFinances = await prisma.teamFinances.update({
        where: { id: existingFinances.id },
        data: updateData,
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

  async upsertTeamFinances(teamId: number, data: any): Promise<any> {
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

  async addCredits(teamId: number, amount: bigint): Promise<any> {
    try {
      const existingFinances = await this.getTeamFinances(teamId);
      if (!existingFinances) {
        console.warn(`Finances for team ${teamId} not found. Cannot add credits.`);
        return null;
      }

      // Convert string credits back to BigInt for proper addition
      const currentCredits = BigInt(existingFinances.credits.toString());
      const prisma = await getPrismaClient();
      const updatedFinances = await prisma.teamFinances.update({
        where: { id: existingFinances.id },
        data: {
          credits: currentCredits + amount
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

  async deductCredits(teamId: number, amount: bigint): Promise<any> {
    try {
      const existingFinances = await this.getTeamFinances(teamId);
      if (!existingFinances) {
        console.warn(`Finances for team ${teamId} not found. Cannot deduct credits.`);
        return null;
      }

      // Convert string credits back to BigInt for proper comparison and subtraction
      const currentCredits = BigInt(existingFinances.credits.toString());
      if (currentCredits < amount) {
        console.warn(`Insufficient credits for team ${teamId}. Available: ${currentCredits}, Required: ${amount}`);
        return null;
      }

      const prisma = await getPrismaClient();
      const updatedFinances = await prisma.teamFinances.update({
        where: { id: existingFinances.id },
        data: {
          credits: currentCredits - amount
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

  async addGems(teamId: number, amount: number): Promise<any> {
    try {
      const existingFinances = await this.getTeamFinances(teamId);
      if (!existingFinances) {
        console.warn(`Finances for team ${teamId} not found. Cannot add gems.`);
        return null;
      }

      const prisma = await getPrismaClient();
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

  /**
   * Recalculate and save staff salaries for a team
   * Sums all active staff salaries and updates the team's record
   */
  async recalculateAndSaveStaffSalaries(teamId: number): Promise<void> {
    try {
      // Get all active staff members for the team
      const prisma = await getPrismaClient();
      const staffMembers = await prisma.staff.findMany({
        where: { teamId: teamId }
      });

      // Calculate total staff salaries (using level as salary base for now)
      const totalStaffSalaries = staffMembers.reduce((sum: number, staff: any) => sum + (staff.level * 1000), 0);
      const totalSalaries = totalStaffSalaries;

      // Update team finances with new projected expenses
      await this.updateTeamFinances(teamId, {
        projectedExpenses: BigInt(totalSalaries)
      });

      console.log(`Updated staff salaries for team ${teamId}: ${totalSalaries} credits`);
    } catch (error) {
      console.error(`Error recalculating staff salaries for team ${teamId}:`, error);
    }
  }
}

export const teamFinancesStorage = new TeamFinancesStorage();