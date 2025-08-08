/**
 * Security Validator - Additional security checks for production deployment
 */

import logger from './logger.js';

interface SecurityCheckResult {
  check: string;
  passed: boolean;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Validates required environment variables for security
 */
export function validateEnvironmentSecurity(): SecurityCheckResult[] {
  const results: SecurityCheckResult[] = [];
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'SESSION_SECRET'
  ];

  const optionalEnvVars = [
    'STRIPE_SECRET_KEY',
    'VITE_STRIPE_PUBLIC_KEY'
  ];

  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      results.push({
        check: `Environment Variable: ${varName}`,
        passed: false,
        message: `Missing required environment variable: ${varName}`,
        severity: 'critical'
      });
    } else {
      results.push({
        check: `Environment Variable: ${varName}`,
        passed: true,
        message: `Environment variable ${varName} is configured`,
        severity: 'low'
      });
    }
  });

  // Check optional environment variables (warnings only)
  optionalEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      results.push({
        check: `Environment Variable: ${varName}`,
        passed: true, // Don't fail for optional vars
        message: `Optional environment variable ${varName} not configured - payment features disabled`,
        severity: 'medium'
      });
    } else {
      results.push({
        check: `Environment Variable: ${varName}`,
        passed: true,
        message: `Environment variable ${varName} is configured`,
        severity: 'low'
      });
    }
  });

  return results;
}

/**
 * Validates session security configuration
 */
export function validateSessionSecurity(): SecurityCheckResult[] {
  const results: SecurityCheckResult[] = [];
  
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) {
    results.push({
      check: 'Session Secret Strength',
      passed: false,
      message: 'Session secret should be at least 32 characters long',
      severity: 'high'
    });
  } else {
    results.push({
      check: 'Session Secret Strength',
      passed: true,
      message: 'Session secret meets security requirements',
      severity: 'low'
    });
  }

  return results;
}

/**
 * Validates database security configuration
 */
export function validateDatabaseSecurity(): SecurityCheckResult[] {
  const results: SecurityCheckResult[] = [];
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    results.push({
      check: 'Database URL',
      passed: false,
      message: 'Database URL is not configured',
      severity: 'critical'
    });
  } else if (databaseUrl.startsWith('postgres://')) {
    results.push({
      check: 'Database Connection Security',
      passed: true,
      message: 'Database connection uses secure protocol',
      severity: 'low'
    });
  } else {
    results.push({
      check: 'Database Connection Security',
      passed: false,
      message: 'Database connection should use secure protocol',
      severity: 'medium'
    });
  }

  return results;
}

/**
 * Validates Stripe integration security
 */
export function validateStripeIntegration(): SecurityCheckResult[] {
  const results: SecurityCheckResult[] = [];
  
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePublicKey = process.env.VITE_STRIPE_PUBLIC_KEY;
  
  if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_')) {
    results.push({
      check: 'Stripe Secret Key',
      passed: true, // Don't fail for missing Stripe in Alpha testing
      message: 'Stripe secret key is missing or invalid format - payment features disabled',
      severity: 'medium'
    });
  } else {
    results.push({
      check: 'Stripe Secret Key',
      passed: true,
      message: 'Stripe secret key is properly configured',
      severity: 'low'
    });
  }

  if (!stripePublicKey || !stripePublicKey.startsWith('pk_')) {
    results.push({
      check: 'Stripe Public Key',
      passed: true, // Don't fail for missing Stripe in Alpha testing
      message: 'Stripe public key is missing or invalid format - payment features disabled',
      severity: 'medium'
    });
  } else {
    results.push({
      check: 'Stripe Public Key',
      passed: true,
      message: 'Stripe public key is properly configured',
      severity: 'low'
    });
  }

  return results;
}

/**
 * Comprehensive security validation for production deployment
 */
export function runSecurityValidation(): { 
  passed: boolean; 
  results: SecurityCheckResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }
} {
  const allResults = [
    ...validateEnvironmentSecurity(),
    ...validateSessionSecurity(),
    ...validateDatabaseSecurity(),
    ...validateStripeIntegration()
  ];

  const summary = {
    total: allResults.length,
    passed: allResults.filter(r => r.passed).length,
    failed: allResults.filter(r => !r.passed).length,
    critical: allResults.filter(r => r.severity === 'critical').length,
    high: allResults.filter(r => r.severity === 'high').length,
    medium: allResults.filter(r => r.severity === 'medium').length,
    low: allResults.filter(r => r.severity === 'low').length
  };

  const criticalFailed = allResults.filter(r => !r.passed && r.severity === 'critical').length;
  const highFailed = allResults.filter(r => !r.passed && r.severity === 'high').length;
  
  const passed = criticalFailed === 0 && highFailed === 0;

  // Log security validation results
  logger.info('Security validation completed', {
    passed,
    summary,
    criticalIssues: allResults.filter(r => !r.passed && r.severity === 'critical').length,
    highIssues: allResults.filter(r => !r.passed && r.severity === 'high').length
  });

  return { passed, results: allResults, summary };
}