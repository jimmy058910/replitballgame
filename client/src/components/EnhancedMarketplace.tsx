import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, Gavel, Zap, Star, TrendingUp, Eye, Timer, Users, Target, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AuctionPlayer {
  id: string;
  name: string;
  race: string;
  age: number;
  leadership: number;
  throwing: number;
  speed: number;
  agility: number;
  power: number;
  stamina: number;
  abilities: string[];
  marketValue: number;
  auction: {
    id: string;
    startingPrice: number;
    currentBid: number;
    buyoutPrice?: number;
    reservePrice?: number;
    endTime: string;
    bidsCount: number;
    auctionType: string;
    timeRemaining?: number;
  };
}

export default function EnhancedMarketplace() {
  const [selectedAuction, setSelectedAuction] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [autoBidMax, setAutoBidMax] = useState<number>(0);
  const [sortBy, setSortBy] = useState("ending_soon");
  const [filterBy, setFilterBy] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active auctions
  const { data: auctions, isLoading } = useQuery({
    queryKey: ["/api/auctions/active"],
    refetchInterval: 5000, // Real-time updates
  });

  // Fetch user team data
  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  // Create auction mutation
  const createAuctionMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("/api/auctions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({
        title: "Auction Created",
        description: "Your player has been listed for auction",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auctions/active"] });
    },
  });

  // Place bid mutation
  const placeBidMutation = useMutation({
    mutationFn: async ({ auctionId, amount, type }: any) => 
      apiRequest(`/api/auctions/${auctionId}/bid`, {
        method: "POST",
        body: JSON.stringify({ bidAmount: amount, bidType: type }),
      }),
    onSuccess: () => {
      toast({
        title: "Bid Placed",
        description: "Your bid has been submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auctions/active"] });
      setBidAmount(0);
      setSelectedAuction(null);
    },
  });

  // Buyout mutation
  const buyoutMutation = useMutation({
    mutationFn: async (auctionId: string) => 
      apiRequest(`/api/auctions/${auctionId}/buyout`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast({
        title: "Player Acquired",
        description: "Player successfully purchased via buyout",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auctions/active"] });
    },
  });

  const formatTimeRemaining = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "Ended";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getTimeProgress = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000); // Assuming 24h auctions
    
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const getUrgencyColor = (endTime: string) => {
    const remaining = new Date(endTime).getTime() - new Date().getTime();
    const hours = remaining / (1000 * 60 * 60);
    
    if (hours < 1) return "text-red-500";
    if (hours < 6) return "text-yellow-500";
    return "text-green-500";
  };

  const sortedAuctions = auctions?.sort((a: AuctionPlayer, b: AuctionPlayer) => {
    switch (sortBy) {
      case "ending_soon":
        return new Date(a.auction.endTime).getTime() - new Date(b.auction.endTime).getTime();
      case "highest_bid":
        return b.auction.currentBid - a.auction.currentBid;
      case "lowest_bid":
        return a.auction.currentBid - b.auction.currentBid;
      case "most_popular":
        return b.auction.bidsCount - a.auction.bidsCount;
      default:
        return 0;
    }
  }) || [];

  const filteredAuctions = sortedAuctions.filter((auction: AuctionPlayer) => {
    if (filterBy === "all") return true;
    if (filterBy === "buyout") return auction.auction.buyoutPrice;
    if (filterBy === "no_reserve") return !auction.auction.reservePrice;
    if (filterBy === "ending_soon") {
      const hours = (new Date(auction.auction.endTime).getTime() - new Date().getTime()) / (1000 * 60 * 60);
      return hours < 2;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Active Auctions</p>
                <p className="text-2xl font-bold">{auctions?.length || 0}</p>
              </div>
              <Gavel className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Ending Soon</p>
                <p className="text-2xl font-bold">
                  {filteredAuctions.filter((a: AuctionPlayer) => {
                    const hours = (new Date(a.auction.endTime).getTime() - new Date().getTime()) / (1000 * 60 * 60);
                    return hours < 2;
                  }).length}
                </p>
              </div>
              <Timer className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Buyout Available</p>
                <p className="text-2xl font-bold">
                  {filteredAuctions.filter((a: AuctionPlayer) => a.auction.buyoutPrice).length}
                </p>
              </div>
              <Zap className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Your Credits</p>
                <p className="text-2xl font-bold">{team?.credits?.toLocaleString() || 0}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Sorting */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div>
                <Label htmlFor="sort">Sort by</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ending_soon">Ending Soon</SelectItem>
                    <SelectItem value="highest_bid">Highest Bid</SelectItem>
                    <SelectItem value="lowest_bid">Lowest Bid</SelectItem>
                    <SelectItem value="most_popular">Most Popular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="filter">Filter</Label>
                <Select value={filterBy} onValueChange={setFilterBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Auctions</SelectItem>
                    <SelectItem value="buyout">Buyout Available</SelectItem>
                    <SelectItem value="no_reserve">No Reserve</SelectItem>
                    <SelectItem value="ending_soon">Ending Soon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">{filteredAuctions.length} players available</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auction Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredAuctions.map((player: AuctionPlayer) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{player.name}</CardTitle>
                      <p className="text-sm text-gray-600">{player.race} • Age {player.age}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge variant={player.auction.auctionType === "buyout" ? "secondary" : "default"}>
                        {player.auction.auctionType === "buyout" ? "Buyout" : "Auction"}
                      </Badge>
                      {player.auction.reservePrice && (
                        <Badge variant="outline" className="text-xs">
                          Reserve
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Player Stats */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Speed:</span>
                      <span className="font-semibold">{player.speed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Power:</span>
                      <span className="font-semibold">{player.power}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Throwing:</span>
                      <span className="font-semibold">{player.throwing}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Agility:</span>
                      <span className="font-semibold">{player.agility}</span>
                    </div>
                  </div>

                  {/* Abilities */}
                  {player.abilities && player.abilities.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Abilities</p>
                      <div className="flex flex-wrap gap-1">
                        {player.abilities.slice(0, 2).map((ability, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {ability}
                          </Badge>
                        ))}
                        {player.abilities.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{player.abilities.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Auction Info */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Current Bid:</span>
                      <span className="font-bold text-green-600">
                        {player.auction.currentBid.toLocaleString()} credits
                      </span>
                    </div>

                    {player.auction.buyoutPrice && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Buyout:</span>
                        <span className="font-bold text-blue-600">
                          {player.auction.buyoutPrice.toLocaleString()} credits
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Bids:</span>
                      <span className="text-sm font-semibold">{player.auction.bidsCount}</span>
                    </div>

                    {/* Time Remaining */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Time Left:</span>
                        <span className={`text-sm font-semibold ${getUrgencyColor(player.auction.endTime)}`}>
                          {formatTimeRemaining(player.auction.endTime)}
                        </span>
                      </div>
                      <Progress 
                        value={getTimeProgress(player.auction.endTime)} 
                        className="h-2"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => setSelectedAuction(player.auction.id)}
                        >
                          <Gavel className="h-4 w-4 mr-2" />
                          Bid
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Place Bid - {player.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="bidAmount">Bid Amount</Label>
                            <Input
                              id="bidAmount"
                              type="number"
                              value={bidAmount}
                              onChange={(e) => setBidAmount(Number(e.target.value))}
                              min={player.auction.currentBid + 1000}
                              placeholder={`Min: ${(player.auction.currentBid + 1000).toLocaleString()}`}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="autoBidMax">Auto-bid Maximum (Optional)</Label>
                            <Input
                              id="autoBidMax"
                              type="number"
                              value={autoBidMax}
                              onChange={(e) => setAutoBidMax(Number(e.target.value))}
                              placeholder="Set maximum for auto-bidding"
                            />
                          </div>

                          <div className="flex space-x-2">
                            <Button
                              onClick={() => placeBidMutation.mutate({
                                auctionId: player.auction.id,
                                amount: bidAmount,
                                type: autoBidMax > 0 ? "auto" : "standard"
                              })}
                              disabled={placeBidMutation.isPending || bidAmount <= player.auction.currentBid}
                              className="flex-1"
                            >
                              Place Bid
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {player.auction.buyoutPrice && (
                      <Button
                        onClick={() => buyoutMutation.mutate(player.auction.id)}
                        disabled={buyoutMutation.isPending}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Buyout
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {!isLoading && filteredAuctions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Gavel className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Auctions Available</h3>
            <p className="text-gray-600">Check back later for new player auctions.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}