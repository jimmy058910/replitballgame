import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Play, Pause, Clock, Users, Trophy, Zap, Target, Activity } from 'lucide-react';
import webSocketManager, { LiveMatchState, MatchEvent, WebSocketCallbacks } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface GameSimulationUIProps {
  matchId: string;
  userId: string;
  team1: any;
  team2: any;
  initialLiveState?: any;
  onMatchComplete?: (finalState: LiveMatchState) => void;
  enhancedData?: {
    atmosphereEffects?: any;
    tacticalEffects?: any;
    playerStats?: any;
    mvpPlayers?: any;
  };
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  role: "Passer" | "Runner" | "Blocker";
  teamId: string;
  race?: string;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  stamina: number;
  agility: number;
  leadership: number;
}

interface KeyPerformer {
  playerId: string;
  playerName: string;
  statLabel: string;
  statValue: number;
}

export function GameSimulationUI({ matchId, userId, team1, team2, initialLiveState, onMatchComplete, enhancedData }: GameSimulationUIProps) {
  const [liveState, setLiveState] = useState<LiveMatchState | null>(initialLiveState || null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [isControlling, setIsControlling] = useState(false);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const logRef = useRef<HTMLDivElement>(null);

  // Fetch initial match data
  const { data: initialMatchData, error: matchError } = useQuery({
    queryKey: ['/api/matches', matchId],
    enabled: !!matchId
  });

    // Auto-scroll log to top
    useEffect(() => {
        if (logRef.current) {
          logRef.current.scrollTop = 0;
        }
      }, [liveState?.recentEvents]);

  // WebSocket connection and event handling
  useEffect(() => {
    if (!matchId || !userId) return;

    const initializeWebSocket = async () => {
      try {
        setIsLoading(true);

        // Connect to WebSocket
        await webSocketManager.connect(userId);

        // Set up callbacks
        const callbacks: WebSocketCallbacks = {
          onMatchUpdate: (state: LiveMatchState) => {
            setLiveState(state);
            setEvents(state.gameEvents || []);
          },
          onMatchEvent: (event: MatchEvent) => {
            setEvents(prev => [event, ...prev]);

            // Show important events as toast notifications
            if (event.type === 'score' || event.type === 'halftime' || event.type === 'interception') {
              toast({
                title: event.type === 'score' ? '🏆 SCORE!' :
                       event.type === 'halftime' ? '⏰ Halftime' :
                       '🚫 Interception',
                description: event.description,
                duration: 3000,
              });
            }
          },
          onMatchComplete: (data) => {
            setLiveState(data.finalState);
            setEvents(data.finalState.gameEvents || []);
            if (onMatchComplete) {
                onMatchComplete(data.finalState);
            }
            toast({
              title: '🏁 Match Complete!',
              description: `Final Score: ${data.finalState.homeScore} - ${data.finalState.awayScore}`,
              duration: 5000,
            });
          },
          onMatchStarted: () => {
            toast({
              title: '🚀 Match Started!',
              description: 'Live simulation is now running',
              duration: 3000,
            });
          },
          onMatchPaused: () => {
            toast({
              title: '⏸️ Match Paused',
              description: 'Match simulation has been paused',
              duration: 3000,
            });
          },
          onMatchResumed: () => {
            toast({
              title: '▶️ Match Resumed',
              description: 'Match simulation has been resumed',
              duration: 3000,
            });
          },
          onConnectionStatus: (connected: boolean) => {
            setIsConnected(connected);
            if (connected) {
              toast({
                title: '🔌 Connected',
                description: 'Real-time updates enabled',
                duration: 2000,
              });
            } else {
              toast({
                title: '🔌 Disconnected',
                description: 'Attempting to reconnect...',
                duration: 2000,
              });
            }
          },
          onError: (error) => {
            toast({
              title: '❌ WebSocket Error',
              description: error.message,
              variant: 'destructive',
              duration: 4000,
            });
          }
        };

        webSocketManager.setCallbacks(callbacks);

        // Join match room
        await webSocketManager.joinMatch(matchId);

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        setIsLoading(false);
        toast({
          title: '❌ Connection Failed',
          description: 'Failed to connect to live match',
          variant: 'destructive',
          duration: 4000,
        });
      }
    };

    initializeWebSocket();

    // Cleanup on unmount
    return () => {
      webSocketManager.leaveMatch();
    };
  }, [matchId, userId, toast, onMatchComplete]);

  const formatGameTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getGamePhase = (gameTime: number, maxTime: number, currentHalf: number) => {
    const timePercent = gameTime / maxTime;

    if (timePercent >= 1.0) {
      return { label: "FINAL SCORE", color: "bg-purple-600 animate-pulse" };
    }

    if (timePercent >= 0.48 && timePercent <= 0.52) {
      return { label: "HALFTIME", color: "bg-blue-600 animate-pulse" };
    }

    if (timePercent < 0.25) return { label: "Early Game", color: "bg-green-500" };
    if (timePercent < 0.65) return { label: "Mid Game", color: "bg-yellow-500" };
    if (timePercent < 0.85) return { label: "Late Game", color: "bg-orange-500" };
    return { label: "Clutch Time!", color: "bg-red-500 animate-pulse" };
  };

  const getAttendanceData = () => {
    const atmosphereData = enhancedData?.atmosphereEffects || {};

    const attendance = atmosphereData.attendance || 12000;
    const capacity = atmosphereData.attendance ? Math.floor(atmosphereData.attendance / 0.8) : 15000;
    const fanLoyalty = atmosphereData.fanLoyalty || 78;
    const intimidationEffect = atmosphereData.intimidationFactor || Math.floor(fanLoyalty / 20);
    const homeFieldAdvantage = atmosphereData.homeFieldAdvantage || Math.floor(fanLoyalty / 15);

    return {
      attendance,
      capacity,
      percentage: Math.floor((attendance / capacity) * 100),
      fanLoyalty,
      intimidationEffect,
      fieldSize: atmosphereData.fieldSize || 'Standard',
      homeFieldAdvantage,
      crowdNoise: atmosphereData.crowdNoise || Math.floor(Math.random() * 30) + 70
    };
  };

  const getKeyPerformers = (): { home: KeyPerformer | null; away: KeyPerformer | null } => {
    const halftimeEvent = liveState?.recentEvents?.find(e => e.type === 'halftime');
    const finalEvent = liveState?.recentEvents?.find(e => e.type === 'match_complete');

    let mvpData = null;

    if (finalEvent?.data?.mvp) {
      mvpData = finalEvent.data.mvp;
    } else if (halftimeEvent?.data?.mvp) {
      mvpData = halftimeEvent.data.mvp;
    } else if (enhancedData?.mvpPlayers) {
      mvpData = {
        homeMVP: { playerName: enhancedData.mvpPlayers.home, score: 100 },
        awayMVP: { playerName: enhancedData.mvpPlayers.away, score: 100 }
      };
    }

    let homePerformer = null;
    let awayPerformer = null;

    if (mvpData?.homeMVP?.playerName && mvpData.homeMVP.playerName !== 'N/A' && mvpData.homeMVP.playerName !== 'No MVP') {
      homePerformer = {
        playerId: "mvp-home",
        playerName: mvpData.homeMVP.playerName,
        statLabel: "MVP",
        statValue: Math.round(mvpData.homeMVP.score || 0)
      };
    } else {
      homePerformer = {
        playerId: "player1",
        playerName: "No MVP",
        statLabel: "Awaiting Stats",
        statValue: 0
      };
    }

    if (mvpData?.awayMVP?.playerName && mvpData.awayMVP.playerName !== 'N/A' && mvpData.awayMVP.playerName !== 'No MVP') {
      awayPerformer = {
        playerId: "mvp-away",
        playerName: mvpData.awayMVP.playerName,
        statLabel: "MVP",
        statValue: Math.round(mvpData.awayMVP.score || 0)
      };
    } else {
      awayPerformer = {
        playerId: "player2",
        playerName: "No MVP",
        statLabel: "Awaiting Stats",
        statValue: 0
      };
    }

    return { home: homePerformer, away: awayPerformer };
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span>Connecting to live match...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (matchError) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive">Failed to Load Match</h3>
            <p className="text-muted-foreground">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!liveState) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">Waiting for match data...</div>
        </CardContent>
      </Card>
    );
  }

  const gamePhase = getGamePhase(liveState.gameTime, liveState.maxTime, liveState.currentHalf);
  const attendanceData = getAttendanceData();
  const keyPerformers = getKeyPerformers();
  const halfProgress = liveState.currentHalf === 1
    ? (liveState.gameTime / (liveState.maxTime / 2)) * 100
    : ((liveState.gameTime - (liveState.maxTime / 2)) / (liveState.maxTime / 2)) * 100;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Scoreboard
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                        {liveState.possessingTeamId === team1?.id && (
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        )}
                        <span className={liveState.possessingTeamId === team1?.id ? "font-bold" : ""}>
                            {team1?.name || "Home Team"}
                        </span>
                        </div>
                        <div className="flex items-center gap-2">
                        <span className={liveState.possessingTeamId === team2?.id ? "font-bold" : ""}>
                            {team2?.name || "Away Team"}
                        </span>
                        {liveState.possessingTeamId === team2?.id && (
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        )}
                        </div>
                    </div>
                    <div className="text-3xl font-bold">
                        {liveState.homeScore} - {liveState.awayScore}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {liveState.possessingTeamId ? "Possession indicated by green dot" : "Neutral possession"}
                    </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Game Clock
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="text-center">
                    <div className="text-2xl font-mono font-bold">
                        {formatGameTime(liveState.gameTime)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Half {liveState.currentHalf}
                    </div>
                    </div>
                    <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span>Progress</span>
                        <span>{Math.round(halfProgress)}%</span>
                    </div>
                    <Progress value={halfProgress} className="h-2" />
                    </div>
                    <Badge
                    variant="outline"
                    className={`w-full justify-center ${gamePhase.color} text-white border-0`}
                    >
                    {gamePhase.label}
                    </Badge>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    Home Field Advantage
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <div className="text-xs text-muted-foreground">Attendance</div>
                        <div className="font-semibold">
                        {attendanceData.attendance.toLocaleString()} / {attendanceData.capacity.toLocaleString()}
                        </div>
                        <div className="text-xs">({attendanceData.percentage}%)</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">Fan Loyalty</div>
                        <div className="font-semibold">{attendanceData.fanLoyalty}%</div>
                    </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <div className="text-xs text-muted-foreground">Crowd Noise</div>
                        <div className="font-semibold text-green-600">{attendanceData.crowdNoise}%</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">Field Size</div>
                        <div className="font-semibold">{attendanceData.fieldSize}</div>
                    </div>
                    </div>
                    <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground">Away Team Effect</div>
                    <div className="text-sm font-semibold text-red-600">
                        -{attendanceData.intimidationEffect} to Opponent Catching & Throwing
                    </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-500" />
                    Team Strategy & Chemistry
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                    <div className="text-xs text-muted-foreground">Your Tactic</div>
                    <div className="font-semibold">{enhancedData?.tacticalEffects?.homeTeamFocus || team1?.tacticalFocus || "Balanced"}</div>
                    {enhancedData?.tacticalEffects?.homeTeamModifiers && (
                        <div className="text-xs text-green-600">
                        {Object.entries(enhancedData.tacticalEffects.homeTeamModifiers)
                            .filter(([_, value]) => value > 0)
                            .map(([key, value]) => `+${value} ${key}`)
                            .join(", ")}
                        </div>
                    )}
                    </div>
                    <div>
                    <div className="text-xs text-muted-foreground">Opponent Tactic</div>
                    <div className="font-semibold">{enhancedData?.tacticalEffects?.awayTeamFocus || team2?.tacticalFocus || "Balanced"}</div>
                    {enhancedData?.tacticalEffects?.awayTeamModifiers && (
                        <div className="text-xs text-blue-600">
                        {Object.entries(enhancedData.tacticalEffects.awayTeamModifiers)
                            .filter(([_, value]) => value > 0)
                            .map(([key, value]) => `+${value} ${key}`)
                            .join(", ")}
                        </div>
                    )}
                    </div>
                    <div>
                    <div className="text-xs text-muted-foreground">Team Camaraderie</div>
                    <div className="font-semibold text-green-600">
                        In Sync! ({team1?.camaraderie || 50})
                    </div>
                    {enhancedData?.gamePhase && (
                        <div className="text-xs text-purple-600">
                        Game Phase: {enhancedData.gamePhase}
                        </div>
                    )}
                    </div>
                </div>
                {enhancedData && (
                    <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Zap className="h-3 w-3 text-yellow-500" />
                        Enhanced Simulation Active - Real-time tactical effects and race bonuses applied
                    </div>
                    </div>
                )}
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
                Key Performers
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div>
                <div className="text-xs text-muted-foreground">Your Team MVP</div>
                <div className="font-semibold text-sm">{keyPerformers.home?.playerName}</div>
                <div className="text-xs">
                    {keyPerformers.home?.statValue} {keyPerformers.home?.statLabel}
                </div>
                </div>
                <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground">Opponent MVP</div>
                <div className="font-semibold text-sm">{keyPerformers.away?.playerName}</div>
                <div className="text-xs">
                    {keyPerformers.away?.statValue} {keyPerformers.away?.statLabel}
                </div>
                </div>
            </CardContent>
            </Card>

            <Card className="lg:col-span-3">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Live Commentary
                    {liveState.status === 'live' && (
                        <Badge variant="destructive" className="animate-pulse">
                        Live Server Match
                        </Badge>
                    )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea ref={logRef} className="h-64 w-full rounded-md border p-4">
                    {events && events.length > 0 ? (
                        <div className="space-y-2">
                        {events.slice().reverse().map((event, index) => {
                            const isHomeEvent = event.teamId === team1?.id;
                            const isAwayEvent = event.teamId === team2?.id;
                            const eventColor = isHomeEvent ? 'text-blue-400' : isAwayEvent ? 'text-red-400' : 'text-gray-400';

                            return(
                                <div key={index} className={`text-sm ${eventColor}`}>
                                <span className="text-muted-foreground font-mono">
                                    [{formatGameTime(event.time)}]
                                </span>{" "}
                                <span>{event.description}</span>
                                </div>
                            )
                        })}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground">
                        No events yet. The match is starting...
                        </div>
                    )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Players on Field</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <div>
                    <h3 className="font-bold text-blue-400">{team1.name}</h3>
                    <ul>
                        {team1.players.slice(0, 6).map((player: Player) => (
                            <li key={player.id}>{player.firstName} {player.lastName}</li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-red-400">{team2.name}</h3>
                    <ul>
                        {team2.players.slice(0, 6).map((player: Player) => (
                            <li key={player.id}>{player.firstName} {player.lastName}</li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}

export default GameSimulationUI;
