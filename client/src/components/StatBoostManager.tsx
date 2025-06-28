import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Zap, 
  User, 
  Target, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Plus,
  TrendingUp,
  Shield,
  Flame,
  Crown
} from "lucide-react";

interface StatBoostItem {
  itemId: number;
  name: string;
  description: string;
  attributeName: string;
  boostValue: number;
  rarity: string;
}

interface ActiveBoost {
  id: string;
  teamId: string;
  playerId: string;
  itemId: number;
  itemName: string;
  attributeName: string;
  boostValue: number;
  activatedAt: string;
  gameType: string;
}

interface Player {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  race: string;
  position: string;
}

export default function StatBoostManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [showActivateDialog, setShowActivateDialog] = useState(false);

  // Fetch team data
  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  // Fetch team players
  const { data: players } = useQuery({
    queryKey: ["/api/teams", team?.id, "players"],
    enabled: !!team?.id,
  });

  // Fetch available stat boost items
  const { data: availableBoosts, isLoading: loadingBoosts } = useQuery({
    queryKey: ["/api/stat-boosts/available"],
    enabled: !!team?.id,
  });

  // Fetch active boosts
  const { data: activeBoosts, isLoading: loadingActive } = useQuery({
    queryKey: ["/api/stat-boosts/active"],
    enabled: !!team?.id,
  });

  // Activate boost mutation
  const activateBoostMutation = useMutation({
    mutationFn: (data: { itemId: number; playerId: string }) =>
      apiRequest("/api/stat-boosts/activate", "POST", data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stat-boosts/active"] });
      setShowActivateDialog(false);
      setSelectedPlayer("");
      setSelectedItem(null);
      toast({
        title: "Boost Activated!",
        description: response.message,
        duration: 5000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Activation Failed",
        description: error.message || "Failed to activate stat boost",
        variant: "destructive",
      });
    },
  });

  // Cancel boost mutation
  const cancelBoostMutation = useMutation({
    mutationFn: (boostId: string) =>
      apiRequest(`/api/stat-boosts/${boostId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stat-boosts/active"] });
      toast({
        title: "Boost Cancelled",
        description: "Stat boost has been successfully cancelled",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel stat boost",
        variant: "destructive",
      });
    },
  });

  const handleActivateBoost = () => {
    if (!selectedItem || !selectedPlayer) {
      toast({
        title: "Selection Required",
        description: "Please select both an item and a player",
        variant: "destructive",
      });
      return;
    }

    activateBoostMutation.mutate({
      itemId: selectedItem,
      playerId: selectedPlayer,
    });
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "common": return "bg-gray-500";
      case "uncommon": return "bg-green-500";
      case "rare": return "bg-blue-500";
      case "epic": return "bg-purple-500";
      case "legendary": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  const getStatIcon = (attributeName: string) => {
    switch (attributeName.toLowerCase()) {
      case "speed": return <Zap className="w-4 h-4" />;
      case "power": return <Shield className="w-4 h-4" />;
      case "all_stats": return <Crown className="w-4 h-4" />;
      default: return <TrendingUp className="w-4 h-4" />;
    }
  };

  const formatStatName = (attributeName: string) => {
    if (attributeName === "all_stats") return "All Stats";
    return attributeName.charAt(0).toUpperCase() + attributeName.slice(1);
  };

  const remainingSlots = 3 - (activeBoosts?.length || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Stat Boost Manager</h2>
          <p className="text-gray-400">Activate temporary stat boosts for your next League game</p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          <Target className="w-4 h-4 mr-2" />
          {remainingSlots}/3 Slots Available
        </Badge>
      </div>

      <Alert className="border-blue-500/20 bg-blue-500/10">
        <AlertTriangle className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-200">
          <strong>League Games Only:</strong> Stat boosts only apply to League matches and are consumed after each game.
          You can activate up to 3 boosts per match.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800">
          <TabsTrigger value="active" className="text-white data-[state=active]:bg-blue-600">
            Active Boosts ({activeBoosts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="available" className="text-white data-[state=active]:bg-blue-600">
            Available Items
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                Active Boosts for Next League Game
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingActive ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-700 rounded-lg"></div>
                  ))}
                </div>
              ) : !activeBoosts || activeBoosts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No Active Boosts</p>
                  <p className="text-sm">Activate stat boosts to give your players an edge in the next League game</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeBoosts.map((boost: ActiveBoost) => {
                    const player = players?.find((p: Player) => p.id === boost.playerId);
                    return (
                      <div key={boost.id} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              {getStatIcon(boost.attributeName)}
                              <Badge className={`${getRarityColor("uncommon")} text-white`}>
                                {boost.itemName}
                              </Badge>
                            </div>
                            <div className="text-white">
                              <div className="font-medium">{player?.name || "Unknown Player"}</div>
                              <div className="text-sm text-gray-300">
                                +{boost.boostValue} {formatStatName(boost.attributeName)}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => cancelBoostMutation.mutate(boost.id)}
                            disabled={cancelBoostMutation.isPending}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Available Stat Boost Items</h3>
            {remainingSlots > 0 && (
              <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Activate Boost
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Activate Stat Boost</DialogTitle>
                    <DialogDescription className="text-gray-300">
                      Select an item and player to activate a stat boost for your next League game.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-white mb-2 block">
                        Select Boost Item
                      </label>
                      <Select value={selectedItem?.toString() || ""} onValueChange={(value) => setSelectedItem(parseInt(value))}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Choose a stat boost item" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          {availableBoosts?.map((item: StatBoostItem) => (
                            <SelectItem key={item.itemId} value={item.itemId.toString()} className="text-white">
                              <div className="flex items-center space-x-2">
                                {getStatIcon(item.attributeName)}
                                <span>{item.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  +{item.boostValue} {formatStatName(item.attributeName)}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-white mb-2 block">
                        Select Player
                      </label>
                      <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Choose a player" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          {players?.map((player: Player) => (
                            <SelectItem key={player.id} value={player.id} className="text-white">
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4" />
                                <span>{player.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {player.race}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowActivateDialog(false)}
                      className="border-gray-600 text-white hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleActivateBoost}
                      disabled={!selectedItem || !selectedPlayer || activateBoostMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {activateBoostMutation.isPending ? "Activating..." : "Activate Boost"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {remainingSlots === 0 && (
            <Alert className="border-orange-500/20 bg-orange-500/10">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <AlertDescription className="text-orange-200">
                <strong>Maximum Boosts Active:</strong> You have reached the 3-boost limit. Cancel an existing boost to activate a new one.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingBoosts ? (
              [...Array(3)].map((_, i) => (
                <Card key={i} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-700 rounded w-full"></div>
                      <div className="h-8 bg-gray-700 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              availableBoosts?.map((item: StatBoostItem) => (
                <Card key={item.itemId} className="bg-gray-800 border-gray-700 hover:border-blue-500/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {getStatIcon(item.attributeName)}
                        <Badge className={`${getRarityColor(item.rarity)} text-white text-xs`}>
                          {item.rarity}
                        </Badge>
                      </div>
                      <Flame className="w-5 h-5 text-orange-400" />
                    </div>
                    
                    <h4 className="font-semibold text-white mb-2">{item.name}</h4>
                    <p className="text-sm text-gray-300 mb-3">{item.description}</p>
                    
                    <div className="bg-gray-700 rounded-lg p-2 mb-3">
                      <div className="text-center">
                        <div className="text-green-400 font-bold text-lg">
                          +{item.boostValue}
                        </div>
                        <div className="text-xs text-gray-300">
                          {formatStatName(item.attributeName)}
                        </div>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full border-blue-500 text-blue-400 hover:bg-blue-500/10"
                      onClick={() => {
                        setSelectedItem(item.itemId);
                        setShowActivateDialog(true);
                      }}
                      disabled={remainingSlots === 0}
                    >
                      {remainingSlots === 0 ? "Max Boosts Active" : "Activate"}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}