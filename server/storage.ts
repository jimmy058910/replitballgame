import {
  users,
  teams,
  players,
  matches,
  leagues,
  staff,
  teamFinances,
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
  type TeamFinances,
  type InsertTeamFinances,
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
  
  // Team finances operations
  getTeamFinances(teamId: string): Promise<TeamFinances | undefined>;
  createTeamFinances(finances: InsertTeamFinances): Promise<TeamFinances>;
  updateTeamFinances(teamId: string, updates: Partial<TeamFinances>): Promise<TeamFinances>;
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
    
    // Create default staff with 3-season contracts
    await this.createDefaultStaff(newTeam.id);
    
    // Create default team finances
    await this.createTeamFinances({
      teamId: newTeam.id,
      season: 1,
      ticketSales: 250000,
      concessionSales: 75000,
      jerseySales: 50000,
      sponsorships: 100000,
      playerSalaries: 300000,
      staffSalaries: 402000, // Total of default staff salaries
      facilities: 50000,
      totalIncome: 475000,
      totalExpenses: 752000,
      netIncome: -277000,
      credits: 723000
    });
    
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

  async getTeamFinances(teamId: string): Promise<TeamFinances | undefined> {
    const [finances] = await db.select().from(teamFinances).where(eq(teamFinances.teamId, teamId));
    return finances;
  }

  async createTeamFinances(financesData: InsertTeamFinances): Promise<TeamFinances> {
    const [finances] = await db.insert(teamFinances).values(financesData).returning();
    return finances;
  }

  async updateTeamFinances(teamId: string, updates: Partial<TeamFinances>): Promise<TeamFinances> {
    const [finances] = await db
      .update(teamFinances)
      .set(updates)
      .where(eq(teamFinances.teamId, teamId))
      .returning();
    return finances;
  }

  private async createDefaultStaff(teamId: string): Promise<void> {
    const defaultStaff = [
      {
        teamId,
        name: "Alex Recovery",
        type: "recovery_specialist",
        level: 1,
        salary: 60000,
        recoveryRating: 75,
        offenseRating: 30,
        defenseRating: 30,
        physicalRating: 40,
        scoutingRating: 20,
        recruitingRating: 25,
        coachingRating: 35,
        contractSeasons: 3,
        contractStartSeason: 1,
      },
      {
        teamId,
        name: "Sarah Fitness",
        type: "trainer",
        level: 1,
        salary: 45000,
        physicalRating: 80,
        offenseRating: 25,
        defenseRating: 25,
        recoveryRating: 40,
        scoutingRating: 15,
        recruitingRating: 20,
        coachingRating: 30,
        contractSeasons: 3,
        contractStartSeason: 1,
      },
      {
        teamId,
        name: "Mike Offense",
        type: "trainer",
        level: 1,
        salary: 50000,
        offenseRating: 85,
        defenseRating: 20,
        physicalRating: 35,
        recoveryRating: 25,
        scoutingRating: 30,
        recruitingRating: 25,
        coachingRating: 40,
        contractSeasons: 3,
        contractStartSeason: 1,
      },
      {
        teamId,
        name: "Lisa Defense",
        type: "trainer",
        level: 1,
        salary: 50000,
        defenseRating: 85,
        offenseRating: 20,
        physicalRating: 35,
        recoveryRating: 25,
        scoutingRating: 30,
        recruitingRating: 25,
        coachingRating: 40,
        contractSeasons: 3,
        contractStartSeason: 1,
      },
      {
        teamId,
        name: "Tony Scout",
        type: "scout",
        level: 1,
        salary: 40000,
        scoutingRating: 90,
        recruitingRating: 70,
        offenseRating: 15,
        defenseRating: 15,
        physicalRating: 20,
        recoveryRating: 15,
        coachingRating: 25,
        contractSeasons: 3,
        contractStartSeason: 1,
      },
      {
        teamId,
        name: "Emma Talent",
        type: "scout",
        level: 1,
        salary: 42000,
        scoutingRating: 85,
        recruitingRating: 80,
        offenseRating: 20,
        defenseRating: 20,
        physicalRating: 25,
        recoveryRating: 20,
        coachingRating: 30,
        contractSeasons: 3,
        contractStartSeason: 1,
      },
      {
        teamId,
        name: "Coach Williams",
        type: "head_coach",
        level: 2,
        salary: 80000,
        coachingRating: 90,
        offenseRating: 70,
        defenseRating: 70,
        physicalRating: 40,
        recoveryRating: 50,
        scoutingRating: 60,
        recruitingRating: 65,
        contractSeasons: 3,
        contractStartSeason: 1,
      },
    ];

    for (const staffMember of defaultStaff) {
      await this.createStaff(staffMember);
    }
  }
}

export const storage = new DatabaseStorage();
