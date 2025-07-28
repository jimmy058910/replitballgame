import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { EnhancedMatchEngine } from './EnhancedMatchEngine';
import { useQuery } from '@tanstack/react-query';
import { Play, Eye, TestTube, CheckCircle, XCircle } from 'lucide-react';

interface TestCase {
  id: string;
  name: string;
  description: string;
  testFn: () => Promise<boolean>;
  status: 'pending' | 'running' | 'passed' | 'failed';
  error?: string;
}

export function EnhancedMatchTest() {
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [isTestingEngine, setIsTestingEngine] = useState(false);
  const [testResults, setTestResults] = useState<TestCase[]>([]);

  // Get available matches for testing
  const { data: availableMatches, isLoading } = useQuery({
    queryKey: ['/api/matches'],
    enabled: true
  });

  const initializeTestCases = (): TestCase[] => [
    {
      id: 'api_stadium_data',
      name: 'Stadium Data API',
      description: 'Test enhanced stadium data endpoint',
      testFn: async () => {
        const response = await fetch(`/api/enhanced-matches/matches/${selectedMatchId}/stadium-data`);
        const data = await response.json();
        return response.ok && data.capacity && data.attendance !== undefined;
      },
      status: 'pending'
    },
    {
      id: 'api_enhanced_data',
      name: 'Enhanced Match Data API',
      description: 'Test enhanced match statistics endpoint',
      testFn: async () => {
        const response = await fetch(`/api/enhanced-matches/matches/${selectedMatchId}/enhanced-data`);
        const data = await response.json();
        return response.ok && data.homePossession !== undefined && data.mvpPlayers;
      },
      status: 'pending'
    },
    {
      id: 'match_control',
      name: 'Match Control API',
      description: 'Test match pause/resume controls',
      testFn: async () => {
        const pauseResponse = await fetch(`/api/enhanced-matches/matches/${selectedMatchId}/control`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'pause' })
        });
        
        const resumeResponse = await fetch(`/api/enhanced-matches/matches/${selectedMatchId}/control`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'resume' })
        });
        
        return pauseResponse.ok && resumeResponse.ok;
      },
      status: 'pending'
    },
    {
      id: 'speed_control',
      name: 'Speed Control API',
      description: 'Test match speed adjustment',
      testFn: async () => {
        const response = await fetch(`/api/enhanced-matches/matches/${selectedMatchId}/speed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ speed: 2.0 })
        });
        return response.ok;
      },
      status: 'pending'
    }
  ];

  const runAPITests = async () => {
    if (!selectedMatchId) {
      alert('Please select a match first');
      return;
    }

    const tests = initializeTestCases();
    setTestResults(tests);

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      
      // Update status to running
      setTestResults(prev => prev.map(t => 
        t.id === test.id ? { ...t, status: 'running' } : t
      ));

      try {
        const result = await test.testFn();
        
        // Update status based on result
        setTestResults(prev => prev.map(t => 
          t.id === test.id ? { 
            ...t, 
            status: result ? 'passed' : 'failed',
            error: result ? undefined : 'Test assertion failed'
          } : t
        ));
      } catch (error) {
        // Update status to failed with error
        setTestResults(prev => prev.map(t => 
          t.id === test.id ? { 
            ...t, 
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          } : t
        ));
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const getStatusIcon = (status: TestCase['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running':
        return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default:
        return <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusBadge = (status: TestCase['status']) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-green-100 text-green-800">Passed</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Enhanced Match Engine Test Suite</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive testing for the enhanced match simulation system
        </p>
      </div>

      {/* Match Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Match Selection
          </CardTitle>
          <CardDescription>
            Choose a match to test the enhanced engine features
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading available matches...</div>
          ) : (
            <div className="space-y-4">
              <select 
                className="w-full p-2 border rounded-md"
                value={selectedMatchId}
                onChange={(e) => setSelectedMatchId(e.target.value)}
              >
                <option value="">Select a match...</option>
                {((availableMatches as any)?.matches || []).map((match: any) => (
                  <option key={match.id} value={match.id}>
                    {match.homeTeam?.name || 'Home'} vs {match.awayTeam?.name || 'Away'} 
                    ({match.matchType || 'LEAGUE'})
                  </option>
                ))}
              </select>
              
              {selectedMatchId && (
                <div className="flex gap-4">
                  <Button onClick={runAPITests} disabled={!selectedMatchId}>
                    <TestTube className="w-4 h-4 mr-2" />
                    Run API Tests
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => setIsTestingEngine(true)}
                    disabled={!selectedMatchId}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Test Enhanced Engine
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>API Test Results</CardTitle>
            <CardDescription>
              Results from enhanced match API endpoint testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((test) => (
                <div key={test.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <h4 className="font-medium">{test.name}</h4>
                      <p className="text-sm text-muted-foreground">{test.description}</p>
                      {test.error && (
                        <p className="text-sm text-red-600 mt-1">Error: {test.error}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(test.status)}
                </div>
              ))}
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Tests: {testResults.filter(t => t.status === 'passed').length} passed, 
                {testResults.filter(t => t.status === 'failed').length} failed, 
                {testResults.filter(t => t.status === 'pending').length} pending
              </span>
              <span>
                Duration: {testResults.filter(t => t.status !== 'pending').length * 0.5}s
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Engine Testing */}
      {isTestingEngine && selectedMatchId && (
        <Card>
          <CardHeader>
            <CardTitle>Enhanced Match Engine Live Test</CardTitle>
            <CardDescription>
              Interactive testing of the enhanced match simulation engine
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnhancedMatchEngine 
              matchId={selectedMatchId}
              userId="1" // Test user ID
              onMatchComplete={() => {
                setIsTestingEngine(false);
                alert('Match test completed successfully!');
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default EnhancedMatchTest;