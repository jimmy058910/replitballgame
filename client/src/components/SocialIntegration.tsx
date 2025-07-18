import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { SiDiscord, SiFacebook, SiInstagram, SiTiktok, SiX, SiYoutube } from "react-icons/si";

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
    </div>
  );
}