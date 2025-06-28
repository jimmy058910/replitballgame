import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function ServerTimeDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Detroit',
      timeZoneName: 'short'
    });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Clock className="w-4 h-4" />
        <span>Server Time</span>
        <span className="font-mono text-white">
          {formatTime()}
        </span>
      </div>
      <div className="text-xs text-gray-500 pl-6">
        Game Day advances at 3AM EST
      </div>
    </div>
  );
}