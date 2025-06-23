import {
  users,
  teams,
  players,
  matches,
  leagues,
  staff,
  teamFinances,
  tournaments,
  tournamentEntries,
  teamInventory,
  leagueStandings,
  exhibitionGames,
  playerAuctions,
  auctionBids,
  notifications,
  playerInjuries,
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
  type Tournament,
  type InsertTournament,
  type TournamentEntry,
  type InsertTournamentEntry,
  type TeamInventory,
  type InsertTeamInventory,
  type LeagueStanding,
  type InsertLeagueStanding,
  type ExhibitionGame,
  type InsertExhibitionGame,
  type PlayerAuction,
  type InsertPlayerAuction,
  type AuctionBid,
  type InsertAuctionBid,
  type Notification,
  type InsertNotification,
  type PlayerInjury,
  type InsertPlayerInjury,
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
  
  // Auction operations
  createAuction(auction: InsertPlayerAuction): Promise<PlayerAuction>;
  getActiveAuctions(): Promise<PlayerAuction[]>;
  getAuctionById(id: string): Promise<PlayerAuction | undefined>;
  updateAuction(id: string, updates: Partial<PlayerAuction>): Promise<PlayerAuction>;
  getAuctionsByTeam(teamId: string): Promise<PlayerAuction[]>;
  
  // Bid operations
  createBid(bid: InsertAuctionBid): Promise<AuctionBid>;
  getBidsByAuction(auctionId: string): Promise<AuctionBid[]>;
  getTopBidForAuction(auctionId: string): Promise<AuctionBid | undefined>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  
  // Injury operations
  createInjury(injury: InsertPlayerInjury): Promise<PlayerInjury>;
  getPlayerInjuries(playerId: string): Promise<PlayerInjury[]>;
  getActiveInjuries(playerId: string): Promise<PlayerInjury[]>;
  updateInjury(id: string, updates: Partial<PlayerInjury>): Promise<PlayerInjury>;
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
      .where(and(eq(leagues.division, division), eq(leagues.status, "active")));
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

  // Auction operations
  async createAuction(auction: InsertPlayerAuction): Promise<PlayerAuction> {
    const [result] = await db
      .insert(playerAuctions)
      .values(auction)
      .returning();
    return result;
  }

  async getActiveAuctions(): Promise<PlayerAuction[]> {
    return await db
      .select()
      .from(playerAuctions)
      .where(eq(playerAuctions.status, "active"))
      .orderBy(desc(playerAuctions.endTime));
  }

  async getAuctionById(id: string): Promise<PlayerAuction | undefined> {
    const [auction] = await db
      .select()
      .from(playerAuctions)
      .where(eq(playerAuctions.id, id));
    return auction;
  }

  async updateAuction(id: string, updates: Partial<PlayerAuction>): Promise<PlayerAuction> {
    const [result] = await db
      .update(playerAuctions)
      .set(updates)
      .where(eq(playerAuctions.id, id))
      .returning();
    return result;
  }

  async getAuctionsByTeam(teamId: string): Promise<PlayerAuction[]> {
    return await db
      .select()
      .from(playerAuctions)
      .where(eq(playerAuctions.sellerId, teamId))
      .orderBy(desc(playerAuctions.createdAt));
  }

  // Bid operations
  async createBid(bid: InsertAuctionBid): Promise<AuctionBid> {
    const [result] = await db
      .insert(auctionBids)
      .values(bid)
      .returning();
    return result;
  }

  async getBidsByAuction(auctionId: string): Promise<AuctionBid[]> {
    return await db
      .select()
      .from(auctionBids)
      .where(eq(auctionBids.auctionId, auctionId))
      .orderBy(desc(auctionBids.bidAmount));
  }

  async getTopBidForAuction(auctionId: string): Promise<AuctionBid | undefined> {
    const [bid] = await db
      .select()
      .from(auctionBids)
      .where(eq(auctionBids.auctionId, auctionId))
      .orderBy(desc(auctionBids.bidAmount))
      .limit(1);
    return bid;
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [result] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return result;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  // Season Championships & Playoffs
  async getCurrentSeason(): Promise<Season | undefined> {
    const [season] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.status, "active"))
      .limit(1);
    return season;
  }

  async createSeason(seasonData: InsertSeason): Promise<Season> {
    const [season] = await db
      .insert(seasons)
      .values(seasonData)
      .returning();
    return season;
  }

  async getPlayoffsByDivision(seasonId: string, division: number): Promise<Playoff[]> {
    return await db
      .select()
      .from(playoffs)
      .where(and(eq(playoffs.seasonId, seasonId), eq(playoffs.division, division)))
      .orderBy(playoffs.round, playoffs.matchId);
  }

  async createPlayoffMatch(playoffData: InsertPlayoff): Promise<Playoff> {
    const [playoff] = await db
      .insert(playoffs)
      .values(playoffData)
      .returning();
    return playoff;
  }

  async updatePlayoffMatch(id: string, winnerId: string): Promise<Playoff> {
    const [playoff] = await db
      .update(playoffs)
      .set({ winnerId, status: "completed" })
      .where(eq(playoffs.id, id))
      .returning();
    return playoff;
  }

  async getChampionshipHistory(): Promise<Season[]> {
    return await db
      .select()
      .from(seasons)
      .where(eq(seasons.status, "completed"))
      .orderBy(desc(seasons.year))
      .limit(10);
  }

  // Contract System
  async getTeamContracts(teamId: string): Promise<PlayerContract[]> {
    return await db
      .select()
      .from(playerContracts)
      .where(and(eq(playerContracts.teamId, teamId), eq(playerContracts.isActive, true)))
      .orderBy(desc(playerContracts.salary));
  }

  async createPlayerContract(contractData: InsertPlayerContract): Promise<PlayerContract> {
    const [contract] = await db
      .insert(playerContracts)
      .values(contractData)
      .returning();
    return contract;
  }

  async renewContract(contractId: string, newTerms: Partial<InsertPlayerContract>): Promise<PlayerContract> {
    const [contract] = await db
      .update(playerContracts)
      .set(newTerms)
      .where(eq(playerContracts.id, contractId))
      .returning();
    return contract;
  }

  async releasePlayerContract(contractId: string): Promise<void> {
    await db
      .update(playerContracts)
      .set({ isActive: false })
      .where(eq(playerContracts.id, contractId));
  }

  async getTeamSalaryCap(teamId: string): Promise<SalaryCap | undefined> {
    const currentYear = new Date().getFullYear();
    const [salaryCap] = await db
      .select()
      .from(salaryCap)
      .where(and(eq(salaryCap.teamId, teamId), eq(salaryCap.season, currentYear)))
      .limit(1);
    return salaryCap;
  }

  async updateSalaryCap(teamId: string, capData: Partial<InsertSalaryCap>): Promise<SalaryCap> {
    const currentYear = new Date().getFullYear();
    const [cap] = await db
      .insert(salaryCap)
      .values({ teamId, season: currentYear, ...capData })
      .onConflictDoUpdate({
        target: [salaryCap.teamId, salaryCap.season],
        set: capData,
      })
      .returning();
    return cap;
  }

  // Sponsorship System
  async getTeamSponsorships(teamId: string): Promise<SponsorshipDeal[]> {
    return await db
      .select()
      .from(sponsorshipDeals)
      .where(eq(sponsorshipDeals.teamId, teamId))
      .orderBy(desc(sponsorshipDeals.value));
  }

  async createSponsorshipDeal(dealData: InsertSponsorshipDeal): Promise<SponsorshipDeal> {
    const [deal] = await db
      .insert(sponsorshipDeals)
      .values(dealData)
      .returning();
    return deal;
  }

  async renewSponsorshipDeal(dealId: string, newTerms: Partial<InsertSponsorshipDeal>): Promise<SponsorshipDeal> {
    const [deal] = await db
      .update(sponsorshipDeals)
      .set(newTerms)
      .where(eq(sponsorshipDeals.id, dealId))
      .returning();
    return deal;
  }

  async getStadiumRevenue(teamId: string): Promise<StadiumRevenue[]> {
    const currentYear = new Date().getFullYear();
    return await db
      .select()
      .from(stadiumRevenue)
      .where(and(eq(stadiumRevenue.teamId, teamId), eq(stadiumRevenue.season, currentYear)))
      .orderBy(stadiumRevenue.month);
  }

  async updateStadiumRevenue(teamId: string, revenueData: Partial<InsertStadiumRevenue>): Promise<StadiumRevenue> {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const [revenue] = await db
      .insert(stadiumRevenue)
      .values({ teamId, season: currentYear, month: currentMonth, ...revenueData })
      .onConflictDoUpdate({
        target: [stadiumRevenue.teamId, stadiumRevenue.season, stadiumRevenue.month],
        set: revenueData,
      })
      .returning();
    return revenue;
  }

  // Draft System
  // Draft system removed

  async markNotificationRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async deleteNotification(id: string): Promise<void> {
    await db
      .delete(notifications)
      .where(eq(notifications.id, id));
  }

  // Injury operations
  async createInjury(injury: InsertPlayerInjury): Promise<PlayerInjury> {
    const [result] = await db
      .insert(playerInjuries)
      .values(injury)
      .returning();
    return result;
  }

  async getPlayerInjuries(playerId: string): Promise<PlayerInjury[]> {
    return await db
      .select()
      .from(playerInjuries)
      .where(eq(playerInjuries.playerId, playerId))
      .orderBy(desc(playerInjuries.injuredAt));
  }

  async getActiveInjuries(playerId: string): Promise<PlayerInjury[]> {
    return await db
      .select()
      .from(playerInjuries)
      .where(and(eq(playerInjuries.playerId, playerId), eq(playerInjuries.isActive, true)));
  }

  async updateInjury(id: string, updates: Partial<PlayerInjury>): Promise<PlayerInjury> {
    const [result] = await db
      .update(playerInjuries)
      .set(updates)
      .where(eq(playerInjuries.id, id))
      .returning();
    return result;
  }

  // Stadium operations
  async createStadium(stadiumData: InsertStadium): Promise<Stadium> {
    const [stadium] = await db
      .insert(stadiums)
      .values(stadiumData)
      .returning();
    return stadium;
  }

  async getTeamStadium(teamId: string): Promise<Stadium | undefined> {
    const [stadium] = await db
      .select()
      .from(stadiums)
      .where(eq(stadiums.teamId, teamId))
      .limit(1);
    return stadium;
  }

  async updateStadium(id: string, updates: Partial<Stadium>): Promise<Stadium> {
    const [stadium] = await db
      .update(stadiums)
      .set(updates)
      .where(eq(stadiums.id, id))
      .returning();
    return stadium;
  }

  async getStadiumUpgrades(stadiumId: string): Promise<FacilityUpgrade[]> {
    return await db
      .select()
      .from(facilityUpgrades)
      .where(eq(facilityUpgrades.stadiumId, stadiumId))
      .orderBy(desc(facilityUpgrades.installed));
  }

  async createFacilityUpgrade(upgradeData: InsertFacilityUpgrade): Promise<FacilityUpgrade> {
    const [upgrade] = await db
      .insert(facilityUpgrades)
      .values(upgradeData)
      .returning();
    return upgrade;
  }

  async getStadiumEvents(stadiumId: string): Promise<StadiumEvent[]> {
    return await db
      .select()
      .from(stadiumEvents)
      .where(eq(stadiumEvents.stadiumId, stadiumId))
      .orderBy(desc(stadiumEvents.eventDate));
  }

  async createStadiumEvent(eventData: InsertStadiumEvent): Promise<StadiumEvent> {
    const [event] = await db
      .insert(stadiumEvents)
      .values(eventData)
      .returning();
    return event;
  }

  async updateStadiumEvent(id: string, updates: Partial<StadiumEvent>): Promise<StadiumEvent> {
    const [event] = await db
      .update(stadiumEvents)
      .set(updates)
      .where(eq(stadiumEvents.id, id))
      .returning();
    return event;
  }
}

export const storage = new DatabaseStorage();
