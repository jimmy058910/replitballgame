// Race-specific name databases for fantasy sports players
export interface NameDatabase {
  firstNames: string[];
  lastNames: string[];
}

export const RACE_NAMES: Record<string, NameDatabase> = {
  human: {
    firstNames: [
      "Marcus", "Elena", "Viktor", "Sophia", "Alexander", "Isabella", "Lucas", "Aria",
      "Gabriel", "Nova", "Felix", "Luna", "Maximus", "Aurora", "Sebastian", "Iris",
      "Adrian", "Zara", "Julian", "Lyra", "Xavier", "Vera", "Dante", "Maya",
      "Orion", "Stella", "Atlas", "Cora", "Phoenix", "Vale", "Storm", "Sage",
      "Blade", "River", "Zane", "Ember", "Knox", "Skye", "Cruz", "Wren"
    ],
    lastNames: [
      "Swift", "Storm", "Blade", "Stone", "Steel", "Frost", "Flame", "Shadow",
      "Hunter", "Knight", "Archer", "Walker", "Cross", "Pierce", "Sharp", "Strong",
      "Bold", "Brave", "Noble", "Free", "Wild", "True", "Fair", "Bright",
      "Thunder", "Lightning", "Eagle", "Wolf", "Bear", "Lion", "Hawk", "Fox",
      "Ridge", "Vale", "Brook", "Field", "Hill", "Grove", "Shore", "Peak"
    ]
  },
  
  sylvan: {
    firstNames: [
      "Elysian", "Sylvanna", "Thornwick", "Moonwhisper", "Starleaf", "Dawnbreeze", "Silverwind", "Faelight",
      "Willowmere", "Oakenheart", "Fernshade", "Mistral", "Celestine", "Verdania", "Luminara", "Whisperwind",
      "Emberleaf", "Nightbloom", "Sunward", "Crystalwood", "Shadowbark", "Goldenbough", "Dreamweaver", "Stormleaf",
      "Moonfire", "Starwhisper", "Glimmerwing", "Thornvale", "Dewdrop", "Skyweaver", "Brightleaf", "Mysticwind",
      "Forestsong", "Gracewing", "Swiftbough", "Eldergrove", "Fawnheart", "Starfall", "Moonbeam", "Wildrose"
    ],
    lastNames: [
      "Moonwhisper", "Starweaver", "Thornvale", "Silverleaf", "Goldenbough", "Nightshade", "Dawnbreeze", "Stormwind",
      "Crystalbrook", "Emberwood", "Frostbloom", "Sunward", "Shadowgrove", "Brightleaf", "Whisperwind", "Starfall",
      "Moonfire", "Dewdrop", "Skyweaver", "Forestsong", "Gracewing", "Swiftbough", "Eldergrove", "Fawnheart",
      "Glimmerwing", "Dreamweaver", "Mysticwind", "Wildrose", "Thornwick", "Celestine", "Verdania", "Luminara",
      "Willowmere", "Oakenheart", "Fernshade", "Mistral", "Silverwind", "Faelight", "Nightbloom", "Crystalwood"
    ]
  },
  
  gryll: {
    firstNames: [
      "Grimjaw", "Ironhide", "Bloodfang", "Stormcrusher", "Bonecleaver", "Ragefist", "Skullsmasher", "Warcry",
      "Beastbane", "Flamebringer", "Stoneheart", "Thunderclap", "Blackthorn", "Redclaw", "Steelback", "Gorefang",
      "Brokentusk", "Scarface", "Ironwill", "Rockcrusher", "Firebrand", "Shadowbane", "Doomhammer", "Bloodaxe",
      "Grimstone", "Ironforge", "Battlecry", "Stormbringer", "Rockjaw", "Flameborn", "Bonecrusher", "Ragemaw",
      "Grimbolt", "Ironbane", "Bloodstorm", "Thunderfist", "Stormrage", "Ironfang", "Grimscar", "Rockbane"
    ],
    lastNames: [
      "Ironhide", "Bonecrusher", "Stormrage", "Bloodfang", "Grimjaw", "Rockbane", "Flamebringer", "Thunderclaw",
      "Steelback", "Ragefist", "Shadowbane", "Doomhammer", "Blackthorn", "Redclaw", "Gorefang", "Brokentusk",
      "Scarface", "Ironwill", "Rockcrusher", "Firebrand", "Bloodaxe", "Grimstone", "Ironforge", "Battlecry",
      "Stormbringer", "Rockjaw", "Flameborn", "Ragemaw", "Grimbolt", "Ironbane", "Bloodstorm", "Thunderfist",
      "Ironfang", "Grimscar", "Skullsmasher", "Warcry", "Beastbane", "Stoneheart", "Thunderclap", "Stormcrusher"
    ]
  },
  
  lumina: {
    firstNames: [
      "Radiance", "Celestial", "Luminous", "Brightbane", "Starfire", "Goldlight", "Sunburst", "Crystalshine",
      "Dazzling", "Prism", "Gleaming", "Brilliant", "Shimmering", "Blazing", "Glowing", "Incandescent",
      "Luxaria", "Solaris", "Aurelius", "Stellaris", "Luminara", "Crystara", "Brilliana", "Radiant",
      "Celestine", "Solarian", "Aurelia", "Stellaria", "Luminous", "Crystaline", "Brilliance", "Radiance",
      "Lightbringer", "Starbeam", "Sunfire", "Goldbeam", "Silverlight", "Brightstar", "Glowstone", "Shimmerwind"
    ],
    lastNames: [
      "Brightbane", "Starfire", "Goldlight", "Sunburst", "Crystalshine", "Dazzling", "Prism", "Gleaming",
      "Brilliant", "Shimmering", "Blazing", "Glowing", "Incandescent", "Luxaria", "Solaris", "Aurelius",
      "Stellaris", "Luminara", "Crystara", "Brilliana", "Radiant", "Celestine", "Solarian", "Aurelia",
      "Stellaria", "Crystaline", "Brilliance", "Lightbringer", "Starbeam", "Sunfire", "Goldbeam", "Silverlight",
      "Brightstar", "Glowstone", "Shimmerwind", "Radiance", "Celestial", "Luminous", "Starblaze", "Crystalbeam"
    ]
  },
  
  umbra: {
    firstNames: [
      "Shadowmere", "Darkbane", "Nightfall", "Voidwalker", "Blackthorn", "Grimshade", "Shadowstep", "Darkveil",
      "Nightwhisper", "Voidheart", "Blackwind", "Shadowblade", "Darkmoon", "Nightstalker", "Voidcaller", "Shadowborn",
      "Umbros", "Tenebris", "Nocturne", "Eclipse", "Obsidian", "Raven", "Onyx", "Shade",
      "Phantom", "Wraith", "Specter", "Ghost", "Spirit", "Soul", "Death", "Doom",
      "Darkstorm", "Shadowflame", "Nightbringer", "Voidstorm", "Blackfire", "Shadowwind", "Darkheart", "Nightbane"
    ],
    lastNames: [
      "Shadowmere", "Darkbane", "Nightfall", "Voidwalker", "Blackthorn", "Grimshade", "Shadowstep", "Darkveil",
      "Nightwhisper", "Voidheart", "Blackwind", "Shadowblade", "Darkmoon", "Nightstalker", "Voidcaller", "Shadowborn",
      "Umbros", "Tenebris", "Nocturne", "Eclipse", "Obsidian", "Raven", "Onyx", "Shade",
      "Phantom", "Wraith", "Specter", "Ghost", "Spirit", "Soul", "Death", "Doom",
      "Darkstorm", "Shadowflame", "Nightbringer", "Voidstorm", "Blackfire", "Shadowwind", "Darkheart", "Nightbane"
    ]
  }
};

export function generateRandomName(race: string): { firstName: string; lastName: string } {
  const raceNames = RACE_NAMES[race.toLowerCase()];
  if (!raceNames) {
    // Fallback to human names if race not found
    const humanNames = RACE_NAMES.human;
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
  const raceNames = RACE_NAMES[race.toLowerCase()];
  if (!raceNames) return false;
  
  return raceNames.firstNames.includes(firstName) && raceNames.lastNames.includes(lastName);
}