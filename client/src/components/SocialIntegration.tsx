import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, MessageCircle, Users, Video, Camera, Share2, Trophy, Star, Heart, TrendingUp } from "lucide-react";
import { SiDiscord, SiFacebook, SiInstagram, SiTiktok, SiX, SiYoutube } from "react-icons/si";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SocialPlatform {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  url: string;
  buttonText: string;
  color: string;
  followers?: string;
}

export default function SocialIntegration() {
  const { toast } = useToast();

  interface SocialStatsData {
    totalShares?: number;
    weeklyShares?: number;
    topPlatform?: string;
    engagementRate?: number;
    discord?: number;
    instagram?: number;
    tiktok?: number;
    twitter?: number;
  }

  const { data: socialStats } = useQuery<SocialStatsData>({ // Typed socialStats
    queryKey: ["/api/social/stats"],
  });

  const socialPlatforms: SocialPlatform[] = [
    {
      name: "Discord",
      icon: SiDiscord,
      description: "Join our community for real-time discussions, tournaments, and exclusive events",
      url: "https://discord.gg/realm-rivalry",
      buttonText: "Join Server",
      color: "bg-indigo-600 hover:bg-indigo-700"
    },
    {
      name: "Facebook",
      icon: SiFacebook,
      description: "Follow us for game updates, community highlights, and behind-the-scenes content",
      url: "https://facebook.com/realmrivalry",
      buttonText: "Follow Page",
      color: "bg-blue-600 hover:bg-blue-700"
    },
    {
      name: "Instagram",
      icon: SiInstagram,
      description: "Visual content, player spotlights, and daily game moments",
      url: "https://instagram.com/realmrivalry",
      buttonText: "Follow",
      color: "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700",

    },
    {
      name: "TikTok",
      icon: SiTiktok,
      description: "Quick highlights, tips, tricks, and viral game moments",
      url: "https://tiktok.com/@realmrivalry",
      buttonText: "Follow",
      color: "bg-black hover:bg-gray-800",

    },
    {
      name: "X (Twitter)",
      icon: SiX,
      description: "Latest updates, announcements, and community interactions",
      url: "https://twitter.com/realmrivalry",
      buttonText: "Follow",
      color: "bg-gray-900 hover:bg-gray-800",

    },
    {
      name: "YouTube",
      icon: SiYoutube,
      description: "Match replays, tutorials, and developer insights",
      url: "https://youtube.com/@realmrivalry",
      buttonText: "Subscribe",
      color: "bg-red-600 hover:bg-red-700",

    }
  ];

  const handleSocialClick = (platform: SocialPlatform) => {
    // Open social media link
    window.open(platform.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {socialPlatforms.map((platform) => {
              const IconComponent = platform.icon;
              return (
                <Card key={platform.name} className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-all duration-200 hover:scale-105">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-gray-700">
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-orbitron">{platform.name}</CardTitle>
                        {platform.followers && (
                          <Badge variant="secondary" className="text-xs">
                            {platform.followers}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-300 mb-4 leading-relaxed text-sm">
                      {platform.description}
                    </CardDescription>
                    
                    <Button
                      onClick={() => handleSocialClick(platform)}
                      className={`w-full ${platform.color} text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200`}
                    >
                      <IconComponent className="w-4 h-4 mr-2" />
                      {platform.buttonText}
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>


        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="font-orbitron text-lg flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Discord Community
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Online Now:</span>
                    <span className="text-green-400">2,847</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Channels:</span>
                    <span className="text-blue-400">15</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Weekly Messages:</span>
                    <span className="text-purple-400">45,231</span>
                  </div>
                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => window.open("https://discord.gg/realm-rivalry", "_blank")}
                  >
                    <SiDiscord className="w-4 h-4 mr-2" />
                    Join Discord Server
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="font-orbitron text-lg flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  Community Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <div className="font-semibold text-yellow-400">Weekly Tournament</div>
                    <div className="text-sm text-gray-400">Every Saturday 8PM EST</div>
                    <div className="text-xs text-green-400">Prize Pool: 50,000 credits</div>
                  </div>
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <div className="font-semibold text-blue-400">Community Stream</div>
                    <div className="text-sm text-gray-400">Fridays on Twitch & YouTube</div>
                    <div className="text-xs text-blue-400">Developer Q&A Sessions</div>
                  </div>
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <div className="font-semibold text-purple-400">Fan Art Contest</div>
                    <div className="text-sm text-gray-400">Monthly submissions</div>
                    <div className="text-xs text-purple-400">Winner gets premium features</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="font-orbitron text-lg flex items-center">
                  <Heart className="w-5 h-5 mr-2" />
                  Top Contributors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <div className="flex items-center">
                      <span className="text-yellow-400 mr-2">🥇</span>
                      <span className="font-semibold">DragonMaster</span>
                    </div>
                    <span className="text-sm text-gray-400">1,247 posts</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <div className="flex items-center">
                      <span className="text-gray-300 mr-2">🥈</span>
                      <span className="font-semibold">ShadowWarrior</span>
                    </div>
                    <span className="text-sm text-gray-400">892 posts</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <div className="flex items-center">
                      <span className="text-orange-400 mr-2">🥉</span>
                      <span className="font-semibold">MysticElf</span>
                    </div>
                    <span className="text-sm text-gray-400">634 posts</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="font-orbitron text-lg flex items-center">
                  <Video className="w-5 h-5 mr-2" />
                  Trending Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <div className="font-semibold">Epic Comeback Victory</div>
                    <div className="text-sm text-gray-400">Posted 2 hours ago</div>
                    <div className="text-xs text-blue-400">2.4K views • 156 likes • 89 shares</div>
                  </div>
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <div className="font-semibold">Ultimate Team Guide</div>
                    <div className="text-sm text-gray-400">Posted 1 day ago</div>
                    <div className="text-xs text-blue-400">5.7K views • 342 likes • 267 shares</div>
                  </div>
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <div className="font-semibold">Tournament Highlights</div>
                    <div className="text-sm text-gray-400">Posted 3 days ago</div>
                    <div className="text-xs text-blue-400">12.3K views • 891 likes • 445 shares</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="font-orbitron text-lg flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Your Social Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Shares:</span>
                    <span className="text-blue-400 font-semibold">{socialStats?.totalShares || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">This Week:</span>
                    <span className="text-green-400 font-semibold">{socialStats?.weeklyShares || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Most Active Platform:</span>
                    <span className="text-purple-400 font-semibold">{socialStats?.topPlatform || "Discord"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Engagement Rate:</span>
                    <span className="text-yellow-400 font-semibold">{socialStats?.engagementRate || "87"}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="font-orbitron text-lg">Platform Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <SiDiscord className="w-4 h-4 mr-2 text-indigo-400" />
                      <span>Discord</span>
                    </div>
                    <span className="text-sm">{socialStats?.discord || "42"}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <SiInstagram className="w-4 h-4 mr-2 text-pink-400" />
                      <span>Instagram</span>
                    </div>
                    <span className="text-sm">{socialStats?.instagram || "23"}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <SiTiktok className="w-4 h-4 mr-2 text-gray-300" />
                      <span>TikTok</span>
                    </div>
                    <span className="text-sm">{socialStats?.tiktok || "18"}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <SiX className="w-4 h-4 mr-2 text-sky-400" />
                      <span>Twitter</span>
                    </div>
                    <span className="text-sm">{socialStats?.twitter || "17"}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="font-orbitron text-lg">Sharing Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                  <div className="font-semibold">Daily Shares</div>
                  <div className="text-sm text-gray-400">Share 3 times daily</div>
                  <div className="text-yellow-400 text-sm">+500 credits</div>
                </div>
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <Star className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                  <div className="font-semibold">Viral Content</div>
                  <div className="text-sm text-gray-400">100+ engagement</div>
                  <div className="text-blue-400 text-sm">+2000 credits</div>
                </div>
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-pink-400" />
                  <div className="font-semibold">Community Builder</div>
                  <div className="text-sm text-gray-400">Bring 5 new players</div>
                  <div className="text-pink-400 text-sm">+10000 credits</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}