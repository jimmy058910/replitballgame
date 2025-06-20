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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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
  name: varchar("name").notNull(),
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
  credits: integer("credits").default(1000000),
  totalIncome: integer("total_income").default(0),
  totalExpenses: integer("total_expenses").default(0),
  netIncome: integer("net_income").default(0),
  
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
