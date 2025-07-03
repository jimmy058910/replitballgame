import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import NotificationSystem from "@/components/NotificationSystem";
import { 
  Home, Users, Trophy, ShoppingCart, Globe, MessageCircle,
  Menu, LogOut, Coins, UserPlus, LogIn
} from "lucide-react";

// Type interfaces for API responses
interface Team {
  id: string;
  name: string;
  credits: number;
}

interface Finances {
  credits: number;
  premiumCurrency: number;
}

interface StoreData {
  adsWatchedToday: number;
  rewardedAdsCompletedToday: number;
}

export default function Navigation() {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();

  const { data: team } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
    enabled: isAuthenticated,
  });

  const { data: finances } = useQuery<Finances>({
    queryKey: [`/api/teams/${team?.id}/finances`],
    enabled: !!team?.id && isAuthenticated,
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

  const credits = finances?.credits || team?.credits || 0;
  const premiumCurrency = finances?.premiumCurrency || 0;



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
                  onClick={() => setLocation("/store")}
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
                  onClick={() => setLocation("/payments")}
                  className="flex items-center bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Coins className="h-3 w-3 text-yellow-400 mr-1" />
                  <span className="text-white">{credits.toLocaleString()}</span>
                  <span className="text-yellow-400 ml-1">₡</span>
                </button>

                {/* Notifications */}
                <NotificationSystem />

                {/* Desktop Logout */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/api/logout'}
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
                  onClick={() => window.location.href = '/api/login'}
                  className="hidden sm:flex h-8 px-3 text-xs text-blue-400 hover:bg-blue-400 hover:text-white"
                >
                  <LogIn className="h-3 w-3 mr-1" />
                  LOG IN
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.href = '/api/login'}
                  className="hidden sm:flex h-8 px-3 text-xs border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white"
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  SIGN UP
                </Button>
              </>
            )}

            {/* Mobile Menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden h-8 px-2">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-gray-800 border-gray-700 w-80">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="border-b border-gray-700 pb-4 mb-6">
                    <h2 className="text-xl font-bold text-white">Realm Rivalry</h2>
                    
                    {isAuthenticated ? (
                      /* Mobile Credits - Clickable */
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => {
                            setLocation("/store");
                            setIsMobileMenuOpen(false);
                          }}
                          className="flex items-center bg-purple-700 hover:bg-purple-600 px-3 py-2 rounded transition-colors cursor-pointer"
                        >
                          <Coins className="h-4 w-4 text-purple-300 mr-2" />
                          <span className="font-semibold text-white">
                            {premiumCurrency === 0 ? "BUY" : premiumCurrency.toLocaleString()}
                          </span>
                          <span className="text-purple-300 ml-1">💎</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setLocation("/payments");
                            setIsMobileMenuOpen(false);
                          }}
                          className="flex items-center bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded transition-colors cursor-pointer"
                        >
                          <Coins className="h-4 w-4 text-yellow-400 mr-2" />
                          <span className="font-semibold text-white">{credits.toLocaleString()}</span>
                          <span className="text-yellow-400 ml-1">₡</span>
                        </button>
                      </div>
                    ) : (
                      /* Mobile Auth Buttons */
                      <div className="flex flex-col gap-2 mt-2">
                        <Button
                          variant="outline"
                          onClick={() => window.location.href = '/api/login'}
                          className="w-full border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white"
                        >
                          <LogIn className="h-4 w-4 mr-2" />
                          LOG IN
                        </Button>
                        
                        <Button
                          onClick={() => window.location.href = '/api/login'}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          SIGN UP
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Navigation Items */}
                  <div className="flex-1 space-y-2">
                    {isAuthenticated && navItems.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            setLocation(item.path);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors ${
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

                  {/* Footer */}
                  {isAuthenticated && (
                    <div className="border-t border-gray-700 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => window.location.href = '/api/logout'}
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