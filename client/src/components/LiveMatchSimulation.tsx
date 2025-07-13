import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Clock, Users, Zap, Target, Trophy, Activity, Play, Pause, RotateCcw } from "lucide-react";
import { AdSystem, useAdSystem } from "@/components/AdSystem";
import { apiRequest } from '@/lib/queryClient';
import webSocketManager, { LiveMatchState as WSLiveMatchState, MatchEvent, WebSocketCallbacks } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface LiveMatchSimulationProps {
  matchId: string;
  team1: any;
  team2: any;
  initialLiveState?: any;
  onMatchComplete?: () => void;
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

interface GameEvent {
  time: number;
  type: string;
  description: string;
  teamId?: string;
  actingPlayerId?: string;
  data?: any;
}

interface LiveMatchState {
  gameTime: number;
  maxTime: number;
  currentHalf: number;
  homeScore: number;
  awayScore: number;
  status: string;
  isRunning: boolean;
  recentEvents: GameEvent[];
  possessingTeamId?: string;
}

interface KeyPerformer {
  playerId: string;
  playerName: string;
  statLabel: string;
  statValue: number;
}

export function LiveMatchSimulation({ matchId, team1, team2, initialLiveState, onMatchComplete, enhancedData }: LiveMatchSimulationProps) {
  const [liveState, setLiveState] = useState<LiveMatchState | null>(initialLiveState || null);
  const [realTimeState, setRealTimeState] = useState<WSLiveMatchState | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isControlling, setIsControlling] = useState(false);
  const [halftimeAdShown, setHalftimeAdShown] = useState(false);
  const { showRewardedVideoAd, closeAd, adConfig } = useAdSystem();
  const { user } = useAuth();
  const { toast } = useToast();
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // WebSocket integration for real-time updates
  useEffect(() => {
    if (!matchId || !user?.claims?.sub) return;

    const initializeWebSocket = async () => {
      try {
        // Connect to WebSocket if not already connected
        if (!webSocketManager.isConnected()) {
          await webSocketManager.connect(user.claims.sub);
        }

        // Set up callbacks for real-time updates
        const callbacks: WebSocketCallbacks = {
          onMatchUpdate: (state: WSLiveMatchState) => {
            console.log("Real-time match update:", state);
            setRealTimeState(state);
            setEvents(state.gameEvents || []);
            
            // Convert to legacy format for compatibility
            setLiveState({
              gameTime: state.gameTime,
              maxTime: state.maxTime,
              currentHalf: state.currentHalf,
              homeScore: state.homeScore,
              awayScore: state.awayScore,
              status: state.status,
              isRunning: state.status === 'live',
              recentEvents: (state.gameEvents || []).slice(-10).map(e => ({
                time: e.time,
                type: e.type,
                description: e.description,
                teamId: e.teamId,
                actingPlayerId: e.actingPlayerId,
                data: e.data
              })),
              possessingTeamId: state.possessingTeamId
            });
          },
          onMatchEvent: (event: MatchEvent) => {
            console.log("Real-time match event:", event);
            setEvents(prev => [...prev, event]);
            
            // Handle halftime ads
            if (event.type === 'halftime' && !halftimeAdShown) {
              setHalftimeAdShown(true);
              if (adConfig.halftimeVideo.enabled) {
                showRewardedVideoAd('halftimeVideo');
              }
            }

            // Show important events as toasts
            if (event.type === 'score') {
              toast({
                title: 'SCORE!',
                description: event.description,
                duration: 3000,
              });
            }
          },
          onMatchComplete: (data) => {
            console.log("Match completed:", data);
            setRealTimeState(data.finalState);
            setEvents(data.finalState.gameEvents || []);
            if (onMatchComplete) {
              onMatchComplete();
            }
            toast({
              title: 'Match Complete!',
              description: `Final Score: ${data.finalState.homeScore} - ${data.finalState.awayScore}`,
              duration: 5000,
            });
          },
          onConnectionStatus: (connected: boolean) => {
            setIsConnected(connected);
          },
          onError: (error) => {
            console.error('WebSocket error:', error);
            toast({
              title: 'Connection Error',
              description: error.message,
              variant: 'destructive',
              duration: 4000,
            });
          }
        };

        webSocketManager.setCallbacks(callbacks);
        
        // Join match room
        await webSocketManager.joinMatch(matchId);
        
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        // Fallback to old polling method if WebSocket fails
        const syncWithBackend = async () => {
          try {
            const response = await apiRequest(`/api/matches/${matchId}`);
            if (response.liveState) {
              console.log("Fallback: Syncing with backend match state:", response.liveState);
              setLiveState(response.liveState);
              
              if (response.liveState.status === 'completed' && onMatchComplete) {
                onMatchComplete();
              }
            }
          } catch (error) {
            console.error("Error syncing with backend:", error);
          }
        };

        syncWithBackend();
        syncIntervalRef.current = setInterval(syncWithBackend, 2000);
      }
    };

    initializeWebSocket();

    return () => {
      webSocketManager.leaveMatch();
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [matchId, user, onMatchComplete, halftimeAdShown, showRewardedVideoAd, adConfig.halftimeVideo.enabled, toast]);

  // Auto-scroll events to bottom
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // Auto-scroll log to top
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [liveState?.recentEvents]);

  const formatGameTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getGamePhase = (gameTime: number, maxTime: number, currentHalf: number) => {
    const timePercent = gameTime / maxTime;
    
    // Check for completed match
    if (timePercent >= 1.0) {
      return { label: "FINAL SCORE", color: "bg-purple-600 animate-pulse" };
    }
    
    // Check for halftime (48-52% of total game time)
    if (timePercent >= 0.48 && timePercent <= 0.52) {
      return { label: "HALFTIME", color: "bg-blue-600 animate-pulse" };
    }
    
    // Calculate game phase based on total game time
    if (timePercent < 0.25) return { label: "Early Game", color: "bg-green-500" };
    if (timePercent < 0.65) return { label: "Mid Game", color: "bg-yellow-500" };
    if (timePercent < 0.85) return { label: "Late Game", color: "bg-orange-500" };
    return { label: "Clutch Time!", color: "bg-red-500 animate-pulse" };
  };

  const getAttendanceData = () => {
    // Use enhanced atmosphere data if available, otherwise use defaults
    const atmosphereData = enhancedData?.atmosphereEffects || {};
    
    // Calculate attendance and capacity
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
    // Check for MVP data in recent events (halftime or final)
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

  if (!liveState) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">Loading match data...</div>
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
      {/* Top Row - Main Info Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* A. Scoreboard & Possession Panel (Top-Left) */}
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

        {/* B. Game Clock & Phase Panel (Top-Center) */}
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

        {/* C. Atmosphere & Crowd Panel (Top-Right) - Revamped */}
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

      {/* D. Tactics & Camaraderie Panel (NEW) */}
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

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* F. Key Performers Panel (NEW) */}
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

        {/* E. Real-time Commentary & Controls */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Live Commentary
              {isConnected ? (
                <Badge variant="default" className="animate-pulse">
                  WebSocket Connected
                </Badge>
              ) : (
                <Badge variant="secondary">
                  Polling Mode
                </Badge>
              )}
              {liveState?.status === 'live' && (
                <Badge variant="destructive" className="animate-pulse">
                  Live Match
                </Badge>
              )}
            </CardTitle>
            
            {/* Match Controls for admins */}
            {isConnected && liveState?.status === 'live' && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => {
                    setIsControlling(true);
                    try {
                      await webSocketManager.pauseMatch(matchId);
                      toast({
                        title: "Match Paused",
                        description: "Match has been paused",
                        duration: 2000,
                      });
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Could not pause match",
                        variant: "destructive",
                        duration: 3000,
                      });
                    } finally {
                      setIsControlling(false);
                    }
                  }}
                  disabled={isControlling}
                >
                  <Pause className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => {
                    setIsControlling(true);
                    try {
                      await webSocketManager.resumeMatch(matchId);
                      toast({
                        title: "Match Resumed",
                        description: "Match has been resumed",
                        duration: 2000,
                      });
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Could not resume match",
                        variant: "destructive",
                        duration: 3000,
                      });
                    } finally {
                      setIsControlling(false);
                    }
                  }}
                  disabled={isControlling}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea ref={logRef} className="h-64 w-full rounded-md border p-4">
              {/* Show real-time events first if available */}
              {events && events.length > 0 ? (
                <div className="space-y-2">
                  {events.slice().reverse().map((event, index) => (
                    <div key={index} className="text-sm">
                      <span className="text-muted-foreground font-mono">
                        [{formatGameTime(event.time)}]
                      </span>{" "}
                      <span className="text-foreground">{event.description}</span>
                      {event.type === 'score' && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Score!
                        </Badge>
                      )}
                    </div>
                  ))}
                  <div ref={eventsEndRef} />
                </div>
              ) : liveState?.recentEvents && liveState.recentEvents.length > 0 ? (
                <div className="space-y-2">
                  {liveState.recentEvents.slice().reverse().map((event, index) => (
                    <div key={index} className="text-sm">
                      <span className="text-muted-foreground font-mono">
                        [{formatGameTime(event.time)}]
                      </span>{" "}
                      <span>{event.description}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  {isConnected ? "Waiting for real-time events..." : "No events yet - match is starting..."}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Halftime Ad System - Temporarily disabled for testing */}
      {false && liveState.currentHalf === 2 && !halftimeAdShown && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6">
            <CardContent>
              <div className="text-center">
                <h3 className="text-lg font-bold mb-4">Halftime Break</h3>
                <Button onClick={() => setHalftimeAdShown(true)}>Continue Match</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}