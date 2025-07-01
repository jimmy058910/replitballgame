import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Shield, Target, Star, StarHalf } from "lucide-react";

interface PlayerCardProps {
  player: any;
  showActions?: boolean;
  onAction?: (action: string, player: any) => void;
  variant?: 'dashboard' | 'roster' | 'recruiting';
  scoutQuality?: number; // 1-100, affects accuracy of scouting data
}

// Role-based color system
const getRoleColor = (role: string) => {
  switch (role?.toLowerCase()) {
    case 'blocker':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
    case 'runner':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
    case 'passer':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
  }
};

const getRoleIcon = (role: string) => {
  switch (role?.toLowerCase()) {
    case 'blocker':
      return <Shield className="w-3 h-3" />;
    case 'runner':
      return <Zap className="w-3 h-3" />;
    case 'passer':
      return <Target className="w-3 h-3" />;
    default:
      return null;
  }
};

const getStatColor = (value: number) => {
  if (value >= 35) return 'text-green-400';      // Elite
  if (value >= 28) return 'text-blue-400';       // Excellent  
  if (value >= 20) return 'text-yellow-400';     // Good
  if (value >= 15) return 'text-orange-400';     // Below Average
  return 'text-red-400';                         // Poor
};

// Power color coding for circular display
const getPowerColor = (power: number) => {
  if (power >= 200) return 'bg-purple-600';      // Elite (200+)
  if (power >= 180) return 'bg-green-600';       // Excellent (180-199)
  if (power >= 160) return 'bg-blue-600';        // Good (160-179)
  if (power >= 140) return 'bg-yellow-600';      // Average (140-159)
  if (power >= 120) return 'bg-orange-600';      // Below Average (120-139)
  return 'bg-red-600';                           // Poor (Under 120)
};

const getRaceEmoji = (race: string) => {
  switch (race?.toLowerCase()) {
    case 'human':
      return '👤';
    case 'sylvan':
      return '🧝‍♂️';
    case 'gryll':
      return '🛡️';
    case 'lumina':
      return '✨';
    case 'umbra':
      return '🌙';
    default:
      return '⚡';
  }
};

// Calculate scout accuracy and stat ranges
const getScoutedStat = (actualStat: number, scoutQuality: number = 50, statName: string) => {
  // Higher scout quality = more accurate ranges
  const accuracy = Math.max(10, scoutQuality); // Minimum 10% accuracy
  const errorMargin = Math.floor((100 - accuracy) / 10); // Error margin based on scout quality
  
  const minStat = Math.max(1, actualStat - errorMargin);
  const maxStat = Math.min(40, actualStat + errorMargin);
  
  return { min: minStat, max: maxStat, actual: actualStat };
};

// Calculate potential stars based on total stats and scout quality
const getPotentialStars = (player: any, scoutQuality: number = 50) => {
  const totalStats = (player.speed || 20) + (player.power || 20) + (player.throwing || 20) + 
                    (player.catching || 20) + (player.kicking || 20) + (player.agility || 20) + 
                    (player.stamina || 20) + (player.leadership || 20);
  
  // Base potential calculation
  let basePotential = 0;
  if (totalStats >= 240) basePotential = 5;
  else if (totalStats >= 200) basePotential = 4;
  else if (totalStats >= 160) basePotential = 3;
  else if (totalStats >= 120) basePotential = 2;
  else basePotential = 1;
  
  // Scout accuracy affects potential accuracy
  const accuracy = scoutQuality / 100;
  const errorChance = Math.random();
  
  if (errorChance > accuracy) {
    // Less accurate scouts might be off by 0.5-1 star
    const error = Math.random() > 0.5 ? 0.5 : 1;
    basePotential += Math.random() > 0.5 ? error : -error;
  }
  
  return Math.max(0.5, Math.min(5, basePotential));
};

const renderStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const stars = [];
  
  for (let i = 0; i < fullStars; i++) {
    stars.push(<Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />);
  }
  
  if (hasHalfStar) {
    stars.push(<StarHalf key="half" className="w-3 h-3 fill-yellow-400 text-yellow-400" />);
  }
  
  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    stars.push(<Star key={`empty-${i}`} className="w-3 h-3 text-gray-400" />);
  }
  
  return stars;
};

export default function UnifiedPlayerCard({ 
  player, 
  showActions = false, 
  onAction, 
  variant = 'roster',
  scoutQuality = 50 
}: PlayerCardProps) {
  const displayName = player.firstName && player.lastName 
    ? `${player.firstName} ${player.lastName}` 
    : player.name || 'Unknown Player';

  const playerPower = (player.speed || 20) + (player.power || 20) + (player.throwing || 20) + 
                     (player.catching || 20) + (player.kicking || 20);

  // Scouting data for recruiting variant
  const scoutedStats = variant === 'recruiting' ? {
    speed: getScoutedStat(player.speed || 20, scoutQuality, 'speed'),
    power: getScoutedStat(player.power || 20, scoutQuality, 'power'),
    throwing: getScoutedStat(player.throwing || 20, scoutQuality, 'throwing'),
    catching: getScoutedStat(player.catching || 20, scoutQuality, 'catching'),
    kicking: getScoutedStat(player.kicking || 20, scoutQuality, 'kicking'),
  } : null;

  const scoutedPowerRange = scoutedStats ? {
    min: Object.values(scoutedStats).reduce((sum, stat) => sum + stat.min, 0),
    max: Object.values(scoutedStats).reduce((sum, stat) => sum + stat.max, 0)
  } : null;

  const potentialRating = variant === 'recruiting' ? getPotentialStars(player, scoutQuality) : null;

  // Different layouts based on variant
  if (variant === 'dashboard') {
    const allStats = [
      { name: 'SPD', value: player.speed || 20, color: 'text-blue-400' },
      { name: 'PWR', value: player.power || 20, color: 'text-red-400' },
      { name: 'AGI', value: player.agility || 20, color: 'text-green-400' },
      { name: 'THR', value: player.throwing || 20, color: 'text-purple-400' },
      { name: 'CAT', value: player.catching || 20, color: 'text-yellow-400' }
    ];
    const topStats = allStats.sort((a, b) => b.value - a.value).slice(0, 3);

    return (
      <Card className="bg-gray-700 border-gray-600 hover:border-gray-500 transition-colors">
        <CardContent className="p-5">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 text-center">
              <div className="text-xs text-red-400 font-medium mb-1">Power</div>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl ${getPowerColor(playerPower)}`}>
                {playerPower}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-semibold text-white mb-1" title={displayName}>
                {displayName}
              </div>
              <div className="text-sm text-gray-400 capitalize mb-2">
                {getRaceEmoji(player.race)} {player.race} {player.role}
              </div>
              {/* Overall Potential Stars */}
              {player.overallPotentialStars && (
                <div className="flex items-center gap-1 mb-2">
                  {renderStars(parseFloat(player.overallPotentialStars))}
                  <span className="text-xs text-gray-400 ml-1">
                    ({parseFloat(player.overallPotentialStars).toFixed(1)})
                  </span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                {topStats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className={`text-xs ${stat.color} font-medium`}>{stat.name}</div>
                    <div className="text-sm text-white font-semibold">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'recruiting') {
    return (
      <Card className="hover:shadow-md transition-shadow bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{getRaceEmoji(player.race)}</span>
                <h3 className="font-semibold text-lg text-white">{displayName}</h3>
                <Badge variant="secondary" className="text-xs">
                  Age {player.age}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getRoleColor(player.role)} flex items-center gap-1`}
                >
                  {getRoleIcon(player.role)}
                  {player.role?.charAt(0).toUpperCase() + player.role?.slice(1).toLowerCase() || 'Utility'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {player.race?.charAt(0).toUpperCase() + player.race?.slice(1).toLowerCase()}
                </Badge>
              </div>

              {/* Potential Rating */}
              {potentialRating && (
                <div className="mb-3">
                  <div className="text-xs text-gray-400 mb-1">Potential</div>
                  <div className="flex items-center gap-1">
                    {renderStars(potentialRating)}
                    <span className="text-xs text-gray-400 ml-1">
                      ({potentialRating.toFixed(1)}/5.0)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Power Range</div>
              <div className="text-lg font-bold text-blue-400">
                {scoutedPowerRange ? `${scoutedPowerRange.min}-${scoutedPowerRange.max}` : playerPower}
              </div>
            </div>
          </div>

          {/* Scouted Stats Grid */}
          {scoutedStats && (
            <div className="grid grid-cols-5 gap-2 text-xs mb-3">
              <div className="text-center">
                <div className="text-blue-400 font-semibold">
                  {scoutedStats.speed.min}-{scoutedStats.speed.max}
                </div>
                <div className="text-gray-500">SPD</div>
              </div>
              <div className="text-center">
                <div className="text-red-400 font-semibold">
                  {scoutedStats.power.min}-{scoutedStats.power.max}
                </div>
                <div className="text-gray-500">PWR</div>
              </div>
              <div className="text-center">
                <div className="text-purple-400 font-semibold">
                  {scoutedStats.throwing.min}-{scoutedStats.throwing.max}
                </div>
                <div className="text-gray-500">THR</div>
              </div>
              <div className="text-center">
                <div className="text-yellow-400 font-semibold">
                  {scoutedStats.catching.min}-{scoutedStats.catching.max}
                </div>
                <div className="text-gray-500">CAT</div>
              </div>
              <div className="text-center">
                <div className="text-orange-400 font-semibold">
                  {scoutedStats.kicking.min}-{scoutedStats.kicking.max}
                </div>
                <div className="text-gray-500">KCK</div>
              </div>
            </div>
          )}

          {/* Scout Quality Indicator */}
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-1">Scout Confidence</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    scoutQuality >= 80 ? 'bg-green-500' :
                    scoutQuality >= 60 ? 'bg-yellow-500' :
                    scoutQuality >= 40 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${scoutQuality}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{scoutQuality}%</span>
            </div>
          </div>

          {/* Action Buttons */}
          {showActions && onAction && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction('recruit', player)}
                className="flex-1 text-xs"
              >
                Recruit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAction('scout_more', player)}
                className="flex-1 text-xs"
              >
                Scout More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default roster variant
  return (
    <Card className="hover:shadow-md transition-shadow bg-gray-800 border-gray-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-lg">{getRaceEmoji(player.race)}</span>
            <div>
              <h3 className="font-semibold text-white">{displayName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getRoleColor(player.role)} flex items-center gap-1`}
                >
                  {getRoleIcon(player.role)}
                  {player.role?.charAt(0).toUpperCase() + player.role?.slice(1).toLowerCase() || 'Utility'}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {player.race?.charAt(0).toUpperCase() + player.race?.slice(1).toLowerCase()} • Age {player.age}
                </Badge>
                <Badge variant="outline" className="text-xs border-cyan-700 text-cyan-400 dark:border-cyan-600 dark:text-cyan-300">
                  Camaraderie: {player.camaraderie ?? 50}
                </Badge>
                <Badge variant="outline" className="text-xs border-lime-700 text-lime-400 dark:border-lime-600 dark:text-lime-300">
                  Loyalty: {player.yearsOnTeam ?? 0} yr{player.yearsOnTeam === 1 ? '' : 's'}
                </Badge>
              </div>
            </div>
            {player.isCaptain && <Crown className="w-4 h-4 text-yellow-500" />}
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-blue-400">
              {playerPower}
            </div>
            <div className="text-xs text-gray-400">Power</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-2 text-xs mb-3">
          <div className="text-center">
            <div className={`font-semibold ${getStatColor(player.speed || 20)}`}>{player.speed || 20}</div>
            <div className="text-gray-500">SPD</div>
          </div>
          <div className="text-center">
            <div className={`font-semibold ${getStatColor(player.power || 20)}`}>{player.power || 20}</div>
            <div className="text-gray-500">PWR</div>
          </div>
          <div className="text-center">
            <div className={`font-semibold ${getStatColor(player.throwing || 20)}`}>{player.throwing || 20}</div>
            <div className="text-gray-500">THR</div>
          </div>
          <div className="text-center">
            <div className={`font-semibold ${getStatColor(player.catching || 20)}`}>{player.catching || 20}</div>
            <div className="text-gray-500">CAT</div>
          </div>
          <div className="text-center">
            <div className={`font-semibold ${getStatColor(player.kicking || 20)}`}>{player.kicking || 20}</div>
            <div className="text-gray-500">KCK</div>
          </div>
        </div>

        {/* Salary Information */}
        {player.salary && (
          <div className="text-xs text-gray-400 mb-2">
            Salary: {player.salary.toLocaleString()}/season
          </div>
        )}

        {/* Action Buttons */}
        {showActions && onAction && (
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction('view', player)}
              className="flex-1 text-xs"
            >
              View Details
            </Button>
            {player.marketplacePrice && (
              <Button
                size="sm"
                onClick={() => onAction('buy', player)}
                className="flex-1 text-xs"
              >
                Buy - {player.marketplacePrice.toLocaleString()}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}