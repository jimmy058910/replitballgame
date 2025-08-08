// Race-specific name databases for fantasy sports players
export interface NameDatabase {
  firstNames: string[];
  lastNames: string[];
}

import raceNamesData from './config/race_names.json' with { type: "json" };

export const RACE_NAMES: Record<string, NameDatabase> = raceNamesData;

// Fallback to human names if race not found or if 'human' itself is requested from a potentially incomplete JSON
const getFallbackHumanNames = (): NameDatabase => {
  if (RACE_NAMES.human && RACE_NAMES.human.firstNames && RACE_NAMES.human.lastNames) {
    return RACE_NAMES.human;
  }
  // Absolute fallback if JSON is entirely broken or 'human' key is missing
  return {
    firstNames: ["DefaultFirst", "Player"],
    lastNames: ["DefaultLast", "Nameless"]
  };
};

export function generateRandomName(race: string): { firstName: string; lastName: string } {
  const lowerCaseRace = race.toLowerCase();
  const raceNames = RACE_NAMES[lowerCaseRace];

  if (!raceNames || !raceNames.firstNames || !raceNames.lastNames || raceNames.firstNames.length === 0 || raceNames.lastNames.length === 0) {
    // Fallback to human names if race not found or data is invalid
    const humanNames = getFallbackHumanNames();
    return {
      firstName: humanNames.firstNames[Math.floor(Math.random() * humanNames.firstNames.length)],
      lastName: humanNames.lastNames[Math.floor(Math.random() * humanNames.lastNames.length)]
    };
  }
  return {
    firstName: raceNames.firstNames[Math.floor(Math.random() * raceNames.firstNames.length)],
    lastName: raceNames.lastNames[Math.floor(Math.random() * raceNames.lastNames.length)]
  };
}

export function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

export function validateRaceName(race: string, firstName: string, lastName: string): boolean {
  const lowerCaseRace = race.toLowerCase();
  const raceNames = RACE_NAMES[lowerCaseRace];
  if (!raceNames || !raceNames.firstNames || !raceNames.lastNames) return false;
  
  return raceNames.firstNames.includes(firstName) && raceNames.lastNames.includes(lastName);
}