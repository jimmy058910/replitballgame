import { PrismaClient, Contract } from '../../generated/prisma';

const prisma = new PrismaClient();

export class ContractStorage {
  async createPlayerContract(contractData: {
    playerId: number;
    teamId: number;
    salary: bigint;
    duration: number;
    contractType?: string;
    signingBonus?: bigint;
    performanceIncentives?: bigint;
  }): Promise<Contract> {
    const signedDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(signedDate.getFullYear() + contractData.duration);

    const newContract = await prisma.contract.create({
      data: {
        playerId: contractData.playerId,
        teamId: contractData.teamId,
        salary: contractData.salary,
        duration: contractData.duration,
        remainingYears: contractData.duration,
        contractType: contractData.contractType || 'PLAYER',
        signingBonus: contractData.signingBonus || BigInt(0),
        performanceIncentives: contractData.performanceIncentives || BigInt(0),
        signedDate,
        expiryDate,
        isActive: true,
      },
      include: {
        player: { select: { firstName: true, lastName: true } },
        team: { select: { name: true } },
        staff: { select: { name: true } }
      }
    });
    return newContract;
  }

  async createStaffContract(contractData: {
    staffId: number;
    teamId: number;
    salary: bigint;
    duration: number;
    contractType?: string;
    signingBonus?: bigint;
  }): Promise<Contract> {
    const signedDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(signedDate.getFullYear() + contractData.duration);

    const newContract = await prisma.contract.create({
      data: {
        staffId: contractData.staffId,
        teamId: contractData.teamId,
        salary: contractData.salary,
        duration: contractData.duration,
        remainingYears: contractData.duration,
        contractType: contractData.contractType || 'STAFF',
        signingBonus: contractData.signingBonus || BigInt(0),
        performanceIncentives: BigInt(0),
        signedDate,
        expiryDate,
        isActive: true,
      },
      include: {
        player: { select: { firstName: true, lastName: true } },
        team: { select: { name: true } },
        staff: { select: { name: true } }
      }
    });
    return newContract;
  }

  async getContractById(id: number): Promise<Contract | null> {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        player: { select: { firstName: true, lastName: true } },
        team: { select: { name: true } },
        staff: { select: { name: true } }
      }
    });
    return contract;
  }

  async getActiveContractsByPlayer(playerId: number): Promise<Contract[]> {
    return await prisma.contract.findMany({
      where: {
        playerId,
        isActive: true
      },
      include: {
        player: { select: { firstName: true, lastName: true } },
        team: { select: { name: true } },
        staff: { select: { name: true } }
      },
      orderBy: { expiryDate: 'desc' }
    });
  }

  async getActiveContractsByStaff(staffId: number): Promise<Contract[]> {
    return await prisma.contract.findMany({
      where: {
        staffId,
        isActive: true
      },
      include: {
        player: { select: { firstName: true, lastName: true } },
        team: { select: { name: true } },
        staff: { select: { name: true } }
      },
      orderBy: { expiryDate: 'desc' }
    });
  }

  async getActiveContractsByTeam(teamId: number): Promise<Contract[]> {
    return await prisma.contract.findMany({
      where: {
        teamId,
        isActive: true
      },
      include: {
        player: { select: { firstName: true, lastName: true } },
        team: { select: { name: true } },
        staff: { select: { name: true } }
      },
      orderBy: { salary: 'desc' }
    });
  }

  async getAllContractsByTeam(teamId: number): Promise<Contract[]> {
    return await prisma.contract.findMany({
      where: { teamId },
      include: {
        player: { select: { firstName: true, lastName: true } },
        team: { select: { name: true } },
        staff: { select: { name: true } }
      },
      orderBy: { signedDate: 'desc' }
    });
  }

  async updateContract(id: number, updates: Partial<Contract>): Promise<Contract | null> {
    try {
      const updatedContract = await prisma.contract.update({
        where: { id },
        data: updates,
        include: {
          player: { select: { firstName: true, lastName: true } },
          team: { select: { name: true } },
          staff: { select: { name: true } }
        }
      });
      return updatedContract;
    } catch (error) {
      console.warn(`Contract with ID ${id} not found for update.`);
      return null;
    }
  }

  async expireContract(id: number): Promise<Contract | null> {
    return await this.updateContract(id, { isActive: false });
  }

  async renewContract(id: number, newDuration: number, newSalary?: bigint): Promise<Contract | null> {
    const existingContract = await this.getContractById(id);
    if (!existingContract) {
      return null;
    }

    const newExpiryDate = new Date();
    newExpiryDate.setFullYear(new Date().getFullYear() + newDuration);

    return await this.updateContract(id, {
      duration: newDuration,
      remainingYears: newDuration,
      expiryDate: newExpiryDate,
      salary: newSalary || existingContract.salary,
      isActive: true
    });
  }

  async getExpiringContracts(teamId?: number, daysUntilExpiry: number = 30): Promise<Contract[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysUntilExpiry);

    return await prisma.contract.findMany({
      where: {
        ...(teamId ? { teamId } : {}),
        isActive: true,
        expiryDate: {
          lte: cutoffDate
        }
      },
      include: {
        player: { select: { firstName: true, lastName: true } },
        team: { select: { name: true } },
        staff: { select: { name: true } }
      },
      orderBy: { expiryDate: 'asc' }
    });
  }
}

export const contractStorage = new ContractStorage();