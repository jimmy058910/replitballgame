import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Trophy, Star, TrendingUp, Users, DollarSign, Download, Share2, Play } from 'lucide-react';
import type { Player, Team, Stadium, League } from '@shared/types/models';


interface PostMatchSummaryProps {
  matchData: {
    homeTeam: {
      name: string;
      logo?: string;
      score: number;
    };
    awayTeam: {
      name: string;
      logo?: string;
      score: number;
    };
    matchType: 'league' | 'exhibition' | 'tournament';
    day: number;
    phase: string;
    mvp?: {
      name: string;
      position: string;
      race: string;
      age: number;
      stats: {
        yards?: number;
        touchdowns?: number;
        completion?: number;
        tackles?: number;
        interceptions?: number;
      };
      photo?: string;
    };
    keyPlayers: Array<{
      name: string;
      contribution: string;
    }>;
    matchStats: {
      homeStats: {
        totalYards: number;
        possession: number;
        firstDowns: number;
      };
      awayStats: {
        totalYards: number;
        possession: number;
        firstDowns: number;
      };
    };
    stadium?: {
      attendance: number;
      capacity: number;
      revenue: number;
    };
    achievements: Array<{
      type: 'career_high' | 'milestone' | 'team_record';
      title: string;
      description: string;
      icon: string;
    }>;
  };
  onClose?: () => void;
}

const PostMatchSummary: React.FC<PostMatchSummaryProps> = ({ matchData, onClose }) => {
  const { homeTeam, awayTeam, matchType, day, phase, mvp, keyPlayers, matchStats, stadium, achievements } = matchData;
  
  const homeWon = homeTeam.score > awayTeam.score;
  const awayWon = awayTeam.score > homeTeam.score;
  const tie = homeTeam.score === awayTeam.score;

  const attendancePercentage = stadium ? (stadium.attendance / stadium.capacity) * 100 : 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-4">
      {/* Hero Section with Final Score */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Home Team */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-3">
                {homeTeam.logo ? (
                  <img src={homeTeam.logo} alt={homeTeam.name} className="w-12 h-12 rounded-full" />
                ) : (
                  <Trophy className="h-8 w-8 text-blue-600" />
                )}
              </div>
              <h2 className="text-xl font-bold mb-2">{homeTeam.name}</h2>
              <div className={`text-4xl font-bold ${homeWon ? 'text-green-500' : tie ? 'text-yellow-500' : 'text-gray-500'}`}>
                {homeTeam.score}
              </div>
              {homeWon && <Badge className="mt-2 bg-green-500">Winner</Badge>}
            </div>

            {/* Match Info */}
            <div className="flex flex-col items-center text-center">
              <Badge variant="outline" className="mb-2">
                {matchType === 'league' ? 'League Match' : matchType === 'tournament' ? 'Tournament' : 'Exhibition'}
              </Badge>
              <div className="text-sm text-muted-foreground">Day {day} - {phase}</div>
              <div className="text-3xl font-bold text-muted-foreground my-2">VS</div>
              {tie && <Badge className="bg-yellow-500">Tie Game</Badge>}
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mb-3">
                {awayTeam.logo ? (
                  <img src={awayTeam.logo} alt={awayTeam.name} className="w-12 h-12 rounded-full" />
                ) : (
                  <Trophy className="h-8 w-8 text-red-600" />
                )}
              </div>
              <h2 className="text-xl font-bold mb-2">{awayTeam.name}</h2>
              <div className={`text-4xl font-bold ${awayWon ? 'text-green-500' : tie ? 'text-yellow-500' : 'text-gray-500'}`}>
                {awayTeam.score}
              </div>
              {awayWon && <Badge className="mt-2 bg-green-500">Winner</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MVP & Key Players Section */}
      {mvp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Match MVP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                  {mvp.photo ? (
                    <img src={mvp.photo} alt={mvp.name} className="w-16 h-16 rounded-full" />
                  ) : (
                    <Star className="h-10 w-10 text-white" />
                  )}
                </div>
                <Badge className="absolute -top-2 -right-2 bg-yellow-500">MVP</Badge>
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-bold">{mvp.name}</h3>
                <p className="text-muted-foreground">{mvp.position} • {mvp.race} • Age {mvp.age}</p>
                
                <div className="flex flex-wrap gap-4 mt-3 justify-center md:justify-start">
                  {mvp.stats.yards && (
                    <div className="text-center">
                      <div className="text-lg font-bold">{mvp.stats.yards}</div>
                      <div className="text-xs text-muted-foreground">Yards</div>
                    </div>
                  )}
                  {mvp.stats.touchdowns && (
                    <div className="text-center">
                      <div className="text-lg font-bold">{mvp.stats.touchdowns}</div>
                      <div className="text-xs text-muted-foreground">TDs</div>
                    </div>
                  )}
                  {mvp.stats.completion && (
                    <div className="text-center">
                      <div className="text-lg font-bold">{mvp.stats.completion}%</div>
                      <div className="text-xs text-muted-foreground">Completion</div>
                    </div>
                  )}
                  {mvp.stats.tackles && (
                    <div className="text-center">
                      <div className="text-lg font-bold">{mvp.stats.tackles}</div>
                      <div className="text-xs text-muted-foreground">Tackles</div>
                    </div>
                  )}
                  {mvp.stats.interceptions && (
                    <div className="text-center">
                      <div className="text-lg font-bold">{mvp.stats.interceptions}</div>
                      <div className="text-xs text-muted-foreground">Interceptions</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Key Players */}
            {keyPlayers && keyPlayers.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Key Performers
                </h4>
                <div className="space-y-2">
                  {keyPlayers.map((player, index) => (
                    <div key={index} className="flex justify-between items-center p-2 rounded bg-muted/50">
                      <span className="font-medium">{`${player.firstName} ${player.lastName}`}</span>
                      <span className="text-sm text-muted-foreground">{player.contribution}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Match Statistics Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Match Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Total Yards */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{matchStats.homeStats.totalYards}</span>
                <span className="text-sm font-medium">Total Yards</span>
                <span className="text-sm font-medium">{matchStats.awayStats.totalYards}</span>
              </div>
              <div className="flex h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className="bg-blue-500" 
                  style={{ 
                    width: `${(matchStats.homeStats.totalYards / (matchStats.homeStats.totalYards + matchStats.awayStats.totalYards)) * 100}%` 
                  }}
                />
                <div 
                  className="bg-red-500" 
                  style={{ 
                    width: `${(matchStats.awayStats.totalYards / (matchStats.homeStats.totalYards + matchStats.awayStats.totalYards)) * 100}%` 
                  }}
                />
              </div>
            </div>

            {/* Possession */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{matchStats.homeStats.possession}%</span>
                <span className="text-sm font-medium">Possession</span>
                <span className="text-sm font-medium">{matchStats.awayStats.possession}%</span>
              </div>
              <div className="flex h-2 rounded-full bg-muted overflow-hidden">
                <div className="bg-blue-500" style={{ width: `${matchStats.homeStats.possession}%` }} />
                <div className="bg-red-500" style={{ width: `${matchStats.awayStats.possession}%` }} />
              </div>
            </div>

            {/* First Downs */}
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">{matchStats.homeStats.firstDowns}</span>
              <span className="text-sm font-medium">First Downs</span>
              <span className="text-sm font-medium">{matchStats.awayStats.firstDowns}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stadium Performance (League matches only) */}
      {matchType === 'league' && stadium && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Stadium Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stadium.attendance.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Attendance</div>
                <div className="text-xs text-muted-foreground mt-1">
                  / {stadium.capacity.toLocaleString()} ({attendancePercentage.toFixed(0)}%)
                </div>
                <Progress value={attendancePercentage} className="mt-2" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">₡{stadium.revenue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Match Revenue</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Tickets + Concessions + VIP
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Player Performance Highlights */}
      {achievements && achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Individual Highlights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  achievement.type === 'career_high' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' :
                  achievement.type === 'milestone' ? 'border-purple-500 bg-purple-50 dark:bg-purple-950' :
                  'border-blue-500 bg-blue-50 dark:bg-blue-950'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div>
                      <div className="font-semibold">{achievement.title}</div>
                      <div className="text-sm text-muted-foreground">{achievement.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          View Full Match Replay
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download Match Report
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Share Results
        </Button>
        {onClose && (
          <Button variant="secondary" onClick={onClose}>
            Close Summary
          </Button>
        )}
      </div>
    </div>
  );
};

export default PostMatchSummary;