import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";

export default function Tournaments() {
  const { toast } = useToast();
  const [selectedDivision, setSelectedDivision] = useState(1);

  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  const { data: tournaments, isLoading: tournamentsLoading } = useQuery({
    queryKey: ["/api/tournaments", selectedDivision],
  });

  const { data: myEntries } = useQuery({
    queryKey: ["/api/tournaments/my-entries"],
  });

  const { data: tournamentHistory } = useQuery({
    queryKey: ["/api/tournaments/history"],
  });

  const enterTournamentMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      return await apiRequest(`/api/tournaments/${tournamentId}/enter`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Tournament Entry Successful",
        description: "You've successfully entered the tournament!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments/my-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Entry Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getDivisionName = (division: number) => {
    const names = {
      1: "Diamond Division",
      2: "Ruby Division", 
      3: "Emerald Division",
      4: "Sapphire Division",
      5: "Gold Division",
      6: "Silver Division",
      7: "Bronze Division",
      8: "Iron Division"
    };
    return names[division as keyof typeof names] || `Division ${division}`;
  };

  const getRarityColor = (status: string) => {
    switch (status) {
      case "open": return "bg-green-500";
      case "in_progress": return "bg-yellow-500";
      case "completed": return "bg-gray-500";
      default: return "bg-blue-500";
    }
  };

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Team Found</h2>
          <p className="text-gray-400">You need to create a team first to access tournaments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-orbitron text-3xl font-bold mb-2">Tournament Arena</h1>
          <p className="text-gray-400">Compete in daily tournaments for credits and glory</p>
        </div>

        <Tabs defaultValue="available" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="available">Available Tournaments</TabsTrigger>
            <TabsTrigger value="entered">My Entries</TabsTrigger>
            <TabsTrigger value="history">Tournament History</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-6">
            {/* Division Selector - Only show divisions within team's range */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].filter(division => {
                // Show team's division and one above/below for eligibility
                const teamDivision = team?.division || 8;
                return division >= Math.max(1, teamDivision - 1) && 
                       division <= Math.min(8, teamDivision + 1);
              }).map((division) => (
                <Button
                  key={division}
                  variant={selectedDivision === division ? "default" : "outline"}
                  onClick={() => setSelectedDivision(division)}
                  className={`text-sm ${
                    selectedDivision === division 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 hover:text-white"
                  }`}
                >
                  {getDivisionName(division)}
                </Button>
              ))}
            </div>

            {tournamentsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-400">Loading tournaments...</p>
              </div>
            ) : !tournaments || tournaments.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="text-center py-12">
                  <p className="text-gray-400 text-lg">No tournaments available</p>
                  <p className="text-gray-500 mt-2">Check back later for new tournaments</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tournaments.map((tournament: any) => (
                  <Card key={tournament.id} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{tournament.name}</CardTitle>
                        <Badge className={`${getRarityColor(tournament.status)} text-white`}>
                          {tournament.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        {getDivisionName(tournament.division)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Entry Fee:</span>
                          <span className="font-semibold text-red-400">
                            {tournament.entryFee?.toLocaleString()} credits
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Max Teams:</span>
                          <span>{tournament.maxTeams}</span>
                        </div>

                        <div className="space-y-2">
                          <span className="text-sm text-gray-400">Prizes:</span>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span>🥇 1st Place:</span>
                              <span className="text-yellow-400">{tournament.prizes?.first?.toLocaleString() || '5,000'} credits</span>
                            </div>
                            <div className="flex justify-between">
                              <span>🥈 2nd Place:</span>
                              <span className="text-gray-300">{tournament.prizes?.second?.toLocaleString() || '2,000'} credits</span>
                            </div>
                          </div>
                        </div>

                        <Separator className="bg-gray-700" />

                        <Button
                          className="w-full"
                          disabled={
                            tournament.status !== "open" || 
                            enterTournamentMutation.isPending ||
                            !team ||
                            myEntries?.some((entry: any) => entry.tournamentId === tournament.id)
                          }
                          onClick={() => enterTournamentMutation.mutate(tournament.id)}
                        >
                          {enterTournamentMutation.isPending 
                            ? "Entering..." 
                            : myEntries?.some((entry: any) => entry.tournamentId === tournament.id)
                            ? "Already Entered"
                            : tournament.status === "open" 
                            ? "Enter Tournament" 
                            : "Tournament Closed"
                          }
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="entered" className="space-y-6">
            {!myEntries || myEntries.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="text-center py-12">
                  <p className="text-gray-400 text-lg">No tournament entries</p>
                  <p className="text-gray-500 mt-2">Enter some tournaments to see your entries here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {myEntries.map((entry: any) => (
                  <Card key={entry.id} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-lg">{entry.tournament?.name || "Tournament"}</CardTitle>
                      <CardDescription>
                        Entry Status: {entry.status}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Division:</span>
                          <span>{getDivisionName(entry.tournament?.division || 1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Entry Fee:</span>
                          <span className="text-red-400">{entry.tournament?.entryFee?.toLocaleString() || 0} credits</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {!tournamentHistory || tournamentHistory.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="text-center py-12">
                  <p className="text-gray-400 text-lg">No tournament history</p>
                  <p className="text-gray-500 mt-2">Complete some tournaments to see your history here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tournamentHistory.map((entry: any) => (
                  <Card key={entry.id} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-lg">{entry.tournament?.name || "Tournament"}</CardTitle>
                      <CardDescription>
                        Final Position: {entry.finalPosition || "N/A"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Division:</span>
                          <span>{getDivisionName(entry.tournament?.division || 1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Rewards:</span>
                          <span className="text-green-400">{entry.rewards?.toLocaleString() || 0} credits</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}