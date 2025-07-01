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
  dailyAdWatchCount: integer("daily_ad_watch_count").default(0),
  lastAdWatchDate: timestamp("last_ad_watch_date"),
  totalAdWatchCount: integer("total_ad_watch_count").default(0),
  premiumRewardProgress: integer("premium_reward_progress").default(0),
  role: varchar("role", { length: 20 }).default("user"),
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
  teamCamaraderie: integer("team_camaraderie").default(50),
  championshipsWon: integer("championships_won").default(0),
  credits: integer("credits").default(50000),
  gems: integer("gems").default(0),
  exhibitionCredits: integer("exhibition_credits").default(3),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  isPaidUser: boolean("is_paid_user").default(false),
  seasonsInactive: integer("seasons_inactive").default(0),
  formation: text("formation"),
  substitutionOrder: text("substitution_order"),
  cumulativeTeamAdWatchCount: integer("cumulative_team_ad_watch_count").default(0),
  fieldSize: varchar("field_size", { length: 20 }).default("standard"),
  tacticalFocus: varchar("tactical_focus", { length: 20 }).default("balanced"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  name: varchar("name").notNull(),
  race: varchar("race").notNull(),
  age: integer("age").notNull(),
  position: varchar("position").default("player"),
  
  speed: integer("speed").notNull(),
  power: integer("power").notNull(),
  throwing: integer("throwing").notNull(),
  catching: integer("catching").notNull(),
  kicking: integer("kicking").notNull(),
  stamina: integer("stamina").notNull(),
  leadership: integer("leadership").notNull(),
  agility: integer("agility").notNull(),
  
  speedPotential: decimal("speed_potential", { precision: 2, scale: 1 }),
  powerPotential: decimal("power_potential", { precision: 2, scale: 1 }),
  throwingPotential: decimal("throwing_potential", { precision: 2, scale: 1 }),
  catchingPotential: decimal("catching_potential", { precision: 2, scale: 1 }),
  kickingPotential: decimal("kicking_potential", { precision: 2, scale: 1 }),
  staminaPotential: decimal("stamina_potential", { precision: 2, scale: 1 }),
  leadershipPotential: decimal("leadership_potential", { precision: 2, scale: 1 }),
  agilityPotential: decimal("agility_potential", { precision: 2, scale: 1 }),
  overallPotentialStars: decimal("overall_potential_stars", { precision: 2, scale: 1 }),
  
  salary: integer("salary").notNull(),
  contractSeasons: integer("contract_seasons").default(3),
  contractStartSeason: integer("contract_start_season").default(1),
  contractValue: integer("contract_value").notNull(),
  
  fieldPosition: jsonb("field_position"),
  isStarter: boolean("is_starter").default(false),
  tacticalRole: varchar("tactical_role"),
  isOnTaxi: boolean("is_on_taxi").default(false),
  
  helmetItemId: uuid("helmet_item_id"),
  chestItemId: uuid("chest_item_id"),
  shoesItemId: uuid("shoes_item_id"),
  glovesItemId: uuid("gloves_item_id"),
  
  injuries: jsonb("injuries").default([]),
  abilities: jsonb("abilities").default([]),
  camaraderie: integer("camaraderie").default(50),
  yearsOnTeam: integer("years_on_team").default(0),
  
  // Aging system fields
  careerInjuries: integer("career_injuries").default(0),
  gamesPlayedLastSeason: integer("games_played_last_season").default(0),
  
  // Injury & Stamina System (dual stamina mechanics)
  inGameStamina: integer("in_game_stamina").default(100),
  dailyStaminaLevel: integer("daily_stamina_level").default(100),
  injuryStatus: varchar("injury_status", { length: 20 }).default("Healthy"),
  injuryRecoveryPointsNeeded: integer("injury_recovery_points_needed").default(0),
  injuryRecoveryPointsCurrent: integer("injury_recovery_points_current").default(0),
  dailyItemsUsed: integer("daily_items_used").default(0),
  
  isMarketplace: boolean("is_marketplace").default(false),
  marketplacePrice: integer("marketplace_price"),
  marketplaceEndTime: timestamp("marketplace_end_time"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),

  totalGamesPlayed: integer("total_games_played").default(0),
  totalScores: integer("total_scores").default(0),
  totalPassingAttempts: integer("total_passing_attempts").default(0),
  totalPassesCompleted: integer("total_passes_completed").default(0),
  totalPassingYards: integer("total_passing_yards").default(0),
  totalRushingYards: integer("total_rushing_yards").default(0),
  totalCatches: integer("total_catches").default(0),
  totalReceivingYards: integer("total_receiving_yards").default(0),
  totalDrops: integer("total_drops").default(0),
  totalFumblesLost: integer("total_fumbles_lost").default(0),
  totalTackles: integer("total_tackles").default(0),
  totalKnockdownsInflicted: integer("total_knockdowns_inflicted").default(0),
  totalInterceptionsCaught: integer("total_interceptions_caught").default(0),
  totalPassesDefended: integer("total_passes_defended").default(0),
});

export const leagues = pgTable("leagues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  division: integer("division").notNull(),
  season: integer("season").default(1),
  gameDay: integer("game_day").default(1),
  maxTeams: integer("max_teams").default(8),
  status: varchar("status").default("active"),
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
  status: varchar("status").default("scheduled"),
  matchType: varchar("match_type").default("league"),
  gameDay: integer("game_day"),
  gameData: jsonb("game_data"),
  replayCode: varchar("replay_code"),
  scheduledTime: timestamp("scheduled_time"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(),
  rarity: varchar("rarity").notNull(),
  slot: varchar("slot"),
  statBoosts: jsonb("stat_boosts").default({}),
  description: text("description"),
  marketValue: integer("market_value").default(0),
  marketplacePrice: integer("marketplace_price"),
  teamId: uuid("team_id").references(() => teams.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const staff = pgTable("staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  type: varchar("type").notNull(),
  name: varchar("name").notNull(),
  level: integer("level").default(1),
  salary: integer("salary").notNull(),
  
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

export const teamFinances = pgTable("team_finances", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  season: integer("season").default(1),
  
  ticketSales: integer("ticket_sales").default(0),
  concessionSales: integer("concession_sales").default(0),
  jerseySales: integer("jersey_sales").default(0),
  sponsorships: integer("sponsorships").default(0),
  
  playerSalaries: integer("player_salaries").default(0),
  staffSalaries: integer("staff_salaries").default(0),
  facilities: integer("facilities").default(0),
  
  credits: integer("credits").default(50000),
  totalIncome: integer("total_income").default(0),
  totalExpenses: integer("total_expenses").default(0),
  netIncome: integer("net_income").default(0),
  premiumCurrency: integer("premium_currency").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const stadiums = pgTable("stadiums", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull().unique(),
  name: varchar("name").notNull(),
  level: integer("level").default(1),
  capacity: integer("capacity").default(15000),
  fanLoyalty: integer("fan_loyalty").default(50), // 0-100 scale
  
  // Field Configuration
  fieldSize: varchar("field_size", { length: 20 }).default("standard"), // standard, large, small
  surface: varchar("surface", { length: 20 }).default("grass"), // grass, synthetic, hybrid
  lighting: varchar("lighting", { length: 20 }).default("basic"), // basic, improved, premium
  
  // Facility Levels (1-5 scale)
  concessionsLevel: integer("concessions_level").default(1),
  parkingLevel: integer("parking_level").default(1),
  merchandisingLevel: integer("merchandising_level").default(1),
  vipSuitesLevel: integer("vip_suites_level").default(0),
  screensLevel: integer("screens_level").default(1),
  lightingLevel: integer("lighting_level").default(1),
  securityLevel: integer("security_level").default(1),
  
  // Calculated Values
  homeAdvantage: integer("home_advantage").default(5), // 0-100 scale
  revenueMultiplier: integer("revenue_multiplier").default(100), // percentage
  maintenanceCost: integer("maintenance_cost").default(5000),
  weatherResistance: integer("weather_resistance").default(50),
  
  // Season Tracking
  lastSeasonRecord: varchar("last_season_record").default("0-0-0"),
  lastThreeGamesRecord: varchar("last_three_games_record").default("0-0-0"),
  currentWinStreak: integer("current_win_streak").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stadiumRevenue = pgTable("stadium_revenue", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  stadiumId: uuid("stadium_id").references(() => stadiums.id).notNull(),
  matchId: uuid("match_id").references(() => matches.id),
  
  // Game Details
  isHomeGame: boolean("is_home_game").notNull(),
  attendance: integer("attendance").default(0),
  attendanceRate: real("attendance_rate").default(0.35), // 0.0 - 1.0
  intimidationFactor: real("intimidation_factor").default(0), // 0-10 scale
  
  // Revenue Breakdown
  ticketSales: integer("ticket_sales").default(0),
  concessionSales: integer("concession_sales").default(0),
  parkingRevenue: integer("parking_revenue").default(0),
  apparelSales: integer("apparel_sales").default(0),
  vipSuiteRevenue: integer("vip_suite_revenue").default(0),
  atmosphereBonus: integer("atmosphere_bonus").default(0),
  totalRevenue: integer("total_revenue").default(0),
  
  // Costs
  maintenanceCost: integer("maintenance_cost").default(0),
  eventCosts: integer("event_costs").default(0),
  
  gameDate: timestamp("game_date").defaultNow(),
  season: integer("season").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const facilityUpgrades = pgTable("facility_upgrades", {
  id: uuid("id").primaryKey().defaultRandom(),
  stadiumId: uuid("stadium_id").references(() => stadiums.id).notNull(),
  upgradeType: varchar("upgrade_type").notNull(), // concessions, parking, vip_suites, etc.
  upgradeName: varchar("upgrade_name").notNull(),
  level: integer("level").notNull(),
  cost: integer("cost").notNull(),
  description: text("description"),
  effects: jsonb("effects"), // JSON object with the upgrade effects
  installedAt: timestamp("installed_at").defaultNow(),
});

export const stadiumEvents = pgTable("stadium_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  stadiumId: uuid("stadium_id").references(() => stadiums.id).notNull(),
  eventType: varchar("event_type").notNull(),
  name: varchar("name").notNull(),
  revenue: integer("revenue").default(0),
  cost: integer("cost").default(0),
  attendees: integer("attendees").default(0),
  eventDate: timestamp("event_date").notNull(),
  duration: integer("duration").default(1),
  status: varchar("status").default("scheduled"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tournaments = pgTable("tournaments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  division: integer("division").notNull(),
  entryFee: integer("entry_fee").notNull(),
  maxTeams: integer("max_teams").default(8),
  status: varchar("status").default("open"),
  prizes: jsonb("prizes").default({}),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tournamentEntries = pgTable("tournament_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tournamentId: uuid("tournament_id").references(() => tournaments.id).notNull(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  entryTime: timestamp("entry_time").defaultNow(),
  placement: integer("placement"),
  prizeWon: integer("prize_won").default(0),
});

export const teamInventory = pgTable("team_inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  itemId: uuid("item_id").references(() => items.id),
  itemType: varchar("item_type").notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  rarity: varchar("rarity"),
  metadata: jsonb("metadata").default({}),
  quantity: integer("quantity").default(1),
  acquiredAt: timestamp("acquired_at").defaultNow(),
});

export const matchConsumables = pgTable("match_consumables", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id").references(() => matches.id).notNull(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  consumableId: varchar("consumable_id").notNull(), // References store item id
  consumableName: varchar("consumable_name").notNull(),
  effectType: varchar("effect_type").notNull(), // "stat_boost", "training_credits", "scouting"
  effectData: jsonb("effect_data").notNull(), // Contains stat bonuses or other effect data
  activatedAt: timestamp("activated_at").defaultNow(),
  usedInMatch: boolean("used_in_match").default(false),
});

export const leagueStandings = pgTable("league_standings", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  draws: integer("draws").default(0),
  points: integer("points").default(0),
  goalsFor: integer("goals_for").default(0),
  goalsAgainst: integer("goals_against").default(0),
  goalDifference: integer("goal_difference").default(0),
  position: integer("position").default(1),
  gamesPlayed: integer("games_played").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const exhibitionGames = pgTable("exhibition_games", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  opponentTeamId: uuid("opponent_team_id").references(() => teams.id).notNull(),
  result: varchar("result"),
  score: varchar("score"),
  playedDate: timestamp("played_date").defaultNow(),
  gameData: jsonb("game_data"),
  replayCode: varchar("replay_code"),
});

export const playerAuctions = pgTable("player_auctions", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id").references(() => players.id).notNull(),
  sellerId: uuid("seller_id").references(() => teams.id).notNull(),
  startingPrice: integer("starting_price").notNull(),
  currentBid: integer("current_bid").default(0),
  buyoutPrice: integer("buyout_price"),
  highestBidderId: uuid("highest_bidder_id").references(() => teams.id),
  auctionType: varchar("auction_type").default("standard"),
  reservePrice: integer("reserve_price"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time").notNull(),
  status: varchar("status").default("active"),
  bidsCount: integer("bids_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auctionBids = pgTable("auction_bids", {
  id: uuid("id").primaryKey().defaultRandom(),
  auctionId: uuid("auction_id").references(() => playerAuctions.id).notNull(),
  bidderId: uuid("bidder_id").references(() => teams.id).notNull(),
  bidAmount: integer("bid_amount").notNull(),
  bidType: varchar("bid_type").default("standard"),
  maxAutoBid: integer("max_auto_bid"),
  isWinning: boolean("is_winning").default(false),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  isRead: boolean("is_read").default(false),
  priority: varchar("priority").default("normal"),
  actionUrl: varchar("action_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const playerInjuries = pgTable("player_injuries", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id").references(() => players.id).notNull(),
  injuryType: varchar("injury_type").notNull(),
  injuryName: varchar("injury_name").notNull(),
  description: text("description"),
  severity: integer("severity").notNull(),
  recoveryTime: integer("recovery_time").notNull(),
  remainingTime: integer("remaining_time").notNull(),
  statImpact: jsonb("stat_impact"),
  treatmentCost: integer("treatment_cost").default(0),
  isActive: boolean("is_active").default(true),
  injuredAt: timestamp("injured_at").defaultNow(),
  expectedRecovery: timestamp("expected_recovery"),
});

export const playerMatchStats = pgTable("player_match_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id").references(() => players.id).notNull(),
  matchId: uuid("match_id").references(() => matches.id).notNull(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  scores: integer("scores").default(0),
  passingAttempts: integer("passing_attempts").default(0),
  passesCompleted: integer("passes_completed").default(0),
  passingYards: integer("passing_yards").default(0),
  rushingYards: integer("rushing_yards").default(0),
  catches: integer("catches").default(0),
  receivingYards: integer("receiving_yards").default(0),
  drops: integer("drops").default(0),
  fumblesLost: integer("fumbles_lost").default(0),
  tackles: integer("tackles").default(0),
  knockdownsInflicted: integer("knockdowns_inflicted").default(0),
  interceptionsCaught: integer("interceptions_caught").default(0),
  passesDefended: integer("passes_defended").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teamMatchStats = pgTable("team_match_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  matchId: uuid("match_id").references(() => matches.id).notNull(),
  totalOffensiveYards: integer("total_offensive_yards").default(0),
  passingYards: integer("passing_yards").default(0),
  rushingYards: integer("rushing_yards").default(0),
  timeOfPossessionSeconds: integer("time_of_possession_seconds").default(0),
  turnovers: integer("turnovers").default(0),
  totalKnockdownsInflicted: integer("total_knockdowns_inflicted").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  teamMatchStats: many(teamMatchStats),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
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
  playerMatchStats: many(playerMatchStats),
}));

export const itemsRelations = relations(items, ({ many }) => ({
  playersHelmet: many(players, { relationName: "helmet" }),
  playersChest: many(players, { relationName: "chest" }),
  playersShoes: many(players, { relationName: "shoes" }),
  playersGloves: many(players, { relationName: "gloves" }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
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
  playerMatchStats: many(playerMatchStats),
  teamMatchStats: many(teamMatchStats),
}));

export const playerMatchStatsRelations = relations(playerMatchStats, ({ one }) => ({
  player: one(players, {
    fields: [playerMatchStats.playerId],
    references: [players.id],
  }),
  match: one(matches, {
    fields: [playerMatchStats.matchId],
    references: [matches.id],
  }),
  team: one(teams, {
    fields: [playerMatchStats.teamId],
    references: [teams.id],
  }),
}));

export const teamMatchStatsRelations = relations(teamMatchStats, ({ one }) => ({
  team: one(teams, {
    fields: [teamMatchStats.teamId],
    references: [teams.id],
  }),
  match: one(matches, {
    fields: [teamMatchStats.matchId],
    references: [matches.id],
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

export type MatchConsumable = typeof matchConsumables.$inferSelect;
export type InsertMatchConsumable = typeof matchConsumables.$inferInsert;

export const adViews = pgTable("ad_views", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  adType: varchar("ad_type").notNull(),
  placement: varchar("placement"),
  rewardType: varchar("reward_type"),
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
export type PlayerMatchStats = typeof playerMatchStats.$inferSelect;
export type InsertPlayerMatchStats = typeof playerMatchStats.$inferInsert;
export type TeamMatchStats = typeof teamMatchStats.$inferSelect;
export type InsertTeamMatchStats = typeof teamMatchStats.$inferInsert;
export type PlayerAuction = typeof playerAuctions.$inferSelect;
export type InsertPlayerAuction = typeof playerAuctions.$inferInsert;
export type AuctionBid = typeof auctionBids.$inferSelect;
export type InsertAuctionBid = typeof auctionBids.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type PlayerInjury = typeof playerInjuries.$inferSelect;
export type InsertPlayerInjury = typeof playerInjuries.$inferInsert;
export type Stadium = typeof stadiums.$inferSelect;
export type InsertStadium = typeof stadiums.$inferInsert;
export type StadiumRevenue = typeof stadiumRevenue.$inferSelect;
export type InsertStadiumRevenue = typeof stadiumRevenue.$inferInsert;
export type FacilityUpgrade = typeof facilityUpgrades.$inferSelect;
export type InsertFacilityUpgrade = typeof facilityUpgrades.$inferInsert;
export type StadiumEvent = typeof stadiumEvents.$inferSelect;
export type InsertStadiumEvent = typeof stadiumEvents.$inferInsert;

export const seasons = pgTable("seasons", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  name: varchar("name").notNull(),
  year: integer("year").notNull(),
  status: varchar("status").default("active"),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  playoffStartDate: timestamp("playoff_start_date"),
  championTeamId: varchar("champion_team_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  startDateOriginal: timestamp("start_date_original"),
});

export const playoffs = pgTable("playoffs", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  seasonId: varchar("season_id").notNull(),
  division: integer("division").notNull(),
  round: integer("round").notNull(),
  matchId: varchar("match_id"),
  team1Id: varchar("team1_id").notNull(),
  team2Id: varchar("team2_id").notNull(),
  winnerId: varchar("winner_id"),
  status: varchar("status").default("pending"),
  scheduledDate: timestamp("scheduled_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const playerContracts = pgTable("player_contracts", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  playerId: varchar("player_id").notNull(),
  teamId: varchar("team_id").notNull(),
  salary: integer("salary").notNull(),
  duration: integer("duration").notNull(),
  remainingYears: integer("remaining_years").notNull(),
  bonuses: jsonb("bonuses"),
  contractType: varchar("contract_type").default("standard"),
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
  capLimit: integer("cap_limit").default(50000000),
  capSpace: integer("cap_space").default(50000000),
  luxuryTax: integer("luxury_tax").default(0),
  penalties: integer("penalties").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sponsorshipDeals = pgTable("sponsorship_deals", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  teamId: varchar("team_id").notNull(),
  sponsorName: varchar("sponsor_name").notNull(),
  dealType: varchar("deal_type").notNull(),
  value: integer("value").notNull(),
  duration: integer("duration").notNull(),
  remainingYears: integer("remaining_years").notNull(),
  bonusConditions: jsonb("bonus_conditions"),
  status: varchar("status").default("active"),
  signedDate: timestamp("signed_date").defaultNow(),
  expiryDate: timestamp("expiry_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

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

export const injuryTreatments = pgTable("injury_treatments", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  injuryId: varchar("injury_id").notNull().references(() => playerInjuries.id),
  treatmentType: varchar("treatment_type").notNull(),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  effectiveness: integer("effectiveness").default(0),
  cost: integer("cost").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const medicalStaff = pgTable("medical_staff", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  name: varchar("name").notNull(),
  specialty: varchar("specialty").notNull(),
  experience: integer("experience").default(1),
  effectiveness: integer("effectiveness").default(50),
  salary: integer("salary").default(50000),
  contractLength: integer("contract_length").default(1),
  hired: timestamp("hired").defaultNow(),
});

export const playerConditioning = pgTable("player_conditioning", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  playerId: varchar("player_id").notNull().references(() => players.id),
  fitnessLevel: integer("fitness_level").default(100),
  flexibilityScore: integer("flexibility_score").default(50),
  strengthScore: integer("strength_score").default(50),
  enduranceScore: integer("endurance_score").default(50),
  injuryProneness: integer("injury_proneness").default(50),
  lastPhysical: timestamp("last_physical"),
  trainingLoad: integer("training_load").default(50),
  restDays: integer("rest_days").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trainingFacilities = pgTable("training_facilities", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  facilityType: varchar("facility_type").notNull(),
  quality: integer("quality").default(50),
  capacity: integer("capacity").default(10),
  maintenanceCost: integer("maintenance_cost").default(1000),
  injuryReduction: integer("injury_reduction").default(0),
  recoveryBonus: integer("recovery_bonus").default(0),
  purchased: timestamp("purchased").defaultNow(),
});

export const injuryReports = pgTable("injury_reports", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  season: varchar("season").notNull(),
  totalInjuries: integer("total_injuries").default(0),
  severityAverage: integer("severity_average").default(0),
  recoveryTimeAverage: integer("recovery_time_average").default(0),
  mostCommonInjury: varchar("most_common_injury"),
  injuryTrends: jsonb("injury_trends"),
  preventionScore: integer("prevention_score").default(50),
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



// MVP Awards - One per regular season/playoff match
export const mvpAwards = pgTable("mvp_awards", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
  playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  seasonId: varchar("season_id").references(() => seasons.id, { onDelete: "cascade" }),
  awardDate: timestamp("award_date", { withTimezone: true }).defaultNow().notNull(),
  matchType: text("match_type").notNull(), // "regular", "playoff", "championship"
  performanceStats: jsonb("performance_stats"), // Key stats that earned MVP
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Season Awards - End of season recognition
export const seasonAwards = pgTable("season_awards", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  seasonId: varchar("season_id").references(() => seasons.id, { onDelete: "cascade" }),
  awardType: text("award_type").notNull(), // "Player of the Year", "Rookie of the Year", "Best Passer", etc.
  awardCategory: text("award_category").notNull(), // "individual", "positional", "statistical"
  statValue: real("stat_value"), // The stat value that earned the award
  awardDate: timestamp("award_date", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Team Season History - Complete season records
export const teamSeasonHistory = pgTable("team_season_history", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  seasonId: varchar("season_id").references(() => seasons.id, { onDelete: "cascade" }),
  seasonNumber: integer("season_number").notNull(),
  divisionId: text("division_id").notNull(),
  finalPosition: integer("final_position"), // 1st, 2nd, 3rd, etc. in division
  wins: integer("wins").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  goalsFor: integer("goals_for").default(0).notNull(),
  goalsAgainst: integer("goals_against").default(0).notNull(),
  playoffResult: text("playoff_result"), // "champion", "finalist", "semifinalist", "eliminated", "missed"
  specialAchievements: text("special_achievements").array(), // ["Most Goals Scored", "Best Defense", etc.]
  totalPoints: integer("total_points").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Team Awards - Season-end team recognition
export const teamAwards = pgTable("team_awards", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  seasonId: varchar("season_id").references(() => seasons.id, { onDelete: "cascade" }),
  awardType: text("award_type").notNull(), // "Division Champion", "League Champion", "Most Goals Scored", etc.
  awardCategory: text("award_category").notNull(), // "championship", "statistical", "achievement"
  statValue: real("stat_value"), // The stat value if applicable
  awardDate: timestamp("award_date", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MvpAward = typeof mvpAwards.$inferSelect;
export type InsertMvpAward = typeof mvpAwards.$inferInsert;
export type SeasonAward = typeof seasonAwards.$inferSelect;
export type InsertSeasonAward = typeof seasonAwards.$inferInsert;
export type TeamSeasonHistory = typeof teamSeasonHistory.$inferSelect;
export type InsertTeamSeasonHistory = typeof teamSeasonHistory.$inferInsert;
export type TeamAward = typeof teamAwards.$inferSelect;
export type InsertTeamAward = typeof teamAwards.$inferInsert;

export const scouts = pgTable("scouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  name: varchar("name").notNull(),
  quality: integer("quality").default(50),
  specialization: varchar("specialization"),
  experience: integer("experience").default(1),
  salary: integer("salary").default(50000),
  contractLength: integer("contract_length").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scoutingReports = pgTable("scouting_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  scoutId: uuid("scout_id").references(() => scouts.id).notNull(),
  playerId: uuid("player_id"),
  prospectData: jsonb("prospect_data"),
  reportType: varchar("report_type").notNull(),
  confidence: integer("confidence").default(50),
  statRanges: jsonb("stat_ranges"),
  potentialRating: real("potential_rating"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Scout = typeof scouts.$inferSelect;
export type InsertScout = typeof scouts.$inferInsert;
export type ScoutingReport = typeof scoutingReports.$inferSelect;
export type InsertScoutingReport = typeof scoutingReports.$inferInsert;

export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  userId: varchar("user_id").references(() => users.id).notNull(),
  teamId: varchar("team_id").references(() => teams.id),
  transactionType: varchar("transaction_type").notNull(), // "purchase", "refund", "reward", "admin_grant"
  itemType: varchar("item_type"), // "credits", "gems", "player", "item", "entry", "upgrade"
  itemName: varchar("item_name"), // Name/description of what was purchased
  amount: integer("amount"), // Real money amount (cents)
  creditsChange: integer("credits_change").default(0), // Credits gained/lost
  gemsChange: integer("gems_change").default(0), // Gems gained/lost
  status: varchar("status").default("completed"), // "completed", "pending", "failed", "refunded"
  currency: varchar("currency").default("usd"),
  paymentMethod: varchar("payment_method"), // "stripe", "admin", "reward", "system"
  stripePaymentIntentId: varchar("stripe_payment_intent_id").unique(),
  stripeCustomerId: varchar("stripe_customer_id"),
  failureReason: text("failure_reason"),
  receiptUrl: varchar("receipt_url"),
  metadata: jsonb("metadata"), // Additional transaction details
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const creditPackages = pgTable("credit_packages", {
  id: varchar("id").primaryKey().notNull().$defaultFn(() => nanoid()),
  name: varchar("name").notNull(),
  description: text("description"),
  credits: integer("credits").notNull(),
  price: integer("price").notNull(),
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
  status: varchar("status").notNull(),
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
