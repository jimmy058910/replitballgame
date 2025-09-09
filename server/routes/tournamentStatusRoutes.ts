import { Router } from 'express';
import { getPrismaClient } from "../database.js";
import { requireAuth } from "../middleware/firebaseAuth.js";
import { storage } from '../storage/index.js';
import { QuickMatchSimulation } from '../services/enhancedSimulationEngine.js';
import type { Team, Stadium } from '@shared/types/models';


const router = Router();



// Get active tournament status for a team
router.get('/active', requireAuth, async (req: any, res) => {
  try {
    const prisma = await getPrismaClient();
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Get all tournament entries for this team
    const entries = await prisma.tournamentEntry.findMany({
      where: {
        teamId: team.id,
        tournament: {
          status: { in: ['REGISTRATION_OPEN' as any, 'IN_PROGRESS' as any] }
        }
      },
      include: {
        tournament: {
          select: {
            id: true,
            tournamentId: true,
            name: true,
            type: true,
            division: true,
            status: true,
            registrationEndTime: true,
            startTime: true,
            entryFeeCredits: true,
            entryFeeGems: true,
            prizePoolJson: true
          }
        }
      },
      orderBy: {
        registeredAt: 'desc'
      }
    });

    // Transform the data for the frontend
    const statusData = entries.map((entry: any) => ({
      id: entry.id,
      tournamentId: entry.tournament.tournamentId,
      teamId: Number(entry.teamId),
      name: entry.tournament.name,
      type: entry.tournament.type,
      division: entry.tournament.division,
      status: entry.tournament.status,
      registrationDeadline: entry.tournament.registrationEndTime,
      currentParticipants: 1, // Placeholder - would need to count entries
      // ✅ FIX: Mid-Season Cup should be 16 teams, Daily tournaments are 8 teams
      maxParticipants: entry.tournament.type === 'MID_SEASON_CLASSIC' as any ? 16 : 8,
      prizes: entry.tournament.prizePoolJson,
      placement: entry.finalRank,
      registeredAt: entry.registeredAt,
      finalRank: entry.finalRank,
      tournament: {
        id: entry.tournament.id,
        name: entry.tournament.name,
        type: entry.tournament.type,
        division: entry.tournament.division,
        status: entry.tournament.status,
        registrationEndTime: entry.tournament.registrationEndTime,
        startTime: entry.tournament.startTime,
        entryFeeCredits: Number(entry.tournament.entryFeeCredits),
        entryFeeGems: Number(entry.tournament.entryFeeGems),
        prizePoolJson: entry.tournament.prizePoolJson
      }
    }));

    res.json(statusData);
  } catch (error) {
    console.error("Error fetching tournament status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get my active tournament entries
router.get('/my-active', requireAuth, async (req: any, res) => {
  try {
    const prisma = await getPrismaClient();
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Get all tournament entries for this team
    const entries = await prisma.tournamentEntry.findMany({
      where: {
        teamId: team.id,
        tournament: {
          status: { in: ['REGISTRATION_OPEN' as any, 'IN_PROGRESS' as any] }
        }
      },
      include: {
        tournament: {
          select: {
            id: true,
            tournamentId: true,
            name: true,
            type: true,
            division: true,
            status: true,
            registrationEndTime: true,
            startTime: true,
            entryFeeCredits: true,
            entryFeeGems: true,
            prizePoolJson: true
          }
        }
      },
      orderBy: {
        registeredAt: 'desc'
      }
    });

    // Get participant counts for all tournaments
    const participantCounts = await Promise.all(
      entries.map(async (entry: any) => {
        const prisma = await getPrismaClient();
        const count = await prisma.tournamentEntry.count({
          where: { tournamentId: entry.tournament.id }
        });
        return { tournamentId: entry.tournament.id, count };
      })
    );
    
    const participantCountMap = new Map(participantCounts.map((p: any) => [p.tournamentId, p.count]));

    // Transform the data for the frontend
    const statusData = entries.map((entry: any) => ({
      id: entry.id,
      tournamentId: entry.tournament.tournamentId,
      teamId: Number(entry.teamId),
      name: entry.tournament.name,
      type: entry.tournament.type,
      division: entry.tournament.division,
      status: entry.tournament.status,
      registrationDeadline: entry.tournament.registrationEndTime,
      currentParticipants: participantCountMap.get(entry.tournament.id) || 0,
      // ✅ FIX: Mid-Season Cup should be 16 teams, Daily tournaments are 8 teams
      maxParticipants: entry.tournament.type === 'MID_SEASON_CLASSIC' as any ? 16 : 8,
      prizes: entry.tournament.prizePoolJson,
      placement: entry.finalRank,
      registeredAt: entry.registeredAt,
      finalRank: entry.finalRank,
      tournament: {
        id: entry.tournament.id,
        name: entry.tournament.name,
        type: entry.tournament.type,
        division: entry.tournament.division,
        status: entry.tournament.status,
        registrationEndTime: entry.tournament.registrationEndTime,
        startTime: entry.tournament.startTime,
        entryFeeCredits: Number(entry.tournament.entryFeeCredits),
        entryFeeGems: Number(entry.tournament.entryFeeGems),
        prizePoolJson: entry.tournament.prizePoolJson
      }
    }));

    res.json(statusData);
  } catch (error) {
    console.error("Error fetching my active tournaments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get specific tournament status details
router.get('/:id/status', requireAuth, async (req: any, res) => {
  try {
    const prisma = await getPrismaClient();
    const tournamentId = req.params.id;
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Get tournament details - try by database ID first, then by tournament ID
    let tournament = await prisma.tournament.findUnique({
      where: { id: parseInt(tournamentId) },
      select: {
        id: true,
        tournamentId: true,
        name: true,
        type: true,
        division: true,
        status: true,
        registrationEndTime: true,
        startTime: true,
        entryFeeCredits: true,
        entryFeeGems: true,
        prizePoolJson: true,
        entries: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                division: true
              }
            }
          }
        }
      }
    });

    // If not found by database ID, try by tournament ID
    if (!tournament) {
      tournament = await prisma.tournament.findFirst({
        where: { tournamentId: tournamentId },
        select: {
          id: true,
          tournamentId: true,
          name: true,
          type: true,
          division: true,
          status: true,
          registrationEndTime: true,
          startTime: true,
          entryFeeCredits: true,
          entryFeeGems: true,
          prizePoolJson: true,
          entries: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  division: true
                }
              }
            }
          }
        }
      });
    }

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    // Count current participants
    const currentParticipants = tournament.entries.length;
    // ✅ FIX: Mid-Season Cup should be 16 teams, Daily tournaments are 8 teams
    const maxParticipants = tournament.type === 'MID_SEASON_CLASSIC' as any ? 16 : 8;
    const spotsRemaining = maxParticipants - currentParticipants;
    const isFull = currentParticipants >= maxParticipants;

    // Check if user's team is registered
    const userTeamEntry = tournament.entries.find((entry: any) => entry.teamId.toString() === team.id.toString());
    const userTeamRegistered = !!userTeamEntry;

    // Calculate time until start (2 minutes after full - development)
    const now = new Date();
    let timeUntilStart = 0;
    let timeUntilStartText = "Starting soon";
    
    if (isFull && tournament.status === 'REGISTRATION_OPEN') {
      // Tournament is full but hasn't started yet - calculate 2 minute countdown (development)
      const lastEntryTime = tournament.entries.length > 0 
        ? Math.max(...tournament.entries.map((e: any) => new Date(e.registeredAt).getTime())) 
        : now.getTime();
      const startTime = new Date(lastEntryTime + 2 * 60 * 1000); // 2 minutes after last entry (development)
      timeUntilStart = Math.max(0, startTime.getTime() - now.getTime());
      
      if (timeUntilStart > 0) {
        const minutes = Math.floor(timeUntilStart / (1000 * 60));
        const seconds = Math.floor((timeUntilStart % (1000 * 60)) / 1000);
        timeUntilStartText = `${minutes}m ${seconds}s`;
      } else {
        timeUntilStartText = "Starting now!";
      }
    } else if (tournament.startTime) {
      const startTime = new Date(tournament.startTime);
      timeUntilStart = Math.max(0, startTime.getTime() - now.getTime());
      timeUntilStartText = timeUntilStart > 0 
        ? `${Math.floor(timeUntilStart / (1000 * 60 * 60))}h ${Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60))}m` 
        : "Starting soon";
    }

    // Format participants list
    const participants = tournament.entries.map((entry: any) => ({
      id: entry.id.toString(),
      teamId: entry.teamId.toString(),
      teamName: entry.team?.name || "Unknown Team",
      division: entry.team?.division || 0,
      placement: entry.finalRank,
      tournamentId: entry.tournamentId.toString()
    }));

    // Get tournament matches if tournament is in progress
    let matches: any[] = [];
    if (tournament.status === 'IN_PROGRESS') {
      const rawMatches = await prisma.game.findMany({
        where: { tournamentId: tournament.id },
        include: {
          tournament: true
        },
        orderBy: [
          { round: 'asc' },
          { id: 'asc' }
        ]
      });

      // Check if we need to advance tournament rounds
      await checkAndAdvanceTournament(tournament.id);
      
      // Fetch team data separately
      const teamIds = [...new Set([...rawMatches.map((m: any) => m.homeTeamId), ...rawMatches.map((m: any) => m.awayTeamId)])];
      const teams = await prisma.team.findMany({
        where: { id: { in: teamIds } },
        select: {
          id: true,
          name: true,
          division: true
        }
      });
      
      const teamMap = new Map(teams.map((team: any) => [team.id, team]));
      
      // Serialize BigInt values in matches and include team names
      matches = rawMatches.map((match: any) => ({
        ...match,
        id: match.id.toString(),
        leagueId: match.leagueId ? match.leagueId.toString() : null,
        homeTeamId: match.homeTeamId.toString(),
        awayTeamId: match.awayTeamId.toString(),
        tournamentId: match.tournamentId ? match.tournamentId.toString() : null,
        // Ensure scores are properly included
        homeScore: match.homeScore ?? 0,
        awayScore: match.awayScore ?? 0,
        homeTeam: teamMap.get(match.homeTeamId) ?? null,
        awayTeam: teamMap.get(match.awayTeamId) ?? null,
        tournament: match.tournament ? {
          ...match.tournament,
          id: match.tournament.id.toString(),
          entryFeeCredits: match.tournament.entryFeeCredits ? Number(match.tournament.entryFeeCredits) : null,
          entryFeeGems: match.tournament.entryFeeGems ? Number(match.tournament.entryFeeGems) : null
        } : null
      }));
    }

    const statusData = {
      id: tournament.id.toString(),
      tournamentId: tournament.tournamentId,
      name: tournament.name,
      type: tournament.type,
      division: tournament.division,
      status: tournament.status,
      currentParticipants,
      maxParticipants,
      spotsRemaining,
      isFull,
      isReadyToStart: (isFull && timeUntilStart <= 0) || tournament.status === 'IN_PROGRESS',
      timeUntilStart,
      timeUntilStartText,
      registrationDeadline: tournament.registrationEndTime,
      tournamentStartTime: tournament.startTime,
      entryFeeCredits: Number(tournament.entryFeeCredits || 0),
      entryFeeGems: Number(tournament.entryFeeGems || 0),
      prizes: tournament.prizePoolJson,
      participants,
      userTeamRegistered,
      userTeamEntry: userTeamEntry ? {
        id: userTeamEntry.id.toString(),
        teamId: userTeamEntry.teamId.toString(),
        tournamentId: userTeamEntry.tournamentId.toString(),
        placement: userTeamEntry.finalRank
      } : null,
      matches
    };

    res.json(statusData);
  } catch (error) {
    console.error("Error fetching tournament status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Force start tournament (Admin only)
router.post('/:id/force-start', requireAuth, async (req: any, res) => {
  try {
    const prisma = await getPrismaClient();
    const tournamentId = req.params.id;
    const userId = req.user.claims.sub;
    
    // Check if user is admin
    if (userId !== "44010914") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    // Get tournament details
    let tournament = await prisma.tournament.findUnique({
      where: { id: parseInt(tournamentId) },
      include: {
        entries: {
          include: {
            team: true
          }
        }
      }
    });

    // If not found by database ID, try by tournament ID
    if (!tournament) {
      tournament = await prisma.tournament.findFirst({
        where: { tournamentId: tournamentId },
        include: {
          entries: {
            include: {
              team: true
            }
          }
        }
      });
    }

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    // Check if tournament is in correct state
    if (tournament.status !== 'REGISTRATION_OPEN') {
      return res.status(400).json({ message: "Tournament is not in registration phase" });
    }

    const currentParticipants = tournament.entries.length;
    const maxParticipants = tournament.type === 'MID_SEASON_CLASSIC' as any ? 16 : 8;
    const spotsRemaining = maxParticipants - currentParticipants;

    if (spotsRemaining <= 0) {
      return res.status(400).json({ message: "Tournament is already full" });
    }

    // Get all teams except the current tournament participants to fill remaining spots
    const existingParticipantIds = tournament.entries.map((entry: any) => entry.teamId);
    const availableTeams = await prisma.team.findMany({
      where: {
        division: tournament.division,
        id: {
          notIn: existingParticipantIds
        }
      },
      take: spotsRemaining
    });

    if (availableTeams.length < spotsRemaining) {
      return res.status(400).json({ 
        message: `Not enough teams available to fill tournament. Need ${spotsRemaining}, found ${availableTeams.length}` 
      });
    }

    // Add available teams to tournament
    const newEntries = availableTeams.slice(0, spotsRemaining).map((team: any) => ({
      tournamentId: tournament.id,
      teamId: team.id,
      registeredAt: new Date()
    }));

    await prisma.tournamentEntry.createMany({
      data: newEntries
    });

    // Update tournament status to IN_PROGRESS
    const prismaUpdate = await getPrismaClient();
    await prismaUpdate.tournament.update({
      where: { id: tournament.id },
      data: {
        status: 'IN_PROGRESS',
        startTime: new Date()
      }
    });

    // Generate tournament matches
    try {
      const { tournamentService } = await import('../services/tournamentService');
      await tournamentService.generateTournamentMatches(tournament.id);
    } catch (matchError) {
      console.error("Error generating tournament matches:", matchError);
      // Continue even if match generation fails
    }

    res.json({ 
      message: "Tournament force started successfully",
      teamsAdded: availableTeams.length,
      totalParticipants: currentParticipants + availableTeams.length
    });

  } catch (error) {
    console.error("Error force starting tournament:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get tournament matches
router.get('/:id/matches', requireAuth, async (req: any, res) => {
  try {
    const prisma = await getPrismaClient();
    const tournamentId = req.params.id;
    
    // Get tournament first to get the database ID
    let tournament = await prisma.tournament.findUnique({
      where: { id: parseInt(tournamentId) }
    });
    
    if (!tournament) {
      tournament = await prisma.tournament.findFirst({
        where: { tournamentId: tournamentId }
      });
    }
    
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }
    
    const matches = await prisma.game.findMany({
      where: { tournamentId: tournament.id },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        tournament: true
      },
      orderBy: [
        { round: 'asc' },
        { id: 'asc' }
      ]
    });
    
    // Convert BigInt fields to strings for JSON serialization
    const serializedMatches = matches.map((match: any) => ({
      ...match,
      tournament: match.tournament ? {
        ...match.tournament,
        entryFeeCredits: match.tournament.entryFeeCredits ? Number(match.tournament.entryFeeCredits) : null,
        entryFeeGems: match.tournament.entryFeeGems ? Number(match.tournament.entryFeeGems) : null
      } : null
    }));
    
    res.json(serializedMatches);
  } catch (error) {
    console.error("Error fetching tournament matches:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Start live tournament round
router.post('/:id/matches/simulate-round', requireAuth, async (req: any, res) => {
  try {
    const prisma = await getPrismaClient();
    const tournamentId = req.params.id;
    const { round } = req.body;
    const userId = req.user.claims.sub;
    
    // Check if user is admin
    if (userId !== "44010914") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    // Get tournament first to get the database ID
    let tournament = await prisma.tournament.findFirst({
      where: { tournamentId: tournamentId }
    });
    
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    // Convert round name to number
    let roundNumber = 1;
    if (round === 'QUARTERFINALS') roundNumber = 1;
    else if (round === 'SEMIFINALS') roundNumber = 2;
    else if (round === 'FINALS') roundNumber = 3;

    // Get matches for the specified round
    const matches = await prisma.game.findMany({
      where: { 
        tournamentId: tournament.id,
        round: roundNumber,
        status: 'SCHEDULED'
      }
    });

    // Use instant simulation for all matches in the round
    const matchPromises = matches.map(async (match: any) => {
      const prisma = await getPrismaClient();
      try {
        // Set match status to IN_PROGRESS
        await prisma.game.update({
          where: { id: match.id },
          data: {
            status: 'IN_PROGRESS',
            gameDate: new Date()
          }
        });

        // Run instant simulation
        const simulationResult = await QuickMatchSimulation.runQuickSimulation(match.id.toString());
        
        // Update match status and score immediately
        await prisma.game.update({
          where: { id: match.id },
          data: {
            status: 'COMPLETED',
            homeScore: simulationResult.finalScore.home,
            awayScore: simulationResult.finalScore.away
          }
        });

        // Record stadium revenue for home team
        if (simulationResult.revenueGenerated > 0) {
          const homeTeam = await prisma.team.findUnique({
            where: { id: match.homeTeamId }
          });
          
          if (homeTeam?.userProfileId) {
            // Get the userProfile to find userId
            const userProfile = await prisma.userProfile.findUnique({
              where: { id: homeTeam.userProfileId }
            });
            
            if (userProfile) {
              const { PaymentHistoryService } = await import('../services/paymentHistoryService');
              await PaymentHistoryService.recordTransaction({
                userId: userProfile.userId,
                teamId: match.homeTeamId,
                transactionType: 'STADIUM_REVENUE' as any,
                itemName: 'Home Game Stadium Revenue',
                itemType: 'STADIUM_REVENUE' as any,
                creditsAmount: simulationResult.revenueGenerated,
                gemsAmount: 0,
                status: 'completed' as any
              });
              console.log(`💰 Recorded stadium revenue: ${simulationResult.revenueGenerated}₡ for team ${homeTeam.name}`);
            }
          }
        }
        
        console.log(`Completed instant simulation for tournament match ${match.id}`);
        
        return match.id;
      } catch (error) {
        console.error(`Error simulating tournament match ${match.id}:`, error);
        return null;
      }
    });

    const startedMatches = await Promise.all(matchPromises);
    const successfulMatches = startedMatches.filter(id => id !== null);

    res.json({ 
      message: `${round} round live simulation started`,
      matchesStarted: successfulMatches.length,
      matchIds: successfulMatches
    });
  } catch (error) {
    console.error("Error starting tournament round:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Manual trigger for IN_PROGRESS matches (testing endpoint)
router.post('/:id/matches/manual-start', requireAuth, async (req: any, res) => {
  try {
    const prisma = await getPrismaClient();
    const tournamentId = req.params.id;
    const { round } = req.body;
    const userId = req.user.claims.sub;
    
    // Check if user is admin
    if (userId !== "44010914") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    // Get tournament first to get the database ID
    let tournament = await prisma.tournament.findFirst({
      where: { tournamentId: tournamentId }
    });
    
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    // Convert round name to number
    let roundNumber = 1;
    if (round === 'QUARTERFINALS') roundNumber = 1;
    else if (round === 'SEMIFINALS') roundNumber = 2;
    else if (round === 'FINALS') roundNumber = 3;

    // Get matches for the specified round (IN_PROGRESS status)
    const matches = await prisma.game.findMany({
      where: { 
        tournamentId: tournament.id,
        round: roundNumber,
        status: 'IN_PROGRESS'
      }
    });

    console.log(`Found ${matches.length} IN_PROGRESS matches for tournament ${tournamentId} round ${roundNumber}`);

    // Use instant simulation for all matches in the round
    const matchPromises = matches.map(async (match: any) => {
      const prisma = await getPrismaClient();
      try {
        // Run instant simulation directly
        const simulationResult = await QuickMatchSimulation.runQuickSimulation(match.id.toString());
        
        // Update match status and score immediately
        await prisma.game.update({
          where: { id: match.id },
          data: {
            status: 'COMPLETED',
            homeScore: simulationResult.finalScore.home,
            awayScore: simulationResult.finalScore.away
          }
        });
        
        console.log(`Completed instant simulation for tournament match ${match.id}`);
        
        return match.id;
      } catch (error) {
        console.error(`Error simulating tournament match ${match.id}:`, error);
        return null;
      }
    });

    const startedMatches = await Promise.all(matchPromises);
    const successfulMatches = startedMatches.filter(id => id !== null);

    res.json({ 
      message: `Manual start for ${round} round (IN_PROGRESS matches)`,
      matchesStarted: successfulMatches.length,
      matchIds: successfulMatches
    });
  } catch (error) {
    console.error("Error manually starting tournament round:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Force tournament progression endpoint (testing)
router.post('/:id/force-progression', requireAuth, async (req: any, res) => {
  try {
    const prisma = await getPrismaClient();
    const tournamentId = req.params.id;
    const userId = req.user.claims.sub;
    
    // Check if user is admin
    if (userId !== "44010914") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    // Get tournament first to get the database ID
    let tournament = await prisma.tournament.findFirst({
      where: { tournamentId: tournamentId }
    });
    
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    // Import and call tournament flow service
    const { tournamentFlowService } = await import('../services/tournamentFlowService');
    
    // Check for round advancement for rounds 1, 2, and 3
    await tournamentFlowService.handleMatchCompletion(1663); // Dummy match ID to trigger flow
    
    res.json({ 
      message: "Tournament progression forced",
      tournamentId: tournamentId
    });
  } catch (error) {
    console.error("Error forcing tournament progression:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Helper function to check and advance tournament if needed
async function checkAndAdvanceTournament(tournamentId: number) {
  try {
    const prisma = await getPrismaClient();
    console.log(`🔍 [TOURNAMENT CHECK] Checking advancement for tournament ${tournamentId}`);
    
    // Check quarterfinals (round 1)
    const quarterfinalsMatches = await prisma.game.findMany({
      where: {
        tournamentId,
        round: 1,
        status: 'COMPLETED' as any
      }
    });

    console.log(`🔍 [TOURNAMENT CHECK] Found ${quarterfinalsMatches.length} completed quarterfinals`);

    if (quarterfinalsMatches.length === 4) {
      // All quarterfinals are complete, check if semifinals exist
      const semifinalsMatches = await prisma.game.findMany({
        where: {
          tournamentId,
          round: 2
        }
      });

      console.log(`🔍 [TOURNAMENT CHECK] Found ${semifinalsMatches.length} existing semifinals`);

      if (semifinalsMatches.length === 0) {
        // Need to generate semifinals - call tournament flow service
        console.log(`🚀 [TOURNAMENT CHECK] Triggering round advancement for tournament ${tournamentId}`);
        const { tournamentFlowService } = await import('../services/tournamentFlowService.js');
        await tournamentFlowService.handleMatchCompletion(quarterfinalsMatches[0].id);
      }
    }
  } catch (error) {
    console.error("Error checking tournament advancement:", error);
  }
}

// REMOVED: Duplicate generateNextRoundMatches function - now using UnifiedTournamentAutomation only

// Start a tournament match
router.post('/:id/matches/:matchId/start', requireAuth, async (req: any, res) => {
  try {
    const prisma = await getPrismaClient();
    const { matchId } = req.params;
    const userId = req.user.claims.sub;
    
    // Check if user is admin
    if (userId !== "44010914") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    await prisma.game.update({
      where: { id: parseInt(matchId) },
      data: { status: "IN_PROGRESS" }
    });
    
    res.json({ message: "Match started successfully" });
  } catch (error) {
    console.error("Error starting tournament match:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Simulate a tournament match (for testing)
router.post('/:id/matches/:matchId/simulate', requireAuth, async (req: any, res) => {
  try {
    const prisma = await getPrismaClient();
    const { matchId } = req.params;
    const userId = req.user.claims.sub;
    
    // Check if user is admin
    if (userId !== "44010914") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    // Simple simulation - just set random scores
    const homeScore = Math.floor(Math.random() * 5);
    const awayScore = Math.floor(Math.random() * 5);
    
    const result = await prisma.game.update({
      where: { id: parseInt(matchId) },
      data: { 
        homeScore,
        awayScore,
        status: "COMPLETED",
        simulated: true
      }
    });
    
    res.json(result);
  } catch (error) {
    console.error("Error simulating tournament match:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get tournament matches for bracket display
router.get('/:tournamentId/matches', async (req, res) => {
  try {
    const prisma = await getPrismaClient();
    const { tournamentId } = req.params;
    
    // Get tournament matches from Game table
    const matches = await prisma.game.findMany({
      where: { 
        tournamentId: parseInt(tournamentId)
      },
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true
          }
        },
        awayTeam: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { round: 'asc' },
        { gameDate: 'asc' }
      ]
    });

    // Transform matches to match frontend interface
    const transformedMatches = matches.map((match: any) => ({
      id: match.id.toString(),
      homeTeam: {
        id: match.homeTeam.id.toString(),
        name: match.homeTeam.name
      },
      awayTeam: {
        id: match.awayTeam.id.toString(),
        name: match.awayTeam.name
      },
      round: match.round,
      status: match.status,
      homeTeamScore: match.homeScore || 0,
      awayTeamScore: match.awayScore || 0,
      gameTime: match.gameDate?.toISOString(),
      winner: match.status === 'COMPLETED' ? (
        (match.homeScore || 0) > (match.awayScore || 0) ? match.homeTeam.name 
        : (match.awayScore || 0) > (match.homeScore || 0) ? match.awayTeam.name : null
      ) : null
    }));

    res.json(transformedMatches);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tournament matches', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Start live tournament round (Admin only)
router.post('/:tournamentId/simulate-round', requireAuth, async (req: any, res) => {
  try {
    const prisma = await getPrismaClient();
    const { tournamentId } = req.params;
    const { round } = req.body;
    const userId = req.user.claims.sub;
    
    // Check if user is admin
    if (userId !== "44010914") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    // Get tournament matches for the specified round
    const matches = await prisma.game.findMany({
      where: {
        tournamentId: parseInt(tournamentId),
        round: round,
        status: 'SCHEDULED'
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    if (matches.length === 0) {
      return res.status(404).json({ message: "No schedulable matches found for this round" });
    }

    // Use instant simulation for each match
    const matchPromises = matches.map(async (match: any) => {
      const prisma = await getPrismaClient();
      try {
        // Set match status to IN_PROGRESS
        await prisma.game.update({
          where: { id: match.id },
          data: {
            status: 'IN_PROGRESS',
            gameDate: new Date()
          }
        });

        // Run instant simulation
        const simulationResult = await QuickMatchSimulation.runQuickSimulation(match.id.toString());
        
        // Update match status and score immediately
        await prisma.game.update({
          where: { id: match.id },
          data: {
            status: 'COMPLETED',
            homeScore: simulationResult.finalScore.home,
            awayScore: simulationResult.finalScore.away
          }
        });

        // Record stadium revenue for home team
        if (simulationResult.revenueGenerated > 0) {
          const homeTeam = await prisma.team.findUnique({
            where: { id: match.homeTeamId }
          });
          
          if (homeTeam?.userProfileId) {
            // Get the userProfile to find userId
            const userProfile = await prisma.userProfile.findUnique({
              where: { id: homeTeam.userProfileId }
            });
            
            if (userProfile) {
              const { PaymentHistoryService } = await import('../services/paymentHistoryService');
              await PaymentHistoryService.recordTransaction({
                userId: userProfile.userId,
                teamId: match.homeTeamId,
                transactionType: 'STADIUM_REVENUE' as any,
                itemName: 'Home Game Stadium Revenue',
                itemType: 'STADIUM_REVENUE' as any,
                creditsAmount: simulationResult.revenueGenerated,
                gemsAmount: 0,
                status: 'completed' as any
              });
              console.log(`💰 Recorded stadium revenue: ${simulationResult.revenueGenerated}₡ for team ${homeTeam.name}`);
            }
          }
        }
        
        console.log(`Completed instant simulation for tournament match ${match.id}`);
        
        return match.id;
      } catch (error) {
        console.error(`Error simulating tournament match ${match.id}:`, error);
        return null;
      }
    });

    const startedMatches = await Promise.all(matchPromises);
    const successfulMatches = startedMatches.filter(id => id !== null);

    res.json({ 
      message: `Successfully started live simulation for ${successfulMatches.length} matches in round ${round}`,
      matchIds: successfulMatches
    });
  } catch (error) {
    console.error("Error starting tournament round:", error);
    res.status(500).json({ message: "Failed to start tournament round", error: error instanceof Error ? error.message : 'Unknown error' });
  const prisma = await getPrismaClient();
  }
});

// Helper function to advance tournament to next round
async function advanceTournament(tournamentId: number, completedRound: string) {
  try {
    const prisma = await getPrismaClient();
    // Get completed matches from the round
    const completedMatches = await prisma.game.findMany({
      where: {
        tournamentId: tournamentId,
        round: parseInt(completedRound) || null,
        status: 'COMPLETED' as any
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    // Determine winners
    const winners = completedMatches.map((match: any) => {
      const winnerId = (match.homeScore || 0) > (match.awayScore || 0) ? match.homeTeamId : match.awayTeamId;
      return { teamId: winnerId, match: match };
    });

    // Create next round matches based on completed round
    if (completedRound === 'QUARTERFINALS' && winners.length === 4) {
      // Create semifinals
      const semifinalMatches = [
        { homeTeamId: winners[0].teamId, awayTeamId: winners[1].teamId },
        { homeTeamId: winners[2].teamId, awayTeamId: winners[3].teamId }
      ];

      for (const match of semifinalMatches) {
        await prisma.game.create({
          data: {
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            gameDate: new Date(),
            status: 'SCHEDULED',
            round: 2, // SEMIFINALS
            matchType: 'TOURNAMENT_DAILY',
            tournamentId: tournamentId
          }
        });
      }
    } else if (completedRound === 'SEMIFINALS' && winners.length === 2) {
      // Create finals
      await prisma.game.create({
        data: {
          homeTeamId: winners[0].teamId,
          awayTeamId: winners[1].teamId,
          gameDate: new Date(),
          status: 'SCHEDULED',
          round: 3, // FINALS
          matchType: 'TOURNAMENT_DAILY',
          tournamentId: tournamentId
        }
      });
    } else if (completedRound === 'FINALS' && winners.length === 1) {
      // Tournament complete - update tournament status
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          status: 'COMPLETED' as any,
        }
      });
    }
  } catch (error) {
    console.error("Error advancing tournament:", error);
    throw error;
  }
}

// Test tournament advancement fix
router.post('/:id/test-advancement', requireAuth, async (req: any, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const userId = req.user.claims.sub;
    
    // Check if user is admin
    if (userId !== "44010914") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    // Import and call the season timing automation service
    const { SeasonTimingAutomationService } = await import('../services/seasonTimingAutomationService');
    const automationService = SeasonTimingAutomationService.getInstance();
    
    // Call the advancement method directly 
    await (automationService as any).advanceTournamentIfNeeded(tournamentId);
    
    res.json({ 
      success: true, 
      message: `Tournament advancement check completed for tournament ${tournamentId}` 
    });
    
  } catch (error) {
    console.error("Error testing tournament advancement:", error);
    res.status(500).json({ message: "Internal server error", error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Emergency endpoint to start live simulation for tournament matches
router.post('/start-live-match', requireAuth, async (req: any, res) => {
  try {
    const { matchId } = req.body;
    const userId = req.user.claims.sub;
    
    // Check if user is admin or development environment
    if (userId !== "44010914" && process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    // Run instant simulation
    const simulationResult = await QuickMatchSimulation.runQuickSimulation(matchId.toString());
    
    // Update match status and score immediately
    const prisma = await getPrismaClient();
    await prisma.game.update({
      where: { id: parseInt(matchId) },
      data: {
        status: 'COMPLETED',
        homeScore: simulationResult.finalScore.home,
        awayScore: simulationResult.finalScore.away
      }
    });
    
    res.json({ 
      success: true, 
      message: `Match ${matchId} completed via instant simulation`,
      finalScore: simulationResult.finalScore
    });
    
  } catch (error) {
    console.error("Error starting live match:", error);
    res.status(500).json({ message: "Internal server error", error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Development endpoint to trigger tournament advancement
router.post('/dev-advance-tournament/:tournamentId', requireAuth, async (req: any, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: "Development endpoint only" });
    }

    const { tournamentId } = req.params;
    
    // Import tournament flow service
    const { tournamentFlowService } = await import('../services/tournamentFlowService');
    
    // Manually trigger round advancement check for round 1 (quarterfinals)
    await (tournamentFlowService as any).checkAndAdvanceRound(parseInt(tournamentId), 1);
    
    res.json({ 
      success: true, 
      message: `Tournament ${tournamentId} advancement check completed`
    });
    
  } catch (error) {
    console.error("Error advancing tournament:", error);
    res.status(500).json({ message: "Internal server error", error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Development endpoint to start all tournament matches
router.post('/dev-start-tournament/:tournamentId', requireAuth, async (req: any, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: "Development endpoint only" });
    }

    const { tournamentId } = req.params;
    const prisma = await getPrismaClient();
    
    // Get all SCHEDULED matches for this tournament
    const matches = await prisma.game.findMany({
      where: { 
        tournamentId: parseInt(tournamentId),
        status: 'SCHEDULED'
      }
    });

    if (matches.length === 0) {
      return res.json({ 
        success: true, 
        message: "No scheduled matches found",
        matchesProcessed: 0
      });
    }

    // Process each match with instant simulation
    const results = [];
    for (const match of matches) {
      try {
        // Run instant simulation
        const simulationResult = await QuickMatchSimulation.runQuickSimulation(match.id.toString());
        
        // Update match status and score immediately
        await prisma.game.update({
          where: { id: match.id },
          data: {
            status: 'COMPLETED',
            homeScore: simulationResult.finalScore.home,
            awayScore: simulationResult.finalScore.away,
            simulated: true
          }
        });
        
        // Trigger tournament advancement if this is a tournament match
        if (match.tournamentId) {
          const { tournamentFlowService } = await import('../services/tournamentFlowService.js');
          await tournamentFlowService.handleMatchCompletion(match.id);
        }
        
        results.push({
          matchId: match.id,
          success: true,
          score: `${simulationResult.finalScore.home}-${simulationResult.finalScore.away}`
        });
        
        console.log(`✅ Match ${match.id} completed: ${simulationResult.finalScore.home}-${simulationResult.finalScore.away}`);
      } catch (error) {
        console.error(`❌ Match ${match.id} failed:`, error);
        results.push({
          matchId: match.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.json({ 
      success: true, 
      message: `Tournament ${tournamentId} matches processed`,
      matchesProcessed: results.length,
      results: results
    });
    
  } catch (error) {
    console.error("Error starting tournament matches:", error);
    res.status(500).json({ message: "Internal server error", error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Manual finals creation for development
router.post('/create-finals/:tournamentId', requireAuth, async (req: any, res: any) => {
  const tournamentId = parseInt(req.params.tournamentId);
  const prisma = await getPrismaClient();
  
  try {
    // Check if finals already exist
    const existingFinals = await prisma.game.findFirst({
      where: {
        tournamentId: tournamentId,
        round: 3
      }
    });
    
    if (existingFinals) {
      return res.json({ 
        success: true, 
        message: `Finals already exist for tournament ${tournamentId}`,
        matchId: existingFinals.id
      });
    }
    
    // Create finals match: Oakland Cougars (4) vs Thunder Bolts 684 (26)
    const finalsMatch = await prisma.game.create({
      data: {
        tournamentId: tournamentId,
        homeTeamId: 4, // Oakland Cougars
        awayTeamId: 26, // Thunder Bolts 684
        homeScore: 0,
        awayScore: 0,
        status: 'SCHEDULED',
        round: 3,
        gameDate: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
        matchType: 'TOURNAMENT_DAILY',
        simulated: false
      }
    });
    
    console.log(`✅ Finals created: Match ${finalsMatch.id} - Oakland Cougars vs Thunder Bolts 684`);
    
    res.json({ 
      success: true, 
      message: `Finals created for tournament ${tournamentId}`,
      matchId: finalsMatch.id,
      teams: "Oakland Cougars vs Thunder Bolts 684"
    });
  } catch (error) {
    console.error('Error creating finals:', error);
    res.status(500).json({ error: 'Failed to create finals', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Manual tournament completion for development
router.post('/dev-complete/:tournamentId', requireAuth, async (req: any, res: any) => {
  const tournamentId = parseInt(req.params.tournamentId);
  const prisma = await getPrismaClient();
  
  try {
    // Check if all matches are completed
    const allMatches = await prisma.game.findMany({
      where: { tournamentId: tournamentId }
    });
    
    const completedMatches = allMatches.filter(match => match.status === 'COMPLETED');
    
    if (completedMatches.length !== allMatches.length) {
      return res.status(400).json({ 
        error: 'Tournament not ready for completion',
        details: `${completedMatches.length}/${allMatches.length} matches completed`
      });
    }
    
    // Get finals match to determine winner
    const finalsMatch = await prisma.game.findFirst({
      where: {
        tournamentId: tournamentId,
        round: 3,
        status: 'COMPLETED'
      }
    });
    
    if (!finalsMatch) {
      return res.status(400).json({ error: 'Finals match not found or not completed' });
    }
    
    // Determine winner
    const winnerId = (finalsMatch.homeScore || 0) > (finalsMatch.awayScore || 0) 
      ? finalsMatch.homeTeamId 
      : finalsMatch.awayTeamId;
    const runnerUpId = winnerId === finalsMatch.homeTeamId 
      ? finalsMatch.awayTeamId 
      : finalsMatch.homeTeamId;
    
    // Award winner credits (5000₡ for winner, 2500₡ for runner-up)
    const winnerFinances = await prisma.teamFinances.findFirst({
      where: { teamId: winnerId }
    });
    const runnerUpFinances = await prisma.teamFinances.findFirst({
      where: { teamId: runnerUpId }
    });
    
    if (winnerFinances) {
      await prisma.teamFinances.update({
        where: { id: winnerFinances.id },
        data: { credits: { increment: 5000 } }
      });
    }
    
    if (runnerUpFinances) {
      await prisma.teamFinances.update({
        where: { id: runnerUpFinances.id },
        data: { credits: { increment: 2500 } }
      });
    }
    
    // Update tournament status to COMPLETED
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: 'COMPLETED' }
    });
    
    console.log(`✅ Tournament ${tournamentId} completed - Winner: ${winnerId}, Runner-up: ${runnerUpId}`);
    
    res.json({ 
      success: true, 
      message: `Tournament ${tournamentId} completed successfully`,
      winner: winnerId,
      runnerUp: runnerUpId,
      details: "5000₡ awarded to winner, 2500₡ to runner-up, status updated to COMPLETED"
    });
  } catch (error) {
    console.error('Error completing tournament:', error);
    res.status(500).json({ 
      error: 'Failed to complete tournament', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;