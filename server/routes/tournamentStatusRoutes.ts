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
          tournament: true,
          homeTeam: {
            select: {
              id: true,
              name: true,
              division: true
            }
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              division: true
            }
          }
        },
        orderBy: [
          { round: 'asc' },
          { id: 'asc' }
        ]
      });
      
      // Serialize BigInt values in matches and include team names
      matches = rawMatches.map(match => ({
        ...match,
        id: match.id.toString(),
        leagueId: match.leagueId ? match.leagueId.toString() : null,
        homeTeamId: match.homeTeamId.toString(),
        awayTeamId: match.awayTeamId.toString(),
        tournamentId: match.tournamentId ? match.tournamentId.toString() : null,
        homeTeam: match.homeTeam ? {
          id: match.homeTeam.id.toString(),
          name: match.homeTeam.name,
          division: match.homeTeam.division
        } : null,
        awayTeam: match.awayTeam ? {
          id: match.awayTeam.id.toString(),
          name: match.awayTeam.name,
          division: match.awayTeam.division
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
      homeTeamScore: match.homeTeamScore,
      awayTeamScore: match.awayTeamScore,
      gameTime: match.gameDate?.toISOString(),
      winner: match.status === 'COMPLETED' ? (
        match.homeTeamScore > match.awayTeamScore ? match.homeTeam.name : 
        match.awayTeamScore > match.homeTeamScore ? match.awayTeam.name : null
      ) : null
    }));

    res.json(transformedMatches);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tournament matches', error: error.message });
  }
});

// Simulate tournament round (Admin only)
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

    // Simulate each match
    for (const match of matches) {
      // Generate random scores for the match
      const homeScore = Math.floor(Math.random() * 4) + 1;
      const awayScore = Math.floor(Math.random() * 4) + 1;
      
      // Update match with results
      await prisma.game.update({
        where: { id: match.id },
        data: {
          homeTeamScore: homeScore,
          awayTeamScore: awayScore,
          status: 'COMPLETED',
          gameDate: new Date()
        }
      });
    }

    // Check if this round completion triggers next round creation
    await advanceTournament(parseInt(tournamentId), round);

    res.json({ message: `Successfully simulated ${matches.length} matches in ${round}` });
  } catch (error) {
    console.error("Error simulating tournament round:", error);
    res.status(500).json({ message: "Failed to simulate tournament round", error: error.message });
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

export default router;