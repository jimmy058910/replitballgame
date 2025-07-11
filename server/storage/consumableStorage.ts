import { PrismaClient, InventoryItem, MatchConsumable } from '../../generated/prisma';

const prisma = new PrismaClient();

export class ConsumableStorage {
  // Get team's consumable inventory
  async getTeamConsumables(teamId: number): Promise<InventoryItem[]> {
    return await prisma.inventoryItem.findMany({
      where: { teamId },
      include: {
        item: true,
        team: { select: { name: true } }
      }
    });
  }

  // Get team's available consumables (items of consumable type)
  async getTeamAvailableConsumables(teamId: number): Promise<InventoryItem[]> {
    return await prisma.inventoryItem.findMany({
      where: {
        teamId,
        item: { type: 'consumable' }
      },
      include: {
        item: true,
        team: { select: { name: true } }
      }
    });
  }

  // Check how many consumables a team has activated for a specific match
  async getMatchConsumablesCount(matchId: number, teamId: number): Promise<number> {
    const count = await prisma.matchConsumable.count({
      where: {
        matchId,
        teamId
      }
    });
    return count;
  }

  // Get all consumables activated for a match by a team
  async getMatchConsumables(matchId: number, teamId: number): Promise<MatchConsumable[]> {
    return await prisma.matchConsumable.findMany({
      where: {
        matchId,
        teamId
      },
      orderBy: { activatedAt: 'desc' }
    });
  }

  // Activate a consumable for a match (with 3-per-match limit)
  async activateConsumable(
    matchId: number,
    teamId: number,
    consumableId: number,
    consumableName: string,
    effectType: string,
    effectData: any
  ): Promise<{ success: boolean; message: string; consumable?: MatchConsumable }> {
    try {
      // Check if team has already used 3 consumables for this match
      const existingCount = await this.getMatchConsumablesCount(matchId, teamId);
      if (existingCount >= 3) {
        return {
          success: false,
          message: "Maximum of 3 consumables per match allowed"
        };
      }

      // Check if team has this consumable in inventory
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: {
          teamId,
          itemId: consumableId,
          quantity: { gt: 0 }
        }
      });

      if (!inventoryItem) {
        return {
          success: false,
          message: "Consumable not found in team inventory"
        };
      }

      // Create match consumable record
      const matchConsumable = await prisma.matchConsumable.create({
        data: {
          matchId,
          teamId,
          consumableId,
          consumableName,
          effectType,
          effectData,
          activatedAt: new Date()
        }
      });

      // Reduce quantity in inventory
      await prisma.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: { quantity: inventoryItem.quantity - 1 }
      });

      return {
        success: true,
        message: "Consumable activated successfully",
        consumable: matchConsumable
      };

    } catch (error) {
      console.error("Error activating consumable:", error);
      return {
        success: false,
        message: "Failed to activate consumable"
      };
    }
  }

  // Remove a consumable from inventory (used for consumption)
  async consumeItem(teamId: number, consumableId: number, quantity: number = 1): Promise<boolean> {
    try {
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: {
          teamId,
          itemId: consumableId
        }
      });

      if (!inventoryItem || inventoryItem.quantity < quantity) {
        return false;
      }

      if (inventoryItem.quantity === quantity) {
        // Remove completely
        await prisma.inventoryItem.delete({
          where: { id: inventoryItem.id }
        });
      } else {
        // Reduce quantity
        await prisma.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: { quantity: inventoryItem.quantity - quantity }
        });
      }

      return true;
    } catch (error) {
      console.error("Error consuming item:", error);
      return false;
    }
  }
}

export const consumableStorage = new ConsumableStorage();