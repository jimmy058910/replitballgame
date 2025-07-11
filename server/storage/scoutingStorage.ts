import { prisma } from '../db';
import { PrismaClient, Player, Team } from '../../generated/prisma';



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
        race: candidateData.race,
        role: candidateData.role,
        overallPotentialStars: candidateData.overallPotentialStars,
        speed: candidateData.speed,
        power: candidateData.power,
        agility: candidateData.agility,
        throwing: candidateData.throwing,
        catching: candidateData.catching,
        kicking: candidateData.kicking,
        stamina: candidateData.stamina,
        leadership: candidateData.leadership,
        injuryStatus: 'Healthy',
        inGameStamina: 100,
        dailyStaminaLevel: 100,
        camaraderie: 50.0,
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
        { overallPotentialStars: 'desc' },
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
    team: Team | null;
    players: Player[];
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
            overallPotentialStars: true,
            speed: true,
            power: true,
            agility: true,
            throwing: true,
            catching: true,
            kicking: true,
            stamina: true,
            leadership: true,
            injuryStatus: true,
          }
        },
        staff: {
          where: { type: 'SCOUT' },
          select: {
            talentIdentification: true,
            potentialAssessment: true
          }
        }
      }
    });

    if (!targetTeam) {
      return {
        team: null,
        players: [],
        scoutQuality: 'No Data'
      };
    }

    // Calculate scout quality based on team's scout staff
    const scoutEffectiveness = targetTeam.staff.length > 0 
      ? (targetTeam.staff[0].talentIdentification + targetTeam.staff[0].potentialAssessment) / 2
      : 10; // Default poor scouting

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