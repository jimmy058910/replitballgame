import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  PlayCircle, BarChart3, Settings, Clock, TrendingUp, Users,
  RefreshCw, CheckCircle, AlertTriangle, Info
} from "lucide-react";

interface ProgressionConfig {
  systemName: string;
  description: string;
  configuration: {
    baseChance: string;
    activityWeights: {
      leagueGames: string;
      tournamentGames: string;
      exhibitionGames: string;
    };
    rollsPerActivity: string;
    potentialModifiers: Record<string, string>;
    ageModifiers: Record<string, string>;
    staffModifiers: {
      trainerEffect: string;
      headCoachAmplifier: string;
    };
    camaraderieModifier: string;
    injuryModifiers: Record<string, string>;
  };
}

interface ProgressionResult {
  totalPlayersProcessed: number;
  totalProgressions: number;
  progressionsByTeam?: Record<string, number>;
  errors?: string[];
}

interface ProgressionStatistics {
  totalProgressions: number;
  averageProgressionsPerDay: number;
  topProgressionDay: {
    date: string;
    progressions: number;
  };
  playerProgressionBreakdown: {
    age16to23: number;
    age24to30: number;
    age31plus: number;
  };
  attributeProgressionBreakdown: Record<string, number>;
  periodDays: number;
  description: string;
}

export default function DailyProgressionTest() {
  const { toast } = useToast();
  const [lastResult, setLastResult] = useState<ProgressionResult | null>(null);

  // Query for progression configuration
  const { data: config, isLoading: configLoading } = useQuery<{ data: ProgressionConfig }>({
    queryKey: ["/api/daily-progression/config"],
  });

  // Query for progression statistics
  const { data: statistics, isLoading: statsLoading } = useQuery<{ data: ProgressionStatistics }>({
    queryKey: ["/api/daily-progression/statistics"],
  });

  // Mutation for executing daily progression
  const executeProgressionMutation = useMutation({
    mutationFn: () => apiRequest("/api/daily-progression/execute", "POST"),
    onSuccess: (data: any) => {
      if (data.success && data.data) {
        setLastResult(data.data);
        toast({
          title: "Daily Progression Complete",
          description: data.message || "Daily progression completed successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/daily-progression/statistics"] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Daily Progression Failed",
        description: error.message || "Failed to execute daily progression",
        variant: "destructive",
      });
    },
  });

  // Mutation for testing full day advancement
  const testFullDayMutation = useMutation({
    mutationFn: () => apiRequest("/api/daily-progression/test-full-day-advancement", "POST"),
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Full Day Advancement Complete",
          description: data.message || "Full day advancement completed successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/daily-progression/statistics"] });
        queryClient.invalidateQueries({ queryKey: ["/api/season/current-week"] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Full Day Advancement Failed",
        description: error.message || "Failed to execute full day advancement",
        variant: "destructive",
      });
    },
  });

  const isLoading = configLoading || statsLoading;
  const isExecuting = executeProgressionMutation.isPending || testFullDayMutation.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Daily Progression Testing System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Button
              onClick={() => executeProgressionMutation.mutate()}
              disabled={isExecuting}
              className="flex items-center gap-2"
            >
              {executeProgressionMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              Execute Daily Progression
            </Button>
            <Button
              onClick={() => testFullDayMutation.mutate()}
              disabled={isExecuting}
              variant="outline"
              className="flex items-center gap-2"
            >
              {testFullDayMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              Test Full Day Advancement
            </Button>
          </div>

          {lastResult && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-200">Last Execution Result</h4>
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    Processed {lastResult.totalPlayersProcessed} players with {lastResult.totalProgressions} total progressions
                  </p>
                  {lastResult.errors && lastResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-red-600 dark:text-red-400">Errors encountered:</p>
                      <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-400">
                        {lastResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="config" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="config">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="h-4 w-4" />
                    System Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                    </div>
                  ) : config?.data ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold">{config.data.systemName}</h4>
                        <p className="text-sm text-muted-foreground">{config.data.description}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium mb-2">Base Configuration</h5>
                          <div className="text-sm space-y-1">
                            <div>Base Chance: <Badge variant="outline">{config.data.configuration.baseChance}</Badge></div>
                            <div>Rolls per Activity: <Badge variant="outline">{config.data.configuration.rollsPerActivity}</Badge></div>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium mb-2">Activity Weights</h5>
                          <div className="text-sm space-y-1">
                            {Object.entries(config.data.configuration.activityWeights).map(([key, value]) => (
                              <div key={key}>
                                {key}: <Badge variant="outline">{value}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium mb-2">Age Modifiers</h5>
                          <div className="text-sm space-y-1">
                            {Object.entries(config.data.configuration.ageModifiers).map(([key, value]) => (
                              <div key={key}>
                                {key}: <Badge variant="outline">{value}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium mb-2">Potential Modifiers</h5>
                          <div className="text-sm space-y-1">
                            {Object.entries(config.data.configuration.potentialModifiers).map(([key, value]) => (
                              <div key={key}>
                                {key}: <Badge variant="outline">{value}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="h-4 w-4" />
                      Unable to load configuration
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statistics">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-4 w-4" />
                    Progression Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                    </div>
                  ) : statistics?.data ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {statistics.data.totalProgressions}
                          </div>
                          <div className="text-sm text-blue-600 dark:text-blue-400">Total Progressions</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {statistics.data.averageProgressionsPerDay.toFixed(1)}
                          </div>
                          <div className="text-sm text-green-600 dark:text-green-400">Avg/Day</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {statistics.data.topProgressionDay.progressions}
                          </div>
                          <div className="text-sm text-purple-600 dark:text-purple-400">Best Day</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {statistics.data.periodDays}
                          </div>
                          <div className="text-sm text-orange-600 dark:text-orange-400">Days Period</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium mb-2 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Age Group Breakdown
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>16-23 (Youth):</span>
                              <Badge>{statistics.data.playerProgressionBreakdown.age16to23}</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>24-30 (Prime):</span>
                              <Badge>{statistics.data.playerProgressionBreakdown.age24to30}</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>31+ (Veteran):</span>
                              <Badge>{statistics.data.playerProgressionBreakdown.age31plus}</Badge>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium mb-2 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Attribute Progression
                          </h5>
                          <div className="space-y-2 text-sm max-h-32 overflow-y-auto">
                            {Object.entries(statistics.data.attributeProgressionBreakdown).map(([attribute, count]) => (
                              <div key={attribute} className="flex justify-between">
                                <span className="capitalize">{attribute}:</span>
                                <Badge variant="outline">{count}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                        <div className="text-sm text-muted-foreground">
                          {statistics.data.description}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="h-4 w-4" />
                      Unable to load statistics
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}