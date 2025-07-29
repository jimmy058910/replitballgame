import React, { useRef, useEffect, useState } from 'react';
import Game from '../game/Game';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface GameCanvasProps {
  matchId: string;
  gameData?: any;
  liveState?: any;
  events?: any[];
  className?: string;
  width?: number;
  height?: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  matchId,
  gameData,
  liveState,
  events = [],
  className = "",
  width = 600,
  height = 400
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  // Initialize game engine
  useEffect(() => {
    if (!canvasRef.current) return;

    // Text summary callback for speed control
    const handleTextSummary = (event: any) => {
      console.log('Text summary for event:', event);
      // Could display text summary in UI here
    };

    // Create new game instance with text summary callback
    gameRef.current = new Game(canvasRef.current, matchId, handleTextSummary);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, [matchId]);

  // Update game with new data
  useEffect(() => {
    if (gameRef.current && (gameData || liveState || events.length > 0)) {
      gameRef.current.updateGameData({
        homeTeam: gameData?.homeTeam,
        awayTeam: gameData?.awayTeam,
        liveState,
        events,
        stadiumData: {
          attendance: liveState?.attendance || 15000,
          capacity: liveState?.stadiumCapacity || 20000,
          facilities: {
            vipSuites: liveState?.vipSuites || 0,
            lighting: liveState?.lighting || 1,
            concessions: liveState?.concessions || 1
          },
          fanLoyalty: liveState?.fanLoyalty || 50
        }
      });
    }
  }, [gameData, liveState, events]);

  const handlePlayPause = () => {
    if (!gameRef.current) return;
    
    if (isPlaying) {
      gameRef.current.stop();
    } else {
      gameRef.current.start();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    if (!gameRef.current || !canvasRef.current) return;
    
    // Recreate game instance
    gameRef.current.destroy();
    gameRef.current = new Game(canvasRef.current, matchId);
    setIsPlaying(true);
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Canvas Controls */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">2D Match Visualization</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayPause}
                className="flex items-center gap-2"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            </div>
          </div>

          {/* Canvas */}
          <div className="relative border rounded-lg overflow-hidden bg-gray-900">
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className="block w-full h-auto"
            />
            
            {/* Canvas Overlay Info */}
            <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
              Match: {matchId}
            </div>
            
            {!isPlaying && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-lg font-semibold">PAUSED</div>
              </div>
            )}
          </div>

          {/* Speed Control Display */}
          <div className="flex justify-center">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              gameRef.current?.getSpeedController()?.isVisualsStopped ? 
              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
              'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {gameRef.current?.getSpeedController()?.isVisualsStopped ? 
                '⏸️ TEXT MODE' : 
                `▶️ ${gameRef.current?.getSpeedController()?.currentSpeed || 1}x SPEED`
              }
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold">Player Roles</h4>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <span>Passer</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <span>Runner</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <span>Blocker</span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Teams</h4>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Home Team</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Away Team</span>
              </div>
            </div>
          </div>

          {/* Integration Status */}
          <div className="text-xs text-gray-500 border-t pt-2">
            <div className="flex justify-between">
              <span>Engine: Jules' 2D Canvas System</span>
              <span>Data: {liveState ? 'Live WebSocket' : 'Static'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GameCanvas;