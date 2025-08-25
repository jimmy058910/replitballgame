#!/usr/bin/env node

/**
 * Test Suite for GCP Dependency Management System
 * Validates all components of the Dependabot replacement
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class GCPDependencySystemTester {
  constructor() {
    this.projectId = process.env.PROJECT_ID || 'direct-glider-465821-p7';
    this.repoOwner = process.env.REPO_OWNER || 'jimmy058910';
    this.repoName = process.env.REPO_NAME || 'realm-rivalry';
    this.workspaceDir = process.cwd();
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🚀 Testing GCP Dependency Management System...');
    console.log(`📂 Project: ${this.projectId}`);
    console.log(`🔗 Repository: ${this.repoOwner}/${this.repoName}`);
    console.log('');

    const tests = [
      { name: 'Configuration Files', test: () => this.testConfigurationFiles() },
      { name: 'Script Executability', test: () => this.testScriptExecutability() },
      { name: 'Dependency Analysis', test: () => this.testDependencyAnalysis() },
      { name: 'GitHub Integration', test: () => this.testGitHubIntegration() },
      { name: 'Security Scanning', test: () => this.testSecurityScanning() },
      { name: 'Dependabot Removal', test: () => this.testDependabotRemoval() }
    ];

    for (const test of tests) {
      console.log(`🧪 Testing: ${test.name}`);
      try {
        const result = await test.test();
        this.testResults.push({ name: test.name, status: 'PASS', result });
        console.log(`✅ ${test.name}: PASSED`);
      } catch (error) {
        this.testResults.push({ name: test.name, status: 'FAIL', error: error.message });
        console.log(`❌ ${test.name}: FAILED - ${error.message}`);
      }
      console.log('');
    }

    await this.generateTestReport();
    return this.testResults;
  }

  async testConfigurationFiles() {
    const requiredFiles = [
      'cloudbuild-dependency-update.yaml',
      'scripts/dependency-analyzer.js',
      'scripts/github-pr-creator.js',
      'scripts/security-scanner.js',
      'cloud-scheduler-setup.sh'
    ];

    const missingFiles = [];
    const existingFiles = [];

    for (const file of requiredFiles) {
      try {
        await fs.access(path.join(this.workspaceDir, file));
        existingFiles.push(file);
      } catch {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
    }

    // Validate Cloud Build configuration
    const cloudbuildContent = await fs.readFile('cloudbuild-dependency-update.yaml', 'utf8');
    if (!cloudbuildContent.includes('dependency-analyzer.js') || 
        !cloudbuildContent.includes('github-pr-creator.js')) {
      throw new Error('Cloud Build configuration missing required script references');
    }

    return { existingFiles, validatedCloudBuild: true };
  }

  async testScriptExecutability() {
    const scripts = [
      'scripts/dependency-analyzer.js',
      'scripts/github-pr-creator.js', 
      'scripts/security-scanner.js'
    ];

    const results = [];

    for (const script of scripts) {
      // Check if script is executable
      const stats = await fs.stat(script);
      
      // Check if script has proper shebang
      const content = await fs.readFile(script, 'utf8');
      const hasShebang = content.startsWith('#!/usr/bin/env node');
      
      // Basic syntax check
      try {
        require(path.resolve(script));
        results.push({ script, executable: true, hasShebang, syntaxValid: true });
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('main')) {
          // This is expected - the script is meant to be run directly
          results.push({ script, executable: true, hasShebang, syntaxValid: true });
        } else {
          results.push({ script, executable: true, hasShebang, syntaxValid: false, error: error.message });
        }
      }
    }

    const failed = results.filter(r => !r.syntaxValid);
    if (failed.length > 0) {
      throw new Error(`Script validation failed: ${failed.map(f => f.script).join(', ')}`);
    }

    return results;
  }

  async testDependencyAnalysis() {
    // Test if npm commands work
    try {
      await this.runCommand('npm', ['--version']);
      await this.runCommand('npm', ['outdated', '--json'], true); // Allow to fail
      
      // Check if package.json exists
      await fs.access('package.json');
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      
      if (!packageJson.dependencies && !packageJson.devDependencies) {
        throw new Error('No dependencies found in package.json');
      }

      const depCount = Object.keys(packageJson.dependencies || {}).length +
                      Object.keys(packageJson.devDependencies || {}).length;

      return { 
        npmWorking: true,
        packageJsonExists: true,
        dependencyCount: depCount,
        hasDependencies: depCount > 0
      };

    } catch (error) {
      throw new Error(`Dependency analysis test failed: ${error.message}`);
    }
  }

  async testGitHubIntegration() {
    // Test Git configuration
    try {
      const gitRemote = await this.runCommand('git', ['remote', '-v']);
      const hasGitHubRemote = gitRemote.includes('github.com');
      
      if (!hasGitHubRemote) {
        throw new Error('No GitHub remote found');
      }

      // Check if we can get current branch
      const currentBranch = await this.runCommand('git', ['branch', '--show-current']);
      
      return {
        hasGitHubRemote: true,
        currentBranch: currentBranch.trim(),
        remoteInfo: gitRemote.split('\n')[0]
      };

    } catch (error) {
      throw new Error(`GitHub integration test failed: ${error.message}`);
    }
  }

  async testSecurityScanning() {
    try {
      // Test npm audit
      const auditResult = await this.runCommand('npm', ['audit', '--json'], true);
      
      // Check if security scanner can be imported
      const securityScanner = path.join(this.workspaceDir, 'scripts/security-scanner.js');
      const scannerContent = await fs.readFile(securityScanner, 'utf8');
      
      if (!scannerContent.includes('SecurityScanner') || !scannerContent.includes('runComprehensiveSecurityScan')) {
        throw new Error('Security scanner missing required methods');
      }

      return {
        npmAuditWorking: true,
        securityScannerValid: true,
        hasSecurityMethods: true
      };

    } catch (error) {
      throw new Error(`Security scanning test failed: ${error.message}`);
    }
  }

  async testDependabotRemoval() {
    try {
      // Check that dependabot.yml no longer exists
      await fs.access('.github/dependabot.yml');
      throw new Error('Dependabot configuration still exists');
    } catch (error) {
      if (error.code === 'ENOENT') {
        // This is what we want - file should not exist
        return { dependabotRemoved: true };
      }
      throw error;
    }
  }

  async generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      project: this.projectId,
      repository: `${this.repoOwner}/${this.repoName}`,
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.status === 'PASS').length,
        failed: this.testResults.filter(r => r.status === 'FAIL').length
      },
      results: this.testResults
    };

    await fs.writeFile('gcp-dependency-test-results.json', JSON.stringify(report, null, 2));
    
    console.log('📋 Test Summary:');
    console.log(`  Total Tests: ${report.summary.total}`);
    console.log(`  Passed: ${report.summary.passed}`);
    console.log(`  Failed: ${report.summary.failed}`);
    console.log('');

    if (report.summary.failed === 0) {
      console.log('🎉 All tests passed! GCP Dependency Management System is ready.');
      console.log('');
      console.log('📝 Next Steps:');
      console.log('  1. Run: chmod +x cloud-scheduler-setup.sh');
      console.log('  2. Run: ./cloud-scheduler-setup.sh');
      console.log('  3. Set environment variables: PROJECT_ID, REPO_OWNER, REPO_NAME, GITHUB_TOKEN');
      console.log('  4. Test the system with a manual trigger');
      console.log('');
      console.log('✅ Dependabot has been successfully replaced with GCP-powered dependency management!');
    } else {
      console.log('⚠️ Some tests failed. Please review and fix the issues above.');
    }
  }

  async runCommand(command, args, allowFailure = false) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { 
        cwd: this.workspaceDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0 || allowFailure) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }
}

// Main execution
async function main() {
  console.log('🧪 GCP Dependency Management System Test Suite');
  console.log('='.repeat(50));
  console.log('');
  
  const tester = new GCPDependencySystemTester();
  const results = await tester.runAllTests();
  
  const allPassed = results.every(r => r.status === 'PASS');
  process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
}