/**
 * Cloud SQL Auth Proxy Manager for Development Environment
 * 
 * Ensures the proxy is running and handles process lifecycle management
 * Industry standard solution that eliminates IP whitelisting entirely
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export class CloudSqlProxyManager {
  private static instance: CloudSqlProxyManager;
  private proxyProcess: any = null;
  private isStarting = false;

  private constructor() {}

  static getInstance(): CloudSqlProxyManager {
    if (!CloudSqlProxyManager.instance) {
      CloudSqlProxyManager.instance = new CloudSqlProxyManager();
    }
    return CloudSqlProxyManager.instance;
  }

  async ensureProxyRunning(): Promise<boolean> {
    // Check if already running
    if (await this.isProxyRunning()) {
      console.log('✅ Cloud SQL Auth Proxy already running');
      return true;
    }

    // Prevent multiple simultaneous starts
    if (this.isStarting) {
      console.log('⏳ Proxy startup already in progress, waiting...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      return await this.isProxyRunning();
    }

    return await this.startProxy();
  }

  private async isProxyRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('ps aux | grep cloud-sql-proxy | grep -v grep');
      const isRunning = stdout.trim().length > 0;
      console.log('🔍 Proxy process check:', {
        processFound: isRunning,
        processDetails: isRunning ? stdout.trim() : 'No process found'
      });
      return isRunning;
    } catch (error) {
      console.log('🔍 Proxy process check failed:', error.message);
      return false;
    }
  }

  private async startProxy(): Promise<boolean> {
    this.isStarting = true;
    
    try {
      console.log('🚀 Starting Cloud SQL Auth Proxy...');
      
      // Set up service account authentication
      const credentialsPath = '/tmp/cloud-sql-proxy/service-account-key.json';
      
      // Ensure service account key exists
      if (!await this.ensureServiceAccountKey(credentialsPath)) {
        throw new Error('Service account key not available');
      }

      // Check if proxy binary exists
      const fs = await import('fs');
      const proxyBinaryPath = '/tmp/cloud-sql-proxy/cloud-sql-proxy';
      
      if (!fs.existsSync(proxyBinaryPath)) {
        console.log('❌ Cloud SQL Auth Proxy binary not found, downloading...');
        await this.downloadProxyBinary();
      }

      // Start proxy process with detailed logging
      console.log('🔧 Starting proxy with credentials:', credentialsPath);
      this.proxyProcess = spawn(proxyBinaryPath, [
        '--address', '0.0.0.0',
        '--port', '5433',
        'direct-glider-465821-p7:us-central1:realm-rivalry-dev'
      ], {
        env: {
          ...process.env,
          GOOGLE_APPLICATION_CREDENTIALS: credentialsPath
        },
        detached: false, // Keep attached for debugging
        stdio: ['ignore', 'pipe', 'pipe'] // Capture stdout/stderr
      });

      // Log proxy output for debugging
      this.proxyProcess.stdout?.on('data', (data: Buffer) => {
        console.log('📡 Proxy stdout:', data.toString().trim());
      });

      this.proxyProcess.stderr?.on('data', (data: Buffer) => {
        console.log('📡 Proxy stderr:', data.toString().trim());
      });

      this.proxyProcess.on('exit', (code: number, signal: string) => {
        console.log(`📡 Proxy process exited with code ${code}, signal ${signal}`);
        this.proxyProcess = null;
      });

      // Wait for startup
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const isRunning = await this.isProxyRunning();
      
      if (isRunning) {
        console.log('✅ Cloud SQL Auth Proxy started successfully');
        console.log('📍 Listening on localhost:5433');
      } else {
        console.log('❌ Failed to start Cloud SQL Auth Proxy');
      }
      
      return isRunning;
      
    } catch (error) {
      console.error('❌ Error starting Cloud SQL Auth Proxy:', error);
      return false;
    } finally {
      this.isStarting = false;
    }
  }

  private async ensureServiceAccountKey(credentialsPath: string): Promise<boolean> {
    const fs = await import('fs');
    const path = await import('path');
    
    // Check if file already exists
    if (fs.existsSync(credentialsPath)) {
      return true;
    }

    // Create from environment variable
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY environment variable not set');
      return false;
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(credentialsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Decode and write service account key
      const keyData = Buffer.from(serviceAccountKey, 'base64').toString('utf-8');
      fs.writeFileSync(credentialsPath, keyData, { mode: 0o600 });
      
      console.log('✅ Service account key created');
      return true;
    } catch (error) {
      console.error('❌ Failed to create service account key:', error);
      return false;
    }
  }

  private async downloadProxyBinary(): Promise<void> {
    const fs = await import('fs');
    const https = await import('https');
    const { execSync } = await import('child_process');
    
    try {
      console.log('📥 Downloading Cloud SQL Auth Proxy...');
      
      // Create directory
      execSync('mkdir -p /tmp/cloud-sql-proxy');
      
      // Download the proxy binary
      execSync('curl -L https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.0/cloud-sql-proxy.linux.amd64 -o /tmp/cloud-sql-proxy/cloud-sql-proxy');
      
      // Make executable
      execSync('chmod +x /tmp/cloud-sql-proxy/cloud-sql-proxy');
      
      console.log('✅ Cloud SQL Auth Proxy binary downloaded and ready');
    } catch (error) {
      console.error('❌ Failed to download proxy binary:', error);
      throw new Error('Could not download Cloud SQL Auth Proxy');
    }
  }

  async stopProxy(): Promise<void> {
    if (this.proxyProcess) {
      this.proxyProcess.kill();
      this.proxyProcess = null;
    }
    
    // Kill any running proxy processes
    try {
      await execAsync('pkill -f cloud-sql-proxy');
    } catch {
      // Ignore errors if no processes found
    }
  }
}

// Export singleton instance
export const proxyManager = CloudSqlProxyManager.getInstance();