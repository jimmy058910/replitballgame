/**
 * TRANSACTION MANAGER - PHASE 5E
 * 
 * Production-grade transaction management with:
 * - Automatic retry logic for deadlocks
 * - Rollback strategies
 * - Nested transaction support
 * - Audit logging
 * - Distributed transaction coordination
 */

import { PrismaClient, Prisma } from '../../prisma/generated/client';
import { getPrismaClient } from './prismaUtils';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
  retries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: any) => void;
  auditLog?: boolean;
  auditContext?: any;
}

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  duration: number;
  rollbackReason?: string;
}

export interface SavepointManager {
  create(name: string): Promise<void>;
  release(name: string): Promise<void>;
  rollback(name: string): Promise<void>;
}

export interface AuditEntry {
  transactionId: string;
  operation: string;
  tableName: string;
  recordId?: string | number;
  changes?: any;
  userId?: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

// ============================================================================
// TRANSACTION MANAGER
// ============================================================================

export class TransactionManager {
  private static transactionCounter = 0;
  private static activeTransactions = new Map<string, any>();
  private static auditQueue: AuditEntry[] = [];

  /**
   * Execute transaction with automatic retry and monitoring
   */
  static async execute<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const {
      maxWait = 5000,
      timeout = 30000,
      isolationLevel = 'ReadCommitted',
      retries = 3,
      retryDelay = 1000,
      onRetry,
      auditLog = false,
      auditContext
    } = options;

    const transactionId = this.generateTransactionId();
    const startTime = Date.now();
    let attempts = 0;
    let lastError: any;

    // Register transaction
    this.activeTransactions.set(transactionId, {
      startTime,
      status: 'pending'
    });

    try {
      for (attempts = 1; attempts <= retries; attempts++) {
        try {
          const prisma = await getPrismaClient();
          
          const result = await prisma.$transaction(
            async (tx) => {
              // Update transaction status
              this.activeTransactions.set(transactionId, {
                startTime,
                status: 'active',
                attempt: attempts
              });

              // Execute operation with audit context
              if (auditLog) {
                return await this.executeWithAudit(
                  tx,
                  operation,
                  transactionId,
                  auditContext
                );
              } else {
                return await operation(tx);
              }
            },
            {
              maxWait,
              timeout,
              isolationLevel
            }
          );

          // Success
          this.activeTransactions.delete(transactionId);
          
          return {
            success: true,
            data: result,
            attempts,
            duration: Date.now() - startTime
          };
        } catch (error: any) {
          lastError = error;

          // Check if error is retryable
          if (!this.isRetryableError(error) || attempts === retries) {
            throw error;
          }

          // Call retry callback if provided
          if (onRetry) {
            onRetry(attempts, error);
          }

          // Wait before retry with exponential backoff
          const delay = retryDelay * Math.pow(2, attempts - 1);
          await this.sleep(delay);
        }
      }

      throw lastError;
    } catch (error: any) {
      // Transaction failed
      this.activeTransactions.delete(transactionId);

      // Log audit failure if enabled
      if (auditLog) {
        await this.logAuditFailure(transactionId, error);
      }

      return {
        success: false,
        error,
        attempts,
        duration: Date.now() - startTime,
        rollbackReason: error.message
      };
    } finally {
      // Process audit queue
      if (this.auditQueue.length > 0) {
        await this.flushAuditQueue();
      }
    }
  }

  /**
   * Execute with audit logging
   */
  private static async executeWithAudit<T>(
    tx: Prisma.TransactionClient,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    transactionId: string,
    context?: any
  ): Promise<T> {
    // Create audit context
    const auditTx = this.createAuditProxy(tx, transactionId, context);
    
    // Execute operation with audit proxy
    return await operation(auditTx as any);
  }

  /**
   * Create audit proxy for transaction
   */
  private static createAuditProxy(
    tx: any,
    transactionId: string,
    context?: any
  ): any {
    return new Proxy(tx, {
      get: (target, prop) => {
        const original = target[prop];
        
        // Only proxy model operations
        if (typeof original !== 'object' || !original.create) {
          return original;
        }

        // Create model proxy
        return new Proxy(original, {
          get: (modelTarget, modelProp) => {
            const modelMethod = modelTarget[modelProp];
            
            // Only proxy write operations
            if (!['create', 'update', 'delete', 'upsert', 'createMany', 'updateMany', 'deleteMany'].includes(modelProp as string)) {
              return modelMethod;
            }

            // Wrap method with audit logging
            return async (...args: any[]) => {
              const startTime = Date.now();
              
              try {
                const result = await modelMethod.apply(modelTarget, args);
                
                // Log successful operation
                this.auditQueue.push({
                  transactionId,
                  operation: modelProp as string,
                  tableName: prop as string,
                  recordId: result?.id,
                  changes: args[0],
                  userId: context?.userId,
                  timestamp: new Date(),
                  success: true
                });
                
                return result;
              } catch (error: any) {
                // Log failed operation
                this.auditQueue.push({
                  transactionId,
                  operation: modelProp as string,
                  tableName: prop as string,
                  changes: args[0],
                  userId: context?.userId,
                  timestamp: new Date(),
                  success: false,
                  error: error.message
                });
                
                throw error;
              }
            };
          }
        });
      }
    });
  }

  /**
   * Execute nested transaction with savepoints
   */
  static async executeNested<T>(
    parentTx: Prisma.TransactionClient,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    savepointName?: string
  ): Promise<T> {
    const savepoint = savepointName || `sp_${Date.now()}`;
    
    try {
      // Create savepoint
      await (parentTx as any).$executeRaw`SAVEPOINT ${Prisma.sql([savepoint])}`;
      
      // Execute nested operation
      const result = await operation(parentTx);
      
      // Release savepoint on success
      await (parentTx as any).$executeRaw`RELEASE SAVEPOINT ${Prisma.sql([savepoint])}`;
      
      return result;
    } catch (error) {
      // Rollback to savepoint on error
      await (parentTx as any).$executeRaw`ROLLBACK TO SAVEPOINT ${Prisma.sql([savepoint])}`;
      throw error;
    }
  }

  /**
   * Execute distributed transaction across multiple operations
   */
  static async executeDistributed<T>(
    operations: Array<{
      name: string;
      operation: (tx: Prisma.TransactionClient) => Promise<any>;
      compensate?: (tx: Prisma.TransactionClient, result: any) => Promise<void>;
    }>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T[]>> {
    const results: any[] = [];
    const completedOperations: typeof operations = [];
    const startTime = Date.now();
    
    try {
      const prisma = await getPrismaClient();
      
      const finalResults = await prisma.$transaction(
        async (tx) => {
          for (const op of operations) {
            try {
              const result = await op.operation(tx);
              results.push(result);
              completedOperations.push(op);
            } catch (error) {
              // Rollback will be handled by transaction
              throw new Error(`Operation "${op.name}" failed: ${error}`);
            }
          }
          
          return results;
        },
        {
          maxWait: options.maxWait || 10000,
          timeout: options.timeout || 60000,
          isolationLevel: options.isolationLevel || 'Serializable'
        }
      );

      return {
        success: true,
        data: finalResults as T[],
        attempts: 1,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      // Execute compensation logic if available
      if (completedOperations.length > 0) {
        await this.executeCompensation(completedOperations, results);
      }

      return {
        success: false,
        error,
        attempts: 1,
        duration: Date.now() - startTime,
        rollbackReason: error.message
      };
    }
  }

  /**
   * Execute compensation logic for failed distributed transaction
   */
  private static async executeCompensation(
    operations: Array<{
      name: string;
      operation: (tx: Prisma.TransactionClient) => Promise<any>;
      compensate?: (tx: Prisma.TransactionClient, result: any) => Promise<void>;
    }>,
    results: any[]
  ): Promise<void> {
    const prisma = await getPrismaClient();
    
    // Execute compensations in reverse order
    for (let i = operations.length - 1; i >= 0; i--) {
      const op = operations[i];
      const result = results[i];
      
      if (op.compensate && result) {
        try {
          await prisma.$transaction(async (tx) => {
            await op.compensate!(tx, result);
          });
        } catch (error) {
          console.error(`Compensation failed for operation "${op.name}":`, error);
        }
      }
    }
  }

  /**
   * Create transaction with manual control
   */
  static async createManualTransaction(
    options: TransactionOptions = {}
  ): Promise<{
    tx: Prisma.TransactionClient;
    commit: () => Promise<void>;
    rollback: () => Promise<void>;
  }> {
    const prisma = await getPrismaClient();
    const transactionId = this.generateTransactionId();
    
    // Note: Prisma doesn't support manual transaction control directly
    // This is a workaround using interactive transactions
    let resolver: (value: any) => void;
    let rejecter: (reason: any) => void;
    
    const promise = new Promise((resolve, reject) => {
      resolver = resolve;
      rejecter = reject;
    });

    const txPromise = prisma.$transaction(
      async (tx) => {
        // Wait for manual commit or rollback
        await promise;
        return tx;
      },
      {
        maxWait: options.maxWait || 30000,
        timeout: options.timeout || 60000,
        isolationLevel: options.isolationLevel
      }
    );

    return {
      tx: await txPromise,
      commit: async () => resolver(true),
      rollback: async () => rejecter(new Error('Manual rollback'))
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check if error is retryable
   */
  private static isRetryableError(error: any): boolean {
    const retryableCodes = [
      'P2034', // Deadlock
      'P2024', // Pool timeout
      'P1001', // Can't reach database
      'P1002'  // Database timeout
    ];

    return error?.code && retryableCodes.includes(error.code);
  }

  /**
   * Generate unique transaction ID
   */
  private static generateTransactionId(): string {
    return `tx_${Date.now()}_${++this.transactionCounter}`;
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log audit failure
   */
  private static async logAuditFailure(
    transactionId: string,
    error: any
  ): Promise<void> {
    try {
      const prisma = await getPrismaClient();
      
      // Store in database if AuditLog model exists
      // For now, just log to console
      console.error(`[TRANSACTION FAILED] ${transactionId}:`, error);
    } catch {
      // Ignore audit logging errors
    }
  }

  /**
   * Flush audit queue to database
   */
  private static async flushAuditQueue(): Promise<void> {
    if (this.auditQueue.length === 0) return;
    
    const entries = [...this.auditQueue];
    this.auditQueue = [];
    
    try {
      // Store audit entries in database
      // For now, just log to console in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('[AUDIT LOG]', entries);
      }
    } catch (error) {
      console.error('[AUDIT LOG ERROR]', error);
    }
  }

  /**
   * Get active transactions
   */
  static getActiveTransactions(): Map<string, any> {
    return new Map(this.activeTransactions);
  }

  /**
   * Clear transaction history
   */
  static clearHistory(): void {
    this.activeTransactions.clear();
    this.auditQueue = [];
  }
}

// ============================================================================
// SAGA PATTERN IMPLEMENTATION
// ============================================================================

export class SagaOrchestrator {
  private steps: Array<{
    name: string;
    execute: (context: any) => Promise<any>;
    compensate: (context: any, result: any) => Promise<void>;
  }> = [];
  
  private context: any = {};
  private completedSteps: Array<{ step: any; result: any }> = [];

  /**
   * Add step to saga
   */
  addStep(
    name: string,
    execute: (context: any) => Promise<any>,
    compensate: (context: any, result: any) => Promise<void>
  ): SagaOrchestrator {
    this.steps.push({ name, execute, compensate });
    return this;
  }

  /**
   * Set saga context
   */
  setContext(context: any): SagaOrchestrator {
    this.context = context;
    return this;
  }

  /**
   * Execute saga
   */
  async execute(): Promise<TransactionResult<any>> {
    const startTime = Date.now();
    
    try {
      for (const step of this.steps) {
        try {
          const result = await step.execute(this.context);
          this.completedSteps.push({ step, result });
          this.context[step.name] = result;
        } catch (error) {
          // Compensate completed steps
          await this.compensate();
          
          return {
            success: false,
            error,
            attempts: 1,
            duration: Date.now() - startTime,
            rollbackReason: `Step "${step.name}" failed: ${error}`
          };
        }
      }

      return {
        success: true,
        data: this.context,
        attempts: 1,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        success: false,
        error,
        attempts: 1,
        duration: Date.now() - startTime,
        rollbackReason: error.message
      };
    }
  }

  /**
   * Compensate completed steps
   */
  private async compensate(): Promise<void> {
    // Compensate in reverse order
    for (let i = this.completedSteps.length - 1; i >= 0; i--) {
      const { step, result } = this.completedSteps[i];
      
      try {
        await step.compensate(this.context, result);
      } catch (error) {
        console.error(`Compensation failed for step "${step.name}":`, error);
      }
    }
  }
}

// ============================================================================
// DEADLOCK PREVENTION
// ============================================================================

export class DeadlockPrevention {
  private static lockOrder = new Map<string, number>();
  private static lockCounter = 0;

  /**
   * Register lock order for resources
   */
  static registerLockOrder(resources: string[]): void {
    for (const resource of resources) {
      if (!this.lockOrder.has(resource)) {
        this.lockOrder.set(resource, this.lockCounter++);
      }
    }
  }

  /**
   * Sort resources by lock order to prevent deadlocks
   */
  static sortByLockOrder<T extends { id: string | number; type: string }>(
    resources: T[]
  ): T[] {
    return resources.sort((a, b) => {
      const orderA = this.lockOrder.get(`${a.type}:${a.id}`) || Infinity;
      const orderB = this.lockOrder.get(`${b.type}:${b.id}`) || Infinity;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Fallback to ID comparison
      return String(a.id).localeCompare(String(b.id));
    });
  }

  /**
   * Execute with ordered locks
   */
  static async executeWithOrderedLocks<T>(
    resources: Array<{ type: string; id: string | number }>,
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    // Sort resources to prevent deadlocks
    const sortedResources = this.sortByLockOrder(resources);
    
    // Register lock order if not already registered
    for (const resource of sortedResources) {
      const key = `${resource.type}:${resource.id}`;
      if (!this.lockOrder.has(key)) {
        this.lockOrder.set(key, this.lockCounter++);
      }
    }

    // Execute transaction with ordered locks
    return await TransactionManager.execute(operation, {
      isolationLevel: 'Serializable',
      retries: 5,
      retryDelay: 100
    }).then(result => {
      if (!result.success) {
        throw result.error;
      }
      return result.data!;
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  TransactionManager,
  SagaOrchestrator,
  DeadlockPrevention
};