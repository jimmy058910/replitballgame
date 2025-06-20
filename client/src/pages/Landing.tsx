import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="pt-20 pb-16 text-center">
          <div className="mb-8">
            <img 
              src="/realm-rivalry-logo.svg" 
              alt="Realm Rivalry" 
              className="mx-auto mb-4 w-64 h-auto"
            />
          </div>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Build your ultimate fantasy team with diverse races, compete in leagues, and dominate the field in this immersive sports management experience.
          </p>
          
          {/* Authentication Notice */}
          <div className="bg-amber-900/30 border border-amber-500/50 rounded-lg p-4 mb-8 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-semibold">Authentication Required</span>
            </div>
            <p className="text-amber-200 text-sm">
              This application requires authentication to save your progress. Please ensure cookies are enabled and avoid using incognito/private browsing mode.
            </p>
          </div>
          
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            Start Your Journey
          </Button>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-16">
          <Card className="bg-gray-800 border-gray-700 hover:border-race-sylvan transition-colors">
            <CardHeader>
              <div className="w-16 h-16 bg-race-sylvan bg-opacity-20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <img src="/icon-multiple-races.svg" alt="Multiple Races" className="w-12 h-12" />
              </div>
              <CardTitle className="text-white text-center">Multiple Races</CardTitle>
              <CardDescription className="text-center">
                Command diverse fantasy races including Sylvans, Gryll, Lumina, Umbra, and Humans, each with unique abilities.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-primary-500 transition-colors">
            <CardHeader>
              <div className="w-16 h-16 bg-primary-500 bg-opacity-20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <img src="/icon-team-management.svg" alt="Team Management" className="w-12 h-12" />
              </div>
              <CardTitle className="text-white text-center">Team Management</CardTitle>
              <CardDescription className="text-center">
                Recruit, train, and manage your team of 10 players with deep attribute systems and progression mechanics.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-gold-400 transition-colors">
            <CardHeader>
              <div className="w-16 h-16 bg-gold-400 bg-opacity-20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <img src="/icon-league-competition.svg" alt="League Competition" className="w-12 h-12" />
              </div>
              <CardTitle className="text-white text-center">League Competition</CardTitle>
              <CardDescription className="text-center">
                Compete in division-based leagues with promotion/relegation systems and seasonal tournaments.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-race-gryll transition-colors">
            <CardHeader>
              <div className="w-16 h-16 bg-race-gryll bg-opacity-20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <img src="/icon-match-simulation.svg" alt="Match Simulation" className="w-12 h-12" />
              </div>
              <CardTitle className="text-white text-center">Match Simulation</CardTitle>
              <CardDescription className="text-center">
                Watch live 2D match simulations with real-time commentary and tactical decision-making.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-race-lumina transition-colors">
            <CardHeader>
              <div className="w-16 h-16 bg-race-lumina bg-opacity-20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <img src="/icon-marketplace.svg" alt="Player Marketplace" className="w-12 h-12" />
              </div>
              <CardTitle className="text-white text-center">Player Marketplace</CardTitle>
              <CardDescription className="text-center">
                Trade players in a dynamic marketplace with bidding systems and contract negotiations.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-race-umbra transition-colors">
            <CardHeader>
              <div className="w-16 h-16 bg-race-umbra bg-opacity-20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <img src="/icon-strategy.svg" alt="Deep Strategy" className="w-12 h-12" />
              </div>
              <CardTitle className="text-white text-center">Deep Strategy</CardTitle>
              <CardDescription className="text-center">
                Develop tactics, manage finances, hire staff, and make strategic decisions to build your dynasty.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Race Showcase */}
        <div className="py-16">
          <h2 className="font-orbitron text-3xl font-bold text-center mb-12">Choose Your Champions</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-race-human bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-race-human overflow-hidden">
                <img src="/race-human.svg" alt="Humans" className="w-16 h-16" />
              </div>
              <h3 className="font-semibold text-race-human">Humans</h3>
              <p className="text-sm text-gray-400 mt-2">Balanced and adaptable</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-race-sylvan bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-race-sylvan overflow-hidden">
                <img src="/race-sylvan.svg" alt="Sylvans" className="w-16 h-16" />
              </div>
              <h3 className="font-semibold text-race-sylvan">Sylvans</h3>
              <p className="text-sm text-gray-400 mt-2">Agile nature dwellers</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-race-gryll bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-race-gryll overflow-hidden">
                <img src="/race-gryll.svg" alt="Gryll" className="w-16 h-16" />
              </div>
              <h3 className="font-semibold text-race-gryll">Gryll</h3>
              <p className="text-sm text-gray-400 mt-2">Powerful and resilient</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-race-lumina bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-race-lumina overflow-hidden">
                <img src="/race-lumina.svg" alt="Lumina" className="w-16 h-16" />
              </div>
              <h3 className="font-semibold text-race-lumina">Lumina</h3>
              <p className="text-sm text-gray-400 mt-2">Precise light beings</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-race-umbra bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-race-umbra overflow-hidden">
                <img src="/race-umbra.svg" alt="Umbra" className="w-16 h-16" />
              </div>
              <h3 className="font-semibold text-race-umbra">Umbra</h3>
              <p className="text-sm text-gray-400 mt-2">Evasive shadow masters</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center py-16">
          <h2 className="font-orbitron text-3xl font-bold mb-6">Ready to Build Your Legacy?</h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of managers competing for glory in the ultimate fantasy sports experience.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-gold-500 hover:bg-gold-600 text-gray-900 px-8 py-4 text-lg font-bold rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            Create Your Team Now
          </Button>
        </div>
      </div>
    </div>
  );
}
