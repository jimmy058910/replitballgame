// This file aggregates all domain-specific storage services.
// Other parts of the application can import this single 'storage' object.

import { getPrismaClient } from '../database.js';
import { userStorage, UserStorage } from './userStorage.js';
import { teamStorage, TeamStorage } from './teamStorage.js';
import { playerStorage, PlayerStorage } from './playerStorage.js';
import { matchStorage, MatchStorage } from './matchStorage.js';
import { leagueStorage, LeagueStorage } from './leagueStorage.js';
import { staffStorage, StaffStorage } from './staffStorage.js'; // Assuming staffStorage is standalone
import { teamFinancesStorage, TeamFinancesStorage } from './teamFinancesStorage.js'; // Assuming teamFinancesStorage is standalone
import { auctionStorage, AuctionStorage } from './auctionStorage.js';
import { notificationStorage, NotificationStorage } from './notificationStorage.js';
import { injuryStorage, InjuryStorage } from './injuryStorage.js'; // Covers injuries, treatments, conditioning
import { stadiumStorage, StadiumStorage } from './stadiumStorage.js'; // Covers stadiums, facilities, events
import { itemStorage, ItemStorage } from './itemStorage.js';
import { tournamentStorage, TournamentStorage } from './tournamentStorage.js';
import { exhibitionGameStorage, ExhibitionGameStorage } from './exhibitionGameStorage.js';
import { seasonStorage, SeasonStorage } from './seasonStorage.js'; // For Seasons and Playoffs
import { contractStorage, ContractStorage } from './contractStorage.js'; // For PlayerContracts and SalaryCap
import { sponsorshipStorage, SponsorshipStorage } from './sponsorshipStorage.js'; // For SponsorshipDeals and StadiumRevenue
// import { adSystemStorage, AdSystemStorage } from './adSystemStorage';
import { paymentStorage, PaymentStorage } from './paymentStorage.js';
import { scoutingStorage, ScoutingStorage } from './scoutingStorage.js';
import { consumableStorage, ConsumableStorage } from './consumableStorage.js';
import type { Player, Team, Staff, Contract, TeamFinances, Stadium, League, Notification } from '@shared/types/models';


// Interface combining all storage services, similar to the original IStorage
// This provides a type for the aggregated storage object.
export interface IAppStorage {
  // User
  users: UserStorage; // Expose the instance directly
  // Team
  teams: TeamStorage;
  // Player
  players: PlayerStorage;
  // Match
  matches: MatchStorage;
  // League
  leagues: LeagueStorage;
  // Staff
  staff: StaffStorage;
  // TeamFinances
  teamFinances: TeamFinancesStorage;
  // Auction
  auctions: AuctionStorage;
  // Notification
  notifications: NotificationStorage;
  // Injury
  injuries: InjuryStorage;
  // Stadium
  stadiums: StadiumStorage;
  // Item
  items: ItemStorage;
  // Tournament
  tournaments: TournamentStorage;
  // ExhibitionGame
  exhibitionGames: ExhibitionGameStorage;
  // Season (Seasons & Playoffs)
  seasons: SeasonStorage;
  // Contract (PlayerContracts & SalaryCap)
  contracts: ContractStorage;
  // Sponsorship (SponsorshipDeals & StadiumRevenue)
  sponsorships: SponsorshipStorage;
  // AdSystem
  // adSystem: AdSystemStorage;
  // Payment
  payments: PaymentStorage;
  // Scouting
  scouting: ScoutingStorage;
  // Consumables
  consumables: ConsumableStorage;
}

// Aggregated storage object
export const storage: IAppStorage = {
  users: userStorage,
  teams: teamStorage,
  players: playerStorage,
  matches: matchStorage,
  leagues: leagueStorage,
  staff: staffStorage,
  teamFinances: teamFinancesStorage,
  auctions: auctionStorage,
  notifications: notificationStorage,
  injuries: injuryStorage,
  stadiums: stadiumStorage,
  items: itemStorage,
  tournaments: tournamentStorage,
  exhibitionGames: exhibitionGameStorage,
  seasons: seasonStorage,
  contracts: contractStorage,
  sponsorships: sponsorshipStorage,
  // adSystem: adSystemStorage,
  payments: paymentStorage,
  scouting: scoutingStorage,
  consumables: consumableStorage,
};

// Example of how it might be used elsewhere:
// import { storage } from './storage'; // (from the directory containing this index.ts)
// const user = await storage.users.getUser('some-id');
// const team = await storage.Team.createTeam(...);

// Export getPrismaClient for direct database access when needed
export { getPrismaClient };

// This structure means the old server/storage.ts can eventually be deleted or
// be refactored to just re-export this `storage` object if a transition period is needed.
// For now, services and routes will need to change their imports from `../storage`
// to `../storage/index` or directly to `../storage/specificStorageFile`.
// The plan is to update them to use this central export.Tool output for `create_file_with_block`:
