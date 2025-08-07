import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Share2, Trophy, TrendingUp, Zap, Users, Target,
  Twitter, Facebook, Copy, CheckCircle
} from 'lucide-react';

interface ShareableMoment {
  id: string;
  type: 'victory' | 'milestone' | 'achievement' | 'streak' | 'record';
  title: string;
  description: string;
  metric: string;
  value: string | number;
  context?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  shareText: string;
  timestamp: string;
}

interface ShareableMomentsProps {
  teamId?: string;
  maxMoments?: number;
  showSocialProof?: boolean;
}

const ShareableMoments: React.FC<ShareableMomentsProps> = ({ 
  teamId, 
  maxMoments = 3,
  showSocialProof = true 
}) => {
  const [copiedMoment, setCopiedMoment] = useState<string | null>(null);
  
  const { data: moments, isLoading } = useQuery<ShareableMoment[]>({
    queryKey: ['/api/shareable-moments', teamId],
    enabled: !!teamId,
    refetchInterval: 5 * 60 * 1000, // Update every 5 minutes
  });

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return <Trophy className="w-4 h-4 text-yellow-400" />;
      case 'epic': return <Target className="w-4 h-4 text-purple-400" />;
      case 'rare': return <TrendingUp className="w-4 h-4 text-blue-400" />;
      default: return <Zap className="w-4 h-4 text-green-400" />;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'border-yellow-600 bg-yellow-600/10';
      case 'epic': return 'border-purple-600 bg-purple-600/10';
      case 'rare': return 'border-blue-600 bg-blue-600/10';
      default: return 'border-green-600 bg-green-600/10';
    }
  };

  const handleCopyToClipboard = (text: string, momentId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMoment(momentId);
    setTimeout(() => setCopiedMoment(null), 2000);
  };

  const handleSocialShare = (platform: string, text: string) => {
    const encodedText = encodeURIComponent(text);
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${window.location.origin}&quote=${encodedText}`,
    };
    
    if (urls[platform as keyof typeof urls]) {
      window.open(urls[platform as keyof typeof urls], '_blank', 'width=600,height=400');
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-orange-400" />
            Shareable Moments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!moments || moments.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 w-5 text-orange-400" />
            Shareable Moments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm">
            Your best moments will appear here when you achieve something special!
          </p>
        </CardContent>
      </Card>
    );
  }

  const topMoments = moments.slice(0, maxMoments);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-orange-400" />
          Shareable Moments
          {showSocialProof && moments.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {moments.length} moments
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topMoments.map((moment) => (
          <div 
            key={moment.id} 
            className={`p-3 rounded-lg border transition-all ${getRarityColor(moment.rarity)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getRarityIcon(moment.rarity)}
                <h4 className="font-semibold text-sm">{moment.title}</h4>
                <Badge variant="outline" className="text-xs capitalize">
                  {moment.rarity}
                </Badge>
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="p-1 h-auto">
                    <Share2 className="w-3 h-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      {getRarityIcon(moment.rarity)}
                      Share Your Achievement
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg border ${getRarityColor(moment.rarity)}`}>
                      <h3 className="font-bold mb-1">{moment.title}</h3>
                      <p className="text-sm text-gray-400 mb-2">{moment.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{moment.value}</span>
                        <span className="text-sm text-gray-400">{moment.metric}</span>
                      </div>
                      {moment.context && (
                        <p className="text-xs text-gray-500 mt-1">{moment.context}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Share text:</p>
                      <div className="p-3 bg-gray-700 rounded text-sm">
                        {moment.shareText}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSocialShare('twitter', moment.shareText)}
                        className="flex-1"
                      >
                        <Twitter className="w-4 h-4 mr-1" />
                        Twitter
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSocialShare('facebook', moment.shareText)}
                        className="flex-1"
                      >
                        <Facebook className="w-4 h-4 mr-1" />
                        Facebook
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyToClipboard(moment.shareText, moment.id)}
                        className="flex-1"
                      >
                        {copiedMoment === moment.id ? (
                          <CheckCircle className="w-4 h-4 mr-1 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 mr-1" />
                        )}
                        {copiedMoment === moment.id ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <p className="text-xs text-gray-400 mb-1">{moment.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold">{moment.value}</span>
                <span className="text-xs text-gray-400">{moment.metric}</span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(moment.timestamp).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
        
        {moments.length > maxMoments && (
          <Button variant="ghost" size="sm" className="w-full text-gray-400">
            View all {moments.length} moments
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ShareableMoments;