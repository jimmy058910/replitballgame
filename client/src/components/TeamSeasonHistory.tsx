import { Trophy, Medal, TrendingUp, Calendar, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import type { Team } from '@shared/types/models';


interface TeamSeasonRecord {
  id: string;
  seasonNumber: number;
  divisionId: string;
  finalPosition: number | null;
  wins: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  playoffResult: string | null;
  specialAchievements: string[];
  totalPoints: number;
  createdAt: string;
}

interface TeamAward {
  id: string;
  awardType: string;
  awardCategory: string;
  statValue: number | null;
  awardDate: string;
  seasonId: string;
}

interface TeamSeasonHistoryProps {
  teamId: string;
}

export function TeamSeasonHistory({ teamId }: TeamSeasonHistoryProps) {
  const { data: seasonHistory, isLoading: historyLoading } = useQuery<TeamSeasonRecord[]>({
    queryKey: ['/api/awards/team', teamId, 'history'],
    enabled: !!teamId,
  });

  const { data: teamAwards, isLoading: awardsLoading } = useQuery<TeamAward[]>({
    queryKey: ['/api/awards/team', teamId],
    enabled: !!teamId,
  });

  if (historyLoading || awardsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Team History & Awards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading team history...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSeasons = seasonHistory?.length || 0;
  const totalAwards = teamAwards?.length || 0;
  const totalWins = seasonHistory?.reduce((sum, season) => sum + season.wins, 0) || 0;
  const totalLosses = seasonHistory?.reduce((sum, season) => sum + season.losses, 0) || 0;
  const winPercentage = totalWins + totalLosses > 0 ? ((totalWins / (totalWins + totalLosses)) * 100) : 0;

  const getPositionColor = (position: number | null) => {
    if (!position) return "bg-gray-500";
    if (position === 1) return "bg-yellow-500";
    if (position <= 3) return "bg-orange-500";
    if (position <= 5) return "bg-blue-500";
    return "bg-gray-500";
  };

  const getPlayoffResultColor = (result: string | null) => {
    switch (result) {
      case "champion": return "bg-yellow-500 text-white";
      case "finalist": return "bg-orange-500 text-white";
      case "semifinalist": return "bg-blue-500 text-white";
      case "eliminated": return "bg-red-500 text-white";
      case "missed": return "bg-gray-500 text-white";
      default: return "bg-gray-400 text-white";
    }
  };

  const getAwardColor = (awardType: string) => {
    if (awardType.includes("Champion")) return "bg-yellow-500 text-white";
    if (awardType.includes("Goals")) return "bg-green-500 text-white";
    if (awardType.includes("Defense")) return "bg-blue-500 text-white";
    return "bg-purple-500 text-white";
  };

  const formatDivision = (divisionId: string) => {
    return `Division ${divisionId}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (totalSeasons === 0 && totalAwards === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Team History & Awards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No season history yet</p>
              <p className="text-sm text-muted-foreground">Start playing to build your team's legacy!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Team History & Awards
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">Season History ({totalSeasons})</TabsTrigger>
            <TabsTrigger value="awards">Awards ({totalAwards})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold">{totalAwards}</div>
                <div className="text-sm text-muted-foreground">Team Awards</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">{totalSeasons}</div>
                <div className="text-sm text-muted-foreground">Seasons Played</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xl font-bold text-green-600">{totalWins}</div>
                <div className="text-xs text-muted-foreground">Total Wins</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xl font-bold text-red-600">{totalLosses}</div>
                <div className="text-xs text-muted-foreground">Total Losses</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xl font-bold text-blue-600">{winPercentage.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">Win Rate</div>
              </div>
            </div>

            {/* Recent Awards */}
            {totalAwards > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Recent Awards</h4>
                <div className="space-y-2">
                  {teamAwards?.slice(0, 3).map((award, index) => (
                    <div key={award.id} className="flex items-center gap-3 p-2 bg-muted rounded">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{award.awardType}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(award.awardDate)}
                        </div>
                      </div>
                      <Badge className={getAwardColor(award.awardType)} variant="secondary">
                        {award.awardCategory}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {totalSeasons === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No season history yet</p>
              </div>
            ) : (
              seasonHistory?.map((season, index) => (
                <div key={season.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      <span className="font-semibold">Season {season.seasonNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{formatDivision(season.divisionId)}</Badge>
                      {season.finalPosition && (
                        <Badge className={`${getPositionColor(season.finalPosition)} text-white`}>
                          {season.finalPosition === 1 ? "1st" : 
                           season.finalPosition === 2 ? "2nd" : 
                           season.finalPosition === 3 ? "3rd" : 
                           `${season.finalPosition}th`} Place
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-3 text-center">
                    <div>
                      <div className="text-lg font-bold text-green-600">{season.wins}</div>
                      <div className="text-xs text-muted-foreground">Wins</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-red-600">{season.losses}</div>
                      <div className="text-xs text-muted-foreground">Losses</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-600">{season.goalsFor}</div>
                      <div className="text-xs text-muted-foreground">Goals For</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-orange-600">{season.goalsAgainst}</div>
                      <div className="text-xs text-muted-foreground">Goals Against</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium">{season.totalPoints}</span> total points
                    </div>
                    {season.playoffResult && (
                      <Badge className={getPlayoffResultColor(season.playoffResult)}>
                        {season.playoffResult === "champion" ? "Champion" :
                         season.playoffResult === "finalist" ? "Finalist" :
                         season.playoffResult === "semifinalist" ? "Semifinalist" :
                         season.playoffResult === "eliminated" ? "Eliminated" :
                         season.playoffResult === "missed" ? "Missed Playoffs" :
                         season.playoffResult}
                      </Badge>
                    )}
                  </div>

                  {season.specialAchievements && season.specialAchievements.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm font-medium mb-1">Special Achievements:</div>
                      <div className="flex flex-wrap gap-1">
                        {season.specialAchievements.map((achievement, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {achievement}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="awards" className="space-y-3">
            {totalAwards === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No team awards yet</p>
              </div>
            ) : (
              teamAwards?.map((award, index) => (
                <div key={award.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Medal className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">{award.awardType}</span>
                    </div>
                    <Badge className={getAwardColor(award.awardType)}>
                      {award.awardCategory}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {formatDate(award.awardDate)}
                  </div>
                  {award.statValue && (
                    <div className="text-center bg-muted rounded p-2">
                      <div className="text-lg font-bold">{Math.round(award.statValue)}</div>
                      <div className="text-xs text-muted-foreground">Award Value</div>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}