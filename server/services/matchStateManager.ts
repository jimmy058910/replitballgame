import { prisma } from "../db";
import type { Game, Player, Stadium, Team } from "../../generated/prisma";
import { commentaryService } from "./commentaryService.js";
import { injuryStaminaService } from "./injuryStaminaService";
import { simulateEnhancedMatch } from "./matchSimulation";

// Helper type for player stats snapshot
type PlayerStatsSnapshot = {
  scores: number;
  passingAttempts: number;
  passesCompleted: number;
  passingYards: number;
  carrierYards: number;
  catches: number;
  receivingYards: number;
  drops: number;
  fumblesLost: number;
  tackles: number;
  knockdownsInflicted: number;
  interceptionsCaught: number;
  passesDefended: number;
};

// Helper type for team stats snapshot
type TeamStatsSnapshot = {
  possessionTime: number;
  turnovers: number;
  totalYards: number;
  passYards: number;
  carrierYards: number;
  firstDowns: number;
  penalties: number;
  penaltyYards: number;
};


interface LiveMatchState {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  startTime: Date;
  gameTime: number; // in seconds
  maxTime: number; // total game time in seconds  
  currentHalf: 1 | 2;
  homeScore: number;
  awayScore: number;
  status: 'live' | 'completed' | 'paused';
  gameEvents: MatchEvent[];
  lastUpdateTime: Date;

  // Detailed in-match stats
  playerStats: Map<string, PlayerStatsSnapshot>; // Keyed by playerId
  teamStats: Map<string, TeamStatsSnapshot>; // Keyed by teamId (home/away)

  // Possession tracking
  possessingTeamId: string | null; // Which team has the ball
  possessionStartTime: number; // Game time when current possession started
}

interface MatchEvent {
  time: number;
  type: string; // e.g., 'pass_attempt', 'pass_complete', 'rush', 'tackle', 'score', 'interception', 'fumble'
  description: string;
  actingPlayerId?: string; // Player performing the action
  targetPlayerId?: string; // Player targeted (e.g., receiver)
  defensivePlayerId?: string; // Player making a defensive play
  teamId?: string; // Team associated with the event (e.g., team that scored)
  data?: any; // yards, new ball position, etc.
}

class MatchStateManager {
  private liveMatches: Map<string, LiveMatchState> = new Map();
  private matchIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Start a new live match with server-side state management
  async startLiveMatch(matchId: string, isExhibition: boolean = false): Promise<LiveMatchState> {
    const match = await prisma.game.findUnique({
      where: { id: parseInt(matchId) }
    });
    
    if (!match) {
      throw new Error("Match not found");
    }

    // Get team players for simulation
    const homeTeamPlayers = await prisma.player.findMany({
      where: { 
        teamId: match.homeTeamId,
        isOnMarket: false
      }
    });
    
    const awayTeamPlayers = await prisma.player.findMany({
      where: { 
        teamId: match.awayTeamId,
        isOnMarket: false
      }
    });

    const maxTime = isExhibition ? 1200 : 1800; // 20 min exhibition, 30 min league

    const initialPlayerStats = new Map<string, PlayerStatsSnapshot>();
    const allPlayers = [...homeTeamPlayers, ...awayTeamPlayers];
    allPlayers.forEach(player => {
      initialPlayerStats.set(player.id.toString(), {
        scores: 0, passingAttempts: 0, passesCompleted: 0, passingYards: 0,
        carrierYards: 0, catches: 0, receivingYards: 0, drops: 0, fumblesLost: 0,
        tackles: 0, knockdownsInflicted: 0, interceptionsCaught: 0, passesDefended: 0,
      });
    });

    const initialTeamStats = new Map<string, TeamStatsSnapshot>();
    initialTeamStats.set(match.homeTeamId, {
      totalOffensiveYards: 0, passingYards: 0, carrierYards: 0,
      timeOfPossessionSeconds: 0, turnovers: 0, totalKnockdownsInflicted: 0,
    });
    initialTeamStats.set(match.awayTeamId, {
      totalOffensiveYards: 0, passingYards: 0, carrierYards: 0,
      timeOfPossessionSeconds: 0, turnovers: 0, totalKnockdownsInflicted: 0,
    });

    // Determine initial possession (e.g., coin toss or home team starts)
    const initialPossessingTeam = Math.random() < 0.5 ? match.homeTeamId : match.awayTeamId;

    const matchState: LiveMatchState = {
      matchId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      startTime: new Date(),
      gameTime: 0,
      maxTime,
      currentHalf: 1,
      homeScore: 0,
      awayScore: 0,
      status: 'live',
      gameEvents: [{
        time: 0,
        type: 'kickoff',
        description: `Match begins! ${initialPossessingTeam === match.homeTeamId ? 'Home' : 'Away'} team starts with possession.`,
        teamId: initialPossessingTeam,
        data: { homeTeam: match.homeTeamId, awayTeam: match.awayTeamId }
      }],
      lastUpdateTime: new Date(),
      playerStats: initialPlayerStats,
      teamStats: initialTeamStats,
      possessingTeamId: initialPossessingTeam,
      possessionStartTime: 0,
    };

    this.liveMatches.set(matchId, matchState);
    
    // Set appropriate stamina levels for match type (risk-free for exhibitions)
    const gameMode = isExhibition ? 'exhibition' : match.matchType === 'tournament' ? 'tournament' : 'league';
    for (const player of allPlayers) {
      await injuryStaminaService.setMatchStartStamina(player.id, gameMode);
    }
    
    // Start the match simulation loop
    this.startMatchSimulation(matchId, homeTeamPlayers, awayTeamPlayers);
    
    // Update match status in database with initial state
    await prisma.game.update({
      where: { id: parseInt(matchId) },
      data: { 
        status: 'IN_PROGRESS',
        gameDate: new Date(),
        homeScore: 0,
        awayScore: 0,
        simulationLog: {
          events: matchState.gameEvents,
          currentTime: 0,
          currentHalf: 1,
          maxTime: maxTime
        }
      }
    });

    return matchState;
  }

  // Get current match state for synchronization
  getMatchState(matchId: string): LiveMatchState | null {
    return this.liveMatches.get(matchId) || null;
  }

  // Synchronize client with server state
  async syncMatchState(matchId: string | number): Promise<LiveMatchState | null> {
    const matchIdStr = matchId.toString();
    const matchIdNum = parseInt(matchIdStr);
    
    const state = this.liveMatches.get(matchIdStr);
    if (!state) {
      // Check if match exists in database but not in memory
      const match = await prisma.game.findFirst({
        where: { id: matchIdNum }
      });
      if (match && match.status === 'IN_PROGRESS') {
        // Restart the match state from database
        return await this.restartMatchFromDatabase(matchIdStr);
      }
      return null;
    }
    
    // Update last access time
    state.lastUpdateTime = new Date();
    return state;
  }

  private async restartMatchFromDatabase(matchId: string): Promise<LiveMatchState | null> {
    const match = await prisma.game.findFirst({
      where: { id: parseInt(matchId) }
    });
    if (!match || match.status !== 'IN_PROGRESS') {
      return null;
    }

    // Calculate elapsed time since match started
    const startTime = match.gameDate || match.createdAt;
    if (!startTime) {
      return null;
    }
    const elapsedSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const isExhibition = match.matchType === 'exhibition';
    const maxTime = isExhibition ? 1200 : 1800;

    // If match should have ended, complete it
    if (elapsedSeconds >= maxTime) {
      // Ensure this match instance is cleaned up if it's being restarted past its end time.
      const existingState = this.liveMatches.get(matchId);
      if (existingState) {
         const homeTeamPlayers = await prisma.player.findMany({
           where: { teamId: existingState.homeTeamId, isOnMarket: false }
         });
         const awayTeamPlayers = await prisma.player.findMany({
           where: { teamId: existingState.awayTeamId, isOnMarket: false }
         });
         await this.completeMatch(matchId, existingState.homeTeamId, existingState.awayTeamId, homeTeamPlayers, awayTeamPlayers);
      } else {
        // If no state, perhaps just update DB if needed, though this scenario is less likely.
        await prisma.game.update({
          where: { id: parseInt(matchId.toString()) },
          data: { status: 'COMPLETED' }
        });
      }
      return null;
    }

    const homeTeamPlayers = await prisma.player.findMany({
      where: { teamId: match.homeTeamId, isOnMarket: false }
    });
    const awayTeamPlayers = await prisma.player.findMany({
      where: { teamId: match.awayTeamId, isOnMarket: false }
    });

    // Reconstruct match state (simplified, full stat reconstruction might be complex)
    const currentHalf = elapsedSeconds < (maxTime / 2) ? 1 : 2;

    const initialPlayerStats = new Map<string, PlayerStatsSnapshot>();
    [...homeTeamPlayers, ...awayTeamPlayers].forEach(player => {
      initialPlayerStats.set(player.id, {
        scores: 0, passingAttempts: 0, passesCompleted: 0, passingYards: 0,
        carrierYards: 0, catches: 0, receivingYards: 0, drops: 0, fumblesLost: 0,
        tackles: 0, knockdownsInflicted: 0, interceptionsCaught: 0, passesDefended: 0,
      });
    });

    const initialTeamStats = new Map<string, TeamStatsSnapshot>();
    initialTeamStats.set(match.homeTeamId, {
      totalOffensiveYards: 0, passingYards: 0, carrierYards: 0,
      timeOfPossessionSeconds: 0, turnovers: 0, totalKnockdownsInflicted: 0,
    });
    initialTeamStats.set(match.awayTeamId, {
      totalOffensiveYards: 0, passingYards: 0, carrierYards: 0,
      timeOfPossessionSeconds: 0, turnovers: 0, totalKnockdownsInflicted: 0,
    });

    // Attempt to load some existing game data if available, but stats are tricky to reconstruct mid-game accurately
    // For now, restarting a live match will reset its detailed stats but keep score and time.
    // A more robust solution would involve serializing/deserializing the live stats maps.
    const gameEvents = (match.gameData as any)?.events || [];
    const possessingTeamId = gameEvents.length > 0 ? gameEvents[gameEvents.length - 1]?.teamId : (Math.random() < 0.5 ? match.homeTeamId : match.awayTeamId);


    const matchState: LiveMatchState = {
      matchId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      startTime: startTime,
      gameTime: elapsedSeconds,
      maxTime,
      currentHalf,
      homeScore: match.homeScore || 0,
      awayScore: match.awayScore || 0,
      status: 'live',
      gameEvents,
      lastUpdateTime: new Date(),
      playerStats: initialPlayerStats, // Stats are reset for simplicity on restart
      teamStats: initialTeamStats,     // Stats are reset for simplicity on restart
      possessingTeamId: possessingTeamId || match.homeTeamId, // Default if no events
      possessionStartTime: elapsedSeconds, // Assume current possession started now
    };

    this.liveMatches.set(matchId, matchState);

    this.startMatchSimulation(matchId, homeTeamPlayers, awayTeamPlayers);

    return matchState;
  }

  private startMatchSimulation(matchId: string, homeTeamPlayers: Player[], awayTeamPlayers: Player[]) {
    const existingInterval = this.matchIntervals.get(matchId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    const interval = setInterval(async () => {
      await this.updateMatchState(matchId, homeTeamPlayers, awayTeamPlayers);
    }, 3000); // 3 real seconds = 9 game seconds (3x speed)

    this.matchIntervals.set(matchId, interval);
  }

  private async updateMatchState(matchId: string, homeTeamPlayers: Player[], awayTeamPlayers: Player[]) {
    const state = this.liveMatches.get(matchId);
    if (!state || state.status !== 'live') {
      return;
    }

    const gameTimeIncrement = 9; // 9 game seconds per tick
    state.gameTime += gameTimeIncrement;
    state.lastUpdateTime = new Date();

    // Update Time of Possession for current possessing team
    if (state.possessingTeamId) {
      const teamStats = state.teamStats.get(state.possessingTeamId);
      if (teamStats) {
        teamStats.timeOfPossessionSeconds += gameTimeIncrement;
      }
    }

    if (state.currentHalf === 1 && state.gameTime >= state.maxTime / 2) {
      this.handlePossessionChange(state, state.possessingTeamId, null, state.gameTime); // End of half might mean ball goes to other team or neutral
      state.currentHalf = 2;
      state.gameEvents.push({
        time: state.gameTime,
        type: 'halftime',
        description: 'Half-time break.',
      });
      // Typically, the team that kicked off to start the game receives the ball in the second half.
      // For simplicity, let's give it to the team that didn't have it last, or random if null.
      const newPossessingTeam = state.possessingTeamId === state.homeTeamId ? state.awayTeamId : state.homeTeamId;
      this.handlePossessionChange(state, null, newPossessingTeam, state.gameTime);
    }

    // Generate more detailed events
    if (Math.random() < 0.5) { // 50% chance of an event each update cycle
      const event = this.generateDetailedMatchEvent(homeTeamPlayers, awayTeamPlayers, state);
      if (event) {
        state.gameEvents.push(event);
        // Score updates are now handled by the event generation logic itself
      }
    }

    if (state.gameTime >= state.maxTime) {
      await this.completeMatch(matchId, state.homeTeamId, state.awayTeamId, homeTeamPlayers, awayTeamPlayers);
      return;
    }

    if (state.gameTime % 30 === 0) { // Every 30 game seconds
      await prisma.game.update({
        where: { id: parseInt(matchId) },
        data: {
          homeScore: state.homeScore,
          awayScore: state.awayScore,
          simulationLog: {
            events: state.gameEvents.slice(-30), // Keep last 30 events
            currentTime: state.gameTime,
            currentHalf: state.currentHalf,
            maxTime: state.maxTime,
            // Consider adding current possession to simulationLog if useful for client UI
          }
        }
      });
    }
  }

  private handlePossessionChange(state: LiveMatchState, oldPossessingTeamId: string | null, newPossessingTeamId: string | null, gameTime: number) {
    if (oldPossessingTeamId && oldPossessingTeamId !== newPossessingTeamId) {
      const possessionDuration = gameTime - state.possessionStartTime;
      const teamStats = state.teamStats.get(oldPossessingTeamId);
      if (teamStats) {
        // This was adding increment twice, time is added per tick now.
        // teamStats.timeOfPossessionSeconds += possessionDuration;
      }
    }
    state.possessingTeamId = newPossessingTeamId;
    state.possessionStartTime = gameTime;
  }

  // ### Main Event Generation Logic ###
  private generateDetailedMatchEvent(homePlayers: Player[], awayPlayers: Player[], state: LiveMatchState): MatchEvent | null {
    if (!state.possessingTeamId) return null; // No action if ball is loose (though current logic doesn't allow this state for long)

    const offensiveTeamPlayers = state.possessingTeamId === state.homeTeamId ? homePlayers : awayPlayers;
    const defensiveTeamPlayers = state.possessingTeamId === state.homeTeamId ? awayPlayers : homePlayers;
    const offensiveTeamId = state.possessingTeamId;
    const defensiveTeamId = offensiveTeamId === state.homeTeamId ? state.awayTeamId : state.homeTeamId;

    if (offensiveTeamPlayers.length === 0) return { time: state.gameTime, type: 'info', description: "Offensive team has no players on field." };

    // Select an active player (e.g., a passer or runner)
    const actingPlayer = offensiveTeamPlayers.find(p => p.tacticalRole === 'Passer' && Math.random() < 0.6) || // Prioritize Passer
                         offensiveTeamPlayers[Math.floor(Math.random() * offensiveTeamPlayers.length)];
    
    if (!actingPlayer) return null;

    // Initialize player stats if not exists
    let pStats = state.playerStats.get(actingPlayer.id);
    if (!pStats) {
      pStats = {
        passingAttempts: 0,
        passesCompleted: 0,
        passingYards: 0,
        carrierYards: 0,
        catches: 0,
        receivingYards: 0,
        tackles: 0,
        knockdownsInflicted: 0,
        interceptionsCaught: 0,
        passesDefended: 0,
        sacks: 0,
        fumblesLost: 0,
        scores: 0,
        drops: 0
      };
      state.playerStats.set(actingPlayer.id, pStats);
    }
    const teamStats = state.teamStats.get(offensiveTeamId)!;
    const defensiveTeamStats = state.teamStats.get(defensiveTeamId)!;

    const actionRoll = Math.random();
    let event: MatchEvent | null = null;

    // Determine action based on player role and randomness
    if (actingPlayer.tacticalRole === 'Passer' && actionRoll < 0.6) { // 60% chance Passer attempts a pass
        pStats.passingAttempts++;
        const targetPlayer = offensiveTeamPlayers.filter(p => p.id !== actingPlayer.id && p.tacticalRole === 'Runner')[Math.floor(Math.random() * offensiveTeamPlayers.filter(p => p.id !== actingPlayer.id && p.tacticalRole === 'Runner').length)]
                           || offensiveTeamPlayers.filter(p => p.id !== actingPlayer.id)[Math.floor(Math.random() * offensiveTeamPlayers.filter(p => p.id !== actingPlayer.id).length)];

        if (!targetPlayer) return { time: state.gameTime, type: 'info', description: `${actingPlayer.lastName} looks to pass but finds no one.`};
        // Initialize target player stats if not exists
        let targetPStats = state.playerStats.get(targetPlayer.id);
        if (!targetPStats) {
          targetPStats = {
            passingAttempts: 0,
            passesCompleted: 0,
            passingYards: 0,
            carrierYards: 0,
            catches: 0,
            receivingYards: 0,
            tackles: 0,
            knockdownsInflicted: 0,
            interceptionsCaught: 0,
            passesDefended: 0,
            sacks: 0,
            fumblesLost: 0,
            scores: 0,
            drops: 0
          };
          state.playerStats.set(targetPlayer.id, targetPStats);
        }

        const passSuccessRoll = Math.random() * 50 + actingPlayer.throwing; // Max 40 + 50 = 90
        const catchSuccessRoll = Math.random() * 50 + targetPlayer.catching; // Max 40 + 50 = 90
        const defenseRoll = defensiveTeamPlayers.length > 0 ? (Math.random() * 40 + defensiveTeamPlayers[0].agility) : 0; // Simplified defense check

        if (passSuccessRoll > 30 + defenseRoll * 0.3) { // Pass is on target
            if (catchSuccessRoll > 35 + defenseRoll * 0.2) { // Caught
                const yards = Math.floor(Math.random() * 30) + 5; // 5-34 yards
                pStats.passesCompleted++;
                pStats.passingYards += yards;
                targetPStats.catches++;
                targetPStats.receivingYards += yards;
                teamStats.passingYards += yards;
                teamStats.totalOffensiveYards += yards;
                // Generate comprehensive commentary for successful pass
                const passCommentary = commentaryService.generatePassPlayCommentary(
                  actingPlayer,
                  targetPlayer,
                  true,
                  yards
                );
                event = { time: state.gameTime, type: 'pass_complete', actingPlayerId: actingPlayer.id, targetPlayerId: targetPlayer.id, teamId: offensiveTeamId, description: passCommentary, data: { yards } };

                // Chance to score after a catch
                if (Math.random() < 0.15) { // 15% chance of scoring after a good catch
                    pStats.scores++; // Scorer is the receiver on a pass play
                    if (offensiveTeamId === state.homeTeamId) state.homeScore++; else state.awayScore++;
                    state.gameEvents.push(event); // push the completion event first
                    this.handlePossessionChange(state, offensiveTeamId, defensiveTeamId, state.gameTime); // Possession changes after score
                    const scoringCommentary = commentaryService.generateScoringCommentary(targetPlayer, offensiveTeamId === state.homeTeamId ? "Home Team" : "Away Team", "passing");
                    return { time: state.gameTime, type: 'score', actingPlayerId: targetPlayer.id, teamId: offensiveTeamId, description: scoringCommentary, data: { scoreType: 'passing' }};
                }

            } else { // Dropped
                targetPStats.drops++;
                const dropCommentary = commentaryService.generateLooseBallCommentary('drop', undefined, undefined, targetPlayer);
                event = { time: state.gameTime, type: 'pass_drop', actingPlayerId: actingPlayer.id, targetPlayerId: targetPlayer.id, teamId: offensiveTeamId, description: dropCommentary, data: { yards: 0 } };
                this.handlePossessionChange(state, offensiveTeamId, defensiveTeamId, state.gameTime); // Turnover on downs (simplified)
            }
        } else { // Pass incomplete or intercepted
            const defensivePlayer = defensiveTeamPlayers[Math.floor(Math.random() * defensiveTeamPlayers.length)];
            if (defensivePlayer && Math.random() < 0.3 + (defensivePlayer.catching - 20) / 50) { // 30% base + catching skill for interception
                // Initialize defensive player stats if not exists
                let defPStats = state.playerStats.get(defensivePlayer.id);
                if (!defPStats) {
                  defPStats = {
                    passingAttempts: 0,
                    passesCompleted: 0,
                    passingYards: 0,
                    carrierYards: 0,
                    catches: 0,
                    receivingYards: 0,
                    tackles: 0,
                    knockdownsInflicted: 0,
                    interceptionsCaught: 0,
                    passesDefended: 0,
                    sacks: 0,
                    fumblesLost: 0,
                    scores: 0,
                    drops: 0
                  };
                  state.playerStats.set(defensivePlayer.id, defPStats);
                }
                defPStats.interceptionsCaught++;
                teamStats.turnovers++; // Offensive team turnover
                const interceptionCommentary = commentaryService.generateInterceptionCommentary(defensivePlayer, actingPlayer);
                event = { time: state.gameTime, type: 'interception', actingPlayerId: actingPlayer.id, defensivePlayerId: defensivePlayer.id, teamId: defensiveTeamId, description: interceptionCommentary, data: { yards: 0 } };
                this.handlePossessionChange(state, offensiveTeamId, defensiveTeamId, state.gameTime);
            } else if (defensivePlayer) { // Pass defended
                // Initialize defensive player stats if not exists
                let defPStats = state.playerStats.get(defensivePlayer.id);
                if (!defPStats) {
                  defPStats = {
                    passingAttempts: 0,
                    passesCompleted: 0,
                    passingYards: 0,
                    carrierYards: 0,
                    catches: 0,
                    receivingYards: 0,
                    tackles: 0,
                    knockdownsInflicted: 0,
                    interceptionsCaught: 0,
                    passesDefended: 0,
                    sacks: 0,
                    fumblesLost: 0,
                    scores: 0,
                    drops: 0
                  };
                  state.playerStats.set(defensivePlayer.id, defPStats);
                }
                defPStats.passesDefended++;
                event = { time: state.gameTime, type: 'pass_defended', actingPlayerId: actingPlayer.id, defensivePlayerId: defensivePlayer.id, teamId: offensiveTeamId, description: `${actingPlayer.lastName}'s pass defended by ${defensivePlayer.lastName}. Incomplete.` };
                this.handlePossessionChange(state, offensiveTeamId, defensiveTeamId, state.gameTime); // Turnover on downs (simplified)
            } else { // Simple incomplete
                 event = { time: state.gameTime, type: 'pass_incomplete', actingPlayerId: actingPlayer.id, teamId: offensiveTeamId, description: `${actingPlayer.lastName}'s pass is incomplete.` };
                 this.handlePossessionChange(state, offensiveTeamId, defensiveTeamId, state.gameTime); // Turnover on downs
            }
        }
    } else if (actingPlayer.tacticalRole === 'Runner' || actionRoll < 0.85) { // 60-85% chance of run if not Passer, or if Passer rolls run
        const yards = Math.floor(Math.random() * (actingPlayer.speed / 2 + actingPlayer.power / 3)) - 5; // -5 to 15+ yards
        if (yards > 0) {
            if (pStats) {
                pStats.carrierYards += yards;
            }
            teamStats.carrierYards += yards;
            teamStats.totalOffensiveYards += yards;
            // Generate comprehensive run commentary
            const runCommentary = commentaryService.generateRunPlayCommentary(actingPlayer, yards);
            event = { time: state.gameTime, type: 'rush', actingPlayerId: actingPlayer.id, teamId: offensiveTeamId, description: runCommentary, data: { yards } };

            if (Math.random() < 0.1) { // 10% chance of scoring on a good run
                if (pStats) {
                    pStats.scores++;
                }
                if (offensiveTeamId === state.homeTeamId) state.homeScore++; else state.awayScore++;
                state.gameEvents.push(event); // push the rush event first
                this.handlePossessionChange(state, offensiveTeamId, defensiveTeamId, state.gameTime); // Possession changes after score
                return { time: state.gameTime, type: 'score', actingPlayerId: actingPlayer.id, teamId: offensiveTeamId, description: `SCORE! ${actingPlayer.lastName} breaks free for a fantastic score!`, data: { scoreType: 'rushing' }};
            }

        } else {
            event = { time: state.gameTime, type: 'rush_stuffed', actingPlayerId: actingPlayer.id, teamId: offensiveTeamId, description: `${actingPlayer.lastName} is stopped in the chaos. No advancement.`, data: { yards: 0 } };
            // Potential for turnover on downs if it's 4th down, etc. (not implemented here)
        }
        // Fumble chance
        if (Math.random() < 0.05) { // 5% fumble chance
            if (pStats) {
                pStats.fumblesLost++;
            }
            teamStats.turnovers++;
            const defensivePlayer = defensiveTeamPlayers[Math.floor(Math.random() * defensiveTeamPlayers.length)];
            event = { time: state.gameTime, type: 'fumble_lost', actingPlayerId: actingPlayer.id, defensivePlayerId: defensivePlayer?.id, teamId: offensiveTeamId, description: `${actingPlayer.lastName} FUMBLES! Recovered by ${defensivePlayer ? defensivePlayer.lastName : defensiveTeamId}.`, data: { yards }};
            this.handlePossessionChange(state, offensiveTeamId, defensiveTeamId, state.gameTime);
        }

    } else { // Defensive play or other event (e.g. tackle, knockdown by blocker)
        const defensivePlayer = defensiveTeamPlayers[Math.floor(Math.random() * defensiveTeamPlayers.length)];
        if (defensivePlayer) {
            let defPStats = state.playerStats.get(defensivePlayer.id);
            // Initialize player stats if not exists
            if (!defPStats) {
                defPStats = {
                    passingYards: 0,
                    carrierYards: 0,
                    catches: 0,
                    tackles: 0,
                    sacks: 0,
                    interceptions: 0,
                    fumblesLost: 0,
                    knockdownsInflicted: 0,
                    scores: 0
                };
                state.playerStats.set(defensivePlayer.id, defPStats);
            }
            
            if (defensivePlayer.tacticalRole === 'Blocker' && Math.random() < 0.4) {
                defPStats.knockdownsInflicted++;
                defensiveTeamStats.totalKnockdownsInflicted++;
                 event = { time: state.gameTime, type: 'knockdown', actingPlayerId: defensivePlayer.id, teamId: defensiveTeamId, description: `${defensivePlayer.lastName} lays out an opponent with a huge block!`};
            } else { // Tackle
                defPStats.tackles++;
                event = { time: state.gameTime, type: 'tackle', actingPlayerId: defensivePlayer.id, teamId: defensiveTeamId, description: `${defensivePlayer.lastName} makes the tackle.`};
                 // If tackle results in loss of yards or stops a score, could change possession. For now, just a tackle.
            }
        } else {
            event = { time: state.gameTime, type: 'play_continues', description: "The play continues..."};
        }
    }
    return event;
  }


  private async completeMatch(matchId: string, homeTeamId: string, awayTeamId: string, homePlayers: Player[], awayPlayers: Player[]): Promise<void> {
    const state = this.liveMatches.get(matchId);
    if (!state) return;

    // Get match details to check if it's an exhibition match
    const matchDetails = await prisma.game.findFirst({
      where: { id: parseInt(matchId.toString()) }
    });
    const isExhibitionMatch = matchDetails?.matchType === 'exhibition';

    // Final possession update
    if (state.possessingTeamId) {
       const possessionDuration = state.gameTime - state.possessionStartTime;
       const teamStats = state.teamStats.get(state.possessingTeamId);
       if (teamStats) {
        // teamStats.timeOfPossessionSeconds += possessionDuration; // Already added per tick
       }
    }

    state.status = 'completed';
    
    const interval = this.matchIntervals.get(matchId);
    if (interval) {
      clearInterval(interval);
      this.matchIntervals.delete(matchId);
    }

    // Persist detailed player and team stats
    try {
      const playerStatsToInsert: PlayerMatchStats[] = [];
      const playerUpdates: Promise<any>[] = [];

      for (const [playerId, pStats] of state.playerStats.entries()) {
        const playerTeam = homePlayers.find(p => p.id === playerId) ? homeTeamId : awayTeamId;
        playerStatsToInsert.push({
          id: undefined, // Let DB generate UUID
          playerId,
          matchId,
          teamId: playerTeam,
          createdAt: new Date(),
          ...pStats,
        });

        // Update lifetime stats (skip for exhibition matches to maintain risk-free gameplay)
        if (!isExhibitionMatch) {
          const playerToUpdate = await prisma.player.findFirst({
            where: { id: playerId }
          });
          if (playerToUpdate) {
            const updatedLifetimeStats: Partial<Player> = {
              totalGamesPlayed: (playerToUpdate.totalGamesPlayed || 0) + 1,
              totalScores: (playerToUpdate.totalScores || 0) + (pStats.scores || 0),
              totalPassingAttempts: (playerToUpdate.totalPassingAttempts || 0) + (pStats.passingAttempts || 0),
              totalPassesCompleted: (playerToUpdate.totalPassesCompleted || 0) + (pStats.passesCompleted || 0),
              totalPassingYards: (playerToUpdate.totalPassingYards || 0) + (pStats.passingYards || 0),
              totalCarrierYards: (playerToUpdate.totalCarrierYards || 0) + (pStats.carrierYards || 0),
              totalCatches: (playerToUpdate.totalCatches || 0) + (pStats.catches || 0),
              totalReceivingYards: (playerToUpdate.totalReceivingYards || 0) + (pStats.receivingYards || 0),
              totalDrops: (playerToUpdate.totalDrops || 0) + (pStats.drops || 0),
              totalFumblesLost: (playerToUpdate.totalFumblesLost || 0) + (pStats.fumblesLost || 0),
              totalTackles: (playerToUpdate.totalTackles || 0) + (pStats.tackles || 0),
              totalKnockdownsInflicted: (playerToUpdate.totalKnockdownsInflicted || 0) + (pStats.knockdownsInflicted || 0),
              totalInterceptionsCaught: (playerToUpdate.totalInterceptionsCaught || 0) + (pStats.interceptionsCaught || 0),
              totalPassesDefended: (playerToUpdate.totalPassesDefended || 0) + (pStats.passesDefended || 0),
            };
            playerUpdates.push(prisma.player.update({
              where: { id: playerId },
              data: updatedLifetimeStats
            }));
          }
        }
      }

      const teamStatsToInsert: TeamMatchStats[] = [];
      for (const [teamId, tStats] of state.teamStats.entries()) {
        teamStatsToInsert.push({
          id: undefined, // Let DB generate UUID
          teamId,
          matchId,
          createdAt: new Date(),
          ...tStats,
        });
      }

      // Insert player match stats
      if (playerStatsToInsert.length > 0) {
        await prisma.playerMatchStats.createMany({
          data: playerStatsToInsert
        });
      }
      
      // Insert team match stats
      if (teamStatsToInsert.length > 0) {
        await prisma.teamMatchStats.createMany({
          data: teamStatsToInsert
        });
      }

      // Update player lifetime stats if not exhibition
      if (playerUpdates.length > 0 && !isExhibitionMatch) {
        await Promise.all(playerUpdates);
      }

      // Update the match itself
      await prisma.game.update({
        where: { id: matchId },
        data: {
          status: 'COMPLETED',
          homeScore: state.homeScore,
          awayScore: state.awayScore,
          completedAt: new Date(),
          gameData: {
            events: state.gameEvents.slice(-50), // Store last 50 events
            finalScores: { home: state.homeScore, away: state.awayScore },
          }
        }
      });

      console.log(`Match ${matchId} stats persisted successfully.`);

    } catch (error) {
      console.error(`Error persisting stats for match ${matchId}:`, error);
      // Potentially re-throw or handle more gracefully (e.g., mark match as 'error_in_stats')
      // For now, we'll update the match to completed anyway, but log the error.
       await prisma.game.update({
        where: { id: matchId },
        data: {
          status: 'COMPLETED', // Or a special status like 'completed_stats_error'
          homeScore: state.homeScore,
          awayScore: state.awayScore,
          completedAt: new Date(),
          gameData: {
            events: state.gameEvents.slice(-50),
            finalScores: { home: state.homeScore, away: state.awayScore },
            error: `Error persisting stats: ${(error as Error).message}`
          }
        }
      });
    }

    // Apply stamina depletion after match completion (skip for exhibition matches)
    if (!isExhibitionMatch) {
      const gameMode = matchDetails?.matchType === 'tournament' ? 'tournament' : 'league';
      for (const player of [...homePlayers, ...awayPlayers]) {
        await injuryStaminaService.depleteStaminaAfterMatch(player.id, gameMode);
      }
    } else {
      // Award exhibition credits and team camaraderie for risk-free matches
      await this.awardExhibitionRewards(state.homeTeamId, state.awayTeamId, state.homeScore, state.awayScore);
    }

    this.liveMatches.delete(matchId);
    console.log(`Match ${matchId} completed with score ${state.homeScore}-${state.awayScore}${isExhibitionMatch ? ' (Exhibition - Risk-Free)' : ''}`);
  }

  async stopMatch(matchId: string): Promise<void> {
    const state = this.liveMatches.get(matchId);
    if (state) {
      // Need to pass all required parameters to completeMatch
      const homePlayers = await prisma.player.findMany({
        where: { teamId: state.homeTeamId }
      });
      const awayPlayers = await prisma.player.findMany({
        where: { teamId: state.awayTeamId }
      });
      await this.completeMatch(matchId, state.homeTeamId, state.awayTeamId, homePlayers, awayPlayers);
    }
  }

  // Get all active matches
  getActiveMatches(): LiveMatchState[] {
    return Array.from(this.liveMatches.values());
  }

  /**
   * Award exhibition match rewards based on match result
   * Rewards structure: Win: 500₡, Tie: 200₡, Loss: 100₡
   * Also provides team camaraderie boost for winning teams
   */
  private async awardExhibitionRewards(homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number): Promise<void> {
    try {
      let homeCredits = 100; // Default for loss
      let awayCredits = 100; // Default for loss
      let winningTeamId: string | null = null;

      // Determine match result and credit rewards
      if (homeScore > awayScore) {
        homeCredits = 500; // Win
        winningTeamId = homeTeamId;
      } else if (awayScore > homeScore) {
        awayCredits = 500; // Win
        winningTeamId = awayTeamId;
      } else {
        // Tie - both teams get 200 credits
        homeCredits = 200;
        awayCredits = 200;
      }

      // Award credits to both teams
      await prisma.team.update({
        where: { id: parseInt(homeTeamId) },
        data: {
          credits: {
            increment: homeCredits
          }
        }
      });

      await prisma.team.update({
        where: { id: parseInt(awayTeamId) },
        data: {
          credits: {
            increment: awayCredits
          }
        }
      });

      // Award team camaraderie boost to winning team players (if not a tie)
      if (winningTeamId) {
        // Get all players for the winning team and update their camaraderie
        const winningPlayers = await prisma.player.findMany({
          where: { teamId: parseInt(winningTeamId) }
        });
        
        for (const player of winningPlayers) {
          await prisma.player.update({
            where: { id: player.id },
            data: {
              camaraderie: Math.min(100, (player.camaraderie || 0) + 2)
            }
          });
        }
      }

      console.log(`Exhibition rewards awarded: Home Team (${homeScore}): ${homeCredits}₡, Away Team (${awayScore}): ${awayCredits}₡${winningTeamId ? ` + camaraderie boost` : ''}`);

    } catch (error) {
      console.error('Error awarding exhibition rewards:', error);
    }
  }

  // Clean up old matches (run periodically)
  async cleanupOldMatches(): Promise<void> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

    const matchIds = Array.from(this.liveMatches.keys());
    for (const matchId of matchIds) {
      const state = this.liveMatches.get(matchId);
      if (!state) continue;
      if (state.lastUpdateTime < cutoff) {
        console.log(`Cleaning up abandoned match: ${matchId}`);
        const homePlayers = await prisma.player.findMany({
          where: { teamId: state.homeTeamId }
        });
        const awayPlayers = await prisma.player.findMany({
          where: { teamId: state.awayTeamId }
        });
        await this.completeMatch(matchId, state.homeTeamId, state.awayTeamId, homePlayers, awayPlayers);
      }
    }
  }
}

// Create singleton instance
export const matchStateManager = new MatchStateManager();

// Clean up old matches every 30 minutes
setInterval(() => {
  matchStateManager.cleanupOldMatches();
}, 30 * 60 * 1000);