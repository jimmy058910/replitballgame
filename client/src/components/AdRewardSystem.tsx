import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Play, Gift, Clock, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AdStats {
  dailyCount: number;
  totalCount: number;
  premiumProgress: number;
  canWatchMore: boolean;
  dailyLimit: number;
  premiumThreshold: number;
  resetTime?: string;
}

interface AdRewardResult {
  success: boolean;
  message: string;
  credits?: number;
}

export function AdRewardSystem() {
  const [adStats, setAdStats] = useState<AdStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWatching, setIsWatching] = useState(false);
  const { toast } = useToast();

  const fetchAdStats = async () => {
    try {
      const stats = await apiRequest<AdStats>('/api/ads/stats', 'GET');
      setAdStats(stats);
    } catch (error) {
      console.error('Failed to fetch ad stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdStats();
    
    // Poll for stats updates every 30 seconds
    const interval = setInterval(fetchAdStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleWatchAd = async () => {
    if (!adStats?.canWatchMore) {
      toast({
        title: "Daily Limit Reached",
        description: "You've watched the maximum 20 ads today. Reset in a few hours.",
        variant: "destructive"
      });
      return;
    }

    setIsWatching(true);
    
    try {
      // Simulate ad watching delay (3-5 seconds)
      const adDuration = Math.floor(Math.random() * 2000) + 3000;
      
      toast({
        title: "Watching Ad...",
        description: "Please wait while the ad plays.",
      });

      await new Promise(resolve => setTimeout(resolve, adDuration));

      const result = await apiRequest<AdRewardResult>('/api/ads/view', 'POST', {
        adType: 'rewarded_video',
        placement: 'store_bonus',
        rewardType: 'credits',
        rewardAmount: Math.floor(Math.random() * 500) + 250, // 250-750 credits
        completed: true
      });
      
      if (result.success) {
        toast({
          title: "Ad Reward Earned!",
          description: result.message,
        });
        
        // Refresh stats
        await fetchAdStats();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process ad reward",
        variant: "destructive"
      });
    } finally {
      setIsWatching(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Ad Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!adStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Ad Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load ad statistics.</p>
        </CardContent>
      </Card>
    );
  }

  const dailyProgress = (adStats.dailyCount / adStats.dailyLimit) * 100;
  const premiumProgress = (adStats.premiumProgress / adStats.premiumThreshold) * 100;
  
  const getTimeUntilReset = () => {
    if (!adStats.resetTime) return "Unknown";
    const now = new Date();
    const reset = new Date(adStats.resetTime);
    const diff = reset.getTime() - now.getTime();
    
    if (diff <= 0) return "Reset available";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Ad Rewards System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Daily Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Daily Ads Watched</span>
            <Badge variant={adStats.canWatchMore ? "default" : "secondary"}>
              {adStats.dailyCount}/{adStats.dailyLimit}
            </Badge>
          </div>
          <Progress value={dailyProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Earn 250-750 credits per ad</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Reset: {getTimeUntilReset()}
            </span>
          </div>
        </div>

        <Separator />

        {/* Premium Reward Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Premium Reward Progress
            </span>
            <Badge variant="outline">
              {adStats.premiumProgress}/{adStats.premiumThreshold}
            </Badge>
          </div>
          <Progress value={premiumProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Watch 50 ads total to unlock premium loot box rewards (credits, gems, equipment, entries)
          </p>
        </div>

        <Separator />

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{adStats.totalCount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Total Ads Watched
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {Math.floor(adStats.totalCount / adStats.premiumThreshold)}
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Gift className="h-3 w-3" />
              Premium Rewards Earned
            </div>
          </div>
        </div>

        <Separator />

        {/* Watch Ad Button */}
        <div className="space-y-3">
          <Button 
            onClick={handleWatchAd}
            disabled={!adStats.canWatchMore || isWatching}
            className="w-full"
            size="lg"
          >
            {isWatching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Watching Ad...
              </>
            ) : !adStats.canWatchMore ? (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Daily Limit Reached
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Watch Ad for Credits
              </>
            )}
          </Button>
          
          {adStats.canWatchMore && (
            <div className="text-center text-xs text-muted-foreground">
              {adStats.dailyLimit - adStats.dailyCount} ads remaining today
            </div>
          )}
        </div>

        {/* Bonus Info */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          <div className="text-xs font-medium">💡 Pro Tips:</div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• Halftime ads in matches count toward your daily limit</div>
            <div>• Premium rewards reset after every 50 ads watched</div>
            <div>• Daily limits reset at midnight Eastern Time</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}