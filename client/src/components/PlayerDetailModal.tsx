import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Shield, Shirt, ShirtIcon, Hand } from "lucide-react";
import AbilitiesDisplay from "@/components/AbilitiesDisplay";

interface PlayerDetailModalProps {
  player: any;
  isOpen: boolean;
  onClose: () => void;
  onContractNegotiate?: (playerId: string) => void;
  onEquipmentChange?: (playerId: string, slot: string, itemId: string) => void;
}

const roleColors = {
  Passer: "text-blue-400 border-blue-400",
  Runner: "text-green-400 border-green-400", 
  Blocker: "text-red-400 border-red-400",
};

const raceColors = {
  human: "race-human",
  sylvan: "race-sylvan",
  gryll: "race-gryll",
  lumina: "race-lumina",
  umbra: "race-umbra",
};

export default function PlayerDetailModal({ 
  player, 
  isOpen, 
  onClose, 
  onContractNegotiate,
  onEquipmentChange 
}: PlayerDetailModalProps) {
  const [activeTab, setActiveTab] = useState("stats");

  if (!player) return null;

  // Helper function to determine player role
  const getPlayerRole = (player: any): string => {
    if (!player) return "Player";
    
    const { speed = 0, agility = 0, catching = 0, throwing = 0, power = 0, leadership = 0, stamina = 0 } = player;
    
    const passerScore = (throwing * 2) + (leadership * 1.5);
    const runnerScore = (speed * 2) + (agility * 1.5);
    const blockerScore = (power * 2) + (stamina * 1.5);
    
    const maxScore = Math.max(passerScore, runnerScore, blockerScore);
    
    if (maxScore === passerScore) return "Passer";
    if (maxScore === runnerScore) return "Runner";
    return "Blocker";
  };

  const playerRole = getPlayerRole(player);
  const raceColorClass = raceColors[player.race as keyof typeof raceColors] || "race-human";

  // Calculate contract status
  const contractRemaining = (player.contractSeasons || 3) - (player.contractStartSeason || 0);
  const contractStatus = contractRemaining <= 1 ? "expiring" : contractRemaining <= 2 ? "moderate" : "stable";

  // Mock equipment data - this would come from the database
  const equipment = {
    helmet: player.helmetItem || { name: "Basic Helmet", rarity: "common", statBoosts: {} },
    chest: player.chestItem || { name: "Basic Chest Armor", rarity: "common", statBoosts: {} },
    shoes: player.shoesItem || { name: "Basic Shoes", rarity: "common", statBoosts: {} },
    gloves: player.glovesItem || { name: "Basic Gloves", rarity: "common", statBoosts: {} },
  };

  const renderStatsBar = (label: string, current: number, potential: number | null) => {
    const currentStat = current || 0;
    const potentialNum = potential ? parseFloat(potential.toString()) : 0;
    const maxPossible = Math.min(40, currentStat + (potentialNum * 5)); // Potential growth calculation
    
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>{label}</span>
          <span className="font-semibold">{currentStat}/40</span>
        </div>
        <div className="relative">
          <Progress value={(currentStat / 40) * 100} className="h-2" />
          {potentialNum > 0 && (
            <div 
              className="absolute top-0 h-2 bg-yellow-400/30 rounded-full"
              style={{ 
                left: `${(currentStat / 40) * 100}%`,
                width: `${((maxPossible - currentStat) / 40) * 100}%`
              }}
            />
          )}
        </div>
        {potentialNum > 0 && (
          <div className="text-xs text-yellow-400">
            Growth potential: {potentialNum.toFixed(1)} stars
          </div>
        )}
      </div>
    );
  };

  const equipmentSlots = [
    { key: "helmet", icon: Shield, label: "Helmet" },
    { key: "chest", icon: Shirt, label: "Chest Armor" },
    { key: "shoes", icon: ShirtIcon, label: "Shoes" },
    { key: "gloves", icon: Hand, label: "Gloves" },
  ];

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common": return "text-gray-400 border-gray-400";
      case "rare": return "text-blue-400 border-blue-400";
      case "epic": return "text-purple-400 border-purple-400";
      case "legendary": return "text-yellow-400 border-yellow-400";
      default: return "text-gray-400 border-gray-400";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-12 h-12 bg-${raceColorClass} bg-opacity-20 rounded-full border-2 border-${raceColorClass} flex items-center justify-center`}>
              <span className={`text-lg font-bold text-${raceColorClass}`}>
                {(player.firstName || player.name || "P").charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {player.firstName && player.lastName 
                  ? `${player.firstName} ${player.lastName}` 
                  : player.name || "Unknown Player"}
              </h2>
              <div className="flex items-center gap-2">
                <Badge className={roleColors[playerRole as keyof typeof roleColors]}>
                  {playerRole}
                </Badge>
                <Badge variant="outline">
                  {player.race ? player.race.charAt(0).toUpperCase() + player.race.slice(1) : "Unknown"}
                </Badge>
                <Badge variant="outline">Age {player.age || "Unknown"}</Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="abilities">Abilities</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="contract">Contract</TabsTrigger>
            <TabsTrigger value="development">Scouting</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Core Attributes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {renderStatsBar("Speed", player.speed, player.speedPotential)}
                  {renderStatsBar("Power", player.power, player.powerPotential)}
                  {renderStatsBar("Throwing", player.throwing, player.throwingPotential)}
                  {renderStatsBar("Catching", player.catching, player.catchingPotential)}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Secondary Attributes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {renderStatsBar("Kicking", player.kicking, player.kickingPotential)}
                  {renderStatsBar("Stamina", player.stamina, player.staminaPotential)}
                  {renderStatsBar("Leadership", player.leadership, player.leadershipPotential)}
                  {renderStatsBar("Agility", player.agility, player.agilityPotential)}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-400">
                      {Math.round((player.throwing + player.leadership + player.catching) / 3)}
                    </div>
                    <div className="text-sm text-gray-500">Passing Rating</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">
                      {Math.round((player.speed + player.agility + player.stamina) / 3)}
                    </div>
                    <div className="text-sm text-gray-500">Mobility Rating</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">
                      {Math.round((player.power + player.stamina + player.leadership) / 3)}
                    </div>
                    <div className="text-sm text-gray-500">Blocking Rating</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipment" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {equipmentSlots.map(({ key, icon: Icon, label }) => {
                const item = equipment[key as keyof typeof equipment];
                return (
                  <Card key={key}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Icon size={20} />
                        {label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`p-3 border rounded-lg ${getRarityColor(item.rarity)}`}>
                        <div className="font-semibold">{item.name}</div>
                        <Badge variant="outline" className="mt-1">
                          {item.rarity}
                        </Badge>
                        {Object.keys(item.statBoosts || {}).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {Object.entries(item.statBoosts || {}).map(([stat, boost]) => (
                              <div key={stat} className="text-sm flex justify-between">
                                <span>{stat}:</span>
                                <span className="text-green-400">+{boost}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-3"
                        onClick={() => onEquipmentChange?.(player.id, key, "")}
                      >
                        Change Equipment
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="abilities" className="space-y-4">
            <AbilitiesDisplay player={player} canTrain={true} />
          </TabsContent>

          <TabsContent value="contract" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contract Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Current Salary</label>
                    <div className="text-xl font-bold text-green-400">
                      ${player.salary?.toLocaleString()}/season
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Contract Status</label>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        contractStatus === "expiring" ? "destructive" : 
                        contractStatus === "moderate" ? "secondary" : "default"
                      }>
                        {contractRemaining} seasons remaining
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <label className="text-sm text-gray-500">Team Camaraderie</label>
                  <div className="mt-1">
                    <Progress value={player.camaraderie || 50} className="h-3" />
                    <div className="text-sm text-gray-500 mt-1">
                      {player.camaraderie || 50}/100 - {
                        (player.camaraderie || 50) >= 80 ? "Excellent" :
                        (player.camaraderie || 50) >= 60 ? "Good" :
                        (player.camaraderie || 50) >= 40 ? "Average" : "Poor"
                      }
                    </div>
                  </div>
                </div>

                {contractRemaining <= 1 && (
                  <Button 
                    onClick={() => onContractNegotiate?.(player.id)}
                    className="w-full"
                  >
                    Negotiate Contract Extension
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="development" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Growth Potential</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: "Speed", potential: player.speedPotential },
                      { name: "Power", potential: player.powerPotential },
                      { name: "Throwing", potential: player.throwingPotential },
                      { name: "Catching", potential: player.catchingPotential },
                      { name: "Kicking", potential: player.kickingPotential },
                      { name: "Stamina", potential: player.staminaPotential },
                      { name: "Leadership", potential: player.leadershipPotential },
                      { name: "Agility", potential: player.agilityPotential },
                    ].map((attr) => {
                      // Calculate potential based on player stats if not available
                      let potentialRating = attr.potential;
                      if (!potentialRating || potentialRating === 0) {
                        // Generate a reasonable potential based on current stat and age
                        const currentStat = player[attr.name.toLowerCase()] || 0;
                        const age = player.age || 25;
                        const ageFactor = Math.max(0.1, (35 - age) / 10); // Younger players have more potential
                        const statFactor = Math.max(0.5, (40 - currentStat) / 40); // Room for growth
                        potentialRating = Math.min(5, Math.max(0.5, ageFactor * statFactor * 5));
                      }
                      
                      return (
                        <div key={attr.name} className="flex justify-between items-center">
                          <span className="text-sm">{attr.name}</span>
                          <div className="flex items-center gap-1">
                            <div className="flex">
                              {Array.from({ length: 5 }, (_, i) => (
                                <span 
                                  key={i} 
                                  className={`text-lg ${
                                    i < Math.floor(potentialRating) 
                                      ? "text-yellow-400" 
                                      : (i === Math.floor(potentialRating) && potentialRating % 1 >= 0.5)
                                        ? "text-yellow-400/60"
                                        : "text-gray-300"
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                            <span className="text-xs text-gray-400 ml-1">
                              ({potentialRating.toFixed(1)})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Training Focus</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500 mb-3">
                    Select training focus to improve specific attributes over time.
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm">Focus on Speed</Button>
                    <Button variant="outline" size="sm">Focus on Power</Button>
                    <Button variant="outline" size="sm">Focus on Technique</Button>
                    <Button variant="outline" size="sm">Focus on Leadership</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}