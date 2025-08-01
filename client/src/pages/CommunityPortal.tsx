import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ModernStickyHeader from "@/components/ModernStickyHeader";
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
  HelpCircle,
  Copy,
  Share2,
  Twitter,
  Youtube,
  Star,
  Search,
  Bug,
  Map,
  Activity,
  Calendar,
  Target,
  TrendingUp
} from "lucide-react";
import { FaDiscord, FaReddit, FaTwitch } from "react-icons/fa";
import ReferralSystem from "@/components/ReferralSystem";
import EmbeddedHelpManual from "@/components/EmbeddedHelpManual";
import Roadmap from "@/components/Roadmap";

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
  const { toast } = useToast();
  const [redeemCode, setRedeemCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [statsTab, setStatsTab] = useState("scores");

  const { data: worldRankings, isLoading: rankingsLoading } = useQuery<WorldRankings>({
    queryKey: ['/api/world/rankings'],
    queryFn: () => apiRequest('/api/world/rankings'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  const { data: myTeam } = useQuery({
    queryKey: ['/api/teams/my'],
    queryFn: () => apiRequest('/api/teams/my'),
    enabled: isAuthenticated,
  });

  // Simulated referral data structure - replace with actual API call
  const referralData = {
    code: "ABC1234",
    referrals: 0,
    creditsEarned: 0,
    gemsEarned: 0,
    progress: 0,
    nextRewardAt: 5
  };

  const handleRedeemCode = async () => {
    if (!redeemCode.trim()) return;
    
    setIsRedeeming(true);
    try {
      // Future: integrate with actual redeem API
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Code Redeemed!",
        description: `Successfully redeemed code: ${redeemCode}`,
      });
      setRedeemCode("");
    } catch (error) {
      toast({
        title: "Invalid Code",
        description: "This code is invalid or has already been used.",
        variant: "destructive",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralData.code);
    toast({
      title: "Code Copied!",
      description: "Referral code copied to clipboard",
    });
  };

  const shareReferralCode = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Join Realm Rivalry!',
        text: `Use my referral code ${referralData.code} and get bonus rewards!`,
        url: window.location.origin
      });
    } else {
      copyReferralCode();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/30">
        <div className="p-4 text-center">
          <p className="text-white">Please log in to access the Community Portal.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ModernStickyHeader />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/30">
      <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl mt-8">
        {/* Mobile-First Hero Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Community Portal</h1>
          <p className="text-gray-300">Connect, compete, and discover in the Realm Rivalry universe</p>
        </div>

        <Tabs defaultValue="social" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
            <TabsTrigger value="social" className="data-[state=active]:bg-purple-600 text-sm">Social Hub</TabsTrigger>
            <TabsTrigger value="world" className="data-[state=active]:bg-purple-600 text-sm">Game Intel</TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-purple-600 text-sm">Support Center</TabsTrigger>
          </TabsList>

          {/* Social Hub Tab */}
          <TabsContent value="social" className="space-y-6">
            {/* Discord Block */}
            <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <FaDiscord className="h-6 w-6 text-purple-400" />
                    <span>Official Discord</span>
                  </div>
                  <Badge className="bg-green-600 text-white">4,120 online</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">Join our active community for real-time strategy discussions, tournament updates, and exclusive events.</p>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700 w-full h-12 font-bold"
                  onClick={() => window.open('https://discord.gg/realmrivalry', '_blank')}
                >
                  <FaDiscord className="h-5 w-5 mr-2" />
                  Join Discord
                </Button>
              </CardContent>
            </Card>

            {/* Merged Referral System */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Gift className="h-5 w-5 text-green-400" />
                  My Referral Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                  <span className="text-2xl font-mono text-green-300">{referralData.code}</span>
                  <div className="flex gap-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={copyReferralCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={shareReferralCode}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold text-white">{referralData.referrals}</p>
                    <p className="text-sm text-gray-400">Referrals</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-green-300">₡{referralData.creditsEarned}</p>
                    <p className="text-sm text-gray-400">Credits</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-blue-300">💎{referralData.gemsEarned}</p>
                    <p className="text-sm text-gray-400">Gems</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Progress to next reward</span>
                    <span className="text-white">{referralData.referrals}/{referralData.nextRewardAt}</span>
                  </div>
                  <Progress value={(referralData.referrals / referralData.nextRewardAt) * 100} className="h-2" />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyReferralCode} className="flex-1">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <FaDiscord className="h-4 w-4 mr-2" />
                    Discord
                  </Button>
                  <Button variant="outline" size="sm" onClick={shareReferralCode} className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Follow Us Panel */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Users className="h-5 w-5 text-blue-400" />
                  Follow Us
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-300">Stay updated with official news and community highlights</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-12 flex items-center gap-3 justify-start"
                    onClick={() => window.open('https://twitter.com/realmrivalry', '_blank')}
                  >
                    <Twitter className="h-5 w-5 text-blue-400" />
                    <div className="text-left">
                      <p className="font-medium">Twitter/X</p>
                      <p className="text-xs text-gray-400">Official Updates</p>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-12 flex items-center gap-3 justify-start"
                    onClick={() => window.open('https://reddit.com/r/realmrivalry', '_blank')}
                  >
                    <FaReddit className="h-5 w-5 text-orange-400" />
                    <div className="text-left">
                      <p className="font-medium">Reddit</p>
                      <p className="text-xs text-gray-400">Official Updates</p>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-12 flex items-center gap-3 justify-start"
                    onClick={() => window.open('https://youtube.com/@realmrivalry', '_blank')}
                  >
                    <Youtube className="h-5 w-5 text-red-400" />
                    <div className="text-left">
                      <p className="font-medium">YouTube</p>
                      <p className="text-xs text-gray-400">Streams & Highlights</p>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-12 flex items-center gap-3 justify-start"
                    onClick={() => window.open('https://twitch.tv/realmrivalry', '_blank')}
                  >
                    <FaTwitch className="h-5 w-5 text-purple-400" />
                    <div className="text-left">
                      <p className="font-medium">Twitch</p>
                      <p className="text-xs text-gray-400">Streams & Highlights</p>
                    </div>
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
                <div className="flex gap-2">
                  <Input 
                    type="text" 
                    placeholder="Enter code here..."
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value)}
                    className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 h-12"
                  />
                  <Button 
                    onClick={handleRedeemCode}
                    disabled={!redeemCode.trim() || isRedeeming}
                    className="h-12 px-6"
                  >
                    {isRedeeming ? "Redeeming..." : "Redeem"}
                  </Button>
                </div>
                <p className="text-sm text-gray-400">Find codes during events, on Discord, and in the Game Manual.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Game Intel Tab */}
          <TabsContent value="world" className="space-y-6">
            {/* Top Team Power Rankings */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    Top Team Power Rankings
                  </div>
                  <Button variant="outline" size="sm">
                    View All Rankings
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rankingsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-700 rounded animate-pulse" />
                    ))}
                  </div>
                ) : worldRankings?.teamPowerRankings?.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 mx-auto text-gray-500 mb-3" />
                    <p className="text-gray-400">No team rankings available yet</p>
                    <p className="text-sm text-gray-500">Rankings will appear as teams are created and play matches</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {worldRankings?.teamPowerRankings?.slice(0, 5).map((team) => {
                      const isMyTeam = (myTeam as any)?.name === team.teamName;
                      return (
                        <div 
                          key={team.rank} 
                          className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                            isMyTeam ? 'bg-purple-900/30 border border-purple-600' : 'bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                              team.rank === 1 ? 'bg-yellow-600 text-black' : 
                              team.rank === 2 ? 'bg-gray-400 text-black' : 
                              team.rank === 3 ? 'bg-amber-600 text-black' : 'bg-gray-600 text-white'
                            }`}>
                              {team.rank}
                            </div>
                            {team.rank <= 3 && (
                              <Crown className={`h-5 w-5 ${
                                team.rank === 1 ? 'text-yellow-400' : 
                                team.rank === 2 ? 'text-gray-300' : 'text-amber-600'
                              }`} />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`font-medium ${isMyTeam ? 'text-purple-300' : 'text-white'}`}>
                                  {team.teamName}
                                </p>
                                {isMyTeam && <Star className="h-4 w-4 text-yellow-400" />}
                              </div>
                              <p className="text-xs text-gray-400">Division {team.division} • {team.wins}W-{team.losses}L</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-bold">{team.teamPower}</p>
                            <p className="text-xs text-gray-400">Power</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statistical Leaders */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Award className="h-5 w-5 text-green-400" />
                  Statistical Leaders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex gap-2">
                    {['scores', 'yards', 'tackles'].map((tab) => (
                      <Button
                        key={tab}
                        variant={statsTab === tab ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatsTab(tab)}
                        className={statsTab === tab ? "bg-purple-600" : ""}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {statsTab === 'scores' && (!worldRankings?.playerStats?.length ? (
                    <div className="text-center py-6">
                      <Award className="h-10 w-10 mx-auto text-gray-500 mb-2" />
                      <p className="text-gray-400">No player statistics available yet</p>
                    </div>
                  ) : (
                    worldRankings?.playerStats?.filter(p => p.statType === 'power').slice(0, 5).map((player, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          {i === 0 && <Trophy className="h-4 w-4 text-yellow-400" />}
                          <span className="text-sm font-bold text-gray-400">#{i + 1}</span>
                          <div>
                            <p className="text-white font-medium">{player.playerName}</p>
                            <p className="text-xs text-gray-400">{player.teamName}</p>
                          </div>
                        </div>
                        <span className="text-yellow-400 font-bold text-lg">{player.statValue}</span>
                      </div>
                    ))
                  ))}
                  
                  {(statsTab === 'yards' || statsTab === 'tackles') && (
                    <div className="text-center py-8 text-gray-400">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                      <p className="font-medium">Player statistics coming soon</p>
                      <p className="text-xs mt-1">Advanced stat tracking in development</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Global Game Stats */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Activity className="h-5 w-5 text-blue-400" />
                  Global Game Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-blue-400" />
                      <p className="text-2xl font-bold text-white">{worldRankings?.totalTeams || 0}</p>
                    </div>
                    <p className="text-sm text-gray-400">Active Teams</p>
                  </div>
                  <div className="text-center p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-green-400" />
                      <p className="text-2xl font-bold text-white">{worldRankings?.totalPlayers || 0}</p>
                    </div>
                    <p className="text-sm text-gray-400">Total Players</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <p className="text-lg font-bold text-white">12</p>
                    <p className="text-xs text-gray-400">Active Matches</p>
                  </div>
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <p className="text-lg font-bold text-white">Season 0</p>
                    <p className="text-xs text-gray-400">Current Season</p>
                  </div>
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <p className="text-lg font-bold text-white">Day 9/17</p>
                    <p className="text-xs text-gray-400">Season Progress</p>
                  </div>
                </div>
                
                <div className="text-center py-2">
                  <p className="text-xs text-gray-400">Last updated 2 min ago</p>
                </div>
              </CardContent>
            </Card>

            {/* Hall of Fame removed - no real backend implementation needed for Alpha */}
          </TabsContent>

          {/* Support Center Tab */}
          <TabsContent value="support" className="space-y-6">
            {/* Mini Search */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search help topics, rules, strategies..."
                    className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 h-12"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Game Manual */}
            <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BookOpen className="h-5 w-5 text-teal-400" />
                  Complete Game Manual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-300">All rules, features, and advanced strategy guides</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <p className="text-sm font-medium text-white">Game Mechanics</p>
                    <p className="text-xs text-gray-400">Player progression, stats, equipment</p>
                  </div>
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <p className="text-sm font-medium text-white">Strategy Guide</p>
                    <p className="text-xs text-gray-400">Tactics, formations, advanced tips</p>
                  </div>
                </div>
                <Button className="w-full bg-teal-600 hover:bg-teal-700 h-12">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Open Game Manual
                </Button>
              </CardContent>
            </Card>

            {/* Report Bug */}
            <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Bug className="h-5 w-5 text-red-400" />
                  Report Bug
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-300">Found an issue? Help us improve the game</p>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start h-12">
                    <Bug className="h-4 w-4 mr-2" />
                    Report Gameplay Bug
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-12">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Report UI/Display Issue
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-12">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Suggest Feature
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Roadmap */}
            <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Map className="h-5 w-5 text-purple-400" />
                  Development Roadmap
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">See what's coming next to Realm Rivalry</p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-green-300">Mobile App</p>
                      <p className="text-xs text-gray-400">React Native conversion in progress</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-blue-300">Advanced Analytics</p>
                      <p className="text-xs text-gray-400">Player performance insights & trends</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-purple-900/20 border border-purple-600/30 rounded-lg">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-purple-300">Tournament System</p>
                      <p className="text-xs text-gray-400">Cross-division championships</p>
                    </div>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full">
                  <Map className="h-4 w-4 mr-2" />
                  View Full Roadmap
                </Button>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <HelpCircle className="h-5 w-5 text-yellow-400" />
                  Frequently Asked Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {[
                    "How do player contracts work?",
                    "What's the difference between Credits and Gems?",
                    "How do I improve my team's power rating?",
                    "When do daily resets happen?"
                  ].map((question, i) => (
                    <Button 
                      key={i}
                      variant="ghost" 
                      className="w-full justify-start text-left h-auto p-3 hover:bg-gray-700"
                    >
                      <div>
                        <p className="text-sm text-white">{question}</p>
                        <p className="text-xs text-gray-400 mt-1">Click to expand answer</p>
                      </div>
                    </Button>
                  ))}
                </div>
                
                <Button variant="outline" className="w-full mt-4">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  View All FAQs
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  );
}