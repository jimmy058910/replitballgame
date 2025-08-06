import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, TrendingDown, Calendar, AlertTriangle, Info } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { StatHelpIcon } from './help/StatHelpIcon';

interface AgingStats {
  averageAge: number;
  totalPlayers: number;
  retirementCandidates: number;
  declineCandidates: number;
  ageDistribution: Record<string, number>;
}

interface AgingResult {
  playerId: string;
  playerName: string;
  action: 'retired' | 'declined' | 'aged' | 'none';
  details?: string;
}

interface RetirementCalculation {
  baseAgeChance: number;
  injuryModifier: number;
  playingTimeModifier: number;
  totalChance: number;
  willRetire: boolean;
}

interface DeclineCalculation {
  declineChance: number;
  willDecline: boolean;
  affectedStat?: string;
  statValue?: number;
}

interface PlayerAgingData {
  player: {
    id: string;
    name: string;
    age: number;
    careerInjuries: number;
    gamesPlayedLastSeason: number;
  };
  retirement: RetirementCalculation;
  decline: DeclineCalculation;
}

export default function AgingManager() {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const queryClient = useQueryClient();

  // Get aging statistics
  const { data: agingStats, isLoading: statsLoading } = useQuery<AgingStats>({
    queryKey: ['/api/aging/statistics'],
    queryFn: () => apiRequest<AgingStats>('/api/aging/statistics'),
  });

  // Process end-of-season aging
  const processSeasonAging = useMutation({
    mutationFn: () => apiRequest<{ success: boolean; message: string }>('/api/aging/process-season-aging', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/aging/statistics'] });
    },
  });

  // Get player aging details
  const { data: playerAging, isLoading: playerLoading, error: playerError } = useQuery<PlayerAgingData>({
    queryKey: ['/api/aging/player', selectedPlayerId, 'retirement-chance'],
    queryFn: () => apiRequest<PlayerAgingData>(`/api/aging/player/${selectedPlayerId}/retirement-chance`),
    enabled: !!selectedPlayerId,
  });

  // Simulate player aging
  const simulatePlayerAging = useMutation({
    mutationFn: (playerId: string) => apiRequest<{ success: boolean; message: string }>(`/api/aging/player/${playerId}/simulate-aging`, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/aging/statistics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/aging/player', selectedPlayerId, 'retirement-chance'] });
    },
  });

  const getAgeRangeColor = (ageRange: string) => {
    switch (ageRange) {
      case '16-20': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case '21-25': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case '26-30': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case '31-35': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case '36+': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'retired': return 'destructive';
      case 'declined': return 'secondary';
      case 'aged': return 'default';
      default: return 'outline';
    }
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading aging statistics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Player Aging System</h2>
          <p className="text-muted-foreground">Manage player aging, retirement, and stat progression</p>
        </div>
        <StatHelpIcon 
          stat="aging"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">Player Analysis</TabsTrigger>
          <TabsTrigger value="processing">Season Processing</TabsTrigger>
          <TabsTrigger value="statistics">Age Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Age</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agingStats?.averageAge?.toFixed(1) || '0.0'}</div>
                <p className="text-xs text-muted-foreground">League average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Players</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agingStats?.totalPlayers || 0}</div>
                <p className="text-xs text-muted-foreground">Active players</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Retirement Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agingStats?.retirementCandidates || 0}</div>
                <p className="text-xs text-muted-foreground">Players 35+</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Decline Risk</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agingStats?.declineCandidates || 0}</div>
                <p className="text-xs text-muted-foreground">Players 31+</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Aging System Overview
              </CardTitle>
              <CardDescription>
                How the player aging mechanics work in Realm Rivalry
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Age Generation</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Tryout candidates: Ages 16-20 (peak potential)</li>
                    <li>• Free agents: Ages 18-35 (varied experience)</li>
                    <li>• Initial roster: Ages 18-35 (balanced teams)</li>
                  </ul>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold mb-2">Retirement System (Ages 35+)</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Base chance: 2% per age year above 35</li>
                    <li>• Career injuries add 3% per injury</li>
                    <li>• Low playing time adds 5% penalty</li>
                    <li>• Automatic retirement at age 44</li>
                  </ul>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold mb-2">Stat Decline (Ages 31+)</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Chance increases: 31-35 (5-25%), 36+ (30%)</li>
                    <li>• Affects Speed, Agility, or Power primarily</li>
                    <li>• Decline: 1-3 stat points per occurrence</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Individual Player Analysis</CardTitle>
              <CardDescription>
                Analyze retirement chances and aging projections for specific players
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter player ID (UUID format)"
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <Button 
                  onClick={() => simulatePlayerAging.mutate(selectedPlayerId)}
                  disabled={!selectedPlayerId || simulatePlayerAging.isPending}
                >
                  {simulatePlayerAging.isPending ? 'Simulating...' : 'Simulate Aging'}
                </Button>
              </div>

              {playerError && (
                <div className="p-4 border border-red-200 rounded-md bg-red-50 dark:bg-red-900/20">
                  <p className="text-red-700 dark:text-red-300">
                    {playerError instanceof Error ? playerError.message : 'Error loading player data'}
                  </p>
                </div>
              )}

              {playerLoading && (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                  Loading player analysis...
                </div>
              )}

              {playerAging && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 border rounded-md">
                    <div>
                      <h3 className="font-semibold">{playerAging.player.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Age {playerAging.player.age} • {playerAging.player.careerInjuries} injuries • 
                        {playerAging.player.gamesPlayedLastSeason} games last season
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Retirement Analysis</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span>Base Age Chance:</span>
                          <span>{(playerAging.retirement.baseAgeChance * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Injury Modifier:</span>
                          <span>{(playerAging.retirement.injuryModifier * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Playing Time Modifier:</span>
                          <span>{(playerAging.retirement.playingTimeModifier * 100).toFixed(1)}%</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total Chance:</span>
                          <Badge variant={playerAging.retirement.willRetire ? "destructive" : "secondary"}>
                            {(playerAging.retirement.totalChance * 100).toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="text-center">
                          <Badge variant={playerAging.retirement.willRetire ? "destructive" : "default"}>
                            {playerAging.retirement.willRetire ? "Will Retire" : "Will Continue"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Decline Analysis</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span>Decline Chance:</span>
                          <span>{(playerAging.decline.declineChance * 100).toFixed(1)}%</span>
                        </div>
                        {playerAging.decline.willDecline && (
                          <>
                            <div className="flex justify-between">
                              <span>Affected Stat:</span>
                              <span className="capitalize">{playerAging.decline.affectedStat}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>New Value:</span>
                              <span>{playerAging.decline.statValue}</span>
                            </div>
                          </>
                        )}
                        <div className="text-center">
                          <Badge variant={playerAging.decline.willDecline ? "secondary" : "default"}>
                            {playerAging.decline.willDecline ? "Will Decline" : "No Decline"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                End-of-Season Processing
              </CardTitle>
              <CardDescription>
                Process aging for all players at the end of the season
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-amber-200 rounded-md bg-amber-50 dark:bg-amber-900/20">
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  ⚠️ This will process aging for ALL players in the league. This action cannot be undone.
                </p>
              </div>

              <Button
                onClick={() => processSeasonAging.mutate()}
                disabled={processSeasonAging.isPending}
                size="lg"
                className="w-full"
              >
                {processSeasonAging.isPending ? 'Processing...' : 'Process End-of-Season Aging'}
              </Button>

              {processSeasonAging.data && processSeasonAging.data.success && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Processing Results</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 border rounded-md">
                      <div className="text-2xl font-bold">{(processSeasonAging.data as any).totalProcessed || 0}</div>
                      <div className="text-sm text-muted-foreground">Total Processed</div>
                    </div>
                    <div className="text-center p-3 border rounded-md">
                      <div className="text-2xl font-bold text-red-600">{(processSeasonAging.data as any).retired || 0}</div>
                      <div className="text-sm text-muted-foreground">Retired</div>
                    </div>
                    <div className="text-center p-3 border rounded-md">
                      <div className="text-2xl font-bold text-yellow-600">{(processSeasonAging.data as any).declined || 0}</div>
                      <div className="text-sm text-muted-foreground">Declined</div>
                    </div>
                    <div className="text-center p-3 border rounded-md">
                      <div className="text-2xl font-bold text-green-600">{(processSeasonAging.data as any).aged || 0}</div>
                      <div className="text-sm text-muted-foreground">Aged Normally</div>
                    </div>
                  </div>

                  {(processSeasonAging.data as any).retiredPlayers?.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Retired Players</h4>
                      <div className="space-y-2">
                        {(processSeasonAging.data as any).retiredPlayers.map((player: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 border rounded">
                            <span>{player.name}</span>
                            <Badge variant="destructive">Retired</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(processSeasonAging.data as any).declinedPlayers?.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Players with Stat Decline</h4>
                      <div className="space-y-2">
                        {(processSeasonAging.data as any).declinedPlayers.map((player: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 border rounded">
                            <span>{player.name}</span>
                            <Badge variant="secondary">Declined</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Age Distribution</CardTitle>
              <CardDescription>
                League-wide age distribution and demographic analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {agingStats?.ageDistribution && (
                <div className="space-y-4">
                  {Object.entries(agingStats.ageDistribution).map(([ageRange, count]) => (
                    <div key={ageRange} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getAgeRangeColor(ageRange)}>{ageRange}</Badge>
                        <span className="text-sm">{count} players</span>
                      </div>
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${((count / (agingStats.totalPlayers || 1)) * 100)}%`
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {((count / (agingStats.totalPlayers || 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}