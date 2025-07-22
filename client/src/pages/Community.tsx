import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ReferralSystem from "@/components/ReferralSystem";
import SocialIntegration from "@/components/SocialIntegration";
import RedemptionCodes from "@/components/RedemptionCodes";
import Roadmap from "@/components/Roadmap";
import HelpManual from "@/pages/HelpManual";
import { Users, Share2, Gift, MessageCircle, HelpCircle, MapPin } from "lucide-react";

export default function Community() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <Users className="h-10 w-10" />
            Community Hub
          </h1>
          <p className="text-gray-400 text-lg">
            Connect, share, and grow together in the Realm Rivalry community
          </p>
        </div>

        <Tabs defaultValue="social" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="social" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Social Media
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="codes" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Redeem Codes
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Roadmap
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Help
            </TabsTrigger>
          </TabsList>

          <TabsContent value="social" className="mt-6">
            <SocialIntegration />
          </TabsContent>

          <TabsContent value="referrals" className="mt-6">
            <ReferralSystem />
          </TabsContent>

          <TabsContent value="codes" className="mt-6">
            <RedemptionCodes />
          </TabsContent>

          <TabsContent value="roadmap" className="mt-6">
            <Roadmap />
          </TabsContent>

          <TabsContent value="help" className="mt-6">
            <div className="space-y-6">
              {/* Help & Support Panel - Now at the top */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <HelpCircle className="h-6 w-6" />
                  Help & Support
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors">
                    <h3 className="font-semibold mb-2">📞 Contact Support</h3>
                    <p className="text-gray-300 text-sm mb-3">Get help with technical issues, account problems, or gameplay questions.</p>
                    <button
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm font-medium transition-colors"
                      onClick={() => window.open('mailto:support@realmrivalry.com', '_blank')}
                    >
                      Email Support
                    </button>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors">
                    <h3 className="font-semibold mb-2">💬 Join Discord</h3>
                    <p className="text-gray-300 text-sm mb-3">Connect with the community, report bugs, and get quick answers from other players.</p>
                    <button
                      className="bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded text-sm font-medium transition-colors"
                      onClick={() => window.open('https://discord.gg/realmrivalry', '_blank')}
                    >
                      Join Discord
                    </button>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors">
                    <h3 className="font-semibold mb-2">🐛 Report Bug</h3>
                    <p className="text-gray-300 text-sm mb-3">Found a problem? Help us improve the game by reporting issues.</p>
                    <button
                      className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm font-medium transition-colors"
                      onClick={() => window.open('https://forms.gle/bug-report', '_blank')}
                    >
                      Report Issue
                    </button>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors">
                    <h3 className="font-semibold mb-2">💡 Feature Request</h3>
                    <p className="text-gray-300 text-sm mb-3">Have an idea to make the game better? We'd love to hear from you.</p>
                    <button
                      className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm font-medium transition-colors"
                      onClick={() => window.open('https://forms.gle/feature-request', '_blank')}
                    >
                      Suggest Feature
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Complete Game Manual - Now below Help & Support */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <HelpCircle className="h-6 w-6" />
                  Complete Game Manual
                </h2>
                <HelpManual />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}