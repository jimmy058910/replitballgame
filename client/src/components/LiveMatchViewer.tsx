import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { GameSimulationUI } from './GameSimulationUI';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LiveMatchState } from '@/lib/websocket';

interface LiveMatchViewerProps {
  matchId: string;
  userId: string;
  onMatchComplete?: (finalState: LiveMatchState) => void;
}

export function LiveMatchViewer({ matchId, userId, onMatchComplete }: LiveMatchViewerProps) {
  const { toast } = useToast();

  // Fetch initial match data
  const { data: initialMatchData, error: matchError, isLoading: matchDataLoading } = useQuery({
    queryKey: [`/api/matches/${matchId}`],
    enabled: !!matchId,
    retry: 3,
    retryDelay: 1000,
    // Override the global retry: false setting
    meta: { 
      errorRetry: true 
    },
    queryFn: async () => {
      console.log(`🔍 Fetching match data for ID: ${matchId}`);
      try {
        const response = await fetch(`/api/matches/${matchId}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`🔍 Response status: ${response.status}`);
        console.log(`🔍 Response headers:`, Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const text = await response.text();
          console.error(`🚨 API Error: ${response.status} - ${text}`);
          throw new Error(`${response.status}: ${text}`);
        }
        
        const data = await response.json();
        console.log(`✅ Successfully fetched match data:`, data);
        return data;
      } catch (error) {
        console.error(`🚨 Fetch error for match ${matchId}:`, error);
        throw error;
      }
    }
  });

  // Fetch enhanced match data
  const { data: enhancedData, isLoading: enhancedDataLoading, error: enhancedError } = useQuery({
    queryKey: [`/api/matches/${matchId}/enhanced-data`],
    enabled: !!matchId,
    queryFn: async () => {
      console.log(`🔍 Fetching enhanced data for ID: ${matchId}`);
      try {
        const response = await fetch(`/api/matches/${matchId}/enhanced-data`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`🔍 Enhanced data response status: ${response.status}`);
        
        if (!response.ok) {
          const text = await response.text();
          console.error(`🚨 Enhanced data API Error: ${response.status} - ${text}`);
          throw new Error(`${response.status}: ${text}`);
        }
        
        const data = await response.json();
        console.log(`✅ Successfully fetched enhanced data:`, data);
        return data;
      } catch (error) {
        console.error(`🚨 Enhanced data fetch error for match ${matchId}:`, error);
        throw error;
      }
    }
  });

  // Debug logging
  console.log('🔍 LiveMatchViewer render state:', {
    matchDataLoading,
    initialMatchData,
    matchError,
    enhancedData,
    enhancedDataLoading,
    enhancedError,
    matchId
  });

  // Enhanced error logging
  if (matchError) {
    console.error('🚨 Match query error details:', {
      error: matchError,
      message: matchError.message,
      stack: matchError.stack,
      name: matchError.name,
      queryKey: `/api/matches/${matchId}`,
      matchId
    });
  }

  // Enhanced data error logging
  if (enhancedError) {
    console.error('🚨 Enhanced data query error details:', {
      error: enhancedError,
      message: enhancedError.message,
      stack: enhancedError.stack,
      name: enhancedError.name,
      queryKey: `/api/matches/${matchId}/enhanced-data`,
      matchId
    });
  }

  // Handle completed matches
  if (initialMatchData && initialMatchData.status === 'COMPLETED') {
    // Import PostGameSummary dynamically
    const PostGameSummary = React.lazy(() => import('./PostGameSummary').then(module => ({ default: module.PostGameSummary })));
    
    return (
      <React.Suspense fallback={
        <Card className="w-full max-w-6xl mx-auto">
          <CardContent className="p-6">
            <div className="text-center">Loading match summary...</div>
          </CardContent>
        </Card>
      }>
        <PostGameSummary
          matchId={matchId}
          homeTeam={{
            id: initialMatchData.homeTeam?.id || '',
            name: initialMatchData.homeTeam?.name || 'Home Team',
            score: initialMatchData.homeScore || 0,
            stats: enhancedData?.teamStats?.home
          }}
          awayTeam={{
            id: initialMatchData.awayTeam?.id || '',
            name: initialMatchData.awayTeam?.name || 'Away Team',
            score: initialMatchData.awayScore || 0,
            stats: enhancedData?.teamStats?.away
          }}
          mvpData={enhancedData?.mvpData}
          matchDuration={initialMatchData.duration}
          attendanceData={enhancedData?.atmosphereEffects && {
            attendance: enhancedData.atmosphereEffects.attendance || 0,
            capacity: Math.floor((enhancedData.atmosphereEffects.attendance || 0) / 0.8),
            percentage: Math.floor(((enhancedData.atmosphereEffects.attendance || 0) / Math.floor((enhancedData.atmosphereEffects.attendance || 0) / 0.8)) * 100)
          }}
        />
      </React.Suspense>
    );
  }

  // Loading state
  if (matchDataLoading || enhancedDataLoading) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span>Loading match data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state - only show if BOTH queries failed or if we have match data but it's critical
  if (matchError && !initialMatchData) {
    console.error('🚨 CRITICAL: Match error without data:', matchError);
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive">Failed to Load Match</h3>
            <p className="text-muted-foreground">Please try refreshing the page</p>
            <p className="text-sm text-muted-foreground mt-2">Error: {matchError.message || 'Unknown error'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show warning if enhanced data fails but continue with match data
  if (enhancedError && initialMatchData) {
    console.warn('🚨 Enhanced data failed but match data is available:', enhancedError);
  }

  // No match data yet
  if (!initialMatchData) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">Waiting for match data...</div>
        </CardContent>
      </Card>
    );
  }

  // Extract team data - handle both nested objects and flat structure
  const team1 = initialMatchData.homeTeam || {
    id: initialMatchData.homeTeamId,
    name: initialMatchData.homeTeamName || 'Home Team'
  };
  const team2 = initialMatchData.awayTeam || {
    id: initialMatchData.awayTeamId,
    name: initialMatchData.awayTeamName || 'Away Team'
  };

  // Use the new GameSimulationUI component
  return (
    <GameSimulationUI
      matchId={matchId}
      userId={userId}
      team1={team1}
      team2={team2}
      enhancedData={enhancedData}
      onMatchComplete={onMatchComplete}
    />
  );
}