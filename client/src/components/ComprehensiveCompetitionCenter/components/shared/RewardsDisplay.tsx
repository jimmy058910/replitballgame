/**
 * Rewards display component for tournaments and competitions
 * Shows credits and gems with proper formatting
 */

import React from 'react';
import { DollarSign, Gem } from 'lucide-react';
import { formatCredits, formatGems } from '../../utils/competition.utils';

interface RewardsDisplayProps {
  credits?: number;
  gems?: number;
  label?: string;
  className?: string;
  variant?: 'horizontal' | 'vertical';
}

export const RewardsDisplay = React.memo<RewardsDisplayProps>(({
  credits,
  gems,
  label,
  className = '',
  variant = 'horizontal'
}) => {
  if (!credits && !gems) return null;

  const content = (
    <>
      {credits && (
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4 text-green-400" />
          <span className="font-bold text-green-400">
            {formatCredits(credits)}
          </span>
        </div>
      )}
      {gems && (
        <div className="flex items-center gap-1">
          <Gem className="h-4 w-4 text-blue-400" />
          <span className="font-bold text-blue-400">
            {formatGems(gems)}
          </span>
        </div>
      )}
    </>
  );

  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {label && (
          <span className="text-sm text-gray-400">{label}:</span>
        )}
        {content}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {label && (
        <span className="text-sm text-gray-400">{label}:</span>
      )}
      {content}
    </div>
  );
});

RewardsDisplay.displayName = 'RewardsDisplay';