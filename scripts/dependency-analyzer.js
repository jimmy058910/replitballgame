#!/usr/bin/env node

/**
 * GCP Cloud Build Dependency Analyzer
 * Replaces GitHub Dependabot with GCP-native dependency management
 * 
 * Analyzes npm outdated and audit results to determine critical updates
 */

const fs = require('fs').promises;
const path = require('path');

class DependencyAnalyzer {
  constructor() {
    this.projectId = process.env.PROJECT_ID;
    this.repoOwner = process.env.REPO_OWNER;
    this.repoName = process.env.REPO_NAME;
    this.workspaceDir = '/workspace';
  }

  async analyzeOutdated() {
    try {
      const outdatedPath = path.join(this.workspaceDir, 'outdated.json');
      const outdatedData = await fs.readFile(outdatedPath, 'utf8');
      const outdated = JSON.parse(outdatedData || '{}');
      
      console.log('📊 Outdated packages analysis:');
      const criticalUpdates = [];
      
      for (const [packageName, info] of Object.entries(outdated)) {
        const currentVersion = info.current;
        const wantedVersion = info.wanted;
        const latestVersion = info.latest;
        
        // Determine update priority
        const isMajorUpdate = this.isMajorVersionChange(currentVersion, latestVersion);
        const isSecurityUpdate = await this.checkSecurityUpdate(packageName, currentVersion, latestVersion);
        
        const update = {
          package: packageName,
          current: currentVersion,
          wanted: wantedVersion,
          latest: latestVersion,
          isMajor: isMajorUpdate,
          isSecurity: isSecurityUpdate,
          priority: this.calculatePriority(isMajorUpdate, isSecurityUpdate)
        };
        
        criticalUpdates.push(update);
        
        console.log(`  📦 ${packageName}: ${currentVersion} → ${latestVersion} ${isMajorUpdate ? '(MAJOR)' : ''} ${isSecurityUpdate ? '🔒' : ''}`);
      }
      
      // Sort by priority (security first, then major, then minor)
      criticalUpdates.sort((a, b) => b.priority - a.priority);
      
      // Write analysis results
      await fs.writeFile(
        path.join(this.workspaceDir, 'dependency-analysis.json'),
        JSON.stringify({ criticalUpdates, timestamp: new Date().toISOString() }, null, 2)
      );
      
      console.log(`✅ Found ${criticalUpdates.length} packages to update`);
      return criticalUpdates;
      
    } catch (error) {
      console.error('❌ Error analyzing outdated packages:', error.message);
      return [];
    }
  }

  async analyzeSecurityVulnerabilities() {
    try {
      const auditPath = path.join(this.workspaceDir, 'audit.json');
      const auditData = await fs.readFile(auditPath, 'utf8');
      const audit = JSON.parse(auditData || '{}');
      
      const vulnerabilities = [];
      
      if (audit.vulnerabilities) {
        for (const [packageName, vuln] of Object.entries(audit.vulnerabilities)) {
          if (vuln.severity && ['high', 'critical'].includes(vuln.severity)) {
            vulnerabilities.push({
              package: packageName,
              severity: vuln.severity,
              title: vuln.title,
              range: vuln.range,
              fixAvailable: vuln.fixAvailable
            });
            
            console.log(`🚨 SECURITY: ${packageName} - ${vuln.severity.toUpperCase()} - ${vuln.title}`);
          }
        }
      }
      
      console.log(`🔒 Found ${vulnerabilities.length} security vulnerabilities`);
      return vulnerabilities;
      
    } catch (error) {
      console.error('❌ Error analyzing security vulnerabilities:', error.message);
      return [];
    }
  }

  isMajorVersionChange(current, latest) {
    try {
      const currentMajor = parseInt(current.split('.')[0]);
      const latestMajor = parseInt(latest.split('.')[0]);
      return latestMajor > currentMajor;
    } catch {
      return false;
    }
  }

  async checkSecurityUpdate(packageName, current, latest) {
    // This would integrate with npm security advisories or vulnerability databases
    // For now, we'll rely on npm audit results
    return false;
  }

  calculatePriority(isMajor, isSecurity) {
    if (isSecurity) return 100; // Highest priority
    if (isMajor) return 50;     // Medium priority
    return 10;                  // Low priority
  }

  async generateUpdateBatches() {
    const updates = await this.analyzeOutdated();
    const vulnerabilities = await this.analyzeSecurityVulnerabilities();
    
    // Group updates into batches
    const securityUpdates = updates.filter(u => u.isSecurity || 
      vulnerabilities.some(v => v.package === u.package));
    const majorUpdates = updates.filter(u => u.isMajor && !u.isSecurity);
    const minorUpdates = updates.filter(u => !u.isMajor && !u.isSecurity);
    
    const batches = [
      {
        name: 'security-updates',
        description: 'Critical security vulnerability fixes',
        updates: securityUpdates,
        priority: 'critical'
      },
      {
        name: 'major-updates',
        description: 'Major version updates (may include breaking changes)',
        updates: majorUpdates,
        priority: 'major'
      },
      {
        name: 'minor-updates', 
        description: 'Minor and patch updates',
        updates: minorUpdates,
        priority: 'minor'
      }
    ].filter(batch => batch.updates.length > 0);
    
    await fs.writeFile(
      path.join(this.workspaceDir, 'update-batches.json'),
      JSON.stringify(batches, null, 2)
    );
    
    console.log('📋 Update batches created:');
    batches.forEach(batch => {
      console.log(`  ${batch.name}: ${batch.updates.length} updates (${batch.priority})`);
    });
    
    return batches;
  }
}

// Main execution
async function main() {
  const isSecurityOnly = process.env._SECURITY_ONLY === 'true';
  
  console.log('🚀 GCP Dependency Analyzer starting...');
  console.log(`📂 Project: ${process.env.PROJECT_ID}`);
  console.log(`🔗 Repository: ${process.env.REPO_OWNER}/${process.env.REPO_NAME}`);
  console.log(`🔒 Security-only mode: ${isSecurityOnly ? 'ENABLED' : 'DISABLED'}`);
  
  const analyzer = new DependencyAnalyzer();
  
  if (isSecurityOnly) {
    // Security-only mode: just analyze vulnerabilities
    const vulnerabilities = await analyzer.analyzeSecurityVulnerabilities();
    
    const securityBatch = {
      name: 'security-updates',
      description: 'Critical security vulnerability fixes',
      vulnerabilities: vulnerabilities,
      priority: 'critical'
    };
    
    await fs.writeFile(
      path.join('/workspace', 'update-batches.json'),
      JSON.stringify([securityBatch].filter(batch => batch.vulnerabilities.length > 0), null, 2)
    );
    
    console.log(`🔒 Security scan complete: ${vulnerabilities.length} vulnerabilities found`);
  } else {
    // Full analysis mode: outdated packages + security
    await analyzer.generateUpdateBatches();
  }
  
  console.log('✅ Dependency analysis complete!');
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Dependency analyzer failed:', error);
    process.exit(1);
  });
}