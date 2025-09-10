import { logger } from '../../utils/logger.js';
import { ServiceError } from '../../utils/ServiceError.js';

/**
 * DevAuthService
 * 
 * Provides development-only authentication helpers and token validation.
 * This service standardizes development authentication patterns and 
 * provides clean interfaces for development fixture access.
 * 
 * IMPORTANT: This service should only be used in development environments.
 */
export class DevAuthService {
  
  // Development tokens for testing different user scenarios
  private static readonly DEV_TOKENS = {
    'dev-token-oakland-cougars': {
      firebaseUid: 'oakland-cougars-owner',
      displayName: 'Oakland Cougars Owner (Dev)',
      email: 'oakland.cougars@realmrivalry.dev',
      teamName: 'Oakland Cougars',
      userType: 'team_owner'
    },
    'dev-token-admin': {
      firebaseUid: 'dev-admin-user',
      displayName: 'Development Admin',
      email: 'admin@realmrivalry.dev',
      userType: 'admin'
    },
    'dev-token-superuser': {
      firebaseUid: 'dev-superuser',
      displayName: 'Development Superuser',
      email: 'superuser@realmrivalry.dev',
      userType: 'superuser'
    },
    'dev-token-player': {
      firebaseUid: 'dev-player-user',
      displayName: 'Development Player',
      email: 'player@realmrivalry.dev',
      userType: 'player'
    }
  } as const;

  /**
   * Ensures the service is only used in development
   */
  private static ensureDevelopment(): void {
    if (process.env.NODE_ENV !== 'development') {
      throw new ServiceError('DevAuthService is only available in development environment');
    }
  }

  /**
   * Validates a development token and returns user information
   * 
   * @param token - The development token to validate
   * @returns User information if token is valid, null otherwise
   */
  static validateDevToken(token: string): {
    firebaseUid: string;
    displayName: string;
    email: string;
    teamName?: string;
    userType: string;
  } | null {
    this.ensureDevelopment();

    const cleanToken = token.replace('Bearer ', '').trim();
    
    if (cleanToken in this.DEV_TOKENS) {
      const userInfo = this.DEV_TOKENS[cleanToken as keyof typeof this.DEV_TOKENS];
      
      logger.info('Development token validated', {
        token: cleanToken,
        firebaseUid: userInfo.firebaseUid,
        userType: userInfo.userType
      });
      
      return userInfo;
    }

    logger.warn('Invalid development token provided', { token: cleanToken });
    return null;
  }

  /**
   * Extracts and validates development token from request headers
   * 
   * @param authHeader - The Authorization header value
   * @returns User information if token is valid, null otherwise
   */
  static validateAuthHeader(authHeader?: string): {
    firebaseUid: string;
    displayName: string;
    email: string;
    teamName?: string;
    userType: string;
  } | null {
    this.ensureDevelopment();

    if (!authHeader) {
      return null;
    }

    // Support both "Bearer token" and just "token" formats
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7)
      : authHeader;

    return this.validateDevToken(token);
  }

  /**
   * Middleware factory for development authentication
   * 
   * @param requiredUserType - Optional user type requirement
   * @returns Express middleware function
   */
  static createAuthMiddleware(requiredUserType?: string) {
    this.ensureDevelopment();

    return (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      const userInfo = this.validateAuthHeader(authHeader);

      if (!userInfo) {
        return res.status(401).json({
          error: 'Invalid or missing development token',
          availableTokens: Object.keys(this.DEV_TOKENS),
          example: 'Authorization: Bearer dev-token-oakland-cougars'
        });
      }

      // Check user type requirement if specified
      if (requiredUserType && userInfo.userType !== requiredUserType) {
        return res.status(403).json({
          error: `Required user type: ${requiredUserType}, but got: ${userInfo.userType}`,
          userInfo: {
            firebaseUid: userInfo.firebaseUid,
            userType: userInfo.userType
          }
        });
      }

      // Add user info to request for downstream handlers
      req.devUser = userInfo;
      req.firebaseUid = userInfo.firebaseUid;

      logger.info('Development authentication successful', {
        firebaseUid: userInfo.firebaseUid,
        userType: userInfo.userType,
        endpoint: req.originalUrl
      });

      next();
    };
  }

  /**
   * Gets all available development tokens for documentation
   * 
   * @returns Object containing all development tokens and their purposes
   */
  static getAvailableTokens(): Record<string, {
    purpose: string;
    firebaseUid: string;
    userType: string;
    teamAccess?: string;
  }> {
    this.ensureDevelopment();

    return {
      'dev-token-oakland-cougars': {
        purpose: 'Test Oakland Cougars team owner functionality',
        firebaseUid: 'oakland-cougars-owner',
        userType: 'team_owner',
        teamAccess: 'Oakland Cougars (Division 7, Alpha)'
      },
      'dev-token-admin': {
        purpose: 'Test administrative functionality',
        firebaseUid: 'dev-admin-user',
        userType: 'admin'
      },
      'dev-token-superuser': {
        purpose: 'Test superuser functionality and emergency operations',
        firebaseUid: 'dev-superuser',
        userType: 'superuser'
      },
      'dev-token-player': {
        purpose: 'Test player-level functionality',
        firebaseUid: 'dev-player-user',
        userType: 'player'
      }
    };
  }

  /**
   * Creates a mock Firebase user object for development testing
   * 
   * @param token - The development token
   * @returns Mock Firebase user object
   */
  static createMockFirebaseUser(token: string) {
    this.ensureDevelopment();

    const userInfo = this.validateDevToken(token);
    if (!userInfo) {
      throw new ServiceError('Invalid development token for mock Firebase user creation');
    }

    return {
      uid: userInfo.firebaseUid,
      email: userInfo.email,
      displayName: userInfo.displayName,
      emailVerified: true,
      disabled: false,
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString()
      },
      customClaims: {
        userType: userInfo.userType,
        development: true
      },
      providerData: [{
        uid: userInfo.firebaseUid,
        email: userInfo.email,
        displayName: userInfo.displayName,
        providerId: 'development'
      }]
    };
  }

  /**
   * Checks if a request is from the Oakland Cougars development user
   * 
   * @param req - Express request object
   * @returns True if request is from Oakland Cougars dev user
   */
  static isOaklandCougarsRequest(req: any): boolean {
    this.ensureDevelopment();

    return req.devUser?.firebaseUid === 'oakland-cougars-owner';
  }

  /**
   * Gets development setup documentation
   * 
   * @returns Documentation for development authentication setup
   */
  static getDocumentation(): {
    overview: string;
    availableTokens: Record<string, any>;
    usage: {
      curl: string;
      javascript: string;
      headers: string;
    };
    endpoints: string[];
  } {
    this.ensureDevelopment();

    return {
      overview: 'Development authentication system for Realm Rivalry testing',
      availableTokens: this.getAvailableTokens(),
      usage: {
        curl: 'curl -H "Authorization: Bearer dev-token-oakland-cougars" http://localhost:3000/api/dev/setup-status',
        javascript: 'fetch("/api/dev/setup-status", { headers: { "Authorization": "Bearer dev-token-oakland-cougars" } })',
        headers: 'Authorization: Bearer dev-token-oakland-cougars'
      },
      endpoints: [
        'GET /api/dev/setup-status',
        'POST /api/dev/setup-test-user',
        'POST /api/dev/reset-oakland-cougars',
        'GET /api/dev/auth-info'
      ]
    };
  }
}