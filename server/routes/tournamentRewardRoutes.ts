import { Router, Response } from 'express';
import { getPrismaClient } from '../database.js';

// Initialize Prisma client
const prisma = await getPrismaClient();
import { requireAuth } from "../middleware/firebaseAuth.js";
import { storage } from '../storage/index.js';

const router = Router();

/**
 * Get unclaimed tournament rewards for a team
 */
router.get('/unclaimed', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam || !userTeam.id) return res.status(404).json({ message: "Team not found." });

    // Get all unclaimed tournament entries for this team
    const unclaimedEntries = await prisma.tournamentEntry.findMany({
      where: {
        teamId: userTeam.id,
        rewardsClaimed: false,
        finalRank: {
          not: null,
          lte: 3 // Only top 3 finishers get rewards
        }
      },
      include: {
        tournament: true
      },
      orderBy: {
        registeredAt: 'desc'
      }
    });

    const rewardsSummary = [];
    let totalCredits = 0;
    let totalGems = 0;

    for (const entry of unclaimedEntries) {
      const tournament = entry.tournament;
      if (!tournament.prizePoolJson) continue;

      const prizePool = typeof tournament.prizePoolJson === 'string' 
        ? JSON.parse(tournament.prizePoolJson)
        : tournament.prizePoolJson;
      let reward = { credits: 0, gems: 0 };

      // Determine reward based on final rank
      if (entry.finalRank === 1 && prizePool.champion) {
        reward = prizePool.champion;
      } else if (entry.finalRank === 2 && prizePool.runnerUp) {
        reward = prizePool.runnerUp;
      } else if (entry.finalRank === 3 && prizePool.semifinalist) {
        reward = prizePool.semifinalist;
      }

      if (reward.credits > 0 || reward.gems > 0) {
        rewardsSummary.push({
          tournamentId: tournament.tournamentId,
          tournamentName: tournament.name,
          placement: entry.finalRank,
          placementText: entry.finalRank === 1 ? 'Champion' : entry.finalRank === 2 ? 'Runner-up' : 'Semifinalist',
          credits: reward.credits,
          gems: reward.gems,
          entryId: entry.id
        });

        totalCredits += reward.credits;
        totalGems += reward.gems;
      }
    }

    res.json({
      unclaimedRewards: rewardsSummary,
      totalCredits,
      totalGems,
      hasUnclaimedRewards: rewardsSummary.length > 0
    });

  } catch (error) {
    console.error('Error getting unclaimed tournament rewards:', error);
    res.status(500).json({ message: 'Failed to get unclaimed rewards' });
  }
});

/**
 * Claim all pending tournament rewards
 */
router.post('/claim-all', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam || !userTeam.id) return res.status(404).json({ message: "Team not found." });

    // Get all unclaimed tournament entries for this team
    const unclaimedEntries = await prisma.tournamentEntry.findMany({
      where: {
        teamId: userTeam.id,
        rewardsClaimed: false,
        finalRank: {
          not: null,
          lte: 3
        }
      },
      include: {
        tournament: true
      }
    });

    if (unclaimedEntries.length === 0) {
      return res.status(400).json({ message: 'No unclaimed rewards available' });
    }

    let totalCredits = 0;
    let totalGems = 0;
    const claimedRewards = [];

    // Calculate total rewards
    for (const entry of unclaimedEntries) {
      const tournament = entry.tournament;
      if (!tournament.prizePoolJson) continue;

      const prizePool = typeof tournament.prizePoolJson === 'string' 
        ? JSON.parse(tournament.prizePoolJson)
        : tournament.prizePoolJson;
      let reward = { credits: 0, gems: 0 };

      if (entry.finalRank === 1 && prizePool.champion) {
        reward = prizePool.champion;
      } else if (entry.finalRank === 2 && prizePool.runnerUp) {
        reward = prizePool.runnerUp;
      } else if (entry.finalRank === 3 && prizePool.semifinalist) {
        reward = prizePool.semifinalist;
      }

      if (reward.credits > 0 || reward.gems > 0) {
        totalCredits += reward.credits;
        totalGems += reward.gems;
        claimedRewards.push({
          tournamentName: tournament.name,
          placement: entry.finalRank,
          credits: reward.credits,
          gems: reward.gems
        });
      }
    }

    // Update team finances
    const teamFinances = await prisma.teamFinances.findUnique({
      where: { teamId: userTeam.id }
    });

    if (!teamFinances) {
      return res.status(404).json({ message: 'Team finances not found' });
    }

    const currentCredits = Number(teamFinances.credits);
    const currentGems = teamFinances.gems;

    await prisma.teamFinances.update({
      where: { teamId: userTeam.id },
      data: {
        credits: BigInt(currentCredits + totalCredits),
        gems: currentGems + totalGems
      }
    });

    // Mark all entries as claimed
    await prisma.tournamentEntry.updateMany({
      where: {
        teamId: userTeam.id,
        rewardsClaimed: false,
        finalRank: {
          not: null,
          lte: 3
        }
      },
      data: {
        rewardsClaimed: true
      }
    });

    // Record transaction in payment history
    if (totalCredits > 0 || totalGems > 0) {
      const { PaymentHistoryService } = await import('../services/paymentHistoryService');
      
      if (totalCredits > 0) {
        await PaymentHistoryService.recordTransaction({
          userId: userTeam.userProfileId.toString(),
          teamId: userTeam.id,
          transactionType: 'reward',
          itemName: 'Tournament Rewards',
          itemType: 'reward',
          creditsAmount: BigInt(totalCredits),
          gemsAmount: 0,
          status: 'completed',
          metadata: { claimedRewards }
        });
      }

      if (totalGems > 0) {
        await PaymentHistoryService.recordTransaction({
          userId: userTeam.userProfileId.toString(),
          teamId: userTeam.id,
          transactionType: 'reward',
          itemName: 'Tournament Rewards',
          itemType: 'reward',
          creditsAmount: BigInt(0),
          gemsAmount: totalGems,
          status: 'completed',
          metadata: { claimedRewards }
        });
      }
    }

    console.log(`🏆 Tournament rewards claimed by ${userTeam.name}: ${totalCredits}₡ and ${totalGems}💎`);

    res.json({
      success: true,
      message: `Successfully claimed ${totalCredits} credits and ${totalGems} gems from ${claimedRewards.length} tournaments`,
      totalCredits,
      totalGems,
      claimedRewards,
      newBalance: {
        credits: currentCredits + totalCredits,
        gems: currentGems + totalGems
      }
    });

  } catch (error) {
    console.error('Error claiming tournament rewards:', error);
    res.status(500).json({ message: 'Failed to claim rewards' });
  }
});

// Fix missing playoff rewards for Division 8 championship
router.post('/fix-playoff-rewards/:division', requireAuth, async (req: any, res: Response) => {
  try {
    const division = parseInt(req.params.division);
    if (![8].includes(division)) {
      return res.status(400).json({ message: "Playoff reward fix only available for Division 8" });
    }

    // Create a League Championship tournament for the missing playoff
    const existingChampionship = await prisma.tournament.findFirst({
      where: {
        division: division,
        type: "MID_SEASON_CLASSIC"
      }
    });

    let championshipTournament;
    if (!existingChampionship) {
      // Create the missing League Championship tournament
      championshipTournament = await prisma.tournament.create({
        data: {
          name: `Division ${division} Championship`,
          tournamentId: `div-${division}-championship-${Date.now()}`,
          type: "MID_SEASON_CLASSIC",
          division: division,
          status: "COMPLETED",
          startTime: new Date("2025-08-30T05:00:00Z"), // Day 15
          registrationEndTime: new Date("2025-08-30T04:59:59Z"),
          endTime: new Date("2025-08-30T06:00:00Z"),
          entryFeeCredits: 0,
          entryFeeGems: 0,
          prizePoolJson: JSON.stringify({
            champion: { credits: 1500, gems: 0 },
            runnerUp: { credits: 500, gems: 0 }
          }),
          seasonDay: 15
        }
      });
    } else {
      championshipTournament = existingChampionship;
    }

    // Create tournament entries for playoff teams with proper finalRank
    const playoffResults = [
      { teamId: 4, finalRank: 1 },  // Oakland Cougars - Champion
      { teamId: 15, finalRank: 2 }, // Fire Hawks 261 - Runner-up  
      { teamId: 17, finalRank: 3 }  // Iron Wolves 858 - 3rd place
    ];

    let entriesCreated = 0;
    for (const result of playoffResults) {
      // Check if entry already exists
      const existingEntry = await prisma.tournamentEntry.findFirst({
        where: {
          tournamentId: championshipTournament.id,
          teamId: result.teamId
        }
      });

      if (!existingEntry) {
        await prisma.tournamentEntry.create({
          data: {
            tournamentId: championshipTournament.id,
            teamId: result.teamId,
            registeredAt: new Date("2025-08-30T04:00:00Z"),
            finalRank: result.finalRank,
            rewardsClaimed: false
          }
        });
        entriesCreated++;
      }
    }

    res.json({
      success: true,
      message: `Fixed playoff rewards for Division ${division}`,
      tournamentId: championshipTournament.id,
      entriesCreated: entriesCreated
    });

  } catch (error) {
    console.error("Error fixing playoff rewards:", error);
    res.status(500).json({ message: "Failed to fix playoff rewards" });
  }
});

export default router;