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
    // Promotes a taxi squad player to MAIN ROSTER by inserting them at position 12
    // This moves them into the main roster and pushes everyone down naturally
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



      // Strategy: Insert the promoted player at position 12 (end of main roster)
      // This pushes the current 12th player to position 13, naturally reordering the roster
      const twelfthPlayer = allTeamPlayers[11]; // Current 12th player (0-indexed)
      
      let newCreatedAt;
      if (twelfthPlayer) {
        // Insert right after the 11th player (before the 12th player)
        const eleventhPlayer = allTeamPlayers[10];
        if (eleventhPlayer) {
          // Insert between 11th and 12th player
          const eleventhTime = eleventhPlayer.createdAt.getTime();
          const twelfthTime = twelfthPlayer.createdAt.getTime();
          newCreatedAt = new Date(eleventhTime + (twelfthTime - eleventhTime) / 2);
        } else {
          // Insert before 12th player
          newCreatedAt = new Date(twelfthPlayer.createdAt.getTime() - 60000);
        }
      } else {
        // Roster has fewer than 12 players, just append to main roster
        const lastMainRosterPlayer = allTeamPlayers[allTeamPlayers.length - 1];
        newCreatedAt = new Date(lastMainRosterPlayer.createdAt.getTime() + 60000);
      }

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

    // Use proper main roster vs taxi squad detection
    const mainRosterPlayers = player.team.players.filter(p => !p.isOnTaxi);
    const taxiSquadPlayers = player.team.players.filter(p => p.isOnTaxi);
    const totalPlayers = player.team.players.length;

    // Check minimum player count (cannot go below 12 total players)
    if (totalPlayers <= 12) {
      return { canRelease: false, reason: `Cannot release - would leave team with only ${totalPlayers - 1} players (minimum 12 required)` };
    }

    // Check if player is on main roster (not taxi squad)
    const isOnMainRoster = !player.isOnTaxi;
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
