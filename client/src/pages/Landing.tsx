import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  Trophy, 
  Users, 
  Zap, 
  Target, 
  Crown, 
  Gamepad2,
  TrendingUp,
  Shield,
  Star,
  ChevronRight,
  Play
} from "lucide-react";

export default function Landing() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="mb-6">
              <img 
                src="/logo-modern-2.svg" 
                alt="Realm Rivalry" 
                className="mx-auto w-80 h-auto drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Hero Content */}
          <div className="text-center text-white">
            <div className="mb-6">
              <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 text-sm font-semibold">
                🏆 #1 Fantasy Sports Simulation
              </Badge>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Assemble Your Roster!
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-4xl mx-auto leading-relaxed">
              Build the ultimate fantasy team with 5 unique races, master advanced tactics, 
              and compete in dynamic leagues with live match simulations.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-2xl"
              >
                <Crown className="w-5 h-5 mr-2" />
                Create Your Team Now
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  const featuresSection = document.getElementById('features');
                  featuresSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="border-2 border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300"
              >
                <Play className="w-5 h-5 mr-2" />
                Game Features
              </Button>
            </div>


          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Choose Realm Rivalry?
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Experience the most advanced fantasy sports management platform with cutting-edge features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1: Live Match Simulation */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-blue-500 transition-all duration-300 group">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Gamepad2 className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-white text-xl">Live Match Simulation</CardTitle>
                <CardDescription className="text-slate-300">
                  Watch your team compete in real-time with dynamic play-by-play action, tactical decisions, and immersive arena visualization.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 2: 5 Unique Fantasy Races */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-green-500 transition-all duration-300 group">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-white text-xl">5 Fantasy Races</CardTitle>
                <CardDescription className="text-slate-300">
                  Command teams of Humans, Sylvans, Gryll, Lumina, and Umbra - each with unique abilities, strengths, and tactical advantages.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 3: Advanced Tactical System */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-purple-500 transition-all duration-300 group">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-white text-xl">Advanced Tactics</CardTitle>
                <CardDescription className="text-slate-300">
                  Master field sizes, tactical focus, and formations. Your strategic decisions directly impact match outcomes and team performance.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 4: Dynamic Economy */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-yellow-500 transition-all duration-300 group">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-white text-xl">Dynamic Economy</CardTitle>
                <CardDescription className="text-slate-300">
                  Negotiate player and staff contracts, build up your stadium and fan base, manage finances with dual currency system (Credits & Gems).
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 5: Player Development */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-red-500 transition-all duration-300 group">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-white text-xl">Player Development</CardTitle>
                <CardDescription className="text-slate-300">
                  Develop players through skills progression, manage injuries, stamina, aging, and career milestones in authentic simulation.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 6: Competitive Leagues */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-cyan-500 transition-all duration-300 group">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-white text-xl">8-Division System</CardTitle>
                <CardDescription className="text-slate-300">
                  Manage your team and fight your way to the top! Battle through 8 competitive divisions with playoffs, promotions, and championship glory.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-blue-900 to-purple-900">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Build Your Legacy?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join the ultimate fantasy sports experience where strategy meets excitement. Your championship journey starts now.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-gradient-to-r from-white to-blue-100 hover:from-blue-50 hover:to-blue-200 text-blue-900 px-10 py-4 text-xl font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-2xl"
            >
              <Crown className="w-6 h-6 mr-3" />
              Start Your Dynasty
              <ChevronRight className="w-6 h-6 ml-3" />
            </Button>
          </div>

          {/* Authentication Notice */}
          <div className="mt-12 bg-blue-800/30 border border-blue-500/50 rounded-lg p-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-blue-300" />
              <span className="text-blue-300 font-semibold">Authentication Required</span>
            </div>
            <p className="text-blue-200 text-sm">
              This application requires authentication to save your progress. Please ensure cookies are enabled and avoid using incognito/private browsing mode.
            </p>
          </div>

          {/* Manual Link */}
          <div className="mt-8 text-center">
            <p className="text-blue-300 text-sm">
              Still not decided? <a href="/help" className="text-blue-200 hover:text-white underline font-semibold">Check out our full game manual!</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
