import { prisma } from '../db';
import { PrismaClient, Staff, StaffType } from '../../generated/prisma/index.js';



export class StaffStorage {
  async createStaff(staffData: {
    teamId: number;
    type: StaffType;
    name: string;
    level?: number;
    motivation?: number;
    development?: number;
    teaching?: number;
    physiology?: number;
    talentIdentification?: number;
    potentialAssessment?: number;
    tactics?: number;
    age?: number;
  }): Promise<Staff> {
    const newStaff = await prisma.staff.create({
      data: {
        teamId: staffData.teamId,
        type: staffData.type,
        name: staffData.name,
        level: staffData.level || 1,
        motivation: staffData.motivation || 5,
        development: staffData.development || 5,
        teaching: staffData.teaching || 5,
        physiology: staffData.physiology || 5,
        talentIdentification: staffData.talentIdentification || 5,
        potentialAssessment: staffData.potentialAssessment || 5,
        tactics: staffData.tactics || 5,
        age: staffData.age || 30,
      },
      include: {
        team: { select: { name: true } }
      }
    });

    // Recalculate team staff salaries after creating new staff
    const { teamFinancesStorage } = await import('./teamFinancesStorage');
    await teamFinancesStorage.recalculateAndSaveStaffSalaries(staffData.teamId);

    return newStaff;
  }

  async getStaffById(id: number): Promise<Staff | null> {
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        team: { select: { name: true } }
      }
    });
    return staff;
  }

  async getStaffByTeamId(teamId: number): Promise<Staff[]> {
    return await prisma.staff.findMany({
      where: { teamId },
      include: {
        team: { select: { name: true } }
      },
      orderBy: { type: 'asc' }
    });
  }

  async updateStaff(id: number, updates: Partial<Staff>): Promise<Staff | null> {
    try {
      const updatedStaff = await prisma.staff.update({
        where: { id },
        data: updates,
        include: {
          team: { select: { name: true } }
        }
      });
      return updatedStaff;
    } catch (error) {
      console.warn(`Error updating staff ${id}:`, error);
      return null;
    }
  }

  async deleteStaff(id: number): Promise<boolean> {
    try {
      await prisma.staff.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.warn(`Error deleting staff ${id}:`, error);
      return false;
    }
  }

  async getStaffByType(teamId: number, type: StaffType): Promise<Staff[]> {
    return await prisma.staff.findMany({
      where: { 
        teamId,
        type
      },
      include: {
        team: { select: { name: true } }
      }
    });
  }

  async getHeadCoach(teamId: number): Promise<Staff | null> {
    return await prisma.staff.findFirst({
      where: { 
        teamId,
        type: 'HEAD_COACH' as StaffType
      },
      include: {
        team: { select: { name: true } }
      }
    });
  }

  async getTrainers(teamId: number): Promise<Staff[]> {
    return await prisma.staff.findMany({
      where: { 
        teamId,
        type: 'TRAINER' as StaffType
      },
      include: {
        team: { select: { name: true } }
      }
    });
  }

  async getScouts(teamId: number): Promise<Staff[]> {
    return await prisma.staff.findMany({
      where: { 
        teamId,
        type: 'SCOUT' as StaffType
      },
      include: {
        team: { select: { name: true } }
      }
    });
  }

  async getRecoverySpecialists(teamId: number): Promise<Staff[]> {
    return await prisma.staff.findMany({
      where: { 
        teamId,
        type: 'RECOVERY_SPECIALIST' as StaffType
      },
      include: {
        team: { select: { name: true } }
      }
    });
  }
}

export const staffStorage = new StaffStorage();