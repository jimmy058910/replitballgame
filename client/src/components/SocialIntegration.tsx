import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MessageCircle, Users, Video, Camera } from "lucide-react";
import { SiDiscord, SiFacebook, SiInstagram, SiTiktok } from "react-icons/si";

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
  const socialPlatforms: SocialPlatform[] = [
    {
      name: "Discord",
      icon: SiDiscord,
      description: "Join our community for real-time discussions, tournaments, and exclusive events",
      url: "https://discord.gg/realm-rivalry",
      buttonText: "Join Server",
      color: "bg-indigo-600 hover:bg-indigo-700",
      followers: "15.2K members"
    },
    {
      name: "Facebook",
      icon: SiFacebook,
      description: "Follow us for game updates, community highlights, and behind-the-scenes content",
      url: "https://facebook.com/realmrivalry",
      buttonText: "Follow Page",
      color: "bg-blue-600 hover:bg-blue-700",
      followers: "8.7K followers"
    },
    {
      name: "Instagram",
      icon: SiInstagram,
      description: "Visual content, player spotlights, and daily game moments",
      url: "https://instagram.com/realmrivalry",
      buttonText: "Follow",
      color: "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700",
      followers: "12.1K followers"
    },
    {
      name: "TikTok",
      icon: SiTiktok,
      description: "Quick highlights, tips, tricks, and viral game moments",
      url: "https://tiktok.com/@realmrivalry",
      buttonText: "Follow",
      color: "bg-black hover:bg-gray-800",
      followers: "25.6K followers"
    }
  ];

  const handleSocialClick = (url: string, platform: string) => {
    // Track social media clicks for analytics
    window.open(url, '_blank', 'noopener,noreferrer');
    
    // Optional: Track engagement
    if (typeof gtag !== 'undefined') {
      gtag('event', 'social_click', {
        platform: platform.toLowerCase(),
        action: 'follow'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Connect With Our Community</h2>
        <p className="text-gray-400">
          Stay updated with the latest news, connect with other players, and never miss an event
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {socialPlatforms.map((platform) => {
          const IconComponent = platform.icon;
          return (
            <Card key={platform.name} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <IconComponent className="h-6 w-6" />
                  {platform.name}
                  {platform.followers && (
                    <Badge variant="outline" className="text-xs">
                      {platform.followers}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-300">
                  {platform.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleSocialClick(platform.url, platform.name)}
                  className={`w-full ${platform.color} text-white border-0`}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {platform.buttonText}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Community Benefits */}
      <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Community Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <MessageCircle className="h-8 w-8 mx-auto text-blue-400" />
              <h3 className="font-semibold">Direct Support</h3>
              <p className="text-sm text-gray-400">
                Get help from our team and community members
              </p>
            </div>
            <div className="text-center space-y-2">
              <Video className="h-8 w-8 mx-auto text-green-400" />
              <h3 className="font-semibold">Exclusive Content</h3>
              <p className="text-sm text-gray-400">
                Access to beta features and early announcements
              </p>
            </div>
            <div className="text-center space-y-2">
              <Camera className="h-8 w-8 mx-auto text-purple-400" />
              <h3 className="font-semibold">Community Events</h3>
              <p className="text-sm text-gray-400">
                Participate in tournaments and special challenges
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Media Guidelines */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle>Community Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-green-400 mb-2">✓ Do:</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• Share your amazing plays and achievements</li>
                <li>• Help new players with tips and advice</li>
                <li>• Participate in community discussions</li>
                <li>• Report bugs and provide feedback</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-red-400 mb-2">✗ Don't:</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• Share exploits or cheating methods</li>
                <li>• Spam or post unrelated content</li>
                <li>• Harass other community members</li>
                <li>• Share personal account information</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}