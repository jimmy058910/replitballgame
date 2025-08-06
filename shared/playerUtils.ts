// @ts-expect-error TS2307
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
 * Get role background color for UI consistency - Universal Color Scheme
 * Red for Blockers, Yellow for Passers, Green for Runners
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
 * Get role text color for UI consistency
 */
export function getRoleTextColor(role: string): string {
  switch (role.toLowerCase()) {
    case "passer":
      return "text-yellow-600 dark:text-yellow-400";
    case "runner":
      return "text-green-600 dark:text-green-400";
    case "blocker":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

/**
 * Get role background color with opacity for cards
 */
export function getRoleBackgroundColor(role: string): string {
  switch (role.toLowerCase()) {
    case "passer":
      return "bg-yellow-100 dark:bg-yellow-900/20";
    case "runner":
      return "bg-green-100 dark:bg-green-900/20";
    case "blocker":
      return "bg-red-100 dark:bg-red-900/20";
    default:
      return "bg-gray-100 dark:bg-gray-900/20";
  }
}

/**
 * Get role border color for UI consistency
 */
export function getRoleBorderColor(role: string): string {
  switch (role.toLowerCase()) {
    case "passer":
      return "border-yellow-500";
    case "runner":
      return "border-green-500";
    case "blocker":
      return "border-red-500";
    default:
      return "border-gray-500";
  }
}

/**
 * Get role hex color for direct color usage
 */
export function getRoleHexColor(role: string): string {
  switch (role.toLowerCase()) {
    case "passer":
      return "#EAB308"; // yellow-500
    case "runner":
      return "#22C55E"; // green-500
    case "blocker":
      return "#EF4444"; // red-500
    default:
      return "#6B7280"; // gray-500
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
  if (!race) return "Human";
  
  // Capitalize first letter, lowercase rest
  return race.charAt(0).toUpperCase() + race.slice(1).toLowerCase();
}