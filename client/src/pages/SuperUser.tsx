import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings, Calendar, Trophy, CreditCard, Bell, Shield } from "lucide-react";

export default function SuperUser() {
  const { toast } = useToast();
  const [creditsAmount, setCreditsAmount] = useState(50000);
  const [premiumAmount, setPremiumAmount] = useState(100);

  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  const { data: currentWeek } = useQuery({
    queryKey: ["/api/season/current-week"],
  });

  // Season management mutations
  const advanceDayMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/superuser/advance-day", "POST");
    },
    onSuccess: (data: any) => {
      toast({
        title: "Day Advanced",
        description: `Successfully advanced to Day ${data.newDay}${data.isNewSeason ? " (New Season)" : ""}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/season/current-cycle"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to advance day",
        variant: "destructive",
      });
    },
  });

  const resetSeasonMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/superuser/reset-season", "POST");
    },
    onSuccess: (data: any) => {
      toast({
        title: "Season Reset",
        description: `Season reset to Day 1. ${data.teamsReset} teams reset, ${data.matchesStopped} matches stopped.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/season/current-cycle"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to reset season",
        variant: "destructive",
      });
    },
  });

  // Demo notifications mutation
  const createNotificationsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/demo/notifications", "POST");
    },
    onSuccess: () => {
      toast({
        title: "Demo Notifications Created",
        description: "Check your notification bell to see the new notifications.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create demo notifications",
        variant: "destructive",
      });
    },
  });

  // Grant credits mutation
  const grantCreditsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/superuser/grant-credits", "POST", {
        credits: creditsAmount,
        premiumCurrency: premiumAmount
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Credits Granted",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/finances"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to grant credits",
        variant: "destructive",
      });
    },
  });





  // Stop all games mutation
  const stopAllGamesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/superuser/stop-all-games", "POST");
    },
    onSuccess: (data: any) => {
      toast({
        title: "Games Stopped",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matches/live"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to stop games",
        variant: "destructive",
      });
    },
  });

  // Fill division mutation
  const fillDivisionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/leagues/create-ai-teams", "POST", { division: team?.division || 8 });
    },
    onSuccess: (data: any) => {
      toast({
        title: "AI Teams Created",
        description: `Successfully created ${data.teams?.length || 15} AI teams for the league`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create AI Teams",
        description: error.message || "Could not create AI teams",
        variant: "destructive",
      });
    },
  });

  // Start tournament mutation
  const startTournamentMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/superuser/start-tournament", "POST", {
        division: team?.division || 8
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Tournament Started",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to start tournament",
        variant: "destructive",
      });
    },
  });

  // Check if user is superuser (only for Macomb Cougars)
  const isSuperUser = team?.name === "Macomb Cougars";

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
          {/* Notification System */}
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

          {/* Credits Management */}
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
                onClick={() => grantCreditsMutation.mutate()}
                disabled={grantCreditsMutation.isPending}
                className="w-full"
                variant="outline"
              >
                {grantCreditsMutation.isPending ? "Granting..." : "Grant Credits"}
              </Button>
            </CardContent>
          </Card>



          {/* League Management */}
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
                  Division {team?.division || 8}
                </div>
              </div>
              <div className="space-y-2">
                <Button 
                  onClick={() => fillDivisionMutation.mutate()}
                  disabled={fillDivisionMutation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  {fillDivisionMutation.isPending ? "Creating..." : "Fill My Division"}
                </Button>
                <Button 
                  onClick={() => startTournamentMutation.mutate()}
                  disabled={startTournamentMutation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  {startTournamentMutation.isPending ? "Starting..." : "Manually Start Tournament"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Season Management */}
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

        {/* System Information */}
        <Card className="bg-gray-800 border-gray-700 mt-8">
          <CardHeader>
            <CardTitle className="font-orbitron text-xl flex items-center">
              <Settings className="w-5 h-5 mr-2 text-gray-400" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{team?.name}</div>
                <div className="text-sm text-gray-400">SuperUser Team</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">Division {team?.division}</div>
                <div className="text-sm text-gray-400">Current Division</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">Active</div>
                <div className="text-sm text-gray-400">System Status</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}