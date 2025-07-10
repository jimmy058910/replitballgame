import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TeamInfoDialog from "@/components/TeamInfoDialog";
import { getDivisionName, getDivisionNameWithSubdivision } from "@shared/divisionUtils";

interface LeagueStandingsProps {
  division: number;
}

interface Team {
  id: string;
  name: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  division: number;
  subdivision?: string;
  currentStreak: number;
  streakType: string;
  form: string;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  played: number;
}

export default function LeagueStandings({ division }: LeagueStandingsProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: rawStandings, isLoading } = useQuery({
    queryKey: [`/api/leagues/${division}/standings`],
  });
  const standings = (rawStandings || []) as Team[];

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
        <CardHeader>
          <CardTitle className="font-orbitron">
            {standings.length > 0 && standings[0].subdivision 
              ? getDivisionNameWithSubdivision(division, standings[0].subdivision)
              : getDivisionName(division)
            }
          </CardTitle>
        </CardHeader>
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
          ) : standings && standings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600 text-xs text-gray-400">
                    <th className="text-left py-2 w-8">#</th>
                    <th className="text-left py-2">Team</th>
                    <th className="text-center py-2 w-12">P</th>
                    <th className="text-center py-2 w-12">W</th>
                    <th className="text-center py-2 w-12">D</th>
                    <th className="text-center py-2 w-12">L</th>
                    <th className="text-center py-2 w-16">SD</th>
                    <th className="text-center py-2 w-12">Pts</th>
                    <th className="text-center py-2 w-16">Streak</th>
                    <th className="text-center py-2 w-24">Form</th>
                    <th className="text-center py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((team: any, index: number) => {
                    const isPlayerTeam = team.name === "Macomb Cougars";
                    const position = index + 1;
                    
                    return (
                      <tr 
                        key={team.id} 
                        className={`border-b border-gray-700 hover:bg-gray-700 transition-colors ${
                          position === 1 
                            ? "bg-gold-400 bg-opacity-10" 
                            : isPlayerTeam
                              ? "border-l-2 border-l-primary-400"
                              : ""
                        }`}
                      >
                        <td className="py-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            position === 1 ? "bg-gold-400 text-black" : 
                            position <= 2 ? "bg-green-500 text-white" :
                            position >= standings.length - 1 ? "bg-red-500 text-white" :
                            "bg-gray-600 text-white"
                          }`}>
                            {position}
                          </div>
                        </td>
                        <td className="py-2">
                          <div 
                            className={`font-medium cursor-pointer hover:underline truncate max-w-32 ${
                              isPlayerTeam ? "text-primary-400" : "text-white"
                            }`}
                            onClick={() => handleTeamClick(team.id)}
                            title={`${team.name} - Click to view team info`}
                          >
                            {team.name}
                          </div>
                        </td>
                        <td className="text-center py-2 text-gray-300">{team.played}</td>
                        <td className="text-center py-2 text-green-400 font-medium">{team.wins}</td>
                        <td className="text-center py-2 text-yellow-400">{team.draws}</td>
                        <td className="text-center py-2 text-red-400">{team.losses}</td>
                        <td className={`text-center py-2 font-medium ${
                          team.goalDifference > 0 ? "text-green-400" :
                          team.goalDifference < 0 ? "text-red-400" : "text-gray-400"
                        }`}>
                          {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                        </td>
                        <td className="text-center py-2 font-bold text-white">{team.points}</td>
                        <td className="text-center py-2">
                          {team.streakType !== 'N' && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              team.streakType === 'W' ? 'bg-green-600 text-white' :
                              team.streakType === 'L' ? 'bg-red-600 text-white' :
                              'bg-yellow-600 text-black'
                            }`}>
                              {team.streakType}{team.currentStreak}
                            </span>
                          )}
                        </td>
                        <td className="text-center py-2">
                          {team.form !== 'N/A' && (
                            <div className="flex justify-center space-x-0.5">
                              {team.form.split('').map((result, idx) => (
                                <div 
                                  key={idx}
                                  className={`w-2 h-2 rounded-full ${
                                    result === 'W' ? 'bg-green-500' :
                                    result === 'L' ? 'bg-red-500' :
                                    'bg-yellow-500'
                                  }`}
                                  title={`Game ${idx + 1}: ${
                                    result === 'W' ? 'Win' :
                                    result === 'L' ? 'Loss' : 'Draw'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="text-center py-2">
                          <span className={`text-sm ${
                            position <= 2 ? "text-green-400" : 
                            position >= standings.length - 1 ? "text-red-400" : 
                            "text-gray-500"
                          }`}>
                            {position <= 2 ? "↑" : position >= standings.length - 1 ? "↓" : ""}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <i className="fas fa-trophy text-4xl text-gray-600 mb-4"></i>
              <p className="text-gray-400">No standings available</p>
            </div>
          )}
          
          {standings && standings.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-400 space-y-1">
                {division > 1 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Promotion to Division {division - 1}</span>
                  </div>
                )}
                {division < 8 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Relegation to Division {division + 1}</span>
                  </div>
                )}
                {division === 1 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>Championship Division</span>
                  </div>
                )}
                {division === 8 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>Entry Division (No relegation)</span>
                  </div>
                )}
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
