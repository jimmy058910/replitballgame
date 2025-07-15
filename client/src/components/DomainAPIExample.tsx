// Example component showing how to use the new domain-driven architecture
import React, { useState, useEffect } from 'react';
import { useTournamentStore } from '@/stores/tournamentStore';
import { useMatchStore } from '@/stores/matchStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import { tournamentAPI, matchAPI, economyAPI, checkDomainHealth } from '@/lib/domainAPI';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function DomainAPIExample() {
  const [isHealthy, setIsHealthy] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Use Zustand stores
  const tournamentStore = useTournamentStore();
  const matchStore = useMatchStore();
  const economyStore = useEconomyStore();
  
  // Use real-time updates
  useRealTimeUpdates();
  
  useEffect(() => {
    // Check domain health on mount
    checkDomainHealth().then(setIsHealthy);
  }, []);

  const handleTestTournamentAPI = async () => {
    setLoading(true);
    try {
      // Test tournament registration
      const registerResponse = await tournamentAPI.register(132, {
        division: 8,
        paymentType: 'credits'
      });
      
      console.log('Tournament registration:', registerResponse);
      
      // Test getting tournament history
      const historyResponse = await tournamentAPI.getHistory(132);
      console.log('Tournament history:', historyResponse);
      
      // Update store with new data
      tournamentStore.setTournamentHistory(historyResponse.data || []);
      
    } catch (error) {
      console.error('Tournament API test failed:', error);
      tournamentStore.setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestMatchAPI = async () => {
    setLoading(true);
    try {
      // Test getting live matches
      const liveResponse = await matchAPI.getLive();
      console.log('Live matches:', liveResponse);
      
      // Update store with new data
      matchStore.setLiveMatches(liveResponse.data || []);
      
    } catch (error) {
      console.error('Match API test failed:', error);
      matchStore.setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEconomyAPI = async () => {
    setLoading(true);
    try {
      // Test getting daily store
      const storeResponse = await economyAPI.getDailyStore();
      console.log('Daily store:', storeResponse);
      
      // Test getting finances
      const financeResponse = await economyAPI.getFinances(132);
      console.log('Team finances:', financeResponse);
      
      // Update store with new data
      economyStore.setDailyStoreItems(storeResponse.data || []);
      economyStore.setTeamFinances(financeResponse.data || null);
      
    } catch (error) {
      console.error('Economy API test failed:', error);
      economyStore.setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Domain-Driven Architecture Demo</CardTitle>
          <CardDescription>
            Testing the new domain-driven backend architecture with Zod validation and Zustand state management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Badge variant={isHealthy ? "default" : "destructive"}>
              Domain API: {isHealthy ? "Healthy" : "Unhealthy"}
            </Badge>
            <Badge variant={tournamentStore.isConnected ? "default" : "destructive"}>
              Tournament WebSocket: {tournamentStore.isConnected ? "Connected" : "Disconnected"}
            </Badge>
            <Badge variant={matchStore.isConnected ? "default" : "destructive"}>
              Match WebSocket: {matchStore.isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Tournament Domain</h3>
              <div className="flex gap-2">
                <Button 
                  onClick={handleTestTournamentAPI}
                  disabled={loading}
                  variant="outline"
                >
                  Test Tournament API
                </Button>
                <Badge variant="outline">
                  Active: {tournamentStore.activeTournaments.length}
                </Badge>
                <Badge variant="outline">
                  History: {tournamentStore.tournamentHistory.length}
                </Badge>
              </div>
              {tournamentStore.error && (
                <p className="text-red-500 text-sm mt-2">{tournamentStore.error}</p>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Match Domain</h3>
              <div className="flex gap-2">
                <Button 
                  onClick={handleTestMatchAPI}
                  disabled={loading}
                  variant="outline"
                >
                  Test Match API
                </Button>
                <Badge variant="outline">
                  Live: {matchStore.liveMatches.length}
                </Badge>
                <Badge variant="outline">
                  Events: {matchStore.simulationEvents.length}
                </Badge>
              </div>
              {matchStore.error && (
                <p className="text-red-500 text-sm mt-2">{matchStore.error}</p>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Economy Domain</h3>
              <div className="flex gap-2">
                <Button 
                  onClick={handleTestEconomyAPI}
                  disabled={loading}
                  variant="outline"
                >
                  Test Economy API
                </Button>
                <Badge variant="outline">
                  Credits: {economyStore.teamFinances?.credits || 0}
                </Badge>
                <Badge variant="outline">
                  Store Items: {economyStore.dailyStoreItems.length}
                </Badge>
              </div>
              {economyStore.error && (
                <p className="text-red-500 text-sm mt-2">{economyStore.error}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}