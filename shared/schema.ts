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
  
  salary: integer("salary").notNull(),
  contractLength: integer("contract_length").default(1),
  injuries: jsonb("injuries").default([]),
  abilities: jsonb("abilities").default([]),
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
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id").references(() => leagues.id),
  homeTeamId: uuid("home_team_id").references(() => teams.id).notNull(),
  awayTeamId: uuid("away_team_id").references(() => teams.id).notNull(),
  homeScore: integer("home_score").default(0),
  awayScore: integer("away_score").default(0),
  status: varchar("status").default("scheduled"), // scheduled, live, completed
  gameData: jsonb("game_data"),
  matchType: varchar("match_type").default("league"), // league, tournament, exhibition
  scheduledTime: timestamp("scheduled_time"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const staff = pgTable("staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  type: varchar("type").notNull(), // head_coach, trainer_offense, trainer_defense, trainer_physical, head_scout, recruiting_scout, recovery_specialist
  name: varchar("name").notNull(),
  level: integer("level").default(1),
  salary: integer("salary").notNull(),
  abilities: jsonb("abilities").default([]),
  createdAt: timestamp("created_at").defaultNow(),
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
