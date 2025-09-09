/**
 * Division badge component with Greek alphabet subdivision support
 * Displays division and subdivision with proper styling
 */

import React from 'react';
import { Badge } from '../../../ui/badge';
import { getDivisionName } from '../../utils/competition.utils';

interface DivisionBadgeProps {
  division: number;
  subdivision?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-2',
};

export const DivisionBadge = React.memo<DivisionBadgeProps>(({
  division,
  subdivision,
  className = '',
  size = 'md'
}) => {
  const divisionName = getDivisionName(division);
  const subdivisionDisplay = subdivision 
    ? subdivision.charAt(0).toUpperCase() + subdivision.slice(1)
    : 'Eta'; // Default subdivision
  
  const badgeClasses = `bg-gradient-to-r from-blue-600 to-purple-600 text-white ${sizeClasses[size]} ${className}`;
  
  return (
    <Badge className={badgeClasses}>
      Division {division} - {subdivisionDisplay}
    </Badge>
  );
});

DivisionBadge.displayName = 'DivisionBadge';