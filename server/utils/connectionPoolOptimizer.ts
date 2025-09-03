/**
 * CLOUD SQL CONNECTION POOL OPTIMIZER
 * Implements connection management for Google Cloud SQL PostgreSQL
 */

import { PrismaClient } from "../db";

export class ConnectionPoolOptimizer {
  private static instance: ConnectionPoolOptimizer;
  private lastActivity: number = Date.now();
  private autoDisconnectTimer: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  
  // Cloud SQL optimized settings
  private readonly IDLE_TIMEOUT = 300 * 1000; // 5 minutes
  private readonly FORCE_DISCONNECT_INTERVAL = 240 * 1000; // 4 minutes
  
  constructor(private prisma: PrismaClient) {
    this.startAggressiveOptimization();
  }
  
  static getInstance(prisma: PrismaClient): ConnectionPoolOptimizer {
    if (!ConnectionPoolOptimizer.instance) {
      ConnectionPoolOptimizer.instance = new ConnectionPoolOptimizer(prisma);
    }
    return ConnectionPoolOptimizer.instance;
  }
  
  private startAggressiveOptimization() {
    console.log('🔧 [OPTIMIZER] Starting Cloud SQL connection optimization');
    
    // Force disconnect every 4 minutes for connection pool management
    setInterval(async () => {
      console.log('🔧 [OPTIMIZER] Scheduled disconnect for Cloud SQL pool management');
      await this.forceDisconnect();
    }, this.FORCE_DISCONNECT_INTERVAL);
    
    // Monitor idle connections every 30 seconds
    setInterval(() => {
      const idleTime = Date.now() - this.lastActivity;
      if (idleTime > this.IDLE_TIMEOUT && this.isConnected) {
        console.log(`🔧 [OPTIMIZER] Idle connection detected (${Math.round(idleTime/1000)}s) - disconnecting`);
        this.forceDisconnect();
      }
    }, 30 * 1000);
  }
  
  public trackActivity() {
    this.lastActivity = Date.now();
    this.isConnected = true;
    
    // Reset auto-disconnect timer
    if (this.autoDisconnectTimer) {
      clearTimeout(this.autoDisconnectTimer);
    }
    
    // Set new timer for 60 seconds
    this.autoDisconnectTimer = setTimeout(() => {
      this.forceDisconnect();
    }, this.IDLE_TIMEOUT);
  }
  
  private async forceDisconnect() {
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      console.log('✅ [OPTIMIZER] Database disconnected - Cloud SQL pool optimized');
    } catch (error) {
      console.log('⚠️ [OPTIMIZER] Disconnect completed (connection may have been closed)');
      this.isConnected = false;
    }
  }
  
  public async emergencyCleanup() {
    console.log('🚨 [OPTIMIZER] Emergency cleanup initiated');
    if (this.autoDisconnectTimer) {
      clearTimeout(this.autoDisconnectTimer);
    }
    await this.forceDisconnect();
  }
  
  // Wrap database operations to minimize connection time
  public async executeWithOptimization<T>(operation: () => Promise<T>): Promise<T> {
    this.trackActivity();
    try {
      const result = await operation();
      
      // Immediate disconnect after operation (ultra-aggressive)
      setTimeout(() => {
        this.forceDisconnect();
      }, 1000); // 1 second delay to ensure operation completes
      
      return result;
    } catch (error) {
      // Disconnect even on error
      await this.forceDisconnect();
      throw error;
    }
  }
}

export default ConnectionPoolOptimizer;