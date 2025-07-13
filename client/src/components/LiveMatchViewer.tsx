import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Play, Pause, Clock, Users, Trophy } from 'lucide-react';
import webSocketManager, { LiveMatchState, MatchEvent, WebSocketCallbacks } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';

interface LiveMatchViewerProps {
  matchId: string;
  userId: string;
  onMatchComplete?: (finalState: LiveMatchState) => void;
}

export function LiveMatchViewer({ matchId, userId, onMatchComplete }: LiveMatchViewerProps) {
  const [matchState, setMatchState] = useState<LiveMatchState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [isControlling, setIsControlling] = useState(false);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch initial match data
  const { data: initialMatchData, error: matchError, isLoading: matchDataLoading } = useQuery({
    queryKey: [`/api/matches/${matchId}`],
    enabled: !!matchId
  });

  // Auto-scroll to bottom of events
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

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
            console.log('📊 Match state update received:', state);
            setMatchState(state);
            setEvents(state.gameEvents || []);
          },
          onMatchEvent: (event: MatchEvent) => {
            console.log('🎯 Match event received:', event);
            setEvents(prev => [...prev, event]);
            
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
            console.log('🏁 Match complete received:', data);
            setMatchState(data.finalState);
            setEvents(data.finalState.gameEvents || []);
            onMatchComplete?.(data.finalState);
            toast({
              title: '🏁 Match Complete!',
              description: `Final Score: ${data.finalState.homeScore} - ${data.finalState.awayScore}`,
              duration: 5000,
            });
          },
          onConnectionStatus: (connected: boolean) => {
            console.log('🔌 Connection status:', connected);
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
            console.error('WebSocket error:', error);
            toast({
              title: 'Connection Error',
              description: 'Lost connection to live match. Trying to reconnect...',
              variant: 'destructive',
              duration: 3000,
            });
          }
        };

        // Join the match room
        await webSocketManager.joinMatch(matchId, callbacks);
        setIsLoading(false);
        
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        setIsLoading(false);
        toast({
          title: 'Connection Failed',
          description: 'Failed to connect to live match. Please refresh the page.',
          variant: 'destructive',
          duration: 5000,
        });
      }
    };

    initializeWebSocket();

    // Cleanup on unmount
    return () => {
      webSocketManager.leaveMatch(matchId);
      webSocketManager.disconnect();
    };
  }, [matchId, userId, toast, onMatchComplete]);

  // Debug logging
  console.log('🔍 LiveMatchViewer render state:', {
    matchDataLoading,
    initialMatchData,
    matchState,
    matchError,
    isLoading
  });

  // Handle completed matches
  if (initialMatchData && initialMatchData.status === 'COMPLETED') {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Match Completed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-lg font-semibold">{initialMatchData.homeTeamName || 'Home Team'}</div>
                <div className="text-3xl font-bold text-blue-600">{initialMatchData.homeScore || 0}</div>
              </div>
              <div className="text-2xl font-bold text-gray-400">-</div>
              <div className="text-center">
                <div className="text-lg font-semibold">{initialMatchData.awayTeamName || 'Away Team'}</div>
                <div className="text-3xl font-bold text-red-600">{initialMatchData.awayScore || 0}</div>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Final Score
            </Badge>
            <p className="text-gray-600">
              This match has been completed. Check the dashboard for new live matches.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle loading state
  if (matchDataLoading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading match data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle match not found
  if (matchError || !initialMatchData) {
    console.error('Match error details:', matchError);
    console.log('Match ID:', matchId);
    console.log('Initial match data:', initialMatchData);
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="text-red-600 text-lg font-semibold">Match Not Found</div>
            <p className="text-gray-600">
              The requested match could not be found. It may have been deleted or you may not have access to it.
            </p>
            <div className="text-sm text-gray-500 mt-4">
              <p>Match ID: {matchId}</p>
              <p>Error: {matchError?.message || 'Unknown error'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }



  // Match control functions
  const startMatch = async () => {
    if (!matchId) return;
    
    setIsControlling(true);
    try {
      const isExhibition = initialMatchData?.matchType === 'exhibition';
      await webSocketManager.startMatch(matchId, isExhibition);
    } catch (error) {
      toast({
        title: '❌ Failed to Start Match',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
        duration: 4000,
      });
    } finally {
      setIsControlling(false);
    }
  };

  const pauseMatch = async () => {
    if (!matchId) return;
    
    setIsControlling(true);
    try {
      await webSocketManager.pauseMatch(matchId);
    } catch (error) {
      toast({
        title: '❌ Failed to Pause Match',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
        duration: 4000,
      });
    } finally {
      setIsControlling(false);
    }
  };

  const resumeMatch = async () => {
    if (!matchId) return;
    
    setIsControlling(true);
    try {
      await webSocketManager.resumeMatch(matchId);
    } catch (error) {
      toast({
        title: '❌ Failed to Resume Match',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
        duration: 4000,
      });
    } finally {
      setIsControlling(false);
    }
  };

  // Calculate game progress percentage
  const getGameProgress = () => {
    if (!matchState) return 0;
    return Math.min((matchState.gameTime / matchState.maxTime) * 100, 100);
  };

  // Format time display
  const formatGameTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get MVP from latest events
  const getCurrentMVP = () => {
    const halftimeEvent = events.find(e => e.type === 'halftime');
    const completionEvent = events.find(e => e.type === 'match_complete');
    
    const mvpData = completionEvent?.data?.mvp || halftimeEvent?.data?.mvp;
    return mvpData;
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

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm">
            {isConnected ? 'Live Connection Active' : 'Connection Lost'}
          </span>
        </div>
        
        {/* Match Controls */}
        {matchState && (
          <div className="flex items-center space-x-2">
            {matchState.status === 'live' ? (
              <Button 
                onClick={pauseMatch} 
                disabled={isControlling}
                size="sm"
                variant="outline"
              >
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            ) : matchState.status === 'paused' ? (
              <Button 
                onClick={resumeMatch} 
                disabled={isControlling}
                size="sm"
                variant="outline"
              >
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
            ) : matchState.status === 'completed' ? (
              <Badge variant="secondary">Match Complete</Badge>
            ) : (
              <Button 
                onClick={startMatch} 
                disabled={isControlling}
                size="sm"
              >
                <Play className="h-4 w-4 mr-1" />
                Start Match
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Match Display */}
        <div className="lg:col-span-2 space-y-4">
          {/* Scoreboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Live Match</span>
                <Badge variant={matchState?.status === 'live' ? 'default' : 'secondary'}>
                  {matchState?.status?.toUpperCase() || 'LOADING'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matchState ? (
                <div className="space-y-4">
                  {/* Score Display */}
                  <div className="flex items-center justify-between text-3xl font-bold">
                    <div className="text-center">
                      <div>{matchState.homeScore}</div>
                      <div className="text-sm font-normal text-muted-foreground">Home</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg">VS</div>
                    </div>
                    <div className="text-center">
                      <div>{matchState.awayScore}</div>
                      <div className="text-sm font-normal text-muted-foreground">Away</div>
                    </div>
                  </div>

                  {/* Game Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatGameTime(matchState.gameTime)} / {formatGameTime(matchState.maxTime)}
                      </span>
                      <span>Half {matchState.currentHalf}</span>
                    </div>
                    <Progress value={getGameProgress()} className="h-2" />
                  </div>

                  {/* MVP Display */}
                  {getCurrentMVP() && (
                    <div className="border rounded-lg p-3 bg-muted/50">
                      <h4 className="font-semibold flex items-center mb-2">
                        <Trophy className="h-4 w-4 mr-1" />
                        Current MVP
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Home: {getCurrentMVP()?.homeMVP?.playerName || 'None'}</div>
                          <div className="text-muted-foreground">Score: {getCurrentMVP()?.homeMVP?.score?.toFixed(1) || '0.0'}</div>
                        </div>
                        <div>
                          <div className="font-medium">Away: {getCurrentMVP()?.awayMVP?.playerName || 'None'}</div>
                          <div className="text-muted-foreground">Score: {getCurrentMVP()?.awayMVP?.score?.toFixed(1) || '0.0'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Waiting for match data...
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live Commentary Feed */}
        <div className="space-y-4">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Live Commentary
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full px-4">
                <div className="space-y-3 pb-4">
                  {events.length > 0 ? (
                    events.map((event, index) => (
                      <div key={index} className="border-l-2 border-primary pl-3">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" size="sm">
                            {formatGameTime(event.time)}
                          </Badge>
                          <Badge 
                            variant={
                              event.type === 'score' ? 'default' :
                              event.type === 'halftime' ? 'secondary' :
                              event.type === 'interception' ? 'destructive' :
                              'outline'
                            }
                            size="sm"
                          >
                            {event.type}
                          </Badge>
                        </div>
                        <p className="text-sm">{event.description}</p>
                        {index < events.length - 1 && <Separator className="mt-3" />}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      {matchState?.status === 'live' ? 
                        'Commentary will appear here as the match progresses...' :
                        'Match not yet started'
                      }
                    </div>
                  )}
                  <div ref={eventsEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default LiveMatchViewer;