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
    const userTeamEntry = tournament.entries.find(entry => entry.teamId === team.id);
    const userTeamRegistered = !!userTeamEntry;

    // Calculate time until start
    const now = new Date();
    const startTime = new Date(tournament.startTime);
    const timeUntilStart = Math.max(0, startTime.getTime() - now.getTime());
    const timeUntilStartText = timeUntilStart > 0 ? 
      `${Math.floor(timeUntilStart / (1000 * 60 * 60))}h ${Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60))}m` : 
      "Starting soon";

    // Format participants list
    const participants = tournament.entries.map(entry => ({
      teamId: entry.teamId,
      teamName: entry.team?.name || "Unknown Team",
      division: entry.team?.division || 0,
      entryTime: entry.registeredAt,
      placement: entry.finalRank
    }));

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
      isReadyToStart: isFull || tournament.status === 'IN_PROGRESS',
      timeUntilStart,
      timeUntilStartText,
      registrationDeadline: tournament.registrationEndTime,
      tournamentStartTime: tournament.startTime,
      entryFeeCredits: Number(tournament.entryFeeCredits),
      entryFeeGems: Number(tournament.entryFeeGems),
      prizes: tournament.prizePoolJson,
      participants,
      userTeamRegistered,
      userTeamEntry: userTeamEntry ? {
        entryTime: userTeamEntry.registeredAt,
        placement: userTeamEntry.finalRank
      } : null
    };

    res.json(statusData);
  } catch (error) {
    console.error("Error fetching tournament status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;