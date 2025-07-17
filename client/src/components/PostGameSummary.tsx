import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Shield, Star } from 'lucide-react';

interface TeamStats {
  teamId: string;
  teamName: string;
  totalScore: number;
  totalOffensiveYards: number;
  passingYards: number;
  carrierYards: number;
  turnovers: number;
  totalKnockdowns: number;
  timeOfPossession: number;
}

interface PlayerStats {
  playerId: string;
  playerName: string;
  playerRace: string;
  playerRole: string;
  scores: number;
  passingYards: number;
  carrierYards: number;
  tackles: number;
  interceptions: number;
  knockdownsInflicted: number;
  mvpScore: number;
}

interface PostGameSummaryProps {
  matchId: string;
  homeTeam: {
    id: string;
    name: string;
    score: number;
    stats?: TeamStats;
  };
  awayTeam: {
    id: string;
    name: string;
    score: number;
    stats?: TeamStats;
  };
  mvpData?: {
    homeMVP?: PlayerStats;
    awayMVP?: PlayerStats;
  };
  matchDuration?: number;
  attendanceData?: {
    attendance: number;
    capacity: number;
    percentage: number;
  };
}

export function PostGameSummary({ 
  matchId, 
  homeTeam, 
  awayTeam, 
  mvpData, 
  matchDuration,
  attendanceData 
}: PostGameSummaryProps) {
  const winner = homeTeam.score > awayTeam.score ? homeTeam : 
                 awayTeam.score > homeTeam.score ? awayTeam : null;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const StatBar = ({ label, homeValue, awayValue, homeLabel, awayLabel, format = (v: any) => v }: {
    label: string;
    homeValue: number;
    awayValue: number;
    homeLabel: string;
    awayLabel: string;
    format?: (value: number) => string;
  }) => {
    const total = homeValue + awayValue || 1;
    const homePercent = (homeValue / total) * 100;
    const awayPercent = (awayValue / total) * 100;

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-blue-400">{format(homeValue)}</span>
          <span className="text-sm font-semibold text-gray-300">{label}</span>
          <span className="text-sm font-medium text-red-400">{format(awayValue)}</span>
        </div>
        <div className="flex h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="bg-blue-500 transition-all duration-300" 
            style={{ width: `${homePercent}%` }}
          />
          <div 
            className="bg-red-500 transition-all duration-300" 
            style={{ width: `${awayPercent}%` }}
          />
        </div>

      </div>
    );
  };

  const PlayerCard = ({ player, teamName, isWinner }: { 
    player: PlayerStats; 
    teamName: string;
    isWinner: boolean;
  }) => (
    <Card className={`bg-gray-800 border-2 ${isWinner ? 'border-yellow-500' : 'border-gray-600'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white">{player.playerName}</CardTitle>
            <p className="text-sm text-gray-400">{player.playerRace} {player.playerRole}</p>
            <p className="text-xs text-gray-500">{teamName}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-xl font-bold text-yellow-500">{player.mvpScore.toFixed(1)}</span>
            </div>
            <p className="text-xs text-gray-400">MVP Score</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Scores:</span>
              <span className="font-semibold text-green-400">{player.scores}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Passing:</span>
              <span className="font-semibold text-blue-400">{player.passingYards} yds</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Carrying:</span>
              <span className="font-semibold text-purple-400">{player.carrierYards} yds</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Tackles:</span>
              <span className="font-semibold text-red-400">{player.tackles}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Interceptions:</span>
              <span className="font-semibold text-orange-400">{player.interceptions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Knockdowns:</span>
              <span className="font-semibold text-yellow-400">{player.knockdownsInflicted}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Match Header */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <h1 className="text-3xl font-bold text-white">Match Completed</h1>
            </div>
            
            <div className="flex items-center justify-center gap-8 text-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{homeTeam.name}</div>
                <div className="text-4xl font-bold text-white mt-2">{homeTeam.score}</div>
              </div>
              
              <div className="text-center">
                <div className="text-6xl font-bold text-gray-400">-</div>
                <div className="text-sm text-gray-400 mt-2">Final Score</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{awayTeam.name}</div>
                <div className="text-4xl font-bold text-white mt-2">{awayTeam.score}</div>
              </div>
            </div>
            
            {winner && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <span className="text-xl font-bold text-yellow-500">
                  {winner.name} Wins!
                </span>
              </div>
            )}
            
            <div className="flex justify-center gap-6 text-sm text-gray-400 mt-4">
              {matchDuration && (
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  <span>Duration: {formatTime(matchDuration)}</span>
                </div>
              )}
              {attendanceData && (
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  <span>Attendance: {attendanceData.attendance.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Stats Comparison */}
      {homeTeam.stats && awayTeam.stats && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-center text-white">Team Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <StatBar
              label="Total Offense"
              homeValue={homeTeam.stats.totalOffensiveYards}
              awayValue={awayTeam.stats.totalOffensiveYards}
              homeLabel={homeTeam.name}
              awayLabel={awayTeam.name}
              format={(v) => `${v} yds`}
            />
            
            <StatBar
              label="Passing Yards"
              homeValue={homeTeam.stats.passingYards}
              awayValue={awayTeam.stats.passingYards}
              homeLabel={homeTeam.name}
              awayLabel={awayTeam.name}
              format={(v) => `${v} yds`}
            />
            
            <StatBar
              label="Carrying Yards"
              homeValue={homeTeam.stats.carrierYards}
              awayValue={awayTeam.stats.carrierYards}
              homeLabel={homeTeam.name}
              awayLabel={awayTeam.name}
              format={(v) => `${v} yds`}
            />
            
            <StatBar
              label="Turnovers"
              homeValue={awayTeam.stats.turnovers}
              awayValue={homeTeam.stats.turnovers}
              homeLabel={homeTeam.name}
              awayLabel={awayTeam.name}
              format={(v) => `${v}`}
            />
            
            <StatBar
              label="Knockdowns"
              homeValue={homeTeam.stats.totalKnockdownsInflicted}
              awayValue={awayTeam.stats.totalKnockdownsInflicted}
              homeLabel={homeTeam.name}
              awayLabel={awayTeam.name}
              format={(v) => `${v}`}
            />
          </CardContent>
        </Card>
      )}

      {/* MVP Players */}
      {mvpData && (mvpData.homeMVP || mvpData.awayMVP) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mvpData.homeMVP && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                {homeTeam.name} MVP
              </h3>
              <PlayerCard 
                player={mvpData.homeMVP} 
                teamName={homeTeam.name}
                isWinner={winner?.id === homeTeam.id}
              />
            </div>
          )}
          
          {mvpData.awayMVP && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                {awayTeam.name} MVP
              </h3>
              <PlayerCard 
                player={mvpData.awayMVP} 
                teamName={awayTeam.name}
                isWinner={winner?.id === awayTeam.id}
              />
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6">
          <div className="flex justify-center gap-4">
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => window.location.href = '/competition'}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Play Another Match
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}