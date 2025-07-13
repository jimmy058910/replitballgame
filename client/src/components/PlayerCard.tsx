import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Crown, Zap, Shield, Target, Heart, AlertTriangle, Star } from "lucide-react";
import { StatHelpIcon } from "@/components/help";

interface PlayerCardProps {
  player: any;
  showActions?: boolean;
  onAction?: (action: string, player: any) => void;
  compact?: boolean;
}

import { getPlayerRole } from "@shared/playerUtils";

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

// High-contrast role tag styling according to specification
const getHighContrastRoleStyle = (role: string) => {
  switch (role?.toLowerCase()) {
    case 'blocker':
      return 'bg-red-600 text-white border-red-600'; // Red background with white text
    case 'runner':
      return 'bg-green-600 text-white border-green-600'; // Green background with white text
    case 'passer':
      return 'bg-yellow-500 text-black border-yellow-500'; // Yellow background with black text
    default:
      return 'bg-gray-600 text-white border-gray-600';
  }
};

// Helper function to color-code power rating based on value
const getPowerColor = (value: number) => {
  if (value >= 35) return 'text-blue-400'; // Excellent (35-40)
  if (value >= 26) return 'text-green-400'; // Good (26-34)
  if (value >= 16) return 'text-white'; // Average (16-25)
  return 'text-red-400'; // Poor (1-15)
};

// Calculate summary ratings according to specification
const calculatePassingRating = (player: any) => {
  return Math.round((player.throwing + player.leadership) / 2);
};

const calculateMobilityRating = (player: any) => {
  return Math.round((player.speed + player.agility) / 2);
};

const calculatePowerRating = (player: any) => {
  return Math.round((player.power + player.stamina) / 2);
};

// Calculate overall power as average of 6 core athletic stats
const calculateOverallPower = (player: any) => {
  const coreStats = [player.speed, player.power, player.agility, player.throwing, player.catching, player.kicking];
  const sum = coreStats.reduce((acc, stat) => acc + (stat || 0), 0);
  return Math.round(sum / 6);
};

// Render star rating for potential
const renderStarRating = (stars: number) => {
  const fullStars = Math.floor(stars);
  const hasHalfStar = stars % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  return (
    <div className="flex items-center gap-0.5">
      {/* Full stars */}
      {Array.from({ length: fullStars }, (_, i) => (
        <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
      ))}
      {/* Half star */}
      {hasHalfStar && (
        <div className="relative">
          <Star className="w-3 h-3 text-gray-400" />
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 absolute top-0 left-0 clip-path-left-half" />
        </div>
      )}
      {/* Empty stars */}
      {Array.from({ length: emptyStars }, (_, i) => (
        <Star key={i + fullStars} className="w-3 h-3 text-gray-400" />
      ))}
    </div>
  );
};

export default function PlayerCard({ player, showActions = false, onAction, compact = false }: PlayerCardProps) {
  const displayName = player.firstName && player.lastName 
    ? `${player.firstName} ${player.lastName}` 
    : player.name || 'Unknown Player';

  const role = getPlayerRole(player);
  const overallPower = calculateOverallPower(player);
  const potential = player.overallPotentialStars || 0;
  
  // Calculate summary ratings
  const passingRating = calculatePassingRating(player);
  const mobilityRating = calculateMobilityRating(player);
  const powerRating = calculatePowerRating(player);

  // Check injury status
  const hasInjury = player.injuryStatus && player.injuryStatus !== 'Healthy';
  
  // Check contract status (final year warning)
  const isContractExpiring = player.contractSeasons && player.contractSeasons <= 1;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onAction?.('view', player)}>
      <CardContent className="p-4">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-sm">{displayName}</h3>
              {player.isCaptain && <Crown className="w-4 h-4 text-yellow-500" />}
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              {/* High-contrast role tag */}
              <Badge 
                className={`text-xs font-medium ${getHighContrastRoleStyle(role)} flex items-center gap-1 px-2 py-1`}
              >
                {getRoleIcon(role)}
                {role}
              </Badge>
              <span className="text-xs text-gray-400">
                {player.race?.charAt(0).toUpperCase() + player.race?.slice(1).toLowerCase() || 'Unknown'} • Age {player.age}
              </span>
            </div>

            {player.isOnTaxi && (
              <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
                Taxi Squad
              </Badge>
            )}
          </div>

          {/* Core Rating Section */}
          <div className="text-right">
            <div className={`text-2xl font-bold ${getPowerColor(overallPower)}`}>
              {overallPower}
            </div>
            <div className="text-xs text-gray-500 mb-2">Power</div>
            
            {/* Potential Stars */}
            <div className="flex flex-col items-end">
              {renderStarRating(potential)}
              <div className="text-xs text-gray-500 mt-1">Potential</div>
            </div>
          </div>
        </div>

        {/* Attribute Summary Section */}
        {!compact && (
          <div className="space-y-2 mb-3">
            {/* Passing Rating */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Passing</span>
              <div className="flex items-center gap-2">
                <Progress value={(passingRating / 40) * 100} className="w-16 h-2" />
                <span className={`text-xs font-medium ${getPowerColor(passingRating)}`}>{passingRating}</span>
              </div>
            </div>
            
            {/* Mobility Rating */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Mobility</span>
              <div className="flex items-center gap-2">
                <Progress value={(mobilityRating / 40) * 100} className="w-16 h-2" />
                <span className={`text-xs font-medium ${getPowerColor(mobilityRating)}`}>{mobilityRating}</span>
              </div>
            </div>
            
            {/* Power Rating */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Power</span>
              <div className="flex items-center gap-2">
                <Progress value={(powerRating / 40) * 100} className="w-16 h-2" />
                <span className={`text-xs font-medium ${getPowerColor(powerRating)}`}>{powerRating}</span>
              </div>
            </div>
          </div>
        )}

        {/* Status Icon Section */}
        <div className="flex items-center gap-3 mb-3">
          {/* Injury Status Icon */}
          {hasInjury && (
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-400">{player.injuryStatus}</span>
            </div>
          )}
          
          {/* Contract Status Icon */}
          {isContractExpiring && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-yellow-400">Contract Exp.</span>
            </div>
          )}
        </div>

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
                Buy - {player.marketplacePrice.toLocaleString()}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}