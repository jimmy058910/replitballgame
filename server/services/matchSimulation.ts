import type { Player } from "@shared/schema";

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
  let homeStats = { possession: 0, passes: 0, interceptions: 0 };
  let awayStats = { possession: 0, passes: 0, interceptions: 0 };

  // Calculate team strengths
  const homeStrength = calculateTeamStrength(homeTeamPlayers);
  const awayStrength = calculateTeamStrength(awayTeamPlayers);

  // Simulate match events over 20 minutes (1200 seconds)
  for (let time = 0; time < 1200; time += Math.random() * 30 + 10) {
    const event = generateMatchEvent(
      time,
      homeTeamPlayers,
      awayTeamPlayers,
      homeStrength,
      awayStrength
    );
    
    events.push(event);

    // Update scores and stats based on event
    if (event.type === "score") {
      if (event.team === "home") {
        homeScore++;
      } else {
        awayScore++;
      }
    } else if (event.type === "pass") {
      if (event.team === "home") {
        homeStats.passes++;
      } else {
        awayStats.passes++;
      }
    } else if (event.type === "interception") {
      if (event.team === "home") {
        homeStats.interceptions++;
      } else {
        awayStats.interceptions++;
      }
    }
  }

  // Calculate possession based on team strength and events
  const totalStrength = homeStrength + awayStrength;
  homeStats.possession = Math.round((homeStrength / totalStrength) * 100);
  awayStats.possession = 100 - homeStats.possession;

  return {
    homeScore,
    awayScore,
    gameData: {
      events: events.slice(0, 20), // Limit events for display
      finalStats: {
        possession: { home: homeStats.possession, away: awayStats.possession },
        passes: { home: homeStats.passes, away: awayStats.passes },
        interceptions: { home: homeStats.interceptions, away: awayStats.interceptions },
      },
    },
  };
}

function calculateTeamStrength(players: Player[]): number {
  return players.reduce((total, player) => {
    const avgStats = (
      player.speed + player.power + player.throwing + 
      player.catching + player.stamina + player.agility
    ) / 6;
    
    // Apply racial bonuses
    let bonus = 1;
    switch (player.race) {
      case "sylvan":
        bonus = 1.1; // 10% agility/speed bonus
        break;
      case "gryll":
        bonus = 1.05; // 5% power/stamina bonus
        break;
      case "lumina":
        bonus = 1.08; // 8% throwing/leadership bonus
        break;
      case "umbra":
        bonus = 1.07; // 7% speed/agility bonus
        break;
      default:
        bonus = 1.03; // 3% balanced bonus for humans
    }
    
    return total + (avgStats * bonus);
  }, 0);
}

function generateMatchEvent(
  time: number,
  homeTeamPlayers: Player[],
  awayTeamPlayers: Player[],
  homeStrength: number,
  awayStrength: number
): MatchEvent {
  const isHomeTeam = Math.random() < homeStrength / (homeStrength + awayStrength);
  const team = isHomeTeam ? "home" : "away";
  const players = isHomeTeam ? homeTeamPlayers : awayTeamPlayers;
  
  const randomPlayer = players[Math.floor(Math.random() * players.length)];
  const eventTypes = ["pass", "run", "interception", "score", "tackle"];
  const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

  let description = "";
  
  switch (eventType) {
    case "pass":
      description = `${randomPlayer.name} (${randomPlayer.race}) completes a precise pass down field!`;
      break;
    case "run":
      description = `${randomPlayer.name} (${randomPlayer.race}) breaks through the defense with a powerful run!`;
      break;
    case "interception":
      description = `${randomPlayer.name} (${randomPlayer.race}) intercepts the ball with keen awareness!`;
      break;
    case "score":
      description = `SCORE! ${randomPlayer.name} (${randomPlayer.race}) reaches the scoring zone!`;
      break;
    case "tackle":
      description = `${randomPlayer.name} (${randomPlayer.race}) makes a solid tackle to stop the advance!`;
      break;
  }

  return {
    time: Math.floor(time),
    type: eventType,
    description,
    player: randomPlayer.name,
    team,
  };
}
