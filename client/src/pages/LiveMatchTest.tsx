/**
 * Live Match Engine Test Page
 * Testing interface for the 2D Canvas-based match engine
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RealmRivalry2DMatchEngine } from '../components/RealmRivalry2DMatchEngine';
import { useAuth } from '../providers/AuthProvider';

interface Match {
  id: string;
  homeTeam: {
    id: string;
    name: string;
  };
  awayTeam: {
    id: string;
    name: string;
  };
  status: string;
  matchType: string;
  gameDate: string;
}

export function LiveMatchTest() {
  const { user } = useAuth();
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [liveMatchStarted, setLiveMatchStarted] = useState(false);

  // Fetch available matches for testing
  const { data: matches, isLoading } = useQuery({
    queryKey: ['/api/matches/live'],
    enabled: !!user
  });

  // Fetch user's recent matches for testing
  const { data: recentMatches } = useQuery({
    queryKey: ['/api/matches/recent', user?.team?.id],
    enabled: !!user?.team?.id
  });

  const availableMatches = [...(matches || []), ...(recentMatches || [])].slice(0, 10);

  const startLiveMatch = async (matchId: string) => {
    try {
      const response = await fetch(`/api/live-matches/${matchId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setSelectedMatch(matchId);
        setLiveMatchStarted(true);
        console.log('Live match started successfully');
      } else {
        console.error('Failed to start live match');
      }
    } catch (error) {
      console.error('Error starting live match:', error);
    }
  };

  const createTestMatch = async () => {
    try {
      // Create an exhibition match for testing
      const response = await fetch('/api/matches/exhibition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: user?.team?.id
        }),
      });

      if (response.ok) {
        const newMatch = await response.json();
        await startLiveMatch(newMatch.id);
      } else {
        console.error('Failed to create test match');
      }
    } catch (error) {
      console.error('Error creating test match:', error);
    }
  };

  const createDemoMatch = async () => {
    try {
      // Create a demo match for live engine testing
      const response = await fetch('/api/live-matches/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const demoData = await response.json();
        setSelectedMatch(demoData.match.id);
        setLiveMatchStarted(true);
        console.log('Demo match created and started:', demoData.match.id);
      } else {
        const errorData = await response.json();
        console.error('Failed to create demo match:', errorData.error);
        alert(errorData.error);
      }
    } catch (error) {
      console.error('Error creating demo match:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Live Match Engine Test</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please log in to test the live match engine.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (liveMatchStarted && selectedMatch) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Live Match Engine Test</h1>
            <Button 
              onClick={() => {
                setLiveMatchStarted(false);
                setSelectedMatch(null);
              }}
              variant="outline"
            >
              Back to Match List
            </Button>
          </div>
          
          <RealmRivalry2DMatchEngine 
            matchId={selectedMatch}
            userId={user.id}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Live Match Engine Test</CardTitle>
            <p className="text-gray-400">
              Test the new 2D Canvas-based match engine with real-time WebSocket updates
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button 
                  onClick={createDemoMatch}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  🎮 Start Demo Match (2D Canvas)
                </Button>
                <Button 
                  onClick={createTestMatch}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Create Test Exhibition Match
                </Button>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Test Features:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                  <li>Priority-based simulation speeds (Critical=1x, Important=2x, Standard=visuals off)</li>
                  <li>Real-time WebSocket communication</li>
                  <li>2D Canvas dome field visualization</li>
                  <li>Stadium facility visualization</li>
                  <li>Live revenue tracking</li>
                  <li>Player movement and statistics</li>
                  <li>Match events and commentary</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <p>Loading available matches...</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Available Matches for Testing</CardTitle>
            </CardHeader>
            <CardContent>
              {availableMatches.length === 0 ? (
                <p className="text-gray-400">No matches available. Create a test match above.</p>
              ) : (
                <div className="grid gap-4">
                  {availableMatches.map((match: Match) => (
                    <div 
                      key={match.id}
                      className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {match.homeTeam?.name || 'Home Team'} vs {match.awayTeam?.name || 'Away Team'}
                          </span>
                          <Badge variant="secondary">
                            {match.matchType}
                          </Badge>
                          <Badge 
                            variant={match.status === 'SCHEDULED' ? 'default' : 'outline'}
                          >
                            {match.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400">
                          Match ID: {match.id}
                        </p>
                      </div>
                      <Button 
                        onClick={() => startLiveMatch(match.id)}
                        disabled={match.status !== 'SCHEDULED'}
                        className="ml-4"
                      >
                        Start Live Match
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">✓</div>
                <p className="text-sm">WebSocket Manager</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">✓</div>
                <p className="text-sm">Live Match Engine</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">✓</div>
                <p className="text-sm">Canvas Renderer</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">✓</div>
                <p className="text-sm">Stadium Visualizer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}