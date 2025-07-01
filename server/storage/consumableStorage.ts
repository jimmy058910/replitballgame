import { db } from "../db";
import { teamInventory, matchConsumables, matches, type MatchConsumable, type InsertMatchConsumable, type TeamInventory } from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

export class ConsumableStorage {
  // Get team's consumable inventory
  async getTeamConsumables(teamId: string): Promise<TeamInventory[]> {
    return await db.select()
      .from(teamInventory)
      .where(eq(teamInventory.teamId, teamId));
  }

  // Get team's available consumables (items of consumable type)
  async getTeamAvailableConsumables(teamId: string): Promise<TeamInventory[]> {
    return await db.select()
      .from(teamInventory)
      .where(and(
        eq(teamInventory.teamId, teamId),
        eq(teamInventory.itemType, "consumable")
      ));
  }

  // Check how many consumables a team has activated for a specific match
  async getMatchConsumablesCount(matchId: string, teamId: string): Promise<number> {
    const consumables = await db.select()
      .from(matchConsumables)
      .where(and(
        eq(matchConsumables.matchId, matchId),
        eq(matchConsumables.teamId, teamId)
      ));
    return consumables.length;
  }

  // Get all consumables activated for a match by a team
  async getMatchConsumables(matchId: string, teamId: string): Promise<MatchConsumable[]> {
    return await db.select()
      .from(matchConsumables)
      .where(and(
        eq(matchConsumables.matchId, matchId),
        eq(matchConsumables.teamId, teamId)
      ))
      .orderBy(desc(matchConsumables.activatedAt));
  }

  // Activate a consumable for a match (with 3-per-match limit)
  async activateConsumable(
    matchId: string,
    teamId: string,
    consumableId: string,
    consumableName: string,
    effectType: string,
    effectData: any
  ): Promise<{ success: boolean; message: string; consumable?: MatchConsumable }> {
    try {
      // Check if team has already activated 3 consumables for this match
      const currentCount = await this.getMatchConsumablesCount(matchId, teamId);
      if (currentCount >= 3) {
        return {
          success: false,
          message: "Cannot activate more than 3 consumables per league game"
        };
      }

      // Check if team has this consumable in their inventory
      const inventoryItems = await db.select()
        .from(teamInventory)
        .where(and(
          eq(teamInventory.teamId, teamId),
          eq(teamInventory.name, consumableName),
          eq(teamInventory.itemType, "consumable")
        ));

      if (inventoryItems.length === 0) {
        return {
          success: false,
          message: "Consumable not found in team inventory"
        };
      }

      const inventoryItem = inventoryItems[0];
      if ((inventoryItem.quantity || 0) <= 0) {
        return {
          success: false,
          message: "No consumables remaining in inventory"
        };
      }

      // Create match consumable record
      const matchConsumableData: InsertMatchConsumable = {
        id: randomUUID(),
        matchId,
        teamId,
        consumableId,
        consumableName,
        effectType,
        effectData,
        activatedAt: new Date(),
        usedInMatch: false
      };

      const [newConsumable] = await db.insert(matchConsumables)
        .values(matchConsumableData)
        .returning();

      // Reduce inventory quantity
      await db.update(teamInventory)
        .set({ quantity: (inventoryItem.quantity || 0) - 1 })
        .where(eq(teamInventory.id, inventoryItem.id));

      return {
        success: true,
        message: "Consumable activated successfully",
        consumable: newConsumable
      };
    } catch (error) {
      console.error("Error activating consumable:", error);
      return {
        success: false,
        message: "Failed to activate consumable"
      };
    }
  }

  // Add consumable to team inventory (for store purchases)
  async addConsumableToInventory(
    teamId: string,
    consumableId: string,
    name: string,
    description: string,
    rarity: string,
    metadata: any,
    quantity: number = 1
  ): Promise<boolean> {
    try {
      // Check if item already exists in inventory
      const existingItems = await db.select()
        .from(teamInventory)
        .where(and(
          eq(teamInventory.teamId, teamId),
          eq(teamInventory.name, name),
          eq(teamInventory.itemType, "consumable")
        ));

      if (existingItems.length > 0) {
        // Update quantity
        const existingItem = existingItems[0];
        await db.update(teamInventory)
          .set({ quantity: (existingItem.quantity || 0) + quantity })
          .where(eq(teamInventory.id, existingItem.id));
      } else {
        // Create new inventory item
        await db.insert(teamInventory).values({
          id: randomUUID(),
          teamId,
          itemId: null, // Store items don't have item references
          itemType: "consumable",
          name,
          description,
          rarity,
          metadata,
          quantity,
          acquiredAt: new Date()
        });
      }

      return true;
    } catch (error) {
      console.error("Error adding consumable to inventory:", error);
      return false;
    }
  }

  // Mark consumables as used after match completion
  async markConsumablesAsUsed(matchId: string): Promise<void> {
    await db.update(matchConsumables)
      .set({ usedInMatch: true })
      .where(eq(matchConsumables.matchId, matchId));
  }

  // Get all consumables for a match (both teams)
  async getAllMatchConsumables(matchId: string): Promise<MatchConsumable[]> {
    return await db.select()
      .from(matchConsumables)
      .where(eq(matchConsumables.matchId, matchId))
      .orderBy(asc(matchConsumables.teamId), desc(matchConsumables.activatedAt));
  }

  // Remove consumable activation (before match starts)
  async deactivateConsumable(consumableId: string, teamId: string): Promise<boolean> {
    try {
      // Get the consumable record
      const consumableRecords = await db.select()
        .from(matchConsumables)
        .where(and(
          eq(matchConsumables.id, consumableId),
          eq(matchConsumables.teamId, teamId),
          eq(matchConsumables.usedInMatch, false)
        ));

      if (consumableRecords.length === 0) {
        return false; // Consumable not found or already used
      }

      const consumableRecord = consumableRecords[0];

      // Return consumable to inventory
      const inventoryItems = await db.select()
        .from(teamInventory)
        .where(and(
          eq(teamInventory.teamId, teamId),
          eq(teamInventory.name, consumableRecord.consumableName),
          eq(teamInventory.itemType, "consumable")
        ));

      if (inventoryItems.length > 0) {
        const inventoryItem = inventoryItems[0];
        await db.update(teamInventory)
          .set({ quantity: (inventoryItem.quantity || 0) + 1 })
          .where(eq(teamInventory.id, inventoryItem.id));
      }

      // Remove consumable activation
      await db.delete(matchConsumables)
        .where(eq(matchConsumables.id, consumableId));

      return true;
    } catch (error) {
      console.error("Error deactivating consumable:", error);
      return false;
    }
  }
}

export const consumableStorage = new ConsumableStorage();