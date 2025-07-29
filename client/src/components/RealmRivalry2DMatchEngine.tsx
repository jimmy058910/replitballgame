/**
 * Comprehensive Realm Rivalry 2D Match Engine
 * Implements priority-based playback, stadium visualization, and revenue tracking
 * Based on detailed specifications provided
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { 
  Play, Pause, RotateCcw, Zap, Activity, Users, DollarSign, 
  Clock, BarChart3, Target, Shield, ChevronRight
} from 'lucide-react';
import { LiveMatchState, MatchEvent, EventPriority } from '../../../shared/types/LiveMatchState';
import { MatchSpeedController } from '../game/MatchSpeedController';
import { OvalFieldRenderer } from '../game/OvalFieldRenderer';
import { StadiumVisualizer } from '../game/StadiumVisualizer';
import { RevenueTracker } from '../game/RevenueTracker';
import { webSocketManager } from '../websocket/webSocketManager';

interface MatchEngineProps {
  matchId: string;
  userId: string;
  team1?: any;
  team2?: any;
  initialLiveState?: LiveMatchState;
  onMatchComplete?: () => void;
}

export const RealmRivalry2DMatchEngine: React.FC<MatchEngineProps> = ({
  matchId,
  userId,
  team1,
  team2,
  initialLiveState,
  onMatchComplete
}) => {
  // Core state
  const [liveState, setLiveState] = useState<LiveMatchState | null>(initialLiveState || null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(1.0);
  const [visualsEnabled, setVisualsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState("commentary");
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speedController = useRef<MatchSpeedController>(new MatchSpeedController());
  const fieldRenderer = useRef<OvalFieldRenderer | null>(null);
  const stadiumVisualizer = useRef<StadiumVisualizer | null>(null);
  const revenueTracker = useRef<RevenueTracker>(new RevenueTracker());
  
  const { toast } = useToast();

  // Queries for match data
  const { data: matchData, isLoading: matchLoading } = useQuery({
    queryKey: [`/api/matches/${matchId}`],
    enabled: !!matchId
  });

  const { data: homeTeamPlayers } = useQuery({
    queryKey: [`/api/teams/${team1?.id}/players`],
    enabled: !!team1?.id
  });

  const { data: awayTeamPlayers } = useQuery({
    queryKey: [`/api/teams/${team2?.id}/players`],
    enabled: !!team2?.id
  });

  // Initialize canvas components
  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize field renderer with oval design
    fieldRenderer.current = new OvalFieldRenderer(canvasRef.current);
    
    // Initialize stadium visualizer
    stadiumVisualizer.current = new StadiumVisualizer(canvasRef.current);
    
    // Set up speed controller callbacks
    speedController.current.onSpeedChange = (speed: number) => {
      setCurrentSpeed(speed);
    };
    
    speedController.current.onVisualsToggle = (enabled: boolean) => {
      setVisualsEnabled(enabled);
    };

    return () => {
      fieldRenderer.current?.destroy();
      stadiumVisualizer.current?.destroy();
    };
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (!matchId || !userId) return;

    const callbacks = {
      onMatchUpdate: (state: LiveMatchState) => {
        setLiveState(state);
        
        // Update field renderer
        if (fieldRenderer.current && visualsEnabled) {
          fieldRenderer.current.updateState(state);
        }
        
        // Update stadium visualizer
        if (stadiumVisualizer.current) {
          stadiumVisualizer.current.updateFacilities(state.facilityLevels);
          stadiumVisualizer.current.updateAttendance(state.attendance);
        }
        
        // Update revenue tracker
        revenueTracker.current.updateRevenue(state.perTickRevenue);
      },
      
      onMatchEvent: (event: MatchEvent) => {
        setEvents(prev => [event, ...prev]);
        
        // Process event through speed controller
        speedController.current.processEvent(event);
        
        // Update field renderer with event
        if (fieldRenderer.current && event.priority.priority <= 2) {
          fieldRenderer.current.processEvent(event);
        }
      },
      
      onConnectionStatus: (connected: boolean) => {
        setIsConnected(connected);
      }
    };

    webSocketManager.setCallbacks(callbacks);

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
  }, [matchId, userId, visualsEnabled]);

  // Update canvas rendering based on state
  useEffect(() => {
    if (!liveState || !canvasRef.current) return;

    const animate = () => {
      if (!visualsEnabled) return;
      
      // Clear canvas
      const ctx = canvasRef.current!.getContext('2d')!;
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      
      // Render stadium visualization
      stadiumVisualizer.current?.render();
      
      // Render field and players
      fieldRenderer.current?.render();
      
      // Continue animation loop if match is live
      if (liveState.status === 'live') {
        requestAnimationFrame(animate);
      }
    };

    if (visualsEnabled && liveState.status === 'live') {
      animate();
    }
  }, [liveState, visualsEnabled]);

  // Automatic speed management based on event priority - no manual controls needed
  useEffect(() => {
    if (!liveState || !events.length) return;
    
    const latestEvent = events[0]; // Most recent event
    if (latestEvent) {
      // Update speed based on event priority automatically
      const priority = latestEvent.priority;
      if (priority.priority === 1) {
        setCurrentSpeed(1);
        setVisualsEnabled(true);
      } else if (priority.priority === 2) {
        setCurrentSpeed(2);
        setVisualsEnabled(true);
      } else {
        setCurrentSpeed(4);
        setVisualsEnabled(false); // Fast forward with visuals off
      }
    }
  }, [events, liveState]);

  const handleTimelineScrub = useCallback(async (targetTime: number) => {
    if (!matchId) return;
    
    try {
      await fetch(`/api/matches/${matchId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'scrub', matchId, atSecond: targetTime })
      });
    } catch (error) {
      console.error('Timeline scrub failed:', error);
    }
  }, [matchId]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate match progress
  const matchProgress = liveState ? (liveState.gameTime / liveState.maxTime) * 100 : 0;

  // Get speed badge info
  const getSpeedBadge = () => {
    if (!visualsEnabled) return { text: "FF", color: "bg-orange-600" };
    if (currentSpeed === 1) return { text: "1×", color: "bg-green-600" };
    if (currentSpeed === 2) return { text: "2×", color: "bg-blue-600" };
    return { text: `${currentSpeed}×`, color: "bg-purple-600" };
  };

  const speedBadge = getSpeedBadge();

  if (matchLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Activity className="w-6 h-6 animate-spin mr-2" />
          <span>Loading match engine...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Score and Controls */}
      <Card className="bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Score Display */}
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-sm text-gray-400">{team1?.name || 'Home'}</div>
                <div className="text-2xl font-bold text-white">{liveState?.homeScore || 0}</div>
              </div>
              <div className="text-xl text-gray-400">-</div>
              <div className="text-center">
                <div className="text-sm text-gray-400">{team2?.name || 'Away'}</div>
                <div className="text-2xl font-bold text-white">{liveState?.awayScore || 0}</div>
              </div>
            </div>

            {/* Time and Status */}
            <div className="text-center">
              <div className="text-sm text-gray-400">
                Half {liveState?.currentHalf || 1}
              </div>
              <div className="text-lg font-mono text-white">
                {liveState ? formatTime(liveState.gameTime) : '0:00'}
              </div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <Badge className={speedBadge.color}>{speedBadge.text}</Badge>
                {isConnected ? (
                  <Badge className="bg-green-600">LIVE</Badge>
                ) : (
                  <Badge className="bg-red-600">CONNECTING</Badge>
                )}
              </div>
            </div>

            {/* Auto Speed Indicator - No Manual Controls */}
            <div className="flex items-center space-x-2">
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Playback Speed</div>
                <Badge 
                  className={
                    !visualsEnabled ? "bg-orange-600" :
                    currentSpeed === 1 ? "bg-red-600" :
                    currentSpeed === 2 ? "bg-yellow-600" :
                    "bg-gray-600"
                  }
                >
                  {!visualsEnabled ? "Fast Forward" :
                   currentSpeed === 1 ? "1× Critical Play" :
                   currentSpeed === 2 ? "2× Important Play" :
                   `${currentSpeed}× Routine Play`}
                </Badge>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <Progress 
              value={matchProgress} 
              className="h-2"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                const targetTime = percentage * (liveState?.maxTime || 2400);
                handleTimelineScrub(targetTime);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Engine Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Field Visualization */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Dome Field Visualization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gradient-to-b from-green-800 to-green-900 rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={400}
                  className="w-full h-auto border border-gray-600 rounded"
                />
                
                {/* Overlay for visuals disabled */}
                {!visualsEnabled && (
                  <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Zap className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                      <div className="text-lg font-bold">Fast-forwarding...</div>
                      <div className="text-sm opacity-75">Visuals disabled for speed</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="commentary">Events</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="formations">Teams</TabsTrigger>
            </TabsList>

            <TabsContent value="commentary" className="space-y-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Live Commentary
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-64 overflow-y-auto space-y-2" style={{
                  background: '#21212b',
                  color: '#f4f4fa',
                  padding: '14px',
                  borderRadius: '8px',
                  minHeight: '128px'
                }}>
                  {events.slice(0, 20).map((event, index) => (
                    <div key={event.id} className="text-sm p-2 rounded" style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#f4f4fa',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <div className="flex items-center justify-between mb-1">
                        <Badge 
                          className={
                            event.priority.priority === 1 ? "bg-red-600" :
                            event.priority.priority === 2 ? "bg-yellow-600" :
                            "bg-gray-600"
                          }
                        >
                          {formatTime(event.timestamp)}
                        </Badge>
                      </div>
                      <div style={{ color: '#f4f4fa' }}>{event.description}</div>
                    </div>
                  ))}
                  {events.length === 0 && (
                    <div className="text-center py-4" style={{ color: '#9ca3af' }}>
                      Waiting for match events...
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="space-y-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Match Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {liveState && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Score</span>
                          <span>{liveState.homeScore} - {liveState.awayScore}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Game Time</span>
                          <span>{formatTime(liveState.gameTime)} / {formatTime(liveState.maxTime)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Half</span>
                          <span>{liveState.currentHalf}/2</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Attendance</div>
                          <div className="text-gray-600">{liveState.attendance?.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="font-medium">Capacity</div>
                          <div className="text-gray-600">{liveState.facilityLevels?.capacity?.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="font-medium">Active Events</div>
                          <div className="text-gray-600">{events.length}</div>
                        </div>
                        <div>
                          <div className="font-medium">Match Status</div>
                          <div className="text-gray-600 capitalize">{liveState.status}</div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Live Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {liveState && (
                    <>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          ₡{liveState.perTickRevenue.length > 0 ? 
                            liveState.perTickRevenue.reduce((sum, tick) => sum + tick.totalRevenue, 0).toLocaleString() : 
                            '0'}
                        </div>
                        <div className="text-xs text-gray-500">Total Revenue (Server-Calculated)</div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Tickets (₡25 × {liveState.attendance?.toLocaleString()})</span>
                          <span>₡{((liveState.attendance || 0) * 25).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Concessions (₡8 × Lvl{liveState.facilityLevels?.concessions || 1})</span>
                          <span>₡{((liveState.attendance || 0) * 8 * (liveState.facilityLevels?.concessions || 1)).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>VIP Suites (₡5000 × Lvl{liveState.facilityLevels?.vipSuites || 1})</span>
                          <span>₡{((liveState.facilityLevels?.vipSuites || 1) * 5000).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Parking (30% × ₡10 × Lvl{liveState.facilityLevels?.parking || 1})</span>
                          <span>₡{(Math.floor((liveState.attendance || 0) * 0.3) * 10 * (liveState.facilityLevels?.parking || 1)).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 border-t pt-2">
                        Formula: attendance × (₡25 + ₡8×concessions + ₡3×merch) + VIP flat rate + parking
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="formations" className="space-y-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Active Players
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {liveState && (
                    <>
                      <div>
                        <div className="font-medium text-sm mb-1">Home Team</div>
                        <div className="space-y-1 text-xs">
                          <div>Passer: {liveState.activeFieldPlayers.home.passer.name}</div>
                          <div>Runners: {liveState.activeFieldPlayers.home.runners.map(p => p.name).join(', ')}</div>
                          <div>Blockers: {liveState.activeFieldPlayers.home.blockers.map(p => p.name).join(', ')}</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-medium text-sm mb-1">Away Team</div>
                        <div className="space-y-1 text-xs">
                          <div>Passer: {liveState.activeFieldPlayers.away.passer.name}</div>
                          <div>Runners: {liveState.activeFieldPlayers.away.runners.map(p => p.name).join(', ')}</div>
                          <div>Blockers: {liveState.activeFieldPlayers.away.blockers.map(p => p.name).join(', ')}</div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

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

export default RealmRivalry2DMatchEngine;