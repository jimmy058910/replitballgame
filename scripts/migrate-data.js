#!/usr/bin/env node

/**
 * Data Migration Script
 * Exports data from jules-testing-merges branch and imports to clean production branch
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const EXPORT_FILE = 'data-export.sql';
const LOG_FILE = 'migration.log';

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    log(`Starting: ${description}`);
    log(`Command: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        log(`ERROR in ${description}: ${error.message}`);
        log(`STDERR: ${stderr}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        log(`STDERR (non-fatal): ${stderr}`);
      }
      
      log(`SUCCESS: ${description}`);
      if (stdout) {
        log(`STDOUT: ${stdout}`);
      }
      resolve(stdout);
    });
  });
}

async function migrateData() {
  try {
    log('=== STARTING DATA MIGRATION ===');
    
    // Check required environment variables
    const sourceDb = process.env.SOURCE_DATABASE_URL;
    const targetDb = process.env.TARGET_DATABASE_URL;
    
    if (!sourceDb) {
      throw new Error('SOURCE_DATABASE_URL environment variable is required');
    }
    
    if (!targetDb) {
      throw new Error('TARGET_DATABASE_URL environment variable is required');
    }
    
    log(`Source DB: ${sourceDb.substring(0, 50)}...`);
    log(`Target DB: ${targetDb.substring(0, 50)}...`);
    
    // Step 1: Export data from source database
    log('=== STEP 1: EXPORTING DATA ===');
    const exportCommand = `pg_dump "${sourceDb}" --data-only --no-owner --no-privileges > ${EXPORT_FILE}`;
    await runCommand(exportCommand, 'Export data from jules-testing-merges');
    
    // Verify export file was created
    if (!fs.existsSync(EXPORT_FILE)) {
      throw new Error('Export file was not created');
    }
    
    const exportSize = fs.statSync(EXPORT_FILE).size;
    log(`Export file created: ${EXPORT_FILE} (${exportSize} bytes)`);
    
    // Step 2: Import data to target database
    log('=== STEP 2: IMPORTING DATA ===');
    const importCommand = `psql "${targetDb}" < ${EXPORT_FILE}`;
    await runCommand(importCommand, 'Import data to clean production branch');
    
    log('=== MIGRATION COMPLETED SUCCESSFULLY ===');
    
    // Cleanup
    log('Cleaning up temporary files...');
    if (fs.existsSync(EXPORT_FILE)) {
      fs.unlinkSync(EXPORT_FILE);
      log('Export file deleted');
    }
    
  } catch (error) {
    log(`MIGRATION FAILED: ${error.message}`);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateData();
}

module.exports = { migrateData };