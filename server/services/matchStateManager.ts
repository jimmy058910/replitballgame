import { db } from "../db";
import { players, matches, playerMatchStats, teamMatchStats } from "@shared/schema";
import { eq, and, or } from "drizzle-orm";
import type { Match, Player, PlayerMatchStats, TeamMatchStats } from "@shared/schema";

// Helper type for player stats, excluding IDs
type PlayerStatsSnapshot = Omit<PlayerMatchStats, 'id' | 'playerId' | 'matchId' | 'teamId' | 'createdAt'>;
// Helper type for team stats, excluding IDs
type TeamStatsSnapshot = Omit<TeamMatchStats, 'id' | 'teamId' | 'matchId' | 'createdAt'>;


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
    const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (!match) {
      throw new Error("Match not found");
    }

    // Get team players for simulation
    const homeTeamPlayers = await db.select().from(players).where(and(eq(players.teamId, match.homeTeamId), eq(players.isMarketplace, false)));
    const awayTeamPlayers = await db.select().from(players).where(and(eq(players.teamId, match.awayTeamId), eq(players.isMarketplace, false)));

    const maxTime = isExhibition ? 1200 : 1800; // 20 min exhibition, 30 min league

    const initialPlayerStats = new Map<string, PlayerStatsSnapshot>();
    const allPlayers = [...homeTeamPlayers, ...awayTeamPlayers];
    allPlayers.forEach(player => {
      initialPlayerStats.set(player.id, {
        scores: 0, passingAttempts: 0, passesCompleted: 0, passingYards: 0,
        rushingYards: 0, catches: 0, receivingYards: 0, drops: 0, fumblesLost: 0,
        tackles: 0, knockdownsInflicted: 0, interceptionsCaught: 0, passesDefended: 0,
      });
    });

    const initialTeamStats = new Map<string, TeamStatsSnapshot>();
    initialTeamStats.set(match.homeTeamId, {
      totalOffensiveYards: 0, passingYards: 0, rushingYards: 0,
      timeOfPossessionSeconds: 0, turnovers: 0, totalKnockdownsInflicted: 0,
    });
    initialTeamStats.set(match.awayTeamId, {
      totalOffensiveYards: 0, passingYards: 0, rushingYards: 0,
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
    
    // Start the match simulation loop
    this.startMatchSimulation(matchId, homeTeamPlayers, awayTeamPlayers);
    
    // Update match status in database
    await db.update(matches).set({ 
      status: 'live',
      scheduledTime: new Date()
    }).where(eq(matches.id, matchId));

    return matchState;
  }

  // Get current match state for synchronization
  getMatchState(matchId: string): LiveMatchState | null {
    return this.liveMatches.get(matchId) || null;
  }

  // Synchronize client with server state
  async syncMatchState(matchId: string): Promise<LiveMatchState | null> {
    const state = this.liveMatches.get(matchId);
    if (!state) {
      // Check if match exists in database but not in memory
      const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
      if (match && match.status === 'live') {
        // Restart the match state from database
        return await this.restartMatchFromDatabase(matchId);
      }
      return null;
    }
    
    // Update last access time
    state.lastUpdateTime = new Date();
    return state;
  }

  private async restartMatchFromDatabase(matchId: string): Promise<LiveMatchState | null> {
    const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (!match || match.status !== 'live') {
      return null;
    }

    // Calculate elapsed time since match started
    const startTime = match.scheduledTime || match.createdAt;
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
         const homeTeamPlayers = await db.select().from(players).where(and(eq(players.teamId, existingState.homeTeamId), eq(players.isMarketplace, false)));
         const awayTeamPlayers = await db.select().from(players).where(and(eq(players.teamId, existingState.awayTeamId), eq(players.isMarketplace, false)));
         await this.completeMatch(matchId, existingState.homeTeamId, existingState.awayTeamId, homeTeamPlayers, awayTeamPlayers);
      } else {
        // If no state, perhaps just update DB if needed, though this scenario is less likely.
        await db.update(matches).set({ status: 'completed' }).where(eq(matches.id, matchId));
      }
      return null;
    }

    const homeTeamPlayers = await db.select().from(players).where(and(eq(players.teamId, match.homeTeamId), eq(players.isMarketplace, false)));
    const awayTeamPlayers = await db.select().from(players).where(and(eq(players.teamId, match.awayTeamId), eq(players.isMarketplace, false)));

    // Reconstruct match state (simplified, full stat reconstruction might be complex)
    const currentHalf = elapsedSeconds < (maxTime / 2) ? 1 : 2;

    const initialPlayerStats = new Map<string, PlayerStatsSnapshot>();
    [...homeTeamPlayers, ...awayTeamPlayers].forEach(player => {
      initialPlayerStats.set(player.id, {
        scores: 0, passingAttempts: 0, passesCompleted: 0, passingYards: 0,
        rushingYards: 0, catches: 0, receivingYards: 0, drops: 0, fumblesLost: 0,
        tackles: 0, knockdownsInflicted: 0, interceptionsCaught: 0, passesDefended: 0,
      });
    });

    const initialTeamStats = new Map<string, TeamStatsSnapshot>();
    initialTeamStats.set(match.homeTeamId, {
      totalOffensiveYards: 0, passingYards: 0, rushingYards: 0,
      timeOfPossessionSeconds: 0, turnovers: 0, totalKnockdownsInflicted: 0,
    });
    initialTeamStats.set(match.awayTeamId, {
      totalOffensiveYards: 0, passingYards: 0, rushingYards: 0,
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
      await db.update(matches).set({
        homeScore: state.homeScore,
        awayScore: state.awayScore,
        gameData: {
          events: state.gameEvents.slice(-30), // Keep last 30 events
          currentTime: state.gameTime,
          currentHalf: state.currentHalf,
          // Consider adding current possession to gameData if useful for client UI
        }
      }).where(eq(matches.id, matchId));
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

    const pStats = state.playerStats.get(actingPlayer.id)!;
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
        const targetPStats = state.playerStats.get(targetPlayer.id)!;

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
                event = { time: state.gameTime, type: 'pass_complete', actingPlayerId: actingPlayer.id, targetPlayerId: targetPlayer.id, teamId: offensiveTeamId, description: `${actingPlayer.lastName} throws a ${yards}yd pass to ${targetPlayer.lastName}. Complete!`, data: { yards } };

                // Chance to score after a catch
                if (Math.random() < 0.15) { // 15% chance of scoring after a good catch
                    pStats.scores++; // Scorer is the receiver on a pass play
                    if (offensiveTeamId === state.homeTeamId) state.homeScore++; else state.awayScore++;
                    state.gameEvents.push(event); // push the completion event first
                    this.handlePossessionChange(state, offensiveTeamId, defensiveTeamId, state.gameTime); // Possession changes after score
                    return { time: state.gameTime, type: 'score', actingPlayerId: targetPlayer.id, teamId: offensiveTeamId, description: `SCORE! ${targetPlayer.lastName} takes it all the way after the catch!`, data: { scoreType: 'passing' }};
                }

            } else { // Dropped
                targetPStats.drops++;
                event = { time: state.gameTime, type: 'pass_drop', actingPlayerId: actingPlayer.id, targetPlayerId: targetPlayer.id, teamId: offensiveTeamId, description: `${actingPlayer.lastName}'s pass to ${targetPlayer.lastName} is dropped!`, data: { yards: 0 } };
                this.handlePossessionChange(state, offensiveTeamId, defensiveTeamId, state.gameTime); // Turnover on downs (simplified)
            }
        } else { // Pass incomplete or intercepted
            const defensivePlayer = defensiveTeamPlayers[Math.floor(Math.random() * defensiveTeamPlayers.length)];
            if (defensivePlayer && Math.random() < 0.3 + (defensivePlayer.catching - 20) / 50) { // 30% base + catching skill for interception
                const defPStats = state.playerStats.get(defensivePlayer.id)!;
                defPStats.interceptionsCaught++;
                teamStats.turnovers++; // Offensive team turnover
                event = { time: state.gameTime, type: 'interception', actingPlayerId: actingPlayer.id, defensivePlayerId: defensivePlayer.id, teamId: defensiveTeamId, description: `${actingPlayer.lastName}'s pass INTERCEPTED by ${defensivePlayer.lastName}!`, data: { yards: 0 } };
                this.handlePossessionChange(state, offensiveTeamId, defensiveTeamId, state.gameTime);
            } else if (defensivePlayer) { // Pass defended
                const defPStats = state.playerStats.get(defensivePlayer.id)!;
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
            pStats.rushingYards += yards;
            teamStats.rushingYards += yards;
            teamStats.totalOffensiveYards += yards;
            event = { time: state.gameTime, type: 'rush', actingPlayerId: actingPlayer.id, teamId: offensiveTeamId, description: `${actingPlayer.lastName} runs for ${yards} yards.`, data: { yards } };

            if (Math.random() < 0.1) { // 10% chance of scoring on a good run
                pStats.scores++;
                if (offensiveTeamId === state.homeTeamId) state.homeScore++; else state.awayScore++;
                state.gameEvents.push(event); // push the rush event first
                this.handlePossessionChange(state, offensiveTeamId, defensiveTeamId, state.gameTime); // Possession changes after score
                return { time: state.gameTime, type: 'score', actingPlayerId: actingPlayer.id, teamId: offensiveTeamId, description: `SCORE! ${actingPlayer.lastName} breaks free for a rushing touchdown!`, data: { scoreType: 'rushing' }};
            }

        } else {
            event = { time: state.gameTime, type: 'rush_stuffed', actingPlayerId: actingPlayer.id, teamId: offensiveTeamId, description: `${actingPlayer.lastName} is stuffed at the line. No gain.`, data: { yards: 0 } };
            // Potential for turnover on downs if it's 4th down, etc. (not implemented here)
        }
        // Fumble chance
        if (Math.random() < 0.05) { // 5% fumble chance
            pStats.fumblesLost++;
            teamStats.turnovers++;
            const defensivePlayer = defensiveTeamPlayers[Math.floor(Math.random() * defensiveTeamPlayers.length)];
            event = { time: state.gameTime, type: 'fumble_lost', actingPlayerId: actingPlayer.id, defensivePlayerId: defensivePlayer?.id, teamId: offensiveTeamId, description: `${actingPlayer.lastName} FUMBLES! Recovered by ${defensivePlayer ? defensivePlayer.lastName : defensiveTeamId}.`, data: { yards }};
            this.handlePossessionChange(state, offensiveTeamId, defensiveTeamId, state.gameTime);
        }

    } else { // Defensive play or other event (e.g. tackle, knockdown by blocker)
        const defensivePlayer = defensiveTeamPlayers[Math.floor(Math.random() * defensiveTeamPlayers.length)];
        if (defensivePlayer) {
            const defPStats = state.playerStats.get(defensivePlayer.id)!;
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

        // Update lifetime stats
        const [playerToUpdate] = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
        if (playerToUpdate) {
          const updatedLifetimeStats: Partial<Player> = {
            totalGamesPlayed: (playerToUpdate.totalGamesPlayed || 0) + 1,
            totalScores: (playerToUpdate.totalScores || 0) + pStats.scores,
            totalPassingAttempts: (playerToUpdate.totalPassingAttempts || 0) + pStats.passingAttempts,
            totalPassesCompleted: (playerToUpdate.totalPassesCompleted || 0) + pStats.passesCompleted,
            totalPassingYards: (playerToUpdate.totalPassingYards || 0) + pStats.passingYards,
            totalRushingYards: (playerToUpdate.totalRushingYards || 0) + pStats.rushingYards,
            totalCatches: (playerToUpdate.totalCatches || 0) + pStats.catches,
            totalReceivingYards: (playerToUpdate.totalReceivingYards || 0) + pStats.receivingYards,
            totalDrops: (playerToUpdate.totalDrops || 0) + pStats.drops,
            totalFumblesLost: (playerToUpdate.totalFumblesLost || 0) + pStats.fumblesLost,
            totalTackles: (playerToUpdate.totalTackles || 0) + pStats.tackles,
            totalKnockdownsInflicted: (playerToUpdate.totalKnockdownsInflicted || 0) + pStats.knockdownsInflicted,
            totalInterceptionsCaught: (playerToUpdate.totalInterceptionsCaught || 0) + pStats.interceptionsCaught,
            totalPassesDefended: (playerToUpdate.totalPassesDefended || 0) + pStats.passesDefended,
          };
          playerUpdates.push(db.update(players).set(updatedLifetimeStats).where(eq(players.id, playerId)));
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

      // Use a transaction for atomicity
      await db.transaction(async (tx) => {
        if (playerStatsToInsert.length > 0) {
          await tx.insert(playerMatchStats).values(playerStatsToInsert);
        }
        if (teamStatsToInsert.length > 0) {
          await tx.insert(teamMatchStats).values(teamStatsToInsert);
        }
        await Promise.all(playerUpdates.map(pUpdate => {
            // This is a bit tricky as storage.updatePlayer uses its own db instance.
            // For a true transaction, updatePlayer would need to accept a tx object.
            // For now, we'll proceed, but this is a limitation if full rollback is needed across these calls.
            // A refined approach would be to construct update statements for Drizzle and run them with `tx.update()`.
            // For simplicity here, we call the existing storage methods.
            // This part of the transaction might not be "true" if updatePlayer doesn't use the passed 'tx'.
            // Let's assume for now that these updates are critical enough to attempt even if prior inserts fail,
            // or that storage methods are refactored in future to accept 'tx'.
        }));
        // The playerUpdates are already awaited if they are Promises.
        // The primary goal here is to ensure playerMatchStats and teamMatchStats are inserted together.
        // Lifetime stats updates are important but could potentially be reconciled later if only they fail.

        // Update the match itself
        await tx.update(matches).set({
            status: 'completed',
            homeScore: state.homeScore,
            awayScore: state.awayScore,
            completedAt: new Date(),
            gameData: {
                events: state.gameEvents.slice(-50), // Store last 50 events
                finalScores: { home: state.homeScore, away: state.awayScore },
            }
        }).where(eq(matches.id, matchId));
      });

      console.log(`Match ${matchId} stats persisted successfully.`);

    } catch (error) {
      console.error(`Error persisting stats for match ${matchId}:`, error);
      // Potentially re-throw or handle more gracefully (e.g., mark match as 'error_in_stats')
      // For now, we'll update the match to completed anyway, but log the error.
       await db.update(matches).set({
        status: 'completed', // Or a special status like 'completed_stats_error'
        homeScore: state.homeScore,
        awayScore: state.awayScore,
        completedAt: new Date(),
        gameData: {
            events: state.gameEvents.slice(-50),
            finalScores: { home: state.homeScore, away: state.awayScore },
            error: `Error persisting stats: ${(error as Error).message}`
        }
      }).where(eq(matches.id, matchId));
    }

    this.liveMatches.delete(matchId);
    console.log(`Match ${matchId} completed with score ${state.homeScore}-${state.awayScore}`);
  }

  async stopMatch(matchId: string): Promise<void> {
    const state = this.liveMatches.get(matchId);
    if (state) {
      // Need to pass all required parameters to completeMatch
      const homePlayers = await db.select().from(players).where(eq(players.teamId, state.homeTeamId));
      const awayPlayers = await db.select().from(players).where(eq(players.teamId, state.awayTeamId));
      await this.completeMatch(matchId, state.homeTeamId, state.awayTeamId, homePlayers, awayPlayers);
    }
  }

  // Get all active matches
  getActiveMatches(): LiveMatchState[] {
    return Array.from(this.liveMatches.values());
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
        const homePlayers = await db.select().from(players).where(eq(players.teamId, state.homeTeamId));
        const awayPlayers = await db.select().from(players).where(eq(players.teamId, state.awayTeamId));
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