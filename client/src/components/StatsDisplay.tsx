import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface PlayerOffensiveStats {
  scores: number;
  passingAttempts: number;
  passesCompleted: number;
  passingPercentage: number;
  passingYards: number;
  rushingYards: number;
  catches: number;
  receivingYards: number;
  dropsFumbles: number;
}

interface PlayerDefensiveStats {
  tackles: number;
  knockdownsInflicted: number;
  interceptions: number;
  passesDefended: number;
}

interface PlayerStats {
  playerId: string;
  playerName: string;
  position: string;
  gamesPlayed: number;
  offensive: PlayerOffensiveStats;
  defensive: PlayerDefensiveStats;
  averages?: {
    scoresPerGame: number;
    passingYardsPerGame: number;
    rushingYardsPerGame: number;
    tacklesPerGame: number;
  };
}

interface TeamStats {
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
  averages?: {
    scorePerGame: number;
    yardsPerGame: number;
    turnoverDifferential: number;
  };
}

interface StatsDisplayProps {
  playerStats?: PlayerStats;
  teamStats?: TeamStats;
  compact?: boolean;
  showAverages?: boolean;
}

export function StatsDisplay({ playerStats, teamStats, compact = false, showAverages = true }: StatsDisplayProps) {
  if (compact && playerStats) {
    return (
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex justify-between">
          <span>Scores:</span>
          <span className="font-medium">{playerStats.offensive.scores}</span>
        </div>
        <div className="flex justify-between">
          <span>Tackles:</span>
          <span className="font-medium">{playerStats.defensive.tackles}</span>
        </div>
        <div className="flex justify-between">
          <span>Pass Yds:</span>
          <span className="font-medium">{playerStats.offensive.passingYards}</span>
        </div>
        <div className="flex justify-between">
          <span>Rush Yds:</span>
          <span className="font-medium">{playerStats.offensive.rushingYards}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {playerStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {playerStats.playerName}
              <Badge variant="outline">{playerStats.position}</Badge>
            </CardTitle>
            <CardDescription>
              Games Played: {playerStats.gamesPlayed}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="offensive" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="offensive">Offense</TabsTrigger>
                <TabsTrigger value="defensive">Defense</TabsTrigger>
              </TabsList>
              
              <TabsContent value="offensive" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Scores</span>
                      <span className="text-lg font-bold text-green-600">
                        {playerStats.offensive.scores}
                      </span>
                    </div>
                    {showAverages && playerStats.averages && (
                      <div className="text-xs text-gray-500">
                        Avg: {playerStats.averages.scoresPerGame}/game
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Passing %</span>
                      <span className="text-lg font-bold">
                        {playerStats.offensive.passingPercentage}%
                      </span>
                    </div>
                    <Progress 
                      value={playerStats.offensive.passingPercentage} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">Passing Yards</span>
                      <span className="font-medium">{playerStats.offensive.passingYards}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Completions</span>
                      <span>{playerStats.offensive.passesCompleted}/{playerStats.offensive.passingAttempts}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">Rushing Yards</span>
                      <span className="font-medium">{playerStats.offensive.rushingYards}</span>
                    </div>
                    {showAverages && playerStats.averages && (
                      <div className="text-xs text-gray-500">
                        Avg: {playerStats.averages.rushingYardsPerGame}/game
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Catches</span>
                    <span className="font-medium">{playerStats.offensive.catches}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Receiving Yards</span>
                    <span className="font-medium">{playerStats.offensive.receivingYards}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-red-600">Drops & Fumbles</span>
                    <span className="font-medium text-red-600">{playerStats.offensive.dropsFumbles}</span>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="defensive" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Tackles</span>
                      <span className="text-lg font-bold text-blue-600">
                        {playerStats.defensive.tackles}
                      </span>
                    </div>
                    {showAverages && playerStats.averages && (
                      <div className="text-xs text-gray-500">
                        Avg: {playerStats.averages.tacklesPerGame}/game
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Knockdowns</span>
                    <span className="text-lg font-bold text-orange-600">
                      {playerStats.defensive.knockdownsInflicted}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Interceptions</span>
                    <span className="font-medium">{playerStats.defensive.interceptions}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Passes Defended</span>
                    <span className="font-medium">{playerStats.defensive.passesDefended}</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {teamStats && (
        <Card>
          <CardHeader>
            <CardTitle>{teamStats.teamName} Team Stats</CardTitle>
            <CardDescription>
              Games Played: {teamStats.gamesPlayed}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Total Score</span>
                  <span className="text-xl font-bold text-green-600">
                    {teamStats.totalScore}
                  </span>
                </div>
                {showAverages && teamStats.averages && (
                  <div className="text-xs text-gray-500">
                    Avg: {teamStats.averages.scorePerGame}/game
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Total Yards</span>
                  <span className="text-xl font-bold">
                    {teamStats.totalOffensiveYards}
                  </span>
                </div>
                {showAverages && teamStats.averages && (
                  <div className="text-xs text-gray-500">
                    Avg: {teamStats.averages.yardsPerGame}/game
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Passing Yards</span>
                  <span className="font-medium">{teamStats.passingYards}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {teamStats.totalOffensiveYards > 0 
                    ? Math.round((teamStats.passingYards / teamStats.totalOffensiveYards) * 100)
                    : 0}% of total
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Rushing Yards</span>
                  <span className="font-medium">{teamStats.rushingYards}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {teamStats.totalOffensiveYards > 0 
                    ? Math.round((teamStats.rushingYards / teamStats.totalOffensiveYards) * 100)
                    : 0}% of total
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Time of Possession</span>
                <span className="font-medium">
                  {Math.floor(teamStats.timeOfPossession / 60)}:{(teamStats.timeOfPossession % 60).toString().padStart(2, '0')}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Total Knockdowns</span>
                <span className="font-medium">{teamStats.totalKnockdowns}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-red-600">Turnovers</span>
                <span className="font-medium text-red-600">{teamStats.turnovers}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default StatsDisplay;