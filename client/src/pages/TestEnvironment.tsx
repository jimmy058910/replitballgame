/**
 * Test Environment - Comprehensive Match Simulation Testing Interface
 * Industry-standard testing infrastructure for match engine validation and refinement
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  TestTube, 
  BarChart3, 
  Users, 
  Target,
  Timer,
  Award,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Globe
} from 'lucide-react';
import { EnhancedMatchEngine } from '@/components/EnhancedMatchEngine';

interface TestSession {
  id: string;
  name: string;
  description: string;
  teams: any[];
  matches: any[];
  createdAt: string;
  status: 'active' | 'completed' | 'archived';
}

interface TestResult {
  sessionId: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  expectedOutcome: string;
  actualOutcome: string;
  matchedExpectation: boolean;
  duration: number;
  performance: {
    simulationTime: number;
    memoryUsed: number;
    eventsGenerated: number;
  };
  timestamp: string;
}

export default function TestEnvironment() {
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [liveMatchData, setLiveMatchData] = useState<{
    team1?: any;
    team2?: any;
    matchId?: string;
    isCreating?: boolean;
    isWatching?: boolean;
  }>({});
  const [runningTests, setRunningTests] = useState<boolean>(false);
  const [testProgress, setTestProgress] = useState<number>(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Session creation form state
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionDescription, setNewSessionDescription] = useState('');
  const [teamCount, setTeamCount] = useState(8);
  const [powerDistribution, setPowerDistribution] = useState('varied');
  const [includeEdgeCases, setIncludeEdgeCases] = useState(true);

  // Fetch all test sessions
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['/api/test-environment/sessions'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch selected session details
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ['/api/test-environment/sessions', selectedSession],
    enabled: !!selectedSession
  });

  // Fetch session analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/test-environment/sessions', selectedSession, 'analytics'],
    enabled: !!selectedSession
  });

  // Create new test session
  const createSessionMutation = useMutation({
    mutationFn: async (sessionConfig: any) => {
      const response = await fetch('/api/test-environment/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionConfig)
      });
      if (!response.ok) throw new Error('Failed to create test session');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test Session Created",
        description: data.message
      });
      queryClient.invalidateQueries({ queryKey: ['/api/test-environment/sessions'] });
      setSelectedSession(data.session.id);
      // Reset form
      setNewSessionName('');
      setNewSessionDescription('');
      setTeamCount(8);
      setPowerDistribution('varied');
      setIncludeEdgeCases(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create test session",
        variant: "destructive"
      });
    }
  });

  // Run batch test
  const runBatchTestMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/test-environment/sessions/${sessionId}/run-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to run batch test');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Batch Test Completed",
        description: data.message
      });
      queryClient.invalidateQueries({ queryKey: ['/api/test-environment/sessions'] });
      setRunningTests(false);
      setTestProgress(100);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to run batch test",
        variant: "destructive"
      });
      setRunningTests(false);
      setTestProgress(0);
    }
  });

  const handleCreateSession = () => {
    if (!newSessionName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session name",
        variant: "destructive"
      });
      return;
    }

    createSessionMutation.mutate({
      name: newSessionName,
      description: newSessionDescription,
      teamCount,
      powerDistribution,
      includeEdgeCases
    });
  };

  const handleRunBatchTest = () => {
    if (!selectedSession) {
      toast({
        title: "Error",
        description: "Please select a test session first",
        variant: "destructive"
      });
      return;
    }

    setRunningTests(true);
    setTestProgress(0);
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setTestProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 1000);

    runBatchTestMutation.mutate(selectedSession);
  };

  const sessions = (sessionsData as any)?.sessions || [];
  const currentSession = (sessionData as any)?.session;
  const analytics = (analyticsData as any)?.analytics;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TestTube className="h-8 w-8 text-blue-500" />
            Test Environment
          </h1>
          <p className="text-muted-foreground">
            Industry-standard testing infrastructure for match simulation engine validation
          </p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-600">
          Operational
        </Badge>
      </div>

      <Tabs defaultValue="sessions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="sessions">Test Sessions</TabsTrigger>
          <TabsTrigger value="create">Create Session</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="live" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Live Match Simulation
          </TabsTrigger>
        </TabsList>

        {/* Test Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Active Test Sessions
                </CardTitle>
                <CardDescription>
                  Select and manage test sessions for match engine validation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="text-center py-8">Loading test sessions...</div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No test sessions found. Create your first session to get started.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {sessions.map((session: TestSession) => (
                      <Card 
                        key={session.id} 
                        className={`cursor-pointer transition-colors ${
                          selectedSession === session.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setSelectedSession(session.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{session.name}</h3>
                              <p className="text-sm text-muted-foreground">{session.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {session.teams?.length || 0} Teams
                                </span>
                                <span className="flex items-center gap-1">
                                  <Target className="h-4 w-4" />
                                  {session.matches?.length || 0} Scenarios
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {new Date(session.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                                {session.status}
                              </Badge>
                              {selectedSession === session.id && (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRunBatchTest();
                                  }}
                                  disabled={runningTests}
                                  size="sm"
                                >
                                  {runningTests ? (
                                    <>
                                      <Pause className="h-4 w-4 mr-1" />
                                      Running...
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-4 w-4 mr-1" />
                                      Run Tests
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {runningTests && (
                  <Card className="mt-4">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Test Progress</span>
                          <span className="text-sm text-muted-foreground">{Math.round(testProgress)}%</span>
                        </div>
                        <Progress value={testProgress} className="w-full" />
                        <p className="text-sm text-muted-foreground">
                          Running comprehensive match simulation tests...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Session Details */}
            {currentSession && (
              <Card>
                <CardHeader>
                  <CardTitle>Session Details: {currentSession.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <div className="text-2xl font-bold">{currentSession.teams?.length || 0}</div>
                      <div className="text-sm text-muted-foreground">Generated Teams</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Target className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <div className="text-2xl font-bold">{currentSession.matches?.length || 0}</div>
                      <div className="text-sm text-muted-foreground">Test Scenarios</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <Zap className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                      <div className="text-2xl font-bold">{currentSession.status}</div>
                      <div className="text-sm text-muted-foreground">Session Status</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Create Session Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Create New Test Session
              </CardTitle>
              <CardDescription>
                Generate teams and match scenarios for comprehensive testing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Session Name</label>
                  <Input
                    placeholder="Enter session name..."
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Team Count</label>
                  <Select value={teamCount.toString()} onValueChange={(v) => setTeamCount(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 Teams</SelectItem>
                      <SelectItem value="6">6 Teams</SelectItem>
                      <SelectItem value="8">8 Teams</SelectItem>
                      <SelectItem value="12">12 Teams</SelectItem>
                      <SelectItem value="16">16 Teams</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Describe the test objectives..."
                  value={newSessionDescription}
                  onChange={(e) => setNewSessionDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Power Distribution</label>
                  <Select value={powerDistribution} onValueChange={setPowerDistribution}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balanced">Balanced (All Average)</SelectItem>
                      <SelectItem value="varied">Varied (Mixed Levels)</SelectItem>
                      <SelectItem value="extreme">Extreme (Weak vs Elite)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="edgeCases"
                    checked={includeEdgeCases}
                    onChange={(e) => setIncludeEdgeCases(e.target.checked)}
                    className="rounded border border-gray-300"
                  />
                  <label htmlFor="edgeCases" className="text-sm font-medium">
                    Include Edge Cases
                  </label>
                </div>
              </div>

              <Separator />

              <Button
                onClick={handleCreateSession}
                disabled={createSessionMutation.isPending}
                className="w-full"
              >
                {createSessionMutation.isPending ? (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                    Creating Session...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Create Test Session
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {analytics ? (
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Test Session Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Target className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <div className="text-2xl font-bold">{analytics.totalMatches}</div>
                      <div className="text-sm text-muted-foreground">Total Matches</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <div className="text-2xl font-bold">{analytics.accuracyRate}</div>
                      <div className="text-sm text-muted-foreground">Accuracy Rate</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <Timer className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                      <div className="text-2xl font-bold">{analytics.averageSimulationTime}</div>
                      <div className="text-sm text-muted-foreground">Avg Sim Time</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                      <div className="text-2xl font-bold">{analytics.averageMemoryUsage}</div>
                      <div className="text-sm text-muted-foreground">Avg Memory</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm font-medium mb-1">Fastest Match</div>
                      <div className="text-2xl font-bold text-green-600">
                        {analytics.performanceMetrics?.fastestMatch}ms
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">Slowest Match</div>
                      <div className="text-2xl font-bold text-red-600">
                        {analytics.performanceMetrics?.slowestMatch}ms
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">Most Events</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {analytics.performanceMetrics?.mostEvents}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Select a test session and run tests to view analytics
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Test Results
              </CardTitle>
              <CardDescription>
                Detailed results from match simulation testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TestTube className="h-12 w-12 mx-auto mb-4" />
                <p>Run test sessions to view detailed results here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Match Simulation Tab */}
        <TabsContent value="live" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-green-500" />
                  Live Match Simulation
                </CardTitle>
                <CardDescription>
                  Create and watch real-time match simulations between test teams with full field visualization
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!liveMatchData.isWatching ? (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">Create a Live Test Match</h3>
                      <p className="text-muted-foreground mb-4">
                        Select two test teams to create an actual live match simulation that you can watch in real-time
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Team 1 Selection */}
                      <Card className="p-4">
                        <div className="text-center mb-3">
                          <h4 className="font-medium">Home Team</h4>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full h-16"
                          onClick={() => {
                            setLiveMatchData(prev => ({
                              ...prev,
                              team1: {
                                id: 'test-team-1',
                                name: 'Thunder Hawks',
                                division: 'Diamond',
                                power: 28.5
                              }
                            }));
                          }}
                        >
                          {liveMatchData.team1 ? (
                            <div className="text-center">
                              <div className="font-semibold">{liveMatchData.team1.name}</div>
                              <div className="text-sm text-muted-foreground">Power: {liveMatchData.team1.power}</div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              Select Home Team
                            </div>
                          )}
                        </Button>
                      </Card>

                      {/* Team 2 Selection */}
                      <Card className="p-4">
                        <div className="text-center mb-3">
                          <h4 className="font-medium">Away Team</h4>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full h-16"
                          onClick={() => {
                            setLiveMatchData(prev => ({
                              ...prev,
                              team2: {
                                id: 'test-team-2',
                                name: 'Shadow Wolves',
                                division: 'Diamond',
                                power: 27.8
                              }
                            }));
                          }}
                        >
                          {liveMatchData.team2 ? (
                            <div className="text-center">
                              <div className="font-semibold">{liveMatchData.team2.name}</div>
                              <div className="text-sm text-muted-foreground">Power: {liveMatchData.team2.power}</div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              Select Away Team
                            </div>
                          )}
                        </Button>
                      </Card>
                    </div>

                    {/* Match Creation */}
                    {liveMatchData.team1 && liveMatchData.team2 && (
                      <div className="text-center space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-semibold mb-2">Match Preview</h4>
                          <div className="flex items-center justify-center gap-4">
                            <div className="text-center">
                              <div className="font-medium">{liveMatchData.team1.name}</div>
                              <div className="text-sm text-muted-foreground">Power: {liveMatchData.team1.power}</div>
                            </div>
                            <div className="text-2xl font-bold text-muted-foreground">VS</div>
                            <div className="text-center">
                              <div className="font-medium">{liveMatchData.team2.name}</div>
                              <div className="text-sm text-muted-foreground">Power: {liveMatchData.team2.power}</div>
                            </div>
                          </div>
                        </div>

                        <Button 
                          size="lg"
                          className="flex items-center gap-2"
                          onClick={async () => {
                            setLiveMatchData(prev => ({ ...prev, isCreating: true }));
                            try {
                              // For demo purposes, create a mock match ID
                              const mockMatchId = 'live-test-' + Date.now();
                              
                              setLiveMatchData(prev => ({
                                ...prev,
                                matchId: mockMatchId,
                                isCreating: false,
                                isWatching: true
                              }));
                              
                              toast({
                                title: "Live Match Created!",
                                description: `${liveMatchData.team1.name} vs ${liveMatchData.team2.name} is ready to start`
                              });
                            } catch (error) {
                              console.error('Failed to create live match:', error);
                              setLiveMatchData(prev => ({ ...prev, isCreating: false }));
                              toast({
                                title: "Match Creation Failed",
                                description: "Could not create the live match simulation",
                                variant: "destructive"
                              });
                            }
                          }}
                          disabled={liveMatchData.isCreating}
                        >
                          {liveMatchData.isCreating ? (
                            <>
                              <Pause className="w-4 h-4 animate-spin" />
                              Creating Match...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              Start Live Match Simulation
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Enhanced Match Engine Integration */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        Live Match: {liveMatchData.team1?.name} vs {liveMatchData.team2?.name}
                      </h3>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setLiveMatchData({});
                        }}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Back to Setup
                      </Button>
                    </div>

                    {liveMatchData.matchId && (
                      <div className="border rounded-lg p-2">
                        <EnhancedMatchEngine
                          matchId={liveMatchData.matchId}
                          userId="test-user"
                          team1={liveMatchData.team1}
                          team2={liveMatchData.team2}
                          onMatchComplete={() => {
                            toast({
                              title: "Match Complete!",
                              description: "The live simulation has finished"
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}