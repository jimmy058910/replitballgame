/**
 * Paginated List Component
 * Handles pagination and infinite scrolling for large datasets
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, MoreHorizontal, Loader2 } from 'lucide-react';

interface PaginatedListProps<T> {
  items: T[];
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  renderSkeleton?: () => React.ReactNode;
  className?: string;
  showPaginationInfo?: boolean;
  showJumpButtons?: boolean;
  infiniteScroll?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

export function PaginatedList<T>({
  items,
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  isLoading = false,
  renderItem,
  renderSkeleton,
  className = '',
  showPaginationInfo = true,
  showJumpButtons = true,
  infiniteScroll = false,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
}: PaginatedListProps<T>) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    
    return pages;
  };

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!infiniteScroll || !onLoadMore || loadingMore || !hasMore) return;
    
    const scrollTop = window.pageYOffset;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    if (scrollTop + windowHeight >= documentHeight - 200) {
      onLoadMore();
    }
  }, [infiniteScroll, onLoadMore, loadingMore, hasMore]);

  // @ts-expect-error TS7030
  useEffect(() => {
    if (infiniteScroll) {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [infiniteScroll, handleScroll]);

  const defaultSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 6 }, (_, i) => (
        <Card key={i} className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Pagination Info */}
      {showPaginationInfo && totalItems > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>
            Showing {startItem} to {endItem} of {totalItems} results
          </span>
          <Badge variant="outline" className="text-xs">
            Page {currentPage} of {totalPages}
          </Badge>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-4">
        {isLoading ? (
          renderSkeleton ? renderSkeleton() : defaultSkeleton()
        ) : items.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 text-center">
              <div className="text-gray-400">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-semibold mb-2">No items found</h3>
                <p className="text-sm">Try adjusting your filters or search criteria.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          items.map((item, index) => (
            <div key={index}>
              {renderItem(item, index)}
            </div>
          ))
        )}
      </div>

      {/* Infinite Scroll Loading */}
      {infiniteScroll && loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Pagination Controls */}
      {!infiniteScroll && totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {getPageNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <Button variant="ghost" size="sm" disabled>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                >
                  {page}
                </Button>
              )}
            </React.Fragment>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Jump to Page */}
      {showJumpButtons && totalPages > 10 && (
        <div className="flex items-center justify-center space-x-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </Button>
        </div>
      )}
    </div>
  );
}

export default PaginatedList;