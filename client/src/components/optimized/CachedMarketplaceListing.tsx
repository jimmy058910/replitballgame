/**
 * Cached Marketplace Listing Component
 * Optimized for large lists with React.memo
 */
import React, { memo } from 'react';
import { UnifiedPlayerCard } from '@/components/UnifiedPlayerCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Coins, Clock, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MarketplaceListing {
  id: number;
  player: any;
  startingBid: number;
  currentBid: number;
  buyNowPrice: number;
  endsAt: string;
  bids: any[];
  createdAt: string;
  seller: {
    id: number;
    name: string;
  };
}

interface CachedMarketplaceListingProps {
  listing: MarketplaceListing;
  onBidClick: (listing: MarketplaceListing) => void;
  onBuyNowClick: (listing: MarketplaceListing) => void;
  onPlayerClick: (player: any) => void;
  currentUserId?: number;
}

const CachedMarketplaceListing: React.FC<CachedMarketplaceListingProps> = memo(({
  listing,
  onBidClick,
  onBuyNowClick,
  onPlayerClick,
  currentUserId,
}) => {
  const timeLeft = formatDistanceToNow(new Date(listing.endsAt), { addSuffix: true });
  const isOwner = listing.seller.id === currentUserId;
  const hasBids = listing.bids.length > 0;

  return (
    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{listing.player.firstName} {listing.player.lastName}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {listing.player.race.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Users className="h-4 w-4" />
          <span>{listing.seller.name}</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Player Card */}
        <div className="cursor-pointer" onClick={() => onPlayerClick(listing.player)}>
          <UnifiedPlayerCard
            player={listing.player}
            variant="marketplace"
            onClick={() => onPlayerClick(listing.player)}
          />
        </div>

        {/* Bidding Information */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Current Bid</span>
            <div className="flex items-center gap-1 text-lg font-semibold">
              <Coins className="h-4 w-4 text-yellow-400" />
              <span>{listing.currentBid.toLocaleString()}₡</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Buy Now</span>
            <div className="flex items-center gap-1 text-sm">
              <Coins className="h-4 w-4 text-green-400" />
              <span>{listing.buyNowPrice.toLocaleString()}₡</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Time Left</span>
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-4 w-4 text-blue-400" />
              <span>{timeLeft}</span>
            </div>
          </div>

          {hasBids && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Bids</span>
              <Badge variant="secondary" className="text-xs">
                {listing.bids.length} bid{listing.bids.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!isOwner && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBidClick(listing)}
              className="flex-1"
            >
              Place Bid
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => onBuyNowClick(listing)}
              className="flex-1"
            >
              Buy Now
            </Button>
          </div>
        )}

        {isOwner && (
          <div className="pt-2">
            <Badge variant="secondary" className="w-full justify-center">
              Your Listing
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

CachedMarketplaceListing.displayName = 'CachedMarketplaceListing';

export default CachedMarketplaceListing;