import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TeamInfoDialog from "@/components/TeamInfoDialog";
import { Trophy } from "lucide-react";
import { getDivisionName, getDivisionNameWithSubdivision } from "@shared/divisionUtils";
import { leagueQueryOptions } from "@/lib/api/queryOptions";
import type { Team } from '@shared/types/models';


interface LeagueStandingsProps {
  division: number;
}



export default function LeagueStandings({ division }: LeagueStandingsProps) {
  console.log("🏆 STANDINGS COMPONENT START - Division:", division);
  
  try {
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { data: rawStandings, isLoading, error } = useQuery(
      leagueQueryOptions.standings(division)
    );
    
    console.log("🏆 STANDINGS QUERY RESULT:", { 
      hasData: !!rawStandings, 
      dataLength: rawStandings?.length, 
      isLoading, 
      errorMessage: error?.message 
    });
    
    const standings = (rawStandings || []) as Team[];
  
  // CRITICAL DEBUG: Force component render logging
  console.log("🏆 STANDINGS COMPONENT RENDER - Division:", division);
  console.log("🏆 STANDINGS DATA:", { 
    hasData: !!rawStandings, 
    dataLength: rawStandings?.length || 0,
    isLoading, 
    error: error?.message,
    endpoint: `/api/leagues/${division}/standings`
  });
  
    // SUCCESS: API is working perfectly! 
    console.log("🏆 STANDINGS COMPONENT RENDERING for division:", division);
  
  if (standings.length > 0) {
    console.log("STANDINGS DEBUG - First team data:", {
      name: standings[0].name,
      totalScores: (standings[0] as any).totalScores ?? 0,
      scoresAgainst: (standings[0] as any).scoresAgainst ?? 0,
      scoreDifference: (standings[0] as any).scoreDifference ?? 0
    });
  }

  // Get current user's team to properly highlight it in standings
  const { data: currentUserTeam } = useQuery<any>({
    queryKey: ['/api/teams/my', new Date().getTime()],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const handleTeamClick = (teamId: string) => {
    setSelectedTeamId(teamId);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedTeamId(null);
  };



  return (
    <>
      <Card className="bg-gray-800 border-gray-700">
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg animate-pulse">
                  <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-600 rounded mb-2"></div>
                    <div className="h-3 bg-gray-600 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : rawStandings && rawStandings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600 text-xs text-gray-400">
                    <th className="text-left py-2 w-8">#</th>
                    <th className="text-left py-2">Team Name</th>
                    <th className="text-center py-2 w-12">GP</th>
                    <th className="text-center py-2 w-12">W</th>
                    <th className="text-center py-2 w-12">D</th>
                    <th className="text-center py-2 w-12">L</th>
                    <th className="text-center py-2 w-12">TS</th>
                    <th className="text-center py-2 w-12">SA</th>
                    <th className="text-center py-2 w-12">SD</th>
                    <th className="text-center py-2 w-12">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {(rawStandings || []).map((team: Team, index: number) => {
                    // Highlight the current user's team regardless of position
                    const isPlayerTeam = currentUserTeam && String(team.id) === String(currentUserTeam.id);
                    const position = index + 1;
                    
                    return (
                      <tr 
                        key={team.id} 
                        className={`border-b border-gray-700 hover:bg-gray-700 transition-colors ${
                          isPlayerTeam
                            ? "bg-gold-400 bg-opacity-10" 
                            : ""
                        }`}
                      >
                        <td className="py-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            (() => {
                              // Dynamic promotion/relegation zones based on division rules
                              if (position === 1) return "bg-gold-400 text-black"; // Champion
                              
                              // Promotion zones (green)
                              if (division === 1) {
                                // Division 1: No promotion (top division)
                                if (position >= 11) return "bg-red-500 text-white"; // Relegation: 11th-16th place
                              } else if (division === 2) {
                                // Division 2: Top 2 promote, bottom 4 relegate (16-team subdivisions)
                                if (position <= 2) return "bg-green-500 text-white"; // Promotion
                                if (position >= 13) return "bg-red-500 text-white"; // Relegation: 13th-16th place
                              } else if (division >= 3 && division <= 7) {
                                // Divisions 3-7: Top teams promote, bottom 4 relegate (8-team subdivisions)
                                if (position <= 2) return "bg-green-500 text-white"; // Promotion
                                if (position >= 5) return "bg-red-500 text-white"; // Relegation: 5th-8th place
                              } else if (division === 8) {
                                // Division 8: Only promotion, NO relegation (bottom division)
                                if (position <= 2) return "bg-green-500 text-white"; // Promotion only
                                return "bg-gray-600 text-white"; // Safe zone - no relegation from bottom division
                              }
                              
                              return "bg-gray-600 text-white"; // Safe zone
                            })()
                          }`}>
                            {position}
                          </div>
                        </td>
                        <td className="py-2">
                          <div 
                            className={`font-medium cursor-pointer hover:underline ${
                              isPlayerTeam ? "text-primary-400" : "text-white"
                            }`}
                            onClick={() => handleTeamClick(String(team.id))}
                            title={`${team.name} - Click to view team info`}
                          >
                            {team.name}
                          </div>
                        </td>
                        <td className="text-center py-2 text-gray-300">{(team as any).played ?? 0}</td>
                        <td className="text-center py-2 text-green-400 font-medium">{team.wins ?? 0}</td>
                        <td className="text-center py-2 text-yellow-400">{team.draws ?? 0}</td>
                        <td className="text-center py-2 text-red-400">{team.losses ?? 0}</td>
                        <td className="text-center py-2 text-blue-400">{(team as any).totalScores ?? 0}</td>
                        <td className="text-center py-2 text-orange-400">{(team as any).scoresAgainst ?? 0}</td>
                        <td className={`text-center py-2 font-medium ${
                          ((team as any).scoreDifference ?? 0) > 0 ? "text-green-400" :
                          ((team as any).scoreDifference ?? 0) < 0 ? "text-red-400" : "text-gray-400"
                        }`}>
                          {((team as any).scoreDifference ?? 0) > 0 ? '+' : ''}{(team as any).scoreDifference ?? 0}
                        </td>
                        <td className="text-center py-2 font-bold text-white">{team.points ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Trophy className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">No standings data available</p>
              <p className="text-sm">Division {division} standings will load shortly</p>
              <p className="text-xs text-gray-500 mt-2">API: /api/leagues/{division}/standings</p>
            </div>
          )}
          
          {rawStandings && rawStandings.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-400 space-y-1">
                {/* Dynamic promotion/relegation legend based on division rules */}
                {division === 1 && (
                  <>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Championship Division (No promotion available)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Relegation Zone: 11th-16th place → Division 2</span>
                    </div>
                  </>
                )}
                {division === 2 && (
                  <>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Promotion Zone: Top 2 → Division 1</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Relegation Zone: 13th-16th place → Division 3</span>
                    </div>
                  </>
                )}
                {division >= 3 && division <= 7 && (
                  <>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Promotion Zone: Top 2 → Division {division - 1}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Relegation Zone: 5th-8th place → Division {division + 1}</span>
                    </div>
                  </>
                )}
                {division === 8 && (
                  <>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Promotion Zone: Top 2 → Division 7</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>Entry Division (No relegation)</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Helper text for abbreviations */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-xs text-gray-400 space-y-1">
              <div className="font-semibold text-gray-300 mb-2">Table Abbreviations:</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div><span className="text-gray-300">P:</span> Played</div>
                <div><span className="text-gray-300">W:</span> Won</div>
                <div><span className="text-gray-300">D:</span> Draw</div>
                <div><span className="text-gray-300">L:</span> Lost</div>
                <div><span className="text-gray-300">SD:</span> Score Difference</div>
                <div><span className="text-gray-300">Pts:</span> Points</div>
                <div><span className="text-gray-300">Streak:</span> Current winning/losing streak</div>
                <div><span className="text-gray-300">Form:</span> Last 5 games results</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <TeamInfoDialog 
        teamId={selectedTeamId}
        isOpen={isDialogOpen}
        onClose={closeDialog}
      />
    </>
  );
  } catch (error) {
    console.error("🏆 STANDINGS COMPONENT ERROR:", error);
    return (
      <div className="text-center py-8 text-red-400">
        <p className="text-lg font-semibold mb-2">Standings Error</p>
        <p className="text-sm">{(error as Error)?.message || "Unknown error"}</p>
      </div>
    );
  }
}
