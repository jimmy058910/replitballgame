import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import webSocketManager from '@/lib/websocket';

export function WebSocketTestPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [testMatchId, setTestMatchId] = useState('');
  const [connectionLogs, setConnectionLogs] = useState<string[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    // Set up WebSocket callbacks for testing
    webSocketManager.setCallbacks({
      onConnectionStatus: (connected: boolean) => {
        setIsConnected(connected);
        addLog(connected ? '✅ WebSocket Connected' : '❌ WebSocket Disconnected');
      },
      onMatchUpdate: (matchState) => {
        addLog(`📊 Match Update: ${matchState.gameTime}s, Score: ${matchState.homeScore}-${matchState.awayScore}`);
      },
      onMatchEvent: (event) => {
        setEvents(prev => [...prev, event]);
        addLog(`🎯 Event: ${event.type} - ${event.description}`);
      },
      onMatchComplete: (data) => {
        addLog(`🏁 Match Complete: ${data.finalState.homeScore}-${data.finalState.awayScore}`);
      },
      onError: (error) => {
        addLog(`❌ Error: ${error.message}`);
      }
    });
  }, []);

  const connectWebSocket = async () => {
    if (!user?.claims?.sub) {
      toast({
        title: '❌ Authentication Required',
        description: 'Please log in to test WebSocket connection',
        variant: 'destructive'
      });
      return;
    }

    try {
      addLog('🔄 Attempting to connect...');
      await webSocketManager.connect(user.claims.sub);
      addLog('✅ Successfully authenticated');
      toast({
        title: '🔌 Connected',
        description: 'WebSocket connection established',
        duration: 3000
      });
    } catch (error) {
      addLog(`❌ Connection failed: ${error}`);
      toast({
        title: '❌ Connection Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const disconnectWebSocket = () => {
    webSocketManager.disconnect();
    addLog('🔌 Disconnected');
    setEvents([]);
  };

  const joinTestMatch = async () => {
    if (!testMatchId) {
      toast({
        title: '❌ Match ID Required',
        description: 'Please enter a match ID to join',
        variant: 'destructive'
      });
      return;
    }

    try {
      addLog(`🏟️ Joining match ${testMatchId}...`);
      await webSocketManager.joinMatch(testMatchId);
      addLog(`✅ Successfully joined match ${testMatchId}`);
      toast({
        title: '🏟️ Joined Match',
        description: `Connected to match ${testMatchId}`,
        duration: 3000
      });
    } catch (error) {
      addLog(`❌ Failed to join match: ${error}`);
      toast({
        title: '❌ Failed to Join',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const leaveMatch = () => {
    webSocketManager.leaveMatch();
    addLog('🚪 Left match');
    setEvents([]);
  };

  const startMatch = async () => {
    if (!testMatchId) return;
    
    try {
      addLog('🚀 Starting match...');
      await webSocketManager.startMatch(testMatchId, true);
      addLog('✅ Match started successfully');
    } catch (error) {
      addLog(`❌ Failed to start match: ${error}`);
    }
  };

  const pauseMatch = async () => {
    if (!testMatchId) return;
    
    try {
      addLog('⏸️ Pausing match...');
      await webSocketManager.pauseMatch(testMatchId);
      addLog('✅ Match paused successfully');
    } catch (error) {
      addLog(`❌ Failed to pause match: ${error}`);
    }
  };

  const resumeMatch = async () => {
    if (!testMatchId) return;
    
    try {
      addLog('▶️ Resuming match...');
      await webSocketManager.resumeMatch(testMatchId);
      addLog('✅ Match resumed successfully');
    } catch (error) {
      addLog(`❌ Failed to resume match: ${error}`);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            WebSocket Test Console
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Controls */}
          <div className="flex space-x-2">
            <Button 
              onClick={connectWebSocket} 
              disabled={isConnected}
              variant="default"
            >
              Connect
            </Button>
            <Button 
              onClick={disconnectWebSocket} 
              disabled={!isConnected}
              variant="outline"
            >
              Disconnect
            </Button>
          </div>

          <Separator />

          {/* Match Controls */}
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter Match ID to test"
                value={testMatchId}
                onChange={(e) => setTestMatchId(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={joinTestMatch} 
                disabled={!isConnected || !testMatchId}
                variant="default"
              >
                Join Match
              </Button>
              <Button 
                onClick={leaveMatch} 
                disabled={!isConnected}
                variant="outline"
              >
                Leave
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={startMatch} 
                disabled={!isConnected || !testMatchId}
                variant="default"
                size="sm"
              >
                Start Match
              </Button>
              <Button 
                onClick={pauseMatch} 
                disabled={!isConnected || !testMatchId}
                variant="outline"
                size="sm"
              >
                Pause
              </Button>
              <Button 
                onClick={resumeMatch} 
                disabled={!isConnected || !testMatchId}
                variant="outline"
                size="sm"
              >
                Resume
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-1">
                {connectionLogs.map((log, index) => (
                  <div key={index} className="text-sm font-mono p-2 bg-muted rounded">
                    {log}
                  </div>
                ))}
                {connectionLogs.length === 0 && (
                  <div className="text-muted-foreground text-center py-8">
                    Connection logs will appear here
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Match Events */}
        <Card>
          <CardHeader>
            <CardTitle>Live Match Events</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {events.map((event, index) => (
                  <div key={index} className="border-l-2 border-primary pl-3 py-2">
                    <div className="flex justify-between items-center mb-1">
                      <Badge variant="outline" size="sm">
                        {Math.floor(event.time / 60)}:{(event.time % 60).toString().padStart(2, '0')}
                      </Badge>
                      <Badge variant="secondary" size="sm">
                        {event.type}
                      </Badge>
                    </div>
                    <p className="text-sm">{event.description}</p>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="text-muted-foreground text-center py-8">
                    Match events will appear here
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default WebSocketTestPage;