/**
 * @file newMatchEngine.ts
 * @description The new, unified, event-driven match simulation engine for Realm Rivalry.
 * This engine will generate a stream of prioritized events based on detailed player/team stats and tactics.
 */

import { Player, Team, Stadium } from '@prisma/client';
import {
  LiveMatchState,
  MatchEvent,
  FieldPlayer,
  PlayerMatchStats,
  TeamMatchStats,
  EVENT_PRIORITIES,
  MATCH_EVENT_TYPES,
  EventPriority,
  MatchEventType
} from '../../shared/types/LiveMatchState';
import { DeterministicRNG } from '../utils/deterministicRNG';
import { InternalMatchState, InternalPlayerState } from './matchEngineTypes';
import { newCommentaryService } from './newCommentaryService';

// --- The New Match Engine Class ---

class NewMatchEngine {
  private state: InternalMatchState;

  constructor(homeTeam: Team & { players: Player[] }, awayTeam: Team & { players: Player[] }, matchId: string) {
    this.state = this.initializeMatchState(homeTeam, awayTeam, matchId);
  }

  /**
   * Initializes the full internal state for the match simulation.
   */
  private initializeMatchState(homeTeam: Team & { players: Player[] }, awayTeam: Team & { players: Player[] }, matchId: string): InternalMatchState {
    const rng = new DeterministicRNG(matchId);

    const createPlayerStateMap = (players: Player[]): Map<string, InternalPlayerState> => {
        const playerMap = new Map<string, InternalPlayerState>();
        players.forEach(p => {
            playerMap.set(p.id.toString(), {
                id: p.id.toString(),
                name: `${p.firstName} ${p.lastName}`,
                role: p.role as any || 'Runner',
                baseStats: {
                    speed: p.speed || 20,
                    power: p.power || 20,
                    throwing: p.throwing || 20,
                    catching: p.catching || 20,
                    kicking: p.kicking || 20,
                    stamina: p.staminaAttribute || 30,
                    agility: p.agility || 20,
                    leadership: p.leadership || 20,
                },
                race: p.race || 'Human',
                skills: [], // TODO: Populate from DB

                onField: false,
                currentStamina: p.staminaAttribute || 30,
                position: { x: 0, y: 0 },
                fatiguePenalty: 0,
                activeBonuses: {},

                stats: {
                    playerId: p.id.toString(),
                    minutesPlayed: 0,
                    scores: 0,
                    assists: 0,
                    tackles: 0,
                    interceptions: 0,
                    passAttempts: 0,
                    passCompletions: 0,
                    staminaUsed: 0,
                    injuries: 0,
                }
            });
        });
        return playerMap;
    };

    const homePlayers = createPlayerStateMap(homeTeam.players);
    const awayPlayers = createPlayerStateMap(awayTeam.players);

    // Select the first 6 players to be on the field
    const homeOnField = Array.from(homePlayers.keys()).slice(0, 6);
    const awayOnField = Array.from(awayPlayers.keys()).slice(0, 6);

    homeOnField.forEach(id => {
        const player = homePlayers.get(id);
        if (player) player.onField = true;
    });
    awayOnField.forEach(id => {
        const player = awayPlayers.get(id);
        if (player) player.onField = true;
    });

    return {
      matchId,
      rng,
      gameTime: 0,
      maxTime: 2400, // 40 minutes for a standard league match
      homeTeam: { id: homeTeam.id.toString(), players: homePlayers, onField: homeOnField },
      awayTeam: { id: awayTeam.id.toString(), players: awayPlayers, onField: awayOnField },
      possession: 'home',
      gamePhase: 'early',
    };
  }

  /**
   * Advances the simulation by one tick and returns the generated event.
   */
  public simulateTick(): MatchEvent {
    // 1. Update game phase and other time-based states
    this.updateGamePhase();

    // 2. Determine the action to be simulated (e.g., run, pass, defense)
    const action = this.determineNextAction();

    // 3. Generate the event based on the action and player stats
    const event = this.generateEventForAction(action);

    // 4. Apply the outcome of the event to the internal state
    this.applyEventOutcome(event);

    // 5. Update player stamina and other per-tick effects
    this.updatePlayerStamina();

    return event;
  }

  /**
   * Updates the game phase based on the current game time.
   */
  private updateGamePhase(): void {
    const timePercent = this.state.gameTime / this.state.maxTime;
    if (timePercent < 0.25) this.state.gamePhase = "early";
    else if (timePercent < 0.75) this.state.gamePhase = "middle";
    else if (timePercent < 0.9) this.state.gamePhase = "late";
    else this.state.gamePhase = "clutch";
  }

  /**
   * Determines the next logical action based on possession, player roles, and tactics.
   */
  private determineNextAction(): string {
    // TODO: Implement sophisticated action determination logic.
    // This will consider player roles, team tactics, game phase, score, etc.
    const actions = ['run', 'pass', 'kick', 'defense'];
    return this.state.rng.choice(actions);
  }

  /**
   * Generates a detailed MatchEvent for a given action.
   * This is the core of the simulation logic.
   */
  private generateEventForAction(action: string): MatchEvent {
    let event: MatchEvent;

    switch (action) {
        case 'run':
            event = this.resolveRunAction();
            break;
        case 'pass':
            // event = this.resolvePassAction();
            // break;
        case 'kick':
            // event = this.resolveKickAction();
            // break;
        case 'defense':
            // event = this.resolveDefenseAction();
            // break;
        default:
            event = this.createDefaultEvent();
            break;
    }

    return event;
  }

  private createDefaultEvent(): MatchEvent {
      return {
        id: `evt_${this.state.rng.next()}`,
        timestamp: this.state.gameTime,
        tick: this.state.gameTime,
        type: MATCH_EVENT_TYPES.ROUTINE_PLAY,
        description: 'A moment of calm on the field.',
        priority: EVENT_PRIORITIES.DOWNTIME,
        stats: {},
      };
  }

  private resolveRunAction(): MatchEvent {
    const possessingTeam = this.state.possession === 'home' ? this.state.homeTeam : this.state.awayTeam;
    const defendingTeam = this.state.possession === 'home' ? this.state.awayTeam : this.state.homeTeam;

    // Select a runner, prioritizing players with the 'Runner' role
    const runners = possessingTeam.onField.map(id => possessingTeam.players.get(id)!).filter(p => p.role === 'Runner');
    const runner = runners.length > 0 ? this.state.rng.choice(runners) : possessingTeam.players.get(this.state.rng.choice(possessingTeam.onField));

    if (!runner) return this.createDefaultEvent();

    const runnerStats = this.calculateEffectiveStats(runner);
    const defensePower = defendingTeam.onField
        .map(id => this.calculateEffectiveStats(defendingTeam.players.get(id)!))
        .reduce((sum, p) => sum + p.power + p.tackles, 0) / defendingTeam.onField.length;

    // --- Outcome Calculation ---
    const powerContest = runnerStats.power - defensePower;
    const speedContest = runnerStats.speed - (defensePower / 2);

    let yardsGained = 0;
    if (this.state.rng.next() * 100 < 50 + powerContest) { // Base 50% chance to succeed
        yardsGained = Math.floor(2 + (speedContest / 5) + this.state.rng.next() * 5);
    } else {
        yardsGained = Math.floor(this.state.rng.next() * 3); // Stuffed at the line
    }
    yardsGained = Math.max(0, yardsGained);

    let eventType: MatchEventType = MATCH_EVENT_TYPES.ROUTINE_PLAY;
    let priority: EventPriority = EVENT_PRIORITIES.STANDARD;
    let isScore = false;
    let isBreakaway = false;

    // Check for breakaway run
    if (yardsGained >= 12 && runnerStats.speed > 30) {
        isBreakaway = true;
        priority = EVENT_PRIORITIES.IMPORTANT;
    }

    // Check for score (more likely on breakaways)
    const scoreChance = isBreakaway ? 0.4 : 0.05;
    if (this.state.rng.next() < scoreChance) {
        isScore = true;
        eventType = MATCH_EVENT_TYPES.SCORE;
        priority = EVENT_PRIORITIES.CRITICAL;
    }

    const playerStatsUpdate = [{
        id: runner.id,
        team: this.state.possession,
        rushingAttempts: 1,
        rushingYards: yardsGained,
        breakawayRuns: isBreakaway ? 1 : 0,
        scores: isScore ? 1 : 0,
    }];

    const event: MatchEvent = {
        id: `evt_${this.state.rng.next()}`,
        timestamp: this.state.gameTime,
        tick: this.state.gameTime,
        type: eventType,
        description: '', // Will be filled by the commentary service
        priority: priority,
        playersInvolved: [runner.id],
        stats: {
            playerStats: playerStatsUpdate,
            turnover: false, // No turnover on a standard run
        },
    };

    event.description = newCommentaryService.generateCommentary(event, this.state);

    return event;
  }

  /**
   * Calculates the effective stats of a player for a given action,
   * including base stats, bonuses, penalties, and fatigue.
   */
  private calculateEffectiveStats(player: InternalPlayerState): Record<string, number> {
    const effectiveStats = { ...player.baseStats };

    // Apply active bonuses (from tactics, items, etc.)
    for (const [stat, bonus] of Object.entries(player.activeBonuses)) {
        if (effectiveStats[stat as keyof typeof effectiveStats] !== undefined) {
            effectiveStats[stat as keyof typeof effectiveStats] += bonus;
        }
    }

    // Apply racial bonuses from the user's spec
    switch (player.race.toLowerCase()) {
        case 'sylvan':
            effectiveStats.speed += 2;
            effectiveStats.agility += 3;
            break;
        case 'gryll':
            effectiveStats.power += 4;
            effectiveStats.stamina += 2;
            effectiveStats.speed -= 1;
            break;
        case 'lumina':
            effectiveStats.throwing += 3;
            effectiveStats.leadership += 2;
            break;
        case 'umbra':
            // Enhanced speed and agility are context-dependent, will be handled in action resolution
            break;
        case 'human':
            // Adaptable, no specific bonuses here
            break;
    }

    // Apply fatigue penalty
    const fatigueMultiplier = 1 - player.fatiguePenalty;
    effectiveStats.speed *= fatigueMultiplier;
    effectiveStats.agility *= fatigueMultiplier;
    effectiveStats.power *= (fatigueMultiplier * 0.5 + 0.5); // Power is less affected by fatigue

    return effectiveStats;
  }

  /**
   * Updates the internal match state based on the outcome of an event.
   */
  private applyEventOutcome(event: MatchEvent): void {
    if (event.stats) {
        const stats = event.stats as any;

        // Update player stats
        if (stats.playerStats) {
            for (const pStat of stats.playerStats) {
                const team = pStat.team === 'home' ? this.state.homeTeam : this.state.awayTeam;
                const player = team.players.get(pStat.id);
                if (player) {
                    player.stats.rushingAttempts += pStat.rushingAttempts || 0;
                    player.stats.rushingYards += pStat.rushingYards || 0;
                    player.stats.passAttempts += pStat.passAttempts || 0;
                    player.stats.passCompletions += pStat.passCompletions || 0;
                    player.stats.passingYards += pStat.passingYards || 0;
                    player.stats.scores += pStat.scores || 0;
                    // ... add other stats as they are implemented
                }
            }
        }

        // Handle possession change
        if (stats.turnover) {
            this.state.possession = this.state.possession === 'home' ? 'away' : 'home';
        }
    }

    // Advance game time. The amount of time depends on the event's priority.
    // This simulates the "speed control" system.
    // Critical events (priority 1) use more "real time" per play.
    const timeToAdvance = 5 + (4 - event.priority.priority) * 5; // Critical (1) = 20s, Downtime (4) = 5s
    this.state.gameTime += timeToAdvance;
  }

  /**
   * Applies stamina drain to all players on the field.
   */
  private updatePlayerStamina(): void {
    const allPlayers = [...this.state.homeTeam.players.values(), ...this.state.awayTeam.players.values()];

    allPlayers.forEach(player => {
        if (!player.onField) return;

        let staminaDrain = 1.0; // Base drain per tick

        // Modify drain based on role
        if (player.role === 'Runner' || player.role === 'Passer') {
            staminaDrain *= 1.5;
        }

        // Racial modifiers
        if (player.race.toLowerCase() === 'sylvan' && this.state.rng.next() < 0.1) {
            player.currentStamina = Math.min(player.baseStats.stamina, player.currentStamina + 2); // Photosynthesis
        }
        if (player.race.toLowerCase() === 'gryll') {
            staminaDrain *= 0.9; // More durable
        }

        player.currentStamina = Math.max(0, player.currentStamina - staminaDrain);

        // Calculate fatigue penalty based on spec
        if (player.currentStamina < 20) {
            const staminaDeficit = 20 - player.currentStamina;
            player.fatiguePenalty = (staminaDeficit / 20) * 0.5; // Up to 50% penalty at 0 stamina
        } else {
            player.fatiguePenalty = 0;
        }
    });
  }
}

export { NewMatchEngine };
