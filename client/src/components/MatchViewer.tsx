import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MatchViewerProps {
  match: any;
}

export default function MatchViewer({ match }: MatchViewerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [events, setEvents] = useState<any[]>([]);

  // Get simulation data for dynamic content
  const { data: simulationData } = useQuery({
    queryKey: ["/api/matches", match.id, "simulation"],
    refetchInterval: match.status === "live" ? 2000 : false,
    enabled: !!match.id,
  });

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

  const getGameTime = () => {
    if (simulationData?.displayTime !== undefined) {
      return formatTime(simulationData.displayTime);
    } else if (match.displayTime !== undefined) {
      return formatTime(match.displayTime);
    }
    return formatTime(currentTime);
  };

  const getHalfDisplay = () => {
    const isExhibition = simulationData?.isExhibition || match.isExhibition;
    const currentQuarter = simulationData?.currentQuarter || match.currentQuarter || 1;
    
    if (isExhibition) {
      return currentQuarter === 1 ? "First Half" : "Second Half";
    }
    return `Quarter ${currentQuarter}`;
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
                {getHalfDisplay()} - {getGameTime()}
              </span>
            )}
          </div>
        </div>
        
        {/* Score Display */}
        <div className="flex items-center justify-center mt-4">
          <div className="text-center">
            <div className="text-sm text-gray-400">
              {simulationData?.homeTeamName || simulationData?.team1?.name || match.homeTeamName}
            </div>
            <div className="font-orbitron text-3xl font-bold text-primary-400">
              {match.homeScore || simulationData?.team1?.score || 0}
            </div>
          </div>
          <div className="mx-8 text-gray-500">-</div>
          <div className="text-center">
            <div className="text-sm text-gray-400">
              {simulationData?.awayTeamName || simulationData?.team2?.name || match.awayTeamName}
            </div>
            <div className="font-orbitron text-3xl font-bold text-red-400">
              {match.awayScore || simulationData?.team2?.score || 0}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* 2D Field View - Enclosed Arena Style */}
        <div className="relative mx-auto mb-6 rounded-3xl border-4 border-gray-900 overflow-hidden" style={{ width: '100%', maxWidth: '640px', height: '320px', background: '#22c55e' }}>
          {/* Field markings */}
          <div className="absolute inset-4">
            {/* Scoring zones with spacing */}
            <div className="absolute left-0 top-0 w-20 h-full bg-green-400 border-r-2 border-black rounded-l-2xl opacity-20"></div>
            <div className="absolute right-0 top-0 w-20 h-full bg-green-400 border-l-2 border-black rounded-r-2xl opacity-20"></div>
            
            {/* Field divisions */}
            <div className="absolute left-1/4 top-0 w-0.5 h-full bg-black opacity-60"></div>
            <div className="absolute left-2/4 top-0 w-1 h-full bg-black opacity-80"></div>
            <div className="absolute left-3/4 top-0 w-0.5 h-full bg-black opacity-60"></div>
            
            {/* Animated Players */}
            {/* Home team players */}
            {(simulationData?.team1?.players?.slice(0, 5) || []).map((player: any, index: number) => (
              <PlayerDot 
                key={`home-${player.id || index}`}
                position={{ 
                  x: 120 + (index * 35), 
                  y: 80 + (index % 3) * 50 
                }} 
                team="home" 
                hasBall={index === 0}
                name={player.displayName || player.lastName || player.name?.split(' ').pop() || `P${index + 1}`}
              />
            ))}
            
            {/* Away team players */}
            {(simulationData?.team2?.players?.slice(0, 5) || []).map((player: any, index: number) => (
              <PlayerDot 
                key={`away-${player.id || index}`}
                position={{ 
                  x: 380 + (index * 35), 
                  y: 80 + (index % 3) * 50 
                }} 
                team="away" 
                name={player.displayName || player.lastName || player.name?.split(' ').pop() || `D${index + 1}`}
              />
            ))}
            
            {/* Fallback players if no simulation data */}
            {(!simulationData?.team1?.players || simulationData.team1.players.length === 0) && [
              <PlayerDot key="fallback-home-1" position={{ x: 120, y: 80 }} team="home" hasBall={true} name="Player" />,
              <PlayerDot key="fallback-home-2" position={{ x: 155, y: 130 }} team="home" name="Runner" />,
              <PlayerDot key="fallback-home-3" position={{ x: 190, y: 180 }} team="home" name="Blocker" />,
              <PlayerDot key="fallback-home-4" position={{ x: 225, y: 105 }} team="home" name="Passer" />,
              <PlayerDot key="fallback-home-5" position={{ x: 260, y: 155 }} team="home" name="Guard" />
            ]}
            
            {(!simulationData?.team2?.players || simulationData.team2.players.length === 0) && [
              <PlayerDot key="fallback-away-1" position={{ x: 380, y: 80 }} team="away" name="Defender" />,
              <PlayerDot key="fallback-away-2" position={{ x: 415, y: 130 }} team="away" name="Rusher" />,
              <PlayerDot key="fallback-away-3" position={{ x: 450, y: 180 }} team="away" name="Tackle" />,
              <PlayerDot key="fallback-away-4" position={{ x: 485, y: 105 }} team="away" name="Safety" />,
              <PlayerDot key="fallback-away-5" position={{ x: 520, y: 155 }} team="away" name="Corner" />
            ]}
          </div>
          
          {/* Field Legend */}
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 rounded-lg p-3">
            <div className="text-xs text-white">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full border border-white"></div>
                <span className="font-semibold">{simulationData?.homeTeamName || simulationData?.team1?.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full border border-white"></div>
                <span className="font-semibold">{simulationData?.awayTeamName || simulationData?.team2?.name}</span>
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
