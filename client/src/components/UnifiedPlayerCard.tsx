import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Crown, Heart, AlertTriangle } from 'lucide-react';
import { getPlayerRole, getRaceDisplayName, getPlayerDisplayName } from '@shared/playerUtils';

interface PlayerCardProps {
  player: any;
  showActions?: boolean;
  onAction?: (action: string, player: any) => void;
  variant?: 'dashboard' | 'roster' | 'recruiting';
  scoutQuality?: number;
  onClick?: () => void;
}

// Role-specific stat mappings according to specification
const ROLE_STATS = {
  'Passer': [
    { key: 'throwing', abbr: 'THR' },
    { key: 'agility', abbr: 'AGI' },
    { key: 'speed', abbr: 'SPD' },
    { key: 'catching', abbr: 'CAT' },
    { key: 'stamina', abbr: 'STA' },
    { key: 'leadership', abbr: 'LDR' }
  ],
  'Runner': [
    { key: 'speed', abbr: 'SPD' },
    { key: 'agility', abbr: 'AGI' },
    { key: 'power', abbr: 'PWR' },
    { key: 'catching', abbr: 'CAT' },
    { key: 'stamina', abbr: 'STA' },
    { key: 'kicking', abbr: 'KCK' }
  ],
  'Blocker': [
    { key: 'power', abbr: 'PWR' },
    { key: 'agility', abbr: 'AGI' },
    { key: 'speed', abbr: 'SPD' },
    { key: 'stamina', abbr: 'STA' },
    { key: 'leadership', abbr: 'LDR' },
    { key: 'catching', abbr: 'CAT' }
  ]
};

// Get race emoji for visual appeal
function getRaceEmoji(race: string): string {
  const raceEmojis = {
    'human': '👤',
    'sylvan': '🌿',
    'gryll': '⚒️',
    'lumina': '✨',
    'umbra': '🌑'
  };
  return raceEmojis[race?.toLowerCase() as keyof typeof raceEmojis] || '👤';
}

// High-contrast role tag styles according to specification
function getRoleTagStyle(role: string): string {
  switch (role?.toLowerCase()) {
    case 'blocker':
      return 'bg-red-600 text-white border-red-600';
    case 'runner':
      return 'bg-green-600 text-white border-green-600';
    case 'passer':
      return 'bg-yellow-500 text-black border-yellow-500';
    default:
      return 'bg-gray-600 text-white border-gray-600';
  }
}

// Power rating color coding according to specification
function getPowerColor(power: number): string {
  if (power >= 35) return 'text-blue-400';
  if (power >= 26) return 'text-green-400';
  if (power >= 16) return 'text-white';
  return 'text-red-400';
}

// Individual stat color coding for role-specific stats
function getStatColor(statValue: number): string {
  if (statValue >= 32) return 'text-green-400';
  if (statValue >= 19) return 'text-white';
  return 'text-red-400';
}

// Calculate overall power as average of 6 core athletic stats
function calculateOverallPower(player: any): number {
  const coreStats = [
    player.speed || 20,
    player.power || 20,
    player.agility || 20,
    player.throwing || 20,
    player.catching || 20,
    player.kicking || 20
  ];
  return Math.round(coreStats.reduce((sum, stat) => sum + stat, 0) / coreStats.length);
}

// Render star rating for potential
function renderStarRating(potential: number): JSX.Element {
  const stars = [];
  const fullStars = Math.floor(potential);
  const hasHalfStar = potential % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<span key={i} className="text-yellow-400">★</span>);
    } else if (i === fullStars && hasHalfStar) {
      stars.push(<span key={i} className="text-yellow-400">☆</span>);
    } else {
      stars.push(<span key={i} className="text-gray-600">☆</span>);
    }
  }

  return <div className="flex items-center text-sm">{stars}</div>;
}

export default function UnifiedPlayerCard({ 
  player, 
  showActions = false, 
  onAction, 
  variant = 'roster',
  onClick
}: PlayerCardProps) {
  // Use full name for display - prioritize the complete name field
  const displayName = (() => {
    // Use the full name field if available and valid
    if (player.name && player.name.trim() && 
        !player.name.includes("Player") && !player.name.includes("AI") && 
        player.name !== "Unknown") {
      return player.name;
    }
    
    // Construct full name from firstName + lastName
    if (player.firstName && player.lastName && 
        player.firstName.trim() && player.lastName.trim() &&
        player.firstName !== "Player" && player.firstName !== "AI" && 
        player.lastName !== "Player" && player.lastName !== "AI") {
      return `${player.firstName} ${player.lastName}`;
    }
    
    // Fall back to lastName only
    if (player.lastName && player.lastName.trim() && 
        player.lastName !== "Player" && player.lastName !== "AI") {
      return player.lastName;
    }
    
    // Fall back to firstName only
    if (player.firstName && player.firstName.trim() && 
        player.firstName !== "Player" && player.firstName !== "AI") {
      return player.firstName;
    }
    
    // Final fallback
    return getPlayerDisplayName(player);
  })();
  const role = getPlayerRole(player);
  const overallPower = calculateOverallPower(player);
  const potential = parseFloat(player.overallPotentialStars || '0');
  
  // Get role-specific stats
  const roleStats = ROLE_STATS[role as keyof typeof ROLE_STATS] || ROLE_STATS['Passer'];
  
  // Status checks
  const hasInjury = player.injuryStatus && player.injuryStatus !== 'Healthy';
  const isContractExpiring = player.contractSeasons && player.contractSeasons <= 1;

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else if (onAction) {
      onAction('view', player);
    }
  };

  return (
    <Card 
      className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-200 cursor-pointer hover:shadow-lg"
      onClick={handleCardClick}
    >
      <CardContent className={variant === 'dashboard' ? "p-3" : "p-4"}>
        {variant === 'dashboard' ? (
          /* Compact Dashboard Layout */
          <>
            {/* Header Row: Name and Power */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-1">
                <h3 className="font-semibold text-white text-base">{displayName}</h3>
                {player.isCaptain && <Crown className="w-4 h-4 text-yellow-500" />}
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${getPowerColor(overallPower)}`}>
                  {overallPower}
                </div>
                <div className="text-xs text-gray-400">Power</div>
              </div>
            </div>

            {/* Role and Race Row */}
            <div className="flex items-center justify-between mb-2">
              <Badge className={`text-xs font-medium px-2 py-1 ${getRoleTagStyle(role)}`}>
                {role.toUpperCase()}
              </Badge>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{getRaceEmoji(player.race)}</span>
                <span>{getRaceDisplayName(player.race)}</span>
              </div>
            </div>

            {/* Age and Potential Row */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-400">Age {player.age}</div>
              <div className="flex items-center gap-2">
                {renderStarRating(potential)}
                <span className="text-xs text-gray-400">Potential</span>
              </div>
            </div>
          </>
        ) : (
          /* Full Roster Layout */
          <>
            {/* Header Section */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                {/* Player Name */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-white text-sm whitespace-nowrap">{displayName}</h3>
                  {player.isCaptain && <Crown className="w-4 h-4 text-yellow-500" />}
                </div>
                
                {/* Role Tag and Race */}
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={`text-xs font-medium px-3 py-1 ${getRoleTagStyle(role)}`}>
                    {role.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <span>{getRaceEmoji(player.race)}</span>
                    {getRaceDisplayName(player.race)}
                  </span>
                </div>

                {/* Age and Potential on same line */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <span>{getRaceEmoji(player.race)}</span>
                    <span>Age {player.age}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStarRating(potential)}
                    <span className="text-xs text-gray-400">Potential</span>
                  </div>
                </div>
              </div>

              {/* Power Rating */}
              <div className="text-right">
                <div className={`text-2xl font-bold ${getPowerColor(overallPower)}`}>
                  {overallPower}
                </div>
                <div className="text-xs text-gray-400">Power</div>
              </div>
            </div>
          </>
        )}

        {/* Role-Dependent Key Stats Section */}
        {variant === 'dashboard' ? (
          // Expanded 6-stat layout for Dashboard
          <div className="grid grid-cols-6 gap-1 mb-3">
            {roleStats.slice(0, 6).map((stat, index) => {
              const statValue = player[stat.key] || 20;
              return (
                <div key={index} className="text-center">
                  <div className={`text-sm font-semibold ${getStatColor(statValue)}`}>
                    {statValue}
                  </div>
                  <div className="text-xs text-gray-500">{stat.abbr}</div>
                </div>
              );
            })}
          </div>
        ) : (
          // Full 6-stat layout for Roster and other variants
          <div className="grid grid-cols-6 gap-1 mb-3">
            {roleStats.map((stat, index) => {
              const statValue = player[stat.key] || 20;
              return (
                <div key={index} className="text-center">
                  <div className={`text-sm font-semibold ${getStatColor(statValue)}`}>
                    {statValue}
                  </div>
                  <div className="text-xs text-gray-500">{stat.abbr}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Contract & Status Section */}
        {variant === 'dashboard' ? (
          // Compact status-only layout for Dashboard
          <div className="flex items-center justify-center gap-3">
            {hasInjury && (
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-400">Injured</span>
              </div>
            )}
            
            {isContractExpiring && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-yellow-400">Expiring</span>
              </div>
            )}
          </div>
        ) : (
          // Full contract & status layout for Roster and other variants
          <div className="space-y-2">
            {/* Contract Information */}
            {player.salary && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Salary:</span>
                <span className="text-white">₡{player.salary.toLocaleString()} / season</span>
              </div>
            )}
            
            {player.contractSeasons && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Contract:</span>
                <span className="text-white">{player.contractSeasons} seasons remaining</span>
              </div>
            )}

            {/* Status Icons */}
            <div className="flex items-center gap-3">
              {hasInjury && (
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-red-400">{player.injuryStatus}</span>
                </div>
              )}
              
              {isContractExpiring && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-yellow-400">Contract Expiring</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && onAction && (
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onAction('view', player);
              }}
              className="flex-1 text-xs"
            >
              View Details
            </Button>
            {player.marketplacePrice && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('buy', player);
                }}
                className="flex-1 text-xs"
              >
                Buy - ₡{player.marketplacePrice.toLocaleString()}
              </Button>
            )}
          </div>
        )}

        {/* Taxi Squad Indicator */}
        {player.isOnTaxi && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
              Taxi Squad
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}