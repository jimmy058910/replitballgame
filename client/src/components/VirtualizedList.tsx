/**
 * Virtualized List Components
 * High-performance list rendering for large datasets
 */
import { FixedSizeList as List, VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  className?: string;
  hasNextPage?: boolean;
  isNextPageLoading?: boolean;
  loadNextPage?: () => Promise<void>;
  estimatedItemSize?: number;
  overscan?: number;
}

/**
 * Fixed-size virtualized list for uniform item heights
 */
export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight = 60,
  className,
  hasNextPage = false,
  isNextPageLoading = false,
  loadNextPage,
  overscan = 5,
}: VirtualizedListProps<T>) {
  const itemCount = hasNextPage ? items.length + 1 : items.length;
  
  const isItemLoaded = (index: number) => {
    return !hasNextPage || index < items.length;
  };

  const Item = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    let content;
    
    if (!isItemLoaded(index)) {
      content = (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    } else {
      content = renderItem(items[index], index);
    }

    return (
      <div style={style} className="border-b border-border last:border-b-0">
        {content}
      </div>
    );
  };

  return (
    <div className={cn("h-full w-full", className)}>
      <AutoSizer>
        {({ height, width }) => (
          <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={itemCount}
            loadMoreItems={loadNextPage || (() => Promise.resolve())}
          >
            {({ onItemsRendered, ref }) => (
              <List
                ref={ref}
                height={height}
                width={width}
                itemCount={itemCount}
                itemSize={itemHeight}
                onItemsRendered={onItemsRendered}
                overscanCount={overscan}
              >
                {Item}
              </List>
            )}
          </InfiniteLoader>
        )}
      </AutoSizer>
    </div>
  );
}

/**
 * Variable-size virtualized list for dynamic item heights
 */
export function VariableSizeVirtualizedList<T>({
  items,
  renderItem,
  className,
  hasNextPage = false,
  isNextPageLoading = false,
  loadNextPage,
  estimatedItemSize = 60,
  overscan = 5,
}: VirtualizedListProps<T>) {
  const itemCount = hasNextPage ? items.length + 1 : items.length;
  
  const isItemLoaded = (index: number) => {
    return !hasNextPage || index < items.length;
  };

  const getItemSize = (index: number) => {
    // This should be replaced with actual size calculation
    // For now, using estimated size
    return estimatedItemSize;
  };

  const Item = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    let content;
    
    if (!isItemLoaded(index)) {
      content = (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    } else {
      content = renderItem(items[index], index);
    }

    return (
      <div style={style} className="border-b border-border last:border-b-0">
        {content}
      </div>
    );
  };

  return (
    <div className={cn("h-full w-full", className)}>
      <AutoSizer>
        {({ height, width }) => (
          <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={itemCount}
            loadMoreItems={loadNextPage || (() => Promise.resolve())}
          >
            {({ onItemsRendered, ref }) => (
              <VariableSizeList
                ref={ref}
                height={height}
                width={width}
                itemCount={itemCount}
                itemSize={getItemSize}
                onItemsRendered={onItemsRendered}
                overscanCount={overscan}
                estimatedItemSize={estimatedItemSize}
              >
                {Item}
              </VariableSizeList>
            )}
          </InfiniteLoader>
        )}
      </AutoSizer>
    </div>
  );
}

/**
 * Specialized player list with virtualization
 */
interface PlayerListProps {
  players: any[];
  onPlayerClick?: (player: any) => void;
  className?: string;
  hasNextPage?: boolean;
  isNextPageLoading?: boolean;
  loadNextPage?: () => Promise<void>;
}

export function VirtualizedPlayerList({
  players,
  onPlayerClick,
  className,
  hasNextPage,
  isNextPageLoading,
  loadNextPage,
}: PlayerListProps) {
  const renderPlayer = (player: any, index: number) => (
    <div
      key={player.id}
      onClick={() => onPlayerClick?.(player)}
      className={cn(
        "flex items-center space-x-3 p-3 hover:bg-accent cursor-pointer",
        onPlayerClick && "cursor-pointer"
      )}
    >
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-sm font-medium">
            {player.firstName[0]}{player.lastName[0]}
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium truncate">
            {player.firstName} {player.lastName}
          </h3>
          <span className="text-xs text-muted-foreground">
            {player.race}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {player.role} • Age {player.age}
        </p>
      </div>
      <div className="flex-shrink-0">
        <div className="text-right">
          <div className="text-sm font-medium">
            PWR: {Math.round((player.speed + player.power + player.agility + player.throwing + player.catching + player.kicking) / 6)}
          </div>
          <div className="text-xs text-muted-foreground">
            {player.dailyStaminaLevel}% STM
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <VirtualizedList
      items={players}
      renderItem={renderPlayer}
      itemHeight={70}
      className={className}
      hasNextPage={hasNextPage}
      isNextPageLoading={isNextPageLoading}
      loadNextPage={loadNextPage}
    />
  );
}

/**
 * Specialized match list with virtualization
 */
interface MatchListProps {
  matches: any[];
  onMatchClick?: (match: any) => void;
  className?: string;
  hasNextPage?: boolean;
  isNextPageLoading?: boolean;
  loadNextPage?: () => Promise<void>;
}

export function VirtualizedMatchList({
  matches,
  onMatchClick,
  className,
  hasNextPage,
  isNextPageLoading,
  loadNextPage,
}: MatchListProps) {
  const renderMatch = (match: any, index: number) => (
    <div
      key={match.id}
      onClick={() => onMatchClick?.(match)}
      className={cn(
        "flex items-center space-x-3 p-3 hover:bg-accent",
        onMatchClick && "cursor-pointer"
      )}
    >
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">
              {match.homeTeam?.name} vs {match.awayTeam?.name}
            </span>
            <span className={cn(
              "text-xs px-2 py-1 rounded-full",
              match.status === 'COMPLETED' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
              match.status === 'IN_PROGRESS' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
              match.status === 'SCHEDULED' && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            )}>
              {match.status}
            </span>
          </div>
          {match.homeScore !== null && match.awayScore !== null && (
            <div className="text-sm font-medium">
              {match.homeScore} - {match.awayScore}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4 mt-1">
          <span className="text-xs text-muted-foreground">
            {match.matchType}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(match.gameDate).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <VirtualizedList
      items={matches}
      renderItem={renderMatch}
      itemHeight={80}
      className={className}
      hasNextPage={hasNextPage}
      isNextPageLoading={isNextPageLoading}
      loadNextPage={loadNextPage}
    />
  );
}

export default VirtualizedList;