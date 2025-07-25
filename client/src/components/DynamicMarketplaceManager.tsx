import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Gavel, 
  TrendingUp, 
  Users, 
  Clock, 
  DollarSign, 
  Star, 
  AlertCircle,
  ShoppingCart,
  Eye,
  Zap,
  Plus,
  Tag
} from 'lucide-react';
import UnifiedPlayerCard from '@/components/UnifiedPlayerCard';
import PlayerDetailModal from '@/components/PlayerDetailModal';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  race: string;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  teamId: string;
}

interface MarketplaceListing {
  id: string;
  playerId: string;
  teamId: string;
  startingBid: number;
  buyNowPrice: number;
  currentBid: number;
  currentBidderId: string | null;
  expiresAt: string;
  status: 'active' | 'completed' | 'expired';
  player: Player;
  bids: MarketplaceBid[];
  timeRemaining?: string;
}

interface MarketplaceBid {
  id: string;
  listingId: string;
  bidderId: string;
  amount: number;
  createdAt: string;
  bidderTeamName?: string;
}

interface MarketplaceStats {
  totalActiveListings: number;
  totalBidsPlaced: number;
  averageCurrentBid: number;
  highestBid: number;
  myActiveListings: number;
  myActiveBids: number;
}

const getPlayerPower = (player: Player): number => {
  // CAR = Core Athleticism Rating: Average(Speed, Power, Agility, Throwing, Catching, Kicking)
  return Math.round((player.speed + player.power + player.agility + player.throwing + player.catching + player.kicking) / 6);
};

const formatTimeRemaining = (expiresAt: string): string => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const getRoleColor = (position: string): string => {
  switch (position.toLowerCase()) {
    case 'passer': return 'text-blue-600 bg-blue-50';
    case 'runner': return 'text-green-600 bg-green-50';
    case 'blocker': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

export default function DynamicMarketplaceManager({ teamId }: { teamId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<string>('');
  
  // Player listing form state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [startBid, setStartBid] = useState<string>('');
  const [durationHours, setDurationHours] = useState<string>('24');
  const [buyNowPrice, setBuyNowPrice] = useState<string>('');
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<Player | null>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);

  // Auto-fill buy-now price when player is selected
  const handlePlayerSelection = (playerId: string) => {
    setSelectedPlayerId(playerId);
    if (playerId && teamPlayers) {
      const selectedPlayer = teamPlayers.find((p: Player) => p.id === playerId);
      if (selectedPlayer) {
        // Calculate CAR exactly like backend: average of 6 stats
        const car = (selectedPlayer.speed + selectedPlayer.power + selectedPlayer.agility + 
                    selectedPlayer.throwing + selectedPlayer.catching + selectedPlayer.kicking) / 6;
        // Use potentialRating (frontend) or overallPotentialStars (backend) - try both
        const potential = selectedPlayer.overallPotentialStars || selectedPlayer.potentialRating || 0;
        const calculatedBuyNow = Math.floor((car * 1000) + (potential * 2000));
        setBuyNowPrice(calculatedBuyNow.toString());
      }
    } else {
      setBuyNowPrice('');
    }
  };

  // Fetch marketplace stats
  const { data: stats, isLoading: loadingStats } = useQuery<MarketplaceStats>({
    queryKey: ['/api/dynamic-marketplace/stats'],
    refetchInterval: 3 * 60 * 1000, // Refresh every 3 minutes instead of 30 seconds
    staleTime: 60 * 1000 // Consider data fresh for 1 minute
  });

  // Fetch active listings
  const { data: listings, isLoading: loadingListings } = useQuery<{ listings: MarketplaceListing[] }>({
    queryKey: ['/api/dynamic-marketplace/listings'],
    refetchInterval: 10000 // Refresh every 10 seconds for live bidding
  });

  // Fetch user's listings
  const { data: myListings } = useQuery<{ listings: MarketplaceListing[] }>({
    queryKey: ['/api/dynamic-marketplace/my-listings', teamId],
    enabled: !!teamId
  });

  // Fetch user's bids
  const { data: myBids } = useQuery<{ bids: MarketplaceBid[] }>({
    queryKey: ['/api/dynamic-marketplace/my-bids', teamId],
    enabled: !!teamId
  });

  // Fetch team players for listing
  const { data: teamPlayers } = useQuery<Player[]>({
    queryKey: ['/api/teams/' + teamId + '/players'],
    enabled: !!teamId
  });

  // Place bid mutation
  const placeBidMutation = useMutation({
    mutationFn: (data: { listingId: string; amount: number }) =>
      apiRequest(`/api/dynamic-marketplace/bid/${data.listingId}`, 'POST', { amount: data.amount }),
    onSuccess: () => {
      toast({
        title: 'Bid Placed Successfully',
        description: 'Your bid has been placed and credits are held in escrow.'
      });
      setBidAmount('');
      queryClient.invalidateQueries({ queryKey: ['/api/dynamic-marketplace'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Bid Failed',
        description: error.message || 'Failed to place bid',
        variant: 'destructive'
      });
    }
  });

  // Buy now mutation
  const buyNowMutation = useMutation({
    mutationFn: (listingId: string) =>
      apiRequest(`/api/dynamic-marketplace/buy-now/${listingId}`, 'POST'),
    onSuccess: () => {
      toast({
        title: 'Purchase Successful',
        description: 'Player acquired! Check your roster.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dynamic-marketplace'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Purchase Failed',
        description: error.message || 'Failed to complete purchase',
        variant: 'destructive'
      });
    }
  });

  // List player mutation
  const listPlayerMutation = useMutation({
    mutationFn: (data: { playerId: string; startBid: number; durationHours: number; buyNowPrice?: number }) =>
      apiRequest('/api/dynamic-marketplace/list-player', 'POST', data),
    onSuccess: () => {
      toast({
        title: 'Player Listed Successfully',
        description: 'Your player has been listed on the marketplace!'
      });
      // Clear form
      setSelectedPlayerId('');
      setStartBid('');
      setDurationHours('24');
      setBuyNowPrice('');
      queryClient.invalidateQueries({ queryKey: ['/api/dynamic-marketplace'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Listing Failed',
        description: error.message || 'Failed to list player',
        variant: 'destructive'
      });
    }
  });

  const selectedListingData = listings?.listings?.find((l: MarketplaceListing) => l.id === selectedListing);

  const getMinimumBid = (listing: MarketplaceListing): number => {
    return listing.currentBid > 0 ? listing.currentBid + 100 : listing.startingBid;
  };

  if (loadingStats || loadingListings) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-right">
          <div className="text-sm text-gray-500">Active Listings</div>
          <div className="text-2xl font-bold">{stats?.totalActiveListings || 0}</div>
        </div>
      </div>

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="browse">Browse Auctions</TabsTrigger>
          <TabsTrigger value="list-player">List Player</TabsTrigger>
          <TabsTrigger value="my-listings">My Listings</TabsTrigger>
          <TabsTrigger value="my-bids">My Bids</TabsTrigger>
          <TabsTrigger value="analytics">Market Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Auctions</CardTitle>
                <Gavel className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalActiveListings || 0}</div>
                <p className="text-xs text-muted-foreground">Players available</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalBidsPlaced || 0}</div>
                <p className="text-xs text-muted-foreground">Across all auctions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Bid</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₡{stats?.averageCurrentBid?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">Current market rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Highest Bid</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₡{stats?.highestBid?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">Top auction value</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Available Players</CardTitle>
                <CardDescription>Click on a player to view details and place bids</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {listings?.listings?.map((listing: MarketplaceListing) => (
                    <Card 
                      key={listing.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedListing === listing.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedListing(listing.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-lg font-bold">
                                  {getPlayerPower(listing.player)}
                                </span>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium">
                                {listing.player.firstName} {listing.player.lastName}
                              </h4>
                              <div className="flex items-center space-x-2">
                                <Badge className={getRoleColor(listing.player.position)}>
                                  {listing.player.position}
                                </Badge>
                                <span className="text-sm text-gray-600">{listing.player.race}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {formatTimeRemaining(listing.expiresAt)}
                              </span>
                            </div>
                            <div className="font-bold text-lg">
                              ₡{listing.currentBid > 0 ? listing.currentBid.toLocaleString() : listing.startingBid.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {listing.bids?.length || 0} bid{(listing.bids?.length || 0) !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!listings?.listings || listings.listings.length === 0) && (
                    <div className="text-center py-8">
                      <Gavel className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Auctions</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        There are currently no players available for auction.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedListingData ? 'Auction Details' : 'Select Auction'}
                </CardTitle>
                <CardDescription>
                  {selectedListingData ? 'Place bids or buy instantly' : 'Choose a player to view details'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedListingData ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl font-bold">
                          {getPlayerPower(selectedListingData.player)}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg">
                        {selectedListingData.player.firstName} {selectedListingData.player.lastName}
                      </h3>
                      <div className="flex items-center justify-center space-x-2 mt-1">
                        <Badge className={getRoleColor(selectedListingData.player.position)}>
                          {selectedListingData.player.position}
                        </Badge>
                        <span className="text-sm text-gray-600">{selectedListingData.player.race}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2 text-center">
                      <div>
                        <div className="text-xs text-gray-500">SPD</div>
                        <div className="font-medium">{selectedListingData.player.speed}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">PWR</div>
                        <div className="font-medium">{selectedListingData.player.power}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">THR</div>
                        <div className="font-medium">{selectedListingData.player.throwing}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">CAT</div>
                        <div className="font-medium">{selectedListingData.player.catching}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">KCK</div>
                        <div className="font-medium">{selectedListingData.player.kicking}</div>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Starting Bid:</span>
                        <span className="font-medium">₡{selectedListingData.startingBid.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Current Bid:</span>
                        <span className="font-bold text-lg">
                          ₡{(selectedListingData.currentBid || selectedListingData.startingBid).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Buy Now:</span>
                        <span className="font-medium text-green-600">
                          ₡{selectedListingData.buyNowPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Time Left:</span>
                        <span className="font-medium text-red-600">
                          {formatTimeRemaining(selectedListingData.expiresAt)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="bidAmount">Place Bid (Min: ₡{getMinimumBid(selectedListingData).toLocaleString()})</Label>
                        <Input
                          id="bidAmount"
                          type="number"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          placeholder={getMinimumBid(selectedListingData).toString()}
                          className="mt-1"
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => {
                          const amount = parseInt(bidAmount);
                          if (amount >= getMinimumBid(selectedListingData)) {
                            placeBidMutation.mutate({ listingId: selectedListingData.id, amount });
                          }
                        }}
                        disabled={!bidAmount || parseInt(bidAmount) < getMinimumBid(selectedListingData) || placeBidMutation.isPending}
                      >
                        <Gavel className="w-4 h-4 mr-2" />
                        Place Bid
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => buyNowMutation.mutate(selectedListingData.id)}
                        disabled={buyNowMutation.isPending}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Buy Now - ₡{selectedListingData.buyNowPrice.toLocaleString()}
                      </Button>
                    </div>

                    {selectedListingData.bids && selectedListingData.bids.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">Bid History</h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {selectedListingData.bids.slice(0, 5).map((bid: MarketplaceBid) => (
                            <div key={bid.id} className="flex justify-between text-sm">
                              <span className="text-gray-600">{bid.bidderTeamName || 'Anonymous'}</span>
                              <span className="font-medium">₡{bid.amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Eye className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Select an Auction</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Choose a player auction to view details and place bids.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="list-player" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                List Player for Auction
              </CardTitle>
              <CardDescription>
                Create a new marketplace listing for one of your players
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="player-select">Select Player</Label>
                    <Select value={selectedPlayerId} onValueChange={handlePlayerSelection}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose a player to list..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teamPlayers
                          ?.sort((a: Player, b: Player) => Number(a.id) - Number(b.id)) // Sort by ID to maintain consistent ordering
                          ?.slice(0, 12) // Only show main roster players (first 12), exclude taxi squad
                          ?.map((player: Player) => (
                            <SelectItem key={player.id} value={player.id}>
                              {player.firstName} {player.lastName} ({player.role}, {player.race})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="start-bid">Starting Bid (₡)</Label>
                    <Input
                      id="start-bid"
                      type="number"
                      value={startBid}
                      onChange={(e) => setStartBid(e.target.value)}
                      placeholder="Minimum 100 credits"
                      className="mt-1"
                      min="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum starting bid is 100 credits. A 2% listing fee will be charged.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="duration">Auction Duration</Label>
                    <Select value={durationHours} onValueChange={setDurationHours}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="72">3 days</SelectItem>
                        <SelectItem value="168">7 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="buy-now">Buy Now Price (₡) - Optional</Label>
                    <Input
                      id="buy-now"
                      type="number"
                      value={buyNowPrice}
                      onChange={(e) => setBuyNowPrice(e.target.value)}
                      placeholder="Optional instant purchase price"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Allow instant purchase at this price. Leave empty for auction-only.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedPlayerId && teamPlayers && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Player Preview</h3>
                      {(() => {
                        const selectedPlayer = teamPlayers.find((p: any) => p.id === selectedPlayerId);
                        if (!selectedPlayer) return null;
                        
                        return (
                          <div 
                            className="cursor-pointer" 
                            onClick={() => {
                              setSelectedPlayerForModal(selectedPlayer);
                              setIsPlayerModalOpen(true);
                            }}
                          >
                            <UnifiedPlayerCard 
                              player={selectedPlayer}
                              showDetailedStats={true}
                              showActions={false}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Marketplace Rules</h4>
                        <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                          <li>• Must maintain minimum 10 players on roster</li>
                          <li>• Maximum 3 active listings per team</li>
                          <li>• 2% listing fee charged on starting bid</li>
                          <li>• Anti-sniping: 30-second extensions when bid placed in final 30 seconds</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Button 
                  className="w-full md:w-auto"
                  onClick={() => {
                    if (!selectedPlayerId || !startBid || !durationHours) {
                      toast({
                        title: 'Missing Information',
                        description: 'Please select a player and enter starting bid',
                        variant: 'destructive'
                      });
                      return;
                    }

                    const data = {
                      playerId: selectedPlayerId,
                      startBid: parseInt(startBid),
                      durationHours: parseInt(durationHours),
                      ...(buyNowPrice && { buyNowPrice: parseInt(buyNowPrice) })
                    };

                    listPlayerMutation.mutate(data);
                  }}
                  disabled={!selectedPlayerId || !startBid || listPlayerMutation.isPending}
                >
                  <Tag className="w-4 h-4 mr-2" />
                  {listPlayerMutation.isPending ? 'Listing Player...' : 'List Player for Auction'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-listings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Player Listings</CardTitle>
              <CardDescription>Players you have listed for auction</CardDescription>
            </CardHeader>
            <CardContent>
              {myListings && myListings.length > 0 ? (
                <div className="space-y-3">
                  {myListings.map((listing: MarketplaceListing) => (
                    <Card key={listing.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-lg font-bold">
                                {getPlayerPower(listing.player)}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-medium">
                                {listing.player.firstName} {listing.player.lastName}
                              </h4>
                              <Badge className={getRoleColor(listing.player.position)}>
                                {listing.player.position}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              ₡{(listing.currentBid || listing.startingBid).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">
                              {listing.bids?.length || 0} bid{(listing.bids?.length || 0) !== 1 ? 's' : ''}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatTimeRemaining(listing.expiresAt)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Gavel className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Listings</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You haven't listed any players for auction yet. Go to the "List Player" tab to create your first listing.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-bids" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Active Bids</CardTitle>
              <CardDescription>Players you have bid on</CardDescription>
            </CardHeader>
            <CardContent>
              {myBids && myBids.length > 0 ? (
                <div className="space-y-3">
                  {myBids.map((bid: any) => (
                    <Card key={bid.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-lg font-bold">
                                {getPlayerPower(bid.listing.player)}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-medium">
                                {bid.listing.player.firstName} {bid.listing.player.lastName}
                              </h4>
                              <Badge className={getRoleColor(bid.listing.player.position)}>
                                {bid.listing.player.position}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">My Bid: ₡{bid.amount.toLocaleString()}</div>
                            <div className="text-sm text-gray-600">
                              Current: ₡{bid.listing.currentBid.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatTimeRemaining(bid.listing.expiresAt)}
                            </div>
                            {bid.amount === bid.listing.currentBid && (
                              <Badge className="bg-green-500 text-white">Winning</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Bids</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You haven't placed any bids yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Market Activity</CardTitle>
                <CardDescription>Your marketplace participation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Your Active Listings:</span>
                    <span className="font-medium">{stats?.myActiveListings || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Your Active Bids:</span>
                    <span className="font-medium">{stats?.myActiveBids || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Market Activity:</span>
                    <span className="font-medium">{stats?.totalBidsPlaced || 0} bids</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Market Insights</CardTitle>
                <CardDescription>Pricing and competition analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Average Current Bid:</span>
                    <span className="font-medium">₡{stats?.averageCurrentBid?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Highest Active Bid:</span>
                    <span className="font-medium">₡{stats?.highestBid?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Market Competition:</span>
                    <span className="font-medium">
                      {stats?.totalActiveListings ? Math.round(stats.totalBidsPlaced / stats.totalActiveListings * 100) / 100 : 0} bids/listing
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Marketplace Features</CardTitle>
              <CardDescription>Advanced auction system capabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <h5 className="font-medium text-sm">Anti-Sniping Protection</h5>
                  </div>
                  <p className="text-xs text-gray-600">
                    Auctions automatically extend by 5 minutes when bids are placed in the final moments
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <ShieldIcon className="w-4 h-4 text-blue-500" />
                    <h5 className="font-medium text-sm">Escrow System</h5>
                  </div>
                  <p className="text-xs text-gray-600">
                    Bid amounts are securely held in escrow until auction completion
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <h5 className="font-medium text-sm">Market Tax</h5>
                  </div>
                  <p className="text-xs text-gray-600">
                    5% market tax on successful sales helps regulate the economy
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <h5 className="font-medium text-sm">Listing Restrictions</h5>
                  </div>
                  <p className="text-xs text-gray-600">
                    Maximum 3 listings per team, minimum 10 players must remain on roster
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Player Detail Modal */}
      {selectedPlayerForModal && (
        <PlayerDetailModal
          player={selectedPlayerForModal}
          isOpen={isPlayerModalOpen}
          onClose={() => {
            setIsPlayerModalOpen(false);
            setSelectedPlayerForModal(null);
          }}
        />
      )}
    </div>
  );
}

function ShieldIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-8 10.5-4.5-3-8-5.5-8-10.5C4 8 7 4 12 4s8 4 8 9Z" />
    </svg>
  );
}