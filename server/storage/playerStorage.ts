import { prisma } from '../db';
import { PrismaClient, Player, Race, PlayerRole, InjuryStatus } from '../../generated/prisma';



export class PlayerStorage {
  async getAllPlayersWithStats(): Promise<any[]> {
    const players = await prisma.player.findMany({
      include: {
        team: {
          select: {
            name: true,
            division: true,
            subdivision: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    return players;
  }
  async createPlayer(playerData: {
    teamId: number;
    firstName: string;
    lastName: string;
    race: Race;
    age: number;
    role: PlayerRole;
    speed: number;
    power: number;
    throwing: number;
    catching: number;
    kicking: number;
    staminaAttribute: number;
    leadership: number;
    agility: number;
    potentialRating: number;
    dailyStaminaLevel?: number;
    injuryStatus?: InjuryStatus;
    camaraderieScore?: number;
    [key: string]: any; // Allow additional fields
  }): Promise<Player> {
    const newPlayer = await prisma.player.create({
      data: {
        teamId: playerData.teamId,
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        race: playerData.race,
        age: playerData.age,
        role: playerData.role,
        speed: playerData.speed,
        power: playerData.power,
        throwing: playerData.throwing,
        catching: playerData.catching,
        kicking: playerData.kicking,
        staminaAttribute: playerData.staminaAttribute,
        leadership: playerData.leadership,
        agility: playerData.agility,
        potentialRating: playerData.potentialRating,
        dailyStaminaLevel: playerData.dailyStaminaLevel || 100,
        injuryStatus: playerData.injuryStatus || InjuryStatus.HEALTHY,
        camaraderieScore: playerData.camaraderieScore || 75.0,
      },
    });
    return newPlayer;
  }

  async getPlayerById(id: number): Promise<Player | null> {
    const player = await prisma.player.findUnique({
      where: { id: parseInt(id.toString()) },
      include: {
        team: { select: { name: true } },
        contract: true,
        skills: { include: { skill: true } }
      }
    });
    
    return player;
  }

  async getPlayersByTeamId(teamId: number): Promise<Player[]> {
    // First get all players for this team to determine taxi squad
    const allPlayers = await prisma.player.findMany({
      where: {
        teamId: parseInt(teamId.toString()),
        isOnMarket: false
      },
      orderBy: { createdAt: 'asc' }
    });

    // Only return first 12 players (main roster) - exclude taxi squad players
    const mainRosterPlayerIds = allPlayers.slice(0, 12).map(p => p.id);
    
    // Get full player data for main roster only
    const players = await prisma.player.findMany({
      where: {
        teamId: parseInt(teamId.toString()),
        isOnMarket: false,
        id: { in: mainRosterPlayerIds }
      },
      include: {
        team: { select: { name: true } },
        contract: true,
        skills: { include: { skill: true } }
      },
      orderBy: { firstName: 'asc' }
    });

    return players;
  }

  async getTaxiSquadPlayersByTeamId(teamId: number): Promise<Player[]> {
    // Get all players for this team, ordered by creation date
    const allPlayers = await prisma.player.findMany({
      where: {
        teamId: parseInt(teamId.toString()),
        isOnMarket: false
      },
      include: {
        team: { select: { name: true } },
        contract: true,
        skills: { include: { skill: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Return players beyond the first 12 (taxi squad players)
    const taxiSquadPlayers = allPlayers.slice(12);
    
    return taxiSquadPlayers;
  }

  async getAllPlayersByTeamId(teamId: number): Promise<Player[]> {
    // Fetches all players associated with a team, including those on marketplace
    return await prisma.player.findMany({
      where: { teamId: parseInt(teamId.toString()) },
      include: {
        team: { select: { name: true } },
        contract: true,
        skills: { include: { skill: true } }
      },
      orderBy: { firstName: 'asc' }
    });
  }


  async updatePlayer(id: number, updates: Partial<Player>): Promise<Player | null> {
    try {
      const updatedPlayer = await prisma.player.update({
        where: { id },
        data: updates,
        include: {
          team: { select: { name: true } },
          contract: true,
          skills: { include: { skill: true } }
        }
      });
      return updatedPlayer;
    } catch (error) {
      console.warn(`Player with ID ${id} not found for update.`);
      return null;
    }
  }

  async deletePlayer(id: number): Promise<boolean> {
    try {
      await prisma.player.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.warn(`Player with ID ${id} not found for deletion.`);
      return false;
    }
  }

  async getMarketplacePlayers(): Promise<Player[]> {
    return await prisma.player.findMany({
      where: { isOnMarket: true },
      include: {
        team: { select: { name: true } },
        contract: true,
        skills: { include: { skill: true } }
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });
  }

  // Taxi Squad specific methods (removed duplicate - using the one above)

  async promotePlayerFromTaxiSquad(playerId: number): Promise<Player | null> {
    // TODO: Add taxi squad functionality to Prisma schema
    // For now, return null since isOnTaxiSquad field doesn't exist in schema
    console.warn(`Taxi squad promotion not implemented - missing isOnTaxiSquad field in schema`);
    return null;
  }

  async releasePlayerFromTaxiSquad(playerId: number): Promise<boolean> {
    try {
      await prisma.player.delete({
        where: { id: playerId }
      });
      return true;
    } catch (error) {
      console.warn(`Player with ID ${playerId} not found for release.`);
      return false;
    }
  }

  async releasePlayerFromMainRoster(playerId: number): Promise<boolean> {
    try {
      await prisma.player.delete({
        where: { id: playerId }
      });
      return true;
    } catch (error) {
      console.warn(`Player with ID ${playerId} not found for release.`);
      return false;
    }
  }

  async validatePlayerReleaseFromMainRoster(playerId: number): Promise<{
    canRelease: boolean;
    reason?: string;
    releaseFee?: number;
  }> {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        team: {
          include: {
            players: {
              where: { isOnMarket: false },
              orderBy: { createdAt: 'asc' }
            }
          }
        },
        contract: true
      }
    });

    if (!player || !player.team) {
      return { canRelease: false, reason: "Player or team not found" };
    }

    const mainRosterPlayers = player.team.players.slice(0, 12);
    const totalPlayers = player.team.players.length;

    // Check minimum player count (cannot go below 12 total players)
    if (totalPlayers <= 12) {
      return { canRelease: false, reason: "Cannot release players below minimum roster size of 12" };
    }

    // Check if player is on main roster
    const isOnMainRoster = mainRosterPlayers.some(p => p.id === playerId);
    if (!isOnMainRoster) {
      return { canRelease: false, reason: "Player is not on main roster" };
    }

    // Check position requirements after release
    const remainingPlayers = mainRosterPlayers.filter(p => p.id !== playerId);
    const blockerCount = remainingPlayers.filter(p => p.role === 'BLOCKER').length;
    const runnerCount = remainingPlayers.filter(p => p.role === 'RUNNER').length;
    const passerCount = remainingPlayers.filter(p => p.role === 'PASSER').length;

    if (blockerCount < 4) {
      return { canRelease: false, reason: "Cannot release - would leave team with less than 4 Blockers" };
    }
    if (runnerCount < 4) {
      return { canRelease: false, reason: "Cannot release - would leave team with less than 4 Runners" };
    }
    if (passerCount < 3) {
      return { canRelease: false, reason: "Cannot release - would leave team with less than 3 Passers" };
    }

    // Calculate release fee: remaining salary + 2,500 credits
    let releaseFee = 2500; // Base fee
    if (player.contract) {
      const remainingSeasons = Math.max(0, (player.contract.length || 1) - 1); // Seasons after current
      releaseFee += remainingSeasons * (player.contract.salary || 0);
    }

    return { canRelease: true, releaseFee };
  }
}

export const playerStorage = new PlayerStorage();
