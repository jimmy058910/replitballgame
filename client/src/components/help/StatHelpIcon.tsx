import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatExplanation {
  name: string;
  description: string;
  impact: string;
  goodRange: string;
}

const STAT_EXPLANATIONS: Record<string, StatExplanation> = {
  speed: {
    name: "Speed",
    description: "How fast a player can run across the field.",
    impact: "Higher speed helps players reach balls faster, escape tackles, and score from distance.",
    goodRange: "32+ is excellent, 25-31 is good, below 25 is slow"
  },
  power: {
    name: "Power",
    description: "Physical strength and ability to break through tackles.",
    impact: "Stronger players are harder to tackle and can push through defensive lines.",
    goodRange: "32+ is dominant, 25-31 is strong, below 25 is weak"
  },
  throwing: {
    name: "Throwing",
    description: "Accuracy and distance of passes.",
    impact: "Essential for Passers. Better throwing means more successful passes and scoring opportunities.",
    goodRange: "32+ is elite passer, 25-31 is reliable, below 25 struggles with passes"
  },
  catching: {
    name: "Catching",
    description: "Ability to successfully receive passes.",
    impact: "High catching ensures players hold onto the ball when receiving passes.",
    goodRange: "32+ rarely drops, 25-31 is dependable, below 25 drops frequently"
  },
  kicking: {
    name: "Kicking",
    description: "Ability to kick the ball for field position.",
    impact: "Used for special plays and clearing the ball from danger.",
    goodRange: "32+ is specialist level, 25-31 is competent, below 25 is poor"
  },
  stamina: {
    name: "Stamina",
    description: "How long a player can maintain peak performance.",
    impact: "Players with low stamina become tired and less effective as the game progresses.",
    goodRange: "32+ can play full game, 25-31 needs occasional rest, below 25 tires quickly"
  },
  leadership: {
    name: "Leadership",
    description: "Ability to inspire and coordinate teammates.",
    impact: "Leaders boost team morale and improve overall team performance.",
    goodRange: "32+ is captain material, 25-31 is vocal presence, below 25 is follower"
  },
  agility: {
    name: "Agility",
    description: "Ability to change direction quickly and dodge tackles.",
    impact: "Agile players can weave through defenses and avoid being tackled.",
    goodRange: "32+ is elusive, 25-31 is nimble, below 25 is stiff"
  },
  overallPotentialStars: {
    name: "Potential",
    description: "The player's maximum possible development level.",
    impact: "Higher potential means the player can improve more with training and experience.",
    goodRange: "4-5 stars is superstar potential, 3 stars is solid starter, 1-2 stars is role player"
  },
  camaraderie: {
    name: "Camaraderie",
    description: "How well the player fits with the team chemistry.",
    impact: "High camaraderie improves performance and reduces injury risk. Low camaraderie may lead to contract issues.",
    goodRange: "75+ is fully integrated, 50-74 is comfortable, below 50 may want to leave"
  }
};

interface StatHelpIconProps {
  stat: string;
  className?: string;
}

export function StatHelpIcon({ stat, className = "" }: StatHelpIconProps) {
  const explanation = STAT_EXPLANATIONS[stat.toLowerCase()];
  
  if (!explanation) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className={`h-3 w-3 text-gray-400 hover:text-gray-300 cursor-help inline-block ml-1 ${className}`} />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-3 space-y-2">
          <div>
            <p className="font-semibold text-sm">{explanation.name}</p>
            <p className="text-xs text-gray-300">{explanation.description}</p>
          </div>
          <div>
            <p className="text-xs font-medium">Game Impact:</p>
            <p className="text-xs text-gray-300">{explanation.impact}</p>
          </div>
          <div>
            <p className="text-xs font-medium">Value Guide:</p>
            <p className="text-xs text-gray-300">{explanation.goodRange}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}