/**
 * Pagination Utilities
 * Standardized pagination for all API endpoints
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class PaginationService {
  /**
   * Default pagination settings
   */
  static readonly DEFAULT_LIMIT = 20;
  static readonly MAX_LIMIT = 100;
  static readonly DEFAULT_PAGE = 1;

  /**
   * Parse pagination parameters from request
   */
  static parsePaginationParams(query: any): PaginationParams {
    const page = Math.max(1, parseInt(query.page) || this.DEFAULT_PAGE);
    const limit = Math.min(
      this.MAX_LIMIT,
      Math.max(1, parseInt(query.limit) || this.DEFAULT_LIMIT)
    );
    const sortBy = query.sortBy || 'id';
    const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';
    const search = query.search || '';

    return {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
    };
  }

  /**
   * Calculate pagination metadata
   */
  static calculatePagination(
    page: number,
    limit: number,
    total: number
  ) {
    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;

    return {
      page,
      limit,
      total,
      pages,
      hasNext,
      hasPrev,
    };
  }

  /**
   * Get Prisma skip/take parameters
   */
  static getPrismaParams(params: PaginationParams) {
    const { page = this.DEFAULT_PAGE, limit = this.DEFAULT_LIMIT } = params;
    
    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  /**
   * Create standardized paginated response
   */
  static createResponse<T>(
    data: T[],
    total: number,
    params: PaginationParams
  ): PaginatedResponse<T> {
    const { page = this.DEFAULT_PAGE, limit = this.DEFAULT_LIMIT } = params;
    const pagination = this.calculatePagination(page, limit, total);

    return {
      data,
      pagination,
    };
  }

  /**
   * Get sort order for Prisma
   */
  static getPrismaSort(sortBy: string, sortOrder: 'asc' | 'desc') {
    return {
      [sortBy]: sortOrder,
    };
  }

  /**
   * Create search filter for text fields
   */
  static createSearchFilter(search: string, fields: string[]) {
    if (!search) return {};

    return {
      OR: fields.map(field => ({
        [field]: {
          contains: search,
          mode: 'insensitive' as const,
        },
      })),
    };
  }

  /**
   * Paginate array in memory (for non-database operations)
   */
  static paginateArray<T>(
    array: T[],
    params: PaginationParams
  ): PaginatedResponse<T> {
    const { page = this.DEFAULT_PAGE, limit = this.DEFAULT_LIMIT } = params;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const data = array.slice(startIndex, endIndex);
    const total = array.length;
    const pagination = this.calculatePagination(page, limit, total);

    return {
      data,
      pagination,
    };
  }

  /**
   * Get pagination info from URL parameters
   */
  static getPaginationFromUrl(url: URL): PaginationParams {
    const searchParams = url.searchParams;
    
    return {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || this.DEFAULT_LIMIT.toString()),
      sortBy: searchParams.get('sortBy') || 'id',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
      search: searchParams.get('search') || '',
    };
  }
}

/**
 * Cursor-based pagination for high-performance scenarios
 */
export class CursorPaginationService {
  /**
   * Create cursor-based pagination response
   */
  static createCursorResponse<T extends { id: number }>(
    data: T[],
    limit: number,
    cursor?: number
  ) {
    const hasNext = data.length === limit;
    const nextCursor = hasNext ? data[data.length - 1]?.id : null;
    
    return {
      data: hasNext ? data.slice(0, -1) : data,
      pagination: {
        limit,
        cursor,
        nextCursor,
        hasNext,
      },
    };
  }

  /**
   * Get Prisma cursor parameters
   */
  static getPrismaCursorParams(cursor?: number, limit: number = PaginationService.DEFAULT_LIMIT) {
    return {
      take: limit + 1, // Take one extra to check if there's a next page
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // Skip the cursor item
    };
  }
}

export default PaginationService;