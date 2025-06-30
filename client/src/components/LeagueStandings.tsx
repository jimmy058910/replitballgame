import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TeamInfoDialog from "@/components/TeamInfoDialog";

interface LeagueStandingsProps {
  division: number;
}

export default function LeagueStandings({ division }: LeagueStandingsProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Define a simplified Team type for standings
  interface StandingTeam {
    id: string;
    name: string;
    wins: number;
    losses: number;
    draws: number;
    points: number;
    // Add any other properties returned by the standings API
  }

  const { data: standings, isLoading } = useQuery<StandingTeam[]>({ // Typed the useQuery
    queryKey: [`/api/leagues/${division}/standings`],
  });

  const handleTeamClick = (teamId: string) => {
    setSelectedTeamId(teamId);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedTeamId(null);
  };

  const getDivisionName = (div: number) => {
    const names = {
      1: "Diamond League",
      2: "Platinum League", 
      3: "Gold League",
      4: "Silver League",
      5: "Bronze League",
      6: "Iron League",
      7: "Stone League",
      8: "Rookie League",
    };
    return names[div as keyof typeof names] || `Division ${div}`;
  };

  return (
    <>
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="font-orbitron">
            {getDivisionName(division)}
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
            <div className="space-y-2">
              {standings.map((team: StandingTeam, index: number) => { // Use StandingTeam type
                const isPlayerTeam = team.name === "Macomb Cougars";
                const position = index + 1;
                
                return (
                  <div 
                    key={team.id} 
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      position === 1 
                        ? "bg-gold-400 bg-opacity-10 border border-gold-400 border-opacity-30"
                        : isPlayerTeam
                          ? "bg-primary-500 bg-opacity-20 border border-primary-500 border-opacity-30"
                          : "bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        position === 1 ? "bg-gold-400" : "bg-gray-600"
                      }`}>
                        {position}
                      </div>
                      <div>
                        <div 
                          className={`font-semibold cursor-pointer hover:underline ${
                            isPlayerTeam ? "text-primary-400" : "text-white"
                          }`}
                          onClick={() => handleTeamClick(team.id)}
                          title="Click to view team info"
                        >
                          {team.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {team.wins}-{team.losses}-{team.draws} • {team.points} pts
                        </div>
                      </div>
                    </div>
                    <div className={`font-bold text-sm ${
                      index < 2 ? "text-green-400" : index >= (standings.length - 2) ? "text-red-400" : "text-gray-400" // Safe access to standings.length
                    }`}>
                      {index < 2 ? "↑" : index >= (standings.length - 2) ? "↓" : "—"}
                    </div>
                  </div>
                );
              })}
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
