import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Home, Users, Trophy, Medal, Gamepad2, ShoppingCart, 
  Building, Package, Store, Menu, LogOut, Coins 
} from "lucide-react";

export default function Navigation() {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  const { data: finances } = useQuery({
    queryKey: ["/api/teams/my/finances"],
  });

  const { data: storeData } = useQuery({
    queryKey: ["/api/store/ads"],
  });

  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/team", label: "Team", icon: Users },
    { path: "/league", label: "League", icon: Trophy },
    { path: "/tournaments", label: "Tournaments", icon: Medal },
    { path: "/exhibitions", label: "Exhibitions", icon: Gamepad2 },
    { path: "/store", label: "Store", icon: ShoppingCart },
    { path: "/stadium", label: "Stadium", icon: Building },
    { path: "/inventory", label: "Inventory", icon: Package },
    { path: "/marketplace", label: "Marketplace", icon: Store },
  ];

  const credits = finances?.credits || team?.credits || 15000;
  const premiumCurrency = storeData?.premiumCurrency || 0;

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
          <div className="hidden xl:flex items-center space-x-1">
            {navItems.map((item) => {
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
            {/* Premium Currency Display */}
            <div className="flex items-center bg-purple-700 px-2 py-1 rounded text-xs font-semibold">
              <Coins className="h-3 w-3 text-purple-300 mr-1" />
              <span className="text-white">{premiumCurrency.toLocaleString()}</span>
              <span className="text-purple-300 ml-1">💎</span>
            </div>
            
            {/* Credits Display */}
            <div className="flex items-center bg-gray-700 px-2 py-1 rounded text-xs font-semibold">
              <Coins className="h-3 w-3 text-yellow-400 mr-1" />
              <span className="text-white">{credits.toLocaleString()}</span>
              <span className="text-yellow-400 ml-1">₡</span>
            </div>

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

            {/* Mobile Menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="xl:hidden h-8 px-2">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-gray-800 border-gray-700 w-80">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="border-b border-gray-700 pb-4 mb-6">
                    <h2 className="text-xl font-bold text-white">Realm Rivalry</h2>
                    <div className="flex items-center mt-2 bg-gray-700 px-3 py-2 rounded">
                      <Coins className="h-4 w-4 text-yellow-400 mr-2" />
                      <span className="font-semibold text-white">{credits.toLocaleString()}</span>
                      <span className="text-yellow-400 ml-1">₡</span>
                    </div>
                  </div>

                  {/* Navigation Items */}
                  <div className="flex-1 space-y-2">
                    {navItems.map((item) => {
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
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}