import { useState, startTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSeasonalUI } from "@/hooks/useSeasonalUI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LeagueStandings from "@/components/LeagueStandings";
import ImprovedLiveMatches from "@/components/ImprovedLiveMatches";
import ComprehensiveTournamentManager from "@/components/ComprehensiveTournamentManager";
import { 
  Trophy, Calendar, Users, Zap, Target, Play,
  Clock, Star, Award, Gamepad2, TrendingUp
} from "lucide-react";

// Enhanced interfaces for Competition Center
interface Team {
  id: string;
  name: string;
  division: number;
  subdivision?: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
}

interface Match {
  id: string;
  homeTeam: { name: string; id: string };
  awayTeam: { name: string; id: string };
  gameDate: string;
  homeScore: number;
  awayScore: number;
  status: string;
  matchType: string;
}

interface Tournament {
  id: string;
  name: string;
  type: string;
  status: string;
  participantCount: number;
  maxParticipants: number;
  startTime: string;
  division: number;
}

type TabType = 'overview' | 'league' | 'tournaments' | 'matches' | 'stats';

export default function CompetitionCenter() {
  const { isAuthenticated } = useAuth();
  const { seasonalState } = useSeasonalUI();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const { data: team } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
    enabled: isAuthenticated,
  });

  const { data: liveMatches } = useQuery<Match[]>({
    queryKey: ["/api/matches/live"],
    refetchInterval: 30000,
  });

  const { data: upcomingMatches } = useQuery<Match[]>({
    queryKey: [`/api/teams/${team?.id}/matches/upcoming`],
    enabled: !!team?.id,
  });

  const { data: recentMatches } = useQuery<Match[]>({
    queryKey: [`/api/teams/${team?.id}/matches/recent`],
    enabled: !!team?.id,
  });

  const { data: tournaments } = useQuery<Tournament[]>({
    queryKey: [`/api/tournaments/available/${team?.division}`],
    enabled: !!team?.division,
  });

  const { data: standings } = useQuery<any[]>({
    queryKey: [`/api/leagues/${team?.division || 8}/standings`],
    enabled: !!team?.division,
  });

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE': return 'bg-red-600 text-red-100';
      case 'SCHEDULED': return 'bg-blue-600 text-blue-100';
      case 'COMPLETED': return 'bg-green-600 text-green-100';
      default: return 'bg-gray-600 text-gray-100';
    }
  };

  const getMatchResult = (match: Match, teamId: string) => {
    if (match.status !== 'COMPLETED') return null;
    
    const isHome = match.homeTeam.id === teamId;
    const teamScore = isHome ? match.homeScore : match.awayScore;
    const opponentScore = isHome ? match.awayScore : match.homeScore;
    
    if (teamScore > opponentScore) return 'W';
    if (teamScore < opponentScore) return 'L';
    return 'D';
  };

  const getResultColor = (result: string | null) => {
    switch (result) {
      case 'W': return 'text-green-400';
      case 'L': return 'text-red-400';
      case 'D': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto text-center py-16">
          <h1 className="font-orbitron text-3xl font-bold mb-6">Join the Competition</h1>
          <p className="text-gray-300 mb-8">Create your team to enter leagues and tournaments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header with Competition Overview */}
        <div className="hub-competition rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <div>
              <h1 className="text-hero font-orbitron text-white">Competition Center</h1>
              <p className="text-orange-200">Leagues, tournaments & live action</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-2">
              <Badge variant="outline" className="text-orange-200 border-orange-300">
                Division {team.division}
              </Badge>
              {team.subdivision && (
                <Badge variant="outline" className="text-orange-200 border-orange-300">
                  {team.subdivision.charAt(0).toUpperCase() + team.subdivision.slice(1)}
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Competition Stats */}
          <div className="grid-stats">
            <div className="mobile-card-compact">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Record</p>
                  <p className="text-xl font-bold text-green-400">
                    {team.wins}-{team.draws}-{team.losses}
                  </p>
                </div>
                <Trophy className="h-5 w-5 text-green-400" />
              </div>
            </div>

            <div className="mobile-card-compact">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Points</p>
                  <p className="text-xl font-bold text-blue-400">{team.points}</p>
                </div>
                <Star className="h-5 w-5 text-blue-400" />
              </div>
            </div>

            <div className="mobile-card-compact">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Live Matches</p>
                  <p className="text-xl font-bold text-red-400">{liveMatches?.length || 0}</p>
                </div>
                <Gamepad2 className="h-5 w-5 text-red-400" />
              </div>
            </div>

            <div className="mobile-card-compact">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Tournaments</p>
                  <p className="text-xl font-bold text-purple-400">{tournaments?.length || 0}</p>
                </div>
                <Award className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Seasonal Context Alert */}
        {seasonalState.currentPhase === 'DIVISION_TOURNAMENT' && (
          <Alert className="mb-6 border-yellow-600 bg-yellow-600/10">
            <Trophy className="h-4 w-4" />
            <AlertDescription className="text-yellow-200">
              <strong>Division Tournament Active!</strong> Compete for championship glory.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)}>
          
          {/* Mobile-Optimized Tab Navigation */}
          <div className="mb-6 overflow-x-auto">
            <TabsList className="inline-flex w-auto min-w-full bg-gray-800 p-1">
              <TabsTrigger value="overview" className="touch-target flex-1 min-w-[90px]">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="league" className="touch-target flex-1 min-w-[80px]">
                <Trophy className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">League</span>
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="touch-target flex-1 min-w-[100px]">
                <Award className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Tournaments</span>
              </TabsTrigger>
              <TabsTrigger value="matches" className="touch-target flex-1 min-w-[90px]">
                <Calendar className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Matches</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            
            {/* Live Matches Section */}
            {liveMatches && liveMatches.length > 0 && (
              <Card className="bg-gray-800 border-red-600">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5 text-red-400" />
                    Live Matches
                    <Badge variant="destructive" className="text-xs animate-pulse">
                      LIVE
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ImprovedLiveMatches maxMatches={5} />
                </CardContent>
              </Card>
            )}

            {/* Next Match Preview */}
            {upcomingMatches && upcomingMatches.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-400" />
                    Next Match
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mobile-card-interactive">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">
                          vs {upcomingMatches[0].homeTeam.id === team.id ? 
                              upcomingMatches[0].awayTeam.name : 
                              upcomingMatches[0].homeTeam.name}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {upcomingMatches[0].homeTeam.id === team.id ? 'Home' : 'Away'} • {upcomingMatches[0].matchType}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Play className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(upcomingMatches[0].gameDate).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Results */}
            {recentMatches && recentMatches.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-400" />
                    Recent Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentMatches.slice(0, 5).map((match) => {
                      const result = getMatchResult(match, team.id);
                      const isHome = match.homeTeam.id === team.id;
                      const opponent = isHome ? match.awayTeam.name : match.homeTeam.name;
                      const teamScore = isHome ? match.homeScore : match.awayScore;
                      const opponentScore = isHome ? match.awayScore : match.homeScore;
                      
                      return (
                        <div key={match.id} className="mobile-card-interactive">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`text-xs font-bold ${getResultColor(result).replace('text-', 'bg-')}`}>
                                  {result}
                                </Badge>
                                <span className="font-semibold">vs {opponent}</span>
                              </div>
                              <p className="text-sm text-gray-400">
                                {isHome ? 'Home' : 'Away'} • {match.matchType}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">
                                {teamScore} - {opponentScore}
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(match.gameDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* League Position Preview */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  League Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  {standings && (
                    <div className="space-y-2">
                      <div className="text-3xl font-bold text-yellow-400">
                        #{standings.findIndex(s => s.id === team.id) + 1}
                      </div>
                      <p className="text-gray-400">
                        out of {standings.length} teams
                      </p>
                      <div className="flex justify-center gap-4 text-sm">
                        <span className="text-green-400">W: {team.wins}</span>
                        <span className="text-yellow-400">D: {team.draws}</span>
                        <span className="text-red-400">L: {team.losses}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* League Tab */}
          <TabsContent value="league" className="space-y-6">
            <LeagueStandings />
          </TabsContent>

          {/* Tournaments Tab */}
          <TabsContent value="tournaments" className="space-y-6">
            <ComprehensiveTournamentManager />
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches" className="space-y-6">
            
            {/* Upcoming Matches */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  Upcoming Matches
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingMatches && upcomingMatches.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingMatches.map((match) => (
                      <div key={match.id} className="mobile-card-interactive">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">
                              vs {match.homeTeam.id === team.id ? 
                                  match.awayTeam.name : 
                                  match.homeTeam.name}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {match.homeTeam.id === team.id ? 'Home' : 'Away'} • {match.matchType}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(match.gameDate).toLocaleString()}
                            </p>
                          </div>
                          <Badge className={getMatchStatusColor(match.status)}>
                            {match.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No upcoming matches</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Matches */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-400" />
                  Match History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentMatches && recentMatches.length > 0 ? (
                  <div className="space-y-3">
                    {recentMatches.map((match) => {
                      const result = getMatchResult(match, team.id);
                      const isHome = match.homeTeam.id === team.id;
                      const opponent = isHome ? match.awayTeam.name : match.homeTeam.name;
                      const teamScore = isHome ? match.homeScore : match.awayScore;
                      const opponentScore = isHome ? match.awayScore : match.homeScore;
                      
                      return (
                        <div key={match.id} className="mobile-card-interactive">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`text-xs font-bold ${getResultColor(result).replace('text-', 'bg-')}`}>
                                  {result}
                                </Badge>
                                <span className="font-semibold">vs {opponent}</span>
                              </div>
                              <p className="text-sm text-gray-400">
                                {isHome ? 'Home' : 'Away'} • {match.matchType}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(match.gameDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg">
                                {teamScore} - {opponentScore}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No match history</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}