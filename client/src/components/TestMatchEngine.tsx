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
  playbackSpeed: number;
  targetSpeed: number;
  atmosphere: number; // 0-100 crowd intensity
  attendance: number;
  liveRevenue: number;
  stadiumCapacity: number;
  fanLoyalty: number;
}

interface TestMatchEvent {
  id: string;
  timestamp: string;
  type: 'PASS_ATTEMPT' | 'RUN_ATTEMPT' | 'TACKLE' | 'SCORE' | 'SCRUM' | 'BREAKAWAY' | 'INJURY' | 'SUBSTITUTION';
  description: string;
  team: 'home' | 'away';
  playerName?: string;
  intensity?: 'low' | 'medium' | 'high';
  priority: 1 | 2 | 3 | 4; // 1=Critical, 2=Important, 3=Standard, 4=Downtime
  speedModifier?: number;
}

// Event Priority Classification System
const calculateEventPriority = (event: { type: string; gameTime: number; scoreDifferential: number }): 1 | 2 | 3 | 4 => {
  let priority: 1 | 2 | 3 | 4 = 4;
  
  // Priority 1 - Critical Moments (0.5-1x speed)
  if (['SCORE', 'INJURY', 'SUBSTITUTION'].includes(event.type)) priority = 1;
  
  // Priority 2 - Important Events (1.5-2x speed)
  if (['TACKLE', 'BREAKAWAY'].includes(event.type)) priority = 2;
  
  // Priority 3 - Standard Play (3-4x speed)
  if (['PASS_ATTEMPT', 'RUN_ATTEMPT'].includes(event.type)) priority = 3;
  
  // Priority 4 - Downtime (8-10x speed)
  if (['SCRUM'].includes(event.type)) priority = 4;
  
  // Context modifiers
  if (event.gameTime > 35) priority = Math.max(1, priority - 1) as 1 | 2 | 3 | 4; // Late game urgency
  if (event.scoreDifferential <= 1) priority = Math.max(1, priority - 1) as 1 | 2 | 3 | 4; // Close game
  
  return priority;
};

// Dynamic Speed Calculation
const calculatePlaybackSpeed = (eventPriority: number, upcomingKeyEvent?: { timeUntil: number }): number => {
  const baseSpeed = { 1: 0.5, 2: 1.5, 3: 3, 4: 8 }[eventPriority] || 4;
  
  // Slow down if key event approaching
  if (upcomingKeyEvent && upcomingKeyEvent.timeUntil < 3) {
    return Math.max(0.5, baseSpeed * 0.5);
  }
  
  return baseSpeed;
};

// Stadium Revenue Calculation
const calculateLiveRevenue = (attendance: number, minute: number, facilities: any) => {
  const ticketRevenue = attendance * 25; // 25₡ per ticket
  const concessionsRevenue = attendance * 8 * (facilities?.concessionsLevel || 1);
  const parkingRevenue = attendance * 0.3 * 10 * (facilities?.parkingLevel || 1);
  
  return Math.floor((ticketRevenue + concessionsRevenue + parkingRevenue) * (minute / 40));
};

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
    orbPosition: { x: 50, y: 50 },
    playbackSpeed: 1,
    targetSpeed: 1,
    atmosphere: 65,
    attendance: 3750, // 75% of 5000 capacity
    liveRevenue: 0,
    stadiumCapacity: 5000,
    fanLoyalty: 50
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

          const timeIncrement = Math.floor(prev.playbackSpeed * 1);
          const newTime = prev.currentTime + timeIncrement;
          const newState = { 
            ...prev, 
            currentTime: newTime,
            // Update live revenue based on time progression
            liveRevenue: calculateLiveRevenue(prev.attendance, newTime / 60, { concessionsLevel: 1, parkingLevel: 1 }),
            // Dynamic atmosphere based on score differential and time
            atmosphere: Math.min(100, prev.atmosphere + (Math.abs(prev.homeScore - prev.awayScore) <= 1 ? 2 : -1))
          };

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
              team: 'home',
              intensity: 'medium' as const,
              priority: 3 as const,
              speedModifier: 3
            }]);
          }

          // Generate dome sports events based on dynamic speed (more events at slower speeds)
          const eventChance = prev.playbackSpeed <= 1 ? 0.8 : prev.playbackSpeed <= 2 ? 0.4 : 0.2;
          if (Math.random() < eventChance) {
            const eventTypes = [
              {
                type: 'PASS_ATTEMPT' as const,
                descriptions: [
                  'delivers a swift orb pass through the formation',
                  'finds an opening in defensive coverage',
                  'threads the orb through the dome with precision',
                  'executes precise passing under pressure'
                ],
                weight: 3
              },
              {
                type: 'RUN_ATTEMPT' as const,
                descriptions: [
                  'charges forward with the orb through the dome',
                  'breaks through the defensive wall',
                  'uses raw speed to evade tacklers',
                  'powers through the formation with determination'
                ],
                weight: 3
              },
              {
                type: 'TACKLE' as const,
                descriptions: [
                  'brings down the orb carrier with authority',
                  'executes a crucial defensive stop',
                  'closes quickly for the tackle in the dome',
                  'demonstrates excellent defensive technique'
                ],
                weight: 2
              },
              {
                type: 'BREAKAWAY' as const,
                descriptions: [
                  'breaks free from the pack in a spectacular display',
                  'explodes past defenders with lightning speed',
                  'finds open space in the dome arena',
                  'creates a thrilling breakaway opportunity'
                ],
                weight: 2
              },
              {
                type: 'SCRUM' as const,
                descriptions: [
                  'players converge in a chaotic scrum for possession',
                  'multiple players battle for orb control',
                  'a fierce melee erupts around the orb',
                  'intense competition for possession unfolds'
                ],
                weight: 1
              },
              {
                type: 'INJURY' as const,
                descriptions: [
                  'goes down hard after contact in the dome',
                  'suffers an impact injury during play',
                  'requires medical attention on the arena floor',
                  'is helped off with assistance from trainers'
                ],
                weight: 0.3
              }
            ];
            
            // Weighted event selection
            const totalWeight = eventTypes.reduce((sum, e) => sum + e.weight, 0);
            const randomValue = Math.random() * totalWeight;
            let currentWeight = 0;
            const eventType = eventTypes.find(e => {
              currentWeight += e.weight;
              return randomValue <= currentWeight;
            }) || eventTypes[0];
            
            const team = Math.random() > 0.5 ? 'home' : 'away';
            const teamName = team === 'home' ? (team1?.name || 'Home') : (team2?.name || 'Away');
            const description = eventType.descriptions[Math.floor(Math.random() * eventType.descriptions.length)];
            const intensity = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high';
            
            // Calculate event priority
            const scoreDifferential = Math.abs(prev.homeScore - prev.awayScore);
            const priority = calculateEventPriority({
              type: eventType.type,
              gameTime: newTime / 60,
              scoreDifferential
            });
            
            // Calculate new playback speed based on priority
            const newTargetSpeed = calculatePlaybackSpeed(priority);
            newState.targetSpeed = newTargetSpeed;
            
            // Smooth speed transition (gradual change towards target)
            const speedDiff = newTargetSpeed - prev.playbackSpeed;
            newState.playbackSpeed = prev.playbackSpeed + (speedDiff * 0.3); // 30% transition rate
            
            // Update atmosphere based on event excitement
            if (priority <= 2) {
              newState.atmosphere = Math.min(100, prev.atmosphere + 5);
            }
            
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
              intensity,
              priority,
              speedModifier: newTargetSpeed
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
                description: `${scoringTeam} scores! ${newState.homeScore}-${newState.awayScore}`,
                team: scorer,
                intensity: 'high' as const,
                priority: 1 as const,
                speedModifier: 0.5
              }]);
            } else {
              newState.awayScore += 1;
              newState.commentary = `SCORE! ${scoringTeam} achieves victory in the dome arena!`;
              setEvents(prev => [...prev.slice(-9), {
                id: `score-${newTime}`,
                timestamp: `${Math.floor(newTime/60)}'${newTime%60}"`,
                type: 'SCORE',
                description: `${scoringTeam} scores! ${newState.homeScore}-${newState.awayScore}`,
                team: scorer,
                intensity: 'high' as const,
                priority: 1 as const,
                speedModifier: 0.5
              }]);
            }
            
            // Reset orb to center dome after score
            newState.orbPosition = { x: 50, y: 50 };
          }

          return newState;
        });
      }, Math.max(50, Math.floor(200 / (matchState.playbackSpeed || 1)))); // Dynamic update rate based on speed
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
      orbPosition: { x: 50, y: 50 },
      playbackSpeed: 1,
      targetSpeed: 1,
      atmosphere: 65,
      attendance: 3750,
      liveRevenue: 0,
      stadiumCapacity: 5000,
      fanLoyalty: 50
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
              Key Plays & Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-muted-foreground text-sm">No events yet...</p>
              ) : (
                events.slice().reverse().map((event) => {
                  // Priority-based styling
                  const getPriorityStyle = (priority: number) => {
                    switch(priority) {
                      case 1: return 'border-l-red-500 bg-red-50 dark:bg-red-950/20'; // Critical
                      case 2: return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'; // Important  
                      case 3: return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20'; // Standard
                      case 4: return 'border-l-green-500 bg-green-50 dark:bg-green-950/20'; // Downtime
                      default: return 'border-l-gray-500 bg-gray-50 dark:bg-gray-950/20';
                    }
                  };
                  
                  const getPriorityLabel = (priority: number) => {
                    switch(priority) {
                      case 1: return 'CRITICAL';
                      case 2: return 'IMPORTANT';
                      case 3: return 'STANDARD';
                      case 4: return 'ROUTINE';
                      default: return 'UNKNOWN';
                    }
                  };
                  
                  const getPriorityColor = (priority: number) => {
                    switch(priority) {
                      case 1: return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
                      case 2: return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
                      case 3: return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
                      case 4: return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
                      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
                    }
                  };
                  
                  return (
                    <div key={event.id} className={`text-sm p-3 rounded-lg border-l-4 transition-all duration-300 ${getPriorityStyle(event.priority)}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{event.timestamp}</span>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">
                            {event.type.replace('_', ' ')}
                          </Badge>
                          <Badge className={`text-xs font-bold ${getPriorityColor(event.priority)}`}>
                            {getPriorityLabel(event.priority)}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{event.description}</p>
                      <div className="flex justify-between items-center mt-2 text-xs">
                        <span className="capitalize text-gray-500">
                          {event.intensity} intensity
                        </span>
                        {event.speedModifier && (
                          <span className="text-gray-500">
                            Speed: {event.speedModifier.toFixed(1)}x
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Match Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Live Match Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{team1?.power || 25}</div>
              <div className="text-sm text-muted-foreground">{team1?.name || 'Home'} Power</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{team2?.power || 23}</div>
              <div className="text-sm text-muted-foreground">{team2?.name || 'Away'} Power</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{Math.round(matchState.atmosphere)}%</div>
              <div className="text-sm text-muted-foreground">Atmosphere</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{matchState.liveRevenue.toLocaleString()}₡</div>
              <div className="text-sm text-muted-foreground">Revenue</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Mobile-Optimized Speed Controls */}
      <Card className="md:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Speed Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Current Speed Display */}
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">{matchState.playbackSpeed.toFixed(1)}x</div>
              <div className="text-sm text-muted-foreground">
                Target: {matchState.targetSpeed.toFixed(1)}x
              </div>
            </div>
            
            {/* Speed Status Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Critical</span>
                <span>Important</span>
                <span>Standard</span>
                <span>Fast</span>
              </div>
              <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-500 via-yellow-500 via-blue-500 to-green-500 transition-all duration-1000"
                  style={{ 
                    width: `${Math.min(100, (matchState.playbackSpeed / 8) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>
            
            {/* Touch Instructions */}
            <div className="text-center text-xs text-muted-foreground bg-muted p-2 rounded">
              Speed automatically adjusts based on event importance
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Enhanced Stadium Visualization Component with Dynamic Speed Control
const FieldVisualization: React.FC<{
  homeTeam: any;
  awayTeam: any;
  matchState: TestMatchState;
}> = ({ homeTeam, awayTeam, matchState }) => {
  const attendancePercent = (matchState.attendance / matchState.stadiumCapacity) * 100;
  const atmosphereIntensity = matchState.atmosphere / 100;
  
  // Speed indicator colors based on playback speed
  const getSpeedColor = (speed: number) => {
    if (speed <= 1) return 'text-red-400 bg-red-500/20'; // Critical moments
    if (speed <= 2) return 'text-yellow-400 bg-yellow-500/20'; // Important events
    if (speed <= 4) return 'text-blue-400 bg-blue-500/20'; // Standard play
    return 'text-green-400 bg-green-500/20'; // Downtime
  };
  
  return (
    <div className="space-y-4">
      {/* Dynamic Speed Control Panel */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg border border-gray-700">
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full border ${getSpeedColor(matchState.playbackSpeed)}`}>
            <span className="text-sm font-semibold">{matchState.playbackSpeed.toFixed(1)}x</span>
          </div>
          <div className="text-sm text-gray-300">
            <span className="text-gray-500">Target:</span> {matchState.targetSpeed.toFixed(1)}x
          </div>
        </div>
        
        {/* Speed Legend */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span className="text-gray-400">Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span className="text-gray-400">Important</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="text-gray-400">Standard</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-gray-400">Fast</span>
          </div>
        </div>
      </div>
      
      {/* Enhanced Dome Stadium Visualization */}
      <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-2xl overflow-hidden border-4 border-gray-600 shadow-2xl">
        {/* Stadium Atmosphere Effect */}
        <div 
          className="absolute inset-0 rounded-2xl transition-all duration-1000"
          style={{
            backgroundColor: `rgba(255, 215, 0, ${atmosphereIntensity * 0.08})`,
            boxShadow: `inset 0 0 50px rgba(255, 215, 0, ${atmosphereIntensity * 0.2})`
          }}
        />
        
        {/* Stadium Seating Tiers with Crowd Density */}
        <div className="absolute inset-4">
          {[1, 2, 3, 4].map(tier => (
            <div 
              key={tier}
              className="absolute inset-0 rounded-full transition-all duration-1000"
              style={{
                border: `2px solid rgba(255, 255, 255, ${0.1 + (attendancePercent/100) * 0.3})`,
                backgroundColor: `rgba(60, 60, 60, ${(attendancePercent/100) * 0.08})`,
                margin: `${tier * 12}px`
              }}
            >
              {/* Crowd Animation Effects */}
              {attendancePercent > 70 && tier <= 2 && (
                <div 
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{
                    backgroundColor: `rgba(255, 215, 0, ${atmosphereIntensity * 0.03})`,
                    animationDuration: `${3 - atmosphereIntensity}s`
                  }}
                />
              )}
            </div>
          ))}
          
          {/* Enhanced Dome Field */}
          <div className="absolute inset-16 rounded-full bg-gradient-radial from-green-600 via-green-700 to-green-800 border-4 border-white/30">
            {/* Dome floor pattern with enhanced visibility */}
            {[25, 40, 55, 70].map(radius => (
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
            
            {/* Center dome marker - enhanced */}
            <div className="absolute w-6 h-6 bg-white/40 rounded-full border-2 border-white/60 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>
            
            {/* Enhanced Score zones with team colors */}
            <div className="absolute w-[25%] h-[25%] bg-blue-500/20 rounded-full border-3 border-blue-400/50 left-[15%] top-[37.5%] flex items-center justify-center">
              <span className="text-blue-200 text-xs font-bold">{homeTeam?.name || 'HOME'}</span>
            </div>
            <div className="absolute w-[25%] h-[25%] bg-red-500/20 rounded-full border-3 border-red-400/50 right-[15%] top-[37.5%] flex items-center justify-center">
              <span className="text-red-200 text-xs font-bold">{awayTeam?.name || 'AWAY'}</span>
            </div>
          </div>
          
          {/* Enhanced Orb with atmosphere effects */}
          <div 
            className="absolute w-4 h-4 bg-amber-400 rounded-full border-2 border-amber-600 shadow-lg transition-all duration-500 z-10"
            style={{
              left: `${matchState.orbPosition.x}%`,
              top: `${matchState.orbPosition.y}%`,
              transform: 'translate(-50%, -50%)',
              boxShadow: `0 0 ${16 + atmosphereIntensity * 12}px rgba(255, 193, 7, ${0.7 + atmosphereIntensity * 0.3})`
            }}
          >
            <div className="absolute inset-0 bg-amber-300 rounded-full animate-pulse"></div>
            <div className="absolute inset-[-2px] bg-amber-400/30 rounded-full animate-ping"></div>
          </div>
          
          {/* Enhanced Player Positions */}
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={`home-${i}`}
              className="absolute w-3 h-3 bg-blue-500 rounded-full border border-blue-300 shadow-md transition-all duration-300"
              style={{
                left: `${20 + Math.cos(i * Math.PI / 3) * 15 + Math.random() * 10}%`,
                top: `${40 + Math.sin(i * Math.PI / 3) * 15 + Math.random() * 10}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}
          
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={`away-${i}`}
              className="absolute w-3 h-3 bg-red-500 rounded-full border border-red-300 shadow-md transition-all duration-300"
              style={{
                left: `${80 + Math.cos(i * Math.PI / 3) * 15 + Math.random() * 10}%`,
                top: `${40 + Math.sin(i * Math.PI / 3) * 15 + Math.random() * 10}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}
        </div>
        
        {/* Enhanced Stadium Information Overlays */}
        <div className="absolute top-3 left-3 space-y-2">
          <div className="bg-black/70 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
            <div className="text-sm font-semibold">🏟️ {matchState.stadiumCapacity.toLocaleString()} Capacity Dome</div>
          </div>
          <div className="bg-black/70 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
            <div className="text-xs">👥 {matchState.attendance.toLocaleString()} in attendance ({Math.round(attendancePercent)}%)</div>
          </div>
          <div className="bg-black/70 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs">
              <span>🔥 Atmosphere:</span>
              <div className="flex-1 bg-gray-700 rounded-full h-2 w-20">
                <div 
                  className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-1000"
                  style={{ width: `${Math.min(100, matchState.atmosphere)}%` }}
                ></div>
              </div>
              <span>{Math.round(matchState.atmosphere)}%</span>
            </div>
          </div>
        </div>
        
        {/* Live Revenue Display */}
        <div className="absolute top-3 right-3 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-green-500">
          <div className="text-sm font-bold">💰 Live Revenue</div>
          <div className="text-lg font-black">{matchState.liveRevenue.toLocaleString()}₡</div>
        </div>
        
        {/* Possession & Phase Indicators */}
        <div className="absolute bottom-3 left-3 flex gap-2">
          <div className="bg-black/70 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
            <span className="text-xs">Orb Control:</span>
            <span className={`ml-1 font-semibold ${matchState.possession === 'home' ? 'text-blue-300' : 'text-red-300'}`}>
              {matchState.possession === 'home' ? homeTeam?.name || 'Home' : awayTeam?.name || 'Away'}
            </span>
          </div>
          <div className="bg-black/70 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
            <span className="text-xs font-semibold">{matchState.phase}</span>
          </div>
        </div>
        
        {/* Fan Loyalty Impact Indicator */}
        <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
          <div className="text-xs">Fan Loyalty: {matchState.fanLoyalty}%</div>
        </div>
      </div>
    </div>
  );
};

