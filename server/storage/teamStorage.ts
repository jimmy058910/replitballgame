import { prisma } from '../db';
import { PrismaClient, Team, Race } from '../../generated/prisma';

// Helper function to serialize BigInt fields to strings for JSON compatibility
function serializeTeamFinances(finances: any): any {
  if (!finances) return null;
  
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

// Helper function to serialize full team data including BigInt fields
async function serializeTeamData(team: any): Promise<any> {
  if (!team) return null;
  
  // If we have players but no contract data included, fetch it separately
  let playersWithContracts = team.players || [];
  
  if (team.players && team.players.length > 0 && !team.players[0].contract) {
    // Fetch contracts for all players in this team
    const playerIds = team.players.map((p: any) => p.id);
    const contracts = await prisma.contract.findMany({
      where: { playerId: { in: playerIds } }
    });
    
    // Create a map for quick lookup
    const contractMap = new Map(contracts.map(c => [c.playerId, c]));
    
    // Add contract data to each player
    playersWithContracts = team.players.map((player: any) => ({
      ...player,
      contract: contractMap.get(player.id) || null
    }));
  }
  
  return {
    ...team,
    finances: serializeTeamFinances(team.finances),
    players: playersWithContracts.map((player: any) => ({
      ...player,
      // Flatten contract information into player object
      contractSalary: player.contract ? parseInt(player.contract.salary.toString()) : 0,
      contractLength: player.contract ? player.contract.length : 0,
      contractStartDate: player.contract ? player.contract.startDate : null,
      contractSigningBonus: player.contract ? parseInt(player.contract.signingBonus?.toString() || '0') : 0,
    }))
  };
}

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

  async getTeamByUserId(userId: string): Promise<any> {
    // First find the UserProfile by userId, then find the team by userProfileId
    if (!userId) {
      return null;
    }
    
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
        players: {
          include: {
            contract: true,
            skills: { include: { skill: true } }
          }
        },
        staff: true
      }
    });
    
    return await serializeTeamData(team);
  }

  async getTeamById(id: number): Promise<any> {
    if (!id) {
      throw new Error('Team ID is required');
    }
    
    const team = await prisma.team.findUnique({
      where: { 
        id: Number(id) 
      },
      include: {
        finances: true,
        stadium: true,
        players: {
          include: {
            contract: true,
            skills: { include: { skill: true } }
          }
        },
        staff: true
      }
    });
    
    if (!team) {
      return null;
    }
    
    return await serializeTeamData(team);
  }

  async getAllTeams(): Promise<any[]> {
    const teams = await prisma.team.findMany({
      include: {
        finances: true,
        stadium: true,
        players: {
          include: {
            contract: true,
            skills: { include: { skill: true } }
          }
        },
        staff: true
      }
    });
    
    return await Promise.all(teams.map(team => serializeTeamData(team)));
  }

  async getAllTeamsWithBasicInfo(): Promise<any[]> {
    const teams = await prisma.team.findMany({
      include: {
        finances: true,
        stadium: true,
        players: {
          include: {
            contract: true,
            skills: { include: { skill: true } }
          }
        },
        staff: true
      }
    });
    
    return await Promise.all(teams.map(team => serializeTeamData(team)));
  }

  async getTeamsInDivision(division: number, subdivision?: string): Promise<any[]> {
    const whereClause: any = { division: division };
    if (subdivision) {
      whereClause.subdivision = subdivision;
    }
    
    const teams = await prisma.team.findMany({
      where: whereClause,
      include: {
        finances: true,
        stadium: true,
        players: {
          include: {
            contract: true,
            skills: { include: { skill: true } }
          }
        },
        staff: true
      }
    });
    
    return await Promise.all(teams.map(team => serializeTeamData(team)));
  }

  // Alias method for route compatibility
  async getTeamsByDivisionAndSubdivision(division: number, subdivision?: string): Promise<any[]> {
    return this.getTeamsInDivision(division, subdivision);
  }

  async updateTeam(teamId: number, updateData: any): Promise<any> {
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: updateData,
      include: {
        finances: true,
        stadium: true,
        players: {
          include: {
            contract: true,
            skills: { include: { skill: true } }
          }
        },
        staff: true
      }
    });
    
    return await serializeTeamData(updatedTeam);
  }

  async updateTeamRecord(teamId: number, wins: number, losses: number, points: number): Promise<void> {
    await prisma.team.update({
      where: { id: teamId },
      data: { 
        wins: wins, 
        losses: losses, 
        points: points
      }
    });
  }

  async createDefaultFinancesForTeam(teamId: number): Promise<void> {
    await prisma.teamFinances.create({
      data: {
        teamId,
        credits: 50000, // Starting credits
        gems: 0, // Starting gems (0 per specifications)
        projectedIncome: 0,
        projectedExpenses: 0,
        lastSeasonRevenue: 0,
        lastSeasonExpenses: 0,
        facilitiesMaintenanceCost: 5000
      }
    });
  }

  async createDefaultStadiumForTeam(teamId: number): Promise<void> {
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

  async deleteTeam(teamId: number): Promise<void> {
    // Delete related records first
    await prisma.player.deleteMany({ where: { teamId: teamId } });
    await prisma.staff.deleteMany({ where: { teamId: teamId } });
    await prisma.teamFinances.deleteMany({ where: { teamId: teamId } });
    await prisma.stadium.deleteMany({ where: { teamId: teamId } });
    
    // Delete the team
    await prisma.team.delete({ where: { id: teamId } });
  }

  // World rankings method with proper BigInt serialization
  async getWorldRankings(): Promise<any> {
    const teams = await prisma.team.findMany({
      include: {
        finances: true,
        stadium: true,
        players: true,
        staff: true
      },
      orderBy: [
        { points: 'desc' },
        { wins: 'desc' },
        { name: 'asc' }
      ]
    });

    return {
      rankings: await Promise.all(teams.map(team => serializeTeamData(team))),
      totalTeams: teams.length,
      totalPlayers: teams.reduce((sum, team) => sum + team.players.length, 0)
    };
  }

  // Add the missing getAllTeamsWithStats method for world rankings route compatibility
  async getAllTeamsWithStats(): Promise<any[]> {
    const rankings = await this.getWorldRankings();
    return rankings.rankings || [];
  }

  // Add missing getTeams method for exhibition routes compatibility
  async getTeams(): Promise<any[]> {
    return this.getAllTeams();
  }

  // Add missing getTeamsByDivision method
  async getTeamsByDivision(division: number): Promise<any[]> {
    const teams = await prisma.team.findMany({
      where: { division: division },
      include: {
        finances: true,
        stadium: true,
        players: {
          include: {
            contract: true,
            skills: { include: { skill: true } }
          }
        },
        staff: true
      }
    });
    
    return await Promise.all(teams.map(team => serializeTeamData(team)));
  }
}

// Export instance for use in other modules
export const teamStorage = new TeamStorage();