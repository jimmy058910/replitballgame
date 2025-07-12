import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Gift, Clock } from 'lucide-react';

interface AdIntegrationProps {
  onAdWatched?: (reward: number) => void;
}

export function AdIntegration({ onAdWatched }: AdIntegrationProps) {
  const [adsWatchedToday, setAdsWatchedToday] = useState(0);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [dailyLimit] = useState(10);

  useEffect(() => {
    // Initialize Google AdSense
    if (typeof window !== 'undefined' && !window.adsbygoogle) {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    // Fetch current ad status
    fetchAdStatus();
  }, []);

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
      // For now, simulate ad watching
      // In production, this would trigger actual ad networks
      await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second ad
      
      const response = await fetch('/api/store/watch-ad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adType: 'rewarded_video',
          placement: 'rewards_center'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const reward = result.reward?.amount || 0;
        setAdsWatchedToday(prev => prev + 1);
        onAdWatched?.(reward);
      }
    } catch (error) {
      console.error('Error watching ad:', error);
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

        <Button
          onClick={watchRewardedAd}
          disabled={isWatchingAd || adsRemaining === 0}
          className="w-full"
        >
          {isWatchingAd ? (
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