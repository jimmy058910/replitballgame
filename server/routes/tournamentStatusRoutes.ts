import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
import { isAuthenticated } from "../replitAuth";
import { prisma } from "../db";
import moment from "moment-timezone";
import { tournamentService } from "../services/tournamentService";

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ message: 'Tournament status routes are working' });
});

/**
 * Get tournament status and participant information
 */
router.get('/:tournamentId/status', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user?.claims?.sub;
    
    console.log('Tournament Status Request - tournamentId:', tournamentId, 'userId:', userId);
    
    if (!userId) {
      console.log('No userId found in request');
      return res.status(400).json({ message: "User not authenticated" });
    }
    
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) {
      console.log('Team not found for userId:', userId);
      return res.status(404).json({ message: "Team not found" });
    }
    
    console.log('Team found:', team.id, team.name);

    // Get tournament details
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
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

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    // Check if user's team is registered
    const userTeamEntry = tournament.entries.find(entry => entry.teamId === team.id);
    if (!userTeamEntry) {
      return res.status(403).json({ message: "Your team is not registered for this tournament" });
    }

    // Get current participant count
    const currentParticipants = tournament.entries.length;
    const maxParticipants = 8; // Default tournament size
    const spotsRemaining = maxParticipants - currentParticipants;

    // Calculate time until tournament start or auto-fill
    const now = new Date();
    const registrationDeadline = tournament.registrationEndTime || new Date();
    const timeUntilStart = Math.max(0, registrationDeadline.getTime() - now.getTime());

    // Determine if tournament is ready to start
    const isFull = currentParticipants >= maxParticipants;
    const isReadyToStart = isFull || timeUntilStart === 0;

    // Format participants
    const participants = tournament.entries.map(entry => ({
      teamId: entry.teamId,
      teamName: entry.team.name,
      division: entry.team.division,
      entryTime: entry.registeredAt,
      placement: entry.finalRank || null
    }));

    // Tournament status information
    const statusInfo = {
      id: tournament.id,
      name: tournament.name,
      type: tournament.type,
      division: tournament.division,
      status: tournament.status,
      currentParticipants,
      maxParticipants,
      spotsRemaining,
      isFull,
      isReadyToStart,
      timeUntilStart,
      timeUntilStartText: timeUntilStart > 0 ? formatTimeRemaining(timeUntilStart) : "Starting soon",
      registrationDeadline: tournament.registrationDeadline,
      tournamentStartTime: tournament.tournamentStartTime,
      entryFeeCredits: Number(tournament.entryFeeCredits || 0),
      entryFeeGems: tournament.entryFeeGems || 0,
      prizes: tournament.prizePoolJson,
      participants,
      userTeamRegistered: true,
      userTeamEntry: {
        entryTime: userTeamEntry.entryTime,
        placement: userTeamEntry.placement
      }
    };

    res.json(statusInfo);
  } catch (error) {
    console.error("Error fetching tournament status:", error);
    next(error);
  }
});

/**
 * Get user's active tournaments (tournaments they're registered for)
 */
router.get('/my-active', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // Get all tournaments the team is registered for
    const teamEntries = await prisma.tournamentEntry.findMany({
      where: { teamId: team.id },
      include: {
        tournament: {
          include: {
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
        }
      },
      orderBy: {
        entryTime: 'desc'
      }
    });

    const activeTournaments = teamEntries.map(entry => {
      const tournament = entry.tournament;
      const currentParticipants = tournament.entries.length;
      const maxParticipants = tournament.maxTeams || 8;
      const spotsRemaining = maxParticipants - currentParticipants;

      const now = new Date();
      const registrationDeadline = tournament.registrationDeadline || new Date();
      const timeUntilStart = Math.max(0, registrationDeadline.getTime() - now.getTime());

      const isFull = currentParticipants >= maxParticipants;
      const isReadyToStart = isFull || timeUntilStart === 0;

      return {
        id: tournament.id,
        name: tournament.name,
        type: tournament.type,
        division: tournament.division,
        status: tournament.status,
        currentParticipants,
        maxParticipants,
        spotsRemaining,
        isFull,
        isReadyToStart,
        timeUntilStart,
        timeUntilStartText: timeUntilStart > 0 ? formatTimeRemaining(timeUntilStart) : "Starting soon",
        registrationDeadline: tournament.registrationDeadline,
        tournamentStartTime: tournament.tournamentStartTime,
        entryFeeCredits: Number(tournament.entryFeeCredits || 0),
        entryFeeGems: tournament.entryFeeGems || 0,
        prizes: tournament.prizePoolJson,
        entryTime: entry.entryTime,
        placement: entry.placement,
        participantCount: currentParticipants
      };
    });

    res.json(activeTournaments);
  } catch (error) {
    console.error("Error fetching active tournaments:", error);
    next(error);
  }
});

/**
 * Force start a tournament (for testing or admin purposes)
 */
router.post('/:tournamentId/force-start', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // Get tournament details
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        entries: true
      }
    });

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    // Check if user's team is registered
    const userTeamEntry = tournament.entries.find(entry => entry.teamId === team.id);
    if (!userTeamEntry) {
      return res.status(403).json({ message: "Your team is not registered for this tournament" });
    }

    // Fill with AI teams if needed
    const currentParticipants = tournament.entries.length;
    const maxParticipants = 8; // Default tournament size
    const spotsToFill = maxParticipants - currentParticipants;

    if (spotsToFill > 0) {
      await tournamentService.fillTournamentWithAI(tournamentId, spotsToFill);
    }

    // Update tournament status to IN_PROGRESS
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: "IN_PROGRESS",
        startTime: new Date()
      }
    });

    res.json({
      success: true,
      message: "Tournament started successfully",
      aiTeamsAdded: spotsToFill,
      tournamentId
    });
  } catch (error) {
    console.error("Error force starting tournament:", error);
    next(error);
  }
});

/**
 * Utility function to format time remaining
 */
function formatTimeRemaining(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export default router;