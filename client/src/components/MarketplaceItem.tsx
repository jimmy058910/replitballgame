import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface MarketplaceItemProps {
  player: any;
  onBid: (playerId: string, amount: number) => void;
  isLoading: boolean;
}

const raceColors = {
  human: "race-human",
  sylvan: "race-sylvan", 
  gryll: "race-gryll",
  lumina: "race-lumina",
  umbra: "race-umbra",
} as const;

const raceIcons = {
  human: "fas fa-user",
  sylvan: "fas fa-leaf",
  gryll: "fas fa-mountain",
  lumina: "fas fa-sun",
  umbra: "fas fa-eye-slash",
} as const;

export default function MarketplaceItem({ player, onBid, isLoading }: MarketplaceItemProps) {
  const [bidAmount, setBidAmount] = useState(player.marketplacePrice ? player.marketplacePrice + 100 : 1000);
  
  const raceColorClass = raceColors[player.race as keyof typeof raceColors] || "race-human";
  const raceIcon = raceIcons[player.race as keyof typeof raceIcons] || "fas fa-user";

  const renderStars = (potential: string) => {
    const rating = parseFloat(potential);
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="text-gold-400 text-sm">
            {i < fullStars ? "★" : i === fullStars && hasHalfStar ? "☆" : "☆"}
          </span>
        ))}
      </div>
    );
  };

  const avgPotential = [
    parseFloat(player.speedPotential || "0"),
    parseFloat(player.powerPotential || "0"),
    parseFloat(player.throwingPotential || "0"),
    parseFloat(player.catchingPotential || "0"),
    parseFloat(player.kickingPotential || "0"),
    parseFloat(player.staminaPotential || "0"),
    parseFloat(player.leadershipPotential || "0"),
    parseFloat(player.agilityPotential || "0"),
  ].reduce((a, b) => a + b, 0) / 8;

  const topAttributes = [
    { name: "Speed", value: player.speed },
    { name: "Power", value: player.power },
    { name: "Throwing", value: player.throwing },
    { name: "Catching", value: player.catching },
    { name: "Agility", value: player.agility },
    { name: "Stamina", value: player.stamina },
  ]
    .sort((a, b) => b.value - a.value)
    .slice(0, 2);

  const timeLeft = player.marketplaceEndTime ? 
    Math.max(0, Math.floor((new Date(player.marketplaceEndTime).getTime() - Date.now()) / 1000)) : 0;

  const formatTimeLeft = (seconds: number) => {
    if (seconds <= 0) return "Expired";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const handleBidSubmit = () => {
    if (bidAmount > 0) {
      onBid(player.id, bidAmount);
    }
  };

  const handleBuyNow = () => {
    if (player.marketplacePrice) {
      onBid(player.id, player.marketplacePrice);
    }
  };

  const isBuyNow = !player.marketplaceEndTime;

  return (
    <Card className={`bg-gray-700 rounded-lg border border-gray-600 hover:border-gold-400 transition-colors`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 bg-${raceColorClass} bg-opacity-20 rounded-full border-2 border-${raceColorClass} flex items-center justify-center`}>
              <i className={`${raceIcon} text-${raceColorClass}`}></i>
            </div>
            <div>
              <h4 className="font-semibold text-white">{player.name}</h4>
              <p className={`text-xs text-${raceColorClass} font-medium`}>
                {player.race.charAt(0).toUpperCase() + player.race.slice(1)} • Age {player.age}
              </p>
            </div>
          </div>
          <div className="text-right">
            {renderStars(avgPotential.toFixed(1))}
          </div>
        </div>
        
        {/* Top Attributes */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          {topAttributes.map((attr) => (
            <div key={attr.name} className="flex justify-between">
              <span className="text-gray-400">{attr.name}</span>
              <span className={`font-semibold ${attr.value >= 30 ? 'text-green-400' : ''}`}>
                {attr.value}
              </span>
            </div>
          ))}
        </div>
        
        {/* Price and Time Info */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-600 mb-3">
          <div>
            <div className="text-xs text-gray-400">
              {isBuyNow ? "Buy Now" : "Current Bid"}
            </div>
            <div className="font-bold text-gold-400">
              {player.marketplacePrice?.toLocaleString() || "0"}
            </div>
          </div>
          {!isBuyNow && (
            <div className="text-right">
              <div className="text-xs text-gray-400">Time Left</div>
              <div className={`font-semibold ${timeLeft < 3600 ? 'text-red-400' : 'text-white'}`}>
                {formatTimeLeft(timeLeft)}
              </div>
            </div>
          )}
          {isBuyNow && (
            <Badge className="bg-green-500 text-white">
              AVAILABLE
            </Badge>
          )}
        </div>
        
        {/* Bid Input and Button */}
        {isBuyNow ? (
          <Button 
            onClick={handleBuyNow}
            disabled={isLoading || timeLeft <= 0}
            className="w-full bg-green-600 hover:bg-green-700 text-white transition-colors"
          >
            {isLoading ? "Processing..." : "Buy Now"}
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
                placeholder="Enter bid"
                className="bg-gray-600 border-gray-500 text-white text-sm"
                min={player.marketplacePrice ? player.marketplacePrice + 1 : 1}
              />
              <Button
                onClick={handleBidSubmit}
                disabled={isLoading || timeLeft <= 0 || bidAmount <= (player.marketplacePrice || 0)}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 transition-colors"
              >
                {isLoading ? "..." : "Bid"}
              </Button>
            </div>
            {bidAmount <= (player.marketplacePrice || 0) && (
              <p className="text-xs text-red-400">
                Bid must be higher than current price
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
