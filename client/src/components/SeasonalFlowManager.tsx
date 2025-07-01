import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Calendar, 
  Trophy, 
  ArrowUp, 
  ArrowDown, 
  Users, 
  Play,
  Settings,
  BarChart3,
  Clock,
  Target,
  Zap,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

interface SeasonalPhase {
  phase: 'Regular Season' | 'Playoffs' | 'Off-Season';
  description: string;
  dayRange: string;
  currentDay: number;
  totalDays: number;
  isActive: boolean;
}

interface ScheduleGeneration {
  season: number;
  schedulesCreated: number;
  matchesGenerated: number;
  leaguesProcessed: number;
  division1Matches: number;
  standardDivisionMatches: number;
}

interface StandingsData {
  leagueId: string;
  season: number;
  teams: TeamStanding[];
  finalStandings: boolean;
}

interface TeamStanding {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  position: number;
}

interface PlayoffBracket {
  leagueId: string;
  leagueName: string;
  division: number;
  matches: PlayoffMatch[];
  champion?: string;
  runnerUp?: string;
}

interface PlayoffMatch {
  id: string;
  round: 'Semifinal' | 'Final';
  homeTeam: string;
  awayTeam: string;
  result?: string;
  status: 'scheduled' | 'completed';
}

interface PromotionRelegationResult {
  teamId: string;
  teamName: string;
  fromDivision: number;
  toDivision: number;
  reason: 'promotion' | 'relegation' | 'champion_promotion';
}

interface SeasonRollover {
  fromSeason: number;
  newSeason: number;
  summary: {
    totalMatches: number;
    leaguesRebalanced: number;
    teamsPromoted: number;
    teamsRelegated: number;
  };
}

interface SeasonConfig {
  REGULAR_SEASON_DAYS: number;
  PLAYOFF_DAY: number;
  OFFSEASON_DAYS: number[];
  TOTAL_SEASON_DAYS: number;
  POINTS_WIN: number;
  POINTS_DRAW: number;
  POINTS_LOSS: number;
  PLAYOFF_QUALIFIERS: number;
  DIVISION_1_RELEGATION: number;
  STANDARD_RELEGATION: number;
  DIVISION_1_TEAMS: number;
  STANDARD_LEAGUE_TEAMS: number;
}

const getPhaseIcon = (phase: string) => {
  switch (phase) {
    case 'Regular Season': return <Calendar className="w-4 h-4" />;
    case 'Playoffs': return <Trophy className="w-4 h-4" />;
    case 'Off-Season': return <Settings className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

const getPhaseColor = (phase: string) => {
  switch (phase) {
    case 'Regular Season': return 'bg-blue-500';
    case 'Playoffs': return 'bg-yellow-500';
    case 'Off-Season': return 'bg-gray-500';
    default: return 'bg-gray-400';
  }
};

const formatDivisionName = (division: number): string => {
  const names = [
    'Diamond League',
    'Platinum League', 
    'Gold League',
    'Silver League',
    'Bronze League',
    'Iron League',
    'Stone League',
    'Copper League'
  ];
  return names[division - 1] || `Division ${division}`;
};

export default function SeasonalFlowManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSeason, setSelectedSeason] = useState<number>(1);

  // Fetch current seasonal phase
  const { data: currentPhase, isLoading: loadingPhase } = useQuery({
    queryKey: ['/api/seasonal-flow/phase', selectedSeason]
  });

  // Fetch seasonal flow configuration
  const { data: config } = useQuery({
    queryKey: ['/api/seasonal-flow/config']
  });

  // Fetch schedule preview
  const { data: schedulePreview } = useQuery({
    queryKey: ['/api/seasonal-flow/schedule/preview', selectedSeason]
  });

  // Generate schedule mutation
  const generateScheduleMutation = useMutation({
    mutationFn: (season: number) =>
      apiRequest('/api/seasonal-flow/schedule/generate', 'POST', { season }),
    onSuccess: (data) => {
      toast({
        title: 'Schedule Generated',
        description: `Generated ${data.data.matchesGenerated} matches across ${data.data.schedulesCreated} leagues.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/seasonal-flow'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate schedule',
        variant: 'destructive'
      });
    }
  });

  // Generate playoff brackets mutation
  const generatePlayoffsMutation = useMutation({
    mutationFn: (season: number) =>
      apiRequest('/api/seasonal-flow/playoffs/generate', 'POST', { season }),
    onSuccess: (data) => {
      toast({
        title: 'Playoffs Generated',
        description: `Generated ${data.data.totalPlayoffMatches} playoff matches.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/seasonal-flow'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate playoffs',
        variant: 'destructive'
      });
    }
  });

  // Process promotion/relegation mutation
  const processPromotionRelegationMutation = useMutation({
    mutationFn: (season: number) =>
      apiRequest('/api/seasonal-flow/promotion-relegation/process', 'POST', { season }),
    onSuccess: (data) => {
      toast({
        title: 'Promotion/Relegation Processed',
        description: `Processed ${data.data.totalTeamsProcessed} team movements.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/seasonal-flow'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Processing Failed',
        description: error.message || 'Failed to process promotion/relegation',
        variant: 'destructive'
      });
    }
  });

  // Rebalance leagues mutation
  const rebalanceLeaguesMutation = useMutation({
    mutationFn: (season: number) =>
      apiRequest('/api/seasonal-flow/leagues/rebalance', 'POST', { season }),
    onSuccess: (data) => {
      toast({
        title: 'Leagues Rebalanced',
        description: `Rebalanced ${data.data.leaguesRebalanced} divisions.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/seasonal-flow'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Rebalancing Failed',
        description: error.message || 'Failed to rebalance leagues',
        variant: 'destructive'
      });
    }
  });

  // Execute season rollover mutation
  const executeSeasonRolloverMutation = useMutation({
    mutationFn: (currentSeason: number) =>
      apiRequest('/api/seasonal-flow/season/rollover', 'POST', { currentSeason }),
    onSuccess: (data) => {
      toast({
        title: 'Season Rollover Complete',
        description: `Advanced to Season ${data.data.newSeason}!`
      });
      setSelectedSeason(data.data.newSeason);
      queryClient.invalidateQueries({ queryKey: ['/api/seasonal-flow'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Rollover Failed',
        description: error.message || 'Failed to execute season rollover',
        variant: 'destructive'
      });
    }
  });

  if (loadingPhase) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Seasonal Flow Algorithm</h2>
          <p className="text-gray-600">Complete 17-day competitive cycle management with automated scheduling and league balancing</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Current Season</div>
          <div className="text-2xl font-bold">{selectedSeason}</div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Cycle Overview</TabsTrigger>
          <TabsTrigger value="scheduling">Schedule Management</TabsTrigger>
          <TabsTrigger value="playoffs">Playoff System</TabsTrigger>
          <TabsTrigger value="promotion">Promotion/Relegation</TabsTrigger>
          <TabsTrigger value="administration">Administration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={currentPhase?.phase === 'Regular Season' ? 'bg-blue-50 border-blue-200' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Regular Season</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Days 1-{config?.data?.seasonConfig?.REGULAR_SEASON_DAYS || 14}</div>
                <p className="text-xs text-muted-foreground">League matches and standings</p>
                {currentPhase?.phase === 'Regular Season' && (
                  <Badge className="mt-2 bg-blue-500">Current Phase</Badge>
                )}
              </CardContent>
            </Card>

            <Card className={currentPhase?.phase === 'Playoffs' ? 'bg-yellow-50 border-yellow-200' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Playoffs</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Day {config?.data?.seasonConfig?.PLAYOFF_DAY || 15}</div>
                <p className="text-xs text-muted-foreground">Single elimination tournaments</p>
                {currentPhase?.phase === 'Playoffs' && (
                  <Badge className="mt-2 bg-yellow-500">Current Phase</Badge>
                )}
              </CardContent>
            </Card>

            <Card className={currentPhase?.phase === 'Off-Season' ? 'bg-gray-50 border-gray-200' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Off-Season</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Days {config?.data?.seasonConfig?.OFFSEASON_DAYS?.join('-') || '16-17'}
                </div>
                <p className="text-xs text-muted-foreground">Promotion, relegation, planning</p>
                {currentPhase?.phase === 'Off-Season' && (
                  <Badge className="mt-2 bg-gray-500">Current Phase</Badge>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Current Season Progress</CardTitle>
              <CardDescription>17-day competitive cycle timeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Day {currentPhase?.currentDay || 1} of {config?.data?.seasonConfig?.TOTAL_SEASON_DAYS || 17}
                  </span>
                  <Badge variant="outline" className="flex items-center space-x-1">
                    {getPhaseIcon(currentPhase?.phase || 'Regular Season')}
                    <span>{currentPhase?.phase || 'Regular Season'}</span>
                  </Badge>
                </div>
                <Progress 
                  value={((currentPhase?.currentDay || 1) / (config?.data?.seasonConfig?.TOTAL_SEASON_DAYS || 17)) * 100} 
                  className="h-3"
                />
                <p className="text-sm text-gray-600">{currentPhase?.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seasonal Flow Features</CardTitle>
              <CardDescription>Advanced competitive cycle management capabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <h5 className="font-medium text-sm">Automated Scheduling</h5>
                  </div>
                  <p className="text-xs text-gray-600">
                    Complete season schedule generation for all 8 divisions with optimal match distribution
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <h5 className="font-medium text-sm">Playoff Brackets</h5>
                  </div>
                  <p className="text-xs text-gray-600">
                    Automatic playoff generation with proper seeding and single elimination format
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <ArrowUp className="w-4 h-4 text-green-500" />
                    <h5 className="font-medium text-sm">Promotion System</h5>
                  </div>
                  <p className="text-xs text-gray-600">
                    Champions move up divisions; bottom teams face relegation to maintain competitive balance
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-4 h-4 text-purple-500" />
                    <h5 className="font-medium text-sm">League Rebalancing</h5>
                  </div>
                  <p className="text-xs text-gray-600">
                    Automatic redistribution of teams to ensure optimal league sizes and competition
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduling" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Generation System</CardTitle>
              <CardDescription>Automated match scheduling for all divisions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Schedule Structure</h4>
                  <div className="space-y-3">
                    <div className="p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Division 1 (Diamond League)</span>
                        <Badge variant="outline">30 teams</Badge>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        28 games per team • 2 games per day • Double round-robin format
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Divisions 2-8</span>
                        <Badge variant="outline">8 teams each</Badge>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        14 games per team • 1 game per day • Double round-robin format
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Match Distribution</h4>
                  {schedulePreview && (
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded">
                        <div className="text-sm font-medium">Division 1</div>
                        <div className="text-xs text-gray-600">
                          {schedulePreview.data?.structure?.division1?.gamesPerTeam} games per team × {schedulePreview.data?.structure?.division1?.teams} teams = {(schedulePreview.data?.structure?.division1?.gamesPerTeam * schedulePreview.data?.structure?.division1?.teams / 2)} total matches
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <div className="text-sm font-medium">Divisions 2-8</div>
                        <div className="text-xs text-gray-600">
                          {schedulePreview.data?.structure?.standardDivisions?.gamesPerTeam} games per team × {schedulePreview.data?.structure?.standardDivisions?.teams} teams × 7 divisions = {(schedulePreview.data?.structure?.standardDivisions?.gamesPerTeam * schedulePreview.data?.structure?.standardDivisions?.teams * 7 / 2)} total matches
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                <Button
                  onClick={() => generateScheduleMutation.mutate(selectedSeason)}
                  disabled={generateScheduleMutation.isPending}
                  className="w-full"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Generate Season {selectedSeason} Schedule
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Point System</CardTitle>
              <CardDescription>League standings calculation method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-green-600">
                    {config?.data?.seasonConfig?.POINTS_WIN || 3}
                  </div>
                  <div className="text-sm text-gray-600">Points for Win</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-yellow-600">
                    {config?.data?.seasonConfig?.POINTS_DRAW || 1}
                  </div>
                  <div className="text-sm text-gray-600">Points for Draw</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-red-600">
                    {config?.data?.seasonConfig?.POINTS_LOSS || 0}
                  </div>
                  <div className="text-sm text-gray-600">Points for Loss</div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <h5 className="font-medium text-blue-800 mb-2">Tie-Breaking Criteria</h5>
                <ol className="text-sm text-blue-700 space-y-1">
                  <li>1. Total Points</li>
                  <li>2. Goal Difference (Goals For - Goals Against)</li>
                  <li>3. Goals For</li>
                  <li>4. Head-to-Head Record</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="playoffs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Playoff System</CardTitle>
              <CardDescription>Single elimination tournaments for all divisions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Qualification System</h4>
                  <div className="space-y-3">
                    <div className="p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Division 1</span>
                        <Badge variant="outline">Top 4 teams</Badge>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        From 30 teams to 4-team playoff (13.3% qualification rate)
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Divisions 2-8</span>
                        <Badge variant="outline">Top 4 teams</Badge>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        From 8 teams to 4-team playoff (50% qualification rate)
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Tournament Format</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="text-sm font-medium">Semifinal Matches</div>
                      <div className="text-xs text-gray-600 mt-1">
                        #1 vs #4 seed • #2 vs #3 seed
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="text-sm font-medium">Championship Final</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Winners advance to determine champion and runner-up
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                <Button
                  onClick={() => generatePlayoffsMutation.mutate(selectedSeason)}
                  disabled={generatePlayoffsMutation.isPending}
                  className="w-full"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Generate Playoff Brackets for Season {selectedSeason}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Playoff Impact</CardTitle>
              <CardDescription>How playoff results affect promotion and relegation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 border border-green-200 bg-green-50 rounded">
                  <div className="flex items-center space-x-2 mb-2">
                    <Trophy className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-800">Champions</span>
                  </div>
                  <p className="text-sm text-green-700">
                    All division champions are automatically promoted to the next higher division
                  </p>
                </div>
                <div className="p-3 border border-yellow-200 bg-yellow-50 rounded">
                  <div className="flex items-center space-x-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Runner-ups</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Runner-ups receive enhanced rewards but remain in current division
                  </p>
                </div>
                <div className="p-3 border border-blue-200 bg-blue-50 rounded">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Regular Winners</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Teams that won matches during regular season receive participation rewards
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Promotion & Relegation System</CardTitle>
              <CardDescription>Maintaining competitive balance across all divisions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Promotion Rules</h4>
                  <div className="space-y-3">
                    <div className="p-3 border border-green-200 bg-green-50 rounded">
                      <div className="flex items-center space-x-2 mb-2">
                        <ArrowUp className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-800">Champions Only</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Only division champions are promoted to the next higher division
                      </p>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="text-sm font-medium">Division 8 → 7</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Multiple Copper League champions compete for Stone League spots
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="text-sm font-medium">Divisions 7-2</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Each champion advances one division level
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Relegation Rules</h4>
                  <div className="space-y-3">
                    <div className="p-3 border border-red-200 bg-red-50 rounded">
                      <div className="flex items-center space-x-2 mb-2">
                        <ArrowDown className="w-4 h-4 text-red-600" />
                        <span className="font-medium text-red-800">Bottom Teams</span>
                      </div>
                      <p className="text-sm text-red-700">
                        Worst performing teams face relegation to maintain league balance
                      </p>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="text-sm font-medium">Division 1</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Bottom {config?.data?.seasonConfig?.DIVISION_1_RELEGATION || 6} teams relegated
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="text-sm font-medium">Divisions 2-7</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Bottom {config?.data?.seasonConfig?.STANDARD_RELEGATION || 2} teams per division relegated
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                <Button
                  onClick={() => processPromotionRelegationMutation.mutate(selectedSeason)}
                  disabled={processPromotionRelegationMutation.isPending}
                  className="w-full"
                >
                  <ArrowUp className="w-4 h-4 mr-2" />
                  Process Promotion & Relegation
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>League Rebalancing</CardTitle>
              <CardDescription>Automatic redistribution to maintain optimal league sizes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 border border-blue-200 bg-blue-50 rounded">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Automatic Balancing</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    After promotion/relegation, leagues are automatically rebalanced to maintain target sizes
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium">Division 1 Target</div>
                    <div className="text-2xl font-bold">{config?.data?.seasonConfig?.DIVISION_1_TEAMS || 30}</div>
                    <div className="text-xs text-gray-600">teams maximum</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium">Divisions 2-8 Target</div>
                    <div className="text-2xl font-bold">{config?.data?.seasonConfig?.STANDARD_LEAGUE_TEAMS || 8}</div>
                    <div className="text-xs text-gray-600">teams per league</div>
                  </div>
                </div>

                <Button
                  onClick={() => rebalanceLeaguesMutation.mutate(selectedSeason)}
                  disabled={rebalanceLeaguesMutation.isPending}
                  className="w-full"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Rebalance All Leagues
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="administration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Season Management</CardTitle>
              <CardDescription>Administrative controls for seasonal flow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Season Rollover</span>
                  </div>
                  <p className="text-sm text-yellow-700 mb-3">
                    Execute complete season transition including promotion/relegation, league rebalancing, and new schedule generation.
                  </p>
                  <Button
                    onClick={() => executeSeasonRolloverMutation.mutate(selectedSeason)}
                    disabled={executeSeasonRolloverMutation.isPending}
                    variant="outline"
                    className="w-full border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Execute Season Rollover
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Season Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Current Season:</span>
                        <Badge variant="outline">{selectedSeason}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Current Day:</span>
                        <span className="font-medium">{currentPhase?.currentDay || 1}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Current Phase:</span>
                        <Badge variant="outline" className="flex items-center space-x-1">
                          {getPhaseIcon(currentPhase?.phase || 'Regular Season')}
                          <span>{currentPhase?.phase || 'Regular Season'}</span>
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">System Health</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Seasonal Flow Service</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Schedule Generation</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Playoff Management</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">League Balancing</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">System Configuration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 border rounded">
                        <div className="text-lg font-bold">{config?.data?.seasonConfig?.TOTAL_SEASON_DAYS || 17}</div>
                        <div className="text-xs text-gray-600">Total Days</div>
                      </div>
                      <div className="text-center p-3 border rounded">
                        <div className="text-lg font-bold">{config?.data?.seasonConfig?.REGULAR_SEASON_DAYS || 14}</div>
                        <div className="text-xs text-gray-600">Regular Days</div>
                      </div>
                      <div className="text-center p-3 border rounded">
                        <div className="text-lg font-bold">{config?.data?.seasonConfig?.PLAYOFF_QUALIFIERS || 4}</div>
                        <div className="text-xs text-gray-600">Playoff Teams</div>
                      </div>
                      <div className="text-center p-3 border rounded">
                        <div className="text-lg font-bold">8</div>
                        <div className="text-xs text-gray-600">Total Divisions</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}