import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Player, Staff } from "@shared/types/models";
import { 
  Heart, 
  AlertTriangle, 
  Clock, 
  Stethoscope, 
  Activity, 
  TrendingUp, 
  UserCheck,
  Calendar,
  DollarSign,
  Target,
  Shield
} from "lucide-react";

interface PlayerInjury {
  id: string;
  playerId: string;
  playerName: string;
  injuryType: string;
  bodyPart: string;
  description: string;
  severity: number;
  recoveryTime: number;
  remainingTime: number;
  isActive: boolean;
  treatmentType: string;
  recurrenceRisk: number;
  performanceImpact: any;
  injuredAt: string;
  expectedRecovery: string;
  actualRecovery?: string;
}

interface MedicalStaff extends Staff {
  specialty?: string;
  experience?: number;
  effectiveness?: number;
}

interface PlayerConditioning {
  id: string;
  playerId: string;
  playerName: string;
  fitnessLevel: number;
  flexibilityScore: number;
  strengthScore: number;
  enduranceScore: number;
  injuryProneness: number;
  trainingLoad: number;
  restDays: number;
  lastPhysical?: string;
}

const severityColors = {
  1: "bg-green-500",
  2: "bg-green-500", 
  3: "bg-yellow-500",
  4: "bg-yellow-500",
  5: "bg-orange-500",
  6: "bg-orange-500",
  7: "bg-red-500",
  8: "bg-red-500",
  9: "bg-red-700",
  10: "bg-red-900"
};

const injuryTypes = [
  "Muscle Strain", "Ligament Sprain", "Fracture", "Concussion", 
  "Torn ACL", "Hamstring Pull", "Shoulder Dislocation", "Ankle Sprain",
  "Back Injury", "Knee Injury", "Wrist Injury", "Overuse Injury"
];

const bodyParts = [
  "Head", "Neck", "Shoulder", "Arm", "Elbow", "Wrist", "Hand",
  "Chest", "Back", "Abdomen", "Hip", "Thigh", "Knee", "Calf", "Ankle", "Foot"
];

const treatmentTypes = [
  "Rest", "Physical Therapy", "Surgery", "Medication", 
  "Ice/Heat Therapy", "Massage", "Acupuncture", "Chiropractic"
];

const medicalSpecialties = [
  "Team Doctor", "Orthopedic Surgeon", "Sports Medicine Physician",
  "Physical Therapist", "Athletic Trainer", "Nutritionist", 
  "Sports Psychologist", "Massage Therapist"
];

export default function InjuryManagement({ teamId }: { teamId: string }) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [showNewInjury, setShowNewInjury] = useState(false);
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Define Player type for useQuery
  // Fetch team injuries
  const { data: injuries = [], isLoading: injuriesLoading } = useQuery<PlayerInjury[]>({
    queryKey: ["/api/injuries", teamId],
    enabled: !!teamId,
  });

  // Fetch medical staff
  const { data: medicalStaff = [] } = useQuery<MedicalStaff[]>({
    queryKey: ["/api/medical-staff", teamId],
    enabled: !!teamId,
  });

  // Fetch player conditioning
  const { data: conditioning = [] } = useQuery<PlayerConditioning[]>({
    queryKey: ["/api/conditioning", teamId],
    enabled: !!teamId,
  });

  // Fetch team players
  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["/api/teams", teamId, "players"],
    enabled: !!teamId,
  });

  // Create injury mutation
  const createInjuryMutation = useMutation({
    mutationFn: async (injuryData: any) => {
      return await apiRequest(`/api/injuries`, "POST", injuryData); // Corrected apiRequest
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/injuries"] });
      toast({ title: "Injury recorded", description: "Player injury has been logged" });
      setShowNewInjury(false);
    },
  });

  // Update treatment mutation
  const updateTreatmentMutation = useMutation({
    mutationFn: async ({ injuryId, treatmentData }: any) => {
      return await apiRequest(`/api/injuries/${injuryId}/treatment`, "PATCH", treatmentData); // Corrected apiRequest
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/injuries"] });
      toast({ title: "Treatment updated", description: "Injury treatment plan updated" });
    },
  });

  // Hire medical staff mutation
  const hireMedicalStaffMutation = useMutation({
    mutationFn: async (staffData: any) => {
      return await apiRequest(`/api/medical-staff`, "POST", { ...staffData, teamId }); // Corrected apiRequest
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-staff"] });
      toast({ title: "Staff hired", description: "New medical staff member added" });
      setShowStaffDialog(false);
    },
  });

  const activeInjuries = injuries.filter((injury: PlayerInjury) => injury.isActive);
  const recoveredInjuries = injuries.filter((injury: PlayerInjury) => !injury.isActive);

  const getSeverityLabel = (severity: number) => {
    if (severity <= 2) return "Minor";
    if (severity <= 4) return "Mild";
    if (severity <= 6) return "Moderate";
    if (severity <= 8) return "Severe";
    return "Critical";
  };

  const getRecoveryProgress = (injury: PlayerInjury) => {
    const totalTime = injury.recoveryTime;
    const remaining = injury.remainingTime;
    return Math.max(0, ((totalTime - remaining) / totalTime) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Injuries</p>
                <p className="text-2xl font-bold text-red-400">{activeInjuries.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Medical Staff</p>
                <p className="text-2xl font-bold text-blue-400">{medicalStaff.length}</p>
              </div>
              <Stethoscope className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg Fitness</p>
                <p className="text-2xl font-bold text-green-400">
                  {conditioning.length > 0 
                    ? Math.round(conditioning.reduce((sum: number, c: PlayerConditioning) => sum + c.fitnessLevel, 0) / conditioning.length)
                    : 0}%
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Prevention Score</p>
                <p className="text-2xl font-bold text-purple-400">85%</p>
              </div>
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="bg-gray-800">
          <TabsTrigger value="active">Active Injuries</TabsTrigger>
          <TabsTrigger value="conditioning">Conditioning</TabsTrigger>
          <TabsTrigger value="staff">Medical Staff</TabsTrigger>
          <TabsTrigger value="history">History & Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Active Injuries</h3>
            <Dialog open={showNewInjury} onOpenChange={setShowNewInjury}>
              <DialogTrigger asChild>
                <Button>Report Injury</Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Report New Injury</DialogTitle>
                </DialogHeader>
                <NewInjuryForm 
                  players={players}
                  onSubmit={(data) => createInjuryMutation.mutate(data)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {activeInjuries.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8 text-center">
                <Heart className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-400">No active injuries - team is healthy!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeInjuries.map((injury: PlayerInjury) => (
                <Card key={injury.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-white">{injury.playerName}</h4>
                        <p className="text-sm text-gray-400">{injury.injuryType} - {injury.bodyPart}</p>
                      </div>
                      <Badge className={`${severityColors[injury.severity as keyof typeof severityColors]} text-white`}>
                        {getSeverityLabel(injury.severity)}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-300 mb-4">{injury.description}</p>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Recovery Progress</span>
                        <span className="text-white">{Math.round(getRecoveryProgress(injury))}%</span>
                      </div>
                      <Progress value={getRecoveryProgress(injury)} className="h-2" />
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                        <div>
                          <span className="text-gray-400">Days Remaining:</span>
                          <span className="text-white ml-2">{injury.remainingTime}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Treatment:</span>
                          <span className="text-white ml-2">{injury.treatmentType}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Recurrence Risk:</span>
                          <span className="text-white ml-2">{injury.recurrenceRisk}%</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Expected Recovery:</span>
                          <span className="text-white ml-2">
                            {new Date(injury.expectedRecovery).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" className="text-xs">
                          Update Treatment
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs">
                          Add Note
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="conditioning" className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Player Conditioning</h3>
          
          <div className="grid gap-4">
            {conditioning.map((player: PlayerConditioning) => (
              <Card key={player.id} className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold text-white">{player.playerName}</h4>
                    <Badge variant={player.fitnessLevel >= 80 ? "default" : player.fitnessLevel >= 60 ? "secondary" : "destructive"}>
                      {player.fitnessLevel}% Fit
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Flexibility:</span>
                      <div className="mt-1">
                        <Progress value={player.flexibilityScore} className="h-2" />
                        <span className="text-white text-xs">{player.flexibilityScore}%</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Strength:</span>
                      <div className="mt-1">
                        <Progress value={player.strengthScore} className="h-2" />
                        <span className="text-white text-xs">{player.strengthScore}%</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Endurance:</span>
                      <div className="mt-1">
                        <Progress value={player.enduranceScore} className="h-2" />
                        <span className="text-white text-xs">{player.enduranceScore}%</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Injury Risk:</span>
                      <div className="mt-1">
                        <Progress value={100 - player.injuryProneness} className="h-2" />
                        <span className="text-white text-xs">{100 - player.injuryProneness}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 text-sm">
                    <span className="text-gray-400">Training Load: {player.trainingLoad}%</span>
                    <span className="text-gray-400">Rest Days: {player.restDays}</span>
                    {player.lastPhysical && (
                      <span className="text-gray-400">
                        Last Physical: {new Date(player.lastPhysical).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" className="text-xs">
                      Adjust Training
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs">
                      Schedule Physical
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Medical Staff</h3>
            <Dialog open={showStaffDialog} onOpenChange={setShowStaffDialog}>
              <DialogTrigger asChild>
                <Button>Hire Staff</Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Hire Medical Staff</DialogTitle>
                </DialogHeader>
                <HireStaffForm 
                  onSubmit={(data) => hireMedicalStaffMutation.mutate(data)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {medicalStaff.map((staff: MedicalStaff) => (
              <Card key={staff.id} className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-white">{staff.name}</h4>
                      <p className="text-sm text-gray-400">{staff.specialty}</p>
                    </div>
                    <Badge variant="outline">{staff.effectiveness}% Effective</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                    <div>
                      <span className="text-gray-400">Experience:</span>
                      <span className="text-white ml-2">{staff.experience} years</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Salary:</span>
                      <span className="text-white ml-2">${staff.salary.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Contract:</span>
                      <span className="text-white ml-2">{staff.contractLength} years</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Injury History & Analytics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Recovery History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recoveredInjuries.slice(0, 5).map((injury: PlayerInjury) => (
                    <div key={injury.id} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                      <div>
                        <p className="text-sm font-medium text-white">{injury.playerName}</p>
                        <p className="text-xs text-gray-400">{injury.injuryType}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">
                          {injury.actualRecovery 
                            ? new Date(injury.actualRecovery).toLocaleDateString()
                            : "In Progress"
                          }
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {injury.recoveryTime} days
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Prevention Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Injury Prevention</span>
                      <span className="text-white">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Recovery Rate</span>
                      <span className="text-white">92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Staff Effectiveness</span>
                      <span className="text-white">78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
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

function NewInjuryForm({ players, onSubmit }: { players: any[], onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    playerId: "",
    injuryType: "",
    bodyPart: "",
    description: "",
    severity: 1,
    recoveryTime: 7,
    treatmentType: "Rest",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      remainingTime: formData.recoveryTime,
      recurrenceRisk: Math.min(50, formData.severity * 5),
      expectedRecovery: new Date(Date.now() + formData.recoveryTime * 24 * 60 * 60 * 1000).toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-white">Player</Label>
        <Select value={formData.playerId} onValueChange={(value) => setFormData({ ...formData, playerId: value })}>
          <SelectTrigger className="bg-gray-700 border-gray-600">
            <SelectValue placeholder="Select player" />
          </SelectTrigger>
          <SelectContent>
            {players.map((player) => (
              <SelectItem key={player.id} value={player.id}>{`${player.firstName} ${player.lastName}`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white">Injury Type</Label>
          <Select value={formData.injuryType} onValueChange={(value) => setFormData({ ...formData, injuryType: value })}>
            <SelectTrigger className="bg-gray-700 border-gray-600">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {injuryTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-white">Body Part</Label>
          <Select value={formData.bodyPart} onValueChange={(value) => setFormData({ ...formData, bodyPart: value })}>
            <SelectTrigger className="bg-gray-700 border-gray-600">
              <SelectValue placeholder="Select body part" />
            </SelectTrigger>
            <SelectContent>
              {bodyParts.map((part) => (
                <SelectItem key={part} value={part}>{part}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-white">Description</Label>
        <Textarea 
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="bg-gray-700 border-gray-600 text-white"
          placeholder="Describe the injury..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white">Severity (1-10)</Label>
          <Input 
            type="number"
            min="1"
            max="10"
            value={formData.severity}
            onChange={(e) => setFormData({ ...formData, severity: parseInt(e.target.value) })}
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>

        <div>
          <Label className="text-white">Recovery Time (days)</Label>
          <Input 
            type="number"
            min="1"
            value={formData.recoveryTime}
            onChange={(e) => setFormData({ ...formData, recoveryTime: parseInt(e.target.value) })}
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>
      </div>

      <div>
        <Label className="text-white">Treatment Type</Label>
        <Select value={formData.treatmentType} onValueChange={(value) => setFormData({ ...formData, treatmentType: value })}>
          <SelectTrigger className="bg-gray-700 border-gray-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {treatmentTypes.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full">Report Injury</Button>
    </form>
  );
}

function HireStaffForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    experience: 1,
    effectiveness: 50,
    salary: 50000,
    contractLength: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-white">Name</Label>
        <Input 
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="bg-gray-700 border-gray-600 text-white"
          placeholder="Staff member name"
        />
      </div>

      <div>
        <Label className="text-white">Specialty</Label>
        <Select value={formData.specialty} onValueChange={(value) => setFormData({ ...formData, specialty: value })}>
          <SelectTrigger className="bg-gray-700 border-gray-600">
            <SelectValue placeholder="Select specialty" />
          </SelectTrigger>
          <SelectContent>
            {medicalSpecialties.map((specialty) => (
              <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white">Experience (years)</Label>
          <Input 
            type="number"
            min="1"
            value={formData.experience}
            onChange={(e) => setFormData({ ...formData, experience: parseInt(e.target.value) })}
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>

        <div>
          <Label className="text-white">Effectiveness (%)</Label>
          <Input 
            type="number"
            min="1"
            max="100"
            value={formData.effectiveness}
            onChange={(e) => setFormData({ ...formData, effectiveness: parseInt(e.target.value) })}
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white">Salary</Label>
          <Input 
            type="number"
            value={formData.salary}
            onChange={(e) => setFormData({ ...formData, salary: parseInt(e.target.value) })}
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>

        <div>
          <Label className="text-white">Contract Length (years)</Label>
          <Input 
            type="number"
            min="1"
            value={formData.contractLength}
            onChange={(e) => setFormData({ ...formData, contractLength: parseInt(e.target.value) })}
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>
      </div>

      <Button type="submit" className="w-full">Hire Staff</Button>
    </form>
  );
}