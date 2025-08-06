import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Trophy, 
  Calendar,
  Users,
  Gift,
  DollarSign,
  AlertTriangle,
  Heart,
  Zap,
  Crown,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  type: "daily_divisional_cup" | "mid_season_classic";
  division: number;
  entryFeeCredits?: number;
  entryFeeGems?: number;
  requiresEntryItem?: boolean;
  maxTeams: number;
  registrationDeadline: string;
  tournamentStartTime: string;
  prizes: any;
  canRegister: boolean;
  timeUntilDeadline: number;
}

interface TournamentOverview {
  division: number;
  divisionName: string;
  season: number;
  gameDay: number;
  tournaments: {
    dailyDivisionTournament: {
      available: boolean;
      name: string;
      description: string;
      entryRequirement: string;
      gameLength: string;
      injuryRisk: string;
      staminaCost: string;
      progressionBenefit: string;
      registrationWindow: string;
      tournamentTime: string;
      rewards: any;
    };
    midSeasonCup: {
      available: boolean;
      name: string;
      description: string;
      entryRequirement: string;
      gameLength: string;
      injuryRisk: string;
      staminaCost: string;
      progressionBenefit: string;
      registrationWindow: string;
      tournamentTime: string;
      rewards: any;
    };
  };
}

interface ComprehensiveTournamentManagerProps {
  teamId?: string;
}

export default function ComprehensiveTournamentManager({ teamId }: ComprehensiveTournamentManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("overview");

  // Fetch team info to get division
  const { data: teamInfo } = useQuery({
    queryKey: ["/api/teams", teamId],
    enabled: !!teamId,
  });

  const division = (teamInfo as any)?.division || 1;

  // Fetch tournament overview
  const { data: tournamentOverview, isLoading: overviewLoading } = useQuery<TournamentOverview>({
    queryKey: ["/api/new-tournaments/overview", division],
    enabled: !!division,
  });

  // Fetch available tournaments
  const { data: availableTournaments, isLoading: availableLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/new-tournaments/available"],
    refetchInterval: 3 * 60 * 1000, // Refresh every 3 minutes instead of 30 seconds
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
  });

  // Fetch my tournaments
  const { data: myTournaments, isLoading: myTournamentsLoading } = useQuery({
    queryKey: ["/api/new-tournaments/my-tournaments"],
  });

  // Fetch tournament history
  const { data: tournamentHistory } = useQuery({
    queryKey: ["/api/new-tournaments/history"],
  });

  // Fetch tournament stats
  const { data: tournamentStats } = useQuery({
    queryKey: ["/api/new-tournaments/stats"],
  });

  // Register for tournament mutation
  const registerMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      const response = await fetch("/api/new-tournaments/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to register for tournament");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration Successful",
        description: "You have been registered for the tournament!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/new-tournaments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatTimeRemaining = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const TournamentCard = ({ tournament }: { tournament: Tournament }) => (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-500" />
            <CardTitle className="text-lg">{tournament.name}</CardTitle>
          </div>
          <Badge variant={tournament.type === "daily_divisional_cup" ? "secondary" : "default"}>
            {tournament.type === "daily_divisional_cup" ? "Daily Tournament" : "Mid-Season Cup"}
          </Badge>
        </div>
        <CardDescription className="text-gray-600 dark:text-gray-300">
          {tournament.type === "daily_divisional_cup" 
            ? "Quick single-elimination tournament" 
            : "Premier seasonal tournament with substantial rewards"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Max: {tournament.maxTeams} teams</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {tournament.timeUntilDeadline > 0 
                ? `${formatTimeRemaining(tournament.timeUntilDeadline)} left`
                : "Registration closed"
              }
            </span>
          </div>
        </div>

        {/* Entry Requirements */}
        <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
            <Target className="w-4 h-4" />
            Entry Requirements
          </h4>
          {tournament.requiresEntryItem ? (
            <div className="flex items-center gap-2 text-sm">
              <Gift className="w-4 h-4 text-blue-500" />
              <span className="text-gray-700 dark:text-gray-300">Tournament Entry Item</span>
            </div>
          ) : (
            <div className="space-y-1">
              {tournament.entryFeeCredits && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">{tournament.entryFeeCredits.toLocaleString()}₡ Credits</span>
                </div>
              )}
              {tournament.entryFeeGems && (
                <div className="flex items-center gap-2 text-sm">
                  <Crown className="w-4 h-4 text-purple-500" />
                  <span className="text-gray-700 dark:text-gray-300">OR {tournament.entryFeeGems} 💎 Gems</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tournament Impact */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
            <AlertTriangle className="w-4 h-4 mx-auto text-yellow-500" />
            <div className="font-medium mt-1 text-gray-900 dark:text-gray-100">
              {tournament.type === "daily_divisional_cup" ? "5%" : "20%"}
            </div>
            <div className="text-gray-600 dark:text-gray-400">Injury Risk</div>
          </div>
          <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
            <Zap className="w-4 h-4 mx-auto text-red-500" />
            <div className="font-medium mt-1 text-gray-900 dark:text-gray-100">
              {tournament.type === "daily_divisional_cup" ? "-10" : "-30"}
            </div>
            <div className="text-gray-600 dark:text-gray-400">Stamina Cost</div>
          </div>
          <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
            <Heart className="w-4 h-4 mx-auto text-green-500" />
            <div className="font-medium mt-1 text-gray-900 dark:text-gray-100">
              {tournament.type === "daily_divisional_cup" ? "Moderate" : "High"}
            </div>
            <div className="text-gray-600 dark:text-gray-400">Progression</div>
          </div>
        </div>

        {/* Registration Button */}
        <Button 
          className="w-full" 
          disabled={!tournament.canRegister || registerMutation.isPending}
          onClick={() => registerMutation.mutate(tournament.id)}
        >
          {registerMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Registering...
            </>
          ) : tournament.canRegister ? (
            <>
              <Trophy className="w-4 h-4 mr-2" />
              Register Now
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 mr-2" />
              Registration Closed
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const OverviewTab = () => (
    <div className="space-y-6">
      {tournamentOverview && (
        <>
          {/* Season Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Tournament Calendar - {tournamentOverview.divisionName}
              </CardTitle>
              <CardDescription>
                Season {tournamentOverview.season}, Game Day {tournamentOverview.gameDay}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Current tournament availability based on your division and game day schedule.
              </div>
            </CardContent>
          </Card>

          {/* Tournament Types */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Daily Division Tournament */}
            <Card className={`border-2 ${tournamentOverview.tournaments.dailyDivisionTournament.available 
              ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/10' 
              : 'border-gray-200 bg-gray-50 dark:bg-gray-800'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-blue-500" />
                  {tournamentOverview.tournaments.dailyDivisionTournament.name}
                </CardTitle>
                <CardDescription>{tournamentOverview.tournaments.dailyDivisionTournament.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Entry Requirement</div>
                    <div className="text-gray-600">{tournamentOverview.tournaments.dailyDivisionTournament.entryRequirement}</div>
                  </div>
                  <div>
                    <div className="font-medium">Game Length</div>
                    <div className="text-gray-600">{tournamentOverview.tournaments.dailyDivisionTournament.gameLength}</div>
                  </div>
                  <div>
                    <div className="font-medium">Injury Risk</div>
                    <div className="text-gray-600">{tournamentOverview.tournaments.dailyDivisionTournament.injuryRisk}</div>
                  </div>
                  <div>
                    <div className="font-medium">Stamina Cost</div>
                    <div className="text-gray-600">{tournamentOverview.tournaments.dailyDivisionTournament.staminaCost}</div>
                  </div>
                </div>
                
                {tournamentOverview.tournaments.dailyDivisionTournament.available ? (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Available for Division {division}
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    Not Available (Division 1 excluded)
                  </Badge>
                )}

                <div className="text-sm">
                  <div className="font-medium">Schedule</div>
                  <div className="text-gray-600">
                    Registration: {tournamentOverview.tournaments.dailyDivisionTournament.registrationWindow}<br/>
                    Tournament: {tournamentOverview.tournaments.dailyDivisionTournament.tournamentTime}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mid-Season Classic */}
            <Card className={`border-2 ${tournamentOverview.tournaments.midSeasonCup.available 
              ? 'border-purple-200 bg-purple-50 dark:bg-purple-900/10' 
              : 'border-gray-200 bg-gray-50 dark:bg-gray-800'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-purple-500" />
                  {tournamentOverview.tournaments.midSeasonCup.name}
                </CardTitle>
                <CardDescription>{tournamentOverview.tournaments.midSeasonCup.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Entry Requirement</div>
                    <div className="text-gray-600">{tournamentOverview.tournaments.midSeasonCup.entryRequirement}</div>
                  </div>
                  <div>
                    <div className="font-medium">Game Length</div>
                    <div className="text-gray-600">{tournamentOverview.tournaments.midSeasonCup.gameLength}</div>
                  </div>
                  <div>
                    <div className="font-medium">Injury Risk</div>
                    <div className="text-gray-600">{tournamentOverview.tournaments.midSeasonCup.injuryRisk}</div>
                  </div>
                  <div>
                    <div className="font-medium">Stamina Cost</div>
                    <div className="text-gray-600">{tournamentOverview.tournaments.midSeasonCup.staminaCost}</div>
                  </div>
                </div>
                
                {tournamentOverview.tournaments.midSeasonCup.available ? (
                  <Badge className="bg-purple-100 text-purple-800">
                    Registration Open
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    {tournamentOverview.gameDay < 6 ? "Available on Game Day 6" : "Registration Closed"}
                  </Badge>
                )}

                <div className="text-sm">
                  <div className="font-medium">Schedule</div>
                  <div className="text-gray-600">
                    Registration: {tournamentOverview.tournaments.midSeasonCup.registrationWindow}<br/>
                    Tournament: {tournamentOverview.tournaments.midSeasonCup.tournamentTime}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tournament Center</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Compete in Daily Divisional Tournament and Mid-Season Cup for rewards and glory
          </p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="my-tournaments">My Tournaments</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {overviewLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <OverviewTab />
          )}
        </TabsContent>

        <TabsContent value="available" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Available Tournaments</h3>
              <Badge variant="outline">
                {availableTournaments?.length || 0} tournaments
              </Badge>
            </div>
            
            {availableLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : availableTournaments?.length ? (
              <div className="grid gap-4">
                {availableTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Trophy className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">
                    No tournaments are currently available for registration.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Check back during registration windows for Daily Divisional Tournament and Mid-Season Cup.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="my-tournaments" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">My Tournament Registrations</h3>
            
            {myTournamentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (myTournaments as any)?.length ? (
              <div className="grid gap-4">
                {(myTournaments as any[]).map((tournament: any) => (
                  <Card key={tournament.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{tournament.name}</CardTitle>
                        <Badge variant={tournament.isCompleted ? "secondary" : tournament.isActive ? "default" : "outline"}>
                          {tournament.isCompleted ? "Completed" : tournament.isActive ? "In Progress" : "Upcoming"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {tournament.isCompleted && tournament.placement && (
                        <div className="flex items-center gap-2 text-sm">
                          <Trophy className="w-4 h-4" />
                          <span>Finished #{tournament.placement}</span>
                          {tournament.creditsWon > 0 && (
                            <span className="text-green-600">
                              (+{tournament.creditsWon.toLocaleString()}₡)
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">
                    You haven't registered for any tournaments yet.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Check the Available tab to find tournaments you can join.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Tournament History</h3>
            {/* Tournament history implementation */}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Tournament Statistics</h3>
            {/* Tournament statistics implementation */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}