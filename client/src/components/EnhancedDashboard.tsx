import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Trophy, 
  TrendingUp, 
  Calendar, 
  Bell, 
  DollarSign,
  Target,
  Activity,
  Star,
  Clock,
  Shield,
  Zap
} from "lucide-react";
import PlayerCard from "./PlayerCard";
// Define types for dashboard data
interface Player {
  id: string;
  firstName: string;
  lastName: string;
  race: string;
  role: string;
  age: number;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  isOnTaxi?: boolean;
}

interface Team {
  id: string;
  name: string;
  division?: number;
  players?: Player[];
  finances?: { credits?: number };
  season?: number;
}

interface DashboardMatch {
  id: string;
  homeTeam?: { name?: string };
  awayTeam?: { name?: string };
  status?: string;
}


export default function EnhancedDashboard() {
  const { data: team } = useQuery({ queryKey: ["/api/teams/my"] });
  // Use finances data from team query instead of separate API call
  const finances = team?.finances;
  const { data: liveMatches } = useQuery({ queryKey: ["/api/matches/live"] });
  const { data: notifications } = useQuery({ queryKey: ["/api/notifications"] });
  const { data: leagues } = useQuery({ queryKey: ["/api/leagues"] });

  // @ts-expect-error TS2339
  const unreadNotifications = notifications?.filter((n: any) => !n.isRead)?.length || 0;
  // @ts-expect-error TS2339
  const teamPower = team?.players?.reduce((sum: number, p: Player) =>
    sum + (p.speed + p.power + p.throwing + p.catching + p.kicking), 0) || 0;
  
  // @ts-expect-error TS2339
  const averagePower = team?.players?.length ? Math.round(teamPower / team.players.length) : 0;
  
  // @ts-expect-error TS2339
  const topPerformers: Player[] = team?.players
    ?.slice() // Create a copy before sorting to avoid mutating the original array from the query cache
    ?.sort((a: Player, b: Player) =>
      (b.speed + b.power + b.throwing + b.catching + b.kicking) - 
      (a.speed + a.power + a.throwing + a.catching + a.kicking)
    )
    ?.slice(0, 3) || [];

  // @ts-expect-error TS2339
  const injuredPlayers: Player[] = team?.players?.filter((p: Player) => (p as any).isInjured) || []; // Assuming isInjured is a custom prop for now
  // @ts-expect-error TS2339
  const taxiSquadPlayers: Player[] = team?.players?.filter((p: Player) => p.isOnTaxi) || [];


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {/*
                 // @ts-expect-error TS2339 */}
                {team?.name || "Your Team"}
              </h1>
              <p className="text-blue-100">
                {/*
                 // @ts-expect-error TS2339 */}
                Division {team?.division || "N/A"} • Season {team?.season || 1}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{teamPower}</div>
              <div className="text-blue-200">Total Power</div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  {/*
                   // @ts-expect-error TS2339 */}
                  <div className="text-2xl font-bold">{team?.players?.length || 0}</div>
                  <div className="text-sm text-gray-500">Players</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-8 h-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {/*
                     // @ts-expect-error TS2339 */}
                    {finances?.credits ? parseInt(String(finances.credits)).toLocaleString() : '0'}
                  </div>
                  <div className="text-sm text-gray-500">Credits</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="w-8 h-8 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{averagePower}</div>
                  <div className="text-sm text-gray-500">Avg Power</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Bell className="w-8 h-8 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">{unreadNotifications}</div>
                  <div className="text-sm text-gray-500">Alerts</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Matches */}
            {(liveMatches as any)?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-red-500" />
                    Live Matches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/*
                     // @ts-expect-error TS2339 */}
                    {liveMatches?.slice(0, 3).map((match: DashboardMatch) => ( // Added optional chaining for liveMatches
                      <div key={match.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <div>
                              <div className="font-medium">
                                {match.homeTeam?.name ?? 'Team A'} vs {match.awayTeam?.name ?? 'Team B'} {/* Added nullish coalescing */}
                              </div>
                              <div className="text-sm text-gray-500">
                                {match.status}
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Watch Live
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {topPerformers.map((player: Player) => ( // Used Player type
                    <PlayerCard key={player.id} player={player} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Team Health Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  Team Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Healthy Players</span>
                      <span className="text-sm font-medium">
                        {/*
                         // @ts-expect-error TS2339 */}
                        {(team?.players?.length || 0) - injuredPlayers.length}/{team?.players?.length || 0}
                      </span>
                    </div>
                    <Progress 
                      // @ts-expect-error TS2339
                      value={((team?.players?.length || 0) - injuredPlayers.length) / (team?.players?.length || 1) * 100}
                      className="h-2"
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Active Squad</span>
                      <span className="text-sm font-medium">
                        {/*
                         // @ts-expect-error TS2339 */}
                        {(team?.players?.length || 0) - taxiSquadPlayers.length}/{team?.players?.length || 0}
                      </span>
                    </div>
                    <Progress 
                      // @ts-expect-error TS2339
                      value={((team?.players?.length || 0) - taxiSquadPlayers.length) / (team?.players?.length || 1) * 100}
                      className="h-2"
                    />
                  </div>
                </div>

                {injuredPlayers.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2 text-red-600">Injured Players</h4>
                    <div className="space-y-2">
                      {injuredPlayers?.slice(0, 3).map((player: Player) => ( // Used Player type
                        <div key={player.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                          <span className="text-sm">
                            {player.firstName} {player.lastName}
                          </span>
                          <Badge variant="destructive" className="text-xs">
                            Injured
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Recent Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-500" />
                  Recent Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/*
                   // @ts-expect-error TS2339 */}
                  {notifications?.slice(0, 5).map((notification: NotificationType) => (
                    <div key={notification.id} className="p-3 border rounded-lg">
                      <div className="flex items-start space-x-2">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          notification.isRead ? 'bg-gray-300' : 'bg-blue-500'
                        }`} />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{notification.title}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {notification.message}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {notification.createdAt?.toLocaleDateString() ?? 'Date unknown'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/*
                   // @ts-expect-error TS2339 */}
                  {(!notifications || notifications.length === 0) && (
                    <div className="text-center py-4 text-gray-500">
                      No notifications yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* League Standing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Division Standing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/*
                   // @ts-expect-error TS2339 */}
                  {leagues?.map((league: LeagueType, index: number) => (
                    <div key={league.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">{league.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button className="w-full" variant="outline">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Match
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Players
                  </Button>
                  <Button className="w-full" variant="outline">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                  <Button className="w-full" variant="outline">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Marketplace
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Taxi Squad Alert */}
            {taxiSquadPlayers?.length > 0 && ( // Added optional chaining
              <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <Clock className="w-5 h-5" />
                    Taxi Squad
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-orange-600 dark:text-orange-300 mb-3">
                    {taxiSquadPlayers.length} players waiting for next season activation
                  </p>
                  <div className="space-y-2">
                    {taxiSquadPlayers?.slice(0, 3).map((player: Player) => ( // Used Player type and optional chaining
                      <div key={player.id} className="text-sm">
                        {player.firstName} {player.lastName} ({player.race})
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}