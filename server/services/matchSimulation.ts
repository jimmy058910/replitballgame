import type { Player, Team, Stadium } from "@shared/schema";
import { CamaraderieService } from "./camaraderieService";
import { commentaryService } from "./commentaryService";

interface MatchEvent {
  time: number;
  type: string;
  description: string;
  player?: string;
  team?: string;
  yardsGained?: number;
  data?: any;
}

interface EnhancedMatchResult {
  homeScore: number;
  awayScore: number;
  gameData: {
    events: MatchEvent[];
    finalStats: {
      possession: { home: number; away: number };
      passes: { home: number; away: number };
      interceptions: { home: number; away: number };
      rushing: { home: number; away: number };
      tackles: { home: number; away: number };
      fumbles: { home: number; away: number };
    };
    playerStats: Record<string, PlayerGameStats>;
  };
  matchSummary: {
    gamePhase: string;
    atmosphereEffects: AtmosphereEffects;
    tacticalEffects: TacticalEffects;
    mvpPlayers: { home: string; away: string };
  };
}

interface PlayerGameStats {
  playerId: string;
  scores: number;
  passingAttempts: number;
  passesCompleted: number;
  passingYards: number;
  rushingYards: number;
  catches: number;
  receivingYards: number;
  drops: number;
  tackles: number;
  knockdownsInflicted: number;
  interceptionsCaught: number;
  fumblesLost: number;
  clutchPlays: number;
  breakawayRuns: number;
  perfectPasses: number;
  skillsUsed: string[];
}

interface AtmosphereEffects {
  homeFieldAdvantage: number;
  crowdNoise: number;
  intimidationFactor: number;
  fieldSize: string;
  attendance: number;
  fanLoyalty: number;
}

interface TacticalEffects {
  homeTeamFocus: string;
  awayTeamFocus: string;
  homeTeamModifiers: Record<string, number>;
  awayTeamModifiers: Record<string, number>;
}

interface EnhancedPlayer extends Player {
  currentStamina: number;
  temporaryInjury: boolean;
  inGameModifiers: Record<string, number>;
  skills: string[];
  skillCooldowns: Record<string, number>;
  raceEffects: Record<string, number>;
}

export async function simulateEnhancedMatch(
  homeTeamPlayers: Player[],
  awayTeamPlayers: Player[],
  homeTeamId: string,
  awayTeamId: string,
  stadium?: Stadium,
  matchType: string = 'league'
): Promise<EnhancedMatchResult> {
  const events: MatchEvent[] = [];
  let homeScore = 0;
  let awayScore = 0;
  
  // Enhanced statistics tracking
  let homeStats = { possession: 0, passes: 0, interceptions: 0, rushing: 0, tackles: 0, fumbles: 0 };
  let awayStats = { possession: 0, passes: 0, interceptions: 0, rushing: 0, tackles: 0, fumbles: 0 };
  
  // Player stats tracking
  const playerStats: Record<string, PlayerGameStats> = {};
  
  // Initialize player stats
  [...homeTeamPlayers, ...awayTeamPlayers].forEach(player => {
    playerStats[player.id] = {
      playerId: player.id,
      scores: 0,
      passingAttempts: 0,
      passesCompleted: 0,
      passingYards: 0,
      rushingYards: 0,
      catches: 0,
      receivingYards: 0,
      drops: 0,
      tackles: 0,
      knockdownsInflicted: 0,
      interceptionsCaught: 0,
      fumblesLost: 0,
      clutchPlays: 0,
      breakawayRuns: 0,
      perfectPasses: 0,
      skillsUsed: []
    };
  });

  // Get team camaraderie
  const homeTeamCamaraderie = await CamaraderieService.getTeamCamaraderie(homeTeamId) || 50;
  const awayTeamCamaraderie = await CamaraderieService.getTeamCamaraderie(awayTeamId) || 50;

  // Calculate atmosphere effects
  const atmosphereEffects = calculateAtmosphereEffects(stadium, homeTeamId, awayTeamId);
  
  // Get tactical effects
  const tacticalEffects = await calculateTacticalEffects(homeTeamId, awayTeamId);
  
  // Initialize enhanced players with skills, stamina, and modifiers
  const enhancedHomePlayers = await initializeEnhancedPlayers(homeTeamPlayers, homeTeamCamaraderie, atmosphereEffects, tacticalEffects.homeTeamModifiers);
  const enhancedAwayPlayers = await initializeEnhancedPlayers(awayTeamPlayers, awayTeamCamaraderie, atmosphereEffects, tacticalEffects.awayTeamModifiers);

  const homeStrength = calculateEnhancedTeamStrength(enhancedHomePlayers, atmosphereEffects, tacticalEffects.homeTeamModifiers);
  const awayStrength = calculateEnhancedTeamStrength(enhancedAwayPlayers, atmosphereEffects, tacticalEffects.awayTeamModifiers);

  const matchDuration = matchType === 'exhibition' ? 1200 : 1800; // 20 min exhibition, 30 min league
  const halftimeTime = matchDuration / 2;
  let halftimeEventAdded = false;

  // Add pre-game commentary
  const preGameCommentary = commentaryService.generatePreGameCommentary(
    { id: homeTeamId, name: "Home Team", power: homeStrength },
    { id: awayTeamId, name: "Away Team", power: awayStrength },
    atmosphereEffects.fieldSize,
    tacticalEffects.homeTeamFocus
  );
  
  events.push({
    time: 0,
    type: "pre_game",
    description: preGameCommentary,
    team: "neutral"
  });

  // Enhanced match simulation with detailed mechanics
  for (let time = 0; time < matchDuration; time += Math.random() * 20 + 8) {
    if (time >= halftimeTime && !halftimeEventAdded) {
      events.push({
        time: Math.floor(halftimeTime),
        type: "halftime",
        description: "It's halftime! Time for a short break and a word from our sponsors.",
      });
      halftimeEventAdded = true;
    }

    const gamePhase = determineGamePhase(time, matchDuration);
    
    const event = await generateEnhancedMatchEvent(
      time,
      enhancedHomePlayers,
      enhancedAwayPlayers,
      homeStrength,
      awayStrength,
      homeTeamCamaraderie,
      awayTeamCamaraderie,
      atmosphereEffects,
      tacticalEffects,
      gamePhase,
      playerStats
    );
    
    events.push(event);

    // Update statistics based on event
    updateStatistics(event, homeStats, awayStats, playerStats);

    // Update scores
    if (event.type === "score") {
      if (event.team === "home") homeScore++;
      else awayScore++;
    }
    
    // Apply stamina effects
    applyStaminaEffects(enhancedHomePlayers, enhancedAwayPlayers, time);
  }

  // Calculate final possession stats
  const totalStrength = homeStrength + awayStrength;
  homeStats.possession = Math.round((homeStrength / totalStrength) * 100);
  awayStats.possession = 100 - homeStats.possession;

  // Find MVP players
  const mvpPlayers = findMVPPlayers(enhancedHomePlayers, enhancedAwayPlayers, playerStats);

  return {
    homeScore,
    awayScore,
    gameData: {
      events: events.slice(0, 30), // Show more events for enhanced experience
      finalStats: {
        possession: { home: homeStats.possession, away: awayStats.possession },
        passes: { home: homeStats.passes, away: awayStats.passes },
        interceptions: { home: homeStats.interceptions, away: awayStats.interceptions },
        rushing: { home: homeStats.rushing, away: awayStats.rushing },
        tackles: { home: homeStats.tackles, away: awayStats.tackles },
        fumbles: { home: homeStats.fumbles, away: awayStats.fumbles },
      },
      playerStats
    },
    matchSummary: {
      gamePhase: determineGamePhase(matchDuration, matchDuration),
      atmosphereEffects,
      tacticalEffects,
      mvpPlayers
    }
  };
}

// Backward compatibility - keep the old function for existing code
export async function simulateMatch(
  homeTeamPlayers: Player[],
  awayTeamPlayers: Player[]
): Promise<any> {
  const homeTeamId = homeTeamPlayers.length > 0 ? homeTeamPlayers[0].teamId : '';
  const awayTeamId = awayTeamPlayers.length > 0 ? awayTeamPlayers[0].teamId : '';
  
  const result = await simulateEnhancedMatch(homeTeamPlayers, awayTeamPlayers, homeTeamId, awayTeamId);
  
  // Convert to old format for backward compatibility
  return {
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    gameData: {
      events: result.gameData.events,
      finalStats: {
        possession: result.gameData.finalStats.possession,
        passes: result.gameData.finalStats.passes,
        interceptions: result.gameData.finalStats.interceptions,
      },
    },
  };
}

// calculateTeamStrength from jules (includes racial bonuses)
function calculateTeamStrength(players: Player[]): number {
  return players.reduce((total, player) => {
    const avgStats = (
      (player.speed || 0) + (player.power || 0) + (player.throwing || 0) +
      (player.catching || 0) + (player.stamina || 0) + (player.agility || 0)
    ) / 6;
    
    let bonus = 1;
    switch (player.race) {
      case "sylvan": bonus = 1.1; break;
      case "gryll": bonus = 1.05; break;
      case "lumina": bonus = 1.08; break;
      case "umbra": bonus = 1.07; break;
      default: bonus = 1.03; // human
    }
    
    return total + (avgStats * bonus);
  }, 0);
}

// generateMatchEvent function merging logic from both branches
function generateMatchEvent(
  time: number,
  homeTeamPlayers: Player[],
  awayTeamPlayers: Player[],
  homeStrength: number,
  awayStrength: number,
  homeCamaraderie: number,
  awayCamaraderie: number
): MatchEvent {
  const isHomeTeamEvent = Math.random() < homeStrength / (homeStrength + awayStrength);
  const actingTeam = isHomeTeamEvent ? "home" : "away";
  const actingPlayers = isHomeTeamEvent ? homeTeamPlayers : awayTeamPlayers;
  const actingTeamCamaraderie = isHomeTeamEvent ? homeCamaraderie : awayCamaraderie;
  
  if (actingPlayers.length === 0) {
    return {
      time: Math.floor(time),
      type: "no_action",
      description: "No players available for action.",
      team: actingTeam,
    };
  }
  const randomPlayer = actingPlayers[Math.floor(Math.random() * actingPlayers.length)];

  const baseEventTypes = ["pass_attempt", "run_attempt", "defensive_play"];
  let eventType = baseEventTypes[Math.floor(Math.random() * baseEventTypes.length)];
  let description = "";

  let camaraderieEffect = 0;
  if (actingTeamCamaraderie > 75) {
    camaraderieEffect = 0.1;
  } else if (actingTeamCamaraderie < 35) {
    camaraderieEffect = -0.1;
  }

  if (eventType === "pass_attempt") {
    let passSuccessChance = 0.6 + camaraderieEffect;
    if (Math.random() < passSuccessChance) {
      eventType = "pass_complete";
      description = `${randomPlayer.name} (${randomPlayer.race}) completes a precise pass!`;
      if (Math.random() < (0.15 + Math.max(0, camaraderieEffect))) {
        eventType = "score";
        description = `TOUCHDOWN! ${randomPlayer.name} (${randomPlayer.race}) connects for a score!`;
      }
    } else {
      if (Math.random() < (0.5 + Math.max(0, -camaraderieEffect * 2))) {
        eventType = "pass_inaccurate";
        description = `${randomPlayer.name} (${randomPlayer.race})'s pass is off target due to miscommunication!`;
      } else {
        eventType = "interception";
        const defendingPlayers = isHomeTeamEvent ? awayTeamPlayers : homeTeamPlayers;
        const interceptor = defendingPlayers.length > 0 ? defendingPlayers[Math.floor(Math.random() * defendingPlayers.length)] : { name: "Defender", race: "Unknown" };
        description = `${interceptor.name} (${interceptor.race}) intercepts the pass!`;
        return {
          time: Math.floor(time),
          type: eventType,
          description,
          player: interceptor.name,
          team: isHomeTeamEvent ? "away" : "home"
        };
      }
    }
  } else if (eventType === "run_attempt") {
    let runSuccessChance = 0.5 + camaraderieEffect * 0.5;
    if (Math.random() < runSuccessChance) {
      eventType = "run_positive";
      description = `${randomPlayer.name} (${randomPlayer.race}) finds a gap and gains yards!`;
      if (Math.random() < (0.1 + Math.max(0, camaraderieEffect * 0.5))) {
        eventType = "score";
        description = `SCORE! ${randomPlayer.name} (${randomPlayer.race}) breaks free for a touchdown!`;
      }
    } else {
      eventType = "run_stuffed";
      description = `${randomPlayer.name} (${randomPlayer.race}) is stopped at the line of scrimmage.`;
    }
  } else if (eventType === "defensive_play") {
    const defendingPlayers = isHomeTeamEvent ? awayTeamPlayers : homeTeamPlayers;
    const defender = defendingPlayers.length > 0 ? defendingPlayers[Math.floor(Math.random() * defendingPlayers.length)] : { name: "Defender", race: "Unknown" };
    eventType = "tackle";
    description = `${defender.name} (${defender.race}) makes a solid tackle!`;
     return {
        time: Math.floor(time),
        type: eventType,
        description,
        player: defender.name,
        team: isHomeTeamEvent ? "away" : "home"
      };
  }
  
  if (eventType === "pass_complete" && actingTeamCamaraderie < 35) {
    if (Math.random() < 0.15) {
        eventType = "catch_failed";
        description = `${randomPlayer.name} (${randomPlayer.race}) fails to secure the catch despite a good pass! Player camaraderie: ${actingTeamCamaraderie}`;
    }
  }

  if (eventType !== "score" && eventType !== "interception") {
    let baseInjuryChance = 0.02;
    if (actingTeamCamaraderie > 80) {
      baseInjuryChance -= 0.01;
    } else if (actingTeamCamaraderie < 30) {
      baseInjuryChance += 0.01;
    }
    baseInjuryChance = Math.max(0.005, Math.min(0.05, baseInjuryChance));

    if (Math.random() < baseInjuryChance) {
      const originalDescription = description;
      eventType = "injury";
      description = `${randomPlayer.name} (${randomPlayer.race}) is injured after the play! Original event: ${originalDescription}`;
      console.log(`Player ${randomPlayer.name} injured. Team Camaraderie: ${actingTeamCamaraderie}, Injury Chance: ${baseInjuryChance}`);
      return {
        time: Math.floor(time),
        type: eventType,
        description,
        player: randomPlayer.name,
        team: actingTeam,
      };
    }
  }

  return {
    time: Math.floor(time),
    type: eventType,
    description,
    player: randomPlayer.name,
    team: actingTeam,
  };
}

// Enhanced Match Simulation Helper Functions

function calculateAtmosphereEffects(stadium: Stadium | undefined, homeTeamId: string, awayTeamId: string): AtmosphereEffects {
  const baseAttendance = stadium?.capacity || 15000;
  const fanLoyalty = stadium?.fanLoyalty || 65;
  const attendance = Math.floor(baseAttendance * (fanLoyalty / 100));
  
  // Home field advantage calculation
  const homeFieldAdvantage = Math.min(8, Math.floor(fanLoyalty / 15) + Math.floor(attendance / 2000));
  
  // Crowd noise effects
  const crowdNoise = Math.floor((attendance / baseAttendance) * 10);
  
  // Intimidation factor for away team
  const intimidationFactor = Math.min(5, Math.floor(crowdNoise / 2) + Math.floor(homeFieldAdvantage / 2));
  
  // Field size effects
  const fieldSize = stadium?.fieldSize || 'Standard';
  
  return {
    homeFieldAdvantage,
    crowdNoise,
    intimidationFactor,
    fieldSize,
    attendance,
    fanLoyalty
  };
}

async function calculateTacticalEffects(homeTeamId: string, awayTeamId: string): Promise<TacticalEffects> {
  // Mock tactical data - in real implementation, this would query team tactics
  const homeTeamFocus = 'Balanced';
  const awayTeamFocus = 'Balanced';
  
  // Calculate tactical modifiers based on team focus
  const homeTeamModifiers = getTacticalModifiers(homeTeamFocus);
  const awayTeamModifiers = getTacticalModifiers(awayTeamFocus);
  
  return {
    homeTeamFocus,
    awayTeamFocus,
    homeTeamModifiers,
    awayTeamModifiers
  };
}

function getTacticalModifiers(tacticalFocus: string): Record<string, number> {
  const modifiers: Record<string, number> = {};
  
  switch (tacticalFocus) {
    case 'All-Out Attack':
      modifiers.passing = 3;
      modifiers.rushing = 2;
      modifiers.defense = -1;
      break;
    case 'Defensive Wall':
      modifiers.defense = 3;
      modifiers.tackling = 2;
      modifiers.passing = -1;
      break;
    case 'Control Game':
      modifiers.possession = 2;
      modifiers.passing = 1;
      modifiers.rushing = 1;
      break;
    case 'Counter Attack':
      modifiers.interception = 2;
      modifiers.breakaway = 2;
      modifiers.defense = 1;
      break;
    default: // Balanced
      modifiers.passing = 1;
      modifiers.rushing = 1;
      modifiers.defense = 1;
      break;
  }
  
  return modifiers;
}

async function initializeEnhancedPlayers(
  players: Player[],
  teamCamaraderie: number,
  atmosphereEffects: AtmosphereEffects,
  tacticalModifiers: Record<string, number>
): Promise<EnhancedPlayer[]> {
  const enhancedPlayers: EnhancedPlayer[] = [];
  
  for (const player of players) {
    // Get player skills (fallback to empty array if service doesn't exist)
    let skills: any[] = [];
    try {
      // skills = await PlayerSkillsService.getPlayerSkills(player.id);
    } catch (error) {
      // Service not available, use empty skills
    }
    
    // Apply camaraderie effects
    const camaraderieModifiers = getCamaraderieModifiers(teamCamaraderie);
    
    // Apply race effects
    const raceEffects = getRaceEffects(player.race || 'human');
    
    // Apply equipment effects
    const equipmentEffects = await getPlayerEquipmentEffects(player.id);
    
    // Apply consumable effects from activated match consumables
    const consumableEffects = await getActiveMatchConsumables(player.teamId, player.id);
    
    // Apply staff effects (trainers, recovery specialists)
    const staffEffects = await getStaffEffectsForPlayer(player.teamId, player.role);
    
    // Initialize current stamina
    let currentStamina = player.stamina || 100;
    
    // Apply stamina effects based on daily stamina level
    if (player.dailyStaminaLevel !== undefined) {
      currentStamina = Math.min(currentStamina, player.dailyStaminaLevel);
    }
    
    // Apply injury effects to match performance
    const injuryEffects = getInjuryEffects(player.injuryStatus);
    
    // Apply interconnected system effects
    const interconnectedEffects = calculateInterconnectedEffects(
      camaraderieModifiers,
      equipmentEffects,
      staffEffects,
      injuryEffects,
      teamCamaraderie
    );
    
    const enhancedPlayer: EnhancedPlayer = {
      ...player,
      currentStamina,
      temporaryInjury: false,
      inGameModifiers: {
        ...camaraderieModifiers,
        ...tacticalModifiers,
        ...consumableEffects,
        ...equipmentEffects,
        ...staffEffects,
        ...injuryEffects,
        ...interconnectedEffects
      },
      skills: skills.map(s => s.name || s),
      skillCooldowns: {},
      raceEffects
    };
    
    enhancedPlayers.push(enhancedPlayer);
  }
  
  return enhancedPlayers;
}

function getCamaraderieModifiers(camaraderie: number): Record<string, number> {
  const modifiers: Record<string, number> = {};
  
  if (camaraderie >= 91) { // Excellent
    modifiers.catching = 2;
    modifiers.agility = 2;
    modifiers.passing = 3;
    modifiers.fumbleReduction = 2;
  } else if (camaraderie >= 76) { // Good
    modifiers.catching = 1;
    modifiers.agility = 1;
    modifiers.passing = 2;
    modifiers.fumbleReduction = 1;
  } else if (camaraderie <= 25) { // Poor
    modifiers.catching = -2;
    modifiers.agility = -2;
    modifiers.passing = -3;
    modifiers.fumbleRisk = 2;
  } else if (camaraderie <= 40) { // Low
    modifiers.catching = -1;
    modifiers.agility = -1;
    modifiers.passing = -2;
    modifiers.fumbleRisk = 1;
  }
  
  return modifiers;
}

function getRaceEffects(race: string): Record<string, number> {
  const effects: Record<string, number> = {};
  
  switch (race.toLowerCase()) {
    case 'sylvan':
      effects.speed = 3;
      effects.agility = 4;
      effects.power = -2;
      effects.staminaRecovery = 2;
      break;
    case 'gryll':
      effects.power = 5;
      effects.stamina = 3;
      effects.speed = -3;
      effects.agility = -2;
      effects.knockdownResistance = 3;
      break;
    case 'lumina':
      effects.throwing = 4;
      effects.leadership = 3;
      effects.stamina = -1;
      effects.healingBonus = 2;
      break;
    case 'umbra':
      effects.speed = 2;
      effects.agility = 3;
      effects.power = -3;
      effects.leadership = -1;
      effects.evasion = 2;
      break;
    case 'human':
    default:
      effects.speed = 1;
      effects.power = 1;
      effects.throwing = 1;
      effects.catching = 1;
      effects.kicking = 1;
      effects.stamina = 1;
      effects.agility = 1;
      effects.leadership = 1;
      effects.adaptability = 2;
      break;
  }
  
  return effects;
}

// Get player equipment effects for match simulation
async function getPlayerEquipmentEffects(playerId: string): Promise<Record<string, number>> {
  const effects: Record<string, number> = {};
  
  try {
    const { prisma } = await import('../db');
    
    // Get all equipment for the player
    const playerEquipment = await prisma.playerEquipment.findMany({
      where: { playerId: playerId },
      include: {
        item: true
      }
    });
    
    // Apply stat bonuses from each equipped item
    for (const equipment of playerEquipment) {
      if (equipment.item?.statBoosts) {
        const statBoosts = equipment.item.statBoosts as any;
        Object.entries(statBoosts).forEach(([stat, boost]) => {
          if (typeof boost === 'number') {
            effects[stat] = (effects[stat] || 0) + boost;
          }
        });
      }
    }
    
    return effects;
  } catch (error) {
    console.error('Error getting player equipment effects:', error);
    return {};
  }
}

// Get staff effects for specific player role
async function getStaffEffectsForPlayer(teamId: string, playerRole: string): Promise<Record<string, number>> {
  const effects: Record<string, number> = {};
  
  try {
    const { prisma } = await import('../db');
    
    // Get all staff for the team
    const staff = await prisma.staff.findMany({
      where: { teamId: parseInt(teamId) }
    });
    
    for (const member of staff) {
      const effectiveness = (member.motivation || 20) / 40; // 0-1 scale
      
      switch (member.type) {
        case 'HEAD_COACH':
          // Head coach improves leadership and reduces stamina depletion
          effects.leadership = (effects.leadership || 0) + Math.floor(effectiveness * 3);
          effects.stamina = (effects.stamina || 0) + Math.floor(effectiveness * 2);
          break;
          
        case 'PASSER_TRAINER':
          if (playerRole === 'PASSER') {
            effects.throwing = (effects.throwing || 0) + Math.floor(effectiveness * 4);
            effects.catching = (effects.catching || 0) + Math.floor(effectiveness * 2);
          }
          break;
          
        case 'RUNNER_TRAINER':
          if (playerRole === 'RUNNER') {
            effects.speed = (effects.speed || 0) + Math.floor(effectiveness * 3);
            effects.agility = (effects.agility || 0) + Math.floor(effectiveness * 3);
          }
          break;
          
        case 'BLOCKER_TRAINER':
          if (playerRole === 'BLOCKER') {
            effects.power = (effects.power || 0) + Math.floor(effectiveness * 4);
            effects.stamina = (effects.stamina || 0) + Math.floor(effectiveness * 2);
          }
          break;
          
        case 'RECOVERY_SPECIALIST':
          // Recovery specialist improves stamina recovery for all players
          effects.staminaRecovery = (effects.staminaRecovery || 0) + Math.floor(effectiveness * 3);
          break;
          
        case 'SCOUT':
          // Scout improves awareness and leadership slightly
          effects.leadership = (effects.leadership || 0) + Math.floor(effectiveness * 1);
          break;
      }
    }
    
    return effects;
  } catch (error) {
    console.error('Error getting staff effects:', error);
    return {};
  }
}

// Get injury effects on match performance
function getInjuryEffects(injuryStatus: string): Record<string, number> {
  const effects: Record<string, number> = {};
  
  switch (injuryStatus) {
    case 'Minor Injury':
      effects.speed = -2;
      effects.agility = -2;
      break;
    case 'Moderate Injury':
      effects.speed = -5;
      effects.agility = -5;
      effects.power = -3;
      break;
    case 'Severe Injury':
      // Severe injuries prevent playing - should not appear in match
      effects.speed = -10;
      effects.agility = -10;
      effects.power = -5;
      break;
    default:
      // Healthy - no effects
      break;
  }
  
  return effects;
}

// Get active match consumables effects for a player
async function getActiveMatchConsumables(teamId: string, playerId: string): Promise<Record<string, number>> {
  const effects: Record<string, number> = {};
  
  // Temporarily disable consumables to fix enhanced simulation
  // TODO: Fix matchConsumable table integration later
  return effects;
  
  try {
    const { prisma } = await import('../db');
    
    // Get active match consumables for the team
    const activeConsumables = await prisma.matchConsumable.findMany({
      where: {
        teamId: parseInt(teamId),
        usedInMatch: true
      },
      orderBy: { activatedAt: 'desc' }
    });
    
    // Apply consumable effects
    for (const consumable of activeConsumables) {
      const effectData = consumable.effectData as any;
      
      if (effectData?.statBoosts) {
        Object.entries(effectData.statBoosts).forEach(([stat, boost]) => {
          if (typeof boost === 'number') {
            effects[stat] = (effects[stat] || 0) + boost;
          }
        });
      }
      
      // Apply specific consumable effects based on type
      switch (consumable.effectType) {
        case 'stat_boost':
          if (effectData?.statBoosts) {
            Object.entries(effectData.statBoosts).forEach(([stat, boost]) => {
              if (typeof boost === 'number') {
                effects[stat] = (effects[stat] || 0) + boost;
              }
            });
          }
          break;
          
        case 'stamina_recovery':
          effects.staminaRecovery = (effects.staminaRecovery || 0) + (effectData?.staminaBonus || 10);
          break;
          
        case 'injury_prevention':
          effects.injuryReduction = (effects.injuryReduction || 0) + (effectData?.injuryReduction || 25);
          break;
      }
    }
    
    return effects;
  } catch (error) {
    console.error('Error getting active match consumables:', error);
    // Return empty effects to allow simulation to continue
    return {};
  }
}

// Calculate interconnected effects where systems affect each other
function calculateInterconnectedEffects(
  camaraderieModifiers: Record<string, number>,
  equipmentEffects: Record<string, number>,
  staffEffects: Record<string, number>,
  injuryEffects: Record<string, number>,
  teamCamaraderie: number
): Record<string, number> {
  const effects: Record<string, number> = {};
  
  // 1. Equipment enhances progression-related effects
  const equipmentBonus = Math.floor(Object.values(equipmentEffects).reduce((sum, val) => sum + val, 0) / 10);
  if (equipmentBonus > 0) {
    effects.progressionBonus = equipmentBonus;
    effects.leadership = (effects.leadership || 0) + Math.floor(equipmentBonus / 2);
  }
  
  // 2. Staff effectiveness enhanced by high camaraderie
  const camaraderieMultiplier = teamCamaraderie >= 76 ? 1.25 : teamCamaraderie >= 51 ? 1.1 : 1.0;
  Object.entries(staffEffects).forEach(([stat, value]) => {
    if (typeof value === 'number') {
      const enhancedValue = Math.floor(value * camaraderieMultiplier);
      effects[`enhanced_${stat}`] = enhancedValue - value; // Only the bonus portion
    }
  });
  
  // 3. Injuries reduce equipment effectiveness
  const injuryPenalty = Math.abs(Object.values(injuryEffects).reduce((sum, val) => sum + val, 0));
  if (injuryPenalty > 0) {
    const equipmentReduction = Math.floor(injuryPenalty * 0.3);
    Object.entries(equipmentEffects).forEach(([stat, value]) => {
      if (typeof value === 'number' && value > 0) {
        effects[`reduced_${stat}`] = -Math.min(equipmentReduction, Math.floor(value * 0.5));
      }
    });
  }
  
  // 4. High camaraderie enhances all stat bonuses
  if (teamCamaraderie >= 91) {
    effects.synergyBonus = 2; // Excellent camaraderie provides synergy bonus
    effects.teamworkMultiplier = 1;
  } else if (teamCamaraderie >= 76) {
    effects.synergyBonus = 1; // Good camaraderie provides small synergy bonus
  }
  
  // 5. Cross-system stamina effects
  const staminaBonus = (staffEffects.staminaRecovery || 0) + (equipmentEffects.stamina || 0);
  if (staminaBonus > 0 && teamCamaraderie >= 60) {
    effects.enhancedStaminaRecovery = Math.floor(staminaBonus * 0.5);
  }
  
  return effects;
}

function calculateEnhancedTeamStrength(
  players: EnhancedPlayer[],
  atmosphereEffects: AtmosphereEffects,
  tacticalModifiers: Record<string, number>
): number {
  let totalStrength = 0;
  
  for (const player of players) {
    // Base stats with race effects
    const effectiveStats = {
      speed: (player.speed || 0) + (player.raceEffects.speed || 0),
      power: (player.power || 0) + (player.raceEffects.power || 0),
      throwing: (player.throwing || 0) + (player.raceEffects.throwing || 0),
      catching: (player.catching || 0) + (player.raceEffects.catching || 0),
      kicking: (player.kicking || 0) + (player.raceEffects.kicking || 0),
      stamina: (player.stamina || 0) + (player.raceEffects.stamina || 0),
      agility: (player.agility || 0) + (player.raceEffects.agility || 0),
      leadership: (player.leadership || 0) + (player.raceEffects.leadership || 0)
    };
    
    // Apply in-game modifiers
    Object.keys(player.inGameModifiers).forEach(key => {
      if (effectiveStats[key as keyof typeof effectiveStats] !== undefined) {
        effectiveStats[key as keyof typeof effectiveStats] += player.inGameModifiers[key];
      }
    });
    
    // Apply stamina effects
    const staminaMultiplier = player.currentStamina / 100;
    Object.keys(effectiveStats).forEach(key => {
      effectiveStats[key as keyof typeof effectiveStats] *= staminaMultiplier;
    });
    
    // Calculate player strength
    const playerStrength = (
      effectiveStats.speed + effectiveStats.power + effectiveStats.throwing +
      effectiveStats.catching + effectiveStats.kicking + effectiveStats.stamina +
      effectiveStats.agility + effectiveStats.leadership
    ) / 8;
    
    totalStrength += playerStrength;
  }
  
  // Apply field size effects
  if (atmosphereEffects.fieldSize === 'Large') {
    totalStrength *= 1.05; // Speed advantage
  } else if (atmosphereEffects.fieldSize === 'Small') {
    totalStrength *= 0.95; // Power advantage
  }
  
  return totalStrength;
}

function determineGamePhase(time: number, maxTime: number): string {
  const timePercent = time / maxTime;
  const halfTime = maxTime / 2;
  
  // First Half
  if (time < halfTime) {
    const firstHalfPercent = time / halfTime;
    if (firstHalfPercent < 0.3) return 'early';
    if (firstHalfPercent < 0.8) return 'middle';
    return 'late';
  }
  
  // Second Half
  const secondHalfTime = time - halfTime;
  const secondHalfPercent = secondHalfTime / halfTime;
  
  if (secondHalfPercent < 0.3) return 'early';
  if (secondHalfPercent < 0.7) return 'middle';
  if (secondHalfPercent < 0.9) return 'late';
  return 'clutch'; // Only final 10% of 2nd half
}

async function generateEnhancedMatchEvent(
  time: number,
  homeTeamPlayers: EnhancedPlayer[],
  awayTeamPlayers: EnhancedPlayer[],
  homeStrength: number,
  awayStrength: number,
  homeCamaraderie: number,
  awayCamaraderie: number,
  atmosphereEffects: AtmosphereEffects,
  tacticalEffects: TacticalEffects,
  gamePhase: string,
  playerStats: Record<string, PlayerGameStats>
): Promise<MatchEvent> {
  const isHomeTeamEvent = Math.random() < homeStrength / (homeStrength + awayStrength);
  const actingTeam = isHomeTeamEvent ? "home" : "away";
  const actingPlayers = isHomeTeamEvent ? homeTeamPlayers : awayTeamPlayers;
  const actingTeamCamaraderie = isHomeTeamEvent ? homeCamaraderie : awayCamaraderie;
  const defendingPlayers = isHomeTeamEvent ? awayTeamPlayers : homeTeamPlayers;
  
  if (actingPlayers.length === 0) {
    return {
      time: Math.floor(time),
      type: "no_action",
      description: "No players available for action.",
      team: actingTeam,
    };
  }
  
  const randomPlayer = actingPlayers[Math.floor(Math.random() * actingPlayers.length)];
  
  // Determine action type based on player role and tactical focus
  const actionType = determineActionType(randomPlayer, tacticalEffects, gamePhase);
  
  let event: MatchEvent;
  
  switch (actionType) {
    case 'pass':
      event = generatePassEvent(time, randomPlayer, defendingPlayers, actingTeam, actingTeamCamaraderie, atmosphereEffects, gamePhase, playerStats);
      break;
    case 'run':
      event = generateRunEvent(time, randomPlayer, defendingPlayers, actingTeam, actingTeamCamaraderie, atmosphereEffects, gamePhase, playerStats);
      break;
    case 'defense':
      event = generateDefenseEvent(time, randomPlayer, actingPlayers, actingTeam, actingTeamCamaraderie, atmosphereEffects, gamePhase, playerStats);
      break;
    default:
      event = generateGeneralEvent(time, randomPlayer, actingTeam, actingTeamCamaraderie, atmosphereEffects, gamePhase);
      break;
  }
  
  // Apply skill effects
  event = applySkillEffects(event, randomPlayer, playerStats);
  
  // Generate enhanced commentary
  event.description = await generateEnhancedCommentary(event, randomPlayer, defendingPlayers, gamePhase, atmosphereEffects);
  
  return event;
}

function determineActionType(player: EnhancedPlayer, tacticalEffects: TacticalEffects, gamePhase: string): string {
  const role = player.tacticalRole || 'Runner';
  const isHomeTeam = tacticalEffects.homeTeamFocus !== undefined;
  const tacticalFocus = isHomeTeam ? tacticalEffects.homeTeamFocus : tacticalEffects.awayTeamFocus;
  
  // Role-based action probabilities
  let passChance = 0.3;
  let runChance = 0.4;
  let defenseChance = 0.3;
  
  if (role === 'Passer') {
    passChance = 0.6;
    runChance = 0.2;
    defenseChance = 0.2;
  } else if (role === 'Runner') {
    passChance = 0.2;
    runChance = 0.6;
    defenseChance = 0.2;
  } else if (role === 'Blocker') {
    passChance = 0.1;
    runChance = 0.3;
    defenseChance = 0.6;
  }
  
  // Tactical modifications
  if (tacticalFocus === 'All-Out Attack') {
    passChance *= 1.5;
    runChance *= 1.3;
    defenseChance *= 0.7;
  } else if (tacticalFocus === 'Defensive Wall') {
    passChance *= 0.7;
    runChance *= 0.8;
    defenseChance *= 1.5;
  }
  
  // Game phase modifications
  if (gamePhase === 'clutch') {
    passChance *= 1.2;
    runChance *= 1.1;
  }
  
  const total = passChance + runChance + defenseChance;
  passChance /= total;
  runChance /= total;
  defenseChance /= total;
  
  const rand = Math.random();
  if (rand < passChance) return 'pass';
  if (rand < passChance + runChance) return 'run';
  return 'defense';
}

function generatePassEvent(
  time: number,
  player: EnhancedPlayer,
  defendingPlayers: EnhancedPlayer[],
  team: string,
  camaraderie: number,
  atmosphereEffects: AtmosphereEffects,
  gamePhase: string,
  playerStats: Record<string, PlayerGameStats>
): MatchEvent {
  const stats = playerStats[player.id];
  stats.passingAttempts++;
  
  // Calculate pass success chance
  let passSuccessChance = 0.6;
  
  // Apply player throwing ability
  passSuccessChance += (player.throwing || 0) / 100;
  
  // Apply camaraderie effects
  const camaraderieModifier = player.inGameModifiers.passing || 0;
  passSuccessChance += camaraderieModifier / 100;
  
  // Apply atmosphere effects (away team penalty)
  if (team === 'away') {
    passSuccessChance -= atmosphereEffects.intimidationFactor / 100;
  }
  
  // Apply stamina effects
  const staminaPenalty = (100 - player.currentStamina) / 200;
  passSuccessChance -= staminaPenalty;
  
  // Apply skill effects
  if (player.skills.includes('Deadeye')) {
    passSuccessChance += 0.15;
  }
  if (player.skills.includes('Pocket Presence')) {
    passSuccessChance += 0.1;
  }
  
  const yardsGained = Math.floor(Math.random() * 20) + 5;
  
  if (Math.random() < passSuccessChance) {
    stats.passesCompleted++;
    stats.passingYards += yardsGained;
    
    // Check for score
    if (Math.random() < 0.15 && gamePhase === 'clutch') {
      stats.scores++;
      stats.clutchPlays++;
      return {
        time: Math.floor(time),
        type: "score",
        description: `TOUCHDOWN! ${player.firstName} ${player.lastName} connects for the score!`,
        player: `${player.firstName} ${player.lastName}`,
        team: team,
        yardsGained
      };
    }
    
    // Check for perfect pass
    if (Math.random() < 0.1) {
      stats.perfectPasses++;
    }
    
    return {
      time: Math.floor(time),
      type: "pass_complete",
      description: `${player.firstName} ${player.lastName} completes a ${yardsGained}-yard pass!`,
      player: `${player.firstName} ${player.lastName}`,
      team: team,
      yardsGained
    };
  } else {
    // Pass failed - determine why
    if (Math.random() < 0.4) {
      // Interception
      const interceptor = defendingPlayers[Math.floor(Math.random() * defendingPlayers.length)];
      if (interceptor) {
        const interceptorStats = playerStats[interceptor.id];
        interceptorStats.interceptionsCaught++;
        
        return {
          time: Math.floor(time),
          type: "interception",
          description: `${interceptor.firstName} ${interceptor.lastName} intercepts the pass!`,
          player: `${interceptor.firstName} ${interceptor.lastName}`,
          team: team === 'home' ? 'away' : 'home',
        };
      }
    }
    
    // Incomplete pass
    return {
      time: Math.floor(time),
      type: "pass_incomplete",
      description: `${player.firstName} ${player.lastName}'s pass falls incomplete.`,
      player: `${player.firstName} ${player.lastName}`,
      team: team,
    };
  }
}

function generateRunEvent(
  time: number,
  player: EnhancedPlayer,
  defendingPlayers: EnhancedPlayer[],
  team: string,
  camaraderie: number,
  atmosphereEffects: AtmosphereEffects,
  gamePhase: string,
  playerStats: Record<string, PlayerGameStats>
): MatchEvent {
  const stats = playerStats[player.id];
  
  // Calculate run success chance
  let runSuccessChance = 0.5;
  
  // Apply player speed and agility
  runSuccessChance += ((player.speed || 0) + (player.agility || 0)) / 200;
  
  // Apply camaraderie effects
  const camaraderieModifier = player.inGameModifiers.rushing || 0;
  runSuccessChance += camaraderieModifier / 100;
  
  // Apply stamina effects
  const staminaPenalty = (100 - player.currentStamina) / 200;
  runSuccessChance -= staminaPenalty;
  
  // Apply skill effects
  if (player.skills.includes('Juke Move')) {
    runSuccessChance += 0.2;
  }
  if (player.skills.includes('Truck Stick')) {
    runSuccessChance += 0.15;
  }
  
  const yardsGained = Math.floor(Math.random() * 15) + 2;
  
  if (Math.random() < runSuccessChance) {
    stats.rushingYards += yardsGained;
    
    // Check for breakaway run
    if (yardsGained >= 12 && Math.random() < 0.3) {
      stats.breakawayRuns++;
      
      // Check for score
      if (Math.random() < 0.4) {
        stats.scores++;
        if (gamePhase === 'clutch') {
          stats.clutchPlays++;
        }
        return {
          time: Math.floor(time),
          type: "score",
          description: `TOUCHDOWN! ${player.firstName} ${player.lastName} breaks free for a ${yardsGained}-yard score!`,
          player: `${player.firstName} ${player.lastName}`,
          team: team,
          yardsGained
        };
      }
    }
    
    return {
      time: Math.floor(time),
      type: "run_positive",
      description: `${player.firstName} ${player.lastName} rushes for ${yardsGained} yards!`,
      player: `${player.firstName} ${player.lastName}`,
      team: team,
      yardsGained
    };
  } else {
    // Run stuffed
    const defender = defendingPlayers[Math.floor(Math.random() * defendingPlayers.length)];
    if (defender) {
      const defenderStats = playerStats[defender.id];
      defenderStats.tackles++;
      
      return {
        time: Math.floor(time),
        type: "run_stuffed",
        description: `${player.firstName} ${player.lastName} is tackled by ${defender.firstName} ${defender.lastName} for no gain.`,
        player: `${player.firstName} ${player.lastName}`,
        team: team,
        yardsGained: 0
      };
    }
    
    return {
      time: Math.floor(time),
      type: "run_stuffed",
      description: `${player.firstName} ${player.lastName} is stopped at the line.`,
      player: `${player.firstName} ${player.lastName}`,
      team: team,
      yardsGained: 0
    };
  }
}

function generateDefenseEvent(
  time: number,
  player: EnhancedPlayer,
  actingPlayers: EnhancedPlayer[],
  team: string,
  camaraderie: number,
  atmosphereEffects: AtmosphereEffects,
  gamePhase: string,
  playerStats: Record<string, PlayerGameStats>
): MatchEvent {
  const stats = playerStats[player.id];
  stats.tackles++;
  
  // Apply skill effects
  if (player.skills.includes('Pancake Block')) {
    stats.knockdownsInflicted++;
    return {
      time: Math.floor(time),
      type: "knockdown",
      description: `${player.firstName} ${player.lastName} delivers a crushing block!`,
      player: `${player.firstName} ${player.lastName}`,
      team: team,
    };
  }
  
  return {
    time: Math.floor(time),
    type: "tackle",
    description: `${player.firstName} ${player.lastName} makes a solid tackle!`,
    player: `${player.firstName} ${player.lastName}`,
    team: team,
  };
}

function generateGeneralEvent(
  time: number,
  player: EnhancedPlayer,
  team: string,
  camaraderie: number,
  atmosphereEffects: AtmosphereEffects,
  gamePhase: string
): MatchEvent {
  return {
    time: Math.floor(time),
    type: "general_play",
    description: `${player.firstName} ${player.lastName} makes a play.`,
    player: `${player.firstName} ${player.lastName}`,
    team: team,
  };
}

function applySkillEffects(event: MatchEvent, player: EnhancedPlayer, playerStats: Record<string, PlayerGameStats>): MatchEvent {
  const stats = playerStats[player.id];
  
  // Track skill usage
  player.skills.forEach(skill => {
    if (Math.random() < 0.1) { // 10% chance to use skill
      stats.skillsUsed.push(skill);
    }
  });
  
  return event;
}

async function generateEnhancedCommentary(
  event: MatchEvent,
  player: EnhancedPlayer,
  defendingPlayers: EnhancedPlayer[],
  gamePhase: string,
  atmosphereEffects: AtmosphereEffects
): Promise<string> {
  const context = {
    gameTime: event.time,
    maxTime: 1800,
    currentHalf: event.time < 900 ? 1 : 2,
    homeScore: 0,
    awayScore: 0,
    gamePhase: gamePhase as any,
    momentum: { home: 50, away: 50 },
    intimidationFactor: atmosphereEffects.intimidationFactor,
    teamCamaraderie: { home: 75, away: 75 }
  };
  
  // Use the commentary service for enhanced commentary
  return commentaryService.generateEventCommentary(event, player, context);
}

function updateStatistics(
  event: MatchEvent,
  homeStats: any,
  awayStats: any,
  playerStats: Record<string, PlayerGameStats>
): void {
  const isHomeTeam = event.team === 'home';
  const stats = isHomeTeam ? homeStats : awayStats;
  
  switch (event.type) {
    case 'pass_complete':
      stats.passes++;
      break;
    case 'interception':
      stats.interceptions++;
      break;
    case 'run_positive':
    case 'run_stuffed':
      stats.rushing++;
      break;
    case 'tackle':
    case 'knockdown':
      stats.tackles++;
      break;
    case 'fumble':
      stats.fumbles++;
      break;
  }
}

function applyStaminaEffects(homeTeamPlayers: EnhancedPlayer[], awayTeamPlayers: EnhancedPlayer[], time: number): void {
  const staminaDrain = 0.5; // Stamina drain per time unit
  
  [...homeTeamPlayers, ...awayTeamPlayers].forEach(player => {
    player.currentStamina = Math.max(0, player.currentStamina - staminaDrain);
    
    // Apply race-specific stamina effects
    if (player.race === 'sylvan' && player.skills.includes('Photosynthesis')) {
      player.currentStamina = Math.min(100, player.currentStamina + 0.3);
    }
    
    if (player.race === 'lumina' && player.skills.includes('Healing Light')) {
      player.currentStamina = Math.min(100, player.currentStamina + 0.2);
    }
  });
}

function findMVPPlayers(
  homeTeamPlayers: EnhancedPlayer[],
  awayTeamPlayers: EnhancedPlayer[],
  playerStats: Record<string, PlayerGameStats>
): { home: string; away: string } {
  let homeMVP = '';
  let awayMVP = '';
  let homeHighScore = 0;
  let awayHighScore = 0;
  
  homeTeamPlayers.forEach(player => {
    const stats = playerStats[player.id];
    const mvpScore = stats.scores * 10 + stats.passesCompleted * 2 + stats.carrierYards * 0.1 + 
                     stats.tackles * 3 + stats.interceptionsCaught * 5 + stats.clutchPlays * 8;
    
    if (mvpScore > homeHighScore) {
      homeHighScore = mvpScore;
      homeMVP = `${player.firstName} ${player.lastName}`;
    }
  });
  
  awayTeamPlayers.forEach(player => {
    const stats = playerStats[player.id];
    const mvpScore = stats.scores * 10 + stats.passesCompleted * 2 + stats.carrierYards * 0.1 + 
                     stats.tackles * 3 + stats.interceptionsCaught * 5 + stats.clutchPlays * 8;
    
    if (mvpScore > awayHighScore) {
      awayHighScore = mvpScore;
      awayMVP = `${player.firstName} ${player.lastName}`;
    }
  });
  
  return { home: homeMVP, away: awayMVP };
}
