import { NotificationService } from "./services/notificationService";
import { storage } from "./storage";

// Demo function to create sample notifications for testing
export async function createDemoNotifications(userId: string, teamId: string) {
  console.log("Creating demo notifications...");

  // Match start notification
  await NotificationService.sendNotification({
    userId,
    type: "match",
    title: "League Game Starting Soon",
    message: "League game starts in 10 minutes",
    priority: "medium",
    actionUrl: "/match/demo-match-1",
    metadata: { matchId: "demo-match-1", type: "match_starting" }
  });

  // Match result notification (hidden)
  await NotificationService.sendNotification({
    userId,
    type: "match",
    title: "League Game Complete",
    message: "League game complete, see the result!",
    priority: "medium",
    actionUrl: "/match/demo-match-2",
    metadata: { 
      matchId: "demo-match-2", 
      homeScore: 3, 
      awayScore: 1, 
      type: "match_complete",
      resultHidden: true 
    }
  });

  // Tournament filled notification
  await NotificationService.sendNotification({
    userId,
    type: "tournament",
    title: "Tournament Starting Soon",
    message: "Tournament filled and starts in 10 minutes",
    priority: "high",
    actionUrl: "/tournaments",
    metadata: { division: 1, event: "tournament_filled", minutesUntilStart: 10 }
  });

  // Tournament result notification (hidden)
  await NotificationService.sendNotification({
    userId,
    type: "tournament",
    title: "Tournament Complete",
    message: "Tournament finished! Check your final results",
    priority: "high",
    actionUrl: "/tournaments",
    metadata: { 
      teamId, 
      division: 1, 
      result: "champion",
      resultHidden: true 
    }
  });

  // Auction outbid notification
  await NotificationService.sendNotification({
    userId,
    type: "auction",
    title: "Outbid!",
    message: "You've been outbid on Marcus Swift. New bid: $45,000",
    priority: "medium",
    actionUrl: "/marketplace/auction/demo-auction-1",
    metadata: { auctionId: "demo-auction-1", playerName: "Marcus Swift", newBidAmount: 45000 }
  });

  // Auction ending notification
  await NotificationService.sendNotification({
    userId,
    type: "auction",
    title: "Auction Ending Soon",
    message: "Auction ends in 5 minutes",
    priority: "medium",
    actionUrl: "/marketplace/auction/demo-auction-2",
    metadata: { auctionId: "demo-auction-2", timeRemaining: 5, playerName: "Elena Stormbringer" }
  });

  // Player injury notification
  await NotificationService.sendNotification({
    userId,
    type: "injury",
    title: "Player Injured",
    message: "Kai Thunderstrike has suffered a moderate hamstring strain",
    priority: "medium",
    actionUrl: "/injuries",
    metadata: { teamId, playerName: "Kai Thunderstrike", injuryType: "hamstring strain", severity: 5 }
  });

  // Player recovery notification
  await NotificationService.sendNotification({
    userId,
    type: "injury",
    title: "Player Recovered",
    message: "Zara Swiftwind has fully recovered from ankle sprain",
    priority: "medium",
    actionUrl: "/team",
    metadata: { teamId, playerName: "Zara Swiftwind", injuryType: "ankle sprain", status: "recovered" }
  });

  // Contract expiring notification
  await NotificationService.sendNotification({
    userId,
    type: "contract",
    title: "Contract Expiring",
    message: "Viktor Ironshield's contract expires in 7 days",
    priority: "high",
    actionUrl: "/contracts",
    metadata: { teamId, playerName: "Viktor Ironshield", daysRemaining: 7 }
  });

  // Achievement notification
  await NotificationService.sendNotification({
    userId,
    type: "achievement",
    title: "Achievement Unlocked!",
    message: "First Victory: Win your first league match",
    priority: "medium",
    actionUrl: "/achievements",
    metadata: { achievementName: "First Victory" }
  });

  // League promotion notification
  await NotificationService.sendNotification({
    userId,
    type: "league",
    title: "Promotion!",
    message: "Your team has been promoted to Division 2!",
    priority: "high",
    actionUrl: "/league",
    metadata: { teamId, newDivision: 2 }
  });

  console.log("Demo notifications created successfully!");
}