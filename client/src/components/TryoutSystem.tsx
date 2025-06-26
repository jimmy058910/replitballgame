import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Star, Users, Clock } from "lucide-react";

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
  catching?: number;
  kicking?: number;
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
  
  // Reveal system states
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealProgress, setRevealProgress] = useState(0);
  const [currentRevealIndex, setCurrentRevealIndex] = useState(0);
  const [revealedCandidates, setRevealedCandidates] = useState<TryoutCandidate[]>([]);
  
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
      return await apiRequest(`/api/teams/${teamId}/tryouts`, "POST", { type });
    },
    onSuccess: (data) => {
      setTryoutType(data.type);
      setShowTryoutModal(true);
      startRevealSequence(data.candidates);
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

  // Reveal sequence function
  const startRevealSequence = (newCandidates: TryoutCandidate[]) => {
    setIsRevealing(true);
    setRevealProgress(0);
    setCurrentRevealIndex(0);
    setRevealedCandidates([]);
    setCandidates(newCandidates);
    
    // Animate progress bar over 3 seconds
    const totalDuration = 3000;
    const interval = 50;
    const increment = (100 / totalDuration) * interval;
    
    const progressTimer = setInterval(() => {
      setRevealProgress(prev => {
        const newProgress = prev + increment;
        if (newProgress >= 100) {
          clearInterval(progressTimer);
          // Start revealing candidates one by one
          revealCandidatesSequentially(newCandidates);
          return 100;
        }
        return newProgress;
      });
    }, interval);
  };

  const revealCandidatesSequentially = (candidatesToReveal: TryoutCandidate[]) => {
    candidatesToReveal.forEach((candidate, index) => {
      setTimeout(() => {
        setRevealedCandidates(prev => [...prev, candidate]);
        setCurrentRevealIndex(index + 1);
        
        // Show exciting effect for high potential players
        if (candidate.potential === "High") {
          toast({
            title: "⭐ High Potential Prospect!",
            description: `${candidate.name} shows exceptional promise!`,
          });
        }
        
        // Complete reveal sequence
        if (index === candidatesToReveal.length - 1) {
          setTimeout(() => {
            setIsRevealing(false);
          }, 500);
        }
      }, (index + 1) * 800); // 800ms delay between each reveal
    });
  };

  const addToTaxiSquadMutation = useMutation({
    mutationFn: async (candidateIds: string[]) => {
      return await apiRequest(`/api/teams/${teamId}/taxi-squad`, "POST", { candidateIds });
    },
    onSuccess: () => {
      toast({
        title: "Players Added",
        description: "Selected players added to taxi squad",
      });
      setShowTryoutModal(false);
      setCandidates([]);
      setSelectedCandidates([]);
      setRevealedCandidates([]);
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
            <Badge variant="secondary">Once per season</Badge>
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
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              {tryoutType === "basic" ? "Basic" : "Advanced"} Tryout Results
            </DialogTitle>
            <DialogDescription>
              Review and select up to 2 promising candidates to add to your taxi squad for future promotion.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {isRevealing && (
              <div className="space-y-4 text-center">
                <div className="flex items-center justify-center gap-3">
                  <Clock className="w-5 h-5 text-blue-400 animate-spin" />
                  <span className="text-lg font-semibold text-white">Evaluating Candidates...</span>
                </div>
                <Progress value={revealProgress} className="w-full h-3" />
                <div className="text-gray-300">
                  {revealProgress < 100 
                    ? "Analyzing skills and potential..." 
                    : "Preparing results..."
                  }
                </div>
              </div>
            )}

            {!isRevealing && revealedCandidates.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-400 font-semibold">
                  <Users className="w-5 h-5" />
                  <span>Evaluation Complete!</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Select up to 2 players to add to your taxi squad. 
                  You can promote them to your main roster next season.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {revealedCandidates.map((candidate, index) => (
                <Card 
                  key={candidate.id}
                  className={`cursor-pointer transition-all transform hover:scale-105 animate-in slide-in-from-bottom-4 duration-500 ${
                    selectedCandidates.includes(candidate.id)
                      ? 'bg-blue-700 border-blue-500 shadow-lg shadow-blue-500/20'
                      : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                  } ${candidate.potential === "High" ? 'ring-2 ring-yellow-400/50' : ''}`}
                  onClick={() => toggleCandidateSelection(candidate.id)}
                  style={{ 
                    animationDelay: `${index * 200}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {candidate.potential === "High" && <Star className="w-4 h-4 text-yellow-400" />}
                        {candidate.name}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Age {candidate.age}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <Badge variant="secondary">{candidate.race}</Badge>
                      <Badge variant="outline">{getPlayerRole(candidate)}</Badge>
                      <Badge 
                        variant={
                          candidate.potential === "High" ? "default" :
                          candidate.potential === "Medium" ? "secondary" : "outline"
                        }
                        className={candidate.potential === "High" ? "bg-yellow-500 text-black font-bold" : ""}
                      >
                        {candidate.potential} Potential
                      </Badge>
                    </div>
                    
                    {/* Power Rating */}
                    <div className="flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {Math.round((candidate.speed + candidate.power + candidate.throwing + (candidate.catching || 0) + (candidate.kicking || 0)) / 5)}
                      </div>
                      <span className="ml-2 text-xs text-gray-400">Power</span>
                    </div>
                    
                    {/* Core Stats with Colors and Symbols */}
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className={`flex items-center gap-1 ${
                        candidate.leadership >= 32 ? 'text-green-400' :
                        candidate.leadership <= 18 ? 'text-red-400' : 'text-white'
                      }`}>
                        <span className="text-yellow-400">👑</span> {candidate.leadership}
                      </div>
                      <div className={`flex items-center gap-1 ${
                        candidate.throwing >= 32 ? 'text-green-400' :
                        candidate.throwing <= 18 ? 'text-red-400' : 'text-white'
                      }`}>
                        <span className="text-blue-400">🎯</span> {candidate.throwing}
                      </div>
                      <div className={`flex items-center gap-1 ${
                        candidate.speed >= 32 ? 'text-green-400' :
                        candidate.speed <= 18 ? 'text-red-400' : 'text-white'
                      }`}>
                        <span className="text-green-400">⚡</span> {candidate.speed}
                      </div>
                      <div className={`flex items-center gap-1 ${
                        candidate.agility >= 32 ? 'text-green-400' :
                        candidate.agility <= 18 ? 'text-red-400' : 'text-white'
                      }`}>
                        <span className="text-pink-400">🏃</span> {candidate.agility}
                      </div>
                      <div className={`flex items-center gap-1 ${
                        candidate.power >= 32 ? 'text-green-400' :
                        candidate.power <= 18 ? 'text-red-400' : 'text-white'
                      }`}>
                        <span className="text-red-400">💪</span> {candidate.power}
                      </div>
                      <div className={`flex items-center gap-1 ${
                        candidate.stamina >= 32 ? 'text-green-400' :
                        candidate.stamina <= 18 ? 'text-red-400' : 'text-white'
                      }`}>
                        <span className="text-cyan-400">🫁</span> {candidate.stamina}
                      </div>
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