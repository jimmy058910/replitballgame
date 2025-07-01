import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Pause, Square, RotateCcw, Clock, Users, Zap } from "lucide-react";
import { AdSystem, useAdSystem } from "@/components/AdSystem";
import { calculateTacticalModifiers, determineGameSituation, type TacticalModifiers, type GameState as TacticalGameState, type TeamTacticalInfo } from "../../../shared/tacticalSystem";
import { apiRequest } from '@/lib/queryClient';

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
  // Enhanced dynamic stats
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
  breakawayRuns: number;
  perfectPasses: number;
  clutchPlays: number;
  // Enhanced game state
  currentStamina: number;
  baseStamina: number; // Original stamina for recovery calculations
  temporaryBoosts: { [stat: string]: number }; // Single-game boosts
  position: { x: number; y: number };
  hasBall: boolean;
  isKnockedDown: boolean;
  knockdownTimer: number;
  lastAction: string;
  actionCooldown: number;
  skills: string[]; // Player skills
}

interface GameState {
  gameTime: number;
  maxTime: number;
  currentHalf: 1 | 2;
  team1Score: number;
  team2Score: number;
  ballPosition: { x: number; y: number };
  ballCarrier: string | null;
  ballInAir: boolean;
  ballAirTime: number;
  ballTarget: { x: number; y: number } | null;
  ballIntendedReceiver: string | null;
  isRunning: boolean;
  gameLog: string[];
  // Enhanced state
  currentPlay: string;
  gamePhase: "early" | "middle" | "late" | "clutch";
  momentum: { team1: number; team2: number };
  atmosphericEffects: { crowdNoise: number; intimidation: number };
  weatherEffects: { wind: number; rain: boolean };
}

interface EnhancedMatchProps {
  team1: any;
  team2: any;
  isExhibition?: boolean;
  matchId?: string;
  initialLiveState?: any;
  isLiveMatch?: boolean;
  onMatchComplete?: (result: any) => void;
}

// Enhanced Commentary Generation System
class CommentaryEngine {
  private gameState: GameState;
  private players: Player[];
  private team1: any;
  private team2: any;

  constructor(gameState: GameState, players: Player[], team1: any, team2: any) {
    this.gameState = gameState;
    this.players = players;
    this.team1 = team1;
    this.team2 = team2;
  }

  generateRunPlayCommentary(runner: Player, yards: number, tackler?: Player, hasSkill?: string): string {
    const teamName = runner.teamId === this.team1.id ? this.team1.name : this.team2.name;
    const runnerName = this.getPlayerDisplayName(runner);
    
    if (hasSkill === "Juke Move" && yards > 5) {
      const jukeCommentary = [
        `${runnerName} (${teamName}) makes a defender miss with a spectacular juke move! Gains ${yards} yards!`,
        `Incredible footwork by ${runnerName}! The defender is left grasping at air as he picks up ${yards} yards!`,
        `${runnerName} shows off those shifty moves, leaving the defender behind for a ${yards}-yard gain!`,
        `What a move! ${runnerName} cuts left, then right, dancing through traffic for ${yards} yards!`
      ];
      return jukeCommentary[Math.floor(Math.random() * jukeCommentary.length)];
    }

    if (hasSkill === "Truck Stick" && yards > 3) {
      const truckCommentary = [
        `${runnerName} (${teamName}) powers through the tackle with brute force! ${yards} yards and a defender left on the ground!`,
        `Devastating power by ${runnerName}! He runs right over the defender for ${yards} yards!`,
        `${runnerName} shows no mercy, bulldozing his way forward for ${yards} yards!`,
        `Pure strength on display! ${runnerName} trucks the defender and picks up ${yards} yards!`
      ];
      return truckCommentary[Math.floor(Math.random() * truckCommentary.length)];
    }

    if (yards > 15) {
      const breakawayCommentary = [
        `BREAKAWAY! ${runnerName} (${teamName}) finds a seam and races downfield for ${yards} yards!`,
        `${runnerName} breaks free! He's in the open field now, sprinting for ${yards} yards!`,
        `Explosive speed! ${runnerName} leaves the defense in the dust with a ${yards}-yard burst!`,
        `The crowd is on their feet! ${runnerName} turns on the jets for ${yards} yards!`
      ];
      return breakawayCommentary[Math.floor(Math.random() * breakawayCommentary.length)];
    }

    if (yards <= 2) {
      const shortRunCommentary = [
        `${runnerName} (${teamName}) grinds it out for ${yards} tough yards up the middle.`,
        `Hard-nosed running by ${runnerName}, churning forward for ${yards} yards.`,
        `${runnerName} meets the defense head-on, managing ${yards} yards before going down.`,
        `${runnerName} fights for every inch, gaining ${yards} yards in heavy traffic.`
      ];
      return shortRunCommentary[Math.floor(Math.random() * shortRunCommentary.length)];
    }

    const standardRunCommentary = [
      `${runnerName} (${teamName}) carries the ball forward for ${yards} yards.`,
      `Solid running by ${runnerName}, picking up ${yards} yards on the carry.`,
      `${runnerName} finds some running room, advancing ${yards} yards.`,
      `${runnerName} slashes through the defense for ${yards} yards.`
    ];
    return standardRunCommentary[Math.floor(Math.random() * standardRunCommentary.length)];
  }

  generatePassPlayCommentary(passer: Player, receiver: Player, completion: boolean, yards?: number, hasSkill?: string): string {
    const passerTeam = passer.teamId === this.team1.id ? this.team1.name : this.team2.name;
    const passerName = this.getPlayerDisplayName(passer);
    const receiverName = this.getPlayerDisplayName(receiver);

    if (hasSkill === "Pocket Presence") {
      const pocketCommentary = [
        `${passerName} (${passerTeam}) shows incredible poise in the pocket, gracefully stepping up before delivering the pass!`,
        `Masterful pocket awareness by ${passerName}! He feels the pressure and slides away beautifully!`,
        `${passerName} displays veteran composure, calmly avoiding the rush before making his throw!`
      ];
      return pocketCommentary[Math.floor(Math.random() * pocketCommentary.length)];
    }

    if (hasSkill === "Deadeye" && completion && yards && yards > 10) {
      const deadeyeCommentary = [
        `LASER BEAM! ${passerName} (${passerTeam}) threads the needle with pinpoint accuracy to ${receiverName} for ${yards} yards!`,
        `Perfect precision! ${passerName} drops it in the bucket to ${receiverName} for ${yards} yards!`,
        `Surgical accuracy by ${passerName}! The pass finds ${receiverName} in stride for ${yards} yards!`
      ];
      return deadeyeCommentary[Math.floor(Math.random() * deadeyeCommentary.length)];
    }

    if (!completion) {
      const incompletionCommentary = [
        `${passerName} (${passerTeam}) fires a pass to ${receiverName}, but it falls incomplete.`,
        `Pass attempt by ${passerName} is off target, sailing past ${receiverName}.`,
        `${passerName} tries to connect with ${receiverName}, but the timing is off.`,
        `Miscommunication between ${passerName} and ${receiverName} results in an incomplete pass.`
      ];
      return incompletionCommentary[Math.floor(Math.random() * incompletionCommentary.length)];
    }

    if (completion && yards && yards > 20) {
      const longPassCommentary = [
        `TOUCHDOWN CONNECTION! ${passerName} (${passerTeam}) finds ${receiverName} downfield for ${yards} yards!`,
        `What a strike! ${passerName} connects with ${receiverName} on a beautiful ${yards}-yard completion!`,
        `${passerName} goes deep to ${receiverName}! ${yards} yards and the crowd erupts!`
      ];
      return longPassCommentary[Math.floor(Math.random() * longPassCommentary.length)];
    }

    const standardPassCommentary = [
      `${passerName} (${passerTeam}) completes the pass to ${receiverName} for ${yards || 'a few'} yards.`,
      `Nice connection between ${passerName} and ${receiverName} for ${yards || 'a short'} gain.`,
      `${passerName} finds ${receiverName} in the flat for ${yards || 'minimal'} yardage.`
    ];
    return standardPassCommentary[Math.floor(Math.random() * standardPassCommentary.length)];
  }

  generateTackleCommentary(tackler: Player, ballCarrier: Player, hasSkill?: string): string {
    const tacklerTeam = tackler.teamId === this.team1.id ? this.team1.name : this.team2.name;
    const tacklerName = this.getPlayerDisplayName(tackler);
    const carrierName = this.getPlayerDisplayName(ballCarrier);

    if (hasSkill === "Pancake Block") {
      const pancakeCommentary = [
        `PANCAKED! ${tacklerName} (${tacklerTeam}) absolutely levels ${carrierName}! He's sent into next week!`,
        `Devastating hit by ${tacklerName}! ${carrierName} is demolished and slow to get up!`,
        `${tacklerName} delivers a crushing blow to ${carrierName}! The crowd feels that one!`,
        `Bone-rattling hit! ${tacklerName} knocks ${carrierName} completely off his feet!`
      ];
      return pancakeCommentary[Math.floor(Math.random() * pancakeCommentary.length)];
    }

    if (this.gameState.gamePhase === "clutch") {
      const clutchTackleCommentary = [
        `CRITICAL TACKLE! ${tacklerName} (${tacklerTeam}) makes a game-saving stop on ${carrierName}!`,
        `Clutch defense by ${tacklerName}! He brings down ${carrierName} when it matters most!`,
        `${tacklerName} rises to the occasion with a crucial tackle on ${carrierName}!`
      ];
      return clutchTackleCommentary[Math.floor(Math.random() * clutchTackleCommentary.length)];
    }

    const standardTackleCommentary = [
      `${tacklerName} (${tacklerTeam}) wraps up ${carrierName} for the tackle.`,
      `Solid defense by ${tacklerName}, bringing down ${carrierName}.`,
      `${tacklerName} makes the stop on ${carrierName}.`,
      `${tacklerName} closes in and tackles ${carrierName}.`
    ];
    return standardTackleCommentary[Math.floor(Math.random() * standardTackleCommentary.length)];
  }

  generateAtmosphericCommentary(): string {
    const { crowdNoise, intimidation } = this.gameState.atmosphericEffects;
    
    if (crowdNoise > 80) {
      const crowdCommentary = [
        `The home crowd is deafening! You can feel the stadium shaking!`,
        `Listen to that crowd! The noise is absolutely electric in here!`,
        `The fans are on their feet! This place is rocking!`,
        `What an atmosphere! The crowd noise is affecting communication on the field!`
      ];
      return crowdCommentary[Math.floor(Math.random() * crowdCommentary.length)];
    }

    return "";
  }

  generateStaminaCommentary(player: Player): string {
    if (player.currentStamina < 15) {
      const fatigueCommentary = [
        `${this.getPlayerDisplayName(player)} looks absolutely exhausted out there, a step slower than usual.`,
        `You can see the fatigue setting in for ${this.getPlayerDisplayName(player)} - he's breathing heavily.`,
        `${this.getPlayerDisplayName(player)} is running on fumes at this point in the game.`,
        `The energy levels are dropping for ${this.getPlayerDisplayName(player)} - fatigue is clearly a factor.`
      ];
      return fatigueCommentary[Math.floor(Math.random() * fatigueCommentary.length)];
    }
    return "";
  }

  private getPlayerDisplayName(player: Player): string {
    if (player.lastName && player.lastName !== "Player" && player.lastName !== "AI") {
      return player.lastName;
    } else if (player.firstName && player.firstName !== "AI" && player.firstName !== "Player") {
      return player.firstName;
    } else if (player.name && !player.name.includes("Player") && !player.name.includes("AI")) {
      return player.name;
    } else {
      const roleNames = {
        Passer: ["Quarterback", "Signal Caller", "Field General"],
        Runner: ["Speedster", "Rusher", "Charger"],
        Blocker: ["Guardian", "Protector", "Wall"]
      };
      const names = roleNames[player.role as keyof typeof roleNames] || ["Player"];
      return names[Math.floor(Math.random() * names.length)];
    }
  }
}

// Enhanced Game Simulation Engine
class EnhancedSimulationEngine {
  private gameState: GameState;
  private players: Player[];
  private team1: any;
  private team2: any;
  private tacticalModifiers: { team1: TacticalModifiers; team2: TacticalModifiers } | null;
  private commentaryEngine: CommentaryEngine;

  constructor(gameState: GameState, players: Player[], team1: any, team2: any, tacticalModifiers: any) {
    this.gameState = gameState;
    this.players = players;
    this.team1 = team1;
    this.team2 = team2;
    this.tacticalModifiers = tacticalModifiers;
    this.commentaryEngine = new CommentaryEngine(gameState, players, team1, team2);
  }

  // Pre-Game Setup & Modifier Calculation
  calculatePreGameModifiers(): void {
    // Calculate Home Field Advantage
    this.applyHomeFieldAdvantage();
    
    // Apply Tactical & Coaching Modifiers
    this.applyTacticalModifiers();
    
    // Apply Single-Game Boosts
    this.applySingleGameBoosts();
    
    // Calculate Atmospheric Effects
    this.calculateAtmosphericEffects();
  }

  private applyHomeFieldAdvantage(): void {
    const homeTeam = this.team1;
    const fieldSize = homeTeam.fieldSize || "Standard";
    
    // Apply field size bonuses to home team players only
    const homeTeamPlayers = this.players.filter(p => p.teamId === homeTeam.id);
    
    homeTeamPlayers.forEach(player => {
      switch (fieldSize) {
        case "Small":
          player.temporaryBoosts.power = (player.temporaryBoosts.power || 0) + 2;
          break;
        case "Large":
          player.temporaryBoosts.speed = (player.temporaryBoosts.speed || 0) + 2;
          player.temporaryBoosts.agility = (player.temporaryBoosts.agility || 0) + 1;
          break;
        case "Standard":
          player.temporaryBoosts.stamina = (player.temporaryBoosts.stamina || 0) + 1;
          break;
      }
    });

    // Calculate intimidation factor
    const fanLoyalty = homeTeam.fanLoyalty || 50;
    const attendanceRate = Math.min(100, 60 + fanLoyalty * 0.4); // Base 60% + loyalty bonus
    const intimidationFactor = Math.floor((fanLoyalty * attendanceRate) / 100);
    
    // Apply crowd noise debuff to away team
    const awayTeamPlayers = this.players.filter(p => p.teamId === this.team2.id);
    const crowdNoiseDebuff = Math.floor(intimidationFactor / 20); // -1 per 20 intimidation points
    
    awayTeamPlayers.forEach(player => {
      player.temporaryBoosts.catching = (player.temporaryBoosts.catching || 0) - crowdNoiseDebuff;
      player.temporaryBoosts.throwing = (player.temporaryBoosts.throwing || 0) - crowdNoiseDebuff;
    });

    this.gameState.atmosphericEffects.intimidation = intimidationFactor;
    this.gameState.atmosphericEffects.crowdNoise = attendanceRate;
  }

  private applyTacticalModifiers(): void {
    if (!this.tacticalModifiers) return;

    // Apply tactical focus effects to players
    this.applyTacticalFocusToTeam(this.team1.id, this.tacticalModifiers.team1);
    this.applyTacticalFocusToTeam(this.team2.id, this.tacticalModifiers.team2);
  }

  private applyTacticalFocusToTeam(teamId: string, modifiers: TacticalModifiers): void {
    const teamPlayers = this.players.filter(p => p.teamId === teamId);
    
    teamPlayers.forEach(player => {
      // Apply modifiers based on tactical focus
      if (modifiers.staminaDepletionModifier !== 1) {
        player.temporaryBoosts.stamina = (player.temporaryBoosts.stamina || 0) + 
          Math.floor((1 - modifiers.staminaDepletionModifier) * 5);
      }
      
      // Apply tactical focus effects based on stamina modifier
      if (modifiers.staminaDepletionModifier < 1.0) {
        player.temporaryBoosts.throwing = (player.temporaryBoosts.throwing || 0) + 1;
      }
      
      if (modifiers.powerBonusModifier !== 1) {
        player.temporaryBoosts.power = (player.temporaryBoosts.power || 0) + 
          Math.floor((modifiers.powerBonusModifier - 1) * 10);
      }
    });
  }

  private applySingleGameBoosts(): void {
    // Apply any active single-game boosts from items/consumables
    // This would integrate with the store system for performance items
  }

  private calculateAtmosphericEffects(): void {
    // Update game phase based on time
    const timePercent = this.gameState.gameTime / this.gameState.maxTime;
    
    if (timePercent < 0.25) this.gameState.gamePhase = "early";
    else if (timePercent < 0.75) this.gameState.gamePhase = "middle";
    else if (timePercent < 0.9) this.gameState.gamePhase = "late";
    else this.gameState.gamePhase = "clutch";

    // Calculate momentum based on recent scoring
    const scoreDiff = this.gameState.team1Score - this.gameState.team2Score;
    this.gameState.momentum.team1 = Math.max(0, Math.min(100, 50 + scoreDiff * 10));
    this.gameState.momentum.team2 = 100 - this.gameState.momentum.team1;
  }

  // Enhanced Turn-Based Simulation
  simulateTurn(): string[] {
    const commentary: string[] = [];
    
    // Determine ball possession
    const ballCarrier = this.getBallCarrier();
    
    if (ballCarrier) {
      // Execute player actions based on AI and role
      const actionResult = this.executePlayerAction(ballCarrier);
      if (actionResult.commentary) {
        commentary.push(actionResult.commentary);
      }
      
      // Resolve action consequences
      this.resolveActionConsequences(actionResult);
    }
    
    // Update player stamina
    this.updatePlayerStamina();
    
    // Check for atmospheric events
    const atmosphericCommentary = this.commentaryEngine.generateAtmosphericCommentary();
    if (atmosphericCommentary) {
      commentary.push(atmosphericCommentary);
    }
    
    // Check for stamina-based commentary
    const fatigueCommentary = this.checkFatigueCommentary();
    if (fatigueCommentary) {
      commentary.push(fatigueCommentary);
    }
    
    return commentary;
  }

  private getBallCarrier(): Player | null {
    if (this.gameState.ballCarrier) {
      return this.players.find(p => p.id === this.gameState.ballCarrier) || null;
    }
    return null;
  }

  private executePlayerAction(player: Player): { action: string; commentary?: string; result?: any } {
    // Determine action based on player role and game situation
    const role = player.role;
    const effectiveStats = this.getEffectiveStats(player);
    
    if (role === "Runner") {
      return this.executeRunPlay(player, effectiveStats);
    } else if (role === "Passer") {
      return this.executePassPlay(player, effectiveStats);
    } else {
      return this.executeBlockingPlay(player, effectiveStats);
    }
  }

  private getEffectiveStats(player: Player): any {
    // Calculate effective stats including all modifiers
    const effective = {
      speed: player.speed + (player.temporaryBoosts.speed || 0),
      power: player.power + (player.temporaryBoosts.power || 0),
      throwing: player.throwing + (player.temporaryBoosts.throwing || 0),
      catching: player.catching + (player.temporaryBoosts.catching || 0),
      agility: player.agility + (player.temporaryBoosts.agility || 0),
      stamina: player.currentStamina
    };
    
    // Apply fatigue penalties
    if (player.currentStamina < 20) {
      const fatiguePenalty = Math.floor((20 - player.currentStamina) / 5);
      effective.speed -= fatiguePenalty;
      effective.agility -= fatiguePenalty;
      effective.power -= Math.floor(fatiguePenalty / 2);
    }
    
    return effective;
  }

  private executeRunPlay(runner: Player, stats: any): { action: string; commentary?: string; result?: any } {
    const yards = this.calculateRunYards(runner, stats);
    const hasJukeMove = runner.skills.includes("Juke Move");
    const hasTruckStick = runner.skills.includes("Truck Stick");
    
    let skillUsed = undefined;
    
    // Check for skill usage
    if (hasJukeMove && Math.random() < 0.3 && stats.agility > 25) {
      skillUsed = "Juke Move";
      runner.breakawayRuns++;
    } else if (hasTruckStick && Math.random() < 0.25 && stats.power > 28) {
      skillUsed = "Truck Stick";
      runner.knockdownsInflicted++;
    }
    
    runner.yardsGained += yards;
    
    const commentary = this.commentaryEngine.generateRunPlayCommentary(runner, yards, undefined, skillUsed);
    
    return {
      action: "run",
      commentary,
      result: { yards, skillUsed }
    };
  }

  private executePassPlay(passer: Player, stats: any): { action: string; commentary?: string; result?: any } {
    const target = this.findOpenReceiver(passer);
    if (!target) {
      return { action: "pass", commentary: `${this.getPlayerDisplayName(passer)} can't find an open receiver.` };
    }
    
    const completion = this.calculatePassSuccess(passer, target, stats);
    const yards = completion ? this.calculatePassYards(passer, target) : 0;
    
    const hasDeadeye = passer.skills.includes("Deadeye");
    const hasPocketPresence = passer.skills.includes("Pocket Presence");
    
    let skillUsed = undefined;
    
    if (hasPocketPresence && Math.random() < 0.2) {
      skillUsed = "Pocket Presence";
    } else if (hasDeadeye && completion && Math.random() < 0.3) {
      skillUsed = "Deadeye";
      passer.perfectPasses++;
    }
    
    passer.passesAttempted++;
    if (completion) {
      passer.passesCompleted++;
      target.passesCaught++;
      target.yardsGained += yards;
    } else {
      target.droppedPasses++;
    }
    
    const commentary = this.commentaryEngine.generatePassPlayCommentary(passer, target, completion, yards, skillUsed);
    
    return {
      action: "pass",
      commentary,
      result: { completion, yards, target: target.id, skillUsed }
    };
  }

  private executeBlockingPlay(blocker: Player, stats: any): { action: string; commentary?: string; result?: any } {
    const hasPancakeBlock = blocker.skills.includes("Pancake Block");
    const target = this.findBlockingTarget(blocker);
    
    if (!target) {
      return { action: "block", commentary: `${this.getPlayerDisplayName(blocker)} holds his position.` };
    }
    
    const blockSuccess = this.calculateBlockSuccess(blocker, target, stats);
    
    let skillUsed = undefined;
    
    if (hasPancakeBlock && blockSuccess && Math.random() < 0.2) {
      skillUsed = "Pancake Block";
      blocker.knockdownsInflicted++;
      target.isKnockedDown = true;
      target.knockdownTimer = 3;
    }
    
    const commentary = this.commentaryEngine.generateTackleCommentary(blocker, target, skillUsed);
    
    return {
      action: "block",
      commentary,
      result: { success: blockSuccess, target: target.id, skillUsed }
    };
  }

  private calculateRunYards(runner: Player, stats: any): number {
    const baseYards = Math.floor(Math.random() * 8) + 1; // 1-8 base yards
    const speedBonus = Math.floor(stats.speed / 10);
    const powerBonus = Math.floor(stats.power / 15);
    
    // Breakaway chance based on speed differential
    const breakawayChance = Math.max(0, (stats.speed - 25) / 100);
    if (Math.random() < breakawayChance) {
      return baseYards + speedBonus + Math.floor(Math.random() * 15) + 10;
    }
    
    return Math.max(1, baseYards + speedBonus + powerBonus);
  }

  private calculatePassYards(passer: Player, receiver: Player): number {
    const baseYards = Math.floor(Math.random() * 12) + 3; // 3-14 base yards
    const throwingBonus = Math.floor(passer.throwing / 12);
    const catchingBonus = Math.floor(receiver.catching / 15);
    
    return Math.max(1, baseYards + throwingBonus + catchingBonus);
  }

  private calculatePassSuccess(passer: Player, receiver: Player, stats: any): boolean {
    const throwingAccuracy = stats.throwing / 40; // 0-1 scale
    const catchingSkill = receiver.catching / 40;
    const difficultyModifier = Math.random() * 0.3; // Random difficulty
    
    const successChance = (throwingAccuracy + catchingSkill) / 2 - difficultyModifier;
    
    return Math.random() < Math.max(0.1, Math.min(0.9, successChance));
  }

  private calculateBlockSuccess(blocker: Player, target: Player, stats: any): boolean {
    const blockerPower = stats.power / 40;
    const targetAgility = target.agility / 40;
    
    const successChance = blockerPower - targetAgility + 0.5;
    
    return Math.random() < Math.max(0.2, Math.min(0.8, successChance));
  }

  private findOpenReceiver(passer: Player): Player | null {
    const teamPlayers = this.players.filter(p => 
      p.teamId === passer.teamId && 
      p.id !== passer.id && 
      !p.isKnockedDown
    );
    
    if (teamPlayers.length === 0) return null;
    
    // Weighted selection based on catching ability
    const weightedPlayers = teamPlayers.map(p => ({
      player: p,
      weight: p.catching + Math.random() * 10
    })).sort((a, b) => b.weight - a.weight);
    
    return weightedPlayers[0].player;
  }

  private findBlockingTarget(blocker: Player): Player | null {
    const enemyPlayers = this.players.filter(p => 
      p.teamId !== blocker.teamId && 
      !p.isKnockedDown
    );
    
    if (enemyPlayers.length === 0) return null;
    
    return enemyPlayers[Math.floor(Math.random() * enemyPlayers.length)];
  }

  private resolveActionConsequences(actionResult: any): void {
    // Handle scoring
    if (actionResult.result?.yards && actionResult.result.yards > 20) {
      // Potential scoring play
      if (Math.random() < 0.3) {
        const scorer = this.getBallCarrier();
        if (scorer) {
          scorer.scores++;
          if (scorer.teamId === this.team1.id) {
            this.gameState.team1Score++;
          } else {
            this.gameState.team2Score++;
          }
        }
      }
    }
    
    // Handle turnovers
    if (actionResult.action === "pass" && !actionResult.result?.completion && Math.random() < 0.1) {
      // Interception chance
      const interceptor = this.findInterceptor();
      if (interceptor) {
        interceptor.interceptions++;
        this.gameState.ballCarrier = interceptor.id;
      }
    }
  }

  private findInterceptor(): Player | null {
    const ballCarrier = this.getBallCarrier();
    if (!ballCarrier) return null;
    
    const enemyPlayers = this.players.filter(p => 
      p.teamId !== ballCarrier.teamId && 
      !p.isKnockedDown
    );
    
    if (enemyPlayers.length === 0) return null;
    
    // Weight by catching ability for interceptions
    const weightedPlayers = enemyPlayers.map(p => ({
      player: p,
      weight: p.catching + p.agility
    })).sort((a, b) => b.weight - a.weight);
    
    return weightedPlayers[0].player;
  }

  private updatePlayerStamina(): void {
    this.players.forEach(player => {
      if (!player.isKnockedDown) {
        // Stamina depletion based on activity and modifiers
        let staminaLoss = 1;
        
        // Apply tactical modifiers
        if (this.tacticalModifiers) {
          const teamMods = player.teamId === this.team1.id ? 
            this.tacticalModifiers.team1 : this.tacticalModifiers.team2;
          staminaLoss *= teamMods.staminaDepletionModifier;
        }
        
        // Apply fatigue scaling
        if (this.gameState.gamePhase === "late" || this.gameState.gamePhase === "clutch") {
          staminaLoss *= 1.5;
        }
        
        player.currentStamina = Math.max(5, player.currentStamina - staminaLoss);
      } else {
        // Handle knockdown recovery
        player.knockdownTimer--;
        if (player.knockdownTimer <= 0) {
          player.isKnockedDown = false;
        }
      }
      
      // Gradual stamina recovery during brief pauses
      if (Math.random() < 0.1 && player.currentStamina < player.baseStamina) {
        player.currentStamina = Math.min(player.baseStamina, player.currentStamina + 1);
      }
    });
  }

  private checkFatigueCommentary(): string {
    const fatiguedPlayers = this.players.filter(p => p.currentStamina < 15);
    
    if (fatiguedPlayers.length > 0 && Math.random() < 0.1) {
      const randomPlayer = fatiguedPlayers[Math.floor(Math.random() * fatiguedPlayers.length)];
      return this.commentaryEngine.generateStaminaCommentary(randomPlayer);
    }
    
    return "";
  }

  private getPlayerDisplayName(player: Player): string {
    if (player.lastName && player.lastName !== "Player" && player.lastName !== "AI") {
      return player.lastName;
    } else if (player.firstName && player.firstName !== "AI" && player.firstName !== "Player") {
      return player.firstName;
    } else if (player.name && !player.name.includes("Player") && !player.name.includes("AI")) {
      return player.name;
    } else {
      const roleNames = {
        Passer: ["Quarterback", "Signal Caller", "Field General"],
        Runner: ["Speedster", "Rusher", "Charger"],
        Blocker: ["Guardian", "Protector", "Wall"]
      };
      const names = roleNames[player.role as keyof typeof roleNames] || ["Player"];
      return names[Math.floor(Math.random() * names.length)];
    }
  }
}

export default function EnhancedMatchSimulation({ 
  team1, 
  team2, 
  isExhibition = false, 
  matchId,
  initialLiveState,
  isLiveMatch = false,
  onMatchComplete 
}: EnhancedMatchProps) {
  const [gameState, setGameState] = useState<GameState>({
    gameTime: initialLiveState?.gameTime || 0,
    maxTime: initialLiveState?.maxTime || (isExhibition ? 1200 : 1800),
    currentHalf: initialLiveState?.currentHalf || 1,
    team1Score: initialLiveState?.team1Score || 0,
    team2Score: initialLiveState?.team2Score || 0,
    ballPosition: { x: 0, y: 0 },
    ballCarrier: null,
    ballInAir: false,
    ballAirTime: 0,
    ballTarget: null,
    ballIntendedReceiver: null,
    isRunning: initialLiveState?.isRunning || false,
    gameLog: initialLiveState?.recentEvents?.map((event: any) => 
      `[${Math.floor(event.time / 60)}:${String(event.time % 60).padStart(2, '0')}] ${event.description}`
    ) || ["🏟️ Game starting at midfield... Enhanced simulation active!"],
    // Enhanced state
    currentPlay: "Opening kickoff",
    gamePhase: "early",
    momentum: { team1: 50, team2: 50 },
    atmosphericEffects: { crowdNoise: 60, intimidation: 30 },
    weatherEffects: { wind: 0, rain: false }
  });

  const [players, setPlayers] = useState<Player[]>([]);
  const [tacticalModifiers, setTacticalModifiers] = useState<{
    team1: TacticalModifiers;
    team2: TacticalModifiers;
  } | null>(null);
  const [simulationEngine, setSimulationEngine] = useState<EnhancedSimulationEngine | null>(null);
  
  const logRef = useRef<HTMLDivElement>(null);
  const [halftimeAdShown, setHalftimeAdShown] = useState(false);
  const { showRewardedVideoAd, closeAd, adConfig } = useAdSystem();
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize enhanced players and simulation engine
  useEffect(() => {
    const initializeEnhancedSimulation = () => {
      const team1Players = (team1?.players || []).slice(0, 6).map((p: any, index: number) => ({
        ...p,
        role: p.role || (index === 0 ? "Passer" : index < 3 ? "Runner" : "Blocker"),
        teamId: team1.id,
        // Enhanced stats
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
        breakawayRuns: 0,
        perfectPasses: 0,
        clutchPlays: 0,
        // Enhanced game state
        currentStamina: p.stamina || 30,
        baseStamina: p.stamina || 30,
        temporaryBoosts: {},
        position: { x: -400 + index * 50, y: -200 + (index % 3) * 100 },
        hasBall: index === 0, // Start with passer
        isKnockedDown: false,
        knockdownTimer: 0,
        lastAction: "ready",
        actionCooldown: 0,
        skills: [] // Would be loaded from player skills system
      }));

      const team2Players = (team2?.players || []).slice(0, 6).map((p: any, index: number) => ({
        ...p,
        role: p.role || (index === 0 ? "Passer" : index < 3 ? "Runner" : "Blocker"),
        teamId: team2.id,
        // Enhanced stats
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
        breakawayRuns: 0,
        perfectPasses: 0,
        clutchPlays: 0,
        // Enhanced game state
        currentStamina: p.stamina || 30,
        baseStamina: p.stamina || 30,
        temporaryBoosts: {},
        position: { x: 400 - index * 50, y: -200 + (index % 3) * 100 },
        hasBall: false,
        isKnockedDown: false,
        knockdownTimer: 0,
        lastAction: "ready",
        actionCooldown: 0,
        skills: [] // Would be loaded from player skills system
      }));

      const allPlayers = [...team1Players, ...team2Players];
      setPlayers(allPlayers);
      
      // Set initial ball carrier
      setGameState(prev => ({
        ...prev,
        ballCarrier: team1Players[0]?.id || null
      }));

      // Initialize tactical modifiers
      const tacticalGameState: TacticalGameState = {
        homeScore: gameState.team1Score,
        awayScore: gameState.team2Score,
        gameTime: gameState.gameTime,
        maxTime: gameState.maxTime,
        currentHalf: gameState.currentHalf,
      };

      const team1TacticalInfo: TeamTacticalInfo = {
        fieldSize: (team1?.fieldSize || "Standard") as any,
        tacticalFocus: (team1?.tacticalFocus || "Balanced") as any,
        camaraderie: team1?.teamCamaraderie || 50,
        headCoachTactics: team1?.staff?.find((s: any) => s.type === "Head Coach")?.coachingRating || 50,
        isHomeTeam: true,
      };

      const team2TacticalInfo: TeamTacticalInfo = {
        fieldSize: "Standard" as any,
        tacticalFocus: (team2?.tacticalFocus || "Balanced") as any,
        camaraderie: team2?.teamCamaraderie || 50,
        headCoachTactics: team2?.staff?.find((s: any) => s.type === "Head Coach")?.coachingRating || 50,
        isHomeTeam: false,
      };

      const team1Modifiers = calculateTacticalModifiers(team1TacticalInfo, tacticalGameState, true);
      const team2Modifiers = calculateTacticalModifiers(team2TacticalInfo, tacticalGameState, false);

      const modifiers = {
        team1: team1Modifiers,
        team2: team2Modifiers,
      };

      setTacticalModifiers(modifiers);

      // Initialize enhanced simulation engine
      const engine = new EnhancedSimulationEngine(gameState, allPlayers, team1, team2, modifiers);
      engine.calculatePreGameModifiers();
      setSimulationEngine(engine);
    };

    initializeEnhancedSimulation();
  }, [team1, team2]);

  // Auto-scroll log to top
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
      displayTime = seconds;
    } else {
      displayTime = halfTime + (seconds - halfTime);
    }
    
    const minutes = Math.floor(displayTime / 60);
    const secs = Math.floor(displayTime % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const simulateEnhancedGameTick = () => {
    setGameState(prev => {
      if (prev.gameTime >= prev.maxTime) {
        return prev;
      }

      const newGameTime = prev.gameTime + 3; // 3 seconds per tick for enhanced simulation
      
      // Enhanced turn-based simulation
      if (newGameTime < prev.maxTime && simulationEngine) {
        const turnCommentary = simulationEngine.simulateTurn();
        turnCommentary.forEach(comment => {
          if (comment && comment.trim()) {
            addToLog(comment, newGameTime);
          }
        });
      }
      
      // Check for halftime
      if (newGameTime >= prev.maxTime / 2 && prev.currentHalf === 1) {
        const timeStr = formatGameTime(newGameTime);
        
        if (!halftimeAdShown) {
          setHalftimeAdShown(true);
          // Pause game for halftime ad (preserve existing ad system)
          if (gameIntervalRef.current) {
            clearInterval(gameIntervalRef.current);
            gameIntervalRef.current = null;
          }
          const currentIsRunning = prev.isRunning;

          showRewardedVideoAd(
            'halftime',
            'credits',
            Math.floor(Math.random() * 300) + 150,
            async (reward) => {
              if (reward) {
                try {
                  const response = await apiRequest('/api/store/ads/view', 'POST', {
                    adType: 'interstitial',
                    placement: 'halftime', 
                    rewardType: 'credits',
                    rewardAmount: reward.amount,
                    completed: true
                  });
                  
                  if (response.tracking) {
                    let message = `🎯 Halftime boost: ${reward.amount} credits earned!`;
                    message += ` Daily: ${response.tracking.dailyCount}/20`;
                    
                    if (response.tracking.premiumRewardEarned) {
                      message += ` | ⭐ PREMIUM REWARD UNLOCKED!`;
                    } else if (response.tracking.premiumProgress > 0) {
                      message += ` | Premium: ${response.tracking.premiumProgress}/50`;
                    }
                    
                    addToLog(message);
                  } else {
                    addToLog(`🎯 Halftime boost: ${reward.amount} credits earned!`);
                  }
                } catch (error) {
                  console.error('Failed to record halftime ad:', error);
                  addToLog(`🎯 Halftime boost: ${reward.amount} credits earned!`);
                }
              } else {
                addToLog("Halftime ad skipped.");
              }
              setGameState(innerPrev => ({...innerPrev, isRunning: currentIsRunning }));
              if (currentIsRunning && !gameIntervalRef.current && gameState.gameTime < gameState.maxTime) {
                 gameIntervalRef.current = setInterval(simulateEnhancedGameTick, 200); // Faster for enhanced simulation
              }
              closeAd();
            }
          );
        }
        
        return {
          ...prev,
          gameTime: newGameTime,
          currentHalf: 2,
          gameLog: [`[${timeStr}] 🏟️ [HALFTIME] Enhanced Simulation - Score: ${team1?.name || "Team 1"}: ${prev.team1Score} - ${team2?.name || "Team 2"}: ${prev.team2Score}`, ...prev.gameLog]
        };
      }
      
      // Check for game end
      if (newGameTime >= prev.maxTime) {
        const winner = prev.team1Score > prev.team2Score ? team1?.name || "Team 1" : 
                     prev.team2Score > prev.team1Score ? team2?.name || "Team 2" : "Tie";
        
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
          gameLog: [`[${timeStr}] 🏆 [FINAL] Enhanced Simulation Complete! Final Score: ${team1?.name || "Team 1"}: ${prev.team1Score} - ${team2?.name || "Team 2"}: ${prev.team2Score}`, ...prev.gameLog]
        };
      }

      return {
        ...prev,
        gameTime: newGameTime
      };
    });
  };

  const startGame = () => {
    setGameState(prev => ({ ...prev, isRunning: true }));
    gameIntervalRef.current = setInterval(simulateEnhancedGameTick, 200); // Enhanced simulation speed
    addToLog("🚀 Enhanced match simulation started!");
  };

  const pauseGame = () => {
    setGameState(prev => ({ ...prev, isRunning: false }));
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
      gameIntervalRef.current = null;
    }
    addToLog("⏸️ Game paused");
  };

  const stopGame = () => {
    setGameState(prev => ({ ...prev, isRunning: false }));
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
      gameIntervalRef.current = null;
    }
    addToLog("⏹️ Game stopped");
  };

  const resetGame = () => {
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
      gameLog: ["🔄 Enhanced match simulation reset!"],
      currentPlay: "Opening kickoff",
      gamePhase: "early",
      momentum: { team1: 50, team2: 50 },
      atmosphericEffects: { crowdNoise: 60, intimidation: 30 },
      weatherEffects: { wind: 0, rain: false }
    });
    setHalftimeAdShown(false);
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
      gameIntervalRef.current = null;
    }
  };

  // Rest of the component renders exactly as before but with enhanced UI indicators
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header with atmospheric data */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                <Zap className="w-8 h-8 mr-3 text-yellow-400" />
                Enhanced Live Match
              </h1>
              <p className="text-gray-400">
                Dynamic simulation with tactical effects and atmospheric gameplay
              </p>
            </div>
            <Badge variant="secondary" className="bg-yellow-600">
              Enhanced Engine Active
            </Badge>
          </div>
          
          {/* Game info and atmospheric status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {gameState.team1Score} - {gameState.team2Score}
                    </div>
                    <div className="text-sm text-gray-400">
                      {team1?.name || "Team 1"} vs {team2?.name || "Team 2"}
                    </div>
                  </div>
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold">
                      {formatGameTime(gameState.gameTime)}
                    </div>
                    <div className="text-sm text-gray-400">
                      Half {gameState.currentHalf} • {gameState.gamePhase}
                    </div>
                  </div>
                  <Badge variant={gameState.gamePhase === "clutch" ? "destructive" : "secondary"}>
                    {gameState.gamePhase}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold">
                      Crowd: {gameState.atmosphericEffects.crowdNoise}%
                    </div>
                    <div className="text-sm text-gray-400">
                      Intimidation: {gameState.atmosphericEffects.intimidation}
                    </div>
                  </div>
                  <Users className="w-6 h-6 text-green-400" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Enhanced Controls */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={gameState.isRunning ? pauseGame : startGame}
              variant={gameState.isRunning ? "secondary" : "default"}
              disabled={gameState.gameTime >= gameState.maxTime}
            >
              {gameState.isRunning ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Enhanced Sim
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Enhanced Sim
                </>
              )}
            </Button>
            
            <Button onClick={stopGame} variant="outline">
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
            
            <Button onClick={resetGame} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Enhanced Game Log */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2 text-yellow-400" />
              Enhanced Play-by-Play Commentary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96" ref={logRef}>
              <div className="space-y-2">
                {gameState.gameLog.map((entry, index) => (
                  <div
                    key={index}
                    className={`text-sm p-2 rounded ${
                      entry.includes("🏆") || entry.includes("TOUCHDOWN") || entry.includes("SCORE")
                        ? "bg-green-900/30 border border-green-500/30"
                        : entry.includes("🎯") || entry.includes("credits")
                        ? "bg-yellow-900/30 border border-yellow-500/30"
                        : entry.includes("🏟️") || entry.includes("HALFTIME") || entry.includes("FINAL")
                        ? "bg-blue-900/30 border border-blue-500/30"
                        : entry.includes("BREAKAWAY") || entry.includes("LASER BEAM") || entry.includes("PANCAKED")
                        ? "bg-purple-900/30 border border-purple-500/30"
                        : "bg-gray-800/50"
                    }`}
                  >
                    {entry}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      {/* Preserve Ad System - Using the existing ad integration from useAdSystem hook */}
    </div>
  );
}