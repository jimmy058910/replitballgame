import logger from '../../utils/logger.js';
import { ServiceError } from '../../utils/ServiceError.js';

/**
 * AdminAuthService
 * 
 * Provides authentication and authorization for administrative operations.
 * This service ensures that emergency and administrative endpoints are
 * properly protected and audited.
 * 
 * IMPORTANT: This service provides critical security for destructive operations.
 */
export class AdminAuthService {

  // Admin tokens for emergency operations
  private static readonly ADMIN_TOKENS = {
    'admin-emergency-token': {
      firebaseUid: 'admin-emergency',
      displayName: 'Emergency Administrator',
      email: 'emergency@realmrivalry.dev',
      level: 'emergency',
      permissions: ['emergency_fixes', 'team_management', 'division_reset']
    },
    'admin-superuser-token': {
      firebaseUid: 'admin-superuser',
      displayName: 'Super Administrator',
      email: 'superuser@realmrivalry.dev',
      level: 'superuser',
      permissions: ['emergency_fixes', 'team_management', 'division_reset', 'data_deletion', 'system_reset']
    }
  } as const;

  /**
   * Validates an admin token and returns admin information
   * 
   * @param token - The admin token to validate
   * @returns Admin information if token is valid, null otherwise
   */
  static validateAdminToken(token: string): {
    firebaseUid: string;
    displayName: string;
    email: string;
    level: string;
    permissions: string[];
  } | null {
    const cleanToken = token.replace('Bearer ', '').trim();
    
    if (cleanToken in this.ADMIN_TOKENS) {
      const adminInfo = this.ADMIN_TOKENS[cleanToken as keyof typeof this.ADMIN_TOKENS];
      
      logger.warn('Admin token validated for emergency operation', {
        token: cleanToken,
        firebaseUid: adminInfo.firebaseUid,
        level: adminInfo.level,
        timestamp: new Date().toISOString()
      });
      
      return adminInfo;
    }

    logger.error('Invalid admin token used for emergency operation', { 
      token: cleanToken,
      timestamp: new Date().toISOString()
    });
    return null;
  }

  /**
   * Extracts and validates admin token from request headers
   * 
   * @param authHeader - The Authorization header value
   * @returns Admin information if token is valid, null otherwise
   */
  static validateAuthHeader(authHeader?: string): {
    firebaseUid: string;
    displayName: string;
    email: string;
    level: string;
    permissions: string[];
  } | null {
    if (!authHeader) {
      return null;
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7)
      : authHeader;

    return this.validateAdminToken(token);
  }

  /**
   * Middleware factory for admin authentication
   * 
   * @param requiredPermission - The permission required for the operation
   * @returns Express middleware function
   */
  static createAdminMiddleware(requiredPermission?: string) {
    return (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      const adminInfo = this.validateAuthHeader(authHeader);

      if (!adminInfo) {
        logger.error('Unauthorized emergency operation attempted', {
          endpoint: req.originalUrl,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });

        return res.status(401).json({
          error: 'Emergency operation requires valid admin token',
          availableTokens: Object.keys(this.ADMIN_TOKENS),
          example: 'Authorization: Bearer admin-emergency-token',
          securityNote: 'All admin operations are logged and monitored'
        });
      }

      // Check permission requirement if specified
      if (requiredPermission && !adminInfo.permissions.includes(requiredPermission)) {
        logger.error('Insufficient permissions for emergency operation', {
          endpoint: req.originalUrl,
          adminLevel: adminInfo.level,
          requiredPermission,
          availablePermissions: adminInfo.permissions,
          timestamp: new Date().toISOString()
        });

        return res.status(403).json({
          error: `Required permission: ${requiredPermission}`,
          adminLevel: adminInfo.level,
          availablePermissions: adminInfo.permissions
        });
      }

      // Add admin info to request for downstream handlers
      req.adminUser = adminInfo;
      req.firebaseUid = adminInfo.firebaseUid;

      // Log all admin operations for security audit
      logger.warn('Emergency administrative operation authorized', {
        firebaseUid: adminInfo.firebaseUid,
        level: adminInfo.level,
        endpoint: req.originalUrl,
        method: req.method,
        permission: requiredPermission,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      next();
    };
  }

  /**
   * Creates middleware for operations requiring confirmation
   * 
   * @param requiredConfirmation - The exact confirmation text required
   * @param requiredPermission - The permission required for the operation
   * @returns Express middleware function
   */
  static createConfirmationMiddleware(requiredConfirmation: string, requiredPermission?: string) {
    return (req: any, res: any, next: any) => {
      // First check admin authentication
      const adminMiddleware = this.createAdminMiddleware(requiredPermission);
      
      adminMiddleware(req, res, (err: any) => {
        if (err) return next(err);
        if (res.headersSent) return; // Response already sent (auth failed)

        // Check confirmation
        const { confirm } = req.body;
        
        if (confirm !== requiredConfirmation) {
          logger.error('Emergency operation attempted without proper confirmation', {
            endpoint: req.originalUrl,
            adminUser: req.adminUser?.firebaseUid,
            providedConfirmation: confirm,
            requiredConfirmation,
            timestamp: new Date().toISOString()
          });

          return res.status(400).json({
            error: 'Destructive operation requires confirmation',
            requiredConfirmation,
            providedConfirmation: confirm,
            securityNote: 'This confirmation is required to prevent accidental data loss'
          });
        }

        // Log confirmed operation
        logger.warn('Emergency operation confirmed and proceeding', {
          endpoint: req.originalUrl,
          adminUser: req.adminUser?.firebaseUid,
          confirmation: requiredConfirmation,
          timestamp: new Date().toISOString()
        });

        next();
      });
    };
  }

  /**
   * Gets all available admin tokens for documentation (sanitized)
   * 
   * @returns Object containing admin token information without sensitive data
   */
  static getAvailableTokens(): Record<string, {
    purpose: string;
    level: string;
    permissions: string[];
  }> {
    return {
      'admin-emergency-token': {
        purpose: 'Emergency operations and team fixes',
        level: 'emergency',
        permissions: ['emergency_fixes', 'team_management', 'division_reset']
      },
      'admin-superuser-token': {
        purpose: 'Full administrative access including data deletion',
        level: 'superuser',
        permissions: ['emergency_fixes', 'team_management', 'division_reset', 'data_deletion', 'system_reset']
      }
    };
  }

  /**
   * Gets admin operation documentation
   * 
   * @returns Documentation for admin authentication system
   */
  static getDocumentation(): {
    overview: string;
    availableTokens: Record<string, any>;
    securityFeatures: string[];
    usage: {
      curl: string;
      headers: string;
    };
    endpoints: string[];
  } {
    return {
      overview: 'Administrative authentication system for Realm Rivalry emergency operations',
      availableTokens: this.getAvailableTokens(),
      securityFeatures: [
        'All admin operations are logged and monitored',
        'Permission-based access control',
        'Required confirmation for destructive operations',
        'IP address and user agent tracking',
        'Audit trail for all emergency fixes'
      ],
      usage: {
        curl: 'curl -H "Authorization: Bearer admin-emergency-token" -X POST http://localhost:3000/api/admin/emergency/...',
        headers: 'Authorization: Bearer admin-emergency-token'
      },
      endpoints: [
        'POST /api/admin/emergency/fix-team-contracts/:teamId',
        'POST /api/admin/emergency/fix-team-players/:teamId',
        'POST /api/admin/emergency/move-team-subdivision',
        'POST /api/admin/emergency/reset-division-subdivision'
      ]
    };
  }
}