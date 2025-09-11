#!/usr/bin/env node

/**
 * In-Memoria Automation Pipeline
 * Automated learning, performance optimization, and development efficiency tracking
 * 
 * Usage:
 *   node scripts/in-memoria-automation.js --learn
 *   node scripts/in-memoria-automation.js --health-check
 *   node scripts/in-memoria-automation.js --performance-report
 *   node scripts/in-memoria-automation.js --auto-optimize
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();
const CONFIG_PATH = path.join(PROJECT_ROOT, '.in-memoria-config.json');
const METRICS_DIR = path.join(PROJECT_ROOT, 'metrics');

// Ensure metrics directory exists
if (!fs.existsSync(METRICS_DIR)) {
  fs.mkdirSync(METRICS_DIR, { recursive: true });
}

/**
 * Load In-Memoria configuration
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
    console.warn('⚠️ No .in-memoria-config.json found, using defaults');
    return {};
  } catch (error) {
    console.error('❌ Error loading config:', error.message);
    return {};
  }
}

/**
 * Execute In-Memoria commands with error handling
 */
function executeInMemoria(command, args = []) {
  try {
    console.log(`🔄 Executing: npx in-memoria ${command} ${args.join(' ')}`);
    const result = execSync(`npx in-memoria ${command} ${args.join(' ')}`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      timeout: 60000 // 1 minute timeout
    });
    return { success: true, output: result };
  } catch (error) {
    console.error(`❌ Command failed: ${error.message}`);
    return { success: false, error: error.message, output: error.stdout || '' };
  }
}

/**
 * Check if learning is needed based on staleness
 */
function checkLearningStatus() {
  console.log('🔍 Checking learning status...');
  const result = executeInMemoria('debug', ['.', '--no-filesystem']);
  
  if (result.success) {
    // Parse output to determine if learning is needed
    const needsLearning = result.output.includes('stale') || 
                         result.output.includes('No database found') ||
                         result.output.includes('Issues detected');
    
    return {
      needsLearning,
      status: needsLearning ? 'stale' : 'fresh',
      output: result.output
    };
  }
  
  return {
    needsLearning: true,
    status: 'unknown',
    error: result.error
  };
}

/**
 * Perform automated learning
 */
function performLearning() {
  console.log('🧠 Starting automated learning...');
  const startTime = Date.now();
  
  const result = executeInMemoria('learn', ['.']);
  const duration = Date.now() - startTime;
  
  const learningMetrics = {
    timestamp: new Date().toISOString(),
    duration: duration,
    success: result.success,
    output: result.output,
    error: result.error || null
  };
  
  // Save learning metrics
  const metricsFile = path.join(METRICS_DIR, `learning-${Date.now()}.json`);
  fs.writeFileSync(metricsFile, JSON.stringify(learningMetrics, null, 2));
  
  if (result.success) {
    console.log(`✅ Learning completed in ${duration}ms`);
  } else {
    console.error(`❌ Learning failed: ${result.error}`);
  }
  
  return learningMetrics;
}

/**
 * Generate performance report
 */
function generatePerformanceReport() {
  console.log('📊 Generating performance report...');
  
  const healthCheck = executeInMemoria('debug', ['.', '--performance']);
  const analysis = executeInMemoria('analyze', ['.']);
  
  const report = {
    timestamp: new Date().toISOString(),
    health: {
      success: healthCheck.success,
      output: healthCheck.output,
      error: healthCheck.error || null
    },
    analysis: {
      success: analysis.success,
      output: analysis.output,
      error: analysis.error || null
    },
    recommendations: []
  };
  
  // Add recommendations based on analysis
  if (healthCheck.output && healthCheck.output.includes('Issues detected')) {
    report.recommendations.push('Run automated learning to resolve detected issues');
  }
  
  if (analysis.output && analysis.output.includes('Fresh concepts found')) {
    report.recommendations.push('Consider running learning to incorporate new concepts');
  }
  
  // Save report
  const reportFile = path.join(METRICS_DIR, `performance-report-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`📄 Report saved to: ${reportFile}`);
  return report;
}

/**
 * Auto-optimization pipeline
 */
function autoOptimize() {
  console.log('🚀 Starting auto-optimization pipeline...');
  
  const status = checkLearningStatus();
  const metrics = {
    timestamp: new Date().toISOString(),
    steps: []
  };
  
  // Step 1: Check if learning is needed
  metrics.steps.push({
    step: 'learning_status_check',
    result: status,
    timestamp: new Date().toISOString()
  });
  
  // Step 2: Perform learning if needed
  if (status.needsLearning) {
    console.log('📚 Learning required, starting automated learning...');
    const learningResult = performLearning();
    metrics.steps.push({
      step: 'automated_learning',
      result: learningResult,
      timestamp: new Date().toISOString()
    });
  } else {
    console.log('✅ Learning is up to date');
    metrics.steps.push({
      step: 'learning_skipped',
      reason: 'up_to_date',
      timestamp: new Date().toISOString()
    });
  }
  
  // Step 3: Generate performance report
  const report = generatePerformanceReport();
  metrics.steps.push({
    step: 'performance_report',
    result: report,
    timestamp: new Date().toISOString()
  });
  
  // Save optimization metrics
  const optimizationFile = path.join(METRICS_DIR, `auto-optimization-${Date.now()}.json`);
  fs.writeFileSync(optimizationFile, JSON.stringify(metrics, null, 2));
  
  console.log('🎯 Auto-optimization completed');
  return metrics;
}

/**
 * Development efficiency metrics
 */
function generateEfficiencyMetrics() {
  console.log('📈 Generating development efficiency metrics...');
  
  const config = loadConfig();
  const metricsFiles = fs.readdirSync(METRICS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(METRICS_DIR, f));
  
  const efficiency = {
    timestamp: new Date().toISOString(),
    config: config.projectName || 'Realm Rivalry',
    totalLearningRuns: 0,
    avgLearningTime: 0,
    successRate: 0,
    recommendations: [],
    recentActivity: []
  };
  
  // Analyze recent learning metrics
  const learningMetrics = metricsFiles
    .filter(f => path.basename(f).startsWith('learning-'))
    .slice(-10) // Last 10 runs
    .map(f => {
      try {
        return JSON.parse(fs.readFileSync(f, 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  
  if (learningMetrics.length > 0) {
    efficiency.totalLearningRuns = learningMetrics.length;
    efficiency.avgLearningTime = learningMetrics.reduce((sum, m) => sum + m.duration, 0) / learningMetrics.length;
    efficiency.successRate = learningMetrics.filter(m => m.success).length / learningMetrics.length;
    efficiency.recentActivity = learningMetrics.slice(-5);
  }
  
  // Generate recommendations
  if (efficiency.successRate < 0.8) {
    efficiency.recommendations.push('Consider reviewing In-Memoria configuration - low success rate detected');
  }
  
  if (efficiency.avgLearningTime > 30000) {
    efficiency.recommendations.push('Learning time is high - consider optimizing excluded paths or file filters');
  }
  
  if (efficiency.totalLearningRuns === 0) {
    efficiency.recommendations.push('No learning metrics found - run initial learning to establish baseline');
  }
  
  // Save efficiency metrics
  const efficiencyFile = path.join(METRICS_DIR, `efficiency-${Date.now()}.json`);
  fs.writeFileSync(efficiencyFile, JSON.stringify(efficiency, null, 2));
  
  console.log(`📊 Efficiency metrics saved to: ${efficiencyFile}`);
  return efficiency;
}

/**
 * Main CLI handler
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🔧 In-Memoria Automation Pipeline');
  console.log(`📁 Project: ${PROJECT_ROOT}`);
  console.log(`⚙️ Config: ${fs.existsSync(CONFIG_PATH) ? 'Found' : 'Default'}`);
  console.log('');
  
  switch (command) {
    case '--learn':
      performLearning();
      break;
      
    case '--health-check':
      checkLearningStatus();
      break;
      
    case '--performance-report':
      generatePerformanceReport();
      break;
      
    case '--auto-optimize':
      autoOptimize();
      break;
      
    case '--efficiency-metrics':
      generateEfficiencyMetrics();
      break;
      
    case '--help':
    default:
      console.log('Available commands:');
      console.log('  --learn              Perform automated learning');
      console.log('  --health-check       Check learning status and health');
      console.log('  --performance-report Generate detailed performance report');
      console.log('  --auto-optimize      Run complete optimization pipeline');
      console.log('  --efficiency-metrics Generate development efficiency metrics');
      console.log('  --help               Show this help message');
      break;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  loadConfig,
  executeInMemoria,
  checkLearningStatus,
  performLearning,
  generatePerformanceReport,
  autoOptimize,
  generateEfficiencyMetrics
};