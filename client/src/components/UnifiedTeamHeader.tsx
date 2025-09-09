import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users } from "lucide-react";
import type { Team } from '@shared/types/models';


interface UnifiedTeamHeaderProps {
  title?: string;
  titleIcon?: string;
  team: any;
  players?: any[];
  showCreditsGems?: boolean;
  showLowStaminaWarning?: boolean;
  lowStaminaCount?: number;
}

export default function UnifiedTeamHeader({ title, titleIcon, team, players, showCreditsGems = false, showLowStaminaWarning = false, lowStaminaCount = 0 }: UnifiedTeamHeaderProps) {
  // Fetch current season data for consistent display
  const { data: seasonData } = useQuery({
    queryKey: ['/api/seasons/current-cycle'],
  });

  // Use consistent player filtering and calculations
  const allPlayers = players || [];
  const activePlayers = allPlayers.filter((p: any) => !p.isOnMarket && !p.isRetired);
  const injuredPlayers = allPlayers.filter((p: any) => p.injuryStatus !== 'HEALTHY');
  
  // Unified low stamina threshold (use 50 as standard)
  const lowStaminaPlayers = allPlayers.filter((p: any) => (p.dailyStaminaLevel || 100) < 50);
  
  // Use team.teamPower if available, otherwise calculate it consistently
  const teamPower = team?.teamPower || (
    activePlayers.length > 0 ? 
      Math.round(
        activePlayers
          .map((p: any) => (p.speed + p.power + p.throwing + p.catching + p.kicking + p.agility) / 6)
          .sort((a: number, b: number) => b - a)
          .slice(0, 9)
          .reduce((sum: number, power: number) => sum + power, 0) / Math.min(9, activePlayers.length)
      ) : 0
  );

  // Get season information
  const seasonInfo = seasonData ? `Season ${(seasonData as any).seasonNumber || 0} • Day ${(seasonData as any).currentDay || 9} of 17` : 'Season 0 • Day 9 of 17';
  
  // Get proper division name with subdivision
  const getDivisionNameWithSubdivision = (division: number, subdivision?: string) => {
    const divisionNames: Record<number, string> = {
      1: "Diamond", 2: "Platinum", 3: "Gold", 4: "Silver", 
      5: "Bronze", 6: "Copper", 7: "Iron", 8: "Stone"
    };
    
    const baseName = divisionNames[division] || `Division ${division}`;
    
    if (!subdivision || subdivision === "main") {
      return baseName;
    }
    
    const subdivisionNames: Record<string, string> = {
      "alpha": "Alpha", "beta": "Beta", "gamma": "Gamma", "delta": "Delta",
      "epsilon": "Epsilon", "zeta": "Zeta", "eta": "Eta", "theta": "Theta"
    };
    
    const subdivisionName = subdivisionNames[subdivision] || subdivision.charAt(0).toUpperCase() + subdivision.slice(1);
    return `${baseName} - ${subdivisionName}`;
  };
  
  const divisionDisplay = getDivisionNameWithSubdivision(team?.division || 8, team?.subdivision);

  return (
    <Card className="bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 border-4 border-blue-500 mb-6 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <Trophy className="w-8 h-8 mr-3 text-yellow-400" />
              <div>
                <h1 className="text-3xl font-black text-white mb-1">
                  {team?.name || 'Team Name'}
                </h1>
                <div className="flex items-center gap-4">
                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1">
                    Division {team?.division || 8} - {divisionDisplay}
                  </Badge>
                  <span className="text-blue-200 text-sm font-semibold">{seasonInfo}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-blue-400 text-sm font-bold">TEAM POWER</div>
            <div className="text-white text-3xl font-black">{teamPower}</div>
            <div className="text-blue-200 text-sm">
              {team?.wins || 0}W - {team?.draws || 0}D - {team?.losses || 0}L
            </div>
          </div>
        </div>
        
        {/* Unified Quick Status Row */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="text-center">
            <div className="text-xl font-bold text-white">{allPlayers.length}</div>
            <div className="text-xs text-blue-200">Players</div>
          </div>
          <div className="text-center">
            <div className={`text-xl font-bold ${injuredPlayers.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {injuredPlayers.length}
            </div>
            <div className="text-xs text-blue-200">Injured</div>
          </div>
          <div className="text-center">
            <div className={`text-xl font-bold ${lowStaminaPlayers.length > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
              {lowStaminaPlayers.length}
            </div>
            <div className="text-xs text-blue-200">Low Energy</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-400">
              {team?.finances?.credits ? Number(team?.finances.credits).toLocaleString() : '0'}
            </div>
            <div className="text-xs text-blue-200">Credits</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}