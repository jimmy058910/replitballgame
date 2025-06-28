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
  seasons,
  playoffs,
  playerContracts,
  salaryCap,
  sponsorshipDeals,
  stadiumRevenue,
  stadiums,
  facilityUpgrades,
  stadiumEvents,
  paymentTransactions,
  creditPackages,
  userSubscriptions,
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
  type Season,
  type InsertSeason,
  type Playoff,
  type InsertPlayoff,
  type PlayerContract,
  type InsertPlayerContract,
  type SalaryCap,
  type InsertSalaryCap,
  type SponsorshipDeal,
  type InsertSponsorshipDeal,
  type StadiumRevenue,
  type InsertStadiumRevenue,
  type Stadium,
  type InsertStadium,
  type FacilityUpgrade,
  type InsertFacilityUpgrade,
  type StadiumEvent,
  type InsertStadiumEvent,
  adViews,
  type AdView,
  type InsertAdView,
  type PaymentTransaction,
  type InsertPaymentTransaction,
  type CreditPackage,
  type InsertCreditPackage,
  type UserSubscription,
  type InsertUserSubscription,
  marketplaceListings,
  marketplaceBids,
  marketplaceTransactions,
  type MarketplaceListing,
  type InsertMarketplaceListing,
  type MarketplaceBid,
  type InsertMarketplaceBid,
  type MarketplaceTransaction,
  type InsertMarketplaceTransaction,
  skills,
  playerSkills,
  type Skill,
  type InsertSkill,
  type PlayerSkill,
  type InsertPlayerSkill,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, sql, inArray, lte } from "drizzle-orm";
import { nanoid } from "nanoid";

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
  
  // Injury & Stamina operations
  updatePlayerInjury(id: string, injuryStatus: string, recoveryPointsNeeded: number): Promise<Player>;
  updatePlayerStamina(id: string, dailyStaminaLevel: number): Promise<Player>;
  applyRecoveryPoints(id: string, points: number): Promise<Player>;
  incrementPlayerItemUsage(id: string): Promise<Player>;
  resetAllPlayersDailyItems(): Promise<void>;
  performDailyRecovery(): Promise<void>;
  
  // Match operations
  createMatch(match: InsertMatch): Promise<Match>;
  getMatchById(id: string): Promise<Match | undefined>;
  getMatchesByTeamId(teamId: string): Promise<Match[]>;
  getMatchesByDivision(division: number): Promise<Match[]>;
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
  deleteAllNotifications(userId: string): Promise<void>;

  // Ad system operations
  createAdView(adView: InsertAdView): Promise<AdView>;
  getAdViewsByUser(userId: string): Promise<AdView[]>;
  getDailyAdViews(userId: string): Promise<number>;
  
  // Injury operations
  createInjury(injury: InsertPlayerInjury): Promise<PlayerInjury>;
  getPlayerInjuries(playerId: string): Promise<PlayerInjury[]>;
  getActiveInjuries(playerId: string): Promise<PlayerInjury[]>;
  updateInjury(id: string, updates: Partial<PlayerInjury>): Promise<PlayerInjury>;

  // Payment operations
  createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction>;
  getPaymentTransaction(id: string): Promise<PaymentTransaction | undefined>;
  getPaymentTransactionByStripeId(stripePaymentIntentId: string): Promise<PaymentTransaction | undefined>;
  updatePaymentTransaction(id: string, updates: Partial<PaymentTransaction>): Promise<PaymentTransaction>;
  getUserPaymentHistory(userId: string): Promise<PaymentTransaction[]>;
  
  // Credit package operations
  getCreditPackages(): Promise<CreditPackage[]>;
  getCreditPackageById(id: string): Promise<CreditPackage | undefined>;
  createCreditPackage(creditPackage: InsertCreditPackage): Promise<CreditPackage>;
  updateCreditPackage(id: string, updates: Partial<CreditPackage>): Promise<CreditPackage>;
  
  // Subscription operations
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  getUserSubscription(userId: string): Promise<UserSubscription | undefined>;
  getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | undefined>;
  updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription>;
  
  // Marketplace operations
  createMarketplaceListing(listing: InsertMarketplaceListing): Promise<MarketplaceListing>;
  getMarketplaceListing(id: string): Promise<MarketplaceListing | undefined>;
  getActiveMarketplaceListings(): Promise<MarketplaceListing[]>;
  getTeamListings(teamId: string): Promise<MarketplaceListing[]>;
  updateMarketplaceListing(id: string, updates: Partial<MarketplaceListing>): Promise<MarketplaceListing>;
  
  createMarketplaceBid(bid: InsertMarketplaceBid): Promise<MarketplaceBid>;
  getListingBids(listingId: string): Promise<MarketplaceBid[]>;
  getTeamActiveBids(teamId: string): Promise<MarketplaceBid[]>;
  deactivateBid(bidId: string): Promise<void>;
  
  createMarketplaceTransaction(transaction: InsertMarketplaceTransaction): Promise<MarketplaceTransaction>;
  getMarketplaceTransactionHistory(teamId: string): Promise<MarketplaceTransaction[]>;
  
  processExpiredListings(): Promise<void>;
  convertToOffSeasonMode(): Promise<void>;
  
  // Skills operations
  getAllSkills(): Promise<Skill[]>;
  getSkillById(id: string): Promise<Skill | undefined>;
  createSkill(skill: InsertSkill): Promise<Skill>;
  
  // Player skills operations
  getPlayerSkills(playerId: string): Promise<PlayerSkill[]>;
  addPlayerSkill(playerSkill: InsertPlayerSkill): Promise<PlayerSkill>;
  upgradePlayerSkill(playerId: string, skillId: string): Promise<PlayerSkill>;
  getPlayerSkillCount(playerId: string): Promise<number>;
  processEndOfSeasonSkills(teamId: string): Promise<void>;
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
    const teamPlayers = await db
      .select()
      .from(players)
      .where(and(eq(players.teamId, teamId), eq(players.isMarketplace, false)))
      .orderBy(asc(players.name));
    
    console.log(`Found ${teamPlayers.length} players for team ${teamId}`);
    if (teamPlayers.length > 0) {
      console.log('Sample player data:', {
        id: teamPlayers[0].id,
        name: teamPlayers[0].name,
        firstName: teamPlayers[0].firstName,
        lastName: teamPlayers[0].lastName
      });
    }
    
    return teamPlayers;
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

  // Injury & Stamina operations
  async updatePlayerInjury(id: string, injuryStatus: string, recoveryPointsNeeded: number): Promise<Player> {
    const [player] = await db
      .update(players)
      .set({ 
        injuryStatus,
        injuryRecoveryPointsNeeded: recoveryPointsNeeded,
        injuryRecoveryPointsCurrent: 0,
        updatedAt: new Date() 
      })
      .where(eq(players.id, id))
      .returning();
    return player;
  }

  async updatePlayerStamina(id: string, dailyStaminaLevel: number): Promise<Player> {
    const [player] = await db
      .update(players)
      .set({ 
        dailyStaminaLevel: Math.max(0, Math.min(100, dailyStaminaLevel)),
        updatedAt: new Date() 
      })
      .where(eq(players.id, id))
      .returning();
    return player;
  }

  async applyRecoveryPoints(id: string, points: number): Promise<Player> {
    const player = await this.getPlayerById(id);
    if (!player) throw new Error("Player not found");

    const newRecoveryPoints = (player.injuryRecoveryPointsCurrent || 0) + points;
    const updates: any = {
      injuryRecoveryPointsCurrent: newRecoveryPoints,
      updatedAt: new Date()
    };

    // Check if injury is healed
    if (newRecoveryPoints >= (player.injuryRecoveryPointsNeeded || 0)) {
      updates.injuryStatus = "Healthy";
      updates.injuryRecoveryPointsNeeded = 0;
      updates.injuryRecoveryPointsCurrent = 0;
    }

    const [updatedPlayer] = await db
      .update(players)
      .set(updates)
      .where(eq(players.id, id))
      .returning();
    return updatedPlayer;
  }

  async incrementPlayerItemUsage(id: string): Promise<Player> {
    const player = await this.getPlayerById(id);
    if (!player) throw new Error("Player not found");

    const [updatedPlayer] = await db
      .update(players)
      .set({ 
        dailyItemsUsed: (player.dailyItemsUsed || 0) + 1,
        updatedAt: new Date() 
      })
      .where(eq(players.id, id))
      .returning();
    return updatedPlayer;
  }

  async resetAllPlayersDailyItems(): Promise<void> {
    await db
      .update(players)
      .set({ dailyItemsUsed: 0 });
  }

  async performDailyRecovery(): Promise<void> {
    // Import progression functions
    const { runDailyProgression, getEnhancedRecoveryRate } = await import('./services/progressionService');
    
    // Reset daily item usage for all players
    await this.resetAllPlayersDailyItems();

    // Get all players
    const allPlayers = await db.select().from(players);

    for (const player of allPlayers) {
      const updates: any = {};

      // Natural injury recovery with staff effects
      if (player.injuryStatus !== "Healthy" && player.teamId) {
        // Get enhanced recovery rate based on recovery specialist
        const recoveryRate = await getEnhancedRecoveryRate(player.teamId);
        const newRecoveryPoints = (player.injuryRecoveryPointsCurrent || 0) + recoveryRate;
        updates.injuryRecoveryPointsCurrent = newRecoveryPoints;

        // Check if injury is healed
        if (newRecoveryPoints >= (player.injuryRecoveryPointsNeeded || 0)) {
          updates.injuryStatus = "Healthy";
          updates.injuryRecoveryPointsNeeded = 0;
          updates.injuryRecoveryPointsCurrent = 0;
        }
      }

      // Natural stamina recovery based on stamina stat
      const baseStaminaRecovery = 20;
      const statBonusRecovery = (player.stamina || 0) * 0.5;
      const totalRecovery = baseStaminaRecovery + statBonusRecovery;
      const currentStamina = player.dailyStaminaLevel || 100;
      updates.dailyStaminaLevel = Math.min(100, currentStamina + totalRecovery);

      // Apply updates if needed
      if (Object.keys(updates).length > 0) {
        await db
          .update(players)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(players.id, player.id));
      }
    }

    // Run daily player progression
    await runDailyProgression();
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

  async getMatchesByDivision(division: number): Promise<Match[]> {
    // Get all teams in the division first
    const divisionTeams = await this.getTeamsByDivision(division);
    const teamIds = divisionTeams.map(team => team.id);
    
    if (teamIds.length === 0) {
      return [];
    }
    
    // Get matches where both teams are from the same division
    return await db
      .select()
      .from(matches)
      .where(
        and(
          inArray(matches.homeTeamId, teamIds),
          inArray(matches.awayTeamId, teamIds)
        )
      )
      .orderBy(asc(matches.gameDay), asc(matches.scheduledTime));
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
  updateSeason(seasonId: string, updates: Partial<Season>): Promise<Season>;
  async getCurrentSeason(): Promise<Season | undefined> {
    try {
      const [season] = await db
        .select()
        .from(seasons)
        .where(eq(seasons.status, "active"))
        .limit(1);
      return season;
    } catch (error) {
      // If seasons table doesn't exist, return a default season
      console.log("Seasons table not found, creating default season");
      return {
        id: "default-season-1",
        name: "Season 1",
        year: 2024,
        status: "active",
        startDate: new Date(),
        endDate: null,
        playoffStartDate: null,
        championTeamId: null,
        createdAt: new Date()
      };
    }
  }

  async createSeason(seasonData: InsertSeason): Promise<Season> {
    const [season] = await db
      .insert(seasons)
      .values(seasonData)
      .returning();
    return season;
  }

  async updateSeason(seasonId: string, updates: Partial<Season>): Promise<Season> {
    const [season] = await db
      .update(seasons)
      .set(updates)
      .where(eq(seasons.id, seasonId))
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

  async deleteAllNotifications(userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(eq(notifications.userId, userId));
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

  // Ad system implementation
  async createAdView(adViewData: InsertAdView): Promise<AdView> {
    const [adView] = await db
      .insert(adViews)
      .values({
        id: nanoid(),
        ...adViewData
      })
      .returning();
    return adView;
  }

  async getAdViewsByUser(userId: string): Promise<AdView[]> {
    return await db
      .select()
      .from(adViews)
      .where(eq(adViews.userId, userId));
  }

  async getDailyAdViews(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const adViews = await db
      .select()
      .from(adViews)
      .where(
        and(
          eq(adViews.userId, userId),
          gte(adViews.createdAt, today)
        )
      );
    
    return adViews.length;
  }

  // Payment operations
  async createPaymentTransaction(transactionData: InsertPaymentTransaction): Promise<PaymentTransaction> {
    const [transaction] = await db.insert(paymentTransactions).values(transactionData).returning();
    return transaction;
  }

  async getPaymentTransaction(id: string): Promise<PaymentTransaction | undefined> {
    const [transaction] = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, id));
    return transaction;
  }

  async getPaymentTransactionByStripeId(stripePaymentIntentId: string): Promise<PaymentTransaction | undefined> {
    const [transaction] = await db.select().from(paymentTransactions).where(eq(paymentTransactions.stripePaymentIntentId, stripePaymentIntentId));
    return transaction;
  }

  async updatePaymentTransaction(id: string, updates: Partial<PaymentTransaction>): Promise<PaymentTransaction> {
    const [transaction] = await db.update(paymentTransactions)
      .set(updates)
      .where(eq(paymentTransactions.id, id))
      .returning();
    return transaction;
  }

  async getUserPaymentHistory(userId: string): Promise<PaymentTransaction[]> {
    return await db.select().from(paymentTransactions)
      .where(eq(paymentTransactions.userId, userId))
      .orderBy(desc(paymentTransactions.createdAt));
  }

  // Credit package operations
  async getCreditPackages(): Promise<CreditPackage[]> {
    return await db.select().from(creditPackages).where(eq(creditPackages.isActive, true));
  }

  async getCreditPackageById(id: string): Promise<CreditPackage | undefined> {
    const [creditPackage] = await db.select().from(creditPackages).where(eq(creditPackages.id, id));
    return creditPackage;
  }

  async createCreditPackage(packageData: InsertCreditPackage): Promise<CreditPackage> {
    const [creditPackage] = await db.insert(creditPackages).values(packageData).returning();
    return creditPackage;
  }

  async updateCreditPackage(id: string, updates: Partial<CreditPackage>): Promise<CreditPackage> {
    const [creditPackage] = await db.update(creditPackages)
      .set(updates)
      .where(eq(creditPackages.id, id))
      .returning();
    return creditPackage;
  }

  // Subscription operations
  async createUserSubscription(subscriptionData: InsertUserSubscription): Promise<UserSubscription> {
    const [subscription] = await db.insert(userSubscriptions).values(subscriptionData).returning();
    return subscription;
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | undefined> {
    const [subscription] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
    return subscription;
  }

  async getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | undefined> {
    const [subscription] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return subscription;
  }

  async updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription> {
    const [subscription] = await db.update(userSubscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userSubscriptions.id, id))
      .returning();
    return subscription;
  }

  // Marketplace operations
  async createMarketplaceListing(listing: InsertMarketplaceListing): Promise<MarketplaceListing> {
    const id = nanoid();
    const [newListing] = await db.insert(marketplaceListings).values({ ...listing, id }).returning();
    return newListing;
  }

  async getMarketplaceListing(id: string): Promise<MarketplaceListing | undefined> {
    const [listing] = await db.select().from(marketplaceListings).where(eq(marketplaceListings.id, id));
    return listing;
  }

  async getActiveMarketplaceListings(): Promise<MarketplaceListing[]> {
    return await db.select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.isActive, true));
  }

  async getTeamListings(teamId: string): Promise<MarketplaceListing[]> {
    return await db.select()
      .from(marketplaceListings)
      .where(
        and(
          eq(marketplaceListings.sellerTeamId, teamId),
          eq(marketplaceListings.isActive, true)
        )
      );
  }

  async updateMarketplaceListing(id: string, updates: Partial<MarketplaceListing>): Promise<MarketplaceListing> {
    const [listing] = await db.update(marketplaceListings)
      .set(updates)
      .where(eq(marketplaceListings.id, id))
      .returning();
    return listing;
  }

  async createMarketplaceBid(bid: InsertMarketplaceBid): Promise<MarketplaceBid> {
    const id = nanoid();
    const [newBid] = await db.insert(marketplaceBids).values({ ...bid, id }).returning();
    return newBid;
  }

  async getListingBids(listingId: string): Promise<MarketplaceBid[]> {
    return await db.select()
      .from(marketplaceBids)
      .where(eq(marketplaceBids.listingId, listingId))
      .orderBy(desc(marketplaceBids.bidAmount));
  }

  async getTeamActiveBids(teamId: string): Promise<MarketplaceBid[]> {
    return await db.select()
      .from(marketplaceBids)
      .where(
        and(
          eq(marketplaceBids.bidderTeamId, teamId),
          eq(marketplaceBids.isActive, true)
        )
      );
  }

  async deactivateBid(bidId: string): Promise<void> {
    await db.update(marketplaceBids)
      .set({ isActive: false })
      .where(eq(marketplaceBids.id, bidId));
  }

  async createMarketplaceTransaction(transaction: InsertMarketplaceTransaction): Promise<MarketplaceTransaction> {
    const id = nanoid();
    const [newTransaction] = await db.insert(marketplaceTransactions).values({ ...transaction, id }).returning();
    return newTransaction;
  }

  async getMarketplaceTransactionHistory(teamId: string): Promise<MarketplaceTransaction[]> {
    return await db.select()
      .from(marketplaceTransactions)
      .where(
        or(
          eq(marketplaceTransactions.buyerTeamId, teamId),
          eq(marketplaceTransactions.sellerTeamId, teamId)
        )
      )
      .orderBy(desc(marketplaceTransactions.completedAt));
  }

  async processExpiredListings(): Promise<void> {
    const now = new Date();
    const expiredListings = await db.select()
      .from(marketplaceListings)
      .where(
        and(
          eq(marketplaceListings.isActive, true),
          lte(marketplaceListings.expiryTimestamp, now)
        )
      );

    for (const listing of expiredListings) {
      // Process auction completion or return player to owner
      if (listing.currentHighBidderTeamId) {
        // Complete the auction
        const tax = Math.floor(listing.currentBid * 0.05); // 5% market tax
        const sellerProceeds = listing.currentBid - tax;

        // Create transaction record
        await this.createMarketplaceTransaction({
          id: nanoid(),
          listingId: listing.id,
          buyerTeamId: listing.currentHighBidderTeamId,
          sellerTeamId: listing.sellerTeamId,
          playerId: listing.playerId,
          transactionType: 'auction',
          finalPrice: listing.currentBid,
          marketTax: tax,
          sellerProceeds: sellerProceeds,
        });

        // Transfer player
        await this.updatePlayer(listing.playerId, { teamId: listing.currentHighBidderTeamId });

        // Transfer funds
        const buyerFinances = await this.getTeamFinances(listing.currentHighBidderTeamId);
        const sellerFinances = await this.getTeamFinances(listing.sellerTeamId);
        
        if (buyerFinances && sellerFinances) {
          await this.updateTeamFinances(listing.currentHighBidderTeamId, {
            credits: (buyerFinances.credits || 0) - listing.currentBid
          });
          await this.updateTeamFinances(listing.sellerTeamId, {
            credits: (sellerFinances.credits || 0) + sellerProceeds
          });
        }
      }

      // Mark listing as inactive
      await this.updateMarketplaceListing(listing.id, { isActive: false });
    }
  }

  async convertToOffSeasonMode(): Promise<void> {
    const activeListings = await this.getActiveMarketplaceListings();
    
    for (const listing of activeListings) {
      if (!listing.buyNowPrice) {
        // Calculate buy now price if not set
        const player = await this.getPlayerById(listing.playerId);
        if (player) {
          const calculatedPrice = Math.max(listing.startBid * 1.5, player.overall * 1000);
          await this.updateMarketplaceListing(listing.id, { buyNowPrice: Math.floor(calculatedPrice) });
        }
      }
    }
  }

  // Skills operations
  async getAllSkills(): Promise<Skill[]> {
    return await db.select().from(skills);
  }

  async getSkillById(id: string): Promise<Skill | undefined> {
    const [skill] = await db.select().from(skills).where(eq(skills.id, id));
    return skill;
  }

  async createSkill(skill: Omit<InsertSkill, 'id'>): Promise<Skill> {
    const [newSkill] = await db.insert(skills).values(skill).returning();
    return newSkill;
  }

  // Player skills operations
  async getPlayerSkills(playerId: string): Promise<PlayerSkill[]> {
    return await db
      .select()
      .from(playerSkills)
      .where(eq(playerSkills.playerId, playerId))
      .orderBy(desc(playerSkills.acquiredAt));
  }

  async addPlayerSkill(playerSkill: InsertPlayerSkill): Promise<PlayerSkill> {
    const [newPlayerSkill] = await db
      .insert(playerSkills)
      .values(playerSkill)
      .returning();
    return newPlayerSkill;
  }

  async upgradePlayerSkill(playerId: string, skillId: string): Promise<PlayerSkill> {
    const [existingPlayerSkill] = await db
      .select()
      .from(playerSkills)
      .where(and(
        eq(playerSkills.playerId, playerId),
        eq(playerSkills.skillId, skillId)
      ));
    
    if (!existingPlayerSkill) {
      throw new Error('Player does not have this skill');
    }
    
    const newTier = Math.min(existingPlayerSkill.currentTier + 1, 4);
    const [updatedSkill] = await db
      .update(playerSkills)
      .set({ 
        currentTier: newTier,
        lastUpgraded: new Date()
      })
      .where(eq(playerSkills.id, existingPlayerSkill.id))
      .returning();
    
    return updatedSkill;
  }

  async getPlayerSkillCount(playerId: string): Promise<number> {
    const skills = await this.getPlayerSkills(playerId);
    return skills.length;
  }

  async processEndOfSeasonSkills(teamId: string): Promise<void> {
    const players = await this.getPlayersByTeamId(teamId);
    const BASE_CHANCE = 5;
    const LEADERSHIP_MODIFIER = 0.25;
    
    for (const player of players) {
      const chance = BASE_CHANCE + (player.leadership * LEADERSHIP_MODIFIER);
      const roll = Math.random() * 100;
      
      if (roll < chance) {
        const playerSkillCount = await this.getPlayerSkillCount(player.id);
        
        if (playerSkillCount < 3) {
          // Add a new skill
          const eligibleSkills = await this.getEligibleSkillsForPlayer(player);
          if (eligibleSkills.length > 0) {
            const randomSkill = eligibleSkills[Math.floor(Math.random() * eligibleSkills.length)];
            await this.addPlayerSkill({
              playerId: player.id,
              skillId: randomSkill.id,
              currentTier: 1
            });
            
            // Create notification
            await this.createNotification({
              userId: player.teamId, // Using teamId as userId for now
              type: 'skill_acquired',
              title: 'New Skill Acquired!',
              message: `${player.name} has learned the skill: ${randomSkill.name}`,
              metadata: { playerId: player.id, skillId: randomSkill.id },
              priority: 'high'
            });
          }
        } else {
          // Upgrade an existing skill
          const existingSkills = await this.getPlayerSkills(player.id);
          const upgradeableSkills = existingSkills.filter(ps => ps.currentTier < 4);
          
          if (upgradeableSkills.length > 0) {
            const skillToUpgrade = upgradeableSkills[Math.floor(Math.random() * upgradeableSkills.length)];
            await this.upgradePlayerSkill(player.id, skillToUpgrade.skillId);
            
            const skill = await this.getSkillById(skillToUpgrade.skillId);
            if (skill) {
              await this.createNotification({
                userId: player.teamId,
                type: 'skill_upgraded',
                title: 'Skill Upgraded!',
                message: `${player.name}'s ${skill.name} skill has been upgraded to Tier ${skillToUpgrade.currentTier + 1}`,
                metadata: { playerId: player.id, skillId: skill.id },
                priority: 'high'
              });
            }
          }
        }
      }
    }
  }

  private async getEligibleSkillsForPlayer(player: Player): Promise<Skill[]> {
    const allSkills = await this.getAllSkills();
    const playerSkills = await this.getPlayerSkills(player.id);
    const playerSkillIds = playerSkills.map(ps => ps.skillId);
    
    return allSkills.filter(skill => {
      // Check if player already has this skill
      if (playerSkillIds.includes(skill.id)) return false;
      
      // Check category restrictions
      if (skill.category === 'Universal') return true;
      if (skill.category === 'Role' && skill.roleRestriction === player.role) return true;
      if (skill.category === 'Race' && skill.raceRestriction === player.race) return true;
      
      return false;
    });
  }
}

export const storage = new DatabaseStorage();
