import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, Pause, RotateCcw, Clock, Users, Trophy, Zap, Target, Activity, 
  Eye, MessageCircle, BarChart3, Settings, DollarSign, 
  Heart, Shield, Footprints, ChevronLeft, ChevronRight 
} from 'lucide-react';
import webSocketManager, { LiveMatchState, MatchEvent, WebSocketCallbacks } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import GameCanvas from './GameCanvas';

// Enhanced interfaces for comprehensive match data
interface EnhancedPlayer {
  id: string;
  firstName: string;
  lastName: string;
  role: "PASSER" | "RUNNER" | "BLOCKER";
  teamId: string;
  race: string;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  staminaAttribute: number;
  leadership: number;
  agility: number;
  dailyStaminaLevel: number;
  injuryStatus: string;
  position?: { x: number; y: number };
  isActive?: boolean;
  matchStats?: {
    minutesPlayed: number;
    possessions: number;
    tackles: number;
    completions: number;
  };
}

interface StadiumData {
  capacity: number;
  attendance: number;
  fanLoyalty: number;
  atmosphere: number;
  revenue: {
    tickets: number;
    concessions: number;
    parking: number;
    merchandise: number;
    vip: number;
    total: number;
  };
  facilities: {
    concessions: number;
    parking: number;
    vip: number;
    merchandising: number;
    lighting: number;
  };
}

interface MatchEngineProps {
  matchId: string;
  userId: string;
  team1?: any;
  team2?: any;
  initialLiveState?: LiveMatchState;
  onMatchComplete?: (finalState: LiveMatchState) => void;
}

// Field Visualization Component - Dome Design
const FieldVisualization: React.FC<{
  homeTeam: any;
  awayTeam: any;
  homePlayers: EnhancedPlayer[];
  awayPlayers: EnhancedPlayer[];
  liveState: LiveMatchState;
  ballPosition: { x: number; y: number };
}> = ({ homeTeam, awayTeam, homePlayers, awayPlayers, liveState, ballPosition }) => {
  const FIELD_WIDTH = 400;
  const FIELD_HEIGHT = 200;
  
  return (
    <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-900">
      {/* Dome Field Visualization */}
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`}
        className="absolute inset-0"
      >
        <defs>
          <linearGradient id="domeFieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a472a" />
            <stop offset="50%" stopColor="#166534" />
            <stop offset="100%" stopColor="#134e4a" />
          </linearGradient>
        </defs>
        
        {/* Dome Field Shape */}
        <path
          d={`M ${FIELD_HEIGHT/2} 10 
              L ${FIELD_WIDTH - FIELD_HEIGHT/2} 10 
              A ${FIELD_HEIGHT/2} ${FIELD_HEIGHT/2} 0 0 1 ${FIELD_WIDTH - FIELD_HEIGHT/2} ${FIELD_HEIGHT - 10} 
              L ${FIELD_HEIGHT/2} ${FIELD_HEIGHT - 10} 
              A ${FIELD_HEIGHT/2} ${FIELD_HEIGHT/2} 0 0 1 ${FIELD_HEIGHT/2} 10 Z`}
          fill="url(#domeFieldGradient)"
          stroke="#ffffff"
          strokeWidth="3"
        />
        
        {/* Center line */}
        <line 
          x1={FIELD_WIDTH/2} 
          y1="20" 
          x2={FIELD_WIDTH/2} 
          y2={FIELD_HEIGHT - 20} 
          stroke="rgba(255,255,255,0.4)" 
          strokeWidth="2"
        />
        
        {/* Center circle */}
        <circle 
          cx={FIELD_WIDTH/2} 
          cy={FIELD_HEIGHT/2} 
          r="30" 
          fill="none" 
          stroke="rgba(255,255,255,0.3)" 
          strokeWidth="2"
        />
        
        {/* Left score zone (oval) */}
        <ellipse 
          cx={FIELD_HEIGHT/2} 
          cy={FIELD_HEIGHT/2} 
          rx="25" 
          ry="45" 
          fill="rgba(59, 130, 246, 0.2)" 
          stroke="rgba(59, 130, 246, 0.5)" 
          strokeWidth="2"
        />
        
        {/* Right score zone (oval) */}
        <ellipse 
          cx={FIELD_WIDTH - FIELD_HEIGHT/2} 
          cy={FIELD_HEIGHT/2} 
          rx="25" 
          ry="45" 
          fill="rgba(239, 68, 68, 0.2)" 
          stroke="rgba(239, 68, 68, 0.5)" 
          strokeWidth="2"
        />
      </svg>
      
      {/* Orb position */}
      <div 
        className="absolute w-3 h-3 bg-amber-400 rounded-full border-2 border-amber-600 shadow-lg"
        style={{
          left: `${ballPosition.x}%`,
          top: `${ballPosition.y}%`,
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 12px rgba(255, 193, 7, 0.6)'
        }}
      />
      
      {/* Home team players (blue) */}
      {homePlayers.filter(p => p.isActive).map(player => (
        <div
          key={player.id}
          className="absolute w-3 h-3 bg-blue-500 rounded-full border border-blue-700 shadow-sm"
          style={{
            left: `${player.position?.x || Math.random() * 80 + 10}%`,
            top: `${player.position?.y || Math.random() * 80 + 10}%`,
            transform: 'translate(-50%, -50%)'
          }}
          title={`${player.firstName} ${player.lastName} (${player.role})`}
        />
      ))}
      
      {/* Away team players (red) */}
      {awayPlayers.filter(p => p.isActive).map(player => (
        <div
          key={player.id}
          className="absolute w-3 h-3 bg-red-500 rounded-full border border-red-700 shadow-sm"
          style={{
            left: `${player.position?.x || Math.random() * 80 + 10}%`,
            top: `${player.position?.y || Math.random() * 80 + 10}%`,
            transform: 'translate(-50%, -50%)'
          }}
          title={`${player.firstName} ${player.lastName} (${player.role})`}
        />
      ))}
      
      {/* Possession indicator */}
      <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
        {(liveState as any)?.possession === homeTeam?.id ? homeTeam?.name : awayTeam?.name} Orb
      </div>
      
      {/* Match intensity indicator */}
      <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
        Intensity: {(liveState as any)?.intensity || 'High'}
      </div>
    </div>
  );
};

// Live Commentary Tab Component
const LiveCommentaryTab: React.FC<{
  events: MatchEvent[];
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
}> = ({ events, autoScroll, onToggleAutoScroll }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events, autoScroll]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm">Live Commentary</h3>
        <Button
          variant={autoScroll ? "default" : "outline"}
          size="sm"
          onClick={onToggleAutoScroll}
        >
          Auto-scroll: {autoScroll ? "ON" : "OFF"}
        </Button>
      </div>
      
      <ScrollArea className="h-48" ref={scrollRef}>
        <div className="space-y-2">
          {events.slice(0, 20).map((event, index) => (
            <div key={index} className="p-2 bg-muted rounded text-sm">
              <div className="flex justify-between items-start mb-1">
                <span className="font-mono text-xs text-muted-foreground">
                  {Math.floor(((event as any).gameTime || 0) / 60)}:{(((event as any).gameTime || 0) % 60).toString().padStart(2, '0')}
                </span>
                <Badge variant="outline" className="text-xs">
                  {event.type}
                </Badge>
              </div>
              <p className="text-sm">{event.description}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

// Live Stats Tab Component
const LiveStatsTab: React.FC<{
  homeTeam: any;
  awayTeam: any;
  liveState: LiveMatchState;
  enhancedStats: any;
}> = ({ homeTeam, awayTeam, liveState, enhancedStats }) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">Match Statistics</h3>
      
      {/* Possession */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>Possession</span>
          <span>{homeTeam?.name} {enhancedStats?.homePossession || 50}% | {enhancedStats?.awayPossession || 50}% {awayTeam?.name}</span>
        </div>
        <Progress value={enhancedStats?.homePossession || 50} className="h-2" />
      </div>
      
      {/* Total Yards */}
      <div className="flex justify-between text-sm">
        <span>Total Yards</span>
        <span>{homeTeam?.name} {enhancedStats?.homeYards || 0} | {enhancedStats?.awayYards || 0} {awayTeam?.name}</span>
      </div>
      
      {/* First Downs */}
      <div className="flex justify-between text-sm">
        <span>First Downs</span>
        <span>{homeTeam?.name} {enhancedStats?.homeFirstDowns || 0} | {enhancedStats?.awayFirstDowns || 0} {awayTeam?.name}</span>
      </div>
      
      {/* Turnovers */}
      <div className="flex justify-between text-sm">
        <span>Turnovers</span>
        <span>{homeTeam?.name} {enhancedStats?.homeTurnovers || 0} | {enhancedStats?.awayTurnovers || 0} {awayTeam?.name}</span>
      </div>
      
      <Separator />
      
      <Button variant="outline" size="sm" className="w-full">
        <BarChart3 className="w-4 h-4 mr-2" />
        Detailed Stats
      </Button>
    </div>
  );
};

// Stadium Revenue Tab Component  
const StadiumRevenueTab: React.FC<{
  stadiumData: StadiumData;
  matchType: string;
}> = ({ stadiumData, matchType }) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">Stadium Revenue (Live)</h3>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-muted p-2 rounded">
          <div className="font-semibold">Attendance</div>
          <div>{stadiumData?.attendance?.toLocaleString() || 0} / {stadiumData?.capacity?.toLocaleString() || 5000}</div>
        </div>
        
        <div className="bg-muted p-2 rounded">
          <div className="font-semibold">Atmosphere</div>
          <div>{stadiumData?.atmosphere || 50}%</div>
        </div>
      </div>
      
      {matchType === 'LEAGUE' && (
        <div className="space-y-2">
          <h4 className="font-semibold text-xs">Live Revenue</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Tickets:</span>
              <span>₡{stadiumData?.revenue?.tickets?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Concessions:</span>
              <span>₡{stadiumData?.revenue?.concessions?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Parking:</span>
              <span>₡{stadiumData?.revenue?.parking?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Merchandise:</span>
              <span>₡{stadiumData?.revenue?.merchandise?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>VIP Suites:</span>
              <span>₡{stadiumData?.revenue?.vip?.toLocaleString() || 0}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <span>₡{stadiumData?.revenue?.total?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Enhanced Match Engine Component
export const EnhancedMatchEngine: React.FC<MatchEngineProps> = ({
  matchId,
  userId,
  team1,
  team2,
  initialLiveState,
  onMatchComplete
}) => {
  const [liveState, setLiveState] = useState<LiveMatchState | null>(initialLiveState || null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isControlling, setIsControlling] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 50 });
  const [activeTab, setActiveTab] = useState("commentary");
  const [autoScroll, setAutoScroll] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const { toast } = useToast();

  // Basic match data query - always enabled
  const { data: basicMatchData, isLoading: matchLoading } = useQuery({
    queryKey: [`/api/matches/${matchId}`],
    enabled: !!matchId
  });

  // Enhanced data queries
  const { data: homeTeamPlayers } = useQuery({
    queryKey: [`/api/teams/${team1?.id}/players`],
    enabled: !!team1?.id
  });

  const { data: awayTeamPlayers } = useQuery({
    queryKey: [`/api/teams/${team2?.id}/players`],
    enabled: !!team2?.id
  });

  const { data: stadiumData } = useQuery({
    queryKey: [`/api/matches/${matchId}/stadium-data`],
    enabled: !!matchId,
    refetchInterval: 10000
  });

  const { data: enhancedMatchData } = useQuery({
    queryKey: [`/api/matches/${matchId}/enhanced-data`],
    enabled: !!matchId,
    refetchInterval: basicMatchData?.status === 'COMPLETED' ? 0 : 5000
  });

  // WebSocket connection
  useEffect(() => {
    if (!matchId || !userId) return;

    const callbacks: WebSocketCallbacks = {
      onMatchUpdate: (state: LiveMatchState) => {
        setLiveState(state);
        // Update ball position based on field position
        setBallPosition({
          x: 50 + (Math.random() - 0.5) * 20,
          y: ((state as any).fieldPosition || 50) + (Math.random() - 0.5) * 10
        });
      },
      onMatchEvent: (event: MatchEvent) => {
        setEvents(prev => [event, ...prev]);
      },
      onConnectionStatus: (connected: boolean) => {
        setIsConnected(connected);
      }
    };

    // Set callbacks first
    webSocketManager.setCallbacks(callbacks);

    // Connect to WebSocket first, then join match
    const connectAndJoin = async () => {
      try {
        await webSocketManager.connect(userId);
        await webSocketManager.joinMatch(matchId);
      } catch (error) {
        console.error('Failed to connect/join:', error);
        setIsConnected(false);
      }
    };

    connectAndJoin();

    return () => {
      webSocketManager.disconnect();
    };
  }, [matchId, userId]);

  // Match control functions
  const handlePlayPause = useCallback(async () => {
    if (!matchId) return;
    
    try {
      setIsControlling(true);
      const action = (liveState as any)?.status === 'paused' ? 'resume' : 'pause';
      await apiRequest(`/api/matches/${matchId}/control`, {
        method: 'POST',
        body: JSON.stringify({ action }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      toast({
        title: action === 'resume' ? "Match Resumed" : "Match Paused",
        description: `Match ${action}d successfully.`
      });
    } catch (error) {
      toast({
        title: "Control Failed",
        description: "Failed to control match playback.",
        variant: "destructive"
      });
    } finally {
      setIsControlling(false);
    }
  }, [matchId, liveState, toast]);

  const handleSpeedChange = useCallback(async (speed: number) => {
    if (!matchId) return;
    
    try {
      await apiRequest(`/api/matches/${matchId}/speed`, {
        method: 'POST',
        body: JSON.stringify({ speed }),
        headers: { 'Content-Type': 'application/json' }
      });
      setPlaybackSpeed(speed);
    } catch (error) {
      console.error('Failed to change speed:', error);
    }
  }, [matchId]);

  const formatGameTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // For completed matches, we don't need live state - show results if we have enhanced data
  const isCompleted = basicMatchData?.status === 'COMPLETED';
  const shouldShowResults = liveState || (isCompleted && enhancedMatchData);
  
  if (matchLoading || (!shouldShowResults && !isCompleted)) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <Activity className="w-8 h-8 mx-auto animate-spin" />
            <p>Loading match simulation...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If it's a completed match but we don't have enhanced data yet, show loading
  if (isCompleted && !enhancedMatchData) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <Activity className="w-8 h-8 mx-auto animate-spin" />
            <p>Loading match results...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* Enhanced Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            {/* Status indicator and teams */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isCompleted ? (
                  <>
                    <div className="w-2 h-2 bg-gray-500 rounded-full" />
                    <Badge variant="secondary" className="text-xs">FINAL</Badge>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <Badge variant="destructive" className="text-xs">LIVE</Badge>
                  </>
                )}
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="font-bold text-lg">{team1?.name || enhancedMatchData?.homeTeam?.name}</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {isCompleted ? enhancedMatchData?.finalScores?.home : liveState?.homeScore}
                  </div>
                </div>
                
                <div className="text-center">
                  {isCompleted ? (
                    <>
                      <div className="text-sm text-muted-foreground">Final Score</div>
                      <div className="font-mono text-xl">
                        {enhancedMatchData?.mvpData?.homeMVP ? (
                          <div className="text-xs">
                            MVP: {enhancedMatchData.mvpData.homeMVP.playerName}
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-muted-foreground">Game Clock</div>
                      <div className="font-mono text-xl">{formatGameTime(liveState?.gameTime || 0)}</div>
                      <div className="text-xs text-muted-foreground">
                        {(liveState as any)?.period === 1 ? '1st Half' : '2nd Half'}
                      </div>
                    </>
                  )}
                </div>
                
                <div className="text-center">
                  <div className="font-bold text-lg">{team2?.name || enhancedMatchData?.awayTeam?.name}</div>
                  <div className="text-3xl font-bold text-red-600">
                    {isCompleted ? enhancedMatchData?.finalScores?.away : liveState?.awayScore}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Controls - only show for live matches */}
            {!isCompleted && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayPause}
                  disabled={isControlling}
                >
                  {(liveState as any)?.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </Button>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant={playbackSpeed === 0.5 ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSpeedChange(0.5)}
                  >
                    0.5x
                  </Button>
                  <Button
                    variant={playbackSpeed === 1.0 ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSpeedChange(1.0)}
                  >
                    1x
                  </Button>
                  <Button
                    variant={playbackSpeed === 2.0 ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSpeedChange(2.0)}
                  >
                    2x
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Field Visualization */}
      <Card>
        <CardContent className="p-4">
          <FieldVisualization
            homeTeam={team1}
            awayTeam={team2}
            homePlayers={(homeTeamPlayers as EnhancedPlayer[]) || []}
            awayPlayers={(awayTeamPlayers as EnhancedPlayer[]) || []}
            liveState={liveState}
            ballPosition={ballPosition}
          />
        </CardContent>
      </Card>

      {/* Mobile-First Bottom Panel */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="commentary" className="flex items-center space-x-1">
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Commentary</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center space-x-1">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="revenue" className="flex items-center space-x-1">
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">Revenue</span>
              </TabsTrigger>
              <TabsTrigger value="players" className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Players</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="commentary" className="mt-4">
              <LiveCommentaryTab
                events={events}
                autoScroll={autoScroll}
                onToggleAutoScroll={() => setAutoScroll(!autoScroll)}
              />
            </TabsContent>
            
            <TabsContent value="stats" className="mt-4">
              <LiveStatsTab
                homeTeam={team1}
                awayTeam={team2}
                liveState={liveState}
                enhancedStats={enhancedMatchData}
              />
            </TabsContent>
            
            <TabsContent value="revenue" className="mt-4">
              <StadiumRevenueTab
                stadiumData={stadiumData as StadiumData}
                matchType={(liveState as any).matchType || 'LEAGUE'}
              />
            </TabsContent>
            
            <TabsContent value="players" className="mt-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Active Players</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold mb-2 text-blue-600">{team1?.name}</h4>
                    <div className="space-y-1">
                      {(homeTeamPlayers as any[])?.filter((p: any) => p.isActive)?.slice(0, 6)?.map((player: any) => (
                        <div key={player.id} className="flex justify-between text-xs p-1 bg-blue-50 rounded">
                          <span>{player.firstName} {player.lastName}</span>
                          <span className="text-muted-foreground">{player.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-semibold mb-2 text-red-600">{team2?.name}</h4>
                    <div className="space-y-1">
                      {(awayTeamPlayers as any[])?.filter((p: any) => p.isActive)?.slice(0, 6)?.map((player: any) => (
                        <div key={player.id} className="flex justify-between text-xs p-1 bg-red-50 rounded">
                          <span>{player.firstName} {player.lastName}</span>
                          <span className="text-muted-foreground">{player.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Jules' 2D Match Engine Integration */}
      <GameCanvas
        matchId={matchId}
        gameData={{
          homeTeam: { 
            name: team1?.name, 
            players: homeTeamPlayers 
          },
          awayTeam: { 
            name: team2?.name, 
            players: awayTeamPlayers 
          }
        }}
        liveState={liveState}
        events={events}
        width={800}
        height={500}
        className="mt-4"
      />

      {/* Connection Status */}
      {!isConnected && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center space-x-2 p-3">
            <Activity className="w-4 h-4 text-yellow-600 animate-spin" />
            <span className="text-sm text-yellow-700">Reconnecting to live match...</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedMatchEngine;