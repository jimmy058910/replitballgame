import type { Player, Team } from "@shared/schema";
import { getTeamCamaraderie } from "./camaraderieService"; // From jules

interface MatchEvent {
  time: number;
  type: string;
  description: string;
  player?: string;
  team?: string;
}

interface MatchResult {
  homeScore: number;
  awayScore: number;
  gameData: {
    events: MatchEvent[];
    finalStats: {
      possession: { home: number; away: number };
      passes: { home: number; away: number };
      interceptions: { home: number; away: number };
    };
  };
}

export async function simulateMatch(
  homeTeamPlayers: Player[],
  awayTeamPlayers: Player[]
): Promise<MatchResult> {
  const events: MatchEvent[] = [];
  let homeScore = 0;
  let awayScore = 0;
  let homeStats = { possession: 0, passes: 0, interceptions: 0, failedCatches: 0, passInaccuracy: 0 };
  let awayStats = { possession: 0, passes: 0, interceptions: 0, failedCatches: 0, passInaccuracy: 0 };

  const homeTeamId = homeTeamPlayers.length > 0 ? homeTeamPlayers[0].teamId : null;
  const awayTeamId = awayTeamPlayers.length > 0 ? awayTeamPlayers[0].teamId : null;

  let homeTeamCamaraderie = 50;
  let awayTeamCamaraderie = 50;

  if (homeTeamId) {
    homeTeamCamaraderie = await getTeamCamaraderie(homeTeamId) || 50;
  }
  if (awayTeamId) {
    awayTeamCamaraderie = await getTeamCamaraderie(awayTeamId) || 50;
  }

  let tempHomeTeamPlayers = homeTeamPlayers.map(p => ({ ...p }));
  let tempAwayTeamPlayers = awayTeamPlayers.map(p => ({ ...p }));

  if (homeTeamCamaraderie > 75) {
    tempHomeTeamPlayers = tempHomeTeamPlayers.map(p => ({
      ...p,
      catching: (p.catching || 0) + 2,
      agility: (p.agility || 0) + 2,
    }));
  }
  if (awayTeamCamaraderie > 75) {
    tempAwayTeamPlayers = tempAwayTeamPlayers.map(p => ({
      ...p,
      catching: (p.catching || 0) + 2,
      agility: (p.agility || 0) + 2,
    }));
  }

  const homeStrength = calculateTeamStrength(tempHomeTeamPlayers); // Uses jules' version with racial bonus
  const awayStrength = calculateTeamStrength(tempAwayTeamPlayers); // Uses jules' version with racial bonus

  const matchDuration = 1200;
  const halftimeTime = matchDuration / 2;
  let halftimeEventAdded = false;

  for (let time = 0; time < matchDuration; time += Math.random() * 30 + 10) {
    if (time >= halftimeTime && !halftimeEventAdded) {
      events.push({
        time: Math.floor(halftimeTime),
        type: "halftime",
        description: "It's halftime! Time for a short break and a word from our sponsors.", // From ad-rewards
      });
      halftimeEventAdded = true;
    }

    const event = generateMatchEvent(
      time,
      tempHomeTeamPlayers,
      tempAwayTeamPlayers,
      homeStrength,
      awayStrength,
      homeTeamCamaraderie,
      awayTeamCamaraderie
    );
    
    events.push(event);

    if (event.type === "score") {
      if (event.team === "home") homeScore++;
      else awayScore++;
    } else if (event.type === "pass_complete") {
      if (event.team === "home") homeStats.passes++;
      else awayStats.passes++;
    } else if (event.type === "pass_incomplete" || event.type === "pass_inaccurate") {
      if (event.team === "home") homeStats.passInaccuracy++;
      else awayStats.passInaccuracy++;
    } else if (event.type === "catch_failed") {
      if (event.team === "home") homeStats.failedCatches++;
      else awayStats.failedCatches++;
    } else if (event.type === "interception") {
      if (event.team === "home") homeStats.interceptions++;
      else awayStats.interceptions++;
    }
  }

  const totalStrength = homeStrength + awayStrength;
  homeStats.possession = Math.round((homeStrength / totalStrength) * 100);
  awayStats.possession = 100 - homeStats.possession;

  return {
    homeScore,
    awayScore,
    gameData: {
      events: events.slice(0, 20),
      finalStats: {
        possession: { home: homeStats.possession, away: awayStats.possession },
        passes: { home: homeStats.passes, away: awayStats.passes },
        interceptions: { home: homeStats.interceptions, away: awayStats.interceptions },
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
