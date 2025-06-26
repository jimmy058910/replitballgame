import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Pause, Square, RotateCcw } from "lucide-react";

interface Player {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  role: "Passer" | "Runner" | "Blocker";
  teamId: string;
  // Permanent Attributes (1-40 scale)
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  stamina: number;
  agility: number;
  leadership: number;
  // Dynamic In-Game Stats
  scores: number;
  knockdownsInflicted: number;
  passesAttempted: number;
  passesCompleted: number;
  passesCaught: number;
  interceptions: number;
  yardsGained: number;
  tacklesMade: number;
  fumbles: number;
  droppedPasses: number;
  // Game state
  currentStamina: number;
  position: { x: number; y: number };
  hasBall: boolean;
  isKnockedDown: boolean;
  knockdownTimer: number;
}

interface GameState {
  gameTime: number; // in seconds
  maxTime: number; // total game time in seconds
  currentHalf: 1 | 2;
  team1Score: number;
  team2Score: number;
  ballPosition: { x: number; y: number };
  ballCarrier: string | null; // player ID or null if loose
  ballInAir: boolean;
  ballAirTime: number;
  ballTarget: { x: number; y: number } | null;
  ballIntendedReceiver: string | null;
  isRunning: boolean;
  gameLog: string[];
}

interface TextBasedMatchProps {
  team1: any;
  team2: any;
  isExhibition?: boolean;
  onMatchComplete?: (result: any) => void;
}

export default function TextBasedMatch({ team1, team2, isExhibition = false, onMatchComplete }: TextBasedMatchProps) {
  const [gameState, setGameState] = useState<GameState>({
    gameTime: 0,
    maxTime: isExhibition ? 1200 : 1800, // 20 min for exhibition, 30 min for league
    currentHalf: 1,
    team1Score: 0,
    team2Score: 0,
    ballPosition: { x: 0, y: 0 }, // center field
    ballCarrier: null,
    ballInAir: false,
    ballAirTime: 0,
    ballTarget: null,
    ballIntendedReceiver: null,
    isRunning: false,
    gameLog: ["Game starting at midfield..."]
  });

  const [players, setPlayers] = useState<Player[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize players from team data
  useEffect(() => {
    const initializePlayers = () => {
      const team1Players = (team1?.players || []).slice(0, 6).map((p: any, index: number) => ({
        ...p,
        role: p.role || (index === 0 ? "Passer" : index < 3 ? "Runner" : "Blocker"),
        teamId: team1.id,
        scores: 0,
        knockdownsInflicted: 0,
        passesAttempted: 0,
        passesCompleted: 0,
        passesCaught: 0,
        interceptions: 0,
        yardsGained: 0,
        tacklesMade: 0,
        fumbles: 0,
        droppedPasses: 0,
        currentStamina: p.stamina || 30,
        position: { x: -400 + index * 50, y: -200 + (index % 3) * 100 },
        hasBall: false,
        isKnockedDown: false,
        knockdownTimer: 0
      }));

      const team2Players = (team2?.players || []).slice(0, 6).map((p: any, index: number) => ({
        ...p,
        role: p.role || (index === 0 ? "Passer" : index < 3 ? "Runner" : "Blocker"),
        teamId: team2.id,
        scores: 0,
        knockdownsInflicted: 0,
        passesAttempted: 0,
        passesCompleted: 0,
        passesCaught: 0,
        interceptions: 0,
        yardsGained: 0,
        tacklesMade: 0,
        fumbles: 0,
        droppedPasses: 0,
        currentStamina: p.stamina || 30,
        position: { x: 400 - index * 50, y: -200 + (index % 3) * 100 },
        hasBall: false,
        isKnockedDown: false,
        knockdownTimer: 0
      }));

      setPlayers([...team1Players, ...team2Players]);
    };

    initializePlayers();
  }, [team1, team2]);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameState.gameLog]);

  const addToLog = (message: string) => {
    const timeStr = formatGameTime(gameState.gameTime);
    setGameState(prev => ({
      ...prev,
      gameLog: [...prev.gameLog, `[${timeStr}] ${message}`]
    }));
  };

  const formatGameTime = (seconds: number) => {
    const halfTime = gameState.maxTime / 2;
    const currentHalfTime = gameState.currentHalf === 1 ? seconds : seconds - halfTime;
    const minutes = Math.floor(currentHalfTime / 60);
    const secs = Math.floor(currentHalfTime % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDistance = (pos1: { x: number; y: number }, pos2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
  };

  const getClosestPlayerToBall = (teamPlayers: Player[]) => {
    return teamPlayers.reduce((closest, player) => {
      if (player.isKnockedDown) return closest;
      const distance = getDistance(player.position, gameState.ballPosition);
      const closestDistance = getDistance(closest.position, gameState.ballPosition);
      return distance < closestDistance ? player : closest;
    });
  };

  const simulateGameTick = () => {
    setGameState(prev => {
      const newGameTime = prev.gameTime + 1;
      
      // Check for halftime
      if (newGameTime === prev.maxTime / 2 && prev.currentHalf === 1) {
        return {
          ...prev,
          gameTime: newGameTime,
          currentHalf: 2,
          gameLog: [...prev.gameLog, `[HALFTIME] Score: ${team1?.name || "Team 1"}: ${prev.team1Score} - ${team2?.name || "Team 2"}: ${prev.team2Score}`]
        };
      }
      
      // Check for game end
      if (newGameTime >= prev.maxTime) {
        const winner = prev.team1Score > prev.team2Score ? team1?.name || "Team 1" : 
                     prev.team2Score > prev.team1Score ? team2?.name || "Team 2" : "Tie";
        
        onMatchComplete?.({
          team1Score: prev.team1Score,
          team2Score: prev.team2Score,
          winner
        });
        
        return {
          ...prev,
          gameTime: newGameTime,
          isRunning: false,
          gameLog: [...prev.gameLog, `[FINAL] Game Over! Final Score: ${team1?.name || "Team 1"}: ${prev.team1Score} - ${team2?.name || "Team 2"}: ${prev.team2Score}`]
        };
      }

      return {
        ...prev,
        gameTime: newGameTime
      };
    });

    // Simulate player actions and game events
    simulatePlayerActions();
  };

  const simulatePlayerActions = () => {
    // This is where the core game logic would go
    // For now, we'll add random events to demonstrate the system
    if (Math.random() < 0.05) { // 5% chance per second for an event
      const events = [
        "The ball is loose at midfield! Players converge!",
        "A quick pass downfield!",
        "Strong defensive pressure building!",
        "Breaking through the defensive line!",
        "Intercepted! Ball changes hands!"
      ];
      
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      addToLog(randomEvent);
    }
  };

  const startGame = () => {
    if (gameIntervalRef.current) return;
    
    setGameState(prev => ({ ...prev, isRunning: true }));
    addToLog("Game begins! Ball at center field!");
    
    // Run at 3.33x speed (1 game second per 0.3 real seconds)
    gameIntervalRef.current = setInterval(simulateGameTick, 300);
  };

  const pauseGame = () => {
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
      gameIntervalRef.current = null;
    }
    setGameState(prev => ({ ...prev, isRunning: false }));
    addToLog("Game paused.");
  };

  const stopGame = () => {
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
      gameIntervalRef.current = null;
    }
    setGameState(prev => ({ ...prev, isRunning: false }));
    addToLog("Game stopped.");
  };

  const resetGame = () => {
    stopGame();
    setGameState({
      gameTime: 0,
      maxTime: isExhibition ? 1200 : 1800,
      currentHalf: 1,
      team1Score: 0,
      team2Score: 0,
      ballPosition: { x: 0, y: 0 },
      ballCarrier: null,
      ballInAir: false,
      ballAirTime: 0,
      ballTarget: null,
      ballIntendedReceiver: null,
      isRunning: false,
      gameLog: ["Game reset. Ready to start..."]
    });
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
      }
    };
  }, []);

  const halfTime = gameState.maxTime / 2;
  const timeInHalf = gameState.currentHalf === 1 ? gameState.gameTime : gameState.gameTime - halfTime;
  const timeDisplay = formatGameTime(timeInHalf);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Game Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-orbitron">
              Text-Based Match Simulation
            </CardTitle>
            <div className="flex items-center space-x-4">
              <Badge variant={gameState.isRunning ? "default" : "secondary"}>
                {gameState.isRunning ? "LIVE" : "STOPPED"}
              </Badge>
              <span className="text-sm font-mono">
                Half {gameState.currentHalf} - {timeDisplay}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Score Display */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-8">
            <div className="text-center">
              <div className="text-sm text-gray-400">{team1?.name || "Team 1"}</div>
              <div className="text-4xl font-bold text-blue-400">{gameState.team1Score}</div>
            </div>
            <div className="text-2xl text-gray-500">-</div>
            <div className="text-center">
              <div className="text-sm text-gray-400">{team2?.name || "Team 2"}</div>
              <div className="text-4xl font-bold text-red-400">{gameState.team2Score}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-4">
            <Button 
              onClick={startGame} 
              disabled={gameState.isRunning || gameState.gameTime >= gameState.maxTime}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-2" />
              {gameState.gameTime === 0 ? "Start Game" : "Resume"}
            </Button>
            <Button 
              onClick={pauseGame} 
              disabled={!gameState.isRunning}
              variant="outline"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
            <Button 
              onClick={stopGame} 
              disabled={!gameState.isRunning}
              variant="destructive"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
            <Button 
              onClick={resetGame} 
              variant="outline"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Commentary */}
      <Card>
        <CardHeader>
          <CardTitle>Live Commentary</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full border rounded-lg p-4 bg-gray-900">
            <div ref={logRef} className="space-y-1">
              {gameState.gameLog.map((entry, index) => (
                <div key={index} className="text-sm font-mono text-green-400">
                  {entry}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}