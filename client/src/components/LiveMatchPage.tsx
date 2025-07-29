import React from 'react';
import { useParams } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import EnhancedMatchSimulation from '@/components/EnhancedMatchSimulation';

export default function LiveMatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth();

  if (!matchId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Invalid Match</h2>
          <p className="text-gray-600">No match ID provided</p>
        </div>
      </div>
    );
  }

  // Use enhanced match simulation for all live matches
  return (
    <EnhancedMatchSimulation 
      matchId={parseInt(matchId, 10)}
      isLiveMatch={true}
    />
  );
}