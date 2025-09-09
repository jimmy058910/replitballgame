import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useUnifiedAuth } from '../hooks/useUnifiedAuth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { 
  Users, 
  Zap, 
  Heart, 
  TrendingUp, 
  Coins, 
  UserCheck,
  ChevronUp, 
  ChevronDown,
  UserPlus,
  Settings,
  Shield,
  Trophy,
  Building,
  Activity,
  FileText,
  Briefcase,
  Handshake,
  Target,
  Filter,
  X,
  ArrowUp,
  Search
} from 'lucide-react';
import ModernStickyHeader from './ModernStickyHeader';
import PlayerDetailModal from './PlayerDetailModal';
import CamaraderieManagement from './CamaraderieManagement';
import StadiumFinancialHub from './StadiumFinancialHub';
import TapToAssignTactics from './TapToAssignTactics';
import { useToast } from '../hooks/use-toast';
import { apiRequest, queryClient } from '../lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { teamQueryOptions, staffQueryOptions, stadiumQueryOptions, taxiSquadQueryOptions, seasonQueryOptions, financeQueryOptions } from '@/lib/api/queryOptions';
import type { Player, Team, Staff, Contract, Stadium, PlayerWithContract } from '@shared/types/models';


// Type definitions  
type TryoutCandidate = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  race: string;
  age: number;
  leadership: number;
  throwing: number;
  speed: number;
  agility: number;
  power: number;
  stamina: number;
  catching: number;
  kicking: number;
  marketValue: number;
  potential: "High" | "Medium" | "Low";
  overallPotentialStars: number;
};

// Use shared type instead of local definition
type RosterPlayer = PlayerWithContract;

type RosterStaff = {
  id: string;
  name: string;
  type: string;
  age: number;
  level: number;
  motivation?: number;
  development?: number;
  teaching?: number;
  physiology?: number;
  talentIdentification?: number;
  potentialAssessment?: number;
  tactics?: number;
};

type RosterTeam = {
  id: string;
  name: string;
  credits: number;
  gems: number;
  camaraderie: number;
  players?: PlayerWithContract[];
  finances?: {
    credits: string;
    gems: string;
  };
};

type RosterStadium = {
  id: string;
  name: string;
  capacity: number;
  level: number;
};

type TabType = 'roster' | 'tactics' | 'camaraderie' | 'stadium' | 'staff';
type RosterView = 'all' | 'medical' | 'contracts';

export default function MobileRosterHQ() {
  const { isAuthenticated } = useUnifiedAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('roster');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithContract | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  
  // Recruitment system states
  const [isRecruitmentExpanded, setIsRecruitmentExpanded] = useState(false);
  const [showTryoutModal, setShowTryoutModal] = useState(false);
  const [tryoutType, setTryoutType] = useState<"basic" | "advanced" | null>(null);
  const [candidates, setCandidates] = useState<TryoutCandidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealProgress, setRevealProgress] = useState(0);
  const [revealedCandidates, setRevealedCandidates] = useState<TryoutCandidate[]>([]);
  const [rosterView, setRosterView] = useState<RosterView>('all');
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  // Queries using queryOptions factory pattern
  const { data: team, isLoading: teamLoading } = useQuery(teamQueryOptions.myTeam(isAuthenticated));

  // Use players data from team query for main roster (contracted players)
  const players = team?.players || [];
  const playersLoading = teamLoading;

  // Fetch taxi squad players separately using dedicated endpoint
  const { data: taxiSquadData, isLoading: taxiSquadLoading } = useQuery(taxiSquadQueryOptions.byTeam(team?.id ? String(team.id) : ''));

  const { data: staffData, isLoading: staffLoading } = useQuery(staffQueryOptions.list(!!team?.id));

  const staff = staffData?.staff || [];

  const { data: stadium } = useQuery(stadiumQueryOptions.byTeam(team?.id ? String(team.id) : ''));

  // Get current season cycle to determine if promotions are allowed
  const { data: seasonCycle } = useQuery(seasonQueryOptions.currentCycle(true));
  
  // Recruitment system queries
  const { data: financesData } = useQuery(financeQueryOptions.teamFinances(team?.id ? String(team.id) : ''));
  
  const { data: seasonalData } = useQuery(seasonQueryOptions.seasonalData(team?.id ? String(team.id) : ''));

  // Promotions only allowed during offseason (Days 16-17)
  const isOffseason = (seasonCycle && typeof seasonCycle === 'object' && 'currentDay' in seasonCycle && typeof seasonCycle?.currentDay === 'number') ? seasonCycle?.currentDay >= 16 : false;

  // Taxi squad promotion mutation
  const promotePlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      return apiRequest(`/api/teams/${team?.id}/taxi-squad/${playerId}/promote`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Player Promoted!",
        description: "Player has been moved to the main roster with a 3-year contract.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${team?.id}/players`] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${team?.id}/taxi-squad`] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to promote player";
      toast({
        title: "Promotion Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Taxi squad release mutation
  const releasePlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      return apiRequest(`/api/teams/${team?.id}/taxi-squad/${playerId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Player Released",
        description: "Player has been released from the taxi squad.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${team?.id}/taxi-squad`] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to release player";
      toast({
        title: "Release Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getRacialIcon = (race: string) => {
    const icons: Record<string, string> = {
      'Human': '👤', 'Sylvan': '🍃', 'Gryll': '🪨', 'Lumina': '✨', 'Umbra': '🌙'
    };
    return icons[race] || '👤';
  };

  const getRoleIcon = (role: string) => {
    const icons: Record<string, string> = {
      'PASSER': '🎯', 'RUNNER': '⚡', 'BLOCKER': '🛡️'
    };
    return icons[role] || '⚽';
  };

  const getRoleGradient = (role: string) => {
    const gradients: Record<string, string> = {
      'PASSER': 'from-yellow-600 to-yellow-800',
      'RUNNER': 'from-green-600 to-green-800',
      'BLOCKER': 'from-red-600 to-orange-700'
    };
    return gradients[role] || 'from-gray-600 to-gray-800';
  };

  const getPlayerPower = (player: Player) => {
    return Math.round(((player?.speed ?? 0) + (player?.power ?? 0) + (player?.throwing ?? 0) + 
                     (player?.catching ?? 0) + (player?.kicking ?? 0) + (player?.agility ?? 0)) / 6);
  };

  const getStaminaColor = (stamina: number) => {
    if (stamina >= 80) return 'text-green-400';
    if (stamina >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPlayerPotentialStars = (player: Player) => {
    // Calculate potential based on player power (1-5 stars)
    const power = getPlayerPower(player);
    const stars = Math.min(5, Math.max(1, Math.round(power / 20))); // Convert power to 1-5 scale
    return '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
  };

  const getStaffTypeName = (type: string) => {
    const names: Record<string, string> = {
      'HEAD_COACH': 'Head Coach',
      'PASSER_TRAINER': 'Passer Trainer',
      'RUNNER_TRAINER': 'Runner Trainer',
      'BLOCKER_TRAINER': 'Blocker Trainer',
      'RECOVERY_SPECIALIST': 'Recovery Specialist',
      'SCOUT': 'Scout'
    };
    return names[type] || type.replace('_', ' ');
  };
  
  // Recruitment system constants and calculations
  const basicCost = 25000;
  const advancedCost = 75000;
  const currentCredits = (financesData as any)?.credits ?? 0;
  const canAffordBasic = currentCredits >= basicCost;
  const canAffordAdvanced = currentCredits >= advancedCost;
  const tryoutsUsedThisSeason = (seasonalData as any)?.data?.tryoutsUsed ?? false;
  const canHostTryouts = !tryoutsUsedThisSeason;
  
  // Auto-expand recruitment if tryouts haven't been used yet
  useEffect(() => {
    if (!tryoutsUsedThisSeason && !isRecruitmentExpanded) {
      setIsRecruitmentExpanded(true);
    }
  }, [tryoutsUsedThisSeason, isRecruitmentExpanded]);
  
  // Recruitment system mutations
  const hostTryoutMutation = useMutation({
    mutationFn: async (type: "basic" | "advanced") => {
      return apiRequest(`/api/teams/${team?.id}/tryouts`, "POST", { type });
    },
    onSuccess: (data: unknown) => {
      const response = data as { candidates: any[]; type: string };
      setCandidates(response.candidates);
      setTryoutType(response.type as "basic" | "advanced");
      setShowTryoutModal(true);
      startRevealAnimation(response.candidates);
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${team?.id}/finances`] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${team?.id}/seasonal-data`] });
    },
    onError: (error: any) => {
      toast({
        title: "Tryout Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const addToTaxiSquadMutation = useMutation({
    mutationFn: async (candidateIds: string[]) => {
      const selectedFullCandidates = candidates.filter(c => candidateIds.includes(c.id));
      return apiRequest(`/api/teams/${team?.id}/taxi-squad/add-candidates`, "POST", { candidates: selectedFullCandidates });
    },
    onSuccess: (data: unknown) => {
      const response = data as { message: string };
      toast({
        title: "Success!",
        description: response.message,
      });
      setShowTryoutModal(false);
      setSelectedCandidates([]);
      setCandidates([]);
      setRevealedCandidates([]);
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${team?.id}/taxi-squad`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add players",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Recruitment helper functions
  const startRevealAnimation = (candidateList: TryoutCandidate[]) => {
    setIsRevealing(true);
    setRevealProgress(0);
    setRevealedCandidates([]);

    const totalDuration = 3000;
    const intervalDuration = 50;
    const totalSteps = totalDuration / intervalDuration;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = (currentStep / totalSteps) * 100;
      setRevealProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        setIsRevealing(false);
        setRevealedCandidates(candidateList);
      }
    }, intervalDuration);
  };
  
  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidates(prev => {
      if (prev.includes(candidateId)) {
        return prev.filter(id => id !== candidateId);
      } else if (prev.length < 2) {
        return [...prev, candidateId];
      } else {
        toast({
          title: "Selection Limit",
          description: "You can only select up to 2 candidates for your taxi squad.",
          variant: "destructive",
        });
        return prev;
      }
    });
  };

  // Handle tab changes and update URL
  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab);
    setLocation(`/roster-hq?tab=${newTab}`);
  };

  // Handle view changes and update URL
  const handleViewChange = (newView: RosterView) => {
    setRosterView(newView);
    const url = new URL(window.location.href);
    url.searchParams.set('view', newView);
    window.history.pushState({}, '', url.toString());
  };

  // Navigation helper functions
  const handleQuickAction = (action: string, view?: RosterView, tab?: TabType) => {
    if (view) {
      handleViewChange(view);
    }
    if (tab) {
      handleTabChange(tab);
    }
    setIsQuickActionsOpen(false);
  };

  // Quick Actions Sidebar Component
  const QuickActionsSidebar = ({ className = '' }) => (
    <div className={`space-y-4 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-400" />
          Quick Actions
        </h3>
      </div>

      {/* Medical Bay */}
      <Card 
        className="bg-gradient-to-r from-red-700/80 to-red-800/80 border-red-500 cursor-pointer hover:scale-105 transition-all duration-200"
        onClick={() => handleQuickAction('medical', 'medical')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-red-400" />
              <div>
                <h4 className="font-semibold text-white text-sm">🏥 Medical Bay</h4>
                <p className="text-red-200 text-xs">Injured: {injuredPlayers?.length ?? 0} • Low Stamina: {lowStaminaPlayers?.length ?? 0}</p>
              </div>
            </div>
            <Badge variant="destructive" className="text-xs">
              {(injuredPlayers?.length ?? 0) + (lowStaminaPlayers?.length ?? 0)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Contract Center */}
      <Card 
        className="bg-gradient-to-r from-blue-700/80 to-blue-800/80 border-blue-500 cursor-pointer hover:scale-105 transition-all duration-200"
        onClick={() => handleQuickAction('contracts', 'contracts')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-400" />
              <div>
                <h4 className="font-semibold text-white text-sm">📄 Contracts</h4>
                <p className="text-blue-200 text-xs">Expiring Soon: {expiringContracts?.length ?? 0}</p>
              </div>
            </div>
            <Badge className="bg-blue-600 text-white text-xs">
              {expiringContracts?.length ?? 0} exp.
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Staff Management */}
      <Card 
        className="bg-gradient-to-r from-orange-700/80 to-orange-800/80 border-orange-500 cursor-pointer hover:scale-105 transition-all duration-200"
        onClick={() => handleQuickAction('staff', undefined, 'staff')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase className="w-6 h-6 text-orange-400" />
              <div>
                <h4 className="font-semibold text-white text-sm">👥 Staff</h4>
                <p className="text-orange-200 text-xs">Staff: {staff?.length || 0}</p>
              </div>
            </div>
            <Badge className="bg-orange-600 text-white text-xs">
              {staff?.length || 0}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Camaraderie Lab */}
      <Card 
        className="bg-gradient-to-r from-yellow-700/80 to-yellow-800/80 border-yellow-500 cursor-pointer hover:scale-105 transition-all duration-200"
        onClick={() => handleQuickAction('camaraderie', undefined, 'camaraderie')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Handshake className="w-6 h-6 text-yellow-400" />
              <div>
                <h4 className="font-semibold text-white text-sm">🤝 Camaraderie</h4>
                <p className="text-yellow-200 text-xs">Team Morale</p>
              </div>
            </div>
            <Badge className="bg-yellow-600 text-white text-xs">
              {(team as any)?.teamCamaraderie ?? team?.camaraderie ?? 67}/100
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tactics & Lineup */}
      <Card 
        className="bg-gradient-to-r from-green-700/80 to-green-800/80 border-green-500 cursor-pointer hover:scale-105 transition-all duration-200"
        onClick={() => handleQuickAction('tactics', undefined, 'tactics')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-green-400" />
              <div>
                <h4 className="font-semibold text-white text-sm">🎯 Tactics</h4>
                <p className="text-green-200 text-xs">Formation & Lineup</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Filter Reset */}
      {rosterView !== 'all' && (
        <Card 
          className="bg-gradient-to-r from-gray-700/80 to-gray-800/80 border-gray-500 cursor-pointer hover:scale-105 transition-all duration-200"
          onClick={() => handleQuickAction('reset', 'all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2">
              <X className="w-4 h-4 text-gray-400" />
              <span className="text-white text-sm">Show All Players</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // URL parameter handling for direct tab navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view') as RosterView;
    const tab = urlParams.get('tab') as TabType;
    
    if (view && ['all', 'medical', 'contracts'].includes(view)) {
      setRosterView(view);
    }
    if (tab && ['roster', 'tactics', 'camaraderie', 'stadium', 'staff'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);

  // Mark roster visit for daily tasks
  useEffect(() => {
    const today = new Date().toDateString();
    localStorage.setItem(`rosterVisit_${today}`, 'true');
  }, []);

  // Player calculations - safely handle null/undefined players
  const safePlayersList = Array.isArray(players) ? players : [];
  const activePlayers = safePlayersList.filter(p => !p?.isOnMarket && !p?.isRetired);
  const sortedPlayers = [...activePlayers].sort((a, b) => {
    const posA = a?.rosterPosition ?? 0;
    const posB = b?.rosterPosition ?? 0;
    if (posA === 0 && posB === 0) return 0;
    if (posA === 0) return 1;
    if (posB === 0) return -1;
    return posA - posB;
  });

  // Use proper separation: Main roster (contracted) vs Taxi squad (no contracts + tryout history)
  const mainRoster = sortedPlayers; // These are already contracted players from /api/teams/my
  const taxiSquad = taxiSquadData || []; // These are taxi squad players from dedicated endpoint
  const injuredPlayers = activePlayers.filter(p => p?.injuryStatus !== 'HEALTHY');
  const lowStaminaPlayers = activePlayers.filter(p => (p?.dailyStaminaLevel ?? 100) < 50);
  
  // Contract calculations for Quick Actions
  const currentDate = new Date();
  const expiringContracts = activePlayers.filter(p => {
    if (!p?.signedAt || !p?.contractLength) return false;
    const contractStart = new Date(p.signedAt);
    const contractEnd = new Date(contractStart);
    contractEnd.setFullYear(contractStart.getFullYear() + p.contractLength);
    const daysToExpiry = Math.ceil((contractEnd.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
    return daysToExpiry <= 365; // Expiring within a year
  });

  // Filtered players based on current view
  const getFilteredPlayers = () => {
    switch (rosterView) {
      case 'medical':
        return [...injuredPlayers, ...lowStaminaPlayers];
      case 'contracts':
        return expiringContracts;
      default:
        return activePlayers;
    }
  };

  const filteredPlayers = getFilteredPlayers();
  // Apply proper separation to filtered players
  const sortedFilteredPlayers = [...filteredPlayers].sort((a, b) => {
    const posA = a?.rosterPosition ?? 0;
    const posB = b?.rosterPosition ?? 0;
    if (posA === 0 && posB === 0) return 0;
    if (posA === 0) return 1;
    if (posB === 0) return -1;
    return posA - posB;
  });
  const filteredMainRoster = sortedFilteredPlayers; // Already contracted players
  const filteredTaxiSquad = taxiSquad.filter(player => {
    // Apply same filtering logic to taxi squad
    switch (rosterView) {
      case 'medical':
        return player?.injuryStatus !== 'HEALTHY' || (player?.dailyStaminaLevel ?? 100) < 50;
      case 'contracts':
        // Taxi squad players don't have contracts, so exclude from contracts view
        return false;
      default:
        return true;
    }
  });
  
  // Role distribution
  const passers = activePlayers.filter(p => p?.role === 'PASSER');
  const runners = activePlayers.filter(p => p?.role === 'RUNNER');
  const blockers = activePlayers.filter(p => p?.role === 'BLOCKER');

  // Handler functions
  const handleStaffNegotiate = (staff: Staff) => {
    setSelectedStaff(staff);
  };

  const handleStaffRelease = (staff: Staff) => {
    setSelectedStaff(staff);
  };

  // Loading state - fix infinite loading
  if (teamLoading || playersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <ModernStickyHeader />
        <div className="container mx-auto px-4 py-8 text-center mt-8">
          <Card className="bg-gradient-to-r from-blue-800 to-purple-800 border-2 border-blue-400">
            <CardContent className="p-8">
              <div className="text-white">
                <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-2xl font-bold mb-4">LOADING ROSTER HQ</h2>
                <p className="text-blue-200">Gathering player and staff information...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Handle case where team exists but no players yet - still show interface
  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <ModernStickyHeader />
        <div className="container mx-auto px-4 py-8 text-center mt-8">
          <Card className="bg-gradient-to-r from-red-800 to-orange-800 border-2 border-red-400">
            <CardContent className="p-8">
              <div className="text-white">
                <h2 className="text-2xl font-bold mb-4">TEAM NOT FOUND</h2>
                <p className="text-red-200 mb-4">Unable to load your team data. Please create a team first.</p>
                <Button onClick={() => window.location.href = '/'} className="bg-blue-600 hover:bg-blue-700">
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <ModernStickyHeader />
      <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl mt-8">
        {/* Roster Overview Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Passers */}
          <Card className="bg-gradient-to-br from-yellow-600 to-yellow-800 border-2 border-yellow-500">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-2xl font-bold text-white">{passers.length}</div>
              <div className="text-yellow-200 text-sm font-semibold">Passers</div>
              <div className="text-xs text-yellow-300 mt-1">(Min: 3 Required)</div>
              {passers.length < 3 && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  Needs {3 - passers.length} More!
                </Badge>
              )}
              <Progress value={(passers.length / 3) * 100} className="mt-2 h-2 bg-yellow-900" />
            </CardContent>
          </Card>

          {/* Runners */}
          <Card className="bg-gradient-to-br from-green-600 to-green-800 border-2 border-green-500">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-2">⚡</div>
              <div className="text-2xl font-bold text-white">{runners.length}</div>
              <div className="text-green-200 text-sm font-semibold">Runners</div>
              <div className="text-xs text-green-300 mt-1">(Min: 4 Required)</div>
              {runners.length < 4 && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  Needs {4 - runners.length} More!
                </Badge>
              )}
              <Progress value={(runners.length / 4) * 100} className="mt-2 h-2 bg-green-900" />
            </CardContent>
          </Card>

          {/* Blockers */}
          <Card className="bg-gradient-to-br from-red-600 to-orange-700 border-2 border-red-500">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-2">🛡️</div>
              <div className="text-2xl font-bold text-white">{blockers.length}</div>
              <div className="text-red-200 text-sm font-semibold">Blockers</div>
              <div className="text-xs text-red-300 mt-1">(Min: 4 Required)</div>
              {blockers.length < 4 && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  Needs {4 - blockers.length} More!
                </Badge>
              )}
              <Progress value={(blockers.length / 4) * 100} className="mt-2 h-2 bg-red-900" />
            </CardContent>
          </Card>
        </div>

        {/* Five-Tab Navigation - Clean and responsive */}
        <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as TabType)} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800/50 border border-slate-600">
            <TabsTrigger value="roster" className="text-xs font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white py-2 px-2">
              👥 Roster
            </TabsTrigger>
            <TabsTrigger value="tactics" className="text-xs font-semibold data-[state=active]:bg-green-600 data-[state=active]:text-white py-2 px-1">
              🎯 Tactics
            </TabsTrigger>
            <TabsTrigger value="camaraderie" className="text-xs font-semibold data-[state=active]:bg-yellow-600 data-[state=active]:text-white py-2 px-1">
              <span className="hidden sm:inline">🤝 Camaraderie</span>
              <span className="sm:hidden">🤝 Team</span>
            </TabsTrigger>
            <TabsTrigger value="stadium" className="text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white py-2 px-1">
              🏟️ Stadium
            </TabsTrigger>
            <TabsTrigger value="staff" className="text-xs font-semibold data-[state=active]:bg-orange-600 data-[state=active]:text-white py-2 px-1">
              👔 Staff
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ROSTER WITH QUICK-ACTIONS */}
          <TabsContent value="roster" className="space-y-6 px-2">
            {/* Mobile Quick Actions FAB */}
            <div className="fixed bottom-6 right-6 z-50 md:hidden">
              <Sheet open={isQuickActionsOpen} onOpenChange={setIsQuickActionsOpen}>
                <SheetTrigger asChild>
                  <Button className="w-14 h-14 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 shadow-lg">
                    <Zap className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 border-t-2 border-blue-400">
                  <QuickActionsSidebar />
                </SheetContent>
              </Sheet>
            </div>

            {/* Current View Indicator */}
            {rosterView !== 'all' && (
              <Card className="bg-gradient-to-r from-purple-700 to-blue-700 border-blue-400">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="w-5 h-5 text-blue-400" />
                      <span className="text-white font-semibold">
                        {rosterView === 'medical' && 'Showing Medical Issues'}
                        {rosterView === 'contracts' && 'Showing Expiring Contracts'}
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleQuickAction('reset', 'all')}
                      className="text-white border-white hover:bg-white hover:text-purple-900"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear Filter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Two-Column Layout: 70% Roster Content + 30% Quick Actions Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Column: Roster Content (70% on desktop) */}
              <div className="lg:col-span-3 space-y-6">
                {/* Main Roster */}
                <Card className="bg-gradient-to-r from-blue-800 to-blue-900 border-2 border-blue-400">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <Users className="w-6 h-6 mr-3 text-blue-400" />
                      👥 MAIN ROSTER ({rosterView === 'all' ? mainRoster.length : filteredMainRoster.length} players)
                      {rosterView !== 'all' && (
                        <Badge className="ml-2 bg-purple-600">Filtered</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                      {(rosterView === 'all' ? mainRoster : filteredMainRoster).map((player) => (
                        <Card 
                          key={player.id}
                          className={`bg-gradient-to-r ${getRoleGradient(player.role)} border-2 border-white/20 cursor-pointer hover:scale-105 transition-all duration-200`}
                          onClick={() => setSelectedPlayer(player)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{getRacialIcon(player?.race ?? 'Human')}</span>
                                  <h3 className="font-bold text-white text-sm">
                                    {player?.firstName ?? 'Unknown'} {player?.lastName ?? 'Player'}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs text-white border-white/50">
                                    {getRoleIcon(player?.role ?? 'PASSER')} {player?.role ?? 'PASSER'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs text-blue-300 border-blue-300">
                                    Age {player?.age ?? 18}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-white">
                                  {getPlayerPower(player)}
                                </div>
                                <div className="text-xs text-white/70">Power</div>
                              </div>
                            </div>
                            
                            {/* Contract Information */}
                            <div className="mb-2 text-xs text-white/80">
                              <div className="flex items-center gap-1">
                                <Coins className="h-3 w-3 text-green-400" />
                                <span>
                                  ₵{(player?.contractSalary ?? 0).toLocaleString()}/season, {player?.contractLength ?? 0} seasons
                                </span>
                              </div>
                            </div>

                            {/* Health and Stamina */}
                            <div className="flex justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <Heart className="h-3 w-3 text-green-400" />
                                <span className={`font-semibold ${(player?.injuryStatus ?? 'HEALTHY') === 'HEALTHY' ? 'text-green-400' : 'text-red-400'}`}>
                                  {(player?.injuryStatus ?? 'HEALTHY') === 'HEALTHY' ? 'Healthy' : 'Injured'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Zap className="h-3 w-3 text-yellow-400" />
                                <span className={`text-xs font-semibold ${getStaminaColor(player?.dailyStaminaLevel ?? 100)}`}>
                                  {player?.dailyStaminaLevel ?? 100}%
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

                {/* Combined Taxi Squad & Recruitment */}
                <Card className="bg-gradient-to-r from-purple-800 to-purple-900 border-2 border-purple-400">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-white">
                      <div className="flex items-center">
                        <Users className="w-6 h-6 mr-3 text-purple-400" />
                        🚌 TAXI SQUAD & RECRUITMENT ({rosterView === 'all' ? taxiSquad.length : filteredTaxiSquad.length}/2)
                        <span className="text-xs text-purple-300 ml-2">(Promotions: Offseason Days 16-17)</span>
                        {rosterView !== 'all' && (
                          <Badge className="ml-2 bg-purple-600">Filtered</Badge>
                        )}
                      </div>
                      {/* Recruitment toggle */}
                      {canHostTryouts && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsRecruitmentExpanded(!isRecruitmentExpanded)}
                          className="border-purple-400 text-purple-200 hover:bg-purple-700"
                        >
                          {isRecruitmentExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          {isRecruitmentExpanded ? 'Hide' : 'Show'} Recruitment
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-6">
                    
                    {/* Current Taxi Squad Players */}
                    {((rosterView === 'all' ? taxiSquad : filteredTaxiSquad).length > 0) && (
                      <div>
                        <h4 className="text-sm font-semibold text-purple-200 mb-3 flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          Current Development Players
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(rosterView === 'all' ? taxiSquad : filteredTaxiSquad).map((player) => (
                            <Card 
                              key={player.id}
                              className="bg-gradient-to-r from-purple-700 to-purple-800 border-2 border-purple-500 cursor-pointer hover:scale-105 transition-all duration-200"
                              onClick={() => setSelectedPlayer(player)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-lg">{getRacialIcon(player?.race ?? 'Human')}</span>
                                      <h3 className="font-bold text-white text-sm">
                                        {player?.firstName ?? 'Unknown'} {player?.lastName ?? 'Player'}
                                      </h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs text-white border-white/50">
                                        {getRoleIcon(player?.role ?? 'PASSER')} {player?.role ?? 'PASSER'}
                                      </Badge>
                                      <Badge className="bg-purple-600 text-white text-xs">
                                        DEVELOPMENT
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-white">
                                      {getPlayerPower(player)}
                                    </div>
                                    <div className="text-xs text-white/70">Power</div>
                                  </div>
                                </div>
                                
                                <div className="p-2 bg-purple-900/50 rounded text-xs">
                                  <div className="text-purple-200 mb-1">⭐ Player Potential</div>
                                  <div className="flex justify-between items-center">
                                    <div className="text-yellow-300 text-lg">
                                      {getPlayerPotentialStars(player)}
                                    </div>
                                    {isOffseason && (
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            promotePlayerMutation.mutate(String(player.id));
                                          }}
                                          disabled={promotePlayerMutation.isPending}
                                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-6"
                                        >
                                          {promotePlayerMutation.isPending ? (
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                          ) : (
                                            <>
                                              <ArrowUp className="w-3 h-3 mr-1" />
                                              Promote
                                            </>
                                          )}
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            releasePlayerMutation.mutate(String(player.id));
                                          }}
                                          disabled={releasePlayerMutation.isPending}
                                          className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 h-6"
                                        >
                                          {releasePlayerMutation.isPending ? (
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                          ) : (
                                            <>
                                              <X className="w-3 h-3 mr-1" />
                                              Release
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Player Recruitment Section */}
                    {(isRecruitmentExpanded || !canHostTryouts) && (
                      <div className="border-t border-purple-600 pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-semibold text-purple-200 flex items-center">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Player Recruitment
                            <Badge variant="secondary" className="ml-2 text-xs">Once per season</Badge>
                          </h4>
                          {tryoutsUsedThisSeason && (
                            <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                              Already Used This Season
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-4">
                          <div className="bg-purple-900/30 border border-purple-600 rounded-lg p-3">
                            <p className="text-purple-200 text-sm">
                              Host tryouts to recruit young talent (18-24 years old) for your taxi squad. 
                              You can keep up to 2 players and promote them during the offseason.
                            </p>
                            {!canHostTryouts && (
                              <p className="text-yellow-300 text-xs mt-2 font-medium">
                                ⚠️ Seasonal Restriction: You can only host tryouts ONCE per season (17-day cycle).
                              </p>
                            )}
                          </div>
                          
                          {!canHostTryouts ? (
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="tryout-options" className="border-purple-600">
                                <AccordionTrigger className="text-purple-200 hover:text-white">
                                  <span className="text-sm font-medium">View Tryout Options</span>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                    {/* Basic Tryout */}
                                    <Card className="bg-purple-700/50 border-purple-500">
                                      <CardHeader>
                                        <CardTitle className="text-lg text-white">Basic Tryout</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-3">
                                        <div className="text-sm text-purple-200">
                                          <p>• 3 candidates to choose from</p>
                                          <p>• Standard talent pool</p>
                                          <p>• Quick evaluation process</p>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-lg font-bold text-green-400">
                                            {basicCost.toLocaleString()}₡
                                          </span>
                                          <Button
                                            onClick={() => hostTryoutMutation.mutate("basic")}
                                            disabled={!canAffordBasic || !canHostTryouts || hostTryoutMutation.isPending}
                                            variant={canAffordBasic && canHostTryouts ? "default" : "secondary"}
                                            size="sm"
                                          >
                                            {hostTryoutMutation.isPending ? "Hosting..." : 
                                             !canHostTryouts ? "Used This Season" : 
                                             !canAffordBasic ? "Not Enough Credits" : 
                                             "Host Basic Tryout"}
                                          </Button>
                                        </div>
                                        {!canAffordBasic && canHostTryouts && (
                                          <p className="text-red-400 text-xs">Insufficient credits</p>
                                        )}
                                      </CardContent>
                                    </Card>
            
                                    {/* Advanced Tryout */}
                                    <Card className="bg-purple-700/50 border-purple-500">
                                      <CardHeader>
                                        <CardTitle className="text-lg text-white">Advanced Tryout</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-3">
                                        <div className="text-sm text-purple-200">
                                          <p>• 5 candidates to choose from</p>
                                          <p>• Premium talent pool</p>
                                          <p>• Higher potential players</p>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-lg font-bold text-green-400">
                                            {advancedCost.toLocaleString()}₡
                                          </span>
                                          <Button
                                            onClick={() => hostTryoutMutation.mutate("advanced")}
                                            disabled={!canAffordAdvanced || !canHostTryouts || hostTryoutMutation.isPending}
                                            variant={canAffordAdvanced && canHostTryouts ? "default" : "secondary"}
                                            size="sm"
                                          >
                                            {hostTryoutMutation.isPending ? "Hosting..." : 
                                             !canHostTryouts ? "Used This Season" : 
                                             !canAffordAdvanced ? "Not Enough Credits" : 
                                             "Host Advanced Tryout"}
                                          </Button>
                                        </div>
                                        {!canAffordAdvanced && canHostTryouts && (
                                          <p className="text-red-400 text-xs">Insufficient credits</p>
                                        )}
                                      </CardContent>
                                    </Card>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Basic Tryout */}
                              <Card className="bg-purple-700/50 border-purple-500">
                                <CardHeader>
                                  <CardTitle className="text-lg text-white">Basic Tryout</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div className="text-sm text-purple-200">
                                    <p>• 3 candidates to choose from</p>
                                    <p>• Standard talent pool</p>
                                    <p>• Quick evaluation process</p>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-green-400">
                                      {basicCost.toLocaleString()}₡
                                    </span>
                                    <Button
                                      onClick={() => hostTryoutMutation.mutate("basic")}
                                      disabled={!canAffordBasic || !canHostTryouts || hostTryoutMutation.isPending}
                                      variant={canAffordBasic && canHostTryouts ? "default" : "secondary"}
                                      size="sm"
                                    >
                                      {hostTryoutMutation.isPending ? "Hosting..." : 
                                       !canHostTryouts ? "Used This Season" : 
                                       !canAffordBasic ? "Not Enough Credits" : 
                                       "Host Basic Tryout"}
                                    </Button>
                                  </div>
                                  {!canAffordBasic && canHostTryouts && (
                                    <p className="text-red-400 text-xs">Insufficient credits</p>
                                  )}
                                </CardContent>
                              </Card>
      
                              {/* Advanced Tryout */}
                              <Card className="bg-purple-700/50 border-purple-500">
                                <CardHeader>
                                  <CardTitle className="text-lg text-white">Advanced Tryout</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div className="text-sm text-purple-200">
                                    <p>• 5 candidates to choose from</p>
                                    <p>• Premium talent pool</p>
                                    <p>• Higher potential players</p>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-green-400">
                                      {advancedCost.toLocaleString()}₡
                                    </span>
                                    <Button
                                      onClick={() => hostTryoutMutation.mutate("advanced")}
                                      disabled={!canAffordAdvanced || !canHostTryouts || hostTryoutMutation.isPending}
                                      variant={canAffordAdvanced && canHostTryouts ? "default" : "secondary"}
                                      size="sm"
                                    >
                                      {hostTryoutMutation.isPending ? "Hosting..." : 
                                       !canHostTryouts ? "Used This Season" : 
                                       !canAffordAdvanced ? "Not Enough Credits" : 
                                       "Host Advanced Tryout"}
                                    </Button>
                                  </div>
                                  {!canAffordAdvanced && canHostTryouts && (
                                    <p className="text-red-400 text-xs">Insufficient credits</p>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          )}
                          
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* No Results Message */}
                {rosterView !== 'all' && filteredMainRoster.length === 0 && filteredTaxiSquad.length === 0 && (
                  <Card className="bg-gradient-to-r from-gray-700 to-gray-800 border-gray-500">
                    <CardContent className="p-8 text-center">
                      <div className="text-gray-400 mb-4">
                        <Users className="w-12 h-12 mx-auto mb-2" />
                      </div>
                      <h3 className="text-white font-semibold mb-2">No Players Found</h3>
                      <p className="text-gray-300 text-sm mb-4">
                        {rosterView === 'medical' && 'No players currently have medical issues.'}
                        {rosterView === 'contracts' && 'No contracts are expiring soon.'}
                      </p>
                      <Button 
                        onClick={() => handleQuickAction('reset', 'all')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Show All Players
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column: Quick Actions Sidebar (30% on desktop, hidden on mobile) */}
              <div className="hidden lg:block">
                <div className="sticky top-6">
                  <QuickActionsSidebar />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: TACTICS */}
          <TabsContent value="tactics" className="space-y-6 px-2">
            {team?.id ? (
              <TapToAssignTactics teamId={team.id.toString()} />
            ) : (
              <div className="text-center text-white py-8">
                <div className="text-xl font-bold mb-2">Loading Team Data...</div>
                <div className="text-gray-300">Please wait while we load your team information.</div>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: CAMARADERIE */}
          <TabsContent value="camaraderie" className="space-y-6 px-2">
            <CamaraderieManagement teamId={team?.id?.toString() || ''} />
          </TabsContent>

          {/* TAB 4: STADIUM */}
          <TabsContent value="stadium" className="space-y-6 px-2">
            <StadiumFinancialHub team={team} stadium={stadium} />
          </TabsContent>

          {/* TAB 5: STAFF */}
          <TabsContent value="staff" className="space-y-6 px-2">
            <Card className="bg-gradient-to-r from-orange-800 to-orange-900 border-2 border-orange-400">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <div className="flex items-center">
                    <UserCheck className="w-6 h-6 mr-3 text-orange-400" />
                    👔 STAFF ({staff.length})
                  </div>
                  {staffData?.totalStaffCost && (
                    <div className="text-right">
                      <div className="text-sm text-orange-300">Total Cost</div>
                      <div className="font-bold text-lg">{staffData.totalStaffCost.toLocaleString()}₡/season</div>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staff && staff.length > 0 ? staff.map((member) => (
                    <Card 
                      key={member.id} 
                      className="bg-gradient-to-br from-orange-700 to-orange-800 border-2 border-orange-500 hover:scale-105 transition-all duration-200 cursor-pointer"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                              <UserPlus className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-sm">{member?.name ?? 'Unknown Staff'}</h3>
                              <Badge className="bg-orange-600 text-white text-xs">
                                {getStaffTypeName(member?.type ?? 'HEAD_COACH')}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-orange-200">Age {member?.age ?? 25}</div>
                          </div>
                        </div>

                        {/* Staff Attributes */}
                        <div className="mb-3 p-2 bg-black/30 rounded space-y-1">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {(member?.type ?? 'HEAD_COACH') === 'HEAD_COACH' && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-white/70">Motivation:</span>
                                  <span className="text-orange-300">{member?.motivation ?? 0}/40</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white/70">Development:</span>
                                  <span className="text-orange-300">{member?.development ?? 0}/40</span>
                                </div>
                              </>
                            )}
                            {((member?.type ?? 'HEAD_COACH') === 'PASSER_TRAINER' || (member?.type ?? 'HEAD_COACH') === 'RUNNER_TRAINER' || (member?.type ?? 'HEAD_COACH') === 'BLOCKER_TRAINER') && (
                              <div className="flex justify-between col-span-2">
                                <span className="text-white/70">Teaching:</span>
                                <span className="text-orange-300">{member?.teaching ?? 0}/40</span>
                              </div>
                            )}
                            {member.type === 'RECOVERY_SPECIALIST' && (
                              <div className="flex justify-between col-span-2">
                                <span className="text-white/70">Physiology:</span>
                                <span className="text-orange-300">{member?.physiology ?? 0}/40</span>
                              </div>
                            )}
                            {member.type === 'SCOUT' && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-white/70">Talent ID:</span>
                                  <span className="text-orange-300">{member?.talentIdentification ?? 0}/40</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white/70">Potential:</span>
                                  <span className="text-orange-300">{member?.potentialAssessment ?? 0}/40</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Contract Information */}
                        <div className="mb-3 p-2 bg-black/30 rounded">
                          <div className="flex justify-between text-xs">
                            <span className="text-white/70">Contract:</span>
                            <span className="text-orange-300 font-semibold">
                              {member?.contract ? 
                                `${member.contract.salary.toLocaleString()}₡/season, ${member.contract.duration} seasons` :
                                `${((member?.level ?? 1) * 1000).toLocaleString()}₡/season, 3 seasons`
                              }
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 text-xs border-orange-400 text-orange-400 hover:bg-orange-600 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast({
                                title: "Staff Negotiation",
                                description: `Contract negotiation with ${member?.name ?? 'this staff member'} will be available in the next update.`,
                                variant: "default"
                              });
                            }}
                          >
                            Negotiate
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 text-xs border-red-400 text-red-400 hover:bg-red-600 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast({
                                title: "Staff Release",
                                description: `Releasing ${member?.name ?? 'this staff member'} will be available in the next update.`,
                                variant: "default"
                              });
                            }}
                          >
                            Release
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="col-span-full text-center text-white/70 py-8">
                      <UserPlus className="w-16 h-16 mx-auto mb-4 text-orange-400" />
                      <h3 className="text-xl font-bold text-white mb-2">No Staff Hired</h3>
                      <p className="text-lg mb-4">Build your coaching team to boost player development</p>
                      <Button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2">
                        HIRE STAFF
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Player Detail Modal */}
        {selectedPlayer && (
          <PlayerDetailModal
            player={selectedPlayer}
            isOpen={!!selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
          />
        )}
        
        {/* Tryout Candidate Selection Modal */}
        <Dialog open={showTryoutModal} onOpenChange={setShowTryoutModal}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-400" />
                {tryoutType === 'basic' ? 'Basic' : 'Advanced'} Tryout Results
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {isRevealing ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-white mb-2">Evaluating Candidates...</h3>
                    <Progress value={revealProgress} className="w-full" />
                    <p className="text-sm text-gray-400 mt-2">
                      {revealProgress < 100 ? 'Analyzing player statistics and potential...' : 'Evaluation complete!'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-purple-900/30 border border-purple-600 rounded-lg p-3">
                    <p className="text-purple-200 text-sm mb-2">
                      Select up to 2 candidates to add to your taxi squad. These players will train with your team and can be promoted during the offseason.
                    </p>
                    <div className="text-xs text-purple-300">
                      💡 Look for players with high potential stars and complementary skills to your current roster.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {revealedCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className={`cursor-pointer transition-all transform hover:scale-105 ${
                          selectedCandidates.includes(candidate.id)
                            ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20'
                            : ''
                        } ${
                          candidate.potential === "High" ? 'ring-2 ring-yellow-400/50' : ''
                        }`}
                        onClick={() => toggleCandidateSelection(candidate.id)}
                      >
                        <Card className="bg-gradient-to-r from-purple-700 to-purple-800 border-2 border-purple-500 hover:border-purple-400">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{getRacialIcon(candidate.race || 'Human')}</span>
                                  <h3 className="font-bold text-white text-sm">
                                    {candidate.firstName} {candidate.lastName}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs text-white border-white/50">
                                    Age {candidate.age}
                                  </Badge>
                                  <Badge 
                                    className={`text-xs ${
                                      candidate.potential === 'High' ? 'bg-yellow-600' :
                                      candidate.potential === 'Medium' ? 'bg-blue-600' : 'bg-gray-600'
                                    }`}
                                  >
                                    {candidate.potential} Potential
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-white">
                                  {Math.round((candidate.speed + candidate.power + candidate.throwing + 
                                             candidate.catching + candidate.kicking + candidate.agility) / 6)}
                                </div>
                                <div className="text-xs text-white/70">Power</div>
                              </div>
                            </div>
                            
                            <div className="p-2 bg-purple-900/50 rounded text-xs">
                              <div className="text-purple-200 mb-1">⭐ Potential Rating</div>
                              <div className="text-yellow-300 text-lg">
                                {'⭐'.repeat(candidate.overallPotentialStars || 1)}{'☆'.repeat(5 - (candidate.overallPotentialStars || 1))}
                              </div>
                            </div>
                            
                            {selectedCandidates.includes(candidate.id) && (
                              <div className="mt-2 p-2 bg-blue-600/20 border border-blue-500 rounded text-center">
                                <span className="text-blue-300 text-xs font-medium">✓ Selected for Taxi Squad</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-600">
                    <div className="text-sm text-gray-400">
                      Selected: {selectedCandidates.length}/2
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowTryoutModal(false);
                          setCandidates([]);
                          setSelectedCandidates([]);
                        }}
                      >
                        Dismiss All
                      </Button>
                      <Button
                        onClick={() => addToTaxiSquadMutation.mutate(selectedCandidates)}
                        disabled={selectedCandidates.length === 0 || addToTaxiSquadMutation.isPending}
                      >
                        {addToTaxiSquadMutation.isPending ? "Adding..." : "Add to Taxi Squad"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}