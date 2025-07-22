import { useEffect, useState, startTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSeasonalUI, getPhaseDisplayName, getPrimaryActionLabel } from "@/hooks/useSeasonalUI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import CareerHighlights from "@/components/CareerHighlights";
import {
  Calendar, Clock, Trophy, Users, Zap, AlertTriangle, 
  TrendingUp, Target, Gamepad2, ChevronRight
} from "lucide-react";

// Enhanced interfaces for new architecture
interface Team {
  id: string;
  name: string;
  division: number;
  subdivision?: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  teamPower: number;
  camaraderie: number;
}

interface Finances {
  credits: number;
  gems: number;
}

interface SeasonData {
  season: string;
  currentDay: number;
  phase: string;
  description: string;
  details: string;
}

interface NextMatch {
  id: string;
  opponent: string;
  gameDate: string;
  isHome: boolean;
  matchType: string;
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  route: string;
  badge?: string;
}

export default function CommandCenter() {
  const { isAuthenticated } = useAuth();
  const { seasonalState, seasonalData, isLoading: seasonalLoading } = useSeasonalUI();
  
  const { data: team } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
    enabled: isAuthenticated,
  });

  const { data: finances } = useQuery<Finances>({
    queryKey: [`/api/teams/${team?.id}/finances`],
    enabled: !!team?.id,
  });

  const { data: nextMatch } = useQuery<NextMatch>({
    queryKey: [`/api/teams/${team?.id}/next-match`],
    enabled: !!team?.id,
  });

  const { data: liveMatches } = useQuery<any[]>({
    queryKey: ["/api/matches/live"],
    refetchInterval: 30000, // 30 seconds
  });

  const { data: serverTimeResponse } = useQuery<{data: any}>({
    queryKey: ["/api/server/time"],
    refetchInterval: 2 * 60 * 1000, // Update every 2 minutes
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
  });

  // Generate contextual action items based on seasonal phase
  const getContextualActions = (): ActionItem[] => {
    const actions: ActionItem[] = [];
    
    seasonalState.primaryActions.forEach((action, index) => {
      const actionConfig = {
        'finalize_roster': {
          title: 'Finalize Roster',
          description: 'Review and confirm your team lineup for the new season',
          route: '/roster-hq?tab=roster',
          priority: 'high' as const
        },
        'set_tactics': {
          title: 'Set Tactics',
          description: 'Configure your team\'s formation and game strategy',
          route: '/roster-hq?tab=tactics',
          priority: 'high' as const
        },
        'check_lineup': {
          title: 'Check Lineup',
          description: 'Review starting lineup and substitution order',
          route: '/roster-hq?tab=tactics',
          priority: 'medium' as const
        },
        'view_next_opponent': {
          title: 'Scout Next Opponent',
          description: 'Analyze upcoming opponent strengths and weaknesses',
          route: '/competition?tab=schedule',
          priority: 'medium' as const
        },
        'view_bracket': {
          title: 'View Tournament Bracket',
          description: 'Check tournament standings and upcoming matches',
          route: '/competition?tab=tournaments',
          priority: 'high' as const
        },
        'negotiate_contracts': {
          title: 'Negotiate Contracts',
          description: 'Manage player contracts and staff agreements',
          route: '/roster-hq?tab=contracts',
          priority: 'high' as const
        }
      };

      const config = actionConfig[action as keyof typeof actionConfig];
      if (config) {
        actions.push({
          id: `action-${index}`,
          ...config,
          badge: index === 0 ? 'Priority' : undefined
        });
      }
    });

    return actions;
  };

  const contextualActions = getContextualActions();

  const formatTimeUntilNextGameDay = () => {
    if (!serverTimeResponse?.data?.timeUntilNextWindow) return "Loading...";
    
    const { hours, minutes } = serverTimeResponse.data.timeUntilNextWindow;
    return `${hours || 0}h ${minutes || 0}m`;
  };

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto text-center py-16">
          <h1 className="font-orbitron text-3xl font-bold mb-6">Welcome to Realm Rivalry!</h1>
          <p className="text-gray-300 mb-8">Your fantasy sports journey begins here.</p>
          <Button onClick={() => window.location.href = '/roster-hq'} size="lg">
            Create Your Team
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Mission Control Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-orbitron text-2xl font-bold">Team HQ</h1>
              <p className="text-gray-400">Mission control for {team.name}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              Day {seasonalState.gameDay}/17
            </Badge>
          </div>

          {/* Seasonal Context Alert */}
          <Alert className="mb-6 border-yellow-600 bg-yellow-600/10">
            <Calendar className="h-4 w-4" />
            <AlertDescription className="text-yellow-200">
              <strong>{getPhaseDisplayName(seasonalState.currentPhase)}</strong> - {seasonalState.contextualMessage}
            </AlertDescription>
          </Alert>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Team Power</p>
                  <p className="text-xl font-bold text-blue-400">{team.teamPower || 'N/A'}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Record</p>
                  <p className="text-xl font-bold text-green-400">
                    {team.wins}-{team.draws ?? 0}-{team.losses}
                  </p>
                </div>
                <Trophy className="h-5 w-5 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Credits</p>
                  <p className="text-xl font-bold text-yellow-400">
                    {parseInt(String(finances?.credits || 0)).toLocaleString()}
                  </p>
                </div>
                <Zap className="h-5 w-5 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Next Game</p>
                  <p className="text-sm font-bold text-purple-400">
                    {formatTimeUntilNextGameDay()}
                  </p>
                </div>
                <Clock className="h-5 w-5 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Priority Actions */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Priority Actions */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-400" />
                  Priority Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contextualActions.map((action) => (
                  <Link key={action.id} href={action.route}>
                    <div className={`p-4 rounded-lg border transition-all cursor-pointer hover:bg-gray-700/50 ${
                      action.priority === 'high' ? 'border-orange-600 bg-orange-600/10' :
                      action.priority === 'medium' ? 'border-yellow-600 bg-yellow-600/10' :
                      'border-gray-600 bg-gray-600/10'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{action.title}</h3>
                            {action.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {action.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{action.description}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Live Matches */}
            {liveMatches && liveMatches.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
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
                  <div className="space-y-3">
                    {liveMatches.slice(0, 3).map((match) => (
                      <Link key={match.id} href={`/match/${match.id}`}>
                        <div className="p-3 border border-red-600/30 bg-red-600/10 rounded-lg cursor-pointer hover:bg-red-600/20 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{match.homeTeam?.name} vs {match.awayTeam?.name}</p>
                              <p className="text-sm text-gray-400">{match.homeScore} - {match.awayScore}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="destructive" className="text-xs">
                                {match.gameTime || 'Live'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Season Progress */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-400" />
                  Season Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Day {seasonalState.gameDay} of 17</span>
                      <span>{Math.round((seasonalState.gameDay / 17) * 100)}% Complete</span>
                    </div>
                    <Progress value={(seasonalState.gameDay / 17) * 100} className="h-2" />
                  </div>
                  
                  <div className="bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-sm text-gray-300">
                      {seasonalData?.description || 'Season in progress'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Navigation */}
          <div className="space-y-6">
            
            {/* Career Highlights - Enhanced Achievement System */}
            <CareerHighlights 
              teamId={team.id} 
              maxHighlights={5}
              showSocialProof={true}
              variant="compact"
            />
            
            {/* Hub Quick Access */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Quick Access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/roster-hq">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Roster HQ
                  </Button>
                </Link>
                <Link href="/competition">
                  <Button variant="outline" className="w-full justify-start">
                    <Trophy className="h-4 w-4 mr-2" />
                    Competition Center
                  </Button>
                </Link>
                <Link href="/market-district">
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Market District
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Next Match Preview */}
            {nextMatch && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-sm">Next Match</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="font-semibold mb-1">vs {nextMatch.opponent}</p>
                    <p className="text-sm text-gray-400 mb-2">
                      {nextMatch.isHome ? 'Home' : 'Away'} • {nextMatch.matchType}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {new Date(nextMatch.gameDate).toLocaleDateString()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Disabled Features Alert */}
            {seasonalState.disabledFeatures.length > 0 && (
              <Card className="bg-gray-800 border-yellow-600">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    Temporarily Unavailable
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {seasonalState.disabledFeatures.map((feature) => (
                      <p key={feature} className="text-xs text-gray-400">
                        • {feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}