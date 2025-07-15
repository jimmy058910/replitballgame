// Demo component showing Event Bus and Deterministic Simulation
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Zap,
  Play,
  Pause,
  RotateCcw,
  Trophy,
  Heart,
  Brain
} from 'lucide-react';
import { useGameEvent, useEventHistory, useGameEventEmitter } from '@/hooks/useGameEvents';
import { useEnhancedMatchStore } from '@/stores/enhancedMatchStore';
import { DeterministicSimulation } from '../../../shared/deterministicSimulation';
import { GameEventBus } from '../../../shared/gameEventBus';

export function GameEventDemo() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1000);
  const eventHistory = useEventHistory(undefined, 10);
  const { emitEvent } = useGameEventEmitter();
  
  const {
    activeMatch,
    setActiveMatch,
    simulateNextPlay,
    startDeterministicMatch,
    subscribeToEvents,
    unsubscribeFromEvents,
    selectStaminaPct,
    selectTeamScore
  } = useEnhancedMatchStore();

  // Subscribe to events on mount
  useEffect(() => {
    subscribeToEvents();
    return () => unsubscribeFromEvents();
  }, [subscribeToEvents, unsubscribeFromEvents]);

  // Listen for specific events
  useGameEvent('player.injured', (event) => {
    console.log('Player injured:', event);
  });

  useGameEvent('match.score', (event) => {
    console.log('Score event:', event);
  });

  useGameEvent('player.progression', (event) => {
    console.log('Player progression:', event);
  });

  // Demo match data
  const createDemoMatch = () => {
    const demoMatch = {
      id: 1,
      homeTeam: {
        id: 101,
        name: 'Fire Dragons',
        score: 0,
        players: [
          { id: 1, name: 'Alex Thunder', stamina: 85, maxStamina: 100, isInjured: false, position: 'QB', stats: { scores: 0, tackles: 0, interceptions: 0, passingYards: 0, rushingYards: 0 } },
          { id: 2, name: 'Mike Blitz', stamina: 92, maxStamina: 100, isInjured: false, position: 'RB', stats: { scores: 0, tackles: 0, interceptions: 0, passingYards: 0, rushingYards: 0 } },
          { id: 3, name: 'Sarah Strike', stamina: 88, maxStamina: 100, isInjured: false, position: 'WR', stats: { scores: 0, tackles: 0, interceptions: 0, passingYards: 0, rushingYards: 0 } }
        ]
      },
      awayTeam: {
        id: 102,
        name: 'Storm Eagles',
        score: 0,
        players: [
          { id: 4, name: 'Jake Storm', stamina: 90, maxStamina: 100, isInjured: false, position: 'QB', stats: { scores: 0, tackles: 0, interceptions: 0, passingYards: 0, rushingYards: 0 } },
          { id: 5, name: 'Lisa Bolt', stamina: 87, maxStamina: 100, isInjured: false, position: 'RB', stats: { scores: 0, tackles: 0, interceptions: 0, passingYards: 0, rushingYards: 0 } },
          { id: 6, name: 'Tom Wing', stamina: 95, maxStamina: 100, isInjured: false, position: 'WR', stats: { scores: 0, tackles: 0, interceptions: 0, passingYards: 0, rushingYards: 0 } }
        ]
      },
      gameTime: 0,
      status: 'in_progress' as const,
      events: []
    };
    
    setActiveMatch(demoMatch);
    startDeterministicMatch(101, 102, new Date());
  };

  // Simulation control
  const startSimulation = () => {
    if (!activeMatch) {
      createDemoMatch();
    }
    setIsSimulating(true);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    createDemoMatch();
  };

  // Auto-simulate plays
  useEffect(() => {
    if (!isSimulating || !activeMatch) return;

    const interval = setInterval(() => {
      simulateNextPlay();
      
      // Stop if game time exceeds 3600 seconds (1 hour)
      if (activeMatch.gameTime > 3600) {
        setIsSimulating(false);
      }
    }, simulationSpeed);

    return () => clearInterval(interval);
  }, [isSimulating, activeMatch, simulateNextPlay, simulationSpeed]);

  // Manual event triggers for demo
  const triggerDemoEvents = () => {
    if (!activeMatch) return;

    const player = activeMatch.homeTeam.players[0];
    
    // Trigger injury event
    emitEvent(GameEventBus.createInjuryEvent(
      player.id,
      activeMatch.homeTeam.id,
      {
        injuryType: 'strain',
        severity: 'minor',
        estimatedRecovery: 3,
        cause: 'demo_trigger'
      }
    ));

    // Trigger progression event
    emitEvent(GameEventBus.createProgressionEvent(
      player.id,
      activeMatch.homeTeam.id,
      {
        attribute: 'speed',
        oldValue: 75,
        newValue: 76,
        reason: 'training_improvement'
      }
    ));

    // Trigger economic event
    emitEvent(GameEventBus.createEconomicEvent(
      1,
      activeMatch.homeTeam.id,
      {
        amount: 5000,
        currency: 'credits',
        category: 'match_bonus',
        description: 'Performance bonus for good play'
      }
    ));
  };

  // Test deterministic simulation
  const testDeterministicSimulation = () => {
    const seed = 'test-seed-123';
    const results = [];
    
    for (let i = 0; i < 3; i++) {
      const context = DeterministicSimulation.createMatchContext(101, 102, new Date('2025-01-01'));
      const result = {
        roll1: context.roll('test_roll_1'),
        roll2: context.rollInt('test_roll_2', 1, 10),
        choice: context.rollChoice('test_choice', ['A', 'B', 'C'])
      };
      results.push(result);
    }
    
    console.log('Deterministic simulation results:', results);
    
    // Validate reproducibility
    const isReproducible = DeterministicSimulation.validateReproducibility(
      seed,
      (context) => ({
        roll: context.roll('test'),
        int: context.rollInt('test_int', 1, 100)
      }),
      5
    );
    
    console.log('Simulation is reproducible:', isReproducible);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Game Event Bus & Deterministic Simulation</h2>
        <p className="text-muted-foreground">
          Real-time event system with predictable, seed-based randomness for testing
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Match Simulation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Live Match Simulation
            </CardTitle>
            <CardDescription>
              Deterministic match with real-time events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeMatch ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-center">
                    <div className="font-bold text-lg">{activeMatch.homeTeam.name}</div>
                    <div className="text-2xl font-bold text-blue-600">{selectTeamScore(activeMatch.homeTeam.id)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Game Time</div>
                    <div className="font-mono">{Math.floor(activeMatch.gameTime / 60)}:{(activeMatch.gameTime % 60).toString().padStart(2, '0')}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg">{activeMatch.awayTeam.name}</div>
                    <div className="text-2xl font-bold text-red-600">{selectTeamScore(activeMatch.awayTeam.id)}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Player Stamina</h4>
                  {activeMatch.homeTeam.players.slice(0, 3).map(player => (
                    <div key={player.id} className="flex items-center gap-2">
                      <span className="text-sm w-24">{player.name}</span>
                      <Progress value={selectStaminaPct(player.id)} className="flex-1" />
                      <span className="text-sm w-12">{Math.round(selectStaminaPct(player.id))}%</span>
                      {player.isInjured && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={isSimulating ? stopSimulation : startSimulation}
                    size="sm"
                    variant={isSimulating ? "destructive" : "default"}
                  >
                    {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isSimulating ? 'Pause' : 'Start'}
                  </Button>
                  <Button onClick={resetSimulation} size="sm" variant="outline">
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No active match</p>
                <Button onClick={createDemoMatch}>
                  Create Demo Match
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Event History
            </CardTitle>
            <CardDescription>
              Real-time game events (last 10)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {eventHistory.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No events yet</p>
              ) : (
                eventHistory.map((event, index) => (
                  <div key={`${event.id}-${index}`} className="flex items-center justify-between p-2 rounded border">
                    <div className="flex items-center gap-2">
                      {event.type === 'player.injured' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      {event.type === 'match.score' && <Trophy className="w-4 h-4 text-yellow-500" />}
                      {event.type === 'player.progression' && <TrendingUp className="w-4 h-4 text-green-500" />}
                      {event.type === 'player.stamina' && <Heart className="w-4 h-4 text-blue-500" />}
                      {event.type === 'economy.transaction' && <Brain className="w-4 h-4 text-purple-500" />}
                      <span className="text-sm font-medium">{event.type}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {event.timestamp.toLocaleTimeString()}
                    </Badge>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-4 flex gap-2">
              <Button onClick={triggerDemoEvents} size="sm" variant="outline">
                <Zap className="w-4 h-4" />
                Trigger Demo Events
              </Button>
              <Button onClick={testDeterministicSimulation} size="sm" variant="outline">
                <RotateCcw className="w-4 h-4" />
                Test Deterministic
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}