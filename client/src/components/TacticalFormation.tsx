import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface FormationPlayer {
  id: string;
  name: string;
  role: string;
  position: { x: number; y: number };
  isStarter: boolean;
}

interface TacticalFormationProps {
  players: any[];
  onFormationChange: (formation: FormationPlayer[]) => void;
}

const FIELD_WIDTH = 800;
const FIELD_HEIGHT = 400;

export default function TacticalFormation({ players, onFormationChange }: TacticalFormationProps) {
  const [formation, setFormation] = useState<FormationPlayer[]>([]);
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);

  // Helper function to get player role
  const getPlayerRole = (player: any): string => {
    const { speed, agility, catching, throwing, power } = player;
    
    const passerScore = (throwing * 2) + (player.leadership * 1.5);
    const runnerScore = (speed * 2) + (agility * 1.5);
    const blockerScore = (power * 2) + (player.stamina * 1.5);
    
    const maxScore = Math.max(passerScore, runnerScore, blockerScore);
    
    if (maxScore === passerScore) return "Passer";
    if (maxScore === runnerScore) return "Runner";
    return "Blocker";
  };

  // Group players by role
  const playersByRole = players.reduce((acc, player) => {
    const role = getPlayerRole(player);
    if (!acc[role]) acc[role] = [];
    acc[role].push({ ...player, role });
    return acc;
  }, {} as Record<string, any[]>);

  // Check formation requirements
  const getFormationStatus = () => {
    const starters = formation.filter(p => p.isStarter);
    const roleCounts = starters.reduce((acc, player) => {
      acc[player.role] = (acc[player.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const passers = roleCounts.Passer || 0;
    const runners = roleCounts.Runner || 0;
    const blockers = roleCounts.Blocker || 0;
    const total = starters.length;

    const isValid = passers >= 1 && runners >= 2 && blockers >= 2 && total === 6;
    
    return {
      passers,
      runners,
      blockers,
      total,
      isValid,
      requirements: {
        passers: passers >= 1,
        runners: runners >= 2,
        blockers: blockers >= 2,
        total: total === 6
      }
    };
  };

  const handleDragStart = (playerId: string) => {
    setDraggedPlayer(playerId);
  };

  const handleDrop = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    if (!draggedPlayer) return;

    const player = players.find(p => p.id === draggedPlayer);
    if (!player) return;

    const newFormationPlayer: FormationPlayer = {
      id: player.id,
      name: player.name,
      role: getPlayerRole(player),
      position: { x, y },
      isStarter: formation.filter(p => p.isStarter).length < 6
    };

    // Remove player if already in formation, then add to new position
    const updatedFormation = formation.filter(p => p.id !== draggedPlayer);
    updatedFormation.push(newFormationPlayer);
    
    setFormation(updatedFormation);
    setDraggedPlayer(null);
  };

  const togglePlayerStarter = (playerId: string) => {
    setFormation(prev => prev.map(p => {
      if (p.id === playerId) {
        const currentStarters = prev.filter(player => player.isStarter).length;
        const newIsStarter = !p.isStarter;
        
        // Don't allow more than 6 starters
        if (newIsStarter && currentStarters >= 6) return p;
        
        return { ...p, isStarter: newIsStarter };
      }
      return p;
    }));
  };

  const removeFromFormation = (playerId: string) => {
    setFormation(prev => prev.filter(p => p.id !== playerId));
  };

  const status = getFormationStatus();
  const roleColors = {
    Passer: "bg-blue-500",
    Runner: "bg-green-500",
    Blocker: "bg-red-500",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Formation Field */}
      <Card>
        <CardHeader>
          <CardTitle>Tactical Formation</CardTitle>
          <div className="flex gap-2 text-sm">
            <Badge variant={status.requirements.passers ? "default" : "destructive"}>
              Passers: {status.passers}/1+
            </Badge>
            <Badge variant={status.requirements.runners ? "default" : "destructive"}>
              Runners: {status.runners}/2+
            </Badge>
            <Badge variant={status.requirements.blockers ? "default" : "destructive"}>
              Blockers: {status.blockers}/2+
            </Badge>
            <Badge variant={status.requirements.total ? "default" : "destructive"}>
              Total: {status.total}/6
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div 
            className="relative border-2 border-green-600 bg-green-100 dark:bg-green-900/20 rounded-lg"
            style={{ width: FIELD_WIDTH, height: FIELD_HEIGHT }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              handleDrop(e, x, y);
            }}
          >
            {/* Field markings - Horizontal Layout */}
            <div className="absolute inset-0">
              {/* Center line - vertical */}
              <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white dark:bg-gray-300 -translate-x-0.5"></div>
              
              {/* Center circle */}
              <div className="absolute top-1/2 left-1/2 w-16 h-16 border-2 border-white dark:border-gray-300 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
              
              {/* Goal areas - left and right */}
              <div className="absolute top-1/4 left-0 w-16 h-1/2 border-2 border-white dark:border-gray-300 border-l-0"></div>
              <div className="absolute top-1/4 right-0 w-16 h-1/2 border-2 border-white dark:border-gray-300 border-r-0"></div>
              
              {/* Side labels */}
              <div className="absolute top-2 left-4 text-xs font-bold text-green-700 dark:text-green-300">YOUR SIDE</div>
              <div className="absolute top-2 right-4 text-xs font-bold text-red-700 dark:text-red-300">OPPONENT SIDE</div>
            </div>

            {/* Formation players */}
            {formation.map((player) => (
              <div
                key={player.id}
                className={`absolute w-8 h-8 rounded-full border-2 border-white flex items-center justify-center cursor-pointer text-xs font-bold text-white ${
                  roleColors[player.role as keyof typeof roleColors]
                } ${player.isStarter ? 'ring-2 ring-yellow-400' : 'opacity-60'}`}
                style={{
                  left: player.position.x - 16,
                  top: player.position.y - 16,
                }}
                onClick={() => togglePlayerStarter(player.id)}
                onDoubleClick={() => removeFromFormation(player.id)}
                title={`${player.name} (${player.role}) - ${player.isStarter ? 'Starter' : 'Bench'}`}
              >
                {player.name.charAt(0)}
              </div>
            ))}
          </div>
          
          {status.isValid && (
            <Button 
              onClick={() => onFormationChange(formation)}
              className="mt-4 w-full"
            >
              Save Formation
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Player Lists */}
      <Card>
        <CardHeader>
          <CardTitle>Available Players</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(playersByRole).map(([role, rolePlayers]) => (
            <div key={role}>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${roleColors[role as keyof typeof roleColors]}`}></div>
                {role}s ({rolePlayers.length})
              </h4>
              <div className="space-y-1">
                {rolePlayers.map((player) => {
                  const inFormation = formation.find(p => p.id === player.id);
                  return (
                    <div
                      key={player.id}
                      draggable
                      onDragStart={() => handleDragStart(player.id)}
                      className={`p-2 text-sm rounded border cursor-move hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between ${
                        inFormation ? 'bg-gray-100 dark:bg-gray-800 border-gray-300' : 'bg-white dark:bg-gray-900'
                      }`}
                    >
                      <span>{player.name}</span>
                      {inFormation && (
                        <Badge variant="outline" size="sm">
                          {inFormation.isStarter ? 'Starter' : 'Bench'}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              {role !== 'Blocker' && <Separator className="mt-3" />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}