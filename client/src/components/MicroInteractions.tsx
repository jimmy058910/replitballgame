import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Sparkles, Heart, Zap, Trophy, TrendingUp, Gift } from "lucide-react";

// Floating notification component
export const FloatingNotification = ({ 
  message, 
  type = "success", 
  duration = 3000,
  onClose 
}: {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  duration?: number;
  onClose?: () => void;
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getTypeConfig = () => {
    switch (type) {
      case "success":
        return { bg: "bg-green-500", icon: "✓" };
      case "error":
        return { bg: "bg-red-500", icon: "✗" };
      case "warning":
        return { bg: "bg-yellow-500", icon: "⚠" };
      default:
        return { bg: "bg-blue-500", icon: "ℹ" };
    }
  };

  const config = getTypeConfig();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className={`fixed top-4 right-4 z-50 ${config.bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 min-w-[300px]`}
        >
          <span className="text-lg">{config.icon}</span>
          <span className="flex-1">{message}</span>
          <button
            onClick={() => setIsVisible(false)}
            className="text-white hover:text-gray-200 ml-2"
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Pulse effect for important elements
export const PulseWrapper = ({ children, pulse = true, className = "" }: {
  children: React.ReactNode;
  pulse?: boolean;
  className?: string;
}) => {
  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Hover effect card wrapper
export const HoverCard = ({ children, className = "" }: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.div
      whileHover={{ 
        y: -5, 
        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)" 
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Button with enhanced interactions
export const InteractiveButton = ({ 
  children, 
  onClick, 
  variant = "default",
  disabled = false,
  className = "",
  ...props 
}: any) => {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = (e: any) => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);
    onClick?.(e);
  };

  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      transition={{ duration: 0.1 }}
    >
      <Button
        onClick={handleClick}
        variant={variant}
        disabled={disabled}
        className={`relative overflow-hidden ${className}`}
        {...props}
      >
        <AnimatePresence>
          {isClicked && (
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 bg-white rounded-full"
            />
          )}
        </AnimatePresence>
        {children}
      </Button>
    </motion.div>
  );
};

// Success animation overlay
export const SuccessOverlay = ({ show, onComplete }: {
  show: boolean;
  onComplete?: () => void;
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onComplete?.(), 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-white rounded-full p-8"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, ease: "linear", repeat: Infinity }}
            >
              <Star className="h-16 w-16 text-yellow-500" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center mt-4 font-semibold text-gray-800"
            >
              Success!
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Loading dots animation
export const LoadingDots = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "h-1 w-1",
    md: "h-2 w-2",
    lg: "h-3 w-3"
  };

  return (
    <div className="flex space-x-1 items-center">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          animate={{ y: [-4, 4, -4] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.1,
            ease: "easeInOut"
          }}
          className={`${sizeClasses[size]} bg-current rounded-full`}
        />
      ))}
    </div>
  );
};

// Confetti effect
export const ConfettiEffect = ({ active }: { active: boolean }) => {
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"];
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2
  }));

  return (
    <AnimatePresence>
      {active && (
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
          {confettiPieces.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{ 
                y: -10, 
                x: Math.random() * window.innerWidth,
                opacity: 1,
                rotate: 0 
              }}
              animate={{ 
                y: window.innerHeight + 10,
                rotate: 360,
                opacity: 0 
              }}
              transition={{
                duration: piece.duration,
                delay: piece.delay,
                ease: "linear"
              }}
              className="absolute w-2 h-2 rounded-sm"
              style={{ backgroundColor: piece.color }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

// Statistics counter with animation
export const AnimatedCounter = ({ 
  value, 
  duration = 1000,
  prefix = "",
  suffix = "" 
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {prefix}{count.toLocaleString()}{suffix}
    </motion.span>
  );
};

// Badge with glow effect
export const GlowBadge = ({ children, glow = true, className = "" }: {
  children: React.ReactNode;
  glow?: boolean;
  className?: string;
}) => {
  return (
    <motion.div
      animate={glow ? { 
        boxShadow: [
          "0 0 5px currentColor",
          "0 0 20px currentColor",
          "0 0 5px currentColor"
        ]
      } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <Badge className={`${className} ${glow ? 'shadow-lg' : ''}`}>
        {children}
      </Badge>
    </motion.div>
  );
};

// Progress bar with animation
export const AnimatedProgress = ({ 
  value, 
  max = 100, 
  className = "",
  showSparks = true 
}: {
  value: number;
  max?: number;
  className?: string;
  showSparks?: boolean;
}) => {
  const percentage = (value / max) * 100;

  return (
    <div className={`relative bg-gray-200 rounded-full h-3 overflow-hidden ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full relative"
      >
        {showSparks && percentage > 0 && (
          <motion.div
            animate={{ x: [-5, 5, -5] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute right-0 top-0 h-full w-1 bg-white opacity-60"
          />
        )}
      </motion.div>
      {percentage >= 100 && showSparks && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="absolute right-1 top-1/2 transform -translate-y-1/2"
        >
          <Sparkles className="h-3 w-3 text-yellow-400" />
        </motion.div>
      )}
    </div>
  );
};

// Stagger children animation wrapper
export const StaggerContainer = ({ children, staggerDelay = 0.1 }: {
  children: React.ReactNode;
  staggerDelay?: number;
}) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem = ({ children, className = "" }: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Floating action feedback
export const ActionFeedback = ({ 
  type, 
  position, 
  onComplete 
}: {
  type: "heart" | "star" | "zap" | "trophy" | "gift";
  position: { x: number; y: number };
  onComplete?: () => void;
}) => {
  const icons = {
    heart: <Heart className="h-6 w-6 text-red-500" />,
    star: <Star className="h-6 w-6 text-yellow-500" />,
    zap: <Zap className="h-6 w-6 text-blue-500" />,
    trophy: <Trophy className="h-6 w-6 text-gold-500" />,
    gift: <Gift className="h-6 w-6 text-purple-500" />
  };

  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ 
        opacity: 1, 
        scale: 0.5, 
        x: position.x, 
        y: position.y 
      }}
      animate={{ 
        opacity: 0, 
        scale: 1.5, 
        y: position.y - 100 
      }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className="fixed pointer-events-none z-50"
    >
      {icons[type]}
    </motion.div>
  );
};

export default {
  FloatingNotification,
  PulseWrapper,
  HoverCard,
  InteractiveButton,
  SuccessOverlay,
  LoadingDots,
  ConfettiEffect,
  AnimatedCounter,
  GlowBadge,
  AnimatedProgress,
  StaggerContainer,
  StaggerItem,
  ActionFeedback
};