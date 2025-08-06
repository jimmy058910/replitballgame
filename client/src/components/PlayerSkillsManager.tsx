import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Zap, Trophy, Star, TrendingUp, Users, Target, Shield, Bolt } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'Universal' | 'Passer' | 'Runner' | 'Blocker' | 'Human' | 'Sylvan' | 'Gryll' | 'Lumina' | 'Umbra';
  tier: 'Basic' | 'Advanced' | 'Elite' | 'Legendary';
  effects: Record<string, number>;
}

interface PlayerSkill {
  id: string;
  playerId: string;
  skillId: string;
  tier: 'Basic' | 'Advanced' | 'Elite' | 'Legendary';
  acquiredDate: string;
  skill: Skill;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  race: string;
  leadership: number;
  playerSkills: PlayerSkill[];
}

interface TeamSummary {
  teamName: string;
  totalSkills: number;
  skillsByCategory: Record<string, number>;
  averageSkillLevel: number;
  topSkillTiers: Record<string, number>;
}

const SkillIcon = ({ category }: { category: string }) => {
  const iconMap = {
    Universal: Star,
    Passer: Target,
    Runner: Bolt,
    Blocker: Shield,
    Human: Users,
    Sylvan: TrendingUp,
    Gryll: Trophy,
    Lumina: Zap,
    Umbra: Star
  };
  const Icon = iconMap[category as keyof typeof iconMap] || Star;
  return <Icon className="w-4 h-4" />;
};

const TierBadge = ({ tier }: { tier: string }) => {
  const variants = {
    Basic: 'bg-gray-500',
    Advanced: 'bg-blue-500',
    Elite: 'bg-purple-500',
    Legendary: 'bg-yellow-500'
  };
  return (
    <Badge className={`${variants[tier as keyof typeof variants]} text-white`}>
      {tier}
    </Badge>
  );
};

export default function PlayerSkillsManager({ teamId }: { teamId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  // Fetch team summary
  const { data: teamSummary, isLoading: loadingSummary } = useQuery<any>({
    queryKey: ['/api/player-skills/team-summary', teamId],
    enabled: !!teamId
  });

  // Fetch all available skills
  const { data: availableSkills } = useQuery<any[]>({
    queryKey: ['/api/player-skills/available-skills']
  });

  // Fetch team players with skills
  const { data: players, isLoading: loadingPlayers } = useQuery<any[]>({
    queryKey: ['/api/player-skills/team-players', teamId],
    enabled: !!teamId
  });

  // Skill acquisition mutation
  const acquireSkillMutation = useMutation({
    mutationFn: (data: { playerId: string; skillId: string }) =>
      apiRequest(`/api/player-skills/acquire/${data.playerId}`, 'POST', { skillId: data.skillId }),
    onSuccess: () => {
      toast({
        title: 'Skill Acquired',
        description: 'Player has successfully learned a new skill!'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/player-skills'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Acquisition Failed',
        description: error.message || 'Failed to acquire skill',
        variant: 'destructive'
      });
    }
  });

  // Skill upgrade mutation
  const upgradeSkillMutation = useMutation({
    mutationFn: (data: { playerId: string; skillId: string }) =>
      apiRequest(`/api/player-skills/upgrade/${data.playerId}`, 'POST', { skillId: data.skillId }),
    onSuccess: () => {
      toast({
        title: 'Skill Upgraded',
        description: 'Player skill has been upgraded to the next tier!'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/player-skills'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Upgrade Failed',
        description: error.message || 'Failed to upgrade skill',
        variant: 'destructive'
      });
    }
  });

  const selectedPlayerData = players?.find((p: Player) => p.id === selectedPlayer);

  const getCategoryColor = (category: string) => {
    const colors = {
      Universal: 'text-yellow-600',
      Passer: 'text-blue-600',
      Runner: 'text-green-600',
      Blocker: 'text-red-600',
      Human: 'text-gray-600',
      Sylvan: 'text-emerald-600',
      Gryll: 'text-amber-600',
      Lumina: 'text-cyan-600',
      Umbra: 'text-purple-600'
    };
    return colors[category as keyof typeof colors] || 'text-gray-600';
  };

  if (loadingSummary || loadingPlayers) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Player Skills Management</h2>
          <p className="text-gray-600">Develop your players through advanced skill acquisition and progression</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Total Skills</div>
          <div className="text-2xl font-bold">{teamSummary?.totalSkills || 0}</div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="players">Player Skills</TabsTrigger>
          <TabsTrigger value="acquisition">Skill Acquisition</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamSummary?.totalSkills || 0}</div>
                <p className="text-xs text-muted-foreground">Across all players</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Level</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {teamSummary?.averageSkillLevel?.toFixed(1) || '0.0'}
                </div>
                <p className="text-xs text-muted-foreground">Skill tier average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Elite Skills</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(teamSummary?.topSkillTiers?.Elite || 0) + (teamSummary?.topSkillTiers?.Legendary || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Elite & Legendary combined</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.keys(teamSummary?.skillsByCategory || {}).length}
                </div>
                <p className="text-xs text-muted-foreground">Skill categories represented</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Skills by Category</CardTitle>
              <CardDescription>Distribution of skills across different categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(teamSummary?.skillsByCategory || {}).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <SkillIcon category={category} />
                      <span className={getCategoryColor(category)}>{category}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{count}</span>
                      <div className="w-24 h-2 bg-gray-200 rounded">
                        <div 
                          className="h-2 bg-blue-500 rounded"
                          style={{ width: `${Math.min((count / (teamSummary?.totalSkills || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Team Roster</CardTitle>
                <CardDescription>Select a player to view their skills</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {players?.map((player: Player) => (
                    <Button
                      key={player.id}
                      variant={selectedPlayer === player.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedPlayer(player.id)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{player.firstName} {player.lastName}</span>
                        <div className="flex items-center space-x-1">
                          <Badge variant="secondary" className="text-xs">
                            {player.position}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {player.playerSkills?.length || 0}/3
                          </span>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {selectedPlayerData ? `${selectedPlayerData.firstName} ${selectedPlayerData.lastName}` : 'Player Skills'}
                </CardTitle>
                <CardDescription>
                  {selectedPlayerData ? 
                    `${selectedPlayerData.position} • ${selectedPlayerData.race} • Leadership: ${selectedPlayerData.leadership}` :
                    'Select a player to view their skills'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedPlayerData ? (
                  <div className="space-y-4">
                    {selectedPlayerData.playerSkills?.length > 0 ? (
                      <div className="space-y-3">
                        {selectedPlayerData.playerSkills.map((playerSkill: PlayerSkill) => (
                          <Card key={playerSkill.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <SkillIcon category={playerSkill.skill.category} />
                                <div>
                                  <h4 className="font-medium">{playerSkill.skill.name}</h4>
                                  <p className="text-sm text-gray-600">{playerSkill.skill.description}</p>
                                  <div className="flex items-center space-x-2 mt-2">
                                    <TierBadge tier={playerSkill.tier} />
                                    <span className={`text-xs ${getCategoryColor(playerSkill.skill.category)}`}>
                                      {playerSkill.skill.category}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-500">Acquired</div>
                                <div className="text-xs">
                                  {new Date(playerSkill.acquiredDate).toLocaleDateString()}
                                </div>
                                {playerSkill.tier !== 'Legendary' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-2"
                                    onClick={() => upgradeSkillMutation.mutate({
                                      playerId: selectedPlayerData.id,
                                      skillId: playerSkill.skillId
                                    })}
                                    disabled={upgradeSkillMutation.isPending}
                                  >
                                    Upgrade
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Star className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No Skills Yet</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          This player hasn't acquired any skills yet. Use the Skill Acquisition tab to help them learn new abilities.
                        </p>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        Skill Slots: {selectedPlayerData.playerSkills?.length || 0}/3
                      </div>
                      <Progress 
                        value={((selectedPlayerData.playerSkills?.length || 0) / 3) * 100} 
                        className="mt-2"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Select a Player</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Choose a player from the roster to view their current skills and upgrade options.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="acquisition" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Skill Acquisition System</CardTitle>
              <CardDescription>
                Players can acquire new skills through training, leadership development, and seasonal progression.
                Each player can have a maximum of 3 skills.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Acquisition Methods</h4>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium text-sm">Leadership Development</h5>
                      <p className="text-xs text-gray-600 mt-1">
                        Players with high leadership (25+) have better chances of acquiring advanced skills
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium text-sm">Seasonal Progression</h5>
                      <p className="text-xs text-gray-600 mt-1">
                        Skills can be gained naturally during end-of-season progression events
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium text-sm">Race & Position Affinity</h5>
                      <p className="text-xs text-gray-600 mt-1">
                        Certain skills are more likely to be acquired based on player race and position
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Skill Categories</h4>
                  <div className="space-y-2">
                    {availableSkills && Object.entries(
                      availableSkills.reduce((acc: any, skill: Skill) => {
                        acc[skill.category] = (acc[skill.category] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          <SkillIcon category={category} />
                          <span className={`text-sm ${getCategoryColor(category)}`}>{category}</span>
                        </div>
                        <span className="text-sm font-medium">{count} skills</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tier Distribution</CardTitle>
                <CardDescription>Skills by tier across your team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(teamSummary?.topSkillTiers || {}).map(([tier, count]) => (
                    <div key={tier} className="flex items-center justify-between">
                      <TierBadge tier={tier} />
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{count}</span>
                        <div className="w-24 h-2 bg-gray-200 rounded">
                          <div 
                            className="h-2 bg-purple-500 rounded"
                            style={{ width: `${Math.min((count / (teamSummary?.totalSkills || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Development Opportunities</CardTitle>
                <CardDescription>Players ready for skill acquisition</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {players?.filter((p: Player) => (p.playerSkills?.length || 0) < 3).map((player: Player) => (
                    <div key={player.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium text-sm">{player.firstName} {player.lastName}</div>
                        <div className="text-xs text-gray-600">
                          {player.position} • Leadership: {player.leadership}
                        </div>
                      </div>
                      <div className="text-xs">
                        {3 - (player.playerSkills?.length || 0)} slot{3 - (player.playerSkills?.length || 0) !== 1 ? 's' : ''} available
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}