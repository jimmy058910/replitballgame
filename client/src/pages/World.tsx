import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Trophy, TrendingUp, Users, Crown, Star, Award } from "lucide-react";

// Division naming utilities
const DIVISION_NAMES = {
  1: "Diamond League",
  2: "Platinum League", 
  3: "Gold League",
  4: "Silver League",
  5: "Bronze League",
  6: "Iron League",
  7: "Stone League",
  8: "Copper League",
} as const;

function getDivisionName(division: number): string {
  return DIVISION_NAMES[division as keyof typeof DIVISION_NAMES] || `Division ${division}`;
}

function getDivisionColor(division: number): string {
  const colors = {
    1: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    2: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    3: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    4: "bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-200",
    5: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    6: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    7: "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200",
    8: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };
  return colors[division as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
}

function UniversalTeamPowerRankings() {
  const { data: rankings, isLoading } = useQuery({
    queryKey: ["/api/world/global-rankings"],
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!rankings || rankings.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <TrendingUp className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No teams available for ranking yet. Check back after more teams are created!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Rankings based on Team Power, Division, Win/Loss Record, and Team Chemistry
      </div>
      
      {rankings.map((team: any, index: number) => (
        <Card key={team.id} className={`${index < 3 ? 'border-l-4' : ''} ${
          index === 0 ? 'border-l-yellow-400' : 
          index === 1 ? 'border-l-gray-400' : 
          index === 2 ? 'border-l-amber-600' : ''
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-400 text-yellow-900' :
                    index === 1 ? 'bg-gray-400 text-gray-900' :
                    index === 2 ? 'bg-amber-600 text-amber-100' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {team.globalRank}
                  </div>
                  {index < 3 && (
                    <Crown className={`h-5 w-5 ${
                      index === 0 ? 'text-yellow-400' :
                      index === 1 ? 'text-gray-400' :
                      'text-amber-600'
                    }`} />
                  )}
                </div>
                
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{team.name}</h3>
                    <Badge className={getDivisionColor(team.division)}>
                      {getDivisionName(team.division)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <span>Record: {team.wins}-{team.losses}-{team.draws}</span>
                    <span>Win Rate: {team.winPercentage}%</span>
                    <span>Team Power: {team.teamPower}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {team.trueStrengthRating}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Strength Rating
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WorldStatisticsDashboard() {
  const { data: statistics, isLoading } = useQuery({
    queryKey: ["/api/world/statistics"],
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!statistics) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            World statistics are being calculated...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Teams</p>
                <p className="text-2xl font-bold">{statistics.totalTeams}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Players</p>
                <p className="text-2xl font-bold">{statistics.totalPlayers}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Division Leaders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Division Leaders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(statistics.divisionLeaders).map(([division, team]: [string, any]) => (
              <div key={division} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <Badge className={getDivisionColor(parseInt(division))}>
                    {getDivisionName(parseInt(division))}
                  </Badge>
                  <p className="font-medium mt-1">{team.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Power</p>
                  <p className="font-bold">{team.teamPower}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Best Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Best Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statistics.bestRecords.slice(0, 10).map((team: any, index: number) => (
              <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <Badge className={getDivisionColor(team.division)}>
                      {getDivisionName(team.division)}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{Math.round(team.winPercentage * 100)}%</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {team.wins}-{team.losses}-{team.draws}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strongest Players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Strongest Players
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statistics.strongestPlayers.slice(0, 10).map((player: any, index: number) => (
              <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{player.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {player.team?.name} • {player.race} {player.role}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{player.overallRating}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Overall</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HallOfFame() {
  const { data: hallOfFame, isLoading } = useQuery({
    queryKey: ["/api/world/hall-of-fame"],
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!hallOfFame) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Award className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Hall of Fame records are being compiled...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Record Holders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Record Holders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {hallOfFame.achievements.map((achievement: any, index: number) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-yellow-900" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{achievement.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{achievement.description}</p>
                  <div className="mt-1">
                    <Badge className={getDivisionColor(achievement.team.division)}>
                      {getDivisionName(achievement.team.division)}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Tournament Champions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Recent Tournament Champions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hallOfFame.recentChampions.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              No tournament champions yet. Be the first to win a tournament!
            </p>
          ) : (
            <div className="space-y-3">
              {hallOfFame.recentChampions.map((champion: any, index: number) => (
                <div key={champion.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                      <Crown className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">{champion.team?.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {champion.tournament.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                      Champion
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(champion.tournament.completedAt || champion.registeredAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function World() {
  const [activeTab, setActiveTab] = useState("rankings");

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Globe className="h-8 w-8" />
            Global Rankings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive rankings, world statistics, and hall of fame across all divisions
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rankings">Team Rankings</TabsTrigger>
            <TabsTrigger value="statistics">World Statistics</TabsTrigger>
            <TabsTrigger value="hall-of-fame">Hall of Fame</TabsTrigger>
          </TabsList>

          <TabsContent value="rankings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Universal Team Power Rankings
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Top 100 teams ranked by True Strength Rating algorithm
                </p>
              </CardHeader>
              <CardContent>
                <UniversalTeamPowerRankings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics">
            <WorldStatisticsDashboard />
          </TabsContent>

          <TabsContent value="hall-of-fame">
            <HallOfFame />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}