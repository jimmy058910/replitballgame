#!/usr/bin/env node

/**
 * GitHub Pull Request Creator for GCP Dependency Management
 * Creates automated pull requests for dependency updates
 */

import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import https from 'https';

class GitHubPRCreator {
  constructor() {
    this.projectId = process.env.PROJECT_ID;
    this.repoOwner = process.env.REPO_OWNER;
    this.repoName = process.env.REPO_NAME;
    this.githubToken = process.env.GITHUB_TOKEN;
    this.workspaceDir = '/workspace';
    
    if (!this.githubToken) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }
  }

  async createPullRequests() {
    try {
      // Read update batches from dependency analyzer
      const batchesPath = path.join(this.workspaceDir, 'update-batches.json');
      const batchesData = await fs.readFile(batchesPath, 'utf8');
      const batches = JSON.parse(batchesData);
      
      console.log('🔄 Creating pull requests for dependency updates...');
      
      for (const batch of batches) {
        if (batch.updates.length === 0) continue;
        
        // Create separate PR for each priority level
        await this.createBatchPR(batch);
      }
      
    } catch (error) {
      console.error('❌ Error creating pull requests:', error.message);
      throw error;
    }
  }

  async createBatchPR(batch) {
    const branchName = `gcp-deps/${batch.name}-${Date.now()}`;
    const commitMessage = this.generateCommitMessage(batch);
    const prTitle = this.generatePRTitle(batch);
    const prBody = this.generatePRBody(batch);
    
    try {
      console.log(`📝 Creating PR for ${batch.name} (${batch.updates.length} updates)`);
      
      // Create and checkout new branch
      await this.runGitCommand(['checkout', '-b', branchName]);
      
      // Apply updates to package.json
      await this.applyUpdates(batch.updates);
      
      // Commit changes
      await this.runGitCommand(['add', 'package.json', 'package-lock.json']);
      await this.runGitCommand(['commit', '-m', commitMessage]);
      
      // Push branch
      await this.runGitCommand(['push', 'origin', branchName]);
      
      // Create pull request via GitHub API
      await this.createGitHubPR(branchName, prTitle, prBody);
      
      console.log(`✅ Created PR: ${prTitle}`);
      
    } catch (error) {
      console.error(`❌ Failed to create PR for ${batch.name}:`, error.message);
    }
  }

  async applyUpdates(updates) {
    const packageJsonPath = path.join(this.workspaceDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    let updatedCount = 0;
    
    for (const update of updates) {
      // Update in dependencies
      if (packageJson.dependencies && packageJson.dependencies[update.package]) {
        packageJson.dependencies[update.package] = `^${update.latest}`;
        updatedCount++;
        console.log(`  📦 Updated ${update.package}: ${update.current} → ${update.latest}`);
      }
      
      // Update in devDependencies
      if (packageJson.devDependencies && packageJson.devDependencies[update.package]) {
        packageJson.devDependencies[update.package] = `^${update.latest}`;
        updatedCount++;
        console.log(`  🔧 Updated ${update.package} (dev): ${update.current} → ${update.latest}`);
      }
    }
    
    if (updatedCount > 0) {
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      
      // Run npm install to update package-lock.json
      await this.runCommand('npm', ['install']);
      
      console.log(`📄 Updated ${updatedCount} dependencies in package.json`);
    }
  }

  async createGitHubPR(branchName, title, body) {
    const prData = {
      title,
      head: branchName,
      base: 'main',
      body,
      maintainer_can_modify: true
    };
    
    const response = await this.githubAPIRequest(
      `repos/${this.repoOwner}/${this.repoName}/pulls`,
      'POST',
      prData
    );
    
    return response;
  }

  async githubAPIRequest(endpoint, method = 'GET', data = null) {
    const url = `https://api.github.com/${endpoint}`;
    const options = {
      method,
      headers: {
        'Authorization': `token ${this.githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GCP-Dependency-Manager/1.0'
      }
    };
    
    if (data) {
      options.headers['Content-Type'] = 'application/json';
    }
    
    return new Promise((resolve, reject) => {
      const request = https.request(url, options, (response) => {
        let body = '';
        
        response.on('data', (chunk) => {
          body += chunk;
        });
        
        response.on('end', () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(JSON.parse(body || '{}'));
          } else {
            reject(new Error(`GitHub API error: ${response.statusCode} - ${body}`));
          }
        });
      });
      
      request.on('error', reject);
      
      if (data) {
        request.write(JSON.stringify(data));
      }
      
      request.end();
    });
  }

  generateCommitMessage(batch) {
    const packageCount = batch.updates.length;
    const packageNames = batch.updates.slice(0, 3).map(u => u.package).join(', ');
    const suffix = packageCount > 3 ? ` and ${packageCount - 3} more` : '';
    
    return `deps(${batch.name}): update ${packageNames}${suffix}

Automated dependency update via GCP Cloud Build
- ${packageCount} packages updated
- Priority: ${batch.priority}
- Generated: ${new Date().toISOString()}`;
  }

  generatePRTitle(batch) {
    const count = batch.updates.length;
    const priority = batch.priority === 'critical' ? '🔒 SECURITY' : 
                    batch.priority === 'major' ? '⬆️ MAJOR' : '📦 DEPS';
    
    return `${priority}: ${batch.description} (${count} packages)`;
  }

  generatePRBody(batch) {
    const updates = batch.updates
      .map(u => `- \`${u.package}\`: ${u.current} → ${u.latest} ${u.isMajor ? '(MAJOR)' : ''} ${u.isSecurity ? '🔒' : ''}`)
      .join('\n');
    
    return `## 🤖 Automated Dependency Update

**Generated by:** GCP Cloud Build Dependency Manager  
**Priority:** ${batch.priority.toUpperCase()}  
**Batch:** ${batch.name}  
**Packages:** ${batch.updates.length}

### 📦 Updated Dependencies

${updates}

### 🔍 What Changed
${batch.description}

### ✅ Testing Checklist
- [ ] All tests pass
- [ ] No breaking changes detected
- [ ] Security vulnerabilities addressed
- [ ] Application starts successfully

### 🚀 Deployment
This PR was automatically created by the GCP dependency management system. Please review and test before merging.

---
*Generated at: ${new Date().toISOString()}*  
*Project: \`${this.projectId}\`*`;
  }

  async runGitCommand(args) {
    return this.runCommand('git', args);
  }

  async runCommand(command, args) {
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
        if (code === 0) {
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
  console.log('🚀 GCP GitHub PR Creator starting...');
  
  const creator = new GitHubPRCreator();
  await creator.createPullRequests();
  
  console.log('✅ Pull request creation complete!');
}

// Check if this script is being run directly (ES module equivalent of require.main === module)
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  main().catch(error => {
    console.error('💥 PR creation failed:', error);
    process.exit(1);
  });
}