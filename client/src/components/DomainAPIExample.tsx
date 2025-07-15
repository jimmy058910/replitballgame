import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Zap, Database, Shield } from 'lucide-react';
import { useTournamentStore } from '@/stores/tournamentStore';
import { useMatchStore } from '@/stores/matchStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';

export function DomainAPIExample() {
  const [isConnecting, setIsConnecting] = useState(false);
  const tournamentStore = useTournamentStore();
  const matchStore = useMatchStore();
  const economyStore = useEconomyStore();
  const { allConnected } = useRealTimeUpdates();

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Demo WebSocket connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Demo WebSocket connection established');
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const storeExamples = [
    {
      name: 'Tournament Store',
      icon: <Zap className="w-4 h-4" />,
      description: 'Real-time tournament status and registration management',
      status: tournamentStore.isConnected ? 'connected' : 'disconnected',
      data: {
        tournaments: tournamentStore.tournaments?.length || 0,
        registrations: tournamentStore.registrations?.length || 0,
        isLoading: tournamentStore.isLoading
      }
    },
    {
      name: 'Match Store',
      icon: <Database className="w-4 h-4" />,
      description: 'Live match updates and simulation events',
      status: matchStore.isConnected ? 'connected' : 'disconnected',
      data: {
        matches: matchStore.matches?.length || 0,
        liveMatches: matchStore.liveMatches?.length || 0,
        events: matchStore.events?.length || 0
      }
    },
    {
      name: 'Economy Store',
      icon: <Shield className="w-4 h-4" />,
      description: 'Financial data and marketplace management',
      status: economyStore.isConnected ? 'connected' : 'disconnected',
      data: {
        storeItems: economyStore.storeItems?.length || 0,
        marketplaceListings: economyStore.marketplaceListings?.length || 0,
        balance: economyStore.balance || 0
      }
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Real-Time State Management
          </CardTitle>
          <CardDescription>
            Demonstrating Zustand stores with WebSocket integration for live data synchronization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Connection Status</h3>
                <p className="text-sm text-muted-foreground">
                  WebSocket connections for real-time updates
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={allConnected ? "default" : "secondary"}>
                  {allConnected ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                  {allConnected ? "All Connected" : "Disconnected"}
                </Badge>
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  size="sm"
                >
                  {isConnecting ? "Connecting..." : "Connect WebSocket"}
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {storeExamples.map((store) => (
                <div key={store.name} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {store.icon}
                      <span className="font-medium">{store.name}</span>
                    </div>
                    <Badge variant={store.status === 'connected' ? "default" : "secondary"}>
                      {store.status === 'connected' ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {store.description}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {Object.entries(store.data).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className="font-medium">{String(value)}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Store Methods</CardTitle>
          <CardDescription>
            Available methods in each Zustand store for state management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Tournament Store</h4>
                <div className="space-y-1 text-sm">
                  <div>• registerForTournament()</div>
                  <div>• getTournamentHistory()</div>
                  <div>• getActiveTournaments()</div>
                  <div>• connectWebSocket()</div>
                  <div>• refreshData()</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Match Store</h4>
                <div className="space-y-1 text-sm">
                  <div>• getLiveMatches()</div>
                  <div>• createMatch()</div>
                  <div>• simulateMatch()</div>
                  <div>• subscribeToMatch()</div>
                  <div>• getMatchEvents()</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Economy Store</h4>
                <div className="space-y-1 text-sm">
                  <div>• getDailyStore()</div>
                  <div>• purchaseItem()</div>
                  <div>• getMarketplace()</div>
                  <div>• placeBid()</div>
                  <div>• watchAd()</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}