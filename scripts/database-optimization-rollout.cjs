/**
 * DATABASE OPTIMIZATION AGENT (DOA) - SYSTEMATIC ROLLOUT SCRIPT
 * 
 * This script systematically replaces database connection patterns across the codebase
 * Target: Replace 937 database connections with singleton pattern
 * 
 * Phase 1: High-usage service files (completed)
 * Phase 2: Storage layer files
 * Phase 3: Route files
 * Phase 4: Validation and performance testing
 */

const fs = require('fs');
const path = require('path');

// Files to update with their connection counts
const targetFiles = [
  // Storage files (high priority)
  { path: 'server/storage/userStorage.ts', connections: 3 },
  { path: 'server/storage/tournamentStorage.ts', connections: 14 },
  { path: 'server/storage/stadiumStorage.ts', connections: 7 },
  { path: 'server/storage/playerStorage.ts', connections: 15 },
  { path: 'server/storage/matchStorage.ts', connections: 10 },
  { path: 'server/storage/leagueStorage.ts', connections: 8 },
  
  // Service files (critical path)
  { path: 'server/services/enhancedGameEconomyService.ts', connections: 10 },
  { path: 'server/services/enhancedMarketplaceService.ts', connections: 11 },
  { path: 'server/services/enhancedTeamManagementService.ts', connections: 17 },
  { path: 'server/services/unifiedTournamentAutomation.ts', connections: 8 },
  { path: 'server/services/quickMatchSimulation.ts', connections: 3 },
  
  // Route files (medium priority)
  { path: 'server/routes/enhancedFinanceRoutes.ts', connections: 25 },
  { path: 'server/routes/enhancedLeagueRoutes.ts', connections: 40 },
  { path: 'server/routes/adminRoutes.ts', connections: 25 },
  { path: 'server/routes/teamRoutes.ts', connections: 20 }
];

class DatabaseOptimizationRollout {
  constructor() {
    this.projectRoot = process.cwd();
    this.totalReplacements = 0;
    this.completedFiles = [];
    this.failedFiles = [];
  }

  /**
   * Replace database connections in a single file
   */
  updateFile(relativePath) {
    const fullPath = path.join(this.projectRoot, relativePath);
    
    try {
      if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️ File not found: ${relativePath}`);
        this.failedFiles.push({ file: relativePath, error: 'File not found' });
        return false;
      }

      let content = fs.readFileSync(fullPath, 'utf8');
      let replacementCount = 0;

      // Track original content for comparison
      const originalContent = content;

      // Replace import statement
      if (content.includes("import { getPrismaClient } from '../database.js';")) {
        content = content.replace(
          "import { getPrismaClient } from '../database.js';",
          "import { DatabaseService } from '../database/DatabaseService.js';"
        );
        replacementCount++;
      }

      if (content.includes('import { getPrismaClient } from "../database.js";')) {
        content = content.replace(
          'import { getPrismaClient } from "../database.js";',
          'import { DatabaseService } from "../database/DatabaseService.js";'
        );
        replacementCount++;
      }

      // Replace all getPrismaClient() calls
      const connectionPattern = /const prisma = await getPrismaClient\(\);/g;
      const matches = content.match(connectionPattern);
      if (matches) {
        content = content.replace(
          connectionPattern,
          'const prisma = await DatabaseService.getInstance();'
        );
        replacementCount += matches.length;
      }

      // Only write file if changes were made
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Updated ${relativePath} - ${replacementCount} replacements`);
        this.completedFiles.push({ file: relativePath, replacements: replacementCount });
        this.totalReplacements += replacementCount;
        return true;
      } else {
        console.log(`ℹ️ No changes needed for ${relativePath}`);
        return true;
      }

    } catch (error) {
      console.error(`❌ Failed to update ${relativePath}:`, error.message);
      this.failedFiles.push({ file: relativePath, error: error.message });
      return false;
    }
  }

  /**
   * Run systematic rollout across all target files
   */
  async runSystematicRollout() {
    console.log('🟢 DOA: Starting systematic database optimization rollout...');
    console.log(`📋 Target files: ${targetFiles.length}`);
    console.log(`🎯 Expected connections to optimize: ${targetFiles.reduce((sum, f) => sum + f.connections, 0)}`);

    let successCount = 0;
    let failureCount = 0;

    for (const fileInfo of targetFiles) {
      console.log(`\n📁 Processing: ${fileInfo.path} (${fileInfo.connections} connections)`);
      
      const success = this.updateFile(fileInfo.path);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    // Generate completion report
    this.generateCompletionReport(successCount, failureCount);
  }

  /**
   * Generate completion report
   */
  generateCompletionReport(successCount, failureCount) {
    const totalFiles = targetFiles.length;
    const successRate = (successCount / totalFiles * 100).toFixed(2);
    
    console.log(`
🎯 DATABASE OPTIMIZATION AGENT (DOA) - ROLLOUT COMPLETE
═══════════════════════════════════════════════════════

📊 ROLLOUT STATISTICS:
  ✅ Files Updated: ${successCount}/${totalFiles} (${successRate}%)
  ❌ Files Failed: ${failureCount}
  🔄 Total Replacements: ${this.totalReplacements}
  
📈 CONNECTION REDUCTION ESTIMATE:
  Previous Pattern: ~${targetFiles.reduce((sum, f) => sum + f.connections, 0)} connections
  New Pattern: ~${successCount} connections (singleton reuse)
  Reduction: ~${(((targetFiles.reduce((sum, f) => sum + f.connections, 0) - successCount) / targetFiles.reduce((sum, f) => sum + f.connections, 0)) * 100).toFixed(2)}%

✅ COMPLETED FILES:
${this.completedFiles.map(f => `  - ${f.file} (${f.replacements} replacements)`).join('\n')}

${this.failedFiles.length > 0 ? `❌ FAILED FILES:
${this.failedFiles.map(f => `  - ${f.file}: ${f.error}`).join('\n')}` : '✅ No failures - 100% success rate!'}

🚀 NEXT STEPS:
  1. Test updated files for functionality
  2. Run performance benchmarks
  3. Continue rollout to remaining ${194 - successCount} files
  4. Monitor production performance
  
🎉 Phase 1 Database Optimization Complete!
`);
  }

  /**
   * Validate that DatabaseService exists before rollout
   */
  validateDatabaseService() {
    const databaseServicePath = path.join(this.projectRoot, 'server/database/DatabaseService.ts');
    if (!fs.existsSync(databaseServicePath)) {
      console.error('❌ DatabaseService.ts not found. Run this script from project root after creating DatabaseService.');
      process.exit(1);
    }
    console.log('✅ DatabaseService.ts found - proceeding with rollout');
  }
}

// Run the rollout
async function main() {
  const rollout = new DatabaseOptimizationRollout();
  rollout.validateDatabaseService();
  await rollout.runSystematicRollout();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Rollout failed:', error);
    process.exit(1);
  });
}

module.exports = { DatabaseOptimizationRollout };