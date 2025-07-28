import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, UserPlus, UserMinus, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import UnifiedPlayerCard from "@/components/UnifiedPlayerCard";
import { StarRating } from "@/components/StarRating";
import { getPlayerRole } from "@shared/playerUtils";

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


// Use actual stored potential rating instead of calculating from stats

export function TaxiSquadManager({ teamId, onNavigateToRecruiting }: TaxiSquadManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: taxiSquadPlayers, isLoading, error } = useQuery<TaxiPlayer[], Error>({
    queryKey: [`/api/teams/${teamId}/taxi-squad`],
    queryFn: () => apiRequest(`/api/teams/${teamId}/taxi-squad`),
    enabled: !!teamId,
  });

  // Get current season cycle to determine if promotions are allowed
  const { data: seasonCycle } = useQuery({
    queryKey: ['/api/season/current-cycle'],
  });

  // Promotions only allowed during offseason (Days 16-17)
  const isOffseason = seasonCycle?.data?.currentDay >= 16;

  const promotePlayerMutation = useMutation({
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
                <span className={`text-sm ${isOffseason ? 'text-green-400' : 'text-orange-400'}`}>
                  {isOffseason ? 'Promotions available now!' : 'Players can be promoted during offseason (Days 16-17)'}
                </span>
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
                const playerRole = getPlayerRole(player);
                const getRaceEmoji = (race: string) => {
                  const raceEmojis: Record<string, string> = { 'human': '👤', 'sylvan': '🌿', 'gryll': '⚒️', 'lumina': '☀️', 'umbra': '🌙' };
                  return raceEmojis[race?.toLowerCase()] || '👤';
                };
                
                return (
                  <div key={player.id} className="p-4 border border-gray-600 rounded-lg bg-gray-800/50">
                    <div className="flex items-start gap-4">
                      {/* Comprehensive Player Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div>
                            <h3 className="font-semibold text-lg text-white">
                              {player.firstName} {player.lastName}
                            </h3>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-yellow-600 text-black text-xs px-2 py-0.5">
                                {playerRole.toUpperCase()}
                              </Badge>
                              <span className="text-sm text-gray-400">{getRaceEmoji(player.race)} {player.race?.charAt(0).toUpperCase() + player.race?.slice(1)}</span>
                              <span className="text-sm text-gray-400">Age {player.age}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* ALL 8 Player Stats Grid */}
                        <div className="grid grid-cols-4 gap-3 mb-3">
                          <div className="text-center p-2 bg-gray-700/50 rounded">
                            <div className="text-lg font-bold text-red-400">{player.throwing}</div>
                            <div className="text-xs text-gray-400">THR</div>
                          </div>
                          <div className="text-center p-2 bg-gray-700/50 rounded">
                            <div className="text-lg font-bold text-blue-400">{player.agility}</div>
                            <div className="text-xs text-gray-400">AGI</div>
                          </div>
                          <div className="text-center p-2 bg-gray-700/50 rounded">
                            <div className="text-lg font-bold text-green-400">{player.speed}</div>
                            <div className="text-xs text-gray-400">SPD</div>
                          </div>
                          <div className="text-center p-2 bg-gray-700/50 rounded">
                            <div className="text-lg font-bold text-purple-400">{player.catching}</div>
                            <div className="text-xs text-gray-400">CAT</div>
                          </div>
                          <div className="text-center p-2 bg-gray-700/50 rounded">
                            <div className="text-lg font-bold text-orange-400">{player.power}</div>
                            <div className="text-xs text-gray-400">PWR</div>
                          </div>
                          <div className="text-center p-2 bg-gray-700/50 rounded">
                            <div className="text-lg font-bold text-yellow-400">{player.staminaAttribute}</div>
                            <div className="text-xs text-gray-400">STA</div>
                          </div>
                          <div className="text-center p-2 bg-gray-700/50 rounded">
                            <div className="text-lg font-bold text-pink-400">{player.leadership}</div>
                            <div className="text-xs text-gray-400">LDR</div>
                          </div>
                          <div className="text-center p-2 bg-gray-700/50 rounded">
                            <div className="text-lg font-bold text-cyan-400">{player.kicking}</div>
                            <div className="text-xs text-gray-400">KCK</div>
                          </div>
                        </div>

                        {/* Power Rating */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">Power:</span>
                            <span className="text-xl font-bold text-red-400">
                              {Math.round(((player.speed || 0) + (player.power || 0) + (player.throwing || 0) + 
                                          (player.catching || 0) + (player.agility || 0) + (player.kicking || 0)) / 6)}
                            </span>
                          </div>
                          
                          <div className="text-right">
                            <Badge variant="secondary" className="text-xs">Taxi Squad</Badge>
                          </div>
                        </div>
                      </div>
                    
                      {/* Potential Rating Display */}
                      <div className="text-center mr-4">
                        <div className="text-xs text-gray-400 mb-1">Potential</div>
                        <StarRating 
                          potential={player.potentialRating || 2.5} 
                          showDecimal={true}
                          compact={false}
                          className="justify-center"
                        />
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => promotePlayerMutation.mutate(player.id)}
                          disabled={promotePlayerMutation.isPending || !isOffseason}
                          className={`${!isOffseason 
                            ? "bg-gray-600 text-gray-400 border-gray-600 cursor-not-allowed" 
                            : "bg-green-600 hover:bg-green-700 text-white border-green-600"
                          }`}
                          title={!isOffseason ? "Player promotions only allowed during offseason (Days 16-17)" : "Promote player to main roster"}
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