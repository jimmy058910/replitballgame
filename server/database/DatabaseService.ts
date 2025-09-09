import { PrismaClient } from '../../prisma/generated/client';

/**
 * DATABASE OPTIMIZATION AGENT (DOA) - CRITICAL FOUNDATION
 * 
 * Centralized Database Service with singleton pattern and connection pooling
 * 
 * PERFORMANCE TARGET: Reduce database connections from 937 to <50
 * OPTIMIZATION GOAL: 40-60% improvement in query response times
 * 
 * Key Features:
 * - Singleton pattern with connection reuse
 * - Cloud Run + Cloud SQL optimized configuration
 * - Connection pooling for dome ball game workload
 * - Query optimization utilities
 * - Performance monitoring and logging
 */

interface DatabaseConnectionConfig {
  maxConnections: number;
  connectionTimeoutMs: number;
  poolTimeoutMs: number;
  environment: 'development' | 'production';
}

interface QueryPerformanceMetrics {
  queryCount: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  slowQueryThreshold: number;
  slowQueries: Array<{
    query: string;
    executionTime: number;
    timestamp: Date;
  }>;
}

export class DatabaseService {
  private static instance: PrismaClient | null = null;
  private static initializationPromise: Promise<PrismaClient> | null = null;
  private static connectionConfig: DatabaseConnectionConfig;
  private static performanceMetrics: QueryPerformanceMetrics = {
    queryCount: 0,
    totalExecutionTime: 0,
    averageExecutionTime: 0,
    slowQueryThreshold: 1000, // 1 second
    slowQueries: []
  };

  /**
   * Get optimized database configuration based on environment
   */
  private static getDatabaseConfig(): DatabaseConnectionConfig {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';

    return {
      maxConnections: isProduction ? 1 : 5, // Cloud Run serverless optimization
      connectionTimeoutMs: isProduction ? 60000 : 20000, // 60s prod, 20s dev
      poolTimeoutMs: isProduction ? 20000 : 10000, // 20s prod, 10s dev
      environment: isProduction ? 'production' : 'development'
    };
  }

  /**
   * Get database URL with connection optimization parameters
   */
  private static getOptimizedDatabaseUrl(): string {
    const baseUrl = process.env.DATABASE_URL;
    if (!baseUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    const config = this.getDatabaseConfig();
    const separator = baseUrl.includes('?') ? '&' : '?';
    
    // Add connection optimization parameters
    const optimizations = [
      `connection_limit=${config.maxConnections}`,
      `pool_timeout=${Math.floor(config.poolTimeoutMs / 1000)}`,
      `connect_timeout=${Math.floor(config.connectionTimeoutMs / 1000)}`,
      'statement_cache_size=100', // Optimize for repeated queries
      'prepared_statement_cache_queries=512' // Cache dome ball simulation queries
    ];

    return `${baseUrl}${separator}${optimizations.join('&')}`;
  }

  /**
   * Get singleton Prisma client instance with optimized configuration
   */
  static getInstance(): Promise<PrismaClient> {
    if (this.instance) {
      return Promise.resolve(this.instance);
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeDatabase();
    return this.initializationPromise;
  }

  /**
   * Initialize database with Cloud Run + Cloud SQL optimizations
   */
  private static async initializeDatabase(): Promise<PrismaClient> {
    try {
      this.connectionConfig = this.getDatabaseConfig();
      const optimizedUrl = this.getOptimizedDatabaseUrl();

      console.log('🟢 DOA: Initializing optimized database connection...', {
        environment: this.connectionConfig.environment,
        maxConnections: this.connectionConfig.maxConnections,
        connectionTimeout: this.connectionConfig.connectionTimeoutMs + 'ms',
        poolTimeout: this.connectionConfig.poolTimeoutMs + 'ms'
      });

      // Create Prisma client with dome ball game optimizations
      const prismaConfig: any = {
        datasources: {
          db: {
            url: optimizedUrl
          }
        },
        log: this.connectionConfig.environment === 'development' 
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'event', level: 'info' },
              { emit: 'event', level: 'warn' },
              { emit: 'event', level: 'error' }
            ]
          : [
              { emit: 'event', level: 'error' },
              { emit: 'event', level: 'warn' }
            ]
      };

      this.instance = new PrismaClient(prismaConfig);

      // Set up query performance monitoring
      this.setupPerformanceMonitoring();

      // Test connection
      await this.instance.$queryRaw`SELECT 1 as connection_test`;
      console.log('✅ DOA: Database connection established successfully');

      return this.instance;

    } catch (error) {
      console.error('❌ DOA: Database initialization failed:', error);
      this.initializationPromise = null;
      this.instance = null;
      throw error;
    }
  }

  /**
   * Set up query performance monitoring for optimization tracking
   */
  private static setupPerformanceMonitoring(): void {
    if (!this.instance) return;

    this.instance.$on('query', (event: any) => {
      const executionTime = event.duration;
      
      this.performanceMetrics.queryCount++;
      this.performanceMetrics.totalExecutionTime += executionTime;
      this.performanceMetrics.averageExecutionTime = 
        this.performanceMetrics.totalExecutionTime / this.performanceMetrics.queryCount;

      // Track slow queries for optimization opportunities
      if (executionTime > this.performanceMetrics.slowQueryThreshold) {
        this.performanceMetrics.slowQueries.push({
          query: event.query.substring(0, 200) + '...', // Truncate for logs
          executionTime,
          timestamp: new Date()
        });

        // Keep only last 50 slow queries to prevent memory issues
        if (this.performanceMetrics.slowQueries.length > 50) {
          this.performanceMetrics.slowQueries = this.performanceMetrics.slowQueries.slice(-50);
        }

        if (this.connectionConfig.environment === 'development') {
          console.warn(`🐌 DOA: Slow query detected (${executionTime}ms):`, event.query.substring(0, 100));
        }
      }
    });

    this.instance.$on('info', (event: any) => {
      if (this.connectionConfig.environment === 'development') {
        console.log('ℹ️ DOA:', event.message);
      }
    });

    this.instance.$on('warn', (event: any) => {
      console.warn('⚠️ DOA:', event.message);
    });

    this.instance.$on('error', (event: any) => {
      console.error('❌ DOA:', event.message);
    });
  }

  /**
   * Get current performance metrics for monitoring
   */
  static getPerformanceMetrics(): QueryPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Reset performance metrics (useful for benchmarking)
   */
  static resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      queryCount: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      slowQueryThreshold: 1000,
      slowQueries: []
    };
  }

  /**
   * Optimized query helper with automatic pagination and field selection
   * 
   * @param model - Prisma model name
   * @param operation - Query operation (findMany, findUnique, etc.)
   * @param args - Query arguments
   * @param pagination - Optional pagination settings
   */
  static async executeOptimizedQuery(
    model: string,
    operation: string,
    args: any = {},
    pagination?: { limit?: number; offset?: number }
  ): Promise<any> {
    const client = await this.getInstance();
    const startTime = Date.now();

    try {
      // Apply pagination if provided
      if (pagination && operation === 'findMany') {
        args.take = pagination.limit || 20;
        args.skip = pagination.offset || 0;
      }

      // Execute query
      const result = await (client as any)[model][operation](args);
      
      const executionTime = Date.now() - startTime;
      console.log(`🟢 DOA: Optimized ${model}.${operation} completed in ${executionTime}ms`);

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ DOA: Query failed after ${executionTime}ms:`, {
        model,
        operation,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Dome ball specific optimizations for high-frequency operations
   */
  static async getDomeBallTeamData(teamId: number): Promise<any> {
    const client = await this.getInstance();
    
    // Optimized query with specific field selection for dome ball gameplay
    return await client.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        division: true,
        subdivision: true,
        wins: true,
        losses: true,
        draws: true,
        points: true,
        // Only include essential player data for game simulation
        players: {
          select: {
            id: true,
            name: true,
            position: true,
            race: true,
            stamina: true,
            injured: true,
            // Essential dome ball skills
            skills: {
              where: {
                skillType: {
                  in: ['PASSING', 'RUNNING', 'BLOCKING', 'INTERCEPTION', 'SPEED', 'STRENGTH']
                }
              },
              select: {
                skillType: true,
                value: true
              }
            }
          }
        },
        // Stadium data for atmosphere effects
        stadium: {
          select: {
            id: true,
            name: true,
            capacity: true,
            fieldSize: true,
            atmosphereLevel: true
          }
        }
      }
    });
  }

  /**
   * Optimized match simulation queries for real-time dome ball gameplay
   */
  static async getMatchSimulationData(gameId: number): Promise<any> {
    const client = await this.getInstance();
    
    return await client.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        status: true,
        homeTeamId: true,
        awayTeamId: true,
        matchType: true,
        scheduledTime: true,
        // Essential team data for simulation
        homeTeam: {
          select: {
            id: true,
            name: true,
            tacticalFocus: true,
            fieldSize: true,
            // Only active players for simulation
            players: {
              where: {
                injured: false,
                stamina: { gte: 20 }
              },
              select: {
                id: true,
                name: true,
                position: true,
                race: true,
                stamina: true,
                skills: {
                  select: {
                    skillType: true,
                    value: true
                  }
                }
              }
            }
          }
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            tacticalFocus: true,
            fieldSize: true,
            // Only active players for simulation
            players: {
              where: {
                injured: false,
                stamina: { gte: 20 }
              },
              select: {
                id: true,
                name: true,
                position: true,
                race: true,
                stamina: true,
                skills: {
                  select: {
                    skillType: true,
                    value: true
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  /**
   * Gracefully disconnect from database
   */
  static async disconnect(): Promise<void> {
    if (this.instance) {
      console.log('🟢 DOA: Disconnecting from database...');
      
      // Log final performance metrics
      const metrics = this.getPerformanceMetrics();
      console.log('📊 DOA: Final performance metrics:', {
        totalQueries: metrics.queryCount,
        averageExecutionTime: metrics.averageExecutionTime.toFixed(2) + 'ms',
        slowQueries: metrics.slowQueries.length,
        connectionOptimization: 'Singleton pattern applied'
      });

      await this.instance.$disconnect();
      this.instance = null;
      this.initializationPromise = null;
      console.log('✅ DOA: Database disconnected successfully');
    }
  }

  /**
   * Health check for monitoring systems
   */
  static async healthCheck(): Promise<{
    connected: boolean;
    responseTime: number;
    metrics: QueryPerformanceMetrics;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const client = await this.getInstance();
      await client.$queryRaw`SELECT 1 as health_check`;
      
      const responseTime = Date.now() - startTime;
      
      return {
        connected: true,
        responseTime,
        metrics: this.getPerformanceMetrics()
      };
    } catch (error) {
      return {
        connected: false,
        responseTime: Date.now() - startTime,
        metrics: this.getPerformanceMetrics(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance getter for backward compatibility
export async function getPrismaClient(): Promise<PrismaClient> {
  return DatabaseService.getInstance();
}

// Export direct access for critical operations - removed duplicate export