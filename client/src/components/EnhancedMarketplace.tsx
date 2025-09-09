import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Filter, 
  Clock, 
  Coins, 
  TrendingUp, 
  Users, 
  ShoppingCart,
  Eye,
  Hammer,
  Zap
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Player, Team, MarketplaceListing, MarketplaceBid } from '@shared/types/models';
import { 
  MarketplaceResponse,
  MarketplaceDashboardResponse 
} from '@/lib/api/apiTypes';
import { marketplaceQueryOptions } from '@/lib/api/queryOptions';

// MarketplaceListing interface removed - using imported type

interface FilterOptions {
  role?: string;
  race?: string;
  minAge?: number;
  maxAge?: number;
  minPower?: number;
  maxPower?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const ROLES = ['PASSER', 'RUNNER', 'BLOCKER'];
const RACES = ['HUMAN', 'SYLVAN', 'GRYLL', 'LUMINA', 'UMBRA'];

export default function EnhancedMarketplace() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  // Fetch marketplace listings with proper typing
  const { data: marketplaceData, isLoading, refetch } = useQuery(
    marketplaceQueryOptions.listings(currentPage, { ...filters, q: searchQuery })
  );

  // Fetch team dashboard with proper typing
  const { data: dashboardData } = useQuery(
    marketplaceQueryOptions.dashboard()
  );

  // Place bid mutation
  const placeBidMutation = useMutation({
    mutationFn: ({ listingId, bidAmount }: { listingId: number; bidAmount: number }) =>
      apiRequest(`/api/enhanced-marketplace/listings/${listingId}/bid`, 'POST', { bidAmount }),
    onSuccess: () => {
      toast({ title: 'Bid placed successfully!' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-marketplace/dashboard'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to place bid',
        description: error.message || 'Unknown error occurred',
        variant: 'destructive'
      });
    }
  });

  // Buy now mutation
  const buyNowMutation = useMutation({
    mutationFn: (listingId: number) =>
      apiRequest(`/api/enhanced-marketplace/listings/${listingId}/buy-now`, 'POST'),
    onSuccess: () => {
      toast({ title: 'Purchase successful!' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-marketplace/dashboard'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to purchase',
        description: error.message || 'Unknown error occurred',
        variant: 'destructive'
      });
    }
  });

  const formatTimeRemaining = (timeMs: number) => {
    if (timeMs <= 0) return 'Expired';
    
    const hours = Math.floor(timeMs / (1000 * 60 * 60));
    const minutes = Math.floor((timeMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getRaceBadgeColor = (race: string) => {
    const colors = {
      HUMAN: 'bg-gray-500',
      SYLVAN: 'bg-green-500',
      GRYLL: 'bg-yellow-600',
      LUMINA: 'bg-blue-500',
      UMBRA: 'bg-purple-500'
    };
    return colors[race as keyof typeof colors] || 'bg-gray-500';
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      PASSER: 'bg-blue-600',
      RUNNER: 'bg-orange-600',
      BLOCKER: 'bg-red-600'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-600';
  };

  const handleBidClick = (listingId: number) => {
    const listing = marketplaceData?.listings?.find((l: MarketplaceListing) => l.id === listingId);
    if (!listing) return;

    const currentBid = listing?.currentBid ? parseInt(String(listing.currentBid)) : parseInt(String((listing as any)?.startBid ?? 0));
    const minBid = currentBid + 100;
    const bidAmount = prompt(`Enter bid amount (minimum: ₡${minBid.toLocaleString()}):`);
    
    if (bidAmount && !isNaN(parseInt(bidAmount))) {
      placeBidMutation.mutate({ 
        listingId, 
        bidAmount: parseInt(bidAmount) 
      });
    }
  };

  const handleBuyNowClick = (listingId: number) => {
    const listing = marketplaceData?.listings?.find((l: MarketplaceListing) => l?.id === listingId);
    if (!listing || !((listing as any)?.buyNowPrice)) return;

    const confirmed = confirm(`Buy now for ₡${parseInt(String((listing as any)?.buyNowPrice ?? 0)).toLocaleString()}?`);
    if (confirmed) {
      buyNowMutation.mutate(listingId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/30 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Enhanced Player Marketplace
          </h1>
          <p className="text-purple-200">
            Advanced trading system with anti-sniping protection and escrow security
          </p>
        </div>

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-6">
            <TabsTrigger value="browse">Browse Players</TabsTrigger>
            <TabsTrigger value="dashboard">My Activity</TabsTrigger>
            <TabsTrigger value="create">List Player</TabsTrigger>
          </TabsList>

          {/* Browse Players Tab */}
          <TabsContent value="browse" className="space-y-6">
            
            {/* Search and Filter Bar */}
            <Card className="bg-gray-800/40 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search players..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="border-purple-500/50 text-purple-200 hover:bg-purple-500/10"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Select
                        value={filters.role || 'all'}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, role: value === 'all' ? undefined : value }))}
                      >
                        <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          {ROLES.map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={filters.race || 'all'}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, race: value === 'all' ? undefined : value }))}
                      >
                        <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                          <SelectValue placeholder="Race" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Races</SelectItem>
                          {RACES.map(race => (
                            <SelectItem key={race} value={race}>{race}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Min Power"
                        type="number"
                        value={filters.minPower || ''}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          minPower: e.target.value ? parseInt(e.target.value) : undefined 
                        }))}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                      />

                      <Input
                        placeholder="Max Price"
                        type="number"
                        value={filters.maxPrice || ''}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          maxPrice: e.target.value ? parseInt(e.target.value) : undefined 
                        }))}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Marketplace Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="bg-gray-800/40 border-purple-500/20 animate-pulse">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="h-6 bg-gray-700 rounded"></div>
                        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                        <div className="h-20 bg-gray-700 rounded"></div>
                        <div className="h-10 bg-gray-700 rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {marketplaceData?.listings?.map((listing: MarketplaceListing) => (
                  <Card key={listing?.id ?? 'unknown'} className="bg-gray-800/40 border-purple-500/20 hover:border-purple-400/40 transition-all duration-200">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-white text-lg">
                            {listing?.player?.firstName ?? 'Unknown'} {listing?.player?.lastName ?? 'Player'}
                          </CardTitle>
                          <p className="text-gray-400 text-sm">
                            Sold by {listing?.seller?.name ?? 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-yellow-400 font-bold">
                            OVR {Math.round(((listing?.player?.speed ?? 0) + (listing?.player?.power ?? 0) + (listing?.player?.throwing ?? 0) + (listing?.player?.catching ?? 0) + (listing?.player?.kicking ?? 0)) / 5)}
                          </div>
                          <div className="text-purple-400 text-sm">
                            {(listing?.player?.potentialRating ?? 0).toFixed(1)}★ potential
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-2">
                        <Badge className={`${getRoleBadgeColor(listing?.player?.role ?? 'PASSER')} text-white text-xs`}>
                          {listing?.player?.role ?? 'PASSER'}
                        </Badge>
                        <Badge className={`${getRaceBadgeColor(listing?.player?.race ?? 'HUMAN')} text-white text-xs`}>
                          {listing?.player?.race ?? 'HUMAN'}
                        </Badge>
                        <Badge variant="outline" className="border-gray-500 text-gray-300 text-xs">
                          Age {listing?.player?.age ?? 18}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Player Stats Preview  */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className="text-white font-medium">{listing?.player?.speed ?? 0}</div>
                          <div className="text-gray-400">SPD</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white font-medium">{listing?.player?.power ?? 0}</div>
                          <div className="text-gray-400">PWR</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white font-medium">{listing?.player?.agility ?? 0}</div>
                          <div className="text-gray-400">AGI</div>
                        </div>
                      </div>

                      <Separator className="bg-gray-600" />

                      {/* Bidding Information */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Current Bid:</span>
                          <span className="text-green-400 font-medium">
                            ₡{parseInt(String(listing.currentBid || (listing as any).startBid || 0)).toLocaleString()}
                          </span>
                        </div>
                        
                        {(listing as any)?.buyNowPrice && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Buy Now:</span>
                            <span className="text-yellow-400 font-medium">
                              ₡{parseInt(String((listing as any)?.buyNowPrice ?? 0)).toLocaleString()}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Time Left:</span>
                          <span className={`font-medium ${((listing as any).timeRemaining ?? 0) < 300000 ? 'text-red-400' : 'text-blue-400'}`}>
                            {formatTimeRemaining(((listing as any).timeRemaining ?? 0))}
                          </span>
                        </div>

                        {((listing as any).bidCount ?? 0) > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Bids:</span>
                            <span className="text-purple-400 font-medium">{((listing as any).bidCount ?? 0)}</span>
                          </div>
                        )}

                        {((listing as any)?.auctionExtensions ?? 0) > 0 && (
                          <div className="text-orange-400 text-xs text-center">
                            Extended {(listing as any)?.auctionExtensions ?? 0} time{((listing as any)?.auctionExtensions ?? 0) > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => handleBidClick(Number(listing?.id ?? 0))}
                          disabled={((listing as any).timeRemaining ?? 0) <= 0 || placeBidMutation.isPending}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Hammer className="w-4 h-4 mr-1" />
                          Bid
                        </Button>
                        
                        {(listing as any)?.buyNowPrice && (
                          <Button
                            onClick={() => handleBuyNowClick(Number(listing?.id ?? 0))}
                            disabled={((listing as any).timeRemaining ?? 0) <= 0 || buyNowMutation.isPending}
                            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                          >
                            <Zap className="w-4 h-4 mr-1" />
                            Buy Now
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {/* */}
            {marketplaceData?.pagination && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="border-purple-500/50 text-purple-200 hover:bg-purple-500/10"
                >
                  Previous
                </Button>
                
                <span className="text-white">
                  
                  Page {currentPage} of {marketplaceData.pagination.totalPages}
                </span>
                
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage >= marketplaceData.pagination.totalPages}
                  className="border-purple-500/50 text-purple-200 hover:bg-purple-500/10"
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>

          {/* My Activity Tab  */}
          <TabsContent value="dashboard" className="space-y-6">
            {(dashboardData as any) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* My Listings */}
                <Card className="bg-gray-800/40 border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      {/* */}
                      My Listings ({dashboardData.myListings.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    {(dashboardData?.myListings?.length ?? 0) === 0 ? (
                      <p className="text-gray-400 text-center py-8">No active listings</p>
                    ) : (
                      (dashboardData?.myListings ?? []).map((listing: any) => (
                        <div key={listing.id} className="bg-gray-700/30 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="text-white font-medium">
                                {listing?.player?.firstName ?? 'Unknown'} {listing?.player?.lastName ?? 'Player'}
                              </h4>
                              <p className="text-gray-400 text-sm">
                                {listing?.player?.role ?? 'Unknown'} • {listing?.player?.race ?? 'Unknown'}
                              </p>
                            </div>
                            <Badge className={(listing?.bidCount ?? 0) > 0 ? 'bg-green-600' : 'bg-gray-600'}>
                              {listing?.bidCount ?? 0} bid{(listing?.bidCount ?? 0) !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Current Bid:</span>
                              <span className="text-green-400">
                                ₡{parseInt(String(listing?.currentBid || listing?.startBid || 0)).toLocaleString()}
                              </span>
                            </div>
                            {listing?.buyNowPrice && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Buy Now:</span>
                                <span className="text-yellow-400">
                                  ₡{parseInt(String(listing?.buyNowPrice ?? 0)).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* My Bids  */}
                <Card className="bg-gray-800/40 border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Hammer className="w-5 h-5" />
                      {/* */}
                      My Active Bids ({dashboardData?.myBids?.length ?? 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    {(dashboardData?.myBids?.length ?? 0) === 0 ? (
                      <p className="text-gray-400 text-center py-8">No active bids</p>
                    ) : (
                      (dashboardData?.myBids ?? []).map((bid: any) => (
                        <div key={bid.id} className="bg-gray-700/30 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="text-white font-medium">
                                {bid?.listing?.player?.firstName ?? 'Unknown'} {bid?.listing?.player?.lastName ?? 'Player'}
                              </h4>
                              <p className="text-gray-400 text-sm">
                                {bid?.listing?.player?.role ?? 'Unknown'} • {bid?.listing?.player?.race ?? 'Unknown'}
                              </p>
                            </div>
                            <Badge className="bg-blue-600">
                              Leading
                            </Badge>
                          </div>
                          
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">My Bid:</span>
                              <span className="text-blue-400">
                                ₡{parseInt(String(bid?.bidAmount ?? 0)).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Escrowed:</span>
                              <span className="text-orange-400">
                                ₡{parseInt(String(bid?.escrowAmount ?? 0)).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Statistics  */}
                <Card className="bg-gray-800/40 border-purple-500/20 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Marketplace Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center">
                        {/* */}
                        <div className="text-2xl font-bold text-white">{dashboardData?.stats?.activeListings ?? 0}</div>
                        <div className="text-gray-400 text-sm">Total Listings</div>
                      </div>
                      <div className="text-center">
                        {/* */}
                        <div className="text-2xl font-bold text-white">{dashboardData?.stats?.activeBids ?? 0}</div>
                        <div className="text-gray-400 text-sm">Total Bids</div>
                      </div>
                      <div className="text-center">
                        {/* */}
                        <div className="text-2xl font-bold text-green-400">{dashboardData?.stats?.totalSales ?? 0}</div>
                        <div className="text-gray-400 text-sm">Players Sold</div>
                      </div>
                      <div className="text-center">
                        {/* */}
                        <div className="text-2xl font-bold text-blue-400">{dashboardData?.stats?.totalPurchases ?? 0}</div>
                        <div className="text-gray-400 text-sm">Players Bought</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-400">
                          
                          ₡0 {/* escrowAmount not available in current type */}
                        </div>
                        <div className="text-gray-400 text-sm">In Escrow</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Create Listing Tab  */}
          <TabsContent value="create" className="space-y-6">
            <Card className="bg-gray-800/40 border-purple-500/20 max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-white text-center">
                  Create New Listing
                </CardTitle>
                <p className="text-gray-400 text-center">
                  List your player on the marketplace with advanced auction features
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">
                    Listing creation UI coming soon!
                  </p>
                  <p className="text-sm text-gray-500">
                    Features: Player selection wizard, CAR-based pricing, duration controls, escrow preview
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}