/**
 * QUERY OPTIMIZATION HELPERS - PHASE 5D
 * 
 * Production-grade query optimization utilities for:
 * - Preventing N+1 queries
 * - Efficient pagination
 * - Selective field queries
 * - Batch operations
 * - Query composition
 */

import { Prisma } from '../../prisma/generated/client';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string | number;
  orderBy?: any;
}

export interface PaginationResult<T> {
  data: T[];
  meta: {
    total?: number;
    page: number;
    limit: number;
    hasMore: boolean;
    cursor?: string | number;
  };
}

export interface BatchOperationOptions {
  chunkSize?: number;
  parallel?: boolean;
  onProgress?: (processed: number, total: number) => void;
}

export interface QueryIncludeOptions {
  maxDepth?: number;
  excludeFields?: string[];
  includeCount?: boolean;
}

// ============================================================================
// N+1 QUERY PREVENTION
// ============================================================================

export class N1QueryPrevention {
  /**
   * Generate smart includes to prevent N+1 queries
   */
  static generateSmartIncludes<T>(
    model: string,
    requestedRelations: string[],
    options: QueryIncludeOptions = {}
  ): any {
    const { maxDepth = 2, excludeFields = [] } = options;
    const includes: any = {};

    for (const relation of requestedRelations) {
      if (excludeFields.includes(relation)) continue;

      const parts = relation.split('.');
      let current = includes;

      for (let i = 0; i < Math.min(parts.length, maxDepth); i++) {
        const part = parts[i];
        
        if (i === parts.length - 1) {
          // Leaf node
          current[part] = true;
        } else {
          // Nested relation
          if (!current[part]) {
            current[part] = { include: {} };
          }
          current = current[part].include;
        }
      }
    }

    return includes;
  }

  /**
   * Optimize team includes for common queries
   */
  static getOptimizedTeamIncludes(options: {
    includePlayers?: boolean;
    includeFinances?: boolean;
    includeStadium?: boolean;
    includeStaff?: boolean;
    playerDetails?: boolean;
  } = {}): any {
    const includes: any = {};

    if (options.includePlayers) {
      includes?.players = {
        where: { isRetired: false },
        select: options.playerDetails ? {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          overallRating: true,
          age: true,
          injuryStatus: true,
          contract: {
            select: {
              salary: true,
              length: true
            }
          },
          skills: {
            include: {
              skill: {
                select: {
                  name: true,
                  type: true
                }
              }
            }
          }
        } : {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          overallRating: true
        }
      };
    }

    if (options.includeFinances) {
      includes?.finances = {
        select: {
          credits: true,
          gems: true,
          escrowCredits: true,
          projectedIncome: true,
          projectedExpenses: true
        }
      };
    }

    if (options.includeStadium) {
      includes.stadium = {
        select: {
          name: true,
          capacity: true,
          ticketPrice: true,
          facilitiesLevel: true
        }
      };
    }

    if (options.includeStaff) {
      includes.staff = {
        select: {
          id: true,
          name: true,
          type: true,
          level: true,
          contract: {
            select: {
              salary: true,
              length: true
            }
          }
        }
      };
    }

    return includes;
  }

  /**
   * Batch load related data to prevent N+1
   */
  static async batchLoadRelations<T, R>(
    items: T[],
    getKey: (item: T) => any,
    loadRelations: (keys: any[]) => Promise<R[]>,
    mapRelation: (relation: R) => any
  ): Promise<Map<any, R[]>> {
    const keys = items.map(getKey).filter(Boolean);
    const uniqueKeys = [...new Set(keys)];
    
    if (uniqueKeys.length === 0) {
      return new Map();
    }

    const relations = await loadRelations(uniqueKeys);
    const relationMap = new Map<any, R[]>();

    for (const relation of relations) {
      const key = mapRelation(relation);
      if (!relationMap.has(key)) {
        relationMap.set(key, []);
      }
      relationMap.get(key)!.push(relation);
    }

    return relationMap;
  }
}

// ============================================================================
// PAGINATION HELPERS
// ============================================================================

export class PaginationHelpers {
  /**
   * Get cursor-based pagination params
   */
  static getCursorPagination(options: PaginationOptions = {}): any {
    const { cursor, limit = 20, orderBy = { id: 'asc' } } = options;
    
    const params: any = {
      take: limit + 1, // Take one extra to check if there's more
      orderBy
    };

    if (cursor) {
      params.cursor = typeof cursor === 'number' 
        ? { id: cursor }
        : { id: parseInt(cursor) };
      params.skip = 1; // Skip the cursor item
    }

    return params;
  }

  /**
   * Get offset-based pagination params
   */
  static getOffsetPagination(options: PaginationOptions = {}): any {
    const { page = 1, limit = 20, orderBy = { id: 'asc' } } = options;
    
    return {
      skip: (page - 1) * limit,
      take: limit,
      orderBy
    };
  }

  /**
   * Process cursor pagination results
   */
  static processCursorResults<T extends { id: number }>(
    results: T[],
    limit: number
  ): PaginationResult<T> {
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;
    const lastItem = data[data.length - 1];

    return {
      data,
      meta: {
        limit,
        page: 1,
        hasMore,
        cursor: lastItem?.id
      }
    };
  }

  /**
   * Process offset pagination results with total count
   */
  static async processOffsetResults<T>(
    data: T[],
    page: number,
    limit: number,
    getTotal?: () => Promise<number>
  ): Promise<PaginationResult<T>> {
    const total = getTotal ? await getTotal() : undefined;
    const hasMore = total ? page * limit < total : data.length === limit;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        hasMore
      }
    };
  }
}

// ============================================================================
// SELECTIVE FIELD QUERIES
// ============================================================================

export class SelectiveFieldQueries {
  /**
   * Build select object from field array
   */
  static buildSelect<T>(fields: (keyof T)[]): Record<keyof T, true> {
    const select: any = {};
    for (const field of fields) {
      select[field] = true;
    }
    return select;
  }

  /**
   * Build nested select with relations
   */
  static buildNestedSelect(schema: any): any {
    const select: any = {};
    
    for (const [key, value] of Object.entries(schema)) {
      if (value === true) {
        select[key] = true;
      } else if (Array.isArray(value)) {
        select[key] = {
          select: this.buildSelect(value)
        };
      } else if (typeof value === 'object') {
        select[key] = {
          select: this.buildNestedSelect(value)
        };
      }
    }
    
    return select;
  }

  /**
   * Get minimal fields for list views
   */
  static getListViewFields(model: string): any {
    const fieldMaps: Record<string, any> = {
      team: {
        id: true,
        name: true,
        logoUrl: true,
        division: true,
        subdivision: true,
        wins: true,
        losses: true,
        points: true
      },
      player: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        overallRating: true,
        age: true,
        injuryStatus: true
      },
      game: {
        id: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        gameDate: true,
        status: true
      },
      tournament: {
        id: true,
        name: true,
        type: true,
        status: true,
        startTime: true,
        entriesCount: true
      }
    };

    return fieldMaps[model] || { id: true };
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export class BatchOperations {
  /**
   * Execute batch operation in chunks
   */
  static async executeBatch<T, R>(
    items: T[],
    operation: (batch: T[]) => Promise<R[]>,
    options: BatchOperationOptions = {}
  ): Promise<R[]> {
    const { chunkSize = 100, parallel = false, onProgress } = options;
    const results: R[] = [];
    const chunks = this.chunkArray(items, chunkSize);
    
    if (parallel) {
      // Parallel execution
      const chunkResults = await Promise.all(
        chunks.map(async (chunk, index) => {
          const result = await operation(chunk);
          if (onProgress) {
            onProgress((index + 1) * chunkSize, items.length);
          }
          return result;
        })
      );
      
      return chunkResults.flat();
    } else {
      // Sequential execution
      let processed = 0;
      
      for (const chunk of chunks) {
        const chunkResult = await operation(chunk);
        results.push(...chunkResult);
        
        processed += chunk.length;
        if (onProgress) {
          onProgress(processed, items.length);
        }
      }
      
      return results;
    }
  }

  /**
   * Batch create with validation
   */
  static async batchCreate<T>(
    model: any,
    data: T[],
    options: BatchOperationOptions = {}
  ): Promise<number> {
    const { chunkSize = 500 } = options;
    const chunks = this.chunkArray(data, chunkSize);
    let totalCreated = 0;

    for (const chunk of chunks) {
      const result = await model.createMany({
        data: chunk,
        skipDuplicates: true
      });
      totalCreated += result.count;
    }

    return totalCreated;
  }

  /**
   * Batch update with different values
   */
  static async batchUpdate<T extends { id: number }>(
    model: any,
    updates: T[],
    options: BatchOperationOptions = {}
  ): Promise<number> {
    const { chunkSize = 100, parallel = false } = options;
    const chunks = this.chunkArray(updates, chunkSize);
    let totalUpdated = 0;

    const updateChunk = async (chunk: T[]) => {
      const promises = chunk.map(item => {
        const { id, ...data } = item;
        return model.update({
          where: { id },
          data
        });
      });
      
      const results = await Promise.all(promises);
      return results.length;
    };

    if (parallel) {
      const counts = await Promise.all(chunks.map(updateChunk));
      totalUpdated = counts.reduce((sum: any, count: any) => sum + count, 0);
    } else {
      for (const chunk of chunks) {
        totalUpdated += await updateChunk(chunk);
      }
    }

    return totalUpdated;
  }

  /**
   * Chunk array into smaller arrays
   */
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// ============================================================================
// QUERY COMPOSITION
// ============================================================================

export class QueryComposer {
  private where: any = {};
  private include: any = {};
  private select: any = null;
  private orderBy: any = [];
  private take?: number;
  private skip?: number;

  /**
   * Add where condition
   */
  addWhere(condition: any): QueryComposer {
    this.where = { ...this.where, ...condition };
    return this;
  }

  /**
   * Add AND condition
   */
  andWhere(condition: any): QueryComposer {
    if (!this.where.AND) {
      this.where.AND = [];
    }
    this.where.AND.push(condition);
    return this;
  }

  /**
   * Add OR condition
   */
  orWhere(condition: any): QueryComposer {
    if (!this.where.OR) {
      this.where.OR = [];
    }
    this.where.OR.push(condition);
    return this;
  }

  /**
   * Add include relation
   */
  addInclude(relation: string, options?: any): QueryComposer {
    this.include[relation] = options || true;
    return this;
  }

  /**
   * Set select fields
   */
  setSelect(fields: any): QueryComposer {
    this.select = fields;
    return this;
  }

  /**
   * Add order by
   */
  addOrderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryComposer {
    this.orderBy.push({ [field]: direction });
    return this;
  }

  /**
   * Set pagination
   */
  setPagination(skip?: number, take?: number): QueryComposer {
    this.skip = skip;
    this.take = take;
    return this;
  }

  /**
   * Build final query
   */
  build(): any {
    const query: any = {};
    
    if (Object.keys(this.where).length > 0) {
      query.where = this.where;
    }
    
    if (this.select) {
      query.select = this.select;
    } else if (Object.keys(this.include).length > 0) {
      query.include = this.include;
    }
    
    if (this.orderBy.length > 0) {
      query.orderBy = this.orderBy.length === 1 ? this.orderBy[0] : this.orderBy;
    }
    
    if (this.skip !== undefined) {
      query.skip = this.skip;
    }
    
    if (this.take !== undefined) {
      query.take = this.take;
    }
    
    return query;
  }

  /**
   * Create new instance
   */
  static create(): QueryComposer {
    return new QueryComposer();
  }
}

// ============================================================================
// QUERY PERFORMANCE ANALYZER
// ============================================================================

export class QueryPerformanceAnalyzer {
  private static queryStats = new Map<string, {
    count: number;
    totalTime: number;
    avgTime: number;
    maxTime: number;
    minTime: number;
  }>();

  /**
   * Analyze query performance
   */
  static async analyzeQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    
    try {
      const result = await queryFn();
      const duration = Date.now() - start;
      
      this.recordQueryTime(queryName, duration);
      
      if (duration > 1000) {
        console.warn(`[SLOW QUERY] ${queryName}: ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`[QUERY ERROR] ${queryName}: ${duration}ms`, error);
      throw error;
    }
  }

  /**
   * Record query time
   */
  private static recordQueryTime(queryName: string, duration: number): void {
    const stats = this.queryStats.get(queryName) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      maxTime: 0,
      minTime: Infinity
    };

    stats.count++;
    stats.totalTime += duration;
    stats.avgTime = stats.totalTime / stats.count;
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.minTime = Math.min(stats.minTime, duration);

    this.queryStats.set(queryName, stats);
  }

  /**
   * Get performance report
   */
  static getPerformanceReport(): any {
    const report: any = {};
    
    for (const [name, stats] of this.queryStats) {
      report[name] = {
        ...stats,
        avgTime: Math.round(stats.avgTime),
        efficiency: stats.avgTime < 100 ? 'excellent' :
                   stats.avgTime < 500 ? 'good' :
                   stats.avgTime < 1000 ? 'fair' : 'poor'
      };
    }
    
    return report;
  }

  /**
   * Reset statistics
   */
  static reset(): void {
    this.queryStats.clear();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  N1QueryPrevention,
  PaginationHelpers,
  SelectiveFieldQueries,
  BatchOperations,
  QueryComposer,
  QueryPerformanceAnalyzer
};