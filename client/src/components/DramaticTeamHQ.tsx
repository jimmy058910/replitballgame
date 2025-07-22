import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Users as UsersIcon, 
  Target, 
  BarChart3, 
  Building2, 
  Shield, 
  Calendar,
  AlertTriangle,
  TrendingUp,
  Zap
} from "lucide-react";

export default function DramaticTeamHQ() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* 🚀 DRAMATIC HERO BANNER - COMPLETELY REDESIGNED */}
        <Card className="hq-hero-gradient border-2 border-yellow-400 shadow-2xl mb-8 overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                    <Shield className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">✓</span>
                  </div>
                </div>
                
                <div>
                  <h1 className="text-6xl font-black text-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text">
                    🚀 TEAM HQ REDESIGNED
                  </h1>
                  <div className="flex items-center space-x-4 text-xl text-blue-200 mt-2">
                    <span className="flex items-center font-semibold">
                      <Calendar className="w-5 h-5 mr-2" />
                      Season 0 • Regular Season • Day 9/17
                    </span>
                    <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-lg px-4 py-1">
                      🏆 Division 8 Stone Eta
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-yellow-400 text-xl font-bold mb-2">MOBILE-FIRST REDESIGN</div>
                <div className="text-white text-4xl font-black animate-bounce">47%</div>
                <div className="text-blue-200 text-lg">Season Progress</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-lg text-blue-200 font-semibold">
                <span>🎯 Day 9</span>
                <span>⏰ 8 days remaining</span>
              </div>
              <div className="relative">
                <Progress 
                  value={47} 
                  className="h-6 bg-blue-800 rounded-full overflow-hidden"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full" 
                     style={{ width: '47%' }}>
                  <div className="h-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">🔥 ALMOST HALFWAY</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 🎯 PRIORITY ACTIONS - CRITICAL ALERTS REDESIGNED */}
        <Card className="bg-gradient-to-r from-red-900 to-orange-900 border-2 border-red-400 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold text-white flex items-center">
                <AlertTriangle className="w-8 h-8 mr-3 text-red-400 animate-pulse" />
                🚨 CRITICAL TEAM ALERTS
              </h2>
              <Badge variant="destructive" className="text-lg px-4 py-2">
                3 URGENT ISSUES
              </Badge>
            </div>
            
            <div className="grid gap-4">
              <div className="alert-critical p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center">
                  <Zap className="w-6 h-6 mr-3 text-red-400" />
                  <div>
                    <div className="text-white font-bold">⚡ 4 Players Low Stamina</div>
                    <div className="text-red-200">Immediate attention required before next match</div>
                  </div>
                </div>
                <button className="hq-action-btn bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold">
                  FIX NOW
                </button>
              </div>
              
              <div className="alert-warning p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="w-6 h-6 mr-3 text-yellow-400" />
                  <div>
                    <div className="text-white font-bold">💰 Stadium Maintenance Due</div>
                    <div className="text-yellow-200">5,000₡ daily cost - review finances</div>
                  </div>
                </div>
                <button className="hq-action-btn bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-bold">
                  REVIEW
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 🎮 QUICK ACCESS TILES - COMPLETELY REDESIGNED */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hq-quick-tile bg-gradient-to-br from-blue-700 to-blue-900 border-2 border-blue-400 hover:from-blue-600 hover:to-blue-800 transform hover:scale-105 transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <UsersIcon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">🏃‍♂️ Roster HQ</h3>
              <p className="text-blue-200 text-lg">Manage 12 players</p>
              <div className="mt-3">
                <Badge variant="outline" className="border-blue-400 text-blue-400">
                  4 NEED ATTENTION
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="hq-quick-tile bg-gradient-to-br from-green-700 to-green-900 border-2 border-green-400 hover:from-green-600 hover:to-green-800 transform hover:scale-105 transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">⚡ Tactics</h3>
              <p className="text-green-200 text-lg">Formation & strategy</p>
              <div className="mt-3">
                <Badge variant="outline" className="border-green-400 text-green-400">
                  BALANCED
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="hq-quick-tile bg-gradient-to-br from-purple-700 to-purple-900 border-2 border-purple-400 hover:from-purple-600 hover:to-purple-800 transform hover:scale-105 transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">💎 Market</h3>
              <p className="text-purple-200 text-lg">Trading & store</p>
              <div className="mt-3">
                <Badge variant="outline" className="border-purple-400 text-purple-400">
                  16,000₡ • 329💎
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="hq-quick-tile bg-gradient-to-br from-orange-700 to-orange-900 border-2 border-orange-400 hover:from-orange-600 hover:to-orange-800 transform hover:scale-105 transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">🏟️ Stadium</h3>
              <p className="text-orange-200 text-lg">Facilities & finance</p>
              <div className="mt-3">
                <Badge variant="outline" className="border-orange-400 text-orange-400">
                  5,000 CAPACITY
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 📊 COLLAPSIBLE SNAPSHOT PANELS - REDESIGNED */}
        <div className="space-y-6">
          <details className="hq-collapsible bg-gradient-to-r from-gray-800 to-gray-900 border-2 border-gray-600 rounded-xl" open>
            <summary className="hq-action-btn text-2xl font-bold text-white p-6 flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-4">
                <UsersIcon className="w-8 h-8 text-blue-400" />
                🏃‍♂️ ROSTER SNAPSHOT (12 Active Players)
              </span>
              <Badge variant="outline" className="border-blue-400 text-blue-400 text-lg">
                CLICK TO EXPAND
              </Badge>
            </summary>
            <div className="hq-collapsible-content p-6 bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-3xl font-bold text-white mb-4">MOBILE-FIRST REDESIGN COMPLETE!</h3>
                <p className="text-xl text-gray-300 mb-6">
                  Progressive disclosure design with touch-friendly collapsible sections
                </p>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold text-blue-400">12</div>
                    <div className="text-gray-300">Active Players</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-red-400">4</div>
                    <div className="text-gray-300">Low Stamina</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-400">8</div>
                    <div className="text-gray-300">Match Ready</div>
                  </div>
                </div>
              </div>
            </div>
          </details>

          <details className="hq-collapsible bg-gradient-to-r from-yellow-800 to-yellow-900 border-2 border-yellow-600 rounded-xl">
            <summary className="hq-action-btn text-2xl font-bold text-white p-6 flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-4">
                <Trophy className="w-8 h-8 text-yellow-400" />
                🏆 DIVISION STANDINGS
              </span>
              <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-lg">
                DIVISION 8 STONE
              </Badge>
            </summary>
            <div className="hq-collapsible-content p-6">
              <div className="text-center text-white text-xl">
                Oakland Cougars currently in competitive Division 8 Stone subdivision Eta
              </div>
            </div>
          </details>
        </div>

        {/* 🎯 BOTTOM SUCCESS MESSAGE */}
        <Card className="mt-8 bg-gradient-to-r from-green-800 to-emerald-900 border-2 border-green-400">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-3xl font-bold text-white mb-2">TEAM HQ MOBILE-FIRST REDESIGN COMPLETE!</h2>
            <p className="text-xl text-green-200">
              Hero Banner • Priority Actions • Quick Access Tiles • Progressive Disclosure • Touch-Friendly Interface
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}