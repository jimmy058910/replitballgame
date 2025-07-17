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
import { apiRequest, queryClient } from '@/lib/queryClient';

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
  const [spectatorCount, setSpectatorCount] = useState(0);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const logRef = useRef<HTMLDivElement>(null);

  // Fetch initial match data
  const { data: initialMatchData, error: matchError } = useQuery({
    queryKey: [`/api/matches/${matchId}`],
    enabled: !!matchId
  });

  // Auto-scroll log to top
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [liveState?.gameEvents]);

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
            console.log('🎮 GameSimulationUI: Match state update received:', state);
            setLiveState(state);
            setEvents(state.gameEvents || []);
          },
          onMatchEvent: (event: MatchEvent) => {
            console.log('🎯 GameSimulationUI: Match event received:', event);
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
            console.log('🏁 GameSimulationUI: Match completed:', data);
            setLiveState(data.finalState);
            setEvents(data.finalState.gameEvents || []);
            
            // Invalidate match data query to trigger refetch and show PostGameSummary
            queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}/enhanced-data`] });
            
            // Add a small delay to ensure database update is complete
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}`] });
              console.log('🔄 Match data query invalidated after match completion');
            }, 1000);
            
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
            console.log('🔌 Connection status update:', connected);
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
          onSpectatorCountUpdate: (count: number) => {
            setSpectatorCount(count);
          },
          onError: (error) => {
            console.error('🔥 GameSimulationUI: WebSocket error:', error);
            toast({
              title: '❌ Connection Error',
              description: 'Lost connection to live match. Trying to reconnect...',
              variant: 'destructive',
              duration: 4000,
            });
          }
        };

        // Register callbacks with WebSocket manager
        webSocketManager.setCallbacks(callbacks);
        console.log('🔧 GameSimulationUI: Callbacks registered with WebSocket manager');

        // Join match room
        await webSocketManager.joinMatch(matchId);

        // Set connection status to true since we successfully joined
        setIsConnected(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        setIsLoading(false);
        toast({
          title: '❌ Connection Failed',
          description: 'Failed to connect to live match. Please refresh the page.',
          variant: 'destructive',
          duration: 5000,
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
    const halftimeEvent = liveState?.gameEvents?.find(e => e.type === 'halftime');
    const finalEvent = liveState?.gameEvents?.find(e => e.type === 'match_complete');

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

    // Get player stats from game events
    const getPlayerStats = (playerName: string) => {
      if (!liveState?.gameEvents) return null;
      
      const events = liveState.gameEvents.filter(e => e.description?.includes(playerName));
      let passes = 0, runs = 0, tackles = 0, scores = 0;
      
      events.forEach(event => {
        if (event.type === 'pass') passes++;
        else if (event.type === 'run') runs++;
        else if (event.type === 'tackle') tackles++;
        else if (event.type === 'score') scores++;
      });
      
      if (scores > 0) return { label: "Scores", value: scores };
      if (passes > 0) return { label: "Passes", value: passes };
      if (runs > 0) return { label: "Runs", value: runs };
      if (tackles > 0) return { label: "Tackles", value: tackles };
      return null;
    };

    let homePerformer = null;
    let awayPerformer = null;

    // Check enhanced data for MVP players first
    if (enhancedData?.mvpPlayers?.home && enhancedData.mvpPlayers.home !== 'N/A' && enhancedData.mvpPlayers.home !== 'No MVP') {
      const stats = getPlayerStats(enhancedData.mvpPlayers.home);
      homePerformer = {
        playerId: "mvp-home",
        playerName: enhancedData.mvpPlayers.home,
        statLabel: stats?.label || "MVP Score",
        statValue: stats?.value || 100
      };
    } else if (mvpData?.homeMVP?.playerName && mvpData.homeMVP.playerName !== 'N/A' && mvpData.homeMVP.playerName !== 'No MVP') {
      const stats = getPlayerStats(mvpData.homeMVP.playerName);
      homePerformer = {
        playerId: "mvp-home",
        playerName: mvpData.homeMVP.playerName,
        statLabel: stats?.label || "MVP Score",
        statValue: stats?.value || Math.round(mvpData.homeMVP.score || 0)
      };
    } else {
      homePerformer = {
        playerId: "player1",
        playerName: "No MVP",
        statLabel: "Awaiting Stats",
        statValue: 0
      };
    }

    // Check enhanced data for MVP players first
    if (enhancedData?.mvpPlayers?.away && enhancedData.mvpPlayers.away !== 'N/A' && enhancedData.mvpPlayers.away !== 'No MVP') {
      const stats = getPlayerStats(enhancedData.mvpPlayers.away);
      awayPerformer = {
        playerId: "mvp-away",
        playerName: enhancedData.mvpPlayers.away,
        statLabel: stats?.label || "MVP Score",
        statValue: stats?.value || 100
      };
    } else if (mvpData?.awayMVP?.playerName && mvpData.awayMVP.playerName !== 'N/A' && mvpData.awayMVP.playerName !== 'No MVP') {
      const stats = getPlayerStats(mvpData.awayMVP.playerName);
      awayPerformer = {
        playerId: "mvp-away",
        playerName: mvpData.awayMVP.playerName,
        statLabel: stats?.label || "MVP Score",
        statValue: stats?.value || Math.round(mvpData.awayMVP.score || 0)
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
      <Card className="w-full max-w-6xl mx-auto">
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
      <Card className="w-full max-w-6xl mx-auto">
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
      <Card className="w-full max-w-6xl mx-auto">
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
        {/* Scoreboard */}
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

        {/* Game Clock */}
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
              <div className="flex justify-between text-xs">
                <span>Half Progress</span>
                <span>{Math.round(halfProgress)}%</span>
              </div>
              <Progress value={halfProgress} className="h-2" />
            </div>
            <div className="flex justify-center">
              <Badge className={`${gamePhase.color} text-white px-2 py-1 text-xs`}>
                {gamePhase.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Stadium Atmosphere */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Stadium
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Attendance</span>
              <span>{attendanceData.attendance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Capacity</span>
              <span>{attendanceData.percentage}%</span>
            </div>
            <Progress value={attendanceData.percentage} className="h-2" />
            <div className="flex justify-between text-sm">
              <span>Fan Loyalty</span>
              <span>{attendanceData.fanLoyalty}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Home Advantage</span>
              <span title="Reduces away team's Catching & Throwing stats">+{attendanceData.homeFieldAdvantage}</span>
            </div>
            {spectatorCount > 0 && (
              <div className="flex justify-between text-sm border-t pt-2">
                <span>Live Spectators</span>
                <span>{spectatorCount}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              {team1?.name || "Home"} Key Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold">
                {keyPerformers.home?.playerName || "No MVP"}
              </div>
              <div className="text-sm text-muted-foreground">
                {keyPerformers.home?.statLabel || "Awaiting Stats"}
              </div>
              <div className="text-2xl font-bold text-green-600">
                {keyPerformers.home?.statValue || 0}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-red-500" />
              {team2?.name || "Away"} Key Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold">
                {keyPerformers.away?.playerName || "No MVP"}
              </div>
              <div className="text-sm text-muted-foreground">
                {keyPerformers.away?.statLabel || "Awaiting Stats"}
              </div>
              <div className="text-2xl font-bold text-red-600">
                {keyPerformers.away?.statValue || 0}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Commentary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            Live Commentary
            <div className="flex items-center gap-2 ml-auto">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Live' : 'Disconnected'}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full">
            <div ref={logRef} className="space-y-2">
              {liveState.gameEvents && liveState.gameEvents.length > 0 ? (
                liveState.gameEvents.slice(-15).reverse().map((event, index) => (
                  <div key={index} className="flex items-start space-x-3 p-2 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground min-w-[60px]">
                      {formatGameTime(event.time)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm">
                        {event.description || event.text || "Match event"}
                      </div>
                      {event.type && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {event.type}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No events yet. Waiting for match activity...
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}