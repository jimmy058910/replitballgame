/**
 * League Standings Component
 * Handles division standings table with promotion/relegation indicators
 * Extracted from ComprehensiveCompetitionCenter.tsx
 */

import React, { useCallback, useMemo } from 'react';
import { Eye, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { useLeagueStandings } from '../hooks/useLeagueStandings';
import { CompetitionCard } from './shared/CompetitionCard';
import { DivisionBadge } from './shared/DivisionBadge';
import type { CompetitionComponentProps } from '../types/competition.types';

interface LeagueStandingsProps extends CompetitionComponentProps {
  // Additional props specific to league standings
}

export const LeagueStandings = React.memo<LeagueStandingsProps>(({ 
  team, 
  userId, 
  onTeamSelect 
}) => {
  const {
    divisionStandings,
    standingsLoading,
    standingsError,
    globalRankings,
    selectedTeamId,
    isScoutingModalOpen,
    scoutingData,
    scoutingLoading,
    openScoutingModal,
    closeScoutingModal
  } = useLeagueStandings(team);

  // Memoized position status calculation
  const getPositionStatus = useCallback((position: number, totalTeams: number = 8) => {
    if (position <= 2) return 'promotion';
    if (position >= totalTeams - 1) return 'relegation';
    return 'neutral';
  }, []);

  // Memoized standings with position indicators
  const standingsWithStatus = useMemo(() => {
    return divisionStandings.map((standingTeam: any, index: number) => {
      const position = index + 1;
      const status = getPositionStatus(position, divisionStandings.length);
      const isUser = String(standingTeam.id) === String(team?.id);
      
      return {
        ...standingTeam,
        position,
        status,
        isUser
      };
    });
  }, [divisionStandings, getPositionStatus, team?.id]);

  // Handle team scouting action
  const handleScoutTeam = useCallback((teamId: number) => {
    openScoutingModal(teamId);
    onTeamSelect?.(teamId);
  }, [openScoutingModal, onTeamSelect]);

  if (standingsLoading) {
    return (
      <CompetitionCard title="🏆 Division Standings">
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading standings...</p>
        </div>
      </CompetitionCard>
    );
  }

  if (standingsError || !divisionStandings.length) {
    return (
      <CompetitionCard title="🏆 Division Standings">
        <div className="text-center py-8">
          <p className="text-gray-400">Unable to load standings</p>
        </div>
      </CompetitionCard>
    );
  }

  return (
    <>
      <CompetitionCard>
        <div className="space-y-4">
          {/* Header with Division Info */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              🏆 Division Standings
            </h3>
            <DivisionBadge 
              division={team?.division || 8} 
              subdivision={team?.subdivision}
            />
          </div>

          {/* Promotion/Relegation Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-600 rounded-full"></div>
              <span className="text-gray-300">Promotion</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-600 rounded-full"></div>
              <span className="text-gray-300">Relegation</span>
            </div>
          </div>

          {/* Standings Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-600 text-gray-300">
                  <th className="text-left p-3">Pos</th>
                  <th className="text-left p-3">Team</th>
                  <th className="text-center p-3 hidden md:table-cell">GP</th>
                  <th className="text-center p-3">W</th>
                  <th className="text-center p-3">L</th>
                  <th className="text-center p-3">D</th>
                  <th className="text-center p-3">Pts</th>
                  <th className="text-center p-3 hidden md:table-cell">TS</th>
                  <th className="text-center p-3 hidden md:table-cell">SA</th>
                  <th className="text-center p-3 hidden md:table-cell">SD</th>
                  <th className="text-center p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {standingsWithStatus.map((standingTeam: any) => {
                  const { position, status, isUser } = standingTeam;
                  const isPromotion = status === 'promotion';
                  const isRelegation = status === 'relegation';
                  
                  return (
                    <tr 
                      key={standingTeam.id}
                      className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                        isUser ? 'bg-blue-900/30 border-blue-500/30' : ''
                      }`}
                    >
                      <td className="p-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isPromotion ? 'bg-green-600 text-green-100' : 
                          isRelegation ? 'bg-red-600 text-red-100' : 
                          'bg-gray-600 text-gray-100'
                        }`}>
                          {position}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {!isUser ? (
                            <button
                              onClick={() => handleScoutTeam(Number(standingTeam.id))}
                              className="text-blue-400 hover:text-blue-300 font-semibold underline decoration-dotted"
                            >
                              {standingTeam.name}
                            </button>
                          ) : (
                            <span className="font-bold text-blue-400">
                              {standingTeam.name} (You)
                            </span>
                          )}
                          {isPromotion && <ArrowUp className="h-4 w-4 text-green-400" />}
                          {isRelegation && <ArrowDown className="h-4 w-4 text-red-400" />}
                        </div>
                      </td>
                      <td className="text-center p-3 hidden md:table-cell text-gray-300">
                        {standingTeam.gamesPlayed || 0}
                      </td>
                      <td className="text-center p-3 text-green-400 font-semibold">
                        {standingTeam.wins || 0}
                      </td>
                      <td className="text-center p-3 text-red-400 font-semibold">
                        {standingTeam.losses || 0}
                      </td>
                      <td className="text-center p-3 text-yellow-400 font-semibold">
                        {standingTeam.draws || 0}
                      </td>
                      <td className="text-center p-3 text-blue-400 font-bold text-lg">
                        {standingTeam.points || 0}
                      </td>
                      <td className="text-center p-3 hidden md:table-cell text-gray-300">
                        {standingTeam.totalScores || 0}
                      </td>
                      <td className="text-center p-3 hidden md:table-cell text-gray-300">
                        {standingTeam.scoresAgainst || 0}
                      </td>
                      <td className="text-center p-3 hidden md:table-cell">
                        <span className={`font-semibold ${
                          (standingTeam.scoreDifference || 0) > 0 ? 'text-green-400' : 
                          (standingTeam.scoreDifference || 0) < 0 ? 'text-red-400' : 
                          'text-gray-400'
                        }`}>
                          {standingTeam.scoreDifference > 0 ? '+' : ''}{standingTeam.scoreDifference || 0}
                        </span>
                      </td>
                      <td className="text-center p-3">
                        {!isUser && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleScoutTeam(Number(standingTeam.id))}
                            className="text-xs bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/40"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Legend */}
          <div className="mt-4 p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg border border-gray-600/30">
            <h4 className="font-bold text-gray-300 mb-3 text-sm">Table Key</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-gray-400">
              <div><span className="font-semibold text-gray-300">GP</span> - Games Played</div>
              <div><span className="font-semibold text-gray-300">W</span> - Wins</div>
              <div><span className="font-semibold text-gray-300">L</span> - Losses</div>
              <div><span className="font-semibold text-gray-300">D</span> - Draws</div>
              <div><span className="font-semibold text-gray-300">Pts</span> - Points</div>
              <div><span className="font-semibold text-gray-300">TS</span> - Total Scores</div>
              <div><span className="font-semibold text-gray-300">SA</span> - Scores Against</div>
              <div><span className="font-semibold text-gray-300">SD</span> - Score Difference</div>
            </div>
          </div>
        </div>
      </CompetitionCard>

      {/* Scouting Modal */}
      <Dialog open={isScoutingModalOpen} onOpenChange={closeScoutingModal}>
        <DialogContent className="bg-gray-800 border-gray-600 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Team Scouting Report</DialogTitle>
          </DialogHeader>
          {scoutingLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Loading scouting report...</p>
            </div>
          ) : scoutingData ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-lg">{scoutingData.name}</h4>
                <p className="text-sm text-gray-400">
                  Division {scoutingData.division} • {scoutingData.subdivision || 'Eta'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Record:</span>
                  <p className="font-semibold">
                    {scoutingData.wins}-{scoutingData.losses}-{scoutingData.draws}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Points:</span>
                  <p className="font-semibold text-blue-400">{scoutingData.points}</p>
                </div>
                <div>
                  <span className="text-gray-400">Team Power:</span>
                  <p className="font-semibold">{scoutingData.teamPower || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Score Diff:</span>
                  <p className={`font-semibold ${
                    (scoutingData.scoreDifference || 0) > 0 ? 'text-green-400' : 
                    (scoutingData.scoreDifference || 0) < 0 ? 'text-red-400' : 
                    'text-gray-400'
                  }`}>
                    {scoutingData.scoreDifference > 0 ? '+' : ''}{scoutingData.scoreDifference || 0}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Unable to load scouting data</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
});

LeagueStandings.displayName = 'LeagueStandings';