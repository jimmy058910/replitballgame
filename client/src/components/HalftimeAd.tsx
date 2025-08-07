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
  halftimeStats?: {
    homeScore: number;
    awayScore: number;
    homeStats?: {
      possessionTime: number;
      totalYards: number;
      turnovers: number;
    };
    awayStats?: {
      possessionTime: number;
      totalYards: number;
      turnovers: number;
    };
    mvp?: {
      homeMVP: { playerName: string; score: number };
      awayMVP: { playerName: string; score: number };
    };
  };
  teamNames?: {
    home: string;
    away: string;
  };
}

export function HalftimeAd({ onAdCompleted, onAdSkipped, onContinueGame, isVisible, halftimeStats, teamNames }: HalftimeAdProps) {
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
        // Mandatory halftime ad - no credits, just count towards daily limit
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
          onAdCompleted(0); // No reward for mandatory halftime ad
          toast({
            title: "Halftime Break Complete",
            description: "Continuing to second half...",
            variant: "default"
          });
        }
      } else if (result.state === 'SKIPPED') {
        onAdSkipped();
        toast({
          title: "Halftime Break Complete",
          description: "Continuing to second half...",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Halftime ad error:', error);
      // Improved error handling - still complete the halftime break
      onAdCompleted(0);
      toast({
        title: "Halftime Break Complete",
        description: "Ad unavailable - continuing to second half...",
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
          {/* Halftime Stats Display */}
          {halftimeStats && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="text-center">
                <h3 className="text-lg font-bold text-white mb-2">First Half Stats</h3>
                <div className="text-2xl font-bold text-blue-400">
                  {halftimeStats.homeScore} - {halftimeStats.awayScore}
                </div>
                <div className="text-sm text-gray-400">
                  {teamNames?.home || "Home"} vs {teamNames?.away || "Away"}
                </div>
              </div>
              
              {/* Team Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-semibold text-white mb-1">{teamNames?.home || "Home"}</div>
                  {halftimeStats.homeStats && (
                    <div className="space-y-1 text-gray-300">
                      <div>Possession: {halftimeStats.homeStats.possessionTime} min</div>
                      <div>Total Yards: {halftimeStats.homeStats.totalYards}</div>
                      <div>Turnovers: {halftimeStats.homeStats.turnovers}</div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-white mb-1">{teamNames?.away || "Away"}</div>
                  {halftimeStats.awayStats && (
                    <div className="space-y-1 text-gray-300">
                      <div>Possession: {halftimeStats.awayStats.possessionTime} min</div>
                      <div>Total Yards: {halftimeStats.awayStats.totalYards}</div>
                      <div>Turnovers: {halftimeStats.awayStats.turnovers}</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* MVP Display */}
              {halftimeStats.mvp && (
                <div className="pt-3 border-t border-gray-600">
                  <div className="text-center text-sm text-gray-400 mb-2">First Half MVP</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-blue-400">
                        {halftimeStats.mvp.homeMVP.playerName}
                      </div>
                      <div className="text-gray-300">
                        Score: {halftimeStats.mvp.homeMVP.score.toFixed(1)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-red-400">
                        {halftimeStats.mvp.awayMVP.playerName}
                      </div>
                      <div className="text-gray-300">
                        Score: {halftimeStats.mvp.awayMVP.score.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 text-blue-400">
              <Clock className="h-5 w-5" />
              <span className="font-semibold">Mandatory Halftime Break</span>
            </div>
            <p className="text-sm text-purple-200">
              Short break before second half begins
            </p>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={handleWatchAd}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading Ad...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Watch Halftime Break
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}