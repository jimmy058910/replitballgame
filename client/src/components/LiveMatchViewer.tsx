import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Zap, Timer, Activity } from "lucide-react";

interface GameEvent {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  quarter: number;
  gameTime: string;
  playerInvolved?: string;
  teamId?: string;
  animationType?: string;
  position: { x: number; y: number };
}

interface Player {
  id: string;
  name: string;
  race: "human" | "sylvan" | "gryll" | "lumina" | "umbra";
  position: string;
  stats: {
    speed: number;
    power: number;
    throwing: number;
    catching: number;
    kicking: number;
    stamina: number;
    leadership: number;
    agility: number;
  };
  fatigue: number;
  abilities: string[];
  injuries: any[];
}

interface Team {
  id: string;
  name: string;
  race: "human" | "sylvan" | "gryll" | "lumina" | "umbra";
  players: Player[];
  score: number;
  possession: boolean;
  formation: string;
}

interface MatchData {
  id: string;
  status: "waiting" | "live" | "halftime" | "finished";
  team1: Team;
  team2: Team;
  currentQuarter: number;
  timeRemaining: string;
  possession: string;
  stadium: string;
  weather: string;
  lastPlay?: GameEvent;
}

const raceColors = {
  human: "text-blue-400",
  sylvan: "text-green-400",
  gryll: "text-orange-400",
  lumina: "text-yellow-400",
  umbra: "text-purple-400",
};

const raceIcons = {
  human: "fas fa-user",
  sylvan: "fas fa-leaf",
  gryll: "fas fa-mountain",
  lumina: "fas fa-sun",
  umbra: "fas fa-eye-slash",
};

export default function LiveMatchViewer({ matchId }: { matchId: string }) {
  const [matchData, setMatchData] = useState<MatchData>({
    id: "demo-match-1",
    status: "waiting",
    team1: {
      id: "team-1",
      name: "Crimson Sylvans",
      race: "sylvan",
      players: [
        {
          id: "p1",
          name: "Thornwick Swiftleaf",
          race: "sylvan",
          position: "Runner",
          stats: { speed: 32, power: 18, throwing: 15, catching: 28, kicking: 12, stamina: 25, leadership: 20, agility: 35 },
          fatigue: 0,
          abilities: ["swift_feet", "nimble_dodge"],
          injuries: []
        },
        {
          id: "p2",
          name: "Elderoak Strongbark",
          race: "sylvan",
          position: "Blocker",
          stats: { speed: 15, power: 30, throwing: 8, catching: 12, kicking: 5, stamina: 32, leadership: 25, agility: 18 },
          fatigue: 0,
          abilities: ["power_block", "iron_will"],
          injuries: []
        }
      ],
      score: 0,
      possession: true,
      formation: "Aggressive Rush"
    },
    team2: {
      id: "team-2",
      name: "Shadowforge Gryll",
      race: "gryll",
      players: [
        {
          id: "p3",
          name: "Ironjaw Rockbreaker",
          race: "gryll",
          position: "Blocker",
          stats: { speed: 12, power: 38, throwing: 10, catching: 15, kicking: 8, stamina: 35, leadership: 22, agility: 14 },
          fatigue: 0,
          abilities: ["iron_grip", "strong_arm"],
          injuries: []
        },
        {
          id: "p4",
          name: "Stonewall Deepdelver",
          race: "gryll",
          position: "Defender",
          stats: { speed: 18, power: 35, throwing: 12, catching: 20, kicking: 15, stamina: 30, leadership: 28, agility: 16 },
          fatigue: 0,
          abilities: ["power_block"],
          injuries: []
        }
      ],
      score: 0,
      possession: false,
      formation: "Defensive Wall"
    },
    currentQuarter: 1,
    timeRemaining: "10:00",
    possession: "team-1",
    stadium: "Ancient Grove Arena",
    weather: "Clear, 72°F"
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(1);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const eventDescriptions = [
    { type: "pass", templates: [
      "{player} launches a precise throw across the field",
      "{player} connects with a beautiful spiral pass",
      "{player} threads the needle with perfect accuracy"
    ]},
    { type: "run", templates: [
      "{player} breaks through the defensive line",
      "{player} shows incredible speed and agility",
      "{player} powers through multiple defenders"
    ]},
    { type: "tackle", templates: [
      "{player} makes a crushing tackle",
      "{player} brings down the ball carrier",
      "{player} executes perfect defensive technique"
    ]},
    { type: "score", templates: [
      "{player} scores a spectacular goal!",
      "{player} finds the end zone!",
      "{player} delivers the winning strike!"
    ]},
    { type: "fumble", templates: [
      "{player} loses control of the ball",
      "The ball slips from {player}'s grasp",
      "{player} fumbles under pressure"
    ]},
    { type: "injury", templates: [
      "{player} is down and needs attention",
      "{player} appears to be injured",
      "{player} requires medical assistance"
    ]},
    { type: "ability", templates: [
      "{player} activates their special ability",
      "{player} channels their racial heritage",
      "{player} unleashes their natural talent"
    ]}
  ];

  const generateRandomEvent = (): GameEvent => {
    const eventType = eventDescriptions[Math.floor(Math.random() * eventDescriptions.length)];
    const template = eventType.templates[Math.floor(Math.random() * eventType.templates.length)];
    
    const team = Math.random() > 0.5 ? matchData.team1 : matchData.team2;
    const player = team.players[Math.floor(Math.random() * team.players.length)];
    
    return {
      id: `event-${Date.now()}`,
      type: eventType.type,
      description: template.replace("{player}", player.name),
      timestamp: Date.now(),
      quarter: matchData.currentQuarter,
      gameTime: matchData.timeRemaining,
      playerInvolved: player.name,
      teamId: team.id,
      animationType: eventType.type,
      position: {
        x: Math.random() * 400 + 50,
        y: Math.random() * 200 + 50
      }
    };
  };

  const startSimulation = () => {
    setIsPlaying(true);
    setMatchData(prev => ({ ...prev, status: "live" }));
    
    gameIntervalRef.current = setInterval(() => {
      const newEvent = generateRandomEvent();
      setGameEvents(prev => [newEvent, ...prev.slice(0, 9)]);
      setCurrentEvent(newEvent);
      
      // Update fatigue
      setMatchData(prev => ({
        ...prev,
        team1: {
          ...prev.team1,
          players: prev.team1.players.map(p => ({
            ...p,
            fatigue: Math.min(100, p.fatigue + Math.random() * 2)
          }))
        },
        team2: {
          ...prev.team2,
          players: prev.team2.players.map(p => ({
            ...p,
            fatigue: Math.min(100, p.fatigue + Math.random() * 2)
          }))
        }
      }));

      // Random scoring
      if (Math.random() < 0.1) {
        const scoringTeam = Math.random() > 0.5 ? "team1" : "team2";
        setMatchData(prev => ({
          ...prev,
          [scoringTeam]: {
            ...prev[scoringTeam as keyof typeof prev],
            score: (prev[scoringTeam as keyof typeof prev] as Team).score + 1
          }
        }));
      }
    }, 2000 / gameSpeed);
  };

  const pauseSimulation = () => {
    setIsPlaying(false);
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
    }
  };

  const resetSimulation = () => {
    pauseSimulation();
    setGameEvents([]);
    setCurrentEvent(null);
    setMatchData(prev => ({
      ...prev,
      status: "waiting",
      team1: { ...prev.team1, score: 0 },
      team2: { ...prev.team2, score: 0 }
    }));
  };

  useEffect(() => {
    return () => {
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Match Header */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Live Match Simulation
            </CardTitle>
            <Badge className={matchData.status === "live" ? "bg-red-600" : "bg-gray-600"}>
              {matchData.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <h3 className={`font-bold text-lg ${raceColors[matchData.team1.race]}`}>
                {matchData.team1.name}
              </h3>
              <div className="text-3xl font-bold text-white mt-2">
                {matchData.team1.score}
              </div>
              <Badge className="mt-2 bg-gray-700">
                {matchData.team1.formation}
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-gray-400 text-sm">Quarter {matchData.currentQuarter}</div>
              <div className="text-white font-mono text-xl">{matchData.timeRemaining}</div>
              <div className="text-gray-400 text-sm mt-2">{matchData.stadium}</div>
              <div className="text-gray-400 text-xs">{matchData.weather}</div>
            </div>
            
            <div className="text-center">
              <h3 className={`font-bold text-lg ${raceColors[matchData.team2.race]}`}>
                {matchData.team2.name}
              </h3>
              <div className="text-3xl font-bold text-white mt-2">
                {matchData.team2.score}
              </div>
              <Badge className="mt-2 bg-gray-700">
                {matchData.team2.formation}
              </Badge>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-2 mt-4">
            <Button
              onClick={isPlaying ? pauseSimulation : startSimulation}
              variant={isPlaying ? "destructive" : "default"}
              size="sm"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? "Pause" : "Start"}
            </Button>
            
            <Button onClick={resetSimulation} variant="outline" size="sm">
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
            
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-gray-400" />
              <select 
                value={gameSpeed} 
                onChange={(e) => setGameSpeed(Number(e.target.value))}
                className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Field */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="relative w-full h-64 bg-green-800 rounded-lg overflow-hidden field-gradient">
            {/* Field markings */}
            <div className="absolute inset-0">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i}
                  className="absolute w-full h-px bg-white opacity-30"
                  style={{ top: `${20 + i * 15}%` }}
                />
              ))}
              <div className="absolute left-0 top-0 w-2 h-full bg-red-500 opacity-50" />
              <div className="absolute right-0 top-0 w-2 h-full bg-blue-500 opacity-50" />
            </div>

            {/* Current Event Animation */}
            <AnimatePresence>
              {currentEvent && (
                <motion.div
                  key={currentEvent.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold"
                  style={{
                    left: currentEvent.position.x,
                    top: currentEvent.position.y
                  }}
                >
                  <Zap className="w-4 h-4 inline mr-1" />
                  {currentEvent.type.toUpperCase()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Player positions (simplified) */}
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <div className={`w-3 h-3 rounded-full bg-race-${matchData.team1.race} border-2 border-white`} />
            </div>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className={`w-3 h-3 rounded-full bg-race-${matchData.team2.race} border-2 border-white`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[matchData.team1, matchData.team2].map((team) => (
          <Card key={team.id} className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className={`${raceColors[team.race]} flex items-center gap-2`}>
                <i className={raceIcons[team.race]} />
                {team.name} Roster
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {team.players.map((player) => (
                  <div key={player.id} className="bg-gray-700 p-3 rounded">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-white">{player.name}</div>
                        <div className="text-sm text-gray-400">{player.position}</div>
                      </div>
                      <Badge className={`${raceColors[player.race]}`}>
                        {player.race}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Fatigue:</span>
                        <Progress value={player.fatigue} className="w-16 h-2" />
                      </div>
                      <div className="flex gap-2 text-gray-400">
                        <span>SPD: {player.stats.speed}</span>
                        <span>PWR: {player.stats.power}</span>
                        <span>THR: {player.stats.throwing}</span>
                        <span>CAT: {player.stats.catching}</span>
                      </div>
                      {player.abilities.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {player.abilities.map((ability) => (
                            <Badge key={ability} variant="outline" className="text-xs">
                              {ability.replace("_", " ")}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Event Log */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Live Commentary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {gameEvents.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex justify-between items-center p-2 bg-gray-700 rounded"
              >
                <span className="text-white text-sm">{event.description}</span>
                <div className="text-xs text-gray-400">
                  Q{event.quarter} - {event.gameTime}
                </div>
              </motion.div>
            ))}
            {gameEvents.length === 0 && (
              <div className="text-center py-4 text-gray-400">
                Start simulation to see live events
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}