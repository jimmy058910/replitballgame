import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import MarketplaceItem from "@/components/MarketplaceItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Marketplace() {
  const [raceFilter, setRaceFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: marketplacePlayers, isLoading } = useQuery({
    queryKey: ["/api/marketplace"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  const bidMutation = useMutation({
    mutationFn: async ({ playerId, amount }: { playerId: string; amount: number }) => {
      await apiRequest("POST", "/api/marketplace/bid", { playerId, amount });
    },
    onSuccess: () => {
      toast({
        title: "Bid Placed",
        description: "Your bid has been placed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
    },
    onError: (error) => {
      toast({
        title: "Bid Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredPlayers = marketplacePlayers?.filter((player: any) => {
    const matchesRace = raceFilter === "all" || player.race === raceFilter;
    const matchesSearch = searchTerm === "" || 
      player.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRace && matchesSearch;
  }) || [];

  const handleBid = (playerId: string, amount: number) => {
    if (!team) {
      toast({
        title: "Error",
        description: "You need a team to place bids.",
        variant: "destructive",
      });
      return;
    }

    if (team.credits < amount) {
      toast({
        title: "Insufficient Credits",
        description: "You don't have enough credits for this bid.",
        variant: "destructive",
      });
      return;
    }

    bidMutation.mutate({ playerId, amount });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-orbitron text-3xl font-bold mb-2">Marketplace</h1>
          <p className="text-gray-400">
            Buy and sell players to strengthen your team
          </p>
        </div>

        {/* Filters */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Search Players
                </label>
                <Input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Filter by Race
                </label>
                <Select value={raceFilter} onValueChange={setRaceFilter}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Races</SelectItem>
                    <SelectItem value="human">Humans</SelectItem>
                    <SelectItem value="sylvan">Sylvans</SelectItem>
                    <SelectItem value="gryll">Gryll</SelectItem>
                    <SelectItem value="lumina">Lumina</SelectItem>
                    <SelectItem value="umbra">Umbra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Credits Display */}
        {team && (
          <Card className="bg-gray-800 border-gray-700 mb-8">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-coins text-gold-400"></i>
                  <span className="text-lg font-semibold">Available Credits:</span>
                </div>
                <span className="text-2xl font-bold text-gold-400">
                  {team.credits?.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Marketplace Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  {Array.from({ length: 3 }, (_, j) => (
                    <div key={j} className="h-3 bg-gray-700 rounded"></div>
                  ))}
                </div>
                <div className="h-10 bg-gray-700 rounded"></div>
              </div>
            ))
          ) : filteredPlayers.length > 0 ? (
            filteredPlayers.map((player: any) => (
              <MarketplaceItem
                key={player.id}
                player={player}
                onBid={handleBid}
                isLoading={bidMutation.isPending}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-16">
              <i className="fas fa-store text-6xl text-gray-600 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                No players found
              </h3>
              <p className="text-gray-500">
                {searchTerm || raceFilter !== "all" 
                  ? "Try adjusting your search or filter criteria."
                  : "No players are currently available in the marketplace."
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
