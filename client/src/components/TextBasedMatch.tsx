import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Pause, Square, RotateCcw } from "lucide-react";
import { AdSystem, useAdSystem } from "@/components/AdSystem";
import { calculateTacticalModifiers, determineGameSituation, type TacticalModifiers, type GameState as TacticalGameState, type TeamTacticalInfo } from "../../../shared/tacticalSystem";

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
  matchId?: string;
  initialLiveState?: any;
  isLiveMatch?: boolean;
  onMatchComplete?: (result: any) => void;
}

export default function TextBasedMatch({ 
  team1, 
  team2, 
  isExhibition = false, 
  matchId,
  initialLiveState,
  isLiveMatch = false,
  onMatchComplete 
}: TextBasedMatchProps) {
  const [gameState, setGameState] = useState<GameState>({
    gameTime: initialLiveState?.gameTime || 0,
    maxTime: initialLiveState?.maxTime || (isExhibition ? 1200 : 1800), // 20 min for exhibition, 30 min for league
    currentHalf: initialLiveState?.currentHalf || 1,
    team1Score: initialLiveState?.team1Score || 0,
    team2Score: initialLiveState?.team2Score || 0,
    ballPosition: { x: 0, y: 0 }, // center field
    ballCarrier: null,
    ballInAir: false,
    ballAirTime: 0,
    ballTarget: null,
    ballIntendedReceiver: null,
    isRunning: initialLiveState?.isRunning || false,
    gameLog: initialLiveState?.recentEvents?.map((event: any) => `[${Math.floor(event.time / 60)}:${String(event.time % 60).padStart(2, '0')}] ${event.description}`) || ["Game starting at midfield..."]
  });

  const [players, setPlayers] = useState<Player[]>([]);
  const [tacticalModifiers, setTacticalModifiers] = useState<{
    team1: TacticalModifiers;
    team2: TacticalModifiers;
  } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [halftimeAdShown, setHalftimeAdShown] = useState(false);
  
  // Ad system hook
  const { showRewardedVideoAd, closeAd, adConfig } = useAdSystem();
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
      
      // Initialize tactical modifiers
      const initializeTacticalModifiers = () => {
        const tacticalGameState: TacticalGameState = {
          homeScore: gameState.team1Score,
          awayScore: gameState.team2Score,
          gameTime: gameState.gameTime,
          maxTime: gameState.maxTime,
          currentHalf: gameState.currentHalf,
        };

        // Create team tactical info (using defaults if not specified)
        const team1TacticalInfo: TeamTacticalInfo = {
          fieldSize: (team1?.fieldSize || "standard") as any,
          tacticalFocus: (team1?.tacticalFocus || "balanced") as any,
          camaraderie: team1?.teamCamaraderie || 50,
          headCoachTactics: team1?.staff?.find((s: any) => s.type === "Head Coach")?.coachingRating || 50,
          isHomeTeam: true,
        };

        const team2TacticalInfo: TeamTacticalInfo = {
          fieldSize: "standard" as any, // Away team doesn't get field size advantage
          tacticalFocus: (team2?.tacticalFocus || "balanced") as any,
          camaraderie: team2?.teamCamaraderie || 50,
          headCoachTactics: team2?.staff?.find((s: any) => s.type === "Head Coach")?.coachingRating || 50,
          isHomeTeam: false,
        };

        const team1Modifiers = calculateTacticalModifiers(team1TacticalInfo, tacticalGameState, true);
        const team2Modifiers = calculateTacticalModifiers(team2TacticalInfo, tacticalGameState, false);

        setTacticalModifiers({
          team1: team1Modifiers,
          team2: team2Modifiers,
        });
      };

      initializeTacticalModifiers();
    };

    initializePlayers();
  }, [team1, team2, gameState.team1Score, gameState.team2Score, gameState.gameTime, gameState.currentHalf]);

  // Auto-scroll log to top since newest events are at the top
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [gameState.gameLog]);

  const addToLog = (message: string, currentTime?: number) => {
    const timeToUse = currentTime !== undefined ? currentTime : gameState.gameTime;
    const timeStr = formatGameTime(timeToUse);
    setGameState(prev => ({
      ...prev,
      gameLog: [`[${timeStr}] ${message}`, ...prev.gameLog]
    }));
  };

  const formatGameTime = (seconds: number) => {
    const halfTime = gameState.maxTime / 2;
    let displayTime;
    
    if (gameState.currentHalf === 1) {
      // First half: 0:00 to 10:00
      displayTime = seconds;
    } else {
      // Second half: 10:00 to 20:00 (add half time to make it 10:00+)
      displayTime = halfTime + (seconds - halfTime);
    }
    
    const minutes = Math.floor(displayTime / 60);
    const secs = Math.floor(displayTime % 60);
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
      // Don't continue if game is already finished
      if (prev.gameTime >= prev.maxTime) {
        return prev;
      }

      const newGameTime = prev.gameTime + 1;
      
      // Simulate player actions WITHIN the state update with the new time
      if (newGameTime < prev.maxTime) {
        simulatePlayerActionsWithState(newGameTime, prev);
      }
      
      // Check for halftime
      if (newGameTime === prev.maxTime / 2 && prev.currentHalf === 1) {
        const timeStr = formatGameTime(newGameTime);
        
        // Show halftime rewarded video ad
        if (!halftimeAdShown) {
          setHalftimeAdShown(true);
          // Pause game for ad
          if (gameIntervalRef.current) {
            clearInterval(gameIntervalRef.current);
            gameIntervalRef.current = null;
          }
          const currentIsRunning = prev.isRunning; // Store if game was running

          showRewardedVideoAd(
            'halftime',
            'credits',
            Math.floor(Math.random() * 300) + 150, // 150-450 credits for halftime ad
            async (reward) => {
              if (reward) {
                try {
                  // Record ad view with enhanced tracking
                  const response = await apiRequest('/api/store/ads/view', 'POST', {
                    adType: 'interstitial',
                    placement: 'halftime', 
                    rewardType: 'credits',
                    rewardAmount: reward.amount,
                    completed: true
                  });
                  
                  if (response.tracking) {
                    let message = `Halftime ad: ${reward.amount} credits earned!`;
                    message += ` Daily: ${response.tracking.dailyCount}/20`;
                    
                    if (response.tracking.premiumRewardEarned) {
                      message += ` | PREMIUM REWARD UNLOCKED!`;
                    } else if (response.tracking.premiumProgress > 0) {
                      message += ` | Premium: ${response.tracking.premiumProgress}/50`;
                    }
                    
                    addToLog(message);
                  } else {
                    addToLog(`Halftime ad: ${reward.amount} credits earned!`);
                  }
                } catch (error) {
                  console.error('Failed to record halftime ad:', error);
                  addToLog(`Halftime ad: ${reward.amount} credits earned!`);
                }
              } else {
                addToLog("Halftime ad skipped or failed to complete.");
              }
              setGameState(innerPrev => ({...innerPrev, isRunning: currentIsRunning })); // Resume game state
              // Only restart interval if game was running before ad
              if (currentIsRunning && !gameIntervalRef.current && innerPrev.gameTime < innerPrev.maxTime) {
                 gameIntervalRef.current = setInterval(simulateGameTick, 300);
              }
              closeAd(); // Close the ad dialog
            }
          );
        }
        
        return {
          ...prev,
          gameTime: newGameTime,
          currentHalf: 2,
          gameLog: [`[${timeStr}] [HALFTIME] Score: ${team1?.name || "Team 1"}: ${prev.team1Score} - ${team2?.name || "Team 2"}: ${prev.team2Score}`, ...prev.gameLog]
        };
      }
      
      // Check for game end
      if (newGameTime >= prev.maxTime) {
        const winner = prev.team1Score > prev.team2Score ? team1?.name || "Team 1" : 
                     prev.team2Score > prev.team1Score ? team2?.name || "Team 2" : "Tie";
        
        // Stop the game immediately
        if (gameIntervalRef.current) {
          clearInterval(gameIntervalRef.current);
          gameIntervalRef.current = null;
        }
        
        onMatchComplete?.({
          team1Score: prev.team1Score,
          team2Score: prev.team2Score,
          winner
        });
        
        const timeStr = formatGameTime(newGameTime);
        return {
          ...prev,
          gameTime: newGameTime,
          isRunning: false,
          gameLog: [`[${timeStr}] [FINAL] Game Over! Final Score: ${team1?.name || "Team 1"}: ${prev.team1Score} - ${team2?.name || "Team 2"}: ${prev.team2Score}`, ...prev.gameLog]
        };
      }

      return {
        ...prev,
        gameTime: newGameTime
      };
    });
  };

  const simulatePlayerActionsWithState = (currentTime: number, currentState: any) => {
    // Generate events with actual player names and team context
    if (Math.random() < 0.1) { // 10% chance per second for an event
      const team1Players = players.filter(p => p.teamId === team1.id);
      const team2Players = players.filter(p => p.teamId === team2.id);
      const allPlayers = [...team1Players, ...team2Players];
      
      if (allPlayers.length === 0) return;
      
      const randomPlayer = allPlayers[Math.floor(Math.random() * allPlayers.length)];
      const playerTeam = randomPlayer.teamId === team1.id ? team1.name : team2.name;
      const opponentTeam = randomPlayer.teamId === team1.id ? team2.name : team1.name;
      
      // Enhanced name selection that handles AI team players better
      let playerName = "Unknown";
      if (randomPlayer.lastName && randomPlayer.lastName !== "Player" && randomPlayer.lastName !== "AI") {
        playerName = randomPlayer.lastName;
      } else if (randomPlayer.firstName && randomPlayer.firstName !== "AI" && randomPlayer.firstName !== "Player") {
        playerName = randomPlayer.firstName;
      } else if (randomPlayer.name && !randomPlayer.name.includes("Player") && !randomPlayer.name.includes("AI")) {
        playerName = randomPlayer.name;
      } else {
        // Generate a better generic name based on role
        const roleNames = {
          passer: ["Quarterback", "Playmaker", "Field General"],
          runner: ["Speedster", "Rusher", "Charger"],
          blocker: ["Guardian", "Defender", "Wall"]
        };
        const names = roleNames[randomPlayer.role as keyof typeof roleNames] || ["Player"];
        playerName = names[Math.floor(Math.random() * names.length)];
      }
      
      // Calculate player effectiveness and fatigue
      const playerPower = (randomPlayer.speed + randomPlayer.power + randomPlayer.throwing + 
                          randomPlayer.catching + randomPlayer.kicking) / 5;
      const isHighPerformer = playerPower > 25;
      const isStruggling = playerPower < 15;
      const isFatigued = currentTime > currentState.maxTime * 0.7; // Fatigue in last 30%
      
      // Stat-specific events based on player attributes
      const statBasedEvents = [];
      
      // Speed-based events
      if (randomPlayer.speed > 32) {
        statBasedEvents.push(`${playerName} (${playerTeam}) blazes past defenders with lightning speed!`);
        statBasedEvents.push(`${playerName} uses explosive acceleration to break free!`);
      } else if (randomPlayer.speed < 15) {
        statBasedEvents.push(`${playerName} struggles to keep pace with the play`);
      }
      
      // Power-based events
      if (randomPlayer.power > 32) {
        statBasedEvents.push(`${playerName} (${playerTeam}) delivers a bone-crushing tackle!`);
        statBasedEvents.push(`${playerName} bulldozes through the opposition!`);
        statBasedEvents.push(`${playerName} knocks down an opponent with sheer strength!`);
      } else if (randomPlayer.power < 15) {
        statBasedEvents.push(`${playerName} bounces off a stronger opponent`);
      }
      
      // Stamina-based events (fatigue)
      if (isFatigued) {
        if (randomPlayer.stamina > 30) {
          statBasedEvents.push(`${playerName} (${playerTeam}) shows remarkable endurance late in the game!`);
        } else if (randomPlayer.stamina < 20) {
          statBasedEvents.push(`${playerName} is visibly winded and slowing down`);
          statBasedEvents.push(`${playerName} gasps for air between plays`);
        }
      }
      
      // Agility-based events
      if (randomPlayer.agility > 32) {
        statBasedEvents.push(`${playerName} (${playerTeam}) makes an incredible evasive maneuver!`);
        statBasedEvents.push(`${playerName} dances through traffic with amazing footwork!`);
      }
      
      // Leadership events
      if (randomPlayer.leadership > 30) {
        statBasedEvents.push(`${playerName} rallies ${playerTeam} with inspiring leadership!`);
        statBasedEvents.push(`${playerName} organizes the team's defensive formation!`);
      }
      
      // Enhanced events with momentum and performance feedback
      const baseEvents = [
        // General ball movement with consistent team labels
        `The ball is loose at midfield! ${playerName} dives for it!`,
        `${playerName} (${playerTeam}) intercepts the pass!`,
        `${playerName} (${playerTeam}) breaks through the defensive line!`,
        `Strong defensive pressure from ${playerName} (${playerTeam})!`,
        
        // Performance-based events
        ...(isHighPerformer ? [
          `${playerName} (${playerTeam}) is playing exceptionally well today!`,
          `${playerName} dominates the field with superior skills!`,
          `Outstanding play by ${playerName} (${playerTeam})!`
        ] : []),
        
        ...(isStruggling ? [
          `${playerName} struggles to find their rhythm`,
          `${playerName} looks off their game today`,
          `${playerName} needs to step up their performance`
        ] : []),
        
        // Role-specific events with team context
        ...(randomPlayer.role === 'passer' ? [
          `${playerName} (${playerTeam}) looks for an open teammate downfield!`,
          `${playerName} attempts a long pass across the arena!`,
          `${playerName} scrambles under pressure from ${opponentTeam}!`,
          ...(randomPlayer.throwing > 30 ? [`Perfect spiral from ${playerName} (${playerTeam})!`] : []),
          ...(randomPlayer.throwing < 15 ? [`${playerName}'s pass goes wide of the target!`] : [])
        ] : []),
        
        ...(randomPlayer.role === 'runner' ? [
          `${playerName} (${playerTeam}) charges forward with the ball!`,
          `${playerName} breaks through a tackle attempt!`,
          `${playerName} jukes past a ${opponentTeam} defender!`,
        ] : []),
        
        ...(randomPlayer.role === 'blocker' ? [
          `${playerName} (${playerTeam}) delivers a crushing block!`,
          `${playerName} holds the line against ${opponentTeam}!`,
          `${playerName} creates an opening for ${playerTeam} teammates!`,
        ] : []),
        
        // Add stat-based events to pool
        ...statBasedEvents,
        
        // Team dynamics and momentum
        `${playerTeam} builds momentum with coordinated plays!`,
        `${opponentTeam} responds with fierce determination!`,
        `Intense back-and-forth battle between ${playerTeam} and ${opponentTeam}!`,
        `The crowd gets excited as the pace picks up!`,
        `Both teams fighting hard for field position!`
      ];
      
      const randomEvent = baseEvents[Math.floor(Math.random() * baseEvents.length)];
      const timeStr = formatGameTime(currentTime);
      
      // Add to log with correct timestamp
      setGameState(prevState => ({
        ...prevState,
        gameLog: [`[${timeStr}] ${randomEvent}`, ...prevState.gameLog]
      }));
      
      // Enhanced scoring opportunities with better player selection
      if (Math.random() < 0.008) { // 0.8% chance for scoring
        const scoringTeam = Math.random() < 0.5 ? team1 : team2;
        const scoringPlayers = scoringTeam === team1 ? team1Players : team2Players;
        
        // Favor high-stat players for scoring
        const weightedPlayers = scoringPlayers.map(p => ({
          player: p,
          weight: (p.speed + p.power + p.agility) / 3
        })).sort((a, b) => b.weight - a.weight);
        
        const scorer = weightedPlayers[Math.floor(Math.random() * Math.min(4, weightedPlayers.length))].player;
        let scorerName = "Unknown";
        if (scorer.lastName && scorer.lastName !== "Player" && scorer.lastName !== "AI") {
          scorerName = scorer.lastName;
        } else if (scorer.firstName && scorer.firstName !== "AI") {
          scorerName = scorer.firstName;
        } else if (scorer.name && !scorer.name.includes("Player")) {
          scorerName = scorer.name;
        }
        
        setGameState(prevState => ({
          ...prevState,
          team1Score: scoringTeam === team1 ? prevState.team1Score + 1 : prevState.team1Score,
          team2Score: scoringTeam === team2 ? prevState.team2Score + 1 : prevState.team2Score,
          gameLog: [`[${timeStr}] 🚨 SCORE! ${scorerName} finds the back of the net for ${scoringTeam.name}!`, ...prevState.gameLog]
        }));
      }
      
      // Momentum shifts and key moments (rare)
      if (Math.random() < 0.02) { // 2% chance for special moments
        const momentumEvents = [
          `The momentum shifts dramatically!`,
          `A crucial play develops...`,
          `This could be a turning point in the match!`,
          `Both teams sense an opportunity!`,
          `The intensity reaches a new level!`
        ];
        const momentumEvent = momentumEvents[Math.floor(Math.random() * momentumEvents.length)];
        setGameState(prevState => ({
          ...prevState,
          gameLog: [`[${timeStr}] ${momentumEvent}`, ...prevState.gameLog]
        }));
      }
    }
  };

  const simulatePlayerActions = (currentTime?: number) => {
    // Generate events with actual player names and team context
    if (Math.random() < 0.1) { // 10% chance per second for an event
      const team1Players = players.filter(p => p.teamId === team1.id);
      const team2Players = players.filter(p => p.teamId === team2.id);
      const allPlayers = [...team1Players, ...team2Players];
      
      if (allPlayers.length === 0) return;
      
      const randomPlayer = allPlayers[Math.floor(Math.random() * allPlayers.length)];
      const playerTeam = randomPlayer.teamId === team1.id ? team1.name : team2.name;
      const opponentTeam = randomPlayer.teamId === team1.id ? team2.name : team1.name;
      
      // Enhanced name selection that handles AI team players better
      let playerName = "Unknown";
      if (randomPlayer.lastName && randomPlayer.lastName !== "Player" && randomPlayer.lastName !== "AI") {
        playerName = randomPlayer.lastName;
      } else if (randomPlayer.firstName && randomPlayer.firstName !== "AI" && randomPlayer.firstName !== "Player") {
        playerName = randomPlayer.firstName;
      } else if (randomPlayer.name && !randomPlayer.name.includes("Player") && !randomPlayer.name.includes("AI")) {
        playerName = randomPlayer.name;
      } else {
        // Generate a better generic name based on role
        const roleNames = {
          passer: ["Quarterback", "Playmaker", "Field General"],
          runner: ["Speedster", "Rusher", "Charger"],
          blocker: ["Guardian", "Defender", "Wall"]
        };
        const names = roleNames[randomPlayer.role as keyof typeof roleNames] || ["Player"];
        playerName = names[Math.floor(Math.random() * names.length)];
      }
      
      // Calculate player effectiveness and fatigue
      const playerPower = (randomPlayer.speed + randomPlayer.power + randomPlayer.throwing + 
                          randomPlayer.catching + randomPlayer.kicking) / 5;
      const isHighPerformer = playerPower > 25;
      const isStruggling = playerPower < 15;
      const isFatigued = currentTime && currentTime > gameState.maxTime * 0.7; // Fatigue in last 30%
      
      // Stat-specific events based on player attributes
      const statBasedEvents = [];
      
      // Speed-based events
      if (randomPlayer.speed > 32) {
        statBasedEvents.push(`${playerName} blazes past defenders with lightning speed!`);
        statBasedEvents.push(`${playerName} uses explosive acceleration to break free!`);
      } else if (randomPlayer.speed < 15) {
        statBasedEvents.push(`${playerName} struggles to keep pace with the play`);
      }
      
      // Power-based events
      if (randomPlayer.power > 32) {
        statBasedEvents.push(`${playerName} delivers a bone-crushing tackle!`);
        statBasedEvents.push(`${playerName} bulldozes through the opposition!`);
        statBasedEvents.push(`${playerName} knocks down an opponent with sheer strength!`);
      } else if (randomPlayer.power < 15) {
        statBasedEvents.push(`${playerName} bounces off a stronger opponent`);
      }
      
      // Stamina-based events (fatigue)
      if (isFatigued) {
        if (randomPlayer.stamina > 30) {
          statBasedEvents.push(`${playerName} shows remarkable endurance late in the game!`);
        } else if (randomPlayer.stamina < 20) {
          statBasedEvents.push(`${playerName} is visibly winded and slowing down`);
          statBasedEvents.push(`${playerName} gasps for air between plays`);
        }
      }
      
      // Agility-based events
      if (randomPlayer.agility > 32) {
        statBasedEvents.push(`${playerName} makes an incredible evasive maneuver!`);
        statBasedEvents.push(`${playerName} dances through traffic with amazing footwork!`);
      }
      
      // Leadership events
      if (randomPlayer.leadership > 30) {
        statBasedEvents.push(`${playerName} rallies ${playerTeam} with inspiring leadership!`);
        statBasedEvents.push(`${playerName} organizes the team's defensive formation!`);
      }
      
      // Enhanced events with momentum and performance feedback
      const baseEvents = [
        // General ball movement
        `The ball is loose at midfield! ${playerName} dives for it!`,
        `${playerName} (${playerTeam}) intercepts the pass!`,
        `${playerName} breaks through the defensive line!`,
        `Strong defensive pressure from ${playerName}!`,
        
        // Performance-based events
        ...(isHighPerformer ? [
          `${playerName} is playing exceptionally well today!`,
          `${playerName} dominates the field with superior skills!`,
          `Outstanding play by ${playerName}!`
        ] : []),
        
        ...(isStruggling ? [
          `${playerName} struggles to find their rhythm`,
          `${playerName} looks off their game today`,
          `${playerName} needs to step up their performance`
        ] : []),
        
        // Role-specific events with team context
        ...(randomPlayer.role === 'passer' ? [
          `${playerName} (${playerTeam}) looks for an open teammate downfield!`,
          `${playerName} attempts a long pass across the arena!`,
          `${playerName} scrambles under pressure from ${opponentTeam}!`,
          ...(randomPlayer.throwing > 30 ? [`Perfect spiral from ${playerName} (${playerTeam})!`] : []),
          ...(randomPlayer.throwing < 15 ? [`${playerName}'s pass goes wide of the target!`] : [])
        ] : []),
        
        ...(randomPlayer.role === 'runner' ? [
          `${playerName} (${playerTeam}) charges forward with the ball!`,
          `${playerName} breaks through a tackle attempt!`,
          `${playerName} jukes past a ${opponentTeam} defender!`,
        ] : []),
        
        ...(randomPlayer.role === 'blocker' ? [
          `${playerName} (${playerTeam}) delivers a crushing block!`,
          `${playerName} holds the line against ${opponentTeam}!`,
          `${playerName} creates an opening for ${playerTeam} teammates!`,
        ] : []),
        
        // Add stat-based events to pool
        ...statBasedEvents,
        
        // Team dynamics and momentum
        `${playerTeam} builds momentum with coordinated plays!`,
        `${opponentTeam} responds with fierce determination!`,
        `Intense back-and-forth battle between ${playerTeam} and ${opponentTeam}!`,
        `The crowd gets excited as the pace picks up!`,
        `Both teams fighting hard for field position!`
      ];
      
      const randomEvent = baseEvents[Math.floor(Math.random() * baseEvents.length)];
      addToLog(randomEvent, currentTime);
      
      // Enhanced scoring opportunities with better player selection
      if (Math.random() < 0.008) { // 0.8% chance for scoring
        const scoringTeam = Math.random() < 0.5 ? team1 : team2;
        const scoringPlayers = scoringTeam === team1 ? team1Players : team2Players;
        
        // Favor high-stat players for scoring
        const weightedPlayers = scoringPlayers.map(p => ({
          player: p,
          weight: (p.speed + p.power + p.agility) / 3
        })).sort((a, b) => b.weight - a.weight);
        
        const scorer = weightedPlayers[Math.floor(Math.random() * Math.min(4, weightedPlayers.length))].player;
        let scorerName = "Unknown";
        if (scorer.lastName && scorer.lastName !== "Player" && scorer.lastName !== "AI") {
          scorerName = scorer.lastName;
        } else if (scorer.firstName && scorer.firstName !== "AI") {
          scorerName = scorer.firstName;
        } else if (scorer.name && !scorer.name.includes("Player")) {
          scorerName = scorer.name;
        }
        
        addToLog(`🚨 SCORE! ${scorerName} finds the back of the net for ${scoringTeam.name}!`, currentTime);
        
        setGameState(prev => ({
          ...prev,
          team1Score: scoringTeam === team1 ? prev.team1Score + 1 : prev.team1Score,
          team2Score: scoringTeam === team2 ? prev.team2Score + 1 : prev.team2Score
        }));
      }
      
      // Momentum shifts and key moments (rare)
      if (Math.random() < 0.02) { // 2% chance for special moments
        const momentumEvents = [
          `The momentum shifts dramatically!`,
          `A crucial play develops...`,
          `This could be a turning point in the match!`,
          `Both teams sense an opportunity!`,
          `The intensity reaches a new level!`
        ];
        addToLog(momentumEvents[Math.floor(Math.random() * momentumEvents.length)], currentTime);
      }
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

  const timeDisplay = formatGameTime(gameState.gameTime);

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
                {isExhibition ? 
                  (gameState.currentHalf === 1 ? "First Half" : "Second Half") : 
                  `Half ${gameState.currentHalf}`
                } - {timeDisplay}
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
            <Button 
              onClick={() => showAd({
                adType: 'rewarded_video',
                placement: 'match_bonus',
                rewardType: 'premium_currency',
                rewardAmount: 10,
                onAdComplete: (reward) => {
                  if (reward) {
                    console.log(`Rewarded ad completed! Got ${reward.amount} ${reward.type}`);
                  }
                }
              })}
              variant="outline"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              💎 Watch Ad for Rewards
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
      
      {/* Ad System Component - Render based on adConfig from useAdSystem */}
      {adConfig && adConfig.isOpen && (
        <AdSystem
          isOpen={adConfig.isOpen}
          onClose={closeAd}
          adType={adConfig.adType}
          placement={adConfig.placement}
          rewardType={adConfig.rewardType}
          rewardAmount={adConfig.rewardAmount}
          onAdComplete={adConfig.onAdComplete}
        />
      )}
    </div>
  );
}