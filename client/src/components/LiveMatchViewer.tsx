import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import GameAnimations, { generateTestEvent } from "./GameAnimations";
import { apiRequest } from "@/lib/queryClient";
import { 
  Play, Pause, RotateCcw, Clock, Users, Trophy, 
  Heart, Zap, AlertTriangle, Target, Footprints
} from "lucide-react";

interface LiveMatch {
  id: string;
  team1: {
    id: string;
    name: string;
    logo: string;
    score: number;
    players: Player[];
  };
  team2: {
    id: string;
    name: string;
    logo: string;
    score: number;
    players: Player[];
  };
  status: 'pending' | 'live' | 'completed' | 'overtime';
  currentQuarter: number;
  timeRemaining: number;
  gameEvents: GameEvent[];
  possession: string;
  lastPlay: string;
  stadium: string;
  weather: string;
}

interface Player {
  id: string;
  name: string;
  race: string;
  position: string;
  overall: number;
  fatigue: number;
  health: number;
  isInjured: boolean;
  abilities: string[];
  stats: {
    rushing: number;
    passing: number;
    receiving: number;
    tackles: number;
    interceptions: number;
  };
}

interface GameEvent {
  id: string;
  type: 'skill' | 'fatigue' | 'knockdown' | 'pushback' | 'celebration' | 'throwing' | 'catching' | 'fumble' | 'injury' | 'running' | 'tackle' | 'block' | 'dodge' | 'interception' | 'touchdown';
  playerId: string;
  playerName: string;
  playerRace: string;
  description: string;
  intensity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  position?: { x: number; y: number };
  quarter: number;
  gameTime: number;
}

export default function LiveMatchViewer({ matchId }: { matchId: string }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  const queryClient = useQueryClient();

  const { data: match, refetch } = useQuery({
    queryKey: ["/api/matches", matchId, "simulation"],
    refetchInterval: isSimulating ? 2000 : false,
  });

  const simulatePlayMutation = useMutation({
    mutationFn: () => apiRequest(`/api/matches/${matchId}/simulate-play`, {
      method: "POST",
      body: JSON.stringify({ speed: simulationSpeed }),
    }),
    onSuccess: (data) => {
      if (data.events) {
        setGameEvents(prev => [...prev, ...data.events]);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId] });
    },
  });

  const startSimulation = () => {
    setIsSimulating(true);
  };

  const pauseSimulation = () => {
    setIsSimulating(false);
  };

  const resetMatch = useMutation({
    mutationFn: () => apiRequest(`/api/matches/${matchId}/reset`, {
      method: "POST",
    }),
    onSuccess: () => {
      setGameEvents([]);
      setIsSimulating(false);
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId] });
    },
  });

  // Auto-simulate when active
  useEffect(() => {
    if (!isSimulating || !match || match.status === 'completed') return;

    const interval = setInterval(() => {
      simulatePlayMutation.mutate();
    }, 3000 / simulationSpeed);

    return () => clearInterval(interval);
  }, [isSimulating, simulationSpeed, match?.status]);

  // Handle overtime tie-breaking
  const handleOvertime = () => {
    if (match?.team1.score === match?.team2.score && match?.status === 'completed') {
      // Sudden death overtime - first score wins
      setIsSimulating(true);
    }
  };

  const generateRandomEvent = () => {
    const eventTypes: GameEvent['type'][] = [
      'skill', 'fatigue', 'knockdown', 'pushback', 'celebration', 
      'throwing', 'catching', 'fumble', 'injury', 'running', 
      'tackle', 'block', 'dodge', 'interception', 'touchdown'
    ];
    
    const players = [...(match?.team1.players || []), ...(match?.team2.players || [])];
    if (players.length === 0) return;

    const randomPlayer = players[Math.floor(Math.random() * players.length)];
    const randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    const testEvent = generateTestEvent(randomEventType, randomPlayer.name, randomPlayer.race);
    setGameEvents(prev => [...prev, testEvent]);
  };

  if (!match) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading match data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              Live Match
            </CardTitle>
            <Badge variant={
              match.status === 'live' ? 'default' : 
              match.status === 'completed' ? 'secondary' : 
              match.status === 'overtime' ? 'destructive' : 'outline'
            }>
              {match.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 items-center">
            {/* Team 1 */}
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{match.team1.name}</div>
              <div className="text-4xl font-bold text-blue-400">{match.team1.score}</div>
            </div>

            {/* Game Info */}
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold text-white">
                Q{match.currentQuarter} - {Math.floor(match.timeRemaining / 60)}:{(match.timeRemaining % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-400">
                Possession: {match.possession === match.team1.id ? match.team1.name : match.team2.name}
              </div>
              <div className="text-xs text-gray-500">
                {match.stadium} | {match.weather}
              </div>
            </div>

            {/* Team 2 */}
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{match.team2.name}</div>
              <div className="text-4xl font-bold text-blue-400">{match.team2.score}</div>
            </div>
          </div>

          {/* Last Play */}
          {match.lastPlay && (
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-300">Last Play:</div>
              <div className="text-white">{match.lastPlay}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Game Controls */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {!isSimulating ? (
                <Button onClick={startSimulation} className="flex items-center">
                  <Play className="w-4 h-4 mr-1" />
                  Start Simulation
                </Button>
              ) : (
                <Button onClick={pauseSimulation} variant="secondary" className="flex items-center">
                  <Pause className="w-4 h-4 mr-1" />
                  Pause
                </Button>
              )}
              
              <Button 
                onClick={() => resetMatch.mutate()} 
                variant="outline" 
                className="flex items-center"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>

              <Button 
                onClick={generateRandomEvent} 
                variant="outline" 
                className="flex items-center"
              >
                <Zap className="w-4 h-4 mr-1" />
                Test Event
              </Button>
            </div>

            <div className="flex items-center space-x-4">
              <label className="text-white text-sm">Speed:</label>
              <select 
                value={simulationSpeed} 
                onChange={(e) => setSimulationSpeed(Number(e.target.value))}
                className="bg-gray-700 text-white rounded px-2 py-1"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            </div>
          </div>

          {/* Overtime Controls */}
          {match.team1.score === match.team2.score && match.status === 'completed' && (
            <div className="mt-4 p-4 bg-red-900 bg-opacity-50 rounded-lg border border-red-700">
              <div className="text-red-300 font-semibold mb-2">Tied Game - Overtime Required</div>
              <Button onClick={handleOvertime} className="bg-red-600 hover:bg-red-700">
                Start Sudden Death Overtime
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Game Field with Animations */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-0">
          <div className="relative h-96 bg-green-900">
            <GameAnimations
              events={gameEvents}
              isLive={isSimulating}
              fieldDimensions={{ width: 800, height: 400 }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Player Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team 1 Players */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">{match.team1.name} Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {match.team1.players?.slice(0, 6).map((player) => (
                <div key={player.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <div>
                    <div className="text-white font-semibold">{player.name}</div>
                    <div className="text-xs text-gray-400">{player.race} {player.position}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      <Heart className={`w-3 h-3 mr-1 ${player.health > 70 ? 'text-green-400' : player.health > 40 ? 'text-yellow-400' : 'text-red-400'}`} />
                      <span className="text-xs text-white">{player.health}%</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className={`w-3 h-3 mr-1 ${player.fatigue < 30 ? 'text-green-400' : player.fatigue < 60 ? 'text-yellow-400' : 'text-red-400'}`} />
                      <span className="text-xs text-white">{100 - player.fatigue}%</span>
                    </div>
                    {player.isInjured && (
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team 2 Players */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">{match.team2.name} Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {match.team2.players?.slice(0, 6).map((player) => (
                <div key={player.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <div>
                    <div className="text-white font-semibold">{player.name}</div>
                    <div className="text-xs text-gray-400">{player.race} {player.position}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      <Heart className={`w-3 h-3 mr-1 ${player.health > 70 ? 'text-green-400' : player.health > 40 ? 'text-yellow-400' : 'text-red-400'}`} />
                      <span className="text-xs text-white">{player.health}%</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className={`w-3 h-3 mr-1 ${player.fatigue < 30 ? 'text-green-400' : player.fatigue < 60 ? 'text-yellow-400' : 'text-red-400'}`} />
                      <span className="text-xs text-white">{100 - player.fatigue}%</span>
                    </div>
                    {player.isInjured && (
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Game Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{gameEvents.filter(e => e.type === 'touchdown').length}</div>
              <div className="text-sm text-gray-400">Touchdowns</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{gameEvents.filter(e => e.type === 'fumble').length}</div>
              <div className="text-sm text-gray-400">Fumbles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{gameEvents.filter(e => e.type === 'injury').length}</div>
              <div className="text-sm text-gray-400">Injuries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{gameEvents.filter(e => e.type === 'interception').length}</div>
              <div className="text-sm text-gray-400">Interceptions</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}