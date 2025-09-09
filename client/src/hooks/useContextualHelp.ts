import { useState, useEffect } from "react";
import type { Player, Team, Stadium } from '@shared/types/models';


type HelpCategory = {
  [key: string]: string;
};

type HelpContent = {
  [category: string]: HelpCategory;
};

// Contextual help content for different UI elements
export const helpContent: HelpContent = {
  // Dashboard Help
  dashboard: {
    overview: "Your team headquarters showing team status, players, finances, and quick actions.",
    playerRoster: "View your active players with their power ratings and roles. Click any player for details.",
    finances: "Shows your Credits (main currency) and Premium Gems. Credits are earned through matches.",
    serverTime: "Game runs on Eastern Time. Matches scheduled between 5-10 PM ET daily.",
    notifications: "Important updates about matches, injuries, and transfers. Click to mark as read.",
  },

  // Team Management Help  
  team: {
    roster: "Manage your 6-8 player roster. Minimum 6 players required to play matches.",
    formation: "Set your starting 6: 1 Passer (Yellow), 2 Runners (Green), 2 Blockers (Red), 1 Wildcard.",
    contracts: "Negotiate player salaries and contract length. Higher camaraderie improves willingness.",
    taxiSquad: "Development spots for 2 prospects. Promote when ready or release to free space.",
    staff: "Your support team affects player development, injury recovery, and tactical effectiveness.",
    camaraderie: "Team chemistry (0-100). High camaraderie provides in-game bonuses and injury resistance.",
  },

  // Player Stats Help
  playerStats: {
    speed: "Movement speed (1-40). Key for Runners. Elite: 32+, Average: 19-31, Poor: ≤18",
    power: "Physical strength (1-40). Key for Blockers. Affects tackles and blocks.",
    throwing: "Passing accuracy (1-40). Key for Passers. Determines completion rate.",
    catching: "Reception ability (1-40). Important for all offensive players.",
    kicking: "Field goal ability (1-40). Used for special plays and scoring.",
    stamina: "Endurance (1-40). Low stamina increases injury risk. Rest players regularly.",
    leadership: "Team influence (1-40). Boosts nearby teammates. Key for captains.",
    agility: "Dodging ability (1-40). Key for Runners. Helps avoid tackles.",
    powerRating: "Overall strength = Speed + Power + Throwing + Catching + Kicking",
    potential: "Growth capacity (2-5 stars). More stars = higher stat growth potential.",
  },

  // Races Help
  races: {
    human: "Balanced all-rounders. Good at any position. No major strengths or weaknesses.",
    sylvan: "Swift and agile. Excel as Runners. High speed and stamina, lower power.",
    gryll: "Tough defenders. Excel as Blockers. High power and stamina, lower speed.",
    lumina: "Charismatic leaders. Excel as Passers. High leadership and catching.",
    umbra: "Tactical tricksters. Versatile players with unpredictable abilities.",
  },

  // Tactical Help
  tactical: {
    fieldSize: "Choose field dimensions. Large: +Speed/Stamina bonus. Small: +Power/Leadership bonus. Standard: Balanced.",
    focus: "Pre-match strategy. Balanced: 50/50 mix. Attack: +Passing, -Defense. Defensive: +Defense, -Offense.",
    formation: "Drag players to positions. Passer in back, Runners in middle, Blockers up front.",
    substitutions: "Set backup order by position. Players auto-sub at 50% stamina.",
    situational: "AI adapts to game state. Winning big: Conservative. Losing big: Aggressive. Close game: Maximum effort.",
  },

  // Competition Help
  competition: {
    league: "14-day regular season. One match daily. Top 2 promote, bottom 2 relegate.",
    playoffs: "Day 15 championship. Top 4 teams qualify. Winners may earn promotion.",
    exhibitions: "Practice matches (3/day max). Cost: 500 Credits or 50 Gems. No relegation risk.",
    tournaments: "Special events with big prizes. Entry: 2,000 Credits or 200 Gems.",
    matchDuration: "Matches last 6 real minutes (3 per half). Watch live or check results later.",
  },

  // Store Help
  store: {
    credits: "Main currency. Earn through matches, achievements, and season rewards.",
    gems: "Premium currency. Purchase or earn through special events. Unlocks exclusive items.",
    items: "Buy training gear, medical supplies, and boosts to improve your team.",
    tryouts: "Find new players. Basic (1,000 Credits): 3 candidates. Premium (100 Gems): 5 better candidates.",
    premium: "Exclusive features like advanced analytics, auto-management, and priority support.",
  },

  // Stadium Help
  stadium: {
    capacity: "More seats = more revenue. Upgrade gradually as your team improves.",
    facilities: "Training: Improves player growth. Medical: Faster injury recovery. Both reduce injury risk.",
    fieldType: "Your chosen field size gives home advantage. Can only change in off-season.",
    revenue: "Income from tickets, concessions, and sponsorships. Win more to attract fans.",
    maintenance: "Facilities cost credits weekly. Balance upgrades with running costs.",
  },

  // Marketplace Help
  marketplace: {
    auctions: "Bid on players from other teams. Minimum bid increase: 5%. Time extends with new bids.",
    trading: "Direct player swaps with other teams. Consider salaries and team needs.",
    scouting: "Reports reveal detailed player info. Generated daily by your scouts.",
    valuation: "Player worth based on stats, age, potential, and recent performance.",
    strategy: "Bid early to discourage competition or snipe at the last second.",
  },
};

// Tutorial steps for new users
export const tutorialSteps = [
  {
    id: "welcome",
    title: "Welcome to Realm Rivalry!",
    content: "Let's take a quick tour to get you started managing your fantasy sports team.",
    target: null,
  },
  {
    id: "dashboard",
    title: "Your Dashboard",
    content: "This is your command center. Check team status, manage players, and navigate to all features.",
    target: ".dashboard-container",
  },
  {
    id: "roster",
    title: "Player Roster",
    content: "Your players are shown here with power ratings and roles. Green = Runners, Yellow = Passers, Red = Blockers.",
    target: ".player-roster",
  },
  {
    id: "navigation",
    title: "Main Navigation",
    content: "Access all game features from here. Team, Competition, Store, and more.",
    target: ".main-navigation",
  },
  {
    id: "credits",
    title: "Game Currency",
    content: "Credits (main currency) and Gems (premium). Earn credits by winning matches!",
    target: ".currency-display",
  },
  {
    id: "complete",
    title: "Ready to Play!",
    content: "That's the basics! Check the manual for detailed info or hover over ? icons for help.",
    target: null,
  },
];

export function useContextualHelp() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showHelp, setShowHelp] = useState<string | null>(null);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

  useEffect(() => {
    // Check if user has seen tutorial for their current team
    const seen = localStorage.getItem("realm-rivalry-tutorial-seen");
    if (!seen) {
      setHasSeenTutorial(false);
      // Tutorial will be triggered when team is created
    } else {
      setHasSeenTutorial(true);
    }
  }, []);

  // Function to trigger tutorial after team creation
  const startTutorialAfterTeamCreation = () => {
    const seen = localStorage.getItem("realm-rivalry-tutorial-seen");
    if (!seen) {
      setShowTutorial(true);
      setCurrentStep(0);
    }
  };

  const completeTutorial = () => {
    localStorage.setItem("realm-rivalry-tutorial-seen", "true");
    setShowTutorial(false);
    setHasSeenTutorial(true);
  };

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTutorial = () => {
    completeTutorial();
  };

  const resetTutorial = () => {
    localStorage.removeItem("realm-rivalry-tutorial-seen");
    setShowTutorial(true);
    setCurrentStep(0);
    setHasSeenTutorial(false);
  };

  const openHelp = (helpKey: string) => {
    setShowHelp(helpKey);
  };

  const closeHelp = () => {
    setShowHelp(null);
  };

  const getHelpContent = (category: string, key: string): string => {
    const categoryContent = helpContent[category as keyof typeof helpContent];
    if (categoryContent && typeof categoryContent === 'object') {
      return categoryContent[key as keyof typeof categoryContent] || "Help content not found.";
    }
    return "Help content not found.";
  };

  return {
    // Tutorial state
    showTutorial,
    currentStep,
    tutorialSteps,
    hasSeenTutorial,
    
    // Tutorial actions
    nextStep,
    previousStep,
    skipTutorial,
    resetTutorial,
    startTutorialAfterTeamCreation,
    
    // Help state
    showHelp,
    
    // Help actions
    openHelp,
    closeHelp,
    getHelpContent,
  };
}