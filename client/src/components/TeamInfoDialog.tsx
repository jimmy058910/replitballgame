import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, Trophy, TrendingUp, Star, Shield } from "lucide-react";

interface TeamInfoDialogProps {
  teamId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TeamInfoDialog({ teamId, isOpen, onClose }: TeamInfoDialogProps) {
  const { data: teamInfo, isLoading } = useQuery({
    queryKey: [`/api/teams/${teamId}`],
    enabled: !!teamId && isOpen,
  });

  const { data: players } = useQuery({
    queryKey: [`/api/teams/${teamId}/players`],
    enabled: !!teamId && isOpen,
  });

  const getPositionColor = (position: string) => {
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
    return player.speed + player.power + player.throwing + player.catching + player.kicking;
  };

  const getStatColor = (stat: number) => {
    if (stat >= 32) return "text-green-400";
    if (stat <= 18) return "text-red-400";
    return "text-white";
  };

  if (!teamId) return null;

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
          <div className="space-y-4">
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
                  {teamInfo.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{teamInfo.wins}</div>
                    <div className="text-sm text-gray-400">Wins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{teamInfo.losses}</div>
                    <div className="text-sm text-gray-400">Losses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{teamInfo.draws}</div>
                    <div className="text-sm text-gray-400">Draws</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{teamInfo.points}</div>
                    <div className="text-sm text-gray-400">Points</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-600">
                  <Badge variant="outline" className="text-purple-400 border-purple-400">
                    Division {teamInfo.division}
                  </Badge>
                  <div className="text-sm text-gray-400">
                    Team Power: <span className="text-white font-bold">{teamInfo.teamPower || "N/A"}</span>
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
                    {players.map((player: any) => {
                      const playerPower = calculatePlayerPower(player);
                      return (
                        <div key={player.id} className="bg-gray-600 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-semibold text-white">
                                {player.firstName} {player.lastName}
                              </div>
                              <div className="text-sm text-gray-400">
                                Age {player.age} • <span className={getRaceColor(player.race)}>{player.race}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getPositionColor(player.position || "Unknown")}>
                                {player.position || "Unknown"}
                              </Badge>
                              <div className="text-right">
                                <div className="text-sm font-bold text-white">{playerPower}</div>
                                <div className="text-xs text-gray-400">Power</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Player Stats */}
                          <div className="grid grid-cols-5 gap-2 text-xs">
                            <div className="text-center">
                              <div className={`font-bold ${getStatColor(player.speed)}`}>
                                {player.speed}
                              </div>
                              <div className="text-gray-400">SPD</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold ${getStatColor(player.power)}`}>
                                {player.power}
                              </div>
                              <div className="text-gray-400">POW</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold ${getStatColor(player.throwing)}`}>
                                {player.throwing}
                              </div>
                              <div className="text-gray-400">THR</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold ${getStatColor(player.catching)}`}>
                                {player.catching}
                              </div>
                              <div className="text-gray-400">CAT</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold ${getStatColor(player.kicking)}`}>
                                {player.kicking}
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