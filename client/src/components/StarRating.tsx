import React from 'react';
import { 
  applyScoutAccuracy, 
  getFullStars, 
  hasHalfStar, 
  getEmptyStars, 
  getPotentialTier 
} from '../../../shared/potentialSystem';

interface StarRatingProps {
  potential: number;
  showDecimal?: boolean;
  compact?: boolean;
  scoutAccuracy?: number; // Scout rating 1-40 for fog of war
  className?: string;
  showTier?: boolean;
}

/**
 * Unified Star Rating Component
 * Displays potential ratings consistently across all UI components
 */
export function StarRating({ 
  potential, 
  showDecimal = true, 
  compact = false, 
  scoutAccuracy,
  className = "",
  showTier = false
}: StarRatingProps) {
  // Apply scout fog of war if scout rating provided
  const scoutData = scoutAccuracy ? 
    applyScoutAccuracy(potential, scoutAccuracy) : 
    { displayPotential: potential, isExact: true, range: { min: potential, max: potential } };
  
  const displayPotential = scoutData.displayPotential;
  const isExact = scoutData.isExact;
  
  // Handle hidden potential (no scout)
  if (scoutAccuracy === 0) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="flex">
          {Array(5).fill(0).map((_, i) => (
            <span key={i} className="text-gray-600">?</span>
          ))}
        </div>
        {showDecimal && (
          <span className="text-sm text-gray-400 ml-1">
            ?/5.0
          </span>
        )}
      </div>
    );
  }

  const fullStars = getFullStars(displayPotential);
  const showHalfStar = hasHalfStar(displayPotential);
  const emptyStars = getEmptyStars(displayPotential);
  const tier = getPotentialTier(displayPotential);

  // Compact mobile view
  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`} title={`${displayPotential.toFixed(1)}/5.0 - ${tier.tier} Potential`}>
        <div className="flex text-sm">
          {Array(fullStars).fill(0).map((_, i) => (
            <span key={`full-${i}`} className="text-yellow-400">★</span>
          ))}
          {showHalfStar && <span className="text-yellow-400">⭐</span>}
          {Array(emptyStars).fill(0).map((_, i) => (
            <span key={`empty-${i}`} className="text-gray-400">☆</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Star Display */}
      <div className="flex items-center gap-1">
        <div className="flex">
          {/* Full stars */}
          {Array(fullStars).fill(0).map((_, i) => (
            <span key={`full-${i}`} className="text-yellow-400 text-lg">★</span>
          ))}
          {/* Half star */}
          {showHalfStar && <span className="text-yellow-400 text-lg">⭐</span>}
          {/* Empty stars */}
          {Array(emptyStars).fill(0).map((_, i) => (
            <span key={`empty-${i}`} className="text-gray-400 text-lg">☆</span>
          ))}
        </div>
        
        {/* Decimal Display */}
        {showDecimal && (
          <span className="text-sm text-gray-400 ml-1">
            {isExact ? displayPotential.toFixed(1) : `~${displayPotential.toFixed(1)}`}/5.0
          </span>
        )}
      </div>
      
      {/* Tier Badge */}
      {showTier && (
        <span className={`text-xs px-2 py-1 rounded-full border ${tier.color} border-current`}>
          {tier.tier}
        </span>
      )}
      
      {/* Scout Accuracy Indicator */}
      {!isExact && scoutAccuracy && (
        <span className="text-xs text-gray-500" title={`Scout Accuracy: ±${((scoutData.range.max - scoutData.range.min) / 2).toFixed(1)}`}>
          📊
        </span>
      )}
    </div>
  );
}

/**
 * Simplified star display for tight spaces
 */
export function CompactStars({ potential, scoutAccuracy }: { potential: number; scoutAccuracy?: number }) {
  return (
    <StarRating 
      potential={potential} 
      showDecimal={false} 
      compact={true} 
      scoutAccuracy={scoutAccuracy}
    />
  );
}

/**
 * Full star display with tier information
 */
export function DetailedStars({ potential, scoutAccuracy }: { potential: number; scoutAccuracy?: number }) {
  return (
    <StarRating 
      potential={potential} 
      showDecimal={true} 
      compact={false} 
      scoutAccuracy={scoutAccuracy}
      showTier={true}
    />
  );
}