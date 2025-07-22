import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  Trophy, 
  MessageCircle, 
  ExternalLink, 
  Gift, 
  BookOpen, 
  BarChart3,
  Crown,
  Award,
  HelpCircle
} from "lucide-react";
import ReferralSystem from "@/components/ReferralSystem";

interface WorldRankings {
  teamPowerRankings: Array<{
    rank: number;
    teamName: string;
    division: number;
    teamPower: number;
    wins: number;
    losses: number;
  }>;
  playerStats: Array<{
    playerName: string;
    teamName: string;
    statType: string;
    statValue: number;
  }>;
  totalTeams: number;
  totalPlayers: number;
}

export default function CommunityPortal() {
  const { isAuthenticated } = useAuth();

  const { data: worldRankings, isLoading: rankingsLoading } = useQuery<WorldRankings>({
    queryKey: ['/api/world/rankings'],
    queryFn: () => apiRequest('/api/world/rankings'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <div className="p-4 text-center">
          <p className="text-white">Please log in to access the Community Portal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      
      <div className="p-4 space-y-6">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Community Portal</h1>
          <p className="text-gray-400">Connect, compete, and discover in the Realm Rivalry universe</p>
        </div>

        <Tabs defaultValue="social" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
            <TabsTrigger value="social" className="data-[state=active]:bg-purple-600">Social Hub</TabsTrigger>
            <TabsTrigger value="world" className="data-[state=active]:bg-purple-600">Game Intel</TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-purple-600">Support Center</TabsTrigger>
          </TabsList>

          {/* Social Hub Tab */}
          <TabsContent value="social" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Discord Integration */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <MessageCircle className="h-5 w-5 text-purple-400" />
                    Official Discord
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300">Join our active community for real-time strategy discussions, tournament updates, and exclusive events.</p>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      <p>1,247 members online</p>
                      <p>Live tournament discussions</p>
                    </div>
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Join Discord
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Referral System */}
              <ReferralSystem />

              {/* Social Media Links */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Users className="h-5 w-5 text-blue-400" />
                    Follow Us
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-gray-300">Stay updated with the latest news, updates, and community highlights.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Twitter
                    </Button>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Reddit
                    </Button>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      YouTube
                    </Button>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Twitch
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Redeem Code */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Gift className="h-5 w-5 text-purple-400" />
                    Redeem Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300">Have a special code from events or promotions? Redeem it here for exclusive rewards.</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Enter code here"
                      className="flex-1 px-3 py-2 bg-gray-700 border-gray-600 rounded text-white placeholder-gray-400"
                    />
                    <Button>Redeem</Button>
                  </div>
                  <p className="text-xs text-gray-500">Codes are case-sensitive and expire after use.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Game Intel Tab */}
          <TabsContent value="world" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* World Rankings */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    Top Team Power Rankings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {rankingsLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 bg-gray-700 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {worldRankings?.teamPowerRankings?.slice(0, 10).map((team) => (
                        <div key={team.rank} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-6 h-6 bg-gray-600 rounded-full text-xs font-bold">
                              {team.rank}
                            </span>
                            {team.rank <= 3 && (
                              <Crown className={`h-4 w-4 ${team.rank === 1 ? 'text-yellow-400' : team.rank === 2 ? 'text-gray-300' : 'text-amber-600'}`} />
                            )}
                            <div>
                              <p className="text-white font-medium">{team.teamName}</p>
                              <p className="text-xs text-gray-400">Division {team.division} • {team.wins}W-{team.losses}L</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-bold">{team.teamPower}</p>
                            <p className="text-xs text-gray-400">Power</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Player Stats Leaders */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Award className="h-5 w-5 text-green-400" />
                    Statistical Leaders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="scores" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3 bg-gray-700">
                      <TabsTrigger value="scores" className="text-xs">Scores</TabsTrigger>
                      <TabsTrigger value="yards" className="text-xs">Yards</TabsTrigger>
                      <TabsTrigger value="tackles" className="text-xs">Tackles</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="scores" className="space-y-2">
                      {worldRankings?.playerStats?.filter(p => p.statType === 'scores').slice(0, 5).map((player, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                          <div>
                            <p className="text-white font-medium">{player.playerName}</p>
                            <p className="text-xs text-gray-400">{player.teamName}</p>
                          </div>
                          <span className="text-yellow-400 font-bold">{player.statValue}</span>
                        </div>
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="yards" className="space-y-2">
                      <div className="text-center py-8 text-gray-400">
                        <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                        <p>Player statistics coming soon</p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="tackles" className="space-y-2">
                      <div className="text-center py-8 text-gray-400">
                        <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                        <p>Player statistics coming soon</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Game Statistics */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                    Global Game Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">{worldRankings?.totalTeams || 0}</p>
                      <p className="text-sm text-gray-400">Active Teams</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">{worldRankings?.totalPlayers || 0}</p>
                      <p className="text-sm text-gray-400">Total Players</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Matches Played Today:</span>
                      <span className="text-white">127</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Active Tournaments:</span>
                      <span className="text-white">8</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Players Online:</span>
                      <span className="text-green-400">412</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hall of Fame */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Crown className="h-5 w-5 text-yellow-400" />
                    Hall of Fame
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300">Legendary achievements in Realm Rivalry history</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2 bg-gray-700 rounded">
                      <Trophy className="h-5 w-5 text-yellow-400" />
                      <div>
                        <p className="text-white font-medium">Thunder Hawks</p>
                        <p className="text-xs text-gray-400">First Perfect Season (Season 1)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-gray-700 rounded">
                      <Award className="h-5 w-5 text-purple-400" />
                      <div>
                        <p className="text-white font-medium">Starwhisper Mystic</p>
                        <p className="text-xs text-gray-400">Most Career Scores (Season 2)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-gray-700 rounded">
                      <Crown className="h-5 w-5 text-blue-400" />
                      <div>
                        <p className="text-white font-medium">Crimson Blaze</p>
                        <p className="text-xs text-gray-400">Highest Team Power (2,847)</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Support Center Tab */}
          <TabsContent value="support" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Game Manual */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <BookOpen className="h-5 w-5 text-blue-400" />
                    Game Manual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300">Comprehensive guides to master every aspect of Realm Rivalry.</p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Getting Started Guide
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Team Management
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Trophy className="h-4 w-4 mr-2" />
                      Tournament Strategy
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Advanced Tactics
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Help & Support */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <HelpCircle className="h-5 w-5 text-green-400" />
                    Help & Support
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300">Need assistance? We're here to help!</p>
                  <div className="space-y-2">
                    <Button className="w-full justify-start bg-green-600 hover:bg-green-700">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Bug Reports
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Gift className="h-4 w-4 mr-2" />
                      Feature Requests
                    </Button>
                  </div>
                  <div className="mt-4 p-3 bg-gray-700 rounded">
                    <p className="text-xs text-gray-400">
                      Response Time: Within 24 hours<br />
                      Support Hours: 9AM - 9PM EST
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Roadmap */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <BarChart3 className="h-5 w-5 text-purple-400" />
                    Development Roadmap
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300">See what's coming next in Realm Rivalry!</p>
                  <div className="space-y-3">
                    <div className="p-3 bg-green-900/20 border border-green-700 rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-sm font-medium text-green-400">In Development</span>
                      </div>
                      <p className="text-white font-medium">Mobile App</p>
                      <p className="text-xs text-gray-400">Native iOS and Android applications</p>
                    </div>
                    <div className="p-3 bg-blue-900/20 border border-blue-700 rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-sm font-medium text-blue-400">Planned</span>
                      </div>
                      <p className="text-white font-medium">League Expansion</p>
                      <p className="text-xs text-gray-400">Additional divisions and tournaments</p>
                    </div>
                    <div className="p-3 bg-purple-900/20 border border-purple-700 rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        <span className="text-sm font-medium text-purple-400">Future</span>
                      </div>
                      <p className="text-white font-medium">Player Trading Cards</p>
                      <p className="text-xs text-gray-400">Collectible NFT system</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Feedback */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <MessageCircle className="h-5 w-5 text-yellow-400" />
                    Share Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300">Help us improve Realm Rivalry with your suggestions and feedback.</p>
                  <div className="space-y-2">
                    <textarea 
                      placeholder="Share your thoughts, suggestions, or report issues..."
                      className="w-full h-24 p-3 bg-gray-700 border-gray-600 rounded text-white placeholder-gray-400 resize-none"
                    />
                    <Button className="w-full">Submit Feedback</Button>
                  </div>
                  <p className="text-xs text-gray-500">Your feedback helps shape the future of Realm Rivalry!</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}