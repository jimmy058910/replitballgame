import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/firebaseAuth.js";
import { storage } from '../storage/index.js';
import { getPrismaClient } from '../database.js';

const router = Router();

/**
 * EMERGENCY CLEANUP: Remove stuck tournament registrations
 * This fixes the issue where a user can't register for new tournaments
 * because they have an orphaned registration from a failed/incomplete tournament
 */
router.post('/cleanup-stuck-registration', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.claims?.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    
    if (!team || !team.id) {
      return res.status(404).json({ message: "Team not found" });
    }

    const prisma = await getPrismaClient();
    
    console.log(`🧹 [CLEANUP] Starting tournament registration cleanup for team ${team.id} (${team.name})`);
    console.log(`🔍 [CLEANUP] Available Prisma models:`, Object.keys(prisma));
    
    // Find all tournament registrations for this team
    const registrations = await prisma.tournamentEntry.findMany({
      where: { teamId: team.id },
      include: {
        tournament: true
      }
    });
    
    console.log(`🔍 [CLEANUP] Found ${registrations.length} tournament registrations for ${team.name}`);
    
    // Find orphaned registrations (registrations without tournaments or with inactive tournaments)
    const orphanedRegistrations = registrations.filter(reg => {
      return !reg.tournament || 
             reg.tournament.status === 'COMPLETED' || 
             reg.tournament.status === 'CANCELLED' ||
             (reg.tournament.status === 'REGISTRATION_OPEN' && 
              reg.tournament.registrationEndTime && 
              new Date(reg.tournament.registrationEndTime) < new Date());
    });
    
    console.log(`🚨 [CLEANUP] Found ${orphanedRegistrations.length} orphaned/stuck registrations`);
    
    let cleanedCount = 0;
    
    for (const registration of orphanedRegistrations) {
      try {
        await prisma.tournamentEntry.delete({
          where: { id: registration.id }
        });
        
        console.log(`✅ [CLEANUP] Removed registration ${registration.id} for tournament ${registration.tournamentId}`);
        cleanedCount++;
      } catch (error) {
        console.error(`❌ [CLEANUP] Failed to remove registration ${registration.id}:`, error);
      }
    }
    
    // Also check for tournaments that should be marked as completed/cancelled
    const stuckTournaments = await prisma.tournament.findMany({
      where: {
        division: team.division,
        status: { in: ['REGISTRATION_OPEN', 'IN_PROGRESS'] },
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Older than 24 hours
        }
      }
    });
    
    console.log(`🔍 [CLEANUP] Found ${stuckTournaments.length} stuck tournaments older than 24 hours`);
    
    for (const tournament of stuckTournaments) {
      try {
        await prisma.tournament.update({
          where: { id: tournament.id },
          data: { 
            status: 'CANCELLED',
            endTime: new Date()
          }
        });
        
        console.log(`✅ [CLEANUP] Cancelled stuck tournament ${tournament.id} (${tournament.name})`);
      } catch (error) {
        console.error(`❌ [CLEANUP] Failed to cancel tournament ${tournament.id}:`, error);
      }
    }
    
    res.json({
      success: true,
      message: `Cleanup completed! Removed ${cleanedCount} stuck registrations and cancelled ${stuckTournaments.length} stuck tournaments.`,
      details: {
        registrationsRemoved: cleanedCount,
        tournamentsFixed: stuckTournaments.length,
        teamName: team.name
      }
    });

  } catch (error: any) {
    console.error('❌ [CLEANUP] Tournament cleanup failed:', error);
    res.status(500).json({ 
      message: "Tournament cleanup failed",
      error: error.message 
    });
  }
});

/**
 * Get current tournament registration status for debugging
 */
router.get('/registration-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.claims?.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    
    if (!team || !team.id) {
      return res.status(404).json({ message: "Team not found" });
    }

    const prisma = await getPrismaClient();
    
    // Get all registrations for this team
    const registrations = await prisma.tournamentEntry.findMany({
      where: { teamId: team.id },
      include: {
        tournament: true
      },
      orderBy: { registeredAt: 'desc' }
    });
    
    // Get active tournaments in this division
    const activeTournaments = await prisma.tournament.findMany({
      where: {
        division: team.division,
        status: { in: ['REGISTRATION_OPEN', 'IN_PROGRESS', 'ACTIVE'] }
      }
    });
    
    res.json({
      teamName: team.name,
      teamId: team.id,
      division: team.division,
      registrations: registrations.map(reg => ({
        registrationId: reg.id,
        tournamentId: reg.tournamentId,
        tournamentName: reg.tournament?.name || 'MISSING TOURNAMENT',
        tournamentStatus: reg.tournament?.status || 'MISSING',
        registeredAt: reg.registeredAt,
        isOrphaned: !reg.tournament || reg.tournament.status === 'COMPLETED' || reg.tournament.status === 'CANCELLED'
      })),
      activeTournaments: activeTournaments.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        createdAt: t.createdAt
      }))
    });

  } catch (error: any) {
    console.error('Registration status check failed:', error);
    res.status(500).json({ 
      message: "Failed to check registration status",
      error: error.message 
    });
  }
});

export default router;