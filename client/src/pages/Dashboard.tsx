import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PlayerCard from "@/components/PlayerCard";

import LeagueStandings from "@/components/LeagueStandings";
import NotificationCenter from "@/components/NotificationCenter";
import { apiRequest } from "@/lib/queryClient";
import { Bell, Shield } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();



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

  const { data: players, isLoading: playersLoading, error: playersError } = useQuery({
    queryKey: [`/api/teams/${team?.id}/players`],
    enabled: !!team?.id,
    retry: 1,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Debug logging can be removed in production
  // console.log('Dashboard Debug:', { teamId: team?.id, teamName: team?.name, playersCount: players?.length });

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
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-orbitron text-2xl font-bold">Team Dashboard</h2>

          </div>
          
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
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {liveMatches[0]?.homeTeamName || "Team 1"} vs {liveMatches[0]?.awayTeamName || "Team 2"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {liveMatches[0]?.status === "live" ? "Live Match" : liveMatches[0]?.status}
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
                  <p className="text-red-400">Error loading players: {playersError.message}</p>
                </div>
              ) : !players || players.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No players found</p>
                  <p className="text-sm text-gray-500">Visit the Team page to add players</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {players.map((player: any) => {
                    // Get player's top 3 stats
                    const allStats = [
                      { name: 'SPD', value: player.speed || 20, color: 'text-blue-400' },
                      { name: 'PWR', value: player.power || 20, color: 'text-red-400' },
                      { name: 'AGI', value: player.agility || 20, color: 'text-green-400' },
                      { name: 'THR', value: player.throwing || 20, color: 'text-purple-400' },
                      { name: 'CAT', value: player.catching || 20, color: 'text-yellow-400' },
                      { name: 'KIC', value: player.kicking || 20, color: 'text-orange-400' },
                      { name: 'STA', value: player.stamina || 20, color: 'text-cyan-400' },
                      { name: 'LED', value: player.leadership || 20, color: 'text-pink-400' }
                    ];
                    
                    const topStats = allStats.sort((a, b) => b.value - a.value).slice(0, 3);
                    // Calculate total power like in PlayerCard component
                    const powerValue = (player.speed || 20) + (player.power || 20) + (player.throwing || 20) + (player.catching || 20) + (player.kicking || 20);
                    
                    // Display name like in PlayerCard component
                    const displayName = player.firstName && player.lastName 
                      ? `${player.firstName} ${player.lastName}` 
                      : player.name || 'Unknown Player';
                    
                    return (
                      <div key={player.id} className="bg-gray-700 rounded-lg p-5 border border-gray-600 hover:border-gray-500 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0 text-center">
                            <div className="text-xs text-red-400 font-medium mb-1">Power</div>
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl ${
                              powerValue >= 120 ? 'bg-red-600' : 
                              powerValue <= 80 ? 'bg-gray-600' : 
                              'bg-red-500'
                            }`}>
                              {powerValue}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-base font-semibold text-white mb-1" title={displayName}>
                              {displayName}
                            </div>
                            <div className="text-sm text-gray-400 capitalize mb-2">{player.race} {player.role}</div>
                            <div className="grid grid-cols-3 gap-3">
                              {topStats.map((stat, index) => (
                                <div key={index} className="text-center">
                                  <div className={`text-xs ${stat.color} font-medium`}>{stat.name}</div>
                                  <div className="text-sm text-white font-semibold">{stat.value}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="border-b border-gray-700">
              <CardTitle className="font-orbitron text-xl">Division {team.division} - {team.division === 8 ? "Rookie League" : "Advanced League"}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <LeagueStandings division={team.division} />
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
