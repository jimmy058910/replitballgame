import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useQuery } from '@tanstack/react-query';
import { 
  Home, Users, Trophy, ShoppingCart, Globe, MessageCircle, 
  Bell, Menu, X, Coins, Star, Clock, Calendar,
  ChevronDown, Zap, Play, Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Team {
  id: number;
  name: string;
  division: number;
  subdivision?: string;
  teamPower?: number;
  finances?: {
    credits: string;
    gems: string;
  };
}

interface Finances {
  credits: string;
  gems: string;
}

interface SeasonData {
  seasonNumber: number;
  currentDay: number;
  phase: string;
  nextMatchCountdown?: string;
  nextOpponent?: string;
  startDate?: string;
}

interface LiveMatch {
  id: string;
  status: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  gameTime?: number;
  matchType: string;
}

interface UpcomingMatch {
  id: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  gameDate: string;
  matchType: string;
}

const ModernStickyHeader: React.FC = () => {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [serverTime, setServerTime] = useState(new Date());
  const { isAuthenticated } = useUnifiedAuth();

  // Server time update
  useEffect(() => {
    const timer = setInterval(() => {
      setServerTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Data queries
  const { data: team } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
    enabled: isAuthenticated,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  // Use finances data from team response instead of separate API call
  const finances = team ? {
    credits: team.finances?.credits || "0",
    gems: team.finances?.gems || "0"
  } : null;

  const { data: seasonData } = useQuery<SeasonData>({
    queryKey: ['/api/season/current-cycle'],
    enabled: isAuthenticated,
  });

  const { data: notifications } = useQuery({
    queryKey: [`/api/teams/${team?.id}/notifications`],
    enabled: !!team?.id && isAuthenticated,
  });

  // Live match and upcoming match queries
  const { data: liveMatches } = useQuery<LiveMatch[]>({
    queryKey: ['/api/matches/live'],
    enabled: isAuthenticated && !!team?.id,
    refetchInterval: 5000, // Check every 5 seconds for live matches
  });

  const { data: upcomingMatches } = useQuery<UpcomingMatch[]>({
    queryKey: ['/api/teams/my/matches/upcoming'], // Fixed key to avoid template variables
    enabled: !!team?.id && isAuthenticated,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache this data at all
    refetchInterval: 30000, // Check every 30 seconds for upcoming matches
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: false,
  });

  // Debug logging with useEffect
  useEffect(() => {
    console.log('🔍 [HEADER DEBUG] Authentication state:', isAuthenticated);
    if (team) {
      console.log('🔍 [HEADER DEBUG] Team data updated:', team.name, 'ID:', team.id);
    } else if (isAuthenticated) {
      console.log('🔍 [HEADER DEBUG] Authenticated but no team data yet');
    }
  }, [team, isAuthenticated]);

  useEffect(() => {
    if (upcomingMatches) {
      console.log('🔍 [HEADER DEBUG] Upcoming matches updated:', upcomingMatches.length, 'matches');
      if (upcomingMatches.length > 0) {
        console.log('🔍 [HEADER DEBUG] Next match:', upcomingMatches[0].homeTeam.name, 'vs', upcomingMatches[0].awayTeam.name, 'on', upcomingMatches[0].gameDate);
      }
    } else if (isAuthenticated && team) {
      console.log('🔍 [HEADER DEBUG] No upcoming matches data yet, but have team:', team.name);
    }
  }, [upcomingMatches, isAuthenticated, team]);

  // Navigation items
  const navItems = [
    { path: "/", label: "Team HQ", shortLabel: "Team", icon: Home },
    { path: "/roster-hq", label: "Roster HQ", shortLabel: "Roster", icon: Users },
    { path: "/competition", label: "Competition Center", shortLabel: "Competition", icon: Trophy },
    { path: "/market", label: "Market District", shortLabel: "Market", icon: ShoppingCart },
    { path: "/community", label: "Community Portal", shortLabel: "Community", icon: MessageCircle },
  ];

  // Helper functions
  const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? parseInt(value) : value;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const getDivisionName = (division: number): string => {
    const names: Record<number, string> = {
      1: "Diamond", 2: "Platinum", 3: "Gold", 4: "Silver", 
      5: "Bronze", 6: "Iron", 7: "Steel", 8: "Stone"
    };
    return names[division] || `Div ${division}`;
  };

  const getEnhancedDivisionDisplay = (division: number, subdivision?: string): string => {
    const divisionName = getDivisionName(division);
    
    if (!subdivision || subdivision === "main") {
      return `Division ${division} - ${divisionName} - Main`;
    }
    
    const subdivisionNames: Record<string, string> = {
      "alpha": "Alpha", "beta": "Beta", "gamma": "Gamma", "delta": "Delta",
      "epsilon": "Epsilon", "zeta": "Zeta", "eta": "Eta", "theta": "Theta"
    };
    
    const subdivisionName = subdivisionNames[subdivision] || subdivision.charAt(0).toUpperCase() + subdivision.slice(1);
    return `Division ${division} - ${divisionName} - ${subdivisionName}`;
  };

  const getNextGameDayCountdown = (): string => {
    if (!seasonData?.startDate) return "Loading...";
    
    const now = serverTime;
    const nextDayCycle = new Date();
    nextDayCycle.setHours(3, 0, 0, 0); // 3 AM EDT = next day cycle
    
    // If it's already past 3 AM today, target 3 AM tomorrow
    if (now.getHours() >= 3) {
      nextDayCycle.setDate(nextDayCycle.getDate() + 1);
    }
    
    const diff = nextDayCycle.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours < 1) {
      return `${minutes}m until next game day`;
    }
    return `${hours}h ${minutes}m until next game day`;
  };

  const getNextMatchInfo = (): { text: string; isOffSeason: boolean } => {
    if (!seasonData) return { text: "Loading...", isOffSeason: false };
    
    // If in off-season (Day 16-17)
    if (seasonData.currentDay >= 16) {
      return { 
        text: "Prepare for next season", 
        isOffSeason: true 
      };
    }
    
    // Check if user has live match
    const userLiveMatch = Array.isArray(liveMatches) ? liveMatches.find(match => 
      match.homeTeam.id === team?.id?.toString() || match.awayTeam.id === team?.id?.toString()
    ) : null;
    
    if (userLiveMatch) {
      const opponent = userLiveMatch.homeTeam.id === team?.id?.toString() 
        ? userLiveMatch.awayTeam.name 
        : userLiveMatch.homeTeam.name;
      return { text: `LIVE vs ${opponent}`, isOffSeason: false };
    }
    
    // Check next upcoming match
    const nextMatch = Array.isArray(upcomingMatches) ? upcomingMatches[0] : null;
    if (nextMatch && nextMatch.matchType === 'LEAGUE') {
      const isHome = nextMatch.homeTeam.id === team?.id?.toString();
      const opponent = isHome ? nextMatch.awayTeam.name : nextMatch.homeTeam.name;
      const homeAwayText = isHome ? "HOME" : "AWAY";
      
      const gameDate = new Date(nextMatch.gameDate);
      const now = serverTime;
      const diffTime = gameDate.getTime() - now.getTime();
      
      if (diffTime > 0) {
        const hours = Math.floor(diffTime / (1000 * 60 * 60));
        const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours < 1) {
          return { text: `${minutes}m until ${homeAwayText} vs ${opponent}`, isOffSeason: false };
        } else if (hours < 24) {
          return { text: `${hours}h ${minutes}m until ${homeAwayText} vs ${opponent}`, isOffSeason: false };
        } else {
          const days = Math.floor(hours / 24);
          const remainingHours = hours % 24;
          return { text: `${days}d ${remainingHours}h until ${homeAwayText} vs ${opponent}`, isOffSeason: false };
        }
      } else {
        return { text: `${homeAwayText} vs ${opponent}`, isOffSeason: false };
      }
    }
    
    return { text: "No matches scheduled", isOffSeason: false };
  };

  const getSeasonPhase = (): string => {
    if (!seasonData) return 'Off-Season';
    const { currentDay, phase } = seasonData;
    
    if (currentDay <= 14) return 'Regular Season';
    if (currentDay === 15) return 'Division Playoffs';
    return 'Off-Season';
  };

  const credits = parseInt(String(finances?.credits || "0"));
  const gems = parseInt(String(finances?.gems || "0"));
  const unreadNotifications = (notifications && typeof notifications === 'object' && 'notifications' in notifications && Array.isArray(notifications.notifications)) ? notifications.notifications.filter((n: any) => !n.isRead).length : 0;
  const seasonInfo = seasonData ? `Day ${seasonData.currentDay}/17` : 'Day 9/17';
  const phaseDisplay = getSeasonPhase();
  
  // Enhanced display data
  const enhancedDivisionDisplay = getEnhancedDivisionDisplay(team?.division || 8, team?.subdivision);
  const nextMatchInfo = getNextMatchInfo();
  const countdownText = getNextGameDayCountdown();
  const serverTimeDisplay = serverTime.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/New_York' 
  });
  
  // Check if team has live match - single definition used throughout component
  const userLiveMatch = Array.isArray(liveMatches) ? liveMatches.find(match => 
    match.homeTeam.id === team?.id?.toString() || match.awayTeam.id === team?.id?.toString()
  ) : null;

  if (!isAuthenticated) {
    return (
      <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <button 
              onClick={() => setLocation("/")}
              className="text-xl font-bold text-white hover:text-purple-400 transition-colors"
            >
              Realm Rivalry
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-purple-500/30 shadow-lg">
      {/* Primary Row - Main Navigation & Resources */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          
          {/* Left: Logo & Navigation */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <button 
              onClick={() => setLocation("/")}
              className="text-xl font-bold text-white hover:text-purple-400 transition-colors flex-shrink-0"
            >
              Realm Rivalry
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = location === item.path || 
                  (item.path === '/roster-hq' && location === '/roster-hq') ||
                  (item.path === '/competition' && location === '/competition');

                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-purple-600 text-white shadow-lg transform scale-105"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    <IconComponent className="h-4 w-4 mr-2" />
                    <span className="hidden xl:inline">{item.label}</span>
                    <span className="xl:hidden">{item.shortLabel}</span>
                  </button>
                );
              })}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Right: Resources & Actions */}
          <div className="flex items-center space-x-3">
            {/* Gems */}
            <button
              onClick={() => setLocation("/market")}
              className="flex items-center bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <Star className="h-4 w-4 text-purple-200 mr-1" />
              <span className="text-white font-bold">
                {gems === 0 ? "BUY" : formatCurrency(gems)}
              </span>
              <span className="text-purple-200 ml-1">💎</span>
            </button>
            
            {/* Credits */}
            <button
              onClick={() => setLocation("/market")}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg ${
                credits < 0 
                  ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600" 
                  : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600"
              }`}
            >
              <Coins className="h-4 w-4 text-green-200 mr-1" />
              <span className="text-white font-bold">
                {formatCurrency(credits)}₡
              </span>
            </button>

            {/* Notifications */}
            <button
              onClick={() => setLocation("/community")}
              className="relative p-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[1.2rem] h-5 flex items-center justify-center rounded-full">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Badge>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Row - Team Identity & Status */}
      <div className="bg-gradient-to-r from-purple-900/50 via-blue-900/50 to-indigo-900/50 border-t border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            
            {/* Team Identity */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white leading-tight">
                    {team?.name || 'Team Name'}
                  </h1>
                  <div className="flex items-center space-x-2 text-sm">
                    <Badge className="bg-purple-600/80 text-purple-100 text-xs px-2 py-0.5">
                      {enhancedDivisionDisplay}
                    </Badge>
                    <span className="text-purple-200">•</span>
                    <span className="text-purple-200 font-medium">{seasonInfo}</span>
                    <span className="text-purple-200">•</span>
                    <span className="text-blue-200 font-medium">{phaseDisplay}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Right Section - Live Match, Next Match, Server Time */}
            <div className="hidden md:flex items-center space-x-3">
              
              {/* LIVE Button - Show when team is actively playing */}
              {userLiveMatch && (
                <Button
                  onClick={() => setLocation("/competition?tab=live")}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg animate-pulse"
                >
                  <Play className="w-4 h-4 mr-2" />
                  LIVE
                </Button>
              )}

              {/* Next Match Info */}
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${
                nextMatchInfo.text.includes('LIVE') 
                  ? 'bg-red-500/20 border-red-500/30' 
                  : nextMatchInfo.isOffSeason 
                    ? 'bg-gray-500/20 border-gray-500/30'
                    : 'bg-orange-500/20 border-orange-500/30'
              }`}>
                {nextMatchInfo.text.includes('LIVE') ? (
                  <Zap className="w-4 h-4 text-red-400 animate-pulse" />
                ) : nextMatchInfo.isOffSeason ? (
                  <Calendar className="w-4 h-4 text-gray-400" />
                ) : (
                  <Clock className="w-4 h-4 text-orange-400" />
                )}
                <div className="text-sm">
                  <span className={`font-medium ${
                    nextMatchInfo.text.includes('LIVE') 
                      ? 'text-red-200' 
                      : nextMatchInfo.isOffSeason 
                        ? 'text-gray-200'
                        : 'text-orange-200'
                  }`}>
                    {nextMatchInfo.text.includes('LIVE') ? 'LIVE: ' : 'Next: '}
                  </span>
                  <span className="text-white font-bold">{nextMatchInfo.text}</span>
                </div>
              </div>

              {/* Server Time & Countdown */}
              <div className="flex items-center space-x-2 bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/30">
                <Timer className="w-4 h-4 text-blue-400" />
                <div className="text-sm">
                  <div className="text-blue-200 font-medium">EDT: {serverTimeDisplay}</div>
                  <div className="text-blue-300 text-xs">{countdownText}</div>
                </div>
              </div>
            </div>

            {/* Mobile - Show simplified version */}
            <div className="md:hidden flex items-center space-x-2">
              {userLiveMatch && (
                <Button
                  onClick={() => setLocation("/competition?tab=live")}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold animate-pulse"
                >
                  <Play className="w-3 h-3 mr-1" />
                  LIVE
                </Button>
              )}
              <div className="text-xs text-blue-200">
                {serverTimeDisplay}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-gray-900 border-b border-gray-700 shadow-xl">
          <div className="px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = location === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => {
                    setLocation(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-purple-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                  style={{ minHeight: '44px' }} // iOS touch target
                >
                  <IconComponent className="h-5 w-5 mr-3" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};

export default ModernStickyHeader;