import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, TrendingUp, Clock, ShoppingCart, Gavel, Users, DollarSign, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";

interface MarketplaceListing {
  id: string;
  playerId: string;
  sellerTeamId: string;
  startBid: number;
  buyNowPrice: number | null;
  currentBid: number;
  currentHighBidderTeamId: string | null;
  expiryTimestamp: string;
  isActive: boolean;
  player: {
    id: string;
    name: string;
    race: string;
    role: string;
    overall: number;
    speed: number;
    power: number;
    throwing: number;
    catching: number;
    agility: number;
    stamina: number;
    leadership: number;
  };
  sellerTeam: {
    id: string;
    name: string;
  };
}

interface Transaction {
  id: string;
  playerId: string;
  buyerTeamId: string;
  sellerTeamId: string;
  transactionType: string;
  finalPrice: number;
  marketTax: number;
  sellerProceeds: number;
  completedAt: string;
  player: any;
  buyerTeam: any;
  sellerTeam: any;
  isBuyer: boolean;
}

export default function Marketplace() {
  const { toast } = useToast();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  
  // Listing form state
  const [listingForm, setListingForm] = useState({
    playerId: "",
    startBid: "",
    buyNowPrice: "",
    duration: "24"
  });

  // Queries
  const { data: marketplaceListings = [], isLoading: loadingListings } = useQuery({
    queryKey: ['/api/marketplace/players'],
  });

  const { data: myListings = [], isLoading: loadingMyListings } = useQuery({
    queryKey: ['/api/marketplace/my-listings'],
  });

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['/api/marketplace/transactions'],
  });

  const { data: teamData } = useQuery({
    queryKey: ['/api/teams/my'],
  });

  const { data: players = [] } = useQuery({
    queryKey: teamData?.id ? [`/api/teams/${teamData.id}/players`] : null,
    enabled: !!teamData?.id,
  });

  // Mutations
  const listPlayerMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/marketplace/list', 'POST', data),
    onSuccess: () => {
      toast({ title: "Success", description: "Player listed successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/players'] });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/my-listings'] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamData?.id}/players`] });
      setListDialogOpen(false);
      setListingForm({ playerId: "", startBid: "", buyNowPrice: "", duration: "24" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to list player",
        variant: "destructive" 
      });
    }
  });

  const placeBidMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/marketplace/bid', 'POST', data),
    onSuccess: () => {
      toast({ title: "Success", description: "Bid placed successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/players'] });
      setBidDialogOpen(false);
      setBidAmount("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to place bid",
        variant: "destructive" 
      });
    }
  });

  const buyNowMutation = useMutation({
    mutationFn: (listingId: string) => apiRequest('/api/marketplace/buy-now', 'POST', { listingId }),
    onSuccess: () => {
      toast({ title: "Success", description: "Player purchased successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/players'] });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams/my'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to purchase player",
        variant: "destructive" 
      });
    }
  });

  const getStatColor = (value: number) => {
    if (value >= 32) return "text-green-500";
    if (value <= 18) return "text-red-500";
    return "text-gray-300";
  };

  const getRaceColor = (race: string) => {
    const colors: Record<string, string> = {
      human: "bg-blue-500/20 text-blue-300",
      sylvan: "bg-green-500/20 text-green-300",
      gryll: "bg-orange-500/20 text-orange-300",
      lumina: "bg-yellow-500/20 text-yellow-300",
      umbra: "bg-purple-500/20 text-purple-300",
    };
    return colors[race?.toLowerCase()] || "bg-gray-500/20 text-gray-300";
  };

  const eligiblePlayers = players.filter((p: any) => 
    !myListings.some((listing: any) => listing.player?.id === p.id)
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Player Marketplace</h1>
          <p className="text-muted-foreground">Buy and sell players through auctions or instant purchases</p>
        </div>
        
        <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" disabled={players.length <= 10}>
              <Gavel className="mr-2 h-5 w-5" />
              List Player
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>List Player for Sale</DialogTitle>
              <DialogDescription>
                Set up an auction for one of your players. You can have up to 3 active listings.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="player">Select Player</Label>
                <Select 
                  value={listingForm.playerId} 
                  onValueChange={(value) => setListingForm({ ...listingForm, playerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a player..." />
                  </SelectTrigger>
                  <SelectContent>
                    {eligiblePlayers.map((player: any) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name} - {player.role} (Overall: {player.overall})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="startBid">Starting Bid</Label>
                <Input
                  id="startBid"
                  type="number"
                  placeholder="Enter starting bid amount..."
                  value={listingForm.startBid}
                  onChange={(e) => setListingForm({ ...listingForm, startBid: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="buyNowPrice">Buy Now Price (Optional)</Label>
                <Input
                  id="buyNowPrice"
                  type="number"
                  placeholder="Enter buy now price..."
                  value={listingForm.buyNowPrice}
                  onChange={(e) => setListingForm({ ...listingForm, buyNowPrice: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 50% higher than starting bid
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="duration">Auction Duration</Label>
                <Select 
                  value={listingForm.duration} 
                  onValueChange={(value) => setListingForm({ ...listingForm, duration: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 Hours</SelectItem>
                    <SelectItem value="24">24 Hours</SelectItem>
                    <SelectItem value="72">3 Days</SelectItem>
                    <SelectItem value="168">7 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  A listing fee of 2% of the starting bid (minimum 100 credits) will be charged.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setListDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => listPlayerMutation.mutate({
                  playerId: listingForm.playerId,
                  startBid: parseInt(listingForm.startBid),
                  buyNowPrice: listingForm.buyNowPrice ? parseInt(listingForm.buyNowPrice) : null,
                  duration: parseInt(listingForm.duration)
                })}
                disabled={!listingForm.playerId || !listingForm.startBid || listPlayerMutation.isPending}
              >
                {listPlayerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                List Player
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">Browse Listings</TabsTrigger>
          <TabsTrigger value="my-listings">My Listings</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {loadingListings ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : marketplaceListings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No Active Listings</p>
                <p className="text-sm text-muted-foreground">Check back later for new player auctions</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {marketplaceListings.map((listing: MarketplaceListing) => (
                <Card key={listing.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{listing.player.name}</CardTitle>
                        <CardDescription>
                          <Badge variant="outline" className={getRaceColor(listing.player.race)}>
                            {listing.player.race}
                          </Badge>
                          <Badge variant="outline" className="ml-2">
                            {listing.player.role}
                          </Badge>
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{listing.player.overall}</div>
                        <div className="text-xs text-muted-foreground">Overall</div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <div className={`font-bold ${getStatColor(listing.player.speed)}`}>
                          {listing.player.speed}
                        </div>
                        <div className="text-xs text-muted-foreground">SPD</div>
                      </div>
                      <div>
                        <div className={`font-bold ${getStatColor(listing.player.power)}`}>
                          {listing.player.power}
                        </div>
                        <div className="text-xs text-muted-foreground">POW</div>
                      </div>
                      <div>
                        <div className={`font-bold ${getStatColor(listing.player.agility)}`}>
                          {listing.player.agility}
                        </div>
                        <div className="text-xs text-muted-foreground">AGI</div>
                      </div>
                      <div>
                        <div className={`font-bold ${getStatColor(listing.player.stamina)}`}>
                          {listing.player.stamina}
                        </div>
                        <div className="text-xs text-muted-foreground">STA</div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Current Bid</span>
                        <span className="font-bold">₡{listing.currentBid.toLocaleString()}</span>
                      </div>
                      {listing.buyNowPrice && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Buy Now</span>
                          <span className="font-bold text-green-500">₡{listing.buyNowPrice.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Time Left</span>
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(listing.expiryTimestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Seller</span>
                        <span className="text-sm">{listing.sellerTeam.name}</span>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedListing(listing);
                        setBidDialogOpen(true);
                      }}
                      disabled={listing.sellerTeamId === teamData?.id}
                    >
                      <Gavel className="mr-2 h-4 w-4" />
                      Place Bid
                    </Button>
                    {listing.buyNowPrice && (
                      <Button 
                        className="flex-1"
                        onClick={() => buyNowMutation.mutate(listing.id)}
                        disabled={listing.sellerTeamId === teamData?.id || buyNowMutation.isPending}
                      >
                        {buyNowMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ShoppingCart className="mr-2 h-4 w-4" />
                        )}
                        Buy Now
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-listings" className="space-y-4">
          {loadingMyListings ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : myListings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Gavel className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No Active Listings</p>
                <p className="text-sm text-muted-foreground">You haven't listed any players yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myListings.map((listing: any) => (
                <Card key={listing.id}>
                  <CardHeader>
                    <CardTitle>{listing.player?.name}</CardTitle>
                    <CardDescription>
                      {listing.bidCount} bid{listing.bidCount !== 1 ? 's' : ''} • 
                      Expires {formatDistanceToNow(new Date(listing.expiryTimestamp), { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Starting Bid</span>
                      <span>₡{listing.startBid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Bid</span>
                      <span className="font-bold">₡{listing.currentBid.toLocaleString()}</span>
                    </div>
                    {listing.buyNowPrice && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Buy Now Price</span>
                        <span>₡{listing.buyNowPrice.toLocaleString()}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {loadingTransactions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No Transactions Yet</p>
                <p className="text-sm text-muted-foreground">Your marketplace transactions will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction: Transaction) => (
                <Card key={transaction.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${transaction.isBuyer ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                        {transaction.isBuyer ? (
                          <TrendingUp className="h-5 w-5 text-red-400" />
                        ) : (
                          <TrendingUp className="h-5 w-5 text-green-400 rotate-180" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {transaction.isBuyer ? 'Bought' : 'Sold'} {transaction.player?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.isBuyer ? `From ${transaction.sellerTeam?.name}` : `To ${transaction.buyerTeam?.name}`} • 
                          {format(new Date(transaction.completedAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${transaction.isBuyer ? 'text-red-500' : 'text-green-500'}`}>
                        {transaction.isBuyer ? '-' : '+'}₡{(transaction.isBuyer ? transaction.finalPrice : transaction.sellerProceeds).toLocaleString()}
                      </p>
                      {!transaction.isBuyer && (
                        <p className="text-xs text-muted-foreground">
                          Tax: ₡{transaction.marketTax.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Bid Dialog */}
      <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place Bid on {selectedListing?.player.name}</DialogTitle>
            <DialogDescription>
              Current bid: ₡{selectedListing?.currentBid.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bid">Your Bid Amount</Label>
              <Input
                id="bid"
                type="number"
                placeholder="Enter bid amount..."
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                min={selectedListing ? selectedListing.currentBid + 1 : 0}
              />
              <p className="text-xs text-muted-foreground">
                Minimum bid: ₡{selectedListing ? (selectedListing.currentBid + 1).toLocaleString() : 0}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBidDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedListing) {
                  placeBidMutation.mutate({
                    listingId: selectedListing.id,
                    bidAmount: parseInt(bidAmount)
                  });
                }
              }}
              disabled={!bidAmount || parseInt(bidAmount) <= (selectedListing?.currentBid || 0) || placeBidMutation.isPending}
            >
              {placeBidMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Place Bid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}