import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
// Assuming ServerTimeDisplay is correctly typed and imported if used, or remove if not.
// For now, I will assume it's not directly used or will be handled if it causes errors later.
// import ServerTimeDisplay from "@/components/ServerTimeDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings, Calendar, Trophy, CreditCard, Bell, Shield, Users } from "lucide-react";
import type { Team } from "shared/schema";

// Define interfaces for API responses and mutation payloads
interface CurrentWeekData {
  currentDay: number;
  currentSeason: number;
  phase: string;
  // Add other relevant fields from your API if any
}

interface AdvanceDayResponse {
  newDay: number;
  isNewSeason?: boolean;
  message?: string;
}

interface ResetSeasonResponse {
  teamsReset: number;
  matchesStopped: number;
  message?: string;
}

interface CleanupDivisionPayload {
  division: number;
}
interface CleanupDivisionResponse {
  details?: { division: number };
  teamsRemoved: number;
  remainingTeams: number;
  message?: string;
}

interface GrantCreditsPayload {
  credits: number;
  premiumCurrency: number;
}
interface GrantCreditsResponse {
  message: string;
}

interface AddPlayersPayload {
  teamId: string;
  count: number;
}
interface AddPlayersResponse {
  message: string;
  count?: number;
}

interface StopGamesResponse {
  message: string;
}

interface FillDivisionPayload {
  division: number;
}
interface FillDivisionResponse {
  teams?: { id: string, name: string }[];
  message?: string;
}

interface StartTournamentPayload {
  division: number;
}
interface StartTournamentResponse {
  message: string;
}


export default function SuperUser() {
  const { toast } = useToast();
  const [creditsAmount, setCreditsAmount] = useState(50000);
  const [premiumAmount, setPremiumAmount] = useState(100);
  const [divisionToCleanup, setDivisionToCleanup] = useState(8);
  const [playerCount, setPlayerCount] = useState(3);

  const teamQuery = useQuery({
    queryKey: ["myTeam"],
    queryFn: (): Promise<Team> => apiRequest("/api/teams/my"),
  });
  const team = teamQuery.data as Team | undefined;

  // Example: If currentWeek is needed, type it appropriately
  // const currentWeekQuery = useQuery({
  //   queryKey: ["currentWeek"],
  //   queryFn: (): Promise<CurrentWeekData> => apiRequest("/api/season/current-week"),
  // });
  // const currentWeek = currentWeekQuery.data as CurrentWeekData | undefined;


  const advanceDayMutation = useMutation({
    mutationFn: (): Promise<AdvanceDayResponse> =>
      apiRequest("/api/superuser/advance-day", "POST"),
    onSuccess: (data: AdvanceDayResponse) => {
      toast({
        title: "Day Advanced",
        description: data.message || `Successfully advanced to Day ${data.newDay}${data.isNewSeason ? " (New Season)" : ""}`,
      });
      queryClient.invalidateQueries({ queryKey: ["currentSeasonCycle"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to advance day",
        variant: "destructive",
      });
    },
  });

  const resetSeasonMutation = useMutation({
    mutationFn: (): Promise<ResetSeasonResponse> =>
      apiRequest("/api/superuser/reset-season", "POST"),
    onSuccess: (data: ResetSeasonResponse) => {
      toast({
        title: "Season Reset",
        description: data.message || `Season reset to Day 1. ${data.teamsReset} teams reset, ${data.matchesStopped} matches stopped.`,
      });
      queryClient.invalidateQueries({ queryKey: ["currentSeasonCycle"] });
      queryClient.invalidateQueries({ queryKey: ["allLeagues"] });
      queryClient.invalidateQueries({ queryKey: ["myTeam"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset season",
        variant: "destructive",
      });
    },
  });

  const cleanupDivisionMutation = useMutation({
    mutationFn: (payload: CleanupDivisionPayload): Promise<CleanupDivisionResponse> =>
      apiRequest("/api/superuser/cleanup-division", "POST", payload),
    onSuccess: (data: CleanupDivisionResponse) => {
      toast({
        title: "Division Cleaned Up",
        description: data.message || `Division ${data.details?.division || divisionToCleanup}: ${data.teamsRemoved} teams removed, ${data.remainingTeams} teams remaining`,
      });
      queryClient.invalidateQueries({ queryKey: ["allLeagues"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clean up division",
        variant: "destructive",
      });
    },
  });

  const createNotificationsMutation = useMutation({
    mutationFn: (): Promise<void> =>
      apiRequest("/api/demo/notifications", "POST"),
    onSuccess: () => {
      toast({
        title: "Demo Notifications Created",
        description: "Check your notification bell to see the new notifications.",
      });
      queryClient.invalidateQueries({ queryKey: ["userNotifications"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create demo notifications",
        variant: "destructive",
      });
    },
  });

  const grantCreditsMutation = useMutation({
    mutationFn: (payload: GrantCreditsPayload): Promise<GrantCreditsResponse> =>
      apiRequest("/api/superuser/grant-credits", "POST", payload),
    onSuccess: (data: GrantCreditsResponse) => {
      toast({
        title: "Credits Granted",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["myTeamFinances"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to grant credits",
        variant: "destructive",
      });
    },
  });

  const addPlayersMutation = useMutation({
    mutationFn: (payload: AddPlayersPayload): Promise<AddPlayersResponse> => {
      if (!payload.teamId) {
        return Promise.reject(new Error("No team ID provided to add players."));
      }
      return apiRequest("/api/superuser/add-players", "POST", payload);
    },
    onSuccess: (data: AddPlayersResponse) => {
      toast({
        title: "Players Added",
        description: data.message || `Successfully created ${data.count || playerCount} players for your team`,
      });
      if (team?.id) {
        queryClient.invalidateQueries({ queryKey: ["teamPlayers", team.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["myTeam"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add players",
        variant: "destructive",
      });
    },
  });

  const stopAllGamesMutation = useMutation({
    mutationFn: (): Promise<StopGamesResponse> =>
      apiRequest("/api/superuser/stop-all-games", "POST"),
    onSuccess: (data: StopGamesResponse) => {
      toast({
        title: "Games Stopped",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["liveMatches"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stop games",
        variant: "destructive",
      });
    },
  });

  const fillDivisionMutation = useMutation({
    mutationFn: (payload: FillDivisionPayload): Promise<FillDivisionResponse> =>
      apiRequest("/api/leagues/create-ai-teams", "POST", payload),
    onSuccess: (data: FillDivisionResponse) => {
      toast({
        title: "AI Teams Created",
        description: data.message || `Successfully created ${data.teams?.length || 0} AI teams for the league`,
      });
      queryClient.invalidateQueries({ queryKey: ["allLeagues"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create AI Teams",
        description: error.message || "Could not create AI teams",
        variant: "destructive",
      });
    },
  });

  const startTournamentMutation = useMutation({
    mutationFn: (payload: StartTournamentPayload): Promise<StartTournamentResponse> =>
      apiRequest("/api/superuser/start-tournament", "POST", payload),
    onSuccess: (data: StartTournamentResponse) => {
      toast({
        title: "Tournament Started",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["allTournaments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start tournament",
        variant: "destructive",
      });
    },
  });

  const isSuperUser = team?.name === "Macomb Cougars";

  if (teamQuery.isLoading) { // Added loading state for initial team check
    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500"></div>
        </div>
    );
  }

  if (!isSuperUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <Shield className="w-16 h-16 mx-auto mb-6 text-red-400" />
          <h1 className="font-orbitron text-3xl font-bold mb-6">Access Denied</h1>
          <p className="text-gray-400 mb-8">You don't have permission to access this page.</p>
          <Button onClick={() => window.location.href = '/'}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-orbitron text-3xl font-bold mb-2 flex items-center">
                <Shield className="w-8 h-8 mr-3 text-red-400" />
                SuperUser Panel
              </h1>
              <p className="text-gray-400">
                Administrative controls for game testing and management
              </p>
            </div>
            <Badge variant="destructive" className="text-sm">
              ADMIN ACCESS
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="font-orbitron text-xl flex items-center">
                <Bell className="w-5 h-5 mr-2 text-blue-400" />
                Notification System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-400 text-sm">
                Create demo notifications for testing the notification system.
              </p>
              <Button 
                onClick={() => createNotificationsMutation.mutate()}
                disabled={createNotificationsMutation.isPending}
                className="w-full"
                variant="outline"
              >
                {createNotificationsMutation.isPending ? "Creating..." : "Create Demo Notifications"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="font-orbitron text-xl flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-green-400" />
                Credits Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Regular Credits</label>
                <Input
                  type="number"
                  value={creditsAmount}
                  onChange={(e) => setCreditsAmount(Number(e.target.value))}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Premium Currency</label>
                <Input
                  type="number"
                  value={premiumAmount}
                  onChange={(e) => setPremiumAmount(Number(e.target.value))}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              <Button 
                onClick={() => grantCreditsMutation.mutate({ credits: creditsAmount, premiumCurrency: premiumAmount })}
                disabled={grantCreditsMutation.isPending}
                className="w-full"
                variant="outline"
              >
                {grantCreditsMutation.isPending ? "Granting..." : "Grant Credits"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="font-orbitron text-xl flex items-center">
                <Users className="w-5 h-5 mr-2 text-purple-400" />
                Player Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-400 text-sm">
                Add balanced players to teams that are below the 10-player minimum for testing.
              </p>
              <div>
                <label className="block text-sm font-medium mb-2">Number of Players</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={playerCount}
                  onChange={(e) => setPlayerCount(Number(e.target.value))}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              <Button 
                onClick={() => {
                  if (team?.id) {
                    addPlayersMutation.mutate({ teamId: team.id, count: playerCount });
                  } else {
                    toast({ title: "Error", description: "Team ID is not available.", variant: "destructive" });
                  }
                }}
                disabled={addPlayersMutation.isPending || !team?.id}
                className="w-full"
                variant="outline"
              >
                {addPlayersMutation.isPending ? "Adding Players..." : `Add ${playerCount} Players`}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="font-orbitron text-xl flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                League Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-400">Target Division</div>
                <div className="text-xl font-bold text-yellow-400">
                  Division {team?.division ?? 8}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min="1"
                    max="8"
                    value={divisionToCleanup}
                    onChange={(e) => setDivisionToCleanup(parseInt(e.target.value))}
                    className="w-20"
                    placeholder="Div"
                  />
                  <Button 
                    onClick={() => cleanupDivisionMutation.mutate({ division: divisionToCleanup })}
                    disabled={cleanupDivisionMutation.isPending}
                    className="flex-1"
                    variant="destructive"
                  >
                    {cleanupDivisionMutation.isPending ? "Cleaning..." : "Clean Division (Max 8 Teams)"}
                  </Button>
                </div>
                
                <Button 
                  onClick={() => {
                    if (team?.division !== null && team?.division !== undefined) {
                      fillDivisionMutation.mutate({ division: team.division });
                    } else {
                       toast({ title: "Error", description: "Team division is not available.", variant: "destructive" });
                    }
                  }}
                  disabled={fillDivisionMutation.isPending || team?.division === null || team?.division === undefined}
                  className="w-full"
                  variant="outline"
                >
                  {fillDivisionMutation.isPending ? "Creating..." : "Fill My Division"}
                </Button>
                <Button 
                  onClick={() => {
                     if (team?.division !== null && team?.division !== undefined) {
                      startTournamentMutation.mutate({ division: team.division });
                    } else {
                      toast({ title: "Error", description: "Team division is not available.", variant: "destructive" });
                    }
                  }}
                  disabled={startTournamentMutation.isPending || team?.division === null || team?.division === undefined}
                  className="w-full"
                  variant="outline"
                >
                  {startTournamentMutation.isPending ? "Starting..." : "Manually Start Tournament"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gray-800 border-gray-700 mt-8">
          <CardHeader>
            <CardTitle className="font-orbitron text-xl flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-orange-400" />
              Season Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-400 text-sm">
              Manual control over season progression and timing. Current day and season can be managed server-wide.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => advanceDayMutation.mutate()}
                disabled={advanceDayMutation.isPending}
                className="w-full"
                variant="outline"
              >
                {advanceDayMutation.isPending ? "Advancing..." : "Advance Day"}
              </Button>
              <Button 
                onClick={() => resetSeasonMutation.mutate()}
                disabled={resetSeasonMutation.isPending}
                className="w-full"
                variant="destructive"
              >
                {resetSeasonMutation.isPending ? "Resetting..." : "Reset Season to Day 1"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* <ServerTimeDisplay /> Commented out as it's not defined/imported in current context */}
          <Card className="bg-gray-800 border-gray-700">
             <CardHeader><CardTitle>Server Time (Placeholder)</CardTitle></CardHeader>
             <CardContent><p>Server time display would go here.</p></CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="font-orbitron text-xl flex items-center">
                <Settings className="w-5 h-5 mr-2 text-gray-400" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-400">{team?.name ?? 'N/A'}</div>
                  <div className="text-sm text-gray-400">SuperUser Team</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">Division {team?.division ?? 'N/A'}</div>
                  <div className="text-sm text-gray-400">Current Division</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-400">Active</div>
                  <div className="text-sm text-gray-400">System Status</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}