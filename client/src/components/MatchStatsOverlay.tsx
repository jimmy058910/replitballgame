import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TeamMatchStats {
  teamId: string;
  teamName: string;
  gamesPlayed: number;
  totalScore: number;
  totalOffensiveYards: number;
  passingYards: number;
  rushingYards: number;
  timeOfPossession: number;
  turnovers: number;
  totalKnockdowns: number;
}

interface PlayerMatchStats {
  playerId: string;
  playerName: string;
  position: string;
  gamesPlayed: number;
  offensive: {
    scores: number;
    passingAttempts: number;
    passesCompleted: number;
    passingPercentage: number;
    passingYards: number;
    rushingYards: number;
    catches: number;
    receivingYards: number;
    dropsFumbles: number;
  };
  defensive: {
    tackles: number;
    knockdownsInflicted: number;
    interceptions: number;
    passesDefended: number;
  };
}

interface MatchStatsDisplay {
  matchId: string;
  homeTeam: TeamMatchStats;
  awayTeam: TeamMatchStats;
  topPerformers: {
    mostScores: PlayerMatchStats;
    mostYards: PlayerMatchStats;
    mostTackles: PlayerMatchStats;
    mostKnockdowns: PlayerMatchStats;
  };
}

interface MatchStatsOverlayProps {
  matchId: string;
  isVisible: boolean;
  position?: 'overlay' | 'sidebar';
}

export function MatchStatsOverlay({ 
  matchId, 
  isVisible, 
  position = 'overlay' 
}: MatchStatsOverlayProps) {
  const { data: matchStats, isLoading } = useQuery<MatchStatsDisplay>({
    queryKey: ['/api/stats/match', matchId],
    queryFn: () => apiRequest<MatchStatsDisplay>(`/api/stats/match/${matchId}`),
    refetchInterval: 10000, // Update every 10 seconds during live match
    enabled: isVisible && !!matchId
  });

  if (!isVisible || isLoading || !matchStats) {
    return null;
  }

  const containerClass = position === 'overlay' 
    ? "absolute top-4 right-4 w-80 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    : "w-full";

  return (
    <div className={containerClass}>
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Live Match Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Team Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="font-medium text-sm">{matchStats.homeTeam.teamName}</div>
              <div className="text-2xl font-bold text-blue-600">
                {matchStats.homeTeam.totalScore}
              </div>
              <div className="text-xs text-gray-600">
                {matchStats.homeTeam.totalOffensiveYards} yards
              </div>
            </div>
            
            <div className="text-center">
              <div className="font-medium text-sm">{matchStats.awayTeam.teamName}</div>
              <div className="text-2xl font-bold text-red-600">
                {matchStats.awayTeam.totalScore}
              </div>
              <div className="text-xs text-gray-600">
                {matchStats.awayTeam.totalOffensiveYards} yards
              </div>
            </div>
          </div>

          {/* Detailed Team Stats */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center font-medium">Stat</div>
              <div className="text-center font-medium text-blue-600">Home</div>
              <div className="text-center font-medium text-red-600">Away</div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>Passing Yds</div>
              <div className="text-center">{matchStats.homeTeam.passingYards}</div>
              <div className="text-center">{matchStats.awayTeam.passingYards}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>Rushing Yds</div>
              <div className="text-center">{matchStats.homeTeam.rushingYards}</div>
              <div className="text-center">{matchStats.awayTeam.rushingYards}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>Turnovers</div>
              <div className="text-center text-red-600">{matchStats.homeTeam.turnovers}</div>
              <div className="text-center text-red-600">{matchStats.awayTeam.turnovers}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>Knockdowns</div>
              <div className="text-center">{matchStats.homeTeam.totalKnockdowns}</div>
              <div className="text-center">{matchStats.awayTeam.totalKnockdowns}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>Time of Poss.</div>
              <div className="text-center">
                {Math.floor(matchStats.homeTeam.timeOfPossession / 60)}:
                {(matchStats.homeTeam.timeOfPossession % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-center">
                {Math.floor(matchStats.awayTeam.timeOfPossession / 60)}:
                {(matchStats.awayTeam.timeOfPossession % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="space-y-2">
            <div className="font-medium text-sm border-b pb-1">Top Performers</div>
            
            {matchStats.topPerformers.mostScores?.playerName && (
              <div className="flex justify-between items-center text-xs">
                <span>Most Scores</span>
                <div className="text-right">
                  <div className="font-medium">{matchStats.topPerformers.mostScores.playerName}</div>
                  <Badge variant="outline" className="text-xs h-4">
                    {matchStats.topPerformers.mostScores.offensive.scores}
                  </Badge>
                </div>
              </div>
            )}
            
            {matchStats.topPerformers.mostTackles?.playerName && (
              <div className="flex justify-between items-center text-xs">
                <span>Most Tackles</span>
                <div className="text-right">
                  <div className="font-medium">{matchStats.topPerformers.mostTackles.playerName}</div>
                  <Badge variant="outline" className="text-xs h-4">
                    {matchStats.topPerformers.mostTackles.defensive.tackles}
                  </Badge>
                </div>
              </div>
            )}
            
            {matchStats.topPerformers.mostKnockdowns?.playerName && (
              <div className="flex justify-between items-center text-xs">
                <span>Most Knockdowns</span>
                <div className="text-right">
                  <div className="font-medium">{matchStats.topPerformers.mostKnockdowns.playerName}</div>
                  <Badge variant="outline" className="text-xs h-4">
                    {matchStats.topPerformers.mostKnockdowns.defensive.knockdownsInflicted}
                  </Badge>
                </div>
              </div>
            )}
            
            {matchStats.topPerformers.mostYards?.playerName && (
              <div className="flex justify-between items-center text-xs">
                <span>Most Yards</span>
                <div className="text-right">
                  <div className="font-medium">{matchStats.topPerformers.mostYards.playerName}</div>
                  <Badge variant="outline" className="text-xs h-4">
                    {(matchStats.topPerformers.mostYards.offensive.passingYards || 0) + 
                     (matchStats.topPerformers.mostYards.offensive.rushingYards || 0) + 
                     (matchStats.topPerformers.mostYards.offensive.receivingYards || 0)}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MatchStatsOverlay;