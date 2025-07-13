import React from 'react';
import { useParams } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { LiveMatchViewer } from '@/components/LiveMatchViewer';

export function LiveMatchPage() {
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

  if (!user?.claims?.sub) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to view live matches</p>
        </div>
      </div>
    );
  }

  return (
    <LiveMatchViewer 
      matchId={matchId} 
      userId={user.claims.sub} 
    />
  );
}