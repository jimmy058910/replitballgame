import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Trophy, Star, TrendingUp, Users, DollarSign, Download, Share2, Play, Eye, BarChart3 } from 'lucide-react';
import PostMatchSummary from './PostMatchSummary';

interface EnhancedPostMatchSummaryProps {
  matchData: any;
  gameData?: any;
  liveState?: any;
  onViewReplay?: () => void;
}

const EnhancedPostMatchSummary: React.FC<EnhancedPostMatchSummaryProps> = ({ 
  matchData, 
  gameData, 
  liveState,
  onViewReplay 
}) => {
  const [showFullSummary, setShowFullSummary] = useState(false);

  // Generate mock MVP and statistics for demo
  const enhancedMatchData = {
    homeTeam: {
      name: gameData?.homeTeam?.name || 'Oakland Cougars',
      logo: '',
      score: matchData?.homeScore || 2
    },
    awayTeam: {
      name: gameData?.awayTeam?.name || 'Thunder Hawks', 
      logo: '',
      score: matchData?.awayScore || 1
    },
    matchType: matchData?.matchType || 'league',
    day: 12,
    phase: 'Regular Season',
    mvp: {
      name: 'Redclaw Ragemaw',
      position: 'Runner',
      race: 'Gryll',
      age: 22,
      stats: {
        yards: 156,
        touchdowns: 2,
        completion: 89
      }
    },
    keyPlayers: [
      { name: 'Starwhisper Forestsong', contribution: '89 passing yards, 1 TD' },
      { name: 'Bonecrusher Ironhide', contribution: '3 tackles, 1 interception' }
    ],
    matchStats: {
      homeStats: {
        totalYards: 156,
        possession: 64,
        firstDowns: 7
      },
      awayStats: {
        totalYards: 134,
        possession: 36,
        firstDowns: 4
      }
    },
    stadium: {
      attendance: liveState?.attendance || 15847,
      capacity: liveState?.stadiumCapacity || 20000,
      revenue: 73250
    },
    achievements: [
      {
        type: 'career_high' as const,
        title: 'Career High!',
        description: 'Redclaw Ragemaw - 156 rushing yards',
        icon: '🔥'
      },
      {
        type: 'milestone' as const,
        title: 'Milestone Reached!',
        description: 'Starwhisper - 100th career passing TD',
        icon: '🎯'
      }
    ]
  };

  const homeWon = enhancedMatchData.homeTeam.score > enhancedMatchData.awayTeam.score;

  return (
    <div className="space-y-4">
      {/* Quick Match Result */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="font-semibold">{enhancedMatchData.homeTeam.name}</div>
                <div className={`text-2xl font-bold ${homeWon ? 'text-green-500' : 'text-gray-500'}`}>
                  {enhancedMatchData.homeTeam.score}
                </div>
              </div>
              
              <div className="text-muted-foreground">VS</div>
              
              <div className="text-center">
                <div className="font-semibold">{enhancedMatchData.awayTeam.name}</div>
                <div className={`text-2xl font-bold ${!homeWon ? 'text-green-500' : 'text-gray-500'}`}>
                  {enhancedMatchData.awayTeam.score}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {onViewReplay && (
                <Button variant="outline" size="sm" onClick={onViewReplay}>
                  <Play className="h-4 w-4 mr-2" />
                  Replay
                </Button>
              )}
              
              <Dialog open={showFullSummary} onOpenChange={setShowFullSummary}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Full Summary
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Complete Match Summary</DialogTitle>
                  </DialogHeader>
                  <PostMatchSummary 
                    matchData={enhancedMatchData} 
                    onClose={() => setShowFullSummary(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
            <div className="text-center">
              <div className="font-medium">{enhancedMatchData.mvp.name}</div>
              <div className="text-muted-foreground">MVP</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{enhancedMatchData.stadium.attendance.toLocaleString()}</div>
              <div className="text-muted-foreground">Attendance</div>
            </div>
            <div className="text-center">
              <div className="font-medium">₡{enhancedMatchData.stadium.revenue.toLocaleString()}</div>
              <div className="text-muted-foreground">Revenue</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{enhancedMatchData.matchStats.homeStats.totalYards} vs {enhancedMatchData.matchStats.awayStats.totalYards}</div>
              <div className="text-muted-foreground">Total Yards</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="h-4 w-4" />
            Match Highlights
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-2 text-sm">
            {enhancedMatchData.achievements.map((achievement, index) => (
              <div key={index} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                <span className="text-lg">{achievement.icon}</span>
                <div>
                  <span className="font-medium">{achievement.title}</span>
                  <span className="text-muted-foreground ml-2">{achievement.description}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedPostMatchSummary;