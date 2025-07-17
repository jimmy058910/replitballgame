import { Router } from 'express';
import { prisma } from '../db';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';

const router = Router();



// Get active tournament status for a team
router.get('/active', isAuthenticated, async (req: any, res) => {
  try {
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
          status: { in: ['REGISTRATION_OPEN', 'IN_PROGRESS'] }
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
    const statusData = entries.map(entry => ({
      id: entry.id,
      tournamentId: entry.tournament.tournamentId,
      teamId: Number(entry.teamId),
      name: entry.tournament.name,
      type: entry.tournament.type,
      division: entry.tournament.division,
      status: entry.tournament.status,
      registrationDeadline: entry.tournament.registrationEndTime,
      entryTime: entry.registeredAt,
      currentParticipants: 1, // Placeholder - would need to count entries
      maxParticipants: 8, // Standard tournament size
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
router.get('/my-active', isAuthenticated, async (req: any, res) => {
  try {
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
          status: { in: ['REGISTRATION_OPEN', 'IN_PROGRESS'] }
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
      entries.map(async (entry) => {
        const count = await prisma.tournamentEntry.count({
          where: { tournamentId: entry.tournament.id }
        });
        return { tournamentId: entry.tournament.id, count };
      })
    );
    
    const participantCountMap = new Map(participantCounts.map(p => [p.tournamentId, p.count]));

    // Transform the data for the frontend
    const statusData = entries.map(entry => ({
      id: entry.id,
      tournamentId: entry.tournament.tournamentId,
      teamId: Number(entry.teamId),
      name: entry.tournament.name,
      type: entry.tournament.type,
      division: entry.tournament.division,
      status: entry.tournament.status,
      registrationDeadline: entry.tournament.registrationEndTime,
      entryTime: entry.registeredAt,
      currentParticipants: participantCountMap.get(entry.tournament.id) || 0,
      maxParticipants: 8, // Standard tournament size
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
router.get('/:id/status', isAuthenticated, async (req: any, res) => {
  try {
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
    const maxParticipants = 8; // Standard tournament size
    const spotsRemaining = maxParticipants - currentParticipants;
    const isFull = currentParticipants >= maxParticipants;

    // Check if user's team is registered
    const userTeamEntry = tournament.entries.find(entry => entry.teamId.toString() === team.id.toString());
    const userTeamRegistered = !!userTeamEntry;

    // Calculate time until start (10 minutes after full)
    const now = new Date();
    let timeUntilStart = 0;
    let timeUntilStartText = "Starting soon";
    
    if (isFull && tournament.status === 'REGISTRATION_OPEN') {
      // Tournament is full but hasn't started yet - calculate 10 minute countdown
      const lastEntryTime = tournament.entries.length > 0 ? 
        Math.max(...tournament.entries.map(e => new Date(e.registeredAt).getTime())) : 
        now.getTime();
      const startTime = new Date(lastEntryTime + 10 * 60 * 1000); // 10 minutes after last entry
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
      timeUntilStartText = timeUntilStart > 0 ? 
        `${Math.floor(timeUntilStart / (1000 * 60 * 60))}h ${Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60))}m` : 
        "Starting soon";
    }

    // Format participants list
    const participants = tournament.entries.map(entry => ({
      id: entry.id.toString(),
      teamId: entry.teamId.toString(),
      teamName: entry.team?.name || "Unknown Team",
      division: entry.team?.division || 0,
      entryTime: entry.registeredAt,
      placement: entry.finalRank,
      tournamentId: entry.tournamentId.toString()
    }));

    // Get tournament matches if tournament is in progress
    let matches = [];
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
      const teamIds = [...new Set([...rawMatches.map(m => m.homeTeamId), ...rawMatches.map(m => m.awayTeamId)])];
      const teams = await prisma.team.findMany({
        where: { id: { in: teamIds } },
        select: {
          id: true,
          name: true,
          division: true
        }
      });
      
      const teamMap = new Map(teams.map(team => [team.id, team]));
      
      // Serialize BigInt values in matches and include team names
      matches = rawMatches.map(match => ({
        ...match,
        id: match.id.toString(),
        leagueId: match.leagueId ? match.leagueId.toString() : null,
        homeTeamId: match.homeTeamId.toString(),
        awayTeamId: match.awayTeamId.toString(),
        tournamentId: match.tournamentId ? match.tournamentId.toString() : null,
        // Ensure scores are properly included
        homeScore: match.homeScore ?? 0,
        awayScore: match.awayScore ?? 0,
        homeTeam: teamMap.get(match.homeTeamId) ? {
          id: teamMap.get(match.homeTeamId).id.toString(),
          name: teamMap.get(match.homeTeamId).name,
          division: teamMap.get(match.homeTeamId).division
        } : null,
        awayTeam: teamMap.get(match.awayTeamId) ? {
          id: teamMap.get(match.awayTeamId).id.toString(),
          name: teamMap.get(match.awayTeamId).name,
          division: teamMap.get(match.awayTeamId).division
        } : null,
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
        entryTime: userTeamEntry.registeredAt,
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
router.post('/:id/force-start', isAuthenticated, async (req: any, res) => {
  try {
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
    const maxParticipants = 8;
    const spotsRemaining = maxParticipants - currentParticipants;

    if (spotsRemaining <= 0) {
      return res.status(400).json({ message: "Tournament is already full" });
    }

    // Get all teams except the current tournament participants to fill remaining spots
    const existingParticipantIds = tournament.entries.map(entry => entry.teamId);
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
    const newEntries = availableTeams.slice(0, spotsRemaining).map(team => ({
      tournamentId: tournament.id,
      teamId: team.id,
      registeredAt: new Date()
    }));

    await prisma.tournamentEntry.createMany({
      data: newEntries
    });

    // Update tournament status to IN_PROGRESS
    await prisma.tournament.update({
      where: { id: tournament.id },
      data: {
        status: 'IN_PROGRESS',
        startTime: new Date()
      }
    });

    // Generate tournament matches
    try {
      const { tournamentService } = require('../services/tournamentService');
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
router.get('/:id/matches', isAuthenticated, async (req: any, res) => {
  try {
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
        tournament: true
      },
      orderBy: [
        { round: 'asc' },
        { id: 'asc' }
      ]
    });
    
    // Convert BigInt fields to strings for JSON serialization
    const serializedMatches = matches.map(match => ({
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
router.post('/:id/matches/simulate-round', isAuthenticated, async (req: any, res) => {
  try {
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

    // Start live simulation for all matches in the round
    const { matchStateManager } = await import('../services/matchStateManager');
    const matchPromises = matches.map(async (match) => {
      try {
        // Set match status to IN_PROGRESS
        await prisma.game.update({
          where: { id: match.id },
          data: {
            status: 'IN_PROGRESS',
            gameDate: new Date()
          }
        });

        // Start live simulation
        await matchStateManager.startLiveMatch(match.id);
        console.log(`Started live simulation for tournament match ${match.id}`);
        
        return match.id;
      } catch (error) {
        console.error(`Error starting live simulation for match ${match.id}:`, error);
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
router.post('/:id/matches/manual-start', isAuthenticated, async (req: any, res) => {
  try {
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

    // Start live simulation for all matches in the round
    const { matchStateManager } = await import('../services/matchStateManager');
    const matchPromises = matches.map(async (match) => {
      try {
        // Start live simulation directly
        await matchStateManager.startLiveMatch(match.id.toString());
        console.log(`Started live simulation for tournament match ${match.id}`);
        
        return match.id;
      } catch (error) {
        console.error(`Error starting live simulation for match ${match.id}:`, error);
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
router.post('/:id/force-progression', isAuthenticated, async (req: any, res) => {
  try {
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
    // Check quarterfinals (round 1)
    const quarterfinalsMatches = await prisma.game.findMany({
      where: {
        tournamentId,
        round: 1,
        status: 'COMPLETED'
      }
    });

    if (quarterfinalsMatches.length === 4) {
      // All quarterfinals are complete, check if semifinals exist
      const semifinalsMatches = await prisma.game.findMany({
        where: {
          tournamentId,
          round: 2
        }
      });

      if (semifinalsMatches.length === 0) {
        // Generate semifinals
        await generateNextRoundMatches(tournamentId, 1);
        console.log(`Generated semifinals for tournament ${tournamentId}`);
      } else {
        // Check if semifinals are complete
        const completedSemifinals = semifinalsMatches.filter(m => m.status === 'COMPLETED');
        if (completedSemifinals.length === 2) {
          // Check if finals exist
          const finalsMatches = await prisma.game.findMany({
            where: {
              tournamentId,
              round: 3
            }
          });

          if (finalsMatches.length === 0) {
            // Generate finals
            await generateNextRoundMatches(tournamentId, 2);
            console.log(`Generated finals for tournament ${tournamentId}`);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error checking tournament advancement:", error);
  }
}

// Helper function to generate next round matches
async function generateNextRoundMatches(tournamentId: number, completedRound: number) {
  try {
    // Get all completed matches from the current round
    const completedMatches = await prisma.game.findMany({
      where: {
        tournamentId,
        round: completedRound,
        status: 'COMPLETED'
      },
      orderBy: { id: 'asc' }
    });

    if (completedMatches.length === 0) return;

    // Determine winners and generate next round
    const winners = completedMatches.map(match => {
      if (match.homeScore > match.awayScore) {
        return match.homeTeamId;
      } else if (match.awayScore > match.homeScore) {
        return match.awayTeamId;
      } else {
        // This should not happen anymore due to draw prevention, but safety fallback
        console.warn(`Unexpected tie in tournament match ${match.id}: ${match.homeScore}-${match.awayScore}`);
        return Math.random() > 0.5 ? match.homeTeamId : match.awayTeamId;
      }
    });

    // Generate matches for next round
    const nextRound = completedRound + 1;
    if (nextRound > 3) return; // No rounds after finals

    const nextRoundMatches = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        nextRoundMatches.push({
          homeTeamId: winners[i],
          awayTeamId: winners[i + 1],
          tournamentId,
          round: nextRound,
          status: 'SCHEDULED',
          matchType: 'TOURNAMENT_DAILY',
          gameDate: new Date(),
          simulated: false
        });
      }
    }

    // Create next round matches
    if (nextRoundMatches.length > 0) {
      await prisma.game.createMany({
        data: nextRoundMatches
      });
    }
  } catch (error) {
    console.error("Error generating next round matches:", error);
  }
}

// Start a tournament match
router.post('/:id/matches/:matchId/start', isAuthenticated, async (req: any, res) => {
  try {
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
router.post('/:id/matches/:matchId/simulate', isAuthenticated, async (req: any, res) => {
  try {
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
    const transformedMatches = matches.map(match => ({
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
        (match.homeScore || 0) > (match.awayScore || 0) ? match.homeTeam.name : 
        (match.awayScore || 0) > (match.homeScore || 0) ? match.awayTeam.name : null
      ) : null
    }));

    res.json(transformedMatches);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tournament matches', error: error.message });
  }
});

// Start live tournament round (Admin only)
router.post('/:tournamentId/simulate-round', isAuthenticated, async (req: any, res) => {
  try {
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

    // Start live simulation for each match
    const { matchStateManager } = await import('../services/matchStateManager');
    const matchPromises = matches.map(async (match) => {
      try {
        // Set match status to IN_PROGRESS
        await prisma.game.update({
          where: { id: match.id },
          data: {
            status: 'IN_PROGRESS',
            gameDate: new Date()
          }
        });

        // Start live simulation
        await matchStateManager.startLiveMatch(match.id);
        console.log(`Started live simulation for tournament match ${match.id}`);
        
        return match.id;
      } catch (error) {
        console.error(`Error starting live simulation for match ${match.id}:`, error);
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
    res.status(500).json({ message: "Failed to start tournament round", error: error.message });
  }
});

// Helper function to advance tournament to next round
async function advanceTournament(tournamentId: number, completedRound: string) {
  try {
    // Get completed matches from the round
    const completedMatches = await prisma.game.findMany({
      where: {
        tournamentId: tournamentId,
        round: completedRound,
        status: 'COMPLETED'
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    // Determine winners
    const winners = completedMatches.map(match => {
      const winnerId = match.homeTeamScore > match.awayTeamScore ? 
        match.homeTeamId : match.awayTeamId;
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
            round: 'SEMIFINALS',
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
          round: 'FINALS',
          matchType: 'TOURNAMENT_DAILY',
          tournamentId: tournamentId
        }
      });
    } else if (completedRound === 'FINALS' && winners.length === 1) {
      // Tournament complete - update tournament status
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          status: 'COMPLETED',
          winnerId: winners[0].teamId
        }
      });
    }
  } catch (error) {
    console.error("Error advancing tournament:", error);
    throw error;
  }
}

// Test tournament advancement fix
router.post('/:id/test-advancement', isAuthenticated, async (req: any, res) => {
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
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Emergency endpoint to start live simulation for tournament matches
router.post('/start-live-match', isAuthenticated, async (req: any, res) => {
  try {
    const { matchId } = req.body;
    const userId = req.user.claims.sub;
    
    // Check if user is admin
    if (userId !== "44010914") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    // Import the match state manager
    const { matchStateManager } = await import('../services/matchStateManager');
    
    // Start the live match
    await matchStateManager.startLiveMatch(matchId.toString());
    
    res.json({ 
      success: true, 
      message: `Live simulation started for match ${matchId}` 
    });
    
  } catch (error) {
    console.error("Error starting live match:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

export default router;