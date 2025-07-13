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
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold">Match Completed</h3>
            <div className="text-lg">
              Final Score: {initialMatchData.homeScore} - {initialMatchData.awayScore}
            </div>
            <div className="text-sm text-muted-foreground">
              This match has ended. Check the results in your dashboard.
            </div>
          </div>
        </CardContent>
      </Card>
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