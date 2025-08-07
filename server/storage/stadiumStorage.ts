import { prisma } from '../db';
import { PrismaClient, Stadium } from '../../generated/prisma';

export class StadiumStorage {
  async createStadium(stadiumData: {
    teamId: number;
    capacity?: number;
    concessionsLevel?: number;
    parkingLevel?: number;
    vipSuitesLevel?: number;
    merchandisingLevel?: number;
    lightingScreensLevel?: number;
  }): Promise<Stadium> {
    const newStadium = await prisma.stadium.create({
      data: {
        teamId: stadiumData.teamId,
        capacity: stadiumData.capacity || 5000,
        concessionsLevel: stadiumData.concessionsLevel || 1,
        parkingLevel: stadiumData.parkingLevel || 1,
        vipSuitesLevel: stadiumData.vipSuitesLevel || 1,
        merchandisingLevel: stadiumData.merchandisingLevel || 1,
        lightingScreensLevel: stadiumData.lightingScreensLevel || 1,
      },
      include: {
        team: { select: { name: true } }
      }
    });
    return newStadium;
  }

  async getStadiumById(id: number): Promise<Stadium | null> {
    const stadium = await prisma.stadium.findUnique({
      where: { id },
      include: {
        team: { select: { name: true } }
      }
    });
    return stadium;
  }

  async getTeamStadium(teamId: number): Promise<Stadium | null> {
    const stadium = await prisma.stadium.findFirst({
      where: { teamId },
      include: {
        team: { select: { name: true } }
      }
    });
    return stadium;
  }

  async updateStadium(id: number, updates: Partial<Stadium>): Promise<Stadium | null> {
    try {
      const updatedStadium = await prisma.stadium.update({
        where: { id },
        data: updates,
        include: {
          team: { select: { name: true } }
        }
      });
      return updatedStadium;
    } catch (error) {
      console.warn(`Stadium with ID ${id} not found for update.`);
      return null;
    }
  }

  async updateTeamStadium(teamId: number, updates: Partial<Stadium>): Promise<Stadium | null> {
    try {
      const stadium = await prisma.stadium.findFirst({
        where: { teamId }
      });
      
      if (!stadium) {
        console.warn(`Stadium for team ${teamId} not found.`);
        return null;
      }

      const updatedStadium = await prisma.stadium.update({
        where: { id: stadium.id },
        data: updates,
        include: {
          team: { select: { name: true } }
        }
      });
      return updatedStadium;
    } catch (error) {
      console.warn(`Stadium for team ${teamId} not found for update.`);
      return null;
    }
  }

  async deleteStadium(id: number): Promise<boolean> {
    try {
      await prisma.stadium.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.warn(`Stadium with ID ${id} not found for deletion.`);
      return false;
    }
  }
}

export const stadiumStorage = new StadiumStorage();