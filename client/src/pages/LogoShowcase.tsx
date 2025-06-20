import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const logos = [
  {
    id: 1,
    name: "Royal Heraldic",
    file: "/logo-variant-1.svg",
    description: "Traditional crown and shield design with ornate golden elements and heraldic styling",
    theme: "Classic Fantasy Royalty"
  },
  {
    id: 2,
    name: "Mystical Portal",
    file: "/logo-variant-2.svg",
    description: "Multi-dimensional portal with all five races represented around a magical ring",
    theme: "Interdimensional Magic"
  },
  {
    id: 3,
    name: "Arena Champion",
    file: "/logo-variant-3.svg",
    description: "Colosseum-inspired design with battle flames and warrior aesthetic",
    theme: "Gladiatorial Combat"
  },
  {
    id: 4,
    name: "Crystal Nexus",
    file: "/logo-variant-4.svg",
    description: "Futuristic crystalline structure with technological energy effects",
    theme: "Sci-Fi Technology"
  },
  {
    id: 5,
    name: "Nature's Unity",
    file: "/logo-variant-5.svg",
    description: "Organic tree design with all races represented as natural branches",
    theme: "Harmony & Growth"
  }
];

export default function LogoShowcase() {
  const handleLogoSelect = (logoId: number) => {
    alert(`You selected Logo ${logoId}: ${logos[logoId - 1].name}. This would update the main logo in a real implementation.`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="font-orbitron text-4xl font-bold mb-4">
            Choose Your Realm Rivalry Logo
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Select the logo design that best represents your vision for the ultimate fantasy sports experience.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {logos.map((logo) => (
            <Card key={logo.id} className="bg-gray-800 border-gray-700 hover:border-primary-500 transition-all duration-300 transform hover:scale-105">
              <CardHeader className="text-center">
                <div className="bg-gray-900 rounded-lg p-6 mb-4">
                  <img 
                    src={logo.file} 
                    alt={logo.name}
                    className="w-full h-32 object-contain"
                  />
                </div>
                <CardTitle className="text-white text-xl">{logo.name}</CardTitle>
                <CardDescription className="text-primary-400 font-semibold">
                  {logo.theme}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300 text-sm">
                  {logo.description}
                </p>
                <Button 
                  onClick={() => handleLogoSelect(logo.id)}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold"
                >
                  Select This Logo
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-6">Current Logo (For Comparison)</h2>
          <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto">
            <img 
              src="/realm-rivalry-logo.svg" 
              alt="Current Logo"
              className="w-full h-20 object-contain"
            />
          </div>
        </div>

        <div className="mt-12 text-center">
          <Button 
            onClick={() => window.history.back()}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Back to Main Site
          </Button>
        </div>
      </div>
    </div>
  );
}