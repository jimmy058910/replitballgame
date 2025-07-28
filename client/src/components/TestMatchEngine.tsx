import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, Pause, RotateCcw, Clock, Users, Trophy, Zap, Target, Activity, MessageCircle, BarChart3 
} from 'lucide-react';

interface TestMatchEngineProps {
  matchId: string;
  team1?: { id: string; name: string; power: number };
  team2?: { id: string; name: string; power: number };
  onMatchComplete?: () => void;
}

interface TestMatchState {
  status: 'PRE_GAME' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  currentTime: number;
  totalTime: number;
  homeScore: number;
  awayScore: number;
  commentary: string;
  possession: 'home' | 'away';
  phase: 'FIRST_HALF' | 'SECOND_HALF' | 'COMPLETED';
  ballPosition: { x: number; y: number };
  down: number;
  yardsToGo: number;
  fieldPosition: number;
}

interface TestMatchEvent {
  id: string;
  timestamp: string;
  type: 'PASS_COMPLETION' | 'RUN_ATTEMPT' | 'TACKLE' | 'SCORE' | 'POSSESSION_CHANGE' | 'TURNOVER';
  description: string;
  team: 'home' | 'away';
  playerName?: string;
  yards?: number;
}

export function TestMatchEngine({ matchId, team1, team2, onMatchComplete }: TestMatchEngineProps) {
  const [matchState, setMatchState] = useState<TestMatchState>({
    status: 'PRE_GAME',
    currentTime: 0,
    totalTime: 2400, // 40 minutes
    homeScore: 0,
    awayScore: 0,
    commentary: 'Welcome to the realm of competitive fantasy sports!',
    possession: 'home',
    phase: 'FIRST_HALF',
    ballPosition: { x: 50, y: 50 },
    down: 1,
    yardsToGo: 10,
    fieldPosition: 50
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [events, setEvents] = useState<TestMatchEvent[]>([]);
  const [activeTab, setActiveTab] = useState('field');

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && matchState.status === 'IN_PROGRESS') {
      interval = setInterval(() => {
        setMatchState(prev => {
          if (prev.currentTime >= prev.totalTime) {
            // Match complete
            const finalState = {
              ...prev,
              status: 'COMPLETED' as const,
              phase: 'COMPLETED' as const,
              commentary: `Match complete! Final result: ${team1?.name || 'Home'} ${prev.homeScore} - ${prev.awayScore} ${team2?.name || 'Away'}`
            };
            
            setIsPlaying(false);
            if (onMatchComplete) {
              onMatchComplete();
            }
            
            return finalState;
          }

          const newTime = prev.currentTime + 1;
          const newState = { ...prev, currentTime: newTime };

          // Change phase at halftime
          if (newTime === 1200 && prev.phase === 'FIRST_HALF') {
            newState.phase = 'SECOND_HALF';
            newState.commentary = 'Second half underway! Fresh strategies emerge.';
            newState.ballPosition = { x: 50, y: 50 };
            setEvents(prev => [...prev.slice(-9), {
              id: `event-${newTime}`,
              timestamp: `${Math.floor(newTime/60)}'${newTime%60}"`,
              type: 'POSSESSION_CHANGE',
              description: 'Second half begins with renewed intensity',
              team: 'home'
            }]);
          }

          // Generate fantasy sports events every 15-30 seconds
          if (newTime % (15 + Math.random() * 15) < 1) {
            const eventTypes = [
              {
                type: 'PASS_COMPLETION' as const,
                descriptions: [
                  'completes a precise pass through coverage',
                  'finds the receiver in stride',
                  'delivers under pressure for the completion',
                  'threads the needle with pinpoint accuracy'
                ]
              },
              {
                type: 'RUN_ATTEMPT' as const,
                descriptions: [
                  'breaks through the line for solid yardage',
                  'churns forward with determined effort',
                  'finds a gap and explodes through',
                  'powers ahead with aggressive running'
                ]
              },
              {
                type: 'TACKLE' as const,
                descriptions: [
                  'brings down the ball carrier with authority',
                  'makes a crucial defensive stop',
                  'closes quickly and wraps up for the tackle',
                  'displays excellent tackling technique'
                ]
              },
              {
                type: 'POSSESSION_CHANGE' as const,
                descriptions: [
                  'forces a turnover with aggressive defense',
                  'capitalizes on the miscue',
                  'creates pressure and forces the mistake',
                  'takes advantage of the opportunity'
                ]
              }
            ];
            
            const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            const team = Math.random() > 0.5 ? 'home' : 'away';
            const teamName = team === 'home' ? (team1?.name || 'Home') : (team2?.name || 'Away');
            const description = eventType.descriptions[Math.floor(Math.random() * eventType.descriptions.length)];
            const yards = Math.floor(Math.random() * 12) + 3;
            
            newState.commentary = `${teamName} ${description}`;
            
            // Update ball position
            newState.ballPosition = {
              x: 40 + Math.random() * 20,
              y: Math.random() * 80 + 10
            };
            
            // Update down and distance
            if (eventType.type === 'PASS_COMPLETION' || eventType.type === 'RUN_ATTEMPT') {
              if (yards >= newState.yardsToGo) {
                newState.down = 1;
                newState.yardsToGo = 10;
              } else {
                newState.down = Math.min(newState.down + 1, 4);
                newState.yardsToGo = Math.max(newState.yardsToGo - yards, 1);
              }
            }
            
            setEvents(prev => [...prev.slice(-9), {
              id: `event-${newTime}`,
              timestamp: `${Math.floor(newTime/60)}'${newTime%60}"`,
              type: eventType.type,
              description: `${teamName} ${description}`,
              team,
              yards: eventType.type === 'PASS_COMPLETION' || eventType.type === 'RUN_ATTEMPT' ? yards : undefined
            }]);
          }

          // Random scoring every 3-6 minutes
          if (newTime % (180 + Math.random() * 180) < 1) {
            const scorer = Math.random() > 0.5 ? 'home' : 'away';
            const scoringTeam = scorer === 'home' ? (team1?.name || 'Home') : (team2?.name || 'Away');
            
            if (scorer === 'home') {
              newState.homeScore += 1;
              newState.commentary = `Breakthrough! ${scoringTeam} finds the end zone for the score!`;
              setEvents(prev => [...prev.slice(-9), {
                id: `score-${newTime}`,
                timestamp: `${Math.floor(newTime/60)}'${newTime%60}"`,
                type: 'SCORE',
                description: `${scoringTeam} scores! ${newState.homeScore + 1}-${newState.awayScore}`,
                team: scorer
              }]);
            } else {
              newState.awayScore += 1;
              newState.commentary = `Breakthrough! ${scoringTeam} finds the end zone for the score!`;
              setEvents(prev => [...prev.slice(-9), {
                id: `score-${newTime}`,
                timestamp: `${Math.floor(newTime/60)}'${newTime%60}"`,
                type: 'SCORE',
                description: `${scoringTeam} scores! ${newState.homeScore}-${newState.awayScore + 1}`,
                team: scorer
              }]);
            }
            
            // Reset down and distance after score
            newState.down = 1;
            newState.yardsToGo = 10;
            newState.ballPosition = { x: 50, y: 50 };
          }

          return newState;
        });
      }, 100); // Update every 100ms for smooth progress
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, matchState.status, team1?.name, team2?.name, onMatchComplete]);

  const startMatch = () => {
    setMatchState(prev => ({ ...prev, status: 'IN_PROGRESS' }));
    setIsPlaying(true);
  };

  const pauseMatch = () => {
    setIsPlaying(!isPlaying);
    setMatchState(prev => ({ 
      ...prev, 
      status: isPlaying ? 'PAUSED' : 'IN_PROGRESS'
    }));
  };

  const resetMatch = () => {
    setMatchState({
      status: 'PRE_GAME',
      currentTime: 0,
      totalTime: 2400,
      homeScore: 0,
      awayScore: 0,
      commentary: 'Welcome to the realm of competitive fantasy sports!',
      possession: 'home',
      phase: 'FIRST_HALF',
      ballPosition: { x: 50, y: 50 },
      down: 1,
      yardsToGo: 10,
      fieldPosition: 50
    });
    setIsPlaying(false);
    setEvents([]);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (matchState.currentTime / matchState.totalTime) * 100;

  return (
    <div className="space-y-4">
      {/* Match Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="font-bold text-lg">{team1?.name || 'Home Team'}</div>
                <div className="text-2xl font-bold">{matchState.homeScore}</div>
              </div>
              <div className="text-muted-foreground">VS</div>
              <div className="text-center">
                <div className="font-bold text-lg">{team2?.name || 'Away Team'}</div>
                <div className="text-2xl font-bold">{matchState.awayScore}</div>
              </div>
            </div>
            <Badge variant={matchState.status === 'COMPLETED' ? 'default' : 'secondary'}>
              {matchState.status === 'COMPLETED' ? 'FULL TIME' : matchState.phase}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{formatTime(matchState.currentTime)}</span>
                <span>{formatTime(matchState.totalTime)}</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {matchState.status === 'PRE_GAME' ? (
                <Button onClick={startMatch} className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Start Match
                </Button>
              ) : matchState.status === 'COMPLETED' ? (
                <Button onClick={resetMatch} variant="outline" className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Reset Match
                </Button>
              ) : (
                <Button onClick={pauseMatch} className="flex items-center gap-2">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Pause' : 'Resume'}
                </Button>
              )}
              
              {matchState.status !== 'PRE_GAME' && matchState.status !== 'COMPLETED' && (
                <Button onClick={resetMatch} variant="outline" className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2D Field Visualization */}
      <Card>
        <CardContent className="p-4">
          <FieldVisualization
            homeTeam={team1}
            awayTeam={team2}
            matchState={matchState}
          />
        </CardContent>
      </Card>

      {/* Commentary & Events */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Live Commentary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-center">{matchState.commentary}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Match Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-muted-foreground text-sm">No events yet...</p>
              ) : (
                events.slice().reverse().map((event) => (
                  <div key={event.id} className="text-sm p-2 bg-muted rounded border-l-4 border-blue-400">
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{event.timestamp}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {event.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">{event.description}</p>
                    {event.yards && (
                      <p className="text-xs text-blue-600 mt-1">+{event.yards} yards</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Match Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{team1?.power || 25}</div>
              <div className="text-sm text-muted-foreground">Team Power</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatTime(matchState.currentTime)}</div>
              <div className="text-sm text-muted-foreground">Time Played</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{team2?.power || 23}</div>
              <div className="text-sm text-muted-foreground">Team Power</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 2D Field Visualization Component
const FieldVisualization: React.FC<{
  homeTeam: any;
  awayTeam: any;
  matchState: TestMatchState;
}> = ({ homeTeam, awayTeam, matchState }) => {
  return (
    <div className="relative w-full aspect-[16/9] bg-gradient-to-b from-green-400 to-green-600 rounded-lg overflow-hidden border-2 border-green-300">
      {/* Field markings */}
      <div className="absolute inset-0">
        {/* Yard lines */}
        {[20, 40, 60, 80].map(yard => (
          <div 
            key={yard}
            className="absolute w-full h-px bg-white/30"
            style={{ top: `${yard}%` }}
          />
        ))}
        
        {/* Sidelines */}
        <div className="absolute left-0 top-0 w-px h-full bg-white/50" />
        <div className="absolute right-0 top-0 w-px h-full bg-white/50" />
        
        {/* End zones */}
        <div className="absolute top-0 left-0 w-full h-[10%] bg-blue-500/20 border-b border-white/30" />
        <div className="absolute bottom-0 left-0 w-full h-[10%] bg-red-500/20 border-t border-white/30" />
        
        {/* Midfield line */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/60" />
      </div>
      
      {/* Ball position */}
      <div 
        className="absolute w-2 h-2 bg-yellow-400 rounded-full border border-yellow-600 shadow-lg animate-pulse"
        style={{
          left: `${matchState.ballPosition.x}%`,
          top: `${matchState.ballPosition.y}%`,
          transform: 'translate(-50%, -50%)'
        }}
      />
      
      {/* Home team players (blue) - simulated positions */}
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={`home-${i}`}
          className="absolute w-3 h-3 bg-blue-500 rounded-full border border-blue-700 shadow-sm"
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${30 + Math.random() * 40}%`,
            transform: 'translate(-50%, -50%)'
          }}
          title={`${homeTeam?.name || 'Home'} Player ${i + 1}`}
        />
      ))}
      
      {/* Away team players (red) - simulated positions */}
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={`away-${i}`}
          className="absolute w-3 h-3 bg-red-500 rounded-full border border-red-700 shadow-sm"
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${30 + Math.random() * 40}%`,
            transform: 'translate(-50%, -50%)'
          }}
          title={`${awayTeam?.name || 'Away'} Player ${i + 1}`}
        />
      ))}
      
      {/* Possession indicator */}
      <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
        {matchState.possession === 'home' ? homeTeam?.name || 'Home' : awayTeam?.name || 'Away'} Ball
      </div>
      
      {/* Down and distance */}
      <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
        {matchState.down}{matchState.down === 1 ? 'st' : matchState.down === 2 ? 'nd' : matchState.down === 3 ? 'rd' : 'th'} & {matchState.yardsToGo}
      </div>
      
      {/* Field position indicator */}
      <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
        {matchState.fieldPosition} yard line
      </div>
    </div>
  );
};

