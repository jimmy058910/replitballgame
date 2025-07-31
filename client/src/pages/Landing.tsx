import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/AuthProvider";
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
  Play,
  Clock,
  Building,
  Swords,
  Flame,
  ArrowRight,
  CheckCircle
} from "lucide-react";

export default function Landing() {
  const { login, isAuthenticated, isLoading, user, error } = useAuth();
  
  // Show debug info directly on the page
  console.log('🔍 Landing page - Auth state:', { isAuthenticated, isLoading, userEmail: user?.email });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1b3e] via-[#1a1b3e] to-slate-900">
      {/* Enhanced Debug Panel */}
      <div className="fixed top-4 right-4 bg-black/90 backdrop-blur-sm text-white p-4 rounded-lg text-sm z-50 max-w-sm border border-gray-600 shadow-2xl">
        <div className="font-bold text-yellow-400 mb-2">🔍 Firebase Auth Status:</div>
        
        {/* Authentication Status */}
        <div className="space-y-1 mb-3">
          <div className="flex justify-between">
            <span>Loading:</span>
            <span className={isLoading ? 'text-yellow-300' : 'text-green-400'}>
              {isLoading ? '⏳ Loading...' : '✅ Ready'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Authenticated:</span>
            <span className={isAuthenticated ? 'text-green-400' : 'text-red-400'}>
              {isAuthenticated ? '✅ Success' : '❌ No'}
            </span>
          </div>
          {user?.email && (
            <div className="text-xs bg-green-900/30 p-2 rounded border border-green-500">
              <span className="text-green-300 font-semibold">✅ Logged in as:</span>
              <div className="text-green-200">{user.email}</div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-3 p-2 bg-red-900/30 border border-red-500 rounded text-red-200 text-xs">
            <div className="font-semibold text-red-300">❌ Error:</div>
            <div className="break-words mt-1">{error}</div>
          </div>
        )}

        {/* Domain Status */}
        <div className="text-xs text-gray-300 border-t border-gray-600 pt-2">
          <div className="font-semibold text-blue-300 mb-1">🌐 Current Domain:</div>
          <div className="break-all bg-gray-800 p-1 rounded mb-2 text-green-300">
            {window.location.hostname}
          </div>
          
          {!isAuthenticated && !error && (
            <div className="space-y-1">
              <div className="font-semibold text-yellow-300">💡 Try These Options:</div>
              <div className="text-blue-300">• Click "Start Your Dynasty" (redirect)</div>
              <div className="text-purple-300">• Click "Try Popup Login" (popup backup)</div>
              <div className="text-gray-300">• Check browser console for logs</div>
            </div>
          )}
          
          {isAuthenticated && (
            <div className="text-green-300 font-semibold p-2 bg-green-900/20 rounded">
              🎉 Authentication successful! You should be redirected to the dashboard.
            </div>
          )}
        </div>
      </div>
      
      {/* Hero Section */}
      <div className="relative overflow-hidden min-h-screen flex items-center">
        {/* Dynamic Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#ff6b35]/10 to-[#00d4ff]/10"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ff6b35]/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00d4ff]/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-[#ff6b35]/3 to-[#00d4ff]/3 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Logo */}
          <div className="text-center mb-12">
            <img 
              src="/logo-modern-2.svg" 
              alt="Realm Rivalry" 
              className="mx-auto w-72 md:w-80 h-auto drop-shadow-2xl"
            />
          </div>

          {/* Hero Content */}
          <div className="text-center text-white">
            <div className="mb-8">
              <Badge className="bg-gradient-to-r from-[#ff6b35] to-[#00d4ff] text-white px-6 py-3 text-lg font-bold rounded-full shadow-2xl">
                <Trophy className="w-5 h-5 mr-2" />
                #1 Fantasy Sports Simulation
              </Badge>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 bg-gradient-to-r from-white via-[#00d4ff] to-[#ff6b35] bg-clip-text text-transparent leading-tight">
              Master the Realm
            </h1>
            
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-[#00d4ff] mb-8">
              Build Your Dynasty Using 5 Fantasy Races
            </h2>
            
            <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-5xl mx-auto leading-relaxed">
              Command teams of <span className="text-[#ff6b35] font-semibold">Humans</span>, <span className="text-green-400 font-semibold">Sylvans</span>, <span className="text-red-400 font-semibold">Gryll</span>, <span className="text-yellow-400 font-semibold">Lumina</span>, and <span className="text-purple-400 font-semibold">Umbra</span> in the most intense fantasy sports experience ever created. Every decision matters. Every match counts. Every season builds your legacy.
            </p>

            {/* Dual CTA Strategy */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Button 
                onClick={() => {
                  console.log('🎯 Landing page: Start Your Dynasty button clicked!');
                  login();
                }}
                className="bg-gradient-to-r from-[#ff6b35] to-orange-600 hover:from-orange-600 hover:to-red-600 text-white px-12 py-6 text-xl font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-[#ff6b35]/20"
              >
                <Crown className="w-6 h-6 mr-3" />
                Start Your Dynasty
                <ArrowRight className="w-6 h-6 ml-3" />
              </Button>
              
              {/* Popup Authentication Fallback */}
              <Button 
                onClick={() => {
                  console.log('🪟 Landing page: Popup login button clicked!');
                  login(true); // Use popup authentication
                }}
                variant="outline"
                className="border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400/10 px-12 py-6 text-xl font-semibold rounded-2xl transition-all duration-300 backdrop-blur-sm"
              >
                <AlertCircle className="w-6 h-6 mr-3" />
                Try Popup Login
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  const featuresSection = document.getElementById('features');
                  featuresSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="border-2 border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff]/10 px-12 py-6 text-xl font-semibold rounded-2xl transition-all duration-300 backdrop-blur-sm"
              >
                <Play className="w-6 h-6 mr-3" />
                Watch Live Demo
              </Button>
            </div>

            {/* Season Countdown & Live Stats */}
            <div className="bg-[#1a1b3e]/60 backdrop-blur-sm border border-[#00d4ff]/20 rounded-2xl p-6 max-w-4xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-[#ff6b35]">5</div>
                  <div className="text-[#00d4ff] text-sm font-medium">Fantasy Races</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#ff6b35]">17</div>
                  <div className="text-[#00d4ff] text-sm font-medium">Day Seasons</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#ff6b35]">8</div>
                  <div className="text-[#00d4ff] text-sm font-medium">Divisions</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#ff6b35]">Live</div>
                  <div className="text-[#00d4ff] text-sm font-medium">Simulation</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#ff6b35]">24/7</div>
                  <div className="text-[#00d4ff] text-sm font-medium">Competition</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game-Specific Features Section */}
      <div id="features" className="py-24 bg-slate-900/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
              Unmatched <span className="text-[#ff6b35]">Game Features</span>
            </h2>
            <p className="text-2xl text-blue-200 max-w-4xl mx-auto leading-relaxed">
              Experience the advanced systems that make Realm Rivalry the most sophisticated fantasy sports management game ever created.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Live Match Engine */}
            <Card className="bg-gradient-to-br from-[#1a1b3e] to-slate-800 border-[#00d4ff]/30 hover:border-[#00d4ff] transition-all duration-500 group hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-[#00d4ff]/10">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-gradient-to-r from-[#00d4ff] to-blue-500 p-4 rounded-2xl shadow-lg">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-white group-hover:text-[#00d4ff] transition-colors">2D Live Match Simulation</CardTitle>
                </div>
                <CardDescription className="text-lg text-blue-200 leading-relaxed">
                  Watch your roster and tactical decisions unfold in real-time with priority-based event pacing and dynamic commentary that brings every play to life.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Five Fantasy Races */}
            <Card className="bg-gradient-to-br from-[#1a1b3e] to-slate-800 border-green-500/30 hover:border-green-400 transition-all duration-500 group hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-green-400/10">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-2xl shadow-lg">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-white group-hover:text-green-400 transition-colors">Command 5 Unique Races</CardTitle>
                </div>
                <CardDescription className="text-lg text-blue-200 leading-relaxed">
                  Master the tactical advantages of Humans, Sylvans, Gryll, Lumina, and Umbra - each with distinct abilities, strengths, and strategic gameplay styles.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* 17-Day Seasons */}
            <Card className="bg-gradient-to-br from-[#1a1b3e] to-slate-800 border-[#ff6b35]/30 hover:border-[#ff6b35] transition-all duration-500 group hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-[#ff6b35]/10">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-gradient-to-r from-[#ff6b35] to-red-500 p-4 rounded-2xl shadow-lg">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-white group-hover:text-[#ff6b35] transition-colors">Intense 17-Day Championships</CardTitle>
                </div>
                <CardDescription className="text-lg text-blue-200 leading-relaxed">
                  Experience rapid-fire seasons with 14+ league matches, playoffs, and tournaments in focused competition cycles that keep you engaged.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Stadium Economy */}
            <Card className="bg-gradient-to-br from-[#1a1b3e] to-slate-800 border-yellow-500/30 hover:border-yellow-400 transition-all duration-500 group hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-yellow-400/10">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4 rounded-2xl shadow-lg">
                    <Building className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-white group-hover:text-yellow-400 transition-colors">Build Your Empire</CardTitle>
                </div>
                <CardDescription className="text-lg text-blue-200 leading-relaxed">
                  Upgrade facilities, manage finances, and generate revenue through ticket sales, concessions, and VIP experiences in a dynamic economy.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Advanced Tactics */}
            <Card className="bg-gradient-to-br from-[#1a1b3e] to-slate-800 border-purple-500/30 hover:border-purple-400 transition-all duration-500 group hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-400/10">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-4 rounded-2xl shadow-lg">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-white group-hover:text-purple-400 transition-colors">Deep Strategic Gameplay</CardTitle>
                </div>
                <CardDescription className="text-lg text-blue-200 leading-relaxed">
                  Master field sizes, formations, and player positioning with tactical decisions that directly impact match outcomes and championship success.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* 8-Division Competition */}
            <Card className="bg-gradient-to-br from-[#1a1b3e] to-slate-800 border-red-500/30 hover:border-red-400 transition-all duration-500 group hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-red-400/10">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-gradient-to-r from-red-500 to-pink-500 p-4 rounded-2xl shadow-lg">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-white group-hover:text-red-400 transition-colors">Climb the Competitive Ladder</CardTitle>
                </div>
                <CardDescription className="text-lg text-blue-200 leading-relaxed">
                  Battle through 8 competitive divisions with playoffs, promotions, relegations, and championship glory in an ever-evolving competitive landscape.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* Why Choose Realm Rivalry */}
      <div className="py-24 bg-gradient-to-r from-[#1a1b3e] to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
              Why Choose <span className="text-[#ff6b35]">Realm Rivalry</span>?
            </h2>
            <p className="text-2xl text-blue-200 max-w-4xl mx-auto">
              Experience competitive advantages that no other fantasy sports platform can match.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="bg-gradient-to-r from-[#ff6b35] to-red-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Flame className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Most Advanced Fantasy Engine</h3>
              <ul className="text-blue-200 space-y-2 text-left">
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#00d4ff] flex-shrink-0" />Real-time match simulation with tactical depth</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#00d4ff] flex-shrink-0" />5 unique fantasy races with distinct gameplay</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#00d4ff] flex-shrink-0" />Live commentary and dynamic event prioritization</li>
              </ul>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-r from-[#00d4ff] to-blue-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Clock className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Rapid Competition Cycles</h3>
              <ul className="text-blue-200 space-y-2 text-left">
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#ff6b35] flex-shrink-0" />17-day seasons keep engagement high</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#ff6b35] flex-shrink-0" />Multiple tournaments and championship opportunities</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#ff6b35] flex-shrink-0" />Continuous progression and achievement systems</li>
              </ul>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Swords className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Strategic Depth Meets Accessibility</h3>
              <ul className="text-blue-200 space-y-2 text-left">
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />Easy to learn, impossible to master</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />Deep tactical options and player marketplace</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />Social competition with friends and rivals</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof & Urgency */}
      <div className="py-16 bg-gradient-to-r from-slate-900 to-[#1a1b3e]">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-[#ff6b35]/20 to-[#00d4ff]/20 backdrop-blur-sm border border-[#ff6b35]/30 rounded-2xl p-8">
            <h3 className="text-3xl font-bold text-white mb-4">Don't Get Left Behind!</h3>
            <p className="text-xl text-blue-200 mb-6">
              Join the champions who've claimed Championships and prepare to take them down in the ultimate fantasy sports battleground.
            </p>
            <div className="text-[#ff6b35] text-2xl font-bold">
              Season 1 • Division Signups Open • Limited Slots Available
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="py-32 bg-gradient-to-br from-[#ff6b35] via-red-600 to-orange-700">
        <div className="max-w-6xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">
            Ready to Build Your Legacy?
          </h2>
          <p className="text-2xl text-orange-100 mb-12 max-w-4xl mx-auto leading-relaxed">
            Join the ultimate fantasy sports experience where strategy meets excitement. Your championship journey starts now.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <Button 
              onClick={() => {
                console.log('🎯 Landing page: Final CTA Start Your Dynasty button clicked!');
                login();
              }}
              className="bg-white hover:bg-gray-100 text-[#ff6b35] px-16 py-6 text-2xl font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl"
            >
              <Crown className="w-8 h-8 mr-4" />
              Start Your Dynasty
              <ArrowRight className="w-8 h-8 ml-4" />
            </Button>
          </div>

          {/* Authentication Notice */}
          <div className="bg-red-800/30 backdrop-blur-sm border border-red-400/50 rounded-2xl p-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-3">
              <AlertCircle className="w-6 h-6 text-red-200" />
              <span className="text-red-200 font-bold text-lg">Authentication Required</span>
            </div>
            <p className="text-red-100 text-lg">
              This application requires authentication to save your progress. Please ensure cookies are enabled and avoid using incognito/private browsing mode.
            </p>
          </div>

          {/* Manual Link */}
          <div className="mt-12 text-center">
            <p className="text-orange-200 text-lg">
              Still not decided? <a href="/help" className="text-white hover:text-orange-100 underline font-bold text-xl">Check out our full game manual!</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}