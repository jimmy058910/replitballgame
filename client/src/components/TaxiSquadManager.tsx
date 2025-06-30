import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, UserPlus, UserMinus, TrendingUp, Star, StarHalf } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import UnifiedPlayerCard from "@/components/UnifiedPlayerCard";
import { Player } from "shared/schema"; // Corrected import

interface TaxiSquadManagerProps {
  teamId?: string;
  onNavigateToRecruiting?: () => void;
}

// More specific type for taxi squad players if needed, or use SharedPlayer directly
// For now, let's assume TaxiPlayer is similar enough to Player or can extend it.
// If UnifiedPlayerCard expects more specific props, this might need adjustment.
type TaxiPlayer = Player & {
  // any specific fields for taxi players not in Player?
  // For now, assume Player is sufficient for what's used.
};


// Calculate potential stars based on total stats
const getPotentialStars = (player: TaxiPlayer) => {
  const totalStats = (player.speed ?? 20) + (player.power ?? 20) + (player.throwing ?? 20) +
                    (player.catching ?? 20) + (player.kicking ?? 20) + (player.agility ?? 20) +
                    (player.stamina ?? 20) + (player.leadership ?? 20);
  
  // Base potential calculation (young players have more potential)
  // Player.age is number, so no need for typeof check
  const ageFactor = player.age != null ? Math.max(0.5, (30 - player.age) / 10) : 1;
  const statFactor = Math.min(totalStats / 300, 1); // Normalize to 0-1
  const basePotential = (statFactor * 3.5 + ageFactor * 1.5);
  
  return Math.max(0.5, Math.min(5, basePotential));
};

// Render star rating
const renderStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const stars = [];
  
  for (let i = 0; i < fullStars; i++) {
    stars.push(<Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />);
  }
  
  if (hasHalfStar) {
    stars.push(<StarHalf key="half" className="w-3 h-3 fill-yellow-400 text-yellow-400" />);
  }
  
  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    stars.push(<Star key={`empty-${i}`} className="w-3 h-3 text-gray-400" />);
  }
  
  return stars;
};

export function TaxiSquadManager({ teamId, onNavigateToRecruiting }: TaxiSquadManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: taxiSquadPlayers, isLoading, error } = useQuery<TaxiPlayer[], Error>({
    queryKey: [`/api/teams/${teamId}/taxi-squad`],
    queryFn: () => apiRequest(`/api/teams/${teamId}/taxi-squad`),
    enabled: !!teamId,
  });

  const promotePlayerMutation = useMutation<unknown, Error, string>({
    mutationFn: async (playerId: string) => {
      return apiRequest(`/api/teams/${teamId}/taxi-squad/${playerId}/promote`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Player Promoted!",
        description: "Player has been moved to the main roster.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/taxi-squad`] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/players`] });
    },
    onError: (error: Error) => { // Typed error
      const errorMessage = (error as any)?.response?.data?.message || error?.message || "Failed to promote player";
      toast({
        title: "Promotion Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const releasePlayerMutation = useMutation<unknown, Error, string>({
    mutationFn: async (playerId: string) => {
      return apiRequest(`/api/teams/${teamId}/taxi-squad/${playerId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Player Released",
        description: "Player has been released from the taxi squad.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/taxi-squad`] });
    },
    onError: (error: Error) => { // Typed error
      toast({
        title: "Release Failed",
        description: error.message, // error.message is fine for Error type
        variant: "destructive",
      });
    },
  });

  if (!teamId) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center">
          <p className="text-gray-400">Team not found</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading taxi squad...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center">
          <p className="text-red-400">Error loading taxi squad: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Taxi Squad Management
            <Badge variant="secondary">{taxiSquadPlayers?.length || 0}/2</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              The taxi squad allows you to develop young prospects recruited through tryouts. 
              Players on the taxi squad cannot play in matches but can be promoted to the main roster when needed.
            </p>

            <div className="flex items-center gap-4 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">Capacity:</span>
                <span className="text-sm text-white">{taxiSquadPlayers?.length || 0} of 2 slots used</span>
              </div>
              
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-300">Next Season:</span>
                <span className="text-sm text-white">Players can be promoted during offseason</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {taxiSquadPlayers && taxiSquadPlayers.length > 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle>Current Taxi Squad Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {taxiSquadPlayers?.map((player: TaxiPlayer) => { // Typed player and optional chaining
                const potentialRating = getPotentialStars(player);
                return (
                  <div key={player.id} className="flex items-center gap-4 p-4 border border-gray-600 rounded-lg">
                    <div className="flex-1">
                      <UnifiedPlayerCard player={player} variant="roster" />
                    </div>
                    
                    {/* Potential Rating Display */}
                    <div className="text-center mr-4">
                      <div className="text-xs text-gray-400 mb-1">Potential</div>
                      <div className="flex items-center gap-1 justify-center">
                        {renderStars(potentialRating)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        ({potentialRating.toFixed(1)}/5.0)
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => promotePlayerMutation.mutate(player.id)}
                      disabled={promotePlayerMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Promote
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => releasePlayerMutation.mutate(player.id)}
                      disabled={releasePlayerMutation.isPending}
                      className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                    >
                      <UserMinus className="w-4 h-4 mr-1" />
                      Release
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              No Taxi Squad Players
            </h3>
            <p className="text-gray-500 mb-4">
              You haven't recruited any players to your taxi squad yet. 
              Use the recruiting system to find young talent for future development.
            </p>
            <Button 
              variant="outline" 
              onClick={onNavigateToRecruiting}
              className="border-orange-600 text-orange-400 hover:bg-orange-600 hover:text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Go to Recruiting
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}