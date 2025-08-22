import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TeamInfoDialog from "@/components/TeamInfoDialog";
import { Trophy } from "lucide-react";
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
  scoreDifference: number;
  played: number;
  totalScores?: number; // TS - Total Scores For
  scoresAgainst?: number; // SA - Scores Against
}

export default function LeagueStandings({ division }: LeagueStandingsProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: rawStandings, isLoading, error } = useQuery<Team[]>({
    queryKey: [`/api/teams/${division}/standings`],
    staleTime: 1000 * 30, // 30 seconds cache to prevent loops
    gcTime: 1000 * 60 * 5, // 5 minutes cache retention
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Disable to prevent loops
    refetchInterval: false, // Disable auto-refetch to prevent loops
    retry: 1, // Single retry
  });
  const standings = (rawStandings || []) as Team[];
  
  // CRITICAL DEBUG: Force component render logging
  console.log("🏆 STANDINGS COMPONENT RENDER - Division:", division);
  console.log("🏆 STANDINGS DATA:", { 
    hasData: !!rawStandings, 
    dataLength: rawStandings?.length || 0,
    isLoading, 
    error: error?.message,
    endpoint: `/api/teams/${division}/standings`
  });
  
  // Test direct API call with SAME auth as React Query
  React.useEffect(() => {
    const testWithAuth = async () => {
      console.log("🏆 STANDINGS - Testing React Query setup...");
      
      // Get Firebase auth headers EXACTLY like React Query does
      let headers: Record<string, string> = { 'Accept': 'application/json' };
      
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          const idToken = await user.getIdToken();
          headers['Authorization'] = `Bearer ${idToken}`;
          console.log("🏆 STANDINGS - Added Firebase token, first 50 chars:", idToken.substring(0, 50));
        } else {
          const storedToken = localStorage.getItem('firebase_token');
          if (storedToken) {
            headers['Authorization'] = `Bearer ${storedToken}`;
            console.log("🏆 STANDINGS - Added stored token, first 50 chars:", storedToken.substring(0, 50));
          }
        }
      } catch (error) {
        console.log("🏆 STANDINGS - Auth error:", error.message);
      }
      
      fetch(`/api/teams/${division}/standings`, { headers })
        .then(res => {
          console.log("🏆 STANDINGS - Auth test response status:", res.status);
          console.log("🏆 STANDINGS - Auth test Content-Type:", res.headers.get('content-type'));
          return res.text();
        })
        .then(text => {
          console.log("🏆 STANDINGS - Auth test response (first 100 chars):", text.substring(0, 100));
          try {
            const data = JSON.parse(text);
            console.log("🏆 STANDINGS - Auth test SUCCESS: Got", data.length, "teams");
          } catch (e) {
            console.log("🏆 STANDINGS - Auth test ERROR: Got HTML instead of JSON");
          }
        })
        .catch(err => console.log("🏆 STANDINGS - Auth test fetch error:", err));
    };
    
    testWithAuth();
  }, [division]); // Only run when division changes
  
  if (standings.length > 0) {
    console.log("STANDINGS DEBUG - First team data:", {
      name: standings[0].name,
      totalScores: standings[0].totalScores,
      scoresAgainst: standings[0].scoresAgainst,
      scoreDifference: standings[0].scoreDifference
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
                    const isPlayerTeam = currentUserTeam && team.id === currentUserTeam.id;
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
                            className={`font-medium cursor-pointer hover:underline ${
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
                        <td className="text-center py-2 text-yellow-400">{team.draws ?? 0}</td>
                        <td className="text-center py-2 text-red-400">{team.losses}</td>
                        <td className="text-center py-2 text-blue-400">{team.totalScores ?? 0}</td>
                        <td className="text-center py-2 text-orange-400">{team.scoresAgainst ?? 0}</td>
                        <td className={`text-center py-2 font-medium ${
                          team.scoreDifference > 0 ? "text-green-400" :
                          team.scoreDifference < 0 ? "text-red-400" : "text-gray-400"
                        }`}>
                          {team.scoreDifference > 0 ? '+' : ''}{team.scoreDifference}
                        </td>
                        <td className="text-center py-2 font-bold text-white">{team.points}</td>
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
              <p className="text-xs text-gray-500 mt-2">API: /api/teams/{division}/standings</p>
            </div>
          )}
          
          {rawStandings && rawStandings.length > 0 && (
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
}
