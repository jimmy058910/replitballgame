import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Clock, Gift } from 'lucide-react';
import { UnityAdsService } from '@/services/UnityAdsService';
import { useToast } from '@/hooks/use-toast';

interface HalftimeAdProps {
  onAdCompleted: (reward: number) => void;
  onAdSkipped: () => void;
  onContinueGame: () => void;
  isVisible: boolean;
}

export function HalftimeAd({ onAdCompleted, onAdSkipped, onContinueGame, isVisible }: HalftimeAdProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSkipOption, setShowSkipOption] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (isVisible) {
      // Show skip option after 5 seconds
      const timer = setTimeout(() => {
        setShowSkipOption(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleWatchAd = async () => {
    setIsLoading(true);
    try {
      const unityAdsService = UnityAdsService.getInstance();
      await unityAdsService.initialize();
      
      const result = await unityAdsService.showHalftimeVideo();
      
      if (result.state === 'COMPLETED') {
        // Reward for halftime ad (bonus reward)
        const reward = Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000; // 1000-2000 credits
        
        // Send reward to backend
        const response = await fetch('/api/store/watch-ad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adType: 'rewarded_video',
            placement: 'halftimeVideo',
            unityAdsResult: result
          })
        });
        
        if (response.ok) {
          onAdCompleted(reward);
          toast({
            title: "Halftime Bonus!",
            description: `You earned ${reward.toLocaleString()} credits!`,
            variant: "default"
          });
        }
      } else if (result.state === 'SKIPPED') {
        onAdSkipped();
        toast({
          title: "Ad Skipped",
          description: "No reward earned, continuing game...",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Halftime ad error:', error);
      // Fallback to simulation
      const reward = Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;
      onAdCompleted(reward);
      toast({
        title: "Halftime Bonus!",
        description: `You earned ${reward.toLocaleString()} credits! (Simulation)`,
        variant: "default"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onAdSkipped();
    toast({
      title: "Halftime Break",
      description: "Continuing to second half...",
      variant: "default"
    });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4 bg-gradient-to-br from-purple-900 to-blue-900 text-white border-purple-500">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Clock className="h-12 w-12 text-yellow-400 mr-2" />
            <CardTitle className="text-2xl font-bold">HALFTIME</CardTitle>
          </div>
          <p className="text-purple-200">
            Watch an ad for bonus credits during halftime!
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 text-yellow-400">
              <Gift className="h-5 w-5" />
              <span className="font-semibold">Bonus: 1,000-2,000 Credits</span>
            </div>
            <p className="text-sm text-purple-200">
              Earn extra credits to boost your team!
            </p>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={handleWatchAd}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading Ad...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Watch Ad for Bonus
                </>
              )}
            </Button>
            
            {showSkipOption && (
              <Button
                onClick={handleSkip}
                variant="outline"
                className="w-full border-purple-400 text-purple-200 hover:bg-purple-800 hover:text-white"
              >
                Skip & Continue Game
              </Button>
            )}
            
            <Button
              onClick={onContinueGame}
              variant="ghost"
              className="w-full text-purple-300 hover:bg-purple-800 hover:text-white"
            >
              Continue Game
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}