import React, { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/providers/AuthProvider';
import EnhancedMatchEngine from '@/components/EnhancedMatchEngine';

interface User {
  userId?: string;
  id?: string;
}

export default function LiveMatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { user, login, isLoading } = useAuth() as { user: User | null; login: () => Promise<void>; isLoading: boolean };
  const [location] = useLocation();

  // Auto-login for test routes that don't require authentication
  useEffect(() => {
    const isTestRoute = location.includes('/test-live-match');
    if (isTestRoute && !user && !isLoading) {
      login().catch(console.error);
    }
  }, [location, user, isLoading, login]);

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

  // Show loading while authenticating for test routes
  if (location.includes('/test-live-match') && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">🔐 Authenticating...</h2>
          <p className="text-gray-600">Setting up test environment</p>
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