// This file aggregates all domain-specific storage services.
// Other parts of the application can import this single 'storage' object.

import { prisma } from '../db';
import { userStorage, UserStorage } from './userStorage';
import { teamStorage, TeamStorage } from './teamStorage';
import { playerStorage, PlayerStorage } from './playerStorage';
import { matchStorage, MatchStorage } from './matchStorage';
import { leagueStorage, LeagueStorage } from './leagueStorage';
import { staffStorage, StaffStorage } from './staffStorage'; // Assuming staffStorage is standalone
import { teamFinancesStorage, TeamFinancesStorage } from './teamFinancesStorage'; // Assuming teamFinancesStorage is standalone
import { auctionStorage, AuctionStorage } from './auctionStorage';
import { notificationStorage, NotificationStorage } from './notificationStorage';
import { injuryStorage, InjuryStorage } from './injuryStorage'; // Covers injuries, treatments, conditioning
import { stadiumStorage, StadiumStorage } from './stadiumStorage'; // Covers stadiums, facilities, events
import { itemStorage, ItemStorage } from './itemStorage';
import { tournamentStorage, TournamentStorage } from './tournamentStorage';
import { exhibitionGameStorage, ExhibitionGameStorage } from './exhibitionGameStorage';
import { seasonStorage, SeasonStorage } from './seasonStorage'; // For Seasons and Playoffs
import { contractStorage, ContractStorage } from './contractStorage'; // For PlayerContracts and SalaryCap
import { sponsorshipStorage, SponsorshipStorage } from './sponsorshipStorage'; // For SponsorshipDeals and StadiumRevenue
// import { adSystemStorage, AdSystemStorage } from './adSystemStorage';
import { paymentStorage, PaymentStorage } from './paymentStorage';
import { scoutingStorage, ScoutingStorage } from './scoutingStorage';
import { consumableStorage, ConsumableStorage } from './consumableStorage';

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
// const team = await storage.teams.createTeam(...);

// Export prisma for direct database access when needed
export { prisma };

// This structure means the old server/storage.ts can eventually be deleted or
// be refactored to just re-export this `storage` object if a transition period is needed.
// For now, services and routes will need to change their imports from `../storage`
// to `../storage/index` or directly to `../storage/specificStorageFile`.
// The plan is to update them to use this central export.Tool output for `create_file_with_block`:
