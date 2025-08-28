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
  homeTeamName: string;
  awayTeamName: string;
}

export function TextBasedMatchViewer({ matchId, userId, homeTeamName, awayTeamName }: TextBasedMatchViewerProps) {
  const [liveState, setLiveState] = useState<LiveMatchState | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [criticalEvent, setCriticalEvent] = useState<MatchEvent | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Fetch initial live state for the specific match
  const { data: liveMatches } = useQuery<any[]>({
    queryKey: ['/api/matches/live'],
    refetchInterval: 2000, // Check every 2 seconds
    enabled: !!matchId
  });

  // Find the specific match and extract live state
  useEffect(() => {
    if (liveMatches && matchId) {
      const currentMatch = liveMatches.find(match => match.id === matchId);
      if (currentMatch && !liveState) {
        // Convert the live match data to LiveMatchState format
        const initialState: LiveMatchState = {
          matchId: currentMatch.id,
          homeTeamId: currentMatch.homeTeam.id,
          awayTeamId: currentMatch.awayTeam.id,
          status: 'live',
          gameTime: currentMatch.gameTime || 0,
          maxTime: currentMatch.maxGameTime || 2400,
          currentHalf: 1,
          startTime: Date.now(),
          lastUpdate: Date.now(),
          homeScore: currentMatch.homeScore || 0,
          awayScore: currentMatch.awayScore || 0,
          activeFieldPlayers: { home: {}, away: {} },
          facilityLevels: {},
          attendance: 0,
          perTickRevenue: [],
          gameEvents: [],
          playerStats: {},
          teamStats: {},
          matchTick: 0,
          simulationSpeed: 1
        };
        setLiveState(initialState);
        console.log('✅ Initial live state loaded for match', matchId);
      }
    }
  }, [liveMatches, matchId, liveState]);

  useEffect(() => {
    // Connect to the WebSocket and join the match room
    webSocketManager.connect(userId);
    webSocketManager.joinMatch(matchId);

    // Set up callbacks
    const callbacks = {
      onMatchUpdate: (data: LiveMatchState) => {
        setLiveState(data);
      },
      onMatchEvent: (event: MatchEvent) => {
        setEvents(prevEvents => [event, ...prevEvents.slice(0, 49)]);
        if (event.priority.label === 'Critical') {
          setCriticalEvent(event);
          setTimeout(() => setCriticalEvent(null), 5000); // Show for 5 seconds
        }
      },
      onConnectionStatus: (connected: boolean) => {
        console.log('WebSocket connection status:', connected);
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

  if (!liveState) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Connecting to live match...</p>
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
          <CardTitle className="text-center text-2xl">
            {homeTeamName} vs {awayTeamName}
          </CardTitle>
          <div className="text-center text-4xl font-bold">
            {liveState.homeScore} - {liveState.awayScore}
          </div>
          <div className="text-center text-lg">
            {formatGameTime(liveState.gameTime)} | Half: {liveState.currentHalf}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          {/* Field and Player State */}
          <div className="col-span-2">
            <Card className="bg-gray-800 border-gray-700 h-full">
              <CardHeader>
                <CardTitle>Field View</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap leading-relaxed">
                    {`
┌─────────────────────────────────────────────────────┐
│ 🏟️ STADIUM LEVEL ${liveState.facilityLevels.capacity > 10000 ? 3 : 2}                                   │
├─────────────────────────────────────────────────────┤
│ HOME SCORE │               FIELD              │ AWAY SCORE │
│ ${getPlayersOnField('home').slice(0, 2).map(p => renderStaminaIndicator(p.stamina)).join(' ')}      │ ${getPlayersOnField('home').slice(2, 5).map(p => renderStaminaIndicator(p.stamina)).join(' ')}         ${getPlayersOnField('away').slice(2, 5).map(p => renderStaminaIndicator(p.stamina)).join(' ')}    │    ${getPlayersOnField('away').slice(0, 2).map(p => renderStaminaIndicator(p.stamina)).join(' ')}  │
│ ████████ │                                     │ ████████ │
│          │ ${getPlayersOnField('home').slice(5).map(p => renderStaminaIndicator(p.stamina)).join(' ')}               ${getPlayersOnField('away').slice(5).map(p => renderStaminaIndicator(p.stamina)).join(' ')}        │          │
└─────────────────────────────────────────────────────┘
                    `}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stadium Facilities */}
          <div className="col-span-1">
            <Card className="bg-gray-800 border-gray-700 h-full">
              <CardHeader>
                <CardTitle>Stadium Facilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Lighting:    {renderProgressBar(liveState.facilityLevels.lightingScreens)}</p>
                <p>Concessions: {renderProgressBar(liveState.facilityLevels.concessions)}</p>
                <p>VIP Suites:  {renderProgressBar(liveState.facilityLevels.vipSuites)}</p>
                <p>Parking:     {renderProgressBar(liveState.facilityLevels.parking)}</p>
                <p>Merchandise: {renderProgressBar(liveState.facilityLevels.merchandising)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Commentary Log */}
          <div className="col-span-3">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Live Commentary</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64" ref={logRef}>
                  <div className="space-y-2">
                    {events.map(event => (
                      <div key={event.id} className="p-2 rounded bg-gray-900">
                        <span className="text-yellow-400">[{formatGameTime(event.timestamp)}]</span>
                        <span className="ml-2">{event.description}</span>
                        <Badge variant="outline" className="ml-2">{event.priority.label}</Badge>
                      </div>
                    ))}
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
