import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, Star, Zap, Shield, Heart, Eye, Swords, Brain, Plus, ArrowUp } from "lucide-react";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PlayerSkillsDisplayProps {
  playerId: string;
}

interface SkillTierEffect {
  [key: string]: number;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  roleRestriction?: string;
  raceRestriction?: string;
  tierEffects: {
    1: SkillTierEffect;
    2: SkillTierEffect;
    3: SkillTierEffect;
    4: SkillTierEffect;
  };
  triggerCondition?: string;
}

interface PlayerSkill {
  id: string;
  playerId: string;
  skillId: string;
  currentTier: number;
  acquiredAt: string;
  lastUpgraded?: string;
  triggerCount: number;
  skill: Skill;
}

export default function PlayerSkillsDisplay({ playerId }: PlayerSkillsDisplayProps) {
  const { toast } = useToast();
  const [showAddSkillDialog, setShowAddSkillDialog] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  const { data: playerSkills, isLoading } = useQuery<PlayerSkill[]>({
    queryKey: [`/api/players/${playerId}/skills`],
    enabled: !!playerId,
  });

  const { data: availableSkills } = useQuery<Skill[]>({
    queryKey: [`/api/players/${playerId}/available-skills`],
    enabled: !!playerId && showAddSkillDialog,
  });

  const addSkillMutation = useMutation({
    mutationFn: async (skillId: string) => {
      const response = await apiRequest(
        `/api/players/${playerId}/skills`,
        "POST",
        { skillId }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/players/${playerId}/skills`] });
      queryClient.invalidateQueries({ queryKey: [`/api/players/${playerId}/available-skills`] });
      toast({
        title: "Skill Added",
        description: "Player has learned a new skill!",
      });
      setShowAddSkillDialog(false);
      setSelectedSkillId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Skill",
        description: error.message || "Could not add skill to player",
        variant: "destructive",
      });
    },
  });

  const upgradeSkillMutation = useMutation({
    mutationFn: async ({ playerId, skillId }: { playerId: string; skillId: string }) => {
      const response = await apiRequest(
        `/api/players/${playerId}/skills/${skillId}/upgrade`,
        "POST"
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/players/${playerId}/skills`] });
      toast({
        title: "Skill Upgraded",
        description: "Skill has been upgraded to the next tier!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Upgrade Skill",
        description: error.message || "Could not upgrade skill",
        variant: "destructive",
      });
    },
  });

  const getSkillIcon = (skillName: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
      "Second Wind": <Heart className="h-4 w-4" />,
      "Clutch Performer": <Star className="h-4 w-4" />,
      "Durable": <Shield className="h-4 w-4" />,
      "Quick Recovery": <Zap className="h-4 w-4" />,
      "Deadeye": <Eye className="h-4 w-4" />,
      "Pocket Presence": <Brain className="h-4 w-4" />,
      "Juke Move": <Sparkles className="h-4 w-4" />,
      "Truck Stick": <Swords className="h-4 w-4" />,
      "Pancake Block": <Shield className="h-4 w-4" />,
      "Bodyguard": <Shield className="h-4 w-4" />,
      "Photosynthesis": <Sparkles className="h-4 w-4" />,
      "Unshakeable": <Shield className="h-4 w-4" />,
      "Master Craftsman": <Swords className="h-4 w-4" />,
      "Healing Light": <Heart className="h-4 w-4" />,
      "Shadow Step": <Eye className="h-4 w-4" />,
      "Adaptable": <Brain className="h-4 w-4" />,
    };
    return iconMap[skillName] || <Sparkles className="h-4 w-4" />;
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1: return "bg-gray-500";
      case 2: return "bg-green-500";
      case 3: return "bg-blue-500";
      case 4: return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const getTierName = (tier: number) => {
    switch (tier) {
      case 1: return "Common";
      case 2: return "Uncommon";
      case 3: return "Rare";
      case 4: return "Epic";
      default: return "Unknown";
    }
  };

  const getSkillTypeColor = (type: string) => {
    return type === "Passive" ? "bg-blue-600" : "bg-orange-600";
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Universal": return "bg-gray-600";
      case "Role": return "bg-green-600";
      case "Race": return "bg-purple-600";
      default: return "bg-gray-600";
    }
  };

  const formatEffects = (effects: SkillTierEffect) => {
    return Object.entries(effects).map(([key, value]) => {
      const formatted = key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());
      return `${formatted}: +${value}${key.includes("Chance") || key.includes("Bonus") || key.includes("Rate") ? "%" : ""}`;
    }).join(", ");
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (!playerSkills || playerSkills.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500 dark:text-gray-400">
            No skills acquired yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Player Skills</h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {playerSkills.length}/3 Skills
          </Badge>
          {playerSkills.length < 3 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddSkillDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Skill
            </Button>
          )}
        </div>
      </div>
      
      {playerSkills.map((playerSkill) => (
        <Card key={playerSkill.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {getSkillIcon(playerSkill.skill.name)}
                <CardTitle className="text-base">{playerSkill.skill.name}</CardTitle>
              </div>
              <div className="flex gap-2">
                <Badge className={getTierColor(playerSkill.currentTier)}>
                  {getTierName(playerSkill.currentTier)} (Tier {playerSkill.currentTier})
                </Badge>
                <Badge className={getSkillTypeColor(playerSkill.skill.type)}>
                  {playerSkill.skill.type}
                </Badge>
                <Badge className={getCategoryColor(playerSkill.skill.category)}>
                  {playerSkill.skill.category}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {playerSkill.skill.description}
            </p>
            
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Skill Progression</span>
                <span className="text-xs text-gray-500">Tier {playerSkill.currentTier}/4</span>
              </div>
              <Progress value={playerSkill.currentTier * 25} className="h-2" />
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Current Effect:</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {formatEffects(playerSkill.skill.tierEffects[playerSkill.currentTier as keyof typeof playerSkill.skill.tierEffects])}
              </p>
              {playerSkill.currentTier < 4 && (
                <>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-2">Next Tier:</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {formatEffects(playerSkill.skill.tierEffects[(playerSkill.currentTier + 1) as keyof typeof playerSkill.skill.tierEffects])}
                  </p>
                </>
              )}
            </div>
            
            {playerSkill.skill.type === "Active" && (
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">Triggered:</span> {playerSkill.triggerCount} times
              </div>
            )}
            
            {playerSkill.currentTier < 4 && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() => upgradeSkillMutation.mutate({ playerId, skillId: playerSkill.skillId })}
                disabled={upgradeSkillMutation.isPending}
              >
                <ArrowUp className="h-4 w-4 mr-1" />
                Upgrade to Tier {playerSkill.currentTier + 1}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Add Skill Dialog */}
      <Dialog open={showAddSkillDialog} onOpenChange={setShowAddSkillDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Skill</DialogTitle>
            <DialogDescription>
              Choose a skill for your player to learn. Players can have a maximum of 3 skills.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {availableSkills?.map((skill) => (
              <Card 
                key={skill.id} 
                className={`cursor-pointer transition-colors ${selectedSkillId === skill.id ? 'border-primary' : 'hover:border-gray-400'}`}
                onClick={() => setSelectedSkillId(skill.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getSkillIcon(skill.name)}
                      <CardTitle className="text-base">{skill.name}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getSkillTypeColor(skill.type)}>
                        {skill.type}
                      </Badge>
                      <Badge className={getCategoryColor(skill.category)}>
                        {skill.category}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {skill.description}
                  </p>
                  
                  <div className="space-y-2 text-xs">
                    <div className="font-semibold">Effects by Tier:</div>
                    {Object.entries(skill.tierEffects).map(([tier, effects]) => (
                      <div key={tier} className="pl-4">
                        <span className="font-medium">Tier {tier}:</span> {formatEffects(effects)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddSkillDialog(false);
                setSelectedSkillId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedSkillId && addSkillMutation.mutate(selectedSkillId)}
              disabled={!selectedSkillId || addSkillMutation.isPending}
            >
              Add Skill
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}