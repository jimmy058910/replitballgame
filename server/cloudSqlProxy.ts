import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import net from 'net';

/**
 * COMPREHENSIVE CLOUD SQL AUTH PROXY MANAGER
 * 
 * Industry-standard approach for dual environment database connectivity:
 * - Development: Cloud SQL Auth Proxy via localhost:5432
 * - Production: Direct Cloud SQL socket connection
 */

export interface CloudSqlProxyConfig {
  connectionName: string;
  port: number;
  host: string;
  credentialsPath: string;
  verbose?: boolean;
}

export class CloudSqlProxyManager {
  private proxyProcess: ChildProcess | null = null;
  private readonly config: CloudSqlProxyConfig;
  private readonly proxyBinary = './cloud_sql_proxy';
  
  constructor(config: CloudSqlProxyConfig) {
    this.config = config;
  }

  /**
   * Start Cloud SQL Auth Proxy with comprehensive error handling
   */
  async startProxy(): Promise<boolean> {
    try {
      console.log('🚀 [CloudSqlProxy] Starting Cloud SQL Auth Proxy...');
      
      // Verify proxy binary exists
      if (!fs.existsSync(this.proxyBinary)) {
        throw new Error(`Cloud SQL Auth Proxy binary not found at ${this.proxyBinary}`);
      }

      // Create credentials file from environment variable
      const credentialsContent = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      if (!credentialsContent) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable not set');
      }

      // Write credentials to temporary file
      fs.writeFileSync(this.config.credentialsPath, credentialsContent, { mode: 0o600 });
      console.log('✅ [CloudSqlProxy] Created credentials file');

      // Kill any existing proxy processes
      await this.stopProxy();

      // Build proxy command arguments with CORRECT Cloud SQL Auth Proxy flags
      const args = [
        `-instances=${this.config.connectionName}=tcp:${this.config.port}`,
        `-credential_file=${this.config.credentialsPath}` // FIXED: single dash, singular form
      ];

      if (this.config.verbose) {
        args.push('--verbose');
      }

      console.log('🔧 [CloudSqlProxy] Configuration:', {
        connectionName: this.config.connectionName,
        listenAddress: `${this.config.host}:${this.config.port}`,
        credentialsPath: this.config.credentialsPath,
        verbose: this.config.verbose || false
      });

      // Start the proxy process
      this.proxyProcess = spawn(this.proxyBinary, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      // Handle proxy process events
      this.proxyProcess.on('error', (error) => {
        console.error('❌ [CloudSqlProxy] Process error:', error.message);
      });

      this.proxyProcess.on('exit', (code, signal) => {
        console.log(`⚠️ [CloudSqlProxy] Process exited with code ${code}, signal ${signal}`);
        this.proxyProcess = null;
      });

      // Log proxy output
      if (this.proxyProcess.stdout) {
        this.proxyProcess.stdout.on('data', (data) => {
          console.log(`📋 [CloudSqlProxy] ${data.toString().trim()}`);
        });
      }

      if (this.proxyProcess.stderr) {
        this.proxyProcess.stderr.on('data', (data) => {
          console.error(`⚠️ [CloudSqlProxy] ${data.toString().trim()}`);
        });
      }

      // Wait for proxy to be ready
      const proxyReady = await this.waitForProxy(10000); // 10 second timeout
      
      if (proxyReady) {
        console.log('✅ [CloudSqlProxy] Started successfully and accepting connections');
        return true;
      } else {
        console.error('❌ [CloudSqlProxy] Failed to start within timeout period');
        await this.stopProxy();
        return false;
      }

    } catch (error) {
      console.error('❌ [CloudSqlProxy] Startup failed:', error);
      return false;
    }
  }

  /**
   * Wait for proxy to accept connections
   */
  private async waitForProxy(timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const socket = new net.Socket();
        const connected = await new Promise<boolean>((resolve) => {
          socket.setTimeout(1000);
          
          socket.on('connect', () => {
            socket.end();
            resolve(true);
          });
          
          socket.on('error', () => {
            resolve(false);
          });
          
          socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
          });
          
          socket.connect(this.config.port, this.config.host);
        });
        
        if (connected) {
          return true;
        }
        
      } catch (error) {
        // Connection failed, continue waiting
      }
      
      // Wait 500ms before retrying
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return false;
  }

  /**
   * Stop Cloud SQL Auth Proxy
   */
  async stopProxy(): Promise<void> {
    if (this.proxyProcess) {
      console.log('🛑 [CloudSqlProxy] Stopping proxy process...');
      
      // Send SIGTERM
      this.proxyProcess.kill('SIGTERM');
      
      // Wait up to 5 seconds for graceful shutdown
      const shutdownPromise = new Promise<void>((resolve) => {
        if (this.proxyProcess) {
          this.proxyProcess.on('exit', () => resolve());
        } else {
          resolve();
        }
      });
      
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 5000);
      });
      
      await Promise.race([shutdownPromise, timeoutPromise]);
      
      // Force kill if still running
      if (this.proxyProcess && !this.proxyProcess.killed) {
        console.log('🔨 [CloudSqlProxy] Force killing proxy process...');
        this.proxyProcess.kill('SIGKILL');
      }
      
      this.proxyProcess = null;
      console.log('✅ [CloudSqlProxy] Proxy stopped');
    }

    // Clean up credentials file
    if (fs.existsSync(this.config.credentialsPath)) {
      fs.unlinkSync(this.config.credentialsPath);
    }

    // Kill any lingering proxy processes
    try {
      const { exec } = require('child_process');
      exec('pkill -f cloud_sql_proxy', () => {
        // Ignore errors - this is just cleanup
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Check if proxy is running and accepting connections
   */
  async isProxyReady(): Promise<boolean> {
    if (!this.proxyProcess || this.proxyProcess.killed) {
      return false;
    }

    return this.waitForProxy(1000); // Quick 1-second check
  }

  /**
   * Get proxy status information
   */
  getStatus(): { running: boolean; pid?: number } {
    if (this.proxyProcess && !this.proxyProcess.killed) {
      return {
        running: true,
        pid: this.proxyProcess.pid
      };
    }
    
    return { running: false };
  }
}

// Singleton proxy manager for development environment
let proxyManager: CloudSqlProxyManager | null = null;

/**
 * Get or create Cloud SQL Auth Proxy manager for development
 */
export function getCloudSqlProxyManager(): CloudSqlProxyManager {
  if (!proxyManager) {
    const config: CloudSqlProxyConfig = {
      connectionName: 'direct-glider-465821-p7:us-central1:realm-rivalry-dev',
      port: 5432,
      host: '0.0.0.0',
      credentialsPath: '/tmp/cloudsql-credentials.json',
      verbose: process.env.NODE_ENV === 'development'
    };
    
    proxyManager = new CloudSqlProxyManager(config);
  }
  
  return proxyManager;
}

/**
 * Initialize Cloud SQL Auth Proxy for development environment
 */
export async function initializeCloudSqlProxy(): Promise<boolean> {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Only start proxy in development
  if (nodeEnv === 'development') {
    console.log('🔧 [CloudSqlProxy] Initializing Cloud SQL Auth Proxy for development...');
    
    const manager = getCloudSqlProxyManager();
    const started = await manager.startProxy();
    
    if (started) {
      console.log('✅ [CloudSqlProxy] Development database proxy ready');
      
      // Set up cleanup on process exit
      process.on('exit', () => {
        manager.stopProxy();
      });
      
      process.on('SIGINT', () => {
        manager.stopProxy().then(() => process.exit(0));
      });
      
      process.on('SIGTERM', () => {
        manager.stopProxy().then(() => process.exit(0));
      });
      
      return true;
    } else {
      console.error('❌ [CloudSqlProxy] Failed to start proxy - database operations will use fallback');
      return false;
    }
  } else {
    console.log('🏭 [CloudSqlProxy] Production environment - using direct Cloud SQL socket connection');
    return true; // Not needed in production
  }
}