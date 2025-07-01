import type { Player } from "./schema";

/**
 * Determines a player's optimal role based on their stats
 * Returns standardized role names: "Passer", "Runner", "Blocker"
 */
export function getPlayerRole(player: Player | any): string {
  if (!player) return "Player";
  
  const { 
    speed = 0, 
    agility = 0, 
    catching = 0, 
    throwing = 0, 
    power = 0, 
    leadership = 0, 
    stamina = 0 
  } = player;
  
  // Calculate role scores based on relevant stats
  const passerScore = (throwing * 2) + (leadership * 1.5);
  const runnerScore = (speed * 2) + (agility * 1.5);
  const blockerScore = (power * 2) + (stamina * 1.5);
  
  const maxScore = Math.max(passerScore, runnerScore, blockerScore);
  
  if (maxScore === passerScore) return "Passer";
  if (maxScore === runnerScore) return "Runner";
  return "Blocker";
}

/**
 * Get role color for UI consistency
 */
export function getRoleColor(role: string): string {
  switch (role.toLowerCase()) {
    case "passer":
      return "bg-yellow-500";
    case "runner":
      return "bg-green-500";
    case "blocker":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

/**
 * Get role badge variant for UI consistency
 */
export function getRoleBadgeVariant(role: string): "default" | "secondary" | "destructive" | "outline" {
  switch (role.toLowerCase()) {
    case "passer":
      return "default";
    case "runner":
      return "secondary";
    case "blocker":
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * Standardize player name display
 */
export function getPlayerDisplayName(player: Player | any): string {
  if (!player) return "Unknown Player";
  
  // Prioritize lastName first for consistency
  if (player.lastName && player.lastName !== "Player" && player.lastName !== "AI") {
    return player.lastName;
  }
  
  if (player.firstName && player.firstName !== "AI" && player.firstName !== "Player") {
    return player.firstName;
  }
  
  if (player.name && !player.name.includes("Player") && !player.name.includes("AI")) {
    return player.name;
  }
  
  // Fallback to role-based name
  const role = getPlayerRole(player);
  const roleNames = {
    Passer: ["Quarterback", "Playmaker", "Field General"],
    Runner: ["Speedster", "Rusher", "Charger"],
    Blocker: ["Tank", "Guardian", "Wall"]
  };
  
  const names = roleNames[role as keyof typeof roleNames] || ["Player"];
  return names[Math.floor(Math.random() * names.length)];
}

/**
 * Standardize race name display
 */
export function getRaceDisplayName(race: string): string {
  if (!race) return "Unknown";
  
  // Capitalize first letter, lowercase rest
  return race.charAt(0).toUpperCase() + race.slice(1).toLowerCase();
}