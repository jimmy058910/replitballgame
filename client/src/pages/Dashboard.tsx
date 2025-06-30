import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UnifiedPlayerCard from "@/components/UnifiedPlayerCard";
import LeagueStandings from "@/components/LeagueStandings";
import { apiRequest } from "@/lib/queryClient";
import { Bell, Shield, Calendar } from "lucide-react";
import type { Team, Player, TeamFinances, Match, Season } from "shared/schema";

// Define interfaces for data structures
interface ServerTime {
  currentTime: string;
}

interface LiveMatchData extends Match {
  homeTeamName?: string;
  awayTeamName?: string;
}

// Server Time Display Component
function ServerTimeDisplay({ serverTime }: { serverTime: ServerTime | undefined }) {
  const formatServerTime = () => {
    if (!serverTime?.currentTime) return "Loading...";

    const time = new Date(serverTime.currentTime);
    const easternTime = time.toLocaleString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });

    return easternTime;
  };

  const getTimeUntilNextDay = () => {
    if (!serverTime?.currentTime) return "";

    const now = new Date(serverTime.currentTime);
    const nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(3, 0, 0, 0); // 3 AM EST

    const timeUntil = nextDay.getTime() - now.getTime();
    const hours = Math.floor(timeUntil / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `Next day: ${hours}h ${minutes}m`;
    } else {
      return `Next day: ${minutes}m`;
    }
  };

  return (
    <Card className="bg-blue-900 border-blue-700">
      <CardContent className="p-2">
        <div className="text-center">
          <div className="text-blue-200 font-medium text-sm">EST: {formatServerTime()}</div>
          <div className="text-blue-300 text-xs">{getTimeUntilNextDay()}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const teamQuery = useQuery({
    queryKey: ["myTeam"],
    queryFn: (): Promise<Team> => apiRequest("/api/teams/my"), // Removed <Team> from apiRequest
  });
  const team = teamQuery.data as Team | undefined;
  const teamLoading = teamQuery.isLoading;

  const financesQuery = useQuery({
    queryKey: ["myTeamFinances"],
    queryFn: (): Promise<TeamFinances> => apiRequest("/api/teams/my/finances"), // Removed <TeamFinances>
    enabled: !!team,
  });
  const finances = financesQuery.data as TeamFinances | undefined;

  const playersQuery = useQuery({
    queryKey: ["teamPlayers", team?.id],
    queryFn: (): Promise<Player[]> => apiRequest(`/api/teams/${team!.id}/players`), // Removed <Player[]>
    enabled: !!team?.id,
    retry: 1,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });
  const players = playersQuery.data as Player[] | undefined;
  const playersLoading = playersQuery.isLoading;
  const playersError = playersQuery.error;

  const liveMatchesQuery = useQuery({
    queryKey: ["liveMatches"],
    queryFn: (): Promise<LiveMatchData[]> => apiRequest("/api/matches/live"), // Removed <LiveMatchData[]>
    refetchInterval: 5000, // Refresh every 5 seconds for live matches
  });
  const liveMatches = liveMatchesQuery.data as LiveMatchData[] | undefined;

  const seasonalCycleQuery = useQuery({
    queryKey: ["currentSeasonCycle"],
    queryFn: (): Promise<Season> => apiRequest("/api/season/current-cycle"), // Removed <Season>
    refetchInterval: 60000, // Refresh every minute
  });
  const seasonalCycle = seasonalCycleQuery.data as Season | undefined;

  const serverTimeQuery = useQuery({
    queryKey: ["serverTime"],
    queryFn: (): Promise<ServerTime> => apiRequest("/api/server/time"), // Removed <ServerTime>
    refetchInterval: 30000, // Update every 30 seconds
  });
  const serverTime = serverTimeQuery.data as ServerTime | undefined;


  if (isLoading || teamLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="font-orbitron text-3xl font-bold mb-6">Welcome to Realm Rivalry!</h1>
          <p className="text-gray-300 mb-8">Create your team to start your journey to glory.</p>
          <TeamCreationForm />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Overview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-orbitron text-2xl font-bold">Team Dashboard</h2>
            <ServerTimeDisplay serverTime={serverTime} />
          </div>

          {/* Seasonal Cycle Display */}
          {seasonalCycle && (
            <Card className="bg-gradient-to-r from-purple-900 to-blue-900 border-purple-700 mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-600 bg-opacity-30 p-3 rounded-full">
                      <Calendar className="h-8 w-8 text-purple-200" />
                    </div>
                    <div>
                      {/* Assuming SeasonalCycle (now Season) has 'year' and 'name' or similar */}
                      <div className="text-sm text-purple-200 mb-1">Season {seasonalCycle.year} - {seasonalCycle.name}</div>
                      {/* TODO: Update Season type if description/details/phase/currentDay etc. are needed directly */}
                      {/* For now, using placeholder or removing to avoid errors if not in Season type */}
                      <h2 className="text-2xl font-bold text-white mb-1">{ (seasonalCycle as any).description || "Current Phase"}</h2>
                      <p className="text-purple-100 text-sm">{ (seasonalCycle as any).details || "More info soon..."}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white mb-1">Day {(seasonalCycle as any).currentDay ?? 'N/A'}/17</div>
                    <Badge
                      variant={(seasonalCycle as any).phase === "Regular Season" ? "default" :
                              (seasonalCycle as any).phase === "Playoffs" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {(seasonalCycle as any).phase || "Upcoming"}
                    </Badge>
                    {(seasonalCycle as any).daysUntilPlayoffs > 0 && (
                      <div className="text-xs text-purple-200 mt-1">
                        {(seasonalCycle as any).daysUntilPlayoffs} days to playoffs
                      </div>
                    )}
                    {(seasonalCycle as any).daysUntilNewSeason > 0 && (seasonalCycle as any).phase === "Off-Season" && (
                      <div className="text-xs text-purple-200 mt-1">
                        {(seasonalCycle as any).daysUntilNewSeason} days to new season
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Division Rank</p>
                    <p className="text-2xl font-bold text-gold-400">
                      {team.division === 8 ? "New" : `Div ${team.division ?? 'N/A'}`}
                    </p>
                    <p className="text-xs text-gray-400">{team.wins ?? 0}W - {team.losses ?? 0}L - {team.draws ?? 0}D</p>
                  </div>
                  <div className="bg-gold-400 bg-opacity-20 p-3 rounded-lg">
                    <i className="fas fa-trophy text-gold-400 text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Win Rate</p>
                    <p className="text-2xl font-bold text-green-400">
                      {(team.wins ?? 0) + (team.losses ?? 0) + (team.draws ?? 0) > 0
                        ? Math.round(((team.wins ?? 0) / ((team.wins ?? 0) + (team.losses ?? 0) + (team.draws ?? 0))) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-gray-400">{team.points ?? 0} points</p>
                  </div>
                  <div className="bg-green-400 bg-opacity-20 p-3 rounded-lg">
                    <i className="fas fa-chart-line text-green-400 text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Team Power</p>
                    <p className="text-2xl font-bold text-primary-400">{team.teamPower ?? 0}</p>
                    <p className="text-xs text-green-400">Building strength</p>
                  </div>
                  <div className="bg-primary-400 bg-opacity-20 p-3 rounded-lg">
                    <i className="fas fa-bolt text-primary-400 text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Credits</p>
                    <p className="text-2xl font-bold text-gold-400">{(finances?.credits ?? team.credits ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Available funds</p>
                  </div>
                  <div className="bg-gold-400 bg-opacity-20 p-3 rounded-lg">
                    <i className="fas fa-coins text-gold-400 text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Live Match Section */}
        {liveMatches && liveMatches.length > 0 && liveMatches[0] &&  (
          <div className="mb-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {liveMatches[0].homeTeamName || "Team 1"} vs {liveMatches[0].awayTeamName || "Team 2"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {liveMatches[0].status === "live" ? "Live Match" : liveMatches[0].status}
                    </div>
                  </div>
                  <Badge className="bg-green-500 text-white">
                    Text Simulation Available
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Team Roster Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="border-b border-gray-700">
              <div className="flex items-center justify-between">
                <CardTitle className="font-orbitron text-xl">My Team - {team.name}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/team'}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {playersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : playersError ? (
                <div className="text-center py-8">
                  <p className="text-red-400">Error loading players: {(playersError as Error).message}</p>
                </div>
              ) : !players || players.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No players found</p>
                  <p className="text-sm text-gray-500">Visit the Team page to add players</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {players.map((player: Player) => (
                    <UnifiedPlayerCard
                      key={player.id}
                      player={player}
                      variant="dashboard"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="border-b border-gray-700">
              <CardTitle className="font-orbitron text-xl">Division {team?.division ?? 8} - {(team?.division ?? 8) === 8 ? "Rookie League" : "Advanced League"}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <LeagueStandings division={team?.division ?? 8} />
            </CardContent>
          </Card>

          {/* SuperUser Access */}
          {team?.name === "Macomb Cougars" && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-400" />
                  SuperUser Panel
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <p className="text-gray-300 mb-2">Access administrative controls for testing and game management</p>
                  <Button 
                    onClick={() => window.location.href = '/superuser'}
                    variant="outline" 
                    className="w-full text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                  >
                    Open SuperUser Panel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamCreationForm() {
  const { toast } = useToast();

  const handleCreateTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error('Failed to create team');
      }

      toast({
        title: "Team Created!",
        description: "Your team has been created with 10 starting players.",
      });

      // Refresh the page to show the new team
      window.location.reload();
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: "Failed to create team. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700 max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="font-orbitron">Create Your Team</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateTeam} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Team Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              maxLength={50}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter your team name"
            />
          </div>
          <Button type="submit" className="w-full bg-primary-600 hover:bg-primary-700">
            Create Team
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
