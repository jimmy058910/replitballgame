import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import type { PlayerMatchStats, TeamMatchStats } from "@shared/types/models";

// Extended types for UI display with averages
interface PlayerStatsWithAverages extends PlayerMatchStats {
  averages?: {
    scoresPerGame: number;
    passingYardsPerGame: number;
    rushingYardsPerGame: number;
    tacklesPerGame: number;
  };
}

interface TeamStatsWithAverages extends TeamMatchStats {
  averages?: {
    scorePerGame: number;
    yardsPerGame: number;
    turnoverDifferential: number;
  };
}

interface StatsDisplayProps {
  playerStats?: PlayerStatsWithAverages;
  teamStats?: TeamStatsWithAverages;
  compact?: boolean;
  showAverages?: boolean;
}

export function StatsDisplay({ playerStats, teamStats, compact = false, showAverages = true }: StatsDisplayProps) {
  if (compact && playerStats) {
    return (
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex justify-between">
          <span>Scores:</span>
          <span className="font-medium">{playerStats.scores ?? 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Tackles:</span>
          <span className="font-medium">{playerStats.tackles ?? 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Pass Yds:</span>
          <span className="font-medium">{playerStats.passingYards ?? 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Rush Yds:</span>
          <span className="font-medium">{playerStats.rushingYards ?? 0}</span>
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
              {playerStats.playerName ?? 'Unknown Player'}
              <Badge variant="outline">{(playerStats as any).position ?? 'N/A'}</Badge>
            </CardTitle>
            <CardDescription>
              Games Played: {(playerStats as any).gamesPlayed ?? 0}
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
                        {playerStats.scores ?? 0}
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
                        {Math.round(((playerStats.passCompletions ?? 0) / Math.max((playerStats.passAttempts ?? 1), 1)) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.round(((playerStats.passCompletions ?? 0) / Math.max((playerStats.passAttempts ?? 1), 1)) * 100)} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">Passing Yards</span>
                      <span className="font-medium">{playerStats.offensive?.passingYards || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Completions</span>
                      <span>{playerStats?.offensive?.passesCompleted ?? 0}/{playerStats?.offensive?.passingAttempts ?? 0}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">Carrier Yards</span>
                      {/* */}
                      <span className="font-medium">{playerStats?.offensive.carrierYards}</span>
                    </div>
                    {showAverages && playerStats.averages && (
                      <div className="text-xs text-gray-500">
                        {/* */}
                        Avg: {playerStats.averages.carrierYardsPerGame}/game
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Catches</span>
                    <span className="font-medium">{playerStats?.offensive.catches}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Receiving Yards</span>
                    <span className="font-medium">{playerStats?.offensive.receivingYards}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-red-600">Drops & Fumbles</span>
                    <span className="font-medium text-red-600">{playerStats?.offensive.dropsFumbles}</span>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="defensive" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Tackles</span>
                      <span className="text-lg font-bold text-blue-600">
                        {playerStats.defensive?.tackles || 0}
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
                      {playerStats?.defensive.knockdownsInflicted}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Interceptions</span>
                    <span className="font-medium">{playerStats?.defensive.interceptions}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Passes Defended</span>
                    <span className="font-medium">{playerStats?.defensive.passesDefended}</span>
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
                  <span className="text-sm">Carrier Yards</span>
                  {/* */}
                  <span className="font-medium">{teamStats.rushingYards || 0}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {teamStats.totalOffensiveYards > 0 
                    ? Math.round(((teamStats.rushingYards || 0) / teamStats.totalOffensiveYards) * 100)
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
              

            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default StatsDisplay;