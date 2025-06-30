import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Eye, 
  Users, 
  TrendingUp, 
  MapPin, 
  Calendar,
  Shield,
  Target,
  Star,
  DollarSign,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Team as SharedTeam, ScoutingReport as SharedScoutingReport, Player as SharedPlayer, Staff as SharedStaff } from "shared/schema";

// Client-side specific ScoutingReport
interface ClientScoutingReportPlayerStats {
  speed: string;
  power: string;
  throwing: string;
  catching: string;
  kicking: string;
  stamina: string;
  leadership: string;
  agility: string;
}
interface ClientScoutingReportPlayer {
  id: string;
  firstName: string;
  lastName: string;
  race: string;
  age: number | string;
  position: string;
  stats?: ClientScoutingReportPlayerStats;
  salary?: string;
}

interface ClientScoutingReportStaffRatings {
  offense: number;
  defense: number;
  scouting: number;
  recruiting: number;
}
interface ClientScoutingReportStaff {
  name: string;
  type: string;
  level: number | string;
  salary?: string;
  ratings?: ClientScoutingReportStaffRatings;
}

interface ClientScoutingReportTeamInfo {
  id: string;
  name: string;
  division: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  teamPower: number | string;
}

interface ClientScoutingReportStadium {
  name: string;
  capacity: number | string;
  level: number | string;
  facilities: any;
}

interface ClientScoutingReportFinances {
  estimatedBudget: string;
  salaryCapUsage: string;
}
interface ClientScoutingReport {
  teamInfo: ClientScoutingReportTeamInfo;
  scoutingLevel: number;
  scoutingPower: number;
  confidence: number;
  stadium: ClientScoutingReportStadium | null;
  players: ClientScoutingReportPlayer[];
  staff: ClientScoutingReportStaff[];
  finances: ClientScoutingReportFinances | null;
  notes: string[];
  generatedAt: string;
}

interface ScoutableTeam {
  id: string;
  name: string;
  division: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  scoutingCost: number;
}

interface ScoutableDivisionInfo {
  division: number;
  cost: number;
}

interface ScoutingPageData {
  scoutableDivisions: ScoutableDivisionInfo[];
  teams: ScoutableTeam[];
}


export default function Scouting() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [scoutingReport, setScoutingReport] = useState<ClientScoutingReport | null>(null);
  const { toast } = useToast();

  const scoutingDataQuery = useQuery({
    queryKey: ["scoutableTeamsData"],
    queryFn: (): Promise<ScoutingPageData> => apiRequest("/api/teams/scoutable"),
  });
  const scoutingData = scoutingDataQuery.data as ScoutingPageData | undefined;
  const teamsLoading = scoutingDataQuery.isLoading;

  const reportDataQuery = useQuery({
    queryKey: ["scoutReport", selectedTeam],
    queryFn: (): Promise<ClientScoutingReport> => apiRequest(`/api/teams/${selectedTeam}/scout`),
    enabled: !!selectedTeam,
  });

  const handleScoutTeam = async (teamId: string) => {
    setSelectedTeam(teamId);
    try {
      const { data: fetchedReportData, isSuccess, error } = await reportDataQuery.refetch();

      if (isSuccess && fetchedReportData) {
        setScoutingReport(fetchedReportData);
        toast({
          title: "Scouting Report Generated",
          description: `Intelligence gathered on ${fetchedReportData.teamInfo.name}`,
        });
      } else if (error) {
        throw error;
      }
    } catch (err) {
      toast({
        title: "Scouting Failed",
        description: (err as Error).message || "Unable to gather intelligence on this team.",
        variant: "destructive",
      });
      setScoutingReport(null);
    }
  };

  const getScoutingLevelBadge = (level: number) => {
    const levels: Record<number, { label: string; color: string }> = {
      1: { label: "Basic", color: "bg-gray-500" },
      2: { label: "Decent", color: "bg-blue-500" },
      3: { label: "Good", color: "bg-green-500" },
      4: { label: "Excellent", color: "bg-purple-500" }
    };
    return levels[level] || levels[1];
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-400";
    if (confidence >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getRoleColor = (position: string | undefined) => {
    switch (position?.toLowerCase()) {
      case 'passer': return 'bg-blue-600';
      case 'runner': return 'bg-green-600';
      case 'blocker': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  if (teamsLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-blue-400 animate-spin" />
            <h2 className="text-xl text-gray-300">Scanning for teams...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Team Scouting
          </h1>
          <p className="text-gray-400">
            Gather intelligence on rival teams in your division and beyond
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  Available Targets
                </CardTitle>
                <p className="text-sm text-gray-400">
                  {scoutingData?.scoutableDivisions?.length || 0} divisions accessible
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {scoutingData?.teams?.map((team: ScoutableTeam) => (
                  <div
                    key={team.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedTeam === team.id
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/50'
                    }`}
                    onClick={() => handleScoutTeam(team.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-white">{team.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        Div {team.division}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Record:</span>
                        <span>{team.wins}W-{team.losses}L-{team.draws}D</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Points:</span>
                        <span>{team.points}</span>
                      </div>
                      {team.scoutingCost > 0 && (
                        <div className="flex justify-between">
                          <span>Cost:</span>
                          <span className="text-yellow-400">{team.scoutingCost} credits</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {!scoutingReport && !reportDataQuery.isLoading && (
              <Card className="bg-gray-800 border-gray-700 h-96 flex items-center justify-center">
                <div className="text-center">
                  <Eye className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    Select a Team to Scout
                  </h3>
                  <p className="text-gray-500">
                    Choose a target from the list to begin intelligence gathering
                  </p>
                </div>
              </Card>
            )}
            {reportDataQuery.isLoading && (
              <Card className="bg-gray-800 border-gray-700 h-96 flex items-center justify-center">
                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
              </Card>
            )}
            {scoutingReport && !reportDataQuery.isLoading && (
              <div className="space-y-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl text-white">
                          {scoutingReport.teamInfo.name}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="outline">Division {scoutingReport.teamInfo.division}</Badge>
                          <Badge 
                            className={`${getScoutingLevelBadge(scoutingReport.scoutingLevel).color} text-white`}
                          >
                            {getScoutingLevelBadge(scoutingReport.scoutingLevel).label} Intel
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getConfidenceColor(scoutingReport.confidence)}`}>
                          {scoutingReport.confidence}% Confidence
                        </div>
                        <div className="text-sm text-gray-400">
                          Scouting Power: {scoutingReport.scoutingPower}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{scoutingReport.teamInfo.wins}</div>
                        <div className="text-sm text-gray-400">Wins</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">{scoutingReport.teamInfo.losses}</div>
                        <div className="text-sm text-gray-400">Losses</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">{scoutingReport.teamInfo.draws}</div>
                        <div className="text-sm text-gray-400">Draws</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">{scoutingReport.teamInfo.points}</div>
                        <div className="text-sm text-gray-400">Points</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Tabs defaultValue="players" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 bg-gray-800">
                    <TabsTrigger value="players">Players</TabsTrigger>
                    <TabsTrigger value="staff">Staff</TabsTrigger>
                    <TabsTrigger value="stadium">Stadium</TabsTrigger>
                    <TabsTrigger value="notes">Analysis</TabsTrigger>
                  </TabsList>

                  <TabsContent value="players" className="space-y-4">
                    <Card className="bg-gray-800 border-gray-700">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Player Intelligence
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          {scoutingReport.players.map((player: ClientScoutingReportPlayer, idx) => (
                            <div key={player.id || idx} className="p-4 bg-gray-700 rounded-lg">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-semibold text-white">
                                    {player.firstName} {player.lastName}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className={`${getRoleColor(player.position)} text-white text-xs`}>
                                      {player.position}
                                    </Badge>
                                    <span className="text-sm text-gray-400 capitalize">{player.race}</span>
                                    {player.age !== "Unknown" && (
                                      <span className="text-sm text-gray-400">Age {player.age}</span>
                                    )}
                                  </div>
                                </div>
                                {player.salary && (
                                  <div className="text-right">
                                    <div className="text-sm text-yellow-400">{player.salary}</div>
                                    <div className="text-xs text-gray-400">Salary</div>
                                  </div>
                                )}
                              </div>
                              
                              {player.stats && (
                                <div className="grid grid-cols-4 gap-2 text-sm">
                                  <div className="text-center">
                                    <div className="text-blue-400 font-medium">{player.stats.speed}</div>
                                    <div className="text-gray-400 text-xs">SPD</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-red-400 font-medium">{player.stats.power}</div>
                                    <div className="text-gray-400 text-xs">PWR</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-green-400 font-medium">{player.stats.throwing}</div>
                                    <div className="text-gray-400 text-xs">THR</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-purple-400 font-medium">{player.stats.catching}</div>
                                    <div className="text-gray-400 text-xs">CAT</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="staff" className="space-y-4">
                    <Card className="bg-gray-800 border-gray-700">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="w-5 h-5" />
                          Staff Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {scoutingReport.staff.map((staffMember: ClientScoutingReportStaff, idx) => (
                            <div key={idx} className="p-4 bg-gray-700 rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-semibold text-white">{staffMember.name}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {staffMember.type.replace('_', ' ')}
                                    </Badge>
                                    {staffMember.level !== "Unknown" && (
                                      <span className="text-sm text-gray-400">Level {staffMember.level}</span>
                                    )}
                                  </div>
                                </div>
                                {staffMember.salary && (
                                  <div className="text-right">
                                    <div className="text-sm text-yellow-400">{staffMember.salary}</div>
                                    <div className="text-xs text-gray-400">Salary</div>
                                  </div>
                                )}
                              </div>
                              
                              {staffMember.ratings && (
                                <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
                                  <div className="text-center">
                                    <div className="text-orange-400 font-medium">{staffMember.ratings.offense}</div>
                                    <div className="text-gray-400 text-xs">OFF</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-blue-400 font-medium">{staffMember.ratings.defense}</div>
                                    <div className="text-gray-400 text-xs">DEF</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-purple-400 font-medium">{staffMember.ratings.scouting}</div>
                                    <div className="text-gray-400 text-xs">SCT</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-green-400 font-medium">{staffMember.ratings.recruiting}</div>
                                    <div className="text-gray-400 text-xs">REC</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="stadium" className="space-y-4">
                    <Card className="bg-gray-800 border-gray-700">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="w-5 h-5" />
                          Stadium Intelligence
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {scoutingReport.stadium ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="text-center p-4 bg-gray-700 rounded-lg">
                                <h4 className="font-semibold text-white mb-2">{scoutingReport.stadium.name}</h4>
                                <div className="text-sm text-gray-400">Stadium Name</div>
                              </div>
                              <div className="text-center p-4 bg-gray-700 rounded-lg">
                                <div className="text-xl font-bold text-blue-400">
                                  {typeof scoutingReport.stadium.capacity === 'number' ? scoutingReport.stadium.capacity.toLocaleString() : scoutingReport.stadium.capacity}
                                </div>
                                <div className="text-sm text-gray-400">Capacity</div>
                              </div>
                              <div className="text-center p-4 bg-gray-700 rounded-lg">
                                <div className="text-xl font-bold text-green-400">
                                  {scoutingReport.stadium.level}
                                </div>
                                <div className="text-sm text-gray-400">Level</div>
                              </div>
                            </div>
                            
                            {scoutingReport.stadium.facilities && scoutingReport.stadium.facilities !== "Unknown" && (
                              <div className="p-4 bg-gray-700 rounded-lg">
                                <h5 className="font-semibold text-white mb-2">Facilities</h5>
                                <div className="text-sm text-gray-300 whitespace-pre-wrap">
                                  {typeof scoutingReport.stadium.facilities === 'object' 
                                    ? JSON.stringify(scoutingReport.stadium.facilities, null, 2)
                                    : String(scoutingReport.stadium.facilities)
                                  }
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 py-8">
                            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No stadium information available</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-4">
                    <Card className="bg-gray-800 border-gray-700">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5" />
                          Strategic Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {scoutingReport.notes.map((note, idx) => (
                            <div key={idx} className="p-3 bg-gray-700 rounded-lg border-l-4 border-blue-500">
                              <p className="text-gray-300">{note}</p>
                            </div>
                          ))}
                        </div>
                        
                        {scoutingReport.finances && (
                          <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                            <h5 className="font-semibold text-white mb-3 flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              Financial Assessment
                            </h5>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-400">Estimated Budget:</span>
                                <span className="ml-2 text-yellow-400">{scoutingReport.finances.estimatedBudget}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Salary Cap Usage:</span>
                                <span className="ml-2 text-yellow-400">{scoutingReport.finances.salaryCapUsage}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-4 text-xs text-gray-500 text-center">
                          Report generated at {new Date(scoutingReport.generatedAt).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}