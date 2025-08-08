import { Request, Response, NextFunction } from 'express.js';

// Define permissions enum to match the system
export enum Permission {
  SUPERUSER_ACCESS = 'SUPERUSER_ACCESS',
  ADMIN_ACCESS = 'ADMIN_ACCESS', 
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  TEAM_MANAGEMENT = 'TEAM_MANAGEMENT',
  MATCH_MANAGEMENT = 'MATCH_MANAGEMENT',
  MANAGE_MATCHES = 'MANAGE_MATCHES',
  MANAGE_SEASONS = 'MANAGE_SEASONS', 
  FINANCIAL_ACCESS = 'FINANCIAL_ACCESS',
  GRANT_CREDITS = 'GRANT_CREDITS',
  VIEW_ALL_TEAMS = 'VIEW_ALL_TEAMS',
  manage_matches = 'manage_matches',
  manage_seasons = 'manage_seasons'
}

/**
 * Role-based access control middleware
 */
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // For now, implement basic permission check
    // This should be expanded based on your user role system
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Basic permission check - expand this based on your role system
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      return next();
    }
    
    return res.status(403).json({ message: 'Insufficient permissions' });
  };
};

export default { requirePermission, Permission };