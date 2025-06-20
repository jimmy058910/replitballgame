import {
  users,
  teams,
  players,
  matches,
  leagues,
  staff,
  type User,
  type UpsertUser,
  type Team,
  type InsertTeam,
  type Player,
  type InsertPlayer,
  type Match,
  type InsertMatch,
  type League,
  type InsertLeague,
  type Staff,
  type InsertStaff,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Team operations
  createTeam(team: InsertTeam): Promise<Team>;
  getTeamByUserId(userId: string): Promise<Team | undefined>;
  getTeamById(id: string): Promise<Team | undefined>;
  updateTeam(id: string, updates: Partial<Team>): Promise<Team>;
  getTeamsByDivision(division: number): Promise<Team[]>;
  
  // Player operations
  createPlayer(player: InsertPlayer): Promise<Player>;
  getPlayersByTeamId(teamId: string): Promise<Player[]>;
  getPlayerById(id: string): Promise<Player | undefined>;
  updatePlayer(id: string, updates: Partial<Player>): Promise<Player>;
  getMarketplacePlayers(): Promise<Player[]>;
  
  // Match operations
  createMatch(match: InsertMatch): Promise<Match>;
  getMatchById(id: string): Promise<Match | undefined>;
  getMatchesByTeamId(teamId: string): Promise<Match[]>;
  updateMatch(id: string, updates: Partial<Match>): Promise<Match>;
  getLiveMatches(): Promise<Match[]>;
  
  // League operations
  createLeague(league: InsertLeague): Promise<League>;
  getActiveLeagueByDivision(division: number): Promise<League | undefined>;
  
  // Staff operations
  createStaff(staffMember: InsertStaff): Promise<Staff>;
  getStaffByTeamId(teamId: string): Promise<Staff[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Team operations
  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async getTeamByUserId(userId: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.userId, userId));
    return team;
  }

  async getTeamById(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
    const [team] = await db
      .update(teams)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(teams.id, id))
      .returning();
    return team;
  }

  async getTeamsByDivision(division: number): Promise<Team[]> {
    return await db
      .select()
      .from(teams)
      .where(eq(teams.division, division))
      .orderBy(desc(teams.points), desc(teams.wins));
  }

  // Player operations
  async createPlayer(player: InsertPlayer): Promise<Player> {
    const [newPlayer] = await db.insert(players).values(player).returning();
    return newPlayer;
  }

  async getPlayersByTeamId(teamId: string): Promise<Player[]> {
    return await db
      .select()
      .from(players)
      .where(and(eq(players.teamId, teamId), eq(players.isMarketplace, false)))
      .orderBy(asc(players.name));
  }

  async getPlayerById(id: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player> {
    const [player] = await db
      .update(players)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(players.id, id))
      .returning();
    return player;
  }

  async getMarketplacePlayers(): Promise<Player[]> {
    return await db
      .select()
      .from(players)
      .where(eq(players.isMarketplace, true))
      .orderBy(asc(players.marketplaceEndTime));
  }

  // Match operations
  async createMatch(match: InsertMatch): Promise<Match> {
    const [newMatch] = await db.insert(matches).values(match).returning();
    return newMatch;
  }

  async getMatchById(id: string): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }

  async getMatchesByTeamId(teamId: string): Promise<Match[]> {
    return await db
      .select()
      .from(matches)
      .where(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)))
      .orderBy(desc(matches.scheduledTime));
  }

  async updateMatch(id: string, updates: Partial<Match>): Promise<Match> {
    const [match] = await db
      .update(matches)
      .set({ ...updates })
      .where(eq(matches.id, id))
      .returning();
    return match;
  }

  async getLiveMatches(): Promise<Match[]> {
    return await db
      .select()
      .from(matches)
      .where(eq(matches.status, "live"))
      .orderBy(desc(matches.scheduledTime));
  }

  // League operations
  async createLeague(league: InsertLeague): Promise<League> {
    const [newLeague] = await db.insert(leagues).values(league).returning();
    return newLeague;
  }

  async getActiveLeagueByDivision(division: number): Promise<League | undefined> {
    const [league] = await db
      .select()
      .from(leagues)
      .where(and(eq(leagues.division, division), eq(leagues.isActive, true)));
    return league;
  }

  // Staff operations
  async createStaff(staffMember: InsertStaff): Promise<Staff> {
    const [newStaff] = await db.insert(staff).values(staffMember).returning();
    return newStaff;
  }

  async getStaffByTeamId(teamId: string): Promise<Staff[]> {
    return await db
      .select()
      .from(staff)
      .where(eq(staff.teamId, teamId))
      .orderBy(asc(staff.type));
  }
}

export const storage = new DatabaseStorage();
