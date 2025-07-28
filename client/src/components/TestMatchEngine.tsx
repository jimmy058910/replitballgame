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
  orbPosition: { x: number; y: number };
}

interface TestMatchEvent {
  id: string;
  timestamp: string;
  type: 'PASS_ATTEMPT' | 'RUN_ATTEMPT' | 'TACKLE' | 'SCORE' | 'SCRUM' | 'BREAKAWAY';
  description: string;
  team: 'home' | 'away';
  playerName?: string;
  intensity?: 'low' | 'medium' | 'high';
}

// API functions to connect with backend commentary system
const fetchCommentary = async (eventType: string, context: any) => {
  try {
    const response = await fetch('/api/commentary/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, context })
    });
    if (response.ok) {
      const data = await response.json();
      return data.commentary;
    }
  } catch (error) {
    console.log('Using fallback commentary due to API error:', error);
  }
  return null;
};

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
    orbPosition: { x: 50, y: 50 }
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
            newState.orbPosition = { x: 50, y: 50 };
            setEvents(prev => [...prev.slice(-9), {
              id: `event-${newTime}`,
              timestamp: `${Math.floor(newTime/60)}'${newTime%60}"`,
              type: 'SCRUM',
              description: 'Second half underway! Fresh strategies emerge in the dome.',
              team: 'home'
            }]);
          }

          // Generate dome sports events every 15-30 seconds
          if (newTime % (15 + Math.random() * 15) < 1) {
            const eventTypes = [
              {
                type: 'PASS_ATTEMPT' as const,
                descriptions: [
                  'delivers a swift orb pass through the formation',
                  'finds an opening in defensive coverage',
                  'threads the orb through the dome with precision',
                  'executes precise passing under pressure'
                ]
              },
              {
                type: 'RUN_ATTEMPT' as const,
                descriptions: [
                  'charges forward with the orb through the dome',
                  'breaks through the defensive wall',
                  'uses raw speed to evade tacklers',
                  'powers through the formation with determination'
                ]
              },
              {
                type: 'TACKLE' as const,
                descriptions: [
                  'brings down the orb carrier with authority',
                  'executes a crucial defensive stop',
                  'closes quickly for the tackle in the dome',
                  'demonstrates excellent defensive technique'
                ]
              },
              {
                type: 'SCRUM' as const,
                descriptions: [
                  'players converge in a chaotic scrum for possession',
                  'multiple players battle for orb control',
                  'a fierce melee erupts around the orb',
                  'intense competition for possession unfolds'
                ]
              }
            ];
            
            const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            const team = Math.random() > 0.5 ? 'home' : 'away';
            const teamName = team === 'home' ? (team1?.name || 'Home') : (team2?.name || 'Away');
            const description = eventType.descriptions[Math.floor(Math.random() * eventType.descriptions.length)];
            const intensity = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high';
            
            // Use dome-appropriate commentary with proper fantasy sports terminology
            newState.commentary = `${teamName} ${description}`;
            
            // Update orb position in dome
            newState.orbPosition = {
              x: 30 + Math.random() * 40,
              y: 30 + Math.random() * 40
            };
            
            setEvents(prev => [...prev.slice(-9), {
              id: `event-${newTime}`,
              timestamp: `${Math.floor(newTime/60)}'${newTime%60}"`,
              type: eventType.type,
              description: `${teamName} ${description}`,
              team,
              intensity
            }]);
          }

          // Random SCORES every 3-6 minutes (proper dome game terminology)
          if (newTime % (180 + Math.random() * 180) < 1) {
            const scorer = Math.random() > 0.5 ? 'home' : 'away';
            const scoringTeam = scorer === 'home' ? (team1?.name || 'Home') : (team2?.name || 'Away');
            
            if (scorer === 'home') {
              newState.homeScore += 1;
              newState.commentary = `SCORE! ${scoringTeam} achieves victory in the dome arena!`;
              setEvents(prev => [...prev.slice(-9), {
                id: `score-${newTime}`,
                timestamp: `${Math.floor(newTime/60)}'${newTime%60}"`,
                type: 'SCORE',
                description: `${scoringTeam} scores! ${newState.homeScore + 1}-${newState.awayScore}`,
                team: scorer
              }]);
            } else {
              newState.awayScore += 1;
              newState.commentary = `SCORE! ${scoringTeam} achieves victory in the dome arena!`;
              setEvents(prev => [...prev.slice(-9), {
                id: `score-${newTime}`,
                timestamp: `${Math.floor(newTime/60)}'${newTime%60}"`,
                type: 'SCORE',
                description: `${scoringTeam} scores! ${newState.homeScore}-${newState.awayScore + 1}`,
                team: scorer
              }]);
            }
            
            // Reset orb to center dome after score
            newState.orbPosition = { x: 50, y: 50 };
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
      orbPosition: { x: 50, y: 50 }
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
                    {event.intensity && (
                      <p className="text-xs text-amber-600 mt-1 capitalize">{event.intensity} intensity</p>
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

// 2D Dome Visualization Component
const FieldVisualization: React.FC<{
  homeTeam: any;
  awayTeam: any;
  matchState: TestMatchState;
}> = ({ homeTeam, awayTeam, matchState }) => {
  return (
    <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-gray-600 via-gray-700 to-gray-900 rounded-full overflow-hidden border-4 border-gray-500 shadow-2xl">
      {/* Dome floor pattern */}
      <div className="absolute inset-0">
        {/* Concentric circles for dome floor */}
        {[30, 50, 70].map(radius => (
          <div 
            key={radius}
            className="absolute border border-white/20 rounded-full"
            style={{ 
              width: `${radius}%`, 
              height: `${radius}%`,
              left: `${(100-radius)/2}%`,
              top: `${(100-radius)/2}%`
            }}
          />
        ))}
        
        {/* Center dome marker */}
        <div className="absolute w-4 h-4 bg-white/30 rounded-full border border-white/50 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        
        {/* Score zones (circular areas) */}
        <div className="absolute w-[20%] h-[20%] bg-blue-500/10 rounded-full border-2 border-blue-400/30 left-[10%] top-[40%]" />
        <div className="absolute w-[20%] h-[20%] bg-red-500/10 rounded-full border-2 border-red-400/30 right-[10%] top-[40%]" />
      </div>
      
      {/* Orb position */}
      <div 
        className="absolute w-3 h-3 bg-amber-400 rounded-full border-2 border-amber-600 shadow-lg animate-pulse"
        style={{
          left: `${matchState.orbPosition.x}%`,
          top: `${matchState.orbPosition.y}%`,
          transform: 'translate(-50%, -50%)'
        }}
        title="Game Orb"
      />
      
      {/* Home team players (blue) - 6 players formation */}
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={`home-${i}`}
          className="absolute w-3 h-3 bg-blue-500 rounded-full border border-blue-700 shadow-sm"
          style={{
            left: `${25 + Math.random() * 50}%`,
            top: `${25 + Math.random() * 50}%`,
            transform: 'translate(-50%, -50%)'
          }}
          title={`${homeTeam?.name || 'Home'} Player ${i + 1}`}
        />
      ))}
      
      {/* Away team players (red) - 6 players formation */}
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={`away-${i}`}
          className="absolute w-3 h-3 bg-red-500 rounded-full border border-red-700 shadow-sm"
          style={{
            left: `${25 + Math.random() * 50}%`,
            top: `${25 + Math.random() * 50}%`,
            transform: 'translate(-50%, -50%)'
          }}
          title={`${awayTeam?.name || 'Away'} Player ${i + 1}`}
        />
      ))}
      
      {/* Possession indicator */}
      <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
        {matchState.possession === 'home' ? homeTeam?.name || 'Home' : awayTeam?.name || 'Away'} Orb Control
      </div>
      
      {/* Game phase indicator */}
      <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
        {matchState.phase}
      </div>
      
      {/* Dome environment indicator */}
      <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
        DOME ARENA
      </div>
    </div>
  );
};

