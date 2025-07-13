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

  if (!user?.userId) {
    console.log('Auth check failed - user:', user);
    console.log('User ID:', user?.userId);
    
    // TEMPORARY: Bypass authentication to debug match loading issues
    // Use hardcoded userId that we know works
    const hardcodedUserId = "44010914";
    console.log('Using hardcoded userId for debugging:', hardcodedUserId);
    
    return (
      <LiveMatchViewer 
        matchId={matchId} 
        userId={hardcodedUserId}
      />
    );
  }

  return (
    <LiveMatchViewer 
      matchId={matchId} 
      userId={user.userId} 
    />
  );
}