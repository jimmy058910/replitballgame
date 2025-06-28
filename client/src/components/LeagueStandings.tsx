import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TeamInfoDialog from "@/components/TeamInfoDialog";
import { getDivisionName, getDivisionInfo, getFullDivisionTitle } from "@shared/divisions";

interface LeagueStandingsProps {
  division: number;
  compact?: boolean; // For Dashboard condensed version
}

export default function LeagueStandings({ division, compact = false }: LeagueStandingsProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: standings, isLoading } = useQuery({
    queryKey: [`/api/leagues/${division}/standings`],
  });

  // Ensure standings is an array
  const standingsArray = Array.isArray(standings) ? standings : [];

  const handleTeamClick = (teamId: string) => {
    setSelectedTeamId(teamId);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedTeamId(null);
  };

  // Compact version for Dashboard
  if (compact) {
    return (
      <>
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center space-x-3 p-2 bg-gray-700 rounded animate-pulse">
                  <div className="w-6 h-6 bg-gray-600 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-600 rounded mb-1"></div>
                    <div className="h-2 bg-gray-600 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : standingsArray && standingsArray.length > 0 ? (
            standingsArray.slice(0, 6).map((team: any) => {
              const isPlayerTeam = team.name === "Macomb Cougars";
              const rank = team.rank || 1;
              
              return (
                <div 
                  key={team.id} 
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                    rank === 1 
                      ? "bg-yellow-500 bg-opacity-10 border border-yellow-500 border-opacity-30"
                      : isPlayerTeam
                        ? "bg-blue-500 bg-opacity-20 border border-blue-500 border-opacity-30"
                        : "bg-gray-700"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                      rank === 1 ? "bg-yellow-500" : "bg-gray-600"
                    }`}>
                      {rank}
                    </div>
                    <div>
                      <div 
                        className={`font-medium text-sm cursor-pointer hover:underline ${
                          isPlayerTeam ? "text-blue-400" : "text-white"
                        }`}
                        onClick={() => handleTeamClick(team.id)}
                      >
                        {team.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {team.wins || 0}-{team.losses || 0}-{team.ties || 0}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-yellow-400">{team.points || 0}</div>
                    <div className="text-xs text-gray-400">pts</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm">No standings available</p>
            </div>
          )}
        </div>

        <TeamInfoDialog 
          teamId={selectedTeamId}
          isOpen={isDialogOpen}
          onClose={closeDialog}
        />
      </>
    );
  }

  // Full comprehensive standings table for League page
  return (
    <>
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="font-orbitron flex items-center justify-between">
            <span>{getDivisionName(division)} Standings</span>
            <Badge variant="outline" className="text-xs">
              Season Rankings
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="grid grid-cols-9 gap-4 p-3 bg-gray-700 rounded-lg animate-pulse">
                  <div className="h-4 bg-gray-600 rounded"></div>
                  <div className="h-4 bg-gray-600 rounded col-span-2"></div>
                  <div className="h-4 bg-gray-600 rounded"></div>
                  <div className="h-4 bg-gray-600 rounded"></div>
                  <div className="h-4 bg-gray-600 rounded"></div>
                  <div className="h-4 bg-gray-600 rounded"></div>
                  <div className="h-4 bg-gray-600 rounded"></div>
                  <div className="h-4 bg-gray-600 rounded"></div>
                </div>
              ))}
            </div>
          ) : standingsArray && standingsArray.length > 0 ? (
            <>
              {/* Table Header */}
              <div className="grid grid-cols-9 gap-4 mb-3 px-3 py-2 bg-gray-700 rounded-lg font-semibold text-sm text-gray-300">
                <div className="text-center">RANK</div>
                <div className="col-span-2">TEAM</div>
                <div className="text-center">W/L/T</div>
                <div className="text-center">PTS</div>
                <div className="text-center">PF</div>
                <div className="text-center">PA</div>
                <div className="text-center">DIFF</div>
                <div className="text-center">STREAK</div>
              </div>

              {/* Team Rows */}
              <div className="space-y-1">
                {standingsArray.map((team: any) => {
                  const isPlayerTeam = team.name === "Macomb Cougars";
                  const rank = team.rank || 1;
                  const pointDiff = (team.pointsFor || 0) - (team.pointsAgainst || 0);
                  
                  return (
                    <div 
                      key={team.id} 
                      className={`grid grid-cols-9 gap-4 p-3 rounded-lg transition-colors ${
                        rank === 1 
                          ? "bg-yellow-500 bg-opacity-10 border border-yellow-500 border-opacity-30"
                          : isPlayerTeam
                            ? "bg-blue-500 bg-opacity-20 border border-blue-500 border-opacity-30"
                            : "bg-gray-700 hover:bg-gray-650"
                      }`}
                    >
                      {/* Rank */}
                      <div className="flex items-center justify-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          rank === 1 ? "bg-yellow-500" : rank <= 2 ? "bg-green-500" : rank >= standingsArray.length - 1 ? "bg-red-500" : "bg-gray-600"
                        }`}>
                          {rank}
                        </div>
                      </div>

                      {/* Team Name */}
                      <div className="col-span-2 flex items-center">
                        <div 
                          className={`font-semibold cursor-pointer hover:underline ${
                            isPlayerTeam ? "text-blue-400" : "text-white"
                          }`}
                          onClick={() => handleTeamClick(team.id)}
                          title="Click to view team info"
                        >
                          {team.name}
                          {rank === 1 && <span className="ml-2 text-yellow-400">👑</span>}
                        </div>
                      </div>

                      {/* W/L/T Record */}
                      <div className="flex items-center justify-center">
                        <span className="text-sm font-mono">
                          <span className="text-green-400">{team.wins || 0}</span>/
                          <span className="text-red-400">{team.losses || 0}</span>/
                          <span className="text-yellow-400">{team.ties || 0}</span>
                        </span>
                      </div>

                      {/* League Points */}
                      <div className="flex items-center justify-center">
                        <span className="font-bold text-yellow-400">{team.points || 0}</span>
                      </div>

                      {/* Points For */}
                      <div className="flex items-center justify-center">
                        <span className="font-mono text-green-400">{team.pointsFor || 0}</span>
                      </div>

                      {/* Points Against */}
                      <div className="flex items-center justify-center">
                        <span className="font-mono text-red-400">{team.pointsAgainst || 0}</span>
                      </div>

                      {/* Point Differential */}
                      <div className="flex items-center justify-center">
                        <span className={`font-mono font-bold ${
                          pointDiff > 0 ? "text-green-400" : pointDiff < 0 ? "text-red-400" : "text-gray-400"
                        }`}>
                          {pointDiff > 0 ? "+" : ""}{pointDiff}
                        </span>
                      </div>

                      {/* Streak */}
                      <div className="flex items-center justify-center">
                        <Badge 
                          variant="outline" 
                          className={`text-xs font-bold ${
                            team.streak?.startsWith('W') 
                              ? "bg-green-500 bg-opacity-20 border-green-500 text-green-400"
                              : team.streak?.startsWith('L')
                                ? "bg-red-500 bg-opacity-20 border-red-500 text-red-400"
                                : team.streak?.startsWith('T')
                                  ? "bg-yellow-500 bg-opacity-20 border-yellow-500 text-yellow-400"
                                  : "bg-gray-500 bg-opacity-20 border-gray-500 text-gray-400"
                          }`}
                        >
                          {team.streak || "-"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <i className="fas fa-trophy text-4xl text-gray-600 mb-4"></i>
              <p className="text-gray-400">No standings available</p>
            </div>
          )}
          
          {/* Legend */}
          {standingsArray && standingsArray.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-400">
                <div className="space-y-1">
                  <div><strong className="text-white">PTS:</strong> League Points (Win=3, Tie=1, Loss=0)</div>
                  <div><strong className="text-white">PF:</strong> Points For (total scores made)</div>
                  <div><strong className="text-white">PA:</strong> Points Against (total scores allowed)</div>
                  <div><strong className="text-white">DIFF:</strong> Point Differential (PF - PA)</div>
                </div>
                <div className="space-y-1">
                  {division > 1 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Top 2: Promotion to Division {division - 1}</span>
                    </div>
                  )}
                  {division < 8 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Bottom 2: Relegation to Division {division + 1}</span>
                    </div>
                  )}
                  {division === 1 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Championship Division</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TeamInfoDialog 
        teamId={selectedTeamId}
        isOpen={isDialogOpen}
        onClose={closeDialog}
      />
    </>
  );
}
