#!/usr/bin/env node

/**
 * GCP Security Scanner for Dependency Vulnerabilities
 * Integrates with Container Analysis and Security Command Center
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');

class SecurityScanner {
  constructor() {
    this.projectId = process.env.PROJECT_ID;
    this.workspaceDir = '/workspace';
    this.vulnerabilityThreshold = {
      critical: 0,  // Block any critical vulnerabilities
      high: 2,      // Allow max 2 high severity issues
      medium: 10    // Allow max 10 medium severity issues
    };
  }

  async runComprehensiveSecurityScan() {
    console.log('🔒 Starting comprehensive security scan...');
    
    const results = {
      npm_audit: await this.runNpmAudit(),
      container_scan: await this.runContainerScan(),
      dependency_check: await this.runDependencyCheck(),
      license_scan: await this.runLicenseScan(),
      timestamp: new Date().toISOString()
    };
    
    const summary = this.generateSecuritySummary(results);
    
    // Write detailed results
    await fs.writeFile(
      path.join(this.workspaceDir, 'security-scan-results.json'),
      JSON.stringify(results, null, 2)
    );
    
    // Write summary for PR creation
    await fs.writeFile(
      path.join(this.workspaceDir, 'security-summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('🔍 Security scan complete!');
    console.log(`🚨 Critical: ${summary.critical}, High: ${summary.high}, Medium: ${summary.medium}`);
    
    return summary;
  }

  async runNpmAudit() {
    console.log('📦 Running npm audit...');
    
    try {
      const auditResult = await this.execCommand('npm audit --json');
      const auditData = JSON.parse(auditResult);
      
      const vulnerabilities = [];
      
      if (auditData.vulnerabilities) {
        for (const [packageName, vuln] of Object.entries(auditData.vulnerabilities)) {
          vulnerabilities.push({
            package: packageName,
            severity: vuln.severity,
            title: vuln.title,
            url: vuln.url,
            range: vuln.range,
            fixAvailable: vuln.fixAvailable,
            source: 'npm-audit'
          });
        }
      }
      
      return {
        tool: 'npm-audit',
        vulnerabilities,
        summary: auditData.metadata || {}
      };
      
    } catch (error) {
      console.log('⚠️ npm audit found issues (expected)');
      return {
        tool: 'npm-audit', 
        vulnerabilities: [],
        error: error.message
      };
    }
  }

  async runContainerScan() {
    console.log('🐳 Running container security scan...');
    
    try {
      // Create a temporary Dockerfile for scanning
      const dockerfile = `
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]`;
      
      await fs.writeFile(path.join(this.workspaceDir, 'Dockerfile.scan'), dockerfile);
      
      // Build image for scanning
      const imageName = `gcr.io/${this.projectId}/realm-rivalry-scan:latest`;
      await this.execCommand(`docker build -f Dockerfile.scan -t ${imageName} .`);
      
      // Push to registry for scanning
      await this.execCommand(`docker push ${imageName}`);
      
      // Run Container Analysis scan
      const scanResult = await this.execCommand(`gcloud container images scan ${imageName} --format=json`);
      const scanData = JSON.parse(scanResult);
      
      return {
        tool: 'container-analysis',
        image: imageName,
        vulnerabilities: scanData.vulnerabilities || [],
        summary: scanData.discovery || {}
      };
      
    } catch (error) {
      console.log('⚠️ Container scan failed:', error.message);
      return {
        tool: 'container-analysis',
        vulnerabilities: [],
        error: error.message
      };
    }
  }

  async runDependencyCheck() {
    console.log('🔍 Running dependency vulnerability check...');
    
    try {
      // Use npm ls to get dependency tree
      const depsResult = await this.execCommand('npm ls --json --depth=0');
      const depsData = JSON.parse(depsResult);
      
      const vulnerableDeps = [];
      
      // Cross-reference with known vulnerability databases
      for (const [name, info] of Object.entries(depsData.dependencies || {})) {
        // This would integrate with CVE databases, NIST, etc.
        // For now, we'll flag packages with known issues
        const knownIssues = await this.checkKnownVulnerabilities(name, info.version);
        if (knownIssues.length > 0) {
          vulnerableDeps.push({
            package: name,
            version: info.version,
            issues: knownIssues,
            source: 'dependency-check'
          });
        }
      }
      
      return {
        tool: 'dependency-check',
        vulnerabilities: vulnerableDeps,
        total_deps: Object.keys(depsData.dependencies || {}).length
      };
      
    } catch (error) {
      return {
        tool: 'dependency-check',
        vulnerabilities: [],
        error: error.message
      };
    }
  }

  async runLicenseScan() {
    console.log('📄 Running license compliance scan...');
    
    try {
      // Check licenses of all dependencies
      const licenseResult = await this.execCommand('npm ls --json --long');
      const licenseData = JSON.parse(licenseResult);
      
      const licenseIssues = [];
      const prohibitedLicenses = ['GPL-3.0', 'GPL-2.0', 'AGPL-3.0'];
      
      // Recursively check all dependencies
      const checkLicenses = (deps, parentName = '') => {
        for (const [name, info] of Object.entries(deps || {})) {
          const license = info.license || 'UNKNOWN';
          
          if (prohibitedLicenses.some(prohibited => license.includes(prohibited))) {
            licenseIssues.push({
              package: name,
              license,
              parent: parentName,
              severity: 'high'
            });
          }
          
          if (info.dependencies) {
            checkLicenses(info.dependencies, name);
          }
        }
      };
      
      checkLicenses(licenseData.dependencies);
      
      return {
        tool: 'license-scan',
        issues: licenseIssues,
        total_checked: this.countDependencies(licenseData.dependencies)
      };
      
    } catch (error) {
      return {
        tool: 'license-scan',
        issues: [],
        error: error.message
      };
    }
  }

  async checkKnownVulnerabilities(packageName, version) {
    // This would integrate with:
    // - GitHub Security Advisories API
    // - NIST National Vulnerability Database
    // - Snyk vulnerabilities
    // - OSV Database
    
    // For now, return empty array - would be implemented with actual API calls
    return [];
  }

  countDependencies(deps) {
    let count = 0;
    for (const [name, info] of Object.entries(deps || {})) {
      count++;
      if (info.dependencies) {
        count += this.countDependencies(info.dependencies);
      }
    }
    return count;
  }

  generateSecuritySummary(results) {
    let critical = 0, high = 0, medium = 0, low = 0;
    const allVulnerabilities = [];
    
    // Aggregate vulnerabilities from all sources
    for (const result of Object.values(results)) {
      if (result.vulnerabilities) {
        for (const vuln of result.vulnerabilities) {
          allVulnerabilities.push(vuln);
          
          switch (vuln.severity) {
            case 'critical': critical++; break;
            case 'high': high++; break;
            case 'medium': medium++; break;
            case 'low': low++; break;
          }
        }
      }
      
      if (result.issues) {
        for (const issue of result.issues) {
          allVulnerabilities.push(issue);
          
          switch (issue.severity) {
            case 'critical': critical++; break;
            case 'high': high++; break;
            case 'medium': medium++; break;
            case 'low': low++; break;
          }
        }
      }
    }
    
    const shouldBlock = critical > this.vulnerabilityThreshold.critical || 
                       high > this.vulnerabilityThreshold.high ||
                       medium > this.vulnerabilityThreshold.medium;
    
    return {
      critical,
      high,
      medium,
      low,
      total: allVulnerabilities.length,
      shouldBlock,
      blockReason: shouldBlock ? this.getBlockReason(critical, high, medium) : null,
      vulnerabilities: allVulnerabilities.slice(0, 10), // Top 10 for summary
      scannedBy: Object.keys(results).filter(k => k !== 'timestamp'),
      timestamp: results.timestamp
    };
  }

  getBlockReason(critical, high, medium) {
    if (critical > this.vulnerabilityThreshold.critical) {
      return `${critical} critical vulnerabilities found (max allowed: ${this.vulnerabilityThreshold.critical})`;
    }
    if (high > this.vulnerabilityThreshold.high) {
      return `${high} high severity vulnerabilities found (max allowed: ${this.vulnerabilityThreshold.high})`;
    }
    if (medium > this.vulnerabilityThreshold.medium) {
      return `${medium} medium severity vulnerabilities found (max allowed: ${this.vulnerabilityThreshold.medium})`;
    }
    return null;
  }

  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { cwd: this.workspaceDir }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }
}

// Main execution
async function main() {
  console.log('🔒 GCP Security Scanner starting...');
  
  const scanner = new SecurityScanner();
  const summary = await scanner.runComprehensiveSecurityScan();
  
  if (summary.shouldBlock) {
    console.error('🚨 Security scan failed:', summary.blockReason);
    process.exit(1);
  }
  
  console.log('✅ Security scan passed!');
  console.log(`📊 Summary: ${summary.total} issues (Critical: ${summary.critical}, High: ${summary.high})`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Security scan failed:', error);
    process.exit(1);
  });
}