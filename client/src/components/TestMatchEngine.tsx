import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, Pause, RotateCcw, Clock, Users, Trophy, Zap, Target, Activity 
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
}

export function TestMatchEngine({ matchId, team1, team2, onMatchComplete }: TestMatchEngineProps) {
  const [matchState, setMatchState] = useState<TestMatchState>({
    status: 'PRE_GAME',
    currentTime: 0,
    totalTime: 2400, // 40 minutes
    homeScore: 0,
    awayScore: 0,
    commentary: 'Welcome to this exciting test match simulation!',
    possession: 'home',
    phase: 'FIRST_HALF'
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [events, setEvents] = useState<string[]>([]);

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
              commentary: `FULL TIME! ${team1?.name || 'Home'} ${prev.homeScore} - ${prev.awayScore} ${team2?.name || 'Away'}`
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
            newState.commentary = 'SECOND HALF begins!';
            setEvents(prev => [...prev, `${Math.floor(newTime/60)}'${newTime%60}" - SECOND HALF starts`]);
          }

          // Random events every 30 seconds
          if (newTime % 30 === 0) {
            const eventTypes = [
              'Shot attempt',
              'Possession change',
              'Good defense',
              'Close call',
              'Strong run',
              'Tactical adjustment'
            ];
            
            const event = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            const team = Math.random() > 0.5 ? (team1?.name || 'Home') : (team2?.name || 'Away');
            newState.commentary = `${event} by ${team}`;
            setEvents(prev => [...prev.slice(-9), `${Math.floor(newTime/60)}'${newTime%60}" - ${event} (${team})`]);
          }

          // Random scoring every 2-5 minutes
          if (newTime % (120 + Math.random() * 180) < 1) {
            const scorer = Math.random() > 0.5 ? 'home' : 'away';
            if (scorer === 'home') {
              newState.homeScore += 1;
              newState.commentary = `GOAL! ${team1?.name || 'Home'} scores! ${newState.homeScore}-${newState.awayScore}`;
              setEvents(prev => [...prev.slice(-9), `${Math.floor(newTime/60)}'${newTime%60}" - GOAL! ${team1?.name || 'Home'} scores!`]);
            } else {
              newState.awayScore += 1;
              newState.commentary = `GOAL! ${team2?.name || 'Away'} scores! ${newState.homeScore}-${newState.awayScore}`;
              setEvents(prev => [...prev.slice(-9), `${Math.floor(newTime/60)}'${newTime%60}" - GOAL! ${team2?.name || 'Away'} scores!`]);
            }
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
      commentary: 'Welcome to this exciting test match simulation!',
      possession: 'home',
      phase: 'FIRST_HALF'
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
                events.slice().reverse().map((event, index) => (
                  <div key={index} className="text-sm p-2 bg-muted rounded">
                    {event}
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

import { MessageCircle, BarChart3 } from 'lucide-react';