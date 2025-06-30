import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// import { Progress } from "@/components/ui/progress"; // Not used
import { Users, Trophy, /* TrendingUp, Star, Shield */ } from "lucide-react"; // TrendingUp, Star, Shield not used
import { apiRequest } from "@/lib/queryClient";
import { Team, Player } from "shared/schema";

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

  // Check if this is an opponent team (not user's team)
  const isOpponentTeam = myTeam?.id !== teamId;
  
  // Basic scouting level - for now we'll use a fixed level, later can be enhanced with staff
  const scoutingLevel: ScoutingLevel = 1; // 1 = basic, 2 = advanced, 3 = elite

  // Scouting functions to show stat ranges instead of exact values for opponents
  const getStatRange = (actualStat: number | null | undefined, currentScoutingLevel: ScoutingLevel): string => {
    const statValue = actualStat ?? 0;
    if (!isOpponentTeam) return statValue.toString(); // Show exact for own team
    
    let variance = 0;
    switch (currentScoutingLevel) {
      case 1: variance = 6; break;  // ±6 range (e.g., 25 shows as "19-31")
      case 2: variance = 3; break;  // ±3 range (e.g., 25 shows as "22-28")
      case 3: variance = 1; break;  // ±1 range (e.g., 25 shows as "24-26")
      default: variance = 6;
    }
    
    const min = Math.max(1, statValue - variance);
    const max = Math.min(40, statValue + variance);
    return `${min}-${max}`;
  };

  const getScoutedPlayerName = (player: Player, currentScoutingLevel: ScoutingLevel): string => {
    if (!isOpponentTeam) {
      return `${player.firstName} ${player.lastName}`;
    }
    
    // For opponents, show varying levels of name detail based on scouting
    switch (currentScoutingLevel) {
      case 1: return `${player.firstName} ${player.lastName?.charAt(0) ?? ''}.`; // "John D."
      case 2: return `${player.firstName} ${player.lastName}`;  // Full name
      case 3: return `${player.firstName} ${player.lastName}`;  // Full name + more details
      default: return `${player.firstName} ${player.lastName?.charAt(0) ?? ''}.`;
    }
  };

  const getPositionColor = (position: string | null | undefined) => {
    switch (position) {
      case "Passer":
        return "bg-blue-500";
      case "Runner":
        return "bg-green-500";
      case "Blocker":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getRaceColor = (race: string | null | undefined) => {
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

  const calculatePlayerPower = (player: Player): number => {
    return (player.speed ?? 0) + (player.power ?? 0) + (player.throwing ?? 0) + (player.catching ?? 0) + (player.kicking ?? 0);
  };

  const getStatColor = (stat: number | null | undefined) => {
    const statValue = stat ?? 0;
    if (statValue >= 32) return "text-green-400";
    if (statValue <= 18) return "text-red-400";
    return "text-white";
  };

  const isLoading = teamInfoLoading || playersLoading || myTeamLoading;

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
          <div className="space-y-6">
            {/* Team Overview */}
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  {teamInfo.name ?? 'Unknown Team'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{teamInfo.wins ?? 0}</div>
                    <div className="text-sm text-gray-400">Wins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{teamInfo.losses ?? 0}</div>
                    <div className="text-sm text-gray-400">Losses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{teamInfo.draws ?? 0}</div>
                    <div className="text-sm text-gray-400">Draws</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{teamInfo.points ?? 0}</div>
                    <div className="text-sm text-gray-400">Points</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-600">
                  <Badge variant="outline" className="text-purple-400 border-purple-400">
                    Division {teamInfo.division ?? 'N/A'}
                  </Badge>
                  <div className="text-sm text-gray-400">
                    Team Power: <span className="text-white font-bold">{teamInfo.teamPower ?? "N/A"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Players Roster */}
            {players && players.length > 0 && (
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Roster ({players.length} players)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {players.map((player: Player) => { // Typed player
                      const playerPower = calculatePlayerPower(player);
                      return (
                        <div key={player.id} className="bg-gray-600 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-semibold text-white">
                                {getScoutedPlayerName(player, scoutingLevel)}
                              </div>
                              <div className="text-sm text-gray-400">
                                Age {player.age ?? 'N/A'} • <span className={getRaceColor(player.race)}>{(player.race?.charAt(0).toUpperCase() ?? '') + (player.race?.slice(1) ?? 'Unknown')}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getPositionColor(player.position ?? "Player")}>
                                {player.position ?? "Player"}
                              </Badge>
                              <div className="text-right">
                                <div className="text-sm font-bold text-white">
                                  {isOpponentTeam ? getStatRange(playerPower, scoutingLevel) : playerPower.toString()}
                                </div>
                                <div className="text-xs text-gray-400">Power</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Player Stats */}
                          <div className="grid grid-cols-5 gap-2 text-xs">
                            <div className="text-center">
                              <div className={`font-bold ${getStatColor(player.speed)}`}>
                                {getStatRange(player.speed, scoutingLevel)}
                              </div>
                              <div className="text-gray-400">SPD</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold ${getStatColor(player.power)}`}>
                                {getStatRange(player.power, scoutingLevel)}
                              </div>
                              <div className="text-gray-400">POW</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold ${getStatColor(player.throwing)}`}>
                                {getStatRange(player.throwing, scoutingLevel)}
                              </div>
                              <div className="text-gray-400">THR</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold ${getStatColor(player.catching)}`}>
                                {getStatRange(player.catching, scoutingLevel)}
                              </div>
                              <div className="text-gray-400">CAT</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold ${getStatColor(player.kicking)}`}>
                                {getStatRange(player.kicking, scoutingLevel)}
                              </div>
                              <div className="text-gray-400">KIC</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center">
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