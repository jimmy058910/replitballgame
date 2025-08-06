import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Play, Gift, X, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AdSystemProps {
  isOpen: boolean;
  onClose: () => void;
  adType: 'interstitial' | 'rewarded_video';
  placement: string;
  rewardType?: 'credits' | 'premium_currency' | 'none';
  rewardAmount?: number;
  onAdComplete?: (reward?: { type: string; amount: number }) => void;
}

export function AdSystem({ 
  isOpen, 
  onClose, 
  adType, 
  placement, 
  rewardType = 'none', 
  rewardAmount = 0,
  onAdComplete 
}: AdSystemProps) {
  const [adState, setAdState] = useState<'loading' | 'playing' | 'completed' | 'skippable'>('loading');
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const { toast } = useToast();

  // Ad durations (in seconds)
  const AD_DURATIONS = {
    interstitial: 5, // Short interstitial ads
    rewarded_video: 15 // Longer rewarded video ads
  };

  const duration = AD_DURATIONS[adType];

  useEffect(() => {
    if (!isOpen) {
      setAdState('loading');
      setProgress(0);
      setTimeRemaining(0);
      return;
    }

    // Start ad after brief loading
    const loadingTimer = setTimeout(() => {
      setAdState('playing');
      setTimeRemaining(duration);
    }, 1000);

    return () => clearTimeout(loadingTimer);
  }, [isOpen, duration]);

  useEffect(() => {
    if (adState !== 'playing') return;

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / duration);
        if (newProgress >= 100) {
          setAdState(adType === 'interstitial' ? 'completed' : 'skippable');
          setTimeRemaining(0);
          return 100;
        }
        return newProgress;
      });

      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [adState, duration, adType]);

  const handleAdComplete = async () => {
    try {
      // Track ad view in database - this will also handle daily/cumulative counts
      const response = await apiRequest<{
        message: string;
        newDailyCount?: number;
        newCumulativeCount?: number;
        premiumRewardGranted?: boolean;
        reward?: { type: string; amount: number; name?: string };
      }>('/api/ads/view', 'POST', {
        adType,
        placement,
        rewardType,
        rewardAmount,
        completed: true
      });

      // Award rewards for rewarded video ads
      if (adType === 'rewarded_video' && rewardType !== 'none' && rewardAmount > 0) {
        onAdComplete?.({ type: rewardType, amount: rewardAmount });
        
        toast({
          title: "Reward Earned!",
          description: `You earned ${rewardAmount} ${rewardType === 'credits' ? 'credits' : 'premium currency'}!`,
          variant: "default"
        });
      }

      if (response.premiumRewardGranted && response.reward) {
        toast({
          title: "Premium Reward Unlocked!",
          description: `Your team earned a special reward: ${response.reward.name || `${response.reward.amount} ${response.reward.type}`}`,
          variant: "default",
          duration: 7000,
        });
      }

      onClose();
    } catch (error: any) {
      console.error('Error tracking ad view:', error);
      const errorMessage = error?.response?.data?.message || "Failed to process ad reward. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      // Potentially close the ad dialog even if there's an error,
      // unless it's a specific error like "daily limit reached" which might keep it open or show a different message.
      if (error?.response?.data?.error !== "daily_limit_reached") {
        onClose();
      }
    }
  };

  const handleSkip = async () => {
    try {
      // Track ad view as incomplete
      await apiRequest('/api/ads/view', 'POST', {
        adType,
        placement,
        rewardType: 'none',
        rewardAmount: 0,
        completed: false // This will only track the view, not grant rewards or increment counts
      });

      onClose();
    } catch (error) {
      console.error('Error tracking ad skip:', error);
      // Optionally inform the user that skipping won't grant rewards
      toast({
        title: "Ad Skipped",
        description: "You won't receive rewards for skipped ads.",
        variant: "default"
      });
      onClose();
    }
  };

  const getAdContent = () => {
    const adContents = {
      interstitial: [
        {
          title: "Premium Team Management",
          description: "Upgrade to premium for advanced analytics and unlimited roster changes!",
          cta: "Learn More"
        },
        {
          title: "Fantasy Sports League",
          description: "Join the ultimate fantasy sports experience with friends!",
          cta: "Get Started"
        },
        {
          title: "Mobile Gaming",
          description: "Download our mobile app for gaming on the go!",
          cta: "Download Now"
        }
      ],
      rewarded_video: [
        {
          title: "Earn Rewards!",
          description: "Watch this video to earn premium currency and boost your team!",
          cta: "Watch Now"
        },
        {
          title: "Unlock Premium Features",
          description: "Get exclusive access to advanced team management tools!",
          cta: "Continue Watching"
        }
      ]
    };

    const content = adContents[adType];
    if (!content || content.length === 0) {
      return {
        title: "Ad Content Loading...",
        description: "Please wait while ad content loads.",
        duration: 3000
      };
    }
    return content[Math.floor(Math.random() * content.length)];
  };

  const adContent = getAdContent();
  const ctaText = 'cta' in adContent ? adContent.cta : "Continue";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {adType === 'rewarded_video' && <Gift className="h-4 w-4 text-yellow-500" />}
            {adType === 'interstitial' ? 'Advertisement' : 'Rewarded Video'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ad Loading State */}
          {adState === 'loading' && (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading advertisement...</p>
            </div>
          )}

          {/* Ad Playing State */}
          {(adState === 'playing' || adState === 'skippable' || adState === 'completed') && (
            <>
              {/* Simulated Ad Content */}
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-6 rounded-lg text-center">
                <div className="mb-4">
                  <Play className="h-12 w-12 mx-auto mb-2 opacity-80" />
                </div>
                <h3 className="text-lg font-bold mb-2">{adContent.title}</h3>
                <p className="text-sm opacity-90 mb-4">{adContent.description}</p>
                <Button variant="secondary" size="sm" disabled>
                  {ctaText}
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Ad Progress</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeRemaining}s
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Reward Information for Rewarded Video */}
              {adType === 'rewarded_video' && rewardType !== 'none' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Gift className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium">Reward:</span>
                    <span>+{rewardAmount} {rewardType === 'credits' ? 'Credits' : 'Premium Currency'}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {/* Skip button for interstitials (after 3 seconds) or completed rewarded videos */}
                {((adType === 'interstitial' && progress > 60) || adState === 'skippable' || adState === 'completed') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={adState === 'completed' ? handleAdComplete : handleSkip}
                    className="flex-1"
                  >
                    <X className="h-3 w-3 mr-1" />
                    {adState === 'completed' ? 'Claim Reward' : 'Skip'}
                  </Button>
                )}

                {/* Continue button for completed ads */}
                {adState === 'completed' && (
                  <Button 
                    onClick={handleAdComplete}
                    className="flex-1"
                  >
                    {adType === 'rewarded_video' ? 'Claim Reward' : 'Continue'}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing ad system state
export function useAdSystem() {
  const [adConfig, setAdConfig] = useState<{
    isOpen: boolean;
    adType: 'interstitial' | 'rewarded_video';
    placement: string;
    rewardType?: 'credits' | 'premium_currency' | 'none';
    rewardAmount?: number;
    onAdComplete?: (reward?: { type: string; amount: number }) => void;
  } | null>(null);

  const showInterstitialAd = (placement: string, onComplete?: () => void) => {
    setAdConfig({
      isOpen: true,
      adType: 'interstitial',
      placement,
      rewardType: 'none',
      rewardAmount: 0,
      onAdComplete: onComplete
    });
  };

  const showRewardedVideoAd = (
    placement: string, 
    rewardType: 'credits' | 'premium_currency', 
    rewardAmount: number,
    onComplete?: (reward?: { type: string; amount: number }) => void // Made reward parameter optional
  ) => {
    setAdConfig({
      isOpen: true,
      adType: 'rewarded_video',
      placement,
      rewardType,
      rewardAmount,
      onAdComplete: onComplete
    });
  };

  const closeAd = () => {
    setAdConfig(null);
  };

  return {
    adConfig,
    showInterstitialAd,
    showRewardedVideoAd,
    closeAd
  };
}