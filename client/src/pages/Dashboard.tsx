import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UnifiedPlayerCard from "@/components/UnifiedPlayerCard";
import { TeamNameInput } from "@/components/TeamNameInput";
import PlayerDetailModal from "@/components/PlayerDetailModal";

import LeagueStandings from "@/components/LeagueStandings";
import NotificationCenter from "@/components/NotificationCenter";
import { apiRequest } from "@/lib/queryClient";
import { Bell, Shield, Calendar, Users as UsersIcon } from "lucide-react"; // Added UsersIcon
import { HelpIcon } from "@/components/help";
import { useContextualHelp } from "@/hooks/useContextualHelp";

// Type interfaces for API responses
interface Team {
  id: string;
  name: string;
  division: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  teamPower: number;
  teamCamaraderie: number;
  credits: number;
}

interface Player {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  race: string;
  age: number;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  stamina: number;
  leadership: number;
  agility: number;
}

interface Finances {
  credits: number;
  premiumCurrency: number;
}

interface SeasonalCycle {
  season: string;
  currentDay: number;
  phase: string;
  description: string;
  details: string;
  daysUntilPlayoffs?: number;
  daysUntilNewSeason?: number;
}
// Division naming utilities
const DIVISION_NAMES = {
  1: "Diamond League",
  2: "Platinum League", 
  3: "Gold League",
  4: "Silver League",
  5: "Bronze League",
  6: "Iron League",
  7: "Stone League",
  8: "Copper League",
} as const;

const DIVISION_8_SUBDIVISIONS = [
  "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta",
  "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi",
  "Rho", "Sigma", "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega"
];

function getDivisionNameWithSubdivision(division: number, teamId?: string): string {
  const baseName = DIVISION_NAMES[division as keyof typeof DIVISION_NAMES] || `Division ${division}`;
  
  if (division === 8 && teamId) {
    // Generate consistent sub-division based on team ID
    const hash = teamId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const subDivisionIndex = Math.abs(hash) % DIVISION_8_SUBDIVISIONS.length;
    const subDivision = DIVISION_8_SUBDIVISIONS[subDivisionIndex];
    return `${baseName} - ${subDivision}`;
  }
  
  return baseName;
}

// Helper function for Camaraderie Description
function getTeamCamaraderieDescription(camaraderie: number | undefined | null): string {
  if (camaraderie === undefined || camaraderie === null) return "Overall team cohesion.";
  if (camaraderie > 75) return "Excellent: Team is in sync!";
  if (camaraderie > 60) return "Good: Strong team bonds.";
  if (camaraderie > 40) return "Average: Room for improvement.";
  if (camaraderie > 25) return "Low: Some friction in the ranks.";
  return "Poor: Team spirit is suffering.";
}

// Server Time Display Component
function ServerTimeDisplay({ serverTime }: { serverTime: any }) {
  const formatServerTime = () => {
    const timeData = serverTime?.data || serverTime;
    if (!timeData?.currentTime) return "Loading...";
    
    const time = new Date(timeData.currentTime);
    const easternTime = time.toLocaleString("en-US", {
      timeZone: "America/Detroit", // Use Detroit for consistency with backend
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    
    return easternTime;
  };

  const getSchedulingWindowStatus = () => {
    const timeData = serverTime?.data || serverTime;
    if (!timeData) return "";
    
    // Always show the Game Day countdown instead of "Games: OPEN"
    return `Next Game Day: ${timeData.timeUntilNextWindow?.hours || 0}h ${timeData.timeUntilNextWindow?.minutes || 0}m`;
  };

  return (
    <Card className="bg-blue-900 border-blue-700">
      <CardContent className="p-2">
        <div className="text-center">
          <div className="text-blue-200 font-medium text-sm">EST: {formatServerTime()}</div>
          <div className="text-blue-300 text-xs">{getSchedulingWindowStatus()}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);



  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: team, isLoading: teamLoading, error: teamError } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
  });

  const { data: finances } = useQuery<Finances>({
    queryKey: [`/api/teams/${team?.id}/finances`],
    enabled: !!team?.id,
  });

  const { data: players, isLoading: playersLoading, error: playersError } = useQuery<Player[]>({
    queryKey: [`/api/teams/${team?.id}/players`],
    enabled: !!team?.id,
    retry: 1,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Debug logging can be removed in production
  // console.log('Dashboard Debug:', { teamId: team?.id, teamName: team?.name, playersCount: players?.length });

  const { data: liveMatches } = useQuery<any[]>({
    queryKey: ["/api/matches/live"],
    refetchInterval: 5000, // Refresh every 5 seconds for live matches
  });

  const { data: seasonalCycle } = useQuery<SeasonalCycle>({
    queryKey: ["/api/season/current-cycle"],
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: serverTime } = useQuery<any>({
    queryKey: ["/api/server/time"],
    refetchInterval: 30000, // Update every 30 seconds
  });

  if (isLoading || teamLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="font-orbitron text-3xl font-bold mb-6">Welcome to Realm Rivalry!</h1>
          <p className="text-gray-300 mb-8">Create your team to start your journey to glory.</p>
          <TeamCreationForm />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white dashboard-container">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Overview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-orbitron text-2xl font-bold">Team Dashboard</h2>
            <ServerTimeDisplay serverTime={serverTime} />
          </div>

          {/* Seasonal Cycle Display */}
          {(seasonalCycle as any) && (
            <Card className="bg-gradient-to-r from-purple-900 to-blue-900 border-purple-700 mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-600 bg-opacity-30 p-3 rounded-full">
                      <Calendar className="h-8 w-8 text-purple-200" />
                    </div>
                    <div>
                      <div className="text-sm text-purple-200 mb-1">{(seasonalCycle as any).season}</div>
                      <h2 className="text-2xl font-bold text-white mb-1">{(seasonalCycle as any).description}</h2>
                      <p className="text-purple-100 text-sm">{(seasonalCycle as any).details}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white mb-1">Day {(seasonalCycle as any).currentDay}/17</div>
                    <Badge 
                      variant={(seasonalCycle as any).phase === "Regular Season" ? "default" : 
                              (seasonalCycle as any).phase === "Playoffs" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {(seasonalCycle as any).phase}
                    </Badge>
                    {(seasonalCycle as any).daysUntilPlayoffs > 0 && (
                      <div className="text-xs text-purple-200 mt-1">
                        {(seasonalCycle as any).daysUntilPlayoffs} days to playoffs
                      </div>
                    )}
                    {(seasonalCycle as any).daysUntilNewSeason > 0 && (seasonalCycle as any).phase === "Off-Season" && (
                      <div className="text-xs text-purple-200 mt-1">
                        {(seasonalCycle as any).daysUntilNewSeason} days to new season
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link href="/competition">
              <Card className="bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-gray-400 text-sm">Division Rank</p>
                        <HelpIcon content="Your team's current division. New teams start in Division 8. Top 2 teams promote, bottom 2 relegate each season. Click to view detailed standings." />
                      </div>
                      <p className="text-2xl font-bold text-gold-400">
                        {team.division === 8 ? "New" : `Div ${team.division}`}
                      </p>
                      <p className="text-xs text-gray-400">{team.wins}W - {team.losses}L - {team.draws}D</p>
                    </div>
                    <div className="bg-gold-400 bg-opacity-20 p-3 rounded-lg">
                      <i className="fas fa-trophy text-gold-400 text-xl"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            

            
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-400 text-sm">Team Power</p>
                      <HelpIcon content="Combined power rating of all your players. Higher power means stronger overall team performance." />
                    </div>
                    <p className="text-xl font-bold text-primary-400">{team.teamPower}</p>
                    <p className="text-xs text-green-400">Building strength</p>
                  </div>
                  <div className="bg-primary-400 bg-opacity-20 p-2 rounded-lg">
                    <i className="fas fa-bolt text-primary-400 text-lg"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Link href="/team?tab=finances">
              <Card className="bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-gray-400 text-sm">Credits</p>
                        <HelpIcon content="Primary game currency. Earn through matches, achievements, and season rewards. Use for salaries and purchases. Click to view financial details." />
                      </div>
                      <p className="text-2xl font-bold text-gold-400">{(finances?.credits || team.credits || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-400">Available funds</p>
                    </div>
                    <div className="bg-gold-400 bg-opacity-20 p-3 rounded-lg">
                      <i className="fas fa-coins text-gold-400 text-xl"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-400 text-sm">Team Camaraderie</p>
                      <HelpIcon content="Team chemistry (0-100). High camaraderie provides in-game bonuses, injury resistance, and better contract negotiations." />
                    </div>
                    <p className="text-xl font-bold text-teal-400">{team?.teamCamaraderie ?? 'N/A'}</p>
                    <p className="text-xs text-gray-500">
                      {getTeamCamaraderieDescription(team?.teamCamaraderie)}
                    </p>
                  </div>
                  <div className="bg-teal-400 bg-opacity-20 p-2 rounded-lg">
                    <UsersIcon className="text-teal-400 text-lg" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Live Match Section */}
        {liveMatches && liveMatches.length > 0 && (
          <div className="mb-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {liveMatches[0]?.homeTeamName || "Team 1"} vs {liveMatches[0]?.awayTeamName || "Team 2"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {liveMatches[0]?.status === "live" ? "Live Match" : liveMatches[0]?.status}
                    </div>
                  </div>
                  <Badge className="bg-green-500 text-white">
                    Text Simulation Available
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Team Roster Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="border-b border-gray-700">
              <div className="flex items-center justify-between">
                <CardTitle className="font-orbitron text-xl">{team.name}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/team'}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 player-roster">
              {playersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : playersError ? (
                <div className="text-center py-8">
                  <p className="text-red-400">Error loading players: {playersError.message}</p>
                </div>
              ) : !players || players.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No players found</p>
                  <p className="text-sm text-gray-500">Visit the Team page to add players</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {players.map((player: any) => (
                    <div 
                      key={player.id}
                      onClick={() => {
                        setSelectedPlayer(player);
                        setShowPlayerModal(true);
                      }}
                      className="cursor-pointer"
                    >
                      <UnifiedPlayerCard
                        player={player}
                        variant="dashboard"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="border-b border-gray-700">
              <CardTitle className="font-orbitron text-xl">Division {team?.division || 8} - {getDivisionNameWithSubdivision(team?.division || 8, team?.id)}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <LeagueStandings division={team?.division || 8} />
            </CardContent>
          </Card>

          {/* SuperUser Access */}
          {team?.name === "Macomb Cougars" && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-400" />
                  SuperUser Panel
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <p className="text-gray-300 mb-2">Access administrative controls for testing and game management</p>
                  <Button 
                    onClick={() => window.location.href = '/superuser'}
                    variant="outline" 
                    className="w-full text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                  >
                    Open SuperUser Panel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          isOpen={showPlayerModal}
          onClose={() => {
            setShowPlayerModal(false);
            setSelectedPlayer(null);
          }}
        />
      )}
    </div>
  );
}

function TeamCreationForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { startTutorialAfterTeamCreation } = useContextualHelp();
  const [teamName, setTeamName] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [sanitizedName, setSanitizedName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleValidationChange = (valid: boolean, sanitized?: string) => {
    setIsValid(valid);
    setSanitizedName(sanitized || "");
  };

  const handleCreateTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!isValid || !sanitizedName) {
      toast({
        title: "Invalid Team Name",
        description: "Please fix the team name issues before creating your team.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: sanitizedName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create team');
      }

      toast({
        title: "Team Created!",
        description: "Your team has been created with 10 starting players.",
      });

      // Invalidate queries to refetch team data
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/finances"] });
      
      // Start tutorial for new team
      setTimeout(() => {
        startTutorialAfterTeamCreation();
      }, 1000); // Small delay to let the UI update
    } catch (error: any) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create team. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700 max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="font-orbitron">Create Your Team</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateTeam} className="space-y-6">
          <TeamNameInput
            value={teamName}
            onChange={setTeamName}
            onValidationChange={handleValidationChange}
            showRules={true}
          />
          <Button 
            type="submit" 
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? "Creating Team..." : "Create Team"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
