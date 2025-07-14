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
      tournamentId: entry.tournament.id,
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
    console.error('Error fetching tournament status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's active tournaments for the TournamentStatus page
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

    // Get participant count for each tournament
    const tournamentsWithCounts = await Promise.all(
      entries.map(async (entry) => {
        const participantCount = await prisma.tournamentEntry.count({
          where: {
            tournamentId: entry.tournament.id
          }
        });

        return {
          id: entry.tournament.id,
          name: entry.tournament.name,
          type: entry.tournament.type,
          division: entry.tournament.division,
          status: entry.tournament.status,
          registrationDeadline: entry.tournament.registrationEndTime,
          tournamentStartTime: entry.tournament.startTime,
          entryFeeCredits: Number(entry.tournament.entryFeeCredits),
          entryFeeGems: Number(entry.tournament.entryFeeGems),
          entryTime: entry.registeredAt,
          placement: entry.finalRank,
          participantCount: participantCount,
          maxParticipants: 8,
          spotsRemaining: 8 - participantCount,
          isFull: participantCount >= 8,
          isReadyToStart: participantCount >= 8,
          timeUntilStart: 0,
          timeUntilStartText: participantCount >= 8 ? "Ready to start" : `${8 - participantCount} more teams needed`,
          prizes: entry.tournament.prizePoolJson
        };
      })
    );

    res.json(tournamentsWithCounts);
  } catch (error) {
    console.error('Error fetching my active tournaments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;