import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import type { Team as SharedTeam, Tournament as SharedTournament, TournamentEntry as SharedTournamentEntry } from "shared/schema";

// Define interfaces for the page data
interface PrizeInfo {
  first?: number;
  second?: number;
  // Add other prize places if applicable
}

interface ClientTournament extends SharedTournament {
  prizes: PrizeInfo | null; // prizes from schema is not optional, but can be null if DB stores it so
}

interface MyTournamentEntry extends SharedTournamentEntry {
  tournament?: ClientTournament | null; // Tournament details might be nested
  status?: string; // Status of the entry itself, or from the joined tournament
}

interface TournamentHistoryEntry extends SharedTournamentEntry {
  tournament?: ClientTournament | null;
  finalPosition?: number | string | null; // Can be number or string like "N/A"
  rewards?: number | null;
}

interface EnterTournamentResponse {
  success: boolean;
  message?: string;
  // Potentially other fields like updated entry list or finances
}


export default function TournamentsPage() { // Renamed component
  const { toast } = useToast();
  const [selectedDivision, setSelectedDivision] = useState<number>(8); // Default to a valid division

  const teamQuery = useQuery({
    queryKey: ["myTeam"],
    queryFn: (): Promise<SharedTeam> => apiRequest("/api/teams/my"),
  });
  const team = teamQuery.data as SharedTeam | undefined;

  const tournamentsQuery = useQuery({
    queryKey: ["tournaments", selectedDivision],
    queryFn: (): Promise<ClientTournament[]> => apiRequest(`/api/tournaments?division=${selectedDivision}`),
  });
  const tournaments = tournamentsQuery.data as ClientTournament[] | undefined;
  const tournamentsLoading = tournamentsQuery.isLoading;

  const myEntriesQuery = useQuery({
    queryKey: ["myTournamentEntries"],
    queryFn: (): Promise<MyTournamentEntry[]> => apiRequest("/api/tournaments/my-entries"),
  });
  const myEntries = myEntriesQuery.data as MyTournamentEntry[] | undefined;

  const tournamentHistoryQuery = useQuery({
    queryKey: ["tournamentHistory"],
    queryFn: (): Promise<TournamentHistoryEntry[]> => apiRequest("/api/tournaments/history"),
  });
  const tournamentHistory = tournamentHistoryQuery.data as TournamentHistoryEntry[] | undefined;

  const enterTournamentMutation = useMutation({
    mutationFn: async (tournamentId: string): Promise<EnterTournamentResponse> => {
      // Corrected apiRequest call: method is 2nd arg, body is 3rd.
      // If no body, pass undefined or null for the third argument.
      return apiRequest<EnterTournamentResponse>(`/api/tournaments/${tournamentId}/enter`, "POST");
    },
    onSuccess: (data: EnterTournamentResponse) => {
      toast({
        title: data.success ? "Tournament Entry Successful" : "Entry Information",
        description: data.message || "You've successfully entered the tournament!",
      });
      queryClient.invalidateQueries({ queryKey: ["tournaments", selectedDivision] });
      queryClient.invalidateQueries({ queryKey: ["myTournamentEntries"] });
      queryClient.invalidateQueries({ queryKey: ["myTeamFinances"] }); // Invalidate finances as entry might cost
    },
    onError: (error: Error) => {
      toast({
        title: "Entry Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getDivisionName = (division: number | null | undefined): string => {
    if (division === null || division === undefined) return "N/A";
    const names: Record<number, string> = {
      1: "Diamond Division", 2: "Ruby Division", 3: "Emerald Division",
      4: "Sapphire Division", 5: "Gold Division", 6: "Silver Division",
      7: "Bronze Division", 8: "Iron Division"
    };
    return names[division] || `Division ${division}`;
  };

  const getStatusColor = (status: string | null | undefined): string => {
    switch (status) {
      case "open": return "bg-green-500";
      case "in_progress": return "bg-yellow-500";
      case "completed": return "bg-gray-500";
      default: return "bg-blue-500";
    }
  };

  // Set selectedDivision to team's division once team data is loaded
  useEffect(() => {
    if (team?.division) {
      setSelectedDivision(team.division);
    }
  }, [team?.division]);


  if (teamQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
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
            <div className="flex flex-wrap gap-2 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].filter(division => {
                const teamDivision = team?.division ?? 8; // Default to 8 if team.division is null/undefined
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
                  <p className="text-gray-400 text-lg">No tournaments available for {getDivisionName(selectedDivision)}</p>
                  <p className="text-gray-500 mt-2">Check back later or select a different division.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tournaments.map((tournament: ClientTournament) => (
                  <Card key={tournament.id} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{tournament.name}</CardTitle>
                        <Badge className={`${getStatusColor(tournament.status)} text-white`}>
                          {tournament.status?.replace("_", " ").toUpperCase()}
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
                            {(tournament.entryFee ?? 0).toLocaleString()} credits
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Max Teams:</span>
                          <span>{tournament.maxTeams ?? 'N/A'}</span>
                        </div>

                        <div className="space-y-2">
                          <span className="text-sm text-gray-400">Prizes:</span>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span>🥇 1st Place:</span>
                              <span className="text-yellow-400">{(tournament.prizes?.first ?? 0).toLocaleString()} credits</span>
                            </div>
                            <div className="flex justify-between">
                              <span>🥈 2nd Place:</span>
                              <span className="text-gray-300">{(tournament.prizes?.second ?? 0).toLocaleString()} credits</span>
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
                            myEntries?.some((entry: MyTournamentEntry) => entry.tournamentId === tournament.id)
                          }
                          onClick={() => enterTournamentMutation.mutate(tournament.id)}
                        >
                          {enterTournamentMutation.isPending 
                            ? "Entering..." 
                            : myEntries?.some((entry: MyTournamentEntry) => entry.tournamentId === tournament.id)
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
            {myEntriesQuery.isLoading ? (
              <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>
            ) : !myEntries || myEntries.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="text-center py-12">
                  <p className="text-gray-400 text-lg">No tournament entries</p>
                  <p className="text-gray-500 mt-2">Enter some tournaments to see your entries here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {myEntries.map((entry: MyTournamentEntry) => (
                  <Card key={entry.id} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-lg">{entry.tournament?.name || "Tournament"}</CardTitle>
                      <CardDescription>
                        Entry Status: {entry.status || entry.tournament?.status?.replace("_", " ").toUpperCase() || "PENDING"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Division:</span>
                          <span>{getDivisionName(entry.tournament?.division)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Entry Fee:</span>
                          <span className="text-red-400">{(entry.tournament?.entryFee ?? 0).toLocaleString()} credits</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {tournamentHistoryQuery.isLoading ? (
              <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>
            ) :!tournamentHistory || tournamentHistory.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="text-center py-12">
                  <p className="text-gray-400 text-lg">No tournament history</p>
                  <p className="text-gray-500 mt-2">Complete some tournaments to see your history here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tournamentHistory.map((entry: TournamentHistoryEntry) => (
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
                          <span>{getDivisionName(entry.tournament?.division)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Rewards:</span>
                          <span className="text-green-400">{(entry.rewards ?? 0).toLocaleString()} credits</span>
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