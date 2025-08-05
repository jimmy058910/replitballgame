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
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
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
    // Get all players for this team (including taxi squad)
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
      orderBy: { createdAt: 'asc' } // Order by creation date for roster position calculation
    });

    // Add calculated rosterPosition field based on creation order
    const playersWithPosition = allPlayers.map((player, index) => ({
      ...player,
      rosterPosition: index + 1 // Position 1, 2, 3, etc.
    }));

    return playersWithPosition;
  }

  async getTaxiSquadPlayersByTeamId(teamId: number): Promise<Player[]> {
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

    // Truly flexible taxi squad logic:
    // - Minimum 12 main roster players (positions 1-12)
    // - Position 13+ can be taxi squad (maximum 2 taxi squad players)
    // - Supports: 12+1, 13+0, 14+1, 13+2, 15+0, etc.
    
    if (allPlayers.length <= 12) {
      return []; // Need at least 12 main roster players
    }
    
    // Taxi squad is anyone beyond position 12 (up to 2 players max)
    const taxiSquadStartIndex = 12; // Position 13 and beyond
    const taxiSquadPlayers = allPlayers.slice(taxiSquadStartIndex);
    
    // Cap at maximum 2 taxi squad players
    return taxiSquadPlayers.slice(0, 2);
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
    // Promotes a taxi squad player to MAIN ROSTER
    // CRITICAL: Never moves main roster players to taxi squad - taxi squad is for recruited players only
    try {
      const player = await prisma.player.findUnique({
        where: { id: parseInt(playerId.toString()) }
      });
      
      if (!player) {
        return null;
      }

      // Get all team players to understand current roster structure
      const allTeamPlayers = await prisma.player.findMany({
        where: {
          teamId: player.teamId,
          isOnMarket: false
        },
        orderBy: { createdAt: 'asc' }
      });

      // Calculate current roster structure
      const totalPlayers = allTeamPlayers.length;
      const taxiSquadPlayers = allTeamPlayers.slice(13); // Players beyond position 13 are taxi squad
      const mainRosterPlayers = allTeamPlayers.slice(0, Math.min(13, totalPlayers)); // Main roster can be 13-15 players
      
      console.log(`[PROMOTION DEBUG] Current roster: ${totalPlayers} total players (${mainRosterPlayers.length} main roster, ${taxiSquadPlayers.length} taxi squad)`);
      console.log(`[PROMOTION DEBUG] Promoting player: ${player.firstName} ${player.lastName} (ID: ${player.id})`);

      // Check if total roster has space (must have < 15 total players to promote)
      if (totalPlayers >= 15) {
        console.log(`[PROMOTION DEBUG] Cannot promote - roster is full (${totalPlayers}/15 players)`);
        throw new Error("Cannot promote player - roster is full (15/15 players). Please release a player first to make space.");
      }

      // Add promoted player to end of roster (they'll become main roster due to createdAt timestamp)
      const lastPlayer = allTeamPlayers[allTeamPlayers.length - 1];
      const newCreatedAt = new Date(lastPlayer.createdAt.getTime() + 60000);
      
      console.log(`[PROMOTION DEBUG] Promoting player to roster position ${totalPlayers + 1} (new total: ${totalPlayers + 1})`);

      // Update the player's createdAt timestamp to promote them
      const promotedPlayer = await prisma.player.update({
        where: { id: parseInt(playerId.toString()) },
        data: { 
          createdAt: newCreatedAt,
          updatedAt: new Date()
        },
        include: {
          team: { select: { name: true } },
          contract: true,
          skills: { include: { skill: true } }
        }
      });

      console.log(`[PROMOTION DEBUG] Successfully promoted ${promotedPlayer.firstName} ${promotedPlayer.lastName} to main roster`);
      return promotedPlayer;
    } catch (error) {
      console.error(`Error promoting player ${playerId}:`, error);
      return null;
    }
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
              where: { 
                isOnMarket: false,
                isRetired: false 
              },
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

    // Use proper main roster vs taxi squad detection (position-based)
    const allPlayers = player.team.players;
    const totalPlayers = allPlayers.length;
    const mainRosterPlayers = allPlayers.slice(0, 12); // First 12 players are main roster
    const taxiSquadPlayers = allPlayers.slice(12); // Players 13+ are taxi squad

    // Check minimum player count (cannot go below 12 total players)
    if (totalPlayers <= 12) {
      return { canRelease: false, reason: `Cannot release - would leave team with only ${totalPlayers - 1} players (minimum 12 required)` };
    }

    // Check if player is on main roster (position 1-12)
    const playerIndex = allPlayers.findIndex(p => p.id === playerId);
    const isOnMainRoster = playerIndex < 12;
    if (!isOnMainRoster) {
      return { canRelease: false, reason: "Cannot release taxi squad players from main roster (use taxi squad release instead)" };
    }

    // Check position requirements after release
    const remainingMainRosterPlayers = mainRosterPlayers.filter(p => p.id !== playerId);
    const blockerCount = remainingMainRosterPlayers.filter(p => p.role === 'BLOCKER').length;
    const runnerCount = remainingMainRosterPlayers.filter(p => p.role === 'RUNNER').length;
    const passerCount = remainingMainRosterPlayers.filter(p => p.role === 'PASSER').length;

    if (blockerCount < 4) {
      return { canRelease: false, reason: `Cannot release - would leave team with only ${blockerCount} Blockers (minimum 4 required)` };
    }
    if (runnerCount < 4) {
      return { canRelease: false, reason: `Cannot release - would leave team with only ${runnerCount} Runners (minimum 4 required)` };
    }
    if (passerCount < 3) {
      return { canRelease: false, reason: `Cannot release - would leave team with only ${passerCount} Passers (minimum 3 required)` };
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
