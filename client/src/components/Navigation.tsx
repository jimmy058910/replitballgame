import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import NotificationSystem from "@/components/NotificationSystem";
import { 
  Home, Users, Trophy, ShoppingCart, Globe, MessageCircle,
  Menu, LogOut, Coins, UserPlus, LogIn
} from "lucide-react";

// Type interfaces for API responses - match the actual API response exactly
interface Finances {
  id: number;
  teamId: number;
  credits: string;
  gems: string;
  escrowCredits: string;
  escrowGems: string;
  projectedIncome: string;
  projectedExpenses: string;
  lastSeasonRevenue: string;
  lastSeasonExpenses: string;
  facilitiesMaintenanceCost: string;
  createdAt: string;
  updatedAt: string;
}

interface Team {
  id: number;
  userProfileId: number;
  name: string;
  logoUrl: string | null;
  isAI: boolean;
  createdAt: string;
  updatedAt: string;
  camaraderie: number;
  fanLoyalty: number;
  homeField: string;
  tacticalFocus: string;
  leagueId: number | null;
  division: number;
  subdivision: string;
  wins: number;
  losses: number;
  points: number;
  finances: Finances;
  stadium: any;
  players: any[];
  staff: any[];
  teamPower: number;
  teamCamaraderie: number;
}

interface StoreData {
  adsWatchedToday: number;
  rewardedAdsCompletedToday: number;
}

export default function Navigation() {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, isLoading, login, logout } = useAuth();

  // TEMPORARY: Force query to run to test if API works
  const { data: team, isLoading: teamLoading, error: teamError } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
    enabled: true, // TEMPORARILY bypass auth check to test
    retry: 3,
    staleTime: 30000,
  });

  // Use credits from team.finances data (already included in team response)  
  const credits = parseInt(String(team?.finances?.credits || "0"));
  const premiumCurrency = parseInt(String(team?.finances?.gems || "0"));

  // IMMEDIATE DEBUG - Log exact values
  console.log("🚨 NAVIGATION DEBUG:", {
    isAuthenticated,
    isLoading,
    teamLoading,
    hasTeam: !!team,
    credits,
    teamFinancesCredits: team?.finances?.credits,
    teamError: teamError?.message,
    rawTeam: team
  });

  const { data: storeData } = useQuery<StoreData>({
    queryKey: ["/api/store/ads"],
    enabled: isAuthenticated,
  });

  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/team", label: "Team", icon: Users },
    { path: "/competition", label: "Competition", icon: Trophy },
    { path: "/market", label: "Market", icon: ShoppingCart },
    { path: "/world", label: "World", icon: Globe },
    { path: "/community", label: "Community", icon: MessageCircle },
  ];

  return (
    <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <div className="flex-shrink-0">
            <button 
              onClick={() => setLocation("/")}
              className="text-lg lg:text-xl font-bold text-white hover:text-blue-400 transition-colors"
            >
              Realm Rivalry
            </button>
          </div>

          {/* Desktop Navigation - Hidden on mobile/tablet */}
          <div className="hidden lg:flex items-center space-x-1">
            {isAuthenticated && navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  className={`flex items-center px-2 py-2 rounded-md text-xs font-medium transition-colors ${
                    location === item.path
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <IconComponent className="h-3 w-3 mr-1" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right side - Credits and Actions */}
          <div className="flex items-center space-x-2">
            {isAuthenticated ? (
              <>
                {/* Premium Currency Display - Clickable */}
                <button
                  onClick={() => setLocation("/market")}
                  className="flex items-center bg-purple-700 hover:bg-purple-600 px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Coins className="h-3 w-3 text-purple-300 mr-1" />
                  <span className="text-white">
                    {premiumCurrency === 0 ? "BUY" : premiumCurrency.toLocaleString()}
                  </span>
                  <span className="text-purple-300 ml-1">💎</span>
                </button>
                
                {/* Credits Display - Clickable */}
                <button
                  onClick={() => setLocation("/market")}
                  className="flex items-center bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Coins className="h-3 w-3 text-yellow-400 mr-1" />
                  <span className="text-white">{teamLoading ? "..." : credits.toLocaleString()}</span>
                  <span className="text-yellow-400 ml-1">₡</span>
                </button>

                {/* Notifications */}
                <NotificationSystem />

                {/* Desktop Logout */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="hidden sm:flex h-8 px-2 text-xs text-red-400 hover:bg-red-400 hover:text-white"
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  Exit
                </Button>
              </>
            ) : (
              <>
                {/* Non-authenticated user buttons */}
                <Button
                  size="sm"
                  variant="ghost"
                  // @ts-expect-error TS2322
                  onClick={login}
                  className="hidden sm:flex h-8 px-3 text-xs text-blue-400 hover:bg-blue-400 hover:text-white"
                >
                  <LogIn className="h-3 w-3 mr-1" />
                  Login
                </Button>
              </>
            )}

            {/* Mobile Menu Button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="sm:hidden h-8 w-8 p-0 text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Open mobile menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0 bg-gray-800 border-l border-gray-700">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="p-4 border-b border-gray-700">
                    <h2 className="text-lg font-bold text-white">Menu</h2>
                  </div>

                  {/* Mobile Navigation */}
                  <div className="flex-1 overflow-y-auto p-2">
                    {isAuthenticated && (
                      <>
                        {/* Credits Display for Mobile */}
                        <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <Coins className="h-4 w-4 text-yellow-400 mr-2" />
                              <span className="text-sm font-medium text-white">Credits</span>
                            </div>
                            <span className="text-sm font-bold text-white">{teamLoading ? "..." : credits.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Coins className="h-4 w-4 text-purple-300 mr-2" />
                              <span className="text-sm font-medium text-white">Gems</span>
                            </div>
                            <span className="text-sm font-bold text-white">
                              {premiumCurrency === 0 ? "0" : premiumCurrency.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Navigation Items */}
                        <div className="space-y-2">
                          {navItems.map((item) => {
                            const IconComponent = item.icon;
                            return (
                              <button
                                key={item.path}
                                onClick={() => {
                                  setLocation(item.path);
                                  setIsMobileMenuOpen(false);
                                }}
                                className={`w-full flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                                  location === item.path
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                                }`}
                              >
                                <IconComponent className="h-4 w-4 mr-3" />
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {!isAuthenticated && (
                      <div className="space-y-2">
                        <Button
                          onClick={() => {
                            login();
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <LogIn className="h-4 w-4 mr-2" />
                          Login
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {isAuthenticated && (
                    <div className="border-t border-gray-700 pt-4">
                      <Button
                        variant="outline"
                        onClick={logout}
                        className="w-full text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}