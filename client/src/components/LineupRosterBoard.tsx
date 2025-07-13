import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { apiRequest } from '@/lib/queryClient';
import { Users, Settings, Target, TrendingUp } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  race: string;
  age: number;
  position: string;
  isStarter: boolean;
  fieldPosition: any;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  stamina: number;
  leadership: number;
  agility: number;
  injuryStatus: string;
  dailyStaminaLevel: number;
}

interface LineupRosterBoardProps {
  teamId: string;
}

export default function LineupRosterBoard({ teamId }: LineupRosterBoardProps) {
  const [activeTab, setActiveTab] = useState("lineup");
  const [selectedFormation, setSelectedFormation] = useState("3-2-4");
  const [tacticalFocus, setTacticalFocus] = useState("balanced");

  const { data: players, isLoading } = useQuery({
    queryKey: ['/api/teams', teamId, 'players'],
    queryFn: () => apiRequest(`/api/teams/${teamId}/players`),
  });

  const { data: teamData } = useQuery({
    queryKey: ['/api/teams', teamId],
    queryFn: () => apiRequest(`/api/teams/${teamId}`),
  });

  const starters = players?.filter((p: Player) => p.isStarter) || [];
  const bench = players?.filter((p: Player) => !p.isStarter) || [];

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    // Handle drag and drop logic for lineup management
    console.log('Drag end:', { source, destination });
    // TODO: Implement actual drag and drop functionality
  };

  const getPlayerPower = (player: Player): number => {
    return Math.round((player.speed + player.power + player.agility + player.throwing + player.catching + player.kicking) / 6);
  };

  const getPlayerRole = (player: Player): string => {
    const stats = [
      { name: 'Passer', value: player.throwing + player.leadership + player.agility },
      { name: 'Runner', value: player.speed + player.agility + player.catching },
      { name: 'Blocker', value: player.power + player.staminaAttribute + player.leadership }
    ];
    
    return stats.reduce((prev, current) => prev.value > current.value ? prev : current).name;
  };

  const formations = [
    { id: "3-2-4", name: "3-2-4 (Balanced)", description: "Standard formation with balanced offense and defense" },
    { id: "4-1-4", name: "4-1-4 (Power)", description: "Heavy blocking formation for power plays" },
    { id: "2-3-4", name: "2-3-4 (Speed)", description: "Speed-focused formation with multiple runners" },
    { id: "3-3-3", name: "3-3-3 (Flexible)", description: "Flexible formation adaptable to any situation" }
  ];

  const tacticalOptions = [
    { id: "balanced", name: "Balanced", description: "Equal focus on all aspects of play" },
    { id: "aggressive", name: "All-Out Attack", description: "+2 passing, +2 rushing, -1 defense" },
    { id: "defensive", name: "Defensive Wall", description: "+3 defense, -1 passing, -1 rushing" },
    { id: "control", name: "Ball Control", description: "+2 passing accuracy, +1 stamina conservation" }
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lineup & Tactics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading lineup...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Lineup & Tactics Hub
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="lineup">Starting Lineup</TabsTrigger>
            <TabsTrigger value="formation">Formation</TabsTrigger>
            <TabsTrigger value="tactics">Tactics</TabsTrigger>
          </TabsList>

          <TabsContent value="lineup" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Starting Lineup (9 Players)</h3>
              <Badge variant="outline">{starters.length}/9 Starters</Badge>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Starters */}
                <Droppable droppableId="starters">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2"
                    >
                      <h4 className="font-medium text-green-600">Starters</h4>
                      {starters.map((player: Player, index: number) => (
                        <Draggable key={player.id} draggableId={player.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{player.name}</div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {getPlayerRole(player)} • Power: {getPlayerPower(player)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant="secondary">{player.race}</Badge>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Stamina: {player.dailyStaminaLevel}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Bench */}
                <Droppable droppableId="bench">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2"
                    >
                      <h4 className="font-medium text-blue-600">Bench</h4>
                      {bench.map((player: Player, index: number) => (
                        <Draggable key={player.id} draggableId={player.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{player.name}</div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {getPlayerRole(player)} • Power: {getPlayerPower(player)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant="outline">{player.race}</Badge>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Stamina: {player.dailyStaminaLevel}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </DragDropContext>
          </TabsContent>

          <TabsContent value="formation" className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Formation Setup</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-sm font-medium">Select Formation</label>
                <Select value={selectedFormation} onValueChange={setSelectedFormation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose formation" />
                  </SelectTrigger>
                  <SelectContent>
                    {formations.map((formation) => (
                      <SelectItem key={formation.id} value={formation.id}>
                        {formation.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formations.find(f => f.id === selectedFormation)?.description}
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Current Formation</label>
                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedFormation}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Formation Preview
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Button className="w-full">
              Save Formation
            </Button>
          </TabsContent>

          <TabsContent value="tactics" className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Tactical Focus</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tacticalOptions.map((option) => (
                <div
                  key={option.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    tacticalFocus === option.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setTacticalFocus(option.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{option.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {option.description}
                      </div>
                    </div>
                    {tacticalFocus === option.id && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="font-medium text-yellow-800 dark:text-yellow-200">
                  Current Team Camaraderie: {teamData?.teamCamaraderie || 50}%
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  Higher camaraderie improves tactical effectiveness
                </div>
              </div>
            </div>

            <Button className="w-full">
              Apply Tactical Changes
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}