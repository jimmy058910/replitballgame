import Navigation from "@/components/Navigation";
import EnhancedMarketplace from "@/components/EnhancedMarketplace";

export default function Marketplace() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EnhancedMarketplace />
      </div>
    </div>
  );
}