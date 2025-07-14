import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Calendar, Users, Coins, Gem, CheckCircle, AlertCircle, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';


interface TournamentCenterProps {
  teamId?: string;
}

interface TeamInfo {
  id: string;
  name: string;
  division: number;
  credits: number;
  gems: number;
}

interface Tournament {
  id: string;
  name: string;
  type: string;
  division: number;
  season: number;
  gameDay: number;
  entryFeeCredits: number;
  entryFeeGems: number;
  requiresEntryItem: boolean;
  maxTeams: number;
  status: string;
  prizes: any;
  registrationDeadline: string;
  tournamentStartTime: string;
}

interface TournamentEntry {
  id: string;
  tournamentId: string;
  placement: number;
  creditsWon: number;
  gemsWon: number;
  tournament: {
    name: string;
    type: string;
    gameDay: number;
  };
  entryTime: string;
}

const TournamentCenter: React.FC<TournamentCenterProps> = ({ teamId }) => {
  const { toast } = useToast();

  // Fetch team info
  const { data: teamInfo } = useQuery<TeamInfo>({
    queryKey: ["/api/teams/my"],
    enabled: !!teamId,
  });

  // Fetch current season info
  const { data: seasonInfo } = useQuery({
    queryKey: ["/api/season/current-cycle"],
  });

  // Fetch available tournaments
  const { data: availableTournaments, isLoading: tournamentsLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/new-tournaments/available"],
    enabled: !!teamId,
  });

  // Fetch team's tournament history
  const { data: tournamentHistory } = useQuery<TournamentEntry[]>({
    queryKey: ["/api/new-tournaments/team", teamId, "history"],
    queryFn: () => apiRequest(`/api/new-tournaments/team/${teamId}/history`),
    enabled: !!teamId,
  });

  // Fetch team's current tournament entries
  const { data: myTournaments } = useQuery({
    queryKey: ["/api/new-tournaments/team", teamId],
    queryFn: () => apiRequest(`/api/new-tournaments/team/${teamId}`),
    enabled: !!teamId,
  });

  // Check if user is already registered for daily tournament
  const { data: dailyTournamentStatus } = useQuery({
    queryKey: ["/api/tournament-status/active"],
    queryFn: () => apiRequest("/api/tournament-status/active"),
    enabled: !!teamId,
  });

  // Check if user is already registered for daily tournament
  const isRegisteredForDailyTournament = dailyTournamentStatus?.some((entry: any) => 
    entry.type === 'DAILY_DIVISIONAL'
  );

  // Tournament entry mutation
  const enterTournamentMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      return await apiRequest(`/api/new-tournaments/${tournamentId}/enter`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Successfully Entered!",
        description: "You have been entered into the tournament.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/new-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Entry Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Daily Tournament registration mutation
  const registerDailyTournamentMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/new-tournaments/daily-tournament/register`, "POST", { division: teamInfo?.division });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Successfully registered for Daily Divisional Tournament!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/new-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-status/active"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mid-Season Classic registration mutation
  const registerMidSeasonMutation = useMutation({
    mutationFn: async (paymentType: "credits" | "gems" | "both") => {
      return await apiRequest(`/api/new-tournaments/mid-season/register`, "POST", { division: teamInfo?.division, paymentType });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Successfully registered for Mid-Season Classic!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/new-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-status/active"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const getDivisionName = (division: number): string => {
    const names = ['', 'Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Copper', 'Stone', 'Copper'];
    return names[division] || 'Unknown';
  };

  const formatTimeRemaining = (deadline: string): string => {
    const now = new Date();
    const target = new Date(deadline);
    const diff = target.getTime() - now.getTime();
    
    if (diff <= 0) return "Registration Closed";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const getPlacementText = (placement: number): string => {
    if (placement === 1) return "Champion";
    if (placement === 2) return "Runner-Up";
    if (placement <= 4) return `Eliminated in Semifinals`;
    if (placement <= 8) return `Eliminated in Quarterfinals`;
    return `Eliminated in Round ${Math.ceil(Math.log2(placement))}`;
  };

  // Find tournaments
  const midSeasonCup = availableTournaments?.find(t => t.type === "mid_season_classic");
  const dailyDivisionalCup = availableTournaments?.find(t => t.type === "daily_divisional_cup");
  
  const currentGameDay = (seasonInfo as any)?.day || 1;
  const isTournamentDay = currentGameDay === 7;

  if (!teamInfo) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tournament Center</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Compete against the best teams for credits, gems, and eternal glory
        </p>
      </div>

      {/* Side by Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Daily Divisional Tournament - LEFT SIDE */}
        <Card className="border-2 border-blue-300 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Calendar className="w-8 h-8 text-blue-600" />
              <CardTitle className="text-xl text-blue-800 dark:text-blue-200">
                Daily Divisional Tournament
              </CardTitle>
            </div>
            <p className="text-blue-700 dark:text-blue-300">
              Daily competition for {getDivisionName(teamInfo.division)} Division teams
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              <div className="bg-blue-100 dark:bg-blue-800/30 p-4 rounded-lg">
                <p className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  Entry Requirements
                </p>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  • Tournament Entry Item required<br/>
                  • Available for Divisions 2-8<br/>
                  • Low injury risk and low stamina reduction<br/>
                  • 1 free entry per day. Can also use a Tournament Entry once per day
                </div>
              </div>
              
              <div className="bg-blue-100 dark:bg-blue-800/30 p-4 rounded-lg">
                <p className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  {getDivisionName(teamInfo.division)} Division Prize Preview
                </p>
                <div className="flex items-center justify-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    <Coins className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-blue-800 dark:text-blue-200">15,000₡</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Gem className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-blue-800 dark:text-blue-200">25💎</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={() => registerDailyTournamentMutation.mutate()}
                  disabled={registerDailyTournamentMutation.isPending || isRegisteredForDailyTournament}
                  className={isRegisteredForDailyTournament ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
                >
                  {registerDailyTournamentMutation.isPending ? "Registering..." : 
                   isRegisteredForDailyTournament ? "✓ Already Registered" : 
                   "Register for Daily Tournament"}
                </Button>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {isRegisteredForDailyTournament ? 
                    "You are registered for today's tournament" : 
                    "Requires Tournament Entry item - Purchase in Market → Store → Entries"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mid-Season Cup - RIGHT SIDE */}
        <Card className="border-2 border-purple-300 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Trophy className="w-8 h-8 text-purple-600" />
              <CardTitle className="text-xl text-purple-800 dark:text-purple-200">
                The Mid-Season Cup
              </CardTitle>
            </div>
            <p className="text-purple-700 dark:text-purple-300">
              Premier tournament open to all divisions with massive prizes
            </p>
          </CardHeader>
          <CardContent className="text-center">
            {!midSeasonCup ? (
              <div className="space-y-4">
                <div className="bg-purple-100 dark:bg-purple-800/30 p-4 rounded-lg">
                  <p className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
                    Tournament Details
                  </p>
                  <div className="text-sm text-purple-700 dark:text-purple-300">
                    • Entry: 10,000₡ AND 20💎<br/>
                    • Tournament Day: Day 7 at 1PM<br/>
                    • Moderate injury risk and moderate stamina reduction
                  </div>
                </div>
                <div className="bg-purple-100 dark:bg-purple-800/30 p-4 rounded-lg">
                  <p className="font-semibold text-purple-800 dark:text-purple-200">
                    {getDivisionName(teamInfo.division)} Division Prize Preview
                  </p>
                  <div className="flex items-center justify-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1">
                      <Coins className="w-4 h-4 text-purple-600" />
                      <span className="font-bold text-purple-800 dark:text-purple-200">50,000₡</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Gem className="w-4 h-4 text-purple-600" />
                      <span className="font-bold text-purple-800 dark:text-purple-200">100💎</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Trophy className="w-4 h-4 text-purple-600" />
                      <span className="font-bold text-purple-800 dark:text-purple-200">Trophy</span>
                    </div>
                  </div>
                </div>
                {isTournamentDay ? (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                    Tournament in progress - registration closed
                  </Badge>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <Timer className="w-5 h-5 text-purple-600" />
                      <span className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                        Starts Day 7 at 1PM
                      </span>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      Registration Open
                    </Badge>
                    <Button 
                      onClick={() => registerMidSeasonMutation.mutate("both")}
                      disabled={registerMidSeasonMutation.isPending || teamInfo.credits < 10000 || teamInfo.gems < 20}
                      className="bg-purple-600 hover:bg-purple-700 w-full"
                    >
                      {registerMidSeasonMutation.isPending ? "Registering..." : "Register (10,000₡ + 20💎)"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-purple-100 dark:bg-purple-800/30 p-4 rounded-lg">
                  <p className="font-semibold text-purple-800 dark:text-purple-200">
                    Entry Fee: 10,000₡ or 20💎
                  </p>
                  <div className="flex items-center justify-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1">
                      <Coins className="w-4 h-4 text-purple-600" />
                      <span className="font-bold text-purple-800 dark:text-purple-200">50,000₡</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Gem className="w-4 h-4 text-purple-600" />
                      <span className="font-bold text-purple-800 dark:text-purple-200">100💎</span>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => enterTournamentMutation.mutate(midSeasonCup.id)}
                  disabled={enterTournamentMutation.isPending || isTournamentDay}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {enterTournamentMutation.isPending ? "Entering..." : "Enter Tournament"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* My Tournament Status Section */}
      {myTournaments && myTournaments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5" />
              <span>My Tournament Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myTournaments.map((entry: any) => (
                <div key={entry.id} className="border-l-4 border-l-purple-500 pl-4 py-2 bg-white dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{entry.tournament.name}</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-200">
                        Division {entry.tournament.division} • {entry.tournament.type === 'DAILY_DIVISIONAL' ? 'Daily Cup' : 'Mid-Season Classic'}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {entry.tournament.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Registered {new Date(entry.registeredAt).toLocaleDateString()}
                  </div>
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        window.location.href = `/tournament-status`;
                      }}
                    >
                      View Details →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tournament History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5" />
            <span>Tournament History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tournamentHistory && tournamentHistory.length > 0 ? (
            <div className="space-y-3">
              {tournamentHistory.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-semibold">{entry.tournament.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Day {entry.tournament.gameDay} • {getPlacementText(entry.placement)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      {entry.creditsWon > 0 && (
                        <span className="flex items-center space-x-1 text-sm">
                          <Coins className="w-4 h-4 text-yellow-600" />
                          <span>{entry.creditsWon.toLocaleString()}₡</span>
                        </span>
                      )}
                      {entry.gemsWon > 0 && (
                        <span className="flex items-center space-x-1 text-sm">
                          <Gem className="w-4 h-4 text-purple-600" />
                          <span>{entry.gemsWon}💎</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-black dark:text-white">No tournament history yet</p>
              <p className="text-sm text-black dark:text-white mt-2">
                Enter tournaments to build your competitive record
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TournamentCenter;