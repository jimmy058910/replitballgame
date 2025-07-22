import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSeasonalUI } from "@/hooks/useSeasonalUI";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import NotificationSystem from "@/components/NotificationSystem";
import { Badge } from "@/components/ui/badge";
import { 
  Home, Users, Trophy, ShoppingCart, Globe, 
  Menu, LogOut, Coins, UserPlus, LogIn, Command, 
  Gamepad2, MapPin, TrendingUp
} from "lucide-react";

// Enhanced interface for team data
interface Team {
  id: string;
  name: string;
  credits: number;
  division: number;
  subdivision?: string;
}

interface Finances {
  credits: number;
  gems: number;
}

export default function NewNavigation() {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const { seasonalState } = useSeasonalUI();

  const { data: team } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
    enabled: isAuthenticated,
  });

  const { data: finances } = useQuery<Finances>({
    queryKey: [`/api/teams/${team?.id}/finances`],
    enabled: !!team?.id && isAuthenticated,
  });

  // New 5-hub navigation system
  const navHubs = [
    { 
      path: "/", 
      label: "Team HQ", 
      icon: Command, 
      id: "team-hq",
      description: "Mission control for daily operations",
      badge: seasonalState.currentPhase === 'PRE_SEASON' ? 'Setup' : undefined
    },
    { 
      path: "/roster-hq", 
      label: "Roster HQ", 
      icon: Users, 
      id: "roster-hq",
      description: "Team & player management",
      badge: undefined
    },
    { 
      path: "/competition", 
      label: "Competition Center", 
      icon: Trophy, 
      id: "competition-center",
      description: "Leagues, tournaments & live matches",
      badge: seasonalState.currentPhase === 'DIVISION_TOURNAMENT' ? 'Tournament' : undefined
    },
    { 
      path: "/market", 
      label: "Market District", 
      icon: ShoppingCart,
      id: "market-district",
      description: "Trading, store & transactions",
      badge: undefined
    },
    { 
      path: "/community", 
      label: "Community Portal", 
      icon: Globe,
      id: "community",
      description: "Social features & world rankings",
      badge: undefined
    }
  ];

  const credits = parseInt(String(finances?.credits || "0"));
  const premiumCurrency = finances?.gems || 0;

  // Mobile bottom navigation for touch devices
  const MobileBottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 z-50 md:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {navHubs.map((hub) => {
          const IconComponent = hub.icon;
          const isActive = location === hub.path || 
            (location.startsWith('/team') && hub.id === 'roster-hq') ||
            (location.startsWith('/market') && hub.id === 'market-district');
          const isHighlighted = seasonalState.navHighlight === hub.id;
          
          return (
            <button
              key={hub.path}
              onClick={() => setLocation(hub.path)}
              className={`flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 rounded-lg transition-all duration-200 relative ${
                isActive
                  ? "bg-blue-600 text-white"
                  : isHighlighted
                  ? "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30"
                  : "text-gray-400 hover:bg-gray-700 hover:text-white"
              }`}
            >
              <IconComponent className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium truncate leading-tight">{hub.label.split(' ')[0]}</span>
              {hub.badge && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 text-xs px-1 py-0">
                  {hub.badge}
                </Badge>
              )}
              {isHighlighted && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Desktop/tablet horizontal navigation
  const DesktopNav = () => (
    <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <button 
              onClick={() => setLocation("/")}
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <img 
                src="/realm-rivalry-logo.png" 
                alt="Realm Rivalry" 
                className="h-10 w-auto"
              />
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {isAuthenticated && navHubs.map((hub) => {
              const IconComponent = hub.icon;
              const isActive = location === hub.path || 
                (location.startsWith('/team') && hub.id === 'roster-hq') ||
                (location.startsWith('/market') && hub.id === 'market-district');
              const isHighlighted = seasonalState.navHighlight === hub.id;
              
              return (
                <div key={hub.path} className="relative">
                  <button
                    onClick={() => setLocation(hub.path)}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 relative ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : isHighlighted
                        ? "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    <IconComponent className="h-4 w-4 mr-2" />
                    <span className="hidden lg:inline">{hub.label}</span>
                    <span className="lg:hidden">{hub.label.split(' ')[0]}</span>
                    {hub.badge && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {hub.badge}
                      </Badge>
                    )}
                  </button>
                  {isHighlighted && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Right side - Currency and Actions */}
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                {/* Seasonal Context Indicator */}
                <div className="hidden md:flex items-center bg-gray-700 px-3 py-1 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      seasonalState.currentPhase === 'REGULAR_SEASON' ? 'bg-green-400' :
                      seasonalState.currentPhase === 'DIVISION_TOURNAMENT' ? 'bg-yellow-400' :
                      seasonalState.currentPhase === 'OFF_SEASON' ? 'bg-blue-400' :
                      'bg-orange-400'
                    }`} />
                    <span className="text-xs text-gray-300">
                      Day {seasonalState.gameDay}/17
                    </span>
                  </div>
                </div>

                {/* Premium Currency */}
                <button
                  onClick={() => setLocation("/market-district")}
                  className="flex items-center bg-purple-700 hover:bg-purple-600 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Coins className="h-4 w-4 text-purple-300 mr-1" />
                  <span className="text-white">
                    {premiumCurrency === 0 ? "BUY" : premiumCurrency.toLocaleString()}
                  </span>
                  <span className="text-purple-300 ml-1">💎</span>
                </button>
                
                {/* Credits */}
                <button
                  onClick={() => setLocation("/market-district")}
                  className="flex items-center bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Coins className="h-4 w-4 text-yellow-400 mr-1" />
                  <span className="text-white">{credits.toLocaleString()}</span>
                  <span className="text-yellow-400 ml-1">₡</span>
                </button>

                {/* Mobile Menu Button */}
                <div className="md:hidden">
                  <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-80">
                      <div className="flex flex-col space-y-4 mt-8">
                        <div className="text-lg font-semibold text-center mb-4">
                          Quick Navigation
                        </div>
                        {navHubs.map((hub) => {
                          const IconComponent = hub.icon;
                          return (
                            <button
                              key={hub.path}
                              onClick={() => {
                                setLocation(hub.path);
                                setIsMobileMenuOpen(false);
                              }}
                              className="flex items-center p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              <IconComponent className="h-5 w-5 mr-3" />
                              <div className="flex-1 text-left">
                                <div className="font-medium">{hub.label}</div>
                                <div className="text-sm text-gray-500">{hub.description}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Notifications */}
                <NotificationSystem />

                {/* Logout */}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => window.location.href = "/api/auth/logout"}
                  className="hidden lg:flex"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => window.location.href = "/api/auth/login"}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      <DesktopNav />
      {isAuthenticated && <MobileBottomNav />}
    </>
  );
}