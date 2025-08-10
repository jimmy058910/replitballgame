import { prisma } from '../db';
import { PrismaClient, Player, Team } from "@prisma/client";



export class ScoutingStorage {
  async generateTryoutCandidate(candidateData: {
    firstName: string;
    lastName: string;
    age: number;
    race: string;
    role: string;
    overallPotentialStars: number;
    speed: number;
    power: number;
    agility: number;
    throwing: number;
    catching: number;
    kicking: number;
    stamina: number;
    leadership: number;
  }): Promise<Player> {
    const newCandidate = await prisma.player.create({
      data: {
        teamId: 0, // Taxi squad placeholder
        firstName: candidateData.firstName,
        lastName: candidateData.lastName,
        age: candidateData.age,
        race: candidateData.race as any,
        role: candidateData.role as any,
        potentialRating: candidateData.overallPotentialStars,
        speed: candidateData.speed,
        power: candidateData.power,
        agility: candidateData.agility,
        throwing: candidateData.throwing,
        catching: candidateData.catching,
        kicking: candidateData.kicking,
        staminaAttribute: candidateData.stamina,
        leadership: candidateData.leadership,
        injuryStatus: 'HEALTHY',
        dailyStaminaLevel: 100,
        camaraderieScore: 50.0,
      }
    });
    return newCandidate;
  }

  async getTryoutCandidates(teamId: number): Promise<Player[]> {
    return await prisma.player.findMany({
      where: { 
        teamId: 0 // Taxi squad candidates
      },
      orderBy: [
        { potentialRating: 'desc' },
        { lastName: 'asc' }
      ]
    });
  }

  async promoteTryoutCandidate(playerId: number, teamId: number): Promise<Player | null> {
    try {
      const promotedPlayer = await prisma.player.update({
        where: { id: playerId },
        data: { teamId },
        include: {
          team: { select: { name: true } }
        }
      });
      return promotedPlayer;
    } catch (error) {
      console.warn(`Player with ID ${playerId} not found for promotion.`);
      return null;
    }
  }

  async releaseTryoutCandidate(playerId: number): Promise<boolean> {
    try {
      await prisma.player.delete({
        where: { 
          id: playerId,
          teamId: 0 // Only allow deletion of taxi squad candidates
        }
      });
      return true;
    } catch (error) {
      console.warn(`Tryout candidate with ID ${playerId} not found for release.`);
      return false;
    }
  }

  async getScoutingReport(teamId: number, targetTeamId: number): Promise<{
    team: any;
    players: any[];
    scoutQuality: string;
  }> {
    const targetTeam = await prisma.team.findUnique({
      where: { id: targetTeamId },
      include: {
        players: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            age: true,
            race: true,
            role: true,
            potentialRating: true,
            speed: true,
            power: true,
            agility: true,
            throwing: true,
            catching: true,
            kicking: true,
            staminaAttribute: true,
            leadership: true,
            injuryStatus: true,
          }
        },
        // Note: Staff system not implemented yet in schema
      }
    });

    if (!targetTeam) {
      return {
        team: null,
        players: [],
        scoutQuality: 'No Data'
      };
    }

    // Calculate scout quality based on team's scout staff (simplified for now)
    const scoutEffectiveness = 15; // Default average scouting since staff system not implemented

    let scoutQuality = 'Poor';
    if (scoutEffectiveness >= 35) scoutQuality = 'Excellent';
    else if (scoutEffectiveness >= 25) scoutQuality = 'Good';
    else if (scoutEffectiveness >= 15) scoutQuality = 'Average';

    return {
      team: targetTeam,
      players: targetTeam.players,
      scoutQuality
    };
  }

  async clearTaxiSquad(teamId: number): Promise<number> {
    const result = await prisma.player.deleteMany({
      where: { teamId: 0 } // Clear all taxi squad candidates
    });
    return result.count;
  }
}

export const scoutingStorage = new ScoutingStorage();