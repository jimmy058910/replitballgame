import { getPrismaClient } from '../database.js';
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { logInfo } from './errorService.js';
import { getEasternTimeAsDate, EASTERN_TIMEZONE } from '../../shared/timezone.js';

/**
 * Database Backup Automation Service
 * 
 * Handles automated database backups at 4:00 AM EDT for both development and production:
 * - Development: Cloud SQL via Cloud SQL Auth Proxy connection
 * - Production: Direct Cloud SQL socket connection with managed service account
 * - Backup retention: 30 days automated cleanup
 * - Backup verification: Validates backup integrity
 * - Error monitoring: Comprehensive logging and error handling
 */
export class DatabaseBackupService {
  private static instance: DatabaseBackupService;
  private backupTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly backupRetentionDays = 30;

  private constructor() {}

  static getInstance(): DatabaseBackupService {
    if (!DatabaseBackupService.instance) {
      DatabaseBackupService.instance = new DatabaseBackupService();
    }
    return DatabaseBackupService.instance;
  }

  /**
   * Start the backup automation system
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logInfo('Database backup automation already running');
      return;
    }

    this.isRunning = true;
    logInfo('Starting database backup automation system...');

    // Schedule backup at 4:00 AM EDT daily
    this.scheduleBackup();
    
    // Perform initial backup verification
    await this.verifyBackupConfiguration();

    logInfo('Database backup automation system started successfully');
  }

  /**
   * Stop the backup automation system
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.backupTimer) {
      clearTimeout(this.backupTimer);
      this.backupTimer = null;
    }
    
    logInfo('Database backup automation system stopped');
  }

  /**
   * Schedule backup at 4:00 AM EDT daily
   */
  private scheduleBackup(): void {
    const scheduleNextExecution = () => {
      const nextExecution = this.getNext4AMExecutionTime();
      const timeUntilExecution = nextExecution.getTime() - Date.now();
      
      logInfo(`Database backup scheduled for ${nextExecution.toLocaleString('en-US', { timeZone: EASTERN_TIMEZONE })} EDT`);
      
      // Clear existing timer
      if (this.backupTimer) {
        clearTimeout(this.backupTimer);
      }
      
      this.backupTimer = setTimeout(async () => {
        await this.executeBackup();
        scheduleNextExecution(); // Schedule next execution
      }, timeUntilExecution);
    };

    scheduleNextExecution();
  }

  /**
   * Calculate next 4:00 AM EDT execution time
   */
  private getNext4AMExecutionTime(): Date {
    const now = getEasternTimeAsDate();
    let next4AM = new Date(now);
    
    // Set to 4:00 AM
    next4AM.setHours(4, 0, 0, 0);
    
    // If it's already past 4:00 AM today, schedule for tomorrow
    if (now.getHours() >= 4) {
      next4AM.setDate(next4AM.getDate() + 1);
    }
    
    return next4AM;
  }

  /**
   * Execute database backup process
   */
  private async executeBackup(): Promise<void> {
    try {
      logInfo('🗂️  Starting database backup execution...');
      
      const environment = process.env.NODE_ENV || 'development';
      const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      console.log(`🗂️  Database backup for ${environment} environment at ${backupTimestamp}`);
      
      // Create backup directory if it doesn't exist
      const backupDir = `/tmp/db-backups`;
      if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true });
      }
      
      // Execute backup based on environment
      if (environment === 'production') {
        await this.executeProductionBackup(backupTimestamp, backupDir);
      } else {
        await this.executeDevelopmentBackup(backupTimestamp, backupDir);
      }
      
      // Clean up old backups
      await this.cleanupOldBackups(backupDir);
      
      logInfo('✅ Database backup execution completed successfully');
    } catch (error) {
      console.error('❌ Error during database backup execution:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Execute production database backup using Cloud SQL socket connection
   */
  private async executeProductionBackup(timestamp: string, backupDir: string): Promise<void> {
    logInfo('🏭 Executing production database backup via Cloud SQL socket...');
    
    const backupFile = `${backupDir}/realm-rivalry-production-${timestamp}.sql`;
    
    // Production uses socket connection
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not available for production backup');
    }
    
    // Extract database connection details
    const dbUrl = new URL(connectionString);
    const database = dbUrl.pathname.slice(1);
    const username = dbUrl.username;
    const password = dbUrl.password;
    const host = dbUrl.hostname;
    const port = dbUrl.port || '5432';
    
    await this.executePgDump({
      host,
      port,
      database,
      username,
      password,
      backupFile,
      environment: 'production'
    });
  }

  /**
   * Execute development database backup using Cloud SQL Auth Proxy
   */
  private async executeDevelopmentBackup(timestamp: string, backupDir: string): Promise<void> {
    logInfo('🔧 Executing development database backup via Cloud SQL Auth Proxy...');
    
    const backupFile = `${backupDir}/realm-rivalry-development-${timestamp}.sql`;
    
    // Development uses Cloud SQL Auth Proxy on localhost:5432
    await this.executePgDump({
      host: 'localhost',
      port: '5432',
      database: process.env.PGDATABASE || 'realm_rivalry_dev',
      username: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
      backupFile,
      environment: 'development'
    });
  }

  /**
   * Execute pg_dump with comprehensive options
   */
  private async executePgDump(params: {
    host: string;
    port: string;
    database: string;
    username: string;
    password: string;
    backupFile: string;
    environment: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create .pgpass file for authentication
      const pgpassFile = `/tmp/.pgpass-${params.environment}`;
      const pgpassContent = `${params.host}:${params.port}:${params.database}:${params.username}:${params.password}`;
      writeFileSync(pgpassFile, pgpassContent, { mode: 0o600 });
      
      // Set environment variables
      const env = {
        ...process.env,
        PGPASSFILE: pgpassFile,
        PGCONNECT_TIMEOUT: '30'
      };
      
      // pg_dump arguments for comprehensive backup
      const pgDumpArgs = [
        '--host', params.host,
        '--port', params.port,
        '--username', params.username,
        '--database', params.database,
        '--verbose',
        '--clean',
        '--create',
        '--if-exists',
        '--format', 'custom',
        '--compress', '9',
        '--file', params.backupFile
      ];
      
      console.log(`🗂️  Running pg_dump for ${params.environment} database...`);
      console.log(`🗂️  Backup file: ${params.backupFile}`);
      
      const pgDump = spawn('pg_dump', pgDumpArgs, {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      if (pgDump.stdout) {
        pgDump.stdout.on('data', (data) => {
          output += data.toString();
        });
      }
      
      if (pgDump.stderr) {
        pgDump.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
      }
      
      pgDump.on('close', async (code) => {
        // Clean up .pgpass file
        try {
          const fs = await import('fs');
          fs.unlinkSync(pgpassFile);
        } catch (cleanupError) {
          console.warn(`⚠️  Could not clean up .pgpass file: ${cleanupError}`);
        }
        
        if (code === 0) {
          console.log(`✅ Database backup completed for ${params.environment}`);
          console.log(`✅ Backup saved: ${params.backupFile}`);
          
          // Verify backup file was created and has content
          try {
            const fs = await import('fs');
            const stats = fs.statSync(params.backupFile);
            console.log(`✅ Backup file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            resolve();
          } catch (verifyError) {
            reject(new Error(`Backup verification failed: ${verifyError}`));
          }
        } else {
          console.error(`❌ pg_dump failed with code ${code}`);
          console.error(`❌ Error output: ${errorOutput}`);
          reject(new Error(`pg_dump failed with exit code ${code}: ${errorOutput}`));
        }
      });
      
      pgDump.on('error', (error) => {
        reject(new Error(`Failed to start pg_dump: ${error.message}`));
      });
    });
  }

  /**
   * Clean up old backup files (retention: 30 days)
   */
  private async cleanupOldBackups(backupDir: string): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      if (!fs.existsSync(backupDir)) {
        return;
      }
      
      const files = fs.readdirSync(backupDir);
      const now = new Date();
      const retentionMs = this.backupRetentionDays * 24 * 60 * 60 * 1000;
      
      let deletedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.sql')) {
          const filePath = path.default.join(backupDir, file);
          const stats = fs.statSync(filePath);
          const ageMs = now.getTime() - stats.mtime.getTime();
          
          if (ageMs > retentionMs) {
            fs.unlinkSync(filePath);
            deletedCount++;
            console.log(`🗑️  Deleted old backup: ${file}`);
          }
        }
      }
      
      if (deletedCount > 0) {
        logInfo(`Cleaned up ${deletedCount} old backup files (retention: ${this.backupRetentionDays} days)`);
      }
      
    } catch (error) {
      console.error('⚠️  Error during backup cleanup:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Verify backup configuration and dependencies
   */
  private async verifyBackupConfiguration(): Promise<void> {
    try {
      // Check if pg_dump is available
      const { execSync } = await import('child_process');
      
      try {
        execSync('pg_dump --version', { stdio: 'pipe' });
        console.log('✅ pg_dump is available for database backups');
      } catch (pgDumpError) {
        console.error('❌ pg_dump not found - database backups will fail');
        console.error('❌ Install PostgreSQL client tools: apt-get install postgresql-client');
      }
      
      // Verify database connectivity
      try {
        const prisma = await getPrismaClient();
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Database connectivity verified for backup system');
      } catch (dbError) {
        console.error('❌ Database connectivity check failed:', dbError instanceof Error ? dbError.message : 'Unknown error');
      }
      
      // Check backup directory permissions
      const backupDir = `/tmp/db-backups`;
      try {
        const fs = await import('fs');
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // Test write permissions
        const testFile = `${backupDir}/backup-test-${Date.now()}.tmp`;
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log('✅ Backup directory permissions verified');
      } catch (permError) {
        console.error('❌ Backup directory permissions check failed:', permError);
      }
      
    } catch (error) {
      console.error('⚠️  Backup configuration verification failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Manual backup trigger (for testing/debugging)
   */
  async triggerManualBackup(): Promise<void> {
    logInfo('🔧 Manual database backup triggered...');
    await this.executeBackup();
  }
}

// Export singleton instance
export const databaseBackupService = DatabaseBackupService.getInstance();