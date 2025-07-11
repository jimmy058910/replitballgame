import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Clock, Users, Zap, Target, Trophy, Activity } from "lucide-react";
import { AdSystem, useAdSystem } from "@/components/AdSystem";
import { apiRequest } from '@/lib/queryClient';

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
  const [halftimeAdShown, setHalftimeAdShown] = useState(false);
  const { showRewardedVideoAd, closeAd, adConfig } = useAdSystem();
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Sync with backend every 2 seconds
  useEffect(() => {
    if (!matchId) return;

    const syncWithBackend = async () => {
      try {
        const response = await apiRequest(`/api/matches/${matchId}`);
        if (response.liveState) {
          console.log("Syncing with backend match state:", response.liveState);
          setLiveState(response.liveState);
          
          // Check if match completed
          if (response.liveState.status === 'completed' && onMatchComplete) {
            onMatchComplete();
          }
        }
      } catch (error) {
        console.error("Error syncing with backend:", error);
      }
    };

    // Initial sync
    syncWithBackend();

    // Set up interval for live updates
    syncIntervalRef.current = setInterval(syncWithBackend, 2000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [matchId, onMatchComplete]);

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
    const halfTime = maxTime / 2;
    const halfProgress = currentHalf === 1 ? gameTime / halfTime : (gameTime - halfTime) / halfTime;
    
    if (halfProgress < 0.25) return { label: "Early Game", color: "bg-green-500" };
    if (halfProgress < 0.75) return { label: "Mid Game", color: "bg-yellow-500" };
    if (halfProgress < 0.9) return { label: "Late Game", color: "bg-orange-500" };
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
    // Use enhanced MVP data if available
    const mvpPlayers = enhancedData?.mvpPlayers || {};
    const playerStats = enhancedData?.playerStats || {};
    
    // Find top performers from actual stats if available
    let homePerformer = null;
    let awayPerformer = null;
    
    if (mvpPlayers.home && mvpPlayers.home !== 'N/A') {
      homePerformer = {
        playerId: "mvp-home",
        playerName: mvpPlayers.home,
        statLabel: "MVP",
        statValue: 100
      };
    } else {
      homePerformer = {
        playerId: "player1",
        playerName: team1?.players?.[0]?.lastName || "Player",
        statLabel: "Rushing Yards",
        statValue: 85
      };
    }
    
    if (mvpPlayers.away && mvpPlayers.away !== 'N/A') {
      awayPerformer = {
        playerId: "mvp-away",
        playerName: mvpPlayers.away,
        statLabel: "MVP",
        statValue: 100
      };
    } else {
      awayPerformer = {
        playerId: "player2", 
        playerName: team2?.players?.[0]?.lastName || "Player",
        statLabel: "Tackles",
        statValue: 4
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

        {/* E. Play-by-Play Commentary */}
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
              {liveState.recentEvents && liveState.recentEvents.length > 0 ? (
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
                <div className="text-center text-muted-foreground">
                  No events yet. The match is starting...
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