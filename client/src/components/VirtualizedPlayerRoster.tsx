/**
 * Virtualized Player Roster with Performance Optimization
 * Integrates with existing UnifiedPlayerCard component
 */
import React, { useMemo } from 'react';
import { VirtualizedPlayerList } from './VirtualizedList';
import UnifiedPlayerCard from './UnifiedPlayerCard';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { calculatePlayerPower } from '@/utils/playerUtils';

interface VirtualizedPlayerRosterProps {
  players: any[];
  isLoading: boolean;
  onPlayerClick?: (player: any) => void;
  selectedRole?: string;
  onRoleChange?: (role: string) => void;
  variant?: 'full' | 'compact';
  className?: string;
}

export const VirtualizedPlayerRoster: React.FC<VirtualizedPlayerRosterProps> = ({
  players,
  isLoading,
  onPlayerClick,
  selectedRole = 'all',
  onRoleChange,
  variant = 'full',
  className = '',
}) => {
  const { filteredPlayers, roleStats } = useMemo(() => {
    const stats = {
      all: players.length,
      passer: 0,
      runner: 0,
      blocker: 0,
      taxiSquad: 0,
    };

    players.forEach((player) => {
      const role = player.role?.toLowerCase();
      if (role === 'passer') stats.passer++;
      else if (role === 'runner') stats.runner++;
      else if (role === 'blocker') stats.blocker++;
      
      // Check if player is in taxi squad (position 13-15)
      if (player.rosterPosition >= 13) {
        stats.taxiSquad++;
      }
    });

    let filtered = players;
    if (selectedRole !== 'all') {
      if (selectedRole === 'taxi-squad') {
        filtered = players.filter(p => p.rosterPosition >= 13);
      } else {
        filtered = players.filter(p => p.role?.toLowerCase() === selectedRole);
      }
    }

    // Sort players by power rating for better display
    filtered.sort((a, b) => {
      const aPower = calculatePlayerPower(a);
      const bPower = calculatePlayerPower(b);
      return bPower - aPower;
    });

    return {
      filteredPlayers: filtered,
      roleStats: stats,
    };
  }, [players, selectedRole]);

  const renderPlayer = (player: any, index: number) => (
    <div className="p-2">
      <UnifiedPlayerCard
        key={player.id}
        player={player}
        variant={variant === 'compact' ? 'marketplace' : 'roster'}
        onClick={() => onPlayerClick?.(player)}
      />
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-2/3"></div>
              </div>
            </div>
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, j) => (
                <div key={j} className="h-3 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Role Filter Tabs */}
      {onRoleChange && (
        <Tabs value={selectedRole} onValueChange={onRoleChange} className="mb-6">
          <TabsList className="grid w-full grid-cols-5 bg-gray-800">
            <TabsTrigger value="all">
              All Players ({roleStats.all})
            </TabsTrigger>
            <TabsTrigger value="passer">
              Passers ({roleStats.passer})
            </TabsTrigger>
            <TabsTrigger value="runner">
              Runners ({roleStats.runner})
            </TabsTrigger>
            <TabsTrigger value="blocker">
              Blockers ({roleStats.blocker})
            </TabsTrigger>
            <TabsTrigger value="taxi-squad">
              Taxi Squad ({roleStats.taxiSquad})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Virtualized Player List */}
      <div className="h-[600px] w-full">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-16">
            <i className="fas fa-users text-6xl text-gray-600 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              No players found
            </h3>
            <p className="text-gray-500">
              {selectedRole === "all" 
                ? "Your team has no players yet." 
                : `No ${selectedRole} players in your team.`
              }
            </p>
          </div>
        ) : (
          <VirtualizedPlayerList
            players={filteredPlayers}
            onPlayerClick={onPlayerClick}
            className="border rounded-lg"
          />
        )}
      </div>

      {/* Player Summary */}
      {filteredPlayers.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="outline" className="text-sm">
            {filteredPlayers.length} Players
          </Badge>
          {selectedRole === 'all' && (
            <>
              <Badge variant="outline" className="text-sm">
                {roleStats.passer} Passers
              </Badge>
              <Badge variant="outline" className="text-sm">
                {roleStats.runner} Runners
              </Badge>
              <Badge variant="outline" className="text-sm">
                {roleStats.blocker} Blockers
              </Badge>
              {roleStats.taxiSquad > 0 && (
                <Badge variant="outline" className="text-sm">
                  {roleStats.taxiSquad} in Taxi Squad
                </Badge>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VirtualizedPlayerRoster;