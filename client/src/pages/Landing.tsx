import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="pt-20 pb-16 text-center">
          <h1 className="font-orbitron text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-gold-400 to-primary-400 bg-clip-text text-transparent">
            REALM RIVALRY
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Build your ultimate fantasy team with diverse races, compete in leagues, and dominate the field in this immersive sports management experience.
          </p>
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
              <div className="w-12 h-12 bg-race-sylvan bg-opacity-20 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-leaf text-race-sylvan text-xl"></i>
              </div>
              <CardTitle className="text-white">Multiple Races</CardTitle>
              <CardDescription>
                Command diverse fantasy races including Sylvans, Gryll, Lumina, Umbra, and Humans, each with unique abilities.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-primary-500 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary-500 bg-opacity-20 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-users text-primary-500 text-xl"></i>
              </div>
              <CardTitle className="text-white">Team Management</CardTitle>
              <CardDescription>
                Recruit, train, and manage your team of 10 players with deep attribute systems and progression mechanics.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-gold-400 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-gold-400 bg-opacity-20 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-trophy text-gold-400 text-xl"></i>
              </div>
              <CardTitle className="text-white">League Competition</CardTitle>
              <CardDescription>
                Compete in division-based leagues with promotion/relegation systems and seasonal tournaments.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-race-gryll transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-race-gryll bg-opacity-20 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-bolt text-race-gryll text-xl"></i>
              </div>
              <CardTitle className="text-white">Match Simulation</CardTitle>
              <CardDescription>
                Watch live 2D match simulations with real-time commentary and tactical decision-making.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-race-lumina transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-race-lumina bg-opacity-20 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-store text-race-lumina text-xl"></i>
              </div>
              <CardTitle className="text-white">Player Marketplace</CardTitle>
              <CardDescription>
                Trade players in a dynamic marketplace with bidding systems and contract negotiations.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-race-umbra transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-race-umbra bg-opacity-20 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-chart-line text-race-umbra text-xl"></i>
              </div>
              <CardTitle className="text-white">Deep Strategy</CardTitle>
              <CardDescription>
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
              <div className="w-16 h-16 bg-race-human bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-race-human">
                <i className="fas fa-user text-race-human text-2xl"></i>
              </div>
              <h3 className="font-semibold text-race-human">Humans</h3>
              <p className="text-sm text-gray-400 mt-2">Balanced and adaptable</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-race-sylvan bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-race-sylvan">
                <i className="fas fa-leaf text-race-sylvan text-2xl"></i>
              </div>
              <h3 className="font-semibold text-race-sylvan">Sylvans</h3>
              <p className="text-sm text-gray-400 mt-2">Agile nature dwellers</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-race-gryll bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-race-gryll">
                <i className="fas fa-mountain text-race-gryll text-2xl"></i>
              </div>
              <h3 className="font-semibold text-race-gryll">Gryll</h3>
              <p className="text-sm text-gray-400 mt-2">Powerful and resilient</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-race-lumina bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-race-lumina">
                <i className="fas fa-sun text-race-lumina text-2xl"></i>
              </div>
              <h3 className="font-semibold text-race-lumina">Lumina</h3>
              <p className="text-sm text-gray-400 mt-2">Precise light beings</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-race-umbra bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-race-umbra">
                <i className="fas fa-eye-slash text-race-umbra text-2xl"></i>
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
