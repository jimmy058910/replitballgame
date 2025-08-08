import { prisma } from '../db.js';
import { PrismaClient, Item, InventoryItem, $Enums } from '../../generated/prisma.js';



export class ItemStorage {
  async createItem(itemData: {
    name: string;
    description: string;
    type: $Enums.ItemType;
    slot?: $Enums.EquipmentSlot | null;
    raceRestriction?: $Enums.Race | null;
    statEffects?: any;
    rarity?: $Enums.ItemRarity;
    creditPrice?: bigint;
    gemPrice?: number;
    effectValue?: any;
  }): Promise<Item> {
    const newItem = await prisma.item.create({
      data: {
        name: itemData.name,
        description: itemData.description,
        type: itemData.type,
        slot: itemData.slot,
        raceRestriction: itemData.raceRestriction,
        statEffects: itemData.statEffects,
        rarity: itemData.rarity || $Enums.ItemRarity.COMMON,
        creditPrice: itemData.creditPrice,
        gemPrice: itemData.gemPrice,
        effectValue: itemData.effectValue,
      }
    });
    return newItem;
  }

  async getItemById(id: number): Promise<Item | null> {
    const item = await prisma.item.findUnique({
      where: { id }
    });
    return item;
  }

  async getItemsByType(itemType: $Enums.ItemType): Promise<Item[]> {
    return await prisma.item.findMany({
      where: { type: itemType },
      orderBy: { name: 'asc' }
    });
  }

  async getMarketplaceItems(itemType?: $Enums.ItemType): Promise<Item[]> {
    return await prisma.item.findMany({
      where: {
        ...(itemType ? { type: itemType } : {}),
        OR: [
          { creditPrice: { not: null } },
          { gemPrice: { not: null } }
        ]
      },
      orderBy: [
        { rarity: 'desc' },
        { name: 'asc' }
      ]
    });
  }

  async updateItem(id: number, updates: any): Promise<Item | null> {
    try {
      const updatedItem = await prisma.item.update({
        where: { id },
        data: updates
      });
      return updatedItem;
    } catch (error) {
      console.warn(`Item with ID ${id} not found for update.`);
      return null;
    }
  }

  async deleteItem(id: number): Promise<boolean> {
    try {
      await prisma.item.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.warn(`Item with ID ${id} not found for deletion.`);
      return false;
    }
  }

  // Team Inventory Operations
  async addItemToTeamInventory(teamId: number, itemId: number, quantity: number = 1): Promise<InventoryItem> {
    // Check if item already exists in team inventory
    const existingItem = await prisma.inventoryItem.findFirst({
      where: { teamId, itemId }
    });

    if (existingItem) {
      // Update quantity
      const updatedItem = await prisma.inventoryItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
        include: {
          item: true,
          team: { select: { name: true } }
        }
      });
      return updatedItem;
    } else {
      // Create new inventory item
      const newInventoryItem = await prisma.inventoryItem.create({
        data: {
          teamId,
          itemId,
          quantity,
        },
        include: {
          item: true,
          team: { select: { name: true } }
        }
      });
      return newInventoryItem;
    }
  }

  async getTeamInventory(teamId: number, itemType?: $Enums.ItemType): Promise<InventoryItem[]> {
    return await prisma.inventoryItem.findMany({
      where: {
        teamId,
        ...(itemType ? { item: { type: itemType } } : {})
      },
      include: {
        item: true,
        team: { select: { name: true } }
      },
      orderBy: {
        item: { name: 'asc' }
      }
    });
  }

  async removeItemFromTeamInventory(teamId: number, itemId: number, quantity: number = 1): Promise<InventoryItem | null> {
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: { teamId, itemId }
    });

    if (!inventoryItem) {
      console.warn(`Item ${itemId} not found in team ${teamId} inventory.`);
      return null;
    }

    if (inventoryItem.quantity <= quantity) {
      // Remove completely
      await prisma.inventoryItem.delete({
        where: { id: inventoryItem.id }
      });
      return null;
    } else {
      // Reduce quantity
      const updatedItem = await prisma.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: { quantity: inventoryItem.quantity - quantity },
        include: {
          item: true,
          team: { select: { name: true } }
        }
      });
      return updatedItem;
    }
  }

  async getItemsByRarity(rarity: $Enums.ItemRarity): Promise<Item[]> {
    return await prisma.item.findMany({
      where: { rarity },
      orderBy: { name: 'asc' }
    });
  }
}

export const itemStorage = new ItemStorage();