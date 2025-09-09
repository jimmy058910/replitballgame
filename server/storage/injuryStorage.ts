import { getPrismaClient } from '../db';
import { PrismaClient, $Enums } from "../db";
import type { Player } from '@shared/types/models';


export class InjuryStorage {
  async updatePlayerInjury(playerId: number, injuryStatus: $Enums.InjuryStatus, recoveryPointsNeeded?: number, recoveryPointsCurrent?: number): Promise<Player | null> {
    try {
      const prisma = await getPrismaClient();
      const updatedPlayer = await prisma.player.update({
        where: { id: playerId },
        data: {
          injuryStatus,
          injuryRecoveryPointsNeeded: recoveryPointsNeeded,
          injuryRecoveryPointsCurrent: recoveryPointsCurrent || 0,
        },
        include: {
          team: { select: { name: true } }
        }
      });
      return updatedPlayer;
    } catch (error) {
      console.warn(`Player with ID ${playerId} not found for injury update.`);
      return null;
    }
  }

  async getPlayerInjuries(teamId: number): Promise<Player[]> {
    const prisma = await getPrismaClient();
    return await prisma.player.findMany({
      where: {
        teamId,
        injuryStatus: {
          not: 'HEALTHY'
        }
      },
      include: {
        team: { select: { name: true } }
      },
      orderBy: { injuryRecoveryPointsNeeded: 'desc' }
    });
  }

  async updateStamina(playerId: number, staminaValue: number): Promise<Player | null> {
    try {
      const prisma = await getPrismaClient();
      const updatedPlayer = await prisma.player.update({
        where: { id: playerId },
        data: {
          staminaAttribute: staminaValue,
        },
        include: {
          team: { select: { name: true } }
        }
      });
      return updatedPlayer;
    } catch (error) {
      console.warn(`Player with ID ${playerId} not found for stamina update.`);
      return null;
    }
  }

  async healPlayer(playerId: number, recoveryPoints: number): Promise<Player | null> {
    try {
      const prisma = await getPrismaClient();
      const player = await prisma.player.findUnique({
        where: { id: playerId }
      });
      
      if (!player) {
        return null;
      }

      const newRecoveryPoints = (player.injuryRecoveryPointsCurrent || 0) + recoveryPoints;
      const recoveryNeeded = player.injuryRecoveryPointsNeeded || 0;

      let updates: any = {
        injuryRecoveryPointsCurrent: newRecoveryPoints
      };

      // If fully healed
      if (newRecoveryPoints >= recoveryNeeded) {
        updates.injuryStatus = 'Healthy';
        updates.injuryRecoveryPointsNeeded = 0;
        updates.injuryRecoveryPointsCurrent = 0;
      }

      const updatedPlayer = await prisma.player.update({
        where: { id: playerId },
        data: updates,
        include: {
          team: { select: { name: true } }
        }
      });
      return updatedPlayer;
    } catch (error) {
      console.warn(`Error healing player ${playerId}:`, error);
      return null;
    }
  }

  async getTeamStaminaReport(teamId: number): Promise<any[]> {
    const prisma = await getPrismaClient();
    return await prisma.player.findMany({
      where: { teamId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        staminaAttribute: true,
        injuryStatus: true,
        injuryRecoveryPointsNeeded: true,
        injuryRecoveryPointsCurrent: true,
      },
      orderBy: { staminaAttribute: 'asc' }
    });
  }
}

export const injuryStorage = new InjuryStorage();