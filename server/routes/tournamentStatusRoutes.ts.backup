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
            tournamentId: true,
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
        tournamentId: entry.tournament.tournamentId,
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
            tournamentId: true,
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
          tournamentId: entry.tournament.tournamentId,
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

// Get detailed tournament status
router.get('/:tournamentId/status', isAuthenticated, async (req: any, res) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.claims.sub;
    
    const tournament = await prisma.tournament.findUnique({
      where: { id: parseInt(tournamentId) },
      include: {
        entries: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                division: true,
                userProfileId: true
              }
            }
          }
        }
      }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const userTeam = await storage.teams.getTeamByUserId(userId);
    const userEntry = tournament.entries.find(e => e.teamId === userTeam?.id);

    const response = {
      id: tournament.id.toString(),
      name: tournament.name,
      tournamentId: tournament.tournamentId,
      type: tournament.type,
      division: tournament.division,
      status: tournament.status,
      currentParticipants: tournament.entries.length,
      maxParticipants: 8,
      spotsRemaining: 8 - tournament.entries.length,
      isFull: tournament.entries.length >= 8,
      isReadyToStart: tournament.entries.length >= 8,
      timeUntilStart: 0,
      timeUntilStartText: tournament.entries.length >= 8 ? "15m countdown to start" : `${8 - tournament.entries.length} more teams needed`,
      registrationDeadline: tournament.registrationEndTime.toISOString(),
      tournamentStartTime: tournament.startTime.toISOString(),
      entryFeeCredits: Number(tournament.entryFeeCredits),
      entryFeeGems: tournament.entryFeeGems,
      prizes: tournament.prizePoolJson,
      participants: tournament.entries.map(entry => ({
        teamId: entry.teamId.toString(),
        teamName: entry.team.name,
        division: entry.team.division,
        entryTime: entry.registeredAt.toISOString(),
        placement: entry.finalRank ? Number(entry.finalRank) : null
      })),
      userTeamRegistered: !!userEntry,
      userTeamEntry: userEntry ? {
        entryTime: userEntry.registeredAt.toISOString(),
        placement: userEntry.finalRank ? Number(userEntry.finalRank) : null
      } : null
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching tournament status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Force start tournament (Admin only)
router.post('/:tournamentId/force-start', isAuthenticated, async (req: any, res) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.claims.sub;
    
    // Check admin permissions (same as other admin endpoints)
    if (userId !== "44010914") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: parseInt(tournamentId) },
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
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.status !== 'REGISTRATION_OPEN') {
      return res.status(400).json({ error: 'Tournament is not in registration phase' });
    }

    // Fill remaining spots with AI teams if needed
    const participantCount = tournament.entries.length;
    const spotsNeeded = 8 - participantCount;
    
    if (spotsNeeded > 0) {
      // Import and use tournament service to fill with AI teams
      const { TournamentService } = await import('../services/tournamentService');
      const tournamentService = new TournamentService();
      await tournamentService.fillTournamentWithAI(tournamentId, spotsNeeded);
    }

    // Update tournament status to IN_PROGRESS
    await prisma.tournament.update({
      where: { id: parseInt(tournamentId) },
      data: { 
        status: 'IN_PROGRESS',
        startTime: new Date()
      }
    });

    res.json({ 
      success: true, 
      message: `Tournament ${tournament.name} has been force started`,
      participantsAdded: spotsNeeded
    });
  } catch (error) {
    console.error('Error force starting tournament:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;