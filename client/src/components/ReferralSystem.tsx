import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Gift, Copy, Share2, Trophy } from "lucide-react";

interface ReferralData {
  myCode: string | null;
  totalReferrals: number;
  creditsEarned: number;
  gemsEarned: number;
  activeReferrals: number;
  hasUsedReferral: boolean;
  recentReferrals: Array<{
    username: string;
    joinedAt: string; // Assuming string date from API
    isActive: boolean;
  }>;
}

interface UserData {
  // Define user properties if needed, e.g., for checking if they can generate a code
  id: string;
}

export default function ReferralSystem() {
  const { toast } = useToast();

  const { data: referralData } = useQuery<ReferralData>({ // Typed referralData
    queryKey: ["/api/referrals"],
  });

  const { data: user } = useQuery<UserData>({ // Typed user data
    queryKey: ["/api/auth/user"],
  });

  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/referrals/generate", "POST"); // Corrected apiRequest
    },
    onSuccess: () => {
      toast({
        title: "Referral Code Generated",
        description: "Your unique referral code has been created!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/referrals"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  const copyToClipboard = (text: string) => {
    if (text === null) { // Should not happen if called correctly, but good for type safety
      toast({ title: "Error", description: "No code to copy.", variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Referral code copied successfully!",
    });
  };

  const shareReferral = () => {
    if (navigator.share && referralData?.myCode) {
      navigator.share({
        title: "Join Realm Rivalry!",
        text: `Join me in Realm Rivalry - the ultimate fantasy sports game! Use my referral code: ${referralData.myCode}`,
        url: window.location.origin,
      });
    } else {
      copyToClipboard(`Join me in Realm Rivalry! Use code: ${referralData?.myCode} at ${window.location.origin}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* My Referral Code - Now full width */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            My Referral Code
          </CardTitle>
          <CardDescription>
            Share your code and earn rewards when friends join
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {referralData?.myCode ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={referralData.myCode || ""} // Fallback for null to prevent error with input value
                  readOnly
                  className="bg-gray-700 border-gray-600"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (referralData?.myCode) {
                      copyToClipboard(referralData.myCode);
                    }
                  }}
                  disabled={!referralData?.myCode}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={shareReferral}
                className="w-full"
                variant="outline"
                disabled={!referralData?.myCode} // Disable if no code
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share with Friends
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => generateCodeMutation.mutate()}
              disabled={generateCodeMutation.isPending}
              className="w-full"
            >
              <Gift className="mr-2 h-4 w-4" />
              Generate My Code
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Referral Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Referral Statistics
          </CardTitle>
          <CardDescription>
            Track your referral progress and rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {referralData?.totalReferrals || 0}
              </div>
              <div className="text-sm text-gray-400">Total Referrals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {referralData?.creditsEarned?.toLocaleString() || 0}₡
              </div>
              <div className="text-sm text-gray-400">Credits Earned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {referralData?.gemsEarned || 0}💎
              </div>
              <div className="text-sm text-gray-400">Gems Earned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {referralData?.activeReferrals || 0}
              </div>
              <div className="text-sm text-gray-400">Active Players</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Referrals */}
      {referralData?.recentReferrals && referralData.recentReferrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referralData.recentReferrals.map((referral: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{referral.username}</div>
                    <div className="text-sm text-gray-400">
                      Joined {new Date(referral.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge
                    className={
                      referral.isActive ? "bg-green-600" : "bg-gray-600"
                    }
                  >
                    {referral.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}