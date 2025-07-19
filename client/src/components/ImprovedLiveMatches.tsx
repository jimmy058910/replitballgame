import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Trophy, Users, Gamepad2 } from "lucide-react";

interface LiveMatch {
  id: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeam?: {
    id: string;
    name: string;
  };
  awayTeam?: {
    id: string;
    name: string;
  };
  homeTeamName?: string;
  awayTeamName?: string;
  matchType: 'LEAGUE' | 'EXHIBITION' | 'TOURNAMENT_DAILY' | 'TOURNAMENT_MIDSEASON';
  status: string;
  homeScore?: number;
  awayScore?: number;
  tournamentId?: string;
}

interface ImprovedLiveMatchesProps {
  className?: string;
  maxMatches?: number;
  showTitle?: boolean;
}

const getMatchTypeInfo = (matchType: string, tournamentId?: string) => {
  switch (matchType) {
    case 'LEAGUE':
      return { 
        label: 'League', 
        color: 'bg-blue-900/20 border-blue-700 text-blue-300',
        icon: Trophy 
      };
    case 'EXHIBITION':
      return { 
        label: 'Exhibition', 
        color: 'bg-green-900/20 border-green-700 text-green-300',
        icon: Gamepad2 
      };
    case 'TOURNAMENT_DAILY':
      return { 
        label: 'Daily Tournament', 
        color: 'bg-purple-900/20 border-purple-700 text-purple-300',
        icon: Users 
      };
    case 'TOURNAMENT_MIDSEASON':
      return { 
        label: 'Mid-Season Cup', 
        color: 'bg-yellow-900/20 border-yellow-700 text-yellow-300',
        icon: Trophy 
      };
    default:
      return { 
        label: 'Match', 
        color: 'bg-gray-900/20 border-gray-700 text-gray-300',
        icon: Clock 
      };
  }
};

export function ImprovedLiveMatches({ className = "", maxMatches = 5, showTitle = true }: ImprovedLiveMatchesProps) {
  const [, setLocation] = useLocation();

  const { data: rawLiveMatches, isLoading } = useQuery({
    queryKey: ["/api/matches/live"],
    refetchInterval: 5000,
  });

  const liveMatches = (rawLiveMatches || []) as LiveMatch[];

  const displayMatches = liveMatches.slice(0, maxMatches);

  return (
    <Card className={`bg-gray-800 border-gray-700 ${className}`}>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-red-400" />
            Live Matches
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showTitle ? "" : "pt-6"}>
        {isLoading ? (
          <p className="text-gray-400 text-center py-4">Loading live matches...</p>
        ) : displayMatches.length > 0 ? (
          <div className="space-y-3">
            {displayMatches.map((match: LiveMatch) => {
              const matchTypeInfo = getMatchTypeInfo(match.matchType, match.tournamentId);
              const Icon = matchTypeInfo.icon;
              
              return (
                <div 
                  key={match.id} 
                  className={`flex justify-between items-center p-4 rounded-lg border cursor-pointer hover:opacity-80 transition-all duration-200 ${matchTypeInfo.color}`}
                  onClick={() => setLocation(`/match/${match.id}`)}
                >
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4" />
                      <Badge variant="outline" className="text-xs">
                        {matchTypeInfo.label}
                      </Badge>
                    </div>
                    
                    <span className="text-sm font-medium text-white">
                      {match.homeTeam?.name || match.homeTeamName || `Team ${match.homeTeamId?.slice(0,4) ?? '?'}`} 
                      {(match.homeScore !== undefined && match.awayScore !== undefined) && (
                        <span className="mx-2 text-gray-400">
                          {match.homeScore} - {match.awayScore}
                        </span>
                      )}
                      vs {match.awayTeam?.name || match.awayTeamName || `Team ${match.awayTeamId?.slice(0,4) ?? '?'}`}
                    </span>
                    
                    <span className="text-xs text-gray-400">Click to watch live</span>
                  </div>
                  
                  <Badge variant="destructive" className="animate-pulse font-semibold">
                    LIVE
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No live matches</p>
            <p className="text-xs mt-1">Games will appear here when they start</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ImprovedLiveMatches;