import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target, 
  Award, 
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  AreaChart as AreaChartIcon
} from "lucide-react";

interface TeamPerformanceData {
  teamName: string;
  wins: number;
  losses: number;
  draws: number;
  power: number;
  camaraderie: number;
  trend: 'up' | 'down' | 'stable';
}

interface PlayerDistributionData {
  race: string;
  count: number;
  averagePower: number;
  color: string;
}

interface SeasonProgressData {
  day: number;
  wins: number;
  losses: number;
  teamPower: number;
  camaraderie: number;
}

interface DivisionStandingsData {
  position: number;
  teamName: string;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  goalDifference: number;
}

export default function DataVisualizationComponents() {
  const { isAuthenticated } = useAuth();

  const { data: performanceData } = useQuery<TeamPerformanceData>({
    queryKey: ['/api/data-viz/team-performance'],
    queryFn: () => apiRequest('/api/data-viz/team-performance'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  const { data: playerDistribution } = useQuery<PlayerDistributionData[]>({
    queryKey: ['/api/data-viz/player-distribution'],
    queryFn: () => apiRequest('/api/data-viz/player-distribution'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  const { data: seasonProgress } = useQuery<SeasonProgressData[]>({
    queryKey: ['/api/data-viz/season-progress'],
    queryFn: () => apiRequest('/api/data-viz/season-progress'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  const { data: divisionStandings } = useQuery<DivisionStandingsData[]>({
    queryKey: ['/api/data-viz/division-standings'],
    queryFn: () => apiRequest('/api/data-viz/division-standings'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  if (!isAuthenticated) {
    return null;
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-400" />;
      case 'stable': return <Activity className="h-4 w-4 text-yellow-400" />;
    }
  };

  const COLORS = {
    Human: '#8B5CF6',
    Sylvan: '#10B981', 
    Gryll: '#F59E0B',
    Lumina: '#3B82F6',
    Umbra: '#6B7280'
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Team Performance Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {performanceData ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Win Rate</span>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">
                      {performanceData.wins + performanceData.losses + performanceData.draws > 0 
                        ? Math.round((performanceData.wins / (performanceData.wins + performanceData.losses + performanceData.draws)) * 100)
                        : 0}%
                    </span>
                    {getTrendIcon(performanceData.trend)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Power Rating</span>
                  <span className="font-semibold">{performanceData.power}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Team Chemistry</span>
                  <span className="font-semibold">{performanceData.camaraderie}</span>
                </div>
                <Progress 
                  value={(performanceData.power / 40) * 100} 
                  className="h-2 mt-2"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Record Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Season Record
            </CardTitle>
          </CardHeader>
          <CardContent>
            {performanceData ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-green-400">{performanceData.wins}</div>
                    <div className="text-xs text-gray-400">Wins</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-400">{performanceData.losses}</div>
                    <div className="text-xs text-gray-400">Losses</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-yellow-400">{performanceData.draws}</div>
                    <div className="text-xs text-gray-400">Draws</div>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className="w-full justify-center mt-2"
                >
                  {performanceData.wins}-{performanceData.losses}-{performanceData.draws}
                </Badge>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-16 bg-muted rounded animate-pulse"></div>
                <div className="h-6 bg-muted rounded animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Player Count */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Roster Composition
            </CardTitle>
          </CardHeader>
          <CardContent>
            {playerDistribution ? (
              <div className="space-y-2">
                <div className="text-lg font-bold">
                  {playerDistribution.reduce((sum, race) => sum + race.count, 0)} Players
                </div>
                <div className="space-y-1">
                  {playerDistribution.slice(0, 3).map((race) => (
                    <div key={race.race} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{race.race}</span>
                      <span className="font-medium">{race.count}</span>
                    </div>
                  ))}
                </div>
                <Progress 
                  value={(playerDistribution.reduce((sum, race) => sum + race.count, 0) / 15) * 100}
                  className="h-2 mt-2"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-6 bg-muted rounded animate-pulse"></div>
                <div className="h-16 bg-muted rounded animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Key Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {performanceData && playerDistribution ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Avg Power</span>
                  <span className="font-semibold">
                    {playerDistribution.length > 0 
                      ? Math.round(playerDistribution.reduce((sum, race) => sum + race.averagePower, 0) / playerDistribution.length)
                      : 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Games Played</span>
                  <span className="font-semibold">
                    {performanceData.wins + performanceData.losses + performanceData.draws}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Form</span>
                  <Badge variant="outline" className="text-xs">
                    {performanceData.trend === 'up' ? 'Rising' : 
                     performanceData.trend === 'down' ? 'Declining' : 'Stable'}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Season Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5" />
              Season Progress Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {seasonProgress && seasonProgress.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={seasonProgress}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="day" 
                      stroke="#9CA3AF"
                      fontSize={12}
                    />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="teamPower" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      name="Team Power"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="camaraderie" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      name="Team Chemistry"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <LineChartIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Loading season progress...</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Player Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Player Race Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {playerDistribution && playerDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={playerDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ race, count }) => `${race}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {playerDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.race as keyof typeof COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <PieChartIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Loading player distribution...</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Win/Loss Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Match Results by Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {seasonProgress && seasonProgress.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seasonProgress}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="day" 
                      stroke="#9CA3AF"
                      fontSize={12}
                    />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="wins" fill="#10B981" name="Wins" />
                    <Bar dataKey="losses" fill="#EF4444" name="Losses" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Loading match results...</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Division Standings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Division Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-y-auto">
              {divisionStandings && divisionStandings.length > 0 ? (
                <div className="space-y-2">
                  {divisionStandings.map((team, index) => (
                    <div 
                      key={team.teamName}
                      className={`flex items-center justify-between p-2 rounded ${
                        index < 4 ? 'bg-green-900/20 border border-green-600/30' : 
                        index >= divisionStandings.length - 4 ? 'bg-red-900/20 border border-red-600/30' : 
                        'bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">
                          {team.position}
                        </div>
                        <span className="font-medium">{team.teamName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-400">{team.wins}W-{team.losses}L-{team.draws}D</span>
                        <span className="font-bold">{team.points}pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Loading division standings...</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}