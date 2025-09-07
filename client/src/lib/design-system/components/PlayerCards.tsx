import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { StarRating } from '@/components/StarRating';

/**
 * Unified Player Card Components
 * Consolidates PlayerCard, UnifiedPlayerCard, and player display variations
 */

// Shared types
export interface BasePlayer {
  id: string;
  firstName: string;
  lastName: string;
  race: string;
  age: number;
  role?: string;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  staminaAttribute: number;
  leadership: number;
  agility: number;
  potentialRating?: number;
  dailyStaminaLevel?: number;
  injuryStatus?: string;
  contractLength?: number;
  contractValue?: number;
  loyalty?: number;
}

// Race emoji helper
const getRaceEmoji = (race: string): string => {
  const raceEmojis: Record<string, string> = {
    'human': '👤',
    'sylvan': '🌿',
    'gryll': '⚒️',
    'lumina': '☀️',
    'umbra': '🌙'
  };
  return raceEmojis[race?.toLowerCase()] || '👤';
};

// Get player role based on stats
const getPlayerRole = (player: BasePlayer): string => {
  const { throwing, catching, speed, power, agility } = player;
  
  // Determine role based on highest stats
  const stats = [
    { name: 'Passer', value: throwing },
    { name: 'Runner', value: speed + agility },
    { name: 'Blocker', value: power }
  ];
  
  const highest = stats.reduce((prev, curr) => 
    curr.value > prev.value ? curr : prev
  );
  
  return highest.name;
};

// Calculate overall power rating
const calculatePowerRating = (player: BasePlayer): number => {
  return Math.round(
    ((player.speed || 0) + 
     (player.power || 0) + 
     (player.throwing || 0) + 
     (player.catching || 0) + 
     (player.agility || 0) + 
     (player.kicking || 0)) / 6
  );
};

// Compact Player Card (for lists)
export const CompactPlayerCard: React.FC<{
  player: BasePlayer;
  onSelect?: () => void;
  selected?: boolean;
  className?: string;
}> = ({ player, onSelect, selected, className }) => {
  const playerRole = getPlayerRole(player);
  const powerRating = calculatePowerRating(player);

  return (
    <div 
      className={cn(
        'bg-gray-800 border rounded-lg p-3 cursor-pointer transition-all',
        selected ? 'border-primary-500 bg-gray-700' : 'border-gray-700 hover:border-gray-600',
        className
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getRaceEmoji(player.race)}</span>
          <div>
            <p className="font-semibold text-white">
              {player.firstName} {player.lastName}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-xs">
                {playerRole}
              </Badge>
              <span className="text-gray-400">Age {player.age}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-red-400">{powerRating}</div>
          <div className="text-xs text-gray-400">Power</div>
        </div>
      </div>
    </div>
  );
};

// Detailed Player Card (full stats display)
export const DetailedPlayerCard: React.FC<{
  player: BasePlayer;
  showActions?: boolean;
  onPromote?: () => void;
  onRelease?: () => void;
  onTrade?: () => void;
  className?: string;
}> = ({ player, showActions, onPromote, onRelease, onTrade, className }) => {
  const playerRole = getPlayerRole(player);
  const powerRating = calculatePowerRating(player);

  const statGroups = [
    { label: 'THR', value: player.throwing, color: 'text-red-400' },
    { label: 'AGI', value: player.agility, color: 'text-blue-400' },
    { label: 'SPD', value: player.speed, color: 'text-green-400' },
    { label: 'CAT', value: player.catching, color: 'text-purple-400' },
    { label: 'PWR', value: player.power, color: 'text-orange-400' },
    { label: 'STA', value: player.staminaAttribute, color: 'text-yellow-400' },
    { label: 'LDR', value: player.leadership, color: 'text-pink-400' },
    { label: 'KCK', value: player.kicking, color: 'text-cyan-400' }
  ];

  return (
    <div className={cn('bg-gray-800 border border-gray-700 rounded-lg p-4', className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{getRaceEmoji(player.race)}</span>
          <div>
            <h3 className="text-lg font-bold text-white">
              {player.firstName} {player.lastName}
            </h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-yellow-600 text-black">
                {playerRole.toUpperCase()}
              </Badge>
              <span className="text-sm text-gray-400">
                {player.race?.charAt(0).toUpperCase() + player.race?.slice(1)} • Age {player.age}
              </span>
            </div>
          </div>
        </div>

        {/* Power Rating */}
        <div className="text-center">
          <div className="text-3xl font-bold text-red-400">{powerRating}</div>
          <div className="text-xs text-gray-400">Power</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {statGroups.map((stat) => (
          <div key={stat.label} className="text-center p-2 bg-gray-700/50 rounded">
            <div className={cn('text-lg font-bold', stat.color)}>{stat.value}</div>
            <div className="text-xs text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Additional Info */}
      <div className="space-y-2 mb-4">
        {player.potentialRating && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Potential</span>
            <StarRating potential={player.potentialRating} showDecimal={true} compact={true} />
          </div>
        )}
        
        {player.dailyStaminaLevel !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Stamina</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${player.dailyStaminaLevel}%` }}
                />
              </div>
              <span className="text-sm text-gray-400">{player.dailyStaminaLevel}%</span>
            </div>
          </div>
        )}

        {player.injuryStatus && player.injuryStatus !== 'HEALTHY' && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Status</span>
            <Badge variant="destructive" className="text-xs">
              {player.injuryStatus}
            </Badge>
          </div>
        )}

        {player.contractValue && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Contract</span>
            <span className="text-sm text-white">
              {player.contractValue.toLocaleString()}₡ • {player.contractLength}y
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex gap-2">
          {onPromote && (
            <Button
              size="sm"
              variant="outline"
              onClick={onPromote}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white border-green-600"
            >
              Promote
            </Button>
          )}
          {onTrade && (
            <Button
              size="sm"
              variant="outline"
              onClick={onTrade}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
            >
              Trade
            </Button>
          )}
          {onRelease && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRelease}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
            >
              Release
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// Mini Player Card (for tactical formations)
export const MiniPlayerCard: React.FC<{
  player: BasePlayer;
  position?: string;
  onClick?: () => void;
  className?: string;
}> = ({ player, position, onClick, className }) => {
  const powerRating = calculatePowerRating(player);

  return (
    <div 
      className={cn(
        'bg-gray-800 border border-gray-600 rounded p-2 cursor-pointer hover:border-primary-500 transition-all',
        className
      )}
      onClick={onClick}
    >
      <div className="text-center">
        <div className="text-lg">{getRaceEmoji(player.race)}</div>
        <div className="text-xs font-semibold text-white truncate">
          {player.lastName}
        </div>
        <div className="text-xs text-gray-400">{position || getPlayerRole(player)}</div>
        <div className="text-sm font-bold text-red-400">{powerRating}</div>
      </div>
    </div>
  );
};

// Player Stats Bar (for inline display)
export const PlayerStatsBar: React.FC<{
  player: BasePlayer;
  showName?: boolean;
  compact?: boolean;
  className?: string;
}> = ({ player, showName = true, compact = false, className }) => {
  const topStats = [
    { label: 'SPD', value: player.speed, color: 'bg-green-500' },
    { label: 'PWR', value: player.power, color: 'bg-orange-500' },
    { label: 'THR', value: player.throwing, color: 'bg-red-500' },
    { label: 'CAT', value: player.catching, color: 'bg-purple-500' }
  ];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {showName && (
        <div className="flex items-center gap-2">
          <span>{getRaceEmoji(player.race)}</span>
          <span className="font-semibold text-white">
            {compact ? player.lastName : `${player.firstName} ${player.lastName}`}
          </span>
        </div>
      )}
      <div className="flex gap-2">
        {topStats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-1">
            <span className="text-xs text-gray-400">{stat.label}</span>
            <div className={cn('text-sm font-bold text-white px-1 rounded', stat.color)}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};