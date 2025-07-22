import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Trophy, TrendingUp, Zap, Users, Target, Star, Award, Crown,
  Twitter, Facebook, Copy, CheckCircle, Share2, Filter, Calendar,
  Gamepad2, TrendingDown, DollarSign, UserPlus, Flame
} from 'lucide-react';

interface CareerHighlight {
  id: string;
  type: 'victory' | 'milestone' | 'management' | 'streak' | 'record';
  category: string;
  title: string;
  description: string;
  metric: string;
  value: string | number;
  context?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  shareText: string;
  timestamp: string;
  unlockedAt: string;
  isNew?: boolean;
}

interface CareerHighlightsProps {
  teamId?: string;
  maxHighlights?: number;
  showSocialProof?: boolean;
  variant?: 'full' | 'compact';
}

const CareerHighlights: React.FC<CareerHighlightsProps> = ({ 
  teamId, 
  maxHighlights = 5,
  showSocialProof = true,
  variant = 'full'
}) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'rarest' | 'filter'>('recent');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [copiedHighlight, setCopiedHighlight] = useState<string | null>(null);
  
  const { data: highlights, isLoading } = useQuery<CareerHighlight[]>({
    queryKey: ['/api/career-highlights', teamId, activeTab, selectedFilter],
    enabled: !!teamId,
    refetchInterval: 2 * 60 * 1000, // Update every 2 minutes
  });

  const getTypeIcon = (type: string, category?: string) => {
    switch (type) {
      case 'victory': return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 'milestone': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'management': return <Users className="w-4 h-4 text-green-500" />;
      case 'streak': return <Flame className="w-4 h-4 text-red-500" />;
      case 'record': return <Crown className="w-4 h-4 text-purple-500" />;
      default: return <Star className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'epic': return <Award className="w-4 h-4 text-purple-400" />;
      case 'rare': return <Star className="w-4 h-4 text-blue-400" />;
      default: return <Zap className="w-4 h-4 text-green-400" />;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'border-yellow-500 bg-yellow-500/20 text-yellow-300';
      case 'epic': return 'border-purple-500 bg-purple-500/20 text-purple-300';
      case 'rare': return 'border-blue-500 bg-blue-500/20 text-blue-300';
      default: return 'border-green-500 bg-green-500/20 text-green-300';
    }
  };

  const handleCopyToClipboard = (text: string, highlightId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHighlight(highlightId);
    setTimeout(() => setCopiedHighlight(null), 2000);
  };

  const handleSocialShare = (platform: string, text: string) => {
    const encodedText = encodeURIComponent(`${text} #RealmRivalry #Victory #FantasyTitle`);
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${window.location.origin}&quote=${encodedText}`,
      discord: 'https://discord.gg/RZssQk42', // Opens Discord server invite
    };
    
    if (urls[platform as keyof typeof urls]) {
      window.open(urls[platform as keyof typeof urls], '_blank', 'width=600,height=400');
    }
  };

  const handleDownloadCard = (highlight: CareerHighlight) => {
    // Future feature: Generate PNG achievement card
    console.log('Download achievement card for:', highlight.title);
  };

  const filterHighlights = (highlights: CareerHighlight[]) => {
    if (selectedFilter === 'all') return highlights;
    return highlights.filter(h => h.type === selectedFilter);
  };

  const sortHighlights = (highlights: CareerHighlight[]) => {
    if (activeTab === 'rarest') {
      const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };
      return [...highlights].sort((a, b) => {
        const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
        if (rarityDiff !== 0) return rarityDiff;
        return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
      });
    }
    return [...highlights].sort((a, b) => 
      new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
    );
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Career Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!highlights || highlights.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Career Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-sm mb-2">
              Your achievements will appear here when you accomplish something special!
            </p>
            <div className="text-xs text-gray-500">
              Win matches, reach milestones, and build your legacy
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const processedHighlights = sortHighlights(filterHighlights(highlights));
  const displayHighlights = variant === 'compact' 
    ? processedHighlights.slice(0, maxHighlights)
    : processedHighlights;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Career Highlights
            {showSocialProof && highlights.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {highlights.length} achievements
              </Badge>
            )}
          </div>
          {variant === 'full' && (
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              14-day rolling window
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {variant === 'full' && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-4">
            <TabsList className="grid w-full grid-cols-3 bg-gray-700">
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="rarest">Rarest</TabsTrigger>
              <TabsTrigger value="filter" className="flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Filter
              </TabsTrigger>
            </TabsList>
            <TabsContent value="filter" className="mt-3">
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger className="w-full bg-gray-700 border-gray-600">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="all">All Highlights</SelectItem>
                  <SelectItem value="victory">🏆 Victories</SelectItem>
                  <SelectItem value="milestone">📈 Milestones</SelectItem>
                  <SelectItem value="management">🧠 Management</SelectItem>
                  <SelectItem value="streak">🔥 Streaks</SelectItem>
                  <SelectItem value="record">🥇 Records</SelectItem>
                </SelectContent>
              </Select>
            </TabsContent>
          </Tabs>
        )}

        <div className="space-y-3">
          {displayHighlights.map((highlight) => (
            <div
              key={highlight.id}
              className={`relative p-4 rounded-lg border-2 ${getRarityColor(highlight.rarity)} transition-all hover:scale-[1.02]`}
            >
              {highlight.isNew && (
                <div className="absolute -top-1 -right-1">
                  <Badge className="bg-red-500 text-white text-xs px-1 py-0.5">
                    NEW
                  </Badge>
                </div>
              )}
              
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {getTypeIcon(highlight.type, highlight.category)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-white">{highlight.title}</h3>
                      {getRarityIcon(highlight.rarity)}
                    </div>
                    <p className="text-xs text-gray-300 mb-1">{highlight.description}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-blue-400 font-medium">
                        {highlight.metric}: {highlight.value}
                      </span>
                      {highlight.context && (
                        <span className="text-gray-400">{highlight.context}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <Badge variant="outline" className={`text-xs capitalize ${getRarityColor(highlight.rarity)} border-current`}>
                  {highlight.rarity}
                </Badge>
              </div>

              {/* Social Sharing Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-600">
                <span className="text-xs text-gray-400">
                  {new Date(highlight.unlockedAt).toLocaleDateString()}
                </span>
                
                <div className="flex items-center gap-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-2">
                        <Share2 className="w-3 h-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 border-gray-700">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Share2 className="w-4 h-4" />
                          Share Achievement
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-3 bg-gray-700 rounded-lg">
                          <p className="text-sm text-gray-200 mb-2">{highlight.shareText}</p>
                          <div className="text-xs text-blue-400">#RealmRivalry #Victory #FantasyTitle</div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSocialShare('twitter', highlight.shareText)}
                            className="flex items-center gap-2"
                          >
                            <Twitter className="w-4 h-4" />
                            Twitter
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSocialShare('facebook', highlight.shareText)}
                            className="flex items-center gap-2"
                          >
                            <Facebook className="w-4 h-4" />
                            Facebook
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSocialShare('discord', highlight.shareText)}
                            className="flex items-center gap-2"
                          >
                            <Users className="w-4 h-4" />
                            Discord
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadCard(highlight)}
                            className="flex items-center gap-2"
                          >
                            <Trophy className="w-4 h-4" />
                            Card
                          </Button>
                        </div>
                        
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCopyToClipboard(highlight.shareText, highlight.id)}
                          className="w-full flex items-center gap-2"
                        >
                          {copiedHighlight === highlight.id ? (
                            <><CheckCircle className="w-4 h-4 text-green-400" /> Copied!</>
                          ) : (
                            <><Copy className="w-4 h-4" /> Copy Text</>
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          ))}
        </div>

        {variant === 'compact' && highlights.length > maxHighlights && (
          <div className="text-center pt-3 border-t border-gray-600 mt-4">
            <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
              View All {highlights.length} Achievements
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CareerHighlights;