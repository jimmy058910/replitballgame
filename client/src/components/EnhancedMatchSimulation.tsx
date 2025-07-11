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
  race?: string; // Race for race-based commentary (human, sylvan, gryll, lumina, umbra)
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

// Enhanced Commentary Generation System - 200+ Comprehensive Prompts
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

  // 1. Game State & Flow Commentary
  generatePreGameCommentary(): string {
    const homeTeamPower = this.getTeamPowerTier(this.team1);
    const awayTeamPower = this.getTeamPowerTier(this.team2);
    const homeTactical = this.team1.tacticalFocus || "Balanced";
    const awayTactical = this.team2.tacticalFocus || "Balanced";

    const preGameCommentary = [
      `Welcome to the dome, folks! A tense atmosphere here as the '${homeTeamPower}' ${this.team1.name} prepares to face the '${awayTeamPower}' ${this.team2.name}!`,
      `Both teams are on the field, and the energy from this home crowd is absolutely electric!`,
      `The stage is set for a classic showdown. ${this.team1.name} is coming out with their '${homeTactical}' strategy, looking to dominate from the start.`,
      `${this.team2.name} has opted for a '${awayTactical}' formation today, a clear tactical decision for this matchup.`,
      `It's a clash of styles today! We'll see if ${this.team1.name}'s aggressive tactics can break down the disciplined approach of ${this.team2.name}.`,
      `The players are set. The ball is live. Here we go!`
    ];
    return preGameCommentary[Math.floor(Math.random() * preGameCommentary.length)];
  }

  generateMidGameFlowCommentary(): string {
    const flowCommentary = [
      `We're seeing a real midfield battle unfold. The ball has changed hands three times in the last minute alone.`,
      `${this.getCurrentPossessionTeam()} is putting together a long spell of possession now, patiently working the ball and testing the defense for any sign of weakness.`,
      `The pace of this game is relentless! Non-stop action from end to end with no stoppages.`,
      `A real war of attrition in the center of the field. Neither team is giving an inch.`,
      `You can feel the momentum starting to shift in favor of ${this.getCurrentPossessionTeam()}. They've controlled the ball for the last two minutes of game time.`,
      `Just a chaotic scramble for possession right now, the ball is a pinball out there.`,
      `The physicality of this game is off the charts. Every yard is being earned the hard way.`,
      `${this.getCurrentPossessionTeam()} seems to be controlling the tempo, forcing their opponent to react.`
    ];
    return flowCommentary[Math.floor(Math.random() * flowCommentary.length)];
  }

  generateUrgencyCommentary(): string {
    const timeRemaining = this.gameState.maxTime - this.gameState.gameTime;
    const isClutchTime = this.gameState.gamePhase === "clutch";
    const teamName = this.getCurrentPossessionTeam();

    if (timeRemaining < 120 && this.gameState.currentHalf === 1) {
      const halfEndCommentary = [
        `Just two minutes left in the half! ${teamName} needs to make something happen quickly if they want to score before the break.`,
        `With the clock winding down, they're trying to force the issue, looking for any opening.`,
        `Time is becoming a factor now. ${teamName} is playing with a real sense of urgency.`,
        `The first half comes to a close! A frantic pace right to the end.`
      ];
      return halfEndCommentary[Math.floor(Math.random() * halfEndCommentary.length)];
    }

    if (isClutchTime) {
      const clutchCommentary = [
        `We're in the final minute of the game! Every second counts!`,
        `They need to hurry if they want to get one more possession.`,
        `This is it! Make or break time for both teams!`
      ];
      return clutchCommentary[Math.floor(Math.random() * clutchCommentary.length)];
    }

    return "";
  }

  // 2. The Loose Ball Commentary
  generateLooseBallCommentary(cause: "tackle" | "drop", player?: Player): string {
    const playerName = player ? this.getPlayerDisplayName(player) : "the player";

    if (cause === "tackle") {
      const tackleCommentary = [
        `HUGE HIT! The ball comes loose! It's a fumble and anyone's game!`,
        `Powerful tackle dislodges the ball! It's on the turf!`,
        `${playerName} couldn't hang on after that vicious hit! The ball is LIVE!`,
        `He coughed it up! A massive forced fumble by the defense!`,
        `Stripped! The ball is ripped free from ${playerName}'s grasp!`,
        `The ball pops free after a gang tackle!`,
        `He never had control! The ball is loose on the ground!`
      ];
      return tackleCommentary[Math.floor(Math.random() * tackleCommentary.length)];
    } else {
      const dropCommentary = [
        `The pass is on target but it's DROPPED by ${playerName}! The ball is live on the turf!`,
        `Right through his hands! ${playerName} can't hang on and the ball is up for grabs!`,
        `A perfect pass, but it's a brutal drop by ${playerName} at a critical moment.`,
        `Oh, he has to catch that! The ball bounces off the receiver's chest and is loose!`,
        `An unforced error there, as ${playerName} simply drops the ball.`,
        `The pass is deflected at the last second and falls incomplete... no, it's a live ball!`,
        `A difficult catch, and ${playerName} can't bring it in. The ball is loose.`
      ];
      return dropCommentary[Math.floor(Math.random() * dropCommentary.length)];
    }
  }

  generateScrambleCommentary(recoverer?: Player): string {
    if (recoverer) {
      const recoveryCommentary = [
        `${this.getPlayerDisplayName(recoverer)} emerges from the pile with the ball! A huge turnover for ${this.getPlayerTeamName(recoverer)}!`,
        `Quick thinking by ${this.getPlayerDisplayName(recoverer)} to scoop up the loose ball before the defense could react!`,
        `What a recovery! ${this.getPlayerDisplayName(recoverer)} dives on the ball to secure possession for his team!`,
        `The offense manages to recover their own fumble! A lucky break for them.`,
        `And it's the defense that comes up with it! A massive momentum swing!`
      ];
      return recoveryCommentary[Math.floor(Math.random() * recoveryCommentary.length)];
    } else {
      const scrambleCommentary = [
        `Chaos around the ball! A mad scramble as multiple players dive for it!`,
        `A pile-up for the loose ball near midfield!`
      ];
      return scrambleCommentary[Math.floor(Math.random() * scrambleCommentary.length)];
    }
  }

  // 3. Enhanced Run Play Commentary
  generateRunPlayCommentary(runner: Player, yards: number, tackler?: Player, hasSkill?: string): string {
    const runnerName = this.getPlayerDisplayName(runner);
    const teamName = this.getPlayerTeamName(runner);

    // Race-Based Runs
    if (runner.race) {
      const raceCommentary = this.generateRaceBasedRunCommentary(runner, yards);
      if (raceCommentary) return raceCommentary;
    }

    // Skill-Based Runs
    if (hasSkill === "Juke Move" && yards > 5) {
      const jukeCommentary = [
        `Incredible footwork by ${runnerName}! He uses his Juke Move to leave the defender grasping at air for ${yards} yards!`,
        `What a move! ${runnerName} cuts left, then right, dancing through traffic for a ${yards}-yard gain!`,
        `The defender thought he had him, but ${runnerName}'s juke was just too quick! ${yards} yards!`,
        `${runnerName} shows off those shifty moves, leaving the defender behind for a ${yards}-yard gain!`
      ];
      return jukeCommentary[Math.floor(Math.random() * jukeCommentary.length)];
    }

    if (hasSkill === "Truck Stick" && yards > 3) {
      const truckCommentary = [
        `${runnerName} lowers his shoulder and uses Truck Stick, running right over the would-be tackler for ${yards} extra yards!`,
        `Devastating power by ${runnerName}! He trucks the defender and refuses to go down for ${yards} yards!`,
        `Pure strength on display! ${runnerName} just bulldozed his way through the tackle attempt for ${yards} yards!`,
        `${runnerName} shows no mercy, bulldozing his way forward for ${yards} yards!`
      ];
      return truckCommentary[Math.floor(Math.random() * truckCommentary.length)];
    }

    // Breakaway Runs (High Speed)
    if (yards > 15) {
      const breakawayCommentary = [
        `He finds a seam! ${runnerName} turns on the jets and is in open space for a massive ${yards}-yard gain!`,
        `Explosive speed! ${runnerName} leaves the defense in the dust with a ${yards}-yard burst!`,
        `The crowd is on their feet! ${runnerName} hits top gear and is sprinting downfield for ${yards} yards!`,
        `There's no catching him! ${runnerName} shows off that world-class speed for ${yards} yards!`,
        `A stunning breakaway run! He was a blur as he raced past the defense for ${yards} yards!`,
        `He just has a gear that nobody else on the field possesses! ${yards} yards!`
      ];
      return breakawayCommentary[Math.floor(Math.random() * breakawayCommentary.length)];
    }

    // Standard Runs
    if (yards <= 3) {
      const shortRunCommentary = [
        `${runnerName} grinds it out for ${yards} tough yards up the middle.`,
        `${runnerName} finds a small crease and picks up ${yards} yards.`,
        `He follows his blockers and pushes the pile for a ${yards}-yard gain.`,
        `A smart, patient run from ${runnerName} to find the opening for ${yards} yards.`
      ];
      return shortRunCommentary[Math.floor(Math.random() * shortRunCommentary.length)];
    }

    const standardRunCommentary = [
      `${runnerName} finds a small crease and picks up a solid ${yards} yards.`,
      `A quick dash by ${runnerName} for a ${yards}-yard gain.`,
      `${runnerName} slashes through the defense for ${yards} yards.`,
      `${runnerName} carries the ball forward for ${yards} yards.`,
      `A smart, patient run from ${runnerName} to find the opening.`
    ];
    return standardRunCommentary[Math.floor(Math.random() * standardRunCommentary.length)];
  }

  // 4. Enhanced Pass Play Commentary
  generatePassPlayCommentary(passer: Player, receiver: Player, completion: boolean, yards?: number, hasSkill?: string): string {
    const passerName = this.getPlayerDisplayName(passer);
    const receiverName = this.getPlayerDisplayName(receiver);
    const teamName = this.getPlayerTeamName(passer);

    // Race-Based Passes
    if (passer.race === "lumina") {
      const luminaCommentary = [
        `That's the precision you expect from a Lumina passer! A beautiful, accurate throw from ${passerName}.`
      ];
      if (completion && Math.random() < 0.3) {
        return luminaCommentary[0];
      }
    }

    // Skill-Based Passes
    if (hasSkill === "Pocket Presence") {
      const pocketCommentary = [
        `Masterful awareness by ${passerName}! He feels the pressure and slides away, buying just enough time to deliver the pass!`,
        `Incredible poise in the pocket from ${passerName}, stepping up gracefully before delivering a strike!`,
        `${passerName} displays veteran composure, calmly avoiding the rush before making his throw!`
      ];
      return pocketCommentary[Math.floor(Math.random() * pocketCommentary.length)];
    }

    if (hasSkill === "Deadeye" && completion && yards && yards > 10) {
      const deadeyeCommentary = [
        `A frozen rope from ${passerName}! He threads the needle between two defenders to hit ${receiverName} in stride! That's a 'Deadeye' pass if I've ever seen one.`,
        `Surgical accuracy by ${passerName}! The pass is placed where only his receiver could get it.`,
        `Perfect precision! ${passerName} drops it in the bucket to ${receiverName} for ${yards} yards!`
      ];
      return deadeyeCommentary[Math.floor(Math.random() * deadeyeCommentary.length)];
    }

    // Deep Passes
    if (completion && yards && yards > 20) {
      const deepPassCommentary = [
        `He's going deep! ${passerName} launches one downfield for ${receiverName} and connects for ${yards} yards!`,
        `What a strike! ${passerName} connects with ${receiverName} on a beautiful ${yards}-yard completion!`,
        `The defense was caught sleeping! ${receiverName} is wide open for a huge ${yards}-yard gain!`,
        `${passerName} airs it out! A perfect spiral finds its target for ${yards} yards!`,
        `A perfect spiral from ${passerName} finds his target deep in enemy territory for ${yards} yards.`
      ];
      return deepPassCommentary[Math.floor(Math.random() * deepPassCommentary.length)];
    }

    // Incompletions
    if (!completion) {
      const incompletionCommentary = [
        `${passerName} fires a pass to ${receiverName}, but it falls incomplete.`,
        `Pass attempt by ${passerName} is off target, sailing past ${receiverName}.`,
        `${passerName} tries to connect with ${receiverName}, but the timing is off.`,
        `Miscommunication between ${passerName} and ${receiverName} results in an incomplete pass.`
      ];
      return incompletionCommentary[Math.floor(Math.random() * incompletionCommentary.length)];
    }

    // Standard Completions
    const standardPassCommentary = [
      `${passerName} connects with ${receiverName} on the sideline for a gain of ${yards || 'several'}.`,
      `A quick pass from ${passerName} to ${receiverName} to move the chains.`,
      `Nice connection between ${passerName} and ${receiverName} for a solid gain.`,
      `${passerName} finds his outlet and completes the pass.`,
      `A well-designed play results in an easy completion for ${passerName}.`,
      `He finds his check-down receiver for a safe and easy ${yards || '7'} yards.`
    ];
    return standardPassCommentary[Math.floor(Math.random() * standardPassCommentary.length)];
  }

  // 5. Defense & Aggression Commentary
  generateTackleCommentary(tackler: Player, ballCarrier: Player, hasSkill?: string): string {
    const tacklerName = this.getPlayerDisplayName(tackler);
    const carrierName = this.getPlayerDisplayName(ballCarrier);

    // Skill-Based Defense
    if (hasSkill === "Pancake Block") {
      const pancakeCommentary = [
        `PANCAKED! ${tacklerName} absolutely levels an opponent with a devastating block, clearing a path for his teammate!`,
        `Bone-rattling hit! ${tacklerName} knocks ${carrierName} completely off his feet!`,
        `${tacklerName} delivers a crushing blow to ${carrierName}! The crowd feels that one!`,
        `${tacklerName} is just looking to inflict pain! He lays a huge hit on an unsuspecting opponent away from the ball! With no referees, that's a smart, brutal play.`
      ];
      return pancakeCommentary[Math.floor(Math.random() * pancakeCommentary.length)];
    }

    // High Power / Blocker Tackles
    if (tackler.role === "Blocker" || tackler.power > 30) {
      const powerTackleCommentary = [
        `A thunderous tackle by ${tacklerName}! You could hear that one from up here.`,
        `Vicious hit! ${tacklerName} completely stops the runner's momentum.`,
        `${tacklerName} wraps up ${carrierName} for the tackle after delivering a crushing blow.`
      ];
      return powerTackleCommentary[Math.floor(Math.random() * powerTackleCommentary.length)];
    }

    // Clutch Tackles
    if (this.gameState.gamePhase === "clutch") {
      const clutchTackleCommentary = [
        `CRITICAL TACKLE! ${tacklerName} makes a game-saving stop on ${carrierName}!`,
        `Clutch defense by ${tacklerName}! He brings down ${carrierName} when it matters most!`,
        `${tacklerName} rises to the occasion with a crucial tackle on ${carrierName}!`
      ];
      return clutchTackleCommentary[Math.floor(Math.random() * clutchTackleCommentary.length)];
    }

    // Standard Tackles
    const standardTackleCommentary = [
      `${tacklerName} wraps up ${carrierName} for the tackle after a short gain.`,
      `Solid defense by ${tacklerName}, bringing down ${carrierName}.`,
      `${tacklerName} closes in and makes the stop.`,
      `Nowhere to go! ${carrierName} is smothered by the defense.`,
      `A textbook tackle by ${tacklerName}.`
    ];
    return standardTackleCommentary[Math.floor(Math.random() * standardTackleCommentary.length)];
  }

  generateInterceptionCommentary(defender: Player): string {
    const defenderName = this.getPlayerDisplayName(defender);
    const interceptionCommentary = [
      `The pass is picked off! ${defenderName} read the play perfectly and stepped in front of the receiver!`,
      `What a play! ${defenderName} makes a diving interception!`,
      `He threw it right to the defense! An easy interception for ${defenderName}.`,
      `Great coverage by ${defenderName}, forcing the turnover.`
    ];
    return interceptionCommentary[Math.floor(Math.random() * interceptionCommentary.length)];
  }

  // 6. Contextual & Atmospheric Commentary
  generateInjuryCommentary(player: Player, severity: string): string {
    const playerName = this.getPlayerDisplayName(player);
    
    const injuryCommentary = [
      `${playerName} is leveled by a powerful tackle! He's slow to get up... and the team trainer is signaling from the sideline. That looks like a **${severity}**.`,
      `${playerName} is still out there, but you can see he's favoring that leg. His agility is clearly hampered by that earlier injury.`
    ];
    return injuryCommentary[Math.floor(Math.random() * injuryCommentary.length)];
  }

  generateStaminaCommentary(player: Player): string {
    const playerName = this.getPlayerDisplayName(player);
    
    if (player.currentStamina < 15) {
      const fatigueCommentary = [
        `${playerName} tries to turn the corner but just doesn't have the legs, brought down after a short gain. You can see the fatigue setting in.`,
        `A wobbly pass from ${playerName}, who looks exhausted after that long possession. The ball sails wide!`,
        `${playerName} looks absolutely exhausted out there, a step slower than usual.`,
        `You can see the fatigue setting in for ${playerName} - he's breathing heavily.`,
        `${playerName} is running on fumes at this point in the game.`,
        `The energy levels are dropping for ${playerName} - fatigue is clearly a factor.`
      ];
      return fatigueCommentary[Math.floor(Math.random() * fatigueCommentary.length)];
    }
    return "";
  }

  generateSkillCommentary(player: Player, skill: string): string {
    const playerName = this.getPlayerDisplayName(player);
    
    const skillCommentary: { [key: string]: string[] } = {
      "Second Wind": [`${playerName} looked exhausted, but he just got his Second Wind! He looks ready to go again.`],
      "Photosynthesis": [`Despite the frantic pace, the Sylvan player ${playerName} looks remarkably fresh out there.`],
      "Healing Light": [`${playerName} scores, and you can see a wave of light wash over his teammate on the sideline! That should help with his recovery.`]
    };
    
    if (skillCommentary[skill]) {
      return skillCommentary[skill][0];
    }
    return "";
  }

  generateAtmosphericCommentary(): string {
    const { crowdNoise, intimidation } = this.gameState.atmosphericEffects;
    
    if (crowdNoise > 80) {
      const crowdCommentary = [
        `The home crowd is deafening right now, and it looks like the away team is having trouble with their timing!`,
        `Listen to that crowd! The noise is absolutely electric in here!`,
        `The fans are on their feet! This place is rocking!`,
        `What an atmosphere! The crowd noise is affecting communication on the field!`
      ];
      return crowdCommentary[Math.floor(Math.random() * crowdCommentary.length)];
    }
    return "";
  }

  generateCamaraderieCommentary(team: any, isPositive: boolean): string {
    const teamName = team.name;
    
    if (isPositive) {
      return `You can see the chemistry on display! A perfectly timed block springs the runner for extra yards!`;
    } else {
      return `A miscommunication on offense! The passer and receiver were not on the same page, and the pass falls harmlessly to the ground.`;
    }
  }

  generateScoringCommentary(scorer: Player): string {
    const scorerName = this.getPlayerDisplayName(scorer);
    const teamName = this.getPlayerTeamName(scorer);
    
    const scoringCommentary = [
      `He's in! ${scorerName} fights through the defense and crosses the line! A Score for ${teamName}!`,
      `SCORE! A brilliant individual effort by ${scorerName}!`,
      `${scorerName} connects in the end zone for the score!`,
      `He walks it in! The defense couldn't lay a hand on him!`,
      `A hard-fought score, pushing through a pile of players at the goal line!`
    ];
    return scoringCommentary[Math.floor(Math.random() * scoringCommentary.length)];
  }

  // Race-Based Commentary
  generateRaceBasedRunCommentary(runner: Player, yards: number): string | null {
    const runnerName = this.getPlayerDisplayName(runner);
    
    if (runner.race === "umbra" && yards > 8) {
      return `Where did he go?! ${runnerName} seems to vanish for a moment with his Shadow Step, and the defender is left tackling empty space for ${yards} yards!`;
    } else if (runner.race === "sylvan" && yards > 6) {
      return `The Sylvan runner shows off that natural agility, weaving through defenders with ease for ${yards} yards.`;
    } else if (runner.race === "gryll" && yards <= 4) {
      return `It's like trying to tackle a boulder! The Gryll runner ${runnerName} simply shrugs off the hit and keeps moving for ${yards} tough yards.`;
    }
    
    return null;
  }

  // Pass Defense Commentary
  generatePassDefenseCommentary(defender: Player): string {
    const defenderName = this.getPlayerDisplayName(defender);
    
    if (defender.race === "gryll") {
      return `The pass is batted down at the line by the powerful Gryll defender, ${defenderName}!`;
    }
    
    const defenseCommentary = [
      `Great coverage by ${defenderName}, forcing the drop.`,
      `${defenderName} breaks up the pass at the last second!`,
      `Excellent defensive play by ${defenderName}!`
    ];
    return defenseCommentary[Math.floor(Math.random() * defenseCommentary.length)];
  }

  // Helper Methods
  getTeamPowerTier(team: any): string {
    const teamPower = team.teamPower || team.power || 20;
    
    if (teamPower >= 35) return "Elite";
    if (teamPower >= 30) return "Contender";
    if (teamPower >= 25) return "Competitive";
    if (teamPower >= 20) return "Developing";
    return "Foundation";
  }

  getCurrentPossessionTeam(): string {
    const ballCarrier = this.getBallCarrier();
    if (ballCarrier) {
      return ballCarrier.teamId === this.team1.id ? this.team1.name : this.team2.name;
    }
    return this.team1.name; // Default fallback
  }

  getPlayerTeamName(player: Player): string {
    return player.teamId === this.team1.id ? this.team1.name : this.team2.name;
  }

  getBallCarrier(): Player | null {
    if (this.gameState.ballCarrier) {
      return this.players.find(p => p.id === this.gameState.ballCarrier) || null;
    }
    return null;
  }

  getPlayerDisplayName(player: Player): string {
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

  private async applySingleGameBoosts(): Promise<void> {
    // Apply any active single-game boosts from items/consumables
    try {
      // Get consumables for both teams if this is a league match
      const team1Consumables = await this.getTeamConsumables(this.team1.id);
      const team2Consumables = await this.getTeamConsumables(this.team2.id);
      
      // Apply consumable effects to team 1 players
      this.applyConsumablesToTeam(this.team1.id, team1Consumables);
      
      // Apply consumable effects to team 2 players
      this.applyConsumablesToTeam(this.team2.id, team2Consumables);
      
    } catch (error) {
      console.error("Error applying single-game boosts:", error);
    }
  }

  private async getTeamConsumables(teamId: string): Promise<any[]> {
    try {
      // For now, get consumables from team inventory that are activated
      // In a real implementation, this would fetch from matchConsumables table
      const response = await fetch(`/api/consumables/team/${teamId}`);
      if (response.ok) {
        const consumables = await response.json();
        return consumables.filter((c: any) => c.quantity > 0);
      }
      return [];
    } catch (error) {
      console.error("Error fetching team consumables:", error);
      return [];
    }
  }

  private applyConsumablesToTeam(teamId: string, consumables: any[]): void {
    const teamPlayers = this.players.filter(p => p.teamId === teamId);
    
    consumables.forEach(consumable => {
      const effectData = this.parseConsumableEffect(consumable);
      
      teamPlayers.forEach(player => {
        if (effectData.statBoosts) {
          Object.entries(effectData.statBoosts).forEach(([stat, boost]: [string, any]) => {
            if (typeof boost === 'number') {
              player.temporaryBoosts[stat] = (player.temporaryBoosts[stat] || 0) + boost;
            }
          });
        }
        
        // Apply special effects
        if (effectData.staminaBonus) {
          player.currentStamina = Math.min(player.baseStamina, player.currentStamina + effectData.staminaBonus);
        }
      });
    });
  }

  private parseConsumableEffect(consumable: any): any {
    // Parse consumable effects based on name and metadata
    const effects: any = { statBoosts: {}, staminaBonus: 0 };
    
    const name = consumable.name || consumable.consumableName || '';
    
    if (name.includes('Speed Boost') || name.includes('speed')) {
      effects.statBoosts.speed = 3;
      effects.statBoosts.agility = 2;
    } else if (name.includes('Power Surge') || name.includes('power')) {
      effects.statBoosts.power = 4;
      effects.statBoosts.stamina = 2;
    } else if (name.includes('Champion') || name.includes('blessing')) {
      effects.statBoosts.speed = 1;
      effects.statBoosts.power = 1;
      effects.statBoosts.throwing = 2;
      effects.statBoosts.catching = 2;
    } else if (name.includes('Stamina') || name.includes('recovery')) {
      effects.staminaBonus = 10;
      effects.statBoosts.stamina = 2;
    }
    
    // Parse metadata if available
    if (consumable.metadata?.statBoosts) {
      Object.assign(effects.statBoosts, consumable.metadata.statBoosts);
    }
    
    return effects;
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
    
    // Apply staff effects to enhance atmospheric pressure and player performance
    this.applyStaffEffects();
  }

  private applyStaffEffects(): void {
    // Apply head coach tactical effectiveness
    const team1Coach = this.team1?.staff?.find((s: any) => s.type === "Head Coach");
    const team2Coach = this.team2?.staff?.find((s: any) => s.type === "Head Coach");
    
    if (team1Coach) {
      const coachEffectiveness = (team1Coach.coachingRating || 20) / 40; // 0-1 scale
      // Enhanced coaching improves team coordination and reduces stamina loss
      this.players.filter(p => p.teamId === this.team1.id).forEach(player => {
        player.temporaryBoosts.leadership = (player.temporaryBoosts.leadership || 0) + Math.floor(coachEffectiveness * 3);
        player.temporaryBoosts.stamina = (player.temporaryBoosts.stamina || 0) + Math.floor(coachEffectiveness * 2);
      });
    }
    
    if (team2Coach) {
      const coachEffectiveness = (team2Coach.coachingRating || 20) / 40; // 0-1 scale
      this.players.filter(p => p.teamId === this.team2.id).forEach(player => {
        player.temporaryBoosts.leadership = (player.temporaryBoosts.leadership || 0) + Math.floor(coachEffectiveness * 3);
        player.temporaryBoosts.stamina = (player.temporaryBoosts.stamina || 0) + Math.floor(coachEffectiveness * 2);
      });
    }

    // Apply recovery specialist effects (faster stamina recovery during breaks)
    const team1Recovery = this.team1?.staff?.find((s: any) => s.type === "Recovery Specialist");
    const team2Recovery = this.team2?.staff?.find((s: any) => s.type === "Recovery Specialist");
    
    if (team1Recovery) {
      const recoveryBonus = Math.floor((team1Recovery.physiologyRating || 20) / 10); // 2-4 bonus
      this.players.filter(p => p.teamId === this.team1.id).forEach(player => {
        if (player.currentStamina < player.baseStamina) {
          player.currentStamina = Math.min(player.baseStamina, player.currentStamina + recoveryBonus);
        }
      });
    }
    
    if (team2Recovery) {
      const recoveryBonus = Math.floor((team2Recovery.physiologyRating || 20) / 10); // 2-4 bonus
      this.players.filter(p => p.teamId === this.team2.id).forEach(player => {
        if (player.currentStamina < player.baseStamina) {
          player.currentStamina = Math.min(player.baseStamina, player.currentStamina + recoveryBonus);
        }
      });
    }

    // Apply trainer effects (enhanced skill performance)
    const team1Trainers = this.team1?.staff?.filter((s: any) => s.type === "Trainer") || [];
    const team2Trainers = this.team2?.staff?.filter((s: any) => s.type === "Trainer") || [];
    
    team1Trainers.forEach((trainer: any) => {
      const trainerBonus = Math.floor((trainer.teachingRating || 20) / 20); // 1-2 bonus
      this.players.filter(p => p.teamId === this.team1.id).forEach(player => {
        // Trainers improve general athletic performance
        player.temporaryBoosts.speed = (player.temporaryBoosts.speed || 0) + trainerBonus;
        player.temporaryBoosts.agility = (player.temporaryBoosts.agility || 0) + trainerBonus;
        player.temporaryBoosts.power = (player.temporaryBoosts.power || 0) + trainerBonus;
      });
    });
    
    team2Trainers.forEach((trainer: any) => {
      const trainerBonus = Math.floor((trainer.teachingRating || 20) / 20); // 1-2 bonus
      this.players.filter(p => p.teamId === this.team2.id).forEach(player => {
        player.temporaryBoosts.speed = (player.temporaryBoosts.speed || 0) + trainerBonus;
        player.temporaryBoosts.agility = (player.temporaryBoosts.agility || 0) + trainerBonus;
        player.temporaryBoosts.power = (player.temporaryBoosts.power || 0) + trainerBonus;
      });
    });
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
      stamina: player.currentStamina,
      leadership: player.leadership + (player.temporaryBoosts.leadership || 0)
    };
    
    // Apply race-based gameplay effects
    this.applyRaceBasedEffects(player, effective);
    
    // Apply camaraderie effects
    this.applyCamaraderieEffects(player, effective);
    
    // Apply fatigue penalties
    if (player.currentStamina < 20) {
      const fatiguePenalty = Math.floor((20 - player.currentStamina) / 5);
      effective.speed -= fatiguePenalty;
      effective.agility -= fatiguePenalty;
      effective.power -= Math.floor(fatiguePenalty / 2);
    }
    
    return effective;
  }

  private applyRaceBasedEffects(player: Player, stats: any): void {
    const race = player.race?.toLowerCase();
    
    switch (race) {
      case 'sylvan':
        // Sylvan: Enhanced speed and agility, natural stamina recovery
        stats.speed += 2;
        stats.agility += 3;
        if (player.currentStamina < player.baseStamina && Math.random() < 0.1) {
          player.currentStamina = Math.min(player.baseStamina, player.currentStamina + 2); // Photosynthesis effect
        }
        break;
        
      case 'gryll':
        // Gryll: Superior power and stamina, reduced speed
        stats.power += 4;
        stats.stamina += 2;
        stats.speed -= 1;
        // Unshakeable effect - resistance to knockdowns
        if (player.isKnockedDown && Math.random() < 0.3) {
          player.knockdownTimer = Math.max(0, player.knockdownTimer - 5);
        }
        break;
        
      case 'lumina':
        // Lumina: Enhanced throwing and leadership
        stats.throwing += 3;
        stats.leadership += 2;
        // Healing Light effect - team stamina boost chance
        if (Math.random() < 0.05) {
          const teammates = this.players.filter(p => p.teamId === player.teamId && p.id !== player.id);
          teammates.forEach(teammate => {
            teammate.currentStamina = Math.min(teammate.baseStamina, teammate.currentStamina + 1);
          });
        }
        break;
        
      case 'umbra':
        // Umbra: Enhanced speed and agility, shadow step evasion
        stats.speed += 1;
        stats.agility += 2;
        // Shadow Step effect - chance to avoid tackles
        if (player.role === "Runner" && Math.random() < 0.15) {
          stats.agility += 5; // Temporary evasion boost
        }
        break;
        
      case 'human':
        // Human: Adaptable - small bonus to all stats
        stats.speed += 1;
        stats.power += 1;
        stats.throwing += 1;
        stats.catching += 1;
        stats.agility += 1;
        stats.leadership += 1;
        break;
    }
  }

  private applyCamaraderieEffects(player: Player, stats: any): void {
    const teamCamaraderie = player.teamId === this.team1.id ? 
      (this.team1?.teamCamaraderie || 50) : (this.team2?.teamCamaraderie || 50);
    
    // Apply camaraderie-based stat modifications - ALIGNED WITH BACKEND CamaraderieService.ts
    if (teamCamaraderie >= 91) {
      // Excellent camaraderie (91-100): +2 catching/agility, +3 pass accuracy
      stats.catching += 2;
      stats.agility += 2;
      stats.throwing += 3;
    } else if (teamCamaraderie >= 76) {
      // Good camaraderie (76-90): +1 catching/agility, +1 pass accuracy (FIXED: was +2)
      stats.catching += 1;
      stats.agility += 1;
      stats.throwing += 1;
    } else if (teamCamaraderie <= 25) {
      // Poor camaraderie (0-25): -2 catching/agility, -3 pass accuracy
      stats.catching -= 2;
      stats.agility -= 2;
      stats.throwing -= 3;
    } else if (teamCamaraderie <= 40) {
      // Low camaraderie (26-40): -1 catching/agility, -1 pass accuracy (FIXED: was -2)
      stats.catching -= 1;
      stats.agility -= 1;
      stats.throwing -= 1;
    }
    
    // Ensure stats don't go below 1
    Object.keys(stats).forEach(key => {
      stats[key] = Math.max(1, stats[key]);
    });
  }

  private executeRunPlay(runner: Player, stats: any): { action: string; commentary?: string; result?: any } {
    const yards = this.calculateRunYards(runner, stats);
    const hasJukeMove = runner.skills.includes("Juke Move");
    const hasTruckStick = runner.skills.includes("Truck Stick");
    
    let skillUsed = undefined;
    let commentary = "";
    
    // Check for skill usage with race bonuses
    const raceBonus = runner.race?.toLowerCase() === "umbra" ? 0.1 : 0; // Umbra get Shadow Step bonus
    
    if (hasJukeMove && Math.random() < (0.3 + raceBonus) && stats.agility > 25) {
      skillUsed = "Juke Move";
      runner.breakawayRuns++;
    } else if (hasTruckStick && Math.random() < 0.25 && stats.power > 28) {
      skillUsed = "Truck Stick";
      runner.knockdownsInflicted++;
    }
    
    runner.yardsGained += yards;
    
    // Apply team chemistry effects to running commentary
    const teamCamaraderie = runner.teamId === this.team1.id ? 
      (this.team1?.teamCamaraderie || 50) : (this.team2?.teamCamaraderie || 50);
    
    // Generate enhanced commentary based on yards, skills, race, and team chemistry
    if (yards > 15) {
      // Try race-based commentary for breakaway runs first
      commentary = this.commentaryEngine.generateRaceBasedRunCommentary(runner, yards) ||
        this.commentaryEngine.generateRunPlayCommentary(runner, yards, undefined, skillUsed);
    } else if (teamCamaraderie >= 80 && Math.random() < 0.2) {
      // High chemistry enables team coordination commentary
      commentary = this.commentaryEngine.generateCamaraderieCommentary(
        runner.teamId === this.team1.id ? this.team1 : this.team2, 
        true
      );
    } else if (teamCamaraderie <= 30 && Math.random() < 0.15) {
      // Poor chemistry can cause miscommunication
      commentary = this.commentaryEngine.generateCamaraderieCommentary(
        runner.teamId === this.team1.id ? this.team1 : this.team2, 
        false
      );
    } else {
      // Standard run commentary with skills
      commentary = this.commentaryEngine.generateRunPlayCommentary(runner, yards, undefined, skillUsed);
    }
    
    return {
      action: "run",
      commentary,
      result: { yards, skillUsed, player: runner }
    };
  }

  private executePassPlay(passer: Player, stats: any): { action: string; commentary?: string; result?: any } {
    const target = this.findOpenReceiver(passer);
    if (!target) {
      return { action: "pass", commentary: `${this.getPlayerDisplayName(passer)} can't find an open receiver.` };
    }
    
    // Apply team chemistry effects to passing accuracy
    const teamCamaraderie = passer.teamId === this.team1.id ? 
      (this.team1?.teamCamaraderie || 50) : (this.team2?.teamCamaraderie || 50);
    
    // Apply effective stats with camaraderie already included from getEffectiveStats
    const completion = this.calculatePassSuccess(passer, target, stats);
    const yards = completion ? this.calculatePassYards(passer, target) : 0;
    
    const hasDeadeye = passer.skills.includes("Deadeye");
    const hasPocketPresence = passer.skills.includes("Pocket Presence");
    
    let skillUsed = undefined;
    let commentary = "";
    
    // Enhanced skill usage with race bonuses
    const raceBonus = passer.race?.toLowerCase() === "lumina" ? 0.1 : 0; // Lumina get precision bonus
    
    if (hasPocketPresence && Math.random() < (0.2 + raceBonus)) {
      skillUsed = "Pocket Presence";
    } else if (hasDeadeye && completion && Math.random() < (0.3 + raceBonus)) {
      skillUsed = "Deadeye";
      passer.perfectPasses++;
    }
    
    passer.passesAttempted++;
    if (completion) {
      passer.passesCompleted++;
      target.passesCaught++;
      target.yardsGained += yards;
      
      // Generate enhanced commentary with team chemistry consideration
      if (teamCamaraderie >= 80 && Math.random() < 0.25) {
        commentary = this.commentaryEngine.generateCamaraderieCommentary(
          passer.teamId === this.team1.id ? this.team1 : this.team2, 
          true
        );
      } else {
        commentary = this.commentaryEngine.generatePassPlayCommentary(passer, target, completion, yards, skillUsed);
      }
    } else {
      target.droppedPasses++;
      
      // Poor chemistry can cause miscommunication on failed passes
      if (teamCamaraderie <= 30 && Math.random() < 0.2) {
        commentary = this.commentaryEngine.generateCamaraderieCommentary(
          passer.teamId === this.team1.id ? this.team1 : this.team2, 
          false
        );
      } else {
        commentary = this.commentaryEngine.generatePassPlayCommentary(passer, target, completion, yards, skillUsed);
      }
    }
    
    return {
      action: "pass",
      commentary,
      result: { completion, yards, target: target.id, skillUsed, player: passer, receiver: target }
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
    // Enhanced event detection and processing
    
    // Handle scoring with enhanced commentary
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
          
          // Generate enhanced scoring commentary
          const commentary = this.commentaryEngine.generateScoringCommentary(scorer);
          if (commentary) {
            this.gameState.gameLog.unshift(commentary);
          }
        }
      }
    }
    
    // Handle turnovers with enhanced detection
    if (actionResult.action === "pass" && !actionResult.result?.completion && Math.random() < 0.1) {
      // Interception chance
      const interceptor = this.findInterceptor();
      if (interceptor) {
        interceptor.interceptions++;
        this.gameState.ballCarrier = interceptor.id;
        
        // Generate interception commentary
        const commentary = this.commentaryEngine.generateInterceptionCommentary(interceptor);
        if (commentary) {
          this.gameState.gameLog.unshift(commentary);
        }
      }
    }
    
    // Handle fumbles with enhanced detection
    if (actionResult.action === "run" && Math.random() < 0.05) {
      const ballCarrier = this.getBallCarrier();
      if (ballCarrier) {
        // Check for camaraderie-based fumble risk
        const teamCamaraderie = ballCarrier.teamId === this.team1.id ? 
          (this.team1?.teamCamaraderie || 50) : (this.team2?.teamCamaraderie || 50);
        
        const fumbleChance = teamCamaraderie < 30 ? 0.08 : 0.05; // Poor camaraderie increases fumble risk
        
        if (Math.random() < fumbleChance) {
          ballCarrier.fumbles++;
          this.gameState.ballCarrier = null;
          
          // Generate fumble commentary
          const commentary = this.commentaryEngine.generateLooseBallCommentary("tackle", ballCarrier);
          if (commentary) {
            this.gameState.gameLog.unshift(commentary);
          }
          
          // Look for fumble recovery
          const recoverer = this.findInterceptor();
          if (recoverer) {
            this.gameState.ballCarrier = recoverer.id;
            const scrambleCommentary = this.commentaryEngine.generateScrambleCommentary(recoverer);
            if (scrambleCommentary) {
              this.gameState.gameLog.unshift(scrambleCommentary);
            }
          }
        }
      }
    }
    
    // Handle injury events
    if (Math.random() < 0.01) { // 1% chance of injury per action
      const allActivePlayers = this.players.filter(p => !p.isKnockedDown && p.currentStamina > 5);
      if (allActivePlayers.length > 0) {
        const injuredPlayer = allActivePlayers[Math.floor(Math.random() * allActivePlayers.length)];
        const severity = Math.random() < 0.1 ? "severe" : "minor";
        
        injuredPlayer.isKnockedDown = true;
        injuredPlayer.knockdownTimer = severity === "severe" ? 30 : 15;
        injuredPlayer.currentStamina = Math.max(1, injuredPlayer.currentStamina - 10);
        
        // Generate injury commentary
        const commentary = this.commentaryEngine.generateInjuryCommentary(injuredPlayer, severity);
        if (commentary) {
          this.gameState.gameLog.unshift(commentary);
        }
      }
    }
    
    // Handle breakaway runs
    if (actionResult.action === "run" && actionResult.result?.yards > 15) {
      const runner = this.getBallCarrier();
      if (runner) {
        runner.breakawayRuns++;
        
        // Generate race-based run commentary for breakaways
        const raceCommentary = this.commentaryEngine.generateRaceBasedRunCommentary(runner, actionResult.result.yards);
        if (raceCommentary) {
          this.gameState.gameLog.unshift(raceCommentary);
        }
      }
    }
    
    // Check for camaraderie-based team chemistry events
    this.checkCamaraderieEvents();
  }

  private checkCamaraderieEvents(): void {
    // Check for team chemistry moments based on recent actions
    const team1Camaraderie = this.team1?.teamCamaraderie || 50;
    const team2Camaraderie = this.team2?.teamCamaraderie || 50;
    
    // Poor camaraderie teams have chance for miscommunication
    if (team1Camaraderie < 30 && Math.random() < 0.02) {
      const commentary = this.commentaryEngine.generateCamaraderieCommentary(this.team1, false);
      if (commentary) {
        this.gameState.gameLog.unshift(commentary);
      }
    }
    
    if (team2Camaraderie < 30 && Math.random() < 0.02) {
      const commentary = this.commentaryEngine.generateCamaraderieCommentary(this.team2, false);
      if (commentary) {
        this.gameState.gameLog.unshift(commentary);
      }
    }
    
    // High camaraderie teams have chance for perfect teamwork
    if (team1Camaraderie > 80 && Math.random() < 0.01) {
      const commentary = this.commentaryEngine.generateCamaraderieCommentary(this.team1, true);
      if (commentary) {
        this.gameState.gameLog.unshift(commentary);
      }
    }
    
    if (team2Camaraderie > 80 && Math.random() < 0.01) {
      const commentary = this.commentaryEngine.generateCamaraderieCommentary(this.team2, true);
      if (commentary) {
        this.gameState.gameLog.unshift(commentary);
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

  // Sync with backend match state
  useEffect(() => {
    if (initialLiveState) {
      console.log("Syncing with backend match state:", initialLiveState);
      setGameState(prevState => ({
        ...prevState,
        gameTime: initialLiveState.gameTime || prevState.gameTime,
        maxTime: initialLiveState.maxTime || prevState.maxTime,
        currentHalf: initialLiveState.currentHalf || prevState.currentHalf,
        team1Score: initialLiveState.team1Score || prevState.team1Score,
        team2Score: initialLiveState.team2Score || prevState.team2Score,
        isRunning: initialLiveState.isRunning || false,
        gameLog: initialLiveState.recentEvents?.map((event: any) => 
          `[${Math.floor(event.time / 60)}:${String(event.time % 60).padStart(2, '0')}] ${event.description}`
        ) || prevState.gameLog,
      }));
      
      // Stop local simulation if match is completed
      if (initialLiveState.status === 'completed') {
        console.log("Match completed, stopping local simulation");
        if (gameIntervalRef.current) {
          clearInterval(gameIntervalRef.current);
          gameIntervalRef.current = null;
        }
      }
    }
  }, [initialLiveState]);

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
        skills: p.playerSkills?.map((ps: any) => ps.name || ps.skill?.name).filter(Boolean) || []
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
        skills: p.playerSkills?.map((ps: any) => ps.name || ps.skill?.name).filter(Boolean) || []
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
          
          {/* Enhanced Controls - Only show for non-live matches */}
          {!isLiveMatch && (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={gameState.isRunning ? pauseGame : startGame}
                variant={gameState.isRunning ? "secondary" : "default"}
                disabled={gameState.gameTime >= gameState.maxTime}
              >
                {gameState.isRunning ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Replay
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Replay
                  </>
                )}
              </Button>
              
              <Button onClick={stopGame} variant="outline">
                <Square className="w-4 h-4 mr-2" />
                Stop Replay
              </Button>
              
              <Button onClick={resetGame} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Replay
              </Button>
            </div>
          )}

          {/* Live Match Status */}
          {isLiveMatch && (
            <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400 font-semibold">LIVE SERVER MATCH</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                This match is running on the server. Watch the live commentary as events unfold!
              </p>
            </div>
          )}
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