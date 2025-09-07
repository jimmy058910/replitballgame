import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, Calendar, Trophy, CreditCard, Bell, Shield, Users, Search, 
  TrendingUp, PlayCircle, StopCircle, RefreshCw, Database, AlertTriangle,
  CheckCircle, Clock, Crown, Zap
} from "lucide-react";
import ServerTimeDisplay from "@/components/ServerTimeDisplay";
import DailyProgressionTest from "@/components/DailyProgressionTest";

// Type interfaces for API responses
interface AdminStatus {
  isAdmin: boolean;
  hasAdminAccess: boolean;
  userRole: string;
  userId: string;
}

interface Team {
  id: string;
  name: string;
  division: number;
  credits: number;
  wins: number;
  losses: number;
  draws: number;
}

interface CurrentWeek {
  week: number;
  season: string;
  currentDay: number;
}

interface SystemStats {
  totalTeams: number;
  totalPlayers: number;
  activeMatches: number;
  activeTournaments: number;
}

export default function SuperUser() {
  const { toast } = useToast();
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [creditsAmount, setCreditsAmount] = useState(50000);
  const [premiumAmount, setPremiumAmount] = useState(100);
  const [divisionToCleanup, setDivisionToCleanup] = useState(8);
  const [playerCount, setPlayerCount] = useState(3);
  const [forceMessage, setForceMessage] = useState("");
  const [testHomeTeamId, setTestHomeTeamId] = useState("132");
  const [testAwayTeamId, setTestAwayTeamId] = useState("133");
  const [testHomeScore, setTestHomeScore] = useState(3);
  const [testAwayScore, setTestAwayScore] = useState(1);
  const [testMatchType, setTestMatchType] = useState("EXHIBITION");

  // Core data queries
  const { data: adminStatus, isLoading: adminLoading } = useQuery<AdminStatus>({
    queryKey: ["/api/auth/admin-status"],
  });

  const { data: myTeam } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
  });

  const { data: currentWeek } = useQuery<CurrentWeek>({
    queryKey: ["/api/seasons/current-week"],
  });

  // System statistics for admin dashboard
  const { data: systemStats } = useQuery<SystemStats>({
    queryKey: ["/api/system/stats"],
  });

  // Admin promotion mutation
  const promoteToAdminMutation = useMutation({
    mutationFn: () => apiRequest("/api/auth/promote-to-admin", "POST"),
    onSuccess: (data: any) => {
      toast({
        title: "Admin Promotion Successful",
        description: data?.message || "You have been promoted to admin status",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/admin-status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Promotion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Season management mutations
  const advanceDayMutation = useMutation({
    mutationFn: () => apiRequest("/api/superuser/advance-day", "POST"),
    onSuccess: (data: any) => {
      toast({
        title: "Day Advanced",
        description: data?.message || "Day successfully advanced",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seasons/current-week"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Advance Day",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stopAllGamesMutation = useMutation({
    mutationFn: () => apiRequest("/api/superuser/stop-all-games", "POST"),
    onSuccess: (data: any) => {
      toast({
        title: "All Games Stopped",
        description: data?.message || "All active games have been stopped",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matches/live"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Stop Games",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetSeasonMutation = useMutation({
    mutationFn: () => apiRequest("/api/superuser/reset-season", "POST"),
    onSuccess: (data: any) => {
      toast({
        title: "Season Reset",
        description: data?.message || "Season has been reset to Day 1",
      });
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Reset Season",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Team management mutations
  const grantCreditsMutation = useMutation({
    mutationFn: ({ teamId, amount }: { teamId: string; amount: number }) =>
      apiRequest("/api/superuser/grant-credits", "POST", { teamId, amount }),
    onSuccess: (data: any) => {
      toast({
        title: "Credits Granted",
        description: `Successfully granted ${creditsAmount} credits`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Grant Credits",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPlayerItemsMutation = useMutation({
    mutationFn: () => apiRequest("/api/superuser/reset-player-daily-items", "POST"),
    onSuccess: (data: any) => {
      toast({
        title: "Player Items Reset",
        description: data?.message || "All player daily items used counters have been reset to 0",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/injury-stamina/team"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Reset Player Items",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Tournament management mutations
  const forceStartTournamentMutation = useMutation({
    mutationFn: ({ tournamentId }: { tournamentId: string }) =>
      apiRequest(`/api/superuser/force-start-tournament/${tournamentId}`, "POST"),
    onSuccess: () => {
      toast({
        title: "Tournament Force Started",
        description: "Tournament has been force started with AI teams",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Force Start Tournament",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (adminLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading admin interface...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            SuperUser Administration
          </h1>
          <p className="text-muted-foreground">Production Testing & System Management</p>
        </div>
        <div className="flex items-center gap-4">
          <ServerTimeDisplay />
          <Badge variant={adminStatus?.isAdmin ? "default" : "destructive"}>
            {adminStatus?.userRole || "USER"}
          </Badge>
        </div>
      </div>

      {/* Admin Status Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Status & Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${adminStatus?.isAdmin ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Admin Access: {adminStatus?.isAdmin ? 'Granted' : 'Denied'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${adminStatus?.hasAdminAccess ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Permissions: {adminStatus?.hasAdminAccess ? 'Full' : 'Limited'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span>User ID: {adminStatus?.userId || 'Unknown'}</span>
            </div>
          </div>
          
          {!adminStatus?.isAdmin && (
            <div className="mt-4">
              <Button 
                onClick={() => promoteToAdminMutation.mutate()}
                disabled={promoteToAdminMutation.isPending}
                variant="outline"
              >
                <Zap className="h-4 w-4 mr-2" />
                {promoteToAdminMutation.isPending ? "Promoting..." : "Promote to Admin"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Admin Interface - Only show if user has admin access */}
      {adminStatus?.hasAdminAccess && (
        <Tabs defaultValue="season" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="season">Season</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
          </TabsList>

          {/* Season Management */}
          <TabsContent value="season" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Season Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Current Season</label>
                    <p className="text-lg">{currentWeek?.season || "Unknown"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Current Week</label>
                    <p className="text-lg">Week {currentWeek?.week || 1}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Current Day</label>
                    <p className="text-lg">Day {currentWeek?.currentDay || 1}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => advanceDayMutation.mutate()}
                    disabled={advanceDayMutation.isPending}
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    {advanceDayMutation.isPending ? "Advancing..." : "Advance Day"}
                  </Button>
                  <Button 
                    onClick={() => resetSeasonMutation.mutate()}
                    disabled={resetSeasonMutation.isPending}
                    variant="destructive"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {resetSeasonMutation.isPending ? "Resetting..." : "Reset Season"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <DailyProgressionTest />
          </TabsContent>

          {/* Team Management */}
          <TabsContent value="teams" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">My Team</label>
                    <p className="text-lg">{myTeam?.name || "No team found"}</p>
                    <p className="text-sm text-muted-foreground">
                      Division {myTeam?.division || "Unknown"} • 
                      {myTeam?.credits || 0} credits • 
                      {myTeam?.wins || 0}W-{myTeam?.losses || 0}L-{myTeam?.draws || 0}D
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="Credits to grant"
                      value={creditsAmount}
                      onChange={(e) => setCreditsAmount(parseInt(e.target.value) || 0)}
                    />
                    <Button 
                      onClick={() => grantCreditsMutation.mutate({ 
                        teamId: myTeam?.id || "", 
                        amount: creditsAmount 
                      })}
                      disabled={grantCreditsMutation.isPending || !myTeam?.id}
                      className="w-full"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      {grantCreditsMutation.isPending ? "Granting..." : "Grant Credits"}
                    </Button>
                    <Button 
                      onClick={() => resetPlayerItemsMutation.mutate()}
                      disabled={resetPlayerItemsMutation.isPending}
                      variant="outline"
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {resetPlayerItemsMutation.isPending ? "Resetting..." : "Reset All Player Daily Items"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tournament Management */}
          <TabsContent value="tournaments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Tournament Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Tournament ID"
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                    />
                    <Button 
                      onClick={() => forceStartTournamentMutation.mutate({ 
                        tournamentId: selectedTeamId 
                      })}
                      disabled={forceStartTournamentMutation.isPending || !selectedTeamId}
                      className="w-full"
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      {forceStartTournamentMutation.isPending ? "Starting..." : "Force Start Tournament"}
                    </Button>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Force start tournaments with AI teams to fill empty slots.
                      Use tournament ID from active tournaments list.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Match Management */}
          <TabsContent value="matches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5" />
                  Match Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Emergency controls for match management during production testing.
                    </p>
                    <Button 
                      onClick={() => stopAllGamesMutation.mutate()}
                      disabled={stopAllGamesMutation.isPending}
                      variant="destructive"
                      className="w-full"
                    >
                      <StopCircle className="h-4 w-4 mr-2" />
                      {stopAllGamesMutation.isPending ? "Stopping..." : "Stop All Active Matches"}
                    </Button>
                  </div>
                  <div>
                    <label className="text-sm font-medium">System Statistics</label>
                    <div className="space-y-1 mt-2">
                      <p className="text-sm">Active Matches: {systemStats?.activeMatches || 0}</p>
                      <p className="text-sm">Active Tournaments: {systemStats?.activeTournaments || 0}</p>
                      <p className="text-sm">Total Teams: {systemStats?.totalTeams || 0}</p>
                      <p className="text-sm">Total Players: {systemStats?.totalPlayers || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Management */}
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  System Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">Database Operations</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Advanced database operations for production testing.
                    </p>
                    <Button variant="outline" className="w-full mb-2">
                      <Database className="h-4 w-4 mr-2" />
                      Database Health Check
                    </Button>
                    <Button variant="outline" className="w-full">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Clear Cache
                    </Button>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">System Monitoring</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Database Connection</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">WebSocket Service</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Match Automation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">Tournament Automation</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testing Tools */}
          <TabsContent value="testing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Production Testing Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Force Message Broadcasting</h3>
                    <Textarea
                      placeholder="Enter system message to broadcast to all users..."
                      value={forceMessage}
                      onChange={(e) => setForceMessage(e.target.value)}
                      className="mb-2"
                    />
                    <Button className="w-full">
                      <Bell className="h-4 w-4 mr-2" />
                      Broadcast Message
                    </Button>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Testing Utilities</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Button variant="outline">
                        <Search className="h-4 w-4 mr-2" />
                        Generate Test Data
                      </Button>
                      <Button variant="outline">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Simulate Server Load
                      </Button>
                      <Button variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset Test Environment
                      </Button>
                      <Button variant="outline">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Performance Report
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Access Denied Message */}
      {!adminStatus?.hasAdminAccess && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
              <h2 className="text-xl font-semibold">Admin Access Required</h2>
              <p className="text-muted-foreground">
                You need administrator privileges to access the SuperUser interface.
                Click "Promote to Admin" above if you are an authorized administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}