import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TryoutCandidate {
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
  marketValue: number;
  potential: "High" | "Medium" | "Low";
}

interface TryoutSystemProps {
  teamId: string;
}

export default function TryoutSystem({ teamId }: TryoutSystemProps) {
  const [showTryoutModal, setShowTryoutModal] = useState(false);
  const [tryoutType, setTryoutType] = useState<"basic" | "advanced" | null>(null);
  const [candidates, setCandidates] = useState<TryoutCandidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [taxiSquad, setTaxiSquad] = useState<TryoutCandidate[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: team } = useQuery({
    queryKey: [`/api/teams/${teamId}`],
  });

  const { data: finances } = useQuery({
    queryKey: [`/api/teams/${teamId}/finances`],
  });

  const hostTryoutMutation = useMutation({
    mutationFn: async (type: "basic" | "advanced") => {
      return await apiRequest(`/api/teams/${teamId}/tryouts`, {
        method: "POST",
        body: JSON.stringify({ type }),
      });
    },
    onSuccess: (data) => {
      setCandidates(data.candidates);
      setTryoutType(data.type);
      setShowTryoutModal(true);
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/finances`] });
    },
    onError: (error: any) => {
      toast({
        title: "Tryout Failed",
        description: error.message || "Failed to host tryout",
        variant: "destructive",
      });
    },
  });

  const addToTaxiSquadMutation = useMutation({
    mutationFn: async (candidateIds: string[]) => {
      return await apiRequest(`/api/teams/${teamId}/taxi-squad`, {
        method: "POST",
        body: JSON.stringify({ candidateIds }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Players Added",
        description: "Selected players added to taxi squad",
      });
      setShowTryoutModal(false);
      setCandidates([]);
      setSelectedCandidates([]);
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/taxi-squad`] });
    },
  });

  const basicCost = 50000;
  const advancedCost = 150000;
  const currentCredits = finances?.credits || 0;

  const canAffordBasic = currentCredits >= basicCost;
  const canAffordAdvanced = currentCredits >= advancedCost;

  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidates(prev => {
      if (prev.includes(candidateId)) {
        return prev.filter(id => id !== candidateId);
      } else if (prev.length < 2) { // Max 2 taxi squad slots
        return [...prev, candidateId];
      }
      return prev;
    });
  };

  const getPlayerRole = (candidate: TryoutCandidate) => {
    if (candidate.leadership + candidate.throwing > candidate.speed + candidate.agility + candidate.power + candidate.stamina) {
      return "Passer";
    } else if (candidate.speed + candidate.agility > candidate.power + candidate.stamina) {
      return "Runner";
    } else {
      return "Blocker";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Player Tryouts & Recruitment
            <Badge variant="secondary">Offseason Only</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-400 text-sm">
            Host tryouts to recruit young talent (18-24 years old) for your taxi squad. 
            You can keep up to 2 players on taxi squad and promote them next season.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Tryout */}
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader>
                <CardTitle className="text-lg">Basic Tryout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-300">
                  <p>• 3 candidates to choose from</p>
                  <p>• Standard talent pool</p>
                  <p>• Quick evaluation process</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-green-400">
                    {basicCost.toLocaleString()} credits
                  </span>
                  <Button
                    onClick={() => hostTryoutMutation.mutate("basic")}
                    disabled={!canAffordBasic || hostTryoutMutation.isPending}
                    variant={canAffordBasic ? "default" : "secondary"}
                  >
                    {hostTryoutMutation.isPending ? "Hosting..." : "Host Basic Tryout"}
                  </Button>
                </div>
                {!canAffordBasic && (
                  <p className="text-red-400 text-xs">Insufficient credits</p>
                )}
              </CardContent>
            </Card>

            {/* Advanced Tryout */}
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader>
                <CardTitle className="text-lg">Advanced Tryout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-300">
                  <p>• 5 candidates to choose from</p>
                  <p>• Premium talent pool</p>
                  <p>• Higher potential players</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-yellow-400">
                    {advancedCost.toLocaleString()} credits
                  </span>
                  <Button
                    onClick={() => hostTryoutMutation.mutate("advanced")}
                    disabled={!canAffordAdvanced || hostTryoutMutation.isPending}
                    variant={canAffordAdvanced ? "default" : "secondary"}
                  >
                    {hostTryoutMutation.isPending ? "Hosting..." : "Host Advanced Tryout"}
                  </Button>
                </div>
                {!canAffordAdvanced && (
                  <p className="text-red-400 text-xs">Insufficient credits</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="text-center text-gray-500 text-sm">
            Current Credits: {currentCredits.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* Tryout Results Modal */}
      <Dialog open={showTryoutModal} onOpenChange={setShowTryoutModal}>
        <DialogContent className="max-w-4xl bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle>
              {tryoutType === "basic" ? "Basic" : "Advanced"} Tryout Results
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Select up to 2 players to add to your taxi squad. 
              You can promote them to your main roster next season.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map((candidate) => (
                <Card 
                  key={candidate.id}
                  className={`cursor-pointer transition-all ${
                    selectedCandidates.includes(candidate.id)
                      ? 'bg-blue-700 border-blue-500'
                      : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                  }`}
                  onClick={() => toggleCandidateSelection(candidate.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      {candidate.name}
                      <Badge variant="outline" className="text-xs">
                        Age {candidate.age}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="secondary">{candidate.race}</Badge>
                      <Badge variant="outline">{getPlayerRole(candidate)}</Badge>
                      <Badge variant={
                        candidate.potential === "High" ? "default" :
                        candidate.potential === "Medium" ? "secondary" : "outline"
                      }>
                        {candidate.potential}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div>Leadership: {candidate.leadership}</div>
                      <div>Throwing: {candidate.throwing}</div>
                      <div>Speed: {candidate.speed}</div>
                      <div>Agility: {candidate.agility}</div>
                      <div>Power: {candidate.power}</div>
                      <div>Stamina: {candidate.stamina}</div>
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      Value: {candidate.marketValue.toLocaleString()} credits
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-600">
              <div className="text-sm text-gray-400">
                Selected: {selectedCandidates.length}/2
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTryoutModal(false);
                    setCandidates([]);
                    setSelectedCandidates([]);
                  }}
                >
                  Dismiss All
                </Button>
                <Button
                  onClick={() => addToTaxiSquadMutation.mutate(selectedCandidates)}
                  disabled={selectedCandidates.length === 0 || addToTaxiSquadMutation.isPending}
                >
                  Add to Taxi Squad
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}