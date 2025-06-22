import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlayerCardProps {
  player: any;
  compact?: boolean;
}

// Helper function to determine player role based on attributes
function getPlayerRole(player: any): string {
  const { speed, agility, catching, throwing, power } = player;
  
  const passerScore = (throwing * 2) + (player.leadership * 1.5);
  const runnerScore = (speed * 2) + (agility * 1.5);
  const blockerScore = (power * 2) + (player.stamina * 1.5);
  
  const maxScore = Math.max(passerScore, runnerScore, blockerScore);
  
  if (maxScore === passerScore) return "Passer";
  if (maxScore === runnerScore) return "Runner";
  return "Blocker";
}

const roleColors = {
  Passer: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  Runner: "text-green-400 bg-green-400/10 border-green-400/30", 
  Blocker: "text-red-400 bg-red-400/10 border-red-400/30",
} as const;

const raceColors = {
  human: "race-human",
  sylvan: "race-sylvan",
  gryll: "race-gryll",
  lumina: "race-lumina",
  umbra: "race-umbra",
} as const;

const raceIcons = {
  human: "fas fa-user",
  sylvan: "fas fa-leaf",
  gryll: "fas fa-mountain",
  lumina: "fas fa-sun",
  umbra: "fas fa-eye-slash",
} as const;

const raceAbilities = {
  human: "Balanced, Adaptable",
  sylvan: "Nimble, Keen Senses",
  gryll: "Sturdy, Powerful Build",
  lumina: "Precise Throwing, Efficient",
  umbra: "Evasive, Distracting",
} as const;

export default function PlayerCard({ player, compact = false }: PlayerCardProps) {
  const raceColorClass = raceColors[player.race as keyof typeof raceColors] || "race-human";
  const raceIcon = raceIcons[player.race as keyof typeof raceIcons] || "fas fa-user";
  const abilities = raceAbilities[player.race as keyof typeof raceAbilities] || "Unknown";
  const playerRole = getPlayerRole(player);
  const roleColorClass = roleColors[playerRole as keyof typeof roleColors] || "text-gray-400";

  const renderStars = (potential: string) => {
    const rating = parseFloat(potential);
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="text-gold-400">
            {i < fullStars ? "★" : i === fullStars && hasHalfStar ? "☆" : "☆"}
          </span>
        ))}
      </div>
    );
  };

  const topAttributes = [
    { name: "Speed", value: player.speed },
    { name: "Power", value: player.power },
    { name: "Throwing", value: player.throwing },
    { name: "Catching", value: player.catching },
    { name: "Kicking", value: player.kicking },
    { name: "Stamina", value: player.stamina },
    { name: "Leadership", value: player.leadership },
    { name: "Agility", value: player.agility },
  ]
    .sort((a, b) => b.value - a.value)
    .slice(0, compact ? 2 : 4);

  const avgPotential = [
    parseFloat(player.speedPotential || "0"),
    parseFloat(player.powerPotential || "0"),
    parseFloat(player.throwingPotential || "0"),
    parseFloat(player.catchingPotential || "0"),
    parseFloat(player.kickingPotential || "0"),
    parseFloat(player.staminaPotential || "0"),
    parseFloat(player.leadershipPotential || "0"),
    parseFloat(player.agilityPotential || "0"),
  ].reduce((a, b) => a + b, 0) / 8;

  return (
    <Card className={`bg-gray-700 rounded-lg border-l-4 border-${raceColorClass} hover:bg-gray-650 transition-colors`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`w-${compact ? '10' : '12'} h-${compact ? '10' : '12'} bg-${raceColorClass} bg-opacity-20 rounded-full border-2 border-${raceColorClass} flex items-center justify-center`}>
              <i className={`${raceIcon} text-${raceColorClass} text-${compact ? 'sm' : 'lg'}`}></i>
            </div>
            <div>
              <h4 className="font-semibold text-white">{player.firstName} {player.lastName}</h4>
              <p className={`text-xs text-${raceColorClass} font-medium`}>
                {player.race.charAt(0).toUpperCase() + player.race.slice(1)} • Age {player.age}
              </p>
              <p className={`text-xs ${roleColorClass} font-semibold`}>
                {playerRole}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs">{renderStars(avgPotential.toFixed(1))}</div>
            <div className="text-xs text-gray-400">Potential</div>
          </div>
        </div>
        
        {/* Attributes */}
        <div className={`grid grid-cols-2 gap-2 text-xs ${compact ? 'mb-2' : 'mb-3'}`}>
          {topAttributes.map((attr) => (
            <div key={attr.name} className="flex justify-between">
              <span className="text-gray-400">{attr.name}</span>
              <span className={`font-semibold ${attr.value >= 30 ? 'text-green-400' : ''}`}>
                {attr.value}
              </span>
            </div>
          ))}
        </div>
        
        {!compact && (
          <>
            {/* Racial Abilities */}
            <div className="mt-3 pt-3 border-t border-gray-600">
              <div className="flex items-center space-x-2">
                <i className={`${raceIcon} text-${raceColorClass} text-xs`}></i>
                <span className="text-xs text-gray-300">{abilities}</span>
              </div>
            </div>
            
            {/* Salary */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-400">Salary</span>
              <span className="text-sm font-semibold text-gold-400">
                {player.salary?.toLocaleString()}/season
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
