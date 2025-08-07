import { Trophy, Medal, Star, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";

interface MvpAward {
  id: string;
  matchId: string;
  matchType: string;
  awardDate: string;
  performanceStats: {
    scores: number;
    catches: number;
    passingAttempts: number;
    rushingYards: number;
    knockdownsInflicted: number;
    tackles: number;
    mvpScore: number;
  };
}

interface SeasonAward {
  id: string;
  awardType: string;
  awardCategory: string;
  statValue: number;
  awardDate: string;
  seasonId: string;
}

interface PlayerAwardsData {
  mvpAwards: MvpAward[];
  seasonAwards: SeasonAward[];
}

interface PlayerAwardsProps {
  playerId: string;
}

export function PlayerAwards({ playerId }: PlayerAwardsProps) {
  const { data: awards, isLoading } = useQuery<PlayerAwardsData>({
    queryKey: ['/api/awards/player', playerId],
    enabled: !!playerId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Awards & Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading awards...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const mvpCount = awards?.mvpAwards?.length || 0;
  const seasonAwardsCount = awards?.seasonAwards?.length || 0;
  const totalAwards = mvpCount + seasonAwardsCount;

  if (totalAwards === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Awards & Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Award className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No awards yet</p>
              <p className="text-sm text-muted-foreground">Keep playing to earn MVP and season awards!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getAwardIcon = (awardType: string) => {
    if (awardType.includes("Year")) return <Star className="h-4 w-4" />;
    if (awardType.includes("Top") || awardType.includes("Best")) return <Medal className="h-4 w-4" />;
    return <Trophy className="h-4 w-4" />;
  };

  const getAwardColor = (awardType: string) => {
    if (awardType === "Player of the Year") return "bg-yellow-500 text-white";
    if (awardType === "Rookie of the Year") return "bg-green-500 text-white";
    if (awardType.includes("Top") || awardType.includes("Best")) return "bg-blue-500 text-white";
    return "bg-purple-500 text-white";
  };

  const getMVPTypeColor = (matchType: string) => {
    switch (matchType) {
      case "championship": return "bg-yellow-500 text-white";
      case "playoff": return "bg-orange-500 text-white";
      case "regular": return "bg-blue-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatMatchType = (matchType: string) => {
    switch (matchType) {
      case "championship": return "Championship";
      case "playoff": return "Playoff";
      case "regular": return "Regular Season";
      default: return matchType;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Awards & Achievements
          <Badge variant="secondary" className="ml-auto">
            {totalAwards} Total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="mvp">MVP Awards ({mvpCount})</TabsTrigger>
            <TabsTrigger value="season">Season Awards ({seasonAwardsCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold">{mvpCount}</div>
                <div className="text-sm text-muted-foreground">MVP Awards</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Star className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">{seasonAwardsCount}</div>
                <div className="text-sm text-muted-foreground">Season Awards</div>
              </div>
            </div>

            {/* Recent Awards */}
            <div>
              <h4 className="font-semibold mb-2">Recent Awards</h4>
              <div className="space-y-2">
                {[...(awards?.mvpAwards || []), ...(awards?.seasonAwards || [])]
                  .sort((a, b) => new Date(b.awardDate).getTime() - new Date(a.awardDate).getTime())
                  .slice(0, 3)
                  .map((award, index) => {
                    const isMVP = 'matchType' in award;
                    return (
                      <div key={index} className="flex items-center gap-3 p-2 bg-muted rounded">
                        {isMVP ? (
                          <Trophy className="h-4 w-4 text-yellow-500" />
                        ) : (
                          getAwardIcon((award as SeasonAward).awardType)
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {isMVP ? `MVP (${formatMatchType((award as MvpAward).matchType)})` : (award as SeasonAward).awardType}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(award.awardDate)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mvp" className="space-y-3">
            {mvpCount === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No MVP awards yet</p>
              </div>
            ) : (
              awards?.mvpAwards?.map((award, index) => (
                <div key={award.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Match MVP</span>
                    </div>
                    <Badge className={getMVPTypeColor(award.matchType)}>
                      {formatMatchType(award.matchType)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {formatDate(award.awardDate)}
                  </div>
                  {award.performanceStats && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-semibold">{award.performanceStats.scores}</div>
                        <div className="text-muted-foreground">Scores</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">{award.performanceStats.catches}</div>
                        <div className="text-muted-foreground">Catches</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">{Math.round(award.performanceStats.mvpScore)}</div>
                        <div className="text-muted-foreground">MVP Score</div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="season" className="space-y-3">
            {seasonAwardsCount === 0 ? (
              <div className="text-center py-8">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No season awards yet</p>
              </div>
            ) : (
              awards?.seasonAwards?.map((award, index) => (
                <div key={award.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getAwardIcon(award.awardType)}
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