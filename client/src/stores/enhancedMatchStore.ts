// Enhanced Match Store with Event Bus and Deterministic Simulation
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { gameEventBus, GameEventBus, ScoreEvent, InjuryEvent } from '../../../shared/gameEventBus';
import { DeterministicSimulation, SimulationContext } from '../../../shared/deterministicSimulation';

interface Player {
  id: number;
  name: string;
  stamina: number;
  maxStamina: number;
  isInjured: boolean;
  position: string;
  stats: {
    scores: number;
    tackles: number;
    interceptions: number;
    passingYards: number;
    rushingYards: number;
  };
}

interface Team {
  id: number;
  name: string;
  score: number;
  players: Player[];
}

interface Match {
  id: number;
  homeTeam: Team;
  awayTeam: Team;
  gameTime: number;
  status: 'pending' | 'in_progress' | 'completed';
  events: Array<{
    type: string;
    timestamp: number;
    description: string;
  }>;
}

interface MatchState {
  matches: Match[];
  activeMatch: Match | null;
  isConnected: boolean;
  simulationContext: SimulationContext | null;
  
  // Computed selectors
  selectStaminaPct: (playerId: number) => number;
  selectPlayerStats: (playerId: number) => Player['stats'] | null;
  selectTeamScore: (teamId: number) => number;
  selectMatchEvents: (matchId: number) => Match['events'];
  
  // Actions
  setActiveMatch: (match: Match) => void;
  updateMatchState: (matchId: number, updates: Partial<Match>) => void;
  addMatchEvent: (matchId: number, event: Match['events'][0]) => void;
  updatePlayerStamina: (playerId: number, stamina: number) => void;
  updatePlayerStats: (playerId: number, stats: Partial<Player['stats']>) => void;
  
  // Simulation actions
  startDeterministicMatch: (homeTeamId: number, awayTeamId: number, matchDate: Date) => void;
  simulateNextPlay: () => void;
  
  // Event handling
  subscribeToEvents: () => void;
  unsubscribeFromEvents: () => void;
}

export const useEnhancedMatchStore = create<MatchState>()(
  immer((set, get) => ({
    matches: [],
    activeMatch: null,
    isConnected: false,
    simulationContext: null,
    
    // Computed selectors
    selectStaminaPct: (playerId: number) => {
      const state = get();
      const match = state.activeMatch;
      if (!match) return 0;
      
      const player = [...match.homeTeam.players, ...match.awayTeam.players]
        .find(p => p.id === playerId);
      
      return player ? (player.stamina / player.maxStamina) * 100 : 0;
    },
    
    selectPlayerStats: (playerId: number) => {
      const state = get();
      const match = state.activeMatch;
      if (!match) return null;
      
      const player = [...match.homeTeam.players, ...match.awayTeam.players]
        .find(p => p.id === playerId);
      
      return player?.stats || null;
    },
    
    selectTeamScore: (teamId: number) => {
      const state = get();
      const match = state.activeMatch;
      if (!match) return 0;
      
      if (match.homeTeam.id === teamId) return match.homeTeam.score;
      if (match.awayTeam.id === teamId) return match.awayTeam.score;
      return 0;
    },
    
    selectMatchEvents: (matchId: number) => {
      const state = get();
      const match = state.matches.find(m => m.id === matchId);
      return match?.events || [];
    },
    
    // Actions
    setActiveMatch: (match: Match) => {
      set(state => {
        state.activeMatch = match;
        
        // Create simulation context for this match
        if (match.status === 'in_progress') {
          state.simulationContext = DeterministicSimulation.createMatchContext(
            match.homeTeam.id,
            match.awayTeam.id,
            new Date()
          );
        }
      });
    },
    
    updateMatchState: (matchId: number, updates: Partial<Match>) => {
      set(state => {
        const matchIndex = state.matches.findIndex(m => m.id === matchId);
        if (matchIndex >= 0) {
          Object.assign(state.matches[matchIndex], updates);
        }
        
        if (state.activeMatch?.id === matchId) {
          Object.assign(state.activeMatch, updates);
        }
      });
    },
    
    addMatchEvent: (matchId: number, event: Match['events'][0]) => {
      set(state => {
        const matchIndex = state.matches.findIndex(m => m.id === matchId);
        if (matchIndex >= 0) {
          state.matches[matchIndex].events.push(event);
        }
        
        if (state.activeMatch?.id === matchId) {
          state.activeMatch.events.push(event);
        }
      });
    },
    
    updatePlayerStamina: (playerId: number, stamina: number) => {
      set(state => {
        const match = state.activeMatch;
        if (!match) return;
        
        const updatePlayerInTeam = (team: Team) => {
          const player = team.players.find(p => p.id === playerId);
          if (player) {
            const oldStamina = player.stamina;
            player.stamina = Math.max(0, Math.min(player.maxStamina, stamina));
            
            // Emit stamina event
            gameEventBus.emitGameEvent({
              id: `stamina_${Date.now()}_${playerId}`,
              timestamp: new Date(),
              type: 'player.stamina',
              playerId,
              teamId: team.id,
              data: {
                currentStamina: player.stamina,
                maxStamina: player.maxStamina,
                changeAmount: player.stamina - oldStamina,
                reason: 'match_activity'
              }
            });
          }
        };
        
        updatePlayerInTeam(match.homeTeam);
        updatePlayerInTeam(match.awayTeam);
      });
    },
    
    updatePlayerStats: (playerId: number, stats: Partial<Player['stats']>) => {
      set(state => {
        const match = state.activeMatch;
        if (!match) return;
        
        const updatePlayerInTeam = (team: Team) => {
          const player = team.players.find(p => p.id === playerId);
          if (player) {
            Object.assign(player.stats, stats);
          }
        };
        
        updatePlayerInTeam(match.homeTeam);
        updatePlayerInTeam(match.awayTeam);
      });
    },
    
    // Simulation actions
    startDeterministicMatch: (homeTeamId: number, awayTeamId: number, matchDate: Date) => {
      set(state => {
        state.simulationContext = DeterministicSimulation.createMatchContext(
          homeTeamId,
          awayTeamId,
          matchDate
        );
      });
    },
    
    simulateNextPlay: () => {
      const state = get();
      const { simulationContext, activeMatch } = state;
      
      if (!simulationContext || !activeMatch || activeMatch.status !== 'in_progress') {
        return;
      }
      
      // Simulate next play using deterministic randomness
      const playOutcome = simulationContext.rollChoice('play_outcome', [
        'completed_pass',
        'incomplete_pass',
        'rushing_gain',
        'tackle',
        'turnover',
        'score'
      ]);
      
      const playValue = simulationContext.rollInt('play_value', 1, 10);
      
      // Handle play outcome
      switch (playOutcome) {
        case 'score':
          const scoringTeam = simulationContext.rollBool('home_scores', 0.5) 
            ? activeMatch.homeTeam 
            : activeMatch.awayTeam;
          
          const scoringPlayer = simulationContext.rollChoice('scorer', scoringTeam.players);
          
          // Emit score event
          const scoreEvent: ScoreEvent = GameEventBus.createScoreEvent(
            activeMatch.id,
            activeMatch.homeTeam.id,
            activeMatch.awayTeam.id,
            {
              scoringPlayerId: scoringPlayer.id,
              scoringTeamId: scoringTeam.id,
              scoreType: 'touchdown',
              homeScore: scoringTeam.id === activeMatch.homeTeam.id ? activeMatch.homeTeam.score + 7 : activeMatch.homeTeam.score,
              awayScore: scoringTeam.id === activeMatch.awayTeam.id ? activeMatch.awayTeam.score + 7 : activeMatch.awayTeam.score,
              gameTime: activeMatch.gameTime
            }
          );
          
          gameEventBus.emitGameEvent(scoreEvent);
          break;
          
        case 'tackle':
          // Random chance of injury on tackle
          if (simulationContext.rollBool('injury_chance', 0.02)) {
            const injuredPlayer = simulationContext.rollChoice('injured_player', [
              ...activeMatch.homeTeam.players,
              ...activeMatch.awayTeam.players
            ]);
            
            const injuryEvent: InjuryEvent = GameEventBus.createInjuryEvent(
              injuredPlayer.id,
              activeMatch.homeTeam.players.includes(injuredPlayer) ? activeMatch.homeTeam.id : activeMatch.awayTeam.id,
              {
                injuryType: simulationContext.rollChoice('injury_type', ['strain', 'bruise', 'sprain']),
                severity: simulationContext.rollChoice('injury_severity', ['minor', 'moderate']),
                estimatedRecovery: simulationContext.rollInt('recovery_days', 1, 7),
                cause: 'tackle'
              }
            );
            
            gameEventBus.emitGameEvent(injuryEvent);
          }
          break;
      }
      
      // Update game time
      set(state => {
        if (state.activeMatch) {
          state.activeMatch.gameTime += simulationContext.rollInt('time_advance', 30, 120);
        }
      });
    },
    
    // Event handling
    subscribeToEvents: () => {
      gameEventBus.on('match.score', (event: ScoreEvent) => {
        const { updateMatchState } = get();
        
        // Update match scores
        updateMatchState(event.matchId, {
          homeTeam: {
            ...get().activeMatch!.homeTeam,
            score: event.data.homeScore
          },
          awayTeam: {
            ...get().activeMatch!.awayTeam,
            score: event.data.awayScore
          }
        });
      });
      
      gameEventBus.on('player.injured', (event: InjuryEvent) => {
        set(state => {
          const match = state.activeMatch;
          if (!match) return;
          
          const updatePlayerInTeam = (team: Team) => {
            const player = team.players.find(p => p.id === event.playerId);
            if (player) {
              player.isInjured = true;
              player.stamina = Math.max(0, player.stamina - 20); // Injury reduces stamina
            }
          };
          
          updatePlayerInTeam(match.homeTeam);
          updatePlayerInTeam(match.awayTeam);
        });
      });
      
      set(state => {
        state.isConnected = true;
      });
    },
    
    unsubscribeFromEvents: () => {
      gameEventBus.removeAllListeners('match.score');
      gameEventBus.removeAllListeners('player.injured');
      
      set(state => {
        state.isConnected = false;
      });
    }
  }))
);