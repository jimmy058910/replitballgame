import { prisma } from '../db';
import { PrismaClient, Item, InventoryItem } from '../../generated/prisma';



export class ItemStorage {
  async createItem(itemData: {
    name: string;
    description: string;
    type: string;
    slot?: string;
    raceRestriction?: string;
    statEffects?: any;
    rarity?: string;
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
        rarity: itemData.rarity || 'COMMON',
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

  async getItemsByType(itemType: string): Promise<Item[]> {
    return await prisma.item.findMany({
      where: { type: itemType },
      orderBy: { name: 'asc' }
    });
  }

  async getMarketplaceItems(itemType?: string): Promise<Item[]> {
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

  async updateItem(id: number, updates: Partial<Item>): Promise<Item | null> {
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

  async addItemToTeamInventory(
    teamId: number,
    itemId: string,
    name: string,
    description: string,
    rarity: string,
    statBoosts: any,
    quantity: number
  ): Promise<void> {
    // Add item to team inventory
    await prisma.inventoryItem.create({
      data: {
        teamId,
        itemId,
        name,
        description,
        rarity,
        statBoosts,
        quantity,
        itemType: 'EQUIPMENT'
      }
    });
  }

  async getTeamInventory(teamId: number): Promise<InventoryItem[]> {
    return await prisma.inventoryItem.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' }
    });
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

  async getTeamInventory(teamId: number, itemType?: string): Promise<InventoryItem[]> {
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

  async getItemsByRarity(rarity: string): Promise<Item[]> {
    return await prisma.item.findMany({
      where: { rarity },
      orderBy: { name: 'asc' }
    });
  }
}

export const itemStorage = new ItemStorage();