import React from 'react';
import { AdIntegration } from '@/components/AdIntegration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export function AdTest() {
  const { toast } = useToast();

  const handleAdWatched = (reward: number) => {
    toast({
      title: "Ad Reward Earned!",
      description: `You earned ${reward.toLocaleString()} credits!`,
      variant: "default"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Unity Ads Integration Test</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-6">
              This page tests the Unity Ads integration system. Click the button below to test ad functionality.
            </p>
            <div className="flex justify-center">
              <AdIntegration onAdWatched={handleAdWatched} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-100 rounded-lg">
                <h3 className="font-semibold mb-2">Unity Ads Web SDK</h3>
                <p className="text-sm text-muted-foreground">
                  Loaded from Unity CDN with test configuration
                </p>
              </div>
              <div className="p-4 bg-slate-100 rounded-lg">
                <h3 className="font-semibold mb-2">Fallback System</h3>
                <p className="text-sm text-muted-foreground">
                  Simulation mode available when Unity Ads unavailable
                </p>
              </div>
              <div className="p-4 bg-slate-100 rounded-lg">
                <h3 className="font-semibold mb-2">Reward System</h3>
                <p className="text-sm text-muted-foreground">
                  500-10,000 credits with weighted distribution
                </p>
              </div>
              <div className="p-4 bg-slate-100 rounded-lg">
                <h3 className="font-semibold mb-2">Daily Limits</h3>
                <p className="text-sm text-muted-foreground">
                  10 ads per day maximum for user experience
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}