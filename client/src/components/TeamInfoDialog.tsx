import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, Trophy, TrendingUp, Star, Shield, ChevronDown, DollarSign, Home, Building } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
// Define interfaces for team info dialog
interface Team {
  id: string;
  name: string;
  division: number;
  subdivision?: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  goalDifference: number;
  teamPower: number;
  teamCamaraderie: number;
  credits: number;
  userProfileId?: string;
  logoUrl?: string;
  fanLoyalty?: number;
  homeField?: string;
  tacticalFocus?: string;
  leagueId?: string;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  race: string;
  role: string;
  age: number;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  stamina: number;
  leadership: number;
  agility: number;
}

// Helper function to get division name with subdivision
const getDivisionNameWithSubdivision = (division: number, subdivision?: string) => {
  const divisionNames = {
    1: "Diamond League",
    2: "Platinum League", 
    3: "Gold League",
    4: "Silver League",
    5: "Bronze League",
    6: "Iron League",
    7: "Steel League",
    8: "Copper League"
  };
  
  const baseName = divisionNames[division as keyof typeof divisionNames] || `Division ${division}`;
  
  if (!subdivision || subdivision === "main") {
    return baseName;
  }
  
  // Map subdivision to display names
  const subdivisionNames = {
    "alpha": "Alpha",
    "beta": "Beta", 
    "gamma": "Gamma",
    "delta": "Delta",
    "epsilon": "Epsilon",
    "zeta": "Zeta",
    "eta": "Eta",
    "theta": "Theta",
    "iota": "Iota",
    "kappa": "Kappa"
  };
  
  const subdivisionName = subdivisionNames[subdivision as keyof typeof subdivisionNames] || subdivision;
  return `${baseName} - ${subdivisionName}`;
};

interface TeamInfoDialogProps {
  teamId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

type ScoutingLevel = 1 | 2 | 3;

export default function TeamInfoDialog({ teamId, isOpen, onClose }: TeamInfoDialogProps) {
  const { data: teamInfo, isLoading: teamInfoLoading, error: teamInfoError } = useQuery<Team, Error>({
    queryKey: [`/api/teams/${teamId}`],
    queryFn: () => apiRequest(`/api/teams/${teamId}`),
    enabled: !!teamId && isOpen,
  });

  const { data: players, isLoading: playersLoading, error: playersError } = useQuery<Player[], Error>({
    queryKey: [`/api/teams/${teamId}/players`],
    queryFn: () => apiRequest(`/api/teams/${teamId}/players`),
    enabled: !!teamId && isOpen,
  });

  const { data: myTeam, isLoading: myTeamLoading, error: myTeamError } = useQuery<Team, Error>({
    queryKey: ["/api/teams/my"],
    queryFn: () => apiRequest("/api/teams/my"),
    enabled: isOpen,
  });

  // Fetch team finances for salary calculations
  const { data: teamFinances } = useQuery({
    queryKey: [`/api/teams/${teamId}/finances`],
    queryFn: () => apiRequest(`/api/teams/${teamId}/finances`),
    enabled: !!teamId && isOpen,
  });

  // Fetch stadium data for facilities overview
  const { data: stadium } = useQuery({
    queryKey: [`/api/teams/${teamId}/stadium`],
    queryFn: () => apiRequest(`/api/teams/${teamId}/stadium`),
    enabled: !!teamId && isOpen,
  });

  // Fetch staff data for salary calculations
  const { data: staff } = useQuery({
    queryKey: [`/api/teams/${teamId}/staff`],
    queryFn: () => apiRequest(`/api/teams/${teamId}/staff`),
    enabled: !!teamId && isOpen,
  });

  // Check if this is an opponent team (not user's team)
  const isOpponentTeam = myTeam?.id !== teamId;
  
  // Basic scouting level - for now we'll use a fixed level, later can be enhanced with staff
  const scoutingLevel: ScoutingLevel = 1; // 1 = basic, 2 = advanced, 3 = elite

  // Calculate team financials (staff + player salaries)
  const calculateTeamSalaries = () => {
    let totalPlayerSalaries = 0;
    let totalStaffSalaries = 0;

    // Sum player salaries - use Contract data if available or fallback to teamFinances
    if (players) {
      players.forEach(player => {
        // Contract data might be in player.contracts array or separate contracts array
        // @ts-expect-error TS2339
        const salary = player.contract?.salary || player.contracts?.[0]?.salary || 15000; // Default salary fallback
        totalPlayerSalaries += salary;
      });
    }

    // Sum staff salaries - use Contract data if available
    if (staff) {
      // @ts-expect-error TS2339
      staff.forEach((staffMember: any) => {
        // Staff contracts might be structured differently
        const salary = staffMember.contract?.salary || staffMember.contracts?.[0]?.salary || 8000; // Default staff salary fallback  
        totalStaffSalaries += salary;
      });
    }

    // Use teamFinances data if available for more accurate calculations
    if (teamFinances) {
      return {
        // @ts-expect-error TS2339
        totalPlayerSalaries: teamFinances.playerSalaries || totalPlayerSalaries,
        // @ts-expect-error TS2339
        totalStaffSalaries: teamFinances.staffSalaries || totalStaffSalaries,
        // @ts-expect-error TS2339
        totalSalaries: teamFinances.playerSalaries + teamFinances.staffSalaries || totalPlayerSalaries + totalStaffSalaries
      };
    }

    return {
      totalPlayerSalaries,
      totalStaffSalaries,
      totalSalaries: totalPlayerSalaries + totalStaffSalaries
    };
  };

  // Calculate team camaraderie from player scores
  const calculateTeamCamaraderie = () => {
    if (!players || players.length === 0) return 50; // Default fallback
    
    const totalCamaraderie = players.reduce((sum, player) => {
      // @ts-expect-error TS2339
      return sum + (player.camaraderieScore || 50);
    }, 0);
    
    return Math.round(totalCamaraderie / players.length);
  };

  // Scouting functions to show stat ranges instead of exact values for opponents
  const getStatRange = (actualStat: number | null | undefined, currentScoutingLevel: ScoutingLevel): string => {
    const statValue = actualStat ?? 0;
    if (!isOpponentTeam) return statValue.toFixed(1); // Show exact for own team
    
    let variance = 0;
    switch (currentScoutingLevel) {
      case 1: variance = 5; break;  // ±5 range for Power (e.g., 30.8 shows as "26-31")
      case 2: variance = 3; break;  // ±3 range (e.g., 30.8 shows as "28-34")
      case 3: variance = 1; break;  // ±1 range (e.g., 30.8 shows as "30-32")
      default: variance = 5;
    }
    
    const min = Math.max(1, Math.floor(statValue - variance));
    const max = Math.min(40, Math.ceil(statValue + variance));
    return `${min}-${max}`;
  };



  const getPositionColor = (role: string) => {
    switch (role) {
      case "PASSER":
        return "bg-blue-500";
      case "RUNNER":
        return "bg-green-500";
      case "BLOCKER":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPositionLabel = (role: string) => {
    switch (role?.toUpperCase()) {
      case "PASSER":
        return "Passer";
      case "RUNNER":
        return "Runner";
      case "BLOCKER":
        return "Blocker";
      default:
        return "Player";
    }
  };

  const getRaceLabel = (race: string) => {
    // Proper capitalization: "Lumina" not "LUMINA"
    if (!race) return "Unknown";
    return race.charAt(0).toUpperCase() + race.slice(1).toLowerCase();
  };

  const getScoutedPlayerName = (player: any) => {
    // For now, show full names - later can be enhanced with scouting levels
    // With higher scouting levels, could show partial names or pseudonyms
    if (!player) return "Unknown Player";
    return `${player.firstName || "Unknown"} ${player.lastName || "Player"}`;
  };

  const getRaceColor = (race: string) => {
    switch (race) {
      case "Human":
        return "text-blue-400";
      case "Sylvan":
        return "text-green-400";
      case "Gryll":
        return "text-red-400";
      case "Lumina":
        return "text-yellow-400";
      case "Umbra":
        return "text-purple-400";
      default:
        return "text-gray-400";
    }
  };

  const calculatePlayerPower = (player: any) => {
    // Calculate CAR (Core Athleticism Rating) as per game mechanics - average of 6 core attributes
    const totalStats = (player.speed || 0) + (player.power || 0) + (player.throwing || 0) + 
                      (player.catching || 0) + (player.kicking || 0) + (player.agility || 0);
    return totalStats / 6; // Use exact calculation for precision
  };

  const getStatColor = (stat: number | null | undefined) => {
    const statValue = stat ?? 0;
    if (statValue >= 32) return "text-green-400";
    if (statValue <= 18) return "text-red-400";
    return "text-white";
  };

  const isLoading = teamInfoLoading || playersLoading || myTeamLoading;
  
  // Get top 3 players by power for Key Players section
  const topPlayers = players 
    ? [...players]
        .sort((a, b) => calculatePlayerPower(b) - calculatePlayerPower(a))
        .slice(0, 3)
    : [];

  const salaries = calculateTeamSalaries();
  const teamCamaraderie = calculateTeamCamaraderie();

  if (!teamId) return null;
  // Handle errors from queries
  if (teamInfoError || playersError || myTeamError) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Error</DialogTitle>
          </DialogHeader>
          <p className="text-red-400">Could not load team information. Please try again.</p>
          <Button onClick={onClose}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6" />
            Team Information
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 p-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-20 bg-gray-700 rounded-lg animate-pulse"></div>
            ))}
          </div>

        ) : teamInfo ? (
          <div className="space-y-4">
            {/* Team Header with Key Stats */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                <Users className="h-6 w-6 text-purple-400" />
                {teamInfo.name}
              </h2>
              <div className="text-sm text-gray-400">
                {getDivisionNameWithSubdivision(teamInfo.division, teamInfo.subdivision)} | Record {teamInfo.wins}-{teamInfo.losses}-{teamInfo.draws} | Pts {teamInfo.points}
              </div>
            </div>

            {/* Top Stats Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center bg-gray-700/50 rounded-lg p-3">
                <div className="text-xl font-bold text-blue-400">{teamInfo.teamPower || "N/A"}</div>
                <div className="text-xs text-gray-400 uppercase">Team Power</div>
              </div>
              <div className="text-center bg-gray-700/50 rounded-lg p-3">
                {/*
                 // @ts-expect-error TS2339 */}
                <div className="text-xl font-bold text-yellow-400">#{teamInfo.globalRank || "33"}</div>
                <div className="text-xs text-gray-400 uppercase">Global Rank</div>
              </div>
              <div className="text-center bg-gray-700/50 rounded-lg p-3">
                <div className="text-xl font-bold text-green-400">{teamInfo.fanLoyalty || "50"}</div>
                <div className="text-xs text-gray-400 uppercase">Fan Loyalty</div>
              </div>
              <div className="text-center bg-gray-700/50 rounded-lg p-3">
                <div className="text-xl font-bold text-purple-400">60%</div>
                <div className="text-xs text-gray-400 uppercase">Attendance</div>
              </div>
            </div>

            {/* Key Players Section */}
            <Collapsible defaultOpen className="space-y-2">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span className="font-medium text-white">Key Players</span>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="bg-gray-700/30 border-gray-600">
                  <CardContent className="p-4 space-y-3">
                    {topPlayers.map((player, index) => {
                      const playerPower = calculatePlayerPower(player);
                      return (
                        <div key={player.id} className="flex items-center justify-between bg-gray-600/50 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{getScoutedPlayerName(player)}</div>
                              <div className="text-sm text-gray-400">
                                {getPositionLabel(player.role)} • Age {player.age} • {getRaceLabel(player.race)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-white">
                              {isOpponentTeam ? getStatRange(playerPower, scoutingLevel) : playerPower.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-400">Power</div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Team Financials Section */}
            <Collapsible className="space-y-2">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 transition-colors">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-400" />
                  <span className="font-medium text-white">Team Financials</span>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="bg-gray-700/30 border-gray-600">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Salary Expenditure:</span>
                      <span className="text-white font-semibold">₡{salaries.totalSalaries.toLocaleString()}/season</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Average Salary/Player:</span>
                      <span className="text-white">₡{players?.length ? Math.round(salaries.totalPlayerSalaries / players.length).toLocaleString() : 0}</span>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Stadium Overview Section */}
            <Collapsible className="space-y-2">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-purple-400" />
                  <span className="font-medium text-white">Stadium Overview</span>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="bg-gray-700/30 border-gray-600">
                  <CardContent className="p-4 space-y-4">
                    {/* Capacity and Fan Info */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400">Capacity:</span>
                        {/*
                         // @ts-expect-error TS2339 */}
                        <span className="text-white font-semibold">{stadium?.capacity?.toLocaleString() || "5,000"}</span>
                      </div>
                      {/*
                       // @ts-expect-error TS2339 */}
                      <Progress value={((stadium?.capacity || 5000) / 40000) * 100} className="h-2 mb-2" />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Fan Loyalty:</span>
                          <span className="text-white ml-2">{teamInfo.fanLoyalty || 50}/100</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Attendance Rate:</span>
                          <span className="text-white ml-2">60%</span>
                        </div>
                      </div>
                    </div>

                    {/* Facilities Grid - 3x2 Layout */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center bg-gray-600/50 rounded p-2">
                        <div className="text-white font-semibold">Concessions</div>
                        {/*
                         // @ts-expect-error TS2339 */}
                        <div className="text-gray-400 text-sm">Level {stadium?.concessionsLevel || 1}</div>
                      </div>
                      <div className="text-center bg-gray-600/50 rounded p-2">
                        <div className="text-white font-semibold">Parking</div>
                        {/*
                         // @ts-expect-error TS2339 */}
                        <div className="text-gray-400 text-sm">Level {stadium?.parkingLevel || 1}</div>
                      </div>
                      <div className="text-center bg-gray-600/50 rounded p-2">
                        <div className="text-white font-semibold">VIP Suites</div>
                        {/*
                         // @ts-expect-error TS2339 */}
                        <div className="text-gray-400 text-sm">Level {stadium?.vipSuitesLevel || 0}</div>
                      </div>
                      <div className="text-center bg-gray-600/50 rounded p-2">
                        <div className="text-white font-semibold">Merchandise</div>
                        {/*
                         // @ts-expect-error TS2339 */}
                        <div className="text-gray-400 text-sm">Level {stadium?.merchandisingLevel || 1}</div>
                      </div>
                      <div className="text-center bg-gray-600/50 rounded p-2">
                        <div className="text-white font-semibold">Lighting</div>
                        {/*
                         // @ts-expect-error TS2339 */}
                        <div className="text-gray-400 text-sm">Level {stadium?.lightingScreensLevel || 1}</div>
                      </div>
                      <div className="text-center bg-gray-600/50 rounded p-2">
                        <div className="text-white font-semibold">Team Camaraderie</div>
                        <div className="text-white text-sm font-semibold">{teamCamaraderie}/100</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex justify-center pt-4">
              <Button onClick={onClose} variant="outline" className="border-gray-600 text-gray-300">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400">Team information not available</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}