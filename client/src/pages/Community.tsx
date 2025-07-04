import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import ReferralSystem from "@/components/ReferralSystem";
import SocialIntegration from "@/components/SocialIntegration";
import RedemptionCodes from "@/components/RedemptionCodes";
import { Users, Share2, Gift, MessageCircle } from "lucide-react";

export default function Community() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
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
          <TabsList className="grid w-full grid-cols-3">
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
        </Tabs>
      </div>
    </div>
  );
}