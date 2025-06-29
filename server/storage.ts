// This file is part of the storage layer refactoring.
// It previously contained the monolithic DatabaseStorage class.
// Now, it re-exports the aggregated storage object from server/storage/index.ts
// to maintain backward compatibility for existing imports while transitioning.

import { storage, type IAppStorage } from "./storage/index";
import { playerMatchStats, teamMatchStats, type PlayerMatchStats, type TeamMatchStats } from "@shared/schema"; // Added for detailed-match-stats items
import { db } from "./db"; // Added for detailed-match-stats items

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
// storage.teams.createTeam()
// etc.
//
// Files that previously did:
// import { storage } from "./storage";
// await storage.createTeam(...);
//
// Will now effectively be doing (without changing their import line):
// import { storage } from "./storage/index"; // (as re-exported by this file)
// await storage.teams.createTeam(...);
//
// This allows a phased update of consumer files. New files or refactored files
// can choose to import more granularly, e.g.:
// import { teamStorage } from "./storage/teamStorage";
// await teamStorage.createTeam(...);
// OR
// import { storage } from "./storage/index";
// await storage.teams.createTeam(...);

// Integrating methods from feature/detailed-match-stats
// These methods should ideally be in a specific storage module like matchStorage.ts,
// but are added here to resolve the conflict and retain functionality.
// A follow-up refactor is recommended.

/**
 * Batch inserts player match statistics.
 * @param stats - An array of PlayerMatchStats objects.
 */
async function batchInsertPlayerMatchStats(stats: PlayerMatchStats[]): Promise<void> {
  if (stats.length === 0) return;
  // Assuming playerMatchStats table schema is available via import
  await db.insert(playerMatchStats).values(stats);
}

/**
 * Batch inserts team match statistics.
 * @param stats - An array of TeamMatchStats objects.
 */
async function batchInsertTeamMatchStats(stats: TeamMatchStats[]): Promise<void> {
  if (stats.length === 0) return;
  // Assuming teamMatchStats table schema is available via import
  await db.insert(teamMatchStats).values(stats);
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
