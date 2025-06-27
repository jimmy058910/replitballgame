import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Star, Users, Clock, Eye, Search } from "lucide-react";
import UnifiedPlayerCard from "./UnifiedPlayerCard";

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
  const [scoutQuality, setScoutQuality] = useState(50); // Default scout quality
  
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

  // Get team's scout quality (simulate for now - will be from database later)
  const { data: teamScouts } = useQuery({
    queryKey: [`/api/teams/${teamId}/scouts`],
    queryFn: () => {
      // Simulate scout data - in real implementation this would fetch from API
      return Promise.resolve([
        { id: '1', name: 'Head Scout', quality: Math.floor(Math.random() * 40) + 60, specialization: 'general' }
      ]);
    }
  });

  // Calculate effective scout quality
  const effectiveScoutQuality = teamScouts && teamScouts.length > 0 
    ? Math.max(...teamScouts.map((scout: any) => scout.quality))
    : 50;

  const basicCost = 25000;
  const advancedCost = 75000;
  const currentCredits = finances?.credits || 0;
  const canAffordBasic = currentCredits >= basicCost;
  const canAffordAdvanced = currentCredits >= advancedCost;

  const hostTryoutMutation = useMutation({
    mutationFn: async (type: "basic" | "advanced") => {
      return apiRequest(`/api/teams/${teamId}/tryouts`, "POST", { type });
    },
    onSuccess: (data) => {
      setCandidates(data.candidates);
      setTryoutType(data.type);
      setShowTryoutModal(true);
      startRevealAnimation(data.candidates);
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/finances`] });
    },
    onError: (error) => {
      toast({
        title: "Tryout Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addToTaxiSquadMutation = useMutation({
    mutationFn: async (candidateIds: string[]) => {
      const selectedCandidateData = candidates.filter(c => candidateIds.includes(c.id));
      return apiRequest(`/api/teams/${teamId}/taxi-squad/add-candidates`, "POST", { candidates: selectedCandidateData });
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: data.message,
      });
      setShowTryoutModal(false);
      setSelectedCandidates([]);
      setCandidates([]);
      setRevealedCandidates([]);
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/taxi-squad`] });
    },
    onError: (error) => {
      toast({
        title: "Failed to add players",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startRevealAnimation = (candidateList: TryoutCandidate[]) => {
    setIsRevealing(true);
    setRevealProgress(0);
    setCurrentRevealIndex(0);
    setRevealedCandidates([]);

    const totalDuration = 3000; // 3 seconds total
    const intervalDuration = 50; // Update every 50ms
    const totalSteps = totalDuration / intervalDuration;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = (currentStep / totalSteps) * 100;
      setRevealProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        setIsRevealing(false);
        setRevealedCandidates(candidateList);
      }
    }, intervalDuration);
  };

  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidates(prev => {
      if (prev.includes(candidateId)) {
        return prev.filter(id => id !== candidateId);
      } else if (prev.length < 2) {
        return [...prev, candidateId];
      } else {
        toast({
          title: "Selection Limit",
          description: "You can only select up to 2 candidates for your taxi squad.",
          variant: "destructive",
        });
        return prev;
      }
    });
  };

  const getPlayerRole = (candidate: TryoutCandidate) => {
    const stats = {
      throwing: candidate.throwing,
      speed: candidate.speed,
      power: candidate.power,
      catching: candidate.catching || 20,
      kicking: candidate.kicking || 20
    };

    if (stats.throwing >= Math.max(stats.speed, stats.power)) return "Passer";
    if (stats.speed >= stats.power) return "Runner";
    return "Blocker";
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
                  <span className="text-lg font-bold text-blue-400">
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
            
            {/* Scout Quality Display */}
            <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">Scout Report Quality</span>
                </div>
                <Badge variant="outline" className={`text-xs ${
                  effectiveScoutQuality >= 80 ? 'border-green-500 text-green-400' :
                  effectiveScoutQuality >= 60 ? 'border-yellow-500 text-yellow-400' :
                  effectiveScoutQuality >= 40 ? 'border-orange-500 text-orange-400' : 
                  'border-red-500 text-red-400'
                }`}>
                  {effectiveScoutQuality}% Accuracy
                </Badge>
              </div>
              <div className="text-xs text-gray-400">
                {effectiveScoutQuality >= 80 
                  ? "Excellent scout provides very precise stat ranges and accurate potential ratings"
                  : effectiveScoutQuality >= 60 
                  ? "Good scout provides reliable information with moderate accuracy"
                  : effectiveScoutQuality >= 40 
                  ? "Average scout provides rough estimates with wider stat ranges"
                  : "Poor scout provides unreliable information with very wide margins of error"
                }
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {revealedCandidates.map((candidate, index) => (
                <div
                  key={candidate.id}
                  className={`cursor-pointer transition-all transform hover:scale-105 animate-in slide-in-from-bottom-4 duration-500 ${
                    selectedCandidates.includes(candidate.id)
                      ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20'
                      : ''
                  } ${candidate.potential === "High" ? 'ring-2 ring-yellow-400/50' : ''}`}
                  onClick={() => toggleCandidateSelection(candidate.id)}
                  style={{ 
                    animationDelay: `${index * 200}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  <UnifiedPlayerCard
                    player={{
                      ...candidate,
                      firstName: candidate.name.split(' ')[0],
                      lastName: candidate.name.split(' ').slice(1).join(' ') || candidate.name,
                      role: getPlayerRole(candidate),
                      catching: candidate.catching || 20,
                      kicking: candidate.kicking || 20
                    }}
                    variant="recruiting"
                    scoutQuality={effectiveScoutQuality}
                    showActions={true}
                    onAction={(action, player) => {
                      if (action === 'recruit') {
                        toggleCandidateSelection(candidate.id);
                      } else if (action === 'scout_more') {
                        // Future enhancement: additional scouting
                        toast({
                          title: "Additional Scouting",
                          description: "This feature will be available soon to improve scout accuracy.",
                        });
                      }
                    }}
                  />
                </div>
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