/**
 * @file TextBasedMatchViewer.tsx
 * @description The main component for rendering the new text-based match simulation.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { webSocketManager } from '@/websocket/webSocketManager';
import { LiveMatchState, MatchEvent } from '@/../../shared/types/LiveMatchState';

interface TextBasedMatchViewerProps {
  matchId: string;
  userId: string;
  homeTeamName?: string;
  awayTeamName?: string;
}

interface GameData {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  simulationLog?: {
    status: string;
    gameTime: number;
    maxTime: number;
    currentHalf: number;
    homeScore: number;
    awayScore: number;
    isRunning: boolean;
    gameEvents: Array<{
      time: number;
      type: string;
      description: string;
      teamId?: string;
      actingPlayerId?: string;
    }>;
    teamStats: any;
    playerStats: any;
  };
}

interface TeamData {
  id: string;
  name: string;
}

export function TextBasedMatchViewer({ matchId, userId, homeTeamName, awayTeamName }: TextBasedMatchViewerProps) {
  const [liveState, setLiveState] = useState<LiveMatchState | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [criticalEvent, setCriticalEvent] = useState<MatchEvent | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Fetch LIVE match data from live engine
  const { data: liveMatchData } = useQuery<{success: boolean, liveState: LiveMatchState}>({
    queryKey: [`/api/live-matches/${matchId}/live-state`],
    enabled: !!matchId,
    refetchInterval: 2000, // Poll every 2 seconds for live updates
  });
  
  // Also fetch static match data for team info
  const { data: matchData } = useQuery<GameData>({
    queryKey: [`/api/matches/${matchId}`],
    enabled: !!matchId
  });

  // Fetch team data
  const { data: homeTeam } = useQuery<TeamData>({
    queryKey: [`/api/teams/${matchData?.homeTeamId}`],
    enabled: !!matchData?.homeTeamId
  });

  const { data: awayTeam } = useQuery<TeamData>({
    queryKey: [`/api/teams/${matchData?.awayTeamId}`],
    enabled: !!matchData?.awayTeamId
  });

  // Extract live state from LIVE engine data
  useEffect(() => {
    if (liveMatchData?.success && liveMatchData.liveState) {
      console.log('🔍 [DEBUG] LIVE match data received:', liveMatchData.liveState);
      setLiveState(liveMatchData.liveState);
      
      // Update events from live engine
      if (liveMatchData.liveState.gameEvents) {
        setEvents([...liveMatchData.liveState.gameEvents].reverse().slice(0, 20));
      }
    } else if (matchData && !liveState) {
      // Fallback to static data if live engine not available
      const simLog = matchData.simulationLog;
      console.log('🔍 [DEBUG] Fallback to static match data:', { matchData, simLog });
      const initialState: LiveMatchState = {
        matchId: matchData.id,
        homeTeamId: matchData.homeTeamId,
        awayTeamId: matchData.awayTeamId,
        status: 'live', // Always show as live for consistency
        gameTime: simLog?.gameTime || 0,
        maxTime: simLog?.maxTime || 2400,
        currentHalf: simLog?.currentHalf || 1,
        startTime: Date.now(),
        lastUpdate: Date.now(),
        homeScore: simLog?.homeScore || matchData.homeScore || 0,
        awayScore: simLog?.awayScore || matchData.awayScore || 0,
        activeFieldPlayers: {
          home: {
            passer: null as any,
            runners: [],
            blockers: [],
            wildcard: null as any
          },
          away: {
            passer: null as any,
            runners: [],
            blockers: [],
            wildcard: null as any
          }
        },
        facilityLevels: {
          capacity: 8000,
          concessions: 2,
          parking: 2,
          vipSuites: 1,
          merchandising: 2,
          lightingScreens: 2,
          security: 1
        },
        attendance: 6500,
        perTickRevenue: [],
        gameEvents: [],
        playerStats: new Map(),
        teamStats: new Map(),
        matchTick: 0,
        simulationSpeed: 1
      };
      setLiveState(initialState);
      
      // Load game events as commentary
      if (simLog?.gameEvents) {
        const formattedEvents = simLog.gameEvents.map((event, index) => ({
          id: `event_${index}`,
          timestamp: event.time,
          tick: event.time,
          type: event.type.toUpperCase(),
          description: event.description,
          priority: { priority: 2, label: 'Standard', speedMultiplier: 1, visualsRequired: false },
          position: { x: 300, y: 200 }
        }));
        setEvents(formattedEvents.reverse().slice(0, 20)); // Show latest 20 events
      }
    }
  }, [liveMatchData, matchData, liveState]);

  // REMOVED: Manual clock advancement - this bypassed the intelligent speed system!
  // The backend simulation engine handles timing based on event priorities:
  // - CRITICAL events (scores, injuries): 1x real-time
  // - IMPORTANT events (key plays): 2x speed  
  // - STANDARD events (routine): 8x speed
  // - DOWNTIME events (boring): 8x speed
  // Frontend should only display the game time from WebSocket updates, not advance it manually.

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!matchId) return;
    
    // Use fallback userId for public match viewing
    const effectiveUserId = userId || `guest-${Date.now()}`;

    // Initialize WebSocket connection  
    webSocketManager.connect(effectiveUserId);
    
    // CRITICAL FIX: Don't join match immediately - wait for connection to be ready
    // The joinMatch call will happen in onConnectionStatus callback when connected = true

    // Set up callbacks
    const callbacks = {
      onMatchUpdate: (data: LiveMatchState) => {
        console.log('🔍 [DEBUG] WebSocket match update received:', data);
        setLiveState(data);
      },
      onMatchEvent: (event: MatchEvent) => {
        console.log('🔍 [DEBUG] WebSocket event received:', event);
        setEvents(prevEvents => [event, ...prevEvents.slice(0, 49)]);
        if (event.priority.label === 'Critical') {
          setCriticalEvent(event);
          setTimeout(() => setCriticalEvent(null), 5000); // Show for 5 seconds
        }
      },
      onConnectionStatus: (connected: boolean) => {
        console.log('🔍 [DEBUG] WebSocket connection status:', connected);
        
        // CRITICAL FIX: Join match only when WebSocket is fully connected
        if (connected) {
          console.log('🔍 [DEBUG] WebSocket connected! Now joining match:', matchId);
          webSocketManager.joinMatch(matchId).catch(error => {
            console.error('🔍 [DEBUG] Failed to join match:', error);
          });
        }
      }
    };

    webSocketManager.setCallbacks(callbacks);

    // Clean up on component unmount
    return () => {
      webSocketManager.leaveMatch();
      webSocketManager.setCallbacks({
        onMatchUpdate: () => {},
        onMatchEvent: () => {},
        onConnectionStatus: () => {}
      });
    };
  }, [matchId, userId]);

  // Auto-scroll commentary log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [events]);

  const displayHomeTeam = homeTeam?.name || homeTeamName || "Home Team";
  const displayAwayTeam = awayTeam?.name || awayTeamName || "Away Team";

  if (!liveState) {
    return (
      <Card className="bg-gray-900 text-gray-200 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
            <p className="text-lg">Loading live match data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatGameTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderStaminaIndicator = (stamina: number) => {
    if (stamina > 80) return '🟢'; // Full
    if (stamina > 30) return '🟡'; // Moderate
    return '🔴'; // Critical
  };

  const renderProgressBar = (level: number) => {
    const filled = '█'.repeat(level);
    const empty = '░'.repeat(10 - level);
    return `[${filled}${empty}] Level ${level}`;
  };

  const getPlayersOnField = (team: 'home' | 'away') => {
    const playerStates = liveState?.activeFieldPlayers[team];
    if (!playerStates) return [];
    return [
      playerStates.passer,
      ...playerStates.runners,
      ...playerStates.blockers,
      playerStates.wildcard
    ].filter(Boolean);
  }

  return (
    <div className="relative max-w-7xl mx-auto p-4 font-mono">
      {/* Critical Event Popup */}
      {criticalEvent && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-10">
          <Card className="border-yellow-400 border-2 bg-gray-900 text-white w-1/2">
            <CardHeader>
              <CardTitle className="text-2xl text-yellow-400 text-center">🎯 {criticalEvent.type}! 🎯</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-lg">{criticalEvent.description}</p>
              <p className="text-sm text-gray-400 mt-2">Stamina, stats, and bonuses would be shown here.</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-gray-900 text-gray-200 border-gray-700">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            <span className="text-blue-400">{displayHomeTeam}</span>
            <span className="text-gray-400 mx-4">vs</span>
            <span className="text-red-400">{displayAwayTeam}</span>
          </CardTitle>
          <div className="text-center">
            <div className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-red-400 bg-clip-text text-transparent">
              {liveState.homeScore} - {liveState.awayScore}
            </div>
            <div className="text-xl mt-2 space-x-4">
              <span className={`${liveState.status === 'live' ? 'text-green-400 animate-pulse' : 'text-yellow-400'}`}>
                ⏱️ {formatGameTime(liveState.gameTime)}
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-cyan-400">Half: {liveState.currentHalf}</span>
              <span className="text-gray-400">|</span>
              <span className={`${liveState.status === 'live' ? 'text-green-400' : 'text-red-400'}`}>
'🔴 LIVE'
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          {/* Field and Player State */}
          <div className="col-span-2">
            <Card className="bg-gray-800 border-gray-700 h-full">
              <CardHeader>
                <CardTitle className="text-green-400">🏟️ Field View</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <div className="grid grid-cols-5 gap-4 h-64">
                    {/* Home Team Side */}
                    <div className="col-span-2 bg-blue-900/20 border border-blue-500 rounded-lg p-3">
                      <h4 className="text-blue-400 text-xs font-bold mb-2 text-center">{displayHomeTeam}</h4>
                      <div className="space-y-1">
                        <div className="text-xs text-center text-blue-300">ACTIVE PLAYERS</div>
                        {['🟢 Aria Lightbringer (P)', '🟡 Kael Stormwind (R)', '🟢 Vex Shadowstep (R)', '🟢 Atlas Goldspear (B)', '🟡 Raven Darkwood (B)', '🟢 Lyra Moonwhisper (W)'].map((player, i) => (
                          <div key={i} className="text-xs text-blue-200 bg-blue-900/30 px-2 py-1 rounded">
                            {player}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Center Field */}
                    <div className="bg-green-900/20 border border-green-500 rounded-lg p-3 flex flex-col justify-center items-center">
                      <div className="text-green-400 text-sm font-bold text-center mb-2">⚽ FIELD ⚽</div>
                      <div className="text-xs text-green-300 text-center space-y-1">
                        <div>🏟️ LEVEL {liveState.facilityLevels.capacity > 10000 ? 3 : 2}</div>
                        <div className="text-yellow-400">{formatGameTime(liveState.gameTime)}</div>
                        <div className="text-cyan-400">HALF {liveState.currentHalf}</div>
                        <div className="text-white text-lg font-bold">{liveState.homeScore} - {liveState.awayScore}</div>
                      </div>
                    </div>

                    {/* Away Team Side */}
                    <div className="col-span-2 bg-red-900/20 border border-red-500 rounded-lg p-3">
                      <h4 className="text-red-400 text-xs font-bold mb-2 text-center">{displayAwayTeam}</h4>
                      <div className="space-y-1">
                        <div className="text-xs text-center text-red-300">ACTIVE PLAYERS</div>
                        {['🟢 Verdania Fernshade (P)', '🟡 Oakenheart Dawnbreeze (R)', '🟢 Brilliance Aurelia (R)', '🟢 Fernshade Fernshade (B)', '🔴 Ironhide Bloodaxe (B)', '🟢 Doomhammer Battlecry (W)'].map((player, i) => (
                          <div key={i} className="text-xs text-red-200 bg-red-900/30 px-2 py-1 rounded">
                            {player}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-400 text-center">
                    🟢 Full Stamina  🟡 Moderate  🔴 Low Stamina  |  P: Passer  R: Runner  B: Blocker  W: Wildcard
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stadium Facilities */}
          <div>
            <Card className="bg-gray-800 border-gray-700 h-full">
              <CardHeader>
                <CardTitle className="text-purple-400">🏟️ Stadium Facilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-yellow-400">👥 Attendance:</span>
                    <span className="text-white font-bold">{liveState.attendance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400">🏟️ Capacity:</span>
                    <span className="text-white">{liveState.facilityLevels.capacity.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400">💡 Lighting:</span>
                    <span className="text-green-300">{renderProgressBar(liveState.facilityLevels.lightingScreens)} Level {liveState.facilityLevels.lightingScreens}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-400">🍿 Concessions:</span>
                    <span className="text-green-300">{renderProgressBar(liveState.facilityLevels.concessions)} Level {liveState.facilityLevels.concessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pink-400">💎 VIP Suites:</span>
                    <span className="text-green-300">{renderProgressBar(liveState.facilityLevels.vipSuites)} Level {liveState.facilityLevels.vipSuites}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-400">🅿️ Parking:</span>
                    <span className="text-green-300">{renderProgressBar(liveState.facilityLevels.parking)} Level {liveState.facilityLevels.parking}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-400">🛍️ Merchandise:</span>
                    <span className="text-green-300">{renderProgressBar(liveState.facilityLevels.merchandising)} Level {liveState.facilityLevels.merchandising}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Commentary */}
          <div className="col-span-3">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-green-400">🎙️ Live Commentary</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div ref={logRef} className="space-y-2">
                    {events.length > 0 ? (
                      events.map((event, index) => (
                        <div key={event.id || index} className="border-l-2 border-green-400 pl-4 py-2 bg-gray-900 rounded-r">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className={`text-xs ${
                              event.type === 'SCORE' ? 'border-red-400 text-red-400' :
                              event.type === 'PASS' ? 'border-blue-400 text-blue-400' :
                              event.type === 'RUN' ? 'border-green-400 text-green-400' :
                              'border-gray-400 text-gray-400'
                            }`}>
                              {event.type}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {formatGameTime(event.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-200">{event.description}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-400 py-8">
                        <p className="text-lg">🎯 Match Events Loading...</p>
                        <p className="text-sm mt-2">Commentary will appear as the game progresses</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}