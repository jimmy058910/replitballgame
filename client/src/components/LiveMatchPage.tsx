import React from 'react';
import { useParams } from 'wouter';
import { useAuth } from '@/providers/AuthProvider';
import EnhancedMatchEngine from '@/components/EnhancedMatchEngine';

interface User {
  userId?: string;
  id?: string;
}

export default function LiveMatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth() as { user: User | null };

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

  const userId = user?.userId || user?.id || "";

  // Use enhanced match engine with 2D Canvas for all live matches
  return (
    <EnhancedMatchEngine 
      matchId={matchId}
      userId={userId}
    />
  );
}