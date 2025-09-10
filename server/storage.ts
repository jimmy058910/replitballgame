// This file is part of the storage layer refactoring.
// It previously contained the monolithic DatabaseStorage class.
// Now, it re-exports the aggregated storage object from server/storage/index.ts
// to maintain backward compatibility for existing imports while transitioning.

import { storage, type IAppStorage } from "./storage/index.js";
import { getPrismaClient } from "./database.js"; // Use Prisma instead of Drizzle
import logger from "./utils/logger.js";
import type { Player, Team } from '@shared/types/models';


// Export the aggregated storage instance
export { storage };

// Export the aggregated type if needed elsewhere, though direct imports from './storage/index' are preferred for types.
export type { IAppStorage };

// The original IStorage interface might be deprecated or refactored into smaller interfaces
// co-located with their respective storage modules (e.g., IUserStorage in userStorage.ts).
// For now, IAppStorage from ./storage/index serves as the comprehensive type.

// All individual storage methods (e.g., getUser, createTeam) that were part of the old IStorage
// are now accessed via the specific storage modules within the main 'storage' object, e.g.:
// storage.users.getUser()
// storage.Team.createTeam()
// etc.
//
// Files that previously did:
// import { storage } from "./storage";
// await storage.createTeam(...);
//
// Will now effectively be doing (without changing their import line):
// import { storage } from "./storage/index"; // (as re-exported by this file)
// await storage.Team.createTeam(...);
//
// This allows a phased update of consumer files. New files or refactored files
// can choose to import more granularly, e.g.:
// import { teamStorage } from "./storage/teamStorage";
// await teamStorage.createTeam(...);
// OR
// import { storage } from "./storage/index";
// await storage.Team.createTeam(...);

// Integrating methods from feature/detailed-match-stats
// These methods should ideally be in a specific storage module like matchStorage.ts,
// but are added here to resolve the conflict and retain functionality.
// A follow-up refactor is recommended.

/**
 * Batch inserts player match statistics.
 * @param stats - Player match statistics data to insert.
 */
async function batchInsertPlayerMatchStats(stats: any[]): Promise<void> {
  if (stats.length === 0) return;
  
  try {
    const prisma = await getPrismaClient();
    await prisma.playerMatchStats.createMany({
      data: stats,
      skipDuplicates: true
    });
    logger.info(`Successfully inserted ${stats.length} player match statistics`);
  } catch (error) {
    logger.error('Failed to batch insert player match statistics', { error, statsCount: stats.length });
    throw error;
  }
}

/**
 * Batch inserts team match statistics.
 * @param stats - Team match statistics data to insert.
 */
async function batchInsertTeamMatchStats(stats: any[]): Promise<void> {
  if (stats.length === 0) return;
  
  try {
    const prisma = await getPrismaClient();
    await prisma.teamMatchStats.createMany({
      data: stats,
      skipDuplicates: true
    });
    logger.info(`Successfully inserted ${stats.length} team match statistics`);
  } catch (error) {
    logger.error('Failed to batch insert team match statistics', { error, statsCount: stats.length });
    throw error;
  }
}

// Add these functions to the exported storage object if they are not already part of the aggregated storage.
// This depends on how server/storage/index.ts is structured.
// If storage.matches already exists and is the correct place, these should be added to that class.
// For now, directly adding to the main storage object if not present in a sub-object.

if (storage && !(storage as any).batchInsertPlayerMatchStats) {
  (storage as any).batchInsertPlayerMatchStats = batchInsertPlayerMatchStats;
}
if (storage && !(storage as any).batchInsertTeamMatchStats) {
  (storage as any).batchInsertTeamMatchStats = batchInsertTeamMatchStats;
}

// Also, ensure the IAppStorage type reflects these additions if necessary,
// though for direct assignment to the object instance, type augmentation might not be strictly enforced here.
// For proper typing, IAppStorage or the relevant sub-interface (e.g., IMatchStorage) should include these methods.
