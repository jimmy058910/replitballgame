import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Navigation() {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  const navItems = [
    { path: "/", label: "Dashboard", icon: "fas fa-home" },
    { path: "/team", label: "My Team", icon: "fas fa-users" },
    { path: "/league", label: "League", icon: "fas fa-trophy" },
    { path: "/marketplace", label: "Marketplace", icon: "fas fa-store" },
    { path: "/match", label: "Matches", icon: "fas fa-play-circle" },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <h1 className="font-orbitron font-bold text-xl text-gold-400">REALM RIVALRY</h1>
              </div>
              <div className="hidden md:block">
                <div className="flex items-baseline space-x-4">
                  {navItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => setLocation(item.path)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        location === item.path
                          ? "bg-primary-700 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {team && (
                <div className="flex items-center space-x-2 bg-gray-700 px-3 py-1 rounded-lg">
                  <i className="fas fa-coins text-gold-400"></i>
                  <span className="font-semibold">{team.credits?.toLocaleString()}</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/api/logout'}
              >
                <i className="fas fa-sign-out-alt mr-2"></i>Logout
              </Button>
              
              {/* Mobile menu button */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden">
                    <i className="fas fa-bars"></i>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="bg-gray-800 border-gray-700">
                  <div className="flex flex-col space-y-4 mt-8">
                    {navItems.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => {
                          setLocation(item.path);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          location === item.path
                            ? "bg-primary-700 text-white"
                            : "text-gray-300 hover:bg-gray-700 hover:text-white"
                        }`}
                      >
                        <i className={`${item.icon} w-5`}></i>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 z-50">
        <div className="grid grid-cols-5 gap-1 p-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center justify-center py-2 rounded-lg transition-colors ${
                location === item.path
                  ? "text-primary-400 bg-primary-400 bg-opacity-10"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <i className={`${item.icon} text-lg mb-1`}></i>
              <span className="text-xs">{item.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Add bottom padding to prevent content from being hidden behind mobile nav */}
      <div className="md:hidden h-20"></div>
    </>
  );
}
