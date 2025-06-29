import { db } from "../db";
import { items, type Item, type InsertItem } from "@shared/schema";
import { eq, and, or, asc, desc, isNotNull } from "drizzle-orm";
import { randomUUID } from "crypto";

export class ItemStorage {
  async createItem(itemData: Omit<InsertItem, 'id' | 'createdAt'>): Promise<Item> {
    const dataToInsert: InsertItem = {
      id: randomUUID(),
      ...itemData,
      // Ensure defaults for non-nullable fields if not always provided by itemData
      // For example, if statBoosts is non-nullable and might be undefined in itemData:
      statBoosts: typeof itemData.statBoosts === 'object' ? itemData.statBoosts : itemData.statBoosts || {},
      createdAt: new Date(),
      // marketplacePrice can be null by default if not being listed immediately
    };
    const [newItem] = await db.insert(items).values(dataToInsert).returning();
    return newItem;
  }

  async getItemById(id: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id)).limit(1);
    return item;
  }

  async getItemsByType(itemType: string): Promise<Item[]> {
    return await db.select().from(items).where(eq(items.type, itemType)).orderBy(asc(items.name));
  }

  async getItemsByTeam(teamId: string): Promise<Item[]> {
    // This fetches items directly owned by the team (e.g., equipped or in team inventory if items.teamId is used for that)
    return await db.select().from(items).where(eq(items.teamId, teamId)).orderBy(asc(items.name));
  }

  async getMarketplaceListedItems(itemType?: string): Promise<Item[]> {
    // Items are on marketplace if marketplacePrice is not null.
    // They might still have a teamId if a team is selling them.
    const conditions = [isNotNull(items.marketplacePrice)];
    if (itemType) {
        conditions.push(eq(items.type, itemType));
    }
    return await db.select().from(items)
        .where(and(...conditions))
        .orderBy(desc(items.rarity), asc(items.name)); // Example sort
  }


  async updateItem(id: string, updates: Partial<Omit<InsertItem, 'id' | 'createdAt' | 'teamId'>>): Promise<Item | undefined> {
    // teamId is usually updated via a separate transfer/purchase logic, not direct item update.
    const existing = await this.getItemById(id);
    if (!existing) {
        console.warn(`Item with ID ${id} not found for update.`);
        return undefined;
    }

    if (updates.statBoosts && typeof updates.statBoosts === 'object') {
        // Ensure it's stored correctly if schema expects JSON string (though Drizzle jsonb handles objects)
        // updates.statBoosts = JSON.stringify(updates.statBoosts);
    }

    const [updatedItem] = await db.update(items)
      .set({ ...updates, updatedAt: new Date() }) // Assuming updatedAt in schema
      .where(eq(items.id, id))
      .returning();
    return updatedItem;
  }

  async deleteItem(id: string): Promise<boolean> {
    // Consider implications: if item is equipped by a player, or part of an active listing.
    const result = await db.delete(items).where(eq(items.id, id)).returning({ id: items.id });
    return result.length > 0;
  }

  // Specific methods for listing/unlisting items on marketplace
  async listItemOnMarketplace(itemId: string, price: number, sellingTeamId?: string): Promise<Item | undefined> {
    const updates: Partial<InsertItem> = { marketplacePrice: price };
    if (sellingTeamId) { // If a team is selling, its teamId should already be on the item.
        // updates.teamId = sellingTeamId; // This line might be redundant if item is already owned.
    } else {
        // If it's a system item or new item being listed directly, teamId might be null.
        // updates.teamId = null; // Explicitly set if needed
    }
    return this.updateItem(itemId, updates);
  }

  async removeItemFromMarketplace(itemId: string): Promise<Item | undefined> {
    return this.updateItem(itemId, { marketplacePrice: null });
  }

  async transferItemOwnership(itemId: string, newTeamId: string | null): Promise<Item | undefined> {
    // If transferring to a team, newTeamId is set. If unassigning (e.g. to system or free pool), newTeamId is null.
    return this.updateItem(itemId, { teamId: newTeamId, marketplacePrice: null }); // Also remove from market on transfer
  }
}

export const itemStorage = new ItemStorage();
