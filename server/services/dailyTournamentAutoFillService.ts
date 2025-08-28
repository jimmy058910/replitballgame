/**
 * DAILY TOURNAMENT AUTO-FILL SERVICE
 * 
 * Implements automated tournament population system with:
 * - 1-hour timer when first team registers
 * - AI team auto-fill if 8 teams not reached
 * - Registration cutoff at 1:00AM EDT
 * - Integration with existing tournament flow
 */

import { getPrismaClient } from '../database.js';
import moment from 'moment-timezone';
import { randomUUID } from 'crypto';

// AI team names for tournament auto-fill
const TOURNAMENT_AI_TEAMS = [
  'Thunder Bolts', 'Storm Riders', 'Fire Falcons', 'Ice Warriors', 'Lightning Wolves',
  'Crimson Eagles', 'Golden Hawks', 'Silver Dragons', 'Dark Ravens', 'Steel Panthers',
  'Flame Tigers', 'Frost Lions', 'Wind Raptors', 'Ocean Sharks', 'Desert Scorpions'
];

// Tournament configuration
const TOURNAMENT_SIZE = 8;
const AUTO_FILL_TIMER_HOURS = 1;
const REGISTRATION_CUTOFF_HOUR = 1; // 1:00AM EDT
const DAILY_PROGRESSION_HOUR = 3; // 3:00AM EDT

interface TournamentTimer {
  tournamentId: number;
  division: number;
  startTime: Date;
  timeoutId: NodeJS.Timeout;
}

class DailyTournamentAutoFillService {
  private activeTimers = new Map<number, TournamentTimer>();

  /**
   * Check if we're past registration cutoff (1:00AM EDT)
   */
  private isPastRegistrationCutoff(): boolean {
    const now = moment.tz('America/New_York');
    const cutoffTime = moment.tz('America/New_York').hour(REGISTRATION_CUTOFF_HOUR).minute(0).second(0);
    
    // If current time is past 1:00AM but before 3:00AM (same day)
    if (now.hour() >= REGISTRATION_CUTOFF_HOUR && now.hour() < DAILY_PROGRESSION_HOUR) {
      return true;
    }
    
    return false;
  }

  /**
   * Monitor tournament registration and start timer if first team
   */
  async onTeamRegistered(tournamentId: number, division: number): Promise<void> {
    try {
      console.log(`🏆 [TOURNAMENT AUTO-FILL] Team registered for tournament ${tournamentId}, division ${division}`);

      // Check if registration is still allowed
      if (this.isPastRegistrationCutoff()) {
        console.log(`🚫 [TOURNAMENT AUTO-FILL] Registration past cutoff (1:00AM EDT)`);
        return;
      }

      const prisma = await getPrismaClient();
      
      // Count current registrations
      const registrationCount = await prisma.tournamentEntry.count({
        where: { tournamentId }
      });

      console.log(`📊 [TOURNAMENT AUTO-FILL] Current registrations: ${registrationCount}/${TOURNAMENT_SIZE}`);

      // If this is the first registration, start the timer
      if (registrationCount === 1 && !this.activeTimers.has(tournamentId)) {
        await this.startAutoFillTimer(tournamentId, division);
      }

      // If tournament is full, clear timer and start tournament
      if (registrationCount >= TOURNAMENT_SIZE) {
        await this.completeTournamentSetup(tournamentId, division);
      }

    } catch (error) {
      console.error(`❌ [TOURNAMENT AUTO-FILL] Error monitoring registration:`, error);
    }
  }

  /**
   * Start 1-hour countdown timer for tournament auto-fill
   */
  private async startAutoFillTimer(tournamentId: number, division: number): Promise<void> {
    console.log(`⏰ [TOURNAMENT AUTO-FILL] Starting 1-hour timer for tournament ${tournamentId}`);

    const startTime = new Date();
    const timeoutDuration = AUTO_FILL_TIMER_HOURS * 60 * 60 * 1000; // 1 hour in milliseconds

    const timeoutId = setTimeout(async () => {
      await this.executeAutoFill(tournamentId, division);
    }, timeoutDuration);

    this.activeTimers.set(tournamentId, {
      tournamentId,
      division,
      startTime,
      timeoutId
    });

    // Update tournament with timer info
    try {
      const prisma = await getPrismaClient();
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          registrationEndTime: new Date(Date.now() + timeoutDuration)
        }
      });
    } catch (error) {
      console.error(`❌ [TOURNAMENT AUTO-FILL] Failed to update tournament timer:`, error);
    }

    console.log(`✅ [TOURNAMENT AUTO-FILL] Timer set - auto-fill in ${AUTO_FILL_TIMER_HOURS} hour(s)`);
  }

  /**
   * Execute auto-fill with AI teams after timer expires
   */
  private async executeAutoFill(tournamentId: number, division: number): Promise<void> {
    try {
      console.log(`🤖 [TOURNAMENT AUTO-FILL] Timer expired - executing auto-fill for tournament ${tournamentId}`);

      const prisma = await getPrismaClient();
      
      // Count current registrations
      const currentEntries = await prisma.tournamentEntry.count({
        where: { tournamentId }
      });

      const slotsToFill = TOURNAMENT_SIZE - currentEntries;
      
      if (slotsToFill <= 0) {
        console.log(`✅ [TOURNAMENT AUTO-FILL] Tournament already full (${currentEntries}/${TOURNAMENT_SIZE})`);
        await this.completeTournamentSetup(tournamentId, division);
        return;
      }

      console.log(`🔧 [TOURNAMENT AUTO-FILL] Creating ${slotsToFill} AI teams for division ${division}`);

      // Generate AI teams for this tournament
      const aiTeams = await this.generateAITeams(slotsToFill, division);
      
      // Register AI teams
      for (const team of aiTeams) {
        await prisma.tournamentEntry.create({
          data: {
            teamId: team.id,
            tournamentId,
            registeredAt: new Date()
          }
        });
        console.log(`✅ [TOURNAMENT AUTO-FILL] Registered AI team: ${team.name}`);
      }

      console.log(`🎯 [TOURNAMENT AUTO-FILL] Auto-fill completed - tournament ready with ${TOURNAMENT_SIZE} teams`);
      
      // Complete tournament setup
      await this.completeTournamentSetup(tournamentId, division);

    } catch (error) {
      console.error(`❌ [TOURNAMENT AUTO-FILL] Auto-fill failed:`, error);
    } finally {
      // Clean up timer
      this.activeTimers.delete(tournamentId);
    }
  }

  /**
   * Generate AI teams for tournament fill
   */
  private async generateAITeams(count: number, division: number): Promise<any[]> {
    const prisma = await getPrismaClient();
    const teams: any[] = [];

    for (let i = 0; i < count; i++) {
      const teamName = TOURNAMENT_AI_TEAMS[i % TOURNAMENT_AI_TEAMS.length] + ` ${Math.floor(Math.random() * 900) + 100}`;
      
      // Create AI team
      const team = await prisma.team.create({
        data: {
          name: teamName,
          division,
          isAI: true,
          camaraderie: Math.floor(Math.random() * 30) + 70, // 70-100
          fanLoyalty: Math.floor(Math.random() * 30) + 70,
          homeField: 'BALANCED',
          tacticalFocus: 'BALANCED',
          wins: 0,
          losses: 0,
          points: 0
        }
      });

      // Create team finances
      await prisma.teamFinances.create({
        data: {
          teamId: team.id,
          credits: 50000,
          gems: 10,
          escrowCredits: 0,
          escrowGems: 0
        }
      });

      // Create basic stadium
      await prisma.stadium.create({
        data: {
          teamId: team.id,
          capacity: 25000,
          concessionsLevel: 1,
          parkingLevel: 1,
          vipSuitesLevel: 1,
          merchandisingLevel: 1,
          lightingScreensLevel: 1
        }
      });

      // Generate AI players for the team
      await this.generateAIPlayers(team.id);

      teams.push(team);
    }

    return teams;
  }

  /**
   * Generate balanced AI players for tournament team
   */
  private async generateAIPlayers(teamId: number): Promise<void> {
    const prisma = await getPrismaClient();
    const races = ['human', 'sylvan', 'gryll', 'lumina', 'umbra'];
    const positions = ['PASSER', 'RUNNER', 'BLOCKER'];

    // Generate 12 players per team
    for (let i = 0; i < 12; i++) {
      const race = races[Math.floor(Math.random() * races.length)];
      const role = positions[Math.floor(Math.random() * positions.length)];
      
      // Balanced stats (65-85 range for competitive play)
      const baseStats = 65 + Math.floor(Math.random() * 20);
      
      await prisma.player.create({
        data: {
          teamId,
          firstName: `AI_${i + 1}`,
          lastName: `Player`,
          race: race as any,
          age: 22 + Math.floor(Math.random() * 8),
          role: role as any,
          speed: baseStats + Math.floor(Math.random() * 10),
          power: baseStats + Math.floor(Math.random() * 10),
          throwing: baseStats + Math.floor(Math.random() * 10),
          catching: baseStats + Math.floor(Math.random() * 10),
          kicking: baseStats + Math.floor(Math.random() * 10),
          staminaAttribute: baseStats + Math.floor(Math.random() * 10),
          leadership: baseStats + Math.floor(Math.random() * 10),
          agility: baseStats + Math.floor(Math.random() * 10),
          potentialRating: 75 + Math.floor(Math.random() * 20),
          dailyStaminaLevel: 100,
          injuryStatus: 'HEALTHY',
          injuryRecoveryPointsNeeded: 0,
          injuryRecoveryPointsCurrent: 0,
          dailyItemsUsed: [],
          careerInjuries: 0,
          isOnMarket: false,
          isRetired: false,
          camaraderieScore: 75 + Math.floor(Math.random() * 25)
        }
      });
    }
  }

  /**
   * Complete tournament setup and trigger start
   */
  private async completeTournamentSetup(tournamentId: number, division: number): Promise<void> {
    try {
      console.log(`🏁 [TOURNAMENT AUTO-FILL] Completing tournament ${tournamentId} setup`);

      const prisma = await getPrismaClient();
      
      // Update tournament status to ready
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          status: 'IN_PROGRESS',
          startTime: new Date()
        }
      });

      // Clear any active timer
      const timer = this.activeTimers.get(tournamentId);
      if (timer) {
        clearTimeout(timer.timeoutId);
        this.activeTimers.delete(tournamentId);
      }

      console.log(`✅ [TOURNAMENT AUTO-FILL] Tournament ${tournamentId} ready to start with 8 teams`);

    } catch (error) {
      console.error(`❌ [TOURNAMENT AUTO-FILL] Failed to complete tournament setup:`, error);
    }
  }

  /**
   * Cancel tournament timer (if team manually fills to 8)
   */
  async cancelTimer(tournamentId: number): Promise<void> {
    const timer = this.activeTimers.get(tournamentId);
    if (timer) {
      clearTimeout(timer.timeoutId);
      this.activeTimers.delete(tournamentId);
      console.log(`🚫 [TOURNAMENT AUTO-FILL] Timer cancelled for tournament ${tournamentId}`);
    }
  }

  /**
   * Check for expired registration cutoff and clean up
   */
  async cleanupExpiredRegistrations(): Promise<void> {
    if (this.isPastRegistrationCutoff()) {
      console.log(`🧹 [TOURNAMENT AUTO-FILL] Registration cutoff reached - cleaning up timers`);
      
      // Cancel all active timers
      for (const [tournamentId, timer] of this.activeTimers.entries()) {
        clearTimeout(timer.timeoutId);
        console.log(`🚫 [TOURNAMENT AUTO-FILL] Cancelled timer for tournament ${tournamentId} due to cutoff`);
      }
      
      this.activeTimers.clear();
    }
  }

  /**
   * Get timer status for a tournament
   */
  getTimerStatus(tournamentId: number): { active: boolean; timeRemaining?: number; registrationCount?: number } {
    const timer = this.activeTimers.get(tournamentId);
    
    if (!timer) {
      return { active: false };
    }

    const timeRemaining = Math.max(0, (timer.startTime.getTime() + (AUTO_FILL_TIMER_HOURS * 60 * 60 * 1000)) - Date.now());
    
    return {
      active: true,
      timeRemaining,
    };
  }
}

// Export singleton instance
export const dailyTournamentAutoFillService = new DailyTournamentAutoFillService();