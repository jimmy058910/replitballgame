/**
 * Exhibition Matches Component
 * Handles instant matches, opponent selection, and exhibition history
 * Extracted from ComprehensiveCompetitionCenter.tsx
 */

import React, { useCallback, useMemo } from 'react';
import { 
  Play, 
  Users, 
  Zap, 
  DollarSign, 
  ChevronDown,
  Star,
  Trophy,
  Target,
  Clock
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { useExhibitionGames } from '../hooks/useExhibitionGames';
import { CompetitionCard } from './shared/CompetitionCard';
import { MatchStatusIndicator } from './shared/MatchStatusIndicator';
import { formatCredits } from '../utils/competition.utils';
import type { CompetitionComponentProps } from '../types/competition.types';

interface ExhibitionMatchesProps extends CompetitionComponentProps {
  // Additional props specific to exhibitions
}

export const ExhibitionMatches = React.memo<ExhibitionMatchesProps>(({ team }) => {
  const {
    exhibitionStats,
    exhibitionHistory,
    availableOpponents,
    showOpponentSelect,
    setShowOpponentSelect,
    startInstantMatch,
    challengeOpponent,
    buyExhibitionToken
  } = useExhibitionGames(team);

  // Handle instant match creation
  const handleInstantMatch = useCallback(() => {
    startInstantMatch.mutate();
  }, [startInstantMatch]);

  // Handle opponent challenge
  const handleChallengeOpponent = useCallback((opponentId: string) => {
    challengeOpponent.mutate(opponentId);
  }, [challengeOpponent]);

  // Handle token purchase
  const handleBuyToken = useCallback(() => {
    buyExhibitionToken.mutate();
  }, [buyExhibitionToken]);

  // Toggle opponent selection
  const toggleOpponentSelect = useCallback(() => {
    setShowOpponentSelect(!showOpponentSelect);
  }, [showOpponentSelect, setShowOpponentSelect]);

  // Memoized exhibition stats
  const exhibitionStatsDisplay = useMemo(() => {
    if (!exhibitionStats) return null;
    
    return {
      freeEntries: exhibitionStats.freeEntriesRemaining || 0,
      extraTokens: exhibitionStats.extraTokens || 0,
      totalEntries: (exhibitionStats.freeEntriesRemaining || 0) + (exhibitionStats.extraTokens || 0)
    };
  }, [exhibitionStats]);

  return (
    <div className="space-y-4">
      {/* Start Exhibition Panel */}
      <Collapsible defaultOpen className="space-y-2">
        <CollapsibleTrigger className="w-full">
          <CompetitionCard gradient="green" className="hover:border-green-400 transition-all duration-300 shadow-lg cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-600/30 rounded-lg">
                  <Zap className="h-6 w-6 text-green-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold text-white">Start Exhibition Match</h3>
                  <p className="text-sm text-green-200">Quick matches for practice and rewards</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {exhibitionStatsDisplay && (
                  <Badge className="bg-green-700 text-green-100">
                    {exhibitionStatsDisplay.totalEntries} entries available
                  </Badge>
                )}
                <ChevronDown className="h-5 w-5 text-green-400" />
              </div>
            </div>
          </CompetitionCard>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-3">
          {/* Exhibition Stats */}
          {exhibitionStatsDisplay && (
            <CompetitionCard>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {exhibitionStatsDisplay.freeEntries}
                  </div>
                  <div className="text-xs text-gray-400">Free Entries</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">
                    {exhibitionStatsDisplay.extraTokens}
                  </div>
                  <div className="text-xs text-gray-400">Extra Tokens</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-400">
                    {exhibitionStatsDisplay.totalEntries}
                  </div>
                  <div className="text-xs text-gray-400">Total Available</div>
                </div>
              </div>
            </CompetitionCard>
          )}

          {/* Match Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Instant Match */}
            <CompetitionCard>
              <div className="text-center space-y-4">
                <div className="p-4 bg-blue-600/20 rounded-lg">
                  <Play className="h-8 w-8 mx-auto text-blue-400 mb-2" />
                  <h4 className="font-bold text-white">Instant Match</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Quick match against random opponent
                  </p>
                </div>
                
                <Button 
                  onClick={handleInstantMatch}
                  disabled={startInstantMatch.isPending || !exhibitionStatsDisplay?.totalEntries}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {startInstantMatch.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Creating Match...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Instant Match
                    </>
                  )}
                </Button>
              </div>
            </CompetitionCard>

            {/* Choose Opponent */}
            <CompetitionCard>
              <div className="text-center space-y-4">
                <div className="p-4 bg-purple-600/20 rounded-lg">
                  <Users className="h-8 w-8 mx-auto text-purple-400 mb-2" />
                  <h4 className="font-bold text-white">Choose Opponent</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Select your opponent strategically
                  </p>
                </div>
                
                <Button 
                  onClick={toggleOpponentSelect}
                  disabled={!exhibitionStatsDisplay?.totalEntries}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                >
                  <Target className="h-4 w-4 mr-2" />
                  {showOpponentSelect ? 'Hide Opponents' : 'Choose Opponent'}
                </Button>
              </div>
            </CompetitionCard>
          </div>

          {/* Opponent Selection */}
          {showOpponentSelect && (
            <CompetitionCard title="Available Opponents">
              {availableOpponents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableOpponents.map((opponent: any) => (
                    <div 
                      key={opponent.id} 
                      className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-purple-500/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h5 className="font-bold text-white">{opponent.name}</h5>
                          <p className="text-sm text-gray-400">
                            Division {opponent.division} • {opponent.wins || 0}W-{opponent.losses || 0}L
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-blue-400 font-semibold">
                            {opponent.points || 0} pts
                          </div>
                          {opponent.teamPower && (
                            <div className="text-xs text-gray-500">
                              Power: {opponent.teamPower}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => handleChallengeOpponent(opponent.id)}
                        disabled={challengeOpponent.isPending}
                        size="sm"
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {challengeOpponent.isPending ? (
                          <>
                            <Clock className="h-3 w-3 mr-1 animate-spin" />
                            Challenging...
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Challenge
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No opponents available</p>
                  <p className="text-sm">Try the instant match option instead</p>
                </div>
              )}
            </CompetitionCard>
          )}

          {/* Buy Token Option */}
          {exhibitionStatsDisplay && exhibitionStatsDisplay.totalEntries === 0 && (
            <CompetitionCard gradient="orange">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <DollarSign className="h-6 w-6 text-orange-400" />
                  <h4 className="font-bold text-white">Need More Entries?</h4>
                </div>
                
                <p className="text-sm text-orange-200">
                  Purchase additional exhibition tokens to continue playing
                </p>
                
                <Button 
                  onClick={handleBuyToken}
                  disabled={buyExhibitionToken.isPending}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {buyExhibitionToken.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Purchasing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Buy Token - {formatCredits(1000)}
                    </>
                  )}
                </Button>
              </div>
            </CompetitionCard>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Exhibition History */}
      <CompetitionCard title="📋 Exhibition History">
        {exhibitionHistory.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {exhibitionHistory.slice(0, 10).map((match: any, index: number) => {
              const isUserHome = String(match.homeTeam?.id) === String(team?.id);
              const opponentName = isUserHome ? match.awayTeam?.name : match.homeTeam?.name;
              const userScore = isUserHome ? match.homeScore : match.awayScore;
              const opponentScore = isUserHome ? match.awayScore : match.homeScore;
              
              return (
                <div key={match.id || index} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white">
                        vs {opponentName}
                      </h4>
                      <p className="text-sm text-gray-300">
                        {match.gameDate ? new Date(match.gameDate).toLocaleDateString() : 'Recent'} • {isUserHome ? 'Home' : 'Away'}
                      </p>
                    </div>
                    <div className="text-right">
                      <MatchStatusIndicator 
                        status={match.status}
                        homeScore={match.homeScore}
                        awayScore={match.awayScore}
                        gameDate={match.gameDate}
                      />
                      {match.status === 'COMPLETED' && (
                        <Badge 
                          className={
                            userScore > opponentScore
                              ? 'bg-green-600 text-green-100'
                              : userScore < opponentScore
                              ? 'bg-red-600 text-red-100'
                              : 'bg-yellow-600 text-yellow-100'
                          }
                        >
                          {userScore > opponentScore ? 'WIN' : 
                           userScore < opponentScore ? 'LOSS' : 'DRAW'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No exhibition matches yet</p>
            <p className="text-sm">Start your first exhibition match to build your record!</p>
          </div>
        )}
      </CompetitionCard>
    </div>
  );
});

ExhibitionMatches.displayName = 'ExhibitionMatches';