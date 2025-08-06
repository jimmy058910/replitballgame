import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Play, Pause, Clock, Users, Trophy, Zap, Target, Activity, Eye } from 'lucide-react';
import webSocketManager, { LiveMatchState, MatchEvent, WebSocketCallbacks } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import GameCanvas from './GameCanvas';
import EnhancedPostMatchSummary from './EnhancedPostMatchSummary';

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

interface AtmosphereData {
  data?: any;
}

interface EnhancedMatchData {
  data?: any;
}

interface TeamFormation {
  formationJson: string | object;
}

interface MatchEvent {
  type: string;
  description: string;
  text?: string;
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

  // Fetch initial match data - reduced polling when WebSocket connected
  const { data: initialMatchData, error: matchError } = useQuery({
    queryKey: [`/api/matches/${matchId ? String(matchId) : 'unknown'}`],
    enabled: !!matchId,
    refetchInterval: isConnected ? 20000 : 5000, // Much less frequent when WebSocket connected
    staleTime: isConnected ? 15000 : 3000, // Cache longer when WebSocket active
  });

  // Fetch team players for field display
  const { data: homeTeamPlayers } = useQuery<Player[]>({
    queryKey: [`/api/teams/${team1?.id ? String(team1?.id) : 'unknown'}/players`],
    enabled: !!team1?.id
  });

  const { data: awayTeamPlayers } = useQuery<Player[]>({
    queryKey: [`/api/teams/${team2?.id ? String(team2?.id) : 'unknown'}/players`],
    enabled: !!team2?.id
  });

  // Fetch formation data to show correct starters
  const { data: homeFormation } = useQuery<TeamFormation>({
    queryKey: [`/api/teams/${team1?.id ? String(team1?.id) : 'unknown'}/formation`],
    enabled: !!team1?.id
  });

  const { data: awayFormation } = useQuery<TeamFormation>({
    queryKey: [`/api/teams/${team2?.id ? String(team2?.id) : 'unknown'}/formation`],
    enabled: !!team2?.id
  });

  // Fetch stadium data for the home team (only home team has stadium effects)
  const { data: stadiumData } = useQuery({
    queryKey: ['/api/stadium-atmosphere/stadium-data'],
    enabled: !!team1?.id,
    staleTime: 60000 // Stadium data doesn't change often during a match
  });

  // Fetch atmosphere data for the home team
  const { data: atmosphereData } = useQuery<AtmosphereData>({
    queryKey: ['/api/stadium-atmosphere/atmosphere-data'], 
    enabled: !!team1?.id,
    staleTime: 30000 // Atmosphere changes less frequently
  });

  // Fetch enhanced match data for MVP and stats - reduced polling when WebSocket connected
  const { data: enhancedMatchData } = useQuery<EnhancedMatchData>({
    queryKey: [`/api/matches/${matchId ? String(matchId) : 'unknown'}/enhanced-data`],
    enabled: !!matchId && !!liveState,
    refetchInterval: isConnected ? 15000 : 5000, // Less frequent when WebSocket connected
    staleTime: isConnected ? 10000 : 2000, // Cache longer when WebSocket active
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
            setLiveState(prevState => {
              // Prevent race conditions by only updating if state is newer
              if (!prevState || state.lastUpdateTime >= (prevState.lastUpdateTime || 0)) {
                return state;
              }
              return prevState;
            });
            setEvents(state.gameEvents || []);
          },
          onMatchEvent: (event: MatchEvent) => {
            console.log('🎯 GameSimulationUI: Match event received:', event);
            setEvents(prev => [event, ...prev]);

            // Show important events as toast notifications
            if (event.type === 'score' || event.type === 'halftime') {
              toast({
                title: event.type === 'score' ? '🏆 SCORE!' :
                       event.type === 'halftime' ? '⏰ Halftime' : '',
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
    // Use authentic stadium API data first, then enhanced match data fallback
    const apiStadiumData = stadiumData?.data || {};
    const apiAtmosphereData = atmosphereData?.data || {};
    const enhancedAtmosphereData = enhancedData?.atmosphereEffects || {};

    // Prioritize authentic API data over match simulation data
    const capacity = apiStadiumData.capacity || enhancedAtmosphereData.capacity || 5000; // Starting stadium capacity is 5,000
    const fanLoyalty = apiAtmosphereData.fanLoyalty || enhancedAtmosphereData.fanLoyalty || 50; // Starting fan loyalty is 50%
    const rawAttendance = apiAtmosphereData.attendance || enhancedAtmosphereData.attendance || Math.floor(capacity * 0.6); // 60% default attendance
    
    // CRITICAL FIX: Ensure attendance never exceeds stadium capacity (fixes 400% capacity bug)
    const attendance = Math.min(rawAttendance, capacity);
    
    const intimidationEffect = enhancedAtmosphereData.intimidationFactor || Math.floor(fanLoyalty / 20);
    const homeFieldAdvantage = enhancedAtmosphereData.homeFieldAdvantage || Math.floor(fanLoyalty / 15);

    return {
      attendance,
      capacity,
      percentage: Math.floor((attendance / capacity) * 100),
      fanLoyalty,
      intimidationEffect,
      homeFieldAdvantage,
      crowdNoise: enhancedAtmosphereData.crowdNoise || Math.floor(Math.random() * 30) + 70
    };
  };

  const getKeyPerformers = (): { home: KeyPerformer | null; away: KeyPerformer | null } => {
    const halftimeEvent = liveState?.gameEvents?.find(e => e.type === 'halftime');
    const finalEvent = liveState?.gameEvents?.find(e => e.type === 'match_complete');

    console.log('🔍 MVP Debug - Enhanced Match Data:', enhancedMatchData);
    console.log('🔍 MVP Debug - Enhanced Data:', enhancedData);
    console.log('🔍 MVP Debug - Halftime Event:', halftimeEvent);
    console.log('🔍 MVP Debug - Final Event:', finalEvent);

    // Check enhanced match data for MVP data first (from the API endpoint)
    let mvpData = (enhancedMatchData as any)?.mvpData || null;

    if (finalEvent?.data?.mvp) {
      mvpData = finalEvent.data.mvp;
      console.log('🎯 Using MVP data from final event:', mvpData);
    } else if (halftimeEvent?.data?.mvp) {
      mvpData = halftimeEvent.data.mvp;
      console.log('🎯 Using MVP data from halftime event:', mvpData);
    } else if ((enhancedMatchData as any)?.mvpData) {
      mvpData = (enhancedMatchData as any).mvpData;
      console.log('🎯 Using MVP data from enhanced match data:', mvpData);
    } else if (enhancedData?.mvpPlayers) {
      mvpData = {
        homeMVP: { playerName: enhancedData.mvpPlayers.home, score: 100 },
        awayMVP: { playerName: enhancedData.mvpPlayers.away, score: 100 }
      };
      console.log('🎯 Using MVP data from enhanced data mvpPlayers:', mvpData);
    } else if ((enhancedData as any)?.mvpData) {
      mvpData = (enhancedData as any).mvpData;
      console.log('🎯 Using MVP data from enhanced data mvpData:', mvpData);
    }

    console.log('🔍 Final MVP Data being used:', mvpData);

    // Get player stats from game events
    const getPlayerStats = (playerName: string) => {
      if (!liveState?.gameEvents) return null;
      
      const events = liveState?.gameEvents?.filter(e => e.description?.includes(playerName)) || [];
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

  // Calculate player power rating
  const calculatePlayerPower = (player: Player) => {
    const attributes = [
      player.speed || 0, 
      player.power || 0, 
      player.throwing || 0, 
      player.catching || 0, 
      player.kicking || 0, 
      player.stamina || 0, 
      player.agility || 0, 
      player.leadership || 0
    ];
    const total = attributes.reduce((sum, attr) => sum + attr, 0);
    return Math.round(total / 8);
  };

  // Get field players using formation data
  const getFieldPlayers = () => {
    // Helper function to get players from formation data
    const getFormationPlayers = (players: Player[], formation: any, teamName: string) => {
      console.log(`🔍 Formation Debug - ${teamName}:`, { formation, players: players?.length });
      
      if (!formation || !formation.formationJson) {
        console.log(`⚠️ No formation data for ${teamName}, using first 6 players`);
        return players?.slice(0, 6) || [];
      }

      try {
        const formationData = typeof formation.formationJson === 'string' 
          ? JSON.parse(formation.formationJson) 
          : formation.formationJson;

        console.log(`📋 Formation data parsed for ${teamName}:`, formationData);

        if (formationData.starters && Array.isArray(formationData.starters)) {
          console.log(`🎯 Using formation starters for ${teamName}:`, formationData.starters);
          
          // Get players based on formation starters (formation data stores objects with id and role properties)
          const starterPlayers = formationData.starters.map((starter: any) => {
            const player = players?.find(p => p.id === starter.id);
            console.log(`🔍 Looking for player ${starter.id} for ${teamName}:`, player ? `Found: ${player.firstName} ${player.lastName}` : 'Not found');
            return player;
          }).filter(Boolean);
          
          console.log(`✅ Found ${starterPlayers.length} formation starters for ${teamName}`);
          
          // If we have starters, use them; otherwise fallback to first 6
          return starterPlayers.length > 0 ? starterPlayers : players?.slice(0, 6) || [];
        }
      } catch (error) {
        console.error(`❌ Error parsing formation data for ${teamName}:`, error);
      }
      
      // Fallback to first 6 players
      console.log(`⚠️ Using fallback first 6 players for ${teamName}`);
      return players?.slice(0, 6) || [];
    };

    const homeFieldPlayers = getFormationPlayers(homeTeamPlayers, homeFormation, 'Home');
    const awayFieldPlayers = getFormationPlayers(awayTeamPlayers, awayFormation, 'Away');
    
    return {
      home: homeFieldPlayers.map((player: Player) => ({
        ...player,
        power: calculatePlayerPower(player)
      })),
      away: awayFieldPlayers.map((player: Player) => ({
        ...player,
        power: calculatePlayerPower(player)
      }))
    };
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

  // Determine correct maxTime based on match type - default to league time (2400) unless exhibition
  const matchType = (initialMatchData as any)?.matchType;
  const defaultMaxTime = matchType === 'EXHIBITION' ? 1800 : 2400; // Exhibition: 30 min, League: 40 min
  
  const gamePhase = getGamePhase(liveState?.gameTime || 0, liveState?.maxTime || defaultMaxTime, liveState?.currentHalf || 1);
  const attendanceData = getAttendanceData();
  const keyPerformers = getKeyPerformers();
  const gameTime = Number(liveState?.gameTime || 0);
  const maxTime = Number(liveState?.maxTime || defaultMaxTime);
  const currentHalf = Number(liveState?.currentHalf || 1);
  const halfProgress = currentHalf === 1
    ? (gameTime / (maxTime / 2)) * 100
    : ((gameTime - (maxTime / 2)) / (maxTime / 2)) * 100;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* Post-Match Summary - Show when match is finished */}
      {liveState?.status === 'FINISHED' && (
        <div className="mb-6">
          <EnhancedPostMatchSummary 
            matchData={{
              homeScore: liveState.homeScore,
              awayScore: liveState.awayScore,
              matchType: matchType || 'LEAGUE'
            }}
            gameData={initialMatchData || {}}
            liveState={liveState}
            onViewReplay={() => {
              console.log('View Replay clicked');
            }}
          />
        </div>
      )}

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
                  {liveState?.possessingTeamId === (team1?.id ? String(team1?.id) : '') && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                  <span className={liveState?.possessingTeamId === (team1?.id ? String(team1?.id) : '') ? "font-bold" : ""}>
                    {team1?.name ? String(team1?.name) : "Home Team"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={liveState?.possessingTeamId === (team2?.id ? String(team2?.id) : '') ? "font-bold" : ""}>
                    {team2?.name ? String(team2?.name) : "Away Team"}
                  </span>
                  {liveState?.possessingTeamId === (team2?.id ? String(team2?.id) : '') && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              </div>
              <div className="text-3xl font-bold">
                {liveState?.homeScore || 0} - {liveState?.awayScore || 0}
              </div>
              <div className="text-xs text-muted-foreground">
                {liveState?.possessingTeamId ? "Possession indicated by green dot" : "Neutral possession"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game Clock */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Game Clock
              </div>
              {spectatorCount > 0 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  {spectatorCount}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-mono font-bold">
                {formatGameTime(liveState?.gameTime || 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Half {liveState?.currentHalf || 1}
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

        {/* Jules' 2D Match Engine */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            2D Match Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GameCanvas
            matchId={matchId}
            gameData={{
              homeTeam: { 
                name: team1?.name || 'Home Team',
                players: Array.isArray(homeTeamPlayers) ? homeTeamPlayers.map((p: any) => ({
                  id: p.id,
                  firstName: p.firstName,
                  lastName: p.lastName,
                  race: p.race || 'Human',
                  speed: p.speed || 20,
                  power: p.power || 20,
                  agility: p.agility || 20,
                  role: p.role,
                  dailyStaminaLevel: p.dailyStaminaLevel || 80
                })) : []
              },
              awayTeam: { 
                name: team2?.name || 'Away Team',
                players: Array.isArray(awayTeamPlayers) ? awayTeamPlayers.map((p: any) => ({
                  id: p.id,
                  firstName: p.firstName,
                  lastName: p.lastName,
                  race: p.race || 'Human',
                  speed: p.speed || 20,
                  power: p.power || 20,
                  agility: p.agility || 20,
                  role: p.role,
                  dailyStaminaLevel: p.dailyStaminaLevel || 80
                })) : []
              }
            }}
            liveState={{
              gameTime: liveState?.gameTime || 0,
              homeScore: liveState?.homeScore || 0,
              awayScore: liveState?.awayScore || 0,
              status: liveState?.status || 'SCHEDULED'
            }}
            events={liveState?.gameEvents?.slice(-5) || []}
            width={800}
            height={500}
            className="w-full"
          />
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
          </CardContent>
        </Card>
      </div>

      {/* Key Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              {team1?.name ? String(team1?.name) : "Home"} Key Performer
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
              {team2?.name ? String(team2?.name) : "Away"} Key Performer
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

      {/* Field Display - 12 Players */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            Players on Field
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Home Team */}
            <div className="space-y-3">
              <div className="text-center">
                <h3 className="font-semibold text-red-600 border-b-2 border-red-200 pb-1">
                  {team1?.name ? String(team1?.name) : "Home Team"}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {getFieldPlayers().home.map((player: any, index: number) => (
                  <div key={player.id} className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-2 rounded-r">
                    <div className="text-sm font-medium text-red-700 dark:text-red-300">
                      {player?.firstName ? String(player?.firstName) : "Unknown"} {player?.lastName ? String(player?.lastName) : "Player"}
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-400 flex justify-between">
                      <span>{player?.race ? String(player?.race) : "Unknown"} {player?.role ? String(player?.role) : "Role"}</span>
                      <span className="font-mono">PWR: {player?.power ? String(player?.power) : "0"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Away Team */}
            <div className="space-y-3">
              <div className="text-center">
                <h3 className="font-semibold text-blue-600 border-b-2 border-blue-200 pb-1">
                  {team2?.name ? String(team2?.name) : "Away Team"}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {getFieldPlayers().away.map((player: any, index: number) => (
                  <div key={player.id} className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-2 rounded-r">
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {player?.firstName ? String(player?.firstName) : "Unknown"} {player?.lastName ? String(player?.lastName) : "Player"}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 flex justify-between">
                      <span>{player?.race ? String(player?.race) : "Unknown"} {player?.role ? String(player?.role) : "Role"}</span>
                      <span className="font-mono">PWR: {player?.power ? String(player?.power) : "0"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
              {liveState?.gameEvents && liveState?.gameEvents.length > 0 ? (
                liveState?.gameEvents.slice(-15).reverse().map((event, index) => (
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