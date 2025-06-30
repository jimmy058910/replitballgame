import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Gift, Check, Clock, Star } from "lucide-react";

interface RedemptionReward {
  type: "credits" | "gems" | "item" | "player"; // More specific types
  amount?: number;
  itemName?: string;
  playerName?: string;
  description?: string; // For rewards that are just descriptive
}

interface RedemptionHistoryItem {
  code: string;
  description: string;
  redeemedAt: string; // Assuming string from API, will be parsed to Date
  rewards: RedemptionReward[];
}

interface RedeemCodeResponse { // Added interface for mutation response
  rewards: string[];
}

export default function RedemptionCodes() {
  const [redemptionCode, setRedemptionCode] = useState("");
  const { toast } = useToast();

  const { data: redemptionHistory = [] } = useQuery<RedemptionHistoryItem[]>({ // Typed and default
    queryKey: ["/api/redemption-codes/history"],
    queryFn: () => apiRequest<RedemptionHistoryItem[]>("/api/redemption-codes/history"), // Added queryFn
  });

  const redeemCodeMutation = useMutation({
    mutationFn: async (code: string): Promise<RedeemCodeResponse> => { // Typed mutationFn
      return apiRequest<RedeemCodeResponse>("/api/redemption-codes/redeem", "POST", { code });
    },
    onSuccess: (data: RedeemCodeResponse) => { // Typed data in onSuccess
      toast({
        title: "Code Redeemed Successfully!",
        description: `You received: ${data.rewards.join(", ")}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/redemption-codes/history"] });
      queryClient.invalidateQueries({ queryKey: ["myTeamFinances"] }); // Use the actual query key used in useQuery
      setRedemptionCode("");
    },
    onError: (error: Error) => {
      toast({
        title: "Redemption Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatReward = (reward: RedemptionReward): string => { // Typed reward
    if (reward.type === "credits" && reward.amount !== undefined) {
      return `${reward.amount.toLocaleString()}₡`;
    } else if (reward.type === "gems" && reward.amount !== undefined) {
      return `${reward.amount}💎`;
    } else if (reward.type === "item" && reward.itemName) {
      return reward.itemName;
    } else if (reward.type === "player" && reward.playerName) {
      return `${reward.playerName} (Player)`;
    }
    return reward.description || "Unknown Reward"; // Fallback
  };

  const getRewardTypeColor = (type: RedemptionReward['type']) => { // Typed type
    switch (type) {
      case "credits": return "bg-green-600";
      case "gems": return "bg-yellow-600";
      case "item": return "bg-blue-600";
      case "player": return "bg-purple-600";
      default: return "bg-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* Redeem Code Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Redeem Code
          </CardTitle>
          <CardDescription>
            Enter special codes to unlock exclusive rewards, items, and bonuses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter redemption code..."
              value={redemptionCode}
              onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
              className="bg-gray-700 border-gray-600 flex-1"
              maxLength={20}
            />
            <Button
              onClick={() => redeemCodeMutation.mutate(redemptionCode)}
              disabled={!redemptionCode || redeemCodeMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Gift className="mr-2 h-4 w-4" />
              Redeem
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="text-center p-4 bg-gray-800 rounded-lg">
              <Gift className="h-8 w-8 mx-auto text-green-400 mb-2" />
              <h3 className="font-semibold">Event Codes</h3>
              <p className="text-sm text-gray-400">
                Released during special events and celebrations
              </p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded-lg">
              <Star className="h-8 w-8 mx-auto text-yellow-400 mb-2" />
              <h3 className="font-semibold">Community Codes</h3>
              <p className="text-sm text-gray-400">
                Shared on our social media channels
              </p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded-lg">
              <Clock className="h-8 w-8 mx-auto text-blue-400 mb-2" />
              <h3 className="font-semibold">Limited Time</h3>
              <p className="text-sm text-gray-400">
                Some codes expire after a certain period
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Redemption History */}
      {redemptionHistory && redemptionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              Redemption History
            </CardTitle>
            <CardDescription>
              Your previously redeemed codes and rewards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {redemptionHistory?.map((redemption: RedemptionHistoryItem, index: number) => ( // Used RedemptionHistoryItem
                <div
                  key={index} // Using index as key is okay if list is static or items don't have unique IDs
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      {redemption.code}
                    </Badge>
                    <div>
                      <div className="font-medium">{redemption.description}</div>
                      <div className="text-sm text-gray-400">
                        Redeemed on {new Date(redemption.redeemedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {redemption.rewards.map((reward: RedemptionReward, rewardIndex: number) => ( // Used RedemptionReward
                      <Badge
                        key={rewardIndex}
                        className={`${getRewardTypeColor(reward.type)} text-white`}
                      >
                        {formatReward(reward)}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Code Sources Info */}
      <Card className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-500/30">
        <CardHeader>
          <CardTitle>Where to Find Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-green-400">Official Sources</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Discord server announcements</li>
                <li>• Social media posts (Facebook, Instagram, TikTok)</li>
                <li>• Email newsletters</li>
                <li>• In-game event notifications</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-blue-400">Special Occasions</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Game anniversaries and milestones</li>
                <li>• Holiday celebrations</li>
                <li>• Community achievements</li>
                <li>• Developer livestreams</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle>Pro Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-green-400 mb-2">✓ Tips:</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• Follow our social media for the latest codes</li>
                <li>• Join Discord for exclusive member codes</li>
                <li>• Codes are case-insensitive</li>
                <li>• Some codes can only be used once per account</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-yellow-400 mb-2">⚠ Important:</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• Codes may have expiration dates</li>
                <li>• Limited quantity codes expire when used up</li>
                <li>• Never share codes from unofficial sources</li>
                <li>• Contact support if a valid code doesn't work</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}