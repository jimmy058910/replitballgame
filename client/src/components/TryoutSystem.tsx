import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Users, Clock, Search } from "lucide-react"; // Removed Star, Eye as they are not directly used by TryoutSystem
import UnifiedPlayerCard from "./UnifiedPlayerCard";
import { TeamFinances as TeamFinancesData, Scout, Player } from "shared/schema"; // Added Player

interface ScoutData {
  effectiveness: number;
  statVariance: number;
  potentialAccuracy: number;
  canRevealExactPotential: boolean;
  canProvideStatRanges: boolean;
}

interface TryoutCandidate {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  race: string;
  age: number;
  leadership: number;
  throwing: number;
  speed: number;
  agility: number;
  power: number;
  stamina: number;
  catching: number; // Assuming these are also essential, even if 0
  kicking: number;  // Assuming these are also essential, even if 0

  // Fields specific to TryoutCandidate
  marketValue: number;
  potential: "High" | "Medium" | "Low";
  overallPotentialStars: number;
  scoutData?: ScoutData;
}

interface TryoutSystemProps {
  teamId: string;
  onNavigateToTaxiSquad?: () => void;
}

export default function TryoutSystem({ teamId, onNavigateToTaxiSquad }: TryoutSystemProps) {
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

  // Removed unused 'team' query. Credits are fetched from 'financesData'.
  const { data: financesData, isLoading: financesLoading } = useQuery<TeamFinancesData, Error>({
    queryKey: [`/api/teams/${teamId}/finances`],
    queryFn: () => apiRequest(`/api/teams/${teamId}/finances`),
    enabled: !!teamId,
  });

  // Check if tryouts have been used this season
  const { data: seasonalData } = useQuery({
    queryKey: [`/api/teams/${teamId}/seasonal-data`],
  });

  // Get team's scout quality (simulate for now - will be from database later)
  const { data: teamScouts } = useQuery({
    queryKey: [`/api/teams/${teamId}/scouts`],
    queryFn: async () => {
      // Simulate scout data - in real implementation this would fetch from API
      // Ensure the simulated data matches the Scout type
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      const quality = Math.floor(Math.random() * 40) + 60;
      return [
        // Corrected createdAt to be a Date object
        { id: 'simulated-scout-1', teamId: teamId, name: 'Head Scout', quality: quality, specialization: 'general', experience: 5, salary: 60000, contractLength: 3, isActive: true, createdAt: new Date() }
      ];
    },
    enabled: !!teamId,
  });

  // Calculate effective scout quality
  const effectiveScoutQuality = teamScouts && teamScouts?.length > 0
    ? Math.max(...teamScouts.map((scout: Scout) => scout.quality ?? 50))
    : 50;

  const basicCost = 25000;
  const advancedCost = 75000;
  const currentCredits = (finances as any)?.credits || 0;
  const canAffordBasic = currentCredits >= basicCost;
  const canAffordAdvanced = currentCredits >= advancedCost;
  
  // Check if tryouts have been used this season
  const tryoutsUsedThisSeason = (seasonalData as any)?.data?.tryoutsUsed || false;
  const canHostTryouts = !tryoutsUsedThisSeason;

  interface HostTryoutResponse {
    candidates: TryoutCandidate[];
    type: "basic" | "advanced";
  }

  const hostTryoutMutation = useMutation<HostTryoutResponse, Error, "basic" | "advanced">({
    mutationFn: async (type: "basic" | "advanced") => {
      return apiRequest(`/api/teams/${teamId}/tryouts`, "POST", { type });
    },
    onSuccess: (data) => {
      setCandidates(data.candidates);
      setTryoutType(data.type); // data.type should exist based on HostTryoutResponse
      setShowTryoutModal(true);
      startRevealAnimation(data.candidates);
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/finances`] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/seasonal-data`] });
    },
    onError: (error: Error) => { // Typed error
      toast({
        title: "Tryout Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  interface AddToTaxiResponse {
    message: string;
    // include other fields if the API returns more
  }

  const addToTaxiSquadMutation = useMutation<AddToTaxiResponse, Error, string[]>({ // Input is string[] (candidate IDs)
    mutationFn: async (candidateIds: string[]) => { // Parameter is string[]
      // Find the full candidate objects based on IDs.
      // This assumes `candidates` state variable holds the currently displayed candidates from hostTryoutMutation.
      const selectedFullCandidates = candidates.filter(c => candidateIds.includes(c.id));
      return apiRequest(`/api/teams/${teamId}/taxi-squad/add-candidates`, "POST", { candidates: selectedFullCandidates });
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: data.message, // data.message should exist based on AddToTaxiResponse
      });
      setShowTryoutModal(false);
      setSelectedCandidates([]);
      setCandidates([]);
      setRevealedCandidates([]);
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/taxi-squad`] });
    },
    onError: (error: Error) => { // Typed error
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

  const getPlayerRole = (candidate: TryoutCandidate): Player['position'] => {
    const stats = {
      throwing: candidate.throwing ?? 0,
      speed: candidate.speed ?? 0,
      power: candidate.power ?? 0,
      // catching and kicking might not be on TryoutCandidate if not on Player by default
      // but UnifiedPlayerCard might need them.
      // Assuming they are optional on Player or TryoutCandidate includes them.
      catching: candidate.catching ?? 20,
      kicking: candidate.kicking ?? 20
    };

    if (stats.throwing >= Math.max(stats.speed, stats.power)) return "Passer"; // Assuming 'Passer' is a valid Player['position']
    if (stats.speed >= stats.power) return "Runner"; // Assuming 'Runner' is a valid Player['position']
    return "Blocker"; // Assuming 'Blocker' is a valid Player['position']
  };

  const isLoading = financesLoading || scoutsLoading; // Combine loading states

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader><CardTitle>Loading Tryout System...</CardTitle></CardHeader>
        <CardContent><Progress value={50} className="animate-pulse" /></CardContent>
      </Card>
    );
  }

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
          <div className="space-y-2">
            <p className="text-gray-400 text-sm">
              Host tryouts to recruit young talent (18-24 years old) for your taxi squad. 
              You can keep up to 2 players on taxi squad and promote them next season.
            </p>
            <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-3">
              <p className="text-yellow-200 text-sm font-medium">
                ⚠️ Seasonal Restriction: You can only host tryouts ONCE per season (17-day cycle). Choose wisely!
              </p>
            </div>
            
            {/* View Taxi Players Button */}
            {onNavigateToTaxiSquad && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={onNavigateToTaxiSquad}
                  className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                >
                  <i className="fas fa-users mr-2"></i>
                  View Taxi Players
                </Button>
              </div>
            )}
          </div>

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
                    disabled={!canAffordBasic || !canHostTryouts || hostTryoutMutation.isPending}
                    variant={canAffordBasic && canHostTryouts ? "default" : "secondary"}
                  >
                    {hostTryoutMutation.isPending ? "Hosting..." : 
                     !canHostTryouts ? "Used This Season" : 
                     !canAffordBasic ? "Not Enough Credits" : 
                     "Host Basic Tryout"}
                  </Button>
                </div>
                {!canAffordBasic && (
                  <p className="text-red-400 text-xs">Insufficient credits</p>
                )}
                {!canHostTryouts && (
                  <p className="text-yellow-400 text-xs">Already used this season</p>
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
                    disabled={!canAffordAdvanced || !canHostTryouts || hostTryoutMutation.isPending}
                    variant={canAffordAdvanced && canHostTryouts ? "default" : "secondary"}
                  >
                    {hostTryoutMutation.isPending ? "Hosting..." : 
                     !canHostTryouts ? "Used This Season" : 
                     !canAffordAdvanced ? "Not Enough Credits" : 
                     "Host Advanced Tryout"}
                  </Button>
                </div>
                {!canAffordAdvanced && (
                  <p className="text-red-400 text-xs">Insufficient credits</p>
                )}
                {!canHostTryouts && (
                  <p className="text-yellow-400 text-xs">Already used this season</p>
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
                      kicking: candidate.kicking || 20,
                      potentialRating: candidate.overallPotentialStars || '0'
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
                  {addToTaxiSquadMutation.isPending ? "Adding..." : "Add to Taxi Squad"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}