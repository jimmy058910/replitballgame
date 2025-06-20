import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MatchViewerProps {
  match: any;
}

export default function MatchViewer({ match }: MatchViewerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (match?.gameData?.events) {
      setEvents(match.gameData.events);
    }
  }, [match]);

  useEffect(() => {
    if (match?.status === "live") {
      const interval = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [match?.status]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = () => {
    switch (match.status) {
      case "live":
        return <Badge className="bg-green-500 text-white animate-pulse">LIVE</Badge>;
      case "completed":
        return <Badge className="bg-gray-500 text-white">FINAL</Badge>;
      default:
        return <Badge className="bg-blue-500 text-white">SCHEDULED</Badge>;
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="border-b border-gray-700">
        <div className="flex items-center justify-between">
          <CardTitle className="font-orbitron text-xl">
            {match.status === "live" ? "Live Match" : "Match Details"}
          </CardTitle>
          <div className="flex items-center space-x-4">
            {getStatusBadge()}
            {match.status === "live" && (
              <span className="text-sm text-gray-400">
                1st Half - {formatTime(currentTime + 300)}
              </span>
            )}
          </div>
        </div>
        
        {/* Score Display */}
        <div className="flex items-center justify-center mt-4">
          <div className="text-center">
            <div className="text-sm text-gray-400">Home Team</div>
            <div className="font-orbitron text-3xl font-bold text-primary-400">
              {match.homeScore}
            </div>
          </div>
          <div className="mx-8 text-gray-500">-</div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Away Team</div>
            <div className="font-orbitron text-3xl font-bold text-red-400">
              {match.awayScore}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* 2D Field View */}
        <div className="relative bg-green-800 rounded-lg mx-auto mb-6" style={{ width: '100%', maxWidth: '600px', height: '300px', background: 'linear-gradient(90deg, #166534 0%, #15803d 50%, #166534 100%)' }}>
          {/* Field markings */}
          <div className="absolute inset-0">
            {/* End zones */}
            <div className="absolute left-0 top-0 w-12 h-full bg-primary-500 bg-opacity-30 border-r-2 border-white border-opacity-50"></div>
            <div className="absolute right-0 top-0 w-12 h-full bg-red-500 bg-opacity-30 border-l-2 border-white border-opacity-50"></div>
            
            {/* Yard lines */}
            <div className="absolute left-1/4 top-0 w-0.5 h-full bg-white bg-opacity-30"></div>
            <div className="absolute left-2/4 top-0 w-1 h-full bg-white bg-opacity-50"></div>
            <div className="absolute left-3/4 top-0 w-0.5 h-full bg-white bg-opacity-30"></div>
            
            {/* Animated Players */}
            <PlayerDot position={{ x: 200, y: 100 }} team="home" hasBall={true} name="Player" />
            <PlayerDot position={{ x: 180, y: 50 }} team="home" name="P1" />
            <PlayerDot position={{ x: 180, y: 150 }} team="home" name="P2" />
            <PlayerDot position={{ x: 220, y: 75 }} team="home" name="P3" />
            <PlayerDot position={{ x: 220, y: 125 }} team="home" name="P4" />
            
            <PlayerDot position={{ x: 320, y: 90 }} team="away" name="D1" />
            <PlayerDot position={{ x: 340, y: 60 }} team="away" name="D2" />
            <PlayerDot position={{ x: 340, y: 120 }} team="away" name="D3" />
            <PlayerDot position={{ x: 360, y: 90 }} team="away" name="D4" />
          </div>
          
          {/* Field Legend */}
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 rounded-lg p-2">
            <div className="text-xs text-white">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                <span>Home Team</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Away Team</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Match Commentary */}
        {events.length > 0 && (
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Match Commentary</h4>
            <div className="space-y-2 text-sm max-h-32 overflow-y-auto">
              {events.slice(-5).reverse().map((event, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="text-gray-400 min-w-0 w-16">
                    {formatTime(event.time)}
                  </span>
                  <span className="flex-1">{event.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Match Stats */}
        {match.gameData?.finalStats && (
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold">{match.gameData.finalStats.possession.home}%</div>
              <div className="text-xs text-gray-400">Possession</div>
            </div>
            <div>
              <div className="text-lg font-bold">{match.gameData.finalStats.passes.home}</div>
              <div className="text-xs text-gray-400">Passes</div>
            </div>
            <div>
              <div className="text-lg font-bold">{match.gameData.finalStats.interceptions.home}</div>
              <div className="text-xs text-gray-400">Interceptions</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PlayerDotProps {
  position: { x: number; y: number };
  team: "home" | "away";
  hasBall?: boolean;
  name: string;
}

function PlayerDot({ position, team, hasBall = false, name }: PlayerDotProps) {
  const [animatedPosition, setAnimatedPosition] = useState(position);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedPosition(prev => ({
        x: prev.x + (Math.random() - 0.5) * 10,
        y: prev.y + (Math.random() - 0.5) * 10,
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="absolute transition-all duration-2000"
      style={{ 
        left: `${Math.max(20, Math.min(animatedPosition.x, 580))}px`, 
        top: `${Math.max(20, Math.min(animatedPosition.y, 280))}px`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${
        team === "home" ? "bg-primary-500" : "bg-red-500"
      }`}>
        {hasBall && <i className="fas fa-football-ball text-white text-xs"></i>}
      </div>
      <div className="text-xs text-white text-center mt-1">{name.slice(0, 3).toUpperCase()}</div>
    </div>
  );
}
