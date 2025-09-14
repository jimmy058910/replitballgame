/**
 * MATCH SIMULATION AUTOMATION
 * Handles automated match simulation and scheduling
 * Extracted from seasonTimingAutomationService.ts
 */

export class MatchSimulationAutomation {
  private static timer: NodeJS.Timeout | null = null;
  private static catchUpTimer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Start match simulation automation
   */
  static async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Match simulation automation already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting match simulation automation...');

    // Schedule match simulation window check every 15 minutes
    this.scheduleMatchSimulation();
    
    // Schedule catch-up check every 15 minutes for missed matches
    this.scheduleCatchUpChecks();
    
    console.log('✅ Match simulation automation started');
  }

  /**
   * Stop match simulation automation
   */
  static async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.catchUpTimer) {
      clearInterval(this.catchUpTimer);
      this.catchUpTimer = null;
    }
    this.isRunning = false;
    console.log('Match simulation automation stopped');
  }

  /**
   * Check match simulation window and execute matches (4:00 PM - 10:00 PM EDT)
   */
  static async checkMatchSimulationWindow(): Promise<void> {
    try {
      const now = new Date();
      const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      const currentHour = estTime.getHours();
      const currentMinute = estTime.getMinutes();
      
      console.log(`🕐 [SIMULATION] Current EDT time: ${estTime.toLocaleTimeString('en-US', { timeZone: 'America/New_York' })} (${currentHour}:${currentMinute.toString().padStart(2, '0')})`);
      
      // ALWAYS process overdue games first - regardless of time window
      await this.catchUpOnMissedMatches();
      
      // Match simulation window: 4:00 PM - 10:00 PM EDT for new scheduled games
      if (currentHour >= 16 && currentHour <= 22) {
        // Determine which subdivisions to process based on time
        // Every 15 minutes, process different subdivisions to spread server load
        const subdivisionCycle = Math.floor(currentMinute / 15); // 0, 1, 2, 3
        console.log(`🎮 [SIMULATION] Processing subdivision cycle ${subdivisionCycle} at ${currentHour}:${currentMinute.toString().padStart(2, '0')} EDT`);
        await this.simulateScheduledMatchesForSubdivisions(subdivisionCycle);
      } else {
        console.log(`🕐 [SIMULATION] Outside simulation window (16:00-22:00 EDT). Current: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
      }
      
    } catch (error) {
      console.error('Error checking match simulation window:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Catch-up mechanism for missed matches
   */
  static async catchUpOnMissedMatches(): Promise<void> {
    try {
      const now = new Date();
      const { getPrismaClient } = await import('../../database.js');
      const { QuickMatchSimulation } = await import('../quickMatchSimulation.js');
      
      const prisma = await getPrismaClient();
      
      // Find all scheduled matches that should have already started
      const missedMatches = await prisma.game.findMany({
        where: {
          status: 'SCHEDULED',
          gameDate: {
            lt: now // Matches that should have started in the past
          },
          matchType: 'LEAGUE' // Only catch up on league matches
        },
        include: {
          homeTeam: { select: { teamName: true } },
          awayTeam: { select: { teamName: true } }
        }
      });
      
      if (missedMatches.length > 0) {
        console.log(`🔥 CATCH UP: Found ${missedMatches.length} missed matches that should have started, starting them late now...`);
        
        // Start each missed match late (DO NOT simulate immediately)
        for (const match of missedMatches) {
          try {
            const timePastDue = now.getTime() - match.gameDate.getTime();
            const minutesPastDue = Math.floor(timePastDue / (1000 * 60));
            
            // Only update status to IN_PROGRESS, do NOT simulate immediately
            await prisma.game.update({
              where: { id: match.id },
              data: { 
                status: 'IN_PROGRESS',
                gameDate: new Date() // Start now (late)
              }
            });
            
            console.log(`🔥 CATCH UP: Started missed match ${match.id} (${match.homeTeam.teamName} vs ${match.awayTeam.teamName}) - was ${minutesPastDue} minutes past due - Status: IN_PROGRESS (will be handled by normal simulation)`);
          } catch (error) {
            console.error(`Error starting missed match ${match.id}:`, error);
          }
        }
      } else {
        console.log('🔍 [CATCH UP] No missed matches found');
      }
    } catch (error) {
      console.error('Error catching up on missed matches:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Simulate scheduled matches for specific subdivisions (load balancing)
   */
  private static async simulateScheduledMatchesForSubdivisions(subdivisionCycle: number): Promise<void> {
    try {
      const { getPrismaClient } = await import('../../database.js');
      const { QuickMatchSimulation } = await import('../quickMatchSimulation.js');
      
      const prisma = await getPrismaClient();
      const now = new Date();
      const windowStart = new Date(now.getTime() - (15 * 60 * 1000)); // 15 minutes ago
      const windowEnd = new Date(now.getTime() + (15 * 60 * 1000)); // 15 minutes ahead
      
      // Get matches scheduled to start in this window
      const scheduledMatches = await prisma.game.findMany({
        where: {
          status: 'SCHEDULED',
          matchType: 'LEAGUE',
          gameDate: {
            gte: windowStart,
            lte: windowEnd
          }
        },
        include: {
          homeTeam: { 
            select: { 
              teamName: true, 
              league: { 
                select: { 
                  subdivisionName: true 
                } 
              } 
            } 
          },
          awayTeam: { 
            select: { 
              teamName: true 
            } 
          }
        }
      });

      if (scheduledMatches.length === 0) {
        console.log(`🔍 [CYCLE ${subdivisionCycle}] No scheduled matches found in current window`);
        return;
      }

      // Filter matches by subdivision cycle (load balancing)
      const matchesForCycle = scheduledMatches.filter((match, index) => {
        // Distribute matches across cycles based on subdivision or match ID
        const cycleAssignment = match.id % 4;
        return cycleAssignment === subdivisionCycle;
      });

      if (matchesForCycle.length === 0) {
        console.log(`🔍 [CYCLE ${subdivisionCycle}] No matches assigned to this cycle`);
        return;
      }

      console.log(`🎮 [CYCLE ${subdivisionCycle}] Starting ${matchesForCycle.length} scheduled matches`);

      // Process matches in this cycle
      for (const match of matchesForCycle) {
        try {
          // Update status to IN_PROGRESS
          await prisma.game.update({
            where: { id: match.id },
            data: { status: 'IN_PROGRESS' }
          });

          // Run simulation
          const simulationResult = await QuickMatchSimulation.runQuickSimulation(match.id.toString());

          // Update final status and scores
          await prisma.game.update({
            where: { id: match.id },
            data: {
              status: 'COMPLETED',
              homeScore: simulationResult.finalScore.home,
              awayScore: simulationResult.finalScore.away
            }
          });

          const subdivisionName = match.homeTeam.league?.subdivisionName || 'Unknown';
          console.log(`✅ [CYCLE ${subdivisionCycle}] Completed: ${match.homeTeam.teamName} ${simulationResult.finalScore.home}-${simulationResult.finalScore.away} ${match.awayTeam.teamName} (${subdivisionName})`);

        } catch (error) {
          console.error(`Error simulating match ${match.id}:`, error);
        }
      }

    } catch (error) {
      console.error(`Error in subdivision cycle ${subdivisionCycle}:`, error);
    }
  }

  /**
   * Schedule match simulation window check every 15 minutes
   */
  private static scheduleMatchSimulation(): void {
    this.timer = setInterval(async () => {
      await this.checkMatchSimulationWindow();
    }, 15 * 60 * 1000); // Check every 15 minutes to spread load across subdivisions
    
    // Also check immediately on startup
    setTimeout(() => this.checkMatchSimulationWindow(), 5000);
  }

  /**
   * Schedule catch-up checks for missed matches every 15 minutes
   */
  private static scheduleCatchUpChecks(): void {
    this.catchUpTimer = setInterval(async () => {
      await this.catchUpOnMissedMatches();
    }, 15 * 60 * 1000); // Check every 15 minutes
    
    console.log('✅ Catch-up mechanism scheduled every 15 minutes');
  }
}

console.log('📝 [Automation/MatchSimulation] Service placeholder - methods to be extracted');