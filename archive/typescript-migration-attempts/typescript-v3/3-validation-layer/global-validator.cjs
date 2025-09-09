#!/usr/bin/env node

/**
 * GLOBAL VALIDATOR - TypeScript Migration v3.0
 * 
 * Prevents the regression cycles that plagued v1.0 and v2.0
 * Ensures every change improves or maintains total error count
 * 
 * Key Innovation: NO change is accepted if it increases total errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class GlobalValidator {
  constructor() {
    this.rootDir = path.resolve(__dirname, '../../../');
    this.v3Dir = path.resolve(__dirname, '../');
    this.backupDir = path.join(this.v3Dir, '4-orchestration/backups');
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    
    console.log('🛡️ Global Validator v3.0 Initialized');
    console.log(`📁 Root directory: ${this.rootDir}`);
    console.log(`💾 Backup directory: ${this.backupDir}`);
  }
  
  getCurrentErrorCount() {
    try {
      const output = execSync('npx tsc --noEmit 2>&1', {
        cwd: this.rootDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      const matches = output.match(/error TS/g);
      return matches ? matches.length : 0;
    } catch (e) {
      const output = e.stdout || e.stderr || '';
      const matches = output.match(/error TS/g);
      return matches ? matches.length : 0;
    }
  }
  
  getErrorBreakdown() {
    console.log('📊 Analyzing error breakdown...');
    
    try {
      const output = execSync('npx tsc --noEmit 2>&1', {
        cwd: this.rootDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const breakdown = {};
      const lines = output.split('\\n');
      
      for (const line of lines) {
        const match = line.match(/error (TS\\d+):/);
        if (match) {
          const errorCode = match[1];
          breakdown[errorCode] = (breakdown[errorCode] || 0) + 1;
        }
      }
      
      return breakdown;
      
    } catch (e) {
      const output = e.stdout || e.stderr || '';
      const breakdown = {};
      const lines = output.split('\\n');
      
      for (const line of lines) {
        const match = line.match(/error (TS\\d+):/);
        if (match) {
          const errorCode = match[1];
          breakdown[errorCode] = (breakdown[errorCode] || 0) + 1;
        }
      }
      
      return breakdown;
    }
  }
  
  createBackup(description = '') {
    const timestamp = Date.now();
    const backupId = `backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupId);
    
    console.log(`💾 Creating backup: ${backupId}`);
    
    try {
      fs.mkdirSync(backupPath, { recursive: true });
      
      // Files to backup
      const filesToBackup = [
        'shared/types/models.ts',
        'client/src/lib/api/queryOptions.ts',
        'client/src/lib/api/apiTypes.ts',
        'client/src/lib/api/typeGuards.ts'
      ];
      
      const backedUp = [];
      
      for (const file of filesToBackup) {
        const sourcePath = path.join(this.rootDir, file);
        if (fs.existsSync(sourcePath)) {
          const targetPath = path.join(backupPath, file);
          const targetDir = path.dirname(targetPath);
          
          fs.mkdirSync(targetDir, { recursive: true });
          fs.copyFileSync(sourcePath, targetPath);
          backedUp.push(file);
        }
      }
      
      // Save metadata
      const metadata = {
        id: backupId,
        timestamp: new Date().toISOString(),
        description,
        errorCount: this.getCurrentErrorCount(),
        errorBreakdown: this.getErrorBreakdown(),
        files: backedUp
      };
      
      fs.writeFileSync(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      console.log(`✅ Backup created with ${backedUp.length} files`);
      return backupId;
      
    } catch (error) {
      console.error(`❌ Backup failed: ${error.message}`);
      return null;
    }
  }
  
  restoreBackup(backupId) {
    const backupPath = path.join(this.backupDir, backupId);
    
    console.log(`🔄 Restoring backup: ${backupId}`);
    
    if (!fs.existsSync(backupPath)) {
      console.error(`❌ Backup not found: ${backupId}`);
      return false;
    }
    
    try {
      const metadataPath = path.join(backupPath, 'metadata.json');
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      
      for (const file of metadata.files) {
        const sourcePath = path.join(backupPath, file);
        const targetPath = path.join(this.rootDir, file);
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, targetPath);
          console.log(`✅ Restored: ${file}`);
        }
      }
      
      console.log(`🔄 Backup ${backupId} restored successfully`);
      return true;
      
    } catch (error) {
      console.error(`❌ Restore failed: ${error.message}`);
      return false;
    }
  }
  
  validateChange(beforeState, afterState, description = 'Change') {
    console.log(`\\n🔍 Validating: ${description}`);
    
    const errorChange = afterState.errorCount - beforeState.errorCount;
    const reductionPercentage = beforeState.errorCount > 0 
      ? ((beforeState.errorCount - afterState.errorCount) / beforeState.errorCount * 100).toFixed(1)
      : '0.0';
    
    console.log(`📊 Errors: ${beforeState.errorCount} → ${afterState.errorCount} (${errorChange >= 0 ? '+' : ''}${errorChange})`);
    console.log(`📈 Reduction: ${reductionPercentage}%`);
    
    const result = {
      valid: afterState.errorCount <= beforeState.errorCount,
      improved: afterState.errorCount < beforeState.errorCount,
      neutral: afterState.errorCount === beforeState.errorCount,
      regressed: afterState.errorCount > beforeState.errorCount,
      errorChange,
      reductionPercentage: parseFloat(reductionPercentage),
      beforeState,
      afterState,
      description
    };
    
    // Analyze error type changes
    result.errorTypeChanges = this.analyzeErrorTypeChanges(
      beforeState.errorBreakdown,
      afterState.errorBreakdown
    );
    
    if (result.regressed) {
      console.log(`❌ VALIDATION FAILED: ${description} increased errors by ${Math.abs(errorChange)}`);
      console.log('🚨 This change will be REJECTED and rolled back');
    } else if (result.improved) {
      console.log(`✅ VALIDATION PASSED: ${description} reduced errors by ${Math.abs(errorChange)}`);
    } else {
      console.log(`➡️ VALIDATION NEUTRAL: ${description} maintained error count`);
    }
    
    return result;
  }
  
  analyzeErrorTypeChanges(beforeBreakdown, afterBreakdown) {
    const changes = {
      reduced: {},
      increased: {},
      eliminated: {},
      introduced: {}
    };
    
    // Find all error types
    const allTypes = new Set([
      ...Object.keys(beforeBreakdown),
      ...Object.keys(afterBreakdown)
    ]);
    
    for (const type of allTypes) {
      const before = beforeBreakdown[type] || 0;
      const after = afterBreakdown[type] || 0;
      const change = after - before;
      
      if (before > 0 && after === 0) {
        changes.eliminated[type] = before;
      } else if (before === 0 && after > 0) {
        changes.introduced[type] = after;
      } else if (change < 0) {
        changes.reduced[type] = Math.abs(change);
      } else if (change > 0) {
        changes.increased[type] = change;
      }
    }
    
    return changes;
  }
  
  reportErrorTypeChanges(changes) {
    console.log('\\n📋 Error Type Analysis:');
    
    if (Object.keys(changes.eliminated).length > 0) {
      console.log('🎉 Eliminated:');
      for (const [type, count] of Object.entries(changes.eliminated)) {
        console.log(`  ✅ ${type}: -${count}`);
      }
    }
    
    if (Object.keys(changes.reduced).length > 0) {
      console.log('📉 Reduced:');
      for (const [type, count] of Object.entries(changes.reduced)) {
        console.log(`  ⬇️ ${type}: -${count}`);
      }
    }
    
    if (Object.keys(changes.increased).length > 0) {
      console.log('📈 Increased:');
      for (const [type, count] of Object.entries(changes.increased)) {
        console.log(`  ⬆️ ${type}: +${count}`);
      }
    }
    
    if (Object.keys(changes.introduced).length > 0) {
      console.log('🆕 Introduced:');
      for (const [type, count] of Object.entries(changes.introduced)) {
        console.log(`  🔴 ${type}: +${count}`);
      }
    }
  }
  
  executeWithValidation(operation, description) {
    console.log(`\\n🚀 Executing with validation: ${description}`);
    
    // Step 1: Create backup
    const backupId = this.createBackup(`Before: ${description}`);
    if (!backupId) {
      return {
        success: false,
        message: 'Failed to create backup - aborting operation'
      };
    }
    
    // Step 2: Capture before state
    const beforeState = {
      errorCount: this.getCurrentErrorCount(),
      errorBreakdown: this.getErrorBreakdown(),
      timestamp: new Date().toISOString()
    };
    
    console.log(`📊 Before state: ${beforeState.errorCount} errors`);
    
    // Step 3: Execute operation
    let operationResult;
    try {
      console.log('⚡ Executing operation...');
      operationResult = operation();
    } catch (error) {
      console.error(`❌ Operation failed: ${error.message}`);
      return {
        success: false,
        message: `Operation failed: ${error.message}`,
        backupId
      };
    }
    
    // Step 4: Capture after state
    const afterState = {
      errorCount: this.getCurrentErrorCount(),
      errorBreakdown: this.getErrorBreakdown(),
      timestamp: new Date().toISOString()
    };
    
    // Step 5: Validate changes
    const validation = this.validateChange(beforeState, afterState, description);
    this.reportErrorTypeChanges(validation.errorTypeChanges);
    
    // Step 6: Handle result
    if (validation.regressed) {
      console.log('🔄 Rolling back due to regression...');
      
      const rollbackSuccess = this.restoreBackup(backupId);
      if (rollbackSuccess) {
        const rollbackState = {
          errorCount: this.getCurrentErrorCount(),
          errorBreakdown: this.getErrorBreakdown(),
          timestamp: new Date().toISOString()
        };
        
        console.log(`✅ Rollback completed: ${rollbackState.errorCount} errors`);
        
        return {
          success: false,
          ...validation,
          rollback: {
            attempted: true,
            success: rollbackSuccess,
            finalState: rollbackState
          },
          backupId,
          operationResult,
          message: `${description} caused regression and was rolled back`
        };
      } else {
        return {
          success: false,
          ...validation,
          rollback: {
            attempted: true,
            success: false
          },
          backupId,
          operationResult,
          message: `${description} caused regression and rollback failed - manual intervention required`
        };
      }
    } else {
      console.log(`✅ ${description} validated successfully`);
      
      return {
        success: true,
        ...validation,
        backupId,
        operationResult,
        message: validation.improved 
          ? `${description} successfully reduced errors by ${validation.reductionPercentage}%`
          : `${description} completed without regression`
      };
    }
  }
  
  listBackups() {
    try {
      const backups = fs.readdirSync(this.backupDir)
        .filter(name => name.startsWith('backup-'))
        .map(name => {
          const metadataPath = path.join(this.backupDir, name, 'metadata.json');
          if (fs.existsSync(metadataPath)) {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            return metadata;
          }
          return { id: name, timestamp: 'Unknown' };
        })
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      console.log(`\\n📦 Available backups (${backups.length}):`);
      for (const backup of backups.slice(0, 10)) {
        console.log(`  ${backup.id} - ${backup.timestamp} - ${backup.errorCount || '?'} errors`);
      }
      
      return backups;
    } catch (error) {
      console.error(`❌ Failed to list backups: ${error.message}`);
      return [];
    }
  }
}

// CLI Interface
if (require.main === module) {
  const validator = new GlobalValidator();
  const command = process.argv[2];
  
  switch (command) {
    case 'backup':
      const description = process.argv[3] || 'Manual backup';
      const backupId = validator.createBackup(description);
      console.log(backupId ? `Backup created: ${backupId}` : 'Backup failed');
      break;
      
    case 'restore':
      const restoreId = process.argv[3];
      if (!restoreId) {
        console.error('Usage: node global-validator.js restore <backup-id>');
        process.exit(1);
      }
      const success = validator.restoreBackup(restoreId);
      console.log(success ? 'Restore successful' : 'Restore failed');
      break;
      
    case 'list':
      validator.listBackups();
      break;
      
    case 'validate':
      const currentErrors = validator.getCurrentErrorCount();
      const breakdown = validator.getErrorBreakdown();
      console.log(`Current errors: ${currentErrors}`);
      console.log('Error breakdown:', breakdown);
      break;
      
    default:
      console.log('Global Validator v3.0 - Usage:');
      console.log('  node global-validator.js backup [description]');
      console.log('  node global-validator.js restore <backup-id>');
      console.log('  node global-validator.js list');
      console.log('  node global-validator.js validate');
  }
}

module.exports = GlobalValidator;