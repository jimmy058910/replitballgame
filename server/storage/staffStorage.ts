import { PrismaClient, Staff, StaffType } from '../../generated/prisma';

const prisma = new PrismaClient();

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
        team: { select: { name: true } },
        contract: true
      }
    });
    return newStaff;
  }

  async getStaffById(id: number): Promise<Staff | null> {
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        team: { select: { name: true } },
        contract: true
      }
    });
    return staff;
  }

  async getStaffByTeamId(teamId: number): Promise<Staff[]> {
    return await prisma.staff.findMany({
      where: { teamId },
      include: {
        team: { select: { name: true } },
        contract: true
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
          team: { select: { name: true } },
          contract: true
        }
      });
      return updatedStaff;
    } catch (error) {
      console.warn(`Staff member with ID ${id} not found for update.`);
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
      console.warn(`Staff member with ID ${id} not found for deletion.`);
      return false;
    }
  }

  async getMedicalStaffByTeam(teamId: number): Promise<Staff[]> {
    return await prisma.staff.findMany({
      where: {
        teamId,
        type: StaffType.RECOVERY_SPECIALIST
      },
      include: {
        team: { select: { name: true } },
        contract: true
      },
      orderBy: { name: 'asc' }
    });
  }

  async getTrainersByTeam(teamId: number): Promise<Staff[]> {
    return await prisma.staff.findMany({
      where: {
        teamId,
        type: {
          in: [StaffType.PASSER_TRAINER, StaffType.RUNNER_TRAINER, StaffType.BLOCKER_TRAINER]
        }
      },
      include: {
        team: { select: { name: true } },
        contract: true
      },
      orderBy: { type: 'asc' }
    });
  }
}

export const staffStorage = new StaffStorage();