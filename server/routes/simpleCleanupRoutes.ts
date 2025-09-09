import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/firebaseAuth.js";
import { storage } from '../storage/index.js';
import { getPrismaClient } from '../database.js';
import type { Team } from '@shared/types/models';


const router = Router();

/**
 * SIMPLE TOURNAMENT CLEANUP: Use direct SQL approach
 * This fixes the stuck registration issue using the same patterns that work elsewhere
 */
router.post('/cleanup-tournament-registration', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.claims?.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    
    if (!team || !team.id) {
      return res.status(404).json({ message: "Team not found" });
    }

    const prisma = await getPrismaClient();
    
    console.log(`🧹 [SIMPLE CLEANUP] Starting cleanup for team ${team.id} (${team.name})`);
    
    // Step 1: Find existing registrations using the same approach as TournamentDomainService
    try {
      const existingRegistration = await prisma.tournamentEntry.findFirst({
        where: {
          teamId: team.id,
          tournament: {
            status: {
              in: ['REGISTRATION_OPEN', 'IN_PROGRESS']
            }
          }
        },
        include: {
          tournament: true
        }
      });

      if (existingRegistration) {
        console.log(`🔍 [SIMPLE CLEANUP] Found stuck registration:`, {
          registrationId: existingRegistration.id,
          tournamentId: existingRegistration.tournamentId,
          tournamentName: existingRegistration.tournament?.name,
          tournamentStatus: existingRegistration.tournament?.status
        });

        // Check if tournament is older than 24 hours
        const tournamentAge = existingRegistration.tournament?.createdAt ? 
          Date.now() - new Date(existingRegistration.tournament.createdAt).getTime() : 0;
        const isOldTournament = tournamentAge > (24 * 60 * 60 * 1000); // 24 hours

        if (isOldTournament) {
          // Delete the stuck registration
          await prisma.tournamentEntry.delete({
            where: { id: existingRegistration.id }
          });

          // Mark tournament as cancelled if it's old
          if (existingRegistration.tournament) {
            await prisma.tournament.update({
              where: { id: existingRegistration.tournament.id },
              data: { 
                status: 'CANCELLED',
                endTime: new Date()
              }
            });
          }

          console.log(`✅ [SIMPLE CLEANUP] Removed stuck registration and cancelled old tournament`);

          return res.json({
            success: true,
            message: `Successfully cleaned up stuck tournament registration! You can now register for new tournaments.`,
            details: {
              removedRegistration: existingRegistration.id,
              cancelledTournament: existingRegistration.tournament?.name,
              tournamentAge: `${Math.round(tournamentAge / (60 * 60 * 1000))} hours old`
            }
          });
        } else {
          return res.json({
            success: false,
            message: `Found active tournament registration (less than 24 hours old). Please wait for it to complete.`,
            details: {
              tournamentName: existingRegistration.tournament?.name,
              registeredAt: existingRegistration.registeredAt,
              tournamentAge: `${Math.round(tournamentAge / (60 * 60 * 1000))} hours old`
            }
          });
        }
      } else {
        return res.json({
          success: true,
          message: "No stuck registrations found. You should be able to register for tournaments.",
          details: {
            teamName: team.name,
            teamId: team.id
          }
        });
      }

    } catch (dbError: any) {
      console.error(`❌ [SIMPLE CLEANUP] Database error:`, dbError);
      return res.status(500).json({ 
        message: "Database error during cleanup",
        error: dbError.message 
      });
    }

  } catch (error: any) {
    console.error('❌ [SIMPLE CLEANUP] Cleanup failed:', error);
    res.status(500).json({ 
      message: "Tournament cleanup failed",
      error: error.message 
    });
  }
});

export default router;