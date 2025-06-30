import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
  decimal,
  boolean,
  uuid,
  serial,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { nanoid } from "nanoid";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  credits: integer("credits").default(10000),
  stripeCustomerId: varchar("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: varchar("name").notNull(),
  division: integer("division").default(8),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  draws: integer("draws").default(0),
  points: integer("points").default(0),
  teamPower: integer("team_power").default(0),
  credits: integer("credits").default(15000),
  exhibitionCredits: integer("exhibition_credits").default(3),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  isPaidUser: boolean("is_paid_user").default(false),
  seasonsInactive: integer("seasons_inactive").default(0),
  formation: text("formation"),
  substitutionOrder: text("substitution_order"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  name: varchar("name").notNull(), // computed from firstName + lastName
  race: varchar("race").notNull(), // human, sylvan, gryll, lumina, umbra
  age: integer("age").notNull(),
  position: varchar("position").default("player"),
  
  // Core attributes (1-40 scale)
  speed: integer("speed").notNull(),
  power: integer("power").notNull(),
  throwing: integer("throwing").notNull(),
  catching: integer("catching").notNull(),
  kicking: integer("kicking").notNull(),
  stamina: integer("stamina").notNull(),
  leadership: integer("leadership").notNull(),
  agility: integer("agility").notNull(),
  
  // Potential system (1-5 stars)
  speedPotential: decimal("speed_potential", { precision: 2, scale: 1 }),
  powerPotential: decimal("power_potential", { precision: 2, scale: 1 }),
  throwingPotential: decimal("throwing_potential", { precision: 2, scale: 1 }),
  catchingPotential: decimal("catching_potential", { precision: 2, scale: 1 }),
  kickingPotential: decimal("kicking_potential", { precision: 2, scale: 1 }),
  staminaPotential: decimal("stamina_potential", { precision: 2, scale: 1 }),
  leadershipPotential: decimal("leadership_potential", { precision: 2, scale: 1 }),
  agilityPotential: decimal("agility_potential", { precision: 2, scale: 1 }),
  
  // Financial & Contract
  salary: integer("salary").notNull(),
  contractSeasons: integer("contract_seasons").default(3),
  contractStartSeason: integer("contract_start_season").default(1),
  contractValue: integer("contract_value").notNull(),
  
  // Tactics & Position
  fieldPosition: jsonb("field_position"), // {x: number, y: number}
  isStarter: boolean("is_starter").default(false),
  tacticalRole: varchar("tactical_role"), // passer, runner, blocker
  isOnTaxi: boolean("is_on_taxi").default(false), // recruited players during season
  
  // Inventory equipment slots
  helmetItemId: uuid("helmet_item_id"),
  chestItemId: uuid("chest_item_id"),
  shoesItemId: uuid("shoes_item_id"),
  glovesItemId: uuid("gloves_item_id"),
  
  // Player development
  injuries: jsonb("injuries").default([]),
  abilities: jsonb("abilities").default([]),
  camaraderie: integer("camaraderie").default(50), // team chemistry
  
  // Marketplace
  isMarketplace: boolean("is_marketplace").default(false),
  marketplacePrice: integer("marketplace_price"),
  marketplaceEndTime: timestamp("marketplace_end_time"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leagues = pgTable("leagues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  division: integer("division").notNull(),
  season: integer("season").default(1),
  gameDay: integer("game_day").default(1), // Current day of the season (1-14)
  maxTeams: integer("max_teams").default(8),
  status: varchar("status").default("active"), // active, completed, upcoming
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id").references(() => leagues.id),
  tournamentId: uuid("tournament_id"),
  homeTeamId: uuid("home_team_id").references(() => teams.id).notNull(),
  awayTeamId: uuid("away_team_id").references(() => teams.id).notNull(),
  homeScore: integer("home_score").default(0),
  awayScore: integer("away_score").default(0),
  status: varchar("status").default("scheduled"), // scheduled, live, completed
  matchType: varchar("match_type").default("league"), // league, tournament, exhibition
  gameDay: integer("game_day"), // Which day of the season
  gameData: jsonb("game_data"),
  replayCode: varchar("replay_code"), // Code to rewatch the match
  scheduledTime: timestamp("scheduled_time"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Equipment/Items table
export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // helmet, chest, shoes, gloves
  rarity: varchar("rarity").notNull(), // common, rare, epic, legendary
  slot: varchar("slot"), // equipment slot
  statBoosts: jsonb("stat_boosts").default({}), // {speed: 2, power: 1, etc}
  description: text("description"),
  marketValue: integer("market_value").default(0),
  marketplacePrice: integer("marketplace_price"), // Current marketplace listing price
  teamId: uuid("team_id").references(() => teams.id), // Owner team
  createdAt: timestamp("created_at").defaultNow(),
});

// Staff management table
export const staff = pgTable("staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  type: varchar("type").notNull(), // head_coach, trainer_offense, trainer_defense, trainer_physical, head_scout, recruiting_scout, recovery_specialist
  name: varchar("name").notNull(),
  level: integer("level").default(1),
  salary: integer("salary").notNull(),
  
  // Staff-specific stats
  offenseRating: integer("offense_rating").default(0),
  defenseRating: integer("defense_rating").default(0),
  physicalRating: integer("physical_rating").default(0),
  scoutingRating: integer("scouting_rating").default(0),
  recruitingRating: integer("recruiting_rating").default(0),
  recoveryRating: integer("recovery_rating").default(0),
  coachingRating: integer("coaching_rating").default(0),
  
  abilities: jsonb("abilities").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// Team finances table
export const teamFinances = pgTable("team_finances", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  season: integer("season").default(1),
  
  // Income streams
  ticketSales: integer("ticket_sales").default(0),
  concessionSales: integer("concession_sales").default(0),
  jerseySales: integer("jersey_sales").default(0),
  sponsorships: integer("sponsorships").default(0),
  
  // Expenses
  playerSalaries: integer("player_salaries").default(0),
  staffSalaries: integer("staff_salaries").default(0),
  facilities: integer("facilities").default(0),
  
  // Balance
  credits: integer("credits").default(50000),
  totalIncome: integer("total_income").default(0),
  totalExpenses: integer("total_expenses").default(0),
  netIncome: integer("net_income").default(0),
  premiumCurrency: integer("premium_currency").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Tournaments table for daily tournament entries
export const tournaments = pgTable("tournaments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  division: integer("division").notNull(),
  entryFee: integer("entry_fee").notNull(),
  maxTeams: integer("max_teams").default(8),
  status: varchar("status").default("open"), // open, in_progress, completed
  prizes: jsonb("prizes").default({}), // {first: 5000, second: 2000}
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tournament entries table
export const tournamentEntries = pgTable("tournament_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tournamentId: uuid("tournament_id").references(() => tournaments.id).notNull(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  entryTime: timestamp("entry_time").defaultNow(),
  placement: integer("placement"), // Final tournament placement
  prizeWon: integer("prize_won").default(0),
});

// Team inventory for equipment, trophies, and tournament entries
export const teamInventory = pgTable("team_inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  itemId: uuid("item_id").references(() => items.id),
  itemType: varchar("item_type").notNull(), // equipment, trophy, tournament_entry
  name: varchar("name").notNull(),
  description: text("description"),
  rarity: varchar("rarity"), // common, rare, epic, legendary
  metadata: jsonb("metadata").default({}), // Additional item data
  quantity: integer("quantity").default(1),
  acquiredAt: timestamp("acquired_at").defaultNow(),
});

// League standings table
export const leagueStandings = pgTable("league_standings", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  draws: integer("draws").default(0),
  points: integer("points").default(0), // 3 for win, 1 for draw
  goalsFor: integer("goals_for").default(0),
  goalsAgainst: integer("goals_against").default(0),
  goalDifference: integer("goal_difference").default(0),
  position: integer("position").default(1),
  gamesPlayed: integer("games_played").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Exhibition games tracking for daily limit
export const exhibitionGames = pgTable("exhibition_games", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  opponentTeamId: uuid("opponent_team_id").references(() => teams.id).notNull(),
  result: varchar("result"), // win, loss, draw
  score: varchar("score"), // "2-1"
  playedDate: timestamp("played_date").defaultNow(),
  gameData: jsonb("game_data"), // Match simulation data
  replayCode: varchar("replay_code"),
});

// Enhanced marketplace with bidding system
export const playerAuctions = pgTable("player_auctions", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id").references(() => players.id).notNull(),
  sellerId: uuid("seller_id").references(() => teams.id).notNull(),
  startingPrice: integer("starting_price").notNull(),
  currentBid: integer("current_bid").default(0),
  buyoutPrice: integer("buyout_price"),
  highestBidderId: uuid("highest_bidder_id").references(() => teams.id),
  auctionType: varchar("auction_type").default("standard"), // standard, buyout, reserve
  reservePrice: integer("reserve_price"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time").notNull(),
  status: varchar("status").default("active"), // active, completed, cancelled
  bidsCount: integer("bids_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auctionBids = pgTable("auction_bids", {
  id: uuid("id").primaryKey().defaultRandom(),
  auctionId: uuid("auction_id").references(() => playerAuctions.id).notNull(),
  bidderId: uuid("bidder_id").references(() => teams.id).notNull(),
  bidAmount: integer("bid_amount").notNull(),
  bidType: varchar("bid_type").default("standard"), // standard, auto, buyout
  maxAutoBid: integer("max_auto_bid"),
  isWinning: boolean("is_winning").default(false),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Push notifications system
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(), // auction_outbid, match_starting, injury, etc.
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"), // additional data for the notification
  isRead: boolean("is_read").default(false),
  priority: varchar("priority").default("normal"), // low, normal, high, urgent
  actionUrl: varchar("action_url"), // URL for notification action
  createdAt: timestamp("created_at").defaultNow(),
});

// Detailed injury and recovery mechanics
export const playerInjuries = pgTable("player_injuries", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id").references(() => players.id).notNull(),
  injuryType: varchar("injury_type").notNull(), // minor, moderate, severe, career_threatening
  injuryName: varchar("injury_name").notNull(),
  description: text("description"),
  severity: integer("severity").notNull(), // 1-10 scale
  recoveryTime: integer("recovery_time").notNull(), // days
  remainingTime: integer("remaining_time").notNull(), // days left
  statImpact: jsonb("stat_impact"), // which stats are affected and by how much
  treatmentCost: integer("treatment_cost").default(0),
  isActive: boolean("is_active").default(true),
  injuredAt: timestamp("injured_at").defaultNow(),
  expectedRecovery: timestamp("expected_recovery"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  teams: many(teams),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  user: one(users, {
    fields: [teams.userId],
    references: [users.id],
  }),
  players: many(players),
  staff: many(staff),
  homeMatches: many(matches, { relationName: "homeTeam" }),
  awayMatches: many(matches, { relationName: "awayTeam" }),
}));

export const playersRelations = relations(players, ({ one }) => ({
  team: one(teams, {
    fields: [players.teamId],
    references: [teams.id],
  }),
  helmetItem: one(items, {
    fields: [players.helmetItemId],
    references: [items.id],
    relationName: "helmet",
  }),
  chestItem: one(items, {
    fields: [players.chestItemId],
    references: [items.id],
    relationName: "chest",
  }),
  shoesItem: one(items, {
    fields: [players.shoesItemId],
    references: [items.id],
    relationName: "shoes",
  }),
  glovesItem: one(items, {
    fields: [players.glovesItemId],
    references: [items.id],
    relationName: "gloves",
  }),
}));

export const itemsRelations = relations(items, ({ many }) => ({
  playersHelmet: many(players, { relationName: "helmet" }),
  playersChest: many(players, { relationName: "chest" }),
  playersShoes: many(players, { relationName: "shoes" }),
  playersGloves: many(players, { relationName: "gloves" }),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  league: one(leagues, {
    fields: [matches.leagueId],
    references: [leagues.id],
  }),
  homeTeam: one(teams, {
    fields: [matches.homeTeamId],
    references: [teams.id],
    relationName: "homeTeam",
  }),
  awayTeam: one(teams, {
    fields: [matches.awayTeamId],
    references: [teams.id],
    relationName: "awayTeam",
  }),
}));

export const staffRelations = relations(staff, ({ one }) => ({
  team: one(teams, {
    fields: [staff.teamId],
    references: [teams.id],
  }),
}));

export const leaguesRelations = relations(leagues, ({ many }) => ({
  matches: many(matches),
}));

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Ad tracking table for monetization
export const adViews = pgTable("ad_views", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  adType: varchar("ad_type").notNull(), // 'interstitial', 'rewarded_video', 'banner'
  placement: varchar("placement"), // 'halftime', 'store', 'tryouts', etc.
  rewardType: varchar("reward_type"), // 'credits', 'premium_currency', 'none'
  rewardAmount: integer("reward_amount").default(0),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export type AdView = typeof adViews.$inferSelect;
export type InsertAdView = typeof adViews.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;
export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;
export type League = typeof leagues.$inferSelect;
export type InsertLeague = typeof leagues.$inferInsert;
export type Staff = typeof staff.$inferSelect;
export type InsertStaff = typeof staff.$inferInsert;
export type Item = typeof items.$inferSelect;
export type InsertItem = typeof items.$inferInsert;
export type TeamFinances = typeof teamFinances.$inferSelect;
export type InsertTeamFinances = typeof teamFinances.$inferInsert;
export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = typeof tournaments.$inferInsert;
export type TournamentEntry = typeof tournamentEntries.$inferSelect;
export type InsertTournamentEntry = typeof tournamentEntries.$inferInsert;
export type TeamInventory = typeof teamInventory.$inferSelect;
export type InsertTeamInventory = typeof teamInventory.$inferInsert;
export type LeagueStanding = typeof leagueStandings.$inferSelect;
export type InsertLeagueStanding = typeof leagueStandings.$inferInsert;
export type ExhibitionGame = typeof exhibitionGames.$inferSelect;
export type InsertExhibitionGame = typeof exhibitionGames.$inferInsert;

export type PlayerAuction = typeof playerAuctions.$inferSelect;
export type InsertPlayerAuction = typeof playerAuctions.$inferInsert;

export type AuctionBid = typeof auctionBids.$inferSelect;
export type InsertAuctionBid = typeof auctionBids.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export type PlayerInjury = typeof playerInjuries.$inferSelect;
export type InsertPlayerInjury = typeof playerInjuries.$inferInsert;

// Season Championships & Playoffs
export const seasons = pgTable("seasons", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  name: varchar("name").notNull(),
  year: integer("year").notNull(),
  status: varchar("status").default("active"), // active, completed, playoffs
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  playoffStartDate: timestamp("playoff_start_date"),
  championTeamId: varchar("champion_team_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const playoffs = pgTable("playoffs", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  seasonId: varchar("season_id").notNull(),
  division: integer("division").notNull(),
  round: integer("round").notNull(), // 1=first round, 2=semifinals, 3=finals
  matchId: varchar("match_id"),
  team1Id: varchar("team1_id").notNull(),
  team2Id: varchar("team2_id").notNull(),
  winnerId: varchar("winner_id"),
  status: varchar("status").default("pending"), // pending, completed
  scheduledDate: timestamp("scheduled_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contract System
export const playerContracts = pgTable("player_contracts", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  playerId: varchar("player_id").notNull(),
  teamId: varchar("team_id").notNull(),
  salary: integer("salary").notNull(),
  duration: integer("duration").notNull(), // years
  remainingYears: integer("remaining_years").notNull(),
  bonuses: jsonb("bonuses"), // performance bonuses
  contractType: varchar("contract_type").default("standard"), // standard, rookie, veteran
  signedDate: timestamp("signed_date").defaultNow(),
  expiryDate: timestamp("expiry_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salaryCap = pgTable("salary_cap", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  teamId: varchar("team_id").notNull(),
  season: integer("season").notNull(),
  totalSalary: integer("total_salary").default(0),
  capLimit: integer("cap_limit").default(50000000), // 50M default cap
  capSpace: integer("cap_space").default(50000000),
  luxuryTax: integer("luxury_tax").default(0),
  penalties: integer("penalties").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sponsorship & Revenue
export const sponsorshipDeals = pgTable("sponsorship_deals", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  teamId: varchar("team_id").notNull(),
  sponsorName: varchar("sponsor_name").notNull(),
  dealType: varchar("deal_type").notNull(), // jersey, stadium, equipment, naming_rights
  value: integer("value").notNull(),
  duration: integer("duration").notNull(), // years
  remainingYears: integer("remaining_years").notNull(),
  bonusConditions: jsonb("bonus_conditions"), // performance triggers
  status: varchar("status").default("active"),
  signedDate: timestamp("signed_date").defaultNow(),
  expiryDate: timestamp("expiry_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stadiumRevenue = pgTable("stadium_revenue", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  teamId: varchar("team_id").notNull(),
  season: integer("season").notNull(),
  ticketSales: integer("ticket_sales").default(0),
  concessionSales: integer("concession_sales").default(0),
  merchandiseSales: integer("merchandise_sales").default(0),
  parkingRevenue: integer("parking_revenue").default(0),
  corporateBoxes: integer("corporate_boxes").default(0),
  namingRights: integer("naming_rights").default(0),
  totalRevenue: integer("total_revenue").default(0),
  month: integer("month").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Draft System Removed - No longer needed

export type Season = typeof seasons.$inferSelect;
export type InsertSeason = typeof seasons.$inferInsert;
export type Playoff = typeof playoffs.$inferSelect;
export type InsertPlayoff = typeof playoffs.$inferInsert;
export type PlayerContract = typeof playerContracts.$inferSelect;
export type InsertPlayerContract = typeof playerContracts.$inferInsert;
export type SalaryCap = typeof salaryCap.$inferSelect;
export type InsertSalaryCap = typeof salaryCap.$inferInsert;
export type SponsorshipDeal = typeof sponsorshipDeals.$inferSelect;
export type InsertSponsorshipDeal = typeof sponsorshipDeals.$inferInsert;
export type StadiumRevenue = typeof stadiumRevenue.$inferSelect;
export type InsertStadiumRevenue = typeof stadiumRevenue.$inferInsert;

// Injury treatment and recovery tracking
export const injuryTreatments = pgTable("injury_treatments", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  injuryId: varchar("injury_id").notNull().references(() => playerInjuries.id),
  treatmentType: varchar("treatment_type").notNull(), // rest, therapy, surgery, medication
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  effectiveness: integer("effectiveness").default(0), // 0-100%
  cost: integer("cost").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Medical staff for injury management
export const medicalStaff = pgTable("medical_staff", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  name: varchar("name").notNull(),
  specialty: varchar("specialty").notNull(), // doctor, physiotherapist, surgeon, nutritionist
  experience: integer("experience").default(1), // years
  effectiveness: integer("effectiveness").default(50), // 0-100%
  salary: integer("salary").default(50000),
  contractLength: integer("contract_length").default(1), // years
  hired: timestamp("hired").defaultNow(),
});

// Injury prevention and conditioning
export const playerConditioning = pgTable("player_conditioning", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  playerId: varchar("player_id").notNull().references(() => players.id),
  fitnessLevel: integer("fitness_level").default(100), // 0-100%
  flexibilityScore: integer("flexibility_score").default(50), // 0-100%
  strengthScore: integer("strength_score").default(50), // 0-100%
  enduranceScore: integer("endurance_score").default(50), // 0-100%
  injuryProneness: integer("injury_proneness").default(50), // 0-100% (lower is better)
  lastPhysical: timestamp("last_physical"),
  trainingLoad: integer("training_load").default(50), // 0-100%
  restDays: integer("rest_days").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Training facilities and equipment
export const trainingFacilities = pgTable("training_facilities", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  facilityType: varchar("facility_type").notNull(), // gym, medical_bay, recovery_pool, etc.
  quality: integer("quality").default(50), // 0-100%
  capacity: integer("capacity").default(10),
  maintenanceCost: integer("maintenance_cost").default(1000),
  injuryReduction: integer("injury_reduction").default(0), // 0-50% reduction
  recoveryBonus: integer("recovery_bonus").default(0), // 0-50% faster recovery
  purchased: timestamp("purchased").defaultNow(),
});

// Injury history and analytics
export const injuryReports = pgTable("injury_reports", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  season: varchar("season").notNull(),
  totalInjuries: integer("total_injuries").default(0),
  severityAverage: integer("severity_average").default(0),
  recoveryTimeAverage: integer("recovery_time_average").default(0),
  mostCommonInjury: varchar("most_common_injury"),
  injuryTrends: jsonb("injury_trends"), // monthly breakdown
  preventionScore: integer("prevention_score").default(50), // team's injury prevention rating
  createdAt: timestamp("created_at").defaultNow(),
});

export type InjuryTreatment = typeof injuryTreatments.$inferSelect;
export type InsertInjuryTreatment = typeof injuryTreatments.$inferInsert;
export type MedicalStaff = typeof medicalStaff.$inferSelect;
export type InsertMedicalStaff = typeof medicalStaff.$inferInsert;
export type PlayerConditioning = typeof playerConditioning.$inferSelect;
export type InsertPlayerConditioning = typeof playerConditioning.$inferInsert;
export type TrainingFacility = typeof trainingFacilities.$inferSelect;
export type InsertTrainingFacility = typeof trainingFacilities.$inferInsert;
export type InjuryReport = typeof injuryReports.$inferSelect;
export type InsertInjuryReport = typeof injuryReports.$inferInsert;

// Stadium and facility management
export const stadiums = pgTable("stadiums", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  name: varchar("name").notNull(),
  level: integer("level").default(1), // 1-10 stadium levels
  capacity: integer("capacity").default(5000),
  fieldType: varchar("field_type").default("standard"), // standard, large, compact, synthetic, natural
  fieldSize: varchar("field_size").default("regulation"), // regulation, extended, compact
  lighting: varchar("lighting").default("basic"), // basic, professional, premium
  surface: varchar("surface").default("grass"), // grass, synthetic, hybrid
  drainage: varchar("drainage").default("basic"), // basic, advanced, premium
  facilities: jsonb("facilities").default({}), // parking, concessions, luxury_boxes, etc.
  upgradeCost: integer("upgrade_cost").default(50000),
  maintenanceCost: integer("maintenance_cost").default(5000),
  revenueMultiplier: integer("revenue_multiplier").default(100), // percentage
  weatherResistance: integer("weather_resistance").default(50), // 0-100%
  homeAdvantage: integer("home_advantage").default(5), // 0-20% boost
  constructionDate: timestamp("construction_date").defaultNow(),
  lastUpgrade: timestamp("last_upgrade"),
});

export const facilityUpgrades = pgTable("facility_upgrades", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  stadiumId: varchar("stadium_id").notNull().references(() => stadiums.id),
  upgradeType: varchar("upgrade_type").notNull(), // seating, lighting, field, security, etc.
  name: varchar("name").notNull(),
  description: varchar("description"),
  cost: integer("cost").notNull(),
  effect: jsonb("effect").notNull(), // capacity: +1000, revenue: +10%, etc.
  requirements: jsonb("requirements"), // level: 3, other upgrades, etc.
  installed: timestamp("installed").defaultNow(),
});

export const stadiumEvents = pgTable("stadium_events", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  stadiumId: varchar("stadium_id").notNull().references(() => stadiums.id),
  eventType: varchar("event_type").notNull(), // concert, exhibition, corporate
  name: varchar("name").notNull(),
  revenue: integer("revenue").default(0),
  cost: integer("cost").default(0),
  attendees: integer("attendees").default(0),
  eventDate: timestamp("event_date").notNull(),
  duration: integer("duration").default(1), // hours
  status: varchar("status").default("scheduled"), // scheduled, active, completed, cancelled
});

export type Stadium = typeof stadiums.$inferSelect;
export type InsertStadium = typeof stadiums.$inferInsert;
export type FacilityUpgrade = typeof facilityUpgrades.$inferSelect;
export type InsertFacilityUpgrade = typeof facilityUpgrades.$inferInsert;
export type StadiumEvent = typeof stadiumEvents.$inferSelect;
export type InsertStadiumEvent = typeof stadiumEvents.$inferInsert;

// Scouting system tables
export const scouts = pgTable("scouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  name: varchar("name").notNull(),
  quality: integer("quality").default(50), // 1-100, affects scouting accuracy
  specialization: varchar("specialization"), // "offense", "defense", "general"
  experience: integer("experience").default(1),
  salary: integer("salary").default(50000),
  contractLength: integer("contract_length").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scoutingReports = pgTable("scouting_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  scoutId: uuid("scout_id").references(() => scouts.id).notNull(),
  playerId: uuid("player_id"), // null for prospect reports
  prospectData: jsonb("prospect_data"), // for tryout candidates
  reportType: varchar("report_type").notNull(), // "player", "prospect", "team"
  confidence: integer("confidence").default(50), // scout's confidence in the report
  statRanges: jsonb("stat_ranges"), // min/max values for each stat
  potentialRating: real("potential_rating"), // 0.5 to 5.0 stars
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Scout = typeof scouts.$inferSelect;
export type InsertScout = typeof scouts.$inferInsert;
export type ScoutingReport = typeof scoutingReports.$inferSelect;
export type InsertScoutingReport = typeof scoutingReports.$inferInsert;

// Payment Processing Tables
export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  userId: varchar("user_id").references(() => users.id).notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id").unique(),
  stripeCustomerId: varchar("stripe_customer_id"),
  amount: integer("amount").notNull(), // amount in cents
  credits: integer("credits").notNull(), // credits purchased
  status: varchar("status").default("pending"), // pending, completed, failed, refunded
  currency: varchar("currency").default("usd"),
  paymentMethod: varchar("payment_method"), // card, etc.
  failureReason: text("failure_reason"),
  receiptUrl: varchar("receipt_url"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const creditPackages = pgTable("credit_packages", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  name: varchar("name").notNull(),
  description: text("description"),
  credits: integer("credits").notNull(),
  price: integer("price").notNull(), // price in cents
  bonusCredits: integer("bonus_credits").default(0),
  isActive: boolean("is_active").default(true),
  popularTag: boolean("popular_tag").default(false),
  discountPercent: integer("discount_percent").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  userId: varchar("user_id").references(() => users.id).notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id").unique(),
  stripeCustomerId: varchar("stripe_customer_id"),
  status: varchar("status").notNull(), // active, canceled, past_due, unpaid, etc.
  planName: varchar("plan_name").notNull(),
  monthlyCredits: integer("monthly_credits").default(0),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = typeof paymentTransactions.$inferInsert;
export type CreditPackage = typeof creditPackages.$inferSelect;
export type InsertCreditPackage = typeof creditPackages.$inferInsert;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;
