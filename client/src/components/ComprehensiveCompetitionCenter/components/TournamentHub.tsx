/**
 * Tournament Hub Component
 * Handles tournament registration, history, bracket visualization, and rewards
 * Extracted from ComprehensiveCompetitionCenter.tsx
 */

import React, { useCallback, useMemo } from 'react';
import { 
  Trophy, 
  Medal, 
  Clock, 
  Star, 
  Eye, 
  Timer, 
  Activity,
  DollarSign,
  Gem
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Alert, AlertDescription } from '../../ui/alert';
import { Progress } from '../../ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { useTournamentSystem } from '../hooks/useTournamentSystem';
import { CompetitionCard } from './shared/CompetitionCard';
import { DivisionBadge } from './shared/DivisionBadge';
import { RewardsDisplay } from './shared/RewardsDisplay';
import { 
  getDivisionName, 
  getDailyTournamentRewards, 
  getMidSeasonCupRewards, 
  getMidSeasonCupEntryFees,
  formatCredits,
  formatGems
} from '../utils/competition.utils';
import type { CompetitionComponentProps } from '../types/competition.types';

interface TournamentHubProps extends CompetitionComponentProps {
  // Additional props specific to tournaments
}

export const TournamentHub = React.memo<TournamentHubProps>(({ team }) => {
  const {
    tournaments,
    availableTournaments,
    myTournaments,
    tournamentHistory,
    currentTournamentStatus,
    tournamentBracket,
    isHistoryLoading,
    isCurrentTournamentLoading,
    isBracketModalOpen,
    isDetailsModalOpen,
    currentTime,
    openBracketModal,
    closeBracketModal,
    openDetailsModal,
    closeDetailsModal,
    registerDailyTournament,
    registerMidSeasonCup,
    calculateTimeRemaining,
    formatTournamentCountdown
  } = useTournamentSystem(team);

  // Memoized tournament rewards
  const dailyRewards = useMemo(() => 
    getDailyTournamentRewards(team?.division || 8), 
    [team?.division]
  );
  
  const midSeasonRewards = useMemo(() => 
    getMidSeasonCupRewards(team?.division || 8), 
    [team?.division]
  );
  
  const midSeasonEntryFees = useMemo(() => 
    getMidSeasonCupEntryFees(team?.division || 8), 
    [team?.division]
  );

  // Handle daily tournament registration
  const handleDailyRegistration = useCallback(() => {
    registerDailyTournament.mutate();
  }, [registerDailyTournament]);

  // Handle Mid-Season Cup registration
  const handleMidSeasonRegistration = useCallback((paymentMethod: 'credits' | 'gems') => {
    registerMidSeasonCup.mutate(paymentMethod);
  }, [registerMidSeasonCup]);

  // Render tournament bracket
  const renderBracket = useCallback(() => {
    if (!tournamentBracket?.rounds) {
      return <p className="text-gray-400 text-center py-4">No bracket data available</p>;
    }

    const rounds = Object.keys(tournamentBracket.rounds)
      .sort((a, b) => parseInt(a) - parseInt(b));

    return (
      <div className="space-y-6">
        {rounds.map((round) => {
          const roundMatches = tournamentBracket.rounds[round];
          const roundNames: Record<string, string> = {
            '1': 'Quarterfinals',
            '2': 'Semifinals', 
            '3': 'Final'
          };
          const roundName = roundNames[round] || `Round ${round}`;
          
          return (
            <div key={round} className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-lg font-bold text-yellow-400 mb-3 text-center">
                {roundName} (Round {round})
              </h4>
              <div className="space-y-3">
                {roundMatches.map((match: any, index: number) => (
                  <div key={match.id || index} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="text-white">
                        <span className="font-semibold">{match.homeTeam?.name || 'TBD'}</span>
                        <span className="mx-2 text-gray-400">vs</span>
                        <span className="font-semibold">{match.awayTeam?.name || 'TBD'}</span>
                      </div>
                      <div className="text-sm text-gray-400">
                        Game {match.id}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {match.status === 'COMPLETED' && match.homeScore !== null && match.awayScore !== null ? (
                        <span className="text-green-400 font-bold">
                          Final: {match.homeScore} - {match.awayScore}
                        </span>
                      ) : match.status === 'LIVE' ? (
                        <span className="text-red-400 font-bold animate-pulse">● LIVE</span>
                      ) : (
                        <span className="text-blue-400">Scheduled</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [tournamentBracket]);

  if (isCurrentTournamentLoading) {
    return (
      <CompetitionCard title="🏆 Tournaments">
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-orange-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading tournament details...</p>
        </div>
      </CompetitionCard>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Active Tournament Section */}
        <CompetitionCard gradient="orange">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-600/20 rounded-lg">
                  <Trophy className="h-6 w-6 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Daily Division Tournament</h3>
                  <p className="text-sm text-orange-200">
                    {getDivisionName(team?.division || 8)} Division
                  </p>
                </div>
              </div>
              <DivisionBadge division={team?.division || 8} subdivision={team?.subdivision} />
            </div>

            {currentTournamentStatus?.hasActiveTournament ? (
              <div className="space-y-3">
                <Alert className="border-orange-500/50 bg-orange-900/20">
                  <Trophy className="h-4 w-4" />
                  <AlertDescription className="text-orange-200">
                    Tournament is active! {currentTournamentStatus.totalTeams} teams competing for glory.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button 
                    onClick={openBracketModal}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Bracket
                  </Button>
                  <Button 
                    onClick={openDetailsModal}
                    variant="outline"
                    className="flex-1 border-orange-500/50 text-orange-300 hover:bg-orange-600/20"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Details
                  </Button>
                </div>

                {currentTournamentStatus.registrationEndTime && (
                  <div className="text-center">
                    <div className="text-sm text-orange-300 mb-1">Tournament Status</div>
                    <div className="font-bold text-orange-400">
                      {formatTournamentCountdown(currentTournamentStatus.registrationEndTime)}
                    </div>
                  </div>
                )}
              </div>
            ) : currentTournamentStatus?.canRegister ? (
              <div className="space-y-3">
                <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-blue-400" />
                    <h4 className="font-bold text-blue-300">Registration Open</h4>
                  </div>
                  
                  {currentTournamentStatus.registrationEndTime && (
                    <div className="mb-3">
                      <div className="text-sm text-gray-400 mb-1">Registration ends in:</div>
                      <div className="text-lg font-bold text-blue-400">
                        {formatTournamentCountdown(currentTournamentStatus.registrationEndTime)}
                      </div>
                      <Progress 
                        value={Math.max(0, 100 - ((calculateTimeRemaining(currentTournamentStatus.registrationEndTime) / (1000 * 60 * 60 * 2)) * 100))} 
                        className="mt-2 bg-gray-700" 
                      />
                    </div>
                  )}

                  <RewardsDisplay
                    credits={dailyRewards.champion}
                    gems={dailyRewards.championGems}
                    label="Champion Reward"
                    className="mb-3"
                  />

                  <Button 
                    onClick={handleDailyRegistration}
                    disabled={registerDailyTournament.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {registerDailyTournament.isPending ? (
                      <>
                        <Timer className="h-4 w-4 mr-2 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <Trophy className="h-4 w-4 mr-2" />
                        Register FREE
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Alert className="border-gray-600 bg-gray-800/50">
                <Clock className="h-4 w-4" />
                <AlertDescription className="text-gray-400">
                  No active tournament. Check back later for the next registration period.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CompetitionCard>

        {/* Mid-Season Cup */}
        <CompetitionCard gradient="purple">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <Medal className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Mid-Season Cup</h3>
                <p className="text-sm text-purple-200">Premium Tournament</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Champion Reward:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-green-400 font-bold">
                    {formatCredits(midSeasonRewards.champion)}
                  </span>
                  <span className="text-blue-400 font-bold">
                    {formatGems(midSeasonRewards.championGems)}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-gray-400">Entry Fee:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-orange-400 font-bold">
                    {formatCredits(midSeasonEntryFees.credits)} OR {formatGems(midSeasonEntryFees.gems)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => handleMidSeasonRegistration('credits')}
                disabled={registerMidSeasonCup.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Pay {formatCredits(midSeasonEntryFees.credits)}
              </Button>
              <Button 
                onClick={() => handleMidSeasonRegistration('gems')}
                disabled={registerMidSeasonCup.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Gem className="h-4 w-4 mr-1" />
                Pay {formatGems(midSeasonEntryFees.gems)}
              </Button>
            </div>
          </div>
        </CompetitionCard>

        {/* Tournament History */}
        <CompetitionCard title="🏆 Tournament History">
          {isHistoryLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Loading tournament history...</p>
            </div>
          ) : tournamentHistory.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {tournamentHistory.map((tournament: any, index: number) => {
                const finalRank = tournament.finalRank || tournament.placement || 0;
                const creditsEarned = tournament.creditsEarned || 0;
                
                return (
                  <div key={tournament.id || index} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          finalRank === 1 ? 'bg-yellow-600/20' :
                          finalRank <= 3 ? 'bg-blue-600/20' :
                          'bg-gray-600/20'
                        }`}>
                          {finalRank === 1 ? <Medal className="h-5 w-5 text-yellow-400" /> : <Trophy className="h-5 w-5 text-blue-400" />}
                        </div>
                        <div>
                          <h5 className="font-bold text-white">Daily Divisional Tournament</h5>
                          <p className="text-sm text-gray-400">
                            {getDivisionName(tournament.division)} Division • ID: {tournament.id}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${
                          finalRank === 1 ? 'bg-yellow-600 text-yellow-100' :
                          finalRank <= 3 ? 'bg-blue-600 text-blue-100' :
                          'bg-gray-600 text-gray-100'
                        }`}>
                          {finalRank === 1 ? '🥇 Champion' :
                           finalRank === 2 ? '🥈 Runner-up' :
                           finalRank === 3 ? '🥉 3rd Place' :
                           `#${finalRank}`}
                        </Badge>
                        {creditsEarned > 0 && (
                          <p className="text-sm text-green-400 font-semibold mt-1">
                            +{formatCredits(creditsEarned)}
                          </p>
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
              <p>No tournament history yet</p>
              <p className="text-sm">Register for tournaments to build your legacy!</p>
            </div>
          )}
        </CompetitionCard>
      </div>

      {/* Bracket Modal */}
      <Dialog open={isBracketModalOpen} onOpenChange={closeBracketModal}>
        <DialogContent className="bg-gray-800 border-gray-600 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tournament Bracket</DialogTitle>
          </DialogHeader>
          {renderBracket()}
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={closeDetailsModal}>
        <DialogContent className="bg-gray-800 border-gray-600 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Tournament Details</DialogTitle>
          </DialogHeader>
          {currentTournamentStatus ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-lg">Daily Division Tournament</h4>
                <p className="text-sm text-gray-400">
                  {getDivisionName(team?.division || 8)} Division
                </p>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Teams:</span>
                  <span className="text-white font-semibold">{currentTournamentStatus.totalTeams || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <Badge className={currentTournamentStatus.hasActiveTournament ? 'bg-green-600' : 'bg-blue-600'}>
                    {currentTournamentStatus.hasActiveTournament ? 'Active' : 'Registration'}
                  </Badge>
                </div>
              </div>

              <div className="border-t border-gray-600 pt-4">
                <h5 className="font-semibold mb-2 text-purple-300">Prize Structure</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Champion:</span>
                    <RewardsDisplay 
                      credits={dailyRewards.champion}
                      gems={dailyRewards.championGems}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Runner-up:</span>
                    <span className="text-blue-400 font-semibold">
                      {formatCredits(dailyRewards.runnerUp)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Loading tournament details...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
});

TournamentHub.displayName = 'TournamentHub';