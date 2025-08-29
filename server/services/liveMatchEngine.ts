/**
 * Live Match Engine Service
 * Core service for real-time match simulation with WebSocket integration
 */

import { 
  LiveMatchState, 
  MatchEvent, 
  FieldPlayer, 
  PlayerMatchStats, 
  TeamMatchStats,
  RevenueSnapshot,
  LiveMatchEngine,
  EVENT_PRIORITIES,
  MATCH_EVENT_TYPES
} from '../../shared/types/LiveMatchState';
import { webSocketManager } from '../websocket/webSocketManager.js';
import { getPrismaClient } from '../database.js';
import { NewMatchEngine } from './newMatchEngine.js';

class LiveMatchEngineService implements LiveMatchEngine {
  private activeMatches = new Map<string, LiveMatchState>();
  private activeEngines = new Map<string, NewMatchEngine>();
  private matchIntervals = new Map<string, NodeJS.Timeout>();
  private simulationSpeed = 1.0; // Default 1x speed

  /**
   * Get all currently active matches as LiveMatchState objects
   */
  getActiveLiveMatches(): LiveMatchState[] {
    return Array.from(this.activeMatches.values());
  }

  /**
   * Start a live match simulation
   */
  async startMatch(matchId: string): Promise<LiveMatchState> {
    try {
      console.log(`Starting live match: ${matchId}`);

      // Fetch match data from database
      const prisma = await getPrismaClient();
      const match = await prisma.game.findUnique({
        where: { id: parseInt(matchId) },
        include: {
          homeTeam: {
            include: {
              players: true,
              stadium: true
            }
          },
          awayTeam: {
            include: {
              players: true,
              stadium: true
            }
          }
        }
      });

      if (!match) {
        throw new Error(`Match ${matchId} not found`);
      }

      if (!match.homeTeam || !match.awayTeam) {
        throw new Error(`Missing team data for match ${matchId}`);
      }

      // Initialize live match state
      const liveState: LiveMatchState = {
        matchId,
        homeTeamId: match.homeTeamId.toString(),
        awayTeamId: match.awayTeamId.toString(),
        status: 'preparing',
        gameTime: 0,
        maxTime: 2400, // 40 minutes (2400 seconds)
        currentHalf: 1,
        startTime: Date.now(),
        lastUpdate: Date.now(),
        homeScore: 0,
        awayScore: 0,
        activeFieldPlayers: {
          home: this.createFieldFormation(match.homeTeam.players),
          away: this.createFieldFormation(match.awayTeam.players)
        },
        facilityLevels: {
          capacity: match.homeTeam.stadium?.capacity || 5000,
          concessions: match.homeTeam.stadium?.concessionsLevel || 0,
          parking: match.homeTeam.stadium?.parkingLevel || 0,
          vipSuites: match.homeTeam.stadium?.vipSuitesLevel || 0,
          merchandising: match.homeTeam.stadium?.merchandisingLevel || 0,
          lightingScreens: match.homeTeam.stadium?.lightingScreensLevel || 0,
          security: 1
        },
        attendance: this.calculateAttendance(match.homeTeam.stadium?.capacity || 5000),
        perTickRevenue: [],
        gameEvents: [],
        playerStats: new Map(),
        teamStats: new Map(),
        matchTick: 0,
        simulationSpeed: this.simulationSpeed
      };

      // Initialize player stats
      this.initializePlayerStats(liveState, match.homeTeam.players, match.awayTeam.players);

      // Initialize team stats
      this.initializeTeamStats(liveState, match.homeTeamId.toString(), match.awayTeamId.toString());

      // Store active match
      this.activeMatches.set(matchId, liveState);

      // Create and store new simulation engine instance
      const engine = new NewMatchEngine(match.homeTeam, match.awayTeam, matchId);
      this.activeEngines.set(matchId, engine);

      // Set match status to live BEFORE starting simulation
      liveState.status = 'live';

      // Start simulation loop (now that status is 'live')
      this.startSimulationLoop(matchId);

      // Broadcast initial state
      webSocketManager.broadcastToMatch(matchId, 'matchUpdate', liveState);

      // Generate opening event
      this.generateEvent(liveState, MATCH_EVENT_TYPES.SCRUM, 'Match begins with opening scrum!');

      console.log(`Live match ${matchId} started successfully with the new engine.`);
      return liveState;

    } catch (error) {
      console.error(`Failed to start live match ${matchId}:`, error);
      throw error;
    }
  }

  /**
   * Pause a live match
   */
  pauseMatch(matchId: string): void {
    const liveState = this.activeMatches.get(matchId);
    if (!liveState) return;

    liveState.status = 'paused';
    
    // Clear simulation interval
    const interval = this.matchIntervals.get(matchId);
    if (interval) {
      clearInterval(interval);
      this.matchIntervals.delete(matchId);
    }

    // Broadcast pause state
    webSocketManager.broadcastToMatch(matchId, 'matchUpdate', liveState);
    
    console.log(`Match ${matchId} paused`);
  }

  /**
   * Resume a paused match
   */
  resumeMatch(matchId: string): void {
    const liveState = this.activeMatches.get(matchId);
    if (!liveState) return;

    liveState.status = 'live';
    
    // Restart simulation loop
    this.startSimulationLoop(matchId);

    // Broadcast resume state
    webSocketManager.broadcastToMatch(matchId, 'matchUpdate', liveState);
    
    console.log(`Match ${matchId} resumed`);
  }

  /**
   * Get current match state
   */
  getMatchState(matchId: string): LiveMatchState | null {
    return this.activeMatches.get(matchId) || null;
  }

  /**
   * Stop a live match and update database status
   */
  async stopMatch(matchId: string): Promise<void> {
    const liveState = this.activeMatches.get(matchId);
    if (!liveState) return;

    console.log(`🔚 [STOP MATCH] Completing match ${matchId} with final scores: ${liveState.homeScore}-${liveState.awayScore}`);

    // Clear simulation interval
    const interval = this.matchIntervals.get(matchId);
    if (interval) {
      clearInterval(interval);
      this.matchIntervals.delete(matchId);
    }

    // Set status to completed
    liveState.status = 'completed';

    // CRITICAL FIX: Update database status to COMPLETED to prevent stuck IN_PROGRESS games
    try {
      const { getPrismaClient } = await import('../database.js');
      const prisma = await getPrismaClient();
      
      // COMPREHENSIVE FIX: Ensure matchTick is saved correctly in final state
      if (liveState.matchTick === null || liveState.matchTick === undefined) {
        console.warn(`⚠️ CRITICAL: Final save had null matchTick for match ${matchId}, setting to gameTime`);
        liveState.matchTick = liveState.gameTime;
      }
      
      await prisma.game.update({
        where: { id: parseInt(matchId) },
        data: {
          status: 'COMPLETED',
          homeScore: liveState.homeScore,
          awayScore: liveState.awayScore,
          simulationLog: JSON.stringify({
            gameTime: liveState.gameTime,
            matchTick: liveState.matchTick,
            events: liveState.gameEvents?.slice(-20) || [],
            finalScores: { home: liveState.homeScore, away: liveState.awayScore },
            matchCompleted: true,
            completedAt: new Date().toISOString()
          })
        }
      });
      
      console.log(`✅ [STOP MATCH] Database updated - Match ${matchId} status set to COMPLETED`);
    } catch (error) {
      console.error(`❌ [STOP MATCH] Failed to update database for match ${matchId}:`, error);
    }

    // Broadcast final state
    webSocketManager.broadcastToMatch(matchId, 'matchUpdate', liveState);

    // Generate final whistle event
    this.generateEvent(liveState, MATCH_EVENT_TYPES.FINAL_WHISTLE, 
      `Final whistle! ${liveState.homeScore}-${liveState.awayScore}`);

    // Remove from active matches and engines
    this.activeMatches.delete(matchId);
    this.activeEngines.delete(matchId);

    console.log(`Match ${matchId} stopped`);
  }

  /**
   * Update match state
   */
  updateMatchState(matchId: string, updates: Partial<LiveMatchState>): void {
    const liveState = this.activeMatches.get(matchId);
    if (!liveState) return;

    Object.assign(liveState, updates);
    liveState.lastUpdate = Date.now();

    // Broadcast updated state
    webSocketManager.broadcastToMatch(matchId, 'matchUpdate', liveState);
  }

  /**
   * Broadcast event to all match participants
   */
  broadcastEvent(matchId: string, event: MatchEvent): void {
    const liveState = this.activeMatches.get(matchId);
    if (!liveState) return;

    // Add event to game events
    liveState.gameEvents.unshift(event);

    // Keep only last 50 events
    if (liveState.gameEvents.length > 50) {
      liveState.gameEvents = liveState.gameEvents.slice(0, 50);
    }

    // Broadcast event
    webSocketManager.broadcastToMatch(matchId, 'matchEvent', event);
  }

  /**
   * Create field formation from team players
   */
  private createFieldFormation(players: any[]): any {
    console.log('DEBUG: createFieldFormation called with', players?.length, 'players');
    console.log('DEBUG: First player:', JSON.stringify(players?.[0], null, 2));
    
    // For demo purposes, be more lenient with player selection
    const activePlayers = players.filter((p: any) => p && !p.isRetired).slice(0, 6);
    
    if (activePlayers.length === 0) {
      console.log('DEBUG: No players passed after filtering. Original players:', players);
      throw new Error('No healthy players available for match');
    }

    console.log('DEBUG: Using', activePlayers.length, 'active players for formation');

    // Get players by role with fallbacks
    const passers = activePlayers.filter((p: any) => p.role === 'Passer');
    const runners = activePlayers.filter((p: any) => p.role === 'Runner');
    const blockers = activePlayers.filter((p: any) => p.role === 'Blocker');
    
    // Create formation with fallbacks
    const passer = passers[0] || activePlayers[0];
    const runner1 = runners[0] || activePlayers[1] || activePlayers[0];
    const runner2 = runners[1] || activePlayers[2] || activePlayers[0];
    const blocker1 = blockers[0] || activePlayers[3] || activePlayers[0];
    const blocker2 = blockers[1] || activePlayers[4] || activePlayers[0];
    const wildcard = activePlayers[5] || activePlayers[0];
    
    return {
      passer: this.createFieldPlayer(passer),
      runners: [this.createFieldPlayer(runner1), this.createFieldPlayer(runner2)],
      blockers: [this.createFieldPlayer(blocker1), this.createFieldPlayer(blocker2)],
      wildcard: this.createFieldPlayer(wildcard)
    };
  }

  /**
   * Create field player from database player
   */
  private createFieldPlayer(player: any): FieldPlayer {
    if (!player) {
      throw new Error('Player data is missing');
    }

    return {
      id: player.id,
      name: `${player.firstName} ${player.lastName}`,
      position: { x: Math.random() * 400 + 200, y: Math.random() * 200 + 100 },
      role: player.role || 'Runner',
      stamina: player.dailyStaminaLevel || 100,
      attributes: {
        speed: player.speed || 20,
        power: player.power || 20,
        throwing: player.throwing || 20,
        catching: player.catching || 20,
        agility: player.agility || 20,
        leadership: player.leadership || 20
      },
      race: player.race || 'Human',
      activeBoosts: []
    };
  }

  /**
   * Calculate attendance based on stadium capacity
   */
  private calculateAttendance(capacity: number): number {
    // Random attendance between 60-95% of capacity
    const attendanceRate = 0.6 + (Math.random() * 0.35);
    return Math.floor(capacity * attendanceRate);
  }

  /**
   * Initialize player statistics
   */
  private initializePlayerStats(liveState: LiveMatchState, homePlayers: any[], awayPlayers: any[]): void {
    const allPlayers = [...homePlayers, ...awayPlayers];
    
    allPlayers.forEach(player => {
      const stats: PlayerMatchStats = {
        playerId: player.id,
        minutesPlayed: 0,
        scores: 0,
        assists: 0,
        passAttempts: 0,
        passCompletions: 0,
        passingYards: 0,
        perfectPasses: 0,
        rushingAttempts: 0,
        rushingYards: 0,
        breakawayRuns: 0,
        catches: 0,
        receivingYards: 0,
        drops: 0,
        tackles: 0,
        knockdowns: 0,
        interceptions: 0,
        fumblesLost: 0,
        clutchPlays: 0,
        staminaUsed: 0,
        injuries: 0,
        skillsUsed: 0
      };
      
      liveState.playerStats.set(player.id, stats);
    });
  }

  /**
   * Initialize team statistics
   */
  private initializeTeamStats(liveState: LiveMatchState, homeTeamId: string, awayTeamId: string): void {
    const homeStats: TeamMatchStats = {
      teamId: homeTeamId,
      possession: 50,
      fieldPosition: 50,
      passingAccuracy: 0,
      tackles: 0,
      turnovers: 0,
      timeOfPossession: 0
    };
    
    const awayStats: TeamMatchStats = {
      teamId: awayTeamId,
      possession: 50,
      fieldPosition: 50,
      passingAccuracy: 0,
      tackles: 0,
      turnovers: 0,
      timeOfPossession: 0
    };
    
    liveState.teamStats.set(homeTeamId, homeStats);
    liveState.teamStats.set(awayTeamId, awayStats);
  }

  /**
   * Start simulation loop for a match
   */
  private startSimulationLoop(matchId: string): void {
    try {
      console.log(`🔧 [DEBUG] startSimulationLoop called for match ${matchId}`);
      
      const liveState = this.activeMatches.get(matchId);
      console.log(`🔧 [DEBUG] liveState in startSimulationLoop: ${!!liveState}`);
      
      if (!liveState) {
        console.error(`❌ ERROR: No liveState found for match ${matchId} in startSimulationLoop`);
        return;
      }
      
      console.log(`🚀 Starting dynamic event-driven simulation for match ${matchId}`);
      
      // Start with initial event scheduling
      this.scheduleNextEvent(matchId);
      
    } catch (error) {
      console.error(`❌ CRITICAL ERROR in startSimulationLoop for match ${matchId}:`, error);
    }
  }

  /**
   * Schedule the next event based on current simulation speed (dynamic pacing)
   */
  private scheduleNextEvent(matchId: string): void {
    try {
      console.log(`🔧 [DEBUG] scheduleNextEvent called for match ${matchId}`);
      
      const liveState = this.activeMatches.get(matchId);
      console.log(`🔧 [DEBUG] liveState exists: ${!!liveState}, status: ${liveState?.status}`);
      
      if (!liveState) {
        console.error(`❌ ERROR: No liveState found for match ${matchId} in scheduleNextEvent`);
        return;
      }
      
      if (liveState.status !== 'live') {
        console.error(`❌ ERROR: Match ${matchId} status is '${liveState.status}', not 'live' - stopping scheduling`);
        return;
      }
      
      // Base interval: events happen every 1-3 seconds in real time
      const baseInterval = 1000 + (Math.random() * 2000); // 1-3 seconds
      const speedMultiplier = liveState.simulationSpeed || 1.0;
      
      // Dynamic timing: faster simulation = shorter wait times
      const actualInterval = baseInterval / speedMultiplier;
      
      console.log(`⏰ Next event in ${(actualInterval/1000).toFixed(1)}s (speed: ${speedMultiplier}x) for match ${matchId}`);
      
      const timeout = setTimeout(async () => {
        try {
          console.log(`🎯 [DEBUG] Executing scheduled event for match ${matchId}`);
          await this.simulateTick(matchId);
          // Schedule the next event after this one completes
          this.scheduleNextEvent(matchId);
        } catch (error) {
          console.error(`❌ ERROR in scheduled simulateTick for match ${matchId}:`, error);
        }
      }, actualInterval);

      this.matchIntervals.set(matchId, timeout);
      console.log(`✅ [DEBUG] Event scheduled successfully for match ${matchId}, timeout stored`);
      
    } catch (error) {
      console.error(`❌ CRITICAL ERROR in scheduleNextEvent for match ${matchId}:`, error);
    }
  }

  /**
   * Generate next event with dynamic pacing (replaces old tick system)
   */
  private async simulateTick(matchId: string): Promise<void> {
    const liveState = this.activeMatches.get(matchId);
    if (!liveState || liveState.status !== 'live') return;

    // Generate event using the new match engine
    const engine = this.activeEngines.get(matchId);
    if (!engine) {
      console.warn(`⚠️ No engine found for match ${matchId}`);
      return;
    }

    // Generate the next event
    const event = engine.simulateTick();
    
    // **CRITICAL: Dynamic pacing based on event priority**
    const eventPriority = event.priority;
    liveState.simulationSpeed = eventPriority.speedMultiplier;
    
    // Advance game time based on event significance
    let timeAdvancement: number;
    switch (eventPriority.priority) {
      case 1: // CRITICAL - scores, injuries (slow dramatic moments)
        timeAdvancement = 2 + Math.random() * 3; // 2-5 seconds
        break;
      case 2: // IMPORTANT - breakaways, big plays  
        timeAdvancement = 5 + Math.random() * 10; // 5-15 seconds
        break;
      case 3: // STANDARD - normal play
        timeAdvancement = 15 + Math.random() * 30; // 15-45 seconds
        break;
      case 4: // DOWNTIME - quiet moments
        timeAdvancement = 30 + Math.random() * 60; // 30-90 seconds (fast through boring)
        break;
      default:
        timeAdvancement = 10;
    }
    
    liveState.gameTime += Math.floor(timeAdvancement);
    liveState.matchTick = (liveState.matchTick || 0) + 1;
    liveState.lastUpdate = Date.now();
    
    console.log(`⚡ [${eventPriority.label.toUpperCase()}] ${event.description} | Time: ${Math.floor(liveState.gameTime/60)}:${(liveState.gameTime%60).toString().padStart(2,'0')} | Speed: ${eventPriority.speedMultiplier}x`);

    // Check for halftime
    if (liveState.gameTime >= 1200 && liveState.currentHalf === 1) { // 20 minutes
      liveState.status = 'halftime';
      this.generateEvent(liveState, MATCH_EVENT_TYPES.HALFTIME, 'Halftime break');
      
      // Resume after halftime
      setTimeout(() => {
        liveState.currentHalf = 2;
        liveState.status = 'live';
        this.generateEvent(liveState, MATCH_EVENT_TYPES.SCRUM, 'Second half begins!');
      }, 5000); // 5 second halftime
    }

    // Check for match end
    if (liveState.gameTime >= liveState.maxTime) {
      await this.stopMatch(matchId);
      return;
    }

    // Update scores from event if it was a scoring event
    if (event.type === MATCH_EVENT_TYPES.SCORE) {
      // Determine which team scored based on event context
      // For now, randomly assign to demonstrate scoring
      if (Math.random() > 0.5) {
        liveState.homeScore += 1;
      } else {
        liveState.awayScore += 1;
      }
    }

    // Broadcast the event with dynamic pacing info
    this.broadcastEvent(matchId, event);
    
    // Save state periodically
    if (liveState.matchTick % 5 === 0) {
      this.saveStateToDatabase(matchId, liveState);
    }

    // Broadcast state update every few events for real-time updates
    if (liveState.matchTick % 3 === 0) {
      console.log(`🔄 Broadcasting live update: ${Math.floor(liveState.gameTime/60)}:${(liveState.gameTime%60).toString().padStart(2,'0')} | ${liveState.homeScore}-${liveState.awayScore}`);
      webSocketManager.broadcastToMatch(matchId, 'matchUpdate', liveState);
    }

    // Update revenue
    this.updateRevenue(liveState);

    // Update player positions
    this.updatePlayerPositions(liveState);

    // COMPREHENSIVE FIX: Ensure matchTick is never null and broadcast properly
    if (liveState.matchTick === null || liveState.matchTick === undefined) {
      console.warn(`⚠️ CRITICAL: matchTick was null/undefined for match ${matchId}, resetting to 0`);
      liveState.matchTick = 0;
    }
    
    // Broadcast state update every 5 ticks (simplified to one WebSocket system)
    if (liveState.matchTick % 5 === 0) {
      console.log(`🔍 [DEBUG] Broadcasting matchUpdate for match ${matchId}, tick ${liveState.matchTick}, time ${liveState.gameTime}`);
      webSocketManager.broadcastToMatch(matchId, 'matchUpdate', liveState);
    }
  }

  /**
   * Save live state to database with corrected matchTick
   */
  private async saveStateToDatabase(matchId: string, liveState: LiveMatchState): Promise<void> {
    try {
      const prisma = await getPrismaClient();
      await prisma.game.update({
        where: { id: parseInt(matchId) },
        data: {
          homeScore: liveState.homeScore,
          awayScore: liveState.awayScore,
          simulationLog: JSON.stringify({
            gameTime: liveState.gameTime,
            matchTick: liveState.matchTick,
            homeScore: liveState.homeScore,
            awayScore: liveState.awayScore,
            status: liveState.status,
            gameEvents: liveState.gameEvents?.slice(-50) || [],
            lastUpdate: Date.now()
          })
        }
      });
    } catch (error) {
      console.error(`❌ Failed to save state for match ${matchId}:`, error);
    }
  }

  /**
   * Generate a match event (now a simplified wrapper around broadcastEvent)
   */
  private generateEvent(liveState: LiveMatchState, eventType: string, description: string): void {
    const event: MatchEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: liveState.gameTime,
      tick: liveState.matchTick,
      type: eventType,
      description,
      priority: this.getEventPriority(eventType), // Keep this for simple, non-engine events
      position: {
        x: Math.random() * 800,
        y: Math.random() * 400
      }
    };

    this.broadcastEvent(liveState.matchId, event);
  }

  /**
   * Get event priority based on type for simple events
   */
  private getEventPriority(eventType: string): any {
    if ([MATCH_EVENT_TYPES.SCORE, MATCH_EVENT_TYPES.INJURY, MATCH_EVENT_TYPES.HALFTIME, MATCH_EVENT_TYPES.FINAL_WHISTLE].includes(eventType as any)) {
      return EVENT_PRIORITIES.CRITICAL;
    }
    return EVENT_PRIORITIES.STANDARD;
  }

  /**
   * Update revenue tracking
   */
  private updateRevenue(liveState: LiveMatchState): void {
    const revenueSnapshot: RevenueSnapshot = {
      tick: liveState.matchTick,
      totalRevenue: 0,
      ticketRevenue: liveState.attendance * 25, // ₡25 per attendee
      concessionRevenue: liveState.attendance * 8 * liveState.facilityLevels.concessions,
      parkingRevenue: Math.floor(liveState.attendance * 0.3) * 10 * liveState.facilityLevels.parking,
      vipRevenue: liveState.facilityLevels.vipSuites * 5000,
      merchRevenue: liveState.attendance * 3 * liveState.facilityLevels.merchandising
    };
    
    revenueSnapshot.totalRevenue = 
      revenueSnapshot.ticketRevenue +
      revenueSnapshot.concessionRevenue +
      revenueSnapshot.parkingRevenue +
      revenueSnapshot.vipRevenue +
      revenueSnapshot.merchRevenue;
    
    liveState.perTickRevenue.push(revenueSnapshot);
    
    // Keep only last 100 revenue snapshots
    if (liveState.perTickRevenue.length > 100) {
      liveState.perTickRevenue = liveState.perTickRevenue.slice(-100);
    }
  }

  /**
   * Update player positions
   */
  private updatePlayerPositions(liveState: LiveMatchState): void {
    // Simple position updates for demonstration
    const updateFormation = (formation: any) => {
      // Update passer position
      if (formation.passer.position) {
        formation.passer.position.x += (Math.random() - 0.5) * 10;
        formation.passer.position.y += (Math.random() - 0.5) * 10;
      }
      
      // Update runners
      formation.runners.forEach((runner: any) => {
        if (runner.position) {
          runner.position.x += (Math.random() - 0.5) * 15;
          runner.position.y += (Math.random() - 0.5) * 15;
        }
      });
      
      // Update blockers
      formation.blockers.forEach((blocker: any) => {
        if (blocker.position) {
          blocker.position.x += (Math.random() - 0.5) * 8;
          blocker.position.y += (Math.random() - 0.5) * 8;
        }
      });
    };

    updateFormation(liveState.activeFieldPlayers.home);
    updateFormation(liveState.activeFieldPlayers.away);
  }

  /**
   * Get all active matches
   */
  getActiveMatches(): string[] {
    return Array.from(this.activeMatches.keys());
  }

  /**
   * Clean up completed matches
   */
  cleanup(): void {
    this.activeMatches.forEach((liveState, matchId) => {
      if (liveState.status === 'completed') {
        this.stopMatch(matchId);
      }
    });
  }
}

// Create singleton instance
export const liveMatchEngine = new LiveMatchEngineService();