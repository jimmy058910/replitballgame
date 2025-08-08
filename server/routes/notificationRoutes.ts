import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index.js"; // Adjusted path
import { prisma } from "../db";
import { isAuthenticated } from "../googleAuth"; // Adjusted path
import { randomUUID } from "crypto"; // For demo notifications
// import { NotificationService } from "../services/notificationService"; // If using service methods here

const router = Router();

// Notification routes
router.get('/', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get team by userId (string)
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) {
      return res.status(404).json({ message: "Team not found for user" });
    }
    
    const userNotifications = await storage.notifications.getUserNotifications(team.id);
    res.json(userNotifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    next(error);
  }
});

router.patch('/:id/read', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const notificationId = parseInt(req.params.id);
    
    if (isNaN(notificationId)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    await storage.notifications.markNotificationRead(notificationId);
    res.json({ success: true, message: "Notification marked as read." });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    next(error);
  }
});

router.patch('/mark-all-read', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get team by userId (string)
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) {
      return res.status(404).json({ message: "Team not found for user" });
    }
    
    await storage.notifications.markAllNotificationsRead(team.id);
    res.json({ success: true, message: "All notifications marked as read." });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    next(error);
  }
});

router.delete('/:id', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const notificationId = parseInt(req.params.id);
    
    if (isNaN(notificationId)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    // Optional: Verify the notification belongs to the user before deleting
    // const notification = await storage.getNotificationByIdAndUser(notificationId, userId);
    // if (!notification) return res.status(404).json({ message: "Notification not found or not yours." });

    await prisma.notification.delete({ where: { id: notificationId } });
    res.json({ success: true, message: "Notification deleted." });
  } catch (error) {
    console.error("Error deleting notification:", error);
    next(error);
  }
});

router.delete('/delete-all', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    await prisma.notification.deleteMany({ where: { teamId: userId } });
    res.json({ success: true, message: "All notifications for the user have been deleted." });
  } catch (error) {
    console.error("Error deleting all notifications for user:", error);
    next(error);
  }
});

// Demo notifications endpoint (consolidated from the two versions)
router.post('/demo', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);

    if (!team) {
      // Though a user might exist without a team, some demo notifications might rely on team context.
      // For simplicity, let's assume a team is useful for full demo.
      console.log("Demo notifications: User has no team, some notifications might be generic.");
      // return res.status(404).json({ message: "Team not found, cannot generate all demo notifications." });
    }

    const demoNotifications = [
      { type: "match", title: "League Game Starting Soon", message: "Your league game against the 'Shadow Panthers' starts in 10 minutes!", priority: "medium", actionUrl: "/match/demo-match-1", metadata: { matchId: "demo-match-1", type: "match_starting", opponent: "Shadow Panthers" } },
      { type: "match", title: "League Game Complete!", message: "Your match against 'Stone Lions' ended. Final Score: 2-1 (Win).", priority: "medium", actionUrl: "/match/demo-match-2", metadata: { matchId: "demo-match-2", homeScore: 2, awayScore: 1, result: "Win", type: "match_complete", resultHidden: false } },
      { type: "tournament", title: "Tournament Filled!", message: "The 'Bronze Cup' tournament is full and starts in 5 minutes.", priority: "high", actionUrl: "/tournaments/bronze-cup-1", metadata: { tournamentId: "bronze-cup-1", event: "tournament_filled", minutesUntilStart: 5 } },
      { type: "auction", title: "You've Been Outbid!", message: "Someone outbid you on 'Marcus Swift'. New bid: 55,000 Credits.", priority: "high", actionUrl: "/marketplace/auctions/marcus-swift-auction", metadata: { auctionId: "marcus-swift-auction", playerName: "Marcus Swift", newBidAmount: 55000 } },
      { type: "injury", title: "Player Injured", message: `${team ? (team.name + "'s player ") : ""}Kai Thunderstrike has a minor sprain (2 days).`, priority: "medium", actionUrl: "/team/injuries", metadata: { teamId: team?.id || null, playerName: "Kai Thunderstrike", injuryType: "sprain", severity: 3, durationDays: 2 } },
      { type: "achievement", title: "Achievement Unlocked: First Win!", message: "Congratulations on winning your first league match!", priority: "low", actionUrl: "/profile/achievements", metadata: { achievementName: "First Victory", achievementId: "ACH_FIRST_WIN" } },
      { type: "contract", title: "Contract Expiring Soon", message: `Viktor Ironshield's contract is expiring in 3 days. Renegotiate now!`, priority: "high", actionUrl: `/team/contracts/${team?.id || 'team'}/viktor-ironshield-contract`, metadata: { teamId: team?.id || null, playerName: "Viktor Ironshield", daysRemaining: 3, contractId: "viktor-ironshield-contract"} },
      { type: "league", title: "Season Rollover Complete", message: "A new season has begun! Check your new division and schedule.", priority: "medium", actionUrl: "/league", metadata: { newSeason: 2, newDivision: team?.division || 8 } },
      { type: "system", title: "Scheduled Maintenance", message: "Realm Rivalry will undergo scheduled maintenance tonight at 2 AM EST for 1 hour.", priority: "low", metadata: { maintenanceTime: "2:00 AM EST", duration: "1 hour" } },
      { type: "marketplace", title: "Item Sold!", message: "Your 'Basic Helmet' sold on the marketplace for 1,200 Credits.", priority: "medium", actionUrl: "/marketplace/my-listings", metadata: { itemName: "Basic Helmet", soldPrice: 1200, type: "item_sold" } }
    ];

    let createdCount = 0;
    for (const notif of demoNotifications) {
      await prisma.notification.create({
        data: {
        teamId: team?.id || 1,
        type: "SYSTEM_MESSAGE",
        message: notif.message,
        linkTo: notif.actionUrl || null,
        isRead: false,
        }
      });
      createdCount++;
    }

    res.json({ message: `Successfully created ${createdCount} demo notifications.` });
  } catch (error) {
    console.error("Error creating demo notifications:", error);
    next(error);
  }
});

export default router;
