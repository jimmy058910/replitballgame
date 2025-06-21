import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PlayerCard from "@/components/PlayerCard";
import MatchViewer from "@/components/MatchViewer";
import LeagueStandings from "@/components/LeagueStandings";
import NotificationCenter from "@/components/NotificationCenter";
import { apiRequest } from "@/lib/queryClient";
import { Bell } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  const demoNotificationsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/demo/notifications", "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Demo Notifications Created",
        description: "Check the notification center to see the generic messaging system!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to create demo notifications",
        variant: "destructive",
      });
    },
  });

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

  const { data: team, isLoading: teamLoading, error: teamError } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ["/api/teams", team?.id, "players"].filter(Boolean),
    enabled: !!team?.id,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: liveMatches } = useQuery({
    queryKey: ["/api/matches/live"],
    refetchInterval: 5000, // Refresh every 5 seconds for live matches
  });

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
          <h2 className="font-orbitron text-2xl font-bold mb-6">Team Dashboard</h2>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Division Rank</p>
                    <p className="text-2xl font-bold text-gold-400">
                      {team.division === 8 ? "New" : `Div ${team.division}`}
                    </p>
                    <p className="text-xs text-gray-400">{team.wins}W - {team.losses}L - {team.draws}D</p>
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
                      {team.wins + team.losses + team.draws > 0 
                        ? Math.round((team.wins / (team.wins + team.losses + team.draws)) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-gray-400">{team.points} points</p>
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
                    <p className="text-2xl font-bold text-primary-400">{team.teamPower}</p>
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
                    <p className="text-2xl font-bold text-gold-400">{team.credits?.toLocaleString()}</p>
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
        {liveMatches && liveMatches.length > 0 && (
          <div className="mb-8">
            <MatchViewer match={liveMatches[0]} />
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
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {players?.slice(0, 4).map((player: any) => (
                    <PlayerCard key={player.id} player={player} compact />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <LeagueStandings division={team.division} />

          {/* Notification Demo Section */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification System Demo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-gray-300 mb-2">Test the generic notification system with hidden game results</p>
                  <p className="text-sm text-gray-400">Creates sample notifications for match results, tournaments, auctions, and injuries</p>
                </div>
                <Button
                  onClick={() => demoNotificationsMutation.mutate()}
                  disabled={demoNotificationsMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {demoNotificationsMutation.isPending ? "Creating..." : "Create Demo Notifications"}
                </Button>
              </div>
              <NotificationCenter />
            </CardContent>
          </Card>
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
