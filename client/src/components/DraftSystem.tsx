import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Clock, Users, Trophy, Target, Star, TrendingUp, Eye, Calendar, Award } from "lucide-react";
import { AnimatedCounter, PulseWrapper, HoverCard, InteractiveButton, SuccessOverlay } from "@/components/MicroInteractions";

interface Draft {
  id: string;
  year: number;
  status: string;
  totalRounds: number;
  currentRound: number;
  currentPick: number;
  draftDate: string;
}

interface DraftPick {
  id: string;
  draftId: string;
  teamId: string;
  round: number;
  pickNumber: number;
  overallPick: number;
  playerId?: string;
  isTraded: boolean;
  tradedTo?: string;
  pickTime?: string;
  team?: { name: string; logo: string };
  player?: { name: string; race: string; position: string; overall: number };
}

interface RookiePlayer {
  id: string;
  name: string;
  race: string;
  position: string;
  college: string;
  stats: any;
  potential: number;
  draftClass: number;
  isDrafted: boolean;
  scoutingReports?: any;
}

export default function DraftSystem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRookie, setSelectedRookie] = useState<string>("");
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [showScoutingDialog, setShowScoutingDialog] = useState(false);
  const [scoutingTarget, setScoutingTarget] = useState<string>("");
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  const { data: currentDraft } = useQuery({
    queryKey: ["/api/draft/current"],
  });

  const { data: draftBoard } = useQuery({
    queryKey: ["/api/draft/board", currentDraft?.id],
    enabled: !!currentDraft?.id,
  });

  const { data: rookieClass } = useQuery({
    queryKey: ["/api/draft/rookies", currentDraft?.year],
    enabled: !!currentDraft?.year,
  });

  const { data: teamPicks } = useQuery({
    queryKey: ["/api/draft/picks", team?.id],
    enabled: !!team?.id,
  });

  const { data: draftHistory } = useQuery({
    queryKey: ["/api/draft/history"],
  });

  const draftPlayerMutation = useMutation({
    mutationFn: (data: { playerId: string; pickId: string }) =>
      apiRequest(`/api/draft/pick`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft"] });
      setShowDraftDialog(false);
      setShowSuccessOverlay(true);
      toast({
        title: "Player Drafted!",
        description: "Welcome to your team! The rookie is ready to contribute.",
      });
    },
  });

  const scoutPlayerMutation = useMutation({
    mutationFn: (playerId: string) =>
      apiRequest(`/api/draft/scout/${playerId}`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft/rookies"] });
      setShowScoutingDialog(false);
      toast({
        title: "Scouting Report Complete",
        description: "New insights available for this prospect.",
      });
    },
  });

  const tradePickMutation = useMutation({
    mutationFn: (data: { pickId: string; targetTeamId: string; compensation: any }) =>
      apiRequest(`/api/draft/trade`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft/picks"] });
      toast({
        title: "Pick Traded",
        description: "Draft pick successfully traded to another team.",
      });
    },
  });

  const getPositionColor = (position: string) => {
    const colors = {
      'Quarterback': 'bg-red-500',
      'Running Back': 'bg-green-500',
      'Wide Receiver': 'bg-blue-500',
      'Tight End': 'bg-purple-500',
      'Offensive Line': 'bg-gray-500',
      'Defensive Line': 'bg-orange-500',
      'Linebacker': 'bg-yellow-500',
      'Cornerback': 'bg-pink-500',
      'Safety': 'bg-indigo-500',
    };
    return colors[position] || 'bg-gray-500';
  };

  const getPotentialGrade = (potential: number) => {
    if (potential >= 90) return { grade: 'A+', color: 'text-green-400' };
    if (potential >= 85) return { grade: 'A', color: 'text-green-300' };
    if (potential >= 80) return { grade: 'B+', color: 'text-blue-400' };
    if (potential >= 75) return { grade: 'B', color: 'text-blue-300' };
    if (potential >= 70) return { grade: 'C+', color: 'text-yellow-400' };
    if (potential >= 65) return { grade: 'C', color: 'text-yellow-300' };
    return { grade: 'D', color: 'text-red-400' };
  };

  const getCurrentPickTeam = () => {
    if (!currentDraft || !draftBoard) return null;
    return draftBoard.find((pick: DraftPick) => 
      pick.round === currentDraft.currentRound && 
      pick.pickNumber === currentDraft.currentPick
    );
  };

  const isMyPick = () => {
    const currentPick = getCurrentPickTeam();
    return currentPick?.teamId === team?.id;
  };

  const getDraftProgress = () => {
    if (!currentDraft) return 0;
    const totalPicks = currentDraft.totalRounds * 32; // Assuming 32 teams
    const completedPicks = ((currentDraft.currentRound - 1) * 32) + (currentDraft.currentPick - 1);
    return (completedPicks / totalPicks) * 100;
  };

  const handleDraftPlayer = () => {
    const currentPick = getCurrentPickTeam();
    if (!selectedRookie || !currentPick) return;

    draftPlayerMutation.mutate({
      playerId: selectedRookie,
      pickId: currentPick.id,
    });
  };

  return (
    <div className="space-y-6">
      <SuccessOverlay 
        show={showSuccessOverlay} 
        onComplete={() => setShowSuccessOverlay(false)} 
      />

      {/* Draft Status Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <HoverCard>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Draft Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                {currentDraft?.status === "active" ? "LIVE" : currentDraft?.status?.toUpperCase() || "UPCOMING"}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {currentDraft?.year || new Date().getFullYear()} Draft
              </p>
            </CardContent>
          </Card>
        </HoverCard>

        <HoverCard>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Current Pick</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                Round {currentDraft?.currentRound || 1}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Pick {currentDraft?.currentPick || 1} overall
              </p>
            </CardContent>
          </Card>
        </HoverCard>

        <PulseWrapper pulse={isMyPick()}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Your Picks</CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatedCounter 
                value={teamPicks?.filter((p: DraftPick) => !p.playerId).length || 0} 
                className="text-2xl font-bold text-purple-400" 
              />
              <p className="text-xs text-gray-500 mt-1">
                {isMyPick() ? "YOU'RE ON THE CLOCK!" : "remaining picks"}
              </p>
            </CardContent>
          </Card>
        </PulseWrapper>

        <HoverCard>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Draft Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">
                {getDraftProgress().toFixed(1)}%
              </div>
              <Progress value={getDraftProgress()} className="h-2 mt-2" />
            </CardContent>
          </Card>
        </HoverCard>
      </div>

      <Tabs defaultValue="board" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="board">Draft Board</TabsTrigger>
            <TabsTrigger value="prospects">Prospects</TabsTrigger>
            <TabsTrigger value="picks">My Picks</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {isMyPick() && currentDraft?.status === "active" && (
            <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
              <DialogTrigger asChild>
                <InteractiveButton variant="default" className="flex items-center gap-2 animate-pulse">
                  <Trophy className="h-4 w-4" />
                  Make Pick
                </InteractiveButton>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Draft Selection</DialogTitle>
                  <DialogDescription>
                    Choose your pick for Round {currentDraft.currentRound}, Pick {currentDraft.currentPick}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="rookie-select">Available Prospects</Label>
                    <Select value={selectedRookie} onValueChange={setSelectedRookie}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a rookie" />
                      </SelectTrigger>
                      <SelectContent>
                        {rookieClass?.filter((r: RookiePlayer) => !r.isDrafted)
                          .slice(0, 20) // Show top 20 available
                          .map((rookie: RookiePlayer) => {
                            const grade = getPotentialGrade(rookie.potential);
                            return (
                              <SelectItem key={rookie.id} value={rookie.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{rookie.name} - {rookie.position}</span>
                                  <Badge className={grade.color}>{grade.grade}</Badge>
                                </div>
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRookie && (
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      {(() => {
                        const rookie = rookieClass?.find((r: RookiePlayer) => r.id === selectedRookie);
                        const grade = getPotentialGrade(rookie?.potential || 0);
                        return rookie ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{rookie.name}</h4>
                              <Badge className={grade.color}>{grade.grade}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-400">Position:</span>
                                <span className="ml-1">{rookie.position}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">College:</span>
                                <span className="ml-1">{rookie.college}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Race:</span>
                                <span className="ml-1">{rookie.race}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Potential:</span>
                                <span className="ml-1">{rookie.potential}</span>
                              </div>
                            </div>
                            {rookie.scoutingReports && (
                              <div className="mt-2 text-xs">
                                <span className="text-gray-400">Scout Notes:</span>
                                <p className="text-gray-300 mt-1">{rookie.scoutingReports.summary}</p>
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleDraftPlayer}
                    disabled={!selectedRookie || draftPlayerMutation.isPending}
                    className="w-full"
                  >
                    {draftPlayerMutation.isPending ? "Drafting..." : "Draft Player"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="board" className="space-y-4">
          {currentDraft?.status === "active" && (
            <Card className="border-green-500/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <div>
                      <p className="font-medium">
                        Round {currentDraft.currentRound}, Pick {currentDraft.currentPick}
                      </p>
                      <p className="text-sm text-gray-400">
                        {getCurrentPickTeam()?.team?.name || "Loading..."} is on the clock
                      </p>
                    </div>
                  </div>
                  {isMyPick() && (
                    <Badge variant="default" className="animate-pulse">
                      YOUR PICK
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {draftBoard?.slice(0, 20).map((pick: DraftPick) => (
              <Card key={pick.id} className={pick.playerId ? "opacity-60" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="min-w-16 text-center">
                        {pick.overallPick}
                      </Badge>
                      <div>
                        <p className="font-medium">
                          Round {pick.round}, Pick {pick.pickNumber}
                        </p>
                        <p className="text-sm text-gray-400">{pick.team?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {pick.player ? (
                        <div>
                          <p className="font-medium">{pick.player.name}</p>
                          <p className="text-sm text-gray-400">
                            {pick.player.position} • {pick.player.race}
                          </p>
                        </div>
                      ) : (
                        <Badge variant="secondary">Available</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="prospects" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Rookie Prospects</h3>
            <Dialog open={showScoutingDialog} onOpenChange={setShowScoutingDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Scout Player
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Scouting Report</DialogTitle>
                  <DialogDescription>
                    Get detailed analysis on a prospect
                  </DialogDescription>
                </DialogHeader>
                <div>
                  <Label htmlFor="scout-select">Select Prospect</Label>
                  <Select value={scoutingTarget} onValueChange={setScoutingTarget}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose player to scout" />
                    </SelectTrigger>
                    <SelectContent>
                      {rookieClass?.filter((r: RookiePlayer) => !r.isDrafted && !r.scoutingReports)
                        .map((rookie: RookiePlayer) => (
                        <SelectItem key={rookie.id} value={rookie.id}>
                          {rookie.name} - {rookie.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => scoutPlayerMutation.mutate(scoutingTarget)}
                    disabled={!scoutingTarget || scoutPlayerMutation.isPending}
                    className="w-full"
                  >
                    {scoutPlayerMutation.isPending ? "Scouting..." : "Scout Player"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {rookieClass?.filter((r: RookiePlayer) => !r.isDrafted)
              .slice(0, 20)
              .map((rookie: RookiePlayer) => {
                const grade = getPotentialGrade(rookie.potential);
                return (
                  <Card key={rookie.id} className="cursor-pointer hover:bg-gray-800/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${getPositionColor(rookie.position)} flex items-center justify-center`}>
                            <span className="text-white text-xs font-bold">
                              {rookie.position.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{rookie.name}</p>
                            <p className="text-sm text-gray-400">
                              {rookie.position} • {rookie.college}
                            </p>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge className={grade.color}>{grade.grade}</Badge>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400" />
                            <span className="text-xs">{rookie.potential}</span>
                          </div>
                        </div>
                      </div>
                      {rookie.scoutingReports && (
                        <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded">
                          <div className="flex items-center gap-1 text-blue-400 text-xs">
                            <Eye className="h-3 w-3" />
                            <span>Scouted</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>

        <TabsContent value="picks" className="space-y-4">
          <h3 className="text-lg font-semibold">Your Draft Picks</h3>
          <div className="space-y-3">
            {teamPicks?.map((pick: DraftPick) => (
              <Card key={pick.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="min-w-16 text-center">
                        {pick.overallPick}
                      </Badge>
                      <div>
                        <p className="font-medium">
                          Round {pick.round}, Pick {pick.pickNumber}
                        </p>
                        {pick.isTraded && (
                          <p className="text-sm text-orange-400">
                            Traded {pick.tradedTo ? `to ${pick.tradedTo}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {pick.player ? (
                        <div>
                          <p className="font-medium text-green-400">{pick.player.name}</p>
                          <p className="text-sm text-gray-400">
                            {pick.player.position} • Overall: {pick.player.overall}
                          </p>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {!pick.isTraded && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Open trade dialog
                              }}
                            >
                              Trade
                            </Button>
                          )}
                          <Badge variant={pick.isTraded ? "secondary" : "default"}>
                            {pick.isTraded ? "Traded" : "Available"}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <h3 className="text-lg font-semibold">Draft History</h3>
          <div className="space-y-4">
            {draftHistory?.map((draft: any) => (
              <Card key={draft.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{draft.year} Draft</CardTitle>
                    <Badge variant="outline">
                      {draft.completedPicks || 0} picks made
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {draft.notablePicks?.slice(0, 3).map((pick: any) => (
                      <div key={pick.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{pick.overallPick}</Badge>
                          <span className="text-sm">{pick.player.name}</span>
                        </div>
                        <span className="text-sm text-gray-400">{pick.team.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}