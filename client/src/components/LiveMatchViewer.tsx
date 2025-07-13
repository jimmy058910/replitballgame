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
    enabled: !!matchId
  });

  // Fetch enhanced match data
  const { data: enhancedData, isLoading: enhancedDataLoading } = useQuery({
    queryKey: [`/api/matches/${matchId}/enhanced`],
    enabled: !!matchId
  });

  // Debug logging
  console.log('🔍 LiveMatchViewer render state:', {
    matchDataLoading,
    initialMatchData,
    matchError,
    enhancedData,
    enhancedDataLoading
  });

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

  // Error state
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

  // Extract team data
  const team1 = initialMatchData.homeTeam;
  const team2 = initialMatchData.awayTeam;

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