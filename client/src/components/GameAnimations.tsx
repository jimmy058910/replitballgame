import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, Heart, ShieldX, ArrowDown, Trophy, Target, 
  Hand, AlertTriangle, Activity, Footprints, 
  Clock, Star, Users, Crown
} from "lucide-react";

interface GameEvent {
  id: string;
  type: 'skill' | 'fatigue' | 'knockdown' | 'pushback' | 'celebration' | 'throwing' | 'catching' | 'fumble' | 'injury' | 'running' | 'tackle' | 'block' | 'dodge' | 'interception' | 'touchdown';
  playerId: string;
  playerName: string;
  playerRace: string;
  description: string;
  intensity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  position?: { x: number; y: number };
  duration?: number;
}

interface GameAnimationsProps {
  events: GameEvent[];
  isLive: boolean;
  fieldDimensions: { width: number; height: number };
}

export default function GameAnimations({ events, isLive, fieldDimensions }: GameAnimationsProps) {
  const [activeEvents, setActiveEvents] = useState<GameEvent[]>([]);
  const [recentEvents, setRecentEvents] = useState<GameEvent[]>([]);

  useEffect(() => {
    if (!isLive) return;

    // Process new events
    const newEvents = events.filter(event => 
      !activeEvents.some(active => active.id === event.id) &&
      !recentEvents.some(recent => recent.id === event.id)
    );

    if (newEvents.length > 0) {
      setActiveEvents(prev => [...prev, ...newEvents]);
      
      // Auto-remove events after their duration
      newEvents.forEach(event => {
        const duration = event.duration || getDefaultDuration(event.type);
        setTimeout(() => {
          setActiveEvents(prev => prev.filter(e => e.id !== event.id));
          setRecentEvents(prev => [...prev, event].slice(-10)); // Keep last 10 events
        }, duration);
      });
    }
  }, [events, isLive]);

  const getDefaultDuration = (type: string): number => {
    const durations = {
      skill: 2000,
      fatigue: 3000,
      knockdown: 2500,
      pushback: 1500,
      celebration: 4000,
      throwing: 1800,
      catching: 1500,
      fumble: 3000,
      injury: 5000,
      running: 2000,
      tackle: 2000,
      block: 1500,
      dodge: 1200,
      interception: 3500,
      touchdown: 6000,
    };
    return durations[type] || 2000;
  };

  const getAnimationVariants = (eventType: string) => {
    const variants = {
      skill: {
        initial: { scale: 0, rotate: 0, opacity: 0 },
        animate: { 
          scale: [0, 1.2, 1], 
          rotate: [0, 360], 
          opacity: [0, 1, 1, 0.7, 0],
          boxShadow: ["0 0 0px #3b82f6", "0 0 20px #3b82f6", "0 0 0px #3b82f6"]
        },
        transition: { duration: 2, ease: "easeOut" }
      },
      fatigue: {
        initial: { scale: 1, opacity: 0 },
        animate: { 
          scale: [1, 0.8, 1], 
          opacity: [0, 0.8, 0],
          y: [0, -10, 0]
        },
        transition: { duration: 3, repeat: 2 }
      },
      knockdown: {
        initial: { scale: 1, rotate: 0, y: 0 },
        animate: { 
          scale: [1, 1.5, 0.5], 
          rotate: [0, -45, -90], 
          y: [0, -20, 20],
          opacity: [1, 0.8, 0]
        },
        transition: { duration: 2.5, ease: "easeInOut" }
      },
      pushback: {
        initial: { x: 0, scale: 1 },
        animate: { 
          x: [0, -30, -15, 0], 
          scale: [1, 0.9, 1.1, 1],
          opacity: [1, 0.8, 0]
        },
        transition: { duration: 1.5 }
      },
      celebration: {
        initial: { scale: 0, y: 0 },
        animate: { 
          scale: [0, 1.3, 1], 
          y: [0, -30, -15, 0],
          rotate: [0, 10, -10, 0],
          opacity: [0, 1, 1, 0.8, 0]
        },
        transition: { duration: 4, ease: "easeOut" }
      },
      throwing: {
        initial: { scale: 1, x: 0 },
        animate: { 
          scale: [1, 1.2, 0.8], 
          x: [0, 50, 100],
          opacity: [1, 0.8, 0]
        },
        transition: { duration: 1.8, ease: "easeOut" }
      },
      catching: {
        initial: { scale: 0.5, y: -20 },
        animate: { 
          scale: [0.5, 1.3, 1], 
          y: [-20, 0, 5, 0],
          opacity: [0, 1, 0.8, 0]
        },
        transition: { duration: 1.5 }
      },
      fumble: {
        initial: { rotate: 0, scale: 1 },
        animate: { 
          rotate: [0, 180, 360, 540], 
          scale: [1, 0.7, 1.2, 0.5],
          x: [0, -20, 20, -10, 0],
          opacity: [1, 0.8, 0.6, 0]
        },
        transition: { duration: 3, ease: "easeInOut" }
      },
      injury: {
        initial: { scale: 1, opacity: 1 },
        animate: { 
          scale: [1, 1.5, 1], 
          opacity: [1, 0.3, 0.8, 0],
          backgroundColor: ["#ef4444", "#dc2626", "#ef4444"]
        },
        transition: { duration: 5, ease: "easeInOut" }
      },
      running: {
        initial: { x: 0, opacity: 0 },
        animate: { 
          x: [0, 20, 40, 60], 
          opacity: [0, 1, 0.8, 0],
          scale: [0.8, 1, 1.1, 0.9]
        },
        transition: { duration: 2, ease: "linear" }
      },
      touchdown: {
        initial: { scale: 0, y: 0 },
        animate: { 
          scale: [0, 2, 1.5], 
          y: [0, -50, -30],
          rotate: [0, 360],
          opacity: [0, 1, 1, 0.9, 0]
        },
        transition: { duration: 6, ease: "easeOut" }
      }
    };
    return variants[eventType] || variants.skill;
  };

  const getEventIcon = (eventType: string) => {
    const icons = {
      skill: Zap,
      fatigue: Clock,
      knockdown: ShieldX,
      pushback: ArrowDown,
      celebration: Trophy,
      throwing: Target,
      catching: Hand,
      fumble: AlertTriangle,
      injury: Heart,
      running: Footprints,
      tackle: Users,
      block: Users,
      dodge: Activity,
      interception: Hand,
      touchdown: Crown,
    };
    return icons[eventType] || Star;
  };

  const getEventColor = (eventType: string, intensity: string) => {
    const baseColors = {
      skill: "text-blue-400",
      fatigue: "text-yellow-400",
      knockdown: "text-red-500",
      pushback: "text-orange-400",
      celebration: "text-green-400",
      throwing: "text-purple-400",
      catching: "text-cyan-400",
      fumble: "text-red-600",
      injury: "text-red-700",
      running: "text-green-500",
      tackle: "text-gray-400",
      block: "text-gray-500",
      dodge: "text-blue-300",
      interception: "text-purple-500",
      touchdown: "text-yellow-500",
    };

    const intensityModifiers = {
      low: "opacity-60",
      medium: "opacity-80",
      high: "opacity-100",
      critical: "opacity-100 animate-pulse"
    };

    return `${baseColors[eventType] || "text-white"} ${intensityModifiers[intensity]}`;
  };

  const getRaceSpecificAnimation = (race: string, baseAnimation: any) => {
    const raceModifiers = {
      Human: { scale: 1, speed: 1 },
      Elf: { scale: 0.9, speed: 1.3 },
      Dwarf: { scale: 1.2, speed: 0.8 },
      "Dark Elf": { scale: 0.95, speed: 1.2 },
      Orc: { scale: 1.3, speed: 0.9 },
      Goblin: { scale: 0.7, speed: 1.4 },
      Undead: { scale: 1.1, speed: 0.7 },
      Skaven: { scale: 0.8, speed: 1.5 }
    };

    const modifier = raceModifiers[race] || raceModifiers.Human;
    return {
      ...baseAnimation,
      transition: {
        ...baseAnimation.transition,
        duration: baseAnimation.transition.duration / modifier.speed
      }
    };
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Field Background */}
      <div 
        className="absolute inset-0 bg-green-800 bg-opacity-20"
        style={{ width: fieldDimensions.width, height: fieldDimensions.height }}
      >
        {/* Field Lines */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="fieldLines" patternUnits="userSpaceOnUse" width="50" height="50">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#fieldLines)" />
        </svg>
      </div>

      {/* Active Animations */}
      <AnimatePresence>
        {activeEvents.map((event) => {
          const IconComponent = getEventIcon(event.type);
          const variants = getRaceSpecificAnimation(event.playerRace, getAnimationVariants(event.type));
          const colorClass = getEventColor(event.type, event.intensity);

          return (
            <motion.div
              key={event.id}
              className="absolute pointer-events-none z-20"
              style={{
                left: event.position?.x || Math.random() * (fieldDimensions.width - 100),
                top: event.position?.y || Math.random() * (fieldDimensions.height - 100),
              }}
              initial={variants.initial}
              animate={variants.animate}
              exit={{ opacity: 0, scale: 0 }}
              transition={variants.transition}
            >
              <div className={`flex flex-col items-center ${colorClass}`}>
                <IconComponent className="w-8 h-8 mb-1" />
                <div className="bg-black bg-opacity-70 px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap">
                  {event.playerName}
                </div>
                <div className="text-xs text-center mt-1 max-w-32 text-white bg-black bg-opacity-50 px-1 rounded">
                  {event.description}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Event Log Sidebar */}
      <div className="absolute top-4 right-4 w-64 bg-black bg-opacity-80 rounded-lg p-3 max-h-96 overflow-y-auto">
        <h3 className="text-white font-bold mb-2 flex items-center">
          <Activity className="w-4 h-4 mr-1" />
          Live Events
        </h3>
        <div className="space-y-1">
          {[...activeEvents, ...recentEvents].slice(-8).reverse().map((event) => {
            const IconComponent = getEventIcon(event.type);
            const colorClass = getEventColor(event.type, event.intensity);
            return (
              <div key={event.id} className="flex items-center text-xs text-white bg-gray-800 bg-opacity-50 rounded p-1">
                <IconComponent className={`w-3 h-3 mr-1 ${colorClass}`} />
                <div className="flex-1">
                  <div className="font-semibold">{event.playerName}</div>
                  <div className="text-gray-300">{event.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Combo System for Multiple Events */}
      {activeEvents.length > 1 && (
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
          initial={{ scale: 0, rotate: 0 }}
          animate={{ 
            scale: [0, 1.5, 1], 
            rotate: [0, 360],
            opacity: [0, 1, 0.8, 0]
          }}
          transition={{ duration: 2.5 }}
        >
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full font-bold text-lg">
            {activeEvents.length}x COMBO!
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Helper component for generating test events
export function generateTestEvent(type: GameEvent['type'], playerName: string, playerRace: string): GameEvent {
  const descriptions = {
    skill: `${playerName} uses special ability!`,
    fatigue: `${playerName} is getting tired`,
    knockdown: `${playerName} gets knocked down!`,
    pushback: `${playerName} pushes opponent back`,
    celebration: `${playerName} celebrates the play!`,
    throwing: `${playerName} throws the ball`,
    catching: `${playerName} catches the ball`,
    fumble: `${playerName} fumbles the ball!`,
    injury: `${playerName} gets injured!`,
    running: `${playerName} runs down the field`,
    tackle: `${playerName} makes a tackle`,
    block: `${playerName} blocks the opponent`,
    dodge: `${playerName} dodges the tackle`,
    interception: `${playerName} intercepts the ball!`,
    touchdown: `${playerName} scores a touchdown!`,
  };

  return {
    id: `event-${Date.now()}-${Math.random()}`,
    type,
    playerId: `player-${Math.random()}`,
    playerName,
    playerRace,
    description: descriptions[type] || `${playerName} makes a play`,
    intensity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
    timestamp: Date.now(),
    position: {
      x: Math.random() * 800,
      y: Math.random() * 400
    }
  };
}