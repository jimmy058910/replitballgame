import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Gift, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import UnityAdsService from '@/services/UnityAdsService';

interface AdIntegrationProps {
  onAdWatched?: (reward: number) => void;
}

export function AdIntegration({ onAdWatched }: AdIntegrationProps) {
  const [adsWatchedToday, setAdsWatchedToday] = useState(0);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [unityAdsReady, setUnityAdsReady] = useState(false);
  const [dailyLimit] = useState(10);
  const { toast } = useToast();

  useEffect(() => {
    initializeUnityAds();
    fetchAdStatus();
  }, []);

  const initializeUnityAds = async () => {
    try {
      setIsInitializing(true);
      const success = await UnityAdsService.initialize();
      
      if (success) {
        setUnityAdsReady(true);
        console.log('Unity Ads initialized successfully');
      } else {
        console.error('Unity Ads initialization failed');
        toast({
          title: "Ad System Notice",
          description: "Unity Ads not available. Using simulation mode.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error initializing Unity Ads:', error);
      toast({
        title: "Ad System Notice", 
        description: "Unity Ads not available. Using simulation mode.",
        variant: "default"
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const fetchAdStatus = async () => {
    try {
      const response = await fetch('/api/store/ads');
      const data = await response.json();
      setAdsWatchedToday(data.adsWatchedToday || 0);
    } catch (error) {
      console.error('Error fetching ad status:', error);
    }
  };

  const watchRewardedAd = async () => {
    setIsWatchingAd(true);
    
    try {
      let adResult = null;
      
      // Try Unity Ads first
      if (unityAdsReady && UnityAdsService.isSupported() && UnityAdsService.isReady('rewardedVideo')) {
        try {
          adResult = await UnityAdsService.showRewardedVideo();
          
          if (adResult.state === 'COMPLETED') {
            // Unity ad completed successfully
            console.log('Unity Ads - Video completed successfully');
          } else if (adResult.state === 'SKIPPED') {
            toast({
              title: "Ad Skipped",
              description: "You need to watch the full ad to earn credits.",
              variant: "default"
            });
            return;
          } else {
            throw new Error('Unity ad failed or was not completed');
          }
        } catch (unityError) {
          console.error('Unity Ads error:', unityError);
          // Fall back to simulation
          adResult = null;
        }
      }

      // Fallback to simulation if Unity Ads not available
      if (!adResult) {
        console.log('Using ad simulation mode');
        await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second simulation
        adResult = { state: 'COMPLETED', placementId: 'simulation' };
      }

      // Process the ad reward
      if (adResult.state === 'COMPLETED') {
        const response = await fetch('/api/store/watch-ad', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            adType: 'rewarded_video',
            placement: adResult.placementId || 'unity_ads',
            unityAdsResult: adResult
          })
        });

        const result = await response.json();
        
        if (result.success) {
          const reward = result.reward?.amount || 0;
          setAdsWatchedToday(prev => prev + 1);
          onAdWatched?.(reward);
          
          toast({
            title: "Credits Earned!",
            description: `You earned ${reward.toLocaleString()} credits!`,
            variant: "default"
          });
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to process ad reward",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error watching ad:', error);
      toast({
        title: "Ad Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsWatchingAd(false);
    }
  };

  const adsRemaining = Math.max(0, dailyLimit - adsWatchedToday);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Earn Free Credits
          {unityAdsReady && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              Unity Ads
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Ads watched today:
          </span>
          <span className="font-medium">
            {adsWatchedToday} / {dailyLimit}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Remaining ads:
          </span>
          <span className="font-medium text-green-600">
            {adsRemaining}
          </span>
        </div>

        {!unityAdsReady && !isInitializing && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
            <AlertCircle className="h-4 w-4" />
            <span>Using simulation mode (Unity Ads not available)</span>
          </div>
        )}

        <Button
          onClick={watchRewardedAd}
          disabled={isWatchingAd || adsRemaining === 0 || isInitializing}
          className="w-full"
        >
          {isInitializing ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Initializing...
            </>
          ) : isWatchingAd ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Watching Ad...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Watch Ad for Credits
            </>
          )}
        </Button>

        {adsRemaining === 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Daily limit reached. Come back tomorrow!
          </p>
        )}

        <div className="text-xs text-muted-foreground text-center">
          Earn 500-10,000 credits per ad
          {unityAdsReady && (
            <div className="text-green-600 font-medium">Unity Ads Active</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Display Ad Component for sidebar/header placement
export function DisplayAd({ 
  width = 300, 
  height = 250, 
  className = "" 
}: { 
  width?: number; 
  height?: number; 
  className?: string; 
}) {
  useEffect(() => {
    // Initialize display ad
    if (typeof window !== 'undefined' && window.adsbygoogle) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.error('AdSense error:', error);
      }
    }
  }, []);

  return (
    <div className={`ad-container ${className}`}>
      <ins 
        className="adsbygoogle"
        style={{ display: 'block', width: `${width}px`, height: `${height}px` }}
        data-ad-client="ca-pub-YOUR_PUBLISHER_ID"
        data-ad-slot="YOUR_AD_SLOT_ID"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

// Declare global types
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}