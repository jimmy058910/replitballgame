import { Router } from 'express';
import { prisma } from '../db';
import { isAuthenticated } from '../replitAuth';

const router = Router();

// Get active tournament status for a team
router.get('/active', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const team = await prisma.team.findFirst({
      where: { userProfileId: userId },
      select: { id: true, division: true }
    });

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
      name: entry.tournament.name,
      type: entry.tournament.type,
      division: entry.tournament.division,
      status: entry.tournament.status,
      registrationDeadline: entry.tournament.registrationEndTime,
      entryTime: entry.registeredAt,
      currentParticipants: 1, // Placeholder - would need to count entries
      maxParticipants: 8, // Standard tournament size
      prizes: entry.tournament.prizePoolJson,
      placement: entry.finalRank
    }));

    res.json(statusData);
  } catch (error) {
    console.error('Error fetching tournament status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;