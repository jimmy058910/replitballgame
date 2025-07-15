import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Play, Clock, Users } from 'lucide-react';

interface TournamentMatch {
  id: string;
  homeTeam: {
    id: string;
    name: string;
  };
  awayTeam: {
    id: string;
    name: string;
  };
  round: string;
  status: string;
  homeTeamScore?: number;
  awayTeamScore?: number;
  gameTime?: string;
  winner?: string;
}

interface TournamentBracketProps {
  tournament: {
    id: string;
    name: string;
    status: string;
    currentStage: string | null;
  };
  matches: TournamentMatch[];
  userTeamId: string;
  isAdmin: boolean;
  onSimulateRound: (round: string) => void;
}

export default function TournamentBracket({ tournament, matches, userTeamId, isAdmin, onSimulateRound }: TournamentBracketProps) {
  // Group matches by round
  const quarterfinalsMatches = matches.filter(m => m.round === 'QUARTERFINALS');
  const semifinalsMatches = matches.filter(m => m.round === 'SEMIFINALS');
  const finalsMatches = matches.filter(m => m.round === 'FINALS');

  const MatchCard = ({ match, isUserTeam }: { match: TournamentMatch; isUserTeam: boolean }) => {
    const isCompleted = match.status === 'COMPLETED';
    const isLive = match.status === 'LIVE';
    const isScheduled = match.status === 'SCHEDULED';
    
    const handleMatchClick = () => {
      if (isLive) {
        // Navigate to live match viewer
        window.location.href = `/live-match/${match.id}`;
      } else if (isCompleted) {
        // Navigate to completed match summary
        window.location.href = `/live-match/${match.id}`;
      }
    };
    
    return (
      <div 
        className={`relative bg-white dark:bg-gray-800 border-2 rounded-lg p-3 min-w-[180px] ${
          isUserTeam ? 'border-blue-500 shadow-lg' : 'border-gray-300 dark:border-gray-600'
        } ${(isLive || isCompleted) ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
        onClick={(isLive || isCompleted) ? handleMatchClick : undefined}
      >
        {isUserTeam && (
          <Badge className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs">
            YOUR TEAM
          </Badge>
        )}
        
        <div className="space-y-2">
          {/* Home Team */}
          <div className={`flex items-center justify-between p-2 rounded ${
            isCompleted && match.homeTeamScore > match.awayTeamScore 
              ? 'bg-green-100 dark:bg-green-900 font-semibold' 
              : 'bg-gray-50 dark:bg-gray-700'
          }`}>
            <span className="text-sm truncate text-gray-900 dark:text-gray-100">{match.homeTeam.name}</span>
            <span className="font-bold text-gray-900 dark:text-gray-100 ml-2">
              {isCompleted ? match.homeTeamScore : (isLive ? match.homeTeamScore || 0 : '')}
            </span>
          </div>
          
          {/* Away Team */}
          <div className={`flex items-center justify-between p-2 rounded ${
            isCompleted && match.awayTeamScore > match.homeTeamScore 
              ? 'bg-green-100 dark:bg-green-900 font-semibold' 
              : 'bg-gray-50 dark:bg-gray-700'
          }`}>
            <span className="text-sm truncate text-gray-900 dark:text-gray-100">{match.awayTeam.name}</span>
            <span className="font-bold text-gray-900 dark:text-gray-100 ml-2">
              {isCompleted ? match.awayTeamScore : (isLive ? match.awayTeamScore || 0 : '')}
            </span>
          </div>
          
          {/* Status */}
          <div className="flex items-center justify-center space-x-1">
            {isLive && (
              <Badge variant="destructive" className="text-xs">
                <Play className="w-3 h-3 mr-1" />
                LIVE
              </Badge>
            )}
            {isScheduled && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {match.gameTime || 'Tournament Start'}
              </Badge>
            )}
            {isCompleted && (
              <Badge variant="secondary" className="text-xs">
                FINAL
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  const TBDCard = ({ round }: { round: string }) => (
    <div className="bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 min-w-[180px]">
      <div className="space-y-2">
        <div className="flex items-center justify-center p-2 bg-gray-200 dark:bg-gray-600 rounded">
          <span className="text-sm text-gray-500 dark:text-gray-400">TBD</span>
        </div>
        <div className="flex items-center justify-center p-2 bg-gray-200 dark:bg-gray-600 rounded">
          <span className="text-sm text-gray-500 dark:text-gray-400">TBD</span>
        </div>
        <div className="flex items-center justify-center">
          <Badge variant="outline" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            {round}
          </Badge>
        </div>
      </div>
    </div>
  );

  const ConnectorLine = ({ vertical = false, className = "" }: { vertical?: boolean; className?: string }) => (
    <div 
      className={`bg-gray-400 dark:bg-gray-600 ${vertical ? 'w-0.5 h-8' : 'h-0.5 w-8'} ${className}`}
    />
  );

  const isUserInMatch = (match: TournamentMatch) => {
    return match.homeTeam.id === userTeamId || match.awayTeam.id === userTeamId;
  };

  const canSimulateRound = (round: string) => {
    const roundMatches = matches.filter(m => m.round === round);
    return roundMatches.length > 0 && roundMatches.every(m => m.status === 'SCHEDULED');
  };

  return (
    <Card className="w-full max-w-6xl mx-auto bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <CardContent className="p-6">
        {/* Tournament Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {tournament.name}
            </h2>
          </div>
          <div className="flex items-center justify-center space-x-4">
            <Badge variant={tournament.status === 'IN_PROGRESS' ? 'destructive' : 'secondary'}>
              {tournament.status === 'IN_PROGRESS' ? 'TOURNAMENT IN PROGRESS' : tournament.status}
            </Badge>
            {tournament.currentStage && (
              <Badge variant="outline">
                Current Stage: {tournament.currentStage}
              </Badge>
            )}
          </div>
        </div>

        {/* Tournament Bracket */}
        <div className="flex items-center justify-center space-x-4 overflow-x-auto pb-4">
          {/* Quarterfinals */}
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quarterfinals</h3>
              {isAdmin && canSimulateRound('QUARTERFINALS') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSimulateRound('QUARTERFINALS')}
                  className="ml-2"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Simulate All
                </Button>
              )}
            </div>
            
            <div className="space-y-8">
              {quarterfinalsMatches.map((match, index) => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  isUserTeam={isUserInMatch(match)}
                />
              ))}
            </div>
          </div>

          {/* Connecting Lines to Semifinals */}
          <div className="flex flex-col items-center justify-center space-y-16">
            <ConnectorLine />
            <ConnectorLine />
          </div>

          {/* Semifinals */}
          <div className="flex flex-col items-center space-y-8">
            <div className="flex items-center space-x-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Semifinals</h3>
              {isAdmin && canSimulateRound('SEMIFINALS') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSimulateRound('SEMIFINALS')}
                  className="ml-2"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Simulate All
                </Button>
              )}
            </div>
            
            <div className="space-y-16">
              {semifinalsMatches.length > 0 ? (
                semifinalsMatches.map((match, index) => (
                  <MatchCard 
                    key={match.id} 
                    match={match} 
                    isUserTeam={isUserInMatch(match)}
                  />
                ))
              ) : (
                <>
                  <TBDCard round="Semifinals" />
                  <TBDCard round="Semifinals" />
                </>
              )}
            </div>
          </div>

          {/* Connecting Lines to Finals */}
          <div className="flex flex-col items-center justify-center">
            <ConnectorLine />
          </div>

          {/* Finals */}
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Finals</h3>
              {isAdmin && canSimulateRound('FINALS') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSimulateRound('FINALS')}
                  className="ml-2"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Simulate All
                </Button>
              )}
            </div>
            
            {finalsMatches.length > 0 ? (
              <MatchCard 
                match={finalsMatches[0]} 
                isUserTeam={isUserInMatch(finalsMatches[0])}
              />
            ) : (
              <TBDCard round="Finals" />
            )}
          </div>

          {/* Champion */}
          <div className="flex flex-col items-center">
            <ConnectorLine />
            <div className="mt-4 bg-gradient-to-r from-yellow-400 to-yellow-600 dark:from-yellow-500 dark:to-yellow-700 rounded-lg p-4 min-w-[120px] text-center">
              <Trophy className="w-8 h-8 text-white mx-auto mb-2" />
              <div className="text-white font-bold text-sm">
                {finalsMatches.length > 0 && finalsMatches[0].status === 'COMPLETED' 
                  ? finalsMatches[0].winner || 'Champion'
                  : 'Champion'
                }
              </div>
            </div>
          </div>
        </div>


      </CardContent>
    </Card>
  );
}