/**
 * ENHANCED DATABASE CONFIGURATION - PHASE 5C
 * 
 * Production-grade database connection management with:
 * - Optimized connection pooling
 * - Performance monitoring
 * - Automatic retry logic
 * - Health checks
 * - Query performance tracking
 */

import { PrismaClient, Prisma } from '../../prisma/generated/client';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface DatabaseConfig {
  connectionLimit?: number;
  poolTimeout?: number;
  poolSize?: number;
  maxIdleTime?: number;
  statementTimeout?: number;
  queryTimeout?: number;
  logSlowQueries?: boolean;
  slowQueryThreshold?: number;
  enableQueryMetrics?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

const DEFAULT_CONFIG: DatabaseConfig = {
  connectionLimit: parseInt(process.env.DATABASE_CONNECTION_LIMIT || '20'),
  poolTimeout: parseInt(process.env.DATABASE_POOL_TIMEOUT || '10'),
  poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
  maxIdleTime: parseInt(process.env.DATABASE_MAX_IDLE_TIME || '30000'),
  statementTimeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '30000'),
  queryTimeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT || '30000'),
  logSlowQueries: process.env.LOG_SLOW_QUERIES === 'true',
  slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'),
  enableQueryMetrics: process.env.ENABLE_QUERY_METRICS === 'true',
  retryAttempts: parseInt(process.env.DATABASE_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.DATABASE_RETRY_DELAY || '1000')
};

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

interface QueryMetrics {
  totalQueries: number;
  slowQueries: number;
  errorQueries: number;
  averageTime: number;
  peakTime: number;
  queryTimes: number[];
  slowQueryLog: SlowQuery[];
}

interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any;
}

class PerformanceMonitor {
  private static metrics: QueryMetrics = {
    totalQueries: 0,
    slowQueries: 0,
    errorQueries: 0,
    averageTime: 0,
    peakTime: 0,
    queryTimes: [],
    slowQueryLog: []
  };

  private static MAX_QUERY_HISTORY = 1000;
  private static MAX_SLOW_QUERY_LOG = 100;

  static recordQuery(duration: number, query?: string, params?: any): void {
    this.metrics.totalQueries++;
    this.metrics.queryTimes.push(duration);

    // Keep only recent queries
    if (this.metrics.queryTimes.length > this.MAX_QUERY_HISTORY) {
      this.metrics.queryTimes.shift();
    }

    // Update average
    const sum = this.metrics.queryTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageTime = sum / this.metrics.queryTimes.length;

    // Update peak
    if (duration > this.metrics.peakTime) {
      this.metrics.peakTime = duration;
    }

    // Log slow queries
    if (duration > DEFAULT_CONFIG.slowQueryThreshold!) {
      this.metrics.slowQueries++;
      
      if (query) {
        this.metrics.slowQueryLog.push({
          query,
          duration,
          timestamp: new Date(),
          params
        });

        // Keep only recent slow queries
        if (this.metrics.slowQueryLog.length > this.MAX_SLOW_QUERY_LOG) {
          this.metrics.slowQueryLog.shift();
        }
      }

      console.warn(`[SLOW QUERY] ${duration}ms:`, query?.substring(0, 100));
    }
  }

  static recordError(): void {
    this.metrics.errorQueries++;
  }

  static getMetrics(): QueryMetrics {
    return { ...this.metrics };
  }

  static resetMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      errorQueries: 0,
      averageTime: 0,
      peakTime: 0,
      queryTimes: [],
      slowQueryLog: []
    };
  }
}

// ============================================================================
// CONNECTION POOL MANAGER
// ============================================================================

class ConnectionPoolManager {
  private static instances = new Map<string, PrismaClient>();
  private static healthCheckInterval: NodeJS.Timer | null = null;
  private static connectionStats = {
    activeConnections: 0,
    idleConnections: 0,
    totalCreated: 0,
    totalClosed: 0,
    lastHealthCheck: null as Date | null,
    isHealthy: true
  };

  /**
   * Get or create optimized Prisma client
   */
  static getClient(config: DatabaseConfig = DEFAULT_CONFIG): PrismaClient {
    const key = 'main';
    
    if (!this.instances.has(key)) {
      const client = this.createOptimizedClient(config);
      this.instances.set(key, client);
      this.connectionStats.totalCreated++;
      
      // Start health checks
      if (!this.healthCheckInterval) {
        this.startHealthChecks();
      }
    }

    return this.instances.get(key)!;
  }

  /**
   * Create optimized Prisma client with monitoring
   */
  private static createOptimizedClient(config: DatabaseConfig): PrismaClient {
    const logLevels: Prisma.LogLevel[] = ['error', 'warn'];
    
    if (process.env.NODE_ENV !== 'production') {
      logLevels.push('info');
    }
    
    if (config.enableQueryMetrics) {
      logLevels.push('query');
    }

    const client = new PrismaClient({
      log: logLevels.map(level => ({
        level,
        emit: 'event'
      })),
      errorFormat: 'minimal'
    });

    // Set up event listeners
    this.setupEventListeners(client, config);

    // Apply connection pool settings via raw query
    this.applyPoolSettings(client, config);

    return client;
  }

  /**
   * Set up performance monitoring event listeners
   */
  private static setupEventListeners(client: PrismaClient, config: DatabaseConfig): void {
    // Query event monitoring
    if (config.enableQueryMetrics) {
      (client.$on as any)('query', (e: any) => {
        PerformanceMonitor.recordQuery(e.duration, e.query, e.params);
      });
    }

    // Error monitoring
    (client.$on as any)('error', (e: any) => {
      PerformanceMonitor.recordError();
      console.error('[DATABASE ERROR]', e);
    });

    // Warning monitoring
    (client.$on as any)('warn', (e: any) => {
      console.warn('[DATABASE WARNING]', e);
    });
  }

  /**
   * Apply connection pool settings
   */
  private static async applyPoolSettings(
    client: PrismaClient,
    config: DatabaseConfig
  ): Promise<void> {
    try {
      // Set statement timeout
      if (config.statementTimeout) {
        await client.$executeRaw`SET statement_timeout = ${config.statementTimeout}`;
      }

      // Log configuration
      console.log('[DATABASE] Connection pool configured:', {
        connectionLimit: config.connectionLimit,
        poolTimeout: config.poolTimeout,
        poolSize: config.poolSize,
        maxIdleTime: config.maxIdleTime
      });
    } catch (error) {
      console.error('[DATABASE] Failed to apply pool settings:', error);
    }
  }

  /**
   * Start periodic health checks
   */
  private static startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform database health check
   */
  private static async performHealthCheck(): Promise<boolean> {
    try {
      const client = this.instances.get('main');
      if (!client) return false;

      const start = Date.now();
      await client.$queryRaw`SELECT 1`;
      const duration = Date.now() - start;

      this.connectionStats.lastHealthCheck = new Date();
      this.connectionStats.isHealthy = duration < 1000; // Healthy if under 1 second

      if (!this.connectionStats.isHealthy) {
        console.warn(`[DATABASE] Health check slow: ${duration}ms`);
      }

      return this.connectionStats.isHealthy;
    } catch (error) {
      this.connectionStats.isHealthy = false;
      console.error('[DATABASE] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get connection statistics
   */
  static getConnectionStats(): typeof ConnectionPoolManager.connectionStats {
    return { ...this.connectionStats };
  }

  /**
   * Gracefully disconnect all clients
   */
  static async disconnectAll(): Promise<void> {
    for (const [key, client] of this.instances) {
      await client.$disconnect();
      this.connectionStats.totalClosed++;
    }
    
    this.instances.clear();
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

class RetryHandler {
  /**
   * Execute operation with automatic retry
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: DatabaseConfig = DEFAULT_CONFIG
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= config.retryAttempts!; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === config.retryAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = config.retryDelay! * Math.pow(2, attempt - 1);
        console.warn(`[DATABASE] Retry attempt ${attempt}/${config.retryAttempts} after ${delay}ms`);
        
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable
   */
  private static isRetryableError(error: any): boolean {
    const retryableCodes = [
      'P1001', // Can't reach database
      'P1002', // Database timeout
      'P2024', // Pool timeout
      'P2034'  // Deadlock
    ];

    return error?.code && retryableCodes.includes(error.code);
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// ENHANCED DATABASE CLIENT
// ============================================================================

export class EnhancedDatabaseClient {
  private static client: PrismaClient | null = null;
  private static config: DatabaseConfig = DEFAULT_CONFIG;

  /**
   * Get optimized Prisma client
   */
  static getClient(): PrismaClient {
    if (!this.client) {
      this.client = ConnectionPoolManager.getClient(this.config);
    }
    return this.client;
  }

  /**
   * Update configuration
   */
  static updateConfig(config: Partial<DatabaseConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Reconnect with new config
    if (this.client) {
      this.disconnect().then(() => {
        this.client = ConnectionPoolManager.getClient(this.config);
      });
    }
  }

  /**
   * Execute query with retry and monitoring
   */
  static async executeQuery<T>(
    operation: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    return RetryHandler.executeWithRetry(async () => {
      const client = this.getClient();
      const start = Date.now();
      
      try {
        const result = await operation(client);
        const duration = Date.now() - start;
        
        if (this.config.enableQueryMetrics) {
          PerformanceMonitor.recordQuery(duration);
        }
        
        return result;
      } catch (error) {
        PerformanceMonitor.recordError();
        throw error;
      }
    }, this.config);
  }

  /**
   * Execute transaction with monitoring
   */
  static async executeTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    }
  ): Promise<T> {
    return RetryHandler.executeWithRetry(async () => {
      const client = this.getClient();
      const start = Date.now();
      
      try {
        const result = await client.$transaction(operation, {
          maxWait: options?.maxWait || 5000,
          timeout: options?.timeout || 30000,
          isolationLevel: options?.isolationLevel || 'ReadCommitted'
        });
        
        const duration = Date.now() - start;
        
        if (this.config.enableQueryMetrics) {
          PerformanceMonitor.recordQuery(duration, 'TRANSACTION');
        }
        
        return result;
      } catch (error) {
        PerformanceMonitor.recordError();
        throw error;
      }
    }, this.config);
  }

  /**
   * Get performance metrics
   */
  static getMetrics(): {
    queries: QueryMetrics;
    connections: typeof ConnectionPoolManager.connectionStats;
  } {
    return {
      queries: PerformanceMonitor.getMetrics(),
      connections: ConnectionPoolManager.getConnectionStats()
    };
  }

  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    PerformanceMonitor.resetMetrics();
  }

  /**
   * Perform health check
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const client = this.getClient();
      await client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Disconnect client
   */
  static async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.$disconnect();
      this.client = null;
    }
  }

  /**
   * Graceful shutdown
   */
  static async shutdown(): Promise<void> {
    await ConnectionPoolManager.disconnectAll();
    this.client = null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DatabaseConfig,
  QueryMetrics,
  SlowQuery,
  PerformanceMonitor,
  ConnectionPoolManager,
  RetryHandler
};

// Export singleton instance for backward compatibility
export const enhancedDb = EnhancedDatabaseClient;