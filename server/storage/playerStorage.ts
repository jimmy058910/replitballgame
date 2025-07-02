import { db } from "../db";
import { players, type Player, type InsertPlayer } from "@shared/schema";
import { eq, and, asc, desc } from "drizzle-orm"; // Added desc

export class PlayerStorage {
  async createPlayer(playerData: InsertPlayer): Promise<Player> {
    // Ensure all required fields are provided or have schema defaults
    const dataToInsert = {
        ...playerData,
        name: `${playerData.firstName} ${playerData.lastName}`, // Ensure name is composed
        // Example: Ensure abilities is a string if schema expects jsonb but receives array
        abilities: Array.isArray(playerData.abilities) ? JSON.stringify(playerData.abilities) : playerData.abilities || JSON.stringify([]),
        // Ensure other non-nullable fields have defaults if not provided
        // position: playerData.position || 'player',
        // contractSeasons: playerData.contractSeasons || 0,
        // contractValue: playerData.contractValue || 0,
    };
    const [newPlayer] = await db.insert(players).values(dataToInsert).returning();
    return newPlayer;
  }

  async getPlayerById(id: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id)).limit(1);
    return player;
  }

  async getPlayersByTeamId(teamId: string): Promise<Player[]> {
    // Typically, you'd fetch non-marketplace players for a team's roster
    return await db
      .select()
      .from(players)
      .where(and(eq(players.teamId, teamId), eq(players.isMarketplace, false)))
      .orderBy(asc(players.name)); // Example: order by name
  }

  async getAllPlayersByTeamId(teamId: string): Promise<Player[]> {
    // Fetches all players associated with a team, including those on marketplace
    return await db
      .select()
      .from(players)
      .where(eq(players.teamId, teamId))
      .orderBy(asc(players.name));
  }


  async updatePlayer(id: string, updates: Partial<InsertPlayer>): Promise<Player | undefined> {
    const existingPlayer = await this.getPlayerById(id);
    if (!existingPlayer) {
        console.warn(`Player with ID ${id} not found for update.`);
        return undefined;
    }
    // If first/last name changes, update the composite 'name' field
    if (updates.firstName || updates.lastName) {
        updates.name = `${updates.firstName || existingPlayer.firstName} ${updates.lastName || existingPlayer.lastName}`;
    }
    if (updates.abilities && Array.isArray(updates.abilities)) {
        updates.abilities = JSON.stringify(updates.abilities);
    }

    const [updatedPlayer] = await db
      .update(players)
      .set({ ...updates, updatedAt: new Date() }) // Assuming 'updatedAt' in schema
      .where(eq(players.id, id))
      .returning();
    return updatedPlayer;
  }

  async deletePlayer(id: string): Promise<boolean> {
    // Consider implications: injuries, contracts, auction listings might need cleanup or prevent deletion.
    // For now, a simple delete.
    const result = await db.delete(players).where(eq(players.id, id)).returning({ id: players.id });
    return result.length > 0;
  }

  async getMarketplacePlayers(): Promise<Player[]> {
    return await db
      .select()
      .from(players)
      .where(eq(players.isMarketplace, true))
      .orderBy(asc(players.marketplaceEndTime), desc(players.marketplacePrice)); // Example sorting
  }

  // Taxi Squad specific methods
  async getTaxiSquadPlayersByTeamId(teamId: string): Promise<Player[]> {
    return await db
      .select()
      .from(players)
      .where(and(eq(players.teamId, teamId), eq(players.isOnTaxi, true)))
      .orderBy(asc(players.name));
  }

  async promotePlayerFromTaxiSquad(playerId: string): Promise<Player | null> {
    const result = await db
      .update(players)
      .set({ isOnTaxi: false })
      .where(eq(players.id, playerId))
      .returning();
    
    return result[0] || null;
  }

  async releasePlayerFromTaxiSquad(playerId: string): Promise<boolean> {
    const result = await db
      .delete(players)
      .where(eq(players.id, playerId))
      .returning();
    
    return result.length > 0;
  }
}

export const playerStorage = new PlayerStorage();
