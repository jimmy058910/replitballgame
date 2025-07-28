import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { 
  Home, Users, Trophy, ShoppingCart, Globe, MessageCircle, 
  Bell, Menu, X, Coins, Star, Clock, Calendar,
  ChevronDown, Zap
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
}

const ModernStickyHeader: React.FC = () => {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  // Data queries
  const { data: team } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
    enabled: isAuthenticated,
  });

  const { data: finances } = useQuery<Finances>({
    queryKey: [`/api/teams/${team?.id}/finances`],
    enabled: !!team?.id && isAuthenticated,
  });

  const { data: seasonData } = useQuery<SeasonData>({
    queryKey: ['/api/season/current-cycle'],
    enabled: isAuthenticated,
  });

  const { data: notifications } = useQuery({
    queryKey: [`/api/teams/${team?.id}/notifications`],
    enabled: !!team?.id && isAuthenticated,
  });

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

  const getSeasonPhase = (): string => {
    if (!seasonData) return 'Off-Season';
    const { currentDay, phase } = seasonData;
    
    if (currentDay <= 14) return 'Regular Season';
    if (currentDay === 15) return 'Division Playoffs';
    return 'Off-Season';
  };

  const credits = parseInt(String(finances?.credits || "0"));
  const gems = parseInt(String(finances?.gems || "0"));
  const unreadNotifications = Array.isArray(notifications) ? notifications.filter((n: any) => !n.isRead).length : 0;
  const seasonInfo = seasonData ? `Day ${seasonData.currentDay}/17` : 'Day 9/17';
  const phaseDisplay = getSeasonPhase();

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
                      {getDivisionName(team?.division || 8)}
                    </Badge>
                    <span className="text-purple-200">•</span>
                    <span className="text-purple-200 font-medium">{seasonInfo}</span>
                    <span className="text-purple-200">•</span>
                    <span className="text-blue-200 font-medium">{phaseDisplay}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Match / Live Status */}
            <div className="hidden md:flex items-center space-x-4">
              {seasonData?.nextMatchCountdown && (
                <div className="flex items-center space-x-2 bg-orange-500/20 px-3 py-1.5 rounded-lg border border-orange-500/30">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <div className="text-sm">
                    <span className="text-orange-200 font-medium">Next: </span>
                    <span className="text-white font-bold">
                      {seasonData.nextOpponent ? `vs ${seasonData.nextOpponent}` : 'TBD'}
                    </span>
                    <span className="text-orange-300 ml-1">{seasonData.nextMatchCountdown}</span>
                  </div>
                </div>
              )}
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