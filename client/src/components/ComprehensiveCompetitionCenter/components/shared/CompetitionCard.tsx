/**
 * Reusable card component for Competition Center sections
 * Provides consistent styling and layout patterns
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { cn } from '@/lib/utils';

interface CompetitionCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  gradient?: 'blue' | 'purple' | 'green' | 'orange' | 'red';
  headerClassName?: string;
  contentClassName?: string;
}

const gradientStyles = {
  blue: 'bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 border-blue-500/50',
  purple: 'bg-gradient-to-r from-purple-800 via-purple-700 to-purple-800 border-purple-500/50',
  green: 'bg-gradient-to-r from-green-800 via-green-700 to-green-800 border-green-500/50',
  orange: 'bg-gradient-to-r from-orange-800 via-orange-700 to-orange-800 border-orange-500/50',
  red: 'bg-gradient-to-r from-red-800 via-red-700 to-red-800 border-red-500/50',
};

export const CompetitionCard = React.memo<CompetitionCardProps>(({
  title,
  children,
  className,
  gradient,
  headerClassName,
  contentClassName
}) => {
  const cardClasses = cn(
    'bg-gray-800/90 border border-gray-600 shadow-xl',
    gradient && `${gradientStyles[gradient]} border-2`,
    className
  );

  if (!title) {
    return (
      <Card className={cardClasses}>
        <CardContent className={cn('p-6', contentClassName)}>
          {children}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClasses}>
      <CardHeader className={cn('pb-4', headerClassName)}>
        <CardTitle className="text-xl font-bold text-white">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('p-6 pt-0', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
});

CompetitionCard.displayName = 'CompetitionCard';