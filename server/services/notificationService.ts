import { storage } from "../storage";
import { nanoid } from "nanoid";

interface NotificationData {
  userId: string;
  type: "league" | "tournament" | "auction" | "injury" | "match" | "contract" | "achievement";
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  actionUrl?: string;
  metadata?: any;
}

export class NotificationService {
  // Send notification to specific user
  static async sendNotification(data: NotificationData) {
    try {
      await storage.createNotification({
        id: nanoid(),
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority,
        actionUrl: data.actionUrl,
        metadata: data.metadata,
        isRead: false,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  }

  // Send notification to multiple users
  static async sendBulkNotifications(userIds: string[], data: Omit<NotificationData, "userId">) {
    const promises = userIds.map(userId => 
      this.sendNotification({ ...data, userId })
    );
    await Promise.all(promises);
  }

  // League-related notifications
  static async notifyMatchStart(homeTeamId: string, awayTeamId: string, matchId: string) {
    const homeTeam = await storage.getTeamById(homeTeamId);
    const awayTeam = await storage.getTeamById(awayTeamId);
    
    if (!homeTeam || !awayTeam) return;

    const userIds = [homeTeam.userId, awayTeam.userId];
    
    await this.sendBulkNotifications(userIds, {
      type: "match",
      title: "Match Starting Soon",
      message: `${homeTeam.name} vs ${awayTeam.name} begins in 15 minutes`,
      priority: "medium",
      actionUrl: `/match/${matchId}`,
      metadata: { matchId, homeTeamId, awayTeamId }
    });
  }

  static async notifyMatchResult(homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number, matchId: string) {
    const homeTeam = await storage.getTeamById(homeTeamId);
    const awayTeam = await storage.getTeamById(awayTeamId);
    
    if (!homeTeam || !awayTeam) return;

    const winner = homeScore > awayScore ? homeTeam : awayTeam;
    const loser = homeScore > awayScore ? awayTeam : homeTeam;
    
    // Notify winner
    await this.sendNotification({
      userId: winner.userId,
      type: "match",
      title: "Victory!",
      message: `Your team ${winner.name} won ${Math.max(homeScore, awayScore)}-${Math.min(homeScore, awayScore)}!`,
      priority: "high",
      actionUrl: `/match/${matchId}`,
      metadata: { matchId, result: "win" }
    });

    // Notify loser
    await this.sendNotification({
      userId: loser.userId,
      type: "match",
      title: "Match Result",
      message: `Your team ${loser.name} lost ${Math.min(homeScore, awayScore)}-${Math.max(homeScore, awayScore)}`,
      priority: "medium",
      actionUrl: `/match/${matchId}`,
      metadata: { matchId, result: "loss" }
    });
  }

  static async notifyLeaguePromotion(teamId: string, division: number) {
    const team = await storage.getTeamById(teamId);
    if (!team) return;

    await this.sendNotification({
      userId: team.userId,
      type: "league",
      title: "Promotion!",
      message: `${team.name} has been promoted to Division ${division}!`,
      priority: "high",
      actionUrl: "/league",
      metadata: { teamId, newDivision: division }
    });
  }

  static async notifyLeagueRelegation(teamId: string, division: number) {
    const team = await storage.getTeamById(teamId);
    if (!team) return;

    await this.sendNotification({
      userId: team.userId,
      type: "league",
      title: "Relegation",
      message: `${team.name} has been relegated to Division ${division}`,
      priority: "medium",
      actionUrl: "/league",
      metadata: { teamId, newDivision: division }
    });
  }

  // Tournament notifications
  static async notifyTournamentStart(division: number) {
    const teams = await storage.getTeamsByDivision(division);
    const userIds = teams.map(team => team.userId);

    await this.sendBulkNotifications(userIds, {
      type: "tournament",
      title: "Tournament Begins!",
      message: `Division ${division} tournament has started. Good luck!`,
      priority: "high",
      actionUrl: "/tournaments",
      metadata: { division, event: "tournament_start" }
    });
  }

  static async notifyTournamentAdvancement(teamId: string, round: string) {
    const team = await storage.getTeamById(teamId);
    if (!team) return;

    await this.sendNotification({
      userId: team.userId,
      type: "tournament",
      title: "Tournament Progress",
      message: `${team.name} advances to the ${round}!`,
      priority: "high",
      actionUrl: "/tournaments",
      metadata: { teamId, round }
    });
  }

  static async notifyTournamentChampion(teamId: string, division: number) {
    const team = await storage.getTeamById(teamId);
    if (!team) return;

    await this.sendNotification({
      userId: team.userId,
      type: "tournament",
      title: "CHAMPION!",
      message: `${team.name} wins the Division ${division} Championship!`,
      priority: "urgent",
      actionUrl: "/tournaments",
      metadata: { teamId, division, achievement: "champion" }
    });
  }

  // Auction/Marketplace notifications
  static async notifyOutbid(userId: string, playerName: string, newBidAmount: number, auctionId: string) {
    await this.sendNotification({
      userId,
      type: "auction",
      title: "Outbid!",
      message: `You've been outbid on ${playerName}. New bid: $${newBidAmount.toLocaleString()}`,
      priority: "medium",
      actionUrl: `/marketplace/auction/${auctionId}`,
      metadata: { auctionId, playerName, newBidAmount }
    });
  }

  static async notifyAuctionWon(userId: string, playerName: string, finalBid: number, auctionId: string) {
    await this.sendNotification({
      userId,
      type: "auction",
      title: "Auction Won!",
      message: `You won ${playerName} for $${finalBid.toLocaleString()}!`,
      priority: "high",
      actionUrl: "/team",
      metadata: { auctionId, playerName, finalBid, result: "won" }
    });
  }

  static async notifyAuctionEnding(auctionId: string, playerName: string, timeRemaining: number) {
    const auction = await storage.getAuctionById(auctionId);
    if (!auction) return;

    const bids = await storage.getBidsByAuction(auctionId);
    const uniqueBidders = [...new Set(bids.map(bid => bid.teamId))];
    
    const teams = await Promise.all(
      uniqueBidders.map(teamId => storage.getTeamById(teamId))
    );
    
    const userIds = teams.filter(team => team).map(team => team!.userId);

    await this.sendBulkNotifications(userIds, {
      type: "auction",
      title: "Auction Ending Soon",
      message: `${playerName} auction ends in ${timeRemaining} minutes`,
      priority: "medium",
      actionUrl: `/marketplace/auction/${auctionId}`,
      metadata: { auctionId, timeRemaining }
    });
  }

  // Injury notifications
  static async notifyPlayerInjured(teamId: string, playerName: string, injuryType: string, severity: number) {
    const team = await storage.getTeamById(teamId);
    if (!team) return;

    const severityText = severity <= 3 ? "minor" : severity <= 6 ? "moderate" : "severe";
    
    await this.sendNotification({
      userId: team.userId,
      type: "injury",
      title: "Player Injured",
      message: `${playerName} has suffered a ${severityText} ${injuryType}`,
      priority: severity > 6 ? "high" : "medium",
      actionUrl: "/injuries",
      metadata: { teamId, playerName, injuryType, severity }
    });
  }

  static async notifyPlayerRecovered(teamId: string, playerName: string, injuryType: string) {
    const team = await storage.getTeamById(teamId);
    if (!team) return;

    await this.sendNotification({
      userId: team.userId,
      type: "injury",
      title: "Player Recovered",
      message: `${playerName} has fully recovered from ${injuryType}`,
      priority: "medium",
      actionUrl: "/team",
      metadata: { teamId, playerName, injuryType, status: "recovered" }
    });
  }

  // Contract notifications
  static async notifyContractExpiring(teamId: string, playerName: string, daysRemaining: number) {
    const team = await storage.getTeamById(teamId);
    if (!team) return;

    await this.sendNotification({
      userId: team.userId,
      type: "contract",
      title: "Contract Expiring",
      message: `${playerName}'s contract expires in ${daysRemaining} days`,
      priority: daysRemaining <= 7 ? "high" : "medium",
      actionUrl: "/contracts",
      metadata: { teamId, playerName, daysRemaining }
    });
  }

  static async notifyContractRejected(teamId: string, playerName: string, reason: string) {
    const team = await storage.getTeamById(teamId);
    if (!team) return;

    await this.sendNotification({
      userId: team.userId,
      type: "contract",
      title: "Contract Rejected",
      message: `${playerName} rejected your contract offer: ${reason}`,
      priority: "medium",
      actionUrl: "/contracts",
      metadata: { teamId, playerName, reason }
    });
  }

  // Achievement notifications
  static async notifyAchievement(userId: string, achievementName: string, description: string) {
    await this.sendNotification({
      userId,
      type: "achievement",
      title: "Achievement Unlocked!",
      message: `${achievementName}: ${description}`,
      priority: "medium",
      actionUrl: "/achievements",
      metadata: { achievementName }
    });
  }

  // Financial notifications
  static async notifyLowFunds(teamId: string, currentFunds: number, minimumThreshold: number) {
    const team = await storage.getTeamById(teamId);
    if (!team) return;

    await this.sendNotification({
      userId: team.userId,
      type: "league",
      title: "Low Funds Warning",
      message: `Team funds are low: $${currentFunds.toLocaleString()} (threshold: $${minimumThreshold.toLocaleString()})`,
      priority: "medium",
      actionUrl: "/finances",
      metadata: { teamId, currentFunds, threshold: minimumThreshold }
    });
  }

  static async notifySponsorship(teamId: string, sponsorName: string, amount: number, duration: number) {
    const team = await storage.getTeamById(teamId);
    if (!team) return;

    await this.sendNotification({
      userId: team.userId,
      type: "league",
      title: "New Sponsorship!",
      message: `${sponsorName} is offering $${amount.toLocaleString()} for ${duration} seasons`,
      priority: "medium",
      actionUrl: "/sponsorships",
      metadata: { teamId, sponsorName, amount, duration }
    });
  }
}