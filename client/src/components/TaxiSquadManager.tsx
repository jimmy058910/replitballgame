import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, UserPlus, UserMinus, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import UnifiedPlayerCard from "@/components/UnifiedPlayerCard";

interface TaxiSquadManagerProps {
  teamId?: string;
  onNavigateToRecruiting?: () => void;
}

export function TaxiSquadManager({ teamId, onNavigateToRecruiting }: TaxiSquadManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: taxiSquadPlayers, isLoading, error } = useQuery({
    queryKey: [`/api/teams/${teamId}/taxi-squad`],
    enabled: !!teamId,
  });

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
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to promote player";
      toast({
        title: "Promotion Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const releasePlayerMutation = useMutation({
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
    onError: (error) => {
      toast({
        title: "Release Failed",
        description: error.message,
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
              {taxiSquadPlayers.map((player: any) => (
                <div key={player.id} className="flex items-center gap-4 p-4 border border-gray-600 rounded-lg">
                  <div className="flex-1">
                    <UnifiedPlayerCard player={player} variant="roster" />
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
              ))}
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