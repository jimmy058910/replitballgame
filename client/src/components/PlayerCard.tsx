import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Shield, Target } from "lucide-react";

interface PlayerCardProps {
  player: any;
  showActions?: boolean;
  onAction?: (action: string, player: any) => void;
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

export default function PlayerCard({ player, showActions = false, onAction }: PlayerCardProps) {
  const displayName = player.firstName && player.lastName 
    ? `${player.firstName} ${player.lastName}` 
    : player.name || 'Unknown Player';

  const playerPower = player.speed + player.power + player.throwing + player.catching + player.kicking;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{getRaceEmoji(player.race)}</span>
              <h3 className="font-semibold text-sm">{displayName}</h3>
              {player.isCaptain && <Crown className="w-4 h-4 text-yellow-500" />}
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant="outline" 
                className={`text-xs ${getRoleColor(player.role)} flex items-center gap-1`}
              >
                {getRoleIcon(player.role)}
                {player.role || 'Utility'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {player.race} • Age {player.age}
              </Badge>
            </div>

            {player.isOnTaxi && (
              <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
                Taxi Squad
              </Badge>
            )}
          </div>

          <div className="text-right">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {playerPower}
            </div>
            <div className="text-xs text-gray-500">Power</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-2 text-xs mb-3">
          <div className="text-center">
            <div className="font-semibold">{player.speed}</div>
            <div className="text-gray-500">SPD</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{player.power}</div>
            <div className="text-gray-500">PWR</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{player.throwing}</div>
            <div className="text-gray-500">THR</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{player.catching}</div>
            <div className="text-gray-500">CAT</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{player.kicking}</div>
            <div className="text-gray-500">KCK</div>
          </div>
        </div>

        {/* Player Abilities */}
        {player.abilities && player.abilities.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1">Abilities</div>
            <div className="flex flex-wrap gap-1">
              {player.abilities.slice(0, 3).map((ability: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {ability}
                </Badge>
              ))}
              {player.abilities.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{player.abilities.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Salary Information */}
        {player.salary && (
          <div className="text-xs text-gray-500 mb-2">
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