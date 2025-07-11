import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, TrendingUp, Shield, Search, UserCheck, Award } from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  type: string;
  level: number;
  salary: number;
  offenseRating: number;
  defenseRating: number;
  physicalRating: number;
  scoutingRating: number;
  recruitingRating: number;
  recoveryRating: number;
  coachingRating: number;
}

interface StaffManagementProps {
  teamId: string;
}

export default function StaffManagement({ teamId }: StaffManagementProps) {
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  const { data: rawStaff, isLoading, error } = useQuery({
    queryKey: [`/api/teams/${teamId}/staff`],
    enabled: !!teamId,
  });
  const staff = (rawStaff || []) as StaffMember[];

  const hireMutation = useMutation({
    mutationFn: async (staffData: any) => {
      return apiRequest(`/api/teams/${teamId}/staff`, "POST", staffData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/staff`] });
    },
  });

  const fireStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      return apiRequest(`/api/teams/${teamId}/staff/${staffId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/staff`] });
    },
  });

  const staffTypes = [
    {
      type: "head_coach",
      name: "Head Coach",
      icon: Award,
      description: "Accelerates player progression and team camaraderie",
      maxLevel: 5,
      primaryStats: ["motivation", "development", "tactics"],
      baseSalary: 15000,
    },
    {
      type: "trainer_offense",
      name: "Offense Trainer",
      icon: TrendingUp,
      description: "Improves throwing, catching, and agility skills",
      maxLevel: 4,
      primaryStats: ["teaching"],
      baseSalary: 8000,
    },
    {
      type: "trainer_defense",
      name: "Defense Trainer", 
      icon: Shield,
      description: "Enhances blocking, power, and stamina",
      maxLevel: 4,
      primaryStats: ["teaching"],
      baseSalary: 8000,
    },
    {
      type: "trainer_physical",
      name: "Physical Trainer",
      icon: Users,
      description: "Focuses on speed, power, and injury prevention",
      maxLevel: 4,
      primaryStats: ["teaching"],
      baseSalary: 8000,
    },
    {
      type: "head_scout",
      name: "Head Scout",
      icon: Search,
      description: "Provides accurate player ratings and potential analysis",
      maxLevel: 5,
      primaryStats: ["talentIdentification", "potentialAssessment"],
      baseSalary: 12000,
    },
    {
      type: "recruiting_scout",
      name: "Recruiting Scout",
      icon: UserCheck,
      description: "Attracts better talent for tryouts and marketplace",
      maxLevel: 4,
      primaryStats: ["talentIdentification", "potentialAssessment"],
      baseSalary: 10000,
    },
    {
      type: "recovery_specialist",
      name: "Recovery Specialist",
      icon: Shield,
      description: "Reduces injury risk and improves recovery time",
      maxLevel: 4,
      primaryStats: ["physiology"],
      baseSalary: 9000,
    },
  ];

  const getStaffByType = (type: string) => {
    // Handle mapping between UI types and database types
    switch (type) {
      case "head_coach":
        return staff?.find((member: StaffMember) => 
          member.type === "HEAD_COACH"
        );
      case "trainer_offense":
        return staff?.find((member: StaffMember) => 
          member.type === "PASSER_TRAINER"
        );
      case "trainer_defense":
        return staff?.find((member: StaffMember) => 
          member.type === "BLOCKER_TRAINER"
        );
      case "trainer_physical":
        return staff?.find((member: StaffMember) => 
          member.type === "RUNNER_TRAINER"
        );
      case "recovery_specialist":
        return staff?.find((member: StaffMember) => 
          member.type === "RECOVERY_SPECIALIST"
        );
      case "head_scout":
        return staff?.find((member: StaffMember) => 
          member.type === "SCOUT" && member.name === "Tony Scout"
        );
      case "recruiting_scout":
        return staff?.find((member: StaffMember) => 
          member.type === "SCOUT" && member.name === "Emma Talent"
        );
      default:
        return staff?.find((member: StaffMember) => member.type === type);
    }
  };

  const calculateSalary = (type: string, level: number) => {
    const staffType = staffTypes.find(s => s.type === type);
    return (staffType?.baseSalary || 5000) * level;
  };

  const getStatDisplayName = (statName: string) => {
    const statMap = {
      'motivation': 'Motivation',
      'development': 'Development',
      'tactics': 'Tactics',
      'teaching': 'Teaching',
      'physiology': 'Physiology',
      'talentIdentification': 'Talent ID',
      'potentialAssessment': 'Potential Analysis'
    };
    return statMap[statName as keyof typeof statMap] || statName;
  };

  const renderStaffSlot = (staffType: any) => {
    const currentStaff = getStaffByType(staffType.type);
    const Icon = staffType.icon;

    return (
      <Card key={staffType.type} className="relative">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon size={24} />
            {staffType.name}
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {staffType.description}
          </p>
        </CardHeader>
        <CardContent>
          {currentStaff ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">{currentStaff.name}</span>
                <Badge variant="outline">Level {currentStaff.level}</Badge>
              </div>
              
              <div className="space-y-2">
                {staffType.primaryStats.map((stat: string) => {
                  const value = currentStaff[stat as keyof StaffMember] as number;
                  return (
                    <div key={stat}>
                      <div className="flex justify-between text-sm">
                        <span>{getStatDisplayName(stat)}</span>
                        <span>{value || 0}/40</span>
                      </div>
                      <Progress value={((value || 0) / 40) * 100} className="h-2" />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-gray-600">
                  ${calculateSalary(staffType.type, currentStaff.level || 1).toLocaleString()}/season
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => fireStaffMutation.mutate(currentStaff.id)}
                >
                  Release
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-3">No {staffType.name} hired</p>
              <Button
                onClick={() => {
                  const newStaff = {
                    type: staffType.type,
                    name: `${staffType.name} ${Math.floor(Math.random() * 999)}`,
                    level: 1,
                    salary: calculateSalary(staffType.type, 1),
                    [staffType.primaryStats[0]]: 60 + Math.floor(Math.random() * 20),
                  };
                  hireMutation.mutate(newStaff);
                }}
                disabled={hireMutation.isPending}
              >
                Hire ({calculateSalary(staffType.type, 1).toLocaleString()}/season)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">Error loading staff: {error.message}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Staff Management</h2>
        <div className="text-right">
          <p className="text-sm text-gray-600">Total Staff Salaries</p>
          <p className="text-xl font-bold">
            ${staff?.reduce((total: number, member: StaffMember) => {
              const staffType = staffTypes.find(s => s.type === member.type.toLowerCase() || 
                (s.type === 'head_coach' && member.type === 'HEAD_COACH') ||
                (s.type === 'trainer_offense' && member.type === 'PASSER_TRAINER') ||
                (s.type === 'trainer_defense' && member.type === 'BLOCKER_TRAINER') ||
                (s.type === 'trainer_physical' && member.type === 'RUNNER_TRAINER') ||
                (s.type === 'recovery_specialist' && member.type === 'RECOVERY_SPECIALIST') ||
                (s.type === 'head_scout' && member.type === 'SCOUT')
              );
              return total + (staffType ? staffType.baseSalary * (member.level || 1) : 5000);
            }, 0).toLocaleString()}/season
          </p>
        </div>
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Current Staff</TabsTrigger>
          <TabsTrigger value="effects">Staff Effects</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffTypes.map(renderStaffSlot)}
          </div>
        </TabsContent>

        <TabsContent value="effects">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Training Bonuses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Offense Training</h4>
                  <div className="text-sm text-gray-600">
                    {getStaffByType("trainer_offense") ? (
                      `+${Math.floor((getStaffByType("trainer_offense")?.offenseRating || 0) / 10)}% to throwing, catching, agility progression`
                    ) : (
                      "No offense trainer hired"
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Defense Training</h4>
                  <div className="text-sm text-gray-600">
                    {getStaffByType("trainer_defense") ? (
                      `+${Math.floor((getStaffByType("trainer_defense")?.defenseRating || 0) / 10)}% to power, stamina progression`
                    ) : (
                      "No defense trainer hired"
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Physical Training</h4>
                  <div className="text-sm text-gray-600">
                    {getStaffByType("trainer_physical") ? (
                      `+${Math.floor((getStaffByType("trainer_physical")?.physicalRating || 0) / 10)}% to speed, power progression`
                    ) : (
                      "No physical trainer hired"
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Benefits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Scouting Accuracy</h4>
                  <div className="text-sm text-gray-600">
                    {getStaffByType("head_scout") ? (
                      `${Math.floor((getStaffByType("head_scout")?.scoutingRating || 0) / 2)}% more accurate player ratings revealed`
                    ) : (
                      "Basic scouting accuracy"
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Injury Prevention</h4>
                  <div className="text-sm text-gray-600">
                    {getStaffByType("recovery_specialist") ? (
                      `${Math.floor((getStaffByType("recovery_specialist")?.recoveryRating || 0) / 5)}% reduced injury risk`
                    ) : (
                      "No injury prevention specialist"
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Team Chemistry</h4>
                  <div className="text-sm text-gray-600">
                    {getStaffByType("head_coach") ? (
                      `+${Math.floor((getStaffByType("head_coach")?.coachingRating || 0) / 8)}/season camaraderie for all players`
                    ) : (
                      "No head coach benefits"
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}