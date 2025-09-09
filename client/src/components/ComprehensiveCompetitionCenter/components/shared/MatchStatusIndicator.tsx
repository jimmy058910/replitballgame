/**
 * Match status indicator component with dynamic styling
 * Shows live status, completed results, and scheduled matches
 */

import React from 'react';
import { Badge } from '../../../ui/badge';
import { Clock, Play, CheckCircle } from 'lucide-react';

interface MatchStatusIndicatorProps {
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  homeScore?: number;
  awayScore?: number;
  gameDate?: string;
  className?: string;
}

export const MatchStatusIndicator = React.memo<MatchStatusIndicatorProps>(({
  status,
  homeScore,
  awayScore,
  gameDate,
  className = ''
}) => {
  const renderStatus = () => {
    switch (status) {
      case 'LIVE':
        return (
          <Badge className={`bg-red-600 text-red-100 animate-pulse ${className}`}>
            <Play className="w-3 h-3 mr-1" />
            LIVE
          </Badge>
        );
      
      case 'COMPLETED':
        if (homeScore !== undefined && awayScore !== undefined) {
          return (
            <div className={`flex items-center gap-2 ${className}`}>
              <Badge className="bg-green-600 text-green-100">
                <CheckCircle className="w-3 h-3 mr-1" />
                Final
              </Badge>
              <span className="text-lg font-bold text-white">
                {homeScore} - {awayScore}
              </span>
            </div>
          );
        }
        return (
          <Badge className={`bg-green-600 text-green-100 ${className}`}>
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      
      case 'SCHEDULED':
      default:
        return (
          <div className={`flex items-center gap-2 ${className}`}>
            <Badge className="bg-blue-600 text-blue-100">
              <Clock className="w-3 h-3 mr-1" />
              Scheduled
            </Badge>
            {gameDate && (
              <span className="text-sm text-gray-400">
                {new Date(gameDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            )}
          </div>
        );
    }
  };

  return <>{renderStatus()}</>;
});

MatchStatusIndicator.displayName = 'MatchStatusIndicator';